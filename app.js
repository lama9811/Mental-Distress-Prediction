/* ==================================================================
   WELLBEING — App glue
   Pipes: state picker → input prefill → linear model → result card
                                                     ↘ SVG choropleth
   ================================================================== */

/* -------- Locked model coefficients (state-level OLS, notebook) -- */
const MODEL = Object.freeze({
  intercept: 6.162857696868079,
  depCoef:   0.31342386,
  finCoef:   0.27670656,
});

const predict = (dep, fin) =>
  MODEL.intercept + MODEL.depCoef * dep + MODEL.finCoef * fin;

/* national mean of CDC-actual mental distress, for vs.-avg display */
const US_AVG_ACTUAL = (() => {
  const vs = STATES.map(s => s.distress_actual);
  return vs.reduce((a, b) => a + b, 0) / vs.length;
})();

const DEFAULT_ABBR = 'MD';

/* -------- DOM refs ------------------------------------------------ */
const $select   = document.getElementById('state-select');
const $display  = document.getElementById('state-display');
const $depInput = document.getElementById('depression');
const $finInput = document.getElementById('financial');
const $depOut   = document.getElementById('depression-out');
const $finOut   = document.getElementById('financial-out');
const $pred     = document.getElementById('prediction');
const $actual   = document.getElementById('actual-out');
const $resid    = document.getElementById('residual-out');
const $vsavg    = document.getElementById('vsavg-out');
const $reset    = document.getElementById('reset-state');
const $boardHi  = document.getElementById('board-high');
const $boardLo  = document.getElementById('board-low');
const $mapLabel = document.getElementById('map-selected-label');
const $mapMount = document.getElementById('cartogram');

/* -------- Populate <select> with all 51 entries ------------------- */
(function populateSelect() {
  const frag = document.createDocumentFragment();
  for (const s of STATES) {
    const opt = document.createElement('option');
    opt.value = s.abbr;
    opt.textContent = s.name;
    if (s.abbr === DEFAULT_ABBR) opt.selected = true;
    frag.appendChild(opt);
  }
  $select.appendChild(frag);
})();

/* -------- Predicted-by-state cache ------------------------------- */
const PREDICTED = new Map();
for (const s of STATES) {
  PREDICTED.set(s.abbr, predict(s.depression, s.financial_threat));
}

/* -------- Leaderboards ------------------------------------------- */
function renderBoards() {
  const ranked = [...STATES]
    .map(s => ({ ...s, predicted: PREDICTED.get(s.abbr) }))
    .sort((a, b) => b.predicted - a.predicted);

  const top = ranked.slice(0, 6);
  const bottom = ranked.slice(-6).reverse();

  $boardHi.classList.add('board--high');
  $boardLo.classList.add('board--low');
  $boardHi.replaceChildren(...top.map((s, i) => makeBoardRow(s, i)));
  $boardLo.replaceChildren(...bottom.map((s, i) => makeBoardRow(s, i)));
}

function makeBoardRow(s, i) {
  const li = document.createElement('li');
  li.className = 'board__row';
  li.dataset.abbr = s.abbr;

  const rank = document.createElement('span');
  rank.className = 'board__rank';
  rank.textContent = (i + 1).toString().padStart(2, '0');

  const nameWrap = document.createElement('span');
  const name = document.createElement('span');
  name.className = 'board__name';
  name.textContent = s.name;
  nameWrap.appendChild(name);
  if (s.imputed && s.imputed.length) {
    const dot = document.createElement('span');
    dot.className = 'board__abbr';
    dot.style.cssText = 'margin-left:6px;color:#b8a86a';
    dot.title = 'Some fields imputed (CDC data unavailable)';
    dot.textContent = '·';
    nameWrap.appendChild(dot);
  }

  const abbr = document.createElement('span');
  abbr.className = 'board__abbr';
  abbr.textContent = s.abbr;

  const val = document.createElement('span');
  val.className = 'board__value';
  val.textContent = `${s.predicted.toFixed(2)}%`;

  li.append(rank, nameWrap, abbr, val);
  li.addEventListener('click', () => {
    $select.value = s.abbr;
    onStatePick();
  });
  return li;
}

