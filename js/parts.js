/* Bob Space Program — original, low-poly part catalogue.
   All dimensions are in metres, masses in kg, fuel in kg, thrust in kN. */
(function () {
  'use strict';

  const MAX_ENGINE_THRUST_KN = 9000;
  const part = (key, name, category, shape, color, mass, width, height, depth, extra = {}) => ({
    key, name, category, shape, color, mass, width, height, depth,
    fuel: 0, thrust: 0, isp: 0, stage: 0, nodes: [], ...extra
  });

  const catalogue = [
    part('pod1', 'B-1 Bob Command Pod', 'Command', 'capsule', '#75a6a8', 1200, 1.8, 2.4, 1.8,
      { description: 'One-seat re-entry capsule with basic control.', crew: 1, nodes: [{ p: [0, 1.2, 0], type: 'top' }, { p: [0, -1.2, 0], type: 'bottom' }] }),
    part('cockpit', 'Aero-2 Spaceplane Cockpit', 'Command', 'cockpit', '#789ca8', 1100, 2.4, 1.5, 2.4,
      { description: 'Inline cockpit for atmospheric flight.', crew: 2, nodes: [{ p: [0, 0, -1.2], type: 'rear' }] }),
    part('probe', 'Pico Guidance Core', 'Command', 'box', '#8b9da1', 90, 0.7, 0.7, 0.7,
      { description: 'Uncrewed guidance computer.', nodes: [{ p: [0, 0.35, 0], type: 'top' }, { p: [0, -0.35, 0], type: 'bottom' }] }),
    part('tankS', 'LOX / RP-1 Tank S', 'Fuel', 'cylinder', '#d7d5ca', 820, 1.35, 3.2, 1.35,
      { fuel: 4200, description: 'Compact liquid-propellant tank.', nodes: [{ p: [0, 1.6, 0], type: 'top' }, { p: [0, -1.6, 0], type: 'bottom' }] }),
    part('tankM', 'LOX / RP-1 Tank M', 'Fuel', 'cylinder', '#d4d2c6', 2400, 1.9, 5.2, 1.9,
      { fuel: 12600, description: 'Medium launch-vehicle propellant tank.', nodes: [{ p: [0, 2.6, 0], type: 'top' }, { p: [0, -2.6, 0], type: 'bottom' }] }),
    part('tankXL', 'Hydrogen Tank XL', 'Fuel', 'cylinder', '#c6d8d8', 3100, 2.2, 6.2, 2.2,
      { fuel: 18000, description: 'Large insulated cryogenic tank.', nodes: [{ p: [0, 3.1, 0], type: 'top' }, { p: [0, -3.1, 0], type: 'bottom' }] }),
    part('engine1', 'Merlin-class Vacuum Engine', 'Engines', 'engine', '#aeb9bd', 520, 1.3, 1.5, 1.3,
      { thrust: 900, isp: 348, description: 'Compact high-efficiency liquid engine.', nodes: [{ p: [0, 0.75, 0], type: 'top' }, { p: [0, -0.75, 0], type: 'bottom' }] }),
    part('engine2', 'Hydrolox Upper-stage Engine', 'Engines', 'engine', '#b9c2c5', 1400, 2.0, 2.0, 2.0,
      { thrust: 2200, isp: 450, description: 'High specific-impulse upper-stage engine.', nodes: [{ p: [0, 1, 0], type: 'top' }, { p: [0, -1, 0], type: 'bottom' }] }),
    part('engine3', 'Heavy Lift Cluster', 'Engines', 'engine', '#929da2', 7200, 3.2, 2.6, 3.2,
      { thrust: 9000, isp: 310, description: 'BSP stock catalogue thrust ceiling: 9,000 kN.', nodes: [{ p: [0, 1.3, 0], type: 'top' }, { p: [0, -1.3, 0], type: 'bottom' }] }),
    part('solid', 'SRB-2 Booster', 'Engines', 'cylinder', '#d7d0c2', 900, 1.1, 5.0, 1.1,
      { fuel: 2600, thrust: 1800, isp: 255, description: 'Solid booster; thrust tapers as propellant is used.', nodes: [{ p: [0, 2.5, 0], type: 'top' }, { p: [0, -2.5, 0], type: 'bottom' }] }),
    part('decoupler', 'TD-18 Stack Decoupler', 'Structural', 'ring', '#c9c7bb', 110, 1.65, 0.42, 1.65,
      { stage: 1, description: 'Separates the attached upper stack at staging.', nodes: [{ p: [0, 0.21, 0], type: 'top' }, { p: [0, -0.21, 0], type: 'bottom' }] }),
    part('separator', 'Radial Separator', 'Structural', 'box', '#c8c6bc', 80, 0.45, 0.45, 0.45,
      { stage: 1, description: 'Radial attachment separator.', nodes: [{ p: [0, 0, 0], type: 'surface' }] }),
    part('fairing', 'Payload Fairing', 'Structural', 'fairing', '#d9d7cc', 260, 2.4, 3.5, 2.4,
      { description: 'Protects a payload during ascent.', nodes: [{ p: [0, 1.75, 0], type: 'top' }, { p: [0, -1.75, 0], type: 'bottom' }] }),
    part('nose', 'Aero Nose Cone', 'Structural', 'cone', '#d9d7cc', 70, 1.35, 1.5, 1.35,
      { description: 'Reduces drag on exposed stack tops.', nodes: [{ p: [0, -0.75, 0], type: 'bottom' }] }),
    part('wing', 'Aerofoil Wing', 'Aero', 'wing', '#b9c2c6', 260, 4.2, 0.24, 1.8,
      { wingArea: 7.5, camber: 3, incidence: 0, sweep: 12, dihedral: 3, control: 0, description: 'Adjustable low-poly wing. Tune camber, incidence, sweep, dihedral and control deflection.', nodes: [{ p: [0, 0, 0], type: 'surface' }] }),
    part('deltaWing', 'Delta Wing Panel', 'Aero', 'delta', '#b2bdc1', 420, 4.8, 0.22, 3.0,
      { wingArea: 10.5, camber: 2, incidence: 0, sweep: 38, dihedral: 2, control: 0, description: 'Swept delta planform for fast atmospheric vehicles.', nodes: [{ p: [0, 0, 0], type: 'surface' }] }),
    part('elevon', 'Elevon Control Surface', 'Aero', 'wing', '#a8b6bc', 100, 2.1, 0.16, 0.85,
      { wingArea: 2.1, camber: 2, incidence: 0, sweep: 18, dihedral: 0, control: 18, description: 'Movable control surface for pitch and roll.', nodes: [{ p: [0, 0, 0], type: 'surface' }] }),
    part('gear', 'Retractable Landing Gear', 'Aero', 'gear', '#7d888d', 140, 0.55, 1.3, 0.55,
      { description: 'Landing gear for runway operations.', nodes: [{ p: [0, 0.65, 0], type: 'surface' }] }),
    part('parachute', 'Drogue / Main Chute', 'Recovery', 'parachute', '#c7b7a0', 120, 1.25, 0.6, 1.25,
      { description: 'Deployable recovery canopy.', nodes: [{ p: [0, -0.3, 0], type: 'bottom' }] }),
    part('battery', 'Z-400 Battery', 'Electrical', 'box', '#c4b879', 45, 0.45, 0.5, 0.45,
      { description: 'Electrical storage for probes and control systems.', nodes: [{ p: [0, 0.25, 0], type: 'top' }, { p: [0, -0.25, 0], type: 'bottom' }] }),
    part('solar', 'Deployable Solar Array', 'Electrical', 'solar', '#527da7', 95, 1.8, 0.12, 2.2,
      { description: 'Lightweight solar panel for long-duration missions.', nodes: [{ p: [0, 0, 0], type: 'surface' }] }),
    part('wheel', 'Reaction Wheel', 'Control', 'box', '#a7adaf', 180, 0.9, 0.9, 0.9,
      { description: 'Attitude control without propellant.', nodes: [{ p: [0, 0.45, 0], type: 'top' }, { p: [0, -0.45, 0], type: 'bottom' }] }),
    part('rcs', 'RCS Translation Block', 'Control', 'rcs', '#aab7bb', 25, 0.55, 0.5, 0.55,
      { description: 'Small attitude and translation thrusters.', nodes: [{ p: [0, 0, 0], type: 'surface' }] }),
    part('dock', 'APAS-style Docking Port', 'Utility', 'ring', '#aab6ba', 130, 1.05, 0.35, 1.05,
      { description: 'Docking interface for orbital assembly.', nodes: [{ p: [0, 0.175, 0], type: 'top' }, { p: [0, -0.175, 0], type: 'bottom' }] }),
    part('heatshield', 'Ablative Heat Shield', 'Recovery', 'shield', '#9b7770', 260, 2.2, 0.45, 2.2,
      { description: 'Thermal protection for atmospheric entry.', nodes: [{ p: [0, 0.225, 0], type: 'top' }] }),
    part('science', 'Miniature Science Lab', 'Science', 'box', '#819d8b', 220, 1.2, 1.1, 1.2,
      { description: 'Stores and processes experiment data.', nodes: [{ p: [0, 0.55, 0], type: 'top' }, { p: [0, -0.55, 0], type: 'bottom' }] }),
    part('relay', 'Long-range Relay Antenna', 'Science', 'antenna', '#b6bcb4', 35, 0.25, 1.9, 0.25,
      { description: 'Communications relay for remote missions.', nodes: [{ p: [0, -0.95, 0], type: 'bottom' }] }),
    part('drill', 'Surface Survey Drill', 'Science', 'drill', '#a8afb1', 320, 0.9, 1.5, 0.9,
      { description: 'Surface sampler for planetary exploration.', nodes: [{ p: [0, 0.75, 0], type: 'top' }] }),
  ];

  const byKey = Object.fromEntries(catalogue.map(p => [p.key, p]));

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function makeGeometry(def, detail = 8) {
    const w = def.width / 2, h = def.height / 2, d = def.depth / 2;
    const triangles = [];
    const tri = (a, b, c) => triangles.push([a, b, c]);
    const quad = (a, b, c, e) => { tri(a, b, c); tri(a, c, e); };
    const box = (x, y, z) => {
      const a = [-x, -y, -z], b = [x, -y, -z], c = [x, y, -z], e = [-x, y, -z];
      const f = [-x, -y, z], g = [x, -y, z], h1 = [x, y, z], i = [-x, y, z];
      quad(a, b, c, e); quad(f, i, h1, g); quad(a, f, g, b);
      quad(b, g, h1, c); quad(c, h1, i, e); quad(e, i, f, a);
    };
    const cylinder = (radius, height, sides = detail, topRadius = radius) => {
      const y0 = -height / 2, y1 = height / 2;
      for (let i = 0; i < sides; i++) {
        const a = i / sides * Math.PI * 2, b = (i + 1) / sides * Math.PI * 2;
        const p0 = [Math.cos(a) * radius, y0, Math.sin(a) * radius];
        const p1 = [Math.cos(b) * radius, y0, Math.sin(b) * radius];
        const p2 = [Math.cos(b) * topRadius, y1, Math.sin(b) * topRadius];
        const p3 = [Math.cos(a) * topRadius, y1, Math.sin(a) * topRadius];
        quad(p0, p1, p2, p3);
        tri([0, y0, 0], p1, p0);
        tri([0, y1, 0], p3, p2);
      }
    };

    switch (def.shape) {
      case 'cylinder': cylinder(Math.min(w, d), def.height, 10); break;
      case 'engine':
        cylinder(Math.min(w, d) * 0.58, def.height * 0.72, 10, Math.min(w, d));
        cylinder(Math.min(w, d), def.height * 0.24, 10, Math.min(w, d) * 0.9);
        break;
      case 'ring': {
        const outer = Math.min(w, d), inner = outer * 0.68, y0 = -h, y1 = h, n = 12;
        for (let i = 0; i < n; i++) {
          const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2;
          const p = (r, ang, y) => [Math.cos(ang) * r, y, Math.sin(ang) * r];
          quad(p(outer, a, y0), p(outer, b, y0), p(outer, b, y1), p(outer, a, y1));
          quad(p(inner, b, y0), p(inner, a, y0), p(inner, a, y1), p(inner, b, y1));
        }
        break;
      }
      case 'cone': cylinder(w, def.height, 10, 0.025); break;
      case 'fairing': cylinder(w, def.height, 10, 0.05); break;
      case 'capsule':
        cylinder(Math.min(w, d), def.height * 0.72, 10, Math.min(w, d) * 0.78);
        cylinder(Math.min(w, d) * 0.78, def.height * 0.3, 10, 0.03);
        break;
      case 'cockpit': box(w, h, d); break;
      case 'wing': {
        const sweep = (def.sweep || 0) / 100 * w;
        const p1 = [-w, 0, -d], p2 = [w, 0, -d + sweep], p3 = [w * 0.72, 0, d], p4 = [-w * 0.72, 0, d];
        const top = [0, h, 0], bot = [0, -h, 0];
        quad(p1, p2, p3, p4);
        tri(p1, p4, bot); tri(p4, p3, bot); tri(p3, p2, bot); tri(p2, p1, bot);
        tri(p1, top, p2); tri(p2, top, p3); tri(p3, top, p4); tri(p4, top, p1);
        break;
      }
      case 'delta': {
        const front = [0, 0, -d], left = [-w, 0, d], right = [w, 0, d], top = [0, h, 0], bot = [0, -h, 0];
        tri(front, right, left); tri(front, left, top); tri(left, right, top); tri(front, bot, right); tri(right, bot, left); tri(left, bot, front);
        break;
      }
      case 'parachute':
        cylinder(w * 0.9, h * 0.65, 8, w * 0.25);
        break;
      case 'gear':
        box(w * 0.32, h * 0.55, d * 0.3);
        box(w * 0.12, h * 0.12, d * 0.9);
        break;
      case 'solar': box(w, h, d); break;
      case 'rcs': box(w, h, d); break;
      case 'shield': cylinder(w, def.height, 12, w * 0.65); break;
      case 'antenna':
        cylinder(w * 0.16, def.height, 6);
        cylinder(w * 0.9, 0.08, 8, w * 0.9);
        break;
      case 'drill':
        cylinder(w * 0.72, h * 1.3, 8, w * 0.6);
        cylinder(w * 0.3, h * 0.6, 6, 0.02);
        break;
      default: box(w, h, d);
    }
    return triangles;
  }

  function validateCustomPart(input) {
    if (!input || typeof input !== 'object') throw new Error('Part definition must be a JSON object.');
    const allowedShapes = ['box', 'cylinder', 'engine', 'wing', 'delta', 'cone'];
    const result = {
      key: String(input.key || 'customPart').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 28) || 'customPart',
      name: String(input.name || 'Custom Part').slice(0, 48),
      category: 'Custom',
      shape: allowedShapes.includes(input.shape) ? input.shape : 'box',
      color: /^#[0-9a-fA-F]{6}$/.test(input.color) ? input.color : '#9aa7ad',
      mass: Number(input.mass), width: Number(input.width), height: Number(input.height), depth: Number(input.depth),
      fuel: Math.max(0, Number(input.fuel || 0)), thrust: Math.max(0, Number(input.thrust || 0)),
      isp: Math.max(0, Number(input.isp || 0)), stage: 0,
      description: 'User-authored JSON part. Geometry and values are validated before use.',
      nodes: [{ p: [0, Number(input.height) / 2, 0], type: 'top' }, { p: [0, -Number(input.height) / 2, 0], type: 'bottom' }]
    };
    if (![result.mass, result.width, result.height, result.depth].every(Number.isFinite)) throw new Error('Mass and dimensions must be valid numbers.');
    if (result.mass <= 0 || result.width < 0.1 || result.height < 0.1 || result.depth < 0.1 || Math.max(result.width, result.height, result.depth) > 20) throw new Error('Use positive mass and dimensions between 0.1 m and 20 m.');
    if (result.fuel > 100000) throw new Error('Custom fuel capacity is limited to 100,000 kg.');
    if (result.thrust > MAX_ENGINE_THRUST_KN) throw new Error('Thrust exceeds the BSP stock-engine ceiling of ' + MAX_ENGINE_THRUST_KN.toLocaleString() + ' kN.');
    if (result.thrust > 0 && result.isp < 1) throw new Error('An engine needs a positive specific impulse (Isp).');
    return result;
  }

  window.BSPParts = {
    catalogue, byKey, MAX_ENGINE_THRUST_KN, clone, makeGeometry, validateCustomPart
  };
})();
