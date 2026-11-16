import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import { Gamepad2, Plus, ThumbsUp, ThumbsDown, Users, Trophy, CalendarDays, Clock3, RefreshCw, LogOut, Check, Sparkles, Info, Shield, Settings, Trash2, Pencil, MapPin, ChevronDown, ChevronUp, Medal, UserCheck, UserX, Dices, X } from "lucide-react";
import "./styles.css";
import { APP_VERSION } from "./version.js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const db = url && key ? createClient(url, key) : null;

const normalizeName = value => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();

function ArrivalTimePicker({ value, onChange }) {
  const getParts = raw => {
    if (!raw) return { hour: "", minute: "", period: "" };
    // Accept both normalized 24-hour values (19:00) and stored/display
    // values with an explicit suffix (7:00 PM). Do not infer AM/PM from
    // the numeric hour when a suffix is present.
    const match = String(raw).trim().match(/^(\\d{1,2}):(\\d{2})(?::\\d{2})?\\s*(AM|PM)?$/i);
    if (!match) return { hour: "", minute: "", period: "" };
    let hour24 = Number(match[1]);
    const minute = Number(match[2]);
    const suffix = match[3]?.toUpperCase();
    if (minute > 59) return { hour: "", minute: "", period: "" };
    if (suffix) {
      if (hour24 < 1 || hour24 > 12) return { hour: "", minute: "", period: "" };
      if (suffix === "PM" && hour24 < 12) hour24 += 12;
      if (suffix === "AM" && hour24 === 12) hour24 = 0;
    } else if (hour24 > 23) {
      return { hour: "", minute: "", period: "" };
    }
    return {
      hour: String(hour24 % 12 || 12),
      minute: String(minute).padStart(2, "0"),
      period: hour24 >= 12 ? "PM" : "AM"
    };
  };
  const [parts, setParts] = useState(() => getParts(value));
  useEffect(() => setParts(getParts(value)), [value]);

  function updatePart(key, nextValue) {
    const next = { ...parts, [key]: nextValue };
    setParts(next);
    if (next.hour && next.minute && next.period) {
      let hour = Number(next.hour) % 12;
      if (next.period === "PM") hour += 12;
      onChange(String(hour).padStart(2, "0") + ":" + next.minute);
    }
  }

  return <div className="arrival-time-picker">
    <select aria-label="Arrival hour" value={parts.hour} onChange={e => updatePart("hour", e.target.value)}>
      <option value="">Hour</option>
      {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(hour => <option key={hour} value={hour}>{hour}</option>)}
    </select>
    <span>:</span>
    <select aria-label="Arrival minute" value={parts.minute} onChange={e => updatePart("minute", e.target.value)}>
      <option value="">Min</option>
      {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map(minute => <option key={minute} value={minute}>{minute}</option>)}
    </select>
    <select aria-label="AM or PM" value={parts.period} onChange={e => updatePart("period", e.target.value)}>
      <option value="">AM/PM</option>
      <option value="AM">AM</option>
      <option value="PM">PM</option>
    </select>
  </div>;
}

