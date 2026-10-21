import { escapeHtml } from "../utils/html.js";

import { formatMetric } from "../utils/number.js";



/**  @internal Render HTML dashboard (1 file) từ summary + raw log events. */

export function renderDashboardHtml(summary: any, logEvents: any) {

    const payload = JSON.stringify({

        runDurationSeconds: summary.runDurationSeconds,

        callSeries: summary.callSeries

    })

        .replace(/</g, '\\u003c')

        .replace(/<\/script>/gi, '<\\/script>');



    const statusClass = (status: any, method: any, endpoint: any) => {

        const code = Number(status);

        const m = String(method || '').toUpperCase().trim();

        const ep = String(endpoint || '').toLowerCase().trim();

        const isSql = m === 'SQL' || ep === 'sql';

        if (isSql) {

            if (code === 0) return 'status-ok';

            if (code === 100) return 'status-warn';

            return 'status-bad';

        }

        if (code === 200) return 'status-ok';

        if (code === 0 || code >= 400) return 'status-bad';

        if (code >= 300) return 'status-warn';

        return 'status-neutral';

    };



    const overviewRows = summary.perApi

        .map((row:any, index: any) => {

            const detailRows = row.statusesDetail

                .map((d: any, statusIndex: any) => {

                    const statusDetailId = `status-detail-${index}-${statusIndex}`;

                    const checkSummary =

                        `<div><strong>Check Passed:</strong> ${d.checkPassed}</div>` +

                        `<div><strong>Check Failed:</strong> ${d.checkFailed}</div>` +

                        `<div><strong>Check Unknown:</strong> ${d.checkUnknown}</div>`;

                    return `<tr><td><span class="pill ${statusClass(d.status, row.method, row.endpoint)}">${escapeHtml(

                        d.status

                    )}</span></td><td>${d.count}</td><td>${d.errors}</td><td>${formatMetric(d.errorRate)}%</td><td>${formatMetric(

                        d.avg

                    )}</td><td>${formatMetric(d.p95)}</td><td>${formatMetric(d.p99)}</td><td>${formatMetric(

                        d.min

                    )}</td><td>${formatMetric(

                        d.max

                    )}</td><td><button class="btn status-toggle-btn" data-target="${statusDetailId}">Expand</button></td></tr><tr id="${statusDetailId}" class="status-detail-row" style="display:none;"><td colspan="10">${checkSummary}</td></tr>`;

                })

                .join('');

            const detailId = `api-detail-${index}`;

            const enabled = row.defaultEnabled !== false;

            const remoteCell = row.sampleRemoteAddress ? escapeHtml(String(row.sampleRemoteAddress)) : '';

            return `<tr class="api-row" data-api-key="${escapeHtml(row.key)}"><td><input type="checkbox" class="api-toggle" data-api-key="${escapeHtml(row.key)}" data-default-enabled="${enabled ? '1' : '0'}" ${enabled ? 'checked' : ''} /></td><td>${escapeHtml(row.method)}</td><td title="${escapeHtml(row.stepName)}">${escapeHtml(row.endpoint)}</td><td>${remoteCell}</td><td>${row.total}</td><td class="${row.errors ? 'num-bad' : 'num-ok'}">${row.errors}</td><td class="${row.errorRate ? 'num-bad' : 'num-ok'}">${formatMetric(row.errorRate)}%</td><td class="num-info">${formatMetric(row.tps, 3)}</td><td>${formatMetric(row.avg)}</td><td>${formatMetric(row.p95)}</td><td>${formatMetric(row.p99)}</td><td>${formatMetric(row.min)}</td><td>${formatMetric(row.max)}</td><td><button class="btn toggle-btn" data-target="${detailId}">Expand</button></td></tr><tr id="${detailId}" class="detail-row" data-api-key="${escapeHtml(row.key)}" style="display:none;"><td colspan="14"><table class="inner"><thead><tr><th>Status</th><th>Calls</th><th>Errors</th><th>Error Rate</th><th>Avg</th><th>P95</th><th>P99</th><th>Min</th><th>Max</th><th>Action</th></tr></thead><tbody>${detailRows || '<tr><td colspan="10">No status details.</td></tr>'}</tbody></table></td></tr>`;

        })

        .join('');



    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>Performance Dashboard</title><style>

@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;700&display=swap');

*{box-sizing:border-box}body{margin:0;font-family:"Fira Code",Consolas,monospace;background:#fff;color:#111827}.wrap{max-width:1520px;margin:0 auto;padding:20px}.topbar{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.title{margin:0 0 4px;font-size:30px}.sub{color:#6b7280;margin-bottom:12px}.credit{font-size:12px;color:#374151;padding:6px 10px;border:1px solid #d1d5db;border-radius:8px;background:#f9fafb;white-space:nowrap}.tabs{display:flex;gap:8px;margin-bottom:12px}.tab{padding:8px 12px;border:1px solid #111827;background:#111827;color:#fff;border-radius:8px;cursor:pointer;font-family:inherit}.tab:not(.active){opacity:.72}.tab.active{opacity:1;box-shadow:0 0 0 2px #11182722 inset}.panel{display:none}.panel.active{display:block}

.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:12px}.card{border:1px solid #d1d5db;border-radius:10px;padding:10px;background:#fff}.label{font-size:11px;color:#6b7280;text-transform:uppercase}.value{font-size:26px;font-weight:700}.num-ok{color:#16a34a}.num-bad{color:#dc2626}.num-info{color:#0369a1}

.toolbar{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}.left{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.btn,input,select{font-family:inherit;font-size:12px}.btn{padding:6px 10px;border:1px solid #94a3b8;background:#fff;border-radius:8px;cursor:pointer}input,select{padding:9px 10px;border:1px solid #d1d5db;border-radius:8px;background:#fff}

.table-wrap{border:1px solid #d1d5db;border-radius:10px;overflow:auto;background:#f8fafc}table{width:100%;border-collapse:collapse;min-width:1300px}th,td{border-bottom:1px solid #e5e7eb;padding:8px;font-size:12px;vertical-align:top}th{position:sticky;top:0;background:#f3f4f6;text-align:left}.detail-row td{background:#f8fafc}.inner{min-width:800px}.api-row.excluded{opacity:.4}

.pill{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:999px;border:1px solid;font-size:11px;margin:2px 4px 2px 0;line-height:1.2;font-variant-numeric:tabular-nums}.mix-code{opacity:.9}.mix-dot{opacity:.6}.mix-count{font-weight:700}.status-ok{color:#166534;border-color:#86efac;background:#dcfce7}.status-bad{color:#991b1b;border-color:#fca5a5;background:#fee2e2}.status-warn{color:#92400e;border-color:#fcd34d;background:#fef3c7}.status-neutral{color:#1f2937;border-color:#cbd5e1;background:#f1f5f9}

.filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px;margin-bottom:8px}.counter{color:#6b7280;font-size:12px;margin-bottom:6px}.level-error{color:#dc2626;font-weight:700}.level-warning{color:#d97706;font-weight:700}.level-info{color:#0369a1;font-weight:700}

.json{border:1px solid #dbe1e8;border-radius:8px;background:#fff;margin:6px 0}.json-title{padding:6px 8px;background:#f3f4f6;border-bottom:1px solid #dbe1e8;font-size:11px}.json pre{margin:0;padding:8px;font-size:11px;white-space:pre-wrap;word-break:break-word}

.graph-toolbar{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px}.graph-hint{font-size:12px;color:#374151}.graph-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.graph-slider{width:180px}.graph-grid{display:grid;grid-template-columns:repeat(2,minmax(420px,1fr));gap:12px}.chart-card{border:1px solid #d1d5db;border-radius:10px;background:#fff;padding:10px}.chart-card.vu-chart{grid-column:1/-1}.chart-head{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:6px}.chart-title{font-size:14px;font-weight:700}.chart-range{font-size:11px;color:#6b7280}.chart-canvas{width:100%;height:280px;border:1px solid #e5e7eb;border-radius:8px;background:#fbfdff;display:block;cursor:crosshair}.chart-card.vu-chart .chart-canvas{height:240px}.chart-controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px}.endpoint-picker{border:1px solid #e5e7eb;border-radius:8px;padding:8px;background:#f9fafb;margin-bottom:8px}.endpoint-picker summary{cursor:pointer;font-size:12px;color:#374151}.endpoint-list{margin-top:8px;max-height:120px;overflow:auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:6px}.endpoint-item{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.anomaly{margin-top:8px;display:flex;flex-wrap:wrap;gap:6px}.anomaly-item{font-size:11px;border:1px solid #d1d5db;border-radius:999px;padding:2px 8px;background:#fff}.anomaly-item.spike{color:#166534;border-color:#86efac;background:#dcfce7}.anomaly-item.drop{color:#991b1b;border-color:#fca5a5;background:#fee2e2}@media(max-width:980px){.graph-grid{grid-template-columns:1fr}.chart-card.vu-chart{grid-column:auto}}

</style></head><body><div class="wrap"><div class="topbar"><div><h1 class="title">Performance Dashboard</h1><div class="sub">Overview | Graphs | Full log explorer</div></div><div class="credit">Made by duyvt2 | Team APP</div></div><div class="tabs"><button class="tab active" data-panel="overview">Overview</button><button class="tab" data-panel="graphs">Graphs</button><button class="tab" data-panel="logs">Log Explorer</button></div>

<section id="overview" class="panel active"><div class="cards"><div class="card"><div class="label">Total Calls</div><div class="value num-ok" id="sum-calls">${summary.totalCalls}</div></div><div class="card"><div class="label">Error Calls</div><div class="value num-bad" id="sum-errors">${summary.totalErrors}</div></div><div class="card"><div class="label">Error Rate</div><div class="value ${summary.overallErrorRate ? 'num-bad' : 'num-ok'}" id="sum-er">${formatMetric(summary.overallErrorRate)}%</div></div><div class="card"><div class="label">RPS (Total)</div><div class="value num-info" id="sum-tps">${formatMetric(summary.overallTps,3)}</div></div><div class="card"><div class="label">RPS (Passed)</div><div class="value num-ok" id="sum-tps-pass">${formatMetric((summary.totalCalls-summary.totalErrors)/Math.max(summary.runDurationSeconds,1),3)}</div></div><div class="card"><div class="label">Avg (ms)</div><div class="value" id="sum-avg">${formatMetric(summary.overallStats.avg)}</div></div><div class="card"><div class="label">P95 (ms)</div><div class="value" id="sum-p95">${formatMetric(summary.overallStats.p95)}</div></div><div class="card"><div class="label">P99 (ms)</div><div class="value" id="sum-p99">${formatMetric(summary.overallStats.p99)}</div></div></div>

<div class="toolbar"><div class="left"><strong>Per-API Metrics (${summary.perApi.length})</strong><button id="all" class="btn">Select All</button><button id="none" class="btn">Clear All</button></div><input id="api-search" type="search" placeholder="Filter by method/endpoint/status"></div>

<div class="toolbar"><div class="left"><strong>RPS Passed Status</strong><span id="tps-pass-statuses"></span></div></div>

<div class="toolbar"><div class="left"><strong>Error Definition</strong><select id="error-mode" class="btn" style="padding:4px 8px;margin-right:6px;"><option value="status" selected>By Status</option><option value="check_fail">By Check Fail</option><option value="status_or_check_fail">Status OR Check Fail</option></select><span id="error-statuses"></span></div></div>

<div class="table-wrap"><table id="api-table"><thead><tr><th>Use</th><th>Method</th><th>Endpoint</th><th>Remote</th><th>Calls</th><th>Errors</th><th>Error Rate</th><th>TPS</th><th>Avg</th><th>P95</th><th>P99</th><th>Min</th><th>Max</th><th>Status Mix</th></tr></thead><tbody>${overviewRows || '<tr><td colspan="14">No API records found.</td></tr>'}</tbody></table></div></section>

<section id="graphs" class="panel"><div class="graph-toolbar"><div class="graph-hint">Drag on a chart to zoom that time region. Use reset to return to full range.</div><div class="graph-controls"><button id="graph-reset" class="btn">Reset Zoom</button></div></div><div class="graph-grid"><div class="chart-card"><div class="chart-head"><div class="chart-title">RPS / Time</div><div class="chart-range" id="tps-range">No data</div></div><div class="chart-controls"><label class="graph-hint">Interval <select id="tps-interval"><option value="1">1s</option><option value="3">3s</option><option value="5">5s</option><option value="10">10s</option></select></label><label class="graph-hint">Mode <select id="tps-mode"><option value="attempts">All Attempts</option><option value="http_success">HTTP Success</option><option value="passed_only">Passed Checks</option><option value="passed_http_success">Passed + HTTP Success</option></select></label><label class="graph-hint">Threshold <span id="tps-threshold-value">5.0</span> TPS/s</label><input id="tps-threshold" class="graph-slider" type="range" min="0.5" max="30" step="0.5" value="5"/></div><details class="endpoint-picker"><summary id="tps-endpoints-summary">Endpoints</summary><div id="tps-endpoints" class="endpoint-list"></div></details><canvas id="chart-tps" class="chart-canvas"></canvas><div class="anomaly" id="tps-anomaly"></div></div><div class="chart-card"><div class="chart-head"><div class="chart-title">AVG / Time</div><div class="chart-range" id="avg-rt-range">No data</div></div><div class="chart-controls"><label class="graph-hint">Interval <select id="avg-rt-interval"><option value="1">1s</option><option value="3">3s</option><option value="5">5s</option><option value="10">10s</option></select></label><label class="graph-hint">Mode <select id="avg-rt-mode"><option value="attempts">All Attempts</option><option value="http_success">HTTP Success</option><option value="passed_only">Passed Checks</option><option value="passed_http_success">Passed + HTTP Success</option></select></label><label class="graph-hint">Threshold <span id="avg-rt-threshold-value">100.0</span> ms/s</label><input id="avg-rt-threshold" class="graph-slider" type="range" min="10" max="2000" step="10" value="100"/></div><details class="endpoint-picker"><summary id="avg-rt-endpoints-summary">Endpoints</summary><div id="avg-rt-endpoints" class="endpoint-list"></div></details><canvas id="chart-avg-rt" class="chart-canvas"></canvas><div class="anomaly" id="avg-rt-anomaly"></div></div><div class="chart-card vu-chart"><div class="chart-head"><div class="chart-title">VU / Time</div><div class="chart-range" id="vu-range">No data</div></div><div class="chart-controls"><label class="graph-hint">Interval <select id="vu-interval"><option value="1">1s</option><option value="3">3s</option><option value="5">5s</option><option value="10">10s</option></select></label><label class="graph-hint">Threshold <span id="vu-threshold-value">0.5</span> VU/s</label><input id="vu-threshold" class="graph-slider" type="range" min="0.1" max="10" step="0.1" value="0.5"/></div><canvas id="chart-vu" class="chart-canvas"></canvas><div class="anomaly" id="vu-anomaly"></div></div></div></section>

<section id="logs" class="panel"><div class="filters"><input id="log-search" type="search" placeholder="Search message, endpoint, method, url"><input id="log-deep-search" type="search" placeholder="Search in header / body / request / response"><select id="f-level"><option value="">All Levels</option></select><select id="f-type"><option value="">All Types</option></select><select id="f-endpoint"><option value="">All Endpoints</option></select><select id="f-status"><option value="">All Status</option></select><label class="btn"><input id="f-errors" type="checkbox"> Errors only</label></div><div class="counter" id="log-count">0 items</div><div class="toolbar"><div class="left"><button id="log-prev" class="btn">Prev</button><button id="log-next" class="btn">Next</button><button id="log-refresh" class="btn" style="display:none;">Refresh Logs</button><span id="log-live-status" class="counter"></span><span class="counter" id="log-page">Page 1/1</span></div><div class="counter">Showing 50 items/page</div></div><div class="table-wrap"><table><thead><tr><th>Time</th><th>Level</th><th>Type</th><th>Method</th><th>Endpoint</th><th>URL</th><th>Status</th><th>Checks Pass</th><th>Duration</th><th>Message</th><th>Detail</th></tr></thead><tbody id="log-body"></tbody></table></div></section></div>

<script>

const data=${payload};

const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

const f=(v,d=2)=>Number.isFinite(v)?v.toFixed(d):'-';

const p=(arr,n)=>{if(!arr.length)return null;const i=Math.ceil((n/100)*arr.length)-1;return arr[Math.max(0,Math.min(arr.length-1,i))];};

const clsStatus=(s,method,endpoint)=>{const c=Number(s);const m=String(method||'').toUpperCase().trim();const ep=String(endpoint||'').toLowerCase().trim();const isSql=m==='SQL'||ep==='sql';if(isSql){if(c===0)return'status-ok';if(c===100)return'status-warn';return'status-bad';}if(c===200)return'status-ok';if(c===0||c>=400)return'status-bad';if(c>=300)return'status-warn';return'status-neutral';};

const clsLogStatus=e=>{if(e&&(e.type==='log'||e.type==='vu_change')&&(e.status==null||e.status==='-'||e.checksPass==='UNKNOWN'))return'status-neutral';return clsStatus(e&&e.status,e&&e.method,e&&e.endpoint);};

const errEvent=e=>{const m=String(e&&e.method||'').toUpperCase().trim();const ep=String(e&&e.endpoint||'').toLowerCase().trim();const isSql=m==='SQL'||ep==='sql';if(e&&e.level==='error')return true;const st=e&&e.status;const n=typeof st==='number'?st:Number(st);if(!Number.isFinite(n))return false;return isSql?n!==0:(n===0||n>=400);};

const STATE_KEY='__uk6_dashboard_state_v2__';

const savedState=(()=>{try{return JSON.parse(sessionStorage.getItem(STATE_KEY)||'{}')||{};}catch(_){return {};}})();

function saveState(next){try{const prev=(()=>{try{return JSON.parse(sessionStorage.getItem(STATE_KEY)||'{}')||{};}catch(_){return {};}})();sessionStorage.setItem(STATE_KEY,JSON.stringify({...prev,...next}));}catch(_){}} 

function setActivePanel(panel){document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.panel===panel));document.querySelectorAll('.panel').forEach(x=>x.classList.toggle('active',x.id===panel));saveState({activePanel:panel});if(panel==='graphs')drawGraphs();if(typeof updateLiveLogIndicator==='function')updateLiveLogIndicator(!!pendingLogEvents,false);}

document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>setActivePanel(t.dataset.panel));

const toggles=[...document.querySelectorAll('.api-toggle')];const apiRows=[...document.querySelectorAll('.api-row')];const apiAll=document.getElementById('all');const apiNone=document.getElementById('none');

const tpsPassStatusRoot=document.getElementById('tps-pass-statuses');

const errorStatusRoot=document.getElementById('error-statuses');

const errorModeSelect=document.getElementById('error-mode');

const apiSearchInput=document.getElementById('api-search');

const allStatuses=[...new Set(data.callSeries.map(c=>c.status).filter(v=>v!=null))].sort((a,b)=>Number(a)-Number(b));

const has200=allStatuses.some(s=>Number(s)===200);

const defaultPassedStatuses=new Set((has200?[200]:allStatuses).map(s=>String(s)));

tpsPassStatusRoot.innerHTML=allStatuses.map(s=>'<label class=\"btn\" style=\"padding:4px 8px;margin-right:4px;\"><input class=\"tps-pass-status-toggle\" type=\"checkbox\" data-status=\"'+esc(s)+'\" '+(defaultPassedStatuses.has(String(s))?'checked':'')+'> '+esc(s)+'</label>').join('');

const hasNonSqlZero=data.callSeries.some(c=>Number(c.status)===0&&String(c.method||'').toUpperCase().trim()!=='SQL'&&String(c.endpoint||'').toLowerCase().trim()!=='sql');

const defaultErrorStatuses=new Set(allStatuses.filter(s=>{const n=Number(s);if(!Number.isFinite(n))return false;if(n>=400)return true;if(n===0)return hasNonSqlZero;return n<0;}).map(s=>String(s)));

errorStatusRoot.innerHTML=allStatuses.map(s=>'<label class=\"btn\" style=\"padding:4px 8px;margin-right:4px;\"><input class=\"error-status-toggle\" type=\"checkbox\" data-status=\"'+esc(s)+'\" '+(defaultErrorStatuses.has(String(s))?'checked':'')+'> '+esc(s)+'</label>').join('');

const tpsPassStatusToggles=[...document.querySelectorAll('.tps-pass-status-toggle')];

const errorStatusToggles=[...document.querySelectorAll('.error-status-toggle')];

function getCheckedValues(nodes,attr){return nodes.filter(c=>c.checked).map(c=>String(c.dataset[attr]||''));}

function persistOverviewState(){saveState({selectedApiKeys:toggles.filter(c=>c.checked).map(c=>String(c.dataset.apiKey||'')),apiSearch:apiSearchInput?apiSearchInput.value:'',tpsPassedStatuses:getCheckedValues(tpsPassStatusToggles,'status'),errorMode:errorModeSelect?errorModeSelect.value:'status',errorStatuses:getCheckedValues(errorStatusToggles,'status')});}

function applyOverviewSearch(){const q=(apiSearchInput&&apiSearchInput.value||'').trim().toLowerCase();[...document.querySelectorAll('#api-table tbody tr')].forEach(r=>{if(r.classList.contains('detail-row'))return;const v=!q||r.innerText.toLowerCase().includes(q);r.style.display=v?'':'';const b=r.querySelector('.toggle-btn');if(!v&&b){const d=document.getElementById(b.dataset.target);if(d){d.style.display='none';b.innerText='Expand';}}});}

function restoreCheckedValues(nodes,attr,values){if(!Array.isArray(values))return;const set=new Set(values.map(v=>String(v)));nodes.forEach(node=>{node.checked=set.has(String(node.dataset[attr]||''));});}

function updateOverview(){

    const selected=new Set(toggles.filter(c=>c.checked).map(c=>c.dataset.apiKey));

    const passStatuses=new Set(tpsPassStatusToggles.filter(c=>c.checked).map(c=>c.dataset.status));

    const errorStatuses=new Set(errorStatusToggles.filter(c=>c.checked).map(c=>c.dataset.status));

    const mode=(errorModeSelect&&errorModeSelect.value)||'status';

    const usesStatus=mode!=='check_fail';

    errorStatusToggles.forEach(t=>{try{t.disabled=!usesStatus;}catch(_){}});if(errorStatusRoot){try{errorStatusRoot.style.opacity=usesStatus?'1':'0.55';}catch(_){}} 

    const isErrCall=(c)=>{

        const stErr=errorStatuses.has(String(c.status));

        const chkFail=c&&c.checkPassed===false;

        if(mode==='check_fail')return chkFail;

        if(mode==='status_or_check_fail')return stErr||chkFail;

        return stErr;

    };

    const calls=data.callSeries.filter(c=>selected.has(c.key));

    const total=calls.length;

    const errors=calls.reduce((a,c)=>a+(isErrCall(c)?1:0),0);

    const passed=calls.reduce((a,c)=>{

        const statusPass=passStatuses.has(String(c.status));

        if(mode==='check_fail')return a+((c&&c.checkPassed===true&&statusPass)?1:0);

        return a+((!isErrCall(c)&&statusPass)?1:0);

    },0);

    const er=total?(errors/total)*100:0;

    const tps=data.runDurationSeconds>0?total/data.runDurationSeconds:0;

    const tpsPass=data.runDurationSeconds>0?passed/data.runDurationSeconds:0;

    const ds=calls.map(c=>c.duration).filter(n=>typeof n==='number'&&Number.isFinite(n));

    const s=[...ds].sort((a,b)=>a-b);

    const avg=s.length?s.reduce((a,n)=>a+n,0)/s.length:null;



    const perKey=new Map();

    const perKeyStatus=new Map();

    data.callSeries.forEach(c=>{

        // Default: exclude setup calls from overview totals (setup runs once, not per-VU).

        if(c&&typeof c.rawType==='string'&&c.rawType.startsWith('setup_'))return;

        const key=c.key;

        const statusKey=String(c.status);

        const keyStats=perKey.get(key)||{total:0,errors:0};

        keyStats.total+=1;

        if(isErrCall(c))keyStats.errors+=1;

        perKey.set(key,keyStats);



        if(!perKeyStatus.has(key))perKeyStatus.set(key,new Map());

        const statusMap=perKeyStatus.get(key);

        const statusStats=statusMap.get(statusKey)||{count:0,errors:0};

        statusStats.count+=1;

        if(isErrCall(c))statusStats.errors+=1;

        statusMap.set(statusKey,statusStats);

    });



    document.getElementById('sum-calls').innerText=String(total);

    document.getElementById('sum-errors').innerText=String(errors);

    document.getElementById('sum-er').innerText=f(er)+'%';

    document.getElementById('sum-tps').innerText=f(tps,3);

    document.getElementById('sum-tps-pass').innerText=f(tpsPass,3);

    document.getElementById('sum-avg').innerText=f(avg);

    document.getElementById('sum-p95').innerText=f(p(s,95));

    document.getElementById('sum-p99').innerText=f(p(s,99));



    apiRows.forEach(r=>{

        const on=selected.has(r.dataset.apiKey);

        r.classList.toggle('excluded',!on);

        const btn=r.querySelector('.toggle-btn');

        if(!on&&btn){

            const d=document.getElementById(btn.dataset.target);

            if(d){d.style.display='none';btn.innerText='Expand';}

        }



        const rowStats=perKey.get(r.dataset.apiKey)||{total:0,errors:0};

        const errTd=r.children[4];

        const erTd=r.children[5];

        const rowEr=rowStats.total?(rowStats.errors/rowStats.total)*100:0;

        errTd.innerText=String(rowStats.errors);

        errTd.className=rowStats.errors?'num-bad':'num-ok';

        erTd.innerText=f(rowEr)+'%';

        erTd.className=rowEr?'num-bad':'num-ok';



        const detailId=btn?btn.dataset.target:null;

        const detailRow=detailId?document.getElementById(detailId):null;

        if(detailRow){

            const statusRows=[...detailRow.querySelectorAll('tbody tr')].filter(tr=>tr.querySelector('.status-toggle-btn'));

            const statusMap=perKeyStatus.get(r.dataset.apiKey)||new Map();

            statusRows.forEach(tr=>{

                const tds=tr.children;

                if(!tds||tds.length<4)return;

                const statusText=tds[0].innerText.trim();

                const stats=statusMap.get(statusText)||{count:0,errors:0};

                const statusEr=stats.count?(stats.errors/stats.count)*100:0;

                tds[2].innerText=String(stats.errors);

                tds[3].innerText=f(statusEr)+'%';

            });

        }

    });

    persistOverviewState();

    if(graphState&&Array.isArray(graphState.sourceEvents)&&graphState.sourceEvents.length){

        buildGraphSeries(graphState.sourceEvents);

        if((document.querySelector('.tab.active')?.dataset.panel||'overview')==='graphs')drawGraphs();

    }

}

toggles.forEach(c=>c.onchange=updateOverview);tpsPassStatusToggles.forEach(c=>c.onchange=updateOverview);errorStatusToggles.forEach(c=>c.onchange=updateOverview);if(errorModeSelect)errorModeSelect.onchange=updateOverview;apiAll.onclick=()=>{toggles.forEach(c=>c.checked=true);updateOverview();};apiNone.onclick=()=>{toggles.forEach(c=>c.checked=false);updateOverview();};

if(apiSearchInput)apiSearchInput.oninput=()=>{persistOverviewState();applyOverviewSearch();};

document.querySelectorAll('.toggle-btn').forEach(b=>b.onclick=()=>{const d=document.getElementById(b.dataset.target);if(!d)return;const key=d.dataset.apiKey;const c=toggles.find(x=>x.dataset.apiKey===key);if(c&&!c.checked)return;const h=d.style.display==='none'||getComputedStyle(d).display==='none';d.style.display=h?'table-row':'none';b.innerText=h?'Collapse':'Expand';});

document.querySelectorAll('.status-toggle-btn').forEach(b=>b.onclick=()=>{const d=document.getElementById(b.dataset.target);if(!d)return;const h=d.style.display==='none'||getComputedStyle(d).display==='none';d.style.display=h?'table-row':'none';b.innerText=h?'Collapse':'Expand';});

const body=document.getElementById('log-body');const lvl=document.getElementById('f-level');const typ=document.getElementById('f-type');const endp=document.getElementById('f-endpoint');const st=document.getElementById('f-status');const err=document.getElementById('f-errors');const lq=document.getElementById('log-search');const ldq=document.getElementById('log-deep-search');const logPrev=document.getElementById('log-prev');const logNext=document.getElementById('log-next');const logPage=document.getElementById('log-page');

const logRefresh=document.getElementById('log-refresh');const logLiveStatus=document.getElementById('log-live-status');

const PAGE_SIZE=50;let logEvents=[];let pendingLogEvents=null;let filteredLogItems=[];let currentPage=Number(savedState.logPage)||1;let pageItems=[];

function formatDetailValue(v){if(v==null)return'-';if(typeof v==='string'){const trimmed=v.trim();if(trimmed.startsWith('{')||trimmed.startsWith('[')){try{return JSON.stringify(JSON.parse(trimmed),null,2);}catch(_){return v;}}return v;}if(typeof v==='object'){try{return JSON.stringify(v,null,2);}catch(_){return String(v);}}return String(v);}

const json=(t,v)=>'<div class=\"json\"><div class=\"json-title\">'+esc(t)+'</div><pre>'+esc(formatDetailValue(v))+'</pre></div>';

function normalizeLog(entries){const arr=entries.map((entry,idx)=>{const msg=(entry&&entry.msg&&typeof entry.msg==='object')?entry.msg:null;const response=msg&&msg.response&&typeof msg.response==='object'?msg.response:{};const tags=msg&&msg.tags&&typeof msg.tags==='object'?msg.tags:{};const url=(msg&&typeof msg.url==='string')?msg.url:((response&&typeof response.request_url==='string')?response.request_url:null);const req=(msg&&msg.request&&typeof msg.request==='object')?msg:{request:{headers:msg&&msg.requestHeaders||{},body:(msg&&Object.prototype.hasOwnProperty.call(msg,'requestBody'))?msg.requestBody:null,params:msg&&msg.requestParams||{}}};const checksObj=msg&&msg.checks&&typeof msg.checks==='object'?msg.checks:null;const checkVals=checksObj?Object.values(checksObj):[];const checksPass=!checksObj||checkVals.length===0?'UNKNOWN':(checkVals.some(v=>v===false)?'FAIL':'PASS');const timeMs=Date.parse(entry.time);const mergedTags=(msg&&msg.tags&&typeof msg.tags==='object')?{...msg.tags,...(url?{url}:{}),...(response&&typeof response.remote_ip==='string'?{remote_ip:response.remote_ip}:{}),...(response&&typeof response.remote_port==='number'?{remote_port:String(response.remote_port)}:{})}:((url||response)?{...(url?{url}:{}),...(response&&typeof response.remote_ip==='string'?{remote_ip:response.remote_ip}:{}),...(response&&typeof response.remote_port==='number'?{remote_port:String(response.remote_port)}:{})}:null);return {_idx:idx,time:entry.time||null,timeMs:Number.isFinite(timeMs)?timeMs:null,level:entry.level||'info',type:msg&&msg.type?msg.type:'log',method:(msg&&msg.method)||tags.method||null,endpoint:tags.endpoint||null,url,status:(response&&typeof response.status==='number')?response.status:((msg&&typeof msg.status==='number')?msg.status:null),checksPass,duration:(response&&response.timings&&typeof response.timings.duration==='number')?response.timings.duration:null,message:typeof entry.msg==='string'?entry.msg:(msg&&msg.type?msg.type:'object-log'),request:(msg&&msg.request&&typeof msg.request==='object')?msg.request:{headers:msg&&msg.requestHeaders||{},body:(msg&&Object.prototype.hasOwnProperty.call(msg,'requestBody'))?msg.requestBody:null,params:msg&&msg.requestParams||{}},response:response||null,tags:mergedTags,checks:checksObj,rawMsg:entry.msg,rawError:entry.error||null};});arr.sort((a,b)=>{if(a.timeMs!=null&&b.timeMs!=null&&a.timeMs!==b.timeMs)return b.timeMs-a.timeMs;if(a.timeMs!=null&&b.timeMs==null)return-1;if(a.timeMs==null&&b.timeMs!=null)return 1;return b._idx-a._idx;});return arr;}

function fill(sel,arr){sel.innerHTML='<option value=\"\">'+sel.options[0].text+'</option>';arr.forEach(v=>sel.insertAdjacentHTML('beforeend','<option value=\"'+esc(v)+'\">'+esc(v)+'</option>'));}function fillFilters(){fill(lvl,[...new Set(logEvents.map(e=>e.level).filter(Boolean))].sort());fill(typ,[...new Set(logEvents.map(e=>e.type).filter(Boolean))].sort());fill(endp,[...new Set(logEvents.map(e=>e.endpoint).filter(Boolean))].sort());fill(st,[...new Set(logEvents.map(e=>e.status).filter(v=>v!=null))].sort((a,b)=>Number(a)-Number(b)));}

const getDeepText=e=>{try{const parts=[e.request&&e.request.headers,e.request&&Object.prototype.hasOwnProperty.call(e.request,'body')?e.request.body:null,e.request&&e.request.params,e.response,e.tags,e.checks];return parts.filter(v=>v!=null).map(v=>typeof v==='string'?v:JSON.stringify(v)).join(' ').toLowerCase();}catch(_){return '';}};

function filterLogs(){const q=lq.value.trim().toLowerCase();const dq=ldq.value.trim().toLowerCase();const fl=lvl.value,ft=typ.value,fe=endp.value,fs=st.value,eo=err.checked;filteredLogItems=logEvents.filter(e=>{if(fl&&e.level!==fl)return false;if(ft&&e.type!==ft)return false;if(fe&&e.endpoint!==fe)return false;if(fs&&String(e.status)!==fs)return false;if(eo&&!errEvent(e))return false;if(q){const hay=[e.time,e.level,e.type,e.method,e.endpoint,e.url,e.message,e.status,e.duration].filter(v=>v!=null).join(' ').toLowerCase();if(!hay.includes(q))return false;}if(dq&&!getDeepText(e).includes(dq))return false;return true;});}

function renderLogPage(){const totalPages=Math.max(1,Math.ceil(filteredLogItems.length/PAGE_SIZE));if(currentPage>totalPages)currentPage=totalPages;if(currentPage<1)currentPage=1;const start=(currentPage-1)*PAGE_SIZE;const end=Math.min(start+PAGE_SIZE,filteredLogItems.length);pageItems=filteredLogItems.slice(start,end);document.getElementById('log-count').innerText=filteredLogItems.length+' items';logPage.innerText='Page '+currentPage+'/'+totalPages;if(!pageItems.length){body.innerHTML='<tr><td colspan=\"11\">No log items matched filters.</td></tr>';return;}body.innerHTML=pageItems.map((e,i)=>{const id='ld-'+i;const lc=e.level==='error'?'level-error':(e.level==='warning'?'level-warning':'level-info');const cc=e.checksPass==='PASS'?'num-ok':(e.checksPass==='FAIL'?'num-bad':'');return '<tr><td>'+esc(e.time||'-')+'</td><td class=\"'+lc+'\">'+esc(e.level||'-')+'</td><td>'+esc(e.type||'-')+'</td><td>'+esc(e.method||'-')+'</td><td>'+esc(e.endpoint||'-')+'</td><td>'+esc(e.url||'-')+'</td><td><span class=\"pill '+clsLogStatus(e)+'\">'+esc(e.status==null?'-':e.status)+'</span></td><td class=\"'+cc+'\">'+esc(e.checksPass)+'</td><td>'+esc(e.duration==null?'-':Number(e.duration).toFixed(2))+'</td><td>'+esc(e.message||'-')+'</td><td><button class=\"btn lg\" data-id=\"'+id+'\" data-idx=\"'+i+'\">View</button></td></tr><tr id=\"'+id+'\" class=\"detail-row\" style=\"display:none;\"><td colspan=\"11\"></td></tr>';}).join('');document.querySelectorAll('.lg').forEach(b=>b.onclick=()=>{const d=document.getElementById(b.dataset.id);if(!d)return;const h=d.style.display==='none'||getComputedStyle(d).display==='none';if(h&&d.children[0]&&d.children[0].innerHTML===''){const e=pageItems[Number(b.dataset.idx)];const blocks=[json('Request Headers',e.request&&e.request.headers),json('Request Body',e.request&&Object.prototype.hasOwnProperty.call(e.request,'body')?e.request.body:null),json('Request Params',e.request&&e.request.params),json('Response Status/Timings',e.response?{status:e.response.status,timings:e.response.timings}:null),json('Response Headers',e.response&&e.response.headers),json('Response Body',e.response&&Object.prototype.hasOwnProperty.call(e.response,'body')?e.response.body:null),json('Tags',e.tags),json('Checks',e.checks),json('Raw Error',e.rawError)].join('');d.children[0].innerHTML=blocks;}d.style.display=h?'table-row':'none';b.innerText=h?'Hide':'View';});}

function applyLogFilters(resetPage){if(resetPage)currentPage=1;filterLogs();renderLogPage();saveState({logPage:currentPage,logSearch:lq.value,logDeepSearch:ldq.value,logLevel:lvl.value,logType:typ.value,logEndpoint:endp.value,logStatus:st.value,logErrorsOnly:!!err.checked});}

logPrev.onclick=()=>{currentPage-=1;renderLogPage();saveState({logPage:currentPage});};logNext.onclick=()=>{currentPage+=1;renderLogPage();saveState({logPage:currentPage});};

[lq,ldq,lvl,typ,endp,st,err].forEach(el=>{el.addEventListener('input',()=>applyLogFilters(true));el.addEventListener('change',()=>applyLogFilters(true));});

const tpsCanvas=document.getElementById('chart-tps');const avgRtCanvas=document.getElementById('chart-avg-rt');const vuCanvas=document.getElementById('chart-vu');const graphReset=document.getElementById('graph-reset');const tpsIntervalSelect=document.getElementById('tps-interval');const avgRtIntervalSelect=document.getElementById('avg-rt-interval');const vuIntervalSelect=document.getElementById('vu-interval');const tpsModeSelect=document.getElementById('tps-mode');const avgRtModeSelect=document.getElementById('avg-rt-mode');const tpsThresholdSlider=document.getElementById('tps-threshold');const avgRtThresholdSlider=document.getElementById('avg-rt-threshold');const vuThresholdSlider=document.getElementById('vu-threshold');const tpsThresholdValue=document.getElementById('tps-threshold-value');const avgRtThresholdValue=document.getElementById('avg-rt-threshold-value');const vuThresholdValue=document.getElementById('vu-threshold-value');const tpsRange=document.getElementById('tps-range');const avgRtRange=document.getElementById('avg-rt-range');const vuRange=document.getElementById('vu-range');const tpsAnomaly=document.getElementById('tps-anomaly');const avgRtAnomaly=document.getElementById('avg-rt-anomaly');const vuAnomaly=document.getElementById('vu-anomaly');const tpsEndpointsRoot=document.getElementById('tps-endpoints');const tpsEndpointsSummary=document.getElementById('tps-endpoints-summary');const avgRtEndpointsRoot=document.getElementById('avg-rt-endpoints');const avgRtEndpointsSummary=document.getElementById('avg-rt-endpoints-summary');

const graphState={fullStart:null,fullEnd:null,viewStart:savedState.graphViewStart??null,viewEnd:savedState.graphViewEnd??null,tpsSeries:[],avgRtSeries:[],vuSeries:[],tpsAnoms:[],avgRtAnoms:[],vuAnoms:[],sourceEvents:[],tpsIntervalSec:Number(savedState.tpsIntervalSec)||1,avgRtIntervalSec:Number(savedState.avgRtIntervalSec)||1,vuIntervalSec:Number(savedState.vuIntervalSec)||1,tpsMode:String(savedState.tpsMode||'attempts'),avgRtMode:String(savedState.avgRtMode||savedState.tpsMode||'attempts'),tpsRateThreshold:Number(savedState.tpsRateThreshold)||5,avgRtRateThreshold:Number(savedState.avgRtRateThreshold)||100,vuRateThreshold:Number(savedState.vuRateThreshold)||0.5,tpsEndpointCounts:new Map(),avgRtEndpointCounts:new Map(),selectedTpsKeys:new Set(Array.isArray(savedState.selectedTpsKeys)?savedState.selectedTpsKeys:[]),selectedAvgRtKeys:new Set(Array.isArray(savedState.selectedAvgRtKeys)?savedState.selectedAvgRtKeys:[]),allowEmptyTpsSelection:false,allowEmptyAvgRtSelection:false,dragging:false,dragCanvas:null,dragStartX:0,dragEndX:0};

const graphMeta=new WeakMap();

function fmtTime(ms){if(!Number.isFinite(ms))return '-';const d=new Date(ms);const hh=String(d.getHours()).padStart(2,'0');const mm=String(d.getMinutes()).padStart(2,'0');const ss=String(d.getSeconds()).padStart(2,'0');return hh+':'+mm+':'+ss;}

function clamp(n,min,max){return Math.max(min,Math.min(max,n));}

function xToTs(x,meta){const ratio=(x-meta.left)/Math.max(1,meta.right-meta.left);return meta.viewStart+ratio*(meta.viewEnd-meta.viewStart);}

function tsToX(ts,meta){const ratio=(ts-meta.viewStart)/Math.max(1,meta.viewEnd-meta.viewStart);return meta.left+ratio*(meta.right-meta.left);}

function normalizeCanvasSize(canvas){const dpr=window.devicePixelRatio||1;const rect=canvas.getBoundingClientRect();const w=Math.max(300,Math.floor(rect.width));const h=Math.max(220,Math.floor(rect.height));if(canvas.width!==Math.floor(w*dpr)||canvas.height!==Math.floor(h*dpr)){canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);}const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return {ctx,w,h};}

function detectTpsAnomalies(series,rateThreshold,intervalSec){const out=[];let lastTs=null;for(let i=1;i<series.length;i++){const prev=series[i-1];const cur=series[i];const dt=Math.max(1,(cur.x-prev.x)/1000);const delta=cur.y-prev.y;const rate=Math.abs(delta)/dt;if(rate>=rateThreshold){if(lastTs==null||cur.x-lastTs>=Math.max(2000,intervalSec*1000)){out.push({x:cur.x,kind:delta>0?'spike':'drop',delta,rate,value:cur.y});lastTs=cur.x;}}}return out;}

function detectVuAnomalies(series,rateThreshold,intervalSec){const out=[];let lastTs=null;for(let i=1;i<series.length;i++){const prev=series[i-1];const cur=series[i];const dt=Math.max(1,(cur.x-prev.x)/1000);const delta=cur.y-prev.y;const rate=Math.abs(delta)/dt;if(rate>=rateThreshold){if(lastTs==null||cur.x-lastTs>=Math.max(2000,intervalSec*1000)){out.push({x:cur.x,kind:delta>0?'spike':'drop',delta,rate,value:cur.y});lastTs=cur.x;}}}return out;}

function isApiAttemptLike(e){return e&&typeof e.type==='string'&&(e.type.endsWith('_call')||e.type.endsWith('_error'));}

function getGraphPassedStatuses(){return new Set(tpsPassStatusToggles.filter(c=>c.checked).map(c=>String(c.dataset.status||'')));}

function graphModeMatches(e,mode){if(!isApiAttemptLike(e))return false;const statusPass=getGraphPassedStatuses().has(String(e.status));const checksPass=e&&e.checksPass==='PASS';switch(mode){case 'http_success':return statusPass;case 'passed_only':return checksPass;case 'passed_http_success':return statusPass&&checksPass;default:return true;}}

function tpsModeMatches(e){return graphModeMatches(e,graphState.tpsMode);}

function avgRtModeMatches(e){return graphModeMatches(e,graphState.avgRtMode)&&typeof e.duration==='number'&&Number.isFinite(e.duration);}

function buildEndpointCounts(valid,matches){const map=new Map();valid.forEach(e=>{if(matches(e)){const key=(e.method||'UNKNOWN')+' '+(e.endpoint||'unknown-endpoint');map.set(key,(map.get(key)||0)+1);}});return map;}

function buildTpsEndpointCounts(valid){return buildEndpointCounts(valid,tpsModeMatches);}

function buildAvgRtEndpointCounts(valid){return buildEndpointCounts(valid,avgRtModeMatches);}

function renderTpsEndpointPicker(){const keys=[...graphState.tpsEndpointCounts.keys()].sort((a,b)=>a.localeCompare(b));if(!keys.length){tpsEndpointsSummary.innerText='Endpoints (0 selected)';tpsEndpointsRoot.innerHTML='<span class="graph-hint">No endpoint data</span>';return;}tpsEndpointsSummary.innerText='Endpoints ('+graphState.selectedTpsKeys.size+' / '+keys.length+' selected)';tpsEndpointsRoot.innerHTML=keys.map(k=>'<label class="endpoint-item" title="'+esc(k)+'"><input class="tps-endpoint-toggle" type="checkbox" data-key="'+esc(k)+'" '+(graphState.selectedTpsKeys.has(k)?'checked':'')+'> '+esc(k)+' ('+(graphState.tpsEndpointCounts.get(k)||0)+')</label>').join('');document.querySelectorAll('.tps-endpoint-toggle').forEach(el=>el.onchange=()=>{const key=el.dataset.key;if(el.checked)graphState.selectedTpsKeys.add(key);else graphState.selectedTpsKeys.delete(key);graphState.allowEmptyTpsSelection=graphState.selectedTpsKeys.size===0;saveState({selectedTpsKeys:[...graphState.selectedTpsKeys]});buildGraphSeries(graphState.sourceEvents);drawGraphs();});}

function renderAvgRtEndpointPicker(){const keys=[...graphState.avgRtEndpointCounts.keys()].sort((a,b)=>a.localeCompare(b));if(!keys.length){avgRtEndpointsSummary.innerText='Endpoints (0 selected)';avgRtEndpointsRoot.innerHTML='<span class="graph-hint">No response-time data</span>';return;}avgRtEndpointsSummary.innerText='Endpoints ('+graphState.selectedAvgRtKeys.size+' / '+keys.length+' selected)';avgRtEndpointsRoot.innerHTML=keys.map(k=>'<label class="endpoint-item" title="'+esc(k)+'"><input class="avg-rt-endpoint-toggle" type="checkbox" data-key="'+esc(k)+'" '+(graphState.selectedAvgRtKeys.has(k)?'checked':'')+'> '+esc(k)+' ('+(graphState.avgRtEndpointCounts.get(k)||0)+')</label>').join('');document.querySelectorAll('.avg-rt-endpoint-toggle').forEach(el=>el.onchange=()=>{const key=el.dataset.key;if(el.checked)graphState.selectedAvgRtKeys.add(key);else graphState.selectedAvgRtKeys.delete(key);graphState.allowEmptyAvgRtSelection=graphState.selectedAvgRtKeys.size===0;saveState({selectedAvgRtKeys:[...graphState.selectedAvgRtKeys]});buildGraphSeries(graphState.sourceEvents);drawGraphs();});}

function buildTpsSeries(valid,intervalSec){const tpsValid=valid.filter(e=>tpsModeMatches(e));if(!tpsValid.length){const fallbackTs=valid.map(e=>e.timeMs).filter(v=>v!=null);const onlyTs=fallbackTs.length?Math.min(...fallbackTs):Date.now();return {series:[{x:onlyTs,y:0}],start:onlyTs,end:onlyTs};}const minTs=Math.min(...tpsValid.map(e=>e.timeMs));const maxTs=Math.max(...tpsValid.map(e=>e.timeMs));const minBucket=Math.floor((minTs/1000)/intervalSec)*intervalSec;const maxBucket=Math.ceil((maxTs/1000)/intervalSec)*intervalSec;const callCounter=new Map();tpsValid.forEach(e=>{const k=(e.method||'UNKNOWN')+' '+(e.endpoint||'unknown-endpoint');if(graphState.selectedTpsKeys.size>0&&!graphState.selectedTpsKeys.has(k))return;const b=Math.floor((e.timeMs/1000)/intervalSec)*intervalSec;callCounter.set(b,(callCounter.get(b)||0)+1);});const out=[...callCounter.entries()].sort((a,b)=>a[0]-b[0]).map(([b,count])=>({x:b*1000,y:count/intervalSec}));return {series:out.length?out:[{x:minBucket*1000,y:0}],start:minBucket*1000,end:maxBucket*1000};}

function buildAvgRtSeries(valid,intervalSec){const rtValid=valid.filter(e=>avgRtModeMatches(e));if(!rtValid.length){const fallbackTs=valid.map(e=>e.timeMs).filter(v=>v!=null);const onlyTs=fallbackTs.length?Math.min(...fallbackTs):Date.now();return {series:[{x:onlyTs,y:0}],start:onlyTs,end:onlyTs};}const minTs=Math.min(...rtValid.map(e=>e.timeMs));const maxTs=Math.max(...rtValid.map(e=>e.timeMs));const minBucket=Math.floor((minTs/1000)/intervalSec)*intervalSec;const maxBucket=Math.ceil((maxTs/1000)/intervalSec)*intervalSec;const buckets=new Map();rtValid.forEach(e=>{const k=(e.method||'UNKNOWN')+' '+(e.endpoint||'unknown-endpoint');if(graphState.selectedAvgRtKeys.size>0&&!graphState.selectedAvgRtKeys.has(k))return;const b=Math.floor((e.timeMs/1000)/intervalSec)*intervalSec;const bucket=buckets.get(b)||{sum:0,count:0};bucket.sum+=e.duration;bucket.count+=1;buckets.set(b,bucket);});const out=[...buckets.entries()].sort((a,b)=>a[0]-b[0]).filter(([,bucket])=>bucket&&bucket.count>0).map(([b,bucket])=>({x:b*1000,y:bucket.sum/bucket.count}));return {series:out.length?out:[{x:minBucket*1000,y:0}],start:minBucket*1000,end:maxBucket*1000};}

function buildVuSeries(valid,intervalSec){const minTs=Math.min(...valid.map(e=>e.timeMs));const maxTs=Math.max(...valid.map(e=>e.timeMs));const minBucket=Math.floor((minTs/1000)/intervalSec)*intervalSec;const maxBucket=Math.ceil((maxTs/1000)/intervalSec)*intervalSec;const vuChanges=valid.filter(e=>e.type==='vu_change'&&e.rawMsg&&typeof e.rawMsg==='object'&&typeof e.rawMsg.activeVUs==='number').sort((a,b)=>a.timeMs-b.timeMs);let currentVu=0;if(vuChanges.length){const first=vuChanges[0].rawMsg;currentVu=typeof first.previousActiveVUs==='number'?first.previousActiveVUs:(first.activeVUs||0);}const out=[];let vuIdx=0;for(let b=minBucket;b<=maxBucket;b+=intervalSec){const bucketStart=b*1000;const bucketEnd=(b+intervalSec)*1000-1;while(vuIdx<vuChanges.length&&vuChanges[vuIdx].timeMs<=bucketEnd){const nextVu=Number(vuChanges[vuIdx].rawMsg.activeVUs);if(Number.isFinite(nextVu))currentVu=nextVu;vuIdx++;}out.push({x:bucketStart,y:currentVu});}return {series:out,start:minBucket*1000,end:maxBucket*1000};}

function buildGraphSeries(entries){graphState.sourceEvents=entries||[];const valid=graphState.sourceEvents.filter(e=>e&&e.timeMs!=null);if(!valid.length){graphState.fullStart=null;graphState.fullEnd=null;graphState.viewStart=null;graphState.viewEnd=null;graphState.tpsSeries=[];graphState.avgRtSeries=[];graphState.vuSeries=[];graphState.tpsAnoms=[];graphState.avgRtAnoms=[];graphState.vuAnoms=[];graphState.tpsEndpointCounts=new Map();graphState.avgRtEndpointCounts=new Map();graphState.selectedTpsKeys=new Set();graphState.selectedAvgRtKeys=new Set();graphState.allowEmptyTpsSelection=false;graphState.allowEmptyAvgRtSelection=false;renderTpsEndpointPicker();renderAvgRtEndpointPicker();return;}graphState.tpsIntervalSec=Math.max(1,Number(tpsIntervalSelect.value||'1'));graphState.avgRtIntervalSec=Math.max(1,Number(avgRtIntervalSelect.value||'1'));graphState.vuIntervalSec=Math.max(1,Number(vuIntervalSelect.value||'1'));graphState.tpsRateThreshold=Math.max(0.5,Number(tpsThresholdSlider.value||'5'));graphState.avgRtRateThreshold=Math.max(10,Number(avgRtThresholdSlider.value||'100'));graphState.vuRateThreshold=Math.max(0.1,Number(vuThresholdSlider.value||'0.5'));tpsThresholdValue.innerText=f(graphState.tpsRateThreshold,1);avgRtThresholdValue.innerText=f(graphState.avgRtRateThreshold,1);vuThresholdValue.innerText=f(graphState.vuRateThreshold,1);const nextCounts=buildTpsEndpointCounts(valid);const prevSelected=graphState.selectedTpsKeys;graphState.tpsEndpointCounts=nextCounts;graphState.selectedTpsKeys=new Set([...prevSelected].filter(k=>nextCounts.has(k)));if(graphState.selectedTpsKeys.size===0&&nextCounts.size>0&&!graphState.allowEmptyTpsSelection){graphState.selectedTpsKeys=new Set(nextCounts.keys());}renderTpsEndpointPicker();const nextAvgCounts=buildAvgRtEndpointCounts(valid);const prevAvgSelected=graphState.selectedAvgRtKeys;graphState.avgRtEndpointCounts=nextAvgCounts;graphState.selectedAvgRtKeys=new Set([...prevAvgSelected].filter(k=>nextAvgCounts.has(k)));if(graphState.selectedAvgRtKeys.size===0&&nextAvgCounts.size>0&&!graphState.allowEmptyAvgRtSelection){graphState.selectedAvgRtKeys=new Set(nextAvgCounts.keys());}renderAvgRtEndpointPicker();const tps=buildTpsSeries(valid,graphState.tpsIntervalSec);const avgRt=buildAvgRtSeries(valid,graphState.avgRtIntervalSec);const vu=buildVuSeries(valid,graphState.vuIntervalSec);const fullStart=Math.min(tps.start,avgRt.start,vu.start);const fullEnd=Math.max(tps.end,avgRt.end,vu.end);const shouldResetView=graphState.fullStart==null||graphState.fullEnd==null||graphState.viewStart==null||graphState.viewEnd==null||graphState.viewStart<fullStart||graphState.viewEnd>fullEnd;graphState.fullStart=fullStart;graphState.fullEnd=fullEnd;if(shouldResetView){graphState.viewStart=graphState.fullStart;graphState.viewEnd=graphState.fullEnd;}graphState.tpsSeries=tps.series;graphState.avgRtSeries=avgRt.series;graphState.vuSeries=vu.series;graphState.tpsAnoms=detectTpsAnomalies(graphState.tpsSeries,graphState.tpsRateThreshold,graphState.tpsIntervalSec);graphState.avgRtAnoms=detectTpsAnomalies(graphState.avgRtSeries,graphState.avgRtRateThreshold,graphState.avgRtIntervalSec);graphState.vuAnoms=detectVuAnomalies(graphState.vuSeries,graphState.vuRateThreshold,graphState.vuIntervalSec);}

function renderAnomalyList(el,items,unit){if(!items.length){el.innerHTML='<span class="anomaly-item">No notable short-period spikes/drops</span>';return;}el.innerHTML=items.slice(0,10).map(a=>'<span class="anomaly-item '+a.kind+'">'+a.kind.toUpperCase()+' @ '+fmtTime(a.x)+' | '+(a.delta>0?'+':'')+f(a.delta,2)+' '+unit+' ('+f(a.rate,2)+' '+unit+'/s)</span>').join('');}

function drawChart(canvas,series,anoms,color,yLabel,rangeEl,anomalyEl,intervalSec){const sz=normalizeCanvasSize(canvas);const ctx=sz.ctx,w=sz.w,h=sz.h;ctx.clearRect(0,0,w,h);const m={left:52,right:w-14,top:16,bottom:h-30,viewStart:graphState.viewStart,viewEnd:graphState.viewEnd};graphMeta.set(canvas,m);ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#e5e7eb';ctx.strokeRect(0.5,0.5,w-1,h-1);if(graphState.viewStart==null||graphState.viewEnd==null||!series.length||m.right<=m.left){rangeEl.innerText='No data';renderAnomalyList(anomalyEl,[],yLabel);return;}const visible=series.filter(p=>p.x>=graphState.viewStart&&p.x<=graphState.viewEnd).sort((a,b)=>a.x-b.x);if(!visible.length){rangeEl.innerText='No points in selected range';renderAnomalyList(anomalyEl,[],yLabel);return;}const maxY=Math.max(1,...visible.map(p=>p.y));const minY=0;const toPoint=p=>({x:tsToX(p.x,m),y:m.bottom-((p.y-minY)/Math.max(1,maxY-minY))*(m.bottom-m.top),v:p.y,t:p.x});const points=visible.map(toPoint);ctx.strokeStyle='#e5e7eb';ctx.fillStyle='#6b7280';ctx.font='11px "Fira Code",Consolas,monospace';for(let i=0;i<=4;i++){const y=m.bottom-((m.bottom-m.top)*i/4);ctx.beginPath();ctx.moveTo(m.left,y);ctx.lineTo(m.right,y);ctx.stroke();const val=minY+((maxY-minY)*i/4);ctx.fillText(f(val,2),6,y+4);}for(let i=0;i<=4;i++){const x=m.left+((m.right-m.left)*i/4);ctx.beginPath();ctx.moveTo(x,m.top);ctx.lineTo(x,m.bottom);ctx.stroke();const t=graphState.viewStart+((graphState.viewEnd-graphState.viewStart)*i/4);ctx.fillText(fmtTime(t),x-24,h-10);}ctx.save();ctx.strokeStyle=color;ctx.globalAlpha=.72;ctx.lineWidth=1.7;ctx.beginPath();points.forEach((p,i)=>{if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});ctx.stroke();ctx.restore();ctx.save();ctx.fillStyle=color;ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;points.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,3.2,0,Math.PI*2);ctx.fill();ctx.stroke();});ctx.restore();const visibleAnoms=anoms.filter(a=>a.x>=graphState.viewStart&&a.x<=graphState.viewEnd);visibleAnoms.forEach(a=>{const x=tsToX(a.x,m);const y=m.bottom-((a.value-minY)/Math.max(1,maxY-minY))*(m.bottom-m.top);ctx.fillStyle=a.kind==='spike'?'#16a34a':'#dc2626';ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();ctx.stroke();});if(graphState.dragging&&graphState.dragCanvas===canvas){const x1=clamp(graphState.dragStartX,m.left,m.right);const x2=clamp(graphState.dragEndX,m.left,m.right);const l=Math.min(x1,x2),r=Math.max(x1,x2);ctx.fillStyle='rgba(59,130,246,0.18)';ctx.fillRect(l,m.top,r-l,m.bottom-m.top);ctx.strokeStyle='rgba(59,130,246,0.8)';ctx.strokeRect(l,m.top,r-l,m.bottom-m.top);}rangeEl.innerText=fmtTime(graphState.viewStart)+' -> '+fmtTime(graphState.viewEnd)+' | interval '+intervalSec+'s | max '+yLabel+': '+f(maxY,2)+' | points '+visible.length;renderAnomalyList(anomalyEl,visibleAnoms,yLabel);}

function drawGraphs(){drawChart(tpsCanvas,graphState.tpsSeries,graphState.tpsAnoms,'#0369a1','TPS',tpsRange,tpsAnomaly,graphState.tpsIntervalSec);drawChart(avgRtCanvas,graphState.avgRtSeries,graphState.avgRtAnoms,'#ea580c','ms',avgRtRange,avgRtAnomaly,graphState.avgRtIntervalSec);drawChart(vuCanvas,graphState.vuSeries,graphState.vuAnoms,'#7c3aed','VU',vuRange,vuAnomaly,graphState.vuIntervalSec);}

function bindChartZoom(canvas){canvas.addEventListener('mousedown',(ev)=>{const meta=graphMeta.get(canvas);if(!meta)return;const rect=canvas.getBoundingClientRect();const x=ev.clientX-rect.left;if(x<meta.left||x>meta.right)return;graphState.dragging=true;graphState.dragCanvas=canvas;graphState.dragStartX=x;graphState.dragEndX=x;drawGraphs();});canvas.addEventListener('mousemove',(ev)=>{if(!graphState.dragging||graphState.dragCanvas!==canvas)return;const meta=graphMeta.get(canvas);if(!meta)return;const rect=canvas.getBoundingClientRect();graphState.dragEndX=clamp(ev.clientX-rect.left,meta.left,meta.right);drawGraphs();});window.addEventListener('mouseup',()=>{if(!graphState.dragging||graphState.dragCanvas!==canvas)return;const meta=graphMeta.get(canvas);graphState.dragging=false;if(!meta){graphState.dragCanvas=null;return;}const x1=clamp(graphState.dragStartX,meta.left,meta.right);const x2=clamp(graphState.dragEndX,meta.left,meta.right);graphState.dragCanvas=null;if(Math.abs(x2-x1)<8){drawGraphs();return;}const startTs=xToTs(Math.min(x1,x2),meta);const endTs=xToTs(Math.max(x1,x2),meta);if(endTs-startTs<1000){drawGraphs();return;}graphState.viewStart=Math.max(graphState.fullStart,startTs);graphState.viewEnd=Math.min(graphState.fullEnd,endTs);persistGraphState();drawGraphs();});}

bindChartZoom(tpsCanvas);bindChartZoom(avgRtCanvas);bindChartZoom(vuCanvas);

graphReset.onclick=()=>{if(graphState.fullStart==null||graphState.fullEnd==null)return;graphState.viewStart=graphState.fullStart;graphState.viewEnd=graphState.fullEnd;saveState({graphViewStart:graphState.viewStart,graphViewEnd:graphState.viewEnd});drawGraphs();};

tpsIntervalSelect.value=String(graphState.tpsIntervalSec);avgRtIntervalSelect.value=String(graphState.avgRtIntervalSec);vuIntervalSelect.value=String(graphState.vuIntervalSec);if(tpsModeSelect)tpsModeSelect.value=graphState.tpsMode;if(avgRtModeSelect)avgRtModeSelect.value=graphState.avgRtMode;tpsThresholdSlider.value=String(graphState.tpsRateThreshold);avgRtThresholdSlider.value=String(graphState.avgRtRateThreshold);vuThresholdSlider.value=String(graphState.vuRateThreshold);

tpsIntervalSelect.onchange=()=>{graphState.tpsIntervalSec=Math.max(1,Number(tpsIntervalSelect.value||'1'));saveState({tpsIntervalSec:graphState.tpsIntervalSec});buildGraphSeries(graphState.sourceEvents);drawGraphs();};

avgRtIntervalSelect.onchange=()=>{graphState.avgRtIntervalSec=Math.max(1,Number(avgRtIntervalSelect.value||'1'));saveState({avgRtIntervalSec:graphState.avgRtIntervalSec});buildGraphSeries(graphState.sourceEvents);drawGraphs();};

vuIntervalSelect.onchange=()=>{graphState.vuIntervalSec=Math.max(1,Number(vuIntervalSelect.value||'1'));saveState({vuIntervalSec:graphState.vuIntervalSec});buildGraphSeries(graphState.sourceEvents);drawGraphs();};

if(tpsModeSelect)tpsModeSelect.onchange=()=>{graphState.tpsMode=String(tpsModeSelect.value||'attempts');saveState({tpsMode:graphState.tpsMode});buildGraphSeries(graphState.sourceEvents);drawGraphs();};

if(avgRtModeSelect)avgRtModeSelect.onchange=()=>{graphState.avgRtMode=String(avgRtModeSelect.value||'attempts');saveState({avgRtMode:graphState.avgRtMode});buildGraphSeries(graphState.sourceEvents);drawGraphs();};

tpsThresholdSlider.oninput=()=>{graphState.tpsRateThreshold=Math.max(0.5,Number(tpsThresholdSlider.value||'5'));tpsThresholdValue.innerText=f(graphState.tpsRateThreshold,1);saveState({tpsRateThreshold:graphState.tpsRateThreshold});graphState.tpsAnoms=detectTpsAnomalies(graphState.tpsSeries,graphState.tpsRateThreshold,graphState.tpsIntervalSec);drawGraphs();};

avgRtThresholdSlider.oninput=()=>{graphState.avgRtRateThreshold=Math.max(10,Number(avgRtThresholdSlider.value||'100'));avgRtThresholdValue.innerText=f(graphState.avgRtRateThreshold,1);saveState({avgRtRateThreshold:graphState.avgRtRateThreshold});graphState.avgRtAnoms=detectTpsAnomalies(graphState.avgRtSeries,graphState.avgRtRateThreshold,graphState.avgRtIntervalSec);drawGraphs();};

vuThresholdSlider.oninput=()=>{graphState.vuRateThreshold=Math.max(0.1,Number(vuThresholdSlider.value||'0.5'));vuThresholdValue.innerText=f(graphState.vuRateThreshold,1);saveState({vuRateThreshold:graphState.vuRateThreshold});graphState.vuAnoms=detectVuAnomalies(graphState.vuSeries,graphState.vuRateThreshold,graphState.vuIntervalSec);drawGraphs();};

window.addEventListener('resize',()=>drawGraphs());

function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=()=>resolve();s.onerror=()=>reject(new Error('script load fail'));document.head.appendChild(s);});}

function persistGraphState(){saveState({graphViewStart:graphState.viewStart,graphViewEnd:graphState.viewEnd,selectedTpsKeys:[...graphState.selectedTpsKeys],selectedAvgRtKeys:[...graphState.selectedAvgRtKeys],tpsMode:graphState.tpsMode,avgRtMode:graphState.avgRtMode,tpsIntervalSec:graphState.tpsIntervalSec,avgRtIntervalSec:graphState.avgRtIntervalSec,vuIntervalSec:graphState.vuIntervalSec,tpsRateThreshold:graphState.tpsRateThreshold,avgRtRateThreshold:graphState.avgRtRateThreshold,vuRateThreshold:graphState.vuRateThreshold});}

async function loadRawLogs(){let raw=[];if(Array.isArray(window.__RAW_LOG_DATA__)){raw=window.__RAW_LOG_DATA__;}else{try{const resp=await fetch('error_log.raw.json',{cache:'no-store'});if(!resp.ok)throw new Error('HTTP '+resp.status);raw=await resp.json();}catch(_){try{await loadScript('error_log.raw.js');if(Array.isArray(window.__RAW_LOG_DATA__))raw=window.__RAW_LOG_DATA__;}catch(_e){raw=[];}}}return Array.isArray(raw)?raw:[];}

async function initLogs(){const raw=await loadRawLogs();if(!Array.isArray(raw)||!raw.length&&!(Array.isArray(raw))){body.innerHTML='<tr><td colspan=\"9\">Failed to load log data. Ensure error_log.raw.json or error_log.raw.js is in the same folder.</td></tr>';document.getElementById('log-count').innerText='0 items';buildGraphSeries([]);drawGraphs();return;}logEvents=normalizeLog(raw);fillFilters();if(savedState.logSearch!=null)lq.value=savedState.logSearch;if(savedState.logDeepSearch!=null)ldq.value=savedState.logDeepSearch;if(savedState.logLevel!=null)lvl.value=savedState.logLevel;if(savedState.logType!=null)typ.value=savedState.logType;if(savedState.logEndpoint!=null)endp.value=savedState.logEndpoint;if(savedState.logStatus!=null)st.value=savedState.logStatus;if(savedState.logErrorsOnly!=null)err.checked=!!savedState.logErrorsOnly;applyLogFilters(false);buildGraphSeries(logEvents);persistGraphState();drawGraphs();}

let livePollTimer=null;let lastLiveTotal=null;

function updateLiveLogIndicator(hasPending,completed){if(!logLiveStatus)return;const activePanel=document.querySelector('.tab.active')?.dataset.panel||'overview';logRefresh.style.display=window.__UK6_LIVE__&&activePanel==='logs'?'':'none';if(completed){logLiveStatus.innerText='Run completed';return;}if(activePanel!=='logs'){logLiveStatus.innerText='';return;}if(hasPending){logLiveStatus.innerText='New logs available';}else if(window.__UK6_LIVE__){logLiveStatus.innerText='Live logs paused';}else{logLiveStatus.innerText='';}}

function triggerLiveReload(){persistOverviewState();persistGraphState();saveState({activePanel:document.querySelector('.tab.active')?.dataset.panel||'overview',logPage:currentPage,logSearch:lq.value,logDeepSearch:ldq.value,logLevel:lvl.value,logType:typ.value,logEndpoint:endp.value,logStatus:st.value,logErrorsOnly:!!err.checked});window.location.reload();}

async function pollLive(){if(!window.__UK6_LIVE__)return;try{const resp=await fetch(window.__UK6_LIVE__.statusUrl,{cache:'no-store'});if(!resp.ok)throw new Error('HTTP '+resp.status);const status=await resp.json();if(lastLiveTotal==null)lastLiveTotal=Number(status&&status.totalEvents||0);const nextTotal=Number(status&&status.totalEvents||0);const changed=nextTotal!==lastLiveTotal;if(changed){lastLiveTotal=nextTotal;const activePanel=document.querySelector('.tab.active')?.dataset.panel||'overview';if(activePanel==='logs'){pendingLogEvents=true;updateLiveLogIndicator(true,!!status.completed);}else{triggerLiveReload();return;}}if(status&&status.completed){updateLiveLogIndicator(!!pendingLogEvents,true);return;}updateLiveLogIndicator(!!pendingLogEvents,false);livePollTimer=setTimeout(pollLive,1000);}catch(_){livePollTimer=setTimeout(pollLive,1500);}}

if(logRefresh)logRefresh.onclick=()=>{pendingLogEvents=false;updateLiveLogIndicator(false,false);triggerLiveReload();};

// Force default toggle state (avoid browser form state restore).

toggles.forEach(c=>{const def=c.getAttribute('data-default-enabled');if(def==='0')c.checked=false;else if(def==='1')c.checked=true;});

if(Array.isArray(savedState.selectedApiKeys)){const selectedApiKeys=new Set(savedState.selectedApiKeys.map(v=>String(v)));toggles.forEach(c=>{c.checked=selectedApiKeys.has(String(c.dataset.apiKey||''));});}

if(savedState.apiSearch!=null&&apiSearchInput)apiSearchInput.value=String(savedState.apiSearch);

restoreCheckedValues(tpsPassStatusToggles,'status',savedState.tpsPassedStatuses);

if(savedState.errorMode!=null&&errorModeSelect&&[...errorModeSelect.options].some(opt=>opt.value===savedState.errorMode))errorModeSelect.value=String(savedState.errorMode);

restoreCheckedValues(errorStatusToggles,'status',savedState.errorStatuses);

applyOverviewSearch();

updateOverview();setActivePanel(savedState.activePanel||'overview');initLogs().then(()=>{if(window.__UK6_LIVE__)pollLive();});

</script></body></html>`;

}

