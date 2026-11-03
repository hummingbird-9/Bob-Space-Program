/* Procedural 3D editor. The editor uses perspective projection plus triangle
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
      this.camera = { yaw: 0.78, pitch: 0.28, distance: 23, target: [0, 2, 0] };
      this.spaceplaneWorkspace = false;
      this.drag = null;
      this.pointerPosition = null;
      this.snap = true;
      this.showNodes = true;
      this.shaders = false;
      // Scale mesh detail to device memory and CPU count. A 4 GB Chromebook
      // gets the light preset; more capable machines receive smoother meshes.
      const memoryGB = Number(navigator.deviceMemory || 4);
      const cores = Number(navigator.hardwareConcurrency || 4);
      this.baseQualitySegments = Math.max(18, Math.min(24, Math.round(Math.min(memoryGB, 8) * 2.6 + Math.min(cores, 8) * 0.35)));
      this.highQualitySegments = Math.min(32, this.baseQualitySegments + 8);
      this.geometryCache = new Map();
      this.idCounter = 1;
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas);
      this.resize();
      this.bindEvents();
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

    setWorkspace(spaceplane) {
      this.spaceplaneWorkspace = !!spaceplane;
      this.camera.yaw = this.spaceplaneWorkspace ? 0.78 : 0.78;
      this.camera.pitch = this.spaceplaneWorkspace ? 0.12 : 0.28;
      this.render();
    }

    setTemplate(key, definition = null) {
      this.template = definition || P.byKey[key] || null;
      this.pointerPosition = null;
      this.render();
    }

    addPart(key, position, rotation = [0, 0, 0], parentId = null, definition = null) {
      const def = definition || P.byKey[key];
      if (!def) return null;
      const item = {
        id: 'part-' + this.idCounter++, key, name: def.name, definition: definition ? P.clone(def) : null,
        position: position.slice(), rotation: rotation.slice(), parentId, deployed: def.defaultDeployed ?? true,
        stage: def.stage || 0, enabled: true
      };
      this.parts.push(item);
      if (!this.rootId || def.category === 'Command') this.rootId = item.id;
      this.selectedId = item.id;
      this.changed();
      return item;
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
      const cacheKey = [item.key, def.shape, def.width, def.height, def.depth, def.sweep || 0, def.dihedral || 0, def.camber || 0, def.control || 0, def.airfoilThickness || 0, def.airfoilProfile || '', def.planform || '', def.incidence || 0, item.deployed, JSON.stringify(def.profile || null)].join(':');
      if (!this.geometryCache.has(cacheKey)) this.geometryCache.set(cacheKey, P.makeGeometry({ ...def, deployed: item.deployed }, this.shaders ? this.highQualitySegments : this.baseQualitySegments));
      return this.geometryCache.get(cacheKey);
    }

    cameraBasis() {
      const c = this.camera;
      const cp = Math.cos(c.pitch), sp = Math.sin(c.pitch), sy = Math.sin(c.yaw), cy = Math.cos(c.yaw);
      const offset = [sy * cp, sp, cy * cp];
      const eye = vec.add(c.target, vec.mul(offset, c.distance));
      const forward = vec.norm(vec.sub(c.target, eye));
      const right = vec.norm([cy, 0, -sy]);
      const baseUp = vec.norm(vec.cross(right, forward));
      const roll = this.spaceplaneWorkspace ? Math.PI / 2 : 0;
      const cr = Math.cos(roll), sr = Math.sin(roll);
      const rolledRight = vec.add(vec.mul(right, cr), vec.mul(baseUp, sr));
      const rolledUp = vec.add(vec.mul(baseUp, cr), vec.mul(right, -sr));
      return { eye, forward, right: rolledRight, up: rolledUp };
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
          if (hit && (!nearest || hit.t < nearest.t)) {
            let normal = vec.norm(vec.cross(vec.sub(world[1], world[0]), vec.sub(world[2], world[0])));
            if (vec.dot(normal, ray.direction) > 0) normal = vec.mul(normal, -1);
            nearest = { ...hit, item, normal };
          }
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

    previewPlacement(px, py) {
      if (!this.template) return null;
      const ray = this.rayFromScreen(px, py);
      const hit = this.raycast(px, py);
      const point = hit ? hit.point : this.intersectGround(ray);
      if (!point) return null;
      let position = point.slice();
      let rotation = [0, 0, 0];
      let parentId = hit ? hit.item.id : null;
      let centerSnapped = false;
      if (hit && this.snap) {
        const parent = hit.item;
        const parentDef = this.getDefinition(parent);
        const parentNodes = parentDef.nodes || [];
        const childNodes = this.template.nodes || [];
        const normalOf = node => node.normal || (node.type === 'top' ? [0, 1, 0] : node.type === 'bottom' ? [0, -1, 0] : null);
        let best = null;
        for (const pn of parentNodes) for (const cn of childNodes) {
          const stackPair = (pn.type === 'top' && cn.type === 'bottom') || (pn.type === 'bottom' && cn.type === 'top');
        if (!stackPair) continue;
          const parentNormal = normalOf(pn), childNormal = normalOf(cn);
          if (parentNormal && childNormal && vec.dot(vec.norm(this.rotate(parentNormal, parent.rotation)), vec.norm(this.rotate(childNormal, parent.rotation))) > -0.75) continue;
          const worldPoint = this.partWorldPoint(parent, pn.p);
          const distance = vec.len(vec.sub(worldPoint, point));
          if (!best || distance < best.distance) best = { pn, cn, worldPoint, distance, normal: parentNormal };
        }
        const snapThreshold = Math.max(0.28, Math.min(0.7, Math.min(parentDef.width, parentDef.depth) * 0.22));
        if (best && best.distance <= snapThreshold) {
          rotation = parent.rotation.slice();
          const childAnchor = this.rotate(best.cn.p, rotation);
          const outward = best.normal ? vec.norm(this.rotate(best.normal, parent.rotation)) : [0, 0, 0];
          position = vec.sub(vec.sub(best.worldPoint, childAnchor), vec.mul(outward, 0.012));
          centerSnapped = true;
        }
      }
      if (hit && !centerSnapped) {
        const normal = hit.normal || vec.mul(ray.direction, -1);
        const surfaceNodes = (this.template.nodes || []).filter(node => node.type === 'surface' && node.normal);
        let radialAnchor = null;
        for (const node of surfaceNodes) {
          const nodeNormal = vec.norm(this.rotate(node.normal, rotation));
          const alignment = vec.dot(nodeNormal, normal);
          if (!radialAnchor || alignment < radialAnchor.alignment) radialAnchor = { node, alignment };
        }
        if (radialAnchor && radialAnchor.alignment < -0.25) {
          position = vec.sub(vec.add(point, vec.mul(normal, 0.012)), this.rotate(radialAnchor.node.p, rotation));
        } else {
          const localNormal = this.rotate(normal, [-rotation[0], -rotation[1], -rotation[2]]);
          const radialShape = ['cylinder', 'capsule', 'engine', 'cone'].includes(this.template.shape);
          const support = radialShape
            ? Math.hypot(localNormal[0] * this.template.width / 2, localNormal[2] * this.template.depth / 2) + Math.abs(localNormal[1]) * this.template.height / 2
            : Math.abs(localNormal[0]) * this.template.width / 2 + Math.abs(localNormal[1]) * this.template.height / 2 + Math.abs(localNormal[2]) * this.template.depth / 2;
          position = vec.add(point, vec.mul(normal, support + 0.012));
        }
      }
      if (!hit && this.parts.length === 0) position = [point[0], this.template.height / 2, point[2]];
      return { position, rotation, parentId, hit };
    }

    placeAt(px, py) {
      if (!this.template) {
        const hit = this.raycast(px, py);
        if (hit) { this.selectedId = hit.item.id; this.changed(); }
        return;
      }
      const placement = this.previewPlacement(px, py);
      if (!placement) return;
      const customDefinition = P.byKey[this.template.key] ? null : this.template;
      const created = this.addPart(this.template.key, placement.position, placement.rotation, placement.parentId, customDefinition);
      if (created && this.mode === 'place') this.template = null;
    }

    findGizmo(px, py, item) {
      const center = this.project(item.position);
      if (!center) return null;
      const axes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      if (this.mode === 'rotate') {
        let ringHit = null;
        for (let axisIndex = 0; axisIndex < axes.length; axisIndex++) {
          const points = [];
          for (let i = 0; i <= 40; i++) {
            const a = i / 40 * Math.PI * 2;
            let local;
            if (axisIndex === 0) local = [0, Math.cos(a) * 1.5, Math.sin(a) * 1.5];
            else if (axisIndex === 1) local = [Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5];
            else local = [Math.cos(a) * 1.5, Math.sin(a) * 1.5, 0];
            const projected = this.project(vec.add(item.position, local));
            if (projected) points.push(projected);
          }
          for (let i = 1; i < points.length; i++) {
            const a = points[i - 1], b = points[i], dx = b.x - a.x, dy = b.y - a.y;
            const t = clamp(((px - a.x) * dx + (py - a.y) * dy) / Math.max(1, dx * dx + dy * dy), 0, 1);
            const distance = Math.hypot(px - a.x - t * dx, py - a.y - t * dy);
            if (distance < 13 && (!ringHit || distance < ringHit.dist)) ringHit = { axis: axes[axisIndex], axisIndex, center, endpoint: b, dist: distance };
          }
        }
        return ringHit;
      }
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
      if (this.mode === 'place' && this.template) {
        this.pointerPosition = [px, py];
        this.drag = { kind: 'place', x: px, y: py, lastX: px, lastY: py };
        this.canvas.setPointerCapture(e.pointerId);
        this.render();
        return;
      }
      if (this.mode === 'place') {
        const placeHit = this.raycast(px, py);
        if (placeHit) {
          this.selectedId = placeHit.item.id;
          this.drag = { kind: 'offset', freeMove: true, x: px, y: py, startPosition: placeHit.item.position.slice(), startRotation: placeHit.item.rotation.slice() };
          this.canvas.setPointerCapture(e.pointerId);
          this.changed();
          return;
        }
        this.drag = { kind: 'pan2d', x: px, y: py, target: this.camera.target.slice() };
        this.canvas.setPointerCapture(e.pointerId);
        return;
      }
      if (this.mode === 'offset' || this.mode === 'rotate') {
        const alreadySelected = this.selectedPart();
        if (alreadySelected) {
          const handle = this.findGizmo(px, py, alreadySelected);
          if (handle) {
            this.drag = {
              kind: this.mode, x: px, y: py, startPosition: alreadySelected.position.slice(), startRotation: alreadySelected.rotation.slice(),
              axis: handle.axis, axisIndex: handle.axisIndex,
              axisScreen: handle.endpoint && handle.center ? [handle.endpoint.x - handle.center.x, handle.endpoint.y - handle.center.y] : [0, -1]
            };
            this.canvas.setPointerCapture(e.pointerId);
            return;
          }
        }
      }
      const hit = this.raycast(px, py);
      if (!hit) {
        this.drag = { kind: 'pan2d', x: px, y: py, target: this.camera.target.slice() };
        this.canvas.setPointerCapture(e.pointerId);
        return;
      }
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
        this.drag = { kind: this.mode, freeMove: this.mode === 'offset', x: px, y: py, startPosition: selected.position.slice(), startRotation: selected.rotation.slice(), axis: [0, 1, 0], axisIndex: 1, axisScreen: [0, -1] };
        this.canvas.setPointerCapture(e.pointerId);
        this.changed();
        return;
      }
      this.changed();
    }

    pointerMove(e) {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = this.width / rect.width;
      const px = (e.clientX - rect.left) * dpr, py = (e.clientY - rect.top) * dpr;
      if (this.template) this.pointerPosition = [px, py];
      if (!this.drag) { if (this.template) this.render(); return; }
      const dx = px - this.drag.x, dy = py - this.drag.y;
      if (this.drag.kind === 'place') {
        this.drag.lastX = px; this.drag.lastY = py;
        this.render();
        return;
      }
      if (this.drag.kind === 'pan2d') {
        const worldPerPixel = this.camera.distance / Math.min(this.width, this.height) * 1.8;
        this.camera.target = [this.drag.target[0] - dx * worldPerPixel, this.drag.target[1] + dy * worldPerPixel, this.drag.target[2]];
        this.render();
        return;
      }
      if (this.drag.kind === 'camera') {
        this.camera.yaw = this.drag.yaw - dx * 0.006;
        this.camera.pitch = clamp(this.drag.pitch + dy * 0.006, -1.25, 1.25);
        this.render();
        return;
      }
      const item = this.selectedPart();
      if (!item) return;
      if (this.drag.kind === 'offset') {
        const worldPerPixel = this.camera.distance / Math.min(this.width, this.height) * 1.6;
        let nextPosition;
        if (this.drag.freeMove) {
          const basis = this.cameraBasis();
          let delta = vec.add(vec.mul(basis.right, dx * worldPerPixel), vec.mul(basis.up, -dy * worldPerPixel));
          if (this.snap) delta = delta.map(value => Math.round(value * 10) / 10);
          nextPosition = vec.add(this.drag.startPosition, delta);
        } else {
          const screenAxis = this.drag.axisScreen;
          const l = Math.hypot(screenAxis[0], screenAxis[1]) || 1;
          const amountPx = (dx * screenAxis[0] + dy * screenAxis[1]) / l;
          let amount = amountPx * worldPerPixel;
          if (this.snap) amount = Math.round(amount * 10) / 10;
          nextPosition = vec.add(this.drag.startPosition, vec.mul(this.drag.axis, amount));
        }
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
      if (this.drag && this.drag.kind === 'place') {
        this.placeAt(this.drag.lastX, this.drag.lastY);
        this.pointerPosition = null;
      }
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
      let def = this.getDefinition(item);
      if (!def || !('wingArea' in def)) return;
      if (!item.definition) { item.definition = P.clone(def); def = item.definition; }
      def[property] = property === 'airfoilProfile' ? String(value) : Number(value);
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
      this.parts = data.parts.map(p => {
        const item = { ...p, position: p.position.map(Number), rotation: p.rotation.map(Number) };
        const def = item.definition || P.byKey[item.key];
        if (item.deployed == null) item.deployed = def?.defaultDeployed ?? true;
        return item;
      });
      this.rootId = data.rootId || (this.parts[0] && this.parts[0].id);
      this.idCounter = Math.max(Number(data.idCounter) || 1, this.parts.length + 1);
      this.selectedId = this.rootId;
      this.changed();
    }

    drawGrid() {
      const ctx = this.ctx;
      ctx.strokeStyle = '#9db0bd'; ctx.lineWidth = 1;
      for (let n = -12; n <= 12; n++) {
        const a = this.project([n, 0, -12]), b = this.project([n, 0, 12]);
        const c = this.project([-12, 0, n]), d = this.project([12, 0, n]);
        if (a && b) { ctx.globalAlpha = n === 0 ? 0.45 : 0.18; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        if (c && d) { ctx.globalAlpha = n === 0 ? 0.45 : 0.18; ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
      const origin = this.project([0, 0, 0]);
      if (origin) {
        ctx.fillStyle = '#159dcc'; ctx.fillRect(origin.x - 2, origin.y - 2, 4, 4);
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
      ctx.fillStyle = '#edf2f6'; ctx.fillRect(0, 0, this.width, this.height);
      const sky = ctx.createLinearGradient(0, 0, 0, this.height);
      sky.addColorStop(0, '#e4edf3'); sky.addColorStop(1, '#f5f8fa');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, this.width, this.height);
      this.drawGrid();

      const faces = [];
      const cameraEye = this.cameraBasis().eye;
      for (const item of this.parts) {
        const def = this.getDefinition(item);
        if (!def) continue;
        const geometry = this.geometryFor(item);
        for (let triIndex = 0; triIndex < geometry.length; triIndex++) {
          const tri = geometry[triIndex];
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
        ctx.strokeStyle = '#159dcc';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(face.projected[0].x, face.projected[0].y);
        ctx.lineTo(face.projected[1].x, face.projected[1].y); ctx.lineTo(face.projected[2].x, face.projected[2].y);
        ctx.closePath(); ctx.fill();
        if (face.selected) ctx.stroke();
      }

      if (this.template && this.pointerPosition) {
        const placement = this.previewPlacement(this.pointerPosition[0], this.pointerPosition[1]);
        if (placement) {
          const ghostItem = { position: placement.position, rotation: placement.rotation };
          const ghostGeometry = P.makeGeometry({ ...this.template, deployed: this.template.defaultDeployed ?? true }, this.baseQualitySegments);
          ctx.save();
          for (const tri of ghostGeometry) {
            const projected = tri.map(p => this.project(this.partWorldPoint(ghostItem, p)));
            if (projected.some(p => !p)) continue;
            ctx.beginPath(); ctx.moveTo(projected[0].x, projected[0].y);
            ctx.lineTo(projected[1].x, projected[1].y); ctx.lineTo(projected[2].x, projected[2].y); ctx.closePath();
            ctx.fillStyle = 'rgba(21,157,204,.3)'; ctx.strokeStyle = 'rgba(10,115,155,.55)'; ctx.lineWidth = 0.7;
            ctx.fill(); ctx.stroke();
          }
          const anchor = this.project(placement.position);
          if (anchor) { ctx.strokeStyle = '#159dcc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(anchor.x, anchor.y, 8, 0, Math.PI * 2); ctx.stroke(); }
          ctx.restore();
        }
      }

      const selected = this.selectedPart();
      if (selected && this.mode !== 'place') this.drawGizmo(selected);
      if (this.showNodes) {
        for (const item of this.parts) {
          const def = this.getDefinition(item);
          for (const node of (def && def.nodes) || []) {
            if (node.type !== 'top' && node.type !== 'bottom') continue;
            const p = this.project(this.partWorldPoint(item, node.p));
            if (!p) continue;
            ctx.fillStyle = item.id === this.selectedId ? '#ffffff' : '#55bfd5';
            ctx.strokeStyle = item.id === this.selectedId ? '#159dcc' : '#345c71'; ctx.lineWidth = 1.25;
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