function App() {
  const [session, setSession] = useState(null);
  const [name, setName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [participantNameDraft, setParticipantNameDraft] = useState("");
  const [participantSloganDraft, setParticipantSloganDraft] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [participantId, setParticipantId] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [eventArrivals, setEventArrivals] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatExpanded, setChatExpanded] = useState(false);
  const [games, setGames] = useState([]);
  const [votes, setVotes] = useState([]);
  const [voteCounts, setVoteCounts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [gameNights, setGameNights] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const refreshRequestRef = useRef(0);
  const chatRequestRef = useRef(0);
  const selectedEventIdRef = useRef(selectedEventId);
  selectedEventIdRef.current = selectedEventId;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [attendance, setAttendance] = useState([]);
  const [attendanceDrafts, setAttendanceDrafts] = useState({});
  const [myAttendance, setMyAttendance] = useState("");
  const [newEventTitle, setNewEventTitle] = useState("Saturday Game Night");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("19:00");
  const [newEventLocation, setNewEventLocation] = useState("");
  const [duplicateFromEventId, setDuplicateFromEventId] = useState("");
  const [eventTitleDraft, setEventTitleDraft] = useState("Saturday Game Night");
  const [eventDateDraft, setEventDateDraft] = useState("");
  const [eventTimeDraft, setEventTimeDraft] = useState("19:00");
  const [eventLocationDraft, setEventLocationDraft] = useState("");
  const [rounds, setRounds] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [allTimeWins, setAllTimeWins] = useState({});
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
  const [currentPasswordDraft, setCurrentPasswordDraft] = useState("");
  const [newPasswordDraft, setNewPasswordDraft] = useState("");
  const [confirmPasswordDraft, setConfirmPasswordDraft] = useState("");
  const [adminGroupPassword, setAdminGroupPassword] = useState("");
  const [participantRoles, setParticipantRoles] = useState([]);
  const [displayRoles, setDisplayRoles] = useState([]);
  const [adminMode, setAdminMode] = useState(true);
  const [scoreboardMode, setScoreboardMode] = useState(false);
  const [accountMode, setAccountMode] = useState(false);
  const [activeTab, setActiveTab] = useState("attendance");
  const [diceGroups, setDiceGroups] = useState([{ id: 1, count: "2", sides: "20" }]);
  const [nextDiceGroupId, setNextDiceGroupId] = useState(2);
  const [createdDice, setCreatedDice] = useState([]);
  const [diceResults, setDiceResults] = useState([]);
  const [diceToolMessage, setDiceToolMessage] = useState("");

  const isAdmin = session?.user?.app_metadata?.role === "admin";
  const isGameAdmin = session?.user?.app_metadata?.role === "game_admin";
  const showAdminControls = isAdmin && adminMode;
  const hasScoreboardPermission = isAdmin || isGameAdmin;
  const canManageScoreboard = hasScoreboardPermission && scoreboardMode && !settings?.is_archived;
  const canManageAttendance = hasScoreboardPermission && !settings?.is_archived;
  const canViewVoteDetails = isAdmin || isGameAdmin;

  function createDiceSet() {
    const normalized = diceGroups.map(group => ({ ...group, count: Number(group.count), sides: Number(group.sides) }));
    if (normalized.some(group => !Number.isInteger(group.count) || group.count < 1 || group.count > 100 || !Number.isInteger(group.sides) || group.sides < 2 || group.sides > 1000)) {
      setDiceToolMessage("Each dice group needs 1–100 dice and 2–1,000 sides."); return;
    }
    if (normalized.reduce((sum, group) => sum + group.count, 0) > 100) { setDiceToolMessage("You can create up to 100 dice at a time."); return; }
    const dice = normalized.flatMap(group => Array.from({ length: group.count }, (_, index) => ({ id: group.id + "-" + index, groupId: group.id, sides: group.sides })));
    setCreatedDice(dice); setDiceResults([]); setDiceToolMessage(dice.length + " dice created. Ready to roll!");
  }

  function rollDice(groupId = null) {
    if (!createdDice.length) return;
    const diceToRoll = groupId === null ? createdDice : createdDice.filter(die => die.groupId === groupId);
    if (!diceToRoll.length) return;
    const nextResults = diceToRoll.map(die => ({ ...die, result: Math.floor(Math.random() * die.sides) + 1 }));
    setDiceResults(current => groupId === null
      ? nextResults
      : [...current.filter(result => result.groupId !== groupId), ...nextResults]);
    setDiceToolMessage(groupId === null ? "All dice rolled!" : "Dice group rolled!");
  }

  function removeDie(dieId) {
    setCreatedDice(dice => dice.filter(die => die.id !== dieId));
    setDiceResults(results => results.filter(die => die.id !== dieId));
    setDiceToolMessage("Die removed.");
  }

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
    if (!db || session) return;
    let cancelled = false;
    async function loadPublicGameNights() {
      const { data, error: publicEventsError } = await db.from("game_nights").select("*").order("event_date", { ascending: true });
      if (cancelled) return;
      if (publicEventsError) {
        setError(publicEventsError.message);
        setLoading(false);
        return;
      }
      const events = data || [];
      setGameNights(events);
      const now = new Date();
      const today = now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0");
      const existingSelection = events.find(event => event.id === selectedEventId);
      const upcoming = events.filter(event => !event.is_archived && event.event_date >= today).sort((a,b) => a.event_date.localeCompare(b.event_date))[0];
      const fallback = events.filter(event => !event.is_archived).sort((a,b) => b.event_date.localeCompare(a.event_date))[0] || events[0];
      const activeEvent = existingSelection || upcoming || fallback || null;
      setSelectedEventId(activeEvent?.id || null);
      setSettings(activeEvent);
      if (activeEvent?.event_date) {
        setCalendarMonth(new Date(Number(activeEvent.event_date.slice(0,4)), Number(activeEvent.event_date.slice(5,7))-1, 1));
      }
      setLoading(false);
    }
    loadPublicGameNights();
    return () => { cancelled = true; };
  }, [session]);

  useEffect(() => {
    if (!db || !session) return;
    refresh();
    const channel = db.channel("game-night-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "participants" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_nights" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_rounds" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_round_placements" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "participant_link_requests" }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_chat_messages" }, () => loadChatMessages())
      .on("postgres_changes", { event: "*", schema: "public", table: "game_attendance" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_event_arrivals" }, refresh)
      .subscribe();
    return () => db.removeChannel(channel);
  }, [session, selectedEventId]);

  async function refresh() {
    if (!db || !session) return;
    const refreshRequest = ++refreshRequestRef.current;
    const [eventsResult, p, current, roleResult, displayRoleResult, requests] = await Promise.all([
      db.from("game_nights").select("*").order("event_date", { ascending: true }),
      db.from("participants").select("*").order("created_at"),
      db.rpc("get_my_participant_id"),
      isAdmin ? db.rpc("admin_list_participant_roles") : Promise.resolve({ data: null, error: null }),
      db.rpc("list_participant_display_roles"),
      db.from("participant_link_requests").select("*").order("requested_at", { ascending: false })
    ]);
    if (refreshRequest !== refreshRequestRef.current) return;
    const issue = [eventsResult,p,current,roleResult,displayRoleResult,requests].find(x=>x.error);
    if (issue) { setError(issue.error.message); setLoading(false); return; }
    const events = eventsResult.data || [];
    setGameNights(events);
    let activeId = selectedEventId;
    if (!activeId || !events.some(event=>event.id===activeId)) {
      const now = new Date();
      const today = now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0");
      const upcoming = events.filter(event=>!event.is_archived && event.event_date>=today).sort((a,b)=>a.event_date.localeCompare(b.event_date))[0];
      const fallback = events.filter(event=>!event.is_archived).sort((a,b)=>b.event_date.localeCompare(a.event_date))[0] || events[0];
      activeId = (upcoming || fallback)?.id || null;
      if (activeId !== selectedEventId) setSelectedEventId(activeId);
    }
    if (p.data) setParticipants(p.data);
    if (roleResult?.data) setParticipantRoles(roleResult.data);
    if (displayRoleResult?.data) setDisplayRoles(displayRoleResult.data);
    if (requests.data) {
      setLinkRequests(requests.data);
      setPendingLink(requests.data.some(x=>x.requester_id===session.user.id&&x.status==="pending"));
    }
    if (current.data) {
      setParticipantId(current.data);
      const me=p.data?.find(x=>x.id===current.data);
      if(me){setName(me.name);setNameInput(me.name);setParticipantNameDraft(me.name);setParticipantSloganDraft(me.slogan||"");}
      else setName("");
    }
    if (!activeId) {
      setSettings(null);setGames([]);setVotes([]);setVoteCounts([]);setRounds([]);setPlacements([]);setAttendance([]);setEventArrivals([]);setMyAttendance("");setArrivalTime("");setChatMessages([]);setLoading(false);return;
    }
    const [eventResult,gamesResult,attendanceResult,arrivalResult] = await Promise.all([
      db.from("game_nights").select("*").eq("id",activeId).maybeSingle(),
      db.from("games").select("*").eq("event_id",activeId).order("created_at",{ascending:false}),
      db.from("game_attendance").select("*").eq("event_id",activeId),
      db.from("game_event_arrivals").select("*").eq("event_id",activeId)
    ]);
    if (refreshRequest !== refreshRequestRef.current) return;
    const issue2=[eventResult,gamesResult,attendanceResult,arrivalResult].find(x=>x.error);
    if(issue2) setError(issue2.error.message);
    const eventGames=gamesResult.data||[], gameIds=eventGames.map(g=>g.id);
    const [votesResult,voteCountsResult,roundsResult] = gameIds.length ? await Promise.all([
      db.from("votes").select("*").in("game_id",gameIds),
      db.rpc("get_game_vote_counts",{p_game_ids:gameIds}),
      db.from("game_rounds").select("*").in("game_id",gameIds).order("round_number")
    ]) : [{data:[],error:null},{data:[],error:null},{data:[],error:null}];
    const roundIds=(roundsResult.data||[]).map(r=>r.id);
    const placementsResult=roundIds.length ? await db.from("game_round_placements").select("*").in("round_id",roundIds).order("place") : {data:[],error:null};
    if (refreshRequest !== refreshRequestRef.current) return;
    const allGamesResult = await db.from("games").select("id");
    const allGameIds = (allGamesResult.data || []).map(g => g.id);
    const allRoundsResult = allGameIds.length ? await db.from("game_rounds").select("id").in("game_id", allGameIds) : { data: [], error: null };
    const allRoundIds = (allRoundsResult.data || []).map(r => r.id);
    const allWinsResult = allRoundIds.length ? await db.from("game_round_placements").select("participant_id").eq("place", 1).in("round_id", allRoundIds) : { data: [], error: null };
    if (refreshRequest !== refreshRequestRef.current) return;
    const winsByParticipant = {};
    (allWinsResult.data || []).forEach(row => { winsByParticipant[row.participant_id] = (winsByParticipant[row.participant_id] || 0) + 1; });
    setAllTimeWins(winsByParticipant);
    const issue3=[votesResult,voteCountsResult,roundsResult,placementsResult,allGamesResult,allRoundsResult,allWinsResult].find(x=>x.error);
    if(issue3) setError(issue3.error.message);
    if(eventResult.data){
      setSettings(eventResult.data);
      setEventTitleDraft(eventResult.data.event_title||"Saturday Game Night");
      setEventDateDraft(eventResult.data.event_date||"");
      setEventTimeDraft(toInputEventTime(eventResult.data.event_time));
      setEventLocationDraft(eventResult.data.location||"");
      setCalendarMonth(new Date(Number(eventResult.data.event_date.slice(0,4)),Number(eventResult.data.event_date.slice(5,7))-1,1));
    }
    setGames(eventGames);setVotes(votesResult.data||[]);setVoteCounts(voteCountsResult.data||[]);setRounds(roundsResult.data||[]);setPlacements(placementsResult.data||[]);setExpandedRounds(Object.fromEntries(eventGames.map(game => [game.id, true])));
    setAttendance(attendanceResult.data||[]);
    setEventArrivals(arrivalResult.data||[]);
    const myArrival=(arrivalResult.data||[]).find(x=>x.participant_id===current.data);
    setArrivalTime(toInputTime(myArrival?.arrival_time));
    setMyAttendance((attendanceResult.data||[]).find(x=>x.participant_id===current.data)?.status||"");
    if (refreshRequest !== refreshRequestRef.current) return;
    await loadChatMessages(activeId);
    if (refreshRequest !== refreshRequestRef.current) return;
    setLoading(false);
  }

  async function loadChatMessages(eventId=selectedEventId) {
    if(!db||!session||!eventId) return;
    const chatRequest = ++chatRequestRef.current;
    const requestedEventId = eventId;
    const {data,error:chatError}=await db.from("game_chat_messages").select("*").eq("event_id",requestedEventId).order("created_at",{ascending:false}).limit(100);
    if (chatRequest !== chatRequestRef.current || selectedEventIdRef.current !== requestedEventId) return;
    if(chatError) setError(chatError.message); else setChatMessages((data||[]).reverse());
  }

  async function sendChatMessage(e) {
    e.preventDefault();
    const message=chatDraft.trim();
    if(!message||!participantId||!name||!selectedEventId) return;
    if(settings?.is_archived){setError("This Game Night is archived and its chat is read-only.");return;}
    if(message.length>1000){setError("Messages must be 1,000 characters or fewer.");return;}
    setBusy(true);setError("");setNotice("");
    try{
      const {error:sendError}=await db.from("game_chat_messages").insert({event_id:selectedEventId,participant_id:participantId,sender_name:name,message});
      if(sendError) throw sendError;
      setChatDraft("");await loadChatMessages(selectedEventId);
    }catch(err){setError(err.message||"Unable to send your message.");}
    finally{setBusy(false);}
  }

  async function setEventAttendance(status) {
    if(!participantId||!selectedEventId||settings?.is_archived) return;
    const {error:e}=await db.from("game_attendance").upsert({event_id:selectedEventId,participant_id:participantId,status},{onConflict:"event_id,participant_id"});
    if(e) setError(e.message); else {setMyAttendance(status);await refresh();}
  }

  async function saveParticipantAttendance(person) {
    if (!canManageAttendance || !selectedEventId || settings?.is_archived) return;
    const current = attendance.find(row => row.participant_id === person.id);
    const arrival = eventArrivals.find(row => row.participant_id === person.id);
    const draft = attendanceDrafts[person.id] || {};
    const status = draft.status ?? current?.status ?? "";
    const time = draft.arrivalTime ?? toInputTime(arrival?.arrival_time);
    if (!status) {
      setError("Choose an attendance status before saving.");
      return;
    }
    if ((status === "going" || status === "maybe") && !time) {
      setError("Select an arrival time for participants marked Going or Maybe.");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: attendanceError } = await db.from("game_attendance").upsert(
        { event_id: selectedEventId, participant_id: person.id, status },
        { onConflict: "event_id,participant_id" }
      );
      if (attendanceError) throw attendanceError;
      if (status === "going" || status === "maybe") {
        const { error: arrivalError } = await db.from("game_event_arrivals").upsert(
          { event_id: selectedEventId, participant_id: person.id, arrival_time: formatTime(time) },
          { onConflict: "event_id,participant_id" }
        );
        if (arrivalError) throw arrivalError;
      }
      setNotice("Attendance updated for " + person.name + ".");
      setAttendanceDrafts(v => { const next = { ...v }; delete next[person.id]; return next; });
      await refresh();
    } catch (err) {
      setError(err.message || "Unable to update participant attendance.");
    } finally {
      setBusy(false);
    }
  }


  async function checkInParticipant(person) {
    if (!canManageAttendance || !selectedEventId || settings?.is_archived) return;
    const existingArrival = eventArrivals.find(row => row.participant_id === person.id);
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: checkInError } = await db.from("game_event_arrivals").upsert(
        {
          event_id: selectedEventId,
          participant_id: person.id,
          arrival_time: existingArrival?.arrival_time || "TBD Pending...",
          checked_in_at: new Date().toISOString()
        },
        { onConflict: "event_id,participant_id" }
      );
      if (checkInError) throw checkInError;
      setNotice(person.name + " checked in.");
      await refresh();
    } catch (err) {
      setError(err.message || "Unable to check in participant.");
    } finally {
      setBusy(false);
    }
  }

  function formatCheckInTime(value) {
    if (!value) return "";
    return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  function toLocalDateTimeInput(value) {
    if (!value) return "";
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  async function clearCheckIn(person) {
    if (!canManageAttendance || !selectedEventId || settings?.is_archived) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: e } = await db.from("game_event_arrivals").update({ checked_in_at: null }).eq("event_id", selectedEventId).eq("participant_id", person.id);
      if (e) throw e;
      setNotice(person.name + "'s check-in was cleared."); await refresh();
    } catch (err) { setError(err.message || "Unable to clear check-in."); }
    finally { setBusy(false); }
  }

  async function updateCheckInTime(person, value) {
    if (!canManageAttendance || !selectedEventId || settings?.is_archived || !value) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: e } = await db.from("game_event_arrivals").update({ checked_in_at: new Date(value).toISOString() }).eq("event_id", selectedEventId).eq("participant_id", person.id);
      if (e) throw e;
      setNotice(person.name + "'s check-in time was updated."); await refresh();
    } catch (err) { setError(err.message || "Unable to update check-in time."); }
    finally { setBusy(false); }
  }

  function selectGameNight(eventId) {
    const chosen=gameNights.find(event=>event.id===eventId);
    refreshRequestRef.current += 1;
    chatRequestRef.current += 1;
    setSelectedEventId(eventId || null);
    setArrivalTime("");setEventArrivals([]);setAttendance([]);setMyAttendance("");
    setGames([]);setVotes([]);setVoteCounts([]);setRounds([]);setPlacements([]);setChatMessages([]);
    setAttendanceDrafts({});setRoundNotes({});setPlacementDrafts({});setExpandedRounds({});setChatDraft("");setGameTitle("");setGameDescription("");
    setCalendarOpen(false);setChatExpanded(false);setScoreboardMode(false);setError("");setNotice("");
    if(chosen) {
      setSettings(chosen);
      setEventTitleDraft(chosen.event_title||"Saturday Game Night");
      setEventDateDraft(chosen.event_date||"");
      setEventTimeDraft(toInputEventTime(chosen.event_time));
      setEventLocationDraft(chosen.location||"");
      if(chosen.event_date) setCalendarMonth(new Date(Number(chosen.event_date.slice(0,4)),Number(chosen.event_date.slice(5,7))-1,1));
    }
  }

  async function createGameNight() {
    if(!isAdmin||!newEventDate||!newEventTime) return;
    setBusy(true);setError("");setNotice("");
    try{
      const {data,error:e}=await db.from("game_nights").insert({event_title:newEventTitle.trim()||"Saturday Game Night",event_date:newEventDate,event_time:formatTime(newEventTime),location:newEventLocation.trim()||null,created_by:session.user.id}).select("*").single();
      if(e) throw e;
      setNewEventTitle("Saturday Game Night");setNewEventDate("");setNewEventTime("19:00");setNewEventLocation("");
      setSelectedEventId(data.id);setNotice("New Game Night created.");await refresh();
    }catch(err){setError(err.message||"Unable to create Game Night. Check whether another event already uses that date.");}
    finally{setBusy(false);}
  }

  async function duplicateGameNight() {
    if(!isAdmin||!newEventDate||!newEventTime||!duplicateFromEventId) return;
    setBusy(true);setError("");setNotice("");
    try{
      const {data:event,error:eventError}=await db.from("game_nights").insert({event_title:newEventTitle.trim()||"Saturday Game Night",event_date:newEventDate,event_time:formatTime(newEventTime),location:newEventLocation.trim()||null,created_by:session.user.id}).select("*").single();
      if(eventError) throw eventError;
      const source=await db.from("games").select("*").eq("event_id",duplicateFromEventId);
      if(source.error) throw source.error;
      for(const game of source.data||[]){
        const {data:newGame,error:gameError}=await db.from("games").insert({event_id:event.id,title:game.title,description:game.description,suggested_by:participantId}).select("id").single();
        if(gameError) throw gameError;
        const oldRounds=await db.from("game_rounds").select("*").eq("game_id",game.id).order("round_number");
        if(oldRounds.error) throw oldRounds.error;
        for(const round of oldRounds.data||[]){
          const {error:roundError}=await db.from("game_rounds").insert({game_id:newGame.id,round_number:round.round_number,notes:round.notes,created_by:session.user.id});
          if(roundError) throw roundError;
        }
      }
      setSelectedEventId(event.id);setNotice("New Game Night created with the previous game setup. Scores, votes, chat, and attendance were not copied.");await refresh();
    }catch(err){setError(err.message||"Unable to duplicate Game Night.");}
    finally{setBusy(false);}
  }

  async function archiveGameNight(event) {
    if(!isAdmin) return;
    if(!window.confirm((event.is_archived?"Reopen ":"Archive ")+event.event_title+"?")) return;
    const {error:e}=await db.from("game_nights").update({is_archived:!event.is_archived}).eq("id",event.id);
    if(e) setError(e.message); else {setNotice(event.is_archived?"Game Night reopened.":"Game Night archived and made read-only.");await refresh();}
  }

  async function deleteGameNight(event) {
    if(!isAdmin || !event?.id) return;
    const label=event.event_title+" ("+displayEventDate(event.event_date)+")";
    if(!window.confirm("Are you sure you want to delete "+label+"?")) return;
    if(!window.confirm("FINAL CONFIRMATION: This permanently deletes this Game Night and its games, rounds, scores, votes, chat, attendance, and arrival times. This cannot be undone. Delete it now?")) return;
    setBusy(true);setError("");setNotice("");
    try {
      const {error:e}=await db.from("game_nights").delete().eq("id",event.id);
      if(e) throw e;
      const remaining=gameNights.filter(item=>item.id!==event.id);
      const nextEvent=remaining.filter(item=>!item.is_archived).sort((a,b)=>a.event_date.localeCompare(b.event_date))[0] || remaining[0] || null;
      setSelectedEventId(nextEvent?.id || null);
      setEventTitleDraft(nextEvent?.event_title||"Saturday Game Night");
      setEventDateDraft(nextEvent?.event_date||"");
      setEventTimeDraft(toInputEventTime(nextEvent?.event_time));
      setEventLocationDraft(nextEvent?.location||"");
      setNotice("Game Night deleted.");
      await refresh();
    } catch(err) {
      setError(err.message||"Unable to delete this Game Night.");
    } finally {
      setBusy(false);
    }
  }

  const calendarDays=(()=>{
    const year=calendarMonth.getFullYear(),month=calendarMonth.getMonth();
    const first=new Date(year,month,1),count=new Date(year,month+1,0).getDate(),offset=(first.getDay()+6)%7;
    return [...Array(offset).fill(null),...Array.from({length:count},(_,i)=>i+1)];
  })();

  function formatChatTimestamp(value) {
    return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  }

  function toInputTime(value) {
    if (!value || value === "TBD Pending...") return "";
    // Supabase TIME columns commonly return HH:MM:SS; text values may use AM/PM.
    const match = String(value).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (!match) return "";
    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const second = match[3] == null ? 0 : Number(match[3]);
    const suffix = match[4]?.toUpperCase();
    if (suffix && (hour < 1 || hour > 12)) return "";
    if (suffix === "PM" && hour < 12) hour += 12;
    if (suffix === "AM" && hour === 12) hour = 0;
    if (hour > 23 || minute > 59 || second > 59) return "";
    return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
  }
  function toInputEventTime(value) {
    if (!value) return "19:00";
    const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return "19:00";
    let hour = Number(match[1]);
    const minute = match[2];
    const suffix = match[3]?.toUpperCase();
    if (suffix === "PM" && hour < 12) hour += 12;
    if (suffix === "AM" && hour === 12) hour = 0;
    return String(hour).padStart(2, "0") + ":" + minute;
  }
  function displayEventDate(value) {
    if (!value) return "Date to be announced";
    const parts = value.split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return value;
    return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric"
    });
  }
  function formatTime(value) {
    if (!value) return "Not set";
    const [h, m] = value.split(":").map(Number);
    return (h % 12 || 12) + ":" + String(m).padStart(2, "0") + (h >= 12 ? " PM" : " AM");
  }


  async function join(e) {
    e.preventDefault();
    const clean = nameInput.trim().replace(/\s+/g, " ");
    if (!clean || !db) return;
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
        if (!arrivalTime) throw new Error("Please select your arrival time.");
        if (!selectedEventId) throw new Error("Please select a Game Night first.");
        const { error: updateError } = await db.from("game_event_arrivals").upsert({ event_id: selectedEventId, participant_id: id, arrival_time: formatTime(arrivalTime) }, { onConflict: "event_id,participant_id" });
        if (updateError) throw updateError;
        setName(ownProfile.name); setParticipantId(id); setParticipantPassword("");
        setNotice("Your arrival time has been updated.");
        await refresh();
        return;
      }

      if (participantPassword.length < 8) { setError("Participant password must be at least 8 characters."); return; }

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
        id: current.user.id, name: clean, arrival_time: "TBD Pending..."
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
    if (!gameTitle.trim() || !participantId || !selectedEventId || settings?.is_archived) return;
    setBusy(true); setError(""); setNotice("");
    const { error: e2 } = await db.from("games").insert({
      event_id: selectedEventId, title: gameTitle.trim(), description: gameDescription.trim() || null, suggested_by: participantId
    });
    if (e2) setError(e2.message);
    else { setNotice('"' + gameTitle.trim() + '" was added.'); setGameTitle(""); setGameDescription(""); await refresh(); }
    setBusy(false);
  }

  async function vote(gameId, voteType) {
    if (!settings?.voting_open || !participantId || settings?.is_archived || !["up", "down"].includes(voteType)) return;
    const existing = votes.find(v => v.game_id === gameId && v.participant_id === participantId);
    setBusy(true);
    let result;
    if (existing?.vote_type === voteType) {
      result = await db.from("votes").delete().eq("id", existing.id);
    } else if (existing) {
      result = await db.from("votes").update({ vote_type: voteType }).eq("id", existing.id);
    } else {
      result = await db.from("votes").insert({ game_id: gameId, participant_id: participantId, vote_type: voteType });
    }
    if (result.error) setError(result.error.message);
    await refresh();
    setBusy(false);
  }

  async function switchName() {
    await db.auth.signOut();
    setName(""); setNameInput(""); setParticipantId(null); setDuplicateParticipant(null); setPendingLink(false); setGroupPassword(""); setParticipantPassword("");
    setArrivalTime("");
  }

  async function updateMyParticipantName(e) {
    e.preventDefault();
    const clean = participantNameDraft.trim().replace(/\s+/g, " ");
    if (!clean) { setError("Name cannot be blank."); return; }
    if (clean.length > 80) { setError("Name must be 80 characters or fewer."); return; }
    if (normalizeName(clean) === normalizeName(name)) {
      setParticipantNameDraft(name);
      setNotice("Your name is already up to date.");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: updateError } = await db.rpc("update_my_participant_name", { p_name: clean });
      if (updateError) throw updateError;
      setName(clean);
      setNameInput(clean);
      setParticipantNameDraft(clean);
      setNotice("Your participant name has been updated.");
      await refresh();
    } catch (err) {
      setError(err.message || "Unable to update your name.");
    } finally {
      setBusy(false);
    }
  }
  async function updateMyParticipantSlogan(e) {
    e.preventDefault();
    const clean = participantSloganDraft.trim();
    if (clean.length > 100) { setError("Slogan must be 100 characters or fewer."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: updateError } = await db.rpc("update_my_participant_slogan", { p_slogan: clean });
      if (updateError) throw updateError;
      setParticipantSloganDraft(clean);
      setNotice(clean ? "Your slogan has been updated." : "Your slogan has been cleared.");
      await refresh();
    } catch (err) {
      setError(err.message || "Unable to update your slogan.");
    } finally {
      setBusy(false);
    }
  }

  async function changeMyPassword(e) {
    e.preventDefault();
    if (newPasswordDraft.length < 8 || newPasswordDraft.length > 200) {
      setError("New password must be at least 8 characters and no more than 200 characters.");
      return;
    }
    if (newPasswordDraft !== confirmPasswordDraft) {
      setError("The new password and confirmation do not match.");
      return;
    }
    if (currentPasswordDraft === newPasswordDraft) {
      setError("Your new password must be different from your current password.");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const { data, error: changeError } = await db.rpc("change_my_participant_password", {
        p_current_password: currentPasswordDraft,
        p_new_password: newPasswordDraft
      });
      if (changeError) throw changeError;
      if (!data) throw new Error("Your current password is incorrect. Please try again.");
      setCurrentPasswordDraft(""); setNewPasswordDraft(""); setConfirmPasswordDraft("");
      setNotice("Your password has been updated. Other devices will need to sign in again using the new password.");
    } catch (err) {
      setError(err.message || "Unable to update your password.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEventDetails() {
    if (!selectedEventId) {
      setError("Please select a Game Night to update.");
      return;
    }
    if (!eventDateDraft || !eventTimeDraft) {
      setError("Please enter both the game night date and time.");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    const { error: e } = await db.from("game_nights").update({ event_title: eventTitleDraft.trim() || "Saturday Game Night", event_date: eventDateDraft, event_time: formatTime(eventTimeDraft), location: eventLocationDraft.trim() || null }).eq("id", selectedEventId);
    if (e) setError(e.message);
    else {
      setNotice("Game night title, date, time, and location updated.");
      await refresh();
    }
    setBusy(false);
  }

  async function toggleVoting() {
    if (settings?.is_archived) { setError("Archived Game Nights are view-only."); return; }
    const { error: e } = await db.from("game_nights").update({ voting_open: !settings.voting_open }).eq("id", selectedEventId);
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

  function isProtectedAdminAccount(person) {
    return normalizeName(person?.name || "") === "admin";
  }

  async function setParticipantAdmin(person, makeAdmin) {
    const { error: e } = await db.rpc("admin_set_participant_admin", { p_participant_id: person.id, p_make_admin: makeAdmin });
    if (e) setError(e.message);
    else { setNotice(person.name + (makeAdmin ? " is now an administrator." : " is no longer an administrator.")); await db.auth.refreshSession(); await refresh(); }
  }

  async function toggleScoreboardEditing() {
    if (settings?.is_archived) { setError("Archived Game Nights are view-only."); return; }
    if (scoreboardMode) {
      setScoreboardMode(false);
      setNotice("Scoreboard editing is off.");
      setError("");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const { data: allowed, error: permissionError } = await db.rpc("current_user_can_manage_scoreboard");
      if (permissionError) throw permissionError;
      if (allowed !== true) {
        throw new Error("Your account is not assigned the Game Admin role. Ask a full administrator to promote the correct participant account.");
      }
      setScoreboardMode(true);
      setNotice("Scoreboard editing is on. You can now add, edit, and remove rounds and results.");
    } catch (err) {
      setError(err.message || "Unable to verify scoreboard permissions.");
    } finally {
      setBusy(false);
    }
  }

  async function setParticipantGameAdmin(person, makeGameAdmin) {
    const { error: e } = await db.rpc("admin_set_participant_game_admin", {
      p_participant_id: person.id, p_make_game_admin: makeGameAdmin
    });
    if (e) setError(e.message);
    else {
      setNotice(person.name + (makeGameAdmin ? " is now a Game Admin and can manage the scoreboard." : " is no longer a Game Admin."));
      await refresh();
    }
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
    if (settings?.is_archived) { setError("Archived Game Nights are read-only."); return; }
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

  async function deleteRound(round) {    if (!window.confirm("Delete Round " + round.round_number + " and all placements recorded for this round? This cannot be undone.")) return;
    const { error: e } = await db.from("game_rounds").delete().eq("id", round.id);
    if (e) setError(e.message);
    else { setNotice("Round and its placements deleted."); await refresh(); }
  }

  async function addPlacement(round) {
    if (busy) return;
    const draft = placementDrafts[round.id] || {};
    if (settings?.is_archived) { setError("Archived Game Nights are read-only."); return; }
    if (!draft.participant_id || !draft.place || !Number.isInteger(Number(draft.place)) || Number(draft.place) < 1) { setError("Choose a participant and a whole-number placement greater than zero."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      // Re-check the latest database state immediately before inserting. The dropdown
      // filter is only a convenience; this guard prevents stale UI state from adding
      // the same participant twice to one round.
      const { data: existingPlacement, error: lookupError } = await db.from("game_round_placements").select("id").eq("round_id", round.id).eq("participant_id", draft.participant_id).maybeSingle();
      if (lookupError) throw lookupError;
      if (existingPlacement) {
        setPlacementDrafts(v => ({ ...v, [round.id]: { ...v[round.id], participant_id: "" } }));
        setError("This participant already has a result in this round. Remove their existing result before adding them again.");
        await refresh();
        return;
      }
      const { data: insertedPlacement, error: insertError } = await db.from("game_round_placements").insert({
        round_id: round.id,
        participant_id: draft.participant_id,
        place: Number(draft.place),
        score: draft.score === "" ? null : Number(draft.score),
        notes: draft.notes?.trim() || null
      }).select("*").single();
      if (insertError) {
        if (insertError.code === "23505") {
          setPlacementDrafts(v => ({ ...v, [round.id]: { ...v[round.id], participant_id: "" } }));
          setError("This participant already has a result in this round. Remove their existing result before adding them again.");
          await refresh();
          return;
        }
        throw insertError;
      }
      // Update local state immediately so this participant disappears from this
      // round's dropdown without waiting for the next full refresh to finish.
      setPlacements(current => [...current.filter(item => !(String(item.round_id) === String(round.id) && String(item.participant_id) === String(draft.participant_id))), insertedPlacement]);
      setPlacementDrafts(v => ({ ...v, [round.id]: { participant_id: "", place: "1", score: "", notes: "" } }));
      setNotice("Round result saved.");
      await refresh();
    } catch (err) {
      setError(err.message || "Unable to save this round result.");
    } finally {
      setBusy(false);
    }
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

  const ranked = useMemo(() => games.map(g => {
    const counts = voteCounts.find(v => v.game_id === g.id);
    const upCount = Number(counts?.up_count ?? 0);
    const downCount = Number(counts?.down_count ?? 0);
    return {
      ...g,
      upCount,
      downCount,
      netVotes: upCount - downCount,
      myVote: counts?.my_vote ?? null
    };
  }).sort((a, b) => b.netVotes - a.netVotes || b.upCount - a.upCount || a.title.localeCompare(b.title)), [games, votes, voteCounts, participantId]);
  const totalVoteCount = voteCounts.reduce((sum, v) => sum + Number(v.up_count || 0) + Number(v.down_count || 0), 0);
  const max = Math.max(1, ...ranked.map(g => Math.max(0, g.netVotes)));
  const todayForCurrentEvent = new Date().getFullYear()+"-"+String(new Date().getMonth()+1).padStart(2,"0")+"-"+String(new Date().getDate()).padStart(2,"0");
  const currentGameNight = gameNights.filter(event => !event.is_archived && event.event_date >= todayForCurrentEvent).sort((a,b) => a.event_date.localeCompare(b.event_date))[0] || gameNights.filter(event => !event.is_archived).sort((a,b) => b.event_date.localeCompare(a.event_date))[0] || null;
  const pendingRequests = linkRequests.filter(r => r.status === "pending");
  const goingCount = attendance.filter(x => x.status === "going").length;
  const maybeCount = attendance.filter(x => x.status === "maybe").length;
  const notGoingCount = attendance.filter(x => x.status === "not_going").length;
  const activeParticipants = participants.filter(p => p.is_active !== false);
  const goingParticipants = activeParticipants.filter(p => attendance.some(a => a.participant_id === p.id && a.status === "going"));
  const playingParticipants = activeParticipants.filter(p => attendance.some(a => a.participant_id === p.id && (a.status === "going" || a.status === "maybe")));

  if (!db) return <div className="setup"><div className="setup-card"><div className="brand-icon"><Gamepad2/></div><h1>Connect your game night board</h1><p>Copy <code>.env.example</code> to <code>.env.local</code>, add your Supabase project URL and anon key, then run the SQL in <code>supabase/schema.sql</code>. Full instructions are in README.md.</p></div></div>;
  if (loading) return <div className="setup"><div className="setup-card"><div className="brand-icon"><Gamepad2/></div><h1>Loading game night…</h1></div></div>;

  return <main className="shell">
    <header className="topbar"><a className="brand" href="#"><span className="brand-icon"><Gamepad2 size={21}/></span> GAME NIGHT</a><div className="top-actions">{name && <button className="quiet" onClick={switchName}><LogOut size={15}/> Logout</button>}</div></header>
    <section className="hero">
      <div className="hero-copy"><div className="eyebrow"><Sparkles size={14}/> LET'S PICK THE NEXT GAME</div><h1>{(settings?.event_title || "Saturday Game Night").replace(/\s+/, " ").split(" ").slice(0, -1).join(" ") || "Saturday"}<br/><em>{(settings?.event_title || "Saturday Game Night").split(" ").slice(-1)[0]}.</em></h1><p>Bring your best ideas. Vote for the games you want to play.</p><div className="event-meta"><span><CalendarDays size={16}/> {displayEventDate(settings?.event_date)}</span><span><Clock3 size={16}/> {settings?.event_time || "7:00 PM"}</span>{settings?.location && <span><MapPin size={16}/> {settings.location}</span>}</div><div className="event-switcher"><button className="secondary event-calendar-trigger" onClick={() => setCalendarOpen(v => !v)}><CalendarDays size={16}/> Choose Game Night <ChevronDown size={14}/></button>{calendarOpen && <div className="event-calendar"><div className="calendar-heading"><button className="icon-action" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1))}>‹</button><b>{calendarMonth.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</b><button className="icon-action" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1))}>›</button></div><div className="calendar-grid">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <span className="calendar-weekday" key={d}>{d}</span>)}{calendarDays.map((day,i) => {const date=day?calendarMonth.getFullYear()+"-"+String(calendarMonth.getMonth()+1).padStart(2,"0")+"-"+String(day).padStart(2,"0"):null;const event=gameNights.find(x=>x.event_date===date);return <button key={i} disabled={!event} className={"calendar-day"+(event?" has-event":"")+(event?.id===selectedEventId?" selected":"")} onClick={() => event&&selectGameNight(event.id)}>{day||""}</button>;})}</div><small>Only dates created by an admin can be selected.</small></div>}</div>{settings?.is_archived && <div className="archived-banner">ARCHIVED GAME NIGHT · VIEW ONLY</div>}</div>
      <div className="hero-graphic"><div className="halo"/><Gamepad2 size={178} strokeWidth={1.1}/><b>✦</b></div>
    </section>

    {!name ? <section className="join panel">
      <div className="join-icon"><Users size={21}/></div><div><h2>Who's joining?</h2><p>Enter your name and create or access your participant account. Your name is locked after registration.</p></div>
      <form className="join-form" onSubmit={e=>{e.preventDefault(); duplicateParticipant ? signInToExistingParticipant() : join(e);}}>
        <label>Your name<input value={nameInput} onChange={e=>setNameInput(e.target.value)} placeholder="Enter your name" maxLength={40} required/></label>
        <label>Participant password<input type="password" value={participantPassword} onChange={e=>setParticipantPassword(e.target.value)} placeholder="Create a password or enter your existing one" autoComplete="new-password" minLength={8} required/><small>Use at least 8 characters. Existing names require that participant’s password.</small></label>
        {!duplicateParticipant && <label>Group password<input type="password" value={groupPassword} onChange={e=>setGroupPassword(e.target.value)} placeholder="Enter the group password" autoComplete="off"/><small>Required only when creating a new participant account.</small></label>}
        <button className="primary" disabled={busy || !nameInput.trim() || participantPassword.length < 8}>{busy ? "Joining…" : duplicateParticipant ? "Continue" : "Join game night"} <span>→</span></button>
      </form>
      {duplicateParticipant && <div className="duplicate-prompt"><div><b>This participant already exists</b><p><strong>{duplicateParticipant.name}</strong> is already registered. Enter that participant's password to access the existing account. A new account will not be created.</p></div><div className="duplicate-actions"><button className="primary" disabled={busy || participantPassword.length < 8} onClick={signInToExistingParticipant}>Sign in to existing account</button><button className="secondary" onClick={() => { setDuplicateParticipant(null); setNameInput(""); setParticipantPassword(""); }}>Choose another name</button></div></div>}
    </section> : <>
      {accountMode ? <>
        <div className="main-navigation-wrap"><small className="main-navigation-title">MAIN MENU · ACCOUNT SETTINGS</small><nav className="main-page-nav"><button type="button" onClick={()=>setAccountMode(false)}><Users size={15}/> Back to Game Night</button>{isAdmin && <button type="button" className={adminMode?"active":""} onClick={()=>{setAdminMode(v=>!v);setAccountMode(false);}}><Shield size={15}/>{adminMode?"Admin mode":"Normal mode"}</button>}</nav></div>
        <div className="account-page-heading"><small>ACCOUNT</small><h1>Account settings</h1><p>Manage your participant profile and sign-in details.</p></div>
        <section className="panel account-profile-panel"><div className="panel-title"><div><small>PARTICIPANT PROFILE</small><h2>{name}</h2></div><span className="tile"><Users size={18}/></span></div><p className="muted">Update your display name here. Names must be unique; changing your name will update it everywhere on the game night board.</p><div className="account-role-row"><span>Assigned role</span><strong>{displayRoles.find(r => r.participant_id === participantId)?.role_label || "Participant"}</strong><small>Only a full administrator can change your role.</small></div><form className="change-password-form account-name-form" onSubmit={updateMyParticipantName}><label>Participant name<input type="text" value={participantNameDraft} onChange={e=>setParticipantNameDraft(e.target.value)} maxLength={80} autoComplete="name" required/></label><button className="secondary" disabled={busy || !participantNameDraft.trim()}>Save name</button></form><form className="change-password-form account-slogan-form" onSubmit={updateMyParticipantSlogan}><label>Slogan <small>Shown next to your name in The Crew only.</small><input type="text" value={participantSloganDraft} onChange={e=>setParticipantSloganDraft(e.target.value)} maxLength={100} placeholder="e.g. Board game champion"/></label><button className="secondary" disabled={busy}>Save slogan</button></form></section>
        <section className="panel account-password-panel"><div className="panel-title"><div><small>SECURITY</small><h2>Change password</h2></div><span className="tile"><Shield size={18}/></span></div><p className="muted">Enter your current password, then choose a new password. Other devices will need to sign in again using the new password.</p><form className="change-password-form" onSubmit={changeMyPassword}><label>Current password<input type="password" value={currentPasswordDraft} onChange={e=>setCurrentPasswordDraft(e.target.value)} autoComplete="current-password" required/></label><label>New password<input type="password" value={newPasswordDraft} onChange={e=>setNewPasswordDraft(e.target.value)} autoComplete="new-password" minLength={8} maxLength={200} required/><small>At least 8 characters.</small></label><label>Confirm new password<input type="password" value={confirmPasswordDraft} onChange={e=>setConfirmPasswordDraft(e.target.value)} autoComplete="new-password" minLength={8} maxLength={200} required/></label><button className="primary" type="submit" disabled={busy || !currentPasswordDraft || newPasswordDraft.length<8 || !confirmPasswordDraft}>{busy ? "Updating…" : "Update password"}</button></form></section>
        {isAdmin && <p className="muted account-admin-hint">Administrator settings are available when you return to the game night board with admin mode enabled.</p>}
      </> : <>
      <div className="welcome"><div><small>YOU'RE IN</small><h2>Hey, {name} ✌️</h2></div><span className="live"><i/> LIVE BOARD</span></div>
      <div className="main-navigation-wrap"><small className="main-navigation-title">MAIN MENU · {activeTab === "attendance" ? "ATTENDANCE" : activeTab === "games" ? "GAMES & VOTING" : activeTab === "scoreboard" ? "SCOREBOARD" : activeTab === "tools" ? "GAME TOOLS" : "ADMIN"}</small><nav className="main-page-nav" aria-label="Game Night pages">
        <button type="button" className={activeTab === "attendance" ? "active" : ""} onClick={() => setActiveTab("attendance")}><Users size={15}/> Attendance</button>
        <button type="button" className={activeTab === "games" ? "active" : ""} onClick={() => setActiveTab("games")}><Gamepad2 size={15}/> Games & Voting</button>
        <button type="button" className={activeTab === "scoreboard" ? "active" : ""} onClick={() => setActiveTab("scoreboard")}><Trophy size={15}/> Scoreboard</button>
        <button type="button" className={activeTab === "tools" ? "active" : ""} onClick={() => setActiveTab("tools")}><Dices size={15}/> Game Tools</button>
        {showAdminControls && <button type="button" className={activeTab === "admin" ? "active" : ""} onClick={() => setActiveTab("admin")}><Shield size={15}/> Admin</button>}
        <span className="navigation-spacer"/><button type="button" onClick={()=>{setAccountMode(true);setError("");setNotice("");}}><Settings size={15}/> Account</button>
        {isAdmin && <button type="button" className={adminMode?"active":""} onClick={()=>{if(adminMode)setActiveTab("attendance");setAdminMode(v=>!v);}}><Shield size={15}/>{adminMode?"Admin mode":"Normal mode"}</button>}
      </nav></div>{activeTab === "tools" && <>
      <section className="panel game-tools-panel">
        <div className="panel-title"><div><small>PLAYER TOOLKIT</small><h2>Dice Roller</h2></div><span className="tile"><Dices size={18}/></span></div>
        <p className="muted">Create one or more groups of dice. Every die in a group has the same number of sides.</p>
        <div className="dice-group-list">
          {diceGroups.map((group,index)=><div className="dice-group-row" key={group.id}>
            <div className="dice-group-heading"><strong>Dice group {index+1}</strong><button type="button" className="quiet dice-remove" disabled={diceGroups.length===1} onClick={()=>{setDiceGroups(groups=>groups.filter(item=>item.id!==group.id));setCreatedDice(dice=>dice.filter(die=>die.groupId!==group.id));setDiceResults(results=>results.filter(result=>result.groupId!==group.id));setDiceToolMessage("Dice group removed.");}}><X size={14}/> Remove group</button></div>
            <label>How many dice?<input type="number" min="1" max="100" value={group.count} onChange={e=>{setDiceGroups(groups=>groups.map(item=>item.id===group.id?{...item,count:e.target.value}:item));setCreatedDice([]);setDiceResults([]);}} /></label>
            <label>How many sides per die?<input type="number" min="2" max="1000" value={group.sides} onChange={e=>{setDiceGroups(groups=>groups.map(item=>item.id===group.id?{...item,sides:e.target.value}:item));setCreatedDice([]);setDiceResults([]);}} /></label>
          </div>)}
        </div>
        <div className="dice-setup-actions">
          <button type="button" className="secondary" onClick={()=>{setDiceGroups(groups=>[...groups,{id:nextDiceGroupId,count:"1",sides:"6"}]);setNextDiceGroupId(id=>id+1);setCreatedDice([]);setDiceResults([]);setDiceToolMessage("");}}><Plus size={14}/> Add dice group</button>
          <button type="button" className="primary" onClick={createDiceSet}><Dices size={14}/> Create dice</button>
          <button type="button" className="secondary" onClick={()=>{setDiceGroups([{id:1,count:"2",sides:"20"}]);setNextDiceGroupId(2);setCreatedDice([]);setDiceResults([]);setDiceToolMessage("Dice setup reset.");}}>Reset</button>
        </div>
        {diceToolMessage && <p className="dice-tool-message" role="status">{diceToolMessage}</p>}
        {createdDice.length>0 && <div className="dice-results-area">
          <div className="dice-results-heading"><div><small>YOUR DICE</small><h3>{createdDice.length} dice ready</h3></div><button type="button" className="quiet" onClick={()=>{setCreatedDice([]);setDiceResults([]);setDiceToolMessage("All dice removed.");}}><X size={14}/> Remove all</button></div>
          <div className="dice-groups-results">{diceGroups.map((group,groupIndex)=>{const groupDice=createdDice.filter(die=>die.groupId===group.id);const groupResults=groupDice.map(die=>diceResults.find(result=>result.id===die.id)).filter(Boolean);const groupTotal=groupResults.reduce((sum,result)=>sum+result.result,0);return <section className="dice-group-results" key={group.id}><div className="dice-group-results-heading"><div><b>Dice group {groupIndex+1}</b><small>{groupDice.length} {groupDice.length===1?"die":"dice"} · 1–{group.sides}</small></div><div className="dice-group-total"><small>GROUP TOTAL</small><strong>{groupResults.length?groupTotal:"—"}</strong></div></div><div className="dice-result-list">{groupDice.map((die,index)=>{const rolled=diceResults.find(result=>result.id===die.id);return <div className={"dice-result-card"+(rolled?" rolled":"")} key={die.id}><span>Die {index+1}</span><strong>{rolled?rolled.result:"—"}</strong><small>1–{die.sides}</small><button type="button" className="dice-single-remove" title="Remove this die" aria-label={"Remove die from group "+(groupIndex+1)} onClick={()=>removeDie(die.id)}><X size={13}/></button></div>;})}</div><button type="button" className="secondary dice-roll-group-button" disabled={!groupDice.length} onClick={()=>rollDice(group.id)}><Dices size={14}/> Roll group {groupIndex+1}</button></section>;})}</div>
          <div className="dice-grand-total"><div><small>ALL GROUPS TOTAL</small><strong>{diceResults.length?diceResults.reduce((sum,result)=>sum+result.result,0):"—"}</strong></div><span>{diceResults.length} of {createdDice.length} dice rolled</span></div>
          <button type="button" className="primary dice-roll-button" disabled={!createdDice.length} onClick={()=>rollDice()}><Dices size={16}/> Roll All</button>
        </div>}
      </section>
      </>}{activeTab === "attendance" && <>
      <section className="panel attendance-panel"><div className="panel-title"><div><small>THIS GAME NIGHT</small><h2>Attendance</h2></div><span className="tile"><Users size={18}/></span></div><p className="muted">Let everyone know whether you are joining this date.</p><div className="attendance-actions">{[["going","Going"],["maybe","Maybe"],["not_going","Not Going"]].map(([value,label]) => <button key={value} className={"secondary"+(myAttendance===value?" selected":"")} disabled={busy||settings?.is_archived} onClick={() => setEventAttendance(value)}>{myAttendance===value?"✓ ":""}{label}</button>)}</div>{(myAttendance==="going"||myAttendance==="maybe") && <form className="arrival-update" onSubmit={join}><label>Update your arrival time<ArrivalTimePicker value={arrivalTime} onChange={setArrivalTime}/><small>{arrivalTime ? "Current saved time: " + formatTime(arrivalTime) : "Please select a time."}</small></label><button className="secondary" disabled={busy||settings?.is_archived}>Save arrival time</button></form>}<div className="attendance-summary"><span><b>{goingCount}</b> Going</span><span><b>{maybeCount}</b> Maybe</span><span><b>{notGoingCount}</b> Not Going</span></div><div className="attendance-list">{attendance.map(item => <span key={item.id}>{participants.find(p=>p.id===item.participant_id)?.name||"Participant"} · {item.status==="not_going"?"Not Going":item.status[0].toUpperCase()+item.status.slice(1)}</span>)}</div>{canManageAttendance && <div className="admin-section attendance-admin-section"><h3><Shield size={16}/> Manage participant attendance</h3><p className="muted">Administrators and Game Admins can update each participant’s RSVP and arrival time for this Game Night.</p>{participants.filter(person=>person.is_active!==false).map(person=>{const savedStatus=attendance.find(row=>row.participant_id===person.id)?.status||"";const savedArrival=eventArrivals.find(row=>row.participant_id===person.id)?.arrival_time;const draft=attendanceDrafts[person.id]||{};const status=draft.status??savedStatus;const time=draft.arrivalTime??toInputTime(savedArrival);return <div className="request-row attendance-admin-row" key={person.id}><div className="attendance-admin-person"><b>{person.name}</b><select aria-label={"Attendance status for "+person.name} value={status} onChange={e=>setAttendanceDrafts(v=>({...v,[person.id]:{...v[person.id],status:e.target.value}}))}><option value="">No response</option><option value="going">Going</option><option value="maybe">Maybe</option><option value="not_going">Not Going</option></select>{(status==="going"||status==="maybe")&&<ArrivalTimePicker value={time} onChange={value=>setAttendanceDrafts(v=>({...v,[person.id]:{...v[person.id],arrivalTime:value}}))}/>}</div><div className="attendance-admin-actions"><button className="secondary" disabled={busy||settings?.is_archived||!status||((status==="going"||status==="maybe")&&!time)} onClick={()=>saveParticipantAttendance(person)}>Save</button>{eventArrivals.find(row=>row.participant_id===person.id)?.checked_in_at ? <><label className="check-in-edit">Check-in time<input aria-label={"Edit check-in time for "+person.name} type="datetime-local" value={toLocalDateTimeInput(eventArrivals.find(row=>row.participant_id===person.id)?.checked_in_at)} disabled={busy||settings?.is_archived} onChange={e=>updateCheckInTime(person,e.target.value)}/></label><button className="secondary check-in-clear" disabled={busy||settings?.is_archived} onClick={()=>clearCheckIn(person)}>Clear check-in</button></> : <button className="primary check-in-button" disabled={busy||settings?.is_archived} onClick={()=>checkInParticipant(person)}><UserCheck size={13}/> Check in</button>}</div></div>;})}</div>}</section>
      <section className="stats">
        <div className="stat"><Gamepad2/><strong>{games.length}</strong><span>Games suggested</span></div>
        <div className="stat"><ThumbsUp/><strong>{totalVoteCount}</strong><span>Total votes</span></div>
        <div className="stat"><Users/><strong>{goingParticipants.length}</strong><span>People joining</span></div>
      </section>
      <section className="panel crew"><div className="crew-head"><div><small>THE CREW</small><h2>Who's playing?</h2></div><span>{playingParticipants.length} {playingParticipants.length===1?"person":"people"}</span></div>
        {!playingParticipants.length ? <div className="empty"><Users size={28}/><b>No one has confirmed yet</b><span>Participants who select Going or Maybe will appear here.</span></div> : <div className="people">{playingParticipants.map((p,i)=>{const rsvp=attendance.find(a=>a.participant_id===p.id)?.status;return <div className="person" key={p.id}><span className={"avatar a"+(i%5)}>{p.name.charAt(0).toUpperCase()}</span><span className="person-detail"><b>{p.name}{p.id===participantId && <em>YOU</em>}{p.slogan && <span className="person-slogan"> · {p.slogan}</span>}<span className="person-role">{displayRoles.find(r => r.participant_id === p.id)?.role_label || "Participant"}</span><span className="person-win-count">🏆 {allTimeWins[p.id] || 0} all-time wins · {placements.filter(row=>row.participant_id===p.id && Number(row.place)===1).length} this Game Night</span></b><small><strong>{rsvp==="going"?"Going":"Maybe"}</strong> · <Clock3 size={12}/> Arriving at {eventArrivals.find(x=>x.participant_id===p.id)?.arrival_time || "TBD Pending..."}{eventArrivals.find(x=>x.participant_id===p.id)?.checked_in_at ? <span className="check-in-label"> · <UserCheck size={12}/> Checked in at {formatCheckInTime(eventArrivals.find(x=>x.participant_id===p.id)?.checked_in_at)}</span> : <span className="check-in-label check-in-pending"> · Not checked in</span>}</small></span></div>;})}</div>}
      </section>
      </>}
      {activeTab === "games" && (
      <div className="columns">
        <section className="panel suggest"><div className="panel-title"><div><small>ADD TO THE LINEUP</small><h2>Suggest a game</h2></div><span className="tile"><Plus/></span></div><p>Got a game everyone should try? Put it up for a vote.</p>
          <form onSubmit={addGame}><label>Game title<input value={gameTitle} onChange={e=>setGameTitle(e.target.value)} placeholder="e.g. Mario Kart 8 Deluxe" maxLength={80} required/></label><label>Why should we play it? <i>OPTIONAL</i><textarea value={gameDescription} onChange={e=>setGameDescription(e.target.value)} placeholder="A quick description or player count…" maxLength={240}/></label><button className="primary full" disabled={busy || !gameTitle.trim()}><Plus size={16}/> Add game suggestion</button></form>
          <div className="hint"><Info size={15}/> Suggest as many games as you like.</div>
        </section>
        <section className="panel voting"><div className="panel-title"><div><small>THE COMMUNITY PICKS</small><h2>Vote for games</h2></div><span className="tile gold"><Trophy/></span></div><p className="instruction"><i/> Vote for every game you'd like to play.</p>
          {!settings?.voting_open && <div className="closed">Voting is currently closed.</div>}
          {!ranked.length ? <div className="empty"><Gamepad2 size={28}/><b>No games yet</b><span>Be the first to suggest one!</span></div> : <div className="game-list">{ranked.map((g,i)=><article className="game" key={g.id}><div className="rank">{i===0 && g.upCount ? <Trophy size={16}/> : String(i+1).padStart(2,"0")}</div><div className="game-info"><div className="game-heading"><strong className="game-score">{g.netVotes}</strong><b>{g.title}</b>{i===0 && g.netVotes>0 && <small>LEADING</small>}</div><div className="vote-caption">Voted: {g.upCount} up · {g.downCount} down</div>{g.description && <p>{g.description}</p>}<div className="byline">Suggested by {participants.find(p=>p.id===g.suggested_by)?.name || "a participant"}</div><div className="bar"><span style={{width:(Math.max(0,g.netVotes)/max*100)+"%"}}/></div>{canViewVoteDetails && <div className="vote-audit"><div><b><ThumbsUp size={12}/> Thumbs up ({g.upCount})</b><span>{g.upCount ? votes.filter(v=>v.game_id===g.id && v.vote_type==="up").map(v=>participants.find(p=>p.id===v.participant_id)?.name || "Unknown participant").sort((a,b)=>a.localeCompare(b)).join(", ") : "No votes yet"}</span></div><div><b><ThumbsDown size={12}/> Thumbs down ({g.downCount})</b><span>{g.downCount ? votes.filter(v=>v.game_id===g.id && v.vote_type==="down").map(v=>participants.find(p=>p.id===v.participant_id)?.name || "Unknown participant").sort((a,b)=>a.localeCompare(b)).join(", ") : "No votes yet"}</span></div></div>}</div><div className="game-actions">{showAdminControls && !settings?.is_archived && <button className="icon-action" title="Edit game" onClick={()=>updateGame(g)}><Pencil size={14}/></button>}{showAdminControls && !settings?.is_archived && <button className="icon-action danger" title="Delete game" onClick={()=>deleteGame(g)}><Trash2 size={14}/></button>}<button className={"vote vote-up "+(g.myVote==="up"?"selected":"")} title="Vote thumbs up" aria-label={"Vote thumbs up for "+g.title} onClick={()=>vote(g.id,"up")} disabled={busy || !settings?.voting_open || settings?.is_archived}><ThumbsUp size={16}/><b>{g.upCount}</b></button><button className={"vote vote-down "+(g.myVote==="down"?"selected":"")} title="Vote thumbs down" aria-label={"Vote thumbs down for "+g.title} onClick={()=>vote(g.id,"down")} disabled={busy || !settings?.voting_open || settings?.is_archived}><ThumbsDown size={16}/><b>{g.downCount}</b></button></div></article>)}</div>}
          <div className="footnote">You can change your vote anytime while voting is open.</div>
        </section>
      </div>

      )}
      {activeTab === "scoreboard" && (
      <section className={"panel history "+(scoreboardMode?"scoreboard-editing":"")}><div className="crew-head"><div><small>THE SCOREBOARD</small><h2>Game round history</h2></div><div className="scoreboard-heading-actions"><label className="scoreboard-event-picker">Game Night<select aria-label="Select Game Night for all pages" value={selectedEventId || ""} onChange={e => selectGameNight(e.target.value)}>{gameNights.map(event => <option key={event.id} value={event.id}>{event.event_title} · {displayEventDate(event.event_date)}{event.is_archived ? " · Archived" : ""}</option>)}</select></label><button type="button" className="secondary current-event-button" onClick={() => currentGameNight && selectGameNight(currentGameNight.id)} disabled={!currentGameNight || selectedEventId === currentGameNight.id}>Current Game Night</button><span>{rounds.length} rounds recorded</span>{hasScoreboardPermission && <button className={"admin-mode-toggle scoreboard-edit-button "+(scoreboardMode?"active":"")} onClick={toggleScoreboardEditing} disabled={busy || settings?.is_archived}><Trophy size={14}/>{scoreboardMode?"Done editing":"Edit scoreboard"}</button>}</div></div><div className="all-time-podium"><div className="podium-heading"><Trophy size={17}/> ALL-TIME LEADERS · TOTAL FIRST-PLACE WINS</div>{[...participants].sort((a,b)=>(allTimeWins[b.id]||0)-(allTimeWins[a.id]||0)||a.name.localeCompare(b.name)).slice(0,3).map((person,index)=><div className={"podium-place podium-"+(index+1)} key={person.id}><b>{index+1===1?"1ST":index+1===2?"2ND":"3RD"}</b><span>{person.name}</span><strong>{allTimeWins[person.id]||0} {(allTimeWins[person.id]||0)===1?"win":"wins"}</strong></div>)}</div>{scoreboardMode && <p className="scoreboard-edit-hint">Editing mode is on. Open a game below to add rounds or update placements and scores.</p>}
        {games.map(game => {
          const gameRounds = rounds.filter(r => r.game_id === game.id).sort((a,b)=>a.round_number-b.round_number);
          return <div className="history-game" key={game.id}><div className="history-game-head"><b>{game.title}</b><span>{gameRounds.length} {gameRounds.length===1?"round":"rounds"}</span><button className="text-action" onClick={()=>setExpandedRounds(v=>({...v,[game.id]:!v[game.id]}))}>{expandedRounds[game.id] ? <ChevronUp size={15}/> : <ChevronDown size={15}/>} {expandedRounds[game.id] ? "Hide" : "View"}</button></div>
            {expandedRounds[game.id] && <div className="round-list">
              {!gameRounds.length && <p className="muted">No rounds recorded yet.</p>}
              {gameRounds.map(round => {
                const results = placements.filter(p=>String(p.round_id)===String(round.id)).sort((a,b)=>{ const placeOrder=Number(a.place)-Number(b.place); if(placeOrder!==0) return placeOrder; const scoreA=a.score===null||a.score===undefined||a.score===""?Number.NEGATIVE_INFINITY:Number(a.score); const scoreB=b.score===null||b.score===undefined||b.score===""?Number.NEGATIVE_INFINITY:Number(b.score); return scoreB-scoreA; });
                return <div className="round-card" key={round.id}><div className="round-heading"><div className="round-title"><b>Round {round.round_number}</b>{round.notes && <span>{round.notes}</span>}</div>{canManageScoreboard && <div className="round-actions"><button className="icon-action" title="Edit round" onClick={()=>editRound(round)}><Pencil size={13}/></button><button className="icon-action danger" title="Delete round" onClick={()=>deleteRound(round)}><Trash2 size={13}/></button></div>}</div>
                  {results.length ? <ol className="placement-list">{results.map(result=><li key={result.id}><span className="place-label">{result.place===1?"1st":result.place===2?"2nd":result.place===3?"3rd":result.place+"th"}</span><b>{participants.find(p=>p.id===result.participant_id)?.name || "Former participant"}</b>{result.score!==null && result.score!==undefined && <small>Score: {result.score}</small>}{result.notes && <small>{result.notes}</small>}{canManageScoreboard && <div className="result-actions"><button className="icon-action" onClick={()=>editPlacement(result)} title="Edit result"><Pencil size={12}/></button><button className="icon-action danger" onClick={()=>deletePlacement(result)} title="Remove result"><Trash2 size={13}/></button></div>}</li>)}</ol> : <p className="muted">No placements entered for this round yet.</p>}
                  {canManageScoreboard && <div className="placement-form"><select value={placementDrafts[round.id]?.participant_id || ""} onChange={e=>setPlacementDrafts(v=>({...v,[round.id]:{...v[round.id],participant_id:e.target.value,place:v[round.id]?.place??"1"}}))}><option value="">Select participant</option>{goingParticipants.filter(p=>!placements.some(existing=>String(existing.round_id)===String(round.id)&&String(existing.participant_id)===String(p.id))).map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select><input type="number" min="1" step="1" placeholder="Place" value={placementDrafts[round.id]?.place ?? "1"} onChange={e=>setPlacementDrafts(v=>({...v,[round.id]:{...v[round.id],place:e.target.value}}))}/><input type="number" placeholder="Score (optional)" value={placementDrafts[round.id]?.score || ""} onChange={e=>setPlacementDrafts(v=>({...v,[round.id]:{...v[round.id],score:e.target.value}}))}/><button className="secondary" onClick={()=>addPlacement(round)} disabled={busy}>Add result</button></div>}
                </div>;
              })}
            </div>}
            {canManageScoreboard && <div className="new-round"><input placeholder="Round notes (optional)" value={roundNotes[game.id]||""} onChange={e=>setRoundNotes(v=>({...v,[game.id]:e.target.value}))}/><button className="secondary" onClick={()=>createRound(game)}><Plus size={14}/> Add round</button></div>}
          </div>;
        })}
      </section>

      )}
      {activeTab === "admin" && showAdminControls && <section className="panel admin-panel"><div className="panel-title"><div><small>ADMINISTRATION</small><h2>Admin controls</h2></div><span className="tile"><Shield/></span></div>
        <details className="admin-section admin-accordion"><summary className="admin-accordion-title"><CalendarDays size={16}/> Manage Game Nights</summary><p className="muted">Create dates, duplicate a previous game setup, and archive or reopen events. Each date has its own games, scoreboard, attendance, and chat.</p><div className="event-details-form"><label>New Game Night title<input value={newEventTitle} onChange={e=>setNewEventTitle(e.target.value)} maxLength={80}/></label><label>New date<input type="date" value={newEventDate} onChange={e=>setNewEventDate(e.target.value)}/></label><label>Start time<input type="time" value={newEventTime} onChange={e=>setNewEventTime(e.target.value)}/></label><label>Location<input value={newEventLocation} onChange={e=>setNewEventLocation(e.target.value)} maxLength={240}/></label><button className="primary" disabled={busy||!newEventDate||!newEventTime} onClick={createGameNight}>Create blank Game Night</button><label>Duplicate game setup from<select value={duplicateFromEventId} onChange={e=>setDuplicateFromEventId(e.target.value)}><option value="">Choose an existing Game Night</option>{gameNights.map(event=><option key={event.id} value={event.id}>{event.event_title} · {event.event_date}</option>)}</select></label><button className="secondary" disabled={busy||!newEventDate||!newEventTime||!duplicateFromEventId} onClick={duplicateGameNight}>Create and duplicate setup</button></div><div className="event-admin-list">{gameNights.map(event=><div className="event-admin-row" key={event.id}><div><b>{event.event_title}</b><small>{displayEventDate(event.event_date)} · {event.event_time}{event.is_archived?" · Archived":""}</small></div><div className="event-admin-actions"><button className="secondary" onClick={() => selectGameNight(event.id)}>View</button><button className="secondary" onClick={() => archiveGameNight(event)}>{event.is_archived?"Reopen":"Archive"}</button><button type="button" className="secondary danger event-delete-button" disabled={busy} onClick={() => deleteGameNight(event)}><Trash2 size={14}/> Delete Game Night</button></div></div>)}</div></details><details className="admin-section admin-accordion"><summary className="admin-accordion-title"><CalendarDays size={16}/> Edit an existing Game Night</summary><p className="muted">Choose a Game Night below to load its current name, date, time, and location. Make your changes, then select Update Game Night to save them.</p><div className="event-details-form"><label>Select Game Night<select value={selectedEventId||""} onChange={e=>selectGameNight(e.target.value)}><option value="">Choose an existing Game Night</option>{gameNights.map(event=><option key={event.id} value={event.id}>{event.event_title} · {displayEventDate(event.event_date)}{event.is_archived?" · Archived":""}</option>)}</select></label><label>Game night title<input value={eventTitleDraft} onChange={e=>setEventTitleDraft(e.target.value)} placeholder="Enter game night title" maxLength={80} required disabled={!selectedEventId}/></label><label>Game night date<input type="date" value={eventDateDraft} onChange={e=>setEventDateDraft(e.target.value)} required disabled={!selectedEventId}/></label><label>Start time<input type="time" value={eventTimeDraft} onChange={e=>setEventTimeDraft(e.target.value)} required disabled={!selectedEventId}/></label><label className="event-location-field">Location<input value={eventLocationDraft} onChange={e=>setEventLocationDraft(e.target.value)} placeholder="Enter address, venue, or meeting place" maxLength={240} disabled={!selectedEventId}/></label><button className="primary" onClick={saveEventDetails} disabled={busy || !selectedEventId || !eventDateDraft || !eventTimeDraft || settings?.is_archived}>Update Game Night</button>{settings?.is_archived&&selectedEventId&&<p className="muted">This Game Night is archived and cannot be edited until it is reopened.</p>}</div></details>
        <details className="admin-section admin-accordion"><summary className="admin-accordion-title"><Shield size={16}/> Group password</summary><p className="muted">Set or replace the password required for new participant accounts. Existing participants stay signed in.</p><div className="admin-password-form"><input type="password" value={adminGroupPassword} onChange={e=>setAdminGroupPassword(e.target.value)} placeholder="New group password (6+ characters)" minLength={6} maxLength={200} autoComplete="new-password"/><button className="primary" disabled={adminGroupPassword.trim().length < 6} onClick={saveGroupPassword}>Save group password</button></div></details>
        <div className="admin-setting"><div><b>Voting status</b><p>{settings?.voting_open ? "Participants can currently vote." : "Voting is closed for everyone."}</p></div><button className="primary" onClick={toggleVoting} disabled={settings?.is_archived}>{settings?.voting_open ? "Close voting" : "Open voting"}</button></div>
        <details className="admin-section admin-accordion"><summary className="admin-accordion-title"><Shield size={16}/> Administrator access</summary><p className="muted">Promote trusted participants to admins. Admins can manage the board and other admin accounts. The last admin cannot be removed.</p>
          {participants.map(person => { const role = participantRoles.find(r => r.participant_id === person.id); const admin = !!role?.is_admin; return <div className="request-row" key={person.id}><div><b>{person.name}</b><small>{admin ? "Administrator" : "Participant"}</small></div><div className="request-actions">{isProtectedAdminAccount(person) ? <button className="secondary role-locked" disabled title="The built-in admin account must always remain an administrator">Admin role locked</button> : <button className={admin ? "secondary" : "primary"} onClick={()=>setParticipantAdmin(person,!admin)}>{admin ? "Remove admin" : "Promote to admin"}</button>}</div></div>; })}
        </details>
        <details className="admin-section admin-accordion"><summary className="admin-accordion-title"><Trophy size={16}/> Game Admin access</summary><p className="muted">Game Admins can add, edit, and remove game rounds and scoreboard placements. They cannot access full admin controls or manage participant accounts.</p>
          {participants.map(person => { const role = participantRoles.find(r => r.participant_id === person.id); const admin = !!role?.is_admin; const gameAdmin = !!role?.is_game_admin; return <div className="request-row" key={person.id}><div><b>{person.name}</b><small>{admin ? "Full administrator" : gameAdmin ? "Game Admin" : "Participant"}</small></div><div className="request-actions">{isProtectedAdminAccount(person) ? <button className="secondary role-locked" disabled title="The built-in admin account cannot be assigned another role">Admin role locked</button> : !admin && <button className={gameAdmin ? "secondary" : "primary"} onClick={()=>setParticipantGameAdmin(person,!gameAdmin)}>{gameAdmin ? "Remove Game Admin" : "Promote to Game Admin"}</button>}</div></div>; })}
        </details>
        <details className="admin-section admin-accordion"><summary className="admin-accordion-title"><Users size={16}/> Manage participants</summary><p className="muted">Existing participants created before password sign-in do not have passwords yet. Set a password for each person here before they sign in on a new device.</p>
          {participants.map(person=><div className="request-row" key={person.id}><div><b>{person.name} {!person.is_active && <small className="inactive-label">INACTIVE</small>}</b><small>{eventArrivals.find(x=>x.participant_id===person.id)?.arrival_time || "TBD Pending..."}</small></div><div className="request-actions"><button className="secondary" onClick={()=>resetParticipantPassword(person)}>Reset password</button><button className="icon-action" title="Edit name" onClick={()=>renameParticipant(person)}><Pencil size={14}/></button>{person.is_active === false ? <button className="secondary" onClick={()=>setParticipantActive(person,true)}><UserCheck size={14}/> Restore</button> : <button className="secondary" onClick={()=>setParticipantActive(person,false)}><UserX size={14}/> Remove</button>}</div></div>)}
        </details>
      </section>}
      </>}
    </>}
    {session && participantId && name && !accountMode && <section className={"panel game-chat-panel"+(chatExpanded?" expanded":"")}><div className="panel-title"><div><small>THE GROUP CHAT</small><h2>Game Night Chat</h2></div><button type="button" className="chat-toggle secondary" onClick={()=>setChatExpanded(v=>!v)}>{chatExpanded?"Show latest 3":"View chat history"}</button></div><p className="muted">Send a message to everyone in the group.</p><div className="chat-message-list" aria-live="polite">{chatMessages.length ? (chatExpanded ? chatMessages : chatMessages.slice(-3)).map(msg=><article className={"chat-message"+(msg.participant_id===participantId?" own":"")} key={msg.id}><div className="chat-message-meta"><b>{msg.sender_name}</b><time dateTime={msg.created_at}>{formatChatTimestamp(msg.created_at)}</time></div><p>{msg.message}</p></article>) : <p className="chat-empty">No messages yet. Start the conversation!</p>}</div><form className="chat-compose" onSubmit={sendChatMessage}><textarea value={chatDraft} onChange={e=>setChatDraft(e.target.value)} maxLength={1000} rows={2} placeholder={settings?.is_archived?"Archived chat is read-only":"Write a message..."} aria-label="Chat message" required disabled={settings?.is_archived}/><button className="primary" disabled={busy || !chatDraft.trim() || settings?.is_archived}>Send message</button></form></section>}
    {(error||notice)&&<div className={"toast "+(error?"bad":"")}>{error||notice}<button onClick={()=>{setError("");setNotice("");}}>×</button></div>}
    <footer><span>MADE BY PETER TRAN v.{APP_VERSION}.</span><button onClick={refresh}><RefreshCw size={13}/> Refresh board</button></footer>
  </main>;
}

createRoot(document.getElementById("root")).render(<App />);