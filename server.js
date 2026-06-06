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
const visibleBounds = worldBounds * 1.12;
const botCount = 14;
const cannonballSpeed = 29.3;
const botCannonRange = 34;
const centerBotClearRadius = 88;
const crateLifetimeMs = 120000;
const crateSinkMs = 5000;
const maxTreasures = 3;
const krakenMaxHp = 10000;
const krakenRadius = 25;
const krakenAttackRadius = 62;
const krakenSpeed = 1;
const krakenAttackDamage = 999999;
const krakenBotFleeRadius = krakenAttackRadius + 46;
const crateDropMultiplier = 1.2;
const krakenSlamDelayMs = 2900;
const maxReloadUpgrades = 20;
let nextTreasureSpawnAt = Date.now() + 12000 + Math.random() * 18000;
let kraken = null;

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

const playerShipTiers = {
  skiff: 0,
  shallop: 0,
  pinnace: 0,
  hoy: 0,
  dogger: 1,
  tartane: 1,
  pink: 2,
  cat: 2,
  ketch: 2,
  galley: 2,
  packet: 3,
  barquentine: 3,
  clipper: 3,
  bombketch: 3,
  storm: 3,
  merchantman: 4,
  treasure: 5,
  fourthrate: 5,
};

const shipPhysics = {
  skiff: { radius: 2.4, weight: 50 },
  shallop: { radius: 2.5, weight: 55 },
  pinnace: { radius: 2.6, weight: 59 },
  hoy: { radius: 2.9, weight: 76 },
  cog: { radius: 3.1, weight: 89 },
  longship: { radius: 3.2, weight: 88 },
  dogger: { radius: 2.9, weight: 75 },
  dhow: { radius: 3, weight: 82 },
  sloop: { radius: 3, weight: 78 },
  knarr: { radius: 3.2, weight: 95 },
  lugger: { radius: 3, weight: 80 },
  tartane: { radius: 3.1, weight: 85 },
  pink: { radius: 3.2, weight: 95 },
  cat: { radius: 3, weight: 77 },
  dart: { radius: 3, weight: 78 },
  junk: { radius: 3.6, weight: 121 },
  ketch: { radius: 3.3, weight: 100 },
  schooner: { radius: 3.3, weight: 97 },
  galley: { radius: 3.5, weight: 107 },
  xebec: { radius: 3.4, weight: 101 },
  brigantine: { radius: 3.6, weight: 117 },
  caravel: { radius: 3.5, weight: 114 },
  snow: { radius: 3.7, weight: 126 },
  packet: { radius: 3.5, weight: 110 },
  barquentine: { radius: 3.7, weight: 128 },
  clipper: { radius: 3.6, weight: 118 },
  fluyt: { radius: 4, weight: 154 },
  storm: { radius: 3.4, weight: 102 },
  bombketch: { radius: 3.9, weight: 138 },
  barque: { radius: 3.9, weight: 144 },
  corvette: { radius: 3.9, weight: 138 },
  frigate: { radius: 4.1, weight: 153 },
  merchantman: { radius: 4.4, weight: 191 },
  carrack: { radius: 4.4, weight: 185 },
  galleon: { radius: 4.6, weight: 206 },
  eastindiaman: { radius: 4.7, weight: 219 },
  treasure: { radius: 4.9, weight: 238 },
  razee: { radius: 4.6, weight: 195 },
  fourthrate: { radius: 4.9, weight: 222 },
  manowar: { radius: 5.2, weight: 250 },
  firstrate: { radius: 5.6, weight: 290 },
};

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

