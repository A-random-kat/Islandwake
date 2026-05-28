const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const port = Number(process.env.PORT || 4174);
const clients = new Map();
const bots = [];
const crates = [];
const worldBounds = 280;
const botCount = 14;

const islandCenters = [
  { x: -34, z: -24, radius: 20 },
  { x: -184, z: -122, radius: 23 },
  { x: 182, z: -138, radius: 24 },
  { x: 116, z: 142, radius: 21 },
  { x: -142, z: 118, radius: 22 },
  { x: 36, z: 226, radius: 24 },
  { x: 226, z: 28, radius: 20 },
  { x: -222, z: 32, radius: 22 },
  { x: -26, z: -214, radius: 20 },
  { x: 104, z: -224, radius: 21 },
  { x: -232, z: -204, radius: 22 },
  { x: 214, z: 210, radius: 22 },
  { x: 4, z: 84, radius: 18 },
  { x: 164, z: -22, radius: 21 },
  { x: -96, z: 216, radius: 20 },
  { x: 246, z: -222, radius: 21 },
];

const shipStats = [
  { id: "cog", hp: 780, speed: 10, tier: 1 },
  { id: "longship", hp: 615, speed: 24, tier: 1 },
  { id: "dhow", hp: 705, speed: 19, tier: 1 },
  { id: "sloop", hp: 675, speed: 27, tier: 1 },
  { id: "knarr", hp: 870, speed: 12, tier: 1 },
  { id: "lugger", hp: 735, speed: 22, tier: 2 },
  { id: "dart", hp: 690, speed: 30, tier: 2 },
  { id: "junk", hp: 990, speed: 15, tier: 2 },
  { id: "schooner", hp: 900, speed: 26, tier: 2 },
  { id: "xebec", hp: 960, speed: 29, tier: 2 },
  { id: "brigantine", hp: 1080, speed: 22, tier: 3 },
  { id: "caravel", hp: 1170, speed: 16, tier: 3 },
  { id: "snow", hp: 1290, speed: 19, tier: 3 },
  { id: "fluyt", hp: 1500, speed: 13, tier: 3 },
  { id: "barque", hp: 1410, speed: 21, tier: 3 },
  { id: "corvette", hp: 1530, speed: 25, tier: 4 },
  { id: "frigate", hp: 1740, speed: 24, tier: 4 },
  { id: "galleon", hp: 2700, speed: 12, tier: 5 },
  { id: "carrack", hp: 2340, speed: 10, tier: 4 },
  { id: "eastindiaman", hp: 2460, speed: 12, tier: 5 },
  { id: "razee", hp: 2550, speed: 18, tier: 5 },
  { id: "manowar", hp: 3360, speed: 11, tier: 6 },
  { id: "firstrate", hp: 3960, speed: 9, tier: 6 },
];

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function isInsideIsland(point, margin = 0) {
  return islandCenters.some((island) => Math.hypot(point.x - island.x, point.z - island.z) < island.radius + margin);
}

function nearestIsland(point, margin = 0) {
  let best = null;
  let bestDistance = Infinity;
  for (const island of islandCenters) {
    const distance = Math.hypot(point.x - island.x, point.z - island.z) - island.radius - margin;
    if (distance < bestDistance) {
      best = island;
      bestDistance = distance;
    }
  }
  return { island: best, distance: bestDistance };
}

function angleDelta(target, current) {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current));
}

function randomPoint(radius = worldBounds, minCenterDistance = 0) {
  for (let i = 0; i < 40; i++) {
    const point = {
      x: (Math.random() - 0.5) * radius * 2,
      z: (Math.random() - 0.5) * radius * 2,
    };
    if (Math.hypot(point.x, point.z) >= minCenterDistance && !isInsideIsland(point, 14)) return point;
  }
  return { x: -radius * 0.68, z: radius * 0.54 };
}

function randomShip() {
  return shipStats[Math.floor(Math.random() * shipStats.length)];
}