/* -------- Tweened predicted-value display ------------------------ */
let tweenFrom = parseFloat($pred.textContent) || 15.95;
let tweenTo = tweenFrom;
let tweenStart = performance.now();
const TWEEN_MS = 320;
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

function startTween(target) {
  tweenFrom = parseFloat($pred.textContent) || tweenTo;
  tweenTo   = target;
  tweenStart = performance.now();
  requestAnimationFrame(tweenStep);
}
function tweenStep(now) {
  const t = Math.min(1, (now - tweenStart) / TWEEN_MS);
  const v = tweenFrom + (tweenTo - tweenFrom) * easeOutCubic(t);
  $pred.textContent = v.toFixed(2);
  if (t < 1) requestAnimationFrame(tweenStep);
}

/* -------- Recompute outputs from current inputs ------------------ */
function recompute() {
  const dep = parseFloat($depInput.value);
  const fin = parseFloat($finInput.value);
  const pred = predict(dep, fin);

  $depOut.textContent = dep.toFixed(1);
  $finOut.textContent = fin.toFixed(1);

  startTween(pred);

  const abbr = $select.value;
  const state = STATES_BY_ABBR[abbr];
  if (state) {
    $actual.textContent = state.distress_actual.toFixed(1);
    const resid = pred - state.distress_actual;
    $resid.textContent = `${resid >= 0 ? '+' : ''}${resid.toFixed(2)}`;
  }
  const vs = pred - US_AVG_ACTUAL;
  $vsavg.textContent = `${vs >= 0 ? '+' : ''}${vs.toFixed(2)}`;

  if ($mapLabel && state) {
    $mapLabel.textContent = `${state.name} — ${pred.toFixed(2)}%`;
  }

  if (typeof refreshMapColors === 'function') refreshMapColors();
}

/* -------- Apply a state's CDC values to the inputs --------------- */
function applyState(abbr) {
  const s = STATES_BY_ABBR[abbr];
  if (!s) return;

  const dep = clamp(s.depression,       +$depInput.min, +$depInput.max);
  const fin = clamp(s.financial_threat, +$finInput.min, +$finInput.max);

  $depInput.value = dep.toFixed(1);
  $finInput.value = fin.toFixed(1);

  if ($display) $display.textContent = s.name;

  recompute();
}

function onStatePick() {
  applyState($select.value);
  if (typeof highlightSelected === 'function') highlightSelected($select.value);
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/* -------- Wire events --------------------------------------------- */
$select.addEventListener('change', onStatePick);
$depInput.addEventListener('input', recompute);
$finInput.addEventListener('input', recompute);
$reset.addEventListener('click',  onStatePick);

/* -------- Initial paint ------------------------------------------- */
renderBoards();
applyState(DEFAULT_ABBR);

/* ==================================================================
   Choropleth map (d3 + us-atlas topojson)
   ================================================================== */
const FIPS_TO_ABBR = {
  '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT',
  '10':'DE','11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL',
  '18':'IN','19':'IA','20':'KS','21':'KY','22':'LA','23':'ME','24':'MD',
  '25':'MA','26':'MI','27':'MN','28':'MS','29':'MO','30':'MT','31':'NE',
  '32':'NV','33':'NH','34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND',
  '39':'OH','40':'OK','41':'OR','42':'PA','44':'RI','45':'SC','46':'SD',
  '47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA','54':'WV',
  '55':'WI','56':'WY',
};

const DISTRESS_MIN = 13.0;
const DISTRESS_MAX = 22.0;

/* sage → mustard → wine — matches the legend bar gradient */
function rampColor(t) {
  t = Math.max(0, Math.min(1, t));
  const stops = [
    [0.00, [ 61, 107,  61]],
    [0.50, [185, 168,  90]],
    [1.00, [142,  42,  35]],
  ];
  let a = stops[0], b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i+1][0]) { a = stops[i]; b = stops[i+1]; break; }
  }
  const u = (t - a[0]) / (b[0] - a[0]);
  const c = [0,1,2].map(k => Math.round(a[1][k] + (b[1][k] - a[1][k]) * u));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function distressToColor(distress) {
  const t = (distress - DISTRESS_MIN) / (DISTRESS_MAX - DISTRESS_MIN);
  return rampColor(t);
}