function isNearStarterIsland(point, margin = centerBotClearRadius) {
  const starter = islandCenters[0];
  return Math.hypot(point.x - starter.x, point.z - starter.z) < margin;
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

function randomTravelPoint(radius = worldBounds * 0.92) {
  for (let i = 0; i < 70; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = radius * (0.42 + Math.random() * 0.55);
    const point = {
      x: Math.sin(angle) * distance,
      z: Math.cos(angle) * distance,
    };
    if (!isInsideIsland(point, 22) && !isNearStarterIsland(point)) return point;
  }
  return randomPoint(radius, 92);
}

function randomKrakenPoint() {
  for (let i = 0; i < 90; i++) {
    const point = randomPoint(worldBounds * 0.72, 120);
    if (!isInsideIsland(point, krakenRadius + 24)) return point;
  }
  return { x: worldBounds * 0.42, z: -worldBounds * 0.28 };
}

function makeKraken() {
  const point = randomKrakenPoint();
  const target = randomKrakenPoint();
  return {
    id: "kraken",
    x: point.x,
    z: point.z,
    vx: 0,
    vz: 0,
    rotation: Math.random() * Math.PI * 2,
    targetX: target.x,
    targetZ: target.z,
    hp: krakenMaxHp,
    maxHp: krakenMaxHp,
    alive: true,
    attackAt: 0,
    defeatedAt: 0,
  };
}

kraken = makeKraken();

function randomShip() {
  return shipStats[Math.floor(Math.random() * shipStats.length)];
}

function shipSpec(type) {
  return shipStats.find((ship) => ship.id === type) || shipStats[0];
}

function shipTierForDrop(type) {
  const listed = shipStats.find((ship) => ship.id === type);
  if (listed) return listed.tier || 0;
  return playerShipTiers[type] || 0;
}

function radiusScaleForPhysics(radius) {
  if (radius >= 5.1) return 1.18;
  if (radius >= 4.6) return 1.135;
  if (radius >= 4.0) return 1.09;
  if (radius >= 3.5) return 1.045;
  return 1;
}

function shipRadius(type) {
  if (shipPhysics[type]?.radius) return shipPhysics[type].radius * radiusScaleForPhysics(shipPhysics[type].radius);
  const spec = shipSpec(type);
  return 2.35 + spec.tier * 0.48;
}

function shipWeight(type) {
  if (shipPhysics[type]?.weight) {
    const baseRadius = shipPhysics[type].radius || 3;
    const radiusScale = shipRadius(type) / baseRadius;
    return Math.round(shipPhysics[type].weight * radiusScale * radiusScale);
  }
  const spec = shipSpec(type);
  return Math.max(35, Math.round(42 + spec.tier * 26 + spec.hp / 180 - spec.speed * 0.08));
}

function botUpgradeLevels(botOrLevel = 1) {
  const level = typeof botOrLevel === "number" ? botOrLevel : botOrLevel?.level || 1;
  const focus = typeof botOrLevel === "object" ? botOrLevel.upgradeFocus || "damage" : "damage";
  const order = focus === "reload" ? ["reload", "range", "damage"]
    : focus === "range" ? ["range", "damage", "reload"]
      : ["damage", "reload", "range"];
  const upgrades = { damage: 0, reload: 0, range: 0 };
  for (let i = 0; i < Math.max(0, Math.floor(level) - 1); i++) {
    for (let offset = 0; offset < order.length; offset++) {
      const kind = order[(i + offset) % order.length];
      if (kind === "reload" && upgrades.reload >= maxReloadUpgrades) continue;
      upgrades[kind]++;
      break;
    }
  }
  return upgrades;
}

function botCannonDamage(botOrLevel = 1) {
  return 34 + botUpgradeLevels(botOrLevel).damage * 2;
}

function botCannonReload(botOrLevel = 1) {
  return Math.max(0.36, 0.78 - botUpgradeLevels(botOrLevel).reload * 0.02);
}

function botCannonRangeFor(botOrLevel = 1) {
  return botCannonRange + botUpgradeLevels(botOrLevel).range * 4;
}

function scaleDamageByRange(baseDamage, distance, range) {
  return Math.round(baseDamage * (1 + clamp(distance / Math.max(1, range), 0, 1) * 0.5));
}

function aimBotShot(bot, shotTarget, maxRange = botCannonRange) {
  let targetX = Number(shotTarget.x);
  let targetZ = Number(shotTarget.z);
  if (!Number.isFinite(targetX) || !Number.isFinite(targetZ)) {
    targetX = bot.x;
    targetZ = bot.z;
  }
  const distance = Math.hypot(targetX - bot.x, targetZ - bot.z);
  const vx = Number(shotTarget.vx) || 0;
  const vz = Number(shotTarget.vz) || 0;
  if (distance > 0.01 && (vx || vz)) {
    const leadTime = clamp(distance / cannonballSpeed, 0, 1.35);
    targetX += vx * leadTime * 0.82;
    targetZ += vz * leadTime * 0.82;
  }
  if (distance > 0.01) {
    const jitter = clamp(0.45 + distance * 0.012, 0.45, 1.4);
    targetX += (Math.random() - 0.5) * jitter;
    targetZ += (Math.random() - 0.5) * jitter;
  }
  const dx = targetX - bot.x;
  const dz = targetZ - bot.z;
  const aimedDistance = Math.hypot(dx, dz);
  if (aimedDistance > maxRange && aimedDistance > 0.001) {
    targetX = bot.x + (dx / aimedDistance) * maxRange;
    targetZ = bot.z + (dz / aimedDistance) * maxRange;
  }
  return { targetX, targetZ };
}

function separateBotFromPoint(bot, point, pointType, pushShare = 1) {
  const minDistance = (shipRadius(bot.shipType) + shipRadius(pointType)) * 0.78;
  const dx = bot.x - point.x;
  const dz = bot.z - point.z;
  const distance = Math.hypot(dx, dz);
  if (distance >= minDistance) return false;
  const nx = distance > 0.001 ? dx / distance : Math.sin(Date.now() * 0.01);
  const nz = distance > 0.001 ? dz / distance : Math.cos(Date.now() * 0.01);
  const overlap = minDistance - distance;
  const botMass = shipWeight(bot.shipType);
  const pointMass = shipWeight(pointType);
  const totalWeight = botMass + pointMass;
  const correction = Math.max(0, overlap - 0.08) * 0.68 * pushShare * (pointMass / totalWeight) * 2;
  bot.x += nx * correction;
  bot.z += nz * correction;
  const pointVx = Number(point.vx) || 0;
  const pointVz = Number(point.vz) || 0;
  const relativeNormalSpeed = (bot.vx * nx + bot.vz * nz) - (pointVx * nx + pointVz * nz);
  const invBot = pushShare > 0 ? pushShare / botMass : 0;
  if (invBot > 0) {
    const biasSpeed = clamp(Math.max(0, overlap - 0.12) * 0.42, 0, 1.9);
    let normalImpulse = 0;
    if (relativeNormalSpeed < biasSpeed) {
      const restitution = relativeNormalSpeed < -5 ? 0.12 : 0.02;
      normalImpulse = clamp((biasSpeed - (1 + restitution) * relativeNormalSpeed) / invBot, 0, 900);
      bot.vx += nx * normalImpulse * invBot;
      bot.vz += nz * normalImpulse * invBot;
    }
    if (normalImpulse > 0) {
      const relVx = bot.vx - pointVx;
      const relVz = bot.vz - pointVz;
      const normalSpeed = relVx * nx + relVz * nz;
      const tangentX = relVx - nx * normalSpeed;
      const tangentZ = relVz - nz * normalSpeed;
      const tangentSpeed = Math.hypot(tangentX, tangentZ);
      if (tangentSpeed > 0.001) {
        const frictionImpulse = Math.min(tangentSpeed / invBot, normalImpulse * 0.42);
        bot.vx -= (tangentX / tangentSpeed) * frictionImpulse * invBot;
        bot.vz -= (tangentZ / tangentSpeed) * frictionImpulse * invBot;
      }
    }
  }
  bot.vx *= 0.985;
  bot.vz *= 0.985;
  return true;
}

function separateBots(bot, other) {
  const minDistance = (shipRadius(bot.shipType) + shipRadius(other.shipType)) * 0.78;
  const dx = bot.x - other.x;
  const dz = bot.z - other.z;
  const distance = Math.hypot(dx, dz);
  if (distance >= minDistance) return false;
  const nx = distance > 0.001 ? dx / distance : Math.sin(Date.now() * 0.01);
  const nz = distance > 0.001 ? dz / distance : Math.cos(Date.now() * 0.01);
  const overlap = minDistance - distance;
  const botMass = shipWeight(bot.shipType);
  const otherMass = shipWeight(other.shipType);
  const botMotion = otherMass / (botMass + otherMass);
  const otherMotion = botMass / (botMass + otherMass);
  const correction = Math.max(0, overlap - 0.08) * 0.68;
  bot.x += nx * correction * botMotion;
  bot.z += nz * correction * botMotion;
  other.x -= nx * correction * otherMotion;
  other.z -= nz * correction * otherMotion;
  const invBot = 1 / botMass;
  const invOther = 1 / otherMass;
  const totalInvMass = invBot + invOther;
  const relativeNormalSpeed = (bot.vx * nx + bot.vz * nz) - (other.vx * nx + other.vz * nz);
  const biasSpeed = clamp(Math.max(0, overlap - 0.12) * 0.42, 0, 1.9);
  let normalImpulse = 0;
  if (relativeNormalSpeed < biasSpeed) {
    const restitution = relativeNormalSpeed < -5 ? 0.12 : 0.02;
    normalImpulse = clamp((biasSpeed - (1 + restitution) * relativeNormalSpeed) / totalInvMass, 0, 900);
    bot.vx += nx * normalImpulse * invBot;
    bot.vz += nz * normalImpulse * invBot;
    other.vx -= nx * normalImpulse * invOther;
    other.vz -= nz * normalImpulse * invOther;
  }
  if (normalImpulse > 0) {
    const relVx = bot.vx - other.vx;
    const relVz = bot.vz - other.vz;
    const normalSpeed = relVx * nx + relVz * nz;
    const tangentX = relVx - nx * normalSpeed;
    const tangentZ = relVz - nz * normalSpeed;
    const tangentSpeed = Math.hypot(tangentX, tangentZ);
    if (tangentSpeed > 0.001) {
      const frictionImpulse = Math.min(tangentSpeed / totalInvMass, normalImpulse * 0.42);
      bot.vx -= (tangentX / tangentSpeed) * frictionImpulse * invBot;
      bot.vz -= (tangentZ / tangentSpeed) * frictionImpulse * invBot;
      other.vx += (tangentX / tangentSpeed) * frictionImpulse * invOther;
      other.vz += (tangentZ / tangentSpeed) * frictionImpulse * invOther;
    }
  }
  bot.vx *= 0.985;
  bot.vz *= 0.985;
  other.vx *= 0.985;
  other.vz *= 0.985;
  return true;
}

function pushBotOutOfIsland(bot) {
  let pushed = false;
  for (const island of islandCenters) {
    const dx = bot.x - island.x;
    const dz = bot.z - island.z;
    const distance = Math.hypot(dx, dz);
    const minDistance = island.radius + shipRadius(bot.shipType) * 0.65 + 5;
    if (distance >= minDistance) continue;
    const nx = distance > 0.001 ? dx / distance : 1;
    const nz = distance > 0.001 ? dz / distance : 0;
    bot.x = island.x + nx * minDistance;
    bot.z = island.z + nz * minDistance;
    const inward = bot.vx * nx + bot.vz * nz;
    if (inward < 0) {
      bot.vx += nx * -inward * 1.05;
      bot.vz += nz * -inward * 1.05;
    }
    bot.vx *= 0.58;
    bot.vz *= 0.58;
    pushed = true;
  }
  return pushed;
}

function resolveBotContacts() {
  for (let i = 0; i < bots.length; i++) {
    const bot = bots[i];
    pushBotOutOfIsland(bot);
    for (let j = i + 1; j < bots.length; j++) {
      separateBots(bot, bots[j]);
    }
    for (const socket of clients.values()) {
      if (!socket.player || socket.player.mode === "land") continue;
      separateBotFromPoint(bot, socket.player, socket.player.shipType || "skiff", 1);
    }
  }
}

function makeBot(id = crypto.randomUUID()) {
  const spec = randomShip();
  const point = randomPoint(worldBounds, 90);
  const target = randomTravelPoint(worldBounds * 0.92);
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
    targetX: target.x,
    targetZ: target.z,
    targetPlayer: null,
    aggressive: Math.random() < 0.24,
    upgradeFocus: ["damage", "reload", "range"][Math.floor(Math.random() * 3)],
    angerUntil: 0,
    targetBot: null,
    botFightUntil: 0,
    turn: Math.random() * 4,
    fireCooldown: 1.5 + Math.random() * 2.5,
  };
}

