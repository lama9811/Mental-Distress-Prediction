/* WELLBEING — State poster model with a secondary county extension */
const MODELS = Object.freeze({
  state: Object.freeze({ intercept: 6.162857696868079, depCoef: 0.31342386, finCoef: 0.27670656 }),
  county: Object.freeze({ intercept: 5.270755185105916, depCoef: 0.36379008682090513, finCoef: 0.27627603774643467 }),
});
const predict = (mode, dep, fin) => MODELS[mode].intercept + MODELS[mode].depCoef * dep + MODELS[mode].finCoef * fin;
const DEFAULT_ABBR = 'MD';

const COUNTY_GROUPS = new Map();
for (const county of COUNTIES) {
  if (!COUNTY_GROUPS.has(county.abbr)) COUNTY_GROUPS.set(county.abbr, []);
  COUNTY_GROUPS.get(county.abbr).push(county);
}
for (const counties of COUNTY_GROUPS.values()) counties.sort((a, b) => a.name.localeCompare(b.name));
const COUNTY_STATE_NAMES = Object.freeze(Object.fromEntries(
  [...COUNTY_GROUPS.entries()].map(([abbr, counties]) => [abbr, counties[0].state])
));
const countyLabel = county => {
  const sameNameCount = COUNTY_GROUPS.get(county.abbr).filter(item => item.name === county.name).length;
  if (sameNameCount < 2) return county.name;
  return `${county.name} ${Number(county.id.slice(-3)) >= 500 ? 'city' : 'County'}`;
};

let currentMode = 'state';
let currentCountyId = COUNTY_GROUPS.get(DEFAULT_ABBR)?.[0]?.id || COUNTIES[0].id;
let selectedPath = null;
let redrawMap = null;

const $modeButtons = [...document.querySelectorAll('[data-mode]')];
const $scopeLabel = document.getElementById('forecaster-scope-label');
const $modeNote = document.getElementById('mode-note');
const $pickerStep = document.getElementById('picker-step');
const $select = document.getElementById('state-select');
const $countyPicker = document.getElementById('county-picker');
const $countySelect = document.getElementById('county-select');
const $display = document.getElementById('state-display');
const $helper = document.getElementById('state-helper');
const $depInput = document.getElementById('depression');
const $finInput = document.getElementById('financial');
const $depOut = document.getElementById('depression-out');
const $finOut = document.getElementById('financial-out');
const $finMax = document.getElementById('financial-max');
const $pred = document.getElementById('prediction');
const $actual = document.getElementById('actual-out');
const $resid = document.getElementById('residual-out');
const $vsavg = document.getElementById('vsavg-out');
const $equation = document.getElementById('result-equation');
const $reset = document.getElementById('reset-state');
const $boardHi = document.getElementById('board-high');
const $boardLo = document.getElementById('board-low');
const $boardHiTitle = document.getElementById('board-high-title');
const $boardLoTitle = document.getElementById('board-low-title');
const $burdenScopeLabel = document.getElementById('burden-scope-label');
const $mapLabel = document.getElementById('map-selected-label');
const $mapModeLabel = document.getElementById('map-mode-label');
const $mapCoverageNote = document.getElementById('map-coverage-note');
const $mapMount = document.getElementById('cartogram');

const STATE_PREDICTED = new Map(STATES.map(s => [s.abbr, predict('state', s.depression, s.financial_threat)]));

function populateStateSelect(preferredAbbr = DEFAULT_ABBR) {
  const available = currentMode === 'state'
    ? STATES.map(s => ({ abbr: s.abbr, name: s.name }))
    : [...COUNTY_GROUPS.keys()]
      .sort((a, b) => COUNTY_STATE_NAMES[a].localeCompare(COUNTY_STATE_NAMES[b]))
      .map(abbr => ({ abbr, name: COUNTY_STATE_NAMES[abbr] }));
  const selected = available.some(item => item.abbr === preferredAbbr) ? preferredAbbr : available[0].abbr;
  $select.replaceChildren(...available.map(item => {
    const option = document.createElement('option');
    option.value = item.abbr;
    option.textContent = item.name;
    option.selected = item.abbr === selected;
    return option;
  }));
  return selected;
}

