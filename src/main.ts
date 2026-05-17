// @ts-nocheck
import './styles.css';
import { CLASS_DATA } from './data/classes';
import { BEHAVIORS, EVENT_POOL } from './data/defaults';
import { DEST_DEFS } from './data/destinations';
import { DMG_TYPES } from './data/damageTypes';
import { SYNERGY_COMBOS } from './data/synergies';
import { RARITY_COLORS } from './data/equipment';
import { FOCUS_ORDERS, focusOrder } from './data/focusOrders';
import { clearSave, defaultSave, loadGame, saveGameState } from './store/gameState';
import { createExpedition, resolveExpeditionDecision as resolveExpeditionDecisionChoice } from './engine/expedition';
import { xpThreshold } from './engine/progression';
import { applyOfflineProgress } from './engine/offlineProgress';
import { simulateWorldTick } from './engine/simulation';
import { currentRoomLabel } from './engine/rooms';
import { processSettlementTime } from './engine/settlement';
import { totalSoulLoot } from './engine/loot';
import { seedHeroRelationships, summarizeHeroRelationships } from './engine/relationships';
import { getVisibleMapNodes, revealRoutesFromNode, unlockedDepth } from './world/mapGeneration';
import { NODE_RISK_TEXT } from './world/encounters';
import { NODE_TYPE_LABELS } from './world/nodes';
import { WORLD_REGIONS } from './world/regions';
import { getMasteryOptions, masteryAvailable, masteryLabel, masterySummary } from './data/masteries';

function saveGame(){
  saveGameState(GS,flashSave);
}

function resetGame(){
  clearSave();
  GS=defaultSave();
  saveGame();
  refreshAll();
  showToast('The Lantern rekindles. A new vigil begins.','success');
}

let GS=loadGame();
let offlineReport=applyOfflineProgress(GS);
let offlineElapsedMs=offlineReport.elapsedMs;

// Auto-save every 30s + on unload
setInterval(saveGame,30000);
window.addEventListener('beforeunload',saveGame);

function flashSave(){
  const el=document.getElementById('save-indicator');
  el.classList.add('visible');
  setTimeout(()=>el.classList.remove('visible'),1400);
}

// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
// HELPERS
// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
function fmtTime(ms){
  const d=new Date(ms);
  return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}

function fmtCountdown(ms){
  if(ms<=0)return '0:00';
  const h=Math.floor(ms/3600000);
  const m=Math.floor((ms%3600000)/60000);
  const s=Math.floor((ms%60000)/1000);
  return h>0?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;
}

function durLabel(ms){
  const h=Math.floor(ms/3600000);
  const m=Math.floor((ms%3600000)/60000);
  if(h>0&&m>0)return `${h}h ${m}m`;
  if(h>0)return `${h}h`;
  return `${m}m`;
}

function expeditionHaulSummary(exp){
  if(!exp)return {souls:0,gear:0,items:[]};
  const souls=totalSoulLoot(exp);
  const items=(exp.loot||[]).filter(item=>item.equipment);
  const gear=items.length;
  return {
    souls,
    gear,
    items: items.slice(-4).map(item=>item.equipment?.name).filter(Boolean),
  };
}

function genId(){return 'exp_'+Date.now()+'_'+Math.floor(Math.random()*9999);}

function calcPartyScore(slots,destId){
  let score=0,warnings=[],bonuses=[];
  const dest=DEST_DEFS.find(d=>d.id===destId);

  slots.forEach((h,i)=>{
    if(!h)return;
    const cd=CLASS_DATA[h.cls];
    if(!cd)return;
    if(cd.preferredSlots.includes(i+1)){
      score+=20;
      bonuses.push(`${h.name.split(' ')[0]}: ${cd.posBonus}`);
    } else {
      score-=10;
      warnings.push(`${h.name.split(' ')[0]} misplaced - ${cd.posPenalty}`);
    }
    if(dest){
      dest.threats.forEach(t=>{
        const r=cd.res[t];
        if(r==='strong')score+=15;
        else if(r==='weak'){
          score-=15;
          warnings.push(`${h.name.split(' ')[0]} is weak to ${DMG_TYPES[t].label}`);
        }
      });
    }
  });

  const activeCombs=SYNERGY_COMBOS.filter(c=>c.check(slots));
  activeCombs.forEach(c=>{score+=30;bonuses.push(`+ ${c.name}: ${c.effect}`);});

  score=Math.max(0,Math.min(100,score+50));
  return {score,warnings,bonuses,activeCombs};
}

// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
// EXPEDITION ENGINE
// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
function launchExpedition(){
  if(!selectedDestination)selectedDestination=DEST_DEFS[0]?.id||null;
  let filled=party.filter(Boolean);
  if(!filled.length){
    autoFillParty(true);
    filled=party.filter(Boolean);
  }
  if(!filled.length){showToast('No ready heroes available. Recruit from the roster first.','critical');updateLaunchState();return;}
  if(!selectedDestination){showToast('No destination available','critical');updateLaunchState();return;}
  const dest=DEST_DEFS.find(d=>d.id===selectedDestination);
  if(!dest){showToast('Choose a valid destination','critical');updateLaunchState();return;}
  const {score,activeCombs}=calcPartyScore(party,selectedDestination);
  const now=Date.now();
  const exp=createExpedition({
    id:genId(),
    destination:dest,
    heroIds:party.map(h=>h?h.id:null),
    formation:party.map(h=>h?h.cls:null),
    synergyIds:activeCombs.map(c=>c.id),
    partyScore:score,
    behavior:selectedBehavior,
    now,
  });
  filled.forEach(h=>{
    const hero=GS.heroes.find(x=>x.id===h.id);
    if(hero)hero.status='expedition';
  });
  GS.expeditions.push(exp);
  GS.souls=Math.max(0,GS.souls-20*filled.length);
  saveGame();
  showToast(`${filled.length} hero${filled.length>1?'es':''} sent to ${dest.name} - ${durLabel(dest.durationMs)} expedition`,'warn');
  party=[null,null,null,null];
  selectedDestination=DEST_DEFS[0]?.id||null;
  refreshAll();
}

function checkExpeditions(){
  const changed=simulateWorldTick(GS,Date.now());
  const completed=GS.expeditions.find(exp=>exp.status==='complete'&&!exp.resultViewed&&exp.resultSummary);
  if(completed){
    completed.resultViewed=true;
    setTimeout(()=>showExpeditionResultModal(completed),150);
    saveGame();
  }
  if(changed){saveGame();refreshAll();}
}

function resolveExpedition(exp){
  const dest=DEST_DEFS.find(d=>d.id===exp.destId)||{danger:2,name:'Unknown'};
  // pull synergy modifiers
  const activeCombs=(exp.synergyIds||[]).map(id=>SYNERGY_COMBOS.find(c=>c.id===id)).filter(Boolean);
  const surviveMult=activeCombs.reduce((a,c)=>a*(c.modifiers.surviveMult||1),1);
  const rewardMult =activeCombs.reduce((a,c)=>a*(c.modifiers.rewardMult||1),1);
  const scoreMult  =1+((exp.partyScore||50)-50)/200; // +/-25% from score
  let reward=Math.floor((dest.danger*40+Math.floor(Math.random()*dest.danger*30))*rewardMult*scoreMult);
  let allDead=true;

  exp.heroIds.forEach(heroId=>{
    const hero=GS.heroes.find(h=>h.id===heroId);
    if(!hero)return;
    const roll=Math.random()*surviveMult;
    if(roll<dest.danger*0.04){
      hero.status='dead';
      exp.log.push(`${hero.name} did not return.`);
      showToast(`${hero.name} has fallen in ${dest.name}. The Lantern dims.`,'critical');
    } else if(roll<dest.danger*0.14){
      const dmg=Math.floor(Math.random()*20)+10;
      hero.hp=Math.max(1,hero.hp-dmg);
      hero.status='injured';
      hero.morale=Math.max(10,hero.morale-15);
      exp.log.push(`${hero.name} returned wounded. HP -${dmg}.`);
      allDead=false;
    } else if(roll<dest.danger*0.22){
      hero.cor=Math.min(100,hero.cor+Math.floor(Math.random()*15)+5);
      hero.status=hero.cor>=80?'corrupted':'resting';
      exp.log.push(`${hero.name} returned with corruption spreading.`);
      allDead=false;
    } else {
      hero.status='resting';
      hero.morale=Math.min(100,hero.morale+8);
      exp.log.push(`${hero.name} returned safely.`);
      allDead=false;
    }
  });

  if(allDead)reward=Math.floor(reward*0.2);
  GS.souls+=reward;
  GS.completedCount++;
  exp.log.push(`+${reward} Remnant Souls recovered.`);
  if(!allDead)showToast(`${dest.name} expedition complete - +${reward} souls`,'success');
}

function retreatExpedition(){
  const exp=getWatchedExp();
  if(!exp)return;
  const now=Date.now();
  exp.retreating=true;
  exp.pendingDecision=undefined;
  exp.pendingDecisionChoice=undefined;
  exp.endTime=now+60000;
  exp.lastSimAt=now;
  exp.log=exp.log||[];
  exp.log.push(`[${fmtTime(now)}] Retreat signals are raised.`);
  showToast('Retreat signal sent - the party turns back','warn');
  saveGame();
  refreshAll();
}

function chooseExpeditionDecision(choiceIndex){
  const exp=getWatchedExp();
  if(!exp||!exp.pendingDecision){showToast('No expedition decision is pending.','critical');return;}
  const dest=DEST_DEFS.find(d=>d.id===exp.destId);
  if(!dest){showToast('Unable to resolve the expedition decision.','critical');return;}
  const ok=resolveExpeditionDecisionChoice(GS,exp,dest,choiceIndex,Date.now());
  if(!ok){showToast('That decision has already passed.','warn');return;}
  saveGame();
  refreshAll();
  updateExpDisplay();
}

function changeExpeditionFocus(focusId){
  const exp=getWatchedExp();
  if(!exp){showToast('No active expedition to command.','critical');return;}
  const next=focusOrder(focusId);
  const current=focusOrder(exp.currentFocus);
  if(current.id===next.id)return;
  const now=Date.now();
  exp.currentFocus=next.id;
  if(next.id!=='scouting')exp.focusScoutUsed=false;
  exp.focusChanges=(exp.focusChanges||0)+1;
  exp.lastFocusChangeAt=now;
  exp.log=exp.log||[];
  exp.log.push(`[${fmtTime(now)}] ${next.logText}`);
  if(exp.focusChanges>3){
    exp.heroIds.forEach(id=>{
      const hero=GS.heroes.find(h=>h.id===id);
      if(hero&&hero.status!=='dead')hero.morale=Math.max(0,hero.morale-2);
    });
    exp.log.push(`[${fmtTime(now)}] Conflicting orders unsettle the party.`);
  }
  if(next.id==='scouting'&&!exp.focusScoutUsed){
    const revealed=revealRoutesFromNode(GS,exp.destId||exp.destinationId,1);
    exp.focusScoutUsed=true;
    revealed.forEach(node=>exp.log.push(`[${fmtTime(now)}] Scouts mark a route toward ${node.name}.`));
  }
  saveGame();
  updateExpDisplay();
  buildHeroes();
  buildDestinations();
}

function abandonExpedition(){
  const exp=getWatchedExp();
  if(!exp)return;
  exp.status='complete';
  exp.heroIds.forEach(heroId=>{
    const hero=GS.heroes.find(h=>h.id===heroId);
    if(!hero)return;
    if(Math.random()<0.35){hero.status='dead';showToast(`${hero.name} was lost in the abandonment.`,'critical');}
    else{hero.status='injured';hero.hp=Math.max(1,Math.floor(hero.hp*0.5));}
  });
  GS.souls=Math.max(0,GS.souls-50);
  saveGame();
  showToast('Expedition abandoned - God have mercy on them','critical');
  refreshAll();
}

// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
// WATCHED EXPEDITION
// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
let watchingExpId=null;

function getWatchedExp(){
  const active=GS.expeditions.filter(e=>e.status==='active');
  if(!active.length)return null;
  if(watchingExpId){
    const f=active.find(e=>e.id===watchingExpId);
    if(f)return f;
  }
  watchingExpId=active[0].id;
  return active[0];
}

const EXP_PHASES=['Departing the settlement...','Navigating outer ruins...','Descending into darkness...','Pressing toward the objective...','Objective reached - searching...','Beginning return journey...'];