function spawnCrates(x, z, count, level = 1, tier = 0) {
  for (let i = 0; i < count; i++) {
    crates.push({
      id: crypto.randomUUID(),
      kind: "crate",
      born: Date.now(),
      x: x + (Math.random() - 0.5) * 6,
      z: z + (Math.random() - 0.5) * 6,
      heal: 8 + tier * 2 + Math.random() * 8,
      xp: 8 + level * 2 + tier * 4 + Math.random() * 7.5,
      gold: 7 + level * 2 + tier * 5 + Math.floor(Math.random() * 11),
    });
  }
}

function spawnTreasure(now = Date.now()) {
  if (crates.filter((crate) => crate.kind === "treasure").length >= maxTreasures) return null;
  const point = randomPoint(worldBounds * 0.94, 55);
  const level = 4 + Math.floor(Math.random() * 8);
  const tier = 2 + Math.floor(Math.random() * 4);
  const crate = {
    id: crypto.randomUUID(),
    kind: "treasure",
    born: now,
    x: point.x,
    z: point.z,
    heal: 18 + tier * 3 + Math.random() * 12,
    xp: Math.round((8 + level * 2 + tier * 4 + Math.random() * 7.5) * 20),
    gold: Math.round((7 + level * 2 + tier * 5 + Math.random() * 11) * 10),
  };
  crates.push(crate);
  return crate;
}