function makeBot(id = crypto.randomUUID()) {
  const spec = randomShip();
  const point = randomPoint(worldBounds, 90);
  return {
    id,
    shipType: spec.id,
    hp: spec.hp,
    maxHp: spec.hp,
    speed: spec.speed,
    tier: spec.tier,
    level: 1 + Math.floor(Math.random() * (4 + spec.tier)),
    x: point.x,
    z: point.z,
    rotation: Math.random() * Math.PI * 2,
    vx: 0,
    vz: 0,
    targetX: point.x,
    targetZ: point.z,
    targetPlayer: null,
    aggressive: Math.random() < 0.04,
    angerUntil: 0,
    turn: Math.random() * 4,
    fireCooldown: 1.5 + Math.random() * 2.5,
  };
}

function spawnCrates(x, z, count, level = 1, tier = 0) {
  for (let i = 0; i < count; i++) {
    crates.push({
      id: crypto.randomUUID(),
      x: x + (Math.random() - 0.5) * 6,
      z: z + (Math.random() - 0.5) * 6,
      heal: 8 + tier * 2 + Math.random() * 8,
      xp: 16 + level * 4 + tier * 8 + Math.random() * 15,
      gold: 14 + level * 4 + tier * 10 + Math.floor(Math.random() * 22),
    });
  }
}

function crateDropCount(bot) {
  return 2 + Math.floor((bot.level || 1) / 2) + (bot.tier || 0);
}

function botSnapshot(bot) {
  return {
    id: bot.id,
    shipType: bot.shipType,
    hp: Math.max(0, Math.round(bot.hp)),
    maxHp: bot.maxHp,
    level: bot.level,
    x: bot.x,
    z: bot.z,
    rotation: bot.rotation,
  };
}

function worldSnapshot() {
  return {
    type: "world",
    bots: bots.map(botSnapshot),
    crates: crates.map((crate) => ({
      id: crate.id,
      x: crate.x,
      z: crate.z,
      heal: Math.round(crate.heal),
      xp: Math.round(crate.xp),
      gold: crate.gold,
    })),
  };
}

function resetBot(bot) {
  Object.assign(bot, makeBot(bot.id));
}

function playerSocket(id) {
  const socket = clients.get(id);
  return socket?.player ? socket : null;
}