function updateExpDisplay(){
  const exp=getWatchedExp();
  const timerEl=document.getElementById('exp-timer');
  const haulEl=document.getElementById('exp-haul');
  const nameEl=document.getElementById('exp-name');
  const phaseEl=document.getElementById('exp-phase');
  const loreEl=document.getElementById('dungeon-lore');
  const decisionEl=document.getElementById('exp-decision');

  const activeCount=GS.expeditions.filter(e=>e.status==='active').length;
  document.getElementById('stat-expeditions').textContent=activeCount;

  if(!exp){
    timerEl.textContent='--:--';
    if(haulEl)haulEl.textContent='HAUL: --';
    nameEl.textContent='NO ACTIVE EXPEDITION';
    phaseEl.textContent='Send a party forth to begin.';
    if(loreEl)loreEl.textContent='The Lantern holds.';
    if(decisionEl)decisionEl.innerHTML='';
    renderEventLog();
    return;
  }
  const dest=DEST_DEFS.find(d=>d.id===exp.destId);
  const remaining=Math.max(0,(exp.endTime||Date.now())-Date.now());
  timerEl.textContent=exp.pendingDecision?'PAUSED':fmtCountdown(remaining);
  nameEl.textContent=dest?dest.name.toUpperCase():'EXPEDITION';
  if(loreEl&&dest)loreEl.textContent=dest.lore;
  if(haulEl){
    const haul=expeditionHaulSummary(exp);
    haulEl.textContent=`HAUL: ${haul.souls} souls, ${haul.gear} gear${haul.items.length?` · ${haul.items.join(', ')}`:''}`;
  }

  const elapsed=Date.now()-(exp.startTime||Date.now());
  const total=(exp.endTime||Date.now())-(exp.startTime||Date.now());
  const pct=Math.min(1,elapsed/total);
  const roomName=currentRoomLabel(exp.roomPath,exp.currentRoomIndex||0);
  phaseEl.textContent=exp.pendingDecision?`${roomName} - awaiting command`:`${roomName} - ${EXP_PHASES[Math.min(EXP_PHASES.length-1,Math.floor(pct*EXP_PHASES.length))]}`;
  if(decisionEl){
    const focus=focusOrder(exp.currentFocus);
    const focusHtml=`
      <div class="focus-panel">
        <div class="focus-current">ORDER: <span>${focus.label}</span></div>
        <div class="focus-options">
          ${FOCUS_ORDERS.map(f=>`<button class="focus-btn ${exp.currentFocus===f.id?'active':''}" title="${f.tooltip}" onclick="changeExpeditionFocus('${f.id}')">${f.icon}<span>${f.label}</span></button>`).join('')}
        </div>
      </div>`;
    if(exp.pendingDecision){
      decisionEl.innerHTML=`
        ${focusHtml}
        <div class="decision-text">${exp.pendingDecision.text}</div>
        <div class="decision-options">
          ${exp.pendingDecision.options.map((label,i)=>`<button class="exp-btn choice" onclick="chooseExpeditionDecision(${i})">${label}</button>`).join('')}
        </div>`;
    } else {
      decisionEl.innerHTML=focusHtml;
    }
  }
  renderEventLog(exp);
}

// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
// EVENT LOG
// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
let lastEventMs=0;

function classifyLogLine(text){
  const t=text.toLowerCase();
  if(t.includes('slain')||t.includes('lost')||t.includes('dead')||t.includes('collapses')||t.includes('corruption'))return 'critical';
  if(t.includes('damage')||t.includes('wounded')||t.includes('horror')||t.includes('morale'))return 'warning';
  if(t.includes('recovered')||t.includes('return')||t.includes('steadies')||t.includes('souls'))return 'good';
  return '';
}

function renderEventLog(exp=getWatchedExp()){
  const logEl=document.getElementById('event-log');
  if(!logEl)return;
  const source=exp||GS.expeditions.filter(e=>e.log&&e.log.length).slice(-1)[0];
  if(!source){
    logEl.innerHTML='';
    return;
  }
  const lines=(source.log||[]).slice(-6);
  logEl.innerHTML=lines.map((line,i)=>{
    const newest=i===lines.length-1?' newest':'';
    const stamped=line.startsWith('[')?line:`[${fmtTime(Date.now())}] ${line}`;
    return `<div class="event-line ${classifyLogLine(line)}${newest}">${stamped}</div>`;
  }).join('');
}

function maybeAddEvent(){
  const now=Date.now();
  if(getWatchedExp()){renderEventLog();return;}
  if(now-lastEventMs<5000+Math.random()*4000)return;
  lastEventMs=now;

  const exp=getWatchedExp();
  const logEl=document.getElementById('event-log');
  if(!logEl)return;

  const ev=EVENT_POOL[Math.floor(Math.random()*EVENT_POOL.length)];
  let txt=ev.t;

  // substitute hero name
  if(txt.includes('{h}')&&exp){
    const hid=exp.heroIds[Math.floor(Math.random()*exp.heroIds.length)];
    const hero=GS.heroes.find(h=>h.id===hid);
    txt=txt.replace('{h}',hero?hero.name.split(' ')[0]:'The party');
  } else if(txt.includes('{h}')){
    txt=txt.replace('{h}','The wanderer');
  }

  const line=document.createElement('div');
  line.className=`event-line ${ev.c} newest`;
  line.textContent=`[${fmtTime(now)}] ${txt}`;
  logEl.appendChild(line);

  logEl.querySelectorAll('.event-line').forEach((el,i,arr)=>{
    if(i<arr.length-1)el.classList.remove('newest');
  });
  while(logEl.children.length>3)logEl.removeChild(logEl.firstChild);

  // store in exp log
  if(exp){
    exp.log=exp.log||[];
    exp.log.push(`[${fmtTime(now)}] ${txt}`);
    if(exp.log.length>50)exp.log=exp.log.slice(-50);
  }
}

// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
// PRESSURE
// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
function tickPressure(){
  GS.pressure=Math.min(100,GS.pressure+0.05);
  if(GS.pressure>=80){
    GS.heroes.forEach(h=>{if(h.status!=='dead'&&h.status!=='expedition')h.morale=Math.max(0,h.morale-0.2);});
  }
  document.getElementById('pressure-pct').textContent=Math.round(GS.pressure)+'%';
  document.getElementById('pressure-fill').style.width=GS.pressure+'%';
  if(GS.pressure>60)document.body.classList.add('high-pressure');
}
setInterval(tickPressure,15000);

// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
// UI STATE
// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
// party is 4 slots (null | hero)
let party=[null,null,null,null];
let selectedDestination=DEST_DEFS[0]?.id||null;
let selectedBehavior='balanced';

function refreshFormation(){
  buildFormation();
  updateLaunchState();
}

function refreshAll(){
  buildBuildings();
  buildHeroes();
  buildFormation();
  buildDestinations();
  buildBehaviors();
  updateLaunchState();
  updateHeaderStats();
}

function updateHeaderStats(){
  document.getElementById('stat-souls').textContent=GS.souls;
  const alive=GS.heroes.filter(h=>h.status!=='dead').length;
  document.getElementById('stat-heroes').textContent=alive;
  document.getElementById('stat-day').textContent='Day '+GS.day;
  document.getElementById('pressure-pct').textContent=Math.round(GS.pressure)+'%';
  document.getElementById('pressure-fill').style.width=GS.pressure+'%';
}

// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
// UI BUILDERS
// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
function buildBuildings(){
  document.getElementById('building-list').innerHTML=GS.buildings.map(b=>`
    <div class="building${b.status==='locked'?' locked':''}" onclick="showBuildingModal('${b.id}')">
      <div class="building-header">
        <span class="building-icon">${b.icon}</span>
        <span class="building-name">${b.name}</span>
        <span class="building-level">${b.status==='locked'?'LOCKED':'LV '+b.level}</span>
        <span class="building-status status-${b.status}"></span>
      </div>
      <div class="building-desc">${b.desc}</div>
    </div>`).join('');
}

function buildHeroes(){
  const badgeMap={expedition:'badge-expedition',resting:'badge-resting',injured:'badge-injured',ready:'badge-ready',corrupted:'badge-corrupted',deathDoor:'badge-injured',dead:'badge-dead'};
  const badgeText={expedition:'ON MISSION',resting:'RESTING',injured:'INJURED',ready:'READY',corrupted:'CORRUPTED',deathDoor:"DEATH'S DOOR",dead:'FALLEN'};
  document.getElementById('hero-list').innerHTML=GS.heroes.map(h=>{const cd=CLASS_DATA[h.cls]||null;
    const hpPct=(h.hp/h.maxHp)*100;
    const xpMax=xpThreshold(h);
    const xpPct=Math.min(100,Math.max(0,((h.xp||0)/xpMax)*100));
    const equipCount=Object.values(h.equipment||{}).filter(Boolean).length;
    let cardCls='hero-card';
    if(h.status==='expedition')cardCls+=' on-expedition';
    if(h.status==='corrupted')cardCls+=' corrupted';
    if(h.status==='dead')cardCls+=' dead';
    return `
    <div class="${cardCls}" onclick="showHeroModal(${h.id})">
      <div class="hero-top">
        <div class="hero-portrait">${h.icon}${h.cor>40?'<div class="hero-portrait-corruption"></div>':''}</div>
        <div class="hero-info">
          <div class="hero-name">${h.name}</div>
          <div class="hero-class">${h.cls}</div>
          <div class="hero-level">RANK ${h.level}</div>
        </div>
        <span class="hero-status-badge ${badgeMap[h.status]||'badge-ready'}">${badgeText[h.status]||'READY'}</span>
      </div>
      <div class="hero-bars">
        <div class="stat-bar"><span class="stat-label">HP</span><div class="bar-track"><div class="bar-fill ${hpPct>50?'bar-hp high':'bar-hp'}" style="width:${hpPct}%"></div></div><span class="stat-val">${h.hp}/${h.maxHp}</span></div>
        <div class="stat-bar"><span class="stat-label">XP</span><div class="bar-track"><div class="bar-fill" style="width:${xpPct}%"></div></div><span class="stat-val">${h.xp||0}/${xpMax}</span></div>
        <div class="stat-bar"><span class="stat-label">MRL</span><div class="bar-track"><div class="bar-fill bar-morale" style="width:${h.morale}%"></div></div><span class="stat-val">${h.morale}%</span></div>
        <div class="stat-bar"><span class="stat-label">COR</span><div class="bar-track"><div class="bar-fill bar-corruption" style="width:${h.cor}%"></div></div><span class="stat-val">${h.cor}%</span></div>
      </div>
      <div class="hero-quirks">${h.quirks.map((q,i)=>`<span class="quirk ${h.qt[i]}">${q}</span>`).join('')}</div>
      <div class="res-row"><span class="res-pip res-strong">MSTR ${masteryLabel(h)}</span></div>
      ${equipCount?`<div class="res-row"><span class="res-pip res-strong">GEAR ${equipCount}/4</span></div>`:''}
      ${cd?`<div class="res-row">${Object.entries(cd.res).filter(([,v])=>v!=='neutral').map(([t,v])=>`<span class="res-pip res-${v}">${DMG_TYPES[t].icon} ${v==='strong'?'+':'-'}</span>`).join('')}</div>`:''}
    </div>`;
  }).join('');
}

function buildFormation(){
  const el=document.getElementById('formation-slots');
  if(!el)return;
  el.innerHTML='';
  const SLOT_LABELS=['FRONT','','','BACK'];
  const ROLE_COLORS={tank:'#a07030',melee:'#c89050',ranged:'#6a9870',support:'#7a6a9a',hybrid:'#a08060'};

  for(let i=0;i<4;i++){
    const h=party[i];
    const cd=h?CLASS_DATA[h.cls]:null;
    const inPreferred=h&&cd&&cd.preferredSlots.includes(i+1);
    const posClass=h?(inPreferred?'good-pos':'bad-pos'):'';

    // slot wrapper
    const wrap=document.createElement('div');
    wrap.className='formation-slot';

    // slot number + label
    wrap.innerHTML=`<div class="formation-slot-label">${SLOT_LABELS[i]||'-'}</div>`;

    // card
    const card=document.createElement('div');
    card.className=`formation-card ${h?'filled':''} ${posClass}`;

    if(h){
      const roleColor=ROLE_COLORS[cd?.role]||'var(--ink-dim)';
      card.innerHTML=`
        <span class="fc-icon">${h.icon}</span>
        <span class="fc-name">${h.name.split(' ')[0]}</span>
        <span class="fc-role" style="color:${roleColor}">${cd?.role||''}</span>
        <span class="fc-fit">${inPreferred?'âœ¦':'âš '}</span>`;
      card.title=inPreferred?cd.posBonus:cd?.posPenalty||'';
      card.onclick=()=>{party[i]=null;refreshFormation();updateLaunchState();};
    } else {
      card.innerHTML=`<span style="font-size:18px;color:var(--ink-dim)">+</span><span style="font-size:8px;color:var(--ink-dim);font-family:'Cinzel',serif;letter-spacing:.05em">Slot ${i+1}</span>`;
      card.onclick=()=>showHeroSelect(i);
    }
    wrap.appendChild(card);

    // slot num
    const num=document.createElement('div');
    num.className='formation-slot-num';
    num.textContent=i+1;
    wrap.appendChild(num);

    el.appendChild(wrap);

    // arrow between slots
    if(i<3){
      const arr=document.createElement('div');
      arr.className='formation-arrows';
      arr.textContent='â†’';
      el.appendChild(arr);
    }
  }
  buildSynergyBar();
  buildPartyScore();
}

