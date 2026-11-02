/* Bob Space Program main controller. Plain browser JavaScript; no build step. */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const on = (id, event, fn) => { const el = $(id); if (el) el.addEventListener(event, fn); };
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const P = window.BSPParts;
  const V = window.BSPPhysics;
  const SAVE_KEY = 'bsp-craft-v1';
  const FLAG_KEY = 'bsp-flag-v1';
  const CAMPAIGN_KEY = 'bsp-campaign-v1';
  const enemyNames = ['Kerbal Space Program', 'NASA', 'Alien Aerospace', 'SpaceX', 'Roscosmos', 'Canadian Space Agency'];
  const warpRates = [1, 2, 5, 10, 50, 100, 1000];

  let editor, currentView = 'vab', flightViewBeforeMap = 'flight', vessel = null;
  let currentCategory = 'All', customParts = [], selectedCatalogKey = null;
  let campaign = { rival: enemyNames[Math.floor(Math.random() * enemyNames.length)], rivalProgress: 12, playerProgress: 0, target: 'Duna', accepted: false, wins: 0 };
  let warpIndex = 0, paused = false, missionStart = 0, lastFrame = 0, fpsFrames = 0, fpsTimer = 0;
  let time = 0, keys = new Set(), currentAgency = 'Bob Space Program', povMode = 'bsp';
  let selectedDestination = 'Duna', maneuverNode = null, mapScaleLog = true;
  let undoStack = [], redoStack = [], lastEditorSave = '', customWarnings = false;
  let multiplayer = { active: false, mode: 'same', playerId: 'pilot-' + Math.random().toString(36).slice(2, 8), room: '', timer: null, server: '' };
  let flagData = { name: 'Bob Space Program', color1: '#184d78', color2: '#f0e6c8', color3: '#d7a940', pattern: 'horizontal', emblem: 'B' };
  let flagImage = null;
  let stars = [];

  function log(message) {
    const el = $('workStatus');
    if (el) el.textContent = message;
    const footer = $('menuStatus');
    if (footer) footer.textContent = message.toUpperCase().slice(0, 58);
  }

  function showModal(id) { const el = $(id); if (el) el.hidden = false; }
  function hideModal(id) { const el = $(id); if (el) el.hidden = true; }
  function activeInput() { return ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement && document.activeElement.tagName); }

  function getAllDefinitions() {
    return P.catalogue.concat(customParts);
  }

  function craftSnapshot() {
    return editor ? editor.save() : '';
  }

  function pushUndo() {
    if (!editor) return;
    const snapshot = craftSnapshot();
    if (snapshot === lastEditorSave) return;
    undoStack.push(lastEditorSave || snapshot);
    if (undoStack.length > 35) undoStack.shift();
    redoStack = [];
    lastEditorSave = snapshot;
  }

  function undo() {
    if (!undoStack.length) return;
    const now = craftSnapshot();
    const previous = undoStack.pop();
    redoStack.push(now);
    editor.load(previous);
    lastEditorSave = craftSnapshot();
    log('UNDO COMPLETE');
  }

  function redo() {
    if (!redoStack.length) return;
    const now = craftSnapshot();
    const next = redoStack.pop();
    undoStack.push(now);
    editor.load(next);
    lastEditorSave = craftSnapshot();
    log('REDO COMPLETE');
  }

  function renderCatalog() {
    const list = $('partList');
    if (!list) return;
    list.innerHTML = '';
    const search = ($('partSearch')?.value || '').toLowerCase();
    const definitions = getAllDefinitions().filter(def => {
      const categoryMatch = currentCategory === 'All' || def.category === currentCategory;
      const searchMatch = !search || (def.name + ' ' + def.description + ' ' + def.category).toLowerCase().includes(search);
      return categoryMatch && searchMatch;
    });
    for (const def of definitions) {
      const button = document.createElement('button');
      button.className = 'part-item' + (selectedCatalogKey === def.key ? ' active' : '');
      button.type = 'button';
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', selectedCatalogKey === def.key ? 'true' : 'false');
      const swatch = document.createElement('span');
      swatch.className = 'part-swatch';
      swatch.style.background = def.color;
      const text = document.createElement('span');
      const title = document.createElement('strong'); title.textContent = def.name;
      const sub = document.createElement('small');
      sub.textContent = def.thrust ? def.thrust.toLocaleString() + ' kN • ' + def.mass.toLocaleString() + ' kg' : def.mass.toLocaleString() + ' kg • ' + def.category;
      text.append(title, sub); button.append(swatch, text);
      button.addEventListener('click', () => {
        selectedCatalogKey = def.key;
        editor.setTemplate(def.key, P.byKey[def.key] ? null : def);
        if (currentView === 'flight' || currentView === 'map') setView('vab');
        renderCatalog();
        log('PLACE ' + def.name.toUpperCase() + ' — CLICK A PART OR SURFACE');
      });
      list.appendChild(button);
    }
    if (!definitions.length) {
      const empty = document.createElement('div'); empty.className = 'hint-box'; empty.textContent = 'No parts match this filter.'; list.appendChild(empty);
    }
  }

  function craftStats() {
    let dry = 0, fuel = 0, thrust = 0, wings = 0;
    for (const item of editor.parts) {
      const def = editor.getDefinition(item);
      if (!def) continue;
      dry += def.mass || 0; fuel += def.fuel || 0; thrust += def.thrust || 0; wings += def.wingArea || 0;
    }
    const total = dry + fuel;
    const g = 9.80665;
    return { dry, fuel, thrust: Math.min(thrust, P.MAX_ENGINE_THRUST_KN), total, twr: total ? thrust * 1000 / (total * g) : 0, wings };
  }

  function renderInspector() {
    if (!editor) return;
    const item = editor.selectedPart();
    const def = item && editor.getDefinition(item);
    const info = $('selectedIcon');
    if (info) {
      info.textContent = def ? (def.category === 'Engines' ? 'E' : def.category === 'Aero' ? 'A' : def.category === 'Fuel' ? 'F' : 'B') : '—';
      info.style.background = def ? def.color : '#aaa';
    }
    $('selectedName').textContent = def ? def.name : 'No part selected';
    $('selectedCategory').textContent = def ? def.category.toUpperCase() + (def.crew ? ' / ' + def.crew + ' CREW' : '') : 'SELECT A PART';
    $('selectedDescription').textContent = def ? (def.description || 'BSP modular vehicle part.') : 'Select a part in the catalog or click a part on the craft.';
    const properties = $('partProperties');
    properties.innerHTML = '';
    if (def) {
      const rows = [['Mass', (def.mass || 0).toLocaleString() + ' kg']];
      if (def.fuel) rows.push(['Fuel capacity', def.fuel.toLocaleString() + ' kg']);
      if (def.thrust) rows.push(['Maximum thrust', def.thrust.toLocaleString() + ' kN']);
      if (def.isp) rows.push(['Specific impulse', def.isp + ' s']);
      if (def.wingArea) rows.push(['Wing area', def.wingArea + ' m²']);
      for (const [label, value] of rows) {
        const l = document.createElement('span'), v = document.createElement('b'); l.textContent = label; v.textContent = value; properties.append(l, v);
      }
    }
    const wing = $('wingInspector');
    wing.hidden = !def || !def.wingArea;
    if (def && def.wingArea) {
      for (const key of ['wingArea', 'camber', 'incidence', 'sweep', 'dihedral', 'control']) {
        const input = $(key), out = $(key + 'Out');
        if (input) input.value = def[key] ?? 0;
        if (out) out.textContent = (def[key] ?? 0) + (key === 'wingArea' ? ' m²' : '°');
      }
    }
    const s = craftStats();
    $('dryMass').textContent = Math.round(s.dry).toLocaleString() + ' kg';
    $('propellant').textContent = Math.round(s.fuel).toLocaleString() + ' kg';
    $('maxThrust').textContent = Math.round(s.thrust).toLocaleString() + ' kN';
    $('editorTwr').textContent = s.twr.toFixed(2);
    $('summaryParts').textContent = editor.parts.length;
    $('partCount').textContent = editor.parts.length + ' PARTS';
    $('craftSize').textContent = editor.parts.length + ' PARTS';
    $('thrustWarning').hidden = !customWarnings;
    renderStageList();
  }

  function renderStageList() {
    const list = $('stageList');
    if (!list) return;
    list.innerHTML = '';
    const stages = new Map();
    for (const item of editor.parts) {
      const def = editor.getDefinition(item);
      const stage = item.stage ?? def?.stage ?? 0;
      if (!stages.has(stage)) stages.set(stage, []);
      stages.get(stage).push(def ? def.name : item.key);
    }
    [...stages.keys()].sort((a, b) => b - a).forEach(stage => {
      const row = document.createElement('div'); row.className = 'stage-item';
      const names = stages.get(stage);
      const label = document.createElement('span'); label.textContent = 'STAGE ' + stage + ' · ' + names.slice(0, 2).join(', ');
      const count = document.createElement('b'); count.textContent = names.length + ' PART' + (names.length === 1 ? '' : 'S');
      row.append(label, count); list.appendChild(row);
    });
  }

  function setView(view) {
    if (view === 'map' && currentView !== 'map') flightViewBeforeMap = currentView;
    currentView = view;
    $('editorShell').hidden = !(view === 'vab' || view === 'sph');
    $('flightShell').hidden = view !== 'flight';
    $('mapShell').hidden = view !== 'map';
    $('modeTools').hidden = !(view === 'vab' || view === 'sph');
    $('flightTools').hidden = !(view === 'flight');
    $('partsPanel').style.display = (view === 'vab' || view === 'sph') ? '' : 'none';
    $('inspectorPanel').style.display = (view === 'vab' || view === 'sph') ? '' : 'none';
    $('vabBtn').classList.toggle('active', view === 'vab');
    $('sphBtn').classList.toggle('active', view === 'sph');
    $('flightBtn').classList.toggle('active', view === 'flight');
    $('mapBtn').classList.toggle('active', view === 'map');
    if (view === 'vab') { $('facilityName').textContent = 'VEHICLE ASSEMBLY BUILDING'; $('facilitySub').textContent = '3D EDITOR • KERBIN SPACE CENTER'; }
    if (view === 'sph') { $('facilityName').textContent = 'SPACEPLANE HANGAR'; $('facilitySub').textContent = 'AERODYNAMIC EDITOR • RUNWAY 09'; }
    if (view === 'flight') { $('facilityName').textContent = 'FLIGHT CONTROL'; $('facilitySub').textContent = 'REAL-TIME PHYSICS • KERBIN'; }
    if (view === 'map') { $('facilityName').textContent = 'TRACKING STATION'; $('facilitySub').textContent = 'KERBOL SYSTEM MAP'; }
    if (view === 'vab' || view === 'sph') editor.render();
    if (view === 'flight') drawFlightView();
    if (view === 'map') drawMap();
    updateStatusButtons();
  }

  function updateStatusButtons() {
    $('snapPill').textContent = 'NODE SNAP: ' + (editor.snap ? 'ON' : 'OFF');
    $('shaderBtn').textContent = 'SHADER MODE: ' + (editor.shaders ? 'ON' : 'OFF');
    $('shaderBtn').classList.toggle('active', editor.shaders);
  }

  function launch() {
    if (!editor.parts.length) { log('ADD PARTS BEFORE LAUNCH'); return; }
    const stats = craftStats();
    if (!stats.thrust) { log('NO ENGINE INSTALLED — ADD AN ENGINE'); return; }
    vessel = V.makeVessel(editor.parts, P.byKey);
    vessel.landed = true;
    vessel.throttle = Number($('throttleRange').value) / 100;
    vessel.stage = 0;
    vessel.engineActive = false;
    missionStart = time;
    warpIndex = 0; paused = false;
    $('warpValue').textContent = '1×';
    $('stageBtn').textContent = 'STAGE / SPACE';
    setView('flight');
    log('VESSEL READY — PRESS SPACE OR STAGE TO IGNITE');
    updateFlightHud();
  }

  function handleStage() {
    if (!vessel) return;
    if (!vessel.engineActive) {
      vessel.engineActive = true;
      vessel.landed = false;
      vessel.throttle = Math.max(0.1, vessel.throttle || 1);
      $('stageBtn').textContent = 'NEXT STAGE / SPACE';
      log('ENGINE IGNITION — LIFTOFF');
      return;
    }
    vessel.stage++;
    // Stage progression is abstract: the next event separates expendable mass,
    // but it does not model explosive bolts or real separation hardware.
    const expendable = Math.min(vessel.dryMass * 0.08, vessel.dryMass - 100);
    vessel.dryMass = Math.max(100, vessel.dryMass - Math.max(0, expendable));
    if (vessel.stage > 2) $('stageBtn').textContent = 'STAGES COMPLETE';
    log('STAGE ' + vessel.stage + ' COMPLETE — VEHICLE CONFIGURATION UPDATED');
  }

  function altitude(v) { return Math.max(0, V.len(v.position) - V.bodies[v.body].radius); }
  function currentGravity(v) { const b = V.bodies[v.body]; const r = V.len(v.position); return V.mu(b) / Math.max(1, r * r); }

  function updateFlightHud() {
    if (!vessel) return;
    const alt = altitude(vessel), speed = V.len(vessel.velocity), mass = vessel.dryMass + vessel.fuel;
    const thrust = vessel.engineActive ? vessel.thrustKN * vessel.throttle : 0;
    const twr = mass ? thrust * 1000 / (mass * currentGravity(vessel)) : 0;
    $('flightAltitude').textContent = 'ALT ' + V.formatDistance(alt);
    $('flightSpeed').textContent = 'SPD ' + speed.toFixed(1) + ' m/s';
    $('flightApo').textContent = 'AP ' + (Number.isFinite(vessel.apoapsis) ? V.formatDistance(vessel.apoapsis) : 'ESCAPE');
    $('throttleValue').textContent = Math.round(vessel.throttle * 100) + '%';
    $('thrustValue').textContent = Math.round(thrust).toLocaleString() + ' kN';
    $('twrValue').textContent = twr.toFixed(2);
    $('fuelValue').textContent = Math.round(vessel.fuel).toLocaleString() + ' kg';
    $('throttleRange').value = vessel.throttle * 100;
    $('sasBtn').textContent = 'SAS: ' + (vessel.sas ? 'ON' : 'OFF');
    $('sasBtn').classList.toggle('active', vessel.sas);
    $('rcsBtn').textContent = 'RCS: ' + (vessel.rcs ? 'ON' : 'OFF');
    $('rcsBtn').classList.toggle('active', vessel.rcs);
    $('flightMission').textContent = vessel.missionName + ' / ' + vessel.body.toUpperCase() + ' ASCENT';
    $('timeReadout').textContent = 'MISSION ELAPSED ' + formatClock(vessel.flightTime);
    drawNavball();
  }

  function formatClock(seconds) {
    const s = Math.floor(seconds || 0), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }

  function seededStars() {
    let seed = 73421;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    stars = Array.from({ length: 120 }, () => ({ x: rand(), y: rand(), r: rand() * 1.35 + 0.25, a: rand() * 0.65 + 0.2 }));
  }

  function resizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const w = Math.max(280, Math.round(rect.width * dpr));
    const h = Math.max(240, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    return { w, h, dpr };
  }

  function drawFlightView() {
    if (!vessel || $('flightShell').hidden) return;
    const canvas = $('flightCanvas'), ctx = canvas.getContext('2d');
    const { w, h } = resizeCanvas(canvas);
    ctx.fillStyle = '#060b18'; ctx.fillRect(0, 0, w, h);
    for (const s of stars) { ctx.globalAlpha = s.a; ctx.fillStyle = '#dfe8fa'; ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    const b = V.bodies[vessel.body];
    const alt = altitude(vessel);
    const surfaceR = Math.min(w * 0.43, h * 0.48);
    const planetX = w * 0.5, planetY = h * 1.12;
    const atmosphereR = surfaceR + Math.min(80, surfaceR * 0.15);
    const atmo = ctx.createRadialGradient(planetX, planetY, surfaceR * 0.88, planetX, planetY, atmosphereR);
    atmo.addColorStop(0, 'rgba(68,157,212,0)'); atmo.addColorStop(1, 'rgba(56,150,221,.48)');
    ctx.fillStyle = atmo; ctx.beginPath(); ctx.arc(planetX, planetY, atmosphereR, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(planetX, planetY, surfaceR, Math.PI, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(229,240,220,.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(planetX, planetY, surfaceR - 15, Math.PI, Math.PI * 2); ctx.stroke();
    // Exaggerated local altitude scale keeps the vehicle and horizon visible.
    const craftX = w * 0.5 + Math.sin(vessel.yaw || 0) * 80;
    const craftY = Math.max(90, h * 0.68 - Math.log1p(alt / 1500) * 50);
    const angle = Math.atan2(vessel.heading[0], vessel.heading[1]);
    ctx.save(); ctx.translate(craftX, craftY); ctx.rotate(angle);
    ctx.fillStyle = '#d2d9da'; ctx.strokeStyle = '#101b25'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -19); ctx.lineTo(10, 10); ctx.lineTo(0, 5); ctx.lineTo(-10, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (vessel.engineActive && vessel.throttle > 0 && vessel.fuel > 0) {
      ctx.fillStyle = '#f5a33e'; ctx.beginPath(); ctx.moveTo(-5, 8); ctx.lineTo(0, 21 + Math.random() * 10); ctx.lineTo(5, 8); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(6,12,21,.72)'; ctx.fillRect(10, h - 60, 250, 48);
    ctx.fillStyle = '#d9e6ed'; ctx.font = '12px monospace';
    ctx.fillText(b.name.toUpperCase() + ' / SURFACE REFERENCE', 20, h - 40);
    ctx.fillText('LOCAL ALTITUDE ' + V.formatDistance(alt) + ' · ' + (b.atmosphere && alt < b.atmosphere.height ? 'ATMOSPHERE' : 'SPACE'), 20, h - 21);
  }

  function drawNavball() {
    if (!vessel) return;
    const canvas = $('navballCanvas'), ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2, r = 75;
    ctx.clearRect(0, 0, w, h);
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    const radial = V.norm(vessel.position);
    const pitch = Math.asin(clamp(V.dot(vessel.heading, radial), -1, 1));
    const angle = vessel.roll || 0;
    ctx.translate(cx, cy); ctx.rotate(angle);
    const offset = pitch * r * 1.5;
    ctx.fillStyle = '#347bb5'; ctx.fillRect(-r, -r - offset, r * 2, r + offset);
    ctx.fillStyle = '#9a6e49'; ctx.fillRect(-r, -offset, r * 2, r + offset);
    ctx.strokeStyle = '#f5f3d7'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-r, -offset); ctx.lineTo(r, -offset); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-r, -r / 2 - offset); ctx.lineTo(r, -r / 2 - offset); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r, r / 2 - offset); ctx.lineTo(r, r / 2 - offset); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#f6f1d4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#f1d54e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 18, cy); ctx.lineTo(cx - 5, cy); ctx.lineTo(cx, cy + 4); ctx.lineTo(cx + 5, cy); ctx.lineTo(cx + 18, cy); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
    ctx.fillText('N', cx, cy - r + 14); ctx.fillText('S', cx, cy + r - 7); ctx.fillText('W', cx - r + 13, cy + 3); ctx.fillText('E', cx + r - 12, cy + 3);
  }

  function getBodyMapPoint(name, w, h, scale, timeOffset = time) {
    const pos = V.bodyPosition(name, timeOffset);
    const au = Math.hypot(pos[0], pos[2]) / V.AU;
    const angle = Math.atan2(pos[2], pos[0]);
    const r = mapScaleLog ? Math.log1p(au * 4) / Math.log1p(40 * 4) * scale : au / 40 * scale;
    return { x: w / 2 + Math.cos(angle) * r, y: h / 2 + Math.sin(angle) * r * 0.78, r, au };
  }

  function drawMap() {
    if ($('mapShell').hidden) return;
    const canvas = $('mapCanvas'), ctx = canvas.getContext('2d');
    const { w, h } = resizeCanvas(canvas);
    ctx.fillStyle = '#07101d'; ctx.fillRect(0, 0, w, h);
    for (const s of stars) { ctx.globalAlpha = s.a * 0.85; ctx.fillStyle = '#e3ebf5'; ctx.fillRect(s.x * w, s.y * h, 1.2, 1.2); }
    ctx.globalAlpha = 1;
    const scale = Math.min(w, h) * 0.46;
    const cx = w / 2, cy = h / 2;
    // Main-system orbital tracks. Moon tracks are shown around their parent bodies.
    for (const b of Object.values(V.bodies)) {
      if (b.parent === 'Kerbol') {
        const radius = mapScaleLog ? Math.log1p((b.a / V.AU) * 4) / Math.log1p(40 * 4) * scale : b.a / (40 * V.AU) * scale;
        ctx.strokeStyle = 'rgba(136,170,195,.22)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(cx, cy, radius, radius * 0.78, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
    const bodyDraws = Object.values(V.bodies).filter(b => b.name !== 'Kerbol').map(b => ({ body: b, p: getBodyMapPoint(b.name, w, h, scale) }));
    bodyDraws.sort((a, b) => a.p.au - b.p.au);
    const kerbolGlow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 40);
    kerbolGlow.addColorStop(0, '#fff5c3'); kerbolGlow.addColorStop(.18, '#f5bd4b'); kerbolGlow.addColorStop(1, 'rgba(246,166,63,0)');
    ctx.fillStyle = kerbolGlow; ctx.beginPath(); ctx.arc(cx, cy, 40, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd56e'; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff1bc'; ctx.font = 'bold 10px monospace'; ctx.fillText('KERBOL', cx + 13, cy - 12);
    for (const { body, p } of bodyDraws) {
      const r = clamp(Math.log10(body.radius + 1) * 1.2, 3.2, body.type === 'planet' ? 9 : 5.5);
      ctx.fillStyle = body.color; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = body.name === selectedDestination ? '#fff7a9' : 'rgba(255,255,255,.38)'; ctx.lineWidth = body.name === selectedDestination ? 2 : 1; ctx.stroke();
      ctx.fillStyle = '#e3ecf1'; ctx.font = '10px monospace'; ctx.fillText(body.name, p.x + r + 4, p.y - 3);
    }
    if (vessel) {
      const kp = getBodyMapPoint('Kerbin', w, h, scale);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#f4d36c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(kp.x + 12, kp.y - 12, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '10px monospace'; ctx.fillText('BSP VESSEL', kp.x + 20, kp.y - 18);
    }
    if (maneuverNode) {
      const kp = getBodyMapPoint('Kerbin', w, h, scale);
      ctx.strokeStyle = '#fff3a0'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(kp.x + 12, kp.y - 12); ctx.lineTo(kp.x + 70, kp.y - 42); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.arc(kp.x + 70, kp.y - 42, 5, 0, Math.PI * 2); ctx.fill();
    }
    $('mapReadout').textContent = (mapScaleLog ? 'LOG-COMPRESSED DISPLAY' : 'TRUE SEMI-MAJOR AXIS SCALE') + ' • PHYSICAL DATA IN SI UNITS';
  }

  function mapClick(e) {
    const canvas = $('mapCanvas'), rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * canvas.width / rect.width;
    const y = (e.clientY - rect.top) * canvas.height / rect.height;
    const scale = Math.min(canvas.width, canvas.height) * 0.46;
    let nearest = null, best = Infinity;
    for (const b of Object.values(V.bodies)) {
      if (b.name === 'Kerbol') continue;
      const p = getBodyMapPoint(b.name, canvas.width, canvas.height, scale);
      const d = Math.hypot(x - p.x, y - p.y);
      if (d < best) { best = d; nearest = b.name; }
    }
    if (nearest && best < 35) {
      selectedDestination = nearest;
      $('mapReadout').textContent = 'TARGET SELECTED: ' + nearest.toUpperCase() + ' — ' + V.formatDistance(V.bodies[nearest].radius) + ' RADIUS';
      drawMap();
      log('TARGET SELECTED: ' + nearest.toUpperCase());
    } else if (vessel && vessel.body === 'Kerbin') {
      maneuverNode = { time: time + 120, dv: 150, body: 'Kerbin' };
      drawMap(); log('MANEUVER NODE CREATED — ΔV 150 m/s PROGRADE');
    }
  }

  function deployBeacon() {
    if (!campaign.accepted) { showModal('campaignModal'); return; }
    if (!vessel) { log('LAUNCH A CRAFT BEFORE DEPLOYING A SURVEY BEACON'); return; }
    if (!vessel.landed) { log('BEACONS CAN ONLY BE DEPLOYED ON A STABLE SURFACE'); return; }
    if (selectedDestination !== vessel.body) { log('SELECTED TARGET DOES NOT MATCH CURRENT SURFACE'); return; }
    campaign.playerProgress = 100; campaign.wins++;
    $('raceProgressFill').style.width = '100%';
    $('raceStatus').textContent = 'BSP survey beacon confirmed on ' + selectedDestination + '. Contract completed!';
    log('SURVEY BEACON DEPLOYED — BSP CLAIMS THE CONTRACT');
    saveCampaign();
  }

  function saveCampaign() { try { localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign)); } catch (_) {} }
  function loadCampaign() {
    try { const raw = localStorage.getItem(CAMPAIGN_KEY); if (raw) campaign = { ...campaign, ...JSON.parse(raw) }; } catch (_) {}
  }
  function renderCampaign() {
    $('enemyAgency').textContent = campaign.rival;
    $('raceProgressFill').style.width = clamp(campaign.rivalProgress, 0, 100) + '%';
    $('raceStatus').textContent = campaign.rival + ' progress: ' + Math.round(campaign.rivalProgress) + '%. Your survey progress: ' + campaign.playerProgress + '%.';
    $('campaignBriefingText').textContent = 'Rival: ' + campaign.rival + '. Target: ' + campaign.target + '. Plant a survey beacon on a stable surface to claim the contract.';
  }

  function updateFlagCanvas() {
    const canvas = $('flagCanvas'); if (!canvas) return;
    const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    ctx.fillStyle = flagData.color1; ctx.fillRect(0, 0, w, h);
    if (flagData.pattern === 'horizontal') {
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i % 2 === 0 ? flagData.color2 : flagData.color3; ctx.fillRect(0, i * h / 3, w, h / 3); }
    } else if (flagData.pattern === 'vertical') {
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i % 2 === 0 ? flagData.color2 : flagData.color3; ctx.fillRect(i * w / 3, 0, w / 3, h); }
    } else if (flagData.pattern === 'diagonal') {
      ctx.fillStyle = flagData.color2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = flagData.color3; ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = flagData.color2; ctx.fillRect(0, 0, w / 2, h / 2); ctx.fillRect(w / 2, h / 2, w / 2, h / 2);
      ctx.fillStyle = flagData.color3; ctx.fillRect(w / 2, 0, w / 2, h / 2); ctx.fillRect(0, h / 2, w / 2, h / 2);
    }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 7; ctx.strokeRect(4, 4, w - 8, h - 8);
    if (flagData.emblem === 'B') {
      ctx.fillStyle = '#f8f1da'; ctx.font = 'bold 150px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = '#132335'; ctx.shadowBlur = 5; ctx.fillText('B', w / 2, h / 2 + 2); ctx.shadowBlur = 0;
    } else if (flagData.emblem === 'star') {
      ctx.fillStyle = '#fff6d8'; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 29 : 75; const x = w / 2 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r; if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.closePath(); ctx.fill();
    } else if (flagData.emblem === 'orbit') {
      ctx.strokeStyle = '#fff7d7'; ctx.lineWidth = 10; ctx.beginPath(); ctx.ellipse(w / 2, h / 2, 82, 34, -0.35, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#fff7d7'; ctx.beginPath(); ctx.arc(w / 2, h / 2, 24, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Tahoma'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText((flagData.name || 'BSP').toUpperCase().slice(0, 30), w - 15, h - 12);
  }

  function openFlagEditor() {
    $('agencyNameInput').value = flagData.name || currentAgency;
    $('flagColor1').value = flagData.color1; $('flagColor2').value = flagData.color2; $('flagColor3').value = flagData.color3;
    $('flagPattern').value = flagData.pattern; $('flagEmblem').value = flagData.emblem;
    updateFlagCanvas(); showModal('flagModal');
  }

  function saveFlag() {
    flagData = {
      name: $('agencyNameInput').value.slice(0, 40) || 'Bob Space Program',
      color1: $('flagColor1').value, color2: $('flagColor2').value, color3: $('flagColor3').value,
      pattern: $('flagPattern').value, emblem: $('flagEmblem').value
    };
    currentAgency = flagData.name;
    try { localStorage.setItem(FLAG_KEY, JSON.stringify(flagData)); } catch (_) {}
    $('agencyReadout').textContent = currentAgency.toUpperCase();
    updateFlagCanvas(); log('AGENCY FLAG SAVED');
  }

  function downloadCanvas(canvas, name) {
    const link = document.createElement('a'); link.href = canvas.toDataURL('image/png'); link.download = name; link.click();
  }

  function openCustomPart() { showModal('customModal'); }
  function validateCustomPart() {
    const result = $('customResult');
    try {
      const parsed = JSON.parse($('customPartCode').value);
      const def = P.validateCustomPart(parsed);
      const existing = customParts.findIndex(p => p.key === def.key);
      if (existing >= 0) customParts[existing] = def; else customParts.push(def);
      customWarnings = Number(parsed.thrust || 0) > P.MAX_ENGINE_THRUST_KN;
      result.textContent = 'VALID — ' + def.name + ' added. Maximum thrust: ' + def.thrust.toLocaleString() + ' kN.';
      result.style.background = '#d9efdc'; result.style.color = '#1d5428';
      currentCategory = 'Custom';
      document.querySelectorAll('.category-button').forEach(b => b.classList.toggle('active', b.dataset.category === 'Custom'));
      renderCatalog(); editor.setTemplate(def.key, def); selectedCatalogKey = def.key;
      hideModal('customModal'); log('CUSTOM PART ADDED TO CATALOG');
    } catch (error) {
      result.textContent = 'NOT VALID: ' + error.message;
      result.style.background = '#ffe1dc'; result.style.color = '#752719';
      customWarnings = /thrust/i.test(error.message);
      renderInspector();
    }
  }

  function saveCraft() {
    try { localStorage.setItem(SAVE_KEY, editor.save()); lastEditorSave = craftSnapshot(); log('CRAFT SAVED TO THIS BROWSER'); }
    catch (_) { log('SAVE FAILED — BROWSER STORAGE MAY BE FULL'); }
  }
  function loadCraft() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) { log('NO SAVED CRAFT FOUND'); return; }
      editor.load(raw); lastEditorSave = craftSnapshot(); log('CRAFT LOADED');
    } catch (error) { log('CRAFT LOAD FAILED: ' + error.message); }
  }
  function downloadText(text, name, type = 'application/json') {
    const blob = new Blob([text], { type }), url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportCraft() {
    downloadText(editor.save(), 'bsp-craft.json'); log('CRAFT EXPORTED AS JSON');
  }
  function importCraftFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try { editor.load(String(reader.result)); lastEditorSave = craftSnapshot(); log('CRAFT IMPORTED'); }
      catch (error) { log('IMPORT FAILED: ' + error.message); }
    };
    reader.readAsText(file);
  }

  function setMode(mode) {
    editor.setMode(mode);
    document.querySelectorAll('.mode-button').forEach(button => button.classList.toggle('active', button.dataset.mode === mode));
    log(mode.toUpperCase() + ' MODE');
  }

  function toggleMap() {
    if (currentView === 'map') setView(flightViewBeforeMap || 'flight');
    else setView('map');
  }

  function executeManeuver() {
    if (!vessel || !maneuverNode) { log('NO MANEUVER NODE TO EXECUTE'); return; }
    const prograde = V.norm(vessel.velocity);
    vessel.velocity = V.add(vessel.velocity, V.mul(prograde, maneuverNode.dv));
    maneuverNode = null; drawMap(); log('MANEUVER EXECUTED — VELOCITY UPDATED');
  }

  function stepWarp(direction) {
    const maxIndex = warpRates.length - 1;
    warpIndex = clamp(warpIndex + direction, 0, maxIndex);
    if (vessel && V.bodies[vessel.body].atmosphere && altitude(vessel) < V.bodies[vessel.body].atmosphere.height + 5000) warpIndex = Math.min(warpIndex, 2);
    $('warpValue').textContent = warpRates[warpIndex] + '×';
  }

  function updateFrame(timestamp) {
    requestAnimationFrame(updateFrame);
    if (!lastFrame) lastFrame = timestamp;
    const frameDt = clamp((timestamp - lastFrame) / 1000, 0, 0.08);
    lastFrame = timestamp;
    fpsFrames++; fpsTimer += frameDt;
    if (fpsTimer > 1) { $('fpsReadout').textContent = Math.round(fpsFrames / fpsTimer) + ' FPS / CANVAS'; fpsFrames = 0; fpsTimer = 0; }
    if (!paused) time += frameDt * (currentView === 'flight' ? warpRates[warpIndex] : 1);
    if (vessel && currentView === 'flight' && !paused) {
      const warp = warpRates[warpIndex];
      // Keep integration stable on low-power hardware; in atmosphere the UI caps warp.
      const simDt = Math.min(0.5, frameDt * warp);
      V.stepVessel(vessel, simDt, {
        throttle: vessel.throttle,
        pitch: keys.has('w') ? 1 : keys.has('s') ? -1 : 0,
        yaw: keys.has('d') ? 1 : keys.has('a') ? -1 : 0,
        roll: keys.has('e') ? 1 : keys.has('q') ? -1 : 0
      });
      if (keys.has('shift')) vessel.throttle = clamp(vessel.throttle + frameDt * 0.5, 0, 1);
      if (keys.has('control')) vessel.throttle = clamp(vessel.throttle - frameDt * 0.5, 0, 1);
      if (V.len(vessel.position) - V.bodies[vessel.body].radius > V.bodies[vessel.body].atmosphere?.height + 12000) warpIndex = Math.min(warpIndex, 5);
      drawFlightView(); updateFlightHud();
    }
    if (currentView === 'map') drawMap();
    if (campaign.accepted && currentView !== 'flight' && Math.floor(time / 55) > Math.floor((time - frameDt) / 55)) {
      campaign.rivalProgress = clamp(campaign.rivalProgress + 1.2, 0, 99); renderCampaign(); saveCampaign();
    }
  }

  function updateClockText() {
    if (!vessel) $('timeReadout').textContent = 'MISSION ELAPSED 00:00:00';
  }

  function onKeyDown(e) {
    if (activeInput()) return;
    const key = e.key.toLowerCase();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', '.', ',', 'f5', 'f9'].includes(key)) e.preventDefault();
    keys.add(key);
    if (e.ctrlKey && key === 'z') { e.preventDefault(); undo(); return; }
    if (e.ctrlKey && key === 'y') { e.preventDefault(); redo(); return; }
    const modalOpen = [...document.querySelectorAll('.modal-backdrop')].some(m => !m.hidden);
    if (modalOpen) return;
    if (currentView === 'vab' || currentView === 'sph') {
      if (['1', '2', '3', '4'].includes(key)) setMode(['place', 'offset', 'rotate', 'root'][Number(key) - 1]);
      if (key === 'delete' || key === 'backspace') { editor.deleteSelected(); log('PART REMOVED'); }
      if (key === 'c') { editor.snap = !editor.snap; updateStatusButtons(); editor.render(); log('NODE SNAP ' + (editor.snap ? 'ON' : 'OFF')); }
      if (key === 'escape') editor.setTemplate(null);
      if (key === 'q' || key === 'e') editor.rotateSelected(1, key === 'q' ? -Math.PI / 2 : Math.PI / 2);
    } else if (currentView === 'flight') {
      if (key === ' ') { handleStage(); e.preventDefault(); }
      if (key === 'z') vessel.throttle = 1;
      if (key === 'x') vessel.throttle = 0;
      if (key === 't') { vessel.sas = !vessel.sas; updateFlightHud(); }
      if (key === 'r') { vessel.rcs = !vessel.rcs; updateFlightHud(); }
      if (key === 'm') toggleMap();
      if (key === '.') stepWarp(1);
      if (key === ',') stepWarp(-1);
      if (key === 'g') { vessel.gear = !vessel.gear; log('LANDING GEAR ' + (vessel.gear ? 'DOWN' : 'UP')); }
      if (key === 'b') { vessel.brakes = !vessel.brakes; log('BRAKES ' + (vessel.brakes ? 'ON' : 'OFF')); }
      if (key === 'u') { vessel.lights = !vessel.lights; log('LIGHTS ' + (vessel.lights ? 'ON' : 'OFF')); }
      if (key === 'f5') quickSaveFlight();
      if (key === 'f9') quickLoadFlight();
      if (key === 'c') showModal('povModal');
    } else if (currentView === 'map') {
      if (key === 'm') setView(flightViewBeforeMap || 'flight');
      if (key === 'escape') setView(flightViewBeforeMap || 'flight');
    }
  }

  function onKeyUp(e) { keys.delete(e.key.toLowerCase()); }
  function quickSaveFlight() { if (vessel) { try { localStorage.setItem('bsp-flight-v1', JSON.stringify(vessel)); log('QUICKSAVE COMPLETE'); } catch (_) { log('QUICKSAVE FAILED'); } } }
  function quickLoadFlight() { try { const raw = localStorage.getItem('bsp-flight-v1'); if (raw) { vessel = JSON.parse(raw); log('QUICKLOAD COMPLETE'); updateFlightHud(); } } catch (_) { log('QUICKLOAD FAILED'); } }

  function joinMultiplayer(mode) {
    const server = $('serverAddress').value.trim().replace(/\/$/, '');
    if (!server) { $('multiStatus').textContent = 'Enter the host computer address, for example http://192.168.1.20:3210.'; return; }
    multiplayer.server = server; multiplayer.room = $('roomCode').value.trim() || 'BSP-ROOM'; multiplayer.mode = mode;
    const payload = { room: multiplayer.room, playerId: multiplayer.playerId, playerName: $('playerName').value || 'Bob Pilot', agency: $('multiAgency').value || currentAgency, mode };
    fetch(server + '/api/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(r => { if (!r.ok) throw new Error('Server replied ' + r.status); return r.json(); })
      .then(data => {
        multiplayer.active = true;
        $('multiStatus').textContent = 'Connected to room ' + multiplayer.room + '. Players online: ' + (data.players || 1) + '. Mode: ' + mode.toUpperCase() + '.';
        if (multiplayer.timer) clearInterval(multiplayer.timer);
        multiplayer.timer = setInterval(pollMultiplayer, 1500);
        currentAgency = payload.agency;
        $('agencyReadout').textContent = currentAgency.toUpperCase();
      })
      .catch(error => { $('multiStatus').textContent = 'Could not connect: ' + error.message + '. Both devices must be on the same network and use the host server address.'; });
  }

  function pollMultiplayer() {
    if (!multiplayer.active) return;
    fetch(multiplayer.server + '/api/state?room=' + encodeURIComponent(multiplayer.room))
      .then(r => r.json())
      .then(data => {
        const players = (data.players || []).filter(p => p.playerId !== multiplayer.playerId);
        $('multiStatus').textContent = 'Connected. ' + (data.players || []).length + ' pilot(s) in room. ' + (players.length ? 'Other pilot: ' + players.map(p => p.playerName + ' / ' + p.agency).join(', ') : 'Waiting for another pilot…');
        const state = { room: multiplayer.room, playerId: multiplayer.playerId, playerName: $('playerName').value || 'Bob Pilot', agency: currentAgency, mode: multiplayer.mode, view: currentView, body: vessel?.body || 'Kerbin', altitude: vessel ? altitude(vessel) : 0, score: campaign.playerProgress, updated: Date.now() };
        return fetch(multiplayer.server + '/api/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state) });
      })
      .catch(() => { $('multiStatus').textContent = 'Connection lost. Check the host server and local network.'; });
  }

  function leaveMultiplayer() {
    if (multiplayer.timer) clearInterval(multiplayer.timer);
    multiplayer.active = false;
    if (multiplayer.server) fetch(multiplayer.server + '/api/leave', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room: multiplayer.room, playerId: multiplayer.playerId }) }).catch(() => {});
    $('multiStatus').textContent = 'Offline. You can rejoin a room at any time.';
  }

  function bindUI() {
    document.querySelectorAll('.category-button').forEach(button => button.addEventListener('click', () => {
      currentCategory = button.dataset.category;
      document.querySelectorAll('.category-button').forEach(b => b.classList.toggle('active', b === button));
      renderCatalog();
    }));
    document.querySelectorAll('.mode-button').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
    document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => hideModal(button.dataset.close)));
    on('partSearch', 'input', renderCatalog);
    on('vabBtn', 'click', () => setView('vab'));
    on('sphBtn', 'click', () => setView('sph'));
    on('flightBtn', 'click', () => vessel ? setView('flight') : launch());
    on('mapBtn', 'click', () => { if (!vessel) { log('LAUNCH A VESSEL TO VIEW YOUR FLIGHT MAP'); return; } flightViewBeforeMap = currentView; setView('map'); });
    on('saveCraftBtn', 'click', saveCraft); on('loadCraftBtn', 'click', loadCraft); on('exportCraftBtn', 'click', exportCraft);
    on('importCraftBtn', 'click', () => $('fileInput').click());
    on('fileInput', 'change', e => { if (e.target.files && e.target.files[0]) importCraftFile(e.target.files[0]); e.target.value = ''; });
    on('customPartBtn', 'click', openCustomPart); on('validateCustomBtn', 'click', validateCustomPart);
    on('flagBtn', 'click', openFlagEditor); on('saveFlagBtn', 'click', saveFlag); on('downloadFlagBtn', 'click', () => downloadCanvas($('flagCanvas'), 'bsp-flag.png'));
    for (const key of ['flagColor1', 'flagColor2', 'flagColor3', 'flagPattern', 'flagEmblem', 'agencyNameInput']) on(key, 'input', () => {
      flagData = { name: $('agencyNameInput').value, color1: $('flagColor1').value, color2: $('flagColor2').value, color3: $('flagColor3').value, pattern: $('flagPattern').value, emblem: $('flagEmblem').value };
      updateFlagCanvas();
    });
    on('multiBtn', 'click', () => showModal('multiModal'));
    on('sameAgencyBtn', 'click', () => joinMultiplayer('same'));
    on('rivalAgencyBtn', 'click', () => joinMultiplayer('compete'));
    on('leaveRoomBtn', 'click', leaveMultiplayer);
    on('helpBtn', 'click', () => showModal('helpModal'));
    on('shaderBtn', 'click', () => { editor.shaders = !editor.shaders; editor.geometryCache.clear(); updateStatusButtons(); editor.render(); });
    on('launchBtn', 'click', launch);
    on('returnEditorBtn', 'click', () => setView('vab'));
    on('povBtn', 'click', () => showModal('povModal'));
    on('launchToMapBtn', 'click', () => { flightViewBeforeMap = 'flight'; setView('map'); });
    on('mapReturnBtn', 'click', () => setView(flightViewBeforeMap || 'flight'));
    on('scaleToggle', 'click', () => { mapScaleLog = !mapScaleLog; $('scaleToggle').textContent = mapScaleLog ? 'LOG MAP' : 'TRUE SCALE'; drawMap(); });
    on('mapCanvas', 'click', mapClick);
    on('addNodeBtn', 'click', () => { if (vessel) { maneuverNode = { time: time + 120, dv: 150, body: vessel.body }; drawMap(); log('MANEUVER NODE CREATED — 150 m/s PROGRADE'); } });
    on('executeNodeBtn', 'click', executeManeuver);
    on('deployBeaconBtn', 'click', deployBeacon);
    on('stageBtn', 'click', handleStage);
    on('throttleRange', 'input', e => { if (vessel) vessel.throttle = Number(e.target.value) / 100; });
    on('sasBtn', 'click', () => { if (vessel) { vessel.sas = !vessel.sas; updateFlightHud(); } });
    on('rcsBtn', 'click', () => { if (vessel) { vessel.rcs = !vessel.rcs; updateFlightHud(); } });
    on('warpDown', 'click', () => stepWarp(-1)); on('warpUp', 'click', () => stepWarp(1));
    on('warpPause', 'click', () => { paused = !paused; $('warpPause').textContent = paused ? 'RESUME' : 'PAUSE'; });
    on('autoStageBtn', 'click', () => { editor.parts.forEach(p => { const def = editor.getDefinition(p); p.stage = def?.thrust ? 0 : def?.stage ?? 1; }); renderStageList(); log('STAGING LIST REBUILT'); });
    on('campaignBtn', 'click', () => { renderCampaign(); showModal('campaignModal'); });
    on('startCampaignBtn', 'click', () => { campaign.accepted = true; campaign.playerProgress = 0; campaign.target = selectedDestination || 'Duna'; renderCampaign(); saveCampaign(); hideModal('campaignModal'); log('CONTRACT ACCEPTED — SURVEY ' + campaign.target.toUpperCase()); });
    on('humanPovBtn', 'click', () => { povMode = 'human'; $('povStatus').textContent = 'Computer perspective: Human Space Program. Mission labels now use human mission terminology.'; });
    on('kerbalPovBtn', 'click', () => { povMode = 'kerbal'; $('povStatus').textContent = 'Computer perspective: Kerbal Space Program. Mission labels now use Kerbal-style terminology.'; });
    on('menuStatus', 'click', () => showModal('helpModal'));
    for (const key of ['wingArea', 'camber', 'incidence', 'sweep', 'dihedral', 'control']) on(key, 'input', e => {
      if (!editor) return;
      editor.setWingValue(key, Number(e.target.value));
      const out = $(key + 'Out'); if (out) out.textContent = e.target.value + (key === 'wingArea' ? ' m²' : '°');
      pushUndo();
    });
    document.querySelectorAll('.menubar button').forEach(button => button.addEventListener('click', () => {
      const menu = button.dataset.menu;
      const actions = {
        File: () => saveCraft(), Edit: () => showModal('helpModal'), View: () => setView(currentView === 'map' ? 'flight' : 'map'),
        Flight: () => vessel ? setView('flight') : launch(), Settings: () => showModal('helpModal'), Help: () => showModal('helpModal')
      };
      actions[menu]?.();
    }));
  }

  function init() {
    seededStars(); loadCampaign();
    try { const flag = localStorage.getItem(FLAG_KEY); if (flag) flagData = { ...flagData, ...JSON.parse(flag) }; } catch (_) {}
    editor = new window.BSPEditor($('editorCanvas'), () => {
      renderInspector();
      const snapshot = craftSnapshot();
      if (lastEditorSave && snapshot !== lastEditorSave && !keys.has('control')) pushUndo();
    });
    lastEditorSave = craftSnapshot();
    bindUI(); renderCatalog(); renderInspector(); renderCampaign(); updateFlagCanvas();
    currentAgency = flagData.name || currentAgency;
    $('agencyReadout').textContent = currentAgency.toUpperCase();
    $('timeReadout').textContent = 'MISSION ELAPSED 00:00:00';
    setView('vab');
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', () => keys.clear());
    window.addEventListener('resize', () => { editor.resize(); if (currentView === 'map') drawMap(); if (currentView === 'flight') drawFlightView(); });
    requestAnimationFrame(updateFrame);
    log('READY — EDIT THE VEHICLE OR OPEN THE SPACEPLANE HANGAR');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
