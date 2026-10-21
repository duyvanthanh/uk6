import { escapeHtml } from '../../raw-dashboard/utils/html.js';

import type { VuPlan } from '../plan/types.js';



export function renderInspectHtml(plan: VuPlan): string {

    const payload = JSON.stringify(plan).replace(/</g, '\\u003c').replace(/<\/script>/gi, '<\\/script>');



    const notesHtml = (plan.notes || []).length

        ? `<ul class="notes">${plan.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}</ul>`

        : `<div class="muted">No notes.</div>`;



    const apiNotesHtml =

        plan.apiPlan && Array.isArray(plan.apiPlan.notes) && plan.apiPlan.notes.length

            ? `<ul class="notes">${plan.apiPlan.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}</ul>`

            : `<div class="muted">No notes.</div>`;



    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>k6 Inspect - VU Plan</title><style>

@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;700&display=swap');

*{box-sizing:border-box}body{margin:0;font-family:"Fira Code",Consolas,monospace;background:#fff;color:#111827}

.wrap{max-width:1520px;margin:0 auto;padding:20px}

.topbar{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}

.title{margin:0 0 4px;font-size:30px}

.sub{color:#6b7280;margin-bottom:12px}

.credit{font-size:12px;color:#374151;padding:6px 10px;border:1px solid #d1d5db;border-radius:8px;background:#f9fafb;white-space:nowrap}

.tabs{display:flex;gap:8px;margin-bottom:12px}

.tab{padding:8px 12px;border:1px solid #111827;background:#111827;color:#fff;border-radius:8px;cursor:pointer;font-family:inherit}

.tab:not(.active){opacity:.72}

.tab.active{opacity:1;box-shadow:0 0 0 2px #11182722 inset}

.panel-tab{display:none}

.panel-tab.active{display:block}

.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin:12px 0}

.card{border:1px solid #e5e7eb;border-radius:12px;padding:12px;background:#fff;box-shadow:0 1px 0 #1118270f}

.k{color:#6b7280;font-size:12px;margin-bottom:6px}

.v{font-size:22px;font-weight:700}

.panel{border:1px solid #e5e7eb;border-radius:12px;padding:12px;background:#fff;box-shadow:0 1px 0 #1118270f}

.row{display:flex;gap:12px;flex-wrap:wrap;align-items:center;justify-content:space-between}

.muted{color:#6b7280}

.legend{display:flex;gap:10px;flex-wrap:wrap;align-items:center}

.pill{display:inline-flex;gap:8px;align-items:center;border:1px solid #d1d5db;background:#f9fafb;border-radius:999px;padding:4px 10px;font-size:12px}

.dot{width:10px;height:10px;border-radius:999px;display:inline-block}

.canvas-wrap{width:100%;overflow:auto}

canvas{width:100%;min-width:920px;height:360px;border:1px solid #11182722;border-radius:12px;background:#ffffff}

.notes{margin:8px 0 0 18px;color:#374151}

.btn{padding:8px 12px;border:1px solid #111827;background:#111827;color:#fff;border-radius:8px;cursor:pointer;font-family:inherit}

table{width:100%;border-collapse:collapse}

th,td{border-bottom:1px solid #e5e7eb;padding:8px 10px;text-align:left;vertical-align:top}

th{color:#374151;font-size:12px;background:#f9fafb}

.mono{font-family:"Fira Code",Consolas,monospace}

</style></head><body><div class="wrap">

<div class="topbar">

  <div>

    <h1 class="title">k6 Inspect - VU Plan</h1>

    <div class="sub">Pre-run visualization based on <code>k6 inspect --execution-requirements</code>.</div>

  </div>

  <div class="credit">Made by duyvt2 | Team APP</div>

</div>



<div class="tabs" role="tablist">

  <button class="tab active" id="tab-vu" type="button">VU Plan</button>

  <button class="tab" id="tab-api" type="button">API Plan</button>

</div>



<div class="panel-tab active" id="panel-vu">

<div class="cards">

  <div class="card"><div class="k">Total Duration (upper bound)</div><div class="v" id="totalDuration">-</div></div>

  <div class="card"><div class="k">Max VUs (k6 computed)</div><div class="v" id="maxVUs">-</div></div>

  <div class="card"><div class="k">Scenarios</div><div class="v" id="scenarioCount">-</div></div>

</div>



<div class="panel">

  <div class="row" style="margin-bottom:10px">

    <div class="legend" id="legend"></div>

    <div style="display:flex;gap:8px;align-items:center">

      <div class="muted" id="rangeText">-</div>

      <button class="btn" id="resetBtn" type="button">Reset Zoom</button>

    </div>

  </div>

  <div class="canvas-wrap"><canvas id="vuCanvas" width="1200" height="360"></canvas></div>

</div>



<div class="panel" style="margin-top:12px">

  <div class="k">Notes</div>

  ${notesHtml}

</div>

</div>



<div class="panel-tab" id="panel-api">

  <div class="panel">

    <div class="row" style="margin-bottom:10px">

      <div class="legend" id="apiLegend"></div>

      <div style="display:flex;gap:8px;align-items:center">

        <div class="muted" id="apiRangeText">-</div>

        <button class="btn" id="apiResetBtn" type="button">Reset Zoom</button>

      </div>

    </div>

    <div class="canvas-wrap"><canvas id="apiCanvas" width="1200" height="360"></canvas></div>

  </div>



  <div class="panel" style="margin-top:12px">

    <div class="k">Steps</div>

    <div class="muted" style="margin-bottom:8px">Best-effort extraction from <code>createStep()</code> definitions. Values are expected VUs hitting the step (derived from scenario VU curve × step load gating).</div>

    <div class="canvas-wrap">

      <table>

        <thead><tr><th>Phase</th><th>Scenario(s)</th><th>Step</th><th>Endpoint</th><th>Load</th><th>Load Mode</th><th>Import From</th></tr></thead>

        <tbody id="apiTableBody"></tbody>

      </table>

    </div>

  </div>



  <div class="panel" style="margin-top:12px">

    <div class="k">Notes</div>

    ${apiNotesHtml}

  </div>

</div>



<script>window.__UK6_PLAN__=${payload};</script>

<script>

const plan=window.__UK6_PLAN__||{};

const totalDurationEl=document.getElementById('totalDuration');

const maxVUsEl=document.getElementById('maxVUs');

const scenarioCountEl=document.getElementById('scenarioCount');

const legendEl=document.getElementById('legend');

const rangeText=document.getElementById('rangeText');

const resetBtn=document.getElementById('resetBtn');

const canvas=document.getElementById('vuCanvas');

const ctx=canvas.getContext('2d');

const tabVu=document.getElementById('tab-vu');

const tabApi=document.getElementById('tab-api');

const panelVu=document.getElementById('panel-vu');

const panelApi=document.getElementById('panel-api');



function setActiveTab(which){

  const isVu=which==='vu';

  tabVu.classList.toggle('active',isVu);

  tabApi.classList.toggle('active',!isVu);

  panelVu.classList.toggle('active',isVu);

  panelApi.classList.toggle('active',!isVu);

  if(!isVu){ drawApi(); }

}

tabVu.onclick=()=>setActiveTab('vu');

tabApi.onclick=()=>setActiveTab('api');



function fmtMs(ms){

  ms=Math.max(0,Math.floor(ms||0));

  const s=Math.floor(ms/1000);

  const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), ss=s%60;

  let out='';

  if(h) out+=h+'h';

  if(m) out+=m+'m';

  out+=ss+'s';

  return out;

}

totalDurationEl.textContent=fmtMs(plan.totalDurationMs);

maxVUsEl.textContent=(plan.maxVUs==null?'-':String(plan.maxVUs));

scenarioCountEl.textContent=String((plan.scenarios||[]).length);



const palette=['#7c3aed','#0369a1','#16a34a','#dc2626','#f59e0b','#0f766e','#9333ea','#334155'];

function colorFor(i){return palette[i%palette.length];}



const series=[{name:'total', points:(plan.total&&plan.total.points)||[], color:'#111827', width:2.5}]

  .concat((plan.scenarios||[]).map((s,i)=>({name:s.name, points:s.points||[], color:colorFor(i), width:1.6})));



const state={

  fullStart:0, fullEnd:0, viewStart:0, viewEnd:0,

  dragging:false, dragStartX:0, dragEndX:0,

  enabled:new Set(series.map(s=>s.name)),

};



function buildLegend(){

  legendEl.innerHTML='';

  series.forEach((s)=>{

    const pill=document.createElement('label'); pill.className='pill';

    const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=state.enabled.has(s.name);

    cb.onchange=()=>{ if(cb.checked) state.enabled.add(s.name); else state.enabled.delete(s.name); draw(); };

    const dot=document.createElement('span'); dot.className='dot'; dot.style.background=s.color;

    const txt=document.createElement('span'); txt.textContent=s.name;

    pill.appendChild(cb); pill.appendChild(dot); pill.appendChild(txt);

    legendEl.appendChild(pill);

  });

}

buildLegend();



function flattenPoints(){

  let min=Infinity,max=-Infinity;

  series.forEach((s)=>{

    (s.points||[]).forEach(p=>{

      const t=Number(p.tMs);

      if(Number.isFinite(t)){min=Math.min(min,t);max=Math.max(max,t);}

    });

  });

  if(!Number.isFinite(min)||!Number.isFinite(max)){min=0;max=0;}

  state.fullStart=min; state.fullEnd=max; state.viewStart=min; state.viewEnd=max;

}

flattenPoints();



function clamp(x,a,b){return Math.max(a,Math.min(b,x));}

function tsToX(t,m){const r=(t-state.viewStart)/Math.max(1,(state.viewEnd-state.viewStart));return m.left+r*(m.right-m.left);}

function xToTs(x,m){const r=(x-m.left)/Math.max(1,(m.right-m.left));return state.viewStart+r*(state.viewEnd-state.viewStart);}



function getBounds(){

  let maxY=0;

  series.forEach(s=>{

    if(!state.enabled.has(s.name)) return;

    (s.points||[]).forEach(p=>{maxY=Math.max(maxY,Number(p.vus)||0);});

  });

  return {minY:0,maxY:Math.max(1,Math.ceil(maxY))};

}



function draw(){

  const w=canvas.width,h=canvas.height;

  ctx.clearRect(0,0,w,h);

  const m={left:50,right:w-20,top:18,bottom:h-34};

  const b=getBounds();

  rangeText.textContent=fmtMs(state.viewStart)+' -> '+fmtMs(state.viewEnd)+' | max VU '+b.maxY;



  ctx.strokeStyle='#11182718'; ctx.lineWidth=1;

  for(let i=0;i<=4;i++){

    const x=m.left+(m.right-m.left)*i/4;

    ctx.beginPath(); ctx.moveTo(x,m.top); ctx.lineTo(x,m.bottom); ctx.stroke();

  }

  for(let i=0;i<=4;i++){

    const y=m.bottom-(m.bottom-m.top)*i/4;

    ctx.beginPath(); ctx.moveTo(m.left,y); ctx.lineTo(m.right,y); ctx.stroke();

  }



  ctx.fillStyle='#374151'; ctx.font='12px \"Fira Code\",Consolas,monospace';

  for(let i=0;i<=4;i++){

    const y=m.bottom-(m.bottom-m.top)*i/4;

    const v=b.minY+(b.maxY-b.minY)*i/4;

    ctx.fillText(String(Math.round(v)),8,y+4);

  }

  for(let i=0;i<=4;i++){

    const x=m.left+(m.right-m.left)*i/4;

    const t=state.viewStart+(state.viewEnd-state.viewStart)*i/4;

    ctx.fillText(fmtMs(t),x-24,h-12);

  }



  function toY(v){return m.bottom-((v-b.minY)/Math.max(1,(b.maxY-b.minY)))*(m.bottom-m.top);}



  series.forEach((s)=>{

    if(!state.enabled.has(s.name)) return;

    const pts=(s.points||[]).filter(p=>p.tMs>=state.viewStart&&p.tMs<=state.viewEnd);

    if(!pts.length) return;

    ctx.strokeStyle=s.color; ctx.lineWidth=s.width;

    ctx.beginPath();

    pts.forEach((p,i)=>{

      const x=tsToX(p.tMs,m); const y=toY(Number(p.vus)||0);

      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);

    });

    ctx.stroke();

  });



  if(state.dragging){

    const x1=clamp(state.dragStartX,m.left,m.right);

    const x2=clamp(state.dragEndX,m.left,m.right);

    const l=Math.min(x1,x2), r=Math.max(x1,x2);

    ctx.fillStyle='rgba(59,130,246,0.18)';

    ctx.fillRect(l,m.top,r-l,m.bottom-m.top);

    ctx.strokeStyle='rgba(59,130,246,0.8)';

    ctx.strokeRect(l,m.top,r-l,m.bottom-m.top);

  }

}



canvas.addEventListener('mousedown',(ev)=>{

  const rect=canvas.getBoundingClientRect();

  state.dragging=true;

  state.dragStartX=ev.clientX-rect.left;

  state.dragEndX=state.dragStartX;

  draw();

});

canvas.addEventListener('mousemove',(ev)=>{

  if(!state.dragging) return;

  const rect=canvas.getBoundingClientRect();

  state.dragEndX=ev.clientX-rect.left;

  draw();

});

window.addEventListener('mouseup',()=>{

  if(!state.dragging) return;

  state.dragging=false;

  const w=canvas.width,h=canvas.height;

  const m={left:50,right:w-20,top:18,bottom:h-34};

  const x1=clamp(state.dragStartX,m.left,m.right);

  const x2=clamp(state.dragEndX,m.left,m.right);

  if(Math.abs(x2-x1)<8){ draw(); return; }

  const start=xToTs(Math.min(x1,x2),m);

  const end=xToTs(Math.max(x1,x2),m);

  if(end-start<1000){ draw(); return; }

  state.viewStart=Math.max(state.fullStart,start);

  state.viewEnd=Math.min(state.fullEnd,end);

  draw();

});

resetBtn.onclick=()=>{state.viewStart=state.fullStart; state.viewEnd=state.fullEnd; draw();};

window.addEventListener('resize',()=>draw());

draw();



// ---------------- API Plan tab (best-effort) ----------------

const apiCanvas=document.getElementById('apiCanvas');

const apiCtx=apiCanvas.getContext('2d');

const apiLegendEl=document.getElementById('apiLegend');

const apiRangeText=document.getElementById('apiRangeText');

const apiResetBtn=document.getElementById('apiResetBtn');

const apiBody=document.getElementById('apiTableBody');



const apiSeriesRaw=Array.isArray(plan.apiSeries)?plan.apiSeries:[];

const apiSeries=apiSeriesRaw.map((s,idx)=>({

  name:s.key||('series'+idx),

  label:s.label||s.key||('series'+idx),

  points:Array.isArray(s.points)?s.points:[],

  color:colorFor(idx),

  width:1.6

}));

const apiState={

  fullStart:0, fullEnd:0, viewStart:0, viewEnd:0,

  dragging:false, dragStartX:0, dragEndX:0,

  enabled:new Set(apiSeries.map(s=>s.name)),

};



function buildApiLegend(){

  apiLegendEl.innerHTML='';

  apiSeries.forEach((s)=>{

    const pill=document.createElement('label'); pill.className='pill';

    const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=apiState.enabled.has(s.name);

    cb.onchange=()=>{ if(cb.checked) apiState.enabled.add(s.name); else apiState.enabled.delete(s.name); drawApi(); };

    const dot=document.createElement('span'); dot.className='dot'; dot.style.background=s.color;

    const txt=document.createElement('span'); txt.textContent=s.label;

    pill.appendChild(cb); pill.appendChild(dot); pill.appendChild(txt);

    apiLegendEl.appendChild(pill);

  });

}



function flattenApiPoints(){

  let min=Infinity,max=-Infinity;

  apiSeries.forEach((s)=>{

    (s.points||[]).forEach(p=>{

      const t=Number(p.tMs);

      if(Number.isFinite(t)){min=Math.min(min,t);max=Math.max(max,t);}

    });

  });

  if(!Number.isFinite(min)||!Number.isFinite(max)){min=0;max=0;}

  apiState.fullStart=min; apiState.fullEnd=max; apiState.viewStart=min; apiState.viewEnd=max;

}



function apiBounds(){

  let maxY=0;

  apiSeries.forEach(s=>{

    if(!apiState.enabled.has(s.name)) return;

    (s.points||[]).forEach(p=>{maxY=Math.max(maxY,Number(p.vus)||0);});

  });

  return {minY:0,maxY:Math.max(1,Math.ceil(maxY))};

}



function apiTsToX(t,m){const r=(t-apiState.viewStart)/Math.max(1,(apiState.viewEnd-apiState.viewStart));return m.left+r*(m.right-m.left);}

function apiXToTs(x,m){const r=(x-m.left)/Math.max(1,(m.right-m.left));return apiState.viewStart+r*(apiState.viewEnd-apiState.viewStart);}



function drawApi(){

  const w=apiCanvas.width,h=apiCanvas.height;

  apiCtx.clearRect(0,0,w,h);

  const m={left:50,right:w-20,top:18,bottom:h-34};

  const b=apiBounds();

  apiRangeText.textContent=fmtMs(apiState.viewStart)+' -> '+fmtMs(apiState.viewEnd)+' | max VU '+b.maxY;



  apiCtx.strokeStyle='#11182718'; apiCtx.lineWidth=1;

  for(let i=0;i<=4;i++){

    const x=m.left+(m.right-m.left)*i/4;

    apiCtx.beginPath(); apiCtx.moveTo(x,m.top); apiCtx.lineTo(x,m.bottom); apiCtx.stroke();

  }

  for(let i=0;i<=4;i++){

    const y=m.bottom-(m.bottom-m.top)*i/4;

    apiCtx.beginPath(); apiCtx.moveTo(m.left,y); apiCtx.lineTo(m.right,y); apiCtx.stroke();

  }

  apiCtx.fillStyle='#374151'; apiCtx.font='12px \"Fira Code\",Consolas,monospace';

  for(let i=0;i<=4;i++){

    const y=m.bottom-(m.bottom-m.top)*i/4;

    const v=b.minY+(b.maxY-b.minY)*i/4;

    apiCtx.fillText(String(Math.round(v)),8,y+4);

  }

  for(let i=0;i<=4;i++){

    const x=m.left+(m.right-m.left)*i/4;

    const t=apiState.viewStart+(apiState.viewEnd-apiState.viewStart)*i/4;

    apiCtx.fillText(fmtMs(t),x-24,h-12);

  }

  function toY(v){return m.bottom-((v-b.minY)/Math.max(1,(b.maxY-b.minY)))*(m.bottom-m.top);}

  apiSeries.forEach((s)=>{

    if(!apiState.enabled.has(s.name)) return;

    const pts=(s.points||[]).filter(p=>p.tMs>=apiState.viewStart&&p.tMs<=apiState.viewEnd);

    if(!pts.length) return;

    apiCtx.strokeStyle=s.color; apiCtx.lineWidth=s.width;

    apiCtx.beginPath();

    pts.forEach((p,i)=>{

      const x=apiTsToX(p.tMs,m); const y=toY(Number(p.vus)||0);

      if(i===0) apiCtx.moveTo(x,y); else apiCtx.lineTo(x,y);

    });

    apiCtx.stroke();

  });

  if(apiState.dragging){

    const x1=clamp(apiState.dragStartX,m.left,m.right);

    const x2=clamp(apiState.dragEndX,m.left,m.right);

    const l=Math.min(x1,x2), r=Math.max(x1,x2);

    apiCtx.fillStyle='rgba(59,130,246,0.18)';

    apiCtx.fillRect(l,m.top,r-l,m.bottom-m.top);

    apiCtx.strokeStyle='rgba(59,130,246,0.8)';

    apiCtx.strokeRect(l,m.top,r-l,m.bottom-m.top);

  }

}



function bindApiZoom(){

  apiCanvas.addEventListener('mousedown',(ev)=>{

    const rect=apiCanvas.getBoundingClientRect();

    apiState.dragging=true;

    apiState.dragStartX=ev.clientX-rect.left;

    apiState.dragEndX=apiState.dragStartX;

    drawApi();

  });

  apiCanvas.addEventListener('mousemove',(ev)=>{

    if(!apiState.dragging) return;

    const rect=apiCanvas.getBoundingClientRect();

    apiState.dragEndX=ev.clientX-rect.left;

    drawApi();

  });

  window.addEventListener('mouseup',()=>{

    if(!apiState.dragging) return;

    apiState.dragging=false;

    const w=apiCanvas.width,h=apiCanvas.height;

    const m={left:50,right:w-20,top:18,bottom:h-34};

    const x1=clamp(apiState.dragStartX,m.left,m.right);

    const x2=clamp(apiState.dragEndX,m.left,m.right);

    if(Math.abs(x2-x1)<8){ drawApi(); return; }

    const start=apiXToTs(Math.min(x1,x2),m);

    const end=apiXToTs(Math.max(x1,x2),m);

    if(end-start<1000){ drawApi(); return; }

    apiState.viewStart=Math.max(apiState.fullStart,start);

    apiState.viewEnd=Math.min(apiState.fullEnd,end);

    drawApi();

  });

}



function renderApiTable(){

  const steps=(plan.apiPlan&&Array.isArray(plan.apiPlan.steps))?plan.apiPlan.steps:[];

  apiBody.innerHTML='';

  if(!steps.length){

    apiBody.innerHTML='<tr><td colspan=\"7\" class=\"muted\">No steps extracted.</td></tr>';

    return;

  }

  steps.forEach((s)=>{

    const tr=document.createElement('tr');

    const phase=(s.phase||'unknown');

    const scenarios=(Array.isArray(s.scenarios)&&s.scenarios.length)?s.scenarios.join(', '):'-';

    const endpoint=s.endpointRef||'-';

    const imp=s.endpointImportFrom||'-';

    const load=(s.load==null?1:Number(s.load));

    const lm=s.loadMode||'probabilistic';

    tr.innerHTML = '<td class=\"mono\">'+phase+'</td>'+

      '<td class=\"mono\">'+scenarios+'</td>'+

      '<td class=\"mono\">'+(s.stepName||'-')+'</td>'+

      '<td class=\"mono\">'+endpoint+'</td>'+

      '<td>'+String(load)+'</td>'+

      '<td class=\"mono\">'+lm+'</td>'+

      '<td class=\"mono\">'+imp+'</td>';

    apiBody.appendChild(tr);

  });

}



buildApiLegend();

flattenApiPoints();

bindApiZoom();

apiResetBtn.onclick=()=>{apiState.viewStart=apiState.fullStart; apiState.viewEnd=apiState.fullEnd; drawApi();};

renderApiTable();

</script></div></body></html>`;

}

