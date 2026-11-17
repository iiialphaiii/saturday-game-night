import React, { useMemo, useState } from "react";
import { Dices, Shield, Skull } from "lucide-react";
import "./player-sheets.css";

export default function HeroQuestDiceRoller() {
  const [expanded,setExpanded] = useState(false);
  const [diceCount,setDiceCount] = useState("6");
  const [results,setResults] = useState([]);
  const [message,setMessage] = useState("");

  const totals = useMemo(() => ({
    skull:results.filter(face=>face==="skull").length,
    heroShield:results.filter(face=>face==="heroShield").length,
    monsterShield:results.filter(face=>face==="monsterShield").length
  }),[results]);

  function rollDice() {
    const count=Number(diceCount);
    if(!Number.isInteger(count)||count<1||count>100){
      setMessage("Choose between 1 and 100 HeroQuest combat dice.");
      return;
    }
    const faces=Array.from({length:count},()=>{
      const roll=Math.floor(Math.random()*6);
      return roll<3?"skull":roll<5?"heroShield":"monsterShield";
    });
    setResults(faces);
    setMessage("");
  }

  return <section className="panel hq-dice-tool hq-dice-tool-top">
    <div className="hq-dice-toggle-row">
      <div><small>HEROQUEST GAME DICE</small><h3><Dices size={18}/> HeroQuest Dice Roller</h3><p className="muted">3 skulls · 2 white shields · 1 black shield per die.</p></div>
      <button type="button" className="secondary" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded?"Hide HeroQuest dice":"Use HeroQuest dice"}</button>
    </div>
    {expanded && <div className="hq-dice-body">
      <div className="hq-dice-setup">
        <label className="hq-dice-count">How many combat dice?<input type="number" min="1" max="100" value={diceCount} onChange={e=>setDiceCount(e.target.value)}/></label>
        <div className="hq-dice-actions"><button type="button" className="primary" onClick={rollDice}><Dices size={14}/> Roll dice</button><button type="button" className="secondary" onClick={()=>{setResults([]);setMessage("");}}>Clear results</button></div>
      </div>
      {message && <p className="hq-dice-message" role="status">{message}</p>}
      {results.length>0 && <>
        <div className="hq-dice-roll-summary"><span><b>{results.length}</b> dice rolled</span></div>
        <div className="hq-dice-totals">
          <div className="hq-dice-total skull"><Skull size={18}/><b>{totals.skull}</b><span>Skulls</span></div>
          <div className="hq-dice-total hero-shield"><Shield size={18}/><b>{totals.heroShield}</b><span>White shields</span></div>
          <div className="hq-dice-total monster-shield"><Shield size={18} fill="currentColor"/><b>{totals.monsterShield}</b><span>Black shields</span></div>
        </div>
        <div className="hq-dice-results" aria-label="HeroQuest dice results">{results.map((face,index)=><div className={"hq-die "+face} key={index}><span>{face==="skull"?<Skull size={22}/>:<Shield size={22} fill={face==="monsterShield"?"currentColor":"none"}/>}</span><small>Die {index+1}</small></div>)}</div>
      </>}
    </div>}
  </section>;
}