function populateCountySelect(abbr, preferredId) {
  const counties = COUNTY_GROUPS.get(abbr) || [];
  const selected = counties.some(c => c.id === preferredId) ? preferredId : counties[0]?.id;
  $countySelect.replaceChildren(...counties.map(county => {
    const option = document.createElement('option');
    option.value = county.id;
    option.textContent = countyLabel(county);
    option.selected = county.id === selected;
    return option;
  }));
  $countySelect.disabled = counties.length === 0;
  currentCountyId = selected;
  return selected;
}

function renderBoards() {
  const countyMode = currentMode === 'county';
  const records = countyMode
    ? COUNTIES.map(county => ({ ...county, predicted: county.distress_predicted }))
    : STATES.map(state => ({ ...state, predicted: STATE_PREDICTED.get(state.abbr) }));
  const ranked = records
    .sort((a, b) => b.predicted - a.predicted);
  const scope = countyMode ? 'county' : 'state';
  $burdenScopeLabel.textContent = `${countyMode ? 'County' : 'State'}-level ranking`;
  $boardHiTitle.textContent = `Highest predicted ${scope} distress`;
  $boardLoTitle.textContent = `Lowest predicted ${scope} distress`;
  $boardHi.classList.add('board--high');
  $boardLo.classList.add('board--low');
  $boardHi.replaceChildren(...ranked.slice(0, 6).map((record, i) => makeBoardRow(record, i, countyMode)));
  $boardLo.replaceChildren(...ranked.slice(-6).reverse().map((record, i) => makeBoardRow(record, i, countyMode)));
}

function makeBoardRow(record, index, countyMode) {
  const row = document.createElement('li');
  row.className = 'board__row';
  row.dataset.abbr = record.abbr;
  if (countyMode) row.dataset.countyId = record.id;
  const rank = document.createElement('span');
  rank.className = 'board__rank';
  rank.textContent = (index + 1).toString().padStart(2, '0');
  const nameWrap = document.createElement('span');
  const name = document.createElement('span');
  name.className = 'board__name';
  name.textContent = countyMode ? countyLabel(record) : record.name;
  nameWrap.appendChild(name);
  if (record.imputed?.length) {
    const dot = document.createElement('span');
    dot.className = 'board__abbr';
    dot.style.cssText = 'margin-left:6px;color:#b8a86a';
    dot.title = 'Some fields imputed (CDC data unavailable)';
    dot.textContent = '·';
    nameWrap.appendChild(dot);
  }
  const abbr = document.createElement('span');
  abbr.className = 'board__abbr';
  abbr.textContent = record.abbr;
  const value = document.createElement('span');
  value.className = 'board__value';
  value.textContent = `${record.predicted.toFixed(2)}%`;
  row.append(rank, nameWrap, abbr, value);
  row.addEventListener('click', () => {
    $select.value = record.abbr;
    if (countyMode) {
      populateCountySelect(record.abbr, record.id);
      $countySelect.value = record.id;
      applyCounty(record.id);
      highlightSelected(record.id);
    } else {
      applyState(record.abbr);
      highlightSelected(record.abbr);
    }
  });
  return row;
}

let tweenFrom = parseFloat($pred.textContent) || 15.95;
let tweenTo = tweenFrom;
let tweenStart = performance.now();
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
function startTween(target) {
  tweenFrom = parseFloat($pred.textContent) || tweenTo;
  tweenTo = target;
  tweenStart = performance.now();
  requestAnimationFrame(tweenStep);
}
function tweenStep(now) {
  const t = Math.min(1, (now - tweenStart) / 320);
  $pred.textContent = (tweenFrom + (tweenTo - tweenFrom) * easeOutCubic(t)).toFixed(2);
  if (t < 1) requestAnimationFrame(tweenStep);
}

