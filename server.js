const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const port = Number(process.env.PORT || 4174);
const clients = new Map();
const bots = [];
const crates = [];
const bombs = [];
const botBalloons = [];
const whales = [];
const storms = [];
const islandClaims = new Map();
const buildings = [];
const buildInventories = new Map();
const worldBounds = 880;
const visibleBounds = worldBounds * 1.12;
const islandSpacingScale = 2.45;
const islandSpacingAnchor = { x: -34, z: -24 };
const botCount = 14;
const cannonballSpeed = 29.3;
const botCannonRange = 34;
const centerBotClearRadius = 88;
const crateLifetimeMs = 120000;
const whaleBitLifetimeMs = 300000;
const crateSinkMs = 5000;
const maxTreasures = 3;
const whaleCount = 7;
const whaleMaxHp = 1000;
const whaleSpeed = 14;
const krakenMaxHp = 10000;
const krakenRadius = 25;
const krakenAttackRadius = 62;
const krakenSpeed = 1;
const krakenAttackDamage = 999999;
const krakenBotFleeRadius = krakenAttackRadius + 46;
const crateDropMultiplier = 1.2;
const balloonBombDamage = 500;
const balloonBombGravity = 18;
const balloonBombBlastRadius = 12;
const balloonBombKnockback = 22;
const airburstDamage = 60;
const airburstRadius = balloonBombBlastRadius * (2 / 3);
const balloonBombLifetimeMs = 9000;
const krakenSlamDelayMs = 2900;
const maxReloadUpgrades = 20;
const dayLengthSeconds = 600;
const nightLengthSeconds = 600;
const dayCycleSeconds = dayLengthSeconds + nightLengthSeconds;
const worldStartedAt = Date.now();
const waterfallBounds = visibleBounds + 720;
const leviathanLeapMs = 3150;
const leviathanTrackMs = 2750;
const leviathanDamageDelayMs = 480;
const leviathanLifetimeMs = 6600;
const leviathanCooldownMs = 10200;
let nextTreasureSpawnAt = Date.now() + 12000 + Math.random() * 18000;
let nextStormSpawnAt = Date.now() + 35000 + Math.random() * 85000;
let nextBombId = 1;
let nextBotBalloonId = 1;
let nextBuildingId = 1;
let kraken = null;
let leviathan = null;
const leviathanCooldowns = new Map();

function spreadIslandCenter(island) {
  return {
    ...island,
    x: islandSpacingAnchor.x + (island.x - islandSpacingAnchor.x) * islandSpacingScale,
    z: islandSpacingAnchor.z + (island.z - islandSpacingAnchor.z) * islandSpacingScale,
  };
}

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
  { x: -308, z: 14, radius: 7 },
  { x: 298, z: 88, radius: 8 },
  { x: 6, z: -326, radius: 6 },
  { x: -286, z: 268, radius: 9 },
  { x: 312, z: -72, radius: 7 },
  { name: "Unnamed Isle A", x: -72, z: -60, radius: 5.6, claimable: true },
  { name: "Unnamed Isle B", x: 52, z: -76, radius: 5.2, claimable: true },
  { name: "Unnamed Isle C", x: -10, z: 54, radius: 4.8, claimable: true },
  { name: "Unnamed Isle D", x: 82, z: 48, radius: 5.4, claimable: true },
  { name: "Unnamed Isle E", x: -116, z: 20, radius: 5.1, claimable: true },
  { name: "Unnamed Isle F", x: 134, z: -18, radius: 4.7, claimable: true },
  { name: "Unnamed Isle G", x: -246, z: 78, radius: 5.8, claimable: true },
  { name: "Unnamed Isle H", x: 242, z: 118, radius: 5.5, claimable: true },
  { name: "Unnamed Isle I", x: -156, z: -258, radius: 5.3, claimable: true },
  { name: "Unnamed Isle J", x: 154, z: 284, radius: 5.0, claimable: true },
  { name: "Unnamed Isle K", x: 318, z: -156, radius: 4.9, claimable: true },
  { name: "Unnamed Isle L", x: -324, z: -116, radius: 5.4, claimable: true },
].map(spreadIslandCenter).map((island) => ({ ...island, radius: island.radius * 4 }));

const whaleZonePortAzure = islandCenters[0] || { z: -24 };
const whaleZoneBaltimore = islandCenters[8] || { z: -214 };
const whaleNorthMinZ = Math.min(whaleZonePortAzure.z, whaleZoneBaltimore.z) - 42;
const whaleNorthMaxZ = Math.max(whaleZonePortAzure.z, whaleZoneBaltimore.z) + 10;
const whaleNorthCenterZ = (whaleNorthMinZ + whaleNorthMaxZ) * 0.5;

const shipStats = [
  { id: "yawl", hp: 565, speed: 18, tier: 1 },
  { id: "balinger", hp: 610, speed: 14, tier: 1 },
  { id: "felucca", hp: 650, speed: 22, tier: 1 },
  { id: "bilander", hp: 745, speed: 16, tier: 1 },
  { id: "cog", hp: 620, speed: 10, tier: 1 },
  { id: "longship", hp: 540, speed: 22, tier: 1 },
  { id: "dhow", hp: 620, speed: 19, tier: 1 },
  { id: "sloop", hp: 590, speed: 21, tier: 1 },
  { id: "knarr", hp: 700, speed: 12, tier: 1 },
  { id: "lugger", hp: 640, speed: 20, tier: 2 },
  { id: "dart", hp: 690, speed: 30, tier: 2 },
  { id: "junk", hp: 990, speed: 15, tier: 2 },
  { id: "schooner", hp: 900, speed: 26, tier: 2 },
  { id: "xebec", hp: 960, speed: 29, tier: 2 },
  { id: "brigantine", hp: 1080, speed: 22, tier: 3 },
  { id: "caravel", hp: 1170, speed: 16, tier: 3 },
  { id: "snow", hp: 1290, speed: 19, tier: 3 },
  { id: "chassemaree", hp: 1030, speed: 28, tier: 3 },
  { id: "polacre", hp: 1320, speed: 24, tier: 3 },
  { id: "brig", hp: 1400, speed: 23, tier: 3 },
  { id: "fluyt", hp: 1500, speed: 13, tier: 3 },
  { id: "barque", hp: 1410, speed: 21, tier: 3 },
  { id: "corvette", hp: 1530, speed: 25, tier: 4 },
  { id: "sixthrate", hp: 1600, speed: 24, tier: 4 },
  { id: "frigate", hp: 1740, speed: 24, tier: 4 },
  { id: "postship", hp: 1880, speed: 22, tier: 4 },
  { id: "galleon", hp: 2700, speed: 12, tier: 5 },
  { id: "carrack", hp: 2340, speed: 10, tier: 4 },
  { id: "eastindiaman", hp: 2460, speed: 12, tier: 5 },
  { id: "razee", hp: 2550, speed: 18, tier: 5 },
  { id: "whaler", hp: 1750, speed: 12, tier: 4 },
  { id: "ballooner", hp: 1350, speed: 16, tier: 4 },
  { id: "grandfrigate", hp: 3150, speed: 18, tier: 6 },
  { id: "windrunner", hp: 3000, speed: 28, tier: 6 },
  { id: "manowar", hp: 3360, speed: 11, tier: 6 },
  { id: "firstrate", hp: 3960, speed: 9, tier: 6 },
];

const buildItemTypes = new Set(["flag", "floor", "wall", "cornerWall", "door", "roof", "table"]);
const buildItemPrices = { flag: 200, floor: 20, wall: 20, cornerWall: 20, door: 20, roof: 20, table: 20 };

function emptyBuildInventory() {
  return Object.fromEntries([...buildItemTypes].map((type) => [type, 0]));
}

function inventoryFor(socket) {
  if (!buildInventories.has(socket.id)) buildInventories.set(socket.id, emptyBuildInventory());
  return buildInventories.get(socket.id);
}

function sendBuildInventory(socket, extra = {}) {
  send(socket, {
    type: "buildInventory",
    inventory: inventoryFor(socket),
    gold: Number.isFinite(Number(socket.player?.gold)) ? Number(socket.player.gold) : undefined,
    ...extra,
  });
}

function cleanClaimName(value) {
  const cleaned = String(value || "").trim().replace(/\s+/g, " ").replace(/[<>]/g, "").slice(0, 24);
  return cleaned || "Unnamed Island";
}

function claimableIslandByName(name) {
  return islandCenters.find((island) => island.claimable && island.name === name) || null;
}

function pointInsideIsland(island, x, z, margin = 3) {
  if (!island || !Number.isFinite(x) || !Number.isFinite(z)) return false;
  return Math.hypot(x - island.x, z - island.z) <= island.radius - margin;
}

function buildReject(socket, reason) {
  send(socket, { type: "buildError", reason });
}

const shipRegen = {
  skiff: 1, shallop: 1, pinnace: 1, hoy: 2, yawl: 1, balinger: 2, felucca: 1, bilander: 2,
  cog: 2, longship: 1, dogger: 2, dhow: 2, sloop: 1, knarr: 2, lugger: 2, tartane: 2,
  pink: 2, cat: 1, dart: 1, junk: 3, ketch: 2, schooner: 2, galley: 2, xebec: 2,
  brigantine: 2, caravel: 3, snow: 3, packet: 2, chassemaree: 2, barquentine: 2, clipper: 2,
  fluyt: 3, polacre: 2, brig: 3, storm: 2, bombketch: 3, barque: 3, corvette: 3,
  sixthrate: 3, frigate: 3, postship: 3, merchantman: 4, carrack: 4,
  galleon: 5, eastindiaman: 4, treasure: 5, whaler: 2, ballooner: 2, razee: 4,
  fourthrate: 5, grandfrigate: 6, manowar: 6, windrunner: 5, firstrate: 8,
};

