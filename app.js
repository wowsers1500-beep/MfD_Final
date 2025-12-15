/* app.js — Interactive MSE graphs (no frameworks) */
const svg = document.getElementById('graph');
const qSelect = document.getElementById('qSelect');
const equationDiv = document.getElementById('equation');
const revealBtn = document.getElementById('revealBtn');
const solutionDiv = document.getElementById('solution');
const tooltip = document.getElementById('tooltip');
const questionText = document.getElementById('questionText');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pointControls = document.getElementById('pointControls');

// Question data: first 3 have 3 points, last 2 have 4 points
const questions = [
  {
    id:1,
    title:'Q1 — Horizontal (3 pts)',
    model:{type:'horizontal', c:-1},
    pts:[{x:0,y:-2.2},{x:1,y:1.0},{x:2,y:-0.2}],
    text:'Compute the MSE of the model y = -1 for the plotted points.'
  },
  {
    id:2,
    title:'Q2 — Linear (3 pts)',
    model:{type:'linear', m:0.5, b:1},
    pts:[{x:0,y:2.0},{x:2,y:0.8},{x:4,y:4.8}],
    text:'Compute the MSE of the model y = 0.5x + 1 for the plotted points.'
  },
  {
    id:3,
    title:'Q3 — Linear (4 pts)',
    model:{type:'linear', m:-0.8, b:3},
    pts:[{x:0,y:4.0},{x:1,y:0.8},{x:2,y:2.5},{x:3,y:0.0}],
    text:'Compute the MSE of the model y = -0.8x + 3 for the plotted points.'
  },
  {
    id:4,
    title:'Q4 — Parabola (4 pts)',
    model:{type:'parabola', a:0.5, b:-1, c:1},
    pts:[{x:-1,y:4.0},{x:0,y:-0.5},{x:1,y:1.8},{x:2,y:4.5}],
    text:'Compute the MSE of the model y = 0.5x^2 - x + 1 for the plotted points.'
  }
];

let currentIndex = 0;
let solutionShown = false;

function init(){
  questions.forEach((q,i)=>{
    const opt = document.createElement('option');
    opt.value = i; opt.textContent = q.title;
    qSelect.appendChild(opt);
  });
  qSelect.addEventListener('change', ()=>{currentIndex = Number(qSelect.value); renderCurrent();});
  prevBtn.addEventListener('click',()=>{currentIndex = Math.max(0,currentIndex-1); qSelect.value=currentIndex; renderCurrent();});
  nextBtn.addEventListener('click',()=>{currentIndex = Math.min(questions.length-1,currentIndex+1); qSelect.value=currentIndex; renderCurrent();});
  revealBtn.addEventListener('click', toggleReveal);
  qSelect.value = 0;
  renderCurrent();
}

// Coordinate mapping
function getRange(pts){
  const xs = pts.map(p=>p.x); const ys = pts.map(p=>p.y);
  const minX = Math.min(...xs)-1; const maxX = Math.max(...xs)+1;
  const minY = Math.min(...ys)-1; const maxY = Math.max(...ys)+1;
  return {minX,maxX,minY,maxY};
}

function dataToSvg(x,y,range){
  const [W,H] = [600,400];
  const pad = 40;
  const sx = pad + ( (x - range.minX) / (range.maxX - range.minX) ) * (W - pad*2);
  const sy = pad + (1 - (y - range.minY) / (range.maxY - range.minY)) * (H - pad*2);
  return {sx,sy};
}

function clearSvg(){
  while(svg.firstChild) svg.removeChild(svg.firstChild);
}

