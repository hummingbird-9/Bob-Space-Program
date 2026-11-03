/* Bob Space Program — original, optimized procedural part catalogue.
   All dimensions are in metres, masses in kg, fuel in kg, thrust in kN. */
(function () {
  'use strict';

  const MAX_ENGINE_THRUST_KN = 9000;
  const part = (key, name, category, shape, color, mass, width, height, depth, extra = {}) => ({
    key, name, category, shape, color, mass, width, height, depth,
    fuel: 0, thrust: 0, isp: 0, stage: 0, nodes: [], ...extra
  });

  const catalogue = [
    part('pod1', 'B-1 Bob Command Pod', 'Command', 'capsule', '#75a6a8', 1200, 1.9, 2.4, 1.9,
      { description: 'One-seat re-entry capsule with basic control.', crew: 1, nodes: [{ p: [0, 1.2, 0], type: 'top' }, { p: [0, -1.2, 0], type: 'bottom' }] }),
    part('cockpit', 'Aero-2 Spaceplane Cockpit', 'Command', 'cockpit', '#789ca8', 1100, 2.4, 1.5, 2.4,
      { description: 'Glazed two-seat cockpit with a tapered nose, canopy framing and rear fuselage attachment.', crew: 2, nodes: [{ p: [0, 0.75, 0], type: 'top' }, { p: [0, -0.75, 0], type: 'bottom' }, { p: [1.2, 0, 0], type: 'surface', normal: [1,0,0] }, { p: [-1.2, 0, 0], type: 'surface', normal: [-1,0,0] }] }),
    part('probe', 'Pico Guidance Core', 'Command', 'box', '#8b9da1', 90, 0.7, 0.7, 0.7,
      { description: 'Uncrewed guidance computer.', nodes: [{ p: [0, 0.35, 0], type: 'top' }, { p: [0, -0.35, 0], type: 'bottom' }] }),
    part('tankS', 'LOX / RP-1 Tank S', 'Fuel', 'cylinder', '#d7d5ca', 820, 1.35, 3.2, 1.35,
      { fuel: 4200, description: 'Compact liquid-propellant tank.', nodes: [{ p: [0, 1.6, 0], type: 'top' }, { p: [0, -1.6, 0], type: 'bottom' }] }),
    part('tankM', 'LOX / RP-1 Tank M', 'Fuel', 'cylinder', '#d4d2c6', 2400, 1.9, 5.2, 1.9,
      { fuel: 12600, description: 'Medium launch-vehicle propellant tank.', nodes: [{ p: [0, 2.6, 0], type: 'top' }, { p: [0, -2.6, 0], type: 'bottom' }] }),
    part('tankXL', 'Hydrogen Tank XL', 'Fuel', 'cylinder', '#c6d8d8', 3100, 3.2, 6.2, 3.2,
      { fuel: 18000, description: 'Large insulated cryogenic tank.', nodes: [{ p: [0, 3.1, 0], type: 'top' }, { p: [0, -3.1, 0], type: 'bottom' }] }),
    part('jetTank', 'AeroJet Fuselage Fuel Cell', 'Fuel', 'cylinder', '#b9c3c5', 360, 1.0, 1.7, 1.15,
      { fuel: 850, dragCoefficient: 0.2, description: 'Compact aviation-fuel tank for turbofans, turbojets and ramjets.', nodes: [{ p: [0, 0.85, 0], type: 'top' }, { p: [0, -0.85, 0], type: 'bottom' }] }),
    part('engine1', 'Merlin-class Vacuum Engine', 'Engines', 'engine', '#aeb9bd', 520, 1.35, 1.5, 1.35,
      { thrust: 900, isp: 348, description: 'Compact high-efficiency liquid engine.', nodes: [{ p: [0, 0.75, 0], type: 'top' }, { p: [0, -0.75, 0], type: 'bottom' }] }),
    part('engine2', 'Hydrolox Upper-stage Engine', 'Engines', 'engine', '#b9c2c5', 1400, 1.9, 2.0, 1.9,
      { thrust: 2200, isp: 450, description: 'High specific-impulse upper-stage engine.', nodes: [{ p: [0, 1, 0], type: 'top' }, { p: [0, -1, 0], type: 'bottom' }] }),
    part('engine3', 'Heavy Lift Cluster', 'Engines', 'engine', '#929da2', 7200, 3.2, 2.6, 3.2,
      { thrust: 9000, isp: 310, description: 'BSP stock catalogue thrust ceiling: 9,000 kN.', nodes: [{ p: [0, 1.3, 0], type: 'top' }, { p: [0, -1.3, 0], type: 'bottom' }] }),
    part('turbofan', 'TF-90 High-bypass Turbofan', 'Engines', 'engine', '#87969e', 520, 1.2, 1.45, 1.2,
      { thrust: 90, isp: 7200, airbreathing: true, minAirDensity: 0.018, minSpeed: 0, description: 'Air-breathing turbofan for runway takeoff and efficient subsonic cruise.', nodes: [{ p: [0, 0.72, 0], type: 'top' }, { p: [0, -0.72, 0], type: 'bottom' }] }),
    part('turbojet', 'TJ-4 Afterburning Turbojet', 'Engines', 'engine', '#9aa5aa', 430, 0.95, 1.6, 0.95,
      { thrust: 125, isp: 5200, airbreathing: true, minAirDensity: 0.008, minSpeed: 35, description: 'Afterburning turbojet for high-speed atmospheric flight.', nodes: [{ p: [0, 0.8, 0], type: 'top' }, { p: [0, -0.8, 0], type: 'bottom' }] }),
    part('ramjet', 'RJ-2 Supersonic Ramjet', 'Engines', 'engine', '#b1b8ba', 380, 0.9, 1.8, 0.9,
      { thrust: 105, isp: 8800, airbreathing: true, minAirDensity: 0.0015, minSpeed: 260, description: 'Supersonic air-breathing engine. Requires an atmosphere and high forward speed.', nodes: [{ p: [0, 0.9, 0], type: 'top' }, { p: [0, -0.9, 0], type: 'bottom' }] }),
    part('intake', 'Shock-cone Air Intake', 'Aero', 'intake', '#687b86', 85, 0.7, 0.65, 0.9,
      { dragCoefficient: 0.34, description: 'Nose-facing intake duct supplying atmospheric engines.', nodes: [{ p: [0, 0.325, 0], type: 'top' }, { p: [0, -0.325, 0], type: 'bottom' }] }),
    part('solid', 'SRB-2 Booster', 'Engines', 'cylinder', '#d7d0c2', 900, 1.1, 5.0, 1.1,
      { fuel: 2600, thrust: 1800, isp: 255, description: 'Solid booster; thrust tapers as propellant is used.', nodes: [{ p: [0, 2.5, 0], type: 'top' }, { p: [0, -2.5, 0], type: 'bottom' }] }),
    part('decoupler', 'TD-18 Stack Decoupler', 'Structural', 'ring', '#c9c7bb', 130, 1.9, 0.42, 1.9,
      { stage: 1, description: 'Separates the attached upper stack at staging.', nodes: [{ p: [0, 0.21, 0], type: 'top' }, { p: [0, -0.21, 0], type: 'bottom' }] }),
    part('decouplerS', 'TD-12 Small Stack Decoupler', 'Structural', 'ring', '#c9c7bb', 75, 1.35, 0.34, 1.35,
      { stage: 1, description: 'Small-diameter stack separator sized for compact tanks.', nodes: [{ p: [0, 0.17, 0], type: 'top' }, { p: [0, -0.17, 0], type: 'bottom' }] }),
    part('decouplerXL', 'TD-32 Heavy Stack Decoupler', 'Structural', 'ring', '#c9c7bb', 260, 3.2, 0.5, 3.2,
      { stage: 1, description: 'Large stack separator for heavy-lift diameter tanks.', nodes: [{ p: [0, 0.25, 0], type: 'top' }, { p: [0, -0.25, 0], type: 'bottom' }] }),
    part('separator', 'Radial Separator', 'Structural', 'box', '#c8c6bc', 80, 0.45, 0.45, 0.45,
      { stage: 1, description: 'Radial attachment separator.', nodes: [{ p: [0, 0, 0], type: 'surface' }] }),
    part('fairingBase', 'PF-24 Procedural Fairing Base', 'Structural', 'ring', '#c5c9c5', 95, 2.4, 0.28, 2.4,
      { fairingBase: true, description: 'Procedural fairing base. Placing it opens the shell builder.', nodes: [{ p: [0, 0.14, 0], type: 'top' }, { p: [0, -0.14, 0], type: 'bottom' }] }),
    part('fairing', 'Payload Fairing', 'Structural', 'fairing', '#d9d7cc', 260, 2.4, 3.5, 2.4,
      { description: 'Protects a payload during ascent.', nodes: [{ p: [0, 1.75, 0], type: 'top' }, { p: [0, -1.75, 0], type: 'bottom' }] }),
    part('nose', 'Aero Nose Cone', 'Structural', 'cone', '#d9d7cc', 70, 1.9, 1.5, 1.9,
      { description: 'Reduces drag on exposed stack tops.', nodes: [{ p: [0, -0.75, 0], type: 'bottom' }] }),
    part('wing', 'Aerofoil Wing', 'Aero', 'wing', '#b9c2c6', 260, 4.2, 0.24, 1.8,
      { wingArea: 7.5, camber: 3, incidence: 0, sweep: 12, dihedral: 3, control: 0, airfoilThickness: 12, airfoilProfile: 'naca0012', planform: 'straight', dragCoefficient: 0.08, description: 'Adjustable airfoil with NACA profile, camber, incidence, sweep and dihedral tuning.', nodes: [{ p: [0, 0, 0], type: 'surface' }] }),
    part('deltaWing', 'Delta Wing Panel', 'Aero', 'delta', '#b2bdc1', 420, 4.8, 0.22, 3.0,
      { wingArea: 10.5, camber: 2, incidence: 0, sweep: 38, dihedral: 2, control: 0, airfoilThickness: 11, airfoilProfile: 'naca0012', planform: 'delta', dragCoefficient: 0.09, description: 'Swept delta planform for fast atmospheric vehicles.', nodes: [{ p: [0, 0, 0], type: 'surface' }] }),
    part('elevon', 'Elevon Control Surface', 'Aero', 'wing', '#a8b6bc', 100, 2.1, 0.16, 0.85,
      { wingArea: 2.1, camber: 2, incidence: 0, sweep: 18, dihedral: 0, control: 18, airfoilThickness: 9, airfoilProfile: 'naca0012', planform: 'control', controlSurface: 'elevon', dragCoefficient: 0.075, description: 'Movable combined pitch-and-roll elevon surface.', nodes: [{ p: [0, 0, 0], type: 'surface' }] }),
    part('smallWing', 'B-12 Micro Wing Panel', 'Aero', 'wing', '#adb8bd', 58, 1.25, 0.12, 0.62,
      { wingArea: 1.1, camber: 2, sweep: 4, dihedral: 1, airfoilThickness: 10, airfoilProfile: 'naca0012', planform: 'straight', dragCoefficient: 0.07, description: 'Very thin modular wing for small aircraft and custom wingtip shapes.', nodes: [] }),
    part('sweptWing', 'B-24 Swept Wing Panel', 'Aero', 'wing', '#aeb9bd', 190, 3.1, 0.17, 1.25,
      { wingArea: 4.4, camber: 3, sweep: 28, dihedral: 4, airfoilThickness: 11, airfoilProfile: 'naca2412', planform: 'swept', dragCoefficient: 0.075, description: 'Swept, tapered high-speed wing panel.', nodes: [] }),
    part('deltaSmall', 'B-30 Compact Delta', 'Aero', 'delta', '#aab5b9', 160, 2.2, 0.15, 1.8,
      { wingArea: 3.2, camber: 2, sweep: 43, dihedral: 1, airfoilThickness: 10, airfoilProfile: 'naca0012', planform: 'delta', dragCoefficient: 0.09, description: 'Small triangular delta wing panel.', nodes: [] }),
    part('canard', 'B-6 Canard Panel', 'Aero', 'wing', '#b8c2c5', 78, 1.7, 0.13, 0.72,
      { wingArea: 1.8, camber: 3, sweep: 18, dihedral: 0, airfoilThickness: 10, airfoilProfile: 'naca2412', planform: 'canard', dragCoefficient: 0.08, description: 'Forward canard for pitch authority.', nodes: [] }),
    part('tailplane', 'B-18 Horizontal Tailplane', 'Aero', 'wing', '#aeb9bd', 125, 2.6, 0.15, 0.8,
      { wingArea: 2.8, camber: 2, sweep: 22, dihedral: 2, airfoilThickness: 10, airfoilProfile: 'naca0012', planform: 'tail', dragCoefficient: 0.075, description: 'Horizontal stabilizer with adjustable incidence.', nodes: [] }),
    part('winglet', 'B-9 Winglet', 'Aero', 'wing', '#aab5b9', 42, 0.48, 0.82, 0.22,
      { wingArea: 0.38, camber: 1, sweep: 20, dihedral: 72, airfoilThickness: 9, airfoilProfile: 'naca0012', planform: 'winglet', dragCoefficient: 0.06, description: 'Vertical wingtip panel.', nodes: [] }),
    part('strake', 'B-22 Leading-edge Strake', 'Aero', 'delta', '#aab5b9', 68, 1.65, 0.12, 0.72,
      { wingArea: 1.05, camber: 2, sweep: 52, dihedral: 0, airfoilThickness: 9, airfoilProfile: 'naca0012', planform: 'strake', dragCoefficient: 0.085, description: 'Narrow highly swept wing-root extension.', nodes: [] }),
    part('flaperon', 'B-14 Flaperon', 'Aero', 'wing', '#a5b1b7', 86, 1.9, 0.13, 0.58,
      { wingArea: 1.55, camber: 2, sweep: 12, dihedral: 0, control: 12, airfoilThickness: 9, airfoilProfile: 'naca0012', planform: 'control', controlSurface: 'flaperon', dragCoefficient: 0.08, description: 'Combined flap and aileron surface.', nodes: [] }),
    part('aileron', 'B-10 Aileron', 'Aero', 'wing', '#a5b1b7', 64, 1.3, 0.12, 0.48,
      { wingArea: 0.95, camber: 1, sweep: 8, control: 16, airfoilThickness: 8, airfoilProfile: 'naca0012', planform: 'control', controlSurface: 'aileron', dragCoefficient: 0.075, description: 'Roll-control surface for conventional aircraft.', nodes: [] }),
    part('flap', 'B-16 Landing Flap', 'Aero', 'wing', '#a5b1b7', 70, 1.5, 0.13, 0.55,
      { wingArea: 1.1, camber: 5, sweep: 8, control: 20, airfoilThickness: 10, airfoilProfile: 'naca2412', planform: 'control', controlSurface: 'flap', dragCoefficient: 0.11, description: 'High-lift trailing-edge flap.', nodes: [] }),
    part('rudder', 'B-7 Vertical Rudder', 'Aero', 'wing', '#a5b1b7', 68, 0.9, 0.5, 0.15,
      { wingArea: 0.72, camber: 1, sweep: 12, control: 18, airfoilThickness: 9, airfoilProfile: 'naca0012', planform: 'rudder', controlSurface: 'rudder', dragCoefficient: 0.08, description: 'Movable vertical yaw-control surface.', nodes: [] }),
    part('gear', 'Retractable Landing Gear', 'Aero', 'gear', '#7d888d', 140, 0.75, 1.8, 0.75,
      { deployable: 'gear', defaultDeployed: true, description: 'Retractable landing gear with an articulated strut and wheel.', nodes: [{ p: [0, 0.9, 0], type: 'surface' }] }),
    part('landingLeg', 'Adjustable Landing Strut', 'Aero', 'gear', '#8b969b', 210, 0.95, 2.2, 0.95,
      { deployable: 'gear', defaultDeployed: true, description: 'Long deployable landing leg for landers and heavy test vehicles.', nodes: [{ p: [0, 1.1, 0], type: 'surface' }] }),
    part('parachute', 'Drogue / Main Chute', 'Recovery', 'parachute', '#c7b7a0', 120, 1.25, 0.6, 1.25,
      { description: 'Deployable recovery canopy.', nodes: [{ p: [0, -0.3, 0], type: 'bottom' }] }),
    part('battery', 'Z-400 Battery', 'Electrical', 'box', '#c4b879', 45, 0.45, 0.5, 0.45,
      { description: 'Electrical storage for probes and control systems.', nodes: [{ p: [0, 0.25, 0], type: 'top' }, { p: [0, -0.25, 0], type: 'bottom' }] }),
    part('solar', 'Deployable Solar Array', 'Electrical', 'solar', '#527da7', 95, 2.4, 0.12, 2.2,
      { deployable: 'solar', defaultDeployed: false, description: 'Hinged solar array with folding wings and cell grid.', nodes: [{ p: [0, 0, 0], type: 'surface' }] }),
    part('wheel', 'Reaction Wheel', 'Control', 'wheel', '#a7adaf', 180, 0.9, 0.9, 0.9,
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

  // Give cylindrical tanks real radial attachment points and wings distinct
  // root nodes, so the editor can snap wings to the fuselage rather than by center.
  for (const key of ['tankS', 'tankM', 'tankXL', 'solid']) {
    const def = catalogue.find(item => item.key === key);
    const radius = Math.min(def.width, def.depth) / 2;
    def.nodes.push(
      { p: [radius, 0, 0], type: 'surface', normal: [1, 0, 0] },
      { p: [-radius, 0, 0], type: 'surface', normal: [-1, 0, 0] }
    );
  }
  for (const key of ['wing', 'deltaWing', 'elevon', 'smallWing', 'sweptWing', 'deltaSmall', 'canard', 'tailplane', 'winglet', 'strake', 'flaperon', 'aileron', 'flap', 'rudder']) {
    const def = catalogue.find(item => item.key === key);
    const halfSpan = def.width / 2;
    def.nodes = [
      { p: [-halfSpan, 0, 0], type: 'surface', normal: [-1, 0, 0] },
      { p: [halfSpan, 0, 0], type: 'surface', normal: [1, 0, 0] }
    ];
  }

  const byKey = Object.fromEntries(catalogue.map(p => [p.key, p]));

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function makeGeometry(def, detail = 8) {
    const w = def.width / 2, h = def.height / 2, d = def.depth / 2;
    const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
    const triangles = [];
    const tri = (a, b, c) => triangles.push([a, b, c]);
    const quad = (a, b, c, e) => { tri(a, b, c); tri(a, c, e); };
    const box = (x, y, z) => {
      const a = [-x, -y, -z], b = [x, -y, -z], c = [x, y, -z], e = [-x, y, -z];
      const f = [-x, -y, z], g = [x, -y, z], h1 = [x, y, z], i = [-x, y, z];
      quad(a, b, c, e); quad(f, i, h1, g); quad(a, f, g, b);
      quad(b, g, h1, c); quad(c, h1, i, e); quad(e, i, f, a);
    };
    const boxAt = (cx, cy, cz, x, y, z) => {
      const a = [cx - x, cy - y, cz - z], b = [cx + x, cy - y, cz - z], c = [cx + x, cy + y, cz - z], e = [cx - x, cy + y, cz - z];
      const f = [cx - x, cy - y, cz + z], g = [cx + x, cy - y, cz + z], h1 = [cx + x, cy + y, cz + z], i = [cx - x, cy + y, cz + z];
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
    const capCircle = (radius, y, top = true, sides = detail) => {
      for (let i = 0; i < sides; i++) {
        const a = i / sides * Math.PI * 2, b = (i + 1) / sides * Math.PI * 2;
        const p0 = [Math.cos(a) * radius, y, Math.sin(a) * radius];
        const p1 = [Math.cos(b) * radius, y, Math.sin(b) * radius];
        if (top) tri([0, y, 0], p0, p1); else tri([0, y, 0], p1, p0);
      }
    };
    const torusX = (cx, cy, cz, major, tube, sides = detail, tubeSides = 8) => {
      const point = (a, b) => [cx + tube * Math.sin(b), cy + (major + tube * Math.cos(b)) * Math.cos(a), cz + (major + tube * Math.cos(b)) * Math.sin(a)];
      for (let i = 0; i < sides; i++) for (let j = 0; j < tubeSides; j++) {
        const a0 = i / sides * Math.PI * 2, a1 = (i + 1) / sides * Math.PI * 2;
        const b0 = j / tubeSides * Math.PI * 2, b1 = (j + 1) / tubeSides * Math.PI * 2;
        quad(point(a0, b0), point(a1, b0), point(a1, b1), point(a0, b1));
      }
    };
    const lathe = (profile, sides = detail) => {
      for (let j = 0; j < profile.length - 1; j++) {
        const [r0, y0] = profile[j], [r1, y1] = profile[j + 1];
        for (let i = 0; i < sides; i++) {
          const a = i / sides * Math.PI * 2, b = (i + 1) / sides * Math.PI * 2;
          const p0 = [Math.cos(a) * r0, y0, Math.sin(a) * r0];
          const p1 = [Math.cos(b) * r0, y0, Math.sin(b) * r0];
          const p2 = [Math.cos(b) * r1, y1, Math.sin(b) * r1];
          const p3 = [Math.cos(a) * r1, y1, Math.sin(a) * r1];
          quad(p0, p1, p2, p3);
        }
      }
    };

    switch (def.shape) {
      case 'cylinder': {
        const r = Math.min(w, d);
        const chamfer = Math.min(r * 0.012, h * 0.012);
        lathe([[r * 0.995, -h], [r, -h + chamfer], [r, h - chamfer], [r * 0.995, h]], detail);
        capCircle(r * 0.995, -h, false); capCircle(r * 0.995, h, true);
        break;
      }
      case 'engine': {
        const r = Math.min(w, d);
        lathe([[0, -h], [r * 0.55, -h], [r * 0.82, -h * 0.98], [r, -h * 0.91], [r * 0.96, -h * 0.77], [r * 0.82, -h * 0.52], [r * 0.64, -h * 0.2], [r * 0.47, h * 0.1], [r * 0.4, h * 0.27], [r * 0.46, h * 0.34], [r * 0.58, h * 0.37], [r * 0.62, h * 0.48], [r * 0.62, h], [0, h]], detail);
        break;
      }
      case 'ring': {
        const outer = Math.min(w, d), inner = outer * 0.92, y0 = -h, y1 = h, n = detail;
        for (let i = 0; i < n; i++) {
          const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2;
          const p = (r, ang, y) => [Math.cos(ang) * r, y, Math.sin(ang) * r];
          quad(p(outer, a, y0), p(outer, b, y0), p(outer, b, y1), p(outer, a, y1));
          quad(p(inner, b, y0), p(inner, a, y0), p(inner, a, y1), p(inner, b, y1));
          quad(p(outer, a, y1), p(outer, b, y1), p(inner, b, y1), p(inner, a, y1));
          quad(p(inner, b, y0), p(inner, a, y0), p(outer, a, y0), p(outer, b, y0));
        }
        break;
      }
      case 'cone': lathe([[0, -h], [w * 0.72, -h], [w * 0.9, -h * 0.96], [w, -h * 0.82], [w * 0.98, -h * 0.64], [w * 0.88, -h * 0.38], [w * 0.68, h * 0.02], [w * 0.42, h * 0.44], [w * 0.18, h * 0.82], [0.012, h]], detail); break;
      case 'fairing': {
        const profile = Array.isArray(def.profile) && def.profile.length >= 3
          ? [[0, 0], ...def.profile.map(point => [clamp01(point[0]) * w, -h + clamp01(point[1]) * def.height]), [0.02, h]]
          : [[0, -h], [w * 0.72, -h], [w * 0.9, -h * 0.96], [w, -h * 0.82], [w * 0.98, -h * 0.5], [w * 0.88, -h * 0.08], [w * 0.66, h * 0.35], [w * 0.38, h * 0.7], [w * 0.12, h * 0.94], [0.02, h]];
        lathe(profile, detail);
        break;
      }
      case 'capsule': {
        const r = Math.min(w, d);
        lathe([[0, -h], [r * 0.48, -h * 0.99], [r * 0.78, -h * 0.94], [r * 0.94, -h * 0.82], [r, -h * 0.65], [r, h * 0.3], [r * 0.97, h * 0.52], [r * 0.86, h * 0.72], [r * 0.66, h * 0.88], [r * 0.34, h * 0.98], [0, h]], detail);
        break;
      }
      case 'cockpit': {
        const r = Math.min(w, d);
        lathe([[r * 0.52, -h], [r * 0.78, -h * 0.86], [r * 0.98, -h * 0.55], [r, -h * 0.18], [r * 0.94, h * 0.16], [r * 0.72, h * 0.38], [r * 0.38, h * 0.49], [0.02, h * 0.5]], detail);
        // Raised canopy rim and two restrained canopy rails give the cockpit a readable glazed profile.
        lathe([[r * 0.38, h * 0.08], [r * 0.37, h * 0.12], [r * 0.29, h * 0.37], [r * 0.08, h * 0.46], [0.01, h * 0.47]], detail);
        boxAt(0, -h * 0.82, 0, r * 0.94, h * 0.055, r * 0.94);
        break;
      }
      case 'wing':
      case 'delta': {
        const planform = def.planform || (def.shape === 'delta' ? 'delta' : 'straight');
        const deltaPlanform = planform === 'delta' || planform === 'strake';
        const spanSteps = Math.max(7, Math.round(detail * 0.45));
        const chordSteps = Math.max(12, detail);
        const upper = [], lower = [];
        const sweepRadians = (Number(def.sweep) || 0) * Math.PI / 180;
        const dihedralRadians = (Number(def.dihedral) || 0) * Math.PI / 180;
        const controlRadians = (Number(def.control) || 0) * Math.PI / 180;
        for (let i = 0; i <= spanSteps; i++) {
          const s = i / spanSteps;
          const signedSpan = (s * 2 - 1) * w;
          const spanFraction = Math.abs(s * 2 - 1);
          const taper = planform === 'canard' ? 0.26 : planform === 'tail' ? 0.24 : planform === 'winglet' ? 0.16 : deltaPlanform ? 0.94 : 0.42;
          const chord = Math.max(d * (deltaPlanform ? 0.08 : 0.55), d * 2 * (1 - spanFraction * taper));
          const sweepFactor = planform === 'strake' ? 0.82 : deltaPlanform ? 0.58 : planform === 'swept' ? 0.36 : 0.22;
          const leading = -d * 0.82 + Math.abs(signedSpan) * Math.tan(sweepRadians) * sweepFactor;
          const centerY = Math.abs(signedSpan) * Math.tan(dihedralRadians);
          const topRow = [], bottomRow = [];
          for (let j = 0; j <= chordSteps; j++) {
            const u = j / chordSteps;
            const thicknessRatio = Math.max(5, Math.min(22, Number(def.airfoilThickness ?? 12))) / 100;
            const thicknessFactor = 5 * thicknessRatio * chord * (0.2969 * Math.sqrt(u) - 0.1260 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1015 * u ** 4);
            const profile = String(def.airfoilProfile || 'naca0012');
            const naca = profile.match(/^naca([0-9])([0-9])([0-9]{2})$/i);
            const m = naca ? Number(naca[1]) / 100 : (profile === 'laminar' ? 0.01 : clamp01(def.camber) * 0.0018);
            const camberPosition = naca ? Number(naca[2]) / 10 : 0.4;
            let camberLine = 0;
            if (m > 0 && camberPosition > 0 && u < camberPosition) camberLine = m / (camberPosition * camberPosition) * (2 * camberPosition * u - u * u);
            else if (m > 0 && camberPosition > 0) camberLine = m / ((1 - camberPosition) ** 2) * ((1 - 2 * camberPosition) + 2 * camberPosition * u - u * u);
            const incidenceOffset = Math.tan((Number(def.incidence) || 0) * Math.PI / 180) * (u - 0.5) * chord;
            const camber = camberLine * chord + (Number(def.camber) || 0) * 0.00035 * chord * Math.sin(Math.PI * u) + incidenceOffset;
            const flap = u > 0.72 ? (u - 0.72) * chord * 0.35 * Math.tan(controlRadians) : 0;
            const z = leading + chord * u;
            topRow.push([signedSpan, centerY + thicknessFactor + camber + flap, z]);
            bottomRow.push([signedSpan, centerY - thicknessFactor + camber + flap, z]);
          }
          upper.push(topRow);
          lower.push(bottomRow);
        }
        for (let i = 0; i < spanSteps; i++) {
          for (let j = 0; j < chordSteps; j++) {
            quad(upper[i][j], upper[i + 1][j], upper[i + 1][j + 1], upper[i][j + 1]);
            quad(lower[i][j + 1], lower[i + 1][j + 1], lower[i + 1][j], lower[i][j]);
          }
          quad(upper[i][0], upper[i + 1][0], lower[i + 1][0], lower[i][0]);
          quad(upper[i][chordSteps], lower[i][chordSteps], lower[i + 1][chordSteps], upper[i + 1][chordSteps]);
        }
        for (const index of [0, spanSteps]) {
          for (let j = 0; j < chordSteps; j++) quad(upper[index][j], upper[index][j + 1], lower[index][j + 1], lower[index][j]);
        }
        break;
      }
      case 'intake': {
        const r = Math.min(w, d);
        lathe([[r * 0.48, -h], [r * 0.5, -h * 0.8], [r * 0.46, -h * 0.12], [r * 0.36, h * 0.35], [r * 0.2, h * 0.5]], detail);
        cylinder(r * 0.12, h * 0.32, detail);
        break;
      }
      case 'parachute':
        lathe([[0, -h * 0.5], [w * 0.35, -h * 0.42], [w * 0.72, -h * 0.18], [w * 0.96, h * 0.12], [w, h * 0.28], [w * 0.92, h * 0.42], [w * 0.68, h * 0.57], [w * 0.32, h * 0.65], [0, h * 0.66]], detail);
        break;
      case 'gear': {
        const deployed = def.deployed !== false;
        if (deployed) {
          boxAt(0, h * 0.34, 0, w * 0.38, h * 0.1, d * 0.34);
          boxAt(-w * 0.12, h * 0.02, 0, w * 0.045, h * 0.29, d * 0.045);
          boxAt(w * 0.12, h * 0.02, 0, w * 0.045, h * 0.29, d * 0.045);
          boxAt(0, -h * 0.24, 0, w * 0.055, h * 0.18, d * 0.055);
          const wheelRadius = Math.min(h, d) * 0.29;
          torusX(0, -h * 0.39, 0, wheelRadius, wheelRadius * 0.25, detail, 10);
          torusX(0, -h * 0.39, 0, wheelRadius * 0.48, wheelRadius * 0.08, detail, 8);
          boxAt(0, -h * 0.39, 0, wheelRadius * 0.72, wheelRadius * 0.065, wheelRadius * 0.065);
          boxAt(0, -h * 0.39, 0, wheelRadius * 0.065, wheelRadius * 0.72, wheelRadius * 0.065);
        } else {
          boxAt(0, h * 0.34, 0, w * 0.4, h * 0.1, d * 0.36);
          boxAt(-w * 0.1, h * 0.17, 0, w * 0.045, h * 0.2, d * 0.045);
          boxAt(w * 0.1, h * 0.17, 0, w * 0.045, h * 0.2, d * 0.045);
          torusX(0, -h * 0.01, 0, Math.min(h, d) * 0.25, Math.min(h, d) * 0.08, detail, 8);
        }
        break;
      }
      case 'solar': {
        const deployed = def.deployed === true;
        const half = deployed ? w * 0.9 : w * 0.23;
        const gap = deployed ? w * 0.06 : w * 0.025;
        for (const side of [-1, 1]) {
          const x0 = side < 0 ? -half : gap;
          const x1 = side < 0 ? -gap : half;
          const z0 = -d * 0.86, z1 = d * 0.86;
          boxAt((x0 + x1) / 2, 0, 0, (x1 - x0) / 2, h * 0.65, d * 0.91);
          const nx = 5, nz = 6;
          for (let ix = 0; ix < nx; ix++) for (let iz = 0; iz < nz; iz++) {
            const xa = x0 + (x1 - x0) * (ix + 0.08) / nx;
            const xb = x0 + (x1 - x0) * (ix + 0.92) / nx;
            const za = z0 + (z1 - z0) * (iz + 0.08) / nz;
            const zb = z0 + (z1 - z0) * (iz + 0.92) / nz;
            quad([xa, h * 0.7, za], [xb, h * 0.7, za], [xb, h * 0.7, zb], [xa, h * 0.7, zb]);
          }
        }
        boxAt(0, 0, 0, w * 0.07, h * 1.1, d * 0.1);
        break;
      }
      case 'wheel': {
        const radius = Math.min(h, d) * 0.32;
        torusX(0, 0, 0, radius, radius * 0.29, detail, 10);
        torusX(0, 0, 0, radius * 0.53, radius * 0.09, detail, 8);
        boxAt(0, 0, 0, radius * 0.88, radius * 0.065, radius * 0.065);
        boxAt(0, 0, 0, radius * 0.065, radius * 0.88, radius * 0.065);
        break;
      }
      case 'rcs': box(w, h, d); break;
      case 'shield': cylinder(w, def.height, detail, w * 0.65); break;
      case 'antenna':
        cylinder(w * 0.16, def.height, 6);
        cylinder(w * 0.9, 0.08, 8, w * 0.9);
        break;
      case 'drill':
        cylinder(w * 0.72, def.height, 8, w * 0.6);
        cylinder(w * 0.3, def.height * 0.65, 6, 0.02);
        break;
      default: box(w, h, d);
    }
    return triangles;
  }

  function validateCustomPart(input) {
    if (!input || typeof input !== 'object') throw new Error('Part definition must be a JSON object.');
    const allowedShapes = ['box', 'cylinder', 'engine', 'wing', 'delta', 'cone', 'intake'];
    const result = {
      key: String(input.key || 'customPart').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 28) || 'customPart',
      name: String(input.name || 'Custom Part').slice(0, 48),
      category: 'Custom',
      shape: allowedShapes.includes(input.shape) ? input.shape : 'box',
      color: /^#[0-9a-fA-F]{6}$/.test(input.color) ? input.color : '#9aa7ad',
      mass: Number(input.mass), width: Number(input.width), height: Number(input.height), depth: Number(input.depth),
      fuel: Math.max(0, Number(input.fuel || 0)), thrust: Math.max(0, Number(input.thrust || 0)),
      isp: Math.max(0, Number(input.isp || 0)), stage: 0, airbreathing: input.airbreathing === true, minAirDensity: Math.max(0, Number(input.minAirDensity || 0)), minSpeed: Math.max(0, Number(input.minSpeed || 0)),
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