function buildSynergyBar(){
  const el=document.getElementById('synergy-bar');
  if(!el)return;
  const active=SYNERGY_COMBOS.filter(c=>c.check(party));
  if(!active.length){el.innerHTML='<span style="font-size:9px;color:var(--ink-dim);font-style:italic">No synergies active yet.</span>';return;}
  el.innerHTML=active.map(c=>`<span class="synergy-tag" title="${c.flavor}\n${c.effect}">âœ¦ ${c.name}</span>`).join('');
}

function buildPartyScore(){
  const el=document.getElementById('party-score-panel');
  if(!el)return;
  const filled=party.filter(Boolean);
  if(!filled.length){el.innerHTML='<span style="font-size:10px;color:var(--ink-dim);font-style:italic">No heroes assigned.</span>';return;}

  const {score,warnings,bonuses,activeCombs}=calcPartyScore(party,selectedDestination);
  const ringCls=score>=70?'high':score<=35?'low':'';

  let html=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
    <div class="score-ring ${ringCls}">${score}</div>
    <div style="font-size:10px;color:var(--ink-dim);flex:1;line-height:1.5">
      ${score>=70?'<span style="color:#7aaa5a">Strong formation</span>':score<=35?'<span style="color:#cc4444">Dangerous gaps</span>':'<span style="color:var(--gold)">Viable formation</span>'}
    </div>
  </div>`;

  if(warnings.length){
    html+=warnings.slice(0,2).map(w=>`<div style="font-size:9px;color:#cc6644;font-style:italic;margin-bottom:1px">! ${w}</div>` ).join('');
  }
  el.innerHTML=html;
}

// legacy alias so launch still works
function buildPartySlots(){buildFormation();}

function buildDestinations(){
  const el=document.getElementById('destination-list');
  const nodes=getVisibleMapNodes(GS);
  const openDepth=unlockedDepth(GS);
  const byRegion=WORLD_REGIONS.map(region=>({
    region,
    nodes:nodes.filter(node=>node.regionId===region.id),
  })).filter(group=>group.nodes.length);
  el.innerHTML=`
    <div class="map-depth">RELIABLE DEPTH ${openDepth} Â· ${GS.scoutedNodeIds?.length||0} ROUTES SCOUTED</div>
    <div class="map-scroll">
      ${byRegion.map(({region,nodes})=>`
        <div class="map-region">
          <div class="map-region-head">
            <span>${region.name}</span>
            <em>D${region.depthMin}-${region.depthMax}</em>
          </div>
          <div class="map-region-sub">${region.identity}</div>
          <div class="map-nodes">
            ${nodes.map(d=>{
              const selected=selectedDestination===d.id;
              const dangerPips=[1,2,3,4,5,6].map(n=>`<div class="danger-pip${n>d.danger?' empty':''}"></div>`).join('');
              const risk=NODE_RISK_TEXT[d.nodeType]||d.threatNote||'Unknown risk.';
              return `
                <div class="map-node ${selected?'selected':''} ${d.locked?'locked':''} ${d.fogged?'fogged':''} ${d.scouted?'scouted':''}" onclick="selectDest('${d.id}')" title="${d.threatNote}">
                  <div class="map-node-line">
                    <span class="map-node-icon">${d.fogged?'?':d.icon}</span>
                    <div class="map-node-main">
                      <div class="map-node-name">${d.fogged?'Unscouted Route':d.name}</div>
                      <div class="map-node-meta">Depth ${d.depth} Â· ${NODE_TYPE_LABELS[d.nodeType]||'Unknown'} Â· ${durLabel(d.durationMs)}</div>
                    </div>
                    <div class="dest-danger">${dangerPips}</div>
                  </div>
                  <div class="map-node-risk">${d.locked&&d.scouted?'Scouted, but beyond current reach.':d.locked?'Route beyond current reach.':risk}</div>
                  ${d.routeNames?.length?`<div class="map-node-routes">${d.routeNames.slice(0,3).map((r,i)=>`<span class="map-route-chip">${i===0?'â†’':''} ${r}</span>`).join('')}</div>`:''}
                  ${!d.fogged?`<div class="map-threats">${d.threats.map(t=>`<span class="threat-badge" style="background:${DMG_TYPES[t].color}22;color:${DMG_TYPES[t].color};border:1px solid ${DMG_TYPES[t].color}44">${DMG_TYPES[t].icon} ${DMG_TYPES[t].label}</span>`).join('')}</div>`:''}
                </div>`;
            }).join('')}
          </div>
        </div>`).join('')}
    </div>`;
}

function selectDest(id){
  const visible=getVisibleMapNodes(GS);
  const node=visible.find(n=>n.id===id);
  if(node?.locked){showToast('That route is too deep for the settlement to support.','critical');return;}
  if(node?.fogged){showToast('The route is still hidden in fog. Improve scouting.','warn');return;}
  selectedDestination=id;
  buildDestinations();
  buildFormation(); // refresh fit indicators vs new threats
  updateLaunchState();
}

function buildBehaviors(){
  document.getElementById('behavior-list').innerHTML=BEHAVIORS.map(b=>`
    <div onclick="selectBehavior('${b.id}')" style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:3px 0">
      <div style="width:10px;height:10px;border-radius:50%;border:1px solid var(--border);background:${selectedBehavior===b.id?'var(--ember)':'transparent'};transition:.15s;box-shadow:${selectedBehavior===b.id?'0 0 6px var(--ember)':'none'}"></div>
      <div>
        <div style="font-family:'Cinzel',serif;font-size:10px;color:${selectedBehavior===b.id?'var(--gold)':'var(--ink-dim)'};letter-spacing:.05em">${b.label}</div>
        <div style="font-size:9px;color:var(--ink-dim);font-style:italic">${b.desc}</div>
      </div>
    </div>`).join('');
}

function selectBehavior(id){selectedBehavior=id;buildBehaviors();}

function updateLaunchState(){
  const btn=document.getElementById('launch-btn');
  const warn=document.getElementById('launch-warning');
  if(!selectedDestination)selectedDestination=DEST_DEFS[0]?.id||null;
  const filled=party.filter(Boolean);
  const hasParty=filled.length>0;
  const hasDest=!!selectedDestination;
  const readyCount=GS.heroes.filter(h=>h.status==='ready'&&!party.find(s=>s&&s.id===h.id)).length;
  if(!hasParty&&!hasDest){btn.disabled=readyCount===0;warn.textContent=readyCount?'Click SEND FORTH to auto-fill':'No ready heroes';}
  else if(!hasParty){btn.disabled=readyCount===0;warn.textContent=readyCount?'Click SEND FORTH to auto-fill':'No ready heroes';}
  else if(!hasDest){btn.disabled=true;warn.textContent='Choose a destination';}
  else{
    btn.disabled=false;
    const dest=DEST_DEFS.find(d=>d.id===selectedDestination);
    warn.textContent=`${filled.length} hero${filled.length>1?'es':''} -> ${durLabel(dest.durationMs)}`;
  }
  buildPartyScore();
}

let _targetSlot=null;
function showHeroSelect(slotIndex){
  _targetSlot=slotIndex!=null?slotIndex:party.findIndex(s=>s===null);
  if(_targetSlot===-1){showToast('Party is full','critical');return;}
  const occupied=new Set(party.filter(Boolean).map(h=>h.id));
  const avail=GS.heroes.filter(h=>h.status==='ready'&&!occupied.has(h.id));
  if(!avail.length){showToast('No heroes available for deployment','critical');return;}

  const destId=selectedDestination;
  const dest=DEST_DEFS.find(d=>d.id===destId);

  const opts=avail.map(h=>{
    const cd=CLASS_DATA[h.cls]||{};
    const inPref=cd.preferredSlots&&cd.preferredSlots.includes(_targetSlot+1);
    const threatWarns=dest?dest.threats.filter(t=>cd.res&&cd.res[t]==='weak').map(t=>DMG_TYPES[t].label):[];
    const threatStrong=dest?dest.threats.filter(t=>cd.res&&cd.res[t]==='strong').map(t=>DMG_TYPES[t].label):[];
    const fitColor=inPref?'#5a8a4a':'var(--ink-dim)';
    return `
    <div onclick="assignToSlot(${h.id})" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--border);border-radius:3px;cursor:pointer;margin-bottom:6px;transition:all .15s" onmouseover="this.style.borderColor='var(--ember)'" onmouseout="this.style.borderColor='var(--border)'">
      <span style="font-size:20px">${h.icon}</span>
      <div style="flex:1">
        <div style="font-family:'Cinzel',serif;font-size:11px;color:var(--gold)">${h.name}</div>
        <div style="font-size:10px;color:var(--ink-dim);font-style:italic">${h.cls} - Rank ${h.level}</div>
        <div style="font-size:9px;color:${fitColor};margin-top:1px">${inPref?'+ Preferred position':'! Off-position'}</div>
        ${threatWarns.length?`<div style="font-size:9px;color:#cc4444;margin-top:1px">! Weak vs ${threatWarns.join(', ')}</div>`:''}
        ${threatStrong.length?`<div style="font-size:9px;color:#5a8a4a;margin-top:1px">+ Resistant to ${threatStrong.join(', ')}</div>`:''}
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
        ${Object.entries(cd.res||{}).map(([t,v])=>v!=='neutral'?`<span class="res-pip res-${v}">${DMG_TYPES[t]?.icon||t} ${v==='strong'?'+':'-'}</span>`:'').filter(Boolean).join('')}
      </div>
    </div>`;
  }).join('');

  const slotLabel=['Front','Slot 2','Slot 3','Back'][_targetSlot]||`Slot ${_targetSlot+1}`;
  openModal(`Assign to ${slotLabel}`,'Choose a hero - position fit and resistances shown',opts,`<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>`);
}

function assignToSlot(heroId){
  const hero=GS.heroes.find(h=>h.id===heroId);
  if(!hero||_targetSlot===null)return;
  // if hero is already in another slot, clear it
  const existing=party.indexOf(party.find(h=>h&&h.id===heroId));
  if(existing>=0)party[existing]=null;
  party[_targetSlot]=hero;
  _targetSlot=null;
  closeModal();
  refreshFormation();
  updateLaunchState();
  showToast(`${hero.name} â†’ Slot ${party.indexOf(hero)+1}`,'success');
}

// legacy alias
function addToParty(heroId){
  if(_targetSlot===null){
    _targetSlot=party.findIndex(s=>s===null);
  }
  assignToSlot(heroId);
}

function autoFillParty(silent=false){
  const occupied=new Set(party.filter(Boolean).map(h=>h.id));
  const ready=GS.heroes.filter(h=>h.status==='ready'&&!occupied.has(h.id));
  if(!ready.length){if(!silent)showToast('No ready heroes available. Recruit or wait for recovery.','critical');return 0;}
  let added=0;
  for(let i=0;i<party.length;i++){
    if(party[i])continue;
    const next=ready.shift();
    if(!next)break;
    party[i]=next;
    added++;
  }
  refreshFormation();
  updateLaunchState();
  if(!silent)showToast(`${added} hero${added===1?'':'es'} assigned to formation`,'success');
  return added;
}

// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
// INTERVENTION ACTIONS
// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
function doLanternPulse(){
  const exp=getWatchedExp();
  if(!exp){showToast('No active expedition to pulse','');return;}
  if(GS.souls<50){showToast('Not enough Remnant Souls (need 50)','critical');return;}
  openModal(
    'Emergency Lantern Pulse',
    'Channel the Last Lantern\'s power across the rift',
    'Sends a surge of sanctuary light. Restores morale and briefly reveals hidden enemies.<br><br><em>Cost: 50 Remnant Souls. Cooldown: 4 hours.</em>',
    `<button class="btn btn-ghost" onclick="closeModal()">Withdraw</button>
     <button class="btn btn-primary" onclick="closeModal();GS.souls-=50;updateHeaderStats();saveGame();showToast('Lantern pulse sent - the darkness recoils','success')">Pulse (50 souls)</button>`
  );
}

function doRetreat(){
  const exp=getWatchedExp();
  if(!exp){showToast('No active expedition','');return;}
  const haul=expeditionHaulSummary(exp);
  openModal(
    'Sound Retreat',
    'Command the party to return to safety',
    `The party will begin retreating immediately. Progress will be partially preserved.<br><br><em>Current haul: ${haul.souls} souls, ${haul.gear} gear${haul.items.length?` (${haul.items.join(', ')})`:''}.</em><br><em>Heroes will return within 60 seconds.</em>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Hold Position</button>
     <button class="btn btn-primary" onclick="closeModal();retreatExpedition()">Sound Retreat</button>`
  );
}

function doAbandon(){
  const exp=getWatchedExp();
  if(!exp){showToast('No active expedition','');return;}
  openModal(
    'Abandon Expedition',
    'âš  This cannot be undone',
    'You are ordering the party to scatter. Heroes may be lost permanently. Equipment will not be recovered.<br><br><em>Only consider this if all hope is lost.</em>',
    `<button class="btn btn-ghost" onclick="closeModal()">Hold Firm</button>
     <button class="btn" style="background:rgba(138,26,26,.2);border:1px solid var(--blood);color:#cc4444;border-radius:2px;font-family:'Cinzel',serif;font-size:11px;padding:7px 16px;cursor:pointer" onclick="closeModal();abandonExpedition()">Abandon All</button>`
  );
}

// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
// MODALS
// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
function openModal(title,subtitle,body,actions){
  document.getElementById('modal-title').textContent=title;
  document.getElementById('modal-subtitle').textContent=subtitle;
  document.getElementById('modal-body').innerHTML=body;
  document.getElementById('modal-actions').innerHTML=actions;
  document.getElementById('modal-overlay').classList.add('active');
}

function showModal(type){
  const UPGRADE_DESCS={
    infirmary:'Upgrade to allow faster healing and treatment of corruption.',
    tavern:'Improve to attract higher-quality recruits with rarer traits.',
    forge:'Enhance to craft legendary equipment and modify relics.',
    archive:'Expand to unlock regional scouting maps and ancient lore.',
    shrine:'Strengthen to reduce world pressure passively each dawn.',
    graveyard:'Deepen to occasionally commune with fallen heroes for guidance.',
    tower:'Build to preview expedition dangers before committing.',
    vault:'Construct to safely store cursed relics without corruption spread.',
  };
  if(type==='recruit'){
    const pool=[
      {icon:'🗡',name:'Wren Saltborn',cls:'Rat Duelist',cost:120,mood:'Desperate, quick, nervous'},
      {icon:'☠',name:'Ossian Coldmere',cls:'Bone Forager',cost:80,mood:'Quiet, patient, scarred'},
      {icon:'🏹',name:'Lysa the Pale',cls:'Hollow Archer',cost:100,mood:'Detached, precise, haunted'},
    ];
    const body=`<div style="display:flex;flex-direction:column;gap:10px">${pool.map(r=>`
      <div style="border:1px solid var(--border);border-radius:3px;padding:10px 12px;display:flex;align-items:center;gap:10px">
        <span style="font-size:24px">${r.icon}</span>
        <div style="flex:1"><div style="font-family:'Cinzel',serif;font-size:12px;color:var(--gold)">${r.name}</div><div style="font-size:11px;color:var(--ember);font-style:italic">${r.cls}</div><div style="font-size:10px;color:var(--ink-dim)">${r.mood}</div></div>
        <button class="btn btn-ghost" style="font-size:10px" onclick="recruitHero('${r.name}','${r.cls}','${r.icon}',${r.cost})">${r.cost} souls</button>
      </div>`).join('')}</div>`;
    openModal('Seek New Recruits','Souls gather where the lantern burns',body,`<button class="btn btn-ghost" onclick="closeModal()">Leave Them</button>`);
  }
}

function showReturnSummary(report){
  if(!report||!report.elapsedMs)return;
  const body=`
    <div style="display:flex;flex-direction:column;gap:8px">
      <div style="font-size:11px;color:var(--ink)">Away for ${durLabel(report.elapsedMs)}.</div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px">
        <div style="border:1px solid var(--border);border-radius:2px;padding:7px 8px;background:rgba(255,255,255,.02)"><div style="font-size:9px;color:var(--ink-dim);font-family:'Cinzel',serif;letter-spacing:.08em">EXPEDITIONS</div><div style="font-size:12px;color:var(--gold)">${report.completedExpeditions} finished / ${report.activeExpeditions} active</div></div>
        <div style="border:1px solid var(--border);border-radius:2px;padding:7px 8px;background:rgba(255,255,255,.02)"><div style="font-size:9px;color:var(--ink-dim);font-family:'Cinzel',serif;letter-spacing:.08em">ROOMS</div><div style="font-size:12px;color:var(--ember)">${report.roomsCleared} cleared</div></div>
        <div style="border:1px solid var(--border);border-radius:2px;padding:7px 8px;background:rgba(255,255,255,.02)"><div style="font-size:9px;color:var(--ink-dim);font-family:'Cinzel',serif;letter-spacing:.08em">LOOT</div><div style="font-size:12px;color:#7aaa5a">${report.lootFound} recovered</div></div>
        <div style="border:1px solid var(--border);border-radius:2px;padding:7px 8px;background:rgba(255,255,255,.02)"><div style="font-size:9px;color:var(--ink-dim);font-family:'Cinzel',serif;letter-spacing:.08em">LOSS</div><div style="font-size:12px;color:#cc4444">${report.deaths} dead / ${report.heroesInjured} injured</div></div>
      </div>
      ${report.heroesLeveled?`<div style="font-size:11px;color:#7aaa5a">Heroes leveled: ${report.heroesLeveled}</div>`:''}
      ${report.majorEvents.length?`<div style="margin-top:4px;border-top:1px solid var(--border);padding-top:8px"><div style="font-family:'Cinzel',serif;font-size:9px;color:var(--ink-dim);letter-spacing:.1em;margin-bottom:4px">MAJOR EVENTS</div>${report.majorEvents.map(msg=>`<div style="font-size:10px;color:var(--ink);line-height:1.45;margin-bottom:2px">â€¢ ${msg}</div>`).join('')}</div>`:''}
    </div>`;
  openModal('Return Summary', 'The lantern remembers what changed', body, `<button class="btn btn-ghost" onclick="closeModal()">Close</button>`);
}

function showExpeditionResultModal(exp){
  if(!exp||!exp.resultSummary)return;
  const summary=exp.resultSummary;
  const lootStacks=(exp.loot||[]).slice(-8);
  const gearStacks=lootStacks.filter(item=>item.equipment);
  const soulStacks=lootStacks.filter(item=>item.souls);
  const body=`
    <div style="display:flex;flex-direction:column;gap:8px">
      <div style="font-size:11px;color:var(--ink)">${summary.destinationName} · ${summary.retreating?'Retreat':'Completion'} · ${durLabel(Math.max(0,(exp.completedAt||Date.now())-(exp.startedAt||exp.startTime||Date.now())))}</div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px">
        <div style="border:1px solid var(--border);border-radius:2px;padding:7px 8px;background:rgba(255,255,255,.02)"><div style="font-size:9px;color:var(--ink-dim);font-family:'Cinzel',serif;letter-spacing:.08em">ROOMS</div><div style="font-size:12px;color:var(--ember)">${summary.roomsCleared}</div></div>
        <div style="border:1px solid var(--border);border-radius:2px;padding:7px 8px;background:rgba(255,255,255,.02)"><div style="font-size:9px;color:var(--ink-dim);font-family:'Cinzel',serif;letter-spacing:.08em">SOULS</div><div style="font-size:12px;color:#7aaa5a">${summary.soulsRecovered}</div></div>
        <div style="border:1px solid var(--border);border-radius:2px;padding:7px 8px;background:rgba(255,255,255,.02)"><div style="font-size:9px;color:var(--ink-dim);font-family:'Cinzel',serif;letter-spacing:.08em">GEAR</div><div style="font-size:12px;color:var(--gold)">${summary.gearNames.length}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px">
        <div style="border:1px solid var(--border);border-radius:2px;padding:7px 8px;background:rgba(255,255,255,.02)"><div style="font-size:9px;color:var(--ink-dim);font-family:'Cinzel',serif;letter-spacing:.08em">SURVIVORS</div><div style="font-size:12px;color:var(--gold)">${summary.survivors}</div></div>
        <div style="border:1px solid var(--border);border-radius:2px;padding:7px 8px;background:rgba(255,255,255,.02)"><div style="font-size:9px;color:var(--ink-dim);font-family:'Cinzel',serif;letter-spacing:.08em">LOSSES</div><div style="font-size:12px;color:#cc4444">${summary.deaths} dead / ${summary.injured} injured</div></div>
        <div style="border:1px solid var(--border);border-radius:2px;padding:7px 8px;background:rgba(255,255,255,.02)"><div style="font-size:9px;color:var(--ink-dim);font-family:'Cinzel',serif;letter-spacing:.08em">CORRUPTION</div><div style="font-size:12px;color:var(--corruption-bright)">${summary.corrupted}</div></div>
        <div style="border:1px solid var(--border);border-radius:2px;padding:7px 8px;background:rgba(255,255,255,.02)"><div style="font-size:9px;color:var(--ink-dim);font-family:'Cinzel',serif;letter-spacing:.08em">LEVELS</div><div style="font-size:12px;color:#5a8a4a">${summary.leveled}</div></div>
      </div>
      ${summary.routeHistory.length?`<div style="border-top:1px solid var(--border);padding-top:8px"><div style="font-family:'Cinzel',serif;font-size:9px;color:var(--ink-dim);letter-spacing:.1em;margin-bottom:4px">ROUTE</div><div style="display:flex;flex-wrap:wrap;gap:4px">${summary.routeHistory.slice(-10).map(step=>`<span class="synergy-tag">${step}</span>`).join('')}</div></div>`:''}
      ${soulStacks.length||gearStacks.length?`<div style="border-top:1px solid var(--border);padding-top:8px"><div style="font-family:'Cinzel',serif;font-size:9px;color:var(--ink-dim);letter-spacing:.1em;margin-bottom:4px">RECOVERED LOOT</div>${soulStacks.map(item=>`<div style="font-size:10px;color:#7aaa5a">• ${item.name} x${item.qty}</div>`).join('')}${gearStacks.map(item=>`<div style="font-size:10px;color:var(--gold)">• ${item.equipment?.name||item.name}</div>`).join('')}</div>`:''}
      ${summary.gearNames.length&&!gearStacks.length?`<div style="font-size:10px;color:var(--ink-dim);font-style:italic">Equipment has already been moved into storage.</div>`:''}
    </div>`;
  openModal('Expedition Complete',`${summary.destinationName} · ${summary.retreating?'Returned early':'Returned from the dark'}`,body,`<button class="btn btn-ghost" onclick="closeModal()">Close</button>`);
}

function recruitHero(name,cls,icon,cost){
  if(GS.souls<cost){showToast('Not enough Remnant Souls','critical');return;}
  GS.souls-=cost;
  const newHero={
    id:Date.now(),name,cls,icon,level:1,
    hp:50,maxHp:50,morale:60,cor:5,
    status:'ready',quirks:['Unknown'],qt:[''],equipment:{},
    flavor:'A new face at the Lantern. Their story is yet unwritten.'
  };
  GS.heroes.push(newHero);
  seedHeroRelationships(newHero, GS.heroes);
  saveGame();
  closeModal();
  showToast(`${name} has joined the Lantern`,'success');
  refreshAll();
}

function equipmentLabel(item){
  if(!item)return '<span style="color:var(--ink-dim);font-style:italic">Empty</span>';
  const color=RARITY_COLORS[item.rarity]||'var(--ink)';
  const upgrade=item.upgradeLevel?` +${item.upgradeLevel}`:'';
  return `<span title="${item.tradeoff}\n${item.flavor}" style="color:${color}">${item.icon} ${item.name}${upgrade}</span>`;
}

function equipmentStatsLine(item){
  if(!item)return '';
  return Object.entries(item.stats||{}).map(([k,v])=>`${v>0?'+':''}${v} ${k}`).join(' · ');
}

function settlementTier(){
  const total=GS.buildings.reduce((sum,b)=>sum+(b.level||0),0);
  return Math.max(1,Math.round(total/Math.max(1,GS.buildings.length)));
}

function formatEquipmentName(item){
  return `${item.name}${item.upgradeLevel?` +${item.upgradeLevel}`:''}`;
}

function equipmentUpgradeCost(item){
  const tier=settlementTier();
  const rarityMult={common:1,uncommon:1.15,rare:1.35,ancient:1.55,corrupted:1.75,legendary:2}[item.rarity]||1;
  const levelMult=1+(item.upgradeLevel||0)*0.55;
  const settlementDiscount=Math.max(0.5,1.2-tier*0.07);
  return Math.max(15,Math.round((35+(item.upgradeLevel||0)*18)*rarityMult*levelMult*settlementDiscount));
}

function upgradeDeltaForItem(item){
  const tier=settlementTier();
  const bonus=Math.max(1,Math.floor((tier-1)/3)+1);
  const stats=item.stats||{};
  const add=(key,amt)=>{stats[key]=(stats[key]||0)+amt;};

  if(item.kind==='weapon'){
    if((stats.damage||0)>0) add('damage',bonus);
    else if((stats.crit||0)>0) add('crit',bonus);
    else if((stats.speed||0)<0) add('speed',1);
    else add('damage',bonus);
    return;
  }

  if(item.kind==='armor'){
    if((stats.defense||0)>0) add('defense',bonus);
    else if((stats.hp||0)>0) add('hp',bonus*4);
    else if((stats.moraleResist||0)>0) add('moraleResist',bonus);
    else add('defense',bonus);
    return;
  }

  if((stats.torch||0)>0) add('torch',bonus);
  else if((stats.scouting||0)>0) add('scouting',bonus);
  else if((stats.corruptionResist||0)>0) add('corruptionResist',bonus);
  else if((stats.moraleResist||0)>0) add('moraleResist',bonus);
  else if((stats.crit||0)>0) add('crit',bonus);
  else if((stats.damage||0)>0) add('damage',bonus);
  else add('scouting',1);
}

function findEquipmentById(itemId){
  for(const hero of GS.heroes){
    for(const [slot,item] of Object.entries(hero.equipment||{})){
      if(item&&item.id===itemId)return {item,hero,slot};
    }
  }
  const item=(GS.inventory||[]).find((entry)=>entry.id===itemId);
  if(item)return {item};
  return null;
}

function upgradeEquipmentItem(itemId){
  const found=findEquipmentById(itemId);
  if(!found||!found.item){showToast('That gear cannot be found','critical');return false;}
  const item=found.item;
  const cost=equipmentUpgradeCost(item);
  if(!spendSouls(cost))return false;
  upgradeDeltaForItem(item);
  item.upgradeLevel=(item.upgradeLevel||0)+1;
  saveGame();
  refreshAll();
  showToast(`${formatEquipmentName(item)} improved`,'success');
  return true;
}

function showEquipmentUpgradeModal(itemId){
  const found=findEquipmentById(itemId);
  if(!found||!found.item){showToast('That gear cannot be found','critical');return;}
  const item=found.item;
  const cost=equipmentUpgradeCost(item);
  const tier=settlementTier();
  const source=found.hero?`${found.hero.name}${found.slot?` · ${String(found.slot).toUpperCase()}`:''}`:'Inventory';
  const stats=equipmentStatsLine(item)||'No altered stats yet.';
  const body=`
    <div style="display:flex;flex-direction:column;gap:8px">
      <div style="border:1px solid var(--border);border-radius:2px;padding:10px;background:rgba(255,255,255,.02)">
        <div style="font-family:'Cinzel',serif;font-size:12px;color:${RARITY_COLORS[item.rarity]||'var(--gold)'}">${item.icon} ${formatEquipmentName(item)}</div>
        <div style="font-size:10px;color:var(--ink-dim);font-style:italic;margin-top:2px">${item.rarity.toUpperCase()} · ${item.tradeoff}</div>
        <div style="font-size:9px;color:var(--ink-dim);margin-top:4px">Source: ${source}</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px">
        <div style="border:1px solid var(--border);border-radius:2px;padding:7px 8px;background:rgba(255,255,255,.02)"><div style="font-size:9px;color:var(--ink-dim);font-family:'Cinzel',serif;letter-spacing:.08em">SETTLEMENT TIER</div><div style="font-size:12px;color:var(--gold)">${tier}</div></div>
        <div style="border:1px solid var(--border);border-radius:2px;padding:7px 8px;background:rgba(255,255,255,.02)"><div style="font-size:9px;color:var(--ink-dim);font-family:'Cinzel',serif;letter-spacing:.08em">UPGRADE COST</div><div style="font-size:12px;color:#7aaa5a">${cost} souls</div></div>
      </div>
      <div style="border:1px solid var(--border);border-radius:2px;padding:8px;background:rgba(255,255,255,.02)">
        <div style="font-family:'Cinzel',serif;font-size:9px;color:var(--ink-dim);letter-spacing:.08em;margin-bottom:4px">STATS</div>
        <div style="font-size:10px;color:var(--ink)">${stats}</div>
      </div>
    </div>`;
  const actions=`
    <button class="btn btn-ghost" onclick="closeModal()">Close</button>
    <button class="btn btn-primary" onclick="upgradeEquipmentItem('${item.id}')">Upgrade (${cost} souls)</button>
    ${found.hero?`<button class="btn btn-ghost" onclick="showHeroModal(${found.hero.id})">Back</button>`:''}`;
  openModal('Equipment Workshop', 'Upgrade gear from the settlement forge', body, actions);
}

function showEquipmentWorkshop(){
  const all=[];
  GS.heroes.forEach((hero)=>{
    Object.entries(hero.equipment||{}).forEach(([slot,item])=>{
      if(item)all.push({item,source:`${hero.name} · ${slot.toUpperCase()}`});
    });
  });
  (GS.inventory||[]).forEach((item)=>all.push({item,source:'Inventory'}));
  const tier=settlementTier();
  const body=all.length?`<div style="display:flex;flex-direction:column;gap:6px">${all.map(({item,source})=>{
    const color=RARITY_COLORS[item.rarity]||'var(--ink)';
    return `<div onclick="showEquipmentUpgradeModal('${item.id}')" style="border:1px solid var(--border);border-radius:3px;padding:8px 10px;margin-bottom:0;cursor:pointer;background:rgba(255,255,255,.02)">
      <div style="display:flex;align-items:center;gap:8px">
        <div style="width:20px;text-align:center">${item.icon}</div>
        <div style="flex:1;min-width:0">
          <div style="font-family:'Cinzel',serif;font-size:11px;color:${color}">${formatEquipmentName(item)}</div>
          <div style="font-size:10px;color:var(--ink-dim);font-style:italic">${item.rarity.toUpperCase()} · ${source}</div>
        </div>
        <div style="font-size:10px;color:var(--gold)">${equipmentUpgradeCost(item)}s</div>
      </div>
      <div style="font-size:9px;color:var(--ink-dim);margin-top:2px">${equipmentStatsLine(item)}</div>
    </div>`;
  }).join('')}</div>`:`<div style="font-size:12px;color:var(--ink-dim);font-style:italic">No equipment to improve.</div>`;
  const actions=`<button class="btn btn-ghost" onclick="closeModal()">Close</button><span style="font-size:10px;color:var(--ink-dim);margin-left:auto;align-self:center">Settlement tier ${tier} reduces cost and improves gains.</span>`;
  openModal('Forge Workshop','Click any item to upgrade it',body,actions);
}

function showEquipModal(heroId,slot){
  const h=GS.heroes.find(x=>x.id===heroId);
  if(!h)return;
  const kind=slot==='weapon'?'weapon':slot==='armor'?'armor':'trinket';
  const items=(GS.inventory||[]).filter(item=>item.kind===kind);
  const rows=items.length?items.map(item=>{
    const color=RARITY_COLORS[item.rarity]||'var(--ink)';
    return `<div onclick="showEquipmentUpgradeModal('${item.id}')" style="border:1px solid var(--border);border-radius:3px;padding:8px 10px;margin-bottom:6px;cursor:pointer">
      <div style="font-family:'Cinzel',serif;font-size:11px;color:${color}">${item.icon} ${formatEquipmentName(item)}</div>
      <div style="font-size:10px;color:var(--ink-dim);font-style:italic">${item.rarity.toUpperCase()} - ${item.tradeoff}</div>
      <div style="font-size:9px;color:var(--ink-dim);margin-top:2px">${equipmentStatsLine(item)}</div>
      <div style="font-size:9px;color:var(--gold);margin-top:3px">Click to inspect and upgrade</div>
    </div>`;
  }).join(''):'<div style="font-size:12px;color:var(--ink-dim);font-style:italic">No compatible equipment in storage.</div>';
  openModal(`Equip ${h.name}`,`${slot.toUpperCase()} - ${kind}`,rows,`<button class="btn btn-ghost" onclick="showHeroModal(${heroId})">Back</button>`);
}

function equipItem(heroId,slot,itemId){
  const h=GS.heroes.find(x=>x.id===heroId);
  if(!h)return;
  GS.inventory=GS.inventory||[];
  const idx=GS.inventory.findIndex(item=>item.id===itemId);
  if(idx<0)return;
  h.equipment=h.equipment||{};
  const next=GS.inventory.splice(idx,1)[0];
  if(h.equipment[slot])GS.inventory.push(h.equipment[slot]);
  h.equipment[slot]=next;
  saveGame();
  showToast(`${h.name} equipped ${next.name}`,'success');
  showHeroModal(heroId);
  refreshAll();
}

function unequipItem(heroId,slot){
  const h=GS.heroes.find(x=>x.id===heroId);
  if(!h||!h.equipment||!h.equipment[slot])return;
  GS.inventory=GS.inventory||[];
  const item=h.equipment[slot];
  delete h.equipment[slot];
  GS.inventory.push(item);
  saveGame();
  showToast(`${item.name} returned to storage`,'');
  showHeroModal(heroId);
  refreshAll();
}

function showHeroModal(heroId){
  const h=GS.heroes.find(x=>x.id===heroId);
  if(!h)return;
  h.equipment=h.equipment||{};
  const hpPct=(h.hp/h.maxHp)*100;
  const expLog=GS.expeditions.filter(e=>e.heroIds&&e.heroIds.includes(h.id)&&e.log&&e.log.length);
  const recentLog=expLog.length?expLog[expLog.length-1].log.slice(-3):[]; 
  const hcd=CLASS_DATA[h.cls]||{};
  const relSummary=summarizeHeroRelationships(h,GS.heroes);
  const masteryPath=masteryLabel(h);
  const masteryBlurb=masterySummary(h);
  const resHtml=hcd.res?Object.entries(hcd.res).map(([t,v])=>`<span class="res-pip res-${v}" style="margin-right:3px">${DMG_TYPES[t].icon} ${DMG_TYPES[t].label} ${v==='strong'?'âœ¦':v==='weak'?'âœ•':'â—‹'}</span>`).join(''):'';
  const growthHtml=`
    <div style="background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:2px;padding:8px;margin-bottom:10px">
      <div style="font-family:'Cinzel',serif;font-size:9px;color:var(--ink-dim);letter-spacing:.1em;margin-bottom:4px">PROGRESSION</div>
      <div style="font-size:11px;color:var(--ink)">XP: ${h.xp||0}/${xpThreshold(h)} Â· Survived: ${h.expeditionsSurvived||0} Â· Death's Door: ${h.deathDoorSurvived||0}</div>
      <div style="font-size:10px;color:var(--ink-dim);margin-top:2px">Mastery: ${masteryPath} - ${masteryBlurb}${masteryAvailable(h)?` <button class="btn btn-ghost" style="font-size:9px;padding:2px 6px;margin-left:6px" onclick="showMasteryModal(${h.id})">Specialize</button>`:''}</div>
      ${(h.traits||[]).length?`<div style="margin-top:5px">${h.traits.map(t=>`<span class="quirk positive" title="${t.effect}">${t.label}</span>`).join('')}</div>`:''}
      ${(h.fears||[]).length?`<div style="margin-top:4px">${h.fears.map(f=>`<span class="quirk negative">${f}</span>`).join('')}</div>`:''}
    </div>`;
  const relationshipHtml=`
    <div style="background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:2px;padding:8px;margin-bottom:10px">
      <div style="font-family:'Cinzel',serif;font-size:9px;color:var(--ink-dim);letter-spacing:.1em;margin-bottom:4px">RELATIONSHIPS</div>
      <div style="font-size:11px;color:var(--ink);margin-bottom:4px">Crew temper: ${relSummary.average>=35?'steady':relSummary.average>=12?'close':relSummary.average<=-30?'fractured':relSummary.average<=-12?'strained':'uneven'}</div>
      ${relSummary.strongestBond?`<div style="font-size:10px;color:#5a8a4a">Bonded: ${relSummary.strongestBond.name} (${relSummary.strongestBond.label} ${relSummary.strongestBond.score})</div>`:''}
      ${relSummary.worstRival?`<div style="font-size:10px;color:#cc4444">Rival: ${relSummary.worstRival.name} (${relSummary.worstRival.label} ${relSummary.worstRival.score})</div>`:''}
      ${!relSummary.entries.length?`<div style="font-size:10px;color:var(--ink-dim);font-style:italic">This hero still lacks a meaningful bond.</div>`:''}
    </div>`;
  const recoveryHtml=(h.status==='injured'||h.status==='deathDoor'||h.hp<h.maxHp||h.cor>0||h.status==='corrupted')?`
    <div style="background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:2px;padding:8px;margin-bottom:10px">
      <div style="font-family:'Cinzel',serif;font-size:9px;color:var(--ink-dim);letter-spacing:.1em;margin-bottom:4px">RECOVERY</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${(h.status==='injured'||h.status==='deathDoor'||h.hp<h.maxHp)?`<button class="btn btn-primary" style="font-size:10px;padding:5px 9px" onclick="treatHero(${h.id})">Treat Wounds (35 souls)</button>`:''}
        ${(h.cor>0||h.status==='corrupted')?`<button class="btn btn-primary" style="font-size:10px;padding:5px 9px" onclick="cleanseHero(${h.id})">Cleanse Corruption (45 souls)</button>`:''}
      </div>
    </div>`:'';
  const equipSlots=[['weapon','Weapon'],['armor','Armor'],['trinket1','Trinket 1'],['trinket2','Trinket 2']];
  const equipmentHtml=equipSlots.map(([slot,label])=>{
    const item=h.equipment[slot];
    return `<div style="display:flex;align-items:center;gap:8px;border:1px solid var(--border);background:rgba(255,255,255,.02);border-radius:2px;padding:7px 8px;margin-bottom:5px;cursor:${item?'pointer':'default'}" ${item?`onclick="showEquipmentUpgradeModal('${item.id}')"`:''}>
      <div style="width:72px;font-family:'Cinzel',serif;font-size:9px;color:var(--ink-dim);letter-spacing:.08em">${label}</div>
      <div style="flex:1;font-size:11px">${equipmentLabel(item)}${item?`<div style="font-size:9px;color:var(--ink-dim);margin-top:1px">${equipmentStatsLine(item)}</div><div style="font-size:9px;color:var(--gold);margin-top:2px">Click to upgrade</div>`:''}</div>
      ${item?`<button class="btn btn-ghost" style="font-size:9px;padding:4px 7px" onclick="event.stopPropagation();unequipItem(${h.id},'${slot}')">Remove</button>`:`<button class="btn btn-ghost" style="font-size:9px;padding:4px 7px" onclick="showEquipModal(${h.id},'${slot}')">Equip</button>`}
    </div>`;
  }).join('');
  const body=`
    <div style="font-style:italic;color:var(--ember);margin-bottom:12px;font-size:13px;border-left:2px solid var(--ember-dim);padding-left:10px">"${h.flavor}"</div>
    ${growthHtml}
    ${relationshipHtml}
    ${recoveryHtml}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <div style="background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:2px;padding:8px">
        <div style="font-family:'Cinzel',serif;font-size:9px;color:var(--ink-dim);letter-spacing:.1em;margin-bottom:4px">VITALS</div>
        <div style="font-size:12px">HP: <span style="color:${hpPct>50?'#5a8a4a':'#cc4444'}">${h.hp}/${h.maxHp}</span></div>
        <div style="font-size:12px">Morale: <span style="color:var(--gold)">${h.morale}%</span></div>
        <div style="font-size:12px">Corruption: <span style="color:var(--corruption-bright)">${h.cor}%</span></div>
      </div>
      <div style="background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:2px;padding:8px">
        <div style="font-family:'Cinzel',serif;font-size:9px;color:var(--ink-dim);letter-spacing:.1em;margin-bottom:4px">TRAITS</div>
        ${h.quirks.map((q,i)=>`<div style="font-size:11px;color:${h.qt[i]==='positive'?'#5a8a4a':'#cc4444'};font-style:italic">${h.qt[i]==='positive'?'â†‘':'â†“'} ${q}</div>`).join('')}
      </div>
    </div>
    <div style="margin-bottom:10px">
      <div style="font-family:'Cinzel',serif;font-size:9px;color:var(--ink-dim);letter-spacing:.1em;margin-bottom:5px">EQUIPMENT</div>
      ${equipmentHtml}
    </div>
    ${hcd.res?`<div style="margin-bottom:8px"><div style="font-family:'Cinzel',serif;font-size:9px;color:var(--ink-dim);letter-spacing:.1em;margin-bottom:4px">RESISTANCES</div><div>${resHtml}</div></div>`:''}
    ${hcd.posBonus?`<div style="font-size:10px;color:#5a8a4a;font-style:italic;margin-bottom:3px">âœ¦ ${hcd.posBonus}</div>`:''}
    ${hcd.posPenalty?`<div style="font-size:10px;color:#cc6644;font-style:italic">âš  ${hcd.posPenalty}</div>`:''}
    </div>
    ${recentLog.length?`<div style="font-size:10px;color:var(--ink-dim);font-style:italic;border-top:1px solid var(--border);padding-top:8px">${recentLog.map(l=>`<div>${l}</div>`).join('')}</div>`:''}
  `;
  const canAdd=h.status==='ready'&&party.filter(Boolean).length<4&&!party.find(s=>s&&s.id===h.id);
  openModal(`${h.icon} ${h.name}`,`${h.cls}  Â·  Rank ${h.level}`,body,
    `<button class="btn btn-ghost" onclick="closeModal()">Close</button>
     ${canAdd?`<button class="btn btn-primary" onclick="addToParty(${h.id});closeModal()">Add to Party</button>`:''}`
  );
}

function chooseMasteryPath(heroId,pathId){
  const h=GS.heroes.find(x=>x.id===heroId);
  if(!h)return;
  const options=getMasteryOptions(h.cls);
  const path=options.find(x=>x.id===pathId);
  if(!path){showToast('That specialization is unavailable','critical');return;}
  if(h.masteryPath){showToast('This hero has already specialized','critical');return;}
  h.masteryPath=path.id;
  h.masteryChosenAt=Date.now();
  h.traits=h.traits||[];
  if(!h.traits.find(t=>t.id===`mastery_${path.id}`)) h.traits.push({id:`mastery_${path.id}`,label:path.label,effect:path.summary});
  saveGame();
  showToast(`${h.name} takes the ${path.label} path`,'success');
  closeModal();
  showHeroModal(heroId);
  refreshAll();
}

function showMasteryModal(heroId){
  const h=GS.heroes.find(x=>x.id===heroId);
  if(!h)return;
  const options=getMasteryOptions(h.cls);
  if(!options.length){showToast('This class has no specialization path yet','critical');return;}
  const body=`
    <div style="margin-bottom:8px;font-size:12px;color:var(--ink)">${h.name} can specialize now. Pick one path and the choice is permanent.</div>
    <div style="display:flex;flex-direction:column;gap:6px">${options.map((path)=>{
      return `<button class="btn btn-ghost" style="text-align:left;padding:8px 10px;display:block" onclick="chooseMasteryPath(${h.id},'${path.id}')">
        <div style="font-family:'Cinzel',serif;font-size:11px;color:var(--gold)">${path.icon} ${path.label}</div>
        <div style="font-size:10px;color:var(--ink-dim)">${path.summary}</div>
        <div style="font-size:9px;color:var(--ink-dim);font-style:italic">${path.details}</div>
      </button>`;
    }).join('')}</div>`;
  openModal(`${h.icon} ${h.name} - Specialization`, 'Choose a mastery path', body, `<button class="btn btn-ghost" onclick="closeModal()">Close</button>`);
}

function showBuildingModal(id){
  const b=GS.buildings.find(x=>x.id===id);
  if(!b)return;
  const DESCS={infirmary:'Upgrade to allow faster healing and better treatment for injured heroes.',tavern:'Improve to attract higher-quality recruits.',forge:'Enhance to craft legendary equipment.',archive:'Expand to unlock scouting maps and ancient lore.',shrine:'Strengthen to reduce corruption and cleanse afflicted heroes.',graveyard:'Deepen to commune with fallen heroes.',tower:'Build to preview expedition dangers.',vault:'Construct to safely store cursed relics.'};
  const cost=b.level*150;
  const canAfford=GS.souls>=cost;
  const buildingAction={
    infirmary:`<button class="btn btn-primary" onclick="showRecoveryModal('injured')">Treat Injured</button>`,
    tavern:`<button class="btn btn-primary" onclick="tavernRest()">Round of Ash Ale (30 souls)</button>`,
    shrine:`<button class="btn btn-primary" onclick="showRecoveryModal('corrupted')">Cleanse Corruption</button>`,
    forge:`<button class="btn btn-primary" onclick="showEquipmentWorkshop()">Open Forge Workshop</button>`,
  }[id]||'';
  openModal(`${b.icon} ${b.name}`,b.status==='locked'?'LOCKED - Requirements not met':`Level ${b.level} - ${b.status.charAt(0).toUpperCase()+b.status.slice(1)}`,
    `<p style="margin-bottom:12px">${b.desc}</p>${b.status!=='locked'?`<div style="background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:2px;padding:10px;font-size:12px;color:var(--ink-dim);font-style:italic">${DESCS[b.id]||''}</div>`:''}`,
    `<button class="btn btn-ghost" onclick="closeModal()">Close</button>
     ${b.status!=='locked'?buildingAction:''}
     ${b.status!=='locked'?`<button class="btn btn-primary" ${!canAfford?'disabled style="opacity:.4"':''} onclick="upgradeBuilding('${b.id}',${cost})">Upgrade (${cost} souls)</button>`:''}`
  );
}

function spendSouls(amount){
  if(GS.souls<amount){showToast('Not enough Remnant Souls','critical');return false;}
  GS.souls-=amount;
  return true;
}

function showRecoveryModal(mode){
  const isCorruption=mode==='corrupted';
  const title=isCorruption?'Cleansing Vigil':'Infirmary Care';
  const subtitle=isCorruption?'Choose a hero to purge corruption from.':'Choose an injured hero to treat.';
  const heroes=[...GS.heroes]
    .filter((hero)=>isCorruption ? hero.status!=='dead' && (hero.cor>0 || hero.status==='corrupted') : hero.status==='injured' || hero.status==='deathDoor' || hero.hp<hero.maxHp)
    .sort((a,b)=>isCorruption ? b.cor-a.cor : (a.hp/a.maxHp)-(b.hp/b.maxHp));

  const body=heroes.length
    ? `<div style="display:flex;flex-direction:column;gap:6px">${heroes.map((hero)=>{
        const progress=isCorruption ? `${hero.cor}% corruption` : `${hero.hp}/${hero.maxHp} HP`;
        const action=isCorruption ? `cleanseHero(${hero.id}, '${mode}')` : `treatHero(${hero.id}, '${mode}')`;
        const cost=isCorruption ? 45 : 35;
        return `<div style="display:flex;align-items:center;gap:8px;border:1px solid var(--border);background:rgba(255,255,255,.02);border-radius:2px;padding:8px 10px">
          <div style="width:26px;text-align:center;font-size:18px">${hero.icon}</div>
          <div style="flex:1;min-width:0">
            <div style="font-family:'Cinzel',serif;font-size:11px;color:var(--gold)">${hero.name}</div>
            <div style="font-size:10px;color:var(--ink-dim)">${hero.cls} Â· ${progress} Â· ${hero.status.toUpperCase()}</div>
          </div>
          <button class="btn btn-primary" onclick="${action}">${cost} souls</button>
        </div>`;
      }).join('')}</div>`
    : `<div style="font-size:12px;color:var(--ink-dim);font-style:italic">${isCorruption?'No corrupted heroes need cleansing.':'No injured heroes need treatment.'}</div>`;

  openModal(title,subtitle,body,`<button class="btn btn-ghost" onclick="closeModal()">Close</button>`);
}

function treatHero(heroId, reopenMode){
  if(!spendSouls(35))return;
  const h=GS.heroes.find(x=>x.id===heroId);
  if(!h){GS.souls+=35;showToast('That hero cannot be found','critical');return;}
  const restore=Math.max(18,Math.floor(h.maxHp*0.35));
  h.hp=Math.min(h.maxHp,h.hp+restore);
  h.status=h.hp>=h.maxHp*.7&&h.cor<80?'resting':'injured';
  if(h.status==='deathDoor')h.status='injured';
  saveGame();
  closeModal();
  refreshAll();
  showToast(`${h.name} receives treatment`,'success');
  if(reopenMode)showRecoveryModal(reopenMode);
}

function cleanseHero(heroId, reopenMode){
  if(!spendSouls(45))return;
  const h=GS.heroes.find(x=>x.id===heroId);
  if(!h){GS.souls+=45;showToast('That hero cannot be found','critical');return;}
  h.cor=Math.max(0,h.cor-24);
  if(h.cor<75&&h.status==='corrupted')h.status='resting';
  if(h.status==='deathDoor'&&h.cor<60)h.status='injured';
  saveGame();
  closeModal();
  refreshAll();
  showToast(`${h.name}'s corruption recedes`,'success');
  if(reopenMode)showRecoveryModal(reopenMode);
}

