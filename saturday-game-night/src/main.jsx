import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import { Gamepad2, Plus, ThumbsUp, Users, Trophy, CalendarDays, Clock3, RefreshCw, LogOut, Check, Sparkles, Info, Shield, Settings, Trash2, Pencil, ChevronDown, ChevronUp, Medal, UserCheck, UserX } from "lucide-react";
import "./styles.css";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const db = url && key ? createClient(url, key) : null;

const normalizeName = value => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();

function App() {
  const [session, setSession] = useState(null);
  const [name, setName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [arrivalTime, setArrivalTime] = useState("19:00");
  const [participantId, setParticipantId] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [games, setGames] = useState([]);
  const [votes, setVotes] = useState([]);
  const [settings, setSettings] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [linkRequests, setLinkRequests] = useState([]);
  const [pendingLink, setPendingLink] = useState(false);
  const [gameTitle, setGameTitle] = useState("");
  const [gameDescription, setGameDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [duplicateParticipant, setDuplicateParticipant] = useState(null);
  const [expandedRounds, setExpandedRounds] = useState({});
  const [roundNotes, setRoundNotes] = useState({});
  const [placementDrafts, setPlacementDrafts] = useState({});
  const [groupPassword, setGroupPassword] = useState("");
  const [participantPassword, setParticipantPassword] = useState("");
  const [adminGroupPassword, setAdminGroupPassword] = useState("");
  const [participantRoles, setParticipantRoles] = useState([]);
  const [adminMode, setAdminMode] = useState(true);

  const isAdmin = session?.user?.app_metadata?.role === "admin";
  const showAdminControls = isAdmin && adminMode;

  useEffect(() => {
    if (!db) { setLoading(false); return; }
    db.auth.getSession().then(async ({ data }) => {
      let current = data.session;
      if (current) {
        const { data: refreshed } = await db.auth.refreshSession();
        current = refreshed.session || current;
      }
      setSession(current);
      if (!current) setLoading(false);
    });
    const { data: listener } = db.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) {
        setName(""); setNameInput(""); setParticipantId(null); setPendingLink(false);
        setLoading(false);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!db || !session) return;
    refresh();
    const channel = db.channel("game-night-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "participants" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_settings" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_rounds" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_round_placements" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "participant_link_requests" }, refresh)
      .subscribe();
    return () => db.removeChannel(channel);
  }, [session]);

  async function refresh() {
    if (!db || !session) return;
    const [s, p, g, v, r, rp, requests, current, roleResult] = await Promise.all([
      db.from("event_settings").select("*").eq("id", 1).maybeSingle(),
      db.from("participants").select("*").order("created_at"),
      db.from("games").select("*").order("created_at", { ascending: false }),
      db.from("votes").select("*"),
      db.from("game_rounds").select("*").order("round_number"),
      db.from("game_round_placements").select("*").order("place"),
      db.from("participant_link_requests").select("*").order("requested_at", { ascending: false }),
      db.rpc("get_my_participant_id"),
      isAdmin ? db.rpc("admin_list_participant_roles") : Promise.resolve({ data: null, error: null })
    ]);
    const issue = [s, p, g, v, r, rp, requests, current, roleResult].find(x => x.error);
    if (issue) setError(issue.error.message);
    if (s.data) setSettings(s.data);
    if (p.data) setParticipants(p.data);
    if (roleResult?.data) setParticipantRoles(roleResult.data);
    if (g.data) setGames(g.data);
    if (v.data) setVotes(v.data);
    if (r.data) setRounds(r.data);
    if (rp.data) setPlacements(rp.data);
    if (requests.data) {
      setLinkRequests(requests.data);
      setPendingLink(requests.data.some(x => x.requester_id === session.user.id && x.status === "pending"));
    }
    if (current.data) {
      setParticipantId(current.data);
      const me = p.data?.find(x => x.id === current.data);
      if (me) {
        setName(me.name);
        setNameInput(me.name);
        setArrivalTime(toInputTime(me.arrival_time));
      } else {
        setName("");
      }
    }
    setLoading(false);
  }

  function toInputTime(value) {
    if (!value) return "19:00";
    const match = value.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return "19:00";
    return match[1].padStart(2, "0") + ":" + match[2];
  }
  function formatTime(value) {
    if (!value) return "Not set";
    const [h, m] = value.split(":").map(Number);
    return (h % 12 || 12) + ":" + String(m).padStart(2, "0") + (h >= 12 ? " PM" : " AM");
  }


  async function join(e) {
    e.preventDefault();
    const clean = nameInput.trim().replace(/\\s+/g, " ");
    if (!clean || !arrivalTime || !db) return;
    if (participantPassword.length < 8) { setError("Participant password must be at least 8 characters."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      let current = session;
      if (!current) {
        const { data, error: authError } = await db.auth.signInAnonymously();
        if (authError) throw authError;
        current = data.session;
        setSession(current);
      }

      const { data: resolvedId, error: resolveError } = await db.rpc("get_my_participant_id");
      if (resolveError) throw resolveError;
      const id = resolvedId || current.user.id;
      const { data: ownProfile, error: ownError } = await db.from("participants").select("*").eq("id", id).maybeSingle();
      if (ownError) throw ownError;
      if (ownProfile) {
        const { error: updateError } = await db.from("participants").update({ arrival_time: formatTime(arrivalTime) }).eq("id", id);
        if (updateError) throw updateError;
        setName(ownProfile.name); setParticipantId(id); setParticipantPassword("");
        setNotice("Your arrival time has been updated.");
        await refresh();
        return;
      }

      const { data: allParticipants, error: peopleError } = await db.from("participants").select("id,name,is_active");
      if (peopleError) throw peopleError;
      const match = (allParticipants || []).find(p => normalizeName(p.name) === normalizeName(clean));
      if (match) {
        setDuplicateParticipant(match);
        return;
      }

      if (!groupPassword) throw new Error("Enter the group password to create a new participant account.");
      const { data: passwordAccepted, error: passwordError } = await db.rpc("verify_group_password", { p_password: groupPassword });
      if (passwordError) throw passwordError;
      if (!passwordAccepted) throw new Error("That group password is incorrect. Please try again.");

      const { error: insertError } = await db.from("participants").insert({
        id: current.user.id, name: clean, arrival_time: formatTime(arrivalTime)
      });
      if (insertError) {
        if (insertError.code === "23505") {
          const { data: refreshedPeople } = await db.from("participants").select("id,name,is_active");
          const duplicate = refreshedPeople?.find(p => normalizeName(p.name) === normalizeName(clean));
          if (duplicate) { setDuplicateParticipant(duplicate); return; }
        }
        throw insertError;
      }
      const { error: savePasswordError } = await db.rpc("set_my_participant_password", { p_password: participantPassword });
      if (savePasswordError) throw savePasswordError;
      setParticipantId(current.user.id);
      setGroupPassword(""); setParticipantPassword("");
      setName(clean);
      setNotice("Your participant account has been created.");
      await refresh();
    } catch (e) {
      setError(e.message || "Couldn't join. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signInToExistingParticipant() {
    if (!duplicateParticipant || participantPassword.length < 8) return;
    if (duplicateParticipant.is_active === false) { setError("This participant is inactive. Ask an admin to restore it."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      let current = session;
      if (!current) {
        const { data, error: authError } = await db.auth.signInAnonymously();
        if (authError) throw authError;
        current = data.session;
        setSession(current);
      }
      const { data: linkedId, error: verifyError } = await db.rpc("sign_in_as_participant", {
        p_name: duplicateParticipant.name, p_password: participantPassword
      });
      if (verifyError) throw verifyError;
      if (!linkedId) throw new Error("The participant password is incorrect. Please try again.");
      const { error: arrivalError } = await db.from("participants").update({ arrival_time: formatTime(arrivalTime) }).eq("id", linkedId);
      if (arrivalError) throw arrivalError;
      setDuplicateParticipant(null); setParticipantPassword(""); setGroupPassword("");
      setParticipantId(linkedId); setName(duplicateParticipant.name);
      setNotice("Signed in as " + duplicateParticipant.name + ".");
      await db.auth.refreshSession();
      await refresh();
    } catch (e) {
      setError(e.message || "Couldn't sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function addGame(e) {
    e.preventDefault();
    if (!gameTitle.trim() || !participantId) return;
    setBusy(true); setError(""); setNotice("");
    const { error: e2 } = await db.from("games").insert({
      title: gameTitle.trim(), description: gameDescription.trim() || null, suggested_by: participantId
    });
    if (e2) setError(e2.message);
    else { setNotice('"' + gameTitle.trim() + '" was added.'); setGameTitle(""); setGameDescription(""); await refresh(); }
    setBusy(false);
  }

  async function vote(gameId) {
    if (!settings?.voting_open || !participantId) return;
    const existing = votes.find(v => v.game_id === gameId && v.participant_id === participantId);
    setBusy(true);
    const result = existing
      ? await db.from("votes").delete().eq("id", existing.id)
      : await db.from("votes").insert({ game_id: gameId, participant_id: participantId });
    if (result.error) setError(result.error.message);
    await refresh();
    setBusy(false);
  }

  async function switchName() {
    await db.auth.signOut();
    setName(""); setNameInput(""); setParticipantId(null); setDuplicateParticipant(null); setPendingLink(false); setGroupPassword(""); setParticipantPassword("");
    setArrivalTime("19:00");
  }

  async function toggleVoting() {
    const { error: e } = await db.from("event_settings").update({ voting_open: !settings.voting_open }).eq("id", 1);
    if (e) setError(e.message);
    else { setNotice(settings.voting_open ? "Voting has been closed." : "Voting is now open."); await refresh(); }
  }

  async function decideLink(requestId, approve) {
    const { error: e } = await db.rpc("admin_decide_participant_link_request", {
      p_request_id: requestId, p_approve: approve
    });
    if (e) setError(e.message);
    else { setNotice(approve ? "Participant request approved." : "Participant request declined."); await refresh(); }
  }

  async function saveGroupPassword() {
    const { error: e } = await db.rpc("admin_set_group_password", { p_password: adminGroupPassword });
    if (e) setError(e.message);
    else { setAdminGroupPassword(""); setNotice("Group password updated. New participants must use the new password."); }
  }

  async function setParticipantAdmin(person, makeAdmin) {
    const { error: e } = await db.rpc("admin_set_participant_admin", { p_participant_id: person.id, p_make_admin: makeAdmin });
    if (e) setError(e.message);
    else { setNotice(person.name + (makeAdmin ? " is now an administrator." : " is no longer an administrator.")); await db.auth.refreshSession(); await refresh(); }
  }

  async function resetParticipantPassword(person) {
    const next = window.prompt("Set a new password for " + person.name + " (at least 8 characters):");
    if (next === null) return;
    if (next.length < 8 || next.length > 200) { setError("Participant password must be at least 8 characters and no more than 200 characters."); return; }
    const { error: e } = await db.rpc("admin_reset_participant_password", {
      p_participant_id: person.id, p_password: next
    });
    if (e) setError(e.message);
    else setNotice("Password reset for " + person.name + ". Share the new password with them privately.");
  }

  async function setParticipantActive(person, active) {
    const { error: e } = await db.from("participants").update({ is_active: active }).eq("id", person.id);
    if (e) setError(e.message);
    else { setNotice(person.name + (active ? " restored." : " removed from the active list.")); await refresh(); }
  }

  async function renameParticipant(person) {
    const next = window.prompt("Update participant name:", person.name);
    if (next === null) return;
    const clean = next.trim().replace(/\s+/g, " ");
    if (!clean) { setError("Name cannot be blank."); return; }
    const duplicate = participants.find(p => p.id !== person.id && normalizeName(p.name) === normalizeName(clean));
    if (duplicate) { setError("That name is already assigned to " + duplicate.name + "."); return; }
    const { error: e } = await db.from("participants").update({ name: clean }).eq("id", person.id);
    if (e) setError(e.message);
    else { setNotice("Participant name updated."); await refresh(); }
  }

  async function updateGame(game) {
    const title = window.prompt("Game title:", game.title);
    if (title === null) return;
    const clean = title.trim();
    if (!clean) { setError("Game title cannot be blank."); return; }
    const description = window.prompt("Game description (optional):", game.description || "");
    if (description === null) return;
    const { error: e } = await db.from("games").update({ title: clean, description: description.trim() || null }).eq("id", game.id);
    if (e) setError(e.message);
    else { setNotice("Game updated."); await refresh(); }
  }

  async function deleteGame(game) {
    if (!window.confirm('Delete "' + game.title + '" and its votes and round history?')) return;
    const { error: e } = await db.from("games").delete().eq("id", game.id);
    if (e) setError(e.message);
    else { setNotice("Game and its round history deleted."); await refresh(); }
  }

  async function createRound(game) {
    const next = Math.max(0, ...rounds.filter(r => r.game_id === game.id).map(r => r.round_number)) + 1;
    const { error: e } = await db.from("game_rounds").insert({
      game_id: game.id, round_number: next, notes: roundNotes[game.id] || null, created_by: session.user.id
    });
    if (e) setError(e.message);
    else { setRoundNotes(v => ({ ...v, [game.id]: "" })); setExpandedRounds(v => ({ ...v, [game.id]: true })); setNotice("Round " + next + " added for " + game.title + "."); await refresh(); }
  }

  async function editRound(round) {
    const nextNumber = window.prompt("Round number:", String(round.round_number));
    if (nextNumber === null) return;
    const number = Number(nextNumber);
    if (!Number.isInteger(number) || number < 1) { setError("Round number must be a whole number greater than zero."); return; }
    const notes = window.prompt("Round notes (optional):", round.notes || "");
    if (notes === null) return;
    const { error: e } = await db.from("game_rounds").update({
      round_number: number,
      notes: notes.trim() || null
    }).eq("id", round.id);
    if (e) setError(e.message);
    else { setNotice("Round updated."); await refresh(); }
  }

  async function deleteRound(round) {
    if (!window.confirm("Delete Round " + round.round_number + " and all placements recorded for this round? This cannot be undone.")) return;
    const { error: e } = await db.from("game_rounds").delete().eq("id", round.id);
    if (e) setError(e.message);
    else { setNotice("Round and its placements deleted."); await refresh(); }
  }

  async function addPlacement(round) {
    const draft = placementDrafts[round.id] || {};
    if (!draft.participant_id || !draft.place || !Number.isInteger(Number(draft.place)) || Number(draft.place) < 1) { setError("Choose a participant and a whole-number placement greater than zero."); return; }
    const { error: e } = await db.from("game_round_placements").insert({
      round_id: round.id,
      participant_id: draft.participant_id,
      place: Number(draft.place),
      score: draft.score === "" ? null : Number(draft.score),
      notes: draft.notes?.trim() || null
    });
    if (e) setError(e.message);
    else { setPlacementDrafts(v => ({ ...v, [round.id]: { participant_id: "", place: "1", score: "", notes: "" } })); setNotice("Round result saved."); await refresh(); }
  }

  async function editPlacement(placement) {
    const placeText = window.prompt("Placement (1 = first place):", String(placement.place));
    if (placeText === null) return;
    const place = Number(placeText);
    if (!Number.isInteger(place) || place < 1) { setError("Placement must be a whole number greater than zero."); return; }
    const scoreText = window.prompt("Score (leave blank for no score):", placement.score ?? "");
    if (scoreText === null) return;
    const notes = window.prompt("Result notes (optional):", placement.notes || "");
    if (notes === null) return;
    const score = scoreText.trim() === "" ? null : Number(scoreText);
    if (score !== null && !Number.isFinite(score)) { setError("Score must be a valid number."); return; }
    const { error: e } = await db.from("game_round_placements").update({
      place, score, notes: notes.trim() || null
    }).eq("id", placement.id);
    if (e) setError(e.message);
    else { setNotice("Round result updated."); await refresh(); }
  }

  async function deletePlacement(placement) {
    if (!window.confirm("Remove this round result?")) return;
    const { error: e } = await db.from("game_round_placements").delete().eq("id", placement.id);
    if (e) setError(e.message); else await refresh();
  }

  const ranked = useMemo(() => games.map(g => ({
    ...g,
    count: votes.filter(v => v.game_id === g.id).length,
    mine: votes.some(v => v.game_id === g.id && v.participant_id === participantId)
  })).sort((a, b) => b.count - a.count || a.title.localeCompare(b.title)), [games, votes, participantId]);
  const max = Math.max(1, ...ranked.map(g => g.count));
  const pendingRequests = linkRequests.filter(r => r.status === "pending");
  const activeParticipants = participants.filter(p => p.is_active !== false);

  if (!db) return <div className="setup"><div className="setup-card"><div className="brand-icon"><Gamepad2/></div><h1>Connect your game night board</h1><p>Copy <code>.env.example</code> to <code>.env.local</code>, add your Supabase project URL and anon key, then run the SQL in <code>supabase/schema.sql</code>. Full instructions are in README.md.</p></div></div>;
  if (loading) return <div className="setup"><div className="setup-card"><div className="brand-icon"><Gamepad2/></div><h1>Loading game night…</h1></div></div>;

  return <main className="shell">
    <header className="topbar"><a className="brand" href="#"><span className="brand-icon"><Gamepad2 size={21}/></span> GAME NIGHT</a><div className="top-actions">{isAdmin && <button className={"admin-mode-toggle "+(adminMode?"active":"")} onClick={()=>setAdminMode(v=>!v)}><Shield size={14}/>{adminMode?"Switch to normal mode":"Switch to admin mode"}</button>}{name && <button className="quiet" onClick={switchName}><LogOut size={15}/> Switch name</button>}</div></header>
    <section className="hero">
      <div className="hero-copy"><div className="eyebrow"><Sparkles size={14}/> LET'S PICK THE NEXT GAME</div><h1>Saturday<br/><em>Game Night.</em></h1><p>Bring your best ideas. Vote for the games you want to play.</p><div className="event-meta"><span><CalendarDays size={16}/> {settings?.event_date || "Saturday, November 14, 2026"}</span><span><Clock3 size={16}/> {settings?.event_time || "7:00 PM"}</span></div></div>
      <div className="hero-graphic"><div className="halo"/><Gamepad2 size={178} strokeWidth={1.1}/><b>✦</b></div>
    </section>

    {!name ? <section className="join panel">
      <div className="join-icon"><Users size={21}/></div><div><h2>Who's joining?</h2><p>Enter your name and confirm when you expect to arrive. Your name is locked after registration.</p></div>
      <form className="join-form" onSubmit={e=>{e.preventDefault(); duplicateParticipant ? signInToExistingParticipant() : join(e);}}>
        <label>Your name<input value={nameInput} onChange={e=>setNameInput(e.target.value)} placeholder="Enter your name" maxLength={40} required/></label>
        <label>Participant password<input type="password" value={participantPassword} onChange={e=>setParticipantPassword(e.target.value)} placeholder="Create a password or enter your existing one" autoComplete="new-password" minLength={8} required/><small>Use at least 8 characters. Existing names require that participant’s password.</small></label>
        {!duplicateParticipant && <label>Group password<input type="password" value={groupPassword} onChange={e=>setGroupPassword(e.target.value)} placeholder="Enter the group password" autoComplete="off"/><small>Required only when creating a new participant account.</small></label>}
        <label>What time can you arrive?<input type="time" value={arrivalTime} onChange={e=>setArrivalTime(e.target.value)} required/><small>Please select your expected arrival time.</small></label>
        <button className="primary" disabled={busy || !nameInput.trim() || !arrivalTime || participantPassword.length < 8}>{busy ? "Joining…" : duplicateParticipant ? "Continue" : "Join game night"} <span>→</span></button>
      </form>
      {duplicateParticipant && <div className="duplicate-prompt"><div><b>This participant already exists</b><p><strong>{duplicateParticipant.name}</strong> is already registered. Enter that participant's password to access the existing account. A new account will not be created.</p></div><div className="duplicate-actions"><button className="primary" disabled={busy || participantPassword.length < 8} onClick={signInToExistingParticipant}>Sign in to existing account</button><button className="secondary" onClick={() => { setDuplicateParticipant(null); setNameInput(""); setParticipantPassword(""); }}>Choose another name</button></div></div>}
    </section> : <>
      <div className="welcome"><div><small>YOU'RE IN</small><h2>Hey, {name} ✌️</h2></div><span className="live"><i/> LIVE BOARD</span></div>
      <section className="stats">
        <div className="stat"><Gamepad2/><strong>{games.length}</strong><span>Games suggested</span></div>
        <div className="stat"><ThumbsUp/><strong>{votes.length}</strong><span>Total votes</span></div>
        <div className="stat"><Users/><strong>{activeParticipants.length}</strong><span>People joining</span></div>
      </section>
      <div className="columns">
        <section className="panel suggest"><div className="panel-title"><div><small>ADD TO THE LINEUP</small><h2>Suggest a game</h2></div><span className="tile"><Plus/></span></div><p>Got a game everyone should try? Put it up for a vote.</p>
          <form onSubmit={addGame}><label>Game title<input value={gameTitle} onChange={e=>setGameTitle(e.target.value)} placeholder="e.g. Mario Kart 8 Deluxe" maxLength={80} required/></label><label>Why should we play it? <i>OPTIONAL</i><textarea value={gameDescription} onChange={e=>setGameDescription(e.target.value)} placeholder="A quick description or player count…" maxLength={240}/></label><button className="primary full" disabled={busy || !gameTitle.trim()}><Plus size={16}/> Add game suggestion</button></form>
          <div className="hint"><Info size={15}/> Suggest as many games as you like.</div>
        </section>
        <section className="panel voting"><div className="panel-title"><div><small>THE COMMUNITY PICKS</small><h2>Vote for games</h2></div><span className="tile gold"><Trophy/></span></div><p className="instruction"><i/> Vote for every game you'd like to play.</p>
          {!settings?.voting_open && <div className="closed">Voting is currently closed.</div>}
          {!ranked.length ? <div className="empty"><Gamepad2 size={28}/><b>No games yet</b><span>Be the first to suggest one!</span></div> : <div className="game-list">{ranked.map((g,i)=><article className="game" key={g.id}><div className="rank">{i===0 && g.count ? <Trophy size={16}/> : String(i+1).padStart(2,"0")}</div><div className="game-info"><div className="game-heading"><b>{g.title}</b>{i===0 && g.count>0 && <small>LEADING</small>}</div>{g.description && <p>{g.description}</p>}<div className="byline">Suggested by {participants.find(p=>p.id===g.suggested_by)?.name || "a participant"}</div><div className="bar"><span style={{width:(g.count/max*100)+"%"}}/></div></div><div className="game-actions">{showAdminControls && <button className="icon-action" title="Edit game" onClick={()=>updateGame(g)}><Pencil size={14}/></button>}{showAdminControls && <button className="icon-action danger" title="Delete game" onClick={()=>deleteGame(g)}><Trash2 size={14}/></button>}<button className={"vote "+(g.mine?"selected":"")} onClick={()=>vote(g.id)} disabled={busy || !settings?.voting_open}>{g.mine?<Check size={16}/>:<ThumbsUp size={16}/>}<b>{g.count}</b></button></div></article>)}</div>}
          <div className="footnote">You can change your vote anytime while voting is open.</div>
        </section>
      </div>

      <section className="panel crew"><div className="crew-head"><div><small>THE CREW</small><h2>Who's playing?</h2></div><span>{activeParticipants.length} {activeParticipants.length===1?"person":"people"}</span></div>
        <div className="people">{activeParticipants.map((p,i)=><div className="person" key={p.id}><span className={"avatar a"+(i%5)}>{p.name.charAt(0).toUpperCase()}</span><span className="person-detail"><b>{p.name}{p.id===participantId && <em>YOU</em>}</b><small><Clock3 size={12}/> Arriving at {p.arrival_time || "Time not confirmed"}</small></span></div>)}</div>
        <form className="arrival-update" onSubmit={join}><label>Update your arrival time<input type="time" value={arrivalTime} onChange={e=>setArrivalTime(e.target.value)}/></label><button className="secondary" disabled={busy}>Save arrival time</button><span className="locked-name">Your participant name cannot be changed.</span></form>
      </section>

      <section className="panel history"><div className="crew-head"><div><small>THE SCOREBOARD</small><h2>Game round history</h2></div><span>{rounds.length} rounds recorded</span></div>
        {games.map(game => {
          const gameRounds = rounds.filter(r => r.game_id === game.id).sort((a,b)=>a.round_number-b.round_number);
          return <div className="history-game" key={game.id}><div className="history-game-head"><b>{game.title}</b><span>{gameRounds.length} {gameRounds.length===1?"round":"rounds"}</span><button className="text-action" onClick={()=>setExpandedRounds(v=>({...v,[game.id]:!v[game.id]}))}>{expandedRounds[game.id] ? <ChevronUp size={15}/> : <ChevronDown size={15}/>} {expandedRounds[game.id] ? "Hide" : "View"}</button></div>
            {expandedRounds[game.id] && <div className="round-list">
              {!gameRounds.length && <p className="muted">No rounds recorded yet.</p>}
              {gameRounds.map(round => {
                const results = placements.filter(p=>p.round_id===round.id).sort((a,b)=>a.place-b.place);
                return <div className="round-card" key={round.id}><div className="round-heading"><div className="round-title"><b>Round {round.round_number}</b>{round.notes && <span>{round.notes}</span>}</div>{showAdminControls && <div className="round-actions"><button className="icon-action" title="Edit round" onClick={()=>editRound(round)}><Pencil size={13}/></button><button className="icon-action danger" title="Delete round" onClick={()=>deleteRound(round)}><Trash2 size={13}/></button></div>}</div>
                  {results.length ? <ol className="placement-list">{results.map(result=><li key={result.id}><span className="place-label">{result.place===1?"1st":result.place===2?"2nd":result.place===3?"3rd":result.place+"th"}</span><b>{participants.find(p=>p.id===result.participant_id)?.name || "Former participant"}</b>{result.score!==null && result.score!==undefined && <small>Score: {result.score}</small>}{result.notes && <small>{result.notes}</small>}{showAdminControls && <div className="result-actions"><button className="icon-action" onClick={()=>editPlacement(result)} title="Edit result"><Pencil size={12}/></button><button className="icon-action danger" onClick={()=>deletePlacement(result)} title="Remove result"><Trash2 size={13}/></button></div>}</li>)}</ol> : <p className="muted">No placements entered for this round yet.</p>}
                  {showAdminControls && <div className="placement-form"><select value={placementDrafts[round.id]?.participant_id || ""} onChange={e=>setPlacementDrafts(v=>({...v,[round.id]:{...v[round.id],participant_id:e.target.value,place:v[round.id]?.place||"1"}}))}><option value="">Select participant</option>{participants.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select><input type="number" min="1" step="1" placeholder="Place" value={placementDrafts[round.id]?.place || "1"} onChange={e=>setPlacementDrafts(v=>({...v,[round.id]:{...v[round.id],place:e.target.value}}))}/><input type="number" placeholder="Score (optional)" value={placementDrafts[round.id]?.score || ""} onChange={e=>setPlacementDrafts(v=>({...v,[round.id]:{...v[round.id],score:e.target.value}}))}/><button className="secondary" onClick={()=>addPlacement(round)}>Add result</button></div>}
                </div>;
              })}
            </div>}
            {showAdminControls && <div className="new-round"><input placeholder="Round notes (optional)" value={roundNotes[game.id]||""} onChange={e=>setRoundNotes(v=>({...v,[game.id]:e.target.value}))}/><button className="secondary" onClick={()=>createRound(game)}><Plus size={14}/> Add round</button></div>}
          </div>;
        })}
      </section>

      {showAdminControls && <section className="panel admin-panel"><div className="panel-title"><div><small>ADMINISTRATION</small><h2>Admin controls</h2></div><span className="tile"><Shield/></span></div>
        <div className="admin-section"><h3><Shield size={16}/> Group password</h3><p className="muted">Set or replace the password required for new participant accounts. Existing participants stay signed in.</p><div className="admin-password-form"><input type="password" value={adminGroupPassword} onChange={e=>setAdminGroupPassword(e.target.value)} placeholder="New group password (6+ characters)" minLength={6} maxLength={200} autoComplete="new-password"/><button className="primary" disabled={adminGroupPassword.trim().length < 6} onClick={saveGroupPassword}>Save group password</button></div></div>
        <div className="admin-setting"><div><b>Voting status</b><p>{settings?.voting_open ? "Participants can currently vote." : "Voting is closed for everyone."}</p></div><button className="primary" onClick={toggleVoting}>{settings?.voting_open ? "Close voting" : "Open voting"}</button></div>
        <div className="admin-section"><h3><Shield size={16}/> Administrator access</h3><p className="muted">Promote trusted participants to admins. Admins can manage the board and other admin accounts. The last admin cannot be removed.</p>
          {participants.map(person => { const role = participantRoles.find(r => r.participant_id === person.id); const admin = !!role?.is_admin; return <div className="request-row" key={person.id}><div><b>{person.name}</b><small>{admin ? "Administrator" : "Participant"}</small></div><div className="request-actions"><button className={admin ? "secondary" : "primary"} onClick={()=>setParticipantAdmin(person,!admin)}>{admin ? "Remove admin" : "Promote to admin"}</button></div></div>; })}
        </div>
        <div className="admin-section"><h3><Users size={16}/> Manage participants</h3>
          {participants.map(person=><div className="request-row" key={person.id}><div><b>{person.name} {!person.is_active && <small className="inactive-label">INACTIVE</small>}</b><small>{person.arrival_time || "Arrival not set"}</small></div><div className="request-actions"><button className="secondary" onClick={()=>resetParticipantPassword(person)}>Reset password</button><button className="icon-action" title="Edit name" onClick={()=>renameParticipant(person)}><Pencil size={14}/></button>{person.is_active === false ? <button className="secondary" onClick={()=>setParticipantActive(person,true)}><UserCheck size={14}/> Restore</button> : <button className="secondary" onClick={()=>setParticipantActive(person,false)}><UserX size={14}/> Remove</button>}</div></div>)}
        </div>
      </section>}
    </>}
    {(error||notice)&&<div className={"toast "+(error?"bad":"")}>{error||notice}<button onClick={()=>{setError("");setNotice("");}}>×</button></div>}
    <footer><span>MADE FOR GOOD COMPANY.</span><button onClick={refresh}><RefreshCw size={13}/> Refresh board</button></footer>
  </main>;
}

createRoot(document.getElementById("root")).render(<App />);
