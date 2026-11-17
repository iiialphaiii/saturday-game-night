import React, { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, CheckCircle2, ChevronDown, Eye, EyeOff, FilePlus2, LoaderCircle, Pencil, Plus, RefreshCw, Save, Search, ShieldCheck, Trash2, X } from "lucide-react";
import "./player-sheets.css";

const EXPANSIONS = [
  "Kellar's Keep",
  "Return of the Witch Lord",
  "The Frozen Horror",
  "The Mage of the Mirror",
  "Rise of the Dread Moon",
  "Prophecy of Telor",
  "Spirit Queen's Torment",
  "Against the Ogre Horde",
  "Jungles of Delthrak",
  "The Crypt of Perpetual Darkness",
  "Wizards of Morcar",
  "The Rogue Heir of Elethorn",
  "The Path of the Wandering Monk",
  "Commander of the Guardian Knights"
];

const ITEM_CATALOG = [
  ...["Battle Axe","Broadsword","Crossbow","Dagger","Hand Axe","Short Sword","Spear","Staff"].map(name => ({name, category:"Weapon", source:"Base Game"})),
  ...["Bracers","Chain Mail","Cloak of Protection","Helmet","Plate Mail","Shield"].map(name => ({name, category:"Armor", source:"Base Game"})),
  {name:"Tool Kit",category:"Tool",source:"Base Game"},
  ...["Borin's Armor","Elixir of Life","Orc's Bane","Ring of Return","Spell Ring","Spirit Blade","Talisman of Lore","Wand of Magic","Wizard's Cloak","Wizard's Staff"].map(name => ({name,category:"Artifact",source:"Base Game"})),
  ...["Gem","Gold","Jewels","Heroic Brew","Holy Water","Potion of Defense","Potion of Healing","Potion of Speed","Potion of Strength"].map(name => ({name,category:"Treasure / Potion",source:"Base Game"})),
  ...["Amulet of the North","Armband of Ice","Ring of Warmth","Snowshoes of Speed","Spell Scroll: Chill","Spell Scroll: Ice Bridge","Spell Scroll: Ice Storm","Spell Scroll: Psychic Recovery","Spell Scroll: Skate","Spell Scroll: Warmth"].map(name => ({name,category:"Artifact / Scroll",source:"The Frozen Horror"})),
  ...["Poison!","Potion of Magic Resistance","Potion of Warmth","Potion of Battle Rage","Potion of Rejuvenation","Potion of Icy Strength","Potion of Frost Skin"].map(name => ({name,category:"Treasure / Potion",source:"The Frozen Horror"})),
  ...["Ancient Staff","Bone Wand","Elven Boots","Elven Bow of Vindication","Elven Bracers","Sky Orb","Spell Scroll: Treasure Without Doom"].map(name => ({name,category:"Artifact / Scroll",source:"The Mage of the Mirror"})),
  ...["Air Walk","Elven Cloak of Passage","Treasure Hoard!","Wolfsbane Potion","Potion of Recall","Potion of Vision","Potion of Superior Restoration"].map(name => ({name,category:"Treasure / Potion",source:"The Mage of the Mirror"})),
  ...["Ancient Dwarven Relic","Emerald Heart of Delthrak"].map(name => ({name,category:"Treasure",source:"Jungles of Delthrak"})),
  ...["Bracers of the Wild","Emberwrought Diadem","Girdle of Might","Fangwarden Armlet","The Sapphire Skull"].map(name => ({name,category:"Artifact",source:"Jungles of Delthrak"})),
  ...["Potion of Elder Wisdom","Potion of Serpent Venom","Spiderstep Elixir","Potion of Healing"].map(name => ({name,category:"Potion",source:"Jungles of Delthrak"})),
  ...["Raven's Talon","The Cloak of Shadows","The Scales of Elethorn","Dawnshield","Phoenix Ash"].map(name => ({name,category:"Artifact",source:"Rise of the Dread Moon"})),
  ...["Rock Skin","Lightning Bolt","Water of Healing","Heal Body"].map(name => ({name:"Spell Scroll: "+name,category:"Artifact / Scroll",source:"Prophecy of Telor"})),
  ...["Potion of Restoration","Potion of Magic","Potion of Healing","Wand"].map(name => ({name,category:"Equipment / Potion",source:"Prophecy of Telor"})),
  ...["Crown of Shadows","Dragon Spear","Magical Throwing Dagger","Oil of Acid Immunity","Spell Scroll: Lightning Bolt","Spell Scroll: Tempest"].map(name => ({name,category:"Artifact",source:"The Crypt of Perpetual Darkness"})),
  {name:"Bandolier",category:"Equipment",source:"The Rogue Heir of Elethorn"},
  ...["Potion of Fire Resistance","Potion of Magic Resistance","Potion of Magical Aptitude"].map(name => ({name,category:"Potion",source:"Wizards of Morcar"})),
  {name:"Ogre Lord's Crown",category:"Treasure",source:"Against the Ogre Horde"},
  {name:"Emeralds",category:"Treasure",source:"Against the Ogre Horde"},
  ...["Anti-Poison Quill","Dust of Disappearance","Rabbit Boots","Spell Scroll: Courage","Spell Scroll: Fire of Wrath","Spell Scroll: Tempest"].map(name => ({name,category:"Artifact / Scroll",source:"Spirit Queen's Torment"})),
  ...["Rapier","Potion of Restoration","Potion of Battle","Potion of Dexterity","Venom Antidote"].map(name => ({name,category:"Weapon / Potion",source:"Spirit Queen's Torment"})),
  ...["Potion of Battle","Potion of Dexterity","Potion of Restoration","Venom Antidote"].map(name => ({name,category:"Potion",source:"Kellar's Keep / Return of the Witch Lord"}))
].map((item, index) => ({...item, id:"hq-item-"+index}));

