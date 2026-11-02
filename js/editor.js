/* Low-poly 3D editor. The editor uses perspective projection plus triangle
   ray tests, node snapping, and transform gizmos; no external 3D library. */
(function () {
  'use strict';

  const P = window.BSPParts;
  const V = window.BSPPhysics;
  const vec = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: a => Math.hypot(a[0], a[1], a[2]),
    norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  };
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  class Editor3D {
    constructor(canvas, onChange = () => {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.onChange = onChange;
      this.parts = [];
      this.selectedId = null;
      this.rootId = null;
      this.mode = 'place';
      this.template = null;
      this.camera = { yaw: 0.78, pitch: 0.28, distance: 23, target: [0, 5, 0] };
      this.drag = null;
      this.snap = true;
      this.showNodes = true;
      this.shaders = false;
      this.geometryCache = new Map();
      this.idCounter = 1;
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas);
      this.resize();
      this.bindEvents();
      this.loadDefaultCraft();
      this.render();
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      this.width = Math.max(320, Math.round(rect.width * dpr));
      this.height = Math.max(240, Math.round(rect.height * dpr));
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.render();
    }

    bindEvents() {
      this.canvas.addEventListener('pointerdown', e => this.pointerDown(e));
      this.canvas.addEventListener('pointermove', e => this.pointerMove(e));
      this.canvas.addEventListener('pointerup', e => this.pointerUp(e));
      this.canvas.addEventListener('pointercancel', e => this.pointerUp(e));
      this.canvas.addEventListener('wheel', e => {
        e.preventDefault();
        this.camera.distance = clamp(this.camera.distance * (e.deltaY > 0 ? 1.08 : 0.92), 7, 130);
        this.render();
      }, { passive: false });
      this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    }

    setMode(mode) {
      this.mode = mode;
      this.drag = null;
      this.render();
    }

    setTemplate(key, definition = null) {
      this.template = definition || P.byKey[key] || null;
      this.render();
    }

    addPart(key, position, rotation = [0, 0, 0], parentId = null, definition = null) {
      const def = definition || P.byKey[key];
      if (!def) return null;
      const item = {
        id: 'part-' + this.idCounter++, key, name: def.name, definition: definition ? P.clone(def) : null,
        position: position.slice(), rotation: rotation.slice(), parentId,
        stage: def.stage || 0, enabled: true
      };
      this.parts.push(item);
      if (!this.rootId) this.rootId = item.id;
      this.selectedId = item.id;
      this.changed();
      return item;
    }

    loadDefaultCraft() {
      this.parts = [];
      this.idCounter = 1;
      const engine = this.addPart('engine3', [0, 1.3, 0]);
      const separator = this.addPart('decoupler', [0, 2.81, 0], [0, 0, 0], engine.id);
      const tank = this.addPart('tankM', [0, 5.62, 0], [0, 0, 0], separator.id);
      const pod = this.addPart('pod1', [0, 9.42, 0], [0, 0, 0], tank.id);
      this.rootId = pod.id;
      this.selectedId = pod.id;
      this.camera.target = [0, 5.3, 0];
      this.changed();
    }

    getDefinition(item) {
      return item.definition || P.byKey[item.key] || null;
    }

    changed() {
      this.onChange(this.parts, this.selectedPart());
      this.render();
    }

    selectedPart() {
      return this.parts.find(p => p.id === this.selectedId) || null;
    }

    partWorldPoint(item, local) {
      return vec.add(item.position, this.rotate(local, item.rotation));
    }

    rotate(v, r) {
      let [x, y, z] = v;
      const cx = Math.cos(r[0]), sx = Math.sin(r[0]);
      const cy = Math.cos(r[1]), sy = Math.sin(r[1]);
      const cz = Math.cos(r[2]), sz = Math.sin(r[2]);
      let y1 = y * cx - z * sx, z1 = y * sx + z * cx; y = y1; z = z1;
      let x1 = x * cy + z * sy, z2 = -x * sy + z * cy; x = x1; z = z2;
      let x2 = x * cz - y * sz, y2 = x * sz + y * cz;
      return [x2, y2, z];
    }

    geometryFor(item) {
      const def = this.getDefinition(item);
      if (!def) return [];
      const cacheKey = item.key + ':' + (def.sweep || 0) + ':' + def.width + ':' + def.height;
      if (!this.geometryCache.has(cacheKey)) this.geometryCache.set(cacheKey, P.makeGeometry(def, this.shaders ? 12 : 8));
      return this.geometryCache.get(cacheKey);
    }

    cameraBasis() {
      const c = this.camera;
      const cp = Math.cos(c.pitch), sp = Math.sin(c.pitch), sy = Math.sin(c.yaw), cy = Math.cos(c.yaw);
      const offset = [sy * cp, sp, cy * cp];
      const eye = vec.add(c.target, vec.mul(offset, c.distance));
      const forward = vec.norm(vec.sub(c.target, eye));
      const right = vec.norm([cy, 0, -sy]);
      const up = vec.norm(vec.cross(right, forward));
      return { eye, forward, right, up };
    }

    project(point) {
      const b = this.cameraBasis();
      const delta = vec.sub(point, b.eye);
      const z = vec.dot(delta, b.forward);
      if (z <= 0.12) return null;
      const x = vec.dot(delta, b.right), y = vec.dot(delta, b.up);
      const focal = Math.min(this.width, this.height) * 0.98;
      return { x: this.width / 2 + x * focal / z, y: this.height / 2 - y * focal / z, z };
    }

    rayFromScreen(px, py) {
      const b = this.cameraBasis();
      const focal = Math.min(this.width, this.height) * 0.98;
      const nx = (px - this.width / 2) / focal;
      const ny = (this.height / 2 - py) / focal;
      return { origin: b.eye, direction: vec.norm(vec.add(b.forward, vec.add(vec.mul(b.right, nx), vec.mul(b.up, ny)))) };
    }

    intersectTriangle(ray, a, b, c) {
      const edge1 = vec.sub(b, a), edge2 = vec.sub(c, a);
      const h = vec.cross(ray.direction, edge2);
      const det = vec.dot(edge1, h);
      if (Math.abs(det) < 1e-7) return null;
      const inv = 1 / det;
      const s = vec.sub(ray.origin, a);
      const u = inv * vec.dot(s, h);
      if (u < 0 || u > 1) return null;
      const q = vec.cross(s, edge1);
      const v = inv * vec.dot(ray.direction, q);
      if (v < 0 || u + v > 1) return null;
      const t = inv * vec.dot(edge2, q);
      if (t < 0.05) return null;
      return { t, point: vec.add(ray.origin, vec.mul(ray.direction, t)) };
    }

    raycast(px, py) {
      const ray = this.rayFromScreen(px, py);
      let nearest = null;
      for (const item of this.parts) {
        for (const tri of this.geometryFor(item)) {
          const world = tri.map(p => this.partWorldPoint(item, p));
          const hit = this.intersectTriangle(ray, world[0], world[1], world[2]);
          if (hit && (!nearest || hit.t < nearest.t)) nearest = { ...hit, item };
        }
      }
      return nearest;
    }

    intersectGround(ray) {
      if (Math.abs(ray.direction[1]) < 1e-6) return null;
      const t = -ray.origin[1] / ray.direction[1];
      if (t <= 0) return null;
      return vec.add(ray.origin, vec.mul(ray.direction, t));
    }

    placeAt(px, py) {
      if (!this.template) {
        const hit = this.raycast(px, py);
        if (hit) { this.selectedId = hit.item.id; this.changed(); }
        return;
      }
      const ray = this.rayFromScreen(px, py);
      const hit = this.raycast(px, py);
      const point = hit ? hit.point : this.intersectGround(ray);
      if (!point) return;
      let parentId = hit ? hit.item.id : null;
      let position = point.slice();
      let rotation = [0, 0, 0];
      if (hit && this.snap) {
        const parent = hit.item;
        const parentDef = this.getDefinition(parent);
        const childDef = this.template;
        const parentNodes = parentDef.nodes || [];
        const childNodes = childDef.nodes || [];
        if (parentNodes.length && childNodes.length) {
          let parentNode = null, bestParent = Infinity;
          for (const node of parentNodes) {
            const wp = this.partWorldPoint(parent, node.p);
            const dist = vec.len(vec.sub(wp, point));
            if (dist < bestParent) { bestParent = dist; parentNode = { ...node, wp }; }
          }
          const preferredType = parentNode && parentNode.type === 'top' ? 'bottom' : parentNode && parentNode.type === 'bottom' ? 'top' : null;
          let childNode = childNodes.find(n => n.type === preferredType) || childNodes[0];
          const rotated = this.rotate(childNode.p, rotation);
          position = vec.sub(parentNode.wp, rotated);
        }
      }
      const customDefinition = P.byKey[this.template.key] ? null : this.template;
      const created = this.addPart(this.template.key, position, rotation, parentId, customDefinition);
      if (created && this.mode === 'place') this.template = null;
    }

    findGizmo(px, py, item) {
      const center = this.project(item.position);
      if (!center) return null;
      const axes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      let best = null;
      for (let i = 0; i < axes.length; i++) {
        const endpoint = this.project(vec.add(item.position, vec.mul(axes[i], 2.5)));
        if (!endpoint) continue;
        const dx = endpoint.x - center.x, dy = endpoint.y - center.y;
        const l2 = dx * dx + dy * dy;
        const t = clamp(((px - center.x) * dx + (py - center.y) * dy) / Math.max(1, l2), 0, 1);
        const dist = Math.hypot(px - center.x - t * dx, py - center.y - t * dy);
        if (dist < 18 && (!best || dist < best.dist)) best = { axis: axes[i], axisIndex: i, center, endpoint, dist };
      }
      if (!best && Math.hypot(px - center.x, py - center.y) < 32) best = { axis: [0, 1, 0], axisIndex: 1, center, endpoint: center, dist: 32 };
      return best;
    }

    pointerDown(e) {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = this.width / rect.width;
      const px = (e.clientX - rect.left) * dpr, py = (e.clientY - rect.top) * dpr;
      if (e.button === 2 || e.button === 1) {
        this.drag = { kind: 'camera', x: px, y: py, yaw: this.camera.yaw, pitch: this.camera.pitch };
        this.canvas.setPointerCapture(e.pointerId);
        return;
      }
      if (this.mode === 'place') { this.placeAt(px, py); return; }
      const hit = this.raycast(px, py);
      if (this.mode === 'root') {
        if (hit) { this.rootId = hit.item.id; this.selectedId = hit.item.id; this.changed(); }
        return;
      }
      if (hit) this.selectedId = hit.item.id;
      const selected = this.selectedPart();
      if (selected) {
        const axis = this.findGizmo(px, py, selected);
        if (axis) {
          this.drag = {
            kind: this.mode, x: px, y: py, startPosition: selected.position.slice(), startRotation: selected.rotation.slice(),
            axis: axis.axis, axisIndex: axis.axisIndex, axisScreen: axis.endpoint && axis.center ? [axis.endpoint.x - axis.center.x, axis.endpoint.y - axis.center.y] : [0, -1]
          };
          this.canvas.setPointerCapture(e.pointerId);
          this.changed();
          return;
        }
      }
      this.changed();
    }

    pointerMove(e) {
      if (!this.drag) return;
      const rect = this.canvas.getBoundingClientRect();
      const dpr = this.width / rect.width;
      const px = (e.clientX - rect.left) * dpr, py = (e.clientY - rect.top) * dpr;
      const dx = px - this.drag.x, dy = py - this.drag.y;
      if (this.drag.kind === 'camera') {
        this.camera.yaw = this.drag.yaw - dx * 0.006;
        this.camera.pitch = clamp(this.drag.pitch + dy * 0.006, -1.25, 1.25);
        this.render();
        return;
      }
      const item = this.selectedPart();
      if (!item) return;
      if (this.drag.kind === 'offset') {
        const screenAxis = this.drag.axisScreen;
        const l = Math.hypot(screenAxis[0], screenAxis[1]) || 1;
        const amountPx = (dx * screenAxis[0] + dy * screenAxis[1]) / l;
        const worldPerPixel = this.camera.distance / Math.min(this.width, this.height) * 1.6;
        let amount = amountPx * worldPerPixel;
        if (this.snap) amount = Math.round(amount * 10) / 10;
        const nextPosition = vec.add(this.drag.startPosition, vec.mul(this.drag.axis, amount));
        const delta = vec.sub(nextPosition, this.drag.startPosition);
        item.position = nextPosition;
        for (const child of this.descendantsOf(item.id)) child.position = vec.add(child.position, delta);
      } else if (this.drag.kind === 'rotate') {
        const amount = (dx - dy) * 0.01;
        item.rotation = this.drag.startRotation.slice();
        item.rotation[this.drag.axisIndex] += this.snap ? Math.round(amount / (Math.PI / 12)) * (Math.PI / 12) : amount;
        const deltaRotation = item.rotation.map((v, i) => v - this.drag.startRotation[i]);
        for (const child of this.descendantsOf(item.id)) {
          const relative = vec.sub(child.position, this.drag.startPosition);
          child.position = vec.add(this.drag.startPosition, this.rotate(relative, deltaRotation));
          child.rotation = child.rotation.map((v, i) => v + deltaRotation[i]);
        }
      }
      this.render();
    }

    pointerUp() {
      if (this.drag && this.drag.kind !== 'camera') this.changed();
      this.drag = null;
    }

    descendantsOf(parentId) {
      const result = [];
      const seen = new Set([parentId]);
      let added = true;
      while (added) {
        added = false;
        for (const item of this.parts) {
          if (item.parentId && seen.has(item.parentId) && !seen.has(item.id)) {
            seen.add(item.id); result.push(item); added = true;
          }
        }
      }
      return result;
    }

    deleteSelected() {
      if (!this.selectedId) return;
      const remove = new Set([this.selectedId]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const item of this.parts) if (item.parentId && remove.has(item.parentId) && !remove.has(item.id)) { remove.add(item.id); changed = true; }
      }
      this.parts = this.parts.filter(p => !remove.has(p.id));
      this.selectedId = this.parts.length ? this.parts[this.parts.length - 1].id : null;
      if (remove.has(this.rootId)) this.rootId = this.selectedId;
      this.changed();
    }

    setWingValue(property, value) {
      const item = this.selectedPart();
      if (!item) return;
      const def = this.getDefinition(item);
      if (!def || !('wingArea' in def)) return;
      def[property] = Number(value);
      this.geometryCache.clear();
      this.changed();
    }

    translateSelected(axis, amount) {
      const item = this.selectedPart();
      if (!item) return;
      item.position[axis] += amount;
      this.changed();
    }

    rotateSelected(axis, amount) {
      const item = this.selectedPart();
      if (!item) return;
      item.rotation[axis] += amount * Math.PI / 180;
      this.changed();
    }

    save() {
      return JSON.stringify({ parts: this.parts, rootId: this.rootId, idCounter: this.idCounter });
    }

    load(serialized) {
      const data = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
      if (!data || !Array.isArray(data.parts) || data.parts.length > 300) throw new Error('Invalid craft file.');
      this.parts = data.parts.map(p => ({ ...p, position: p.position.map(Number), rotation: p.rotation.map(Number) }));
      this.rootId = data.rootId || (this.parts[0] && this.parts[0].id);
      this.idCounter = Math.max(Number(data.idCounter) || 1, this.parts.length + 1);
      this.selectedId = this.rootId;
      this.changed();
    }

    drawGrid() {
      const ctx = this.ctx;
      ctx.strokeStyle = '#777f80'; ctx.lineWidth = 1;
      for (let n = -12; n <= 12; n++) {
        const a = this.project([n, 0, -12]), b = this.project([n, 0, 12]);
        const c = this.project([-12, 0, n]), d = this.project([12, 0, n]);
        if (a && b) { ctx.globalAlpha = n === 0 ? 0.45 : 0.18; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        if (c && d) { ctx.globalAlpha = n === 0 ? 0.45 : 0.18; ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
      const origin = this.project([0, 0, 0]);
      if (origin) {
        ctx.fillStyle = '#5b6b70'; ctx.fillRect(origin.x - 2, origin.y - 2, 4, 4);
      }
    }

    drawGizmo(item) {
      const ctx = this.ctx;
      const center = this.project(item.position);
      if (!center) return;
      const axes = [
        { v: [1, 0, 0], color: '#d84a4a' },
        { v: [0, 1, 0], color: '#4c9b53' },
        { v: [0, 0, 1], color: '#438bd1' }
      ];
      if (this.mode === 'rotate') {
        for (const axis of axes) {
          const points = [];
          for (let i = 0; i <= 36; i++) {
            const a = i / 36 * Math.PI * 2;
            let p;
            if (axis.v[0]) p = [0, Math.cos(a) * 1.5, Math.sin(a) * 1.5];
            else if (axis.v[1]) p = [Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5];
            else p = [Math.cos(a) * 1.5, Math.sin(a) * 1.5, 0];
            const q = this.project(vec.add(item.position, p));
            if (q) points.push(q);
          }
          if (points.length > 1) {
            ctx.strokeStyle = axis.color; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
            for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
        }
      } else {
        for (const axis of axes) {
          const end = this.project(vec.add(item.position, vec.mul(axis.v, 2.6)));
          if (!end) continue;
          ctx.strokeStyle = axis.color; ctx.fillStyle = axis.color; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(center.x, center.y); ctx.lineTo(end.x, end.y); ctx.stroke();
          const angle = Math.atan2(end.y - center.y, end.x - center.x);
          ctx.beginPath();
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(end.x - Math.cos(angle - 0.45) * 10, end.y - Math.sin(angle - 0.45) * 10);
          ctx.lineTo(end.x - Math.cos(angle + 0.45) * 10, end.y - Math.sin(angle + 0.45) * 10);
          ctx.closePath(); ctx.fill();
        }
      }
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#20282b'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(center.x, center.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    render() {
      if (!this.ctx || !this.width || !this.height) return;
      const ctx = this.ctx;
      ctx.fillStyle = '#859194'; ctx.fillRect(0, 0, this.width, this.height);
      const sky = ctx.createLinearGradient(0, 0, 0, this.height);
      sky.addColorStop(0, '#6d777a'); sky.addColorStop(1, '#a0a7a3');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, this.width, this.height);
      this.drawGrid();

      const faces = [];
      for (const item of this.parts) {
        const def = this.getDefinition(item);
        if (!def) continue;
        for (const tri of this.geometryFor(item)) {
          const world = tri.map(p => this.partWorldPoint(item, p));
          const projected = world.map(p => this.project(p));
          if (projected.some(p => !p)) continue;
          const depth = (projected[0].z + projected[1].z + projected[2].z) / 3;
          const normal = vec.norm(vec.cross(vec.sub(world[1], world[0]), vec.sub(world[2], world[0])));
          const light = Math.max(0.18, 0.45 + vec.dot(normal, vec.norm([0.45, 0.85, 0.55])) * 0.55);
          faces.push({ projected, depth, color: def.color || '#aeb8bd', light, selected: item.id === this.selectedId });
        }
      }
      faces.sort((a, b) => b.depth - a.depth);
      for (const face of faces) {
        const rgb = face.color.match(/[\da-f]{2}/gi)?.map(x => parseInt(x, 16)) || [160, 170, 175];
        const light = this.shaders ? Math.min(1.3, face.light * 1.1) : face.light;
        const color = 'rgb(' + rgb.map(n => Math.round(clamp(n * light, 0, 255))).join(',') + ')';
        ctx.fillStyle = color;
        ctx.strokeStyle = face.selected ? '#fff8a8' : 'rgba(28,37,39,.55)';
        ctx.lineWidth = face.selected ? 1.7 : 0.8;
        ctx.beginPath(); ctx.moveTo(face.projected[0].x, face.projected[0].y);
        ctx.lineTo(face.projected[1].x, face.projected[1].y); ctx.lineTo(face.projected[2].x, face.projected[2].y);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }

      const selected = this.selectedPart();
      if (selected && this.mode !== 'place') this.drawGizmo(selected);
      if (this.showNodes) {
        for (const item of this.parts) {
          const def = this.getDefinition(item);
          for (const node of (def && def.nodes) || []) {
            const p = this.project(this.partWorldPoint(item, node.p));
            if (!p) continue;
            ctx.fillStyle = item.id === this.selectedId ? '#fff2a4' : '#74e3df';
            ctx.strokeStyle = '#17292e'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(p.x, p.y, item.id === this.selectedId ? 4 : 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          }
        }
      }

      if (this.template) {
        ctx.fillStyle = 'rgba(20,30,32,.78)'; ctx.fillRect(12, 12, 230, 34);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Tahoma, sans-serif';
        ctx.fillText('PLACE: ' + this.template.name, 22, 34);
      }
      ctx.fillStyle = 'rgba(22,32,34,.72)'; ctx.fillRect(10, this.height - 34, 300, 24);
      ctx.fillStyle = '#f1f1df'; ctx.font = '12px Tahoma, sans-serif';
      const modeLabel = { place: '1 PLACE — click a node or surface', offset: '2 OFFSET — drag an axis', rotate: '3 ROTATE — drag a ring', root: '4 ROOT — choose the vessel anchor' }[this.mode];
      ctx.fillText(modeLabel + (this.snap ? '  |  SNAP ON' : '  |  SNAP OFF'), 18, this.height - 17);
    }
  }

  window.BSPEditor = Editor3D;
})();
