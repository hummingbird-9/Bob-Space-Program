/* Bob Space Program physics: SI units, Keplerian body motion, and a compact
   vessel integrator intended for an educational browser prototype. */
(function () {
  'use strict';

  const G = 6.67430e-11;
  const AU = 149597870700;
  const G0 = 9.80665;
  const bodies = {
    Kerbol: { name: 'Kerbol', type: 'star', parent: null, radius: 696340000, mass: 1.9885e30, a: 0, e: 0, color: '#f5c66a', surface: false, surfaceLabel: 'photosphere' },
    Moho: { name: 'Moho', type: 'planet', parent: 'Kerbol', radius: 2439700, mass: 3.301e23, a: 0.3871 * AU, e: 0.2056, color: '#9b8875', surface: true },
    Eve: { name: 'Eve', type: 'planet', parent: 'Kerbol', radius: 6051800, mass: 4.867e24, a: 0.7233 * AU, e: 0.0068, color: '#b88b9b', surface: true, atmosphere: { height: 90000, density: 65, scaleHeight: 15000, pressure: 9.2e6 } },
    Gilly: { name: 'Gilly', type: 'moon', parent: 'Eve', radius: 13000, mass: 1.8e16, a: 31500000, e: 0.55, color: '#9d9384', surface: true },
    Kerbin: { name: 'Kerbin', type: 'planet', parent: 'Kerbol', radius: 6371000, mass: 5.9722e24, a: 1.0000 * AU, e: 0.0167, color: '#4b9ec4', surface: true, atmosphere: { height: 70000, density: 1.225, scaleHeight: 8500, pressure: 101325 } },
    Mun: { name: 'Mun', type: 'moon', parent: 'Kerbin', radius: 1737400, mass: 7.342e22, a: 384400000, e: 0.0549, color: '#aaa89e', surface: true },
    Minmus: { name: 'Minmus', type: 'moon', parent: 'Kerbin', radius: 9000, mass: 1.0e15, a: 1100000000, e: 0.03, color: '#b4d6c6', surface: true },
    Duna: { name: 'Duna', type: 'planet', parent: 'Kerbol', radius: 3389500, mass: 6.417e23, a: 1.5237 * AU, e: 0.0934, color: '#c67858', surface: true, atmosphere: { height: 50000, density: 0.020, scaleHeight: 11100, pressure: 610 } },
    Ike: { name: 'Ike', type: 'moon', parent: 'Duna', radius: 11266, mass: 1.07e16, a: 23460000, e: 0.03, color: '#89847e', surface: true },
    Dres: { name: 'Dres', type: 'dwarf', parent: 'Kerbol', radius: 469700, mass: 9.39e20, a: 2.7675 * AU, e: 0.0758, color: '#a19b8d', surface: true },
    Jool: { name: 'Jool', type: 'planet', parent: 'Kerbol', radius: 69911000, mass: 1.898e27, a: 5.2044 * AU, e: 0.0489, color: '#7caa80', surface: true, surfaceLabel: 'cloud-deck boundary', atmosphere: { height: 200000, density: 0.16, scaleHeight: 27000, pressure: 1.0e5 } },
    Laythe: { name: 'Laythe', type: 'moon', parent: 'Jool', radius: 2574700, mass: 1.345e23, a: 122200000, e: 0.0002, color: '#568eaa', surface: true, atmosphere: { height: 50000, density: 1.05, scaleHeight: 8000, pressure: 85000 } },
    Vall: { name: 'Vall', type: 'moon', parent: 'Jool', radius: 1560000, mass: 3.5e22, a: 188000000, e: 0.002, color: '#9bbdc5', surface: true },
    Tylo: { name: 'Tylo', type: 'moon', parent: 'Jool', radius: 2410300, mass: 8.9e22, a: 420000000, e: 0.001, color: '#a69c89', surface: true },
    Bop: { name: 'Bop', type: 'moon', parent: 'Jool', radius: 30000, mass: 3.7e16, a: 2180000000, e: 0.23, color: '#827b6f', surface: true },
    Pol: { name: 'Pol', type: 'moon', parent: 'Jool', radius: 22000, mass: 1.0e16, a: 4400000000, e: 0.17, color: '#b3a56e', surface: true },
    Eeloo: { name: 'Eeloo', type: 'dwarf', parent: 'Kerbol', radius: 1188300, mass: 1.303e22, a: 39.48 * AU, e: 0.2488, color: '#c5d2d5', surface: true }
  };

  const mu = body => G * body.mass;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.sqrt(dot(a, a));
  const norm = a => { const l = len(a) || 1; return mul(a, 1 / l); };
  const rotateAroundAxis = (vector, axis, angle) => {
    const k = norm(axis), c = Math.cos(angle), s = Math.sin(angle);
    return add(add(mul(vector, c), mul(cross(k, vector), s)), mul(k, dot(k, vector) * (1 - c)));
  };

  function ensureAttitude(v) {
    if (v.attitude && v.attitude.right && v.attitude.up && v.attitude.forward) return v.attitude;
    const up = norm(v.heading || [0, 1, 0]);
    let reference = [0, 0, -1];
    if (Math.abs(dot(up, reference)) > 0.92) reference = [1, 0, 0];
    const right = norm(cross(reference, up));
    const forward = norm(cross(up, right));
    v.attitude = { right, up, forward };
    return v.attitude;
  }

  function solveKepler(M, e) {
    let E = M;
    for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    return E;
  }

  function relativePosition(name, time) {
    const b = bodies[name];
    if (!b || !b.parent || !b.a) return [0, 0, 0];
    const parent = bodies[b.parent];
    const meanMotion = Math.sqrt(mu(parent) / Math.pow(b.a, 3));
    const M = (meanMotion * time + (b.phase || 0)) % (Math.PI * 2);
    const E = solveKepler(M, b.e || 0);
    const x = b.a * (Math.cos(E) - (b.e || 0));
    const z = b.a * Math.sqrt(1 - (b.e || 0) ** 2) * Math.sin(E);
    return [x, 0, z];
  }

  function bodyPosition(name, time) {
    const b = bodies[name];
    if (!b || !b.parent) return [0, 0, 0];
    return add(bodyPosition(b.parent, time), relativePosition(name, time));
  }

  function atmosphereDensity(body, altitude) {
    if (!body.atmosphere || altitude >= body.atmosphere.height) return 0;
    return body.atmosphere.density * Math.exp(-Math.max(0, altitude) / body.atmosphere.scaleHeight);
  }

  function makeVessel(parts, definitions) {
    const defs = definitions || window.BSPParts.byKey;
    let dryMass = 0, fuel = 0, thrust = 0, rocketThrust = 0, airThrust = 0, rocketIspWeighted = 0, airIspWeighted = 0, wingArea = 0, camber = 0, maxFrontalArea = 0;
    for (const item of parts) {
      const d = item.definition || defs[item.key];
      if (!d) continue;
      dryMass += d.mass || 0;
      fuel += d.fuel || 0;
      if (d.thrust > 0) {
        const cappedPartThrust = Math.min(d.thrust, window.BSPParts.MAX_ENGINE_THRUST_KN);
        thrust += cappedPartThrust;
        if (d.airbreathing) { airThrust += cappedPartThrust; airIspWeighted += (d.isp || 1) * cappedPartThrust; }
        else { rocketThrust += cappedPartThrust; rocketIspWeighted += (d.isp || 1) * cappedPartThrust; }
      }
      if (d.wingArea) { wingArea += d.wingArea; camber += d.camber || 0; }
      maxFrontalArea = Math.max(maxFrontalArea, Math.max(0.1, d.width * d.depth));
    }
    return {
      body: 'Kerbin', position: [0, bodies.Kerbin.radius + 2, 0], velocity: [0, 0, 0],
      heading: [0, 1, 0], attitude: { right: [1, 0, 0], up: [0, 1, 0], forward: [0, 0, -1] }, dryMass: Math.max(1, dryMass), fuel, fuelStart: fuel,
      thrustKN: Math.min(thrust, window.BSPParts.MAX_ENGINE_THRUST_KN),
      rocketThrustKN: rocketThrust, airbreathingThrustKN: airThrust,
      rocketIsp: rocketThrust ? rocketIspWeighted / rocketThrust : 0,
      airbreathingIsp: airThrust ? airIspWeighted / airThrust : 0,
      airbreathingMinDensity: parts.reduce((minimum, item) => { const d = item.definition || defs[item.key]; return d && d.airbreathing && d.thrust ? Math.min(minimum, Number(d.minAirDensity || 0)) : minimum; }, Infinity) === Infinity ? 0 : parts.reduce((minimum, item) => { const d = item.definition || defs[item.key]; return d && d.airbreathing && d.thrust ? Math.min(minimum, Number(d.minAirDensity || 0)) : minimum; }, Infinity),
      airbreathingEngines: parts.map(item => { const d = item.definition || defs[item.key]; return d && d.airbreathing && d.thrust ? { thrust: Math.min(d.thrust, window.BSPParts.MAX_ENGINE_THRUST_KN), minAirDensity: Number(d.minAirDensity || 0), minSpeed: Number(d.minSpeed || 0) } : null; }).filter(Boolean),
      isp: rocketThrust ? rocketIspWeighted / rocketThrust : (airThrust ? airIspWeighted / airThrust : 0),
      wingArea, camber: wingArea ? camber / Math.max(1, parts.filter(p => (p.definition || defs[p.key])?.wingArea).length) : 0,
      dragArea: Math.max(0.8, maxFrontalArea * 0.62) + wingArea * 0.035, dragCoefficient: 0.52,
      dragParts: [], currentThrustKN: 0, isSpaceplane: false, launchClampsEngaged: false,
      engineActive: false, throttle: 0, sas: true, rcs: false, landed: true, stage: 0,
      angularVelocity: [0, 0, 0], failureSeed: 0x13579bdf, destroyed: false, impactEvent: null,
      pitch: 0, yaw: 0, roll: 0, heat: 0, parachute: false, gear: true,
      apoapsis: 0, periapsis: 0, flightTime: 0, missionName: 'BSP-01'
    };
  }

  function orbitSummary(vessel) {
    const b = bodies[vessel.body] || bodies.Kerbin;
    const r = len(vessel.position);
    const speed2 = dot(vessel.velocity, vessel.velocity);
    const specificEnergy = speed2 / 2 - mu(b) / r;
    if (specificEnergy >= 0) return { apoapsis: Infinity, periapsis: null, eccentricity: 1 };
    const a = -mu(b) / (2 * specificEnergy);
    const h = len(cross(vessel.position, vessel.velocity));
    const e2 = Math.max(0, 1 - h * h / (mu(b) * a));
    const e = Math.sqrt(e2);
    return { apoapsis: a * (1 + e) - b.radius, periapsis: a * (1 - e) - b.radius, eccentricity: e };
  }

  function stepVessel(v, dt, controls = {}) {
    if (v.destroyed) return;
    v.impactEvent = null;
    const body = bodies[v.body] || bodies.Kerbin;
    if (v.landed && !v.engineActive && !(controls.steerPitch || controls.steerYaw)) return;
    const throttle = clamp(controls.throttle ?? v.throttle, 0, 1);
    const pitchInput = controls.pitch || 0, yawInput = controls.yaw || 0, rollInput = controls.roll || 0;
    v.controlInputs = { pitch: pitchInput, yaw: yawInput, roll: rollInput };
    const steps = Math.max(1, Math.min(60, Math.ceil(dt / 0.0125)));
    const h = dt / steps;
    const dragSource = (v.parts || []).map(item => {
      const def = item.definition || window.BSPParts.byKey[item.key];
      if (!def) return null;
      const frontal = def.wingArea ? def.wingArea * 0.075 : Math.max(def.width * def.depth, def.width * def.height * 0.62, def.depth * def.height * 0.62);
      const coefficient = Number.isFinite(def.dragCoefficient) ? def.dragCoefficient : (def.shape === 'cone' || def.shape === 'cockpit' || def.shape === 'fairing' ? 0.16 : 0.42);
      return { id: item.id, position: item.position.slice(), width: def.width, height: def.height, depth: def.depth, score: Math.max(0.01, frontal * coefficient), name: def.name };
    }).filter(Boolean).sort((a, b) => b.score - a.score);
    v.dragParts = dragSource.slice(0, 4);

    for (let i = 0; i < steps; i++) {
      const radius = len(v.position);
      const altitude = radius - body.radius;
      const radial = norm(v.position);
      if (altitude <= 0 && len(v.velocity) < 0.2 && !v.engineActive) {
        v.position = mul(radial, body.radius + 0.8);
        v.velocity = [0, 0, 0]; v.landed = true;
        continue;
      }
      v.landed = false;
      const g = mul(radial, -mu(body) / Math.max(1, radius * radius));

      const responsiveness = 1 - Math.exp(-h * 4.2);
      v.angularVelocity = v.angularVelocity || [0, 0, 0];
      v.angularVelocity[0] += (pitchInput * 0.34 - v.angularVelocity[0]) * responsiveness;
      v.angularVelocity[1] += (yawInput * 0.34 - v.angularVelocity[1]) * responsiveness;
      v.angularVelocity[2] += (rollInput * 0.48 - v.angularVelocity[2]) * responsiveness;
      const attitude = ensureAttitude(v);
      let rightAxis = attitude.right.slice(), upAxis = attitude.up.slice(), forwardAxis = attitude.forward.slice();
      const pitchAngle = -v.angularVelocity[0] * h;
      upAxis = rotateAroundAxis(upAxis, rightAxis, pitchAngle);
      forwardAxis = rotateAroundAxis(forwardAxis, rightAxis, pitchAngle);
      const yawAngle = v.angularVelocity[1] * h;
      upAxis = rotateAroundAxis(upAxis, forwardAxis, yawAngle);
      rightAxis = rotateAroundAxis(rightAxis, forwardAxis, yawAngle);
      const rollAngle = v.angularVelocity[2] * h;
      rightAxis = rotateAroundAxis(rightAxis, upAxis, rollAngle);
      forwardAxis = rotateAroundAxis(forwardAxis, upAxis, rollAngle);
      rightAxis = norm(cross(forwardAxis, upAxis));
      forwardAxis = norm(cross(upAxis, rightAxis));
      v.attitude = { right: rightAxis, up: norm(upAxis), forward: forwardAxis };
      v.heading = v.attitude.up.slice();
      v.roll = (v.roll + v.angularVelocity[2] * h) % (Math.PI * 2);

      const speed = len(v.velocity);
      const rho = atmosphereDensity(body, altitude);
      const cdArea = Math.max(0.35, (v.dragArea || 1.2) * (v.dragCoefficient || 0.52));
      let aero = [0, 0, 0], dragAcceleration = 0, liftAcceleration = 0;
      if (rho > 0 && speed > 0.1) {
        const dragMagnitude = 0.5 * rho * speed * speed * cdArea / Math.max(1, v.dryMass + v.fuel);
        dragAcceleration = dragMagnitude;
        aero = add(aero, mul(norm(v.velocity), -dragMagnitude));
        if (v.wingArea > 0) {
          const flow = norm(v.velocity);
          const bodyUp = sub(radial, mul(flow, dot(radial, flow)));
          if (len(bodyUp) > 0.02) {
            const liftDirection = norm(bodyUp);
            const alpha = Math.asin(clamp(dot(norm(v.heading), liftDirection), -1, 1));
            const cl = clamp((v.camber || 0) * 0.018 + alpha * 3.5, -0.65, 1.8);
            const liftMagnitude = 0.5 * rho * speed * speed * v.wingArea * cl / Math.max(1, v.dryMass + v.fuel);
            liftAcceleration = liftMagnitude;
            aero = add(aero, mul(liftDirection, liftMagnitude));
          }
        }
      }

      let thrustVector = [0, 0, 0];
      const mass = Math.max(1, v.dryMass + v.fuel);
      let activeRocketThrust = 0, activeAirThrust = 0;
      if (v.engineActive && throttle > 0 && v.fuel > 0 && v.thrustKN > 0) {
        activeRocketThrust = Math.min(v.rocketThrustKN || 0, window.BSPParts.MAX_ENGINE_THRUST_KN) * throttle;
        const airSpeed = speed;
        const airFactor = rho > 0 ? clamp(rho / 0.65, 0, 1) : 0;
        const engines = v.airbreathingEngines || [];
        activeAirThrust = engines.reduce((sum, engine) => {
          if (rho < engine.minAirDensity || airSpeed < engine.minSpeed) return sum;
          const speedFactor = engine.minSpeed <= 0
            ? clamp(0.68 + airSpeed / 140 * 0.32, 0.68, 1)
            : clamp((airSpeed - engine.minSpeed) / Math.max(80, engine.minSpeed + 150), 0, 1);
          return sum + engine.thrust * airFactor * speedFactor;
        }, 0) * throttle;
        activeAirThrust = Math.min(activeAirThrust, Math.max(0, window.BSPParts.MAX_ENGINE_THRUST_KN - activeRocketThrust));
        const totalThrustN = (activeRocketThrust + activeAirThrust) * 1000;
        thrustVector = mul(v.heading, totalThrustN / mass);
        const rocketFlow = activeRocketThrust > 0 ? activeRocketThrust * 1000 / (Math.max(1, v.rocketIsp || v.isp) * G0) : 0;
        const airFlow = activeAirThrust > 0 ? activeAirThrust * 1000 / (Math.max(1, v.airbreathingIsp || v.isp) * G0) : 0;
        v.fuel = Math.max(0, v.fuel - (rocketFlow + airFlow) * h);
        if (v.fuel <= 0.01) { v.fuel = 0; v.engineActive = false; }
      }
      v.currentThrustKN = activeRocketThrust + activeAirThrust;

      const acceleration = add(add(g, aero), thrustVector);
      v.velocity = add(v.velocity, mul(acceleration, h));
      v.position = add(v.position, mul(v.velocity, h));
      const newAltitude = len(v.position) - body.radius;
      v.flightTime += h;
      v.heat = Math.max(0, v.heat + (rho > 0 ? Math.pow(speed / 7000, 2) * rho * h * 0.015 : -h * 0.02));
      v.gravityNow = len(g);
      v.airDensityNow = rho;
      v.dragAccelerationNow = dragAcceleration;
      v.liftAccelerationNow = liftAcceleration;
      v.dynamicPressureNow = 0.5 * rho * speed * speed;
      const radialSpeedAfter = dot(v.velocity, norm(v.position));
      if (altitude > 1200 && radialSpeedAfter > 80 && v.dynamicPressureNow > 130000) {
        v.failureSeed ^= v.failureSeed << 13; v.failureSeed ^= v.failureSeed >>> 17; v.failureSeed ^= v.failureSeed << 5;
        const roll = (v.failureSeed >>> 0) / 4294967295;
        const pressureRisk = clamp((v.dynamicPressureNow - 130000) / 250000, 0, 1.1);
        if (roll < pressureRisk * 0.018 * h) {
          v.destroyed = true; v.engineActive = false; v.landed = false;
          v.impactEvent = { type: 'airbreakup', speed: speed, dynamicPressure: v.dynamicPressureNow };
          v.velocity = [0, 0, 0];
          break;
        }
      }
      if (!v.destroyed && v.engineActive && throttle >= 0.85) {
        v.failureSeed ^= v.failureSeed << 13; v.failureSeed ^= v.failureSeed >>> 17; v.failureSeed ^= v.failureSeed << 5;
        const engineRoll = (v.failureSeed >>> 0) / 4294967295;
        const pressureStress = clamp((v.dynamicPressureNow - 40000) / 180000, 0, 1);
        if (engineRoll < h * (0.00008 + pressureStress * 0.00045)) {
          v.destroyed = true; v.engineActive = false; v.landed = false;
          v.impactEvent = { type: 'engineFailure', speed, dynamicPressure: v.dynamicPressureNow };
          v.velocity = [0, 0, 0];
          break;
        }
      }
      if (newAltitude <= 0) {
        const rHat = norm(v.position);
        v.position = mul(rHat, body.radius + 1.1);
        const radialImpact = Math.abs(dot(v.velocity, rHat));
        const horizontalVelocity = sub(v.velocity, mul(rHat, dot(v.velocity, rHat)));
        const horizontalSpeed = len(horizontalVelocity);
        const totalImpact = len(v.velocity);
        const gearDown = !!(v.gear || (v.parts || []).some(item => item.deployed !== false && (item.definition || window.BSPParts.byKey[item.key])?.deployable === 'gear'));
        const touchdownLimit = gearDown ? 68 : 42;
        const planeRoll = v.wingArea > 0 && gearDown && radialImpact < 24 && horizontalSpeed < 145;
        if (radialImpact > touchdownLimit || (!planeRoll && totalImpact > (gearDown ? 96 : 62))) {
          v.destroyed = true; v.engineActive = false; v.landed = false;
          v.impactEvent = { type: 'ground', speed: totalImpact, verticalSpeed: radialImpact };
          v.velocity = [0, 0, 0];
          break;
        }
        v.velocity = horizontalVelocity;
        if (planeRoll && v.engineActive && v.fuel > 0) {
          v.landed = true;
          const rollingFriction = Math.max(0, 1 - h * 0.045);
          v.velocity = mul(v.velocity, rollingFriction);
        } else {
          v.velocity = [0, 0, 0]; v.landed = true; v.engineActive = false;
        }
      }
    }
    v.throttle = throttle;
    const orbit = orbitSummary(v);
    v.apoapsis = orbit.apoapsis;
    v.periapsis = orbit.periapsis;
  }

  function formatDistance(m) {
    if (m == null || !Number.isFinite(m)) return '—';
    const abs = Math.abs(m);
    if (abs >= 1e9) return (m / 1e9).toFixed(2) + ' Gm';
    if (abs >= 1e6) return (m / 1e6).toFixed(2) + ' Mm';
    if (abs >= 1000) return (m / 1000).toFixed(1) + ' km';
    return m.toFixed(0) + ' m';
  }

  window.BSPPhysics = {
    G, AU, G0, bodies, mu, clamp, add, sub, mul, dot, cross, len, norm, rotateAroundAxis,
    solveKepler, bodyPosition, atmosphereDensity, makeVessel, stepVessel, orbitSummary, formatDistance
  };
})();