let _selectedPath = null;

async function mountChoropleth() {
  if (typeof d3 === 'undefined' || typeof topojson === 'undefined') {
    console.warn('[wellbeing] d3/topojson missing — map skipped.');
    return;
  }

  const us = await d3.json('https://unpkg.com/us-atlas@3/states-10m.json');
  const features = topojson.feature(us, us.objects.states).features;

  const mount = $mapMount;
  const tooltip = document.getElementById('map-tooltip');

  const draw = () => {
    const w = mount.clientWidth;
    const h = mount.clientHeight;

    const projection = d3.geoAlbersUsa().fitSize([w - 20, h - 20], { type: 'FeatureCollection', features });
    projection.translate([w / 2, h / 2]);
    const path = d3.geoPath(projection);

    const old = mount.querySelector('svg');
    if (old) old.remove();

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    features.forEach(f => {
      const fips = String(f.id).padStart(2, '0');
      const abbr = FIPS_TO_ABBR[fips];
      if (!abbr) return;
      const state = STATES_BY_ABBR[abbr];
      const pred = PREDICTED.get(abbr) ?? (state && state.distress_actual) ?? 16;

      const el = document.createElementNS(svgNS, 'path');
      el.setAttribute('d', path(f));
      el.setAttribute('fill', distressToColor(pred));
      el.setAttribute('class', 'state-path');
      el.dataset.abbr = abbr;
      el.dataset.pred = pred.toFixed(2);

      el.addEventListener('pointerenter', () => {
        if (!state) return;
        tooltip.hidden = false;
        tooltip.replaceChildren();
        const name = document.createElement('strong');
        name.textContent = state.name;
        const line = document.createElement('span');
        line.textContent = `Predicted ${pred.toFixed(2)}%  ·  CDC ${state.distress_actual.toFixed(2)}%`;
        tooltip.append(name, line);
      });
      el.addEventListener('pointermove', (e) => {
        const rect = mount.getBoundingClientRect();
        tooltip.style.left = `${e.clientX - rect.left}px`;
        tooltip.style.top  = `${e.clientY - rect.top  - 6}px`;
      });
      el.addEventListener('pointerleave', () => { tooltip.hidden = true; });
      el.addEventListener('click', () => {
        $select.value = abbr;
        onStatePick();
      });

      svg.appendChild(el);
    });

    /* DC marker — emphasize tiny polygon with a ring */
    const dcFeature = features.find(f => String(f.id).padStart(2,'0') === '11');
    if (dcFeature) {
      const [dx, dy] = path.centroid(dcFeature);
      if (isFinite(dx) && isFinite(dy)) {
        const ring = document.createElementNS(svgNS, 'circle');
        ring.setAttribute('cx', dx); ring.setAttribute('cy', dy);
        ring.setAttribute('r', 6);
        ring.setAttribute('class', 'dc-spot');
        svg.appendChild(ring);
      }
    }

    mount.appendChild(svg);
    highlightSelected($select.value);
  };

  draw();
  const ro = new ResizeObserver(() => draw());
  ro.observe(mount);
}

function highlightSelected(abbr) {
  if (_selectedPath) _selectedPath.classList.remove('is-selected');
  const next = document.querySelector(`.state-path[data-abbr="${abbr}"]`);
  if (next) { next.classList.add('is-selected'); _selectedPath = next; }
}

function refreshMapColors() {
  document.querySelectorAll('.state-path').forEach(p => {
    const a = p.dataset.abbr;
    if (a === $select.value) {
      const dep = parseFloat($depInput.value);
      const fin = parseFloat($finInput.value);
      const pred = predict(dep, fin);
      p.setAttribute('fill', distressToColor(pred));
      p.dataset.pred = pred.toFixed(2);
    }
  });
}

mountChoropleth().then(() => {
  highlightSelected($select.value);
});