function drawAxes(range){
  const [W,H] = [600,400];
  const pad = 40;
  // grid lines
  for(let i=0;i<=4;i++){
    const y = pad + i*(H - pad*2)/4;
    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1',pad); line.setAttribute('x2',W-pad);
    line.setAttribute('y1',y); line.setAttribute('y2',y);
    line.setAttribute('class','grid'); svg.appendChild(line);
  }
  // Y axis
  const ay = document.createElementNS('http://www.w3.org/2000/svg','line');
  ay.setAttribute('x1',40); ay.setAttribute('x2',40); ay.setAttribute('y1',10); ay.setAttribute('y2',390);
  ay.setAttribute('class','axis'); svg.appendChild(ay);
  // X axis
  const ax = document.createElementNS('http://www.w3.org/2000/svg','line');
  ax.setAttribute('x1',40); ax.setAttribute('x2',W-10); ax.setAttribute('y1',390); ax.setAttribute('y2',390);
  ax.setAttribute('class','axis'); svg.appendChild(ax);
  // Y axis ticks and labels
  for(let i=0;i<=4;i++){
    const val = range.maxY - (i/4)*(range.maxY - range.minY);
    const y = pad + i*(H - pad*2)/4;
    const tick = document.createElementNS('http://www.w3.org/2000/svg','line');
    tick.setAttribute('x1',35); tick.setAttribute('x2',40); tick.setAttribute('y1',y); tick.setAttribute('y2',y);
    tick.setAttribute('class','axis'); svg.appendChild(tick);
    const lbl = document.createElementNS('http://www.w3.org/2000/svg','text');
    lbl.setAttribute('x',30); lbl.setAttribute('y',y+4); lbl.setAttribute('text-anchor','end');
    lbl.setAttribute('class','axis-label');
    lbl.textContent = formatNum(val);
    svg.appendChild(lbl);
  }
  // X axis ticks and labels
  for(let i=0;i<=4;i++){
    const val = range.minX + (i/4)*(range.maxX - range.minX);
    const x = pad + i*(W - pad*2)/4;
    const tick = document.createElementNS('http://www.w3.org/2000/svg','line');
    tick.setAttribute('x1',x); tick.setAttribute('x2',x); tick.setAttribute('y1',390); tick.setAttribute('y2',395);
    tick.setAttribute('class','axis'); svg.appendChild(tick);
    const lbl = document.createElementNS('http://www.w3.org/2000/svg','text');
    lbl.setAttribute('x',x); lbl.setAttribute('y',410); lbl.setAttribute('text-anchor','middle');
    lbl.setAttribute('class','axis-label');
    lbl.textContent = formatNum(val);
    svg.appendChild(lbl);
  }
}

function drawModel(q,range){
  if(q.model.type === 'horizontal'){
    const y = q.model.c;
    const p1 = dataToSvg(range.minX,y,range);
    const p2 = dataToSvg(range.maxX,y,range);
    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1',p1.sx); line.setAttribute('y1',p1.sy);
    line.setAttribute('x2',p2.sx); line.setAttribute('y2',p2.sy);
    line.setAttribute('class','model'); svg.appendChild(line);
    return;
  }
  if(q.model.type === 'linear'){
    const f = (x)=> q.model.m*x + q.model.b;
    const p1 = dataToSvg(range.minX,f(range.minX),range);
    const p2 = dataToSvg(range.maxX,f(range.maxX),range);
    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1',p1.sx); line.setAttribute('y1',p1.sy);
    line.setAttribute('x2',p2.sx); line.setAttribute('y2',p2.sy);
    line.setAttribute('class','model'); svg.appendChild(line);
    return;
  }
  if(q.model.type === 'parabola'){
    const f = (x)=> q.model.a*x*x + q.model.b*x + q.model.c;
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    let d = '';
    const steps = 120;
    for(let i=0;i<=steps;i++){
      const x = range.minX + (i/steps)*(range.maxX-range.minX);
      const pt = dataToSvg(x,f(x),range);
      d += (i===0? 'M ':'L ') + pt.sx + ' ' + pt.sy + ' ';
    }
    path.setAttribute('d',d);
    path.setAttribute('class','model'); svg.appendChild(path);
  }
}

function drawPoints(q,range){
  q.pts.forEach((p,idx)=>{
    const {sx,sy} = dataToSvg(p.x,p.y,range);
    const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.setAttribute('cx',sx); c.setAttribute('cy',sy); c.setAttribute('r',6);
    c.setAttribute('class','point');
    c.dataset.x = p.x; c.dataset.y = p.y;
    c.addEventListener('mouseenter', (ev)=>{
      showTooltip(ev,`(${formatNum(p.x)}, ${formatNum(p.y)})`);
    });
    c.addEventListener('mousemove', (ev)=> showTooltip(ev,`(${formatNum(p.x)}, ${formatNum(p.y)})`));
    c.addEventListener('mouseleave', hideTooltip);
    svg.appendChild(c);
  });
}

function showTooltip(ev,text){
  tooltip.style.display='block'; tooltip.textContent = text;
  const rect = svg.getBoundingClientRect();
  tooltip.style.left = (ev.clientX - rect.left + 12) + 'px';
  tooltip.style.top = (ev.clientY - rect.top + 12) + 'px';
}

function hideTooltip(){ tooltip.style.display='none'; }