function nearestShipPlayer(bot, maxDistance) {
  let best = null;
  let bestDistance = maxDistance;
  for (const socket of clients.values()) {
    if (!socket.player || socket.player.mode === "land") continue;
    const x = Number(socket.player.x);
    const z = Number(socket.player.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
    const distance = Math.hypot(x - bot.x, z - bot.z);
    if (distance < bestDistance) {
      best = socket;
      bestDistance = distance;
    }
  }
  return best;
}

function updateWorld() {
  const dt = 0.1;
  const now = Date.now();
  for (const bot of bots) {
    if (bot.targetPlayer && bot.angerUntil && bot.angerUntil < now) bot.targetPlayer = null;
    let targetSocket = bot.targetPlayer ? playerSocket(bot.targetPlayer) : null;
    if (targetSocket?.player?.mode === "land") targetSocket = null;
    if (!targetSocket && bot.aggressive) {
      targetSocket = nearestShipPlayer(bot, 28);
      bot.targetPlayer = targetSocket?.id || null;
      bot.angerUntil = targetSocket ? now + 9000 : 0;
    }
    bot.fireCooldown = Math.max(0, bot.fireCooldown - dt);
    bot.turn -= dt;

    if (targetSocket) {
      bot.targetX = Number(targetSocket.player.x) || bot.x;
      bot.targetZ = Number(targetSocket.player.z) || bot.z;
      if (Math.hypot(bot.targetX - bot.x, bot.targetZ - bot.z) > 58) {
        targetSocket = null;
        bot.targetPlayer = null;
        bot.angerUntil = 0;
      }
    } else if (bot.turn <= 0 || Math.hypot(bot.targetX - bot.x, bot.targetZ - bot.z) < 8) {
      const point = randomPoint(worldBounds * 0.92);
      bot.targetX = point.x;
      bot.targetZ = point.z;
      bot.turn = 4 + Math.random() * 7;
      bot.targetPlayer = null;
    }

    const toTarget = { x: bot.targetX - bot.x, z: bot.targetZ - bot.z };
    const distance = Math.hypot(toTarget.x, toTarget.z);
    if (distance > 0.01) {
      const desired = Math.atan2(toTarget.x, toTarget.z);
      const delta = angleDelta(desired, bot.rotation);
      const turnRate = targetSocket ? 0.95 + bot.speed / 46 : 0.6 + bot.speed / 64;
      bot.rotation += clamp(delta, -turnRate * dt, turnRate * dt);
      const forward = { x: Math.sin(bot.rotation), z: Math.cos(bot.rotation) };
      const facing = clamp(Math.cos(delta), 0.18, 1);
      const cruise = targetSocket ? 0.55 : 0.34;
      const arrive = clamp(distance / (targetSocket ? 20 : 34), 0.25, 1);
      const desiredSpeed = bot.speed * cruise * facing * arrive;
      const steer = clamp(dt * (targetSocket ? 1.5 : 1.0), 0, 0.18);
      bot.vx += (forward.x * desiredSpeed - bot.vx) * steer;
      bot.vz += (forward.z * desiredSpeed - bot.vz) * steer;
      bot.vx *= 0.985;
      bot.vz *= 0.985;
      const next = { x: bot.x + bot.vx * dt, z: bot.z + bot.vz * dt };
      const nearIsland = nearestIsland(next, 12);
      if (nearIsland.distance > 0) {
        bot.x = next.x;
        bot.z = next.z;
      } else {
        const away = Math.atan2(bot.x - nearIsland.island.x, bot.z - nearIsland.island.z);
        bot.vx *= 0.15;
        bot.vz *= 0.15;
        bot.rotation = bot.rotation + clamp(angleDelta(away, bot.rotation), -1.2 * dt, 1.2 * dt);
        bot.targetPlayer = null;
        bot.angerUntil = 0;
        const point = randomPoint(worldBounds * 0.82);
        bot.targetX = point.x;
        bot.targetZ = point.z;
        bot.turn = 2 + Math.random() * 3;
      }
    }

    if (Math.abs(bot.x) > worldBounds || Math.abs(bot.z) > worldBounds) {
      bot.x = clamp(bot.x, -worldBounds, worldBounds);
      bot.z = clamp(bot.z, -worldBounds, worldBounds);
      bot.rotation += Math.PI * 0.65;
      bot.vx *= -0.2;
      bot.vz *= -0.2;
      bot.targetPlayer = null;
      bot.angerUntil = 0;
      const point = randomPoint(worldBounds * 0.82);
      bot.targetX = point.x;
      bot.targetZ = point.z;
    }

    if (targetSocket && bot.fireCooldown <= 0) {
      const dx = (Number(targetSocket.player.x) || 0) - bot.x;
      const dz = (Number(targetSocket.player.z) || 0) - bot.z;
      const shotDistance = Math.hypot(dx, dz);
      if (shotDistance < 38 && shotDistance > 0.01) {
        const dirX = dx / shotDistance;
        const dirZ = dz / shotDistance;
        broadcast({
          type: "shot",
          shot: {
            owner: bot.id,
            x: bot.x + dirX * 3.6,
            z: bot.z + dirZ * 3.6,
            dirX,
            dirZ,
            damage: 18 + bot.level * 2.2 + bot.tier * 4,
            range: 48,
          },
        });
        bot.fireCooldown = Math.max(1.65, 3.8 - bot.level * 0.08);
      }
    }
  }
  broadcast(worldSnapshot());
}

for (let i = 0; i < botCount; i++) bots.push(makeBot());
setInterval(updateWorld, 100);

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);
  const filePath = path.resolve(root, pathname === "/" ? "index.html" : `.${pathname}`);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
});

server.on("upgrade", (req, socket) => {
  if (req.headers.upgrade?.toLowerCase() !== "websocket") {
    socket.destroy();
    return;
  }
  const accept = crypto
    .createHash("sha1")
    .update(`${req.headers["sec-websocket-key"]}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");
  socket.write([
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${accept}`,
    "",
    "",
  ].join("\r\n"));
  socket.id = crypto.randomUUID();
  socket.player = null;
  socket.pending = Buffer.alloc(0);
  clients.set(socket.id, socket);
  send(socket, { type: "welcome", id: socket.id });
  send(socket, worldSnapshot());
  socket.on("data", (buffer) => readFrames(socket, buffer));
  socket.on("close", () => leave(socket));
  socket.on("error", () => leave(socket));
});

function leave(socket) {
  if (!clients.has(socket.id)) return;
  clients.delete(socket.id);
  for (const bot of bots) {
    if (bot.targetPlayer === socket.id) bot.targetPlayer = null;
  }
  broadcast({ type: "leave", id: socket.id }, socket);
}