const HERO_TYPES = ["Barbarian","Dwarf","Elf","Wizard","Warlock","Bard","Druid","Monk","Rogue","Other"];
const CATEGORIES = ["All","Weapon","Armor","Tool","Artifact","Artifact / Scroll","Artifact / Relic","Treasure","Treasure / Potion","Potion","Equipment / Potion","Weapon / Potion","Equipment"];

function blankCharacter() {
  return {
    characterName:"",
    heroType:"Barbarian",
    bodyCurrent:8,
    mindCurrent:2,
    attackDice:3,
    defendDice:2,
    gold:0,
    spells:"",
    questsCompleted:"",
    notes:"",
    inventory:[]
  };
}

function formatSavedAt(value) {
  if (!value) return "";
  return new Date(value).toLocaleString([], {month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"});
}

function hasSheetInformation(sheet) {
  const data = sheet?.sheet_data || {};
  return Boolean(
    (data.characterName || "").trim() ||
    (data.spells || "").trim() ||
    (Array.isArray(data.spellCards) && data.spellCards.length > 0) ||
    (data.questsCompleted || "").trim() ||
    (data.notes || "").trim() ||
    Number(data.gold || 0) > 0 ||
    (Array.isArray(data.inventory) && data.inventory.length > 0) ||
    (data.heroType && data.heroType !== "Barbarian") ||
    (data.bodyCurrent != null && Number(data.bodyCurrent) !== 8) ||
    (data.mindCurrent != null && Number(data.mindCurrent) !== 2) ||
    (data.attackDice != null && Number(data.attackDice) !== 3) ||
    (data.defendDice != null && Number(data.defendDice) !== 2)
  );
}

export default function HeroQuestPlayerSheets({ db, participantId, participantName }) {
  const [sheets,setSheets] = useState([]);
  const [selectedSheetId,setSelectedSheetId] = useState("");
  const [sheetName,setSheetName] = useState("");
  const [draft,setDraft] = useState(blankCharacter);
  const [hideOthers,setHideOthers] = useState(false);
  const [canAdminEdit,setCanAdminEdit] = useState(false);
  const [adminEditMode,setAdminEditMode] = useState(false);
  const [dirty,setDirty] = useState(false);
  const [saveStatus,setSaveStatus] = useState("saved");
  const [savedAt,setSavedAt] = useState(null);
  const [loading,setLoading] = useState(true);
  const [working,setWorking] = useState(false);
  const [message,setMessage] = useState("");
  const [itemSearch,setItemSearch] = useState("");
  const [itemCategory,setItemCategory] = useState("All");
  const [itemSource,setItemSource] = useState("All sources");
  const [customName,setCustomName] = useState("");
  const [customSource,setCustomSource] = useState("Custom");
  const [customCategory,setCustomCategory] = useState("Other");
  const [customDescription,setCustomDescription] = useState("");
  const [spellSearch,setSpellSearch] = useState("");
  const [spellSource,setSpellSource] = useState("All sources");
  const [customSpellName,setCustomSpellName] = useState("");
  const [showHiddenSpells,setShowHiddenSpells] = useState(false);
  const [editingSheetName,setEditingSheetName] = useState(false);
  const [editingCharacterName,setEditingCharacterName] = useState(false);
  const [audit,setAudit] = useState([]);
  const saveTimer = useRef(null);
  const saveFunction = useRef(null);

  const selectedSheet = sheets.find(sheet => sheet.id === selectedSheetId) || null;
  const isOwner = !!selectedSheet && selectedSheet.owner_id === participantId;
  const canEdit = !!selectedSheet && (isOwner || (canAdminEdit && adminEditMode));
  const visibleSheets = useMemo(() => sheets.filter(sheet =>
    (sheet.owner_id === participantId || hasSheetInformation(sheet)) &&
    (!hideOthers || sheet.owner_id === participantId)
  ), [sheets,hideOthers,participantId]);
  const spellCatalog = useMemo(() => {
    const baseSpells = ["Ball of Flame","Courage","Fire of Wrath","Genie","Heal Body","Pass Through Rock","Rock Skin","Sleep","Swift Wind","Tempest","Veil of Mist","Water of Healing"].map(name=>({name,source:"Base Game",category:"Spell Card"}));
    const expansionScrolls = ITEM_CATALOG.filter(item=>/^Spell Scroll:/i.test(item.name)).map(item=>({name:item.name.replace(/^Spell Scroll:\\s*/i,""),source:item.source,category:"Spell Scroll"}));
    const unique = new Map([...baseSpells,...expansionScrolls].map(item=>[item.source+"::"+item.name,item]));
    return [...unique.values()].filter(item=>(spellSource==="All sources"||item.source===spellSource)&&item.name.toLowerCase().includes(spellSearch.toLowerCase()));
  },[spellSearch,spellSource]);
  const filteredItems = useMemo(() => ITEM_CATALOG.filter(item =>
    (itemCategory === "All" || item.category === itemCategory) &&
    (itemSource === "All sources" || item.source === itemSource) &&
    item.name.toLowerCase().includes(itemSearch.toLowerCase())
  ), [itemSearch,itemCategory,itemSource]);

  async function loadSheets() {
    if (!db || !participantId) return;
    const {data,error} = await db.from("player_sheets")
      .select("id,owner_id,sheet_name,sheet_data,created_at,updated_at,owner:participants!player_sheets_owner_id_fkey(name)")
      .order("updated_at",{ascending:false});
    if (error) { setMessage("Unable to load player sheets: "+error.message); setLoading(false); return []; }
    setSheets(data || []);
    setLoading(false);
    return data || [];
  }

  async function loadAudit(sheetId) {
    if (!canAdminEdit || !sheetId) { setAudit([]); return; }
    const {data,error} = await db.from("player_sheet_audit")
      .select("id,owner_id,actor_user_id,actor_participant_id,actor_role,action,summary,created_at,actor:participants!player_sheet_audit_actor_participant_id_fkey(name)")
      .eq("sheet_id",sheetId).order("created_at",{ascending:false}).limit(20);
    if (error) { setAudit([]); return; }
    setAudit(data || []);
  }

  useEffect(() => {
    let active = true;
    async function initialize() {
      if (!db || !participantId) { setLoading(false); return; }
      const {data,error} = await db.rpc("current_user_can_manage_scoreboard");
      if (active) {
        setCanAdminEdit(!error && data === true);
        const rows = await loadSheets();
        if (active && rows?.length) {
          const own = rows.find(sheet => sheet.owner_id === participantId) || rows.find(hasSheetInformation);
          if (own) openSheet(own);
        }
      }
    }
    initialize();
    const channel = db && participantId ? db.channel("player-sheets-live-"+participantId)
      .on("postgres_changes",{event:"*",schema:"public",table:"player_sheets"},() => loadSheets())
      .subscribe() : null;
    return () => {
      active = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (channel) db.removeChannel(channel);
    };
  }, [db,participantId]);

  useEffect(() => {
    if (!selectedSheetId) return;
    const current = sheets.find(sheet => sheet.id === selectedSheetId);
    if (!current) return;
    setSheetName(current.sheet_name || "My HeroQuest Character");
    setDraft({...blankCharacter(),...(current.sheet_data || {}),inventory:Array.isArray(current.sheet_data?.inventory)?current.sheet_data.inventory:[]});
    setSavedAt(current.updated_at || current.created_at);
    setSaveStatus("saved");
    setDirty(false);
    setAdminEditMode(false);
    loadAudit(current.id);
  }, [selectedSheetId]);

  async function openSheet(sheet) {
    if (!sheet) return;
    if (dirty && selectedSheetId && selectedSheetId !== sheet.id) {
      const proceed = window.confirm("You have unsaved changes. Switch sheets and discard those changes?");
      if (!proceed) return;
    }
    setSelectedSheetId(sheet.id);
    setSheetName(sheet.sheet_name || "My HeroQuest Character");
    setDraft({...blankCharacter(),...(sheet.sheet_data || {}),inventory:Array.isArray(sheet.sheet_data?.inventory)?sheet.sheet_data.inventory:[]});
    setSavedAt(sheet.updated_at || sheet.created_at);
    setSaveStatus("saved");
    setDirty(false);
    setAdminEditMode(false);
    setMessage("");
    await loadAudit(sheet.id);
  }

  function toggleHideOthers() {
    const next = !hideOthers;
    if (next && selectedSheet && !isOwner) {
      const own = sheets.find(sheet => sheet.owner_id === participantId);
      if (own) openSheet(own);
      else { setSelectedSheetId(""); setSheetName(""); setDraft(blankCharacter()); setDirty(false); setAudit([]); }
    }
    setHideOthers(next);
  }

  async function createSheet() {
    if (!participantId || working) return;
    setWorking(true); setSaveStatus("saving"); setMessage("");
    const initial = blankCharacter();
    const {data,error} = await db.from("player_sheets").insert({
      owner_id:participantId,
      sheet_name:"My HeroQuest Character",
      sheet_data:initial
    }).select("id,owner_id,sheet_name,sheet_data,created_at,updated_at,owner:participants!player_sheets_owner_id_fkey(name)").single();
    if (error) {
      setSaveStatus("failed"); setMessage("Could not create sheet: "+error.message); setWorking(false); return;
    }
    setSheets(current => [data,...current]);
    setSelectedSheetId(data.id);
    setSheetName(data.sheet_name);
    setDraft(initial);
    setSavedAt(data.updated_at || data.created_at);
    setDirty(false); setSaveStatus("saved");
    setMessage("Character sheet created.");
    setWorking(false);
  }

  async function saveSheet(isAutomatic=false) {
    if (!selectedSheet || !canEdit || working) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setWorking(true);
    setSaveStatus("saving");
    setMessage("");
    const payload = {sheet_name:sheetName.trim() || "My HeroQuest Character",sheet_data:draft};
    const {data,error} = await db.from("player_sheets").update(payload).eq("id",selectedSheet.id)
      .select("id,owner_id,sheet_name,sheet_data,created_at,updated_at,owner:participants!player_sheets_owner_id_fkey(name)").single();
    if (error) {
      setSaveStatus("failed");
      setMessage("Save failed. Your changes are still here; please retry. "+error.message);
      setWorking(false);
      return;
    }
    setSheets(current => current.map(sheet => sheet.id === data.id ? data : sheet));
    setSavedAt(data.updated_at);
    setDirty(false);
    setSaveStatus("saved");
    if (!isAutomatic) setMessage("Character sheet saved.");
    if (!isOwner) await loadAudit(data.id);
    setWorking(false);
  }
  saveFunction.current = saveSheet;

  useEffect(() => {
    if (!dirty || !selectedSheetId || !canEdit) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("unsaved");
    saveTimer.current = setTimeout(() => {
      if (saveFunction.current) saveFunction.current(true);
    },850);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [draft,sheetName,dirty,selectedSheetId,canEdit]);

  function updateField(key,value) {
    setDraft(current => ({...current,[key]:value}));
    setDirty(true);
    setMessage("");
  }

  function updateInventory(index,patch) {
    setDraft(current => ({...current,inventory:current.inventory.map((item,i)=>i===index?{...item,...patch}:item)}));
    setDirty(true);
  }

  function addCatalogItem(item) {
    setDraft(current => ({...current,inventory:[...current.inventory,{id:crypto.randomUUID(),name:item.name,category:item.category,source:item.source,quantity:1,charges:"",equipped:false,description:"",custom:false}]}));
    setDirty(true);
    setMessage(item.name+" added to inventory.");
  }

  function addCustomItem() {
    if (!customName.trim()) return;
    setDraft(current => ({...current,inventory:[...current.inventory,{id:crypto.randomUUID(),name:customName.trim(),category:customCategory,source:customSource,quantity:1,charges:"",equipped:false,description:customDescription.trim(),custom:true}]}));
    setDirty(true);
    setCustomName(""); setCustomDescription("");
    setMessage("Custom item added to inventory.");
  }

  async function deleteSheet() {
    if (!selectedSheet || !isOwner) return;
    if (!window.confirm("Delete "+selectedSheet.sheet_name+"? This cannot be undone.")) return;
    setWorking(true);
    const {error} = await db.from("player_sheets").delete().eq("id",selectedSheet.id);
    if (error) { setMessage("Could not delete sheet: "+error.message); setWorking(false); return; }
    const remaining = sheets.filter(sheet=>sheet.id!==selectedSheet.id);
    setSheets(remaining); setSelectedSheetId(""); setDraft(blankCharacter()); setSheetName(""); setAudit([]);
    setMessage("Sheet deleted."); setWorking(false);
  }

  const statusText = saveStatus === "saving" ? "Saving…" : saveStatus === "unsaved" ? "Unsaved changes" : saveStatus === "failed" ? "Save failed" : "Saved";
  const statusClass = saveStatus === "failed" ? "failed" : saveStatus === "unsaved" ? "unsaved" : saveStatus === "saving" ? "saving" : "saved";

  return <section className="panel hqps-panel">
    <div className="panel-title"><div><small>HEROQUEST</small><h2><BookOpen size={19}/> Player Sheets</h2></div><span className="tile"><ShieldCheck size={18}/></span></div>
    <p className="muted">Create a character sheet that stays with you across game nights. Players can view other saved sheets; only the owner and authorized admins can edit.</p>
    <div className="hqps-toolbar">
      <label className="hqps-sheet-picker">Saved character sheets
        <select value={selectedSheetId} onChange={e=>{const next=sheets.find(sheet=>sheet.id===e.target.value);if(next)openSheet(next);}}>
          <option value="">Choose a character sheet</option>
          {visibleSheets.map(sheet=>{const characterName=String(sheet.sheet_data?.characterName || "").trim();return <option key={sheet.id} value={sheet.id}>{sheet.owner?.name || "Player"} · {sheet.sheet_name}{characterName?" ("+characterName+")":""}</option>;})}
        </select>
      </label>
      <button type="button" className="secondary" onClick={toggleHideOthers}><span>{hideOthers?<Eye size={14}/>:<EyeOff size={14}/>}</span>{hideOthers?"Show other players":"Hide other players"}</button>
      <button type="button" className="primary" onClick={createSheet} disabled={working || dirty}><FilePlus2 size={14}/> New sheet</button>
      <button type="button" className="quiet" onClick={loadSheets} title="Refresh sheets"><RefreshCw size={14}/></button>
    </div>
    {loading ? <p className="muted">Loading character sheets…</p> : !selectedSheet ? <div className="hqps-empty"><BookOpen size={26}/><b>No character sheet selected</b><span>Create your first sheet or choose another player's saved sheet.</span><button type="button" className="primary" onClick={createSheet} disabled={working}><Plus size={14}/> Create character sheet</button></div> : <>
      <div className="hqps-party-status">
      <div className="hqps-section-title"><div><small>PARTY OVERVIEW</small><h4>Other players’ heroes</h4></div><span>{visibleSheets.filter(s=>s.owner_id!==participantId).length} players</span></div>
      {visibleSheets.filter(s=>s.owner_id!==participantId).length===0 ? <p className="muted">No other saved character sheets are currently visible.</p> : <div className="hqps-party-list">{visibleSheets.filter(s=>s.owner_id!==participantId).map(sheet=>{const data=sheet.sheet_data||{};const items=Array.isArray(data.inventory)?data.inventory.filter(item=>!item.hidden):[];return <button type="button" className={"hqps-party-card"+(selectedSheetId===sheet.id?" selected":"")} key={sheet.id} onClick={()=>openSheet(sheet)}><b>{data.characterName||sheet.sheet_name||"Unnamed hero"}</b><span>Body <strong>{data.bodyCurrent??8}</strong></span><span>Mind <strong>{data.mindCurrent??2}</strong></span><span>Coins <strong>{Number(data.gold||0).toLocaleString()}</strong></span><span>{items.length} inventory {items.length===1?"item":"items"}</span></button>;})}</div>}
    </div>
    <div className="hqps-sheet-heading">
        <div><small>{isOwner?"YOUR CHARACTER SHEET":"PLAYER CHARACTER SHEET"}</small><h3>{selectedSheet.owner?.name || (isOwner?participantName:"Player")}</h3></div>
        <div className={"hqps-save-status "+statusClass}>{saveStatus==="saved"?<CheckCircle2 size={14}/>:saveStatus==="saving"?<LoaderCircle size={14} className="hqps-spin"/>:<X size={14}/>} {statusText}</div>
      </div>
      <div className="hqps-meta">
        <span>Created {formatSavedAt(selectedSheet.created_at)}</span>
        <span>Last saved {formatSavedAt(savedAt || selectedSheet.updated_at)}</span>
      </div>
      {!isOwner && canAdminEdit && <div className="hqps-admin-edit">
        <span><ShieldCheck size={15}/> Admin / Game Admin access</span>
        <button type="button" className={adminEditMode?"primary":"secondary"} onClick={()=>{if(adminEditMode && dirty){saveSheet(false);return;}setAdminEditMode(value=>!value);}}><Pencil size={13}/>{adminEditMode?(dirty?"Save before finishing":"Finish admin editing"):"Admin Edit Player Sheet"}</button>
      </div>}
      <fieldset className="hqps-fieldset" disabled={!canEdit || working}>
        <div className="hqps-name-grid">
          <div className="hqps-inline-name"><span>Sheet name</span>{editingSheetName && canEdit ? <input autoFocus value={sheetName} onChange={e=>{setSheetName(e.target.value);setDirty(true);setSaveStatus("unsaved");}} onBlur={()=>setEditingSheetName(false)} onKeyDown={e=>{if(e.key==="Enter")setEditingSheetName(false);if(e.key==="Escape"){setEditingSheetName(false);setSheetName(selectedSheet.sheet_name||"My HeroQuest Character");}}} maxLength={80}/> : <button type="button" className="hqps-name-display" onClick={()=>canEdit&&setEditingSheetName(true)}>{sheetName||"Untitled sheet"} {canEdit&&<Pencil size={12}/>}</button>}</div>
          <div className="hqps-inline-name"><span>Character name</span>{editingCharacterName && canEdit ? <input autoFocus value={draft.characterName} onChange={e=>updateField("characterName",e.target.value)} onBlur={()=>setEditingCharacterName(false)} onKeyDown={e=>{if(e.key==="Enter")setEditingCharacterName(false);if(e.key==="Escape"){setEditingCharacterName(false);updateField("characterName",selectedSheet.sheet_data?.characterName||"");}}} maxLength={60}/> : <button type="button" className="hqps-name-display" onClick={()=>canEdit&&setEditingCharacterName(true)}>{draft.characterName||"Add character name"} {canEdit&&<Pencil size={12}/>}</button>}</div>
          <label>Hero type<select value={draft.heroType} onChange={e=>updateField("heroType",e.target.value)}>{HERO_TYPES.map(hero=><option key={hero}>{hero}</option>)}</select></label>
        </div>
        <div className="hqps-stat-grid">
          <div className="hqps-stat-card"><b>Body Points</b><div><label>Current<input type="number" min="0" max="99" value={draft.bodyCurrent} onChange={e=>updateField("bodyCurrent",e.target.value)}/></label><div className="hqps-number-stepper"><button type="button" onClick={()=>updateField("bodyCurrent",Math.max(0,Number(draft.bodyCurrent||0)-1))}>−</button><button type="button" onClick={()=>updateField("bodyCurrent",Math.min(99,Number(draft.bodyCurrent||0)+1))}>+</button></div></div></div>
          <div className="hqps-stat-card"><b>Mind Points</b><div><label>Current<input type="number" min="0" max="99" value={draft.mindCurrent} onChange={e=>updateField("mindCurrent",e.target.value)}/></label><div className="hqps-number-stepper"><button type="button" onClick={()=>updateField("mindCurrent",Math.max(0,Number(draft.mindCurrent||0)-1))}>−</button><button type="button" onClick={()=>updateField("mindCurrent",Math.min(99,Number(draft.mindCurrent||0)+1))}>+</button></div></div></div>
          <div className="hqps-stat-card"><b>Combat Dice</b><div><label>Attack<input type="number" min="0" max="20" value={draft.attackDice} onChange={e=>updateField("attackDice",e.target.value)}/></label><div className="hqps-number-stepper"><button type="button" onClick={()=>updateField("attackDice",Math.max(0,Number(draft.attackDice||0)-1))}>−</button><button type="button" onClick={()=>updateField("attackDice",Math.min(20,Number(draft.attackDice||0)+1))}>+</button></div><label>Defend<input type="number" min="0" max="20" value={draft.defendDice} onChange={e=>updateField("defendDice",e.target.value)}/></label><div className="hqps-number-stepper"><button type="button" onClick={()=>updateField("defendDice",Math.max(0,Number(draft.defendDice||0)-1))}>−</button><button type="button" onClick={()=>updateField("defendDice",Math.min(20,Number(draft.defendDice||0)+1))}>+</button></div></div></div>
        </div>
        <div className="hqps-gold-row"><label>Gold coins<input type="number" min="0" value={draft.gold} onChange={e=>updateField("gold",e.target.value)}/><div className="hqps-number-stepper"><button type="button" onClick={()=>updateField("gold",Math.max(0,Number(draft.gold||0)-1))}>−</button><button type="button" onClick={()=>updateField("gold",Number(draft.gold||0)+1)}>+</button></div></label><label>Existing spell / scroll notes<textarea rows="2" value={draft.spells} onChange={e=>updateField("spells",e.target.value)} placeholder="Previously saved spell notes are kept here..."/></label></div>
        <div className="hqps-spell-cards"><div className="hqps-section-title"><div><small>MAGIC & SCROLLS</small><h4>Spell cards & scrolls</h4></div><span>{(draft.spellCards||[]).filter(card=>!card.hidden).length} active</span></div>
          <div className="hqps-catalog-controls"><label className="hqps-search"><Search size={15}/><input value={spellSearch} onChange={e=>setSpellSearch(e.target.value)} placeholder="Search spells and scrolls..."/></label><select value={spellSource} onChange={e=>setSpellSource(e.target.value)}><option>All sources</option><option>Base Game</option>{EXPANSIONS.map(source=><option key={source}>{source}</option>)}</select></div>
          <div className="hqps-spell-catalog">{spellCatalog.map(card=><button type="button" key={card.source+"-"+card.name} className="hqps-spell-catalog-item" disabled={!canEdit} onClick={()=>{const current=draft.spellCards||[];if(!current.some(x=>x.name===card.name&&x.source===card.source))updateField("spellCards",[...current,{...card,id:crypto.randomUUID(),hidden:false,custom:false}]);}}><span><b>{card.name}</b><small>{card.category}</small></span><span className={card.source==="Base Game"?"hqps-source-base":"hqps-source-expansion"}>{card.source}</span><Plus size={14}/></button>)}</div>
          <div className="hqps-custom-spell"><input value={customSpellName} onChange={e=>setCustomSpellName(e.target.value)} placeholder="Enter custom or missing spell / scroll"/><button type="button" className="secondary" disabled={!canEdit||!customSpellName.trim()} onClick={()=>{updateField("spellCards",[...(draft.spellCards||[]),{id:crypto.randomUUID(),name:customSpellName.trim(),source:"Custom",category:"Custom spell",custom:true,hidden:false}]);setCustomSpellName("");}}>Add custom card</button></div>
          <label className="hqps-show-hidden"><input type="checkbox" checked={showHiddenSpells} onChange={e=>setShowHiddenSpells(e.target.checked)}/> Show hidden cards</label>
          <div className="hqps-spell-owned">{(draft.spellCards||[]).filter(card=>showHiddenSpells||!card.hidden).map((card,index)=><div className={"hqps-spell-owned-card"+(card.hidden?" hidden":"")} key={card.id||index}><span><b>{card.name}</b><small>{card.source||"Custom"}</small></span>{canEdit&&<button type="button" className="quiet" onClick={()=>updateField("spellCards",(draft.spellCards||[]).map((item,i)=>i===index?{...item,hidden:!item.hidden}:item))}>{card.hidden?"Restore":"Hide"}</button>}</div>)}</div>
        </div>
        <div className="hqps-inventory">
          <div className="hqps-section-title"><div><small>CHARACTER EQUIPMENT</small><h4>Inventory</h4></div><span>{draft.inventory.length} items</span></div>
          <details className="hqps-add-items">
            <summary><span><Plus size={14}/> Add items</span><small>Browse the catalog or enter a custom item</small></summary>
            <div className="hqps-add-items-content">
              <div className="hqps-catalog-controls">
                <label className="hqps-search"><Search size={15}/><input value={itemSearch} onChange={e=>setItemSearch(e.target.value)} placeholder="Search official items..."/></label>
                <select value={itemCategory} onChange={e=>setItemCategory(e.target.value)} aria-label="Filter item category">{CATEGORIES.map(category=><option key={category}>{category}</option>)}</select>
                <select value={itemSource} onChange={e=>setItemSource(e.target.value)} aria-label="Filter item source"><option>All sources</option><option>Base Game</option>{EXPANSIONS.map(source=><option key={source}>{source}</option>)}<option>Kellar's Keep / Return of the Witch Lord</option></select>
              </div>
              <div className="hqps-catalog-results">
                {filteredItems.map(item=><button type="button" key={item.id} className="hqps-catalog-item" onClick={()=>addCatalogItem(item)} disabled={!canEdit}><span><b>{item.name}</b><small>{item.category}</small></span><span className={item.source==="Base Game"?"hqps-source-base":"hqps-source-expansion"}>{item.source}</span><Plus size={14}/></button>)}
                {!filteredItems.length && <p className="muted">No matching catalog items. Add it manually below.</p>}
              </div>
              <div className="hqps-custom-item">
                <h5><Plus size={14}/> Add custom or missing item</h5>
                <div className="hqps-custom-grid">
                  <label>Item name<input value={customName} onChange={e=>setCustomName(e.target.value)} placeholder="Enter item name"/></label>
                  <label>Category<select value={customCategory} onChange={e=>setCustomCategory(e.target.value)}>{["Weapon","Armor","Tool","Artifact","Potion","Treasure","Other"].map(x=><option key={x}>{x}</option>)}</select></label>
                  <label>Source<select value={customSource} onChange={e=>setCustomSource(e.target.value)}><option>Custom</option><option>Base Game</option>{EXPANSIONS.map(source=><option key={source}>{source}</option>)}<option>Kellar's Keep / Return of the Witch Lord</option></select></label>
                </div>
                <label>Description / special ability<textarea rows="2" value={customDescription} onChange={e=>setCustomDescription(e.target.value)} placeholder="Optional item details"/></label>
                <button type="button" className="secondary" onClick={addCustomItem} disabled={!canEdit || !customName.trim()}><Plus size={14}/> Add item</button>
              </div>
            </div>
          </details>
          {draft.inventory.some(item=>!item.hidden) && <div className="hqps-inventory-list">
            {draft.inventory.map((item,index)=>!item.hidden && <article className="hqps-inventory-item" key={item.id || index}>
              <div className="hqps-inventory-item-top"><div><b>{item.name}</b><span className={item.source==="Base Game"?"hqps-source-base":item.source==="Custom"?"hqps-source-custom":"hqps-source-expansion"}>{item.source || "Custom"}</span></div>{canEdit && <><button type="button" className="quiet" onClick={()=>updateInventory(index,{hidden:!item.hidden})}>{item.hidden?"Restore":"Hide"}</button><button type="button" className="icon-action danger" onClick={()=>updateField("inventory",draft.inventory.filter((_,i)=>i!==index))} title="Remove item"><Trash2 size={14}/></button></>}</div>
              {item.description && <p>{item.description}</p>}
              <div className="hqps-item-fields">
                <label>Quantity<input type="number" min="1" max="999" value={item.quantity ?? 1} onChange={e=>updateInventory(index,{quantity:e.target.value})}/><div className="hqps-number-stepper"><button type="button" onClick={()=>updateInventory(index,{quantity:Math.max(1,Number(item.quantity??1)-1)})}>−</button><button type="button" onClick={()=>updateInventory(index,{quantity:Math.min(999,Number(item.quantity??1)+1)})}>+</button></div></label>
                <label>Charges / uses<input type="number" min="0" value={item.charges ?? ""} onChange={e=>updateInventory(index,{charges:e.target.value})} placeholder="Optional"/><div className="hqps-number-stepper"><button type="button" onClick={()=>updateInventory(index,{charges:Math.max(0,Number(item.charges||0)-1)})}>−</button><button type="button" onClick={()=>updateInventory(index,{charges:Number(item.charges||0)+1})}>+</button></div></label>
                <label className="hqps-equipped"><input type="checkbox" checked={!!item.equipped} onChange={e=>updateInventory(index,{equipped:e.target.checked})}/> Equipped</label>
              </div>
            </article>)}
          </div>}
          {canEdit && draft.inventory.some(item=>item.hidden) && <details className="hqps-hidden-items"><summary>Hidden inventory ({draft.inventory.filter(item=>item.hidden).length})</summary>{draft.inventory.map((item,index)=>item.hidden&&<div key={item.id||index}><span>{item.name}</span><button type="button" className="quiet" onClick={()=>updateInventory(index,{hidden:false})}>Restore</button></div>)}</details>}
        </div>
        <div className="hqps-notes-grid">
          <label>Completed quests<textarea rows="3" value={draft.questsCompleted} onChange={e=>updateField("questsCompleted",e.target.value)} placeholder="Record completed quests..."/></label>
          <label>Character notes<textarea rows="3" value={draft.notes} onChange={e=>updateField("notes",e.target.value)} placeholder="Abilities, reminders, special rules..."/></label>
        </div>
      </fieldset>
      <div className="hqps-actions">
        {canEdit && <button type="button" className="primary" onClick={()=>saveSheet(false)} disabled={working || !dirty}><Save size={14}/>{working?"Saving…":"Save sheet"}</button>}
        {isOwner && <button type="button" className="secondary danger" onClick={deleteSheet} disabled={working}><Trash2 size={14}/> Delete my sheet</button>}
        {!canEdit && <span className="hqps-readonly"><Eye size={14}/> Read-only view</span>}
        <span className="hqps-save-caption">{saveStatus==="saved"?"Saved to your account":statusText}{savedAt?" · "+formatSavedAt(savedAt):""}</span>
      </div>
      {message && <p className="hqps-message" role="status">{message}</p>}
      {canAdminEdit && audit.length>0 && <details className="hqps-audit"><summary>Admin edit history ({audit.length}) <ChevronDown size={14}/></summary>{audit.map(entry=><div key={entry.id}><b>{entry.actor?.name || (entry.actor_role==="admin"?"Admin":entry.actor_role==="game_admin"?"Game Admin":"Authorized editor")}</b><span>{entry.actor_role==="admin"?"Admin":entry.actor_role==="game_admin"?"Game Admin":"Editor"} · {entry.summary || entry.action} · {formatSavedAt(entry.created_at)}</span></div>)}</details>}
    </>}
  </section>;
}
