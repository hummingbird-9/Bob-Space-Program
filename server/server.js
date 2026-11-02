#!/usr/bin/env node
'use strict';

// Dependency-free BSP LAN relay. Start this from the bob-space-program folder.
const http = require('http');
const fs = require('fs');
const path = require('path');
const URL = require('url');
const candidates = [process.env.BSP_WEB_ROOT, process.cwd(), path.resolve(path.dirname(process.execPath), '..'), path.resolve(path.dirname(process.execPath), '../Resources/bsp'), '/usr/share/bsp'].filter(Boolean);
const ROOT = candidates.map(candidate => path.resolve(candidate)).find(candidate => fs.existsSync(path.join(candidate, 'index.html'))) || path.resolve(process.cwd());
const PORT = Number(process.env.PORT || 3210);
const rooms = new Map();
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8'
};

function safeText(value, max = 80) { return String(value || '').replace(/[<>\u0000-\u001f]/g, '').slice(0, max); }
function getRoom(roomId) {
  const key = safeText(roomId || 'BSP-ROOM', 32);
  if (!rooms.has(key)) rooms.set(key, new Map());
  return rooms.get(key);
}
function reply(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 65536) { reject(new Error('Request too large')); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }
  const parsed = URL.parse(req.url, true);
  if (parsed.pathname === '/api/join' && req.method === 'POST') {
    try {
      const data = await readJson(req), room = getRoom(data.room), playerId = safeText(data.playerId, 48);
      if (!playerId) return reply(res, 400, { error: 'playerId is required' });
      room.set(playerId, {
        playerId, playerName: safeText(data.playerName || 'Bob Pilot', 32), agency: safeText(data.agency || 'Bob Space Program', 40),
        mode: data.mode === 'compete' ? 'compete' : 'same', view: 'vab', body: 'Kerbin', altitude: 0, score: 0, updated: Date.now()
      });
      return reply(res, 200, { ok: true, players: room.size });
    } catch (e) { return reply(res, 400, { error: e.message }); }
  }
  if (parsed.pathname === '/api/update' && req.method === 'POST') {
    try {
      const data = await readJson(req), room = getRoom(data.room), playerId = safeText(data.playerId, 48);
      const existing = room.get(playerId) || {};
      room.set(playerId, {
        ...existing, playerId, playerName: safeText(data.playerName || existing.playerName || 'Bob Pilot', 32),
        agency: safeText(data.agency || existing.agency || 'Bob Space Program', 40), mode: data.mode === 'compete' ? 'compete' : 'same',
        view: safeText(data.view, 12), body: safeText(data.body, 24), altitude: Math.max(0, Math.min(1e12, Number(data.altitude) || 0)),
        score: Math.max(0, Math.min(100, Number(data.score) || 0)), updated: Date.now()
      });
      return reply(res, 200, { ok: true });
    } catch (e) { return reply(res, 400, { error: e.message }); }
  }
  if (parsed.pathname === '/api/state' && req.method === 'GET') {
    const room = getRoom(parsed.query.room);
    const now = Date.now();
    for (const [id, player] of room) if (now - player.updated > 45000) room.delete(id);
    return reply(res, 200, { ok: true, room: safeText(parsed.query.room, 32), players: [...room.values()] });
  }
  if (parsed.pathname === '/api/leave' && req.method === 'POST') {
    try {
      const data = await readJson(req), room = getRoom(data.room);
      room.delete(safeText(data.playerId, 48));
      return reply(res, 200, { ok: true });
    } catch (e) { return reply(res, 400, { error: e.message }); }
  }

  let pathname = decodeURIComponent(parsed.pathname || '/');
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.resolve(ROOT, '.' + pathname);
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== path.join(ROOT, 'index.html')) {
    res.writeHead(403); return res.end('Forbidden');
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('Bob Space Program LAN server');
  console.log('Local: http://localhost:' + PORT);
  console.log('LAN:   http://<host-computer-ip>:' + PORT);
  console.log('Web root: ' + ROOT);
  console.log('Press Ctrl+C to stop.');
});

function shutdown() { server.close(() => process.exit(0)); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