function nearestPickup(bot, maxDistance = 220) {
  let best = null;
  let bestScore = Infinity;
  const healthNeed = bot.maxHp ? clamp((bot.maxHp - bot.hp) / bot.maxHp, 0, 1) : 0;
  for (const crate of crates) {
    if (isInsideIsland(crate, 8)) continue;
    const distance = Math.hypot(crate.x - bot.x, crate.z - bot.z);
    const valuable = crate.kind === "treasure" || crate.kind === "kraken";
    const searchDistance = valuable ? maxDistance * 1.35 : maxDistance;
    if (distance > searchDistance) continue;
    const priority = crate.kind === "kraken" ? 0.22 : crate.kind === "treasure" ? 0.3 : 1 - healthNeed * 0.38;
    const score = distance * priority - healthNeed * 36;
    if (score < bestScore) {
      best = crate;
      bestScore = score;
    }
  }
  return best;
}

function updateCrateLifecycle(now) {
  const removed = [];
  for (let i = crates.length - 1; i >= 0; i--) {
    const crate = crates[i];
    if (!crate.born) crate.born = now;
    const lifetime = crate.kind === "kraken" ? crateLifetimeMs * 4 : crateLifetimeMs;
    if (now - crate.born <= lifetime + crateSinkMs) continue;
    removed.push(crate.id);
    crates.splice(i, 1);
  }
  if (now >= nextTreasureSpawnAt) {
    nextTreasureSpawnAt = now + 28000 + Math.random() * 42000;
    if (Math.random() < 0.55) spawnTreasure(now);
  }
  removed.forEach((id) => broadcast({ type: "crateRemove", id }));
}

function botCollectCrates() {
  const removed = [];
  for (const bot of bots) {
    if (bot.hp <= 0) continue;
    const pickupRadius = shipRadius(bot.shipType) + 1.15;
    for (let i = crates.length - 1; i >= 0; i--) {
      const crate = crates[i];
      if (Math.hypot(crate.x - bot.x, crate.z - bot.z) > pickupRadius) continue;
      bot.hp = clamp(bot.hp + (Number(crate.heal) || 0), 0, bot.maxHp);
      if (crate.kind === "treasure") {
        bot.level = Math.min(40, (bot.level || 1) + 2);
        bot.fireCooldown = Math.min(bot.fireCooldown || 1.5, 1.1);
      }
      removed.push(crate.id);
      crates.splice(i, 1);
    }
  }
  removed.forEach((id) => broadcast({ type: "crateRemove", id }));
  return removed.length;
}

function crateDropCount(bot) {
  const base = Math.floor(((bot.level || 1) + 1) / 4) + Math.max(0, bot.tier || 0);
  return Math.max(1, Math.min(15, Math.ceil(base * crateDropMultiplier)));
}

function nearestBotOpponent(bot, maxDistance = 54) {
  let best = null;
  let bestDistance = maxDistance;
  for (const other of bots) {
    if (other === bot || other.hp <= 0) continue;
    const distance = Math.hypot(other.x - bot.x, other.z - bot.z);
    if (distance < bestDistance) {
      best = other;
      bestDistance = distance;
    }
  }
  return best;
}

function startBotFeud(bot, enemy, duration = 9000) {
  if (!bot || !enemy) return;
  const now = Date.now();
  bot.targetBot = enemy.id;
  bot.botFightUntil = now + duration;
  if (Math.random() < 0.7) {
    enemy.targetBot = bot.id;
    enemy.botFightUntil = now + duration * 0.85;
  }
}

function normalizedFire(fire) {
  if (!fire || typeof fire !== "object") return null;
  return {
    dps: clamp(Number(fire.dps) || 0, 0, 10),
    remaining: clamp(Number(fire.duration ?? fire.remaining) || 0, 0, 3),
  };
}

function igniteBot(bot, fire, rewardSocket = null) {
  const effect = normalizedFire(fire);
  if (!effect || effect.dps <= 0 || effect.remaining <= 0) return;
  bot.fire = {
    dps: effect.dps,
    remaining: Math.max(bot.fire?.remaining || 0, effect.remaining),
  };
  bot.fireSourceId = rewardSocket?.id || bot.fireSourceId || null;
}

function updateBotFire(bot, dt) {
  if (!bot.fire) return false;
  const movementWear = 1 + clamp(Math.hypot(bot.vx || 0, bot.vz || 0) / 32, 0, 0.9);
  bot.fire.remaining -= dt * movementWear;
  bot.hp -= (Number(bot.fire.dps) || 2) * dt;
  if (bot.fire.remaining <= 0) {
    bot.fire = null;
    bot.fireSourceId = null;
  }
  if (bot.hp > 0) return false;
  const rewardSocket = bot.fireSourceId ? clients.get(bot.fireSourceId) : null;
  bot.fire = null;
  bot.fireSourceId = null;
  return damageBot(bot, 0, rewardSocket);
}