function readFrames(socket, chunk) {
  const buffer = socket.pending.length ? Buffer.concat([socket.pending, chunk]) : chunk;
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const frameStart = offset;
    const first = buffer[offset++];
    const second = buffer[offset++];
    const opcode = first & 0x0f;
    const masked = Boolean(second & 0x80);
    let length = second & 0x7f;
    if (length === 126) {
      if (offset + 2 > buffer.length) {
        socket.pending = buffer.subarray(frameStart);
        return;
      }
      length = buffer.readUInt16BE(offset);
      offset += 2;
    } else if (length === 127) {
      if (offset + 8 > buffer.length) {
        socket.pending = buffer.subarray(frameStart);
        return;
      }
      length = Number(buffer.readBigUInt64BE(offset));
      offset += 8;
    }
    let mask;
    if (masked) {
      if (offset + 4 > buffer.length) {
        socket.pending = buffer.subarray(frameStart);
        return;
      }
      mask = buffer.subarray(offset, offset + 4);
      offset += 4;
    }
    if (offset + length > buffer.length) {
      socket.pending = buffer.subarray(frameStart);
      return;
    }
    const payload = buffer.subarray(offset, offset + length);
    offset += length;
    if (opcode === 8) return leave(socket);
    if (opcode !== 1) continue;
    const bytes = Buffer.alloc(payload.length);
    for (let i = 0; i < payload.length; i++) {
      bytes[i] = masked ? payload[i] ^ mask[i % 4] : payload[i];
    }
    handleMessage(socket, bytes.toString("utf8"));
  }
  socket.pending = offset < buffer.length ? buffer.subarray(offset) : Buffer.alloc(0);
}

function handleMessage(socket, text) {
  let message;
  try {
    message = JSON.parse(text);
  } catch {
    return;
  }
  if (message.type === "hello" || message.type === "state") {
    socket.player = { ...message.player, id: socket.id, updated: Date.now() };
    broadcast({ type: "state", player: socket.player }, socket);
    if (message.type === "hello") {
      for (const other of clients.values()) {
        if (other !== socket && other.player) send(socket, { type: "state", player: other.player });
      }
      send(socket, worldSnapshot());
    }
  }
  if (message.type === "shot") {
    broadcast({ type: "shot", shot: { ...message.shot, owner: socket.id } }, socket);
  }
  if (message.type === "hitBot") {
    const bot = bots.find((item) => item.id === message.id);
    if (!bot) return;
    bot.hp -= clamp(Number(message.damage) || 0, 0, 240);
    bot.targetPlayer = socket.id;
    bot.angerUntil = Date.now() + 12000 + (bot.level || 1) * 500;
    bot.fireCooldown = Math.min(bot.fireCooldown, 1.35);
    if (bot.hp <= 0) {
      const level = bot.level || 1;
      const tier = bot.tier || 0;
      spawnCrates(bot.x, bot.z, crateDropCount(bot), level, tier);
      send(socket, {
        type: "botReward",
        level,
        gold: 50 + level * 14 + tier * 40,
        xp: 48 + level * 22 + tier * 28,
      });
      resetBot(bot);
    }
    broadcast(worldSnapshot());
  }
  if (message.type === "collectCrate") {
    const index = crates.findIndex((crate) => crate.id === message.id);
    if (index < 0) return;
    const crate = crates[index];
    if (socket.player && dist(crate, socket.player) > 8) return;
    crates.splice(index, 1);
    send(socket, { type: "crateReward", crate });
    broadcast({ type: "crateRemove", id: crate.id }, socket);
    broadcast(worldSnapshot());
  }
}

function broadcast(message, except) {
  for (const client of clients.values()) {
    if (client !== except) send(client, message);
  }
}

function send(socket, message) {
  if (socket.destroyed) return;
  const payload = Buffer.from(JSON.stringify(message));
  let header;
  if (payload.length < 126) {
    header = Buffer.from([0x81, payload.length]);
  } else if (payload.length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payload.length), 2);
  }
  socket.write(Buffer.concat([header, payload]));
}

server.listen(port, () => {
  console.log(`Islandwake multiplayer server: http://localhost:${port}`);
});
