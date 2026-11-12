import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import { Gamepad2, Plus, ThumbsUp, Users, Trophy, CalendarDays, Clock3, RefreshCw, LogOut, Check, Sparkles, Info } from "lucide-react";
import "./styles.css";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const db = url && key ? createClient(url, key) : null;

function App() {
  const [session, setSession] = useState(null);
  const [name, setName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [arrivalTime, setArrivalTime] = useState("19:00");
  const [participants, setParticipants] = useState([]);
  const [games, setGames] = useState([]);
  const [votes, setVotes] = useState([]);
  const [settings, setSettings] = useState(null);
  const [gameTitle, setGameTitle] = useState("");
  const [gameDescription, setGameDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!db) { setLoading(false); return; }
    db.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    const { data: listener } = db.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) { setName(""); setLoading(false); }
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
      .subscribe();
    return () => db.removeChannel(channel);
  }, [session]);

  async function refresh() {
    if (!db || !session) return;
    const [s, p, g, v, me] = await Promise.all([
      db.from("event_settings").select("*").eq("id", 1).maybeSingle(),
      db.from("participants").select("*").order("created_at"),
      db.from("games").select("*").order("created_at", { ascending: false }),
      db.from("votes").select("*"),
      db.from("participants").select("name, arrival_time").eq("id", session.user.id).maybeSingle()
    ]);
    const issue = [s, p, g, v, me].find(x => x.error);
    if (issue) setError(issue.error.message);
    if (s.data) setSettings(s.data);
    if (p.data) setParticipants(p.data);
    if (g.data) setGames(g.data);
    if (v.data) setVotes(v.data);
    if (me.data) {
      setName(me.data.name);
      setNameInput(me.data.name);
      setArrivalTime(toInputTime(me.data.arrival_time));
    }
    setLoading(false);
  }

  function toInputTime(value) {
    if (!value) return "19:00";
    const match = value.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return "19:00";
    return `${match[1].padStart(2, "0")}:${match[2]}`;
  }
  function formatTime(value) {
    if (!value) return "Not set";
    const [h, m] = value.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
  }

  async function join(e) {
    e.preventDefault();
    const clean = nameInput.trim().replace(/\s+/g, " ");
    if (!clean || !arrivalTime) return;
    setBusy(true); setError(""); setNotice("");
    try {
      let current = session;
      if (!current) {
        const { data, error: authError } = await db.auth.signInAnonymously();
        if (authError) throw authError;
        current = data.session;
        setSession(current);
      }
      const { error: saveError } = await db.from("participants").upsert({
        id: current.user.id, name: clean, arrival_time: formatTime(arrivalTime)
      });
      if (saveError) throw saveError;
      setName(clean);
      setNotice("You're on the list. Thanks for confirming your arrival time!");
      await refresh();
    } catch (e) { setError(e.message || "Couldn't join. Please try again."); }
    finally { setBusy(false); }
  }

  async function addGame(e) {
    e.preventDefault();
    if (!gameTitle.trim()) return;
    setBusy(true); setError(""); setNotice("");
    const { error: e2 } = await db.from("games").insert({
      title: gameTitle.trim(), description: gameDescription.trim() || null, suggested_by: session.user.id
    });
    if (e2) setError(e2.message);
    else { setNotice(`"${gameTitle.trim()}" was added.`); setGameTitle(""); setGameDescription(""); await refresh(); }
    setBusy(false);
  }

  async function vote(gameId) {
    if (!settings?.voting_open) return;
    const existing = votes.find(v => v.game_id === gameId && v.participant_id === session.user.id);
    setBusy(true);
    const result = existing
      ? await db.from("votes").delete().eq("id", existing.id)
      : await db.from("votes").insert({ game_id: gameId, participant_id: session.user.id });
    if (result.error) setError(result.error.message);
    await refresh();
    setBusy(false);
  }

  async function switchName() {
    await db.auth.signOut();
    setName(""); setNameInput(""); setArrivalTime("19:00");
  }

  const ranked = useMemo(() => games.map(g => ({
    ...g,
    count: votes.filter(v => v.game_id === g.id).length,
    mine: votes.some(v => v.game_id === g.id && v.participant_id === session?.user?.id)
  })).sort((a, b) => b.count - a.count || a.title.localeCompare(b.title)), [games, votes, session]);
  const max = Math.max(1, ...ranked.map(g => g.count));

  if (!db) return <div className="setup"><div className="setup-card"><div className="brand-icon"><Gamepad2/></div><h1>Connect your game night board</h1><p>Copy <code>.env.example</code> to <code>.env.local</code>, add your Supabase project URL and anon key, then run the SQL in <code>supabase/schema.sql</code>. Full instructions are in README.md.</p></div></div>;

  return <main className="shell">
    <header className="topbar"><a className="brand" href="#"><span className="brand-icon"><Gamepad2 size={21}/></span> GAME NIGHT</a>{name && <button className="quiet" onClick={switchName}><LogOut size={15}/> Switch name</button>}</header>
    <section className="hero">
      <div className="hero-copy"><div className="eyebrow"><Sparkles size={14}/> LET'S PICK THE NEXT GAME</div><h1>Saturday<br/><em>Game Night.</em></h1><p>Bring your best ideas. Vote for the games you want to play.</p><div className="event-meta"><span><CalendarDays size={16}/> Saturday, November 14, 2026</span><span><Clock3 size={16}/> 7:00 PM</span></div></div>
      <div className="hero-graphic"><div className="halo"/><Gamepad2 size={178} strokeWidth={1.1}/><b>✦</b></div>
    </section>

    {!name ? <section className="join panel">
      <div className="join-icon"><Users size={21}/></div><div><h2>Who's joining?</h2><p>Enter your name and confirm when you expect to arrive. No account or password needed.</p></div>
      <form className="join-form" onSubmit={join}>
        <label>Your name<input value={nameInput} onChange={e=>setNameInput(e.target.value)} placeholder="Enter your name" maxLength={40} required/></label>
        <label>What time can you arrive?<input type="time" value={arrivalTime} onChange={e=>setArrivalTime(e.target.value)} required/><small>Please select your expected arrival time.</small></label>
        <button className="primary" disabled={busy || !nameInput.trim() || !arrivalTime}>{busy ? "Joining…" : "Join game night"} <span>→</span></button>
      </form>
    </section> : <>
      <div className="welcome"><div><small>YOU'RE IN</small><h2>Hey, {name} ✌️</h2></div><span className="live"><i/> LIVE BOARD</span></div>
      <section className="stats">
        <div className="stat"><Gamepad2/><strong>{games.length}</strong><span>Games suggested</span></div>
        <div className="stat"><ThumbsUp/><strong>{votes.length}</strong><span>Total votes</span></div>
        <div className="stat"><Users/><strong>{participants.length}</strong><span>People joining</span></div>
      </section>
      <div className="columns">
        <section className="panel suggest"><div className="panel-title"><div><small>ADD TO THE LINEUP</small><h2>Suggest a game</h2></div><span className="tile"><Plus/></span></div><p>Got a game everyone should try? Put it up for a vote.</p>
          <form onSubmit={addGame}><label>Game title<input value={gameTitle} onChange={e=>setGameTitle(e.target.value)} placeholder="e.g. Mario Kart 8 Deluxe" maxLength={80} required/></label><label>Why should we play it? <i>OPTIONAL</i><textarea value={gameDescription} onChange={e=>setGameDescription(e.target.value)} placeholder="A quick description or player count…" maxLength={240}/></label><button className="primary full" disabled={busy || !gameTitle.trim()}><Plus size={16}/> Add game suggestion</button></form>
          <div className="hint"><Info size={15}/> Suggest as many games as you like.</div>
        </section>
        <section className="panel voting"><div className="panel-title"><div><small>THE COMMUNITY PICKS</small><h2>Vote for games</h2></div><span className="tile gold"><Trophy/></span></div><p className="instruction"><i/> Vote for every game you'd like to play.</p>
          {!settings?.voting_open && <div className="closed">Voting is currently closed.</div>}
          {!ranked.length ? <div className="empty"><Gamepad2 size={28}/><b>No games yet</b><span>Be the first to suggest one!</span></div> : <div className="game-list">{ranked.map((g,i)=><article className="game" key={g.id}><div className="rank">{i===0 && g.count ? <Trophy size={16}/> : String(i+1).padStart(2,"0")}</div><div className="game-info"><div className="game-heading"><b>{g.title}</b>{i===0 && g.count>0 && <small>LEADING</small>}</div>{g.description && <p>{g.description}</p>}<div className="byline">Suggested by {participants.find(p=>p.id===g.suggested_by)?.name || "a participant"}</div><div className="bar"><span style={{width:`${g.count/max*100}%`}}/></div></div><button className={`vote ${g.mine?"selected":""}`} onClick={()=>vote(g.id)} disabled={busy || !settings?.voting_open}>{g.mine?<Check size={16}/>:<ThumbsUp size={16}/>}<b>{g.count}</b></button></article>)}</div>}
          <div className="footnote">You can change your vote anytime while voting is open.</div>
        </section>
      </div>
      <section className="panel crew"><div className="crew-head"><div><small>THE CREW</small><h2>Who's playing?</h2></div><span>{participants.length} {participants.length===1?"person":"people"}</span></div>
        <div className="people">{participants.map((p,i)=><div className="person" key={p.id}><span className={`avatar a${i%5}`}>{p.name.charAt(0).toUpperCase()}</span><span className="person-detail"><b>{p.name}{p.id===session?.user?.id && <em>YOU</em>}</b><small><Clock3 size={12}/> Arriving at {p.arrival_time || "Time not confirmed"}</small></span></div>)}</div>
        <form className="arrival-update" onSubmit={join}><label>Update your arrival time<input type="time" value={arrivalTime} onChange={e=>setArrivalTime(e.target.value)}/></label><button className="secondary" disabled={busy}>Save arrival time</button></form>
      </section>
    </>}
    {(error||notice)&&<div className={`toast ${error?"bad":""}`}>{error||notice}<button onClick={()=>{setError("");setNotice("");}}>×</button></div>}
    <footer><span>MADE FOR GOOD COMPANY.</span><button onClick={refresh}><RefreshCw size={13}/> Refresh board</button></footer>
  </main>;
}

createRoot(document.getElementById("root")).render(<App />);