function damageBot(bot, amount, rewardSocket = null, fire = null) {
  bot.hp -= clamp(Number(amount) || 0, 0, 240);
  if (bot.hp > 0) {
    igniteBot(bot, fire, rewardSocket);
    return false;
  }
  const level = bot.level || 1;
  const tier = bot.tier || 0;
  spawnCrates(bot.x, bot.z, crateDropCount(bot), level, tier);
  if (rewardSocket) {
    send(rewardSocket, {
      type: "botReward",
      level,
      gold: 50 + level * 14 + tier * 40,
      xp: 48 + level * 22 + tier * 28,
    });
  }
  resetBot(bot);
  return true;
}

function sinkBotByKraken(bot) {
  if (!bot || bot.hp <= 0) return false;
  const level = bot.level || 1;
  const tier = bot.tier || 0;
  spawnCrates(bot.x, bot.z, crateDropCount(bot), level, tier);
  resetBot(bot);
  return true;
}

function spawnKrakenTentacle(now = Date.now()) {
  crates.push({
    id: crypto.randomUUID(),
    kind: "kraken",
    born: now,
    x: kraken.x + (Math.random() - 0.5) * 12,
    z: kraken.z + (Math.random() - 0.5) * 12,
    heal: 80,
    xp: 2400 + Math.random() * 650,
    gold: 1450 + Math.floor(Math.random() * 520),
  });
}

function damageKraken(amount, rewardSocket = null) {
  if (!kraken?.alive) return false;
  if (rewardSocket?.player && dist(rewardSocket.player, kraken) > krakenAttackRadius + 56) return false;
  kraken.hp -= clamp(Number(amount) || 0, 0, 260);
  if (kraken.hp > 0) return false;
  kraken.hp = 0;
  kraken.alive = false;
  kraken.defeatedAt = Date.now();
  spawnKrakenTentacle(kraken.defeatedAt);
  broadcast({ type: "krakenDefeated", by: rewardSocket?.player?.name || "Captain" });
  return true;
}

function krakenSnapshot() {
  if (!kraken) return null;
  return {
    id: kraken.id,
    x: kraken.x,
    z: kraken.z,
    rotation: kraken.rotation,
    hp: Math.max(0, Math.round(kraken.hp)),
    maxHp: kraken.maxHp,
    alive: kraken.alive,
    defeatedAt: kraken.defeatedAt,
    radius: krakenRadius,
  };
}

function updateKraken(now, dt) {
  if (!kraken || !kraken.alive) return;
  const toTarget = { x: kraken.targetX - kraken.x, z: kraken.targetZ - kraken.z };
  const targetDistance = Math.hypot(toTarget.x, toTarget.z);
  if (targetDistance < 6 || isInsideIsland({ x: kraken.targetX, z: kraken.targetZ }, krakenRadius + 18)) {
    const target = randomKrakenPoint();
    kraken.targetX = target.x;
    kraken.targetZ = target.z;
  } else {
    const desiredRotation = Math.atan2(toTarget.x, toTarget.z);
    kraken.rotation += clamp(angleDelta(desiredRotation, kraken.rotation), -0.28 * dt, 0.28 * dt);
    const forward = { x: Math.sin(kraken.rotation), z: Math.cos(kraken.rotation) };
    kraken.vx += (forward.x * krakenSpeed - kraken.vx) * clamp(dt * 0.45, 0, 0.08);
    kraken.vz += (forward.z * krakenSpeed - kraken.vz) * clamp(dt * 0.45, 0, 0.08);
    kraken.vx *= 0.992;
    kraken.vz *= 0.992;
    const next = { x: kraken.x + kraken.vx * dt, z: kraken.z + kraken.vz * dt };
    if (!isInsideIsland(next, krakenRadius + 16) && Math.abs(next.x) < worldBounds * 0.86 && Math.abs(next.z) < worldBounds * 0.86) {
      kraken.x = next.x;
      kraken.z = next.z;
    } else {
      const target = randomKrakenPoint();
      kraken.targetX = target.x;
      kraken.targetZ = target.z;
      kraken.vx *= 0.2;
      kraken.vz *= 0.2;
    }
  }

  if (now < kraken.attackAt) return;
  let attackTarget = null;
  let targetDistanceBest = krakenAttackRadius;
  for (const socket of clients.values()) {
    if (!socket.player || socket.player.mode === "land") continue;
    const distance = dist(socket.player, kraken);
    if (distance < targetDistanceBest) {
      attackTarget = {
        kind: "player",
        id: socket.id,
        x: Number(socket.player.x) || kraken.x,
        z: Number(socket.player.z) || kraken.z,
      };
      targetDistanceBest = distance;
    }
  }
  for (const bot of bots) {
    if (bot.hp <= 0) continue;
    const distance = Math.hypot(bot.x - kraken.x, bot.z - kraken.z);
    if (distance < targetDistanceBest) {
      attackTarget = {
        kind: "bot",
        id: bot.id,
        x: bot.x,
        z: bot.z,
      };
      targetDistanceBest = distance;
    }
  }
  if (!attackTarget) return;
  kraken.attackAt = now + 7200;
  const kinds = ["smash", "grip", "slam"];
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  const attackX = attackTarget.x;
  const attackZ = attackTarget.z;
  broadcast({
    type: "krakenAttack",
    attack: {
      id: crypto.randomUUID(),
      target: attackTarget.id,
      targetKind: attackTarget.kind,
      kind,
      x: attackX,
      z: attackZ,
      sourceX: kraken.x,
      sourceZ: kraken.z,
      damage: krakenAttackDamage,
    },
  });
  if (attackTarget.kind === "bot") {
    const targetId = attackTarget.id;
    setTimeout(() => {
      const bot = bots.find((item) => item.id === targetId);
      if (!bot || !kraken?.alive) return;
      if (Math.hypot(bot.x - attackX, bot.z - attackZ) > shipRadius(bot.shipType) + 11) return;
      if (sinkBotByKraken(bot)) broadcast(worldSnapshot());
    }, krakenSlamDelayMs);
  }
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
    fire: bot.fire ? {
      dps: bot.fire.dps,
      remaining: Math.max(0, bot.fire.remaining),
    } : null,
  };
}