function activeRecord() {
  return currentMode === 'state' ? STATES_BY_ABBR[$select.value] : COUNTIES_BY_ID[currentCountyId];
}
function activeActualMean() {
  const records = currentMode === 'state' ? STATES : COUNTIES;
  return records.reduce((sum, record) => sum + record.distress_actual, 0) / records.length;
}
function recompute() {
  const dep = parseFloat($depInput.value);
  const fin = parseFloat($finInput.value);
  const prediction = predict(currentMode, dep, fin);
  const record = activeRecord();
  $depOut.textContent = dep.toFixed(1);
  $finOut.textContent = fin.toFixed(1);
  startTween(prediction);
  if (record) {
    $actual.textContent = record.distress_actual.toFixed(1);
    const residual = prediction - record.distress_actual;
    $resid.textContent = `${residual >= 0 ? '+' : ''}${residual.toFixed(2)}`;
    const label = currentMode === 'state' ? record.name : `${countyLabel(record)}, ${record.abbr}`;
    $mapLabel.textContent = `${label} — ${prediction.toFixed(2)}%`;
  }
  const versusAverage = prediction - activeActualMean();
  $vsavg.textContent = `${versusAverage >= 0 ? '+' : ''}${versusAverage.toFixed(2)}`;
  refreshSelectedMapColor(prediction);
}

function applyState(abbr) {
  const state = STATES_BY_ABBR[abbr];
  if (!state) return;
  $display.textContent = state.name;
  $depInput.value = clamp(state.depression, +$depInput.min, +$depInput.max).toFixed(1);
  $finInput.value = clamp(state.financial_threat, +$finInput.min, +$finInput.max).toFixed(1);
  recompute();
}
function applyCounty(id) {
  const county = COUNTIES_BY_ID[id];
  if (!county) return;
  currentCountyId = county.id;
  $display.textContent = countyLabel(county);
  $depInput.value = clamp(county.depression, +$depInput.min, +$depInput.max).toFixed(3);
  $finInput.value = clamp(county.financial_hardship, +$finInput.min, +$finInput.max).toFixed(3);
  recompute();
}

function setMode(mode) {
  if (!MODELS[mode]) return;
  const priorAbbr = $select.value || DEFAULT_ABBR;
  currentMode = mode;
  $modeButtons.forEach(button => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const abbr = populateStateSelect(priorAbbr);
  const countyMode = mode === 'county';
  $finInput.max = countyMode ? '40' : '22';
  $finMax.textContent = countyMode ? '40' : '22';
  $countyPicker.hidden = !countyMode;
  $scopeLabel.textContent = countyMode ? 'Choose a state and county' : 'Pick a state to begin';
  $modeNote.textContent = countyMode ? 'Secondary complete-case extension · 2,299 counties' : 'Original state-level poster model';
  $pickerStep.textContent = countyMode ? 'Step 01 · Select a county' : 'Step 01 · Select a state';
  $mapModeLabel.textContent = countyMode ? 'Click a county or state-level fallback' : 'Click a state to forecast it';
  $mapCoverageNote.textContent = countyMode
    ? 'County detail where available; otherwise the original whole-state estimate.'
    : 'All states use the original state-level estimates.';
  $helper.textContent = countyMode
    ? 'County values use the same CDC PLACES 2025 file and complete-case rules as the county notebook.'
    : 'Values prefill from CDC PLACES. Nudge the inputs below to explore counter-factual scenarios.';
  $reset.textContent = countyMode ? '↺ Reset to CDC values for this county' : '↺ Reset to CDC values for this state';
  const model = MODELS[mode];
  $equation.textContent = `${model.intercept.toFixed(3)} + ${model.depCoef.toFixed(3)} · dep + ${model.finCoef.toFixed(3)} · fin`;
  if (countyMode) {
    const id = populateCountySelect(abbr, currentCountyId);
    applyCounty(id);
  } else {
    applyState(abbr);
  }
  renderBoards();
  if (redrawMap) redrawMap();
}

function onStatePick() {
  if (currentMode === 'county') {
    const id = populateCountySelect($select.value, currentCountyId);
    applyCounty(id);
  } else {
    applyState($select.value);
    highlightSelected($select.value);
  }
}
function onCountyPick() {
  applyCounty($countySelect.value);
  highlightSelected($countySelect.value);
}
function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }

$modeButtons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
$select.addEventListener('change', onStatePick);
$countySelect.addEventListener('change', onCountyPick);
$depInput.addEventListener('input', recompute);
$finInput.addEventListener('input', recompute);
$reset.addEventListener('click', () => currentMode === 'county' ? applyCounty(currentCountyId) : applyState($select.value));
renderBoards();
populateStateSelect();
applyState(DEFAULT_ABBR);

const FIPS_TO_ABBR = {
  '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT','10':'DE','11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL','18':'IN','19':'IA','20':'KS','21':'KY','22':'LA','23':'ME','24':'MD','25':'MA','26':'MI','27':'MN','28':'MS','29':'MO','30':'MT','31':'NE','32':'NV','33':'NH','34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND','39':'OH','40':'OK','41':'OR','42':'PA','44':'RI','45':'SC','46':'SD','47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA','54':'WV','55':'WI','56':'WY',
};
function rampColor(t) {
  t = Math.max(0, Math.min(1, t));
  const stops = [[0,[61,107,61]],[0.5,[185,168,90]],[1,[142,42,35]]];
  let a = stops[0], b = stops[2];
  for (let i = 0; i < stops.length - 1; i += 1) if (t >= stops[i][0] && t <= stops[i + 1][0]) [a, b] = [stops[i], stops[i + 1]];
  const u = (t - a[0]) / (b[0] - a[0]);
  const c = [0,1,2].map(k => Math.round(a[1][k] + (b[1][k] - a[1][k]) * u));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
const distressToColor = value => rampColor((value - 13) / 9);

function showTooltip(tooltip, event, title, line) {
  tooltip.hidden = false;
  tooltip.replaceChildren();
  const heading = document.createElement('strong');
  heading.textContent = title;
  const detail = document.createElement('span');
  detail.textContent = line;
  tooltip.append(heading, detail);
  const rect = $mapMount.getBoundingClientRect();
  tooltip.style.left = `${event.clientX - rect.left}px`;
  tooltip.style.top = `${event.clientY - rect.top - 6}px`;
}

async function mountChoropleth() {
  if (typeof d3 === 'undefined' || typeof topojson === 'undefined') return;
  const us = await d3.json('https://unpkg.com/us-atlas@3/counties-10m.json');
  const states = topojson.feature(us, us.objects.states).features;
  const counties = topojson.feature(us, us.objects.counties).features;
  const collection = { type: 'FeatureCollection', features: states };
  const tooltip = document.getElementById('map-tooltip');
  const draw = () => {
    const width = $mapMount.clientWidth;
    const height = $mapMount.clientHeight;
    const projection = d3.geoAlbersUsa().fitSize([width - 20, height - 20], collection).translate([width / 2, height / 2]);
    const path = d3.geoPath(projection);
    $mapMount.querySelector('svg')?.remove();
    const svg = d3.create('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('preserveAspectRatio', 'xMidYMid meet');
    if (currentMode === 'state') {
      svg.selectAll('path').data(states).join('path')
        .attr('d', path).attr('class', 'state-path')
        .attr('data-abbr', f => FIPS_TO_ABBR[String(f.id).padStart(2, '0')] || '')
        .attr('fill', f => distressToColor(STATE_PREDICTED.get(FIPS_TO_ABBR[String(f.id).padStart(2, '0')]) ?? 16))
        .on('pointerenter pointermove', (event, f) => {
          const abbr = FIPS_TO_ABBR[String(f.id).padStart(2, '0')];
          const state = STATES_BY_ABBR[abbr];
          if (state) showTooltip(tooltip, event, state.name, `Predicted ${STATE_PREDICTED.get(abbr).toFixed(2)}% · CDC ${state.distress_actual.toFixed(2)}%`);
        })
        .on('pointerleave', () => { tooltip.hidden = true; })
        .on('click', (event, f) => {
          const abbr = FIPS_TO_ABBR[String(f.id).padStart(2, '0')];
          if (!STATES_BY_ABBR[abbr]) return;
          $select.value = abbr;
          applyState(abbr);
          highlightSelected(abbr);
        });
    } else {
      const fallbackStates = states.filter(feature => {
        const abbr = FIPS_TO_ABBR[String(feature.id).padStart(2, '0')];
        return STATES_BY_ABBR[abbr] && !COUNTY_GROUPS.has(abbr);
      });
      const availableCounties = counties.filter(feature =>
        Boolean(COUNTIES_BY_ID[String(feature.id).padStart(5, '0')])
      );

      svg.selectAll('path.state-fallback').data(fallbackStates).join('path')
        .attr('d', path)
        .attr('class', 'state-fallback')
        .attr('data-abbr', feature => FIPS_TO_ABBR[String(feature.id).padStart(2, '0')] || '')
        .attr('fill', feature => {
          const abbr = FIPS_TO_ABBR[String(feature.id).padStart(2, '0')];
          return distressToColor(STATE_PREDICTED.get(abbr) ?? 16);
        })
        .on('pointerenter pointermove', (event, feature) => {
          const abbr = FIPS_TO_ABBR[String(feature.id).padStart(2, '0')];
          const state = STATES_BY_ABBR[abbr];
          if (state) showTooltip(
            tooltip,
            event,
            `${state.name} · state-level fallback`,
            `Predicted ${STATE_PREDICTED.get(abbr).toFixed(2)}% · county hardship data unavailable`,
          );
        })
        .on('pointerleave', () => { tooltip.hidden = true; })
        .on('click', (event, feature) => {
          const abbr = FIPS_TO_ABBR[String(feature.id).padStart(2, '0')];
          if (!STATES_BY_ABBR[abbr]) return;
          setMode('state');
          $select.value = abbr;
          applyState(abbr);
          highlightSelected(abbr);
        });

      svg.selectAll('path.county-path').data(availableCounties).join('path')
        .attr('d', path)
        .attr('class', 'county-path')
        .attr('data-county-id', f => String(f.id).padStart(5, '0'))
        .attr('fill', f => distressToColor(COUNTIES_BY_ID[String(f.id).padStart(5, '0')].distress_predicted))
        .on('pointerenter pointermove', (event, f) => {
          const county = COUNTIES_BY_ID[String(f.id).padStart(5, '0')];
          showTooltip(tooltip, event, `${countyLabel(county)}, ${county.abbr}`, `Predicted ${county.distress_predicted.toFixed(2)}% · CDC ${county.distress_actual.toFixed(2)}%`);
        })
        .on('pointerleave', () => { tooltip.hidden = true; })
        .on('click', (event, f) => {
          const id = String(f.id).padStart(5, '0');
          const county = COUNTIES_BY_ID[id];
          if (!county) return;
          $select.value = county.abbr;
          populateCountySelect(county.abbr, county.id);
          $countySelect.value = county.id;
          applyCounty(county.id);
          highlightSelected(county.id);
        });
      svg.append('path').datum(topojson.mesh(us, us.objects.states, (a, b) => a !== b)).attr('d', path).attr('class', 'map-state-border');
    }
    $mapMount.appendChild(svg.node());
    highlightSelected(currentMode === 'state' ? $select.value : currentCountyId);
  };
  redrawMap = draw;
  draw();
  new ResizeObserver(draw).observe($mapMount);
}

function highlightSelected(identifier) {
  selectedPath?.classList.remove('is-selected');
  const selector = currentMode === 'state' ? `.state-path[data-abbr="${identifier}"]` : `.county-path[data-county-id="${identifier}"]`;
  const next = document.querySelector(selector);
  if (next) {
    next.classList.add('is-selected');
    selectedPath = next;
  }
}
function refreshSelectedMapColor(prediction) {
  const selector = currentMode === 'state' ? `.state-path[data-abbr="${$select.value}"]` : `.county-path[data-county-id="${currentCountyId}"]`;
  document.querySelector(selector)?.setAttribute('fill', distressToColor(prediction));
}
mountChoropleth().catch(error => console.warn('[wellbeing] Map unavailable:', error));
