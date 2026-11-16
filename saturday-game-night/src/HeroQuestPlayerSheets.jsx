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
  ...["Ancient Dwarven Relic","Bracers of the Wild","Emberwrought Diadem","Girdle of Might"].map(name => ({name,category:"Artifact / Relic",source:"Jungles of Delthrak"})),
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
  ...["Battle","Dexterity","Restoration","Venom Antidote"].map(name => ({name,category:"Potion",source:"Kellar's Keep / Return of the Witch Lord"}))
].map((item, index) => ({...item, id:"hq-item-"+index}));

const HERO_TYPES = ["Barbarian","Dwarf","Elf","Wizard","Warlock","Bard","Druid","Monk","Rogue","Other"];
const CATEGORIES = ["All","Weapon","Armor","Tool","Artifact","Artifact / Scroll","Artifact / Relic","Treasure / Potion","Potion","Equipment / Potion","Weapon / Potion","Equipment"];

function blankCharacter() {
  return {
    characterName:"",
    heroType:"Barbarian",
    bodyStarting:8,
    bodyCurrent:8,
    mindStarting:2,
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
  const [audit,setAudit] = useState([]);
  const saveTimer = useRef(null);
  const saveFunction = useRef(null);

  const selectedSheet = sheets.find(sheet => sheet.id === selectedSheetId) || null;
  const isOwner = !!selectedSheet && selectedSheet.owner_id === participantId;
  const canEdit = !!selectedSheet && (isOwner || (canAdminEdit && adminEditMode));
  const visibleSheets = useMemo(() => sheets.filter(sheet => {
    const populated = sheet.sheet_name || sheet.sheet_data;
    return !!populated && (!hideOthers || sheet.owner_id === participantId);
  }), [sheets,hideOthers,participantId]);
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
    if (error) { setMessage("Unable to load player sheets: "+error.message); return; }
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
          const own = rows.find(sheet => sheet.owner_id === participantId) || rows[0];
          openSheet(own);
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
          {visibleSheets.map(sheet=><option key={sheet.id} value={sheet.id}>{sheet.owner?.name || "Player"} · {sheet.sheet_name}</option>)}
        </select>
      </label>
      <button type="button" className="secondary" onClick={()=>setHideOthers(value=>!value)}><span>{hideOthers?<Eye size={14}/>:<EyeOff size={14}/>}</span>{hideOthers?"Show other players":"Hide other players"}</button>
      <button type="button" className="primary" onClick={createSheet} disabled={working}><FilePlus2 size={14}/> New sheet</button>
      <button type="button" className="quiet" onClick={loadSheets} title="Refresh sheets"><RefreshCw size={14}/></button>
    </div>
    {loading ? <p className="muted">Loading character sheets…</p> : !selectedSheet ? <div className="hqps-empty"><BookOpen size={26}/><b>No character sheet selected</b><span>Create your first sheet or choose another player's saved sheet.</span><button type="button" className="primary" onClick={createSheet} disabled={working}><Plus size={14}/> Create character sheet</button></div> : <>
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
          <label>Sheet name<input value={sheetName} onChange={e=>{setSheetName(e.target.value);setDirty(true);setSaveStatus("unsaved");}} maxLength={80}/></label>
          <label>Character name<input value={draft.characterName} onChange={e=>updateField("characterName",e.target.value)} maxLength={60} placeholder="Enter hero name"/></label>
          <label>Hero type<select value={draft.heroType} onChange={e=>updateField("heroType",e.target.value)}>{HERO_TYPES.map(hero=><option key={hero}>{hero}</option>)}</select></label>
        </div>
        <div className="hqps-stat-grid">
          <div className="hqps-stat-card"><b>Body Points</b><div><label>Current<input type="number" min="0" max="99" value={draft.bodyCurrent} onChange={e=>updateField("bodyCurrent",e.target.value)}/></label><label>Starting<input type="number" min="0" max="99" value={draft.bodyStarting} onChange={e=>updateField("bodyStarting",e.target.value)}/></label></div></div>
          <div className="hqps-stat-card"><b>Mind Points</b><div><label>Current<input type="number" min="0" max="99" value={draft.mindCurrent} onChange={e=>updateField("mindCurrent",e.target.value)}/></label><label>Starting<input type="number" min="0" max="99" value={draft.mindStarting} onChange={e=>updateField("mindStarting",e.target.value)}/></label></div></div>
          <div className="hqps-stat-card"><b>Combat Dice</b><div><label>Attack<input type="number" min="0" max="20" value={draft.attackDice} onChange={e=>updateField("attackDice",e.target.value)}/></label><label>Defend<input type="number" min="0" max="20" value={draft.defendDice} onChange={e=>updateField("defendDice",e.target.value)}/></label></div></div>
        </div>
        <div className="hqps-gold-row"><label>Gold coins<input type="number" min="0" value={draft.gold} onChange={e=>updateField("gold",e.target.value)}/></label><label>Spells / scrolls<textarea rows="2" value={draft.spells} onChange={e=>updateField("spells",e.target.value)} placeholder="List spells or scrolls..."/></label></div>
        <div className="hqps-inventory">
          <div className="hqps-section-title"><div><small>CHARACTER EQUIPMENT</small><h4>Inventory</h4></div><span>{draft.inventory.length} items</span></div>
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
          {draft.inventory.length>0 && <div className="hqps-inventory-list">
            {draft.inventory.map((item,index)=><article className="hqps-inventory-item" key={item.id || index}>
              <div className="hqps-inventory-item-top"><div><b>{item.name}</b><span className={item.source==="Base Game"?"hqps-source-base":item.source==="Custom"?"hqps-source-custom":"hqps-source-expansion"}>{item.source || "Custom"}</span></div>{canEdit && <button type="button" className="icon-action danger" onClick={()=>updateField("inventory",draft.inventory.filter((_,i)=>i!==index))} title="Remove item"><Trash2 size={14}/></button>}</div>
              {item.description && <p>{item.description}</p>}
              <div className="hqps-item-fields">
                <label>Quantity<input type="number" min="1" max="999" value={item.quantity ?? 1} onChange={e=>updateInventory(index,{quantity:e.target.value})}/></label>
                <label>Charges / uses<input value={item.charges ?? ""} onChange={e=>updateInventory(index,{charges:e.target.value})} placeholder="Optional"/></label>
                <label className="hqps-equipped"><input type="checkbox" checked={!!item.equipped} onChange={e=>updateInventory(index,{equipped:e.target.checked})}/> Equipped</label>
              </div>
            </article>)}
          </div>}
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