function treatWorstHero(){
  const h=[...GS.heroes].filter(x=>x.status==='injured'||x.status==='deathDoor'||x.hp<x.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
  if(!h){showToast('No wounded hero needs treatment','');return;}
  treatHero(h.id);
}

function tavernRest(){
  if(!spendSouls(30))return;
  GS.heroes.filter(h=>h.status!=='dead'&&h.status!=='expedition').forEach(h=>{h.morale=Math.min(100,h.morale+12);});
  if(Math.random()<0.18){const h=GS.heroes.find(x=>x.status!=='dead'&&x.status!=='expedition');if(h&&!h.quirks.includes('Gambler')){h.quirks.push('Gambler');h.qt.push('negative');}}
  saveGame();closeModal();refreshAll();showToast('The roster drinks away the worst of it','success');
}

function shrineCleanse(){
  const h=[...GS.heroes].filter(x=>x.status!=='dead').sort((a,b)=>b.cor-a.cor)[0];
  if(!h){showToast('No soul answers the vigil','');return;}
  GS.pressure=Math.max(0,GS.pressure-1);
  cleanseHero(h.id);
}

function forgeTemper(){
  showEquipmentWorkshop();
}

function upgradeBuilding(id,cost){
  if(GS.souls<cost){showToast('Not enough Remnant Souls','critical');return;}
  const b=GS.buildings.find(x=>x.id===id);
  if(!b)return;
  GS.souls-=cost;
  b.level++;
  b.status='active';
  saveGame();
  closeModal();
  showToast(`${b.name} upgraded to Level ${b.level}`,'success');
  refreshAll();
}

function closeModal(e){
  if(e&&e.target!==document.getElementById('modal-overlay'))return;
  document.getElementById('modal-overlay').classList.remove('active');
}

// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
// TOAST
// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
let toastTimer;
function showToast(msg,type=''){
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.className=`toast visible ${type}`;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('visible'),3400);
}

// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
// EMBER PARTICLE SYSTEM
// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
const ec=document.getElementById('ember-canvas');
const ectx=ec.getContext('2d');
let embers=[];
function resizeEc(){ec.width=window.innerWidth;ec.height=window.innerHeight;}
function spawnEmber(){embers.push({x:Math.random()*window.innerWidth,y:window.innerHeight+10,vx:(Math.random()-.5)*.8,vy:-(0.3+Math.random()*.8),size:1+Math.random()*2,life:1,decay:.003+Math.random()*.006,col:Math.random()>.5?'#c86030':'#e8a040'});}
function drawEmbers(){
  ectx.clearRect(0,0,ec.width,ec.height);
  embers=embers.filter(e=>e.life>0);
  embers.forEach(e=>{
    e.x+=e.vx+Math.sin(Date.now()*.001+e.y)*.3;e.y+=e.vy;e.life-=e.decay;
    ectx.save();ectx.globalAlpha=e.life*.7;ectx.fillStyle=e.col;ectx.shadowBlur=4;ectx.shadowColor=e.col;
    ectx.beginPath();ectx.arc(e.x,e.y,e.size,0,Math.PI*2);ectx.fill();ectx.restore();
  });
  if(Math.random()<.08)spawnEmber();
  requestAnimationFrame(drawEmbers);
}
resizeEc();window.addEventListener('resize',resizeEc);drawEmbers();

// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
// DUNGEON CANVAS
// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
const dc=document.getElementById('dungeon-canvas');
const dctx=dc.getContext('2d');
let DS={heroX:0,heroY:0,flicker:0,particles:[],lanternPulse:0,combatFlash:0,scrollX:0,lastPulseAt:0,heroZones:[]};

function resizeDungeon(){
  const v=document.getElementById('expedition-view');
  const r=v.getBoundingClientRect();
  dc.width=r.width;dc.height=r.height;
  DS.heroX=r.width*.42;DS.heroY=r.height*.55;
}

// Click hero silhouettes to open their modal
dc.addEventListener('click',e=>{
  const rect=dc.getBoundingClientRect();
  const mx=e.clientX-rect.left,my=e.clientY-rect.top;
  for(const z of DS.heroZones){if(mx>=z.x&&mx<=z.x+z.w&&my>=z.y&&my<=z.y+z.h){showHeroModal(z.heroId);return;}}
});
dc.addEventListener('mousemove',e=>{
  const rect=dc.getBoundingClientRect();
  const mx=e.clientX-rect.left,my=e.clientY-rect.top;
  dc.style.cursor=DS.heroZones.some(z=>mx>=z.x&&mx<=z.x+z.w&&my>=z.y&&my<=z.y+z.h)?'pointer':'default';
});