function worldSnapshot() {
  return {
    type: "world",
    bots: bots.map(botSnapshot),
    kraken: krakenSnapshot(),
    crates: crates.map((crate) => ({
      id: crate.id,
      kind: crate.kind || "crate",
      born: crate.born || Date.now(),
      x: crate.x,
      z: crate.z,
      heal: Math.round(crate.heal),
      xp: Math.round(crate.xp),
      gold: crate.gold,
    })),
  };
}

function resetBot(bot) {
  delete bot.fire;
  delete bot.fireSourceId;
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
    if (updateBotFire(bot, dt)) continue;
    if (bot.targetPlayer && bot.angerUntil && bot.angerUntil < now) bot.targetPlayer = null;
    let targetSocket = bot.targetPlayer ? playerSocket(bot.targetPlayer) : null;
    if (targetSocket?.player?.mode === "land") targetSocket = null;
    if (!targetSocket && bot.aggressive) {
      targetSocket = nearestShipPlayer(bot, 34);
      bot.targetPlayer = targetSocket?.id || null;
      bot.angerUntil = targetSocket ? now + 9000 : 0;
    }
    let targetBot = bot.targetBot && bot.botFightUntil > now
      ? bots.find((item) => item.id === bot.targetBot && item.hp > 0)
      : null;
    if (!targetBot && !targetSocket && Math.random() < dt * 0.018) {
      targetBot = nearestBotOpponent(bot, 54);
      if (targetBot) startBotFeud(bot, targetBot, 8000 + Math.random() * 8000);
    }
    let pickupTarget = null;
    const healthRatio = bot.maxHp ? bot.hp / bot.maxHp : 1;
    const noticedPickup = nearestPickup(bot, healthRatio < 0.65 ? 250 : 220);
    const pickupDistance = noticedPickup ? Math.hypot(noticedPickup.x - bot.x, noticedPickup.z - bot.z) : Infinity;
    const valuablePickup = noticedPickup && (noticedPickup.kind === "treasure" || noticedPickup.kind === "kraken");
    const shouldSeekPickup = noticedPickup && (
      (!targetSocket && !targetBot)
      || healthRatio < 0.58
      || (valuablePickup && pickupDistance < 155)
    );
    if (shouldSeekPickup) {
      pickupTarget = noticedPickup;
      if (healthRatio < 0.58 || valuablePickup) {
        targetSocket = null;
        bot.targetPlayer = null;
        bot.angerUntil = 0;
        targetBot = null;
        bot.targetBot = null;
        bot.botFightUntil = 0;
      }
    }
    let fleeingKraken = false;
    if (kraken?.alive) {
      const dx = bot.x - kraken.x;
      const dz = bot.z - kraken.z;
      const distanceFromKraken = Math.hypot(dx, dz);
      fleeingKraken = distanceFromKraken < krakenBotFleeRadius;
      if (fleeingKraken) {
        const nx = distanceFromKraken > 0.001 ? dx / distanceFromKraken : Math.sin(bot.rotation);
        const nz = distanceFromKraken > 0.001 ? dz / distanceFromKraken : Math.cos(bot.rotation);
        const fleePoint = {
          x: clamp(bot.x + nx * 132, -worldBounds * 0.94, worldBounds * 0.94),
          z: clamp(bot.z + nz * 132, -worldBounds * 0.94, worldBounds * 0.94),
        };
        if (isInsideIsland(fleePoint, 18)) {
          const point = randomTravelPoint(worldBounds * 0.92);
          bot.targetX = point.x;
          bot.targetZ = point.z;
        } else {
          bot.targetX = fleePoint.x;
          bot.targetZ = fleePoint.z;
        }
        bot.turn = Math.max(bot.turn, 2.8);
        bot.targetPlayer = null;
        bot.angerUntil = 0;
        bot.targetBot = null;
        bot.botFightUntil = 0;
        targetSocket = null;
        targetBot = null;
        pickupTarget = null;
      }
    }
    bot.fireCooldown = Math.max(0, bot.fireCooldown - dt);
    bot.turn -= dt;

    if (fleeingKraken) {
      // Flee target was set above.
    } else if (targetSocket) {
      bot.targetX = Number(targetSocket.player.x) || bot.x;
      bot.targetZ = Number(targetSocket.player.z) || bot.z;
      if (Math.hypot(bot.targetX - bot.x, bot.targetZ - bot.z) > 58) {
        targetSocket = null;
        bot.targetPlayer = null;
        bot.angerUntil = 0;
      }
    } else if (targetBot) {
      bot.targetX = targetBot.x;
      bot.targetZ = targetBot.z;
      if (Math.hypot(bot.targetX - bot.x, bot.targetZ - bot.z) > 68) {
        targetBot = null;
        bot.targetBot = null;
        bot.botFightUntil = 0;
      }
    } else if (pickupTarget || (pickupTarget = nearestPickup(bot, healthRatio < 0.65 ? 250 : 220))) {
      bot.targetX = pickupTarget.x;
      bot.targetZ = pickupTarget.z;
      bot.turn = Math.max(bot.turn, 1.2);
    } else if (bot.turn <= 0 || Math.hypot(bot.targetX - bot.x, bot.targetZ - bot.z) < 8) {
      const point = randomTravelPoint(worldBounds * 0.92);
      bot.targetX = point.x;
      bot.targetZ = point.z;
      bot.turn = 4 + Math.random() * 7;
      bot.targetPlayer = null;
      bot.targetBot = null;
    }

    const toTarget = { x: bot.targetX - bot.x, z: bot.targetZ - bot.z };
    const distance = Math.hypot(toTarget.x, toTarget.z);
    if (!fleeingKraken && !targetSocket && !targetBot && !pickupTarget && distance < 9) {
      bot.vx *= 0.62;
      bot.vz *= 0.62;
      const point = randomTravelPoint(worldBounds * 0.92);
      bot.targetX = point.x;
      bot.targetZ = point.z;
      bot.turn = 3 + Math.random() * 5;
    }
    if (distance > 0.01) {
      const avoidance = { x: 0, z: 0 };
      for (const island of islandCenters) {
        const dx = bot.x - island.x;
        const dz = bot.z - island.z;
        const d = Math.hypot(dx, dz);
        const danger = island.radius + shipRadius(bot.shipType) * 1.9 + 12;
        if (d > 0.001 && d < danger) {
          const force = ((danger - d) / danger) * 38;
          avoidance.x += (dx / d) * force;
          avoidance.z += (dz / d) * force;
        }
      }
      if (!targetSocket && !targetBot) {
        const starter = islandCenters[0];
        const dx = bot.x - starter.x;
        const dz = bot.z - starter.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.001 && d < centerBotClearRadius) {
          const force = ((centerBotClearRadius - d) / centerBotClearRadius) * 64;
          avoidance.x += (dx / d) * force;
          avoidance.z += (dz / d) * force;
          if (!pickupTarget && distance < centerBotClearRadius * 0.7) {
            const point = randomTravelPoint(worldBounds * 0.92);
            bot.targetX = point.x;
            bot.targetZ = point.z;
            bot.turn = Math.max(bot.turn, 2.5);
          }
        }
      }
      if (kraken?.alive) {
        const dx = bot.x - kraken.x;
        const dz = bot.z - kraken.z;
        const d = Math.hypot(dx, dz);
        const danger = krakenBotFleeRadius + 28;
        if (d > 0.001 && d < danger) {
          const force = ((danger - d) / danger) * (fleeingKraken ? 120 : 54);
          avoidance.x += (dx / d) * force;
          avoidance.z += (dz / d) * force;
        }
      }
      const edgeMargin = 44;
      const edgeX = worldBounds - Math.abs(bot.x);
      const edgeZ = worldBounds - Math.abs(bot.z);
      if (edgeX < edgeMargin) avoidance.x += -Math.sign(bot.x || 1) * ((edgeMargin - edgeX) / edgeMargin) * 48;
      if (edgeZ < edgeMargin) avoidance.z += -Math.sign(bot.z || 1) * ((edgeMargin - edgeZ) / edgeMargin) * 48;
      for (const other of bots) {
        if (other === bot) continue;
        const dx = bot.x - other.x;
        const dz = bot.z - other.z;
        const d = Math.hypot(dx, dz);
        const danger = (shipRadius(bot.shipType) + shipRadius(other.shipType)) * 0.8 + 9;
        if (d > 0.001 && d < danger) {
          const force = ((danger - d) / danger) * (targetBot === other ? 5 : 13);
          avoidance.x += (dx / d) * force;
          avoidance.z += (dz / d) * force;
        }
      }
      if (targetSocket?.player) {
        const dx = bot.x - Number(targetSocket.player.x);
        const dz = bot.z - Number(targetSocket.player.z);
        const d = Math.hypot(dx, dz);
        const danger = (shipRadius(bot.shipType) + shipRadius(targetSocket.player.shipType || "skiff")) * 0.8 + 7;
        if (d > 0.001 && d < danger) {
          const force = ((danger - d) / danger) * 10;
          avoidance.x += (dx / d) * force;
          avoidance.z += (dz / d) * force;
        }
      }
      const desired = Math.atan2(toTarget.x + avoidance.x, toTarget.z + avoidance.z);
      const delta = angleDelta(desired, bot.rotation);
      const inCombat = Boolean(targetSocket || targetBot);
      const chasingPickup = Boolean(pickupTarget);
      const turnRate = fleeingKraken ? 1.25 + bot.speed / 40 : inCombat ? 0.95 + bot.speed / 46 : chasingPickup ? 0.86 + bot.speed / 52 : 0.6 + bot.speed / 64;
      bot.rotation += clamp(delta, -turnRate * dt, turnRate * dt);
      const forward = { x: Math.sin(bot.rotation), z: Math.cos(bot.rotation) };
      const facing = clamp(Math.cos(delta), 0.18, 1);
      const pickupCruise = pickupTarget?.kind === "treasure" || pickupTarget?.kind === "kraken" ? 0.6 : 0.48;
      const cruise = fleeingKraken ? 0.72 : inCombat ? 0.48 : chasingPickup ? pickupCruise : 0.28;
      const arrive = fleeingKraken ? 1 : chasingPickup ? clamp(distance / 14, 0.24, 1) : clamp(distance / (inCombat ? 20 : 34), 0.18, 1);
      const desiredSpeed = bot.speed * cruise * facing * arrive;
      const steer = clamp(dt * (fleeingKraken ? 2.0 : inCombat ? 1.5 : chasingPickup ? 1.35 : 1.0), 0, 0.24);
      bot.vx += (forward.x * desiredSpeed - bot.vx) * steer;
      bot.vz += (forward.z * desiredSpeed - bot.vz) * steer;
      bot.vx *= 0.976;
      bot.vz *= 0.976;
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
        bot.targetBot = null;
        bot.botFightUntil = 0;
        const point = randomTravelPoint(worldBounds * 0.92);
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
      bot.targetBot = null;
      bot.botFightUntil = 0;
      const point = randomTravelPoint(worldBounds * 0.92);
      bot.targetX = point.x;
      bot.targetZ = point.z;
    }

    const shotTarget = fleeingKraken ? null : targetSocket?.player
      ? { x: Number(targetSocket.player.x) || bot.x, z: Number(targetSocket.player.z) || bot.z, vx: Number(targetSocket.player.vx) || 0, vz: Number(targetSocket.player.vz) || 0, kind: "player" }
      : targetBot
        ? { x: targetBot.x, z: targetBot.z, vx: targetBot.vx, vz: targetBot.vz, kind: "bot", bot: targetBot }
        : null;
    if (shotTarget && bot.fireCooldown <= 0) {
      const dx = shotTarget.x - bot.x;
      const dz = shotTarget.z - bot.z;
      const shotDistance = Math.hypot(dx, dz);
      const forwardX = Math.sin(bot.rotation);
      const forwardZ = Math.cos(bot.rotation);
      const facing = shotDistance > 0.01 ? (forwardX * dx + forwardZ * dz) / shotDistance : 0;
      const shotRange = botCannonRangeFor(bot);
      if (shotDistance <= shotRange && shotDistance > 0.01 && facing > 0.45) {
        const { targetX, targetZ } = aimBotShot(bot, shotTarget, shotRange);
        const aimDx = targetX - bot.x;
        const aimDz = targetZ - bot.z;
        const aimDistance = Math.hypot(aimDx, aimDz);
        if (aimDistance <= 0.01) continue;
        const dirX = aimDx / aimDistance;
        const dirZ = aimDz / aimDistance;
        const damage = scaleDamageByRange(botCannonDamage(bot), shotDistance, shotRange);
        broadcast({
          type: "shot",
          shot: {
            id: crypto.randomUUID(),
            owner: bot.id,
            sentAt: now,
            x: bot.x + dirX * 3.6,
            z: bot.z + dirZ * 3.6,
            dirX,
            dirZ,
            targetX,
            targetZ,
            targetKind: shotTarget.kind,
            damage,
            range: shotRange,
          },
        });
        if (shotTarget.bot) {
          damageBot(shotTarget.bot, damage);
          shotTarget.bot.targetBot = bot.id;
          shotTarget.bot.botFightUntil = now + 9000;
        }
        bot.fireCooldown = botCannonReload(bot);
      }
    }
  }
  resolveBotContacts();
  botCollectCrates();
  updateCrateLifecycle(now);
  updateKraken(now, dt);
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
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": types[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-store" : "no-cache",
    });
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
    const now = Date.now();
    const previous = socket.player;
    const next = { ...message.player, id: socket.id, updated: now };
    const nextX = Number(next.x);
    const nextZ = Number(next.z);
    const prevX = Number(previous?.x);
    const prevZ = Number(previous?.z);
    const elapsed = previous?.updated ? clamp((now - previous.updated) / 1000, 0.05, 1) : 0;
    if (elapsed && [nextX, nextZ, prevX, prevZ].every(Number.isFinite)) {
      next.vx = (nextX - prevX) / elapsed;
      next.vz = (nextZ - prevZ) / elapsed;
    } else {
      next.vx = Number(next.vx) || 0;
      next.vz = Number(next.vz) || 0;
    }
    socket.player = next;
    broadcast({ type: "state", player: socket.player }, socket);
    if (message.type === "hello") {
      for (const other of clients.values()) {
        if (other !== socket && other.player) send(socket, { type: "state", player: other.player });
      }
      send(socket, worldSnapshot());
    }
  }
  if (message.type === "shot") {
    broadcast({
      type: "shot",
      shot: {
        ...(message.shot || {}),
        id: message.shot?.id || crypto.randomUUID(),
        owner: socket.id,
        sentAt: Date.now(),
      },
    }, socket);
  }
  if (message.type === "hitBot") {
    const bot = bots.find((item) => item.id === message.id);
    if (!bot) return;
    const damage = clamp(Number(message.damage) || 0, 0, 240);
    bot.targetPlayer = socket.id;
    bot.angerUntil = Date.now() + 12000 + (bot.level || 1) * 500;
    bot.targetBot = null;
    bot.botFightUntil = 0;
    bot.fireCooldown = Math.min(bot.fireCooldown, 1.35);
    damageBot(bot, damage, socket, message.fire);
    broadcast(worldSnapshot());
  }
  if (message.type === "playerSunk") {
    const now = Date.now();
    if (!socket.player || socket.player.mode === "land") return;
    if (now - (socket.lastPlayerCrateDropAt || 0) < 6000) return;
    const x = Number(socket.player.x);
    const z = Number(socket.player.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    const level = clamp(Math.floor(Number(socket.player.level) || Number(message.level) || 1), 1, 40);
    const shipType = socket.player.shipType || message.shipType || "skiff";
    const tier = shipTierForDrop(shipType);
    spawnCrates(x, z, crateDropCount({ level, tier }), level, tier);
    socket.lastPlayerCrateDropAt = now;
    broadcast(worldSnapshot());
  }
  if (message.type === "hitKraken") {
    const damage = clamp(Number(message.damage) || 0, 0, 260);
    damageKraken(damage, socket);
    broadcast(worldSnapshot());
  }
  if (message.type === "collectCrate") {
    const index = crates.findIndex((crate) => crate.id === message.id);
    if (index < 0) return;
    const crate = crates[index];
    const pickupRange = crate.kind === "kraken" ? 20 : 18;
    if (socket.player && dist(crate, socket.player) > pickupRange) return;
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