const playerShipTiers = {
  skiff: 0,
  shallop: 0,
  pinnace: 0,
  hoy: 0,
  yawl: 1,
  balinger: 1,
  felucca: 1,
  bilander: 1,
  dogger: 1,
  tartane: 1,
  pink: 2,
  cat: 2,
  ketch: 2,
  galley: 2,
  packet: 3,
  chassemaree: 3,
  barquentine: 3,
  clipper: 3,
  polacre: 3,
  brig: 3,
  bombketch: 3,
  storm: 3,
  sixthrate: 4,
  postship: 4,
  merchantman: 4,
  treasure: 5,
  fourthrate: 5,
  whaler: 4,
  ballooner: 4,
  grandfrigate: 6,
  windrunner: 6,
};

const shipPhysics = {
  skiff: { radius: 2.1, weight: 50 },
  shallop: { radius: 2.25, weight: 55 },
  pinnace: { radius: 2.35, weight: 59 },
  hoy: { radius: 2.9, weight: 76 },
  yawl: { radius: 2.45, weight: 62 },
  balinger: { radius: 3, weight: 88 },
  felucca: { radius: 3, weight: 72 },
  bilander: { radius: 3.2, weight: 98 },
  cog: { radius: 2.85, weight: 89 },
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
  brigantine: { radius: 3.8, weight: 117 },
  caravel: { radius: 3.5, weight: 114 },
  snow: { radius: 3.7, weight: 126 },
  packet: { radius: 3.5, weight: 110 },
  chassemaree: { radius: 3.5, weight: 108 },
  barquentine: { radius: 3.7, weight: 128 },
  clipper: { radius: 3.6, weight: 118 },
  fluyt: { radius: 4, weight: 154 },
  polacre: { radius: 3.7, weight: 126 },
  brig: { radius: 3.8, weight: 132 },
  storm: { radius: 3.4, weight: 102 },
  bombketch: { radius: 3.9, weight: 138 },
  barque: { radius: 3.9, weight: 144 },
  corvette: { radius: 3.9, weight: 138 },
  sixthrate: { radius: 4, weight: 145 },
  frigate: { radius: 4.1, weight: 153 },
  postship: { radius: 4.2, weight: 162 },
  merchantman: { radius: 4.4, weight: 191 },
  carrack: { radius: 4.4, weight: 185 },
  galleon: { radius: 4.6, weight: 206 },
  eastindiaman: { radius: 4.7, weight: 219 },
  treasure: { radius: 4.9, weight: 238 },
  razee: { radius: 4.6, weight: 195 },
  whaler: { radius: 4.6, weight: 205 },
  ballooner: { radius: 4.1, weight: 160 },
  grandfrigate: { radius: 5, weight: 255 },
  windrunner: { radius: 4.8, weight: 210 },
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

function pointInWhaleNorthZone(point, pad = 0) {
  return point.z >= whaleNorthMinZ - pad && point.z <= whaleNorthMaxZ + pad;
}

function randomNorthernPoint(radius = worldBounds * 0.9, minCenterDistance = 0) {
  const minZ = Math.max(-radius, whaleNorthMinZ);
  const maxZ = Math.min(radius, whaleNorthMaxZ);
  for (let i = 0; i < 90; i++) {
    const point = {
      x: (Math.random() - 0.5) * radius * 2,
      z: minZ + Math.random() * Math.max(8, maxZ - minZ),
    };
    if (Math.hypot(point.x, point.z) >= minCenterDistance && !isInsideIsland(point, 18)) return point;
  }
  return { x: radius * 0.15, z: whaleNorthCenterZ };
}

function whaleReturnDirection(whale) {
  const target = { x: whale.x * 0.45, z: whaleNorthCenterZ };
  const dx = target.x - whale.x;
  const dz = target.z - whale.z;
  if (Math.hypot(dx, dz) < 0.01) return whaleNorthCenterZ > whale.z ? 0 : Math.PI;
  return Math.atan2(dx, dz);
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

function leviathanTargetZone(player) {
  const x = Math.abs(Number(player?.x) || 0);
  const z = Math.abs(Number(player?.z) || 0);
  return (x > visibleBounds || z > visibleBounds) && x <= waterfallBounds && z <= waterfallBounds;
}

function setLeviathanVectors(attack) {
  attack.smashX = attack.impactX + attack.sideX * 8.6;
  attack.smashY = 0.55;
  attack.smashZ = attack.impactZ + attack.sideZ * 8.6;
  attack.diveX = attack.impactX - attack.sideX * 30;
  attack.diveY = -24;
  attack.diveZ = attack.impactZ - attack.sideZ * 30;
}

function leviathanSnapshot(attack = leviathan) {
  if (!attack) return null;
  return {
    id: attack.id,
    targetId: attack.targetId,
    born: attack.born,
    crushed: Boolean(attack.crushed),
    hit: Boolean(attack.hit),
    missed: Boolean(attack.missed),
    damaged: Boolean(attack.damaged),
    slamAt: attack.slamAt || 0,
    sideX: attack.sideX,
    sideZ: attack.sideZ,
    startX: attack.startX,
    startY: attack.startY,
    startZ: attack.startZ,
    impactX: attack.impactX,
    impactY: 0,
    impactZ: attack.impactZ,
    smashX: attack.smashX,
    smashY: attack.smashY,
    smashZ: attack.smashZ,
    diveX: attack.diveX,
    diveY: attack.diveY,
    diveZ: attack.diveZ,
  };
}

function leviathanAttackHitsPlayer(player, attack) {
  if (!player || player.mode === "land") return false;
  const ox = (Number(player.x) || 0) - attack.impactX;
  const oz = (Number(player.z) || 0) - attack.impactZ;
  const acrossX = attack.sideZ;
  const acrossZ = -attack.sideX;
  const along = Math.abs(ox * attack.sideX + oz * attack.sideZ);
  const across = Math.abs(ox * acrossX + oz * acrossZ);
  const radius = shipRadius(player.shipType || "skiff");
  return along <= 11 + radius * 0.35 && across <= 8 + radius * 0.45;
}

function startLeviathanAttack(socket, now) {
  if (!socket?.player || leviathan) return;
  const cooldownUntil = leviathanCooldowns.get(socket.id) || 0;
  if (now < cooldownUntil || !leviathanTargetZone(socket.player) || socket.player.mode === "land") return;
  const rotation = Number(socket.player.rotation) || 0;
  let forwardX = Math.sin(rotation);
  let forwardZ = Math.cos(rotation);
  if (Math.hypot(forwardX, forwardZ) < 0.01) {
    forwardX = Number(socket.player.vx) || 0;
    forwardZ = Number(socket.player.vz) || 1;
  }
  const forwardLength = Math.hypot(forwardX, forwardZ) || 1;
  forwardX /= forwardLength;
  forwardZ /= forwardLength;
  let outwardX = Number(socket.player.x) || forwardX;
  let outwardZ = Number(socket.player.z) || forwardZ;
  const outwardLength = Math.hypot(outwardX, outwardZ) || 1;
  outwardX /= outwardLength;
  outwardZ /= outwardLength;
  let sideX = forwardZ;
  let sideZ = -forwardX;
  if (sideX * outwardX + sideZ * outwardZ < 0) {
    sideX *= -1;
    sideZ *= -1;
  }
  const impactX = Number(socket.player.x) || 0;
  const impactZ = Number(socket.player.z) || 0;
  leviathan = {
    id: crypto.randomUUID(),
    targetId: socket.id,
    born: now,
    impactX,
    impactZ,
    sideX,
    sideZ,
    startX: impactX + sideX * 64,
    startY: -24,
    startZ: impactZ + sideZ * 64,
    crushed: false,
    hit: false,
    missed: false,
    damaged: false,
    strikeSent: false,
  };
  setLeviathanVectors(leviathan);
  leviathanCooldowns.set(socket.id, now + leviathanCooldownMs);
  broadcast(worldSnapshot());
}

function updateLeviathanServer(now, dt) {
  if (leviathan) {
    const age = now - leviathan.born;
    const target = clients.get(leviathan.targetId);
    if (!leviathan.crushed && target?.player && age < leviathanTrackMs) {
      const blend = clamp(dt * 5.6, 0, 0.7);
      leviathan.impactX += ((Number(target.player.x) || leviathan.impactX) - leviathan.impactX) * blend;
      leviathan.impactZ += ((Number(target.player.z) || leviathan.impactZ) - leviathan.impactZ) * blend;
      setLeviathanVectors(leviathan);
    }
    if (!leviathan.strikeSent && age >= leviathanLeapMs) {
      leviathan.strikeSent = true;
      leviathan.crushed = true;
      leviathan.slamAt = now;
      leviathan.hit = Boolean(target?.player && leviathanAttackHitsPlayer(target.player, leviathan));
      leviathan.missed = !leviathan.hit;
      broadcast({ type: "leviathanStrike", attack: leviathanSnapshot(), hit: leviathan.hit });
    }
    if (leviathan.hit && !leviathan.damaged && leviathan.slamAt && now - leviathan.slamAt >= leviathanDamageDelayMs) {
      leviathan.damaged = true;
      const targetNow = clients.get(leviathan.targetId);
      if (targetNow) send(targetNow, { type: "leviathanDamage", id: leviathan.id, targetId: leviathan.targetId });
    }
    if (age > leviathanLifetimeMs) {
      leviathan = null;
    }
    return;
  }
  for (const socket of clients.values()) {
    if (!socket.player || socket.player.mode === "land") continue;
    if (leviathanTargetZone(socket.player)) {
      startLeviathanAttack(socket, now);
      break;
    }
  }
}

function botPowerScore(bot) {
  const spec = shipSpec(bot.shipType);
  return (bot.tier || spec.tier || 0) * 17
    + shipRadius(bot.shipType) * 8
    + Math.sqrt(Math.max(1, bot.maxHp || spec.hp || 500)) * 1.2
    + (bot.level || 1) * 0.9;
}

function krakenFearRadiusFor(bot) {
  const bravery = clamp(botPowerScore(bot) / 120, 0, 0.78);
  const courageScale = bot.courageous ? 0.48 : 1;
  return krakenBotFleeRadius * (1 - bravery * 0.62) * courageScale;
}

function krakenHeadPoint() {
  if (!kraken) return { x: 0, z: 0 };
  return {
    x: kraken.x - Math.sin(kraken.rotation || 0) * 6.5,
    z: kraken.z - Math.cos(kraken.rotation || 0) * 6.5,
  };
}

function krakenStandoffPointForBot(bot) {
  const head = krakenHeadPoint();
  let dx = bot.x - head.x;
  let dz = bot.z - head.z;
  const distance = Math.hypot(dx, dz) || 1;
  dx /= distance;
  dz /= distance;
  const preferred = clamp(botCannonRangeFor(bot) * 0.82, 28, 44);
  return {
    x: clamp(head.x + dx * preferred, -worldBounds * 0.94, worldBounds * 0.94),
    z: clamp(head.z + dz * preferred, -worldBounds * 0.94, worldBounds * 0.94),
  };
}

function krakenAttackEvadePointForBot(bot, attack, now = Date.now()) {
  if (!attack || attack.until < now) return null;
  const padding = shipRadius(bot.shipType) + 5;
  if (!krakenAttackContains(bot, attack, padding)) return null;
  const tx = Number(attack.x) || 0;
  const tz = Number(attack.z) || 0;
  const sx = Number(attack.sourceX) || tx + 18;
  const sz = Number(attack.sourceZ) || tz + 18;
  let dx = tx - sx;
  let dz = tz - sz;
  const len = Math.hypot(dx, dz) || 1;
  dx /= len;
  dz /= len;
  const sideX = dz;
  const sideZ = -dx;
  const offsetX = bot.x - tx;
  const offsetZ = bot.z - tz;
  const sideSign = offsetX * sideX + offsetZ * sideZ >= 0 ? 1 : -1;
  let awayX = offsetX;
  let awayZ = offsetZ;
  const awayLen = Math.hypot(awayX, awayZ);
  if (awayLen > 0.001) {
    awayX /= awayLen;
    awayZ /= awayLen;
  } else {
    awayX = sideX * sideSign;
    awayZ = sideZ * sideSign;
  }
  return {
    x: clamp(bot.x + sideX * sideSign * 120 + awayX * 72, -worldBounds * 0.94, worldBounds * 0.94),
    z: clamp(bot.z + sideZ * sideSign * 120 + awayZ * 72, -worldBounds * 0.94, worldBounds * 0.94),
  };
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

function pushBotOutOfKraken(bot) {
  if (!kraken?.alive) return false;
  const head = {
    x: kraken.x - Math.sin(kraken.rotation || 0) * 6.5,
    z: kraken.z - Math.cos(kraken.rotation || 0) * 6.5,
  };
  const minDistance = 7.5 + shipRadius(bot.shipType) * 0.72;
  const dx = bot.x - head.x;
  const dz = bot.z - head.z;
  const distance = Math.hypot(dx, dz);
  if (distance >= minDistance) return false;
  const nx = distance > 0.001 ? dx / distance : Math.sin(bot.rotation || 0);
  const nz = distance > 0.001 ? dz / distance : Math.cos(bot.rotation || 0);
  bot.x = head.x + nx * minDistance;
  bot.z = head.z + nz * minDistance;
  const inward = bot.vx * nx + bot.vz * nz;
  if (inward < 0) {
    bot.vx += nx * -inward * 1.35;
    bot.vz += nz * -inward * 1.35;
  }
  bot.vx *= 0.58;
  bot.vz *= 0.58;
  return true;
}

function islandDetourPoint(bot, island) {
  const dx = bot.x - island.x;
  const dz = bot.z - island.z;
  const distance = Math.hypot(dx, dz) || 1;
  const nx = dx / distance;
  const nz = dz / distance;
  const tangentSign = Math.random() < 0.5 ? -1 : 1;
  const tx = -nz * tangentSign;
  const tz = nx * tangentSign;
  const margin = island.radius + shipRadius(bot.shipType) * 1.25 + 22;
  return {
    x: clamp(island.x + nx * margin + tx * 54, -worldBounds * 0.94, worldBounds * 0.94),
    z: clamp(island.z + nz * margin + tz * 54, -worldBounds * 0.94, worldBounds * 0.94),
  };
}

function resolveBotContacts() {
  for (let i = 0; i < bots.length; i++) {
    const bot = bots[i];
    pushBotOutOfIsland(bot);
    pushBotOutOfKraken(bot);
    for (let j = i + 1; j < bots.length; j++) {
      separateBots(bot, bots[j]);
    }
    for (const socket of clients.values()) {
      if (!socket.player || socket.player.mode === "land") continue;
      separateBotFromPoint(bot, socket.player, socket.player.shipType || "skiff", 1);
    }
  }
}

function makeWhale(id = crypto.randomUUID()) {
  const point = randomNorthernPoint(worldBounds * 0.9, 70);
  return {
    id,
    hp: whaleMaxHp,
    maxHp: whaleMaxHp,
    x: point.x,
    z: clamp(point.z, whaleNorthMinZ, whaleNorthMaxZ),
    rotation: Math.random() * Math.PI * 2,
    vx: 0,
    vz: 0,
    speed: whaleSpeed,
    turnAt: Date.now() + 3000 + Math.random() * 5000,
    submergedUntil: 0,
    aggressiveUntil: 0,
    ramCooldownUntil: 0,
  };
}

function whaleSnapshot(whale) {
  return {
    id: whale.id,
    hp: Math.max(0, Math.round(whale.hp)),
    maxHp: whale.maxHp,
    x: whale.x,
    z: whale.z,
    rotation: whale.rotation,
    submerged: whale.submergedUntil > Date.now(),
  };
}

function resetWhale(whale) {
  Object.assign(whale, makeWhale(whale.id));
}

function damageWhale(whale, amount, rewardSocket = null) {
  whale.hp -= clamp(Number(amount) || 0, 0, 500);
  whale.aggressiveUntil = Date.now() + 18000;
  whale.submergedUntil = 0;
  if (whale.hp > 0) return false;
  spawnWhaleBits(whale.x, whale.z, 3 + Math.floor(Math.random() * 3));
  resetWhale(whale);
  if (rewardSocket) {
    send(rewardSocket, { type: "whaleReward", x: whale.x, z: whale.z });
  }
  return true;
}

function makeStorm(now = Date.now()) {
  const northBias = Math.random() < 0.72;
  const direction = Math.random() * Math.PI * 2;
  const x = (Math.random() - 0.5) * worldBounds * 1.4;
  const z = northBias ? -Math.random() * worldBounds * 0.9 : (Math.random() - 0.5) * worldBounds * 1.5;
  return {
    id: crypto.randomUUID(),
    born: now,
    life: 600000,
    x,
    z,
    radius: 58 + Math.random() * 34,
    vx: Math.sin(direction) * 4,
    vz: Math.cos(direction) * 4,
    strikeAt: now + 2000 + Math.random() * 6000,
  };
}

function stormSnapshot(storm) {
  return {
    id: storm.id,
    born: storm.born,
    life: storm.life,
    x: storm.x,
    z: storm.z,
    radius: storm.radius,
    vx: storm.vx,
    vz: storm.vz,
  };
}

function stormStrike(storm, now) {
  const candidates = [];
  for (const bot of bots) {
    if (bot.hp <= 0) continue;
    if (Math.hypot(bot.x - storm.x, bot.z - storm.z) < storm.radius) {
      candidates.push({ kind: "bot", bot, x: bot.x, z: bot.z });
    }
  }
  for (const socket of clients.values()) {
    if (!socket.player || socket.player.mode === "land") continue;
    const x = Number(socket.player.x);
    const z = Number(socket.player.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
    if (Math.hypot(x - storm.x, z - storm.z) < storm.radius) candidates.push({ kind: "player", socket, x, z });
    const balloons = Array.isArray(socket.player.balloons) ? socket.player.balloons : [];
    for (const balloon of balloons) {
      const bx = Number(balloon.x);
      const bz = Number(balloon.z);
      if (!Number.isFinite(bx) || !Number.isFinite(bz)) continue;
      if (Math.hypot(bx - storm.x, bz - storm.z) < storm.radius) candidates.push({ kind: "balloon", socket, x: bx, z: bz });
    }
  }
  for (const island of islandCenters) {
    if (Math.hypot(island.x - storm.x, island.z - storm.z) < storm.radius + island.radius && Math.random() < 0.18) {
      const angle = Math.random() * Math.PI * 2;
      candidates.push({ kind: "island", x: island.x + Math.sin(angle) * island.radius * 0.45, z: island.z + Math.cos(angle) * island.radius * 0.45 });
    }
  }
  if (!candidates.length) return;
  const hit = candidates[Math.floor(Math.random() * candidates.length)];
  broadcast({ type: "lightningStrike", x: hit.x, z: hit.z, stormX: storm.x, stormZ: storm.z });
  if (hit.kind === "bot") {
    damageBotIgnoringArmor(hit.bot, 50);
    hit.bot.fire = { dps: 10, remaining: 3 };
  } else if (hit.kind === "player") {
    send(hit.socket, { type: "stormHit", damage: 50, fire: { dps: 10, duration: 3 }, x: hit.x, z: hit.z });
  } else if (hit.kind === "balloon") {
    send(hit.socket, { type: "balloonLightning", x: hit.x, z: hit.z });
  }
  storm.strikeAt = now + 3000 + Math.random() * 7000;
}

function updateStorms(now, dt) {
  if (now >= nextStormSpawnAt) {
    nextStormSpawnAt = now + 130000 + Math.random() * 220000;
    if (Math.random() < 0.65) storms.push(makeStorm(now));
  }
  for (let i = storms.length - 1; i >= 0; i--) {
    const storm = storms[i];
    storm.x += storm.vx * dt;
    storm.z += storm.vz * dt;
    if (Math.abs(storm.x) > worldBounds * 1.05) storm.vx *= -0.8;
    if (Math.abs(storm.z) > worldBounds * 1.05) storm.vz *= -0.8;
    if (now >= storm.strikeAt) stormStrike(storm, now);
    if (now - storm.born > storm.life) storms.splice(i, 1);
  }
}

function updateWhales(now, dt) {
  for (const whale of whales) {
    if (!pointInWhaleNorthZone(whale, 80)) {
      if (!pointInWhaleNorthZone(whale, -8)) {
        resetWhale(whale);
        continue;
      }
      whale.rotation += clamp(angleDelta(whaleReturnDirection(whale), whale.rotation), -1.2 * dt, 1.2 * dt);
    }
    if (now >= whale.turnAt) {
      whale.turnAt = now + 3000 + Math.random() * 6000;
      whale.rotation += (Math.random() - 0.5) * 1.2;
      if (Math.random() < 0.28) whale.submergedUntil = now + 4000 + Math.random() * 5000;
    }
    let targetPlayer = null;
    if (whale.aggressiveUntil > now) {
      let bestDistance = 72;
      for (const socket of clients.values()) {
        if (!socket.player || socket.player.mode === "land") continue;
        const px = Number(socket.player.x);
        const pz = Number(socket.player.z);
        if (!Number.isFinite(px) || !Number.isFinite(pz) || !pointInWhaleNorthZone({ x: px, z: pz }, -12)) continue;
        const distance = Math.hypot(px - whale.x, pz - whale.z);
        if (distance < bestDistance) {
          bestDistance = distance;
          targetPlayer = socket;
        }
      }
    }
    if (targetPlayer?.player) {
      whale.rotation += clamp(angleDelta(Math.atan2(Number(targetPlayer.player.x) - whale.x, Number(targetPlayer.player.z) - whale.z), whale.rotation), -1.6 * dt, 1.6 * dt);
      whale.submergedUntil = 0;
    }
    const submerged = whale.submergedUntil > now;
    const forward = { x: Math.sin(whale.rotation), z: Math.cos(whale.rotation) };
    const nearest = nearestIsland(whale, submerged ? 18 : 30);
    if (nearest.island && nearest.distance < 0) {
      const dx = whale.x - nearest.island.x;
      const dz = whale.z - nearest.island.z;
      const d = Math.hypot(dx, dz) || 1;
      const tangentX = -dz / d;
      const tangentZ = dx / d;
      const desired = Math.atan2(dx / d + tangentX * 0.7, dz / d + tangentZ * 0.7);
      whale.rotation += clamp(angleDelta(desired, whale.rotation), -1.7 * dt, 1.7 * dt);
      if (!submerged) whale.submergedUntil = now + 2400;
    }
    const nearBoundary = whale.z < whaleNorthMinZ + 38 || whale.z > whaleNorthMaxZ - 38;
    if (nearBoundary || !pointInWhaleNorthZone(whale)) {
      whale.rotation += clamp(angleDelta(whaleReturnDirection(whale), whale.rotation), -1.8 * dt, 1.8 * dt);
    }
    const cruise = submerged ? 0.82 : targetPlayer ? 1.08 : 1;
    const desiredSpeed = whale.speed * cruise;
    whale.vx += (Math.sin(whale.rotation) * desiredSpeed - whale.vx) * clamp(dt * 0.9, 0, 0.12);
    whale.vz += (Math.cos(whale.rotation) * desiredSpeed - whale.vz) * clamp(dt * 0.9, 0, 0.12);
    whale.vx *= 0.988;
    whale.vz *= 0.988;
    const next = { x: whale.x + whale.vx * dt, z: whale.z + whale.vz * dt };
    if (!pointInWhaleNorthZone(next)) {
      whale.rotation += Math.PI * 0.78;
      whale.vx *= -0.2;
      whale.vz *= -0.2;
      whale.z = clamp(whale.z, whaleNorthMinZ + 2, whaleNorthMaxZ - 2);
    } else if (!isInsideIsland(next, submerged ? 6 : 16)) {
      whale.x = clamp(next.x, -worldBounds * 0.94, worldBounds * 0.94);
      whale.z = clamp(next.z, whaleNorthMinZ + 2, whaleNorthMaxZ - 2);
    } else {
      whale.rotation += Math.PI * (0.7 + Math.random() * 0.35);
      whale.vx *= -0.18;
      whale.vz *= -0.18;
      if (!submerged) whale.submergedUntil = now + 3200;
    }
    if (!submerged && now >= whale.ramCooldownUntil) {
      for (const socket of clients.values()) {
        if (!socket.player || socket.player.mode === "land") continue;
        const px = Number(socket.player.x);
        const pz = Number(socket.player.z);
        if (!Number.isFinite(px) || !Number.isFinite(pz)) continue;
        const distance = Math.hypot(px - whale.x, pz - whale.z);
        if (distance > 5.2 + shipRadius(socket.player.shipType || "skiff") * 0.5) continue;
        const whalerScale = socket.player.shipType === "whaler" ? 0.25 : 1;
        send(socket, { type: "whaleRam", damage: Math.round(50 * whalerScale), x: whale.x, z: whale.z });
        whale.submergedUntil = now + 5000 + Math.random() * 3000;
        whale.ramCooldownUntil = now + 9000;
        break;
      }
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
    aggressive: spec.id === "ballooner" ? Math.random() < 0.66 : Math.random() < 0.24,
    courageous: Math.random() < 1 / 3,
    upgradeFocus: ["damage", "reload", "range"][Math.floor(Math.random() * 3)],
    angerUntil: 0,
    targetBot: null,
    botFightUntil: 0,
    pickupTargetId: null,
    targetKrakenUntil: 0,
    turn: Math.random() * 4,
    fireCooldown: 1.5 + Math.random() * 2.5,
    balloonBombCooldown: Date.now() + 3500 + Math.random() * 7000,
    balloonControlUntil: 0,
    netsExtended: false,
    netToggleAt: Date.now() + 3000 + Math.random() * 8000,
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

function spawnWhaleBits(x, z, count = 4) {
  const total = clamp(Math.floor(Number(count) || 4), 3, 5);
  for (let i = 0; i < total; i++) {
    const angle = (Math.PI * 2 * i) / total + Math.random() * 0.5;
    const radius = 2.5 + Math.random() * 4.5;
    crates.push({
      id: crypto.randomUUID(),
      kind: "whale",
      born: Date.now(),
      x: x + Math.sin(angle) * radius,
      z: z + Math.cos(angle) * radius,
      heal: 0,
      xp: 0,
      gold: 0,
      blubber: 1,
    });
  }
}

function spawnBlubberBits(x, z, count = 0) {
  const total = clamp(Math.floor(Number(count) || 0), 0, 80);
  for (let i = 0; i < total; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 2.2 + Math.random() * Math.max(4, Math.sqrt(total) * 1.4);
    crates.push({
      id: crypto.randomUUID(),
      kind: "whale",
      born: Date.now(),
      x: x + Math.sin(angle) * radius,
      z: z + Math.cos(angle) * radius,
      heal: 0,
      xp: 0,
      gold: 0,
      blubber: 1,
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
    xp: Math.round((8 + level * 2 + tier * 4 + Math.random() * 7.5) * 40),
    gold: Math.round((7 + level * 2 + tier * 5 + Math.random() * 11) * 20),
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
    const searchDistance = crate.kind === "treasure"
      ? Math.min(maxDistance * 2.05, 430)
      : crate.kind === "kraken"
        ? Math.min(maxDistance * 1.65, 360)
        : Math.min(maxDistance, 260);
    if (distance > searchDistance) continue;
    const priority = crate.kind === "kraken" ? 0.2 : crate.kind === "treasure" ? 0.11 : crate.kind === "whale" ? 0.72 : 1 - healthNeed * 0.38;
    const score = distance * priority - healthNeed * 36;
    if (score < bestScore) {
      best = crate;
      bestScore = score;
    }
  }
  return best;
}

function angerNearbyBotsOverPickup(crate, collector) {
  const now = Date.now();
  const angerRadius = crate.kind === "kraken" ? 110 : crate.kind === "treasure" ? 90 : 58;
  for (const bot of bots) {
    if (bot.hp <= 0) continue;
    if (collector?.bot === bot) continue;
    const distance = Math.hypot(crate.x - bot.x, crate.z - bot.z);
    if (distance > angerRadius) continue;
    const wasChasing = bot.pickupTargetId === crate.id || distance < angerRadius * 0.72;
    if (!wasChasing) continue;
    const duration = crate.kind === "crate" ? 9000 : 15500;
    bot.pickupTargetId = null;
    bot.fireCooldown = Math.min(bot.fireCooldown || 1.5, 0.9);
    if (collector?.bot) {
      bot.targetBot = collector.bot.id;
      bot.botFightUntil = now + duration;
      bot.targetPlayer = null;
      bot.angerUntil = 0;
    } else if (collector?.socket?.id) {
      bot.targetPlayer = collector.socket.id;
      bot.angerUntil = now + duration;
      bot.targetBot = null;
      bot.botFightUntil = 0;
    }
  }
}

function updateCrateLifecycle(now) {
  const dt = 0.1;
  const removed = [];
  for (let i = crates.length - 1; i >= 0; i--) {
    const crate = crates[i];
    if (!crate.born) crate.born = now;
    if (Math.hypot(crate.vx || 0, crate.vz || 0) > 0.01) {
      const next = {
        x: crate.x + (crate.vx || 0) * dt,
        z: crate.z + (crate.vz || 0) * dt,
      };
      if (Math.abs(next.x) < worldBounds * 0.98 && Math.abs(next.z) < worldBounds * 0.98 && !isInsideIsland(next, 4)) {
        crate.x = next.x;
        crate.z = next.z;
      } else {
        crate.vx = -(crate.vx || 0) * 0.22;
        crate.vz = -(crate.vz || 0) * 0.22;
      }
      crate.vx = (crate.vx || 0) * 0.84;
      crate.vz = (crate.vz || 0) * 0.84;
      if (Math.hypot(crate.vx, crate.vz) < 0.05) {
        crate.vx = 0;
        crate.vz = 0;
      }
    }
    const lifetime = crate.kind === "kraken"
      ? crateLifetimeMs * 4
      : crate.kind === "whale"
        ? whaleBitLifetimeMs
        : crateLifetimeMs;
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
    const pickupRadius = shipRadius(bot.shipType) + 1.15 + (bot.netsExtended ? 6.2 : 0);
    for (let i = crates.length - 1; i >= 0; i--) {
      const crate = crates[i];
      if (Math.hypot(crate.x - bot.x, crate.z - bot.z) > pickupRadius) continue;
      bot.hp = clamp(bot.hp + (Number(crate.heal) || 0), 0, bot.maxHp);
      if (crate.kind === "treasure") {
        bot.level = Math.min(40, (bot.level || 1) + 2);
        bot.fireCooldown = Math.min(bot.fireCooldown || 1.5, 1.1);
      }
      angerNearbyBotsOverPickup(crate, { bot });
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

function damageBotIgnoringArmor(bot, amount, rewardSocket = null) {
  bot.hp -= Math.max(0, Number(amount) || 0);
  if (bot.hp > 0) return false;
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

function spawnBalloonBomb(message, socket) {
  if (!socket.player) return null;
  const x = Number(message.x);
  const y = Number(message.y);
  const z = Number(message.z);
  if (![x, y, z].every(Number.isFinite)) return null;
  const bomb = {
    id: `bomb-${nextBombId++}`,
    owner: socket.id,
    born: Date.now(),
    x,
    y: clamp(y, 8, 95),
    z,
    startX: x,
    startY: clamp(y, 8, 95),
    startZ: z,
    vx: clamp(Number(message.vx) || 0, -42, 42),
    vy: clamp(Number(message.vy) || 0, -22, 12),
    vz: clamp(Number(message.vz) || 0, -42, 42),
  };
  bombs.push(bomb);
  return bomb;
}

function bombFallSeconds(startY, startVy = -10) {
  const height = Math.max(0, Number(startY) - 0.35);
  const vy = Number(startVy) || 0;
  return clamp((vy + Math.sqrt(vy * vy + 2 * balloonBombGravity * height)) / balloonBombGravity, 0.65, 2.8);
}

function botBalloonOwner(balloon) {
  return bots.find((bot) => bot.id === balloon.owner && bot.hp > 0) || null;
}

function liveBotBalloonTarget(balloon) {
  if (balloon.targetKind === "player" && balloon.targetId) {
    const socket = clients.get(balloon.targetId);
    if (socket?.player && socket.player.mode !== "land") {
      return {
        x: Number(socket.player.x) || balloon.targetX,
        z: Number(socket.player.z) || balloon.targetZ,
        vx: Number(socket.player.vx) || 0,
        vz: Number(socket.player.vz) || 0,
        kind: "player",
        targetId: balloon.targetId,
      };
    }
  }
  if (balloon.targetKind === "bot" && balloon.targetId) {
    const bot = bots.find((item) => item.id === balloon.targetId && item.hp > 0);
    if (bot) return { x: bot.x, z: bot.z, vx: bot.vx || 0, vz: bot.vz || 0, kind: "bot", targetId: bot.id };
  }
  return {
    x: Number(balloon.targetX) || 0,
    z: Number(balloon.targetZ) || 0,
    vx: Number(balloon.targetVx) || 0,
    vz: Number(balloon.targetVz) || 0,
    kind: balloon.targetKind || "last-known",
    targetId: balloon.targetId || null,
  };
}

function predictedBotBalloonDropPoint(balloon, target, owner = botBalloonOwner(balloon)) {
  const distance = Math.hypot((target.x || 0) - balloon.x, (target.z || 0) - balloon.z);
  const travelSeconds = clamp(distance / 20, 0.35, 4.2);
  const fallSeconds = bombFallSeconds(balloon.y - 1.2, -10);
  const leadSeconds = travelSeconds + fallSeconds * 0.72;
  const jitter = balloon.aimJitter || 0;
  let x = (Number(target.x) || 0) + (Number(target.vx) || 0) * leadSeconds + Math.sin(balloon.jitterPhase || 0) * jitter;
  let z = (Number(target.z) || 0) + (Number(target.vz) || 0) * leadSeconds + Math.cos(balloon.jitterPhase || 0) * jitter;
  if (owner) {
    const ownerFutureX = owner.x + (owner.vx || 0) * (leadSeconds + 0.45);
    const ownerFutureZ = owner.z + (owner.vz || 0) * (leadSeconds + 0.45);
    const safeRadius = balloonBombBlastRadius + shipRadius(owner.shipType) * 0.75 + 8;
    const dx = x - ownerFutureX;
    const dz = z - ownerFutureZ;
    const ownerDistance = Math.hypot(dx, dz);
    if (ownerDistance < safeRadius) {
      const side = ownerDistance > 0.001
        ? { x: dx / ownerDistance, z: dz / ownerDistance }
        : { x: Math.cos(balloon.jitterPhase || 0), z: Math.sin(balloon.jitterPhase || 0) };
      x = ownerFutureX + side.x * safeRadius;
      z = ownerFutureZ + side.z * safeRadius;
    }
  }
  return { x, z, leadSeconds, fallSeconds };
}

function botBalloonDropWouldHitOwner(balloon, owner = botBalloonOwner(balloon), target = liveBotBalloonTarget(balloon)) {
  if (!owner) return false;
  const fallSeconds = bombFallSeconds(balloon.y - 1.2, -10);
  const drop = predictedBotBalloonDropPoint(balloon, target, owner);
  const ownerX = owner.x + (owner.vx || 0) * fallSeconds;
  const ownerZ = owner.z + (owner.vz || 0) * fallSeconds;
  const safeRadius = balloonBombBlastRadius + shipRadius(owner.shipType) * 0.65 + 6;
  return Math.hypot(drop.x - ownerX, drop.z - ownerZ) < safeRadius;
}

function spawnBotBalloonBomb(bot, target) {
  const fakeBalloon = {
    owner: bot.id,
    x: bot.x + Math.sin(bot.rotation) * 7,
    y: 26,
    z: bot.z + Math.cos(bot.rotation) * 7,
    targetX: target.x,
    targetZ: target.z,
    targetVx: target.vx || 0,
    targetVz: target.vz || 0,
    targetKind: target.kind,
    targetId: target.targetId,
    aimJitter: 3.5,
    jitterPhase: Math.random() * Math.PI * 2,
  };
  if (botBalloonDropWouldHitOwner(fakeBalloon, bot, target)) return null;
  const drop = predictedBotBalloonDropPoint(fakeBalloon, target, bot);
  const fallSeconds = bombFallSeconds(fakeBalloon.y, -10);
  const startX = fakeBalloon.x;
  const startZ = fakeBalloon.z;
  const bomb = {
    id: `bomb-${nextBombId++}`,
    owner: bot.id,
    born: Date.now(),
    x: startX,
    y: 26,
    z: startZ,
    startX,
    startY: 26,
    startZ,
    vx: clamp((drop.x - startX) / fallSeconds, -42, 42),
    vy: -10,
    vz: clamp((drop.z - startZ) / fallSeconds, -42, 42),
  };
  bombs.push(bomb);
  return bomb;
}

function spawnBotBalloon(bot, target) {
  if (!bot || bot.shipType !== "ballooner") return null;
  const now = Date.now();
  const existing = botBalloons.filter((balloon) => balloon.owner === bot.id && !balloon.falling);
  if (existing.length >= 3) return null;
  const forwardX = Math.sin(bot.rotation);
  const forwardZ = Math.cos(bot.rotation);
  const balloon = {
    id: `bot-balloon-${nextBotBalloonId++}`,
    owner: bot.id,
    born: now,
    x: bot.x + forwardX * 3.8,
    y: 24,
    z: bot.z + forwardZ * 3.8,
    vx: forwardX * 2.5,
    vz: forwardZ * 2.5,
    rotation: bot.rotation,
    hp: 100,
    bomb: true,
    landing: false,
    targetX: Number(target.x) || bot.x,
    targetZ: Number(target.z) || bot.z,
    targetVx: Number(target.vx) || 0,
    targetVz: Number(target.vz) || 0,
    targetKind: target.kind || "unknown",
    targetId: target.targetId || null,
    aimJitter: 2.2 + Math.random() * 2.2,
    jitterPhase: Math.random() * Math.PI * 2,
    dropAt: now + 1200 + Math.random() * 800,
    expireAt: now + 10500 + Math.random() * 2500,
    falling: false,
    fallVelocity: 0,
  };
  botBalloons.push(balloon);
  return balloon;
}

function dropBotBalloonBomb(balloon) {
  if (!balloon?.bomb) return null;
  const owner = botBalloonOwner(balloon);
  const target = liveBotBalloonTarget(balloon);
  if (botBalloonDropWouldHitOwner(balloon, owner, target)) {
    balloon.dropAt = Date.now() + 650;
    return null;
  }
  const fallSeconds = bombFallSeconds(balloon.y - 1.2, -10);
  const drop = predictedBotBalloonDropPoint(balloon, target, owner);
  balloon.bomb = false;
  balloon.landing = true;
  balloon.returnAt = Date.now() + 250;
  balloon.expireAt = Date.now() + 12000;
  const bomb = {
    id: `bomb-${nextBombId++}`,
    owner: balloon.owner,
    born: Date.now(),
    x: balloon.x,
    y: clamp(balloon.y - 1.2, 8, 95),
    z: balloon.z,
    startX: balloon.x,
    startY: clamp(balloon.y - 1.2, 8, 95),
    startZ: balloon.z,
    vx: clamp((drop.x - balloon.x) / fallSeconds, -42, 42),
    vy: -10,
    vz: clamp((drop.z - balloon.z) / fallSeconds, -42, 42),
  };
  bombs.push(bomb);
  return bomb;
}

function crashBotBalloon(balloon, cause = "crash") {
  if (!balloon || balloon.falling) return;
  balloon.falling = true;
  balloon.cause = cause;
  balloon.fallStarted = Date.now();
  balloon.fallVelocity = -1.6;
  balloon.spinX = (Math.random() - 0.5) * 1.4;
  balloon.spinY = (Math.random() - 0.5) * 1.0;
  balloon.spinZ = (Math.random() - 0.5) * 1.8;
}

function updateBotBalloons(now, dt) {
  for (let i = botBalloons.length - 1; i >= 0; i--) {
    const balloon = botBalloons[i];
    if (balloon.falling) {
      balloon.fallVelocity = (balloon.fallVelocity || -1.6) - 7.5 * dt;
      balloon.y += balloon.fallVelocity * dt;
      balloon.x += Math.sin(now * 0.003 + i) * dt * 0.9;
      balloon.z += Math.cos(now * 0.0027 + i) * dt * 0.9;
      balloon.rotation += (balloon.spinY || 0.5) * dt;
      if (balloon.y <= 0.4) {
        broadcast({ type: "botBalloonCrash", id: balloon.id, x: balloon.x, z: balloon.z, cause: balloon.cause || "crash" });
        botBalloons.splice(i, 1);
      }
      continue;
    }
    const owner = botBalloonOwner(balloon);
    if (!owner) {
      crashBotBalloon(balloon, "owner-lost");
      continue;
    }
    let target;
    let desiredY = 24;
    if (balloon.landing || !balloon.bomb) {
      target = {
        x: owner.x + (owner.vx || 0) * 0.85,
        z: owner.z + (owner.vz || 0) * 0.85,
      };
      const homeDistance = Math.hypot(target.x - balloon.x, target.z - balloon.z);
      desiredY = homeDistance < 28 ? 5.2 : 16;
      if (homeDistance < shipRadius(owner.shipType) + 4.2 && balloon.y <= 6.2) {
        botBalloons.splice(i, 1);
        continue;
      }
    } else {
      const liveTarget = liveBotBalloonTarget(balloon);
      balloon.targetX = liveTarget.x;
      balloon.targetZ = liveTarget.z;
      balloon.targetVx = liveTarget.vx || 0;
      balloon.targetVz = liveTarget.vz || 0;
      target = predictedBotBalloonDropPoint(balloon, liveTarget, owner);
    }
    const dx = target.x - balloon.x;
    const dz = target.z - balloon.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 0.01) {
      const dirX = dx / distance;
      const dirZ = dz / distance;
      balloon.vx += dirX * (balloon.landing ? 17 : 20) * dt;
      balloon.vz += dirZ * (balloon.landing ? 17 : 20) * dt;
      balloon.rotation = Math.atan2(dirX, dirZ);
    }
    balloon.vx *= Math.pow(0.9, dt * 6);
    balloon.vz *= Math.pow(0.9, dt * 6);
    balloon.x += balloon.vx * dt;
    balloon.z += balloon.vz * dt;
    balloon.y += (desiredY - balloon.y) * clamp(dt * (balloon.landing ? 1.8 : 0.8), 0, balloon.landing ? 0.16 : 0.05);
    if (balloon.bomb && (distance < 8 || (now >= balloon.dropAt && distance < 22))) dropBotBalloonBomb(balloon);
    if (now >= balloon.expireAt || Math.abs(balloon.x) > visibleBounds || Math.abs(balloon.z) > visibleBounds) crashBotBalloon(balloon, "expired");
  }
}

function explodeBalloonBomb(bomb) {
  const explodedAt = Date.now();
  const rewardSocket = clients.get(bomb.owner) || null;
  for (const crate of crates) {
    const distance = Math.hypot(crate.x - bomb.x, crate.z - bomb.z);
    const radius = balloonBombBlastRadius + 8;
    if (distance > radius) continue;
    const nx = distance > 0.001 ? (crate.x - bomb.x) / distance : Math.sin(Date.now() * 0.01);
    const nz = distance > 0.001 ? (crate.z - bomb.z) / distance : Math.cos(Date.now() * 0.01);
    const falloff = clamp(1 - distance / Math.max(1, radius), 0.25, 1);
    const scale = crate.kind === "treasure" || crate.kind === "kraken" ? 0.8 : 1;
    crate.vx = (crate.vx || 0) + nx * balloonBombKnockback * 0.72 * falloff * scale;
    crate.vz = (crate.vz || 0) + nz * balloonBombKnockback * 0.72 * falloff * scale;
  }
  for (const bot of bots) {
    if (bot.hp <= 0) continue;
    const distance = Math.hypot(bot.x - bomb.x, bot.z - bomb.z);
    const radius = balloonBombBlastRadius + shipRadius(bot.shipType) * 0.5;
    if (distance > radius) continue;
    const falloff = clamp(1 - distance / Math.max(1, radius), 0.32, 1);
    const nx = distance > 0.001 ? (bot.x - bomb.x) / distance : Math.sin(Date.now() * 0.01);
    const nz = distance > 0.001 ? (bot.z - bomb.z) / distance : Math.cos(Date.now() * 0.01);
    const weightScale = clamp(95 / shipWeight(bot.shipType), 0.38, 1.25);
    const impulse = balloonBombKnockback * falloff * weightScale;
    bot.vx += nx * impulse;
    bot.vz += nz * impulse;
    damageBotIgnoringArmor(bot, balloonBombDamage * falloff, rewardSocket);
  }
  for (const whale of whales) {
    const distance = Math.hypot(whale.x - bomb.x, whale.z - bomb.z);
    const radius = balloonBombBlastRadius + 5.2 * 0.65;
    if (distance > radius) continue;
    const falloff = clamp(1 - distance / Math.max(1, radius), 0.3, 1);
    const nx = distance > 0.001 ? (whale.x - bomb.x) / distance : Math.sin(Date.now() * 0.01);
    const nz = distance > 0.001 ? (whale.z - bomb.z) / distance : Math.cos(Date.now() * 0.01);
    whale.vx += nx * balloonBombKnockback * falloff * 0.52;
    whale.vz += nz * balloonBombKnockback * falloff * 0.52;
    whale.aggressiveUntil = Date.now() + 12000;
    whale.submergedUntil = 0;
    damageWhale(whale, balloonBombDamage * falloff, rewardSocket);
  }
  for (const socket of clients.values()) {
    if (!socket.player || socket.player.mode === "land") continue;
    const playerX = Number(socket.player.x);
    const playerZ = Number(socket.player.z);
    if (!Number.isFinite(playerX) || !Number.isFinite(playerZ)) continue;
    const distance = Math.hypot(playerX - bomb.x, playerZ - bomb.z);
    const radius = balloonBombBlastRadius + shipRadius(socket.player.shipType || "skiff") * 0.5;
    if (distance > radius) continue;
    const falloff = clamp(1 - distance / Math.max(1, radius), 0.32, 1);
    send(socket, {
      type: "bombHit",
      id: bomb.id,
      damage: Math.round(balloonBombDamage * falloff),
      x: bomb.x,
      z: bomb.z,
      sentAt: explodedAt,
    });
  }
  if (kraken?.alive) {
    const head = krakenHeadPoint();
    const distance = Math.hypot(head.x - bomb.x, head.z - bomb.z);
    const radius = balloonBombBlastRadius + krakenRadius * 0.62;
    if (distance <= radius) {
      const falloff = clamp(1 - distance / Math.max(1, radius), 0.32, 1);
      damageKraken(balloonBombDamage * falloff, rewardSocket, { allowRemote: true });
    }
  }
  broadcast({ type: "bombExplode", id: bomb.id, x: bomb.x, z: bomb.z, sentAt: explodedAt });
}

function updateBalloonBombs(now) {
  if (!bombs.length) return;
  for (let i = bombs.length - 1; i >= 0; i--) {
    const bomb = bombs[i];
    const age = (now - bomb.born) / 1000;
    bomb.x = bomb.startX + bomb.vx * age;
    bomb.y = bomb.startY + bomb.vy * age - 0.5 * balloonBombGravity * age * age;
    bomb.z = bomb.startZ + bomb.vz * age;
    let shouldExplode = bomb.y <= 0.35 || now - bomb.born > balloonBombLifetimeMs;
    if (!shouldExplode && bomb.y <= 5.5) {
      for (const bot of bots) {
        if (bot.hp <= 0) continue;
        if (Math.hypot(bot.x - bomb.x, bot.z - bomb.z) <= shipRadius(bot.shipType) + 1.8) {
          shouldExplode = true;
          break;
        }
      }
      if (!shouldExplode) {
        for (const socket of clients.values()) {
          if (!socket.player || socket.player.mode === "land") continue;
          const playerX = Number(socket.player.x);
          const playerZ = Number(socket.player.z);
          if (!Number.isFinite(playerX) || !Number.isFinite(playerZ)) continue;
          if (Math.hypot(playerX - bomb.x, playerZ - bomb.z) <= shipRadius(socket.player.shipType || "skiff") + 1.8) {
            shouldExplode = true;
            break;
          }
        }
      }
    }
    if (!shouldExplode) continue;
    bomb.y = Math.max(0, bomb.y);
    explodeBalloonBomb(bomb);
    bombs.splice(i, 1);
  }
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
    xp: 4800 + Math.random() * 1300,
    gold: 2900 + Math.floor(Math.random() * 1040),
  });
}

function damageKraken(amount, rewardSocket = null, options = {}) {
  if (!kraken?.alive) return false;
  if (!options.allowRemote && rewardSocket?.player && dist(rewardSocket.player, kraken) > krakenAttackRadius + 56) return false;
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
  if (kraken.currentAttack && kraken.currentAttack.until < now) kraken.currentAttack = null;
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
  const attack = {
    id: crypto.randomUUID(),
    target: attackTarget.id,
    targetKind: attackTarget.kind,
    kind,
    x: attackX,
    z: attackZ,
    sourceX: kraken.x,
    sourceZ: kraken.z,
    damage: krakenAttackDamage,
  };
  kraken.currentAttack = { ...attack, until: now + krakenSlamDelayMs + 1800 };
  broadcast({
    type: "krakenAttack",
    attack: { ...attack, sentAt: now },
    sentAt: now,
  });
  setTimeout(() => {
    if (!kraken?.alive) return;
    let changed = false;
    for (const bot of bots) {
      if (bot.hp <= 0) continue;
      if (!krakenAttackContains(bot, attack, shipRadius(bot.shipType))) continue;
      if (sinkBotByKraken(bot)) changed = true;
    }
    if (changed) broadcast(worldSnapshot());
  }, krakenSlamDelayMs);
}

function krakenAttackContains(point, attack, padding = 0) {
  const tx = Number(attack.x) || 0;
  const tz = Number(attack.z) || 0;
  const sx = Number(attack.sourceX) || tx + 18;
  const sz = Number(attack.sourceZ) || tz + 18;
  let dx = tx - sx;
  let dz = tz - sz;
  const len = Math.hypot(dx, dz) || 1;
  dx /= len;
  dz /= len;
  const sideX = dz;
  const sideZ = -dx;
  const ox = point.x - tx;
  const oz = point.z - tz;
  const slam = Math.hypot(ox, oz) <= 6.5 + padding;
  const wall = Math.abs(ox * dx + oz * dz) <= 7 + padding * 0.4
    && Math.abs(ox * sideX + oz * sideZ) <= 17 + padding * 0.4;
  return slam || wall;
}

function botSnapshot(bot) {
  return {
    id: bot.id,
    shipType: bot.shipType,
    hp: Math.max(0, Math.round(bot.hp)),
    maxHp: bot.maxHp,
    level: bot.level,
    courageous: Boolean(bot.courageous),
    netsExtended: Boolean(bot.netsExtended),
    x: bot.x,
    z: bot.z,
    rotation: bot.rotation,
    fire: bot.fire ? {
      dps: bot.fire.dps,
      remaining: Math.max(0, bot.fire.remaining),
    } : null,
  };
}

function botBalloonSnapshot(balloon) {
  return {
    id: balloon.id,
    owner: balloon.owner,
    x: balloon.x,
    y: balloon.y,
    z: balloon.z,
    rotation: balloon.rotation,
    hp: Math.max(0, Math.round(balloon.hp || 0)),
    bomb: Boolean(balloon.bomb),
    landing: Boolean(balloon.landing),
    falling: Boolean(balloon.falling),
    spinX: balloon.spinX || 0,
    spinY: balloon.spinY || 0,
    spinZ: balloon.spinZ || 0,
    cause: balloon.cause || null,
  };
}

function worldSnapshot() {
  const now = Date.now();
  return {
    type: "world",
    serverTime: now,
    dayCycleTime: ((now - worldStartedAt) / 1000) % dayCycleSeconds,
    dayLengthSeconds,
    nightLengthSeconds,
    dayCycleSeconds,
    islandClaims: [...islandClaims.values()],
    buildings,
    leviathan: leviathanSnapshot(),
    bots: bots.map(botSnapshot),
    botBalloons: botBalloons.map(botBalloonSnapshot),
    whales: whales.map(whaleSnapshot),
    storms: storms.map(stormSnapshot),
    kraken: krakenSnapshot(),
    crates: crates.map((crate) => ({
      id: crate.id,
      kind: crate.kind || "crate",
      born: crate.born || now,
      x: crate.x,
      z: crate.z,
      heal: Math.round(Number(crate.heal) || 0),
      xp: Math.round(Number(crate.xp) || 0),
      gold: Number(crate.gold) || 0,
      blubber: Number(crate.blubber) || 0,
    })),
    bombs: bombs.map((bomb) => ({
      id: bomb.id,
      owner: bomb.owner,
      x: bomb.x,
      y: bomb.y,
      z: bomb.z,
      vx: bomb.vx,
      vy: bomb.vy,
      vz: bomb.vz,
    })),
  };
}

function resetBot(bot) {
  delete bot.fire;
  delete bot.fireSourceId;
  botBalloons.forEach((balloon) => {
    if (balloon.owner === bot.id) crashBotBalloon(balloon, "owner-sunk");
  });
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
    bot.hp = clamp(bot.hp + (shipRegen[bot.shipType] || Math.max(1, Math.min(8, Math.round((bot.tier || 1) * 0.8)))) * dt, 0, bot.maxHp);
    if (bot.shipType === "whaler" && now >= (bot.netToggleAt || 0)) {
      bot.netsExtended = Math.random() < 0.48;
      bot.netToggleAt = now + 4500 + Math.random() * 8500;
    } else if (bot.shipType !== "whaler") {
      bot.netsExtended = false;
    }
    const controllingBalloon = bot.shipType === "ballooner" && (bot.balloonControlUntil || 0) > now;
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
    const lootDiscipline = clamp((bot.tier || 1) / 6, 0, 1);
    const noticedPickup = nearestPickup(bot, (healthRatio < 0.65 ? 250 : 220) - lootDiscipline * 42);
    const pickupDistance = noticedPickup ? Math.hypot(noticedPickup.x - bot.x, noticedPickup.z - bot.z) : Infinity;
    const valuablePickup = noticedPickup && (noticedPickup.kind === "treasure" || noticedPickup.kind === "kraken");
    const inAngryCombat = Boolean(targetSocket || targetBot);
    const pickupChaseRange = noticedPickup?.kind === "treasure"
      ? 310 - lootDiscipline * 70
      : noticedPickup?.kind === "kraken"
        ? 240 - lootDiscipline * 50
        : 170 - lootDiscipline * 32;
    const shouldSeekPickup = noticedPickup && (
      !inAngryCombat
      || healthRatio < 0.35
      || (valuablePickup && !bot.angerUntil && !bot.botFightUntil && pickupDistance < pickupChaseRange)
    );
    if (shouldSeekPickup) {
      pickupTarget = noticedPickup;
      if (!inAngryCombat && (healthRatio < 0.58 || valuablePickup)) {
        targetSocket = null;
        bot.targetPlayer = null;
        bot.angerUntil = 0;
        targetBot = null;
        bot.targetBot = null;
        bot.botFightUntil = 0;
      }
    }
    let fleeingKraken = false;
    let targetKraken = false;
    let evadingKrakenAttack = false;
    if (kraken?.alive) {
      const head = krakenHeadPoint();
      const dx = bot.x - head.x;
      const dz = bot.z - head.z;
      const distanceFromKraken = Math.hypot(dx, dz);
      const busy = Boolean(targetSocket || targetBot || pickupTarget);
      const evadePoint = krakenAttackEvadePointForBot(bot, kraken.currentAttack, now);
      const tooCloseToKraken = distanceFromKraken < 34 + shipRadius(bot.shipType) * 0.8;
      if (evadePoint) {
        evadingKrakenAttack = true;
        fleeingKraken = true;
        bot.targetX = evadePoint.x;
        bot.targetZ = evadePoint.z;
        bot.turn = Math.max(bot.turn, 3.2);
      } else if ((bot.targetKrakenUntil || 0) < now) {
        bot.targetKrakenUntil = 0;
      } else {
        targetKraken = true;
      }
      const nearEnoughToChallenge = distanceFromKraken < krakenAttackRadius + 78 && distanceFromKraken > 28;
      if (!evadingKrakenAttack && !tooCloseToKraken && bot.courageous && nearEnoughToChallenge && (!busy || targetKraken || Math.random() < dt * 0.16)) {
        targetKraken = true;
        bot.targetKrakenUntil = Math.max(bot.targetKrakenUntil || 0, now + 3200 + Math.random() * 4200);
      }
      const fearRadius = krakenFearRadiusFor(bot);
      if (tooCloseToKraken) targetKraken = false;
      fleeingKraken = fleeingKraken || (!targetKraken && fearRadius > 0 && distanceFromKraken < fearRadius && (!busy || tooCloseToKraken));
      if (fleeingKraken) {
        const nx = distanceFromKraken > 0.001 ? dx / distanceFromKraken : Math.sin(bot.rotation);
        const nz = distanceFromKraken > 0.001 ? dz / distanceFromKraken : Math.cos(bot.rotation);
        const fleeDistance = evadingKrakenAttack ? 172 : 132;
        const fleePoint = {
          x: clamp(bot.x + nx * fleeDistance, -worldBounds * 0.94, worldBounds * 0.94),
          z: clamp(bot.z + nz * fleeDistance, -worldBounds * 0.94, worldBounds * 0.94),
        };
        if (isInsideIsland(fleePoint, 18)) {
          const island = nearestIsland(fleePoint, 18).island;
          const point = island ? islandDetourPoint(bot, island) : randomTravelPoint(worldBounds * 0.92);
          bot.targetX = point.x;
          bot.targetZ = point.z;
        } else {
          bot.targetX = fleePoint.x;
          bot.targetZ = fleePoint.z;
        }
        bot.turn = Math.max(bot.turn, 2.8);
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
    } else if (targetKraken && kraken?.alive) {
      const point = krakenStandoffPointForBot(bot);
      bot.targetX = point.x;
      bot.targetZ = point.z;
      bot.turn = Math.max(bot.turn, 1.8);
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
    bot.pickupTargetId = pickupTarget?.id || null;

    const toTarget = { x: bot.targetX - bot.x, z: bot.targetZ - bot.z };
    const distance = Math.hypot(toTarget.x, toTarget.z);
    if (!fleeingKraken && !targetSocket && !targetBot && !targetKraken && !pickupTarget && distance < 9) {
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
        if ((targetSocket || targetBot || targetKraken || pickupTarget || fleeingKraken) && d > 0.001) {
          const along = clamp(((-dx * toTarget.x) + (-dz * toTarget.z)) / Math.max(1, distance * distance), 0, 1);
          const closeX = bot.x + toTarget.x * along;
          const closeZ = bot.z + toTarget.z * along;
          const clearance = Math.hypot(closeX - island.x, closeZ - island.z);
          const routeDanger = island.radius + shipRadius(bot.shipType) * 1.25 + 14;
          if (along > 0.08 && along < 0.96 && clearance < routeDanger) {
            const tangentX = -dz / d;
            const tangentZ = dx / d;
            const sign = tangentX * toTarget.x + tangentZ * toTarget.z >= 0 ? 1 : -1;
            const force = ((routeDanger - clearance) / routeDanger) * 76;
            avoidance.x += tangentX * sign * force;
            avoidance.z += tangentZ * sign * force;
          }
        }
      }
      if (!targetSocket && !targetBot && !targetKraken) {
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
        const head = krakenHeadPoint();
        const dx = bot.x - head.x;
        const dz = bot.z - head.z;
        const d = Math.hypot(dx, dz);
        const fearRadius = krakenFearRadiusFor(bot);
        const danger = targetKraken ? 36 + shipRadius(bot.shipType) : fearRadius + 28;
        if (d > 0.001 && d < danger) {
          const force = ((danger - d) / danger) * (fleeingKraken ? 135 : targetKraken ? 58 : 32);
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
      const inCombat = Boolean(targetSocket || targetBot || targetKraken);
      const chasingPickup = Boolean(pickupTarget);
      const turnRate = fleeingKraken ? 1.25 + bot.speed / 40 : inCombat ? 0.95 + bot.speed / 46 : chasingPickup ? 0.86 + bot.speed / 52 : 0.6 + bot.speed / 64;
      bot.rotation += clamp(delta, -turnRate * dt, turnRate * dt);
      const forward = { x: Math.sin(bot.rotation), z: Math.cos(bot.rotation) };
      const facing = clamp(Math.cos(delta), 0.18, 1);
      const pickupCruise = pickupTarget?.kind === "treasure" || pickupTarget?.kind === "kraken" ? 0.6 : 0.48;
      const cruise = fleeingKraken ? 0.72 : targetKraken ? 0.6 : inCombat ? 0.48 : chasingPickup ? pickupCruise : 0.28;
      const arrive = fleeingKraken ? 1 : chasingPickup ? clamp(distance / 14, 0.24, 1) : clamp(distance / (inCombat ? 20 : 34), 0.18, 1);
      const effectiveBotSpeed = bot.netsExtended ? 9 : bot.speed;
      const desiredSpeed = (controllingBalloon ? 0 : effectiveBotSpeed) * cruise * facing * arrive;
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
        if (!targetSocket && !targetBot && !targetKraken && !pickupTarget) {
          bot.targetPlayer = null;
          bot.angerUntil = 0;
          bot.targetBot = null;
          bot.botFightUntil = 0;
        }
        const point = islandDetourPoint(bot, nearIsland.island);
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
      ? { x: Number(targetSocket.player.x) || bot.x, z: Number(targetSocket.player.z) || bot.z, vx: Number(targetSocket.player.vx) || 0, vz: Number(targetSocket.player.vz) || 0, kind: "player", targetId: targetSocket.id }
      : targetBot
        ? { x: targetBot.x, z: targetBot.z, vx: targetBot.vx, vz: targetBot.vz, kind: "bot", bot: targetBot, targetId: targetBot.id }
        : targetKraken && kraken?.alive
          ? { ...krakenHeadPoint(), vx: kraken.vx || 0, vz: kraken.vz || 0, kind: "kraken", kraken: true }
          : null;
    if (shotTarget && bot.fireCooldown <= 0) {
      const dx = shotTarget.x - bot.x;
      const dz = shotTarget.z - bot.z;
      const shotDistance = Math.hypot(dx, dz);
      if (bot.shipType === "ballooner" && (bot.balloonBombCooldown || 0) <= now && shotDistance < 120 && shotTarget.kind !== "kraken") {
        spawnBotBalloon(bot, shotTarget) || spawnBotBalloonBomb(bot, shotTarget);
        bot.balloonBombCooldown = now + 7500 + Math.random() * 5500;
        bot.balloonControlUntil = now + 2200;
        bot.fireCooldown = Math.max(bot.fireCooldown, 1.2);
        continue;
      }
      if (controllingBalloon) continue;
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
        } else if (shotTarget.kraken) {
          damageKraken(damage * 0.45);
        }
        bot.fireCooldown = botCannonReload(bot);
      }
    }
  }
  resolveBotContacts();
  botCollectCrates();
  updateCrateLifecycle(now);
  updateWhales(now, dt);
  updateStorms(now, dt);
  updateKraken(now, dt);
  updateLeviathanServer(now, dt);
  updateBotBalloons(now, dt);
  updateBalloonBombs(now);
  broadcast(worldSnapshot());
}

for (let i = 0; i < botCount; i++) bots.push(makeBot());
for (let i = 0; i < whaleCount; i++) whales.push(makeWhale());
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
  sendBuildInventory(socket);
  send(socket, worldSnapshot());
  socket.on("data", (buffer) => readFrames(socket, buffer));
  socket.on("close", () => leave(socket));
  socket.on("error", () => leave(socket));
});

function leave(socket) {
  if (!clients.has(socket.id)) return;
  clients.delete(socket.id);
  buildInventories.delete(socket.id);
  let changedWorld = false;
  for (const [island, claim] of islandClaims) {
    if (claim.owner === socket.id) {
      islandClaims.delete(island);
      changedWorld = true;
    }
  }
  for (let i = buildings.length - 1; i >= 0; i--) {
    if (buildings[i].owner === socket.id) {
      buildings.splice(i, 1);
      changedWorld = true;
    }
  }
  for (const bot of bots) {
    if (bot.targetPlayer === socket.id) bot.targetPlayer = null;
  }
  broadcast({ type: "leave", id: socket.id }, socket);
  if (changedWorld) broadcast(worldSnapshot());
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
      sendBuildInventory(socket);
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
  if (message.type === "buyBuild") {
    const itemType = message.item || message.typeId || message.buildType;
    if (!buildItemTypes.has(itemType)) return;
    const amount = Math.max(1, Math.min(50, Math.floor(Number(message.amount) || 1)));
    const cost = (buildItemPrices[itemType] || 20) * amount;
    const currentGold = Number(socket.player?.gold);
    if (!Number.isFinite(currentGold) || currentGold < cost) {
      send(socket, { type: "buildError", reason: "Not enough gold." });
      return;
    }
    socket.player.gold = Math.max(0, currentGold - cost);
    const inventory = inventoryFor(socket);
    inventory[itemType] = Math.min(999, (Number(inventory[itemType]) || 0) + amount);
    sendBuildInventory(socket, { bought: itemType, amount, cost });
  }
  if (message.type === "clearBuildInventory") {
    buildInventories.set(socket.id, emptyBuildInventory());
    sendBuildInventory(socket);
  }
  if (message.type === "placeBuilding") {
    const pieceData = message.piece || {};
    const islandName = pieceData.island || pieceData.islandName;
    const island = claimableIslandByName(islandName);
    if (!island || !buildItemTypes.has(pieceData.type)) return buildReject(socket, "That building spot is not valid.");
    const claim = islandClaims.get(island.name);
    const inventory = inventoryFor(socket);
    if ((Number(inventory[pieceData.type]) || 0) <= 0) {
      buildReject(socket, "You do not have that building piece.");
      return;
    }
    if (pieceData.type === "flag" && claim) {
      buildReject(socket, "That island is already claimed.");
      return;
    }
    const ownsIsland = claim && (
      claim.owner === socket.id
      || claim.clientId === pieceData.clientId
      || claim.clientId === pieceData.owner
      || claim.sessionId === pieceData.sessionId
    );
    if (pieceData.type !== "flag" && !ownsIsland) return buildReject(socket, "You can only build on islands you claimed.");
    const x = Number(pieceData.x);
    const z = Number(pieceData.z);
    if (!pointInsideIsland(island, x, z, 4)) return buildReject(socket, "Build on the top of the island, away from the edge.");
    if (buildings.length > 420) buildings.shift();
    let newClaim = null;
    if (pieceData.type === "flag") {
      newClaim = {
        island: island.name,
        name: cleanClaimName(pieceData.claimName || message.name),
        owner: socket.id,
        clientId: String(pieceData.clientId || pieceData.owner || "").slice(0, 80),
        sessionId: String(pieceData.sessionId || "").slice(0, 80),
        ownerName: String(pieceData.ownerName || socket.player?.name || "Captain").slice(0, 24),
      };
      islandClaims.set(island.name, newClaim);
    }
    const piece = {
      id: String(pieceData.id || `building-${nextBuildingId++}`).slice(0, 80),
      island: island.name,
      type: pieceData.type,
      x,
      y: Math.max(0, Math.min(18, Number(pieceData.y) || 2)),
      z,
      rotation: Number(pieceData.rotation) || 0,
      owner: socket.id,
      clientId: String(pieceData.clientId || pieceData.owner || "").slice(0, 80),
    };
    const existingIndex = buildings.findIndex((item) => item.id === piece.id);
    if (existingIndex >= 0) buildings[existingIndex] = piece;
    else buildings.push(piece);
    inventory[piece.type] = Math.max(0, (Number(inventory[piece.type]) || 0) - 1);
    if (newClaim) broadcast({ type: "islandClaimed", claim: newClaim });
    sendBuildInventory(socket);
    broadcast({ type: "buildingPlaced", piece });
    broadcast(worldSnapshot());
  }
  if (message.type === "removeBuilding") {
    const id = String(message.id || "").slice(0, 80);
    const index = buildings.findIndex((piece) => piece.id === id && piece.owner === socket.id);
    if (index < 0) return;
    const [piece] = buildings.splice(index, 1);
    const inventory = inventoryFor(socket);
    inventory[piece.type] = Math.min(999, (Number(inventory[piece.type]) || 0) + 1);
    if (piece.type === "flag") {
      const claim = islandClaims.get(piece.island);
      if (claim?.owner === socket.id) {
        islandClaims.delete(piece.island);
        for (let i = buildings.length - 1; i >= 0; i--) {
          if (buildings[i].owner === socket.id && buildings[i].island === piece.island) {
            const [removedPiece] = buildings.splice(i, 1);
            inventory[removedPiece.type] = Math.min(999, (Number(inventory[removedPiece.type]) || 0) + 1);
          }
        }
      }
    }
    sendBuildInventory(socket, { removed: piece.type });
    broadcast({ type: "buildingRemoved", id: piece.id });
    broadcast(worldSnapshot());
  }
  if (message.type === "balloonBomb") {
    const bomb = spawnBalloonBomb(message, socket);
    if (bomb) broadcast(worldSnapshot());
  }
  if (message.type === "spawnWhaleBits") {
    return;
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
  if (message.type === "hitBotBalloon") {
    const balloon = botBalloons.find((item) => item.id === message.id);
    if (!balloon || balloon.falling) return;
    balloon.hp -= clamp(Number(message.damage) || 0, 0, 120);
    if (balloon.hp <= 0) crashBotBalloon(balloon, "airburst");
    broadcast(worldSnapshot());
  }
  if (message.type === "hitWhale") {
    const whale = whales.find((item) => item.id === message.id);
    if (!whale) return;
    const damage = message.ammoType === "harpoon"
      ? (socket.player?.shipType === "whaler" ? 150 : 100)
      : clamp(Number(message.damage) || 0, 0, 260);
    damageWhale(whale, damage, socket);
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
    spawnBlubberBits(x, z, message.blubber);
    buildInventories.set(socket.id, emptyBuildInventory());
    sendBuildInventory(socket);
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
    angerNearbyBotsOverPickup(crate, { socket });
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