function drawDungeon(){
  const W=dc.width,H=dc.height;
  if(!W||!H){requestAnimationFrame(drawDungeon);return;}
  dctx.clearRect(0,0,W,H);
  const now=Date.now();

  // ── Expedition state ──
  const exp=getWatchedExp();
  const activeHeroes=exp
    ?exp.heroIds.map(id=>GS.heroes.find(h=>h.id===id)).filter(Boolean).filter(h=>h.status!=='dead')
    :[];
  const currentRoom=exp?.roomPath?.[exp.currentRoomIndex||0];
  const roomKind=currentRoom?.kind||'hallway';
  const inCombat=roomKind==='battle'||roomKind==='elite';
  const atCamp=roomKind==='camp';
  const atTreasure=roomKind==='treasure';
  const isEvent=roomKind==='event';
  const isMoving=!!exp&&(roomKind==='hallway'||roomKind==='entrance'||roomKind==='exit');

  // ── Atmosphere driven by party state ──
  const avgMorale=activeHeroes.length?activeHeroes.reduce((s,h)=>s+(h.morale||50),0)/activeHeroes.length:70;
  const avgCor=activeHeroes.length?activeHeroes.reduce((s,h)=>s+(h.cor||0),0)/activeHeroes.length:10;

  // ── Combat flash on new pulse ──
  const pulsedAt=currentRoom?.lastPulseAt||0;
  if(inCombat&&pulsedAt>DS.lastPulseAt){DS.combatFlash=1;DS.lastPulseAt=pulsedAt;}
  DS.combatFlash*=0.82;

  // ── Parallax scroll when walking ──
  if(isMoving)DS.scrollX=(DS.scrollX+0.5)%64;

  // ── Background tint by room type ──
  let bgTop='#050302',bgBot='#0a0704',wallCol='rgba(40,30,20,.3)';
  if(inCombat){bgTop='#0b0203';bgBot='#0e0304';wallCol='rgba(70,20,20,.35)';}
  else if(atCamp){bgTop='#080504';bgBot='#100a05';}
  else if(isEvent){bgTop='#040508';bgBot='#07080f';wallCol='rgba(30,35,55,.4)';}
  else if(atTreasure){bgTop='#060500';bgBot='#0c0900';wallCol='rgba(50,40,10,.3)';}

  const bg=dctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,bgTop);bg.addColorStop(1,bgBot);
  dctx.fillStyle=bg;dctx.fillRect(0,0,W,H);

  const floor=H*.65;

  // ── Stone walls (scroll when moving through hallways) ──
  const wallOffset=isMoving?DS.scrollX:0;
  dctx.strokeStyle=wallCol;dctx.lineWidth=1;
  for(let x=-64+(wallOffset%64);x<W+64;x+=64){
    dctx.beginPath();dctx.moveTo(x,H*.12);dctx.lineTo(x,floor);dctx.stroke();
  }
  dctx.strokeStyle='rgba(28,20,12,.2)';dctx.lineWidth=1;
  for(let y=H*.18;y<floor;y+=28){
    dctx.beginPath();dctx.moveTo(0,y);dctx.lineTo(W,y);dctx.stroke();
  }

  // ceiling
  dctx.fillStyle=bgTop;dctx.fillRect(0,0,W,H*.12);
  // floor
  const fg=dctx.createLinearGradient(0,floor,0,H);
  fg.addColorStop(0,'#12100c');fg.addColorStop(1,'#080605');
  dctx.fillStyle=fg;dctx.fillRect(0,floor,W,H-floor);
  dctx.strokeStyle='rgba(60,45,25,.4)';dctx.lineWidth=1;
  dctx.beginPath();dctx.moveTo(0,floor);dctx.lineTo(W,floor);dctx.stroke();

  // ── Arches (right arch opens wider at exit) ──
  const rightArch=roomKind==='exit'?[W*.85,floor,68,108]:[W*.82,floor,50,80];
  [[W*.15,floor,36,60],rightArch].forEach(([x,y,w,h])=>{
    dctx.fillStyle='#030202';dctx.fillRect(x-w/2,y-h,w,h);
    dctx.strokeStyle='rgba(50,38,22,.5)';dctx.lineWidth=2;
    dctx.beginPath();dctx.arc(x,y-h,w/2,Math.PI,0);dctx.stroke();
    dctx.beginPath();dctx.moveTo(x-w/2,y-h);dctx.lineTo(x-w/2,y);dctx.moveTo(x+w/2,y-h);dctx.lineTo(x+w/2,y);dctx.stroke();
  });

  // ── Treasure glints ──
  if(atTreasure){
    for(let i=0;i<3;i++){
      const gx=W*(.32+i*.14),gy=floor+5;
      const pulse=.5+Math.sin(now*.002+i*2.1)*.5;
      dctx.fillStyle=`rgba(220,170,40,${pulse*.6})`;
      dctx.shadowBlur=8;dctx.shadowColor='#d4a030';
      dctx.beginPath();dctx.arc(gx,gy,3+pulse*2,0,Math.PI*2);dctx.fill();
      dctx.shadowBlur=0;
    }
  }

  // ── Flicker + morale-driven light radius ──
  DS.flicker+=.02;
  const flk=1+Math.sin(DS.flicker*1.7)*.04+Math.sin(DS.flicker*3.1)*.02;
  const moraleScale=Math.max(0.52,Math.min(1.25,avgMorale/72));
  const corScale=Math.max(0.6,1-(avgCor/200));
  const baseLr=atCamp?190:140;
  const lr=(baseLr+DS.lanternPulse*60)*flk*moraleScale*corScale;
  DS.lanternPulse*=.95;
  const hx=DS.heroX,hy=DS.heroY;

  // ── Camp fire ──
  if(atCamp){
    const fx=W*.5,fy=floor;
    const fireGlow=dctx.createRadialGradient(fx,fy-4,0,fx,fy-4,65);
    fireGlow.addColorStop(0,`rgba(255,130,30,${.18*flk})`);fireGlow.addColorStop(1,'rgba(0,0,0,0)');
    dctx.fillStyle=fireGlow;dctx.beginPath();dctx.arc(fx,fy-4,65,0,Math.PI*2);dctx.fill();
    dctx.strokeStyle='#3a2510';dctx.lineWidth=5;
    dctx.beginPath();dctx.moveTo(fx-14,fy);dctx.lineTo(fx+14,fy);dctx.stroke();
    if(Math.random()<.15){
      [[fx-3,fy-10,'#ff9030'],[fx+2,fy-16,'#ffcc50'],[fx+7,fy-9,'#ff7020']].forEach(([px,py,col])=>{
        if(Math.random()<.4)DS.particles.push({x:px,y:py,vx:(Math.random()-.5)*.6,vy:-.7-Math.random(),life:1,size:2+Math.random(),col});
      });
    }
  }

  // ── Light pool ──
  const lightA=atCamp?.09:.06;
  const lp=dctx.createRadialGradient(hx,hy-10,0,hx,hy-10,lr);
  lp.addColorStop(0,`rgba(220,140,60,${lightA*flk})`);
  lp.addColorStop(.4,`rgba(180,90,30,${lightA*.66*flk})`);
  lp.addColorStop(1,'rgba(0,0,0,0)');
  dctx.fillStyle=lp;dctx.fillRect(0,0,W,H);

  // ── Hero silhouettes (from actual expedition party) ──
  DS.heroZones=[];
  const ROLE_COLS={tank:'#7a9ab8',melee:'#c89050',ranged:'#6a9860',support:'#9a7aaa'};
  // Fall back to generic placeholder when no expedition is active
  const heroList=activeHeroes.length?activeHeroes:[{cls:'',status:'ready',hp:1,maxHp:1,morale:70,cor:0,id:-1}];
  const hCount=heroList.length;
  const spread=Math.min(30,Math.max(18,60/hCount));
  const hStartX=hx-(hCount-1)*spread*.5;

  heroList.forEach((hero,hi)=>{
    const cd=CLASS_DATA[hero.cls];
    const role=cd?.role||'melee';
    const col=ROLE_COLS[role]||'#c8a060';
    const x=hStartX+hi*spread;
    const injured=hero.status==='injured'||hero.hp<hero.maxHp*.3;
    const corrupted=hero.status==='corrupted'||hero.cor>60;
    const bobRate=injured?.0038:.002;
    const bobAmt=injured?2.8:1.5;
    const jitter=injured?(Math.random()-.5)*.5:0;
    const bob=Math.sin(now*bobRate+hi*.9)*bobAmt+jitter+(injured?Math.sin(now*.007+hi)*.7:0);

    // ground shadow
    dctx.fillStyle='rgba(0,0,0,.4)';dctx.beginPath();dctx.ellipse(x,hy+2,8,3,0,0,Math.PI*2);dctx.fill();

    // corruption aura
    if(corrupted){
      const ca=dctx.createRadialGradient(x,hy-20+bob,0,x,hy-20+bob,22);
      ca.addColorStop(0,`rgba(120,50,180,${.15+Math.sin(now*.003+hi)*.05})`);ca.addColorStop(1,'rgba(0,0,0,0)');
      dctx.fillStyle=ca;dctx.beginPath();dctx.arc(x,hy-20+bob,22,0,Math.PI*2);dctx.fill();
    }
    // injury aura
    if(injured&&!corrupted){
      const ia=dctx.createRadialGradient(x,hy-18+bob,0,x,hy-18+bob,18);
      ia.addColorStop(0,`rgba(180,30,30,${.12+Math.sin(now*.005+hi)*.04})`);ia.addColorStop(1,'rgba(0,0,0,0)');
      dctx.fillStyle=ia;dctx.beginPath();dctx.arc(x,hy-18+bob,18,0,Math.PI*2);dctx.fill();
    }

    // body proportions differ by role
    const bW=role==='tank'?13:role==='support'?8:10;
    const bH=role==='tank'?17:role==='support'?13:15;
    const hSz=role==='tank'?10:8;
    const tiltX=injured?Math.sin(now*.004+hi)*2.5:0;

    dctx.save();dctx.translate(x+tiltX,hy-4+bob);
    // torso
    dctx.fillStyle=col;dctx.fillRect(-bW/2,-bH,bW,bH);
    // head
    dctx.fillStyle='#d4a870';dctx.fillRect(-hSz/2,-bH-hSz,hSz,hSz);
    // weapon / equipment by role
    if(role==='ranged'){
      dctx.fillStyle='#7a6040';dctx.fillRect(bW/2+1,-bH-6,2,bH+8);
    } else if(role==='tank'){
      dctx.fillStyle='#6a7080';dctx.fillRect(-bW/2-5,-bH+2,4,bH-2); // shield
      dctx.fillStyle='#8a8898';dctx.fillRect(-bW/2-6,-bH+2,1,bH-2); // shield edge
    } else if(role==='support'){
      // lantern glow from the support hero
      const sg=dctx.createRadialGradient(bW/2+6,-bH,0,bW/2+6,-bH,18);
      sg.addColorStop(0,`rgba(255,180,60,${.24*flk})`);sg.addColorStop(1,'rgba(0,0,0,0)');
      dctx.fillStyle=sg;dctx.beginPath();dctx.arc(bW/2+6,-bH,18,0,Math.PI*2);dctx.fill();
      dctx.fillStyle='#a08060';dctx.fillRect(bW/2+1,-bH-4,2,10);
      if(Math.random()<.08)DS.particles.push({x:x+bW/2+6,y:hy-4+bob-bH,vx:(Math.random()-.5)*.5,vy:-.5-Math.random()*.8,life:1,size:1.5+Math.random(),col:Math.random()>.6?'#ff9030':'#ffcc50'});
    } else {
      dctx.fillStyle='#a08060';dctx.fillRect(bW/2+1,-bH+2,2,12);
    }
    dctx.restore();

    // store click zone
    DS.heroZones.push({x:x+tiltX-14,y:hy-4+bob-bH-hSz-2,w:28,h:bH+hSz+8,heroId:hero.id});
  });

  // ── Enemy silhouettes in combat/elite rooms ──
  if(inCombat){
    const isElite=roomKind==='elite';
    const eCount=isElite?2:3;
    const exBase=W*.72;
    for(let ei=0;ei<eCount;ei++){
      const ex=exBase+(ei===0?0:ei===1?22:-12);
      const ey=hy+(ei===1?-8:ei===2?4:0);
      const ebob=Math.sin(now*.0018+ei*1.4)*2.5;
      const ew=isElite&&ei===0?22:11+ei*3;
      const eh=isElite&&ei===0?28:15+ei*3;
      const eHead=ew*.85;
      // shadow
      dctx.fillStyle='rgba(0,0,0,.5)';dctx.beginPath();dctx.ellipse(ex,ey+2,ew/2,3,0,0,Math.PI*2);dctx.fill();
      // body - dark, angular
      dctx.fillStyle=isElite&&ei===0?'#5a1828':'#3a1818';
      dctx.fillRect(ex-ew/2,ey-eh+ebob,ew,eh);
      // head - blockier than heroes
      dctx.fillStyle=isElite&&ei===0?'#461220':'#2a1414';
      dctx.fillRect(ex-eHead/2,ey-eh-eHead+ebob,eHead,eHead);
      // glowing red eyes
      const eyeA=.6+Math.sin(now*.004+ei)*.3;
      dctx.fillStyle=isElite&&ei===0?`rgba(220,40,40,${eyeA})`:`rgba(180,60,20,${eyeA*.8})`;
      [-3,3].forEach(dx=>{dctx.beginPath();dctx.arc(ex+dx,ey-eh-eHead*.4+ebob,1.5,0,Math.PI*2);dctx.fill();});
    }
    // red flash overlay when a new combat round fires
    if(DS.combatFlash>.02){
      dctx.fillStyle=`rgba(180,30,20,${DS.combatFlash*.2})`;
      dctx.fillRect(0,0,W,H);
    }
  }

  // ── Darkness mask (shrinks with morale, closes in at high corruption) ──
  const dm=dctx.createRadialGradient(hx,hy-20,lr*.1,hx,hy-20,lr);
  dm.addColorStop(0,'rgba(0,0,0,0)');dm.addColorStop(.7,'rgba(0,0,0,0)');dm.addColorStop(1,'rgba(0,0,0,.92)');
  dctx.fillStyle=dm;dctx.fillRect(0,0,W,H);
  [[0,lr*.5],[W,W-lr*.5]].forEach(([sx,ex2])=>{
    const eg=dctx.createLinearGradient(sx,0,ex2,0);
    eg.addColorStop(0,'rgba(0,0,0,.85)');eg.addColorStop(1,'rgba(0,0,0,0)');
    dctx.fillStyle=eg;dctx.fillRect(0,0,W,H);
  });

  // ── Particles ──
  DS.particles=DS.particles.filter(p=>p.life>0);
  DS.particles.forEach(p=>{
    p.x+=p.vx;p.y+=p.vy;p.life-=.04;p.vx+=(Math.random()-.5)*.1;
    const life=Math.max(0,p.life);const radius=Math.max(0.01,p.size*life);
    dctx.globalAlpha=life;dctx.fillStyle=p.col;dctx.shadowBlur=4;dctx.shadowColor=p.col;
    dctx.beginPath();dctx.arc(p.x,p.y,radius,0,Math.PI*2);dctx.fill();
    dctx.globalAlpha=1;dctx.shadowBlur=0;
  });

  // ── Gentle hero drift (stays left of center to leave room for enemies) ──
  if(Math.random()<.008){DS.heroX+=((Math.random()-.4)*2);DS.heroX=Math.max(80,Math.min(W*.5,DS.heroX));}

  requestAnimationFrame(drawDungeon);
}

// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
// MASTER TICK
// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
setInterval(()=>{
  checkExpeditions();
  const settlementEvents=processSettlementTime(GS);
  if(settlementEvents.length){
    settlementEvents.slice(-2).forEach(msg=>showToast(msg,''));
    saveGame();
    refreshAll();
  }
  updateExpDisplay();
  maybeAddEvent();
  updateHeaderStats();
},1000);

// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
// INIT
// Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢Ã¢â€¢
function init(){
  refreshAll();
  setTimeout(()=>{resizeDungeon();drawDungeon();},80);
  window.addEventListener('resize',resizeDungeon);

  // Check for expeditions that completed while away
  checkExpeditions();

  // Return message
  const lastSaved=GS.expeditions.filter(e=>e.status==='complete').length;
  const active=GS.expeditions.filter(e=>e.status==='active').length;
  if(active>0){
    const offlineHours=offlineElapsedMs>60000?` ${Math.floor(offlineElapsedMs/60000)} minutes passed while away.`:'';
    setTimeout(()=>showToast(`${active} expedition${active>1?'s':''} still abroad.${offlineHours}`,'warn'),1000);
  } else if(lastSaved>0){
    setTimeout(()=>showToast('The Last Lantern burns. Your state has been restored.',''),1000);
  } else if(offlineElapsedMs>60000){
    setTimeout(()=>showToast('The world moved while you were away. The log remembers.','warn'),1000);
  } else {
    setTimeout(()=>showToast('The Last Lantern burns. Two parties are abroad.',''),1000);
  }

  if(offlineReport && offlineReport.elapsedMs>1000){
    setTimeout(()=>showReturnSummary(offlineReport),1200);
  }

  // Reset button (dev convenience)
  document.addEventListener('keydown',e=>{if(e.key==='R'&&e.shiftKey&&e.ctrlKey){if(confirm('Reset all save data?'))resetGame();}});
}

Object.assign(window,{
  GS,
  addToParty,
  autoFillParty,
  abandonExpedition,
  assignToSlot,
  closeModal,
  doAbandon,
  doLanternPulse,
  doRetreat,
  launchExpedition,
  chooseExpeditionDecision,
  changeExpeditionFocus,
  recruitHero,
  retreatExpedition,
  saveGame,
  selectBehavior,
  selectDest,
  showRecoveryModal,
  showEquipmentWorkshop,
  showEquipmentUpgradeModal,
  upgradeEquipmentItem,
  equipItem,
  showEquipModal,
  treatHero,
  cleanseHero,
  unequipItem,
  showBuildingModal,
  showHeroModal,
  showMasteryModal,
  showModal,
  showToast,
  forgeTemper,
  shrineCleanse,
  tavernRest,
  treatWorstHero,
  updateHeaderStats,
  upgradeBuilding,
  chooseMasteryPath,
});

window.addEventListener('load',init);