function renderCurrent(){
  const q = questions[currentIndex];
  equationDiv.textContent = formatEquation(q.model);
  questionText.textContent = q.text;
  solutionDiv.innerHTML = '';
  solutionShown = false;
  revealBtn.textContent = 'Reveal Answer';
  clearSvg();
  const range = getRange(q.pts);
  drawAxes(range);
  drawModel(q,range);
  drawPoints(q,range);
  renderPointControls(q);
}

function formatEquation(model){
  if(model.type==='horizontal') return `y = ${model.c}`;
  if(model.type==='linear') return `y = ${model.m}x + ${model.b}`;
  if(model.type==='parabola') return `y = ${model.a}x² ${model.b<0?'−':'+'} ${Math.abs(model.b)}x ${model.c<0?'−':'+'} ${Math.abs(model.c)}`;
}

function renderPointControls(q){
  pointControls.innerHTML = '';
  q.pts.forEach((p,idx)=>{
    const div = document.createElement('div');
    div.className = 'point-control';
    div.innerHTML = `
      <label>Point ${idx+1}</label>
      <div style="display:flex;gap:4px">
        <div style="flex:1">
          <small style="color:#999;font-size:11px">x</small>
          <input type="number" step="0.1" placeholder="x" value="${formatNum(p.x)}" data-idx="${idx}" data-coord="x">
        </div>
        <div style="flex:1">
          <small style="color:#999;font-size:11px">y</small>
          <input type="number" step="0.1" placeholder="y" value="${formatNum(p.y)}" data-idx="${idx}" data-coord="y">
        </div>
      </div>
    `;
    const inputs = div.querySelectorAll('input');
    inputs.forEach(inp=>{
      inp.addEventListener('change', onPointInputChange);
      inp.addEventListener('input', ()=>{
        if(solutionDiv.innerHTML !== '') updateLiveReveal();
      });
    });
    pointControls.appendChild(div);
  });
}

function onPointInputChange(ev){
  const idx = Number(ev.target.dataset.idx);
  const coord = ev.target.dataset.coord;
  const val = parseFloat(ev.target.value);
  if(!isNaN(val)){
    const q = questions[currentIndex];
    q.pts[idx][coord] = val;
    renderCurrent();
    if(solutionDiv.innerHTML !== '') updateLiveReveal();
  }
}

function revealSolution(){
  const q = questions[currentIndex];
  const rows = [];
  let sumSq = 0;
  q.pts.forEach((p,i)=>{
    const yhat = predict(q.model,p.x);
    const r = p.y - yhat;
    const r2 = r*r; sumSq += r2;
    rows.push({x:p.x,y:p.y,yhat, r, r2});
  });
  const mse = sumSq / q.pts.length;
  // Build HTML solution with better formatting
  let html = `<strong>Worked Solution</strong>`;
  html += `<div style="color:#666;font-size:13px;margin:8px 0">Model: <strong style="color:#111">${formatEquation(q.model)}</strong></div>`;
  html += `<table><thead><tr><th>x</th><th>y</th><th>ŷ</th><th>y - ŷ</th><th>(y - ŷ)²</th></tr></thead><tbody>`;
  rows.forEach(rw=>{
    html += `<tr><td>${formatNum(rw.x)}</td><td>${formatNum(rw.y)}</td><td>${formatNum(rw.yhat)}</td><td>${formatNum(rw.r)}</td><td>${formatNum(rw.r2)}</td></tr>`;
  });
  html += `</tbody></table>`;
  html += `<div style="background:#e8f2f9;padding:10px;border-radius:4px;margin-top:8px;border-left:4px solid var(--accent)">`;
  html += `<strong style="color:var(--accent)">MSE Calculation</strong><br>`;
  html += `<span style="color:#333;font-size:13px">Sum of squared residuals = ${formatNum(sumSq)}<br>`;
  html += `n = ${q.pts.length}<br>`;
  html += `<strong style="font-size:14px;color:var(--accent)">MSE = ${formatNum(sumSq)} / ${q.pts.length} = ${formatNum(mse)}</strong></span>`;
  html += `</div>`;
  solutionDiv.innerHTML = html;
  solutionShown = true;
  revealBtn.textContent = 'Hide Answer';
}

function toggleReveal(){
  if(solutionShown){
    solutionDiv.innerHTML = '';
    solutionShown = false;
    revealBtn.textContent = 'Reveal Answer';
  } else {
    revealSolution();
  }
}

function predict(model,x){
  if(model.type==='horizontal') return model.c;
  if(model.type==='linear') return model.m*x + model.b;
  if(model.type==='parabola') return model.a*x*x + model.b*x + model.c;
}

function formatNum(v){ return Number.isFinite(v) ? (Math.round(v*1000)/1000) : v; }

init();
