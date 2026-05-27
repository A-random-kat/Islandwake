import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const canvas = document.querySelector("#game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8edff0);
scene.fog = new THREE.Fog(0x8edff0, 95, 245);

const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 650);
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const aimPoint = new THREE.Vector3();
const clock = new THREE.Clock();

const ui = {
  playerName: document.querySelector("#playerName"),
  modeLabel: document.querySelector("#modeLabel"),
  hpBar: document.querySelector("#hpBar"),
  xpBar: document.querySelector("#xpBar"),
  statsLine: document.querySelector("#statsLine"),
  cargoList: document.querySelector("#cargoList"),
  dockPrompt: document.querySelector("#dockPrompt"),
  toast: document.querySelector("#toast"),
  shop: document.querySelector("#shop"),
  shopIsland: document.querySelector("#shopIsland"),
  shopBody: document.querySelector("#shopBody"),
  closeShop: document.querySelector("#closeShop"),
  spyPanel: document.querySelector("#spyPanel"),
  spyName: document.querySelector("#spyName"),
  spyDetails: document.querySelector("#spyDetails"),
  tabs: [...document.querySelectorAll(".tab")],
  toolButtons: {
    cannon: document.querySelector("#toolCannon"),
    rod: document.querySelector("#toolRod"),
    glass: document.querySelector("#toolGlass"),
  },
};

const keys = new Set();
const goods = ["Silk", "Spice", "Iron", "Tea", "Pearls"];
const islandData = [
  { name: "Port Azure", x: -70, z: -52, color: 0x7dcf7a, goods: { Silk: 32, Spice: 57, Iron: 38, Tea: 24, Pearls: 88 } },
  { name: "Cinder Cay", x: 58, z: -74, color: 0xda9c5c, goods: { Silk: 62, Spice: 35, Iron: 29, Tea: 58, Pearls: 104 } },
  { name: "Mosshook", x: 82, z: 42, color: 0x6dbc6c, goods: { Silk: 45, Spice: 75, Iron: 56, Tea: 39, Pearls: 72 } },
  { name: "Moon Shoal", x: -48, z: 68, color: 0x92d37e, goods: { Silk: 82, Spice: 51, Iron: 72, Tea: 33, Pearls: 118 } },
  { name: "Brass Quay", x: 4, z: 4, color: 0xc8b66b, goods: { Silk: 53, Spice: 63, Iron: 44, Tea: 71, Pearls: 95 } },
  { name: "Saffron Atoll", x: 20, z: -120, color: 0x91c96d, goods: { Silk: 69, Spice: 30, Iron: 54, Tea: 63, Pearls: 132 } },
  { name: "Frostwane", x: -116, z: -106, color: 0x9fcf9a, goods: { Silk: 38, Spice: 83, Iron: 81, Tea: 46, Pearls: 76 } },
  { name: "Glasswind", x: 116, z: -18, color: 0x75caa5, goods: { Silk: 91, Spice: 54, Iron: 34, Tea: 82, Pearls: 109 } },
  { name: "Crown Harbor", x: 18, z: 112, color: 0x82bd72, goods: { Silk: 58, Spice: 92, Iron: 61, Tea: 28, Pearls: 121 } },
  { name: "Blackreef", x: -118, z: 24, color: 0x5fa66a, goods: { Silk: 74, Spice: 48, Iron: 96, Tea: 57, Pearls: 84 } },
  { name: "Emerald Reach", x: 118, z: 104, color: 0x68c46f, goods: { Silk: 42, Spice: 70, Iron: 67, Tea: 95, Pearls: 143 } },
];

const shipCatalog = [
  { id: "skiff", name: "Harbor Skiff", price: 0, hp: 145, armor: 0.02, speed: 15, regen: 1.6, color: 0xcc4e3f, model: "skiff" },
  { id: "shallop", name: "Coastal Shallop", price: 380, hp: 165, armor: 0.02, speed: 17, regen: 1.7, color: 0xb86d3d, model: "skiff" },
  { id: "pinnace", name: "Scout Pinnace", price: 520, hp: 185, armor: 0.03, speed: 20, regen: 1.8, color: 0x5b9eb5, model: "dart" },
  { id: "hoy", name: "Dutch Hoy", price: 680, hp: 220, armor: 0.04, speed: 11, regen: 1.9, color: 0xb0824a, model: "cog" },
  { id: "cog", name: "North Sea Cog", price: 880, hp: 260, armor: 0.06, speed: 10, regen: 2.0, color: 0xa86e3a, model: "cog" },
  { id: "longship", name: "Viking Longship", price: 980, hp: 205, armor: 0.03, speed: 24, regen: 1.8, color: 0xc84f3f, model: "longship" },
  { id: "dogger", name: "North Sea Dogger", price: 1120, hp: 230, armor: 0.04, speed: 18, regen: 1.9, color: 0x7c9a7e, model: "lugger" },
  { id: "dhow", name: "Arabian Dhow", price: 1250, hp: 235, armor: 0.03, speed: 19, regen: 2.2, color: 0xf0d05a, model: "dhow" },
  { id: "sloop", name: "Bermuda Sloop", price: 1420, hp: 225, armor: 0.04, speed: 27, regen: 1.8, color: 0x4aa5c6, model: "storm" },
  { id: "knarr", name: "Norse Knarr", price: 1580, hp: 290, armor: 0.06, speed: 12, regen: 2.2, color: 0x9b6b35, model: "knarr" },
  { id: "lugger", name: "Channel Lugger", price: 1720, hp: 245, armor: 0.04, speed: 22, regen: 2.0, color: 0x4f9a9a, model: "lugger" },
  { id: "tartane", name: "Mediterranean Tartane", price: 1880, hp: 250, armor: 0.04, speed: 24, regen: 2.0, color: 0xc96446, model: "xebec" },
  { id: "pink", name: "Atlantic Pink", price: 2050, hp: 300, armor: 0.06, speed: 15, regen: 2.3, color: 0xc88b58, model: "caravel" },
  { id: "cat", name: "Polynesian Catamaran", price: 2180, hp: 210, armor: 0.02, speed: 28, regen: 1.8, color: 0xef6f4f, model: "cat" },
  { id: "dart", name: "Corsair Cutter", price: 2350, hp: 230, armor: 0.04, speed: 30, regen: 1.7, color: 0x35a9b5, model: "dart" },
  { id: "junk", name: "Ming Junk", price: 2520, hp: 330, armor: 0.07, speed: 15, regen: 2.8, color: 0x4aa66b, model: "junk" },
  { id: "ketch", name: "Harbor Ketch", price: 2720, hp: 340, armor: 0.06, speed: 16, regen: 2.5, color: 0xc58e45, model: "caravel" },
  { id: "schooner", name: "Baltimore Schooner", price: 2920, hp: 300, armor: 0.05, speed: 26, regen: 2.1, color: 0x58c6f2, model: "schooner" },
  { id: "galley", name: "Venetian Galley", price: 3150, hp: 310, armor: 0.04, speed: 23, regen: 2.2, color: 0xd7b44a, model: "galley" },
  { id: "xebec", name: "Mediterranean Xebec", price: 3380, hp: 320, armor: 0.05, speed: 29, regen: 2.1, color: 0xd45f3f, model: "xebec" },
  { id: "brigantine", name: "Privateer Brigantine", price: 3650, hp: 360, armor: 0.07, speed: 22, regen: 2.3, color: 0x3f87a6, model: "brig" },
  { id: "caravel", name: "Explorer Caravel", price: 3920, hp: 390, armor: 0.08, speed: 16, regen: 2.6, color: 0xd2a94b, model: "caravel" },
  { id: "snow", name: "Baltic Snow", price: 4250, hp: 430, armor: 0.09, speed: 19, regen: 2.5, color: 0xa4c9e8, model: "snow" },
  { id: "packet", name: "Fast Packet Ship", price: 4550, hp: 350, armor: 0.05, speed: 27, regen: 2.0, color: 0x67bdd8, model: "schooner" },
  { id: "barquentine", name: "Trade Barquentine", price: 4850, hp: 400, armor: 0.07, speed: 24, regen: 2.2, color: 0x82b26a, model: "snow" },
  { id: "clipper", name: "Tea Clipper", price: 5050, hp: 360, armor: 0.04, speed: 33, regen: 1.9, color: 0xe2aa32, model: "clipper" },
  { id: "fluyt", name: "Dutch Fluyt", price: 5200, hp: 500, armor: 0.08, speed: 13, regen: 2.8, color: 0xd18b45, model: "fluyt" },
  { id: "bombketch", name: "Royal Bomb Ketch", price: 5600, hp: 560, armor: 0.11, speed: 10, regen: 2.7, color: 0x75856f, model: "turtle" },
  { id: "barque", name: "Ocean Barque", price: 6050, hp: 470, armor: 0.08, speed: 21, regen: 2.4, color: 0x7e9bc9, model: "snow" },
  { id: "corvette", name: "Post Ship Corvette", price: 6650, hp: 510, armor: 0.1, speed: 25, regen: 2.4, color: 0x4c64a6, model: "frigate" },
  { id: "frigate", name: "Fifth-Rate Frigate", price: 7300, hp: 580, armor: 0.12, speed: 24, regen: 2.5, color: 0x4051a8, model: "frigate" },
  { id: "storm", name: "Royal Cutter", price: 7800, hp: 380, armor: 0.07, speed: 31, regen: 2.0, color: 0x3556b8, model: "storm" },
  { id: "galleon", name: "Spanish Galleon", price: 8500, hp: 680, armor: 0.14, speed: 12, regen: 2.9, color: 0x7e4c9d, model: "galleon" },
  { id: "merchantman", name: "Armed Merchantman", price: 9100, hp: 760, armor: 0.12, speed: 11, regen: 3.0, color: 0xb5773c, model: "fluyt" },
  { id: "eastindiaman", name: "East Indiaman", price: 9900, hp: 820, armor: 0.15, speed: 12, regen: 3.2, color: 0xd09a42, model: "galleon" },
  { id: "carrack", name: "Great Carrack", price: 10800, hp: 780, armor: 0.15, speed: 10, regen: 3.1, color: 0xb84f44, model: "carrack" },
  { id: "treasure", name: "Treasure Junk", price: 11800, hp: 900, armor: 0.14, speed: 9, regen: 3.5, color: 0xd6a83c, model: "treasure" },
  { id: "razee", name: "Razee Frigate", price: 13000, hp: 850, armor: 0.16, speed: 18, regen: 3.0, color: 0x6150a3, model: "frigate" },
  { id: "fourthrate", name: "Fourth-Rate Ship", price: 14600, hp: 980, armor: 0.18, speed: 12, regen: 3.4, color: 0x8e5a3f, model: "manowar" },
  { id: "manowar", name: "Ship of the Line", price: 16800, hp: 1120, armor: 0.2, speed: 11, regen: 3.6, color: 0xd8b24a, model: "manowar" },
  { id: "firstrate", name: "First-Rate Ship", price: 20500, hp: 1320, armor: 0.22, speed: 9, regen: 4.0, color: 0xc9b05a, model: "manowar" },
];

const captainId = localStorage.islandwakeId || crypto.randomUUID();
localStorage.islandwakeId = captainId;
const playerId = crypto.randomUUID();
const state = {
  name: localStorage.islandwakeName || `Captain ${captainId.slice(0, 3).toUpperCase()}`,
  level: 1,
  xp: 0,
  gold: 240,
  points: 0,
  mode: "ship",
  tool: "cannon",
  dockedAt: null,
  shopTab: "goods",
  shipType: "skiff",
  hp: 145,
  cargo: {},
  upgrades: { damage: 0, fireRate: 0, range: 0 },
  cooldown: 0,
  rodCooldown: 0,
  position: new THREE.Vector3(-15, 0, -12),
  velocity: new THREE.Vector3(),
  rotation: 0,
  walkingPos: new THREE.Vector3(),
  walkHeight: 0,
  walkVelocityY: 0,
  grounded: true,
  cameraYaw: 0,
  fishing: null,
  spyTarget: null,
};

let playerShip;
let character;
let multiplayer = {
  socket: null,
  channel: null,
  networkId: null,
  mode: "offline",
  lastSent: 0,
  hasConnected: false,
  reconnectAttempts: 0,
  reconnectTimer: null,
};
const islands = [];
const bots = [];
const remotePlayers = new Map();
const projectiles = [];
const fish = [];
const crates = [];
const labels = [];
const SHIP_WATERLINE_Y = -0.42;
let fishingLine;
let fishingBobber;

function setCylinderBetween(mesh, start, end) {
  const mid = start.clone().add(end).multiplyScalar(0.5);
  const dir = end.clone().sub(start);
  const length = Math.max(0.01, dir.length());
  mesh.position.copy(mid);
  mesh.scale.set(1, length, 1);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function dist2(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

function angleDelta(target, current) {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current));
}

function lerpAngle(current, target, amount) {
  return current + angleDelta(target, current) * amount;
}

function toast(message) {
  ui.toast.textContent = message;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (ui.toast.textContent = ""), 1800);
}

function xpForLevel(level) {
  return Math.round(65 + level * 35);
}

function addXP(amount) {
  state.xp += amount;
  while (state.xp >= xpForLevel(state.level)) {
    state.xp -= xpForLevel(state.level);
    state.level++;
    state.points++;
    toast(`Level ${state.level}! Upgrade point earned.`);
  }
}

function getShipStats(type = state.shipType) {
  return shipCatalog.find((ship) => ship.id === type) || shipCatalog[0];
}

function maxHp() {
  return getShipStats().hp;
}

function shipTier(type) {
  const price = getShipStats(type).price;
  if (price >= 16000) return 6;
  if (price >= 11000) return 5;
  if (price >= 7000) return 4;
  if (price >= 4000) return 3;
  if (price >= 1800) return 2;
  if (price >= 700) return 1;
  return 0;
}

function crateDropCount(target) {
  const level = target.level || 1;
  const tier = target.isBot ? shipTier(target.shipType) : shipTier(state.shipType);
  return 2 + Math.floor(level / 2) + tier;
}

function setSize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}

addEventListener("resize", setSize);
setSize();

function mat(color, roughness = 0.9) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.05 });
}

const mats = {
  water: new THREE.MeshStandardMaterial({ color: 0x35b7d4, roughness: 0.5, metalness: 0.04 }),
  shallows: new THREE.MeshStandardMaterial({ color: 0x6ed7cf, roughness: 0.66, metalness: 0.02, transparent: true, opacity: 0.72 }),
  sand: mat(0xe9d28a),
  grass: mat(0x70bf61),
  rock: mat(0x7e8991),
  wood: mat(0x8b5a32),
  sail: mat(0xfff5da),
  dark: mat(0x2f3342),
  gold: mat(0xd99928),
  white: mat(0xf8f4e5),
  red: mat(0xd54b3f),
  crate: mat(0xb87533),
  hull: mat(0x6b432b),
  hullDark: mat(0x3f2d24),
  rope: mat(0x5a3b25),
  plank: mat(0xb77b42),
};

function addLights() {
  const hemi = new THREE.HemisphereLight(0xdaf7ff, 0x5f8f73, 1.35);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.3);
  sun.position.set(-60, 90, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -145;
  sun.shadow.camera.right = 145;
  sun.shadow.camera.top = 145;
  sun.shadow.camera.bottom = -145;
  scene.add(sun);
  const warm = new THREE.DirectionalLight(0xffdba0, 0.85);
  warm.position.set(80, 36, -70);
  scene.add(warm);
}

function addSea() {
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(520, 520, 80, 80), mats.water);
  sea.rotation.x = -Math.PI / 2;
  sea.receiveShadow = true;
  sea.userData.wave = true;
  scene.add(sea);
  const grid = new THREE.GridHelper(520, 52, 0x87e7f3, 0x87e7f3);
  grid.position.y = 0.025;
  grid.material.transparent = true;
  grid.material.opacity = 0.08;
  scene.add(grid);
  for (let i = 0; i < 150; i++) {
    const foam = new THREE.Mesh(new THREE.BoxGeometry(3 + Math.random() * 8, 0.04, 0.14), mat(0xd9fbff));
    foam.position.set((Math.random() - 0.5) * 250, 0.035, (Math.random() - 0.5) * 250);
    foam.rotation.y = Math.random() * Math.PI;
    foam.userData.drift = Math.random() * 100;
    scene.add(foam);
  }
}

function makeCloud() {
  const cloud = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.86 });
  for (let i = 0; i < 5; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(2.6 + Math.random() * 2.2, 8, 6), cloudMat);
    puff.position.set(i * 3.4 + Math.random(), Math.random() * 1.2, (Math.random() - 0.5) * 3);
    cloud.add(puff);
  }
  cloud.scale.setScalar(1.5 + Math.random() * 1.4);
  cloud.position.set((Math.random() - 0.5) * 230, 42 + Math.random() * 18, (Math.random() - 0.5) * 230);
  cloud.userData.cloud = 0.7 + Math.random() * 0.9;
  scene.add(cloud);
}

function makePalm() {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 4.5, 6), mat(0x9b6b35));
  trunk.position.y = 2.2;
  trunk.rotation.z = 0.14;
  trunk.castShadow = true;
  tree.add(trunk);
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.75, 4.2, 4), mat(0x2f9e64));
    leaf.position.set(Math.cos(i * 1.26) * 1.25, 4.65, Math.sin(i * 1.26) * 1.25);
    leaf.rotation.z = Math.PI / 2;
    leaf.rotation.y = i * 1.26;
    leaf.castShadow = true;
    tree.add(leaf);
  }
  return tree;
}

function makeIsland(data) {
  const group = new THREE.Group();
  group.position.set(data.x, 0, data.z);
  const shallows = new THREE.Mesh(new THREE.CylinderGeometry(22, 25, 0.08, 18), mats.shallows);
  shallows.position.y = 0.08;
  shallows.receiveShadow = true;
  group.add(shallows);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(13, 18, 2.2, 11), mats.sand);
  base.position.y = 0.7;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(9, 13, 1.2, 10), mat(data.color));
  grass.position.y = 2.25;
  grass.castShadow = true;
  grass.receiveShadow = true;
  group.add(grass);
  const dock = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.45, 10), mats.wood);
  dock.position.set(0, 1.45, 16);
  dock.castShadow = true;
  group.add(dock);
  const obstacles = [
    { x: data.x - 4, z: data.z - 1, r: 3.8 },
    { x: data.x + 2.2, z: data.z + 12, r: 0.8 },
    { x: data.x - 2.2, z: data.z + 15, r: 0.8 },
    { x: data.x - 2.2, z: data.z + 18, r: 0.8 },
  ];
  const banner = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.2, 2.2), mat(0xd64f45));
  banner.position.set(2.55, 3.45, 11.8);
  banner.castShadow = true;
  group.add(banner);
  for (let i = 0; i < 3; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.4, 6), mats.wood);
    post.position.set(i % 2 ? 2.2 : -2.2, 2.2, 12 + i * 3);
    post.castShadow = true;
    group.add(post);
  }
  const shop = new THREE.Group();
  const hut = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3, 4.2), mat(0xd9a45e));
  hut.position.y = 4.1;
  hut.castShadow = true;
  shop.add(hut);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.8, 2.4, 4), mat(0xbb5844));
  roof.position.y = 6.8;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  shop.add(roof);
  shop.position.set(-4, 0, -1);
  group.add(shop);
  for (let i = 0; i < 5; i++) {
    const palm = makePalm();
    palm.position.set(Math.cos(i * 1.7) * (5 + Math.random() * 4), 2.3, Math.sin(i * 1.7) * (5 + Math.random() * 4));
    palm.scale.setScalar(0.75 + Math.random() * 0.45);
    group.add(palm);
    obstacles.push({ x: data.x + palm.position.x, z: data.z + palm.position.z, r: 1.35 * palm.scale.x });
  }
  for (let i = 0; i < 7; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7 + Math.random() * 0.7, 0), mats.rock);
    rock.position.set(Math.cos(i * 1.9) * (10 + Math.random() * 4), 2.7, Math.sin(i * 1.9) * (9 + Math.random() * 4));
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.scale.y = 0.55 + Math.random() * 0.7;
    rock.castShadow = true;
    group.add(rock);
    obstacles.push({ x: data.x + rock.position.x, z: data.z + rock.position.z, r: 1.1 * Math.max(rock.scale.x, rock.scale.z) });
  }
  const label = makeLabel(data.name);
  label.position.set(data.x, 12, data.z);
  scene.add(label);
  labels.push(label);
  scene.add(group);
  return { ...data, group, radius: 18, obstacles, dock: new THREE.Vector3(data.x, 0, data.z + 18), shop: new THREE.Vector3(data.x - 4, 0, data.z - 1) };
}

function makeLabel(text) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "rgba(16,32,42,.72)";
  ctx.beginPath();
  ctx.roundRect(10, 8, 236, 42, 12);
  ctx.fill();
  ctx.fillStyle = "#fff8df";
  ctx.font = "bold 24px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(text, 128, 37);
  const texture = new THREE.CanvasTexture(c);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
  sprite.scale.set(18, 4.5, 1);
  return sprite;
}

function hullMesh(length, width, height, material = mats.hull, profile = "skiff") {
  const profiles = {
    skiff: [
      [0, 0.52],
      [0.44, 0.16],
      [0.3, -0.52],
      [-0.3, -0.52],
      [-0.44, 0.16],
    ],
    clipper: [
      [0, 0.62],
      [0.34, 0.28],
      [0.48, -0.08],
      [0.24, -0.58],
      [-0.24, -0.58],
      [-0.48, -0.08],
      [-0.34, 0.28],
    ],
    brig: [
      [0, 0.48],
      [0.52, 0.18],
      [0.54, -0.18],
      [0.36, -0.56],
      [-0.36, -0.56],
      [-0.54, -0.18],
      [-0.52, 0.18],
    ],
    dart: [
      [0, 0.74],
      [0.24, 0.28],
      [0.18, -0.2],
      [0.12, -0.66],
      [-0.12, -0.66],
      [-0.18, -0.2],
      [-0.24, 0.28],
    ],
    junk: [
      [0, 0.42],
      [0.56, 0.14],
      [0.48, -0.36],
      [0.22, -0.6],
      [-0.22, -0.6],
      [-0.48, -0.36],
      [-0.56, 0.14],
    ],
    dhow: [
      [0, 0.68],
      [0.28, 0.34],
      [0.34, -0.12],
      [0.2, -0.68],
      [-0.2, -0.68],
      [-0.34, -0.12],
      [-0.28, 0.34],
    ],
    galleon: [
      [0, 0.38],
      [0.62, 0.16],
      [0.66, -0.1],
      [0.56, -0.42],
      [0.3, -0.7],
      [-0.3, -0.7],
      [-0.56, -0.42],
      [-0.66, -0.1],
      [-0.62, 0.16],
    ],
    cat: [
      [0, 0.54],
      [0.3, 0.16],
      [0.24, -0.58],
      [-0.24, -0.58],
      [-0.3, 0.16],
    ],
    turtle: [
      [0, 0.36],
      [0.68, 0.08],
      [0.62, -0.28],
      [0.42, -0.56],
      [0.14, -0.72],
      [-0.14, -0.72],
      [-0.42, -0.56],
      [-0.62, -0.28],
      [-0.68, 0.08],
    ],
    schooner: [
      [0, 0.58],
      [0.38, 0.26],
      [0.46, -0.12],
      [0.26, -0.64],
      [-0.26, -0.64],
      [-0.46, -0.12],
      [-0.38, 0.26],
    ],
    storm: [
      [0, 0.7],
      [0.22, 0.34],
      [0.44, 0.06],
      [0.3, -0.54],
      [-0.3, -0.54],
      [-0.44, 0.06],
      [-0.22, 0.34],
    ],
    cog: [
      [0, 0.38],
      [0.58, 0.12],
      [0.58, -0.42],
      [0.36, -0.64],
      [-0.36, -0.64],
      [-0.58, -0.42],
      [-0.58, 0.12],
    ],
    xebec: [
      [0, 0.76],
      [0.24, 0.42],
      [0.54, 0.02],
      [0.3, -0.64],
      [-0.3, -0.64],
      [-0.54, 0.02],
      [-0.24, 0.42],
    ],
    caravel: [
      [0, 0.52],
      [0.45, 0.22],
      [0.56, -0.18],
      [0.32, -0.66],
      [-0.32, -0.66],
      [-0.56, -0.18],
      [-0.45, 0.22],
    ],
    frigate: [
      [0, 0.58],
      [0.4, 0.28],
      [0.56, -0.06],
      [0.42, -0.56],
      [0.16, -0.74],
      [-0.16, -0.74],
      [-0.42, -0.56],
      [-0.56, -0.06],
      [-0.4, 0.28],
    ],
    carrack: [
      [0, 0.36],
      [0.68, 0.12],
      [0.7, -0.18],
      [0.5, -0.58],
      [0.22, -0.78],
      [-0.22, -0.78],
      [-0.5, -0.58],
      [-0.7, -0.18],
      [-0.68, 0.12],
    ],
    manowar: [
      [0, 0.42],
      [0.72, 0.18],
      [0.78, -0.1],
      [0.68, -0.48],
      [0.42, -0.76],
      [0.14, -0.86],
      [-0.14, -0.86],
      [-0.42, -0.76],
      [-0.68, -0.48],
      [-0.78, -0.1],
      [-0.72, 0.18],
    ],
    longship: [
      [0, 0.82],
      [0.22, 0.45],
      [0.34, 0],
      [0.22, -0.62],
      [0, -0.82],
      [-0.22, -0.62],
      [-0.34, 0],
      [-0.22, 0.45],
    ],
    knarr: [
      [0, 0.5],
      [0.52, 0.15],
      [0.46, -0.38],
      [0.22, -0.66],
      [-0.22, -0.66],
      [-0.46, -0.38],
      [-0.52, 0.15],
    ],
    lugger: [
      [0, 0.64],
      [0.34, 0.32],
      [0.46, -0.08],
      [0.26, -0.58],
      [-0.26, -0.58],
      [-0.46, -0.08],
      [-0.34, 0.32],
    ],
    galley: [
      [0, 0.78],
      [0.3, 0.36],
      [0.42, -0.06],
      [0.22, -0.68],
      [0, -0.82],
      [-0.22, -0.68],
      [-0.42, -0.06],
      [-0.3, 0.36],
    ],
    snow: [
      [0, 0.56],
      [0.42, 0.24],
      [0.54, -0.08],
      [0.34, -0.62],
      [-0.34, -0.62],
      [-0.54, -0.08],
      [-0.42, 0.24],
    ],
    fluyt: [
      [0, 0.42],
      [0.5, 0.16],
      [0.74, -0.16],
      [0.48, -0.56],
      [0.18, -0.7],
      [-0.18, -0.7],
      [-0.48, -0.56],
      [-0.74, -0.16],
      [-0.5, 0.16],
    ],
    treasure: [
      [0, 0.38],
      [0.78, 0.1],
      [0.76, -0.28],
      [0.48, -0.66],
      [0.18, -0.8],
      [-0.18, -0.8],
      [-0.48, -0.66],
      [-0.76, -0.28],
      [-0.78, 0.1],
    ],
    ironclad: [
      [0, 0.5],
      [0.7, 0.24],
      [0.72, -0.34],
      [0.42, -0.68],
      [-0.42, -0.68],
      [-0.72, -0.34],
      [-0.7, 0.24],
    ],
  };
  const points = profiles[profile] || profiles.skiff;
  const top = points.map(([x, z]) => {
    const endLift = Math.pow(Math.abs(z), 1.75) * height * 0.28;
    const sternLift = z > 0.32 ? height * 0.14 : 0;
    return new THREE.Vector3(x * width, height + endLift + sternLift, z * length);
  });
  const chine = points.map(([x, z]) => {
    const endLift = Math.pow(Math.abs(z), 1.5) * height * 0.08;
    return new THREE.Vector3(x * width * 0.82, height * 0.46 + endLift, z * length * 0.95);
  });
  const keel = points.map(([x, z]) => {
    const pointedEnd = Math.abs(z) > 0.5 ? 0.35 : 0.48;
    return new THREE.Vector3(x * width * pointedEnd, 0, z * length * 0.82);
  });
  const vertices = [];
  const indices = [];
  [...top, ...chine, ...keel].forEach((p) => vertices.push(p.x, p.y, p.z));
  const n = points.length;
  const topCenter = vertices.length / 3;
  vertices.push(0, height * 1.04, -length * 0.06);
  const keelCenter = vertices.length / 3;
  vertices.push(0, -height * 0.12, -length * 0.02);
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    const topA = i;
    const topB = next;
    const chineA = n + i;
    const chineB = n + next;
    const keelA = n * 2 + i;
    const keelB = n * 2 + next;
    indices.push(topCenter, topA, topB);
    indices.push(topA, chineA, chineB, topA, chineB, topB);
    indices.push(chineA, keelA, keelB, chineA, keelB, chineB);
    indices.push(keelCenter, keelB, keelA);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addSail(group, x, z, scale, color = 0xfff4da) {
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * scale, 0.14 * scale, 5.5 * scale, 7), mats.dark);
  mast.position.set(x, 3.2 * scale, z);
  mast.castShadow = true;
  group.add(mast);
  const sail = lateenPanel(2.35 * scale, 3.55 * scale, color, 0.18 * scale);
  sail.position.set(x + 0.35 * scale, 3.5 * scale, z - 0.08 * scale);
  sail.rotation.z = -0.1;
  group.add(sail);
  const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * scale, 0.055 * scale, 3.95 * scale, 7), mats.wood);
  yard.rotation.z = Math.PI / 2.45;
  yard.position.set(x + 0.1 * scale, 4.0 * scale, z - 0.1 * scale);
  yard.castShadow = true;
  group.add(yard);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * scale, 0.048 * scale, 2.55 * scale, 7), mats.wood);
  boom.rotation.z = Math.PI / 2.05;
  boom.position.set(x + 0.28 * scale, 2.35 * scale, z - 0.08 * scale);
  group.add(boom);
  addRope(group, new THREE.Vector3(x, 5.85 * scale, z), new THREE.Vector3(x - 1.05 * scale, 2.15 * scale, z - 1.45 * scale), scale);
  addRope(group, new THREE.Vector3(x, 5.85 * scale, z), new THREE.Vector3(x + 1.3 * scale, 2.2 * scale, z + 1.35 * scale), scale);
}

function addSquareSail(group, x, z, scale, color = 0xfff4da, tiers = 1) {
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.16 * scale, (5.2 + tiers) * scale, 7), mats.dark);
  mast.position.set(x, 3.25 * scale, z);
  mast.castShadow = true;
  group.add(mast);
  for (let i = 0; i < tiers; i++) {
    const y = (3.15 + i * 1.15) * scale;
    const sailWidth = (2.35 - i * 0.28) * scale;
    const sailHeight = (1.08 - i * 0.06) * scale;
    const sail = clothPanel(sailWidth, sailHeight, color, 0.16 * scale);
    sail.position.set(x, y, z - 0.05 * scale);
    group.add(sail);
    const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * scale, 0.045 * scale, (2.55 - i * 0.2) * scale, 6), mats.dark);
    yard.rotation.z = Math.PI / 2;
    yard.position.set(x, y + 0.5 * scale, z - 0.08 * scale);
    group.add(yard);
    for (let seam = -1; seam <= 1; seam += 2) {
      addRope(
        group,
        new THREE.Vector3(x - sailWidth * 0.45, y + seam * sailHeight * 0.18, z - 0.11 * scale),
        new THREE.Vector3(x + sailWidth * 0.45, y + seam * sailHeight * 0.18, z - 0.11 * scale),
        scale,
        0.014,
      );
    }
    addRope(group, new THREE.Vector3(x, (5.75 + tiers * 0.35) * scale, z), new THREE.Vector3(x - (1.25 - i * 0.1) * scale, y + 0.45 * scale, z), scale * 0.82);
    addRope(group, new THREE.Vector3(x, (5.75 + tiers * 0.35) * scale, z), new THREE.Vector3(x + (1.25 - i * 0.1) * scale, y + 0.45 * scale, z), scale * 0.82);
  }
}

function addRope(group, start, end, scale = 1, radius = 0.022) {
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(radius * scale, radius * scale, 1, 6), mats.rope);
  setCylinderBetween(rope, start, end);
  group.add(rope);
  return rope;
}

function sailMaterial(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.96, metalness: 0, side: THREE.DoubleSide });
}

function clothPanel(width, height, color, belly = 0.16) {
  const vertices = [];
  const indices = [];
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      const u = x / 2;
      const v = y / 2;
      const curve = Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * belly;
      vertices.push((u - 0.5) * width, (v - 0.5) * height, curve);
    }
  }
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 2; x++) {
      const a = y * 3 + x;
      indices.push(a, a + 1, a + 3, a + 1, a + 4, a + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const sail = new THREE.Mesh(geo, sailMaterial(color));
  sail.castShadow = true;
  return sail;
}

function lateenPanel(width, height, color, belly = 0.14) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute([
    width * 0.38, height * 0.52, 0,
    -width * 0.55, -height * 0.44, 0,
    width * 0.5, -height * 0.34, 0,
    width * 0.06, -height * 0.06, belly,
  ], 3));
  geo.setIndex([0, 1, 3, 0, 3, 2, 1, 2, 3]);
  geo.computeVertexNormals();
  const sail = new THREE.Mesh(geo, sailMaterial(color));
  sail.castShadow = true;
  return sail;
}

function addCabin(group, x, z, width, depth, scale, color = 0x6b432b) {
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(width * scale, 1.0 * scale, depth * scale), mat(color));
  cabin.position.set(x, 2.05 * scale, z);
  cabin.castShadow = true;
  group.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry((width + 0.35) * scale, 0.22 * scale, (depth + 0.28) * scale), mat(0x2f3342));
  roof.position.set(x, 2.65 * scale, z);
  roof.castShadow = true;
  group.add(roof);
  for (let side of [-1, 1]) {
    const window = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 0.34 * scale, 0.38 * scale), mats.gold);
    window.position.set(x + side * (width * 0.52) * scale, 2.1 * scale, z);
    group.add(window);
  }
}

function addCannonPorts(group, count, width, length, scale) {
  for (let i = 0; i < count; i++) {
    const z = (-length * 0.28 + (i / Math.max(1, count - 1)) * length * 0.55) * scale;
    for (let side of [-1, 1]) {
      const port = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 0.28 * scale, 0.32 * scale), mats.dark);
      port.position.set(side * width * 0.43 * scale, 1.58 * scale, z);
      group.add(port);
      const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, 0.5 * scale, 8), mats.dark);
      muzzle.rotation.z = Math.PI / 2;
      muzzle.position.set(side * width * 0.5 * scale, 1.58 * scale, z);
      group.add(muzzle);
    }
  }
}

function addOars(group, count, width, length, scale) {
  for (let i = 0; i < count; i++) {
    const z = (-length * 0.28 + i * length * 0.56 / Math.max(1, count - 1)) * scale;
    for (let side of [-1, 1]) {
      const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * scale, 0.035 * scale, 2.4 * scale, 6), mats.wood);
      oar.rotation.z = Math.PI / 2.7 * side;
      oar.position.set(side * width * 0.64 * scale, 1.1 * scale, z);
      group.add(oar);
    }
  }
}

function addHullDetailLines(group, length, width, scale, tier) {
  const rows = 2 + Math.min(3, tier);
  for (let side of [-1, 1]) {
    for (let row = 0; row < rows; row++) {
      const y = (0.55 + row * 0.23) * scale;
      const inset = row * 0.035;
      const x = side * width * (0.34 - inset) * scale;
      const front = new THREE.Vector3(x * 0.62, y, -length * 0.37 * scale);
      const mid = new THREE.Vector3(x, y + 0.04 * scale, -length * 0.03 * scale);
      const back = new THREE.Vector3(x * 0.7, y, length * 0.34 * scale);
      addRope(group, front, mid, scale, 0.018);
      addRope(group, mid, back, scale, 0.018);
    }
    const ribCount = 4 + tier;
    for (let i = 0; i < ribCount; i++) {
      const t = i / Math.max(1, ribCount - 1);
      const z = (-length * 0.33 + t * length * 0.66) * scale;
      const curve = 0.72 + Math.sin(t * Math.PI) * 0.28;
      const x = side * width * 0.38 * curve * scale;
      addRope(group, new THREE.Vector3(x, 0.38 * scale, z), new THREE.Vector3(x * 0.92, 1.34 * scale, z), scale, 0.026);
    }
  }
}

function addDeckFittings(group, length, width, scale, tier, color) {
  const hatch = hullMesh(1.0 * scale, 0.72 * scale, 0.12 * scale, mats.hullDark, "skiff");
  hatch.position.set(0, 1.45 * scale, -0.35 * scale);
  hatch.scale.z = 0.72;
  group.add(hatch);
  const cargoCount = 1 + Math.min(3, tier);
  for (let i = 0; i < cargoCount; i++) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.2 * scale, 0.44 * scale, 8), mats.wood);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(((i % 2) ? 0.52 : -0.52) * width * 0.22 * scale, 1.52 * scale, (0.18 + i * 0.52) * scale);
    group.add(barrel);
  }
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.22 * scale, 0.035 * scale, 8, 18), mats.rope);
  coil.rotation.x = Math.PI / 2;
  coil.position.set(width * 0.17 * scale, 1.55 * scale, -length * 0.16 * scale);
  group.add(coil);
  const anchor = new THREE.Mesh(new THREE.TorusGeometry(0.22 * scale, 0.045 * scale, 8, 16, Math.PI * 1.3), mats.dark);
  anchor.position.set(-width * 0.38 * scale, 1.15 * scale, -length * 0.42 * scale);
  anchor.rotation.set(Math.PI / 2, 0, 0.45);
  group.add(anchor);
  if (tier >= 2) {
    for (let side of [-1, 1]) {
      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.14 * scale, 8, 6), mats.gold);
      lantern.position.set(side * width * 0.36 * scale, 2.0 * scale, length * 0.36 * scale);
      group.add(lantern);
    }
  }
  if (tier >= 3) {
    const crest = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.22 * scale, 0.08 * scale, 16), mat(color));
    crest.rotation.x = Math.PI / 2;
    crest.position.set(0, 2.15 * scale, length * 0.44 * scale);
    group.add(crest);
  }
}

function addBowspritAndRudder(group, length, width, scale, tier) {
  const bowsprit = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * scale, 0.075 * scale, (1.5 + tier * 0.22) * scale, 7), mats.wood);
  bowsprit.rotation.x = Math.PI / 2.25;
  bowsprit.position.set(0, 1.6 * scale, -length * 0.57 * scale);
  group.add(bowsprit);
  const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.1 * scale, 0.62 * scale, 0.42 * scale), mats.hullDark);
  rudder.position.set(0, 0.78 * scale, length * 0.48 * scale);
  group.add(rudder);
}

function addHistoricalDetails(group, type, hullLength, hullWidth, scale, spec) {
  const tier = spec.price > 16000 ? 5 : spec.price > 10000 ? 4 : spec.price > 5500 ? 3 : spec.price > 2500 ? 2 : spec.price > 800 ? 1 : 0;
  addHullDetailLines(group, hullLength, hullWidth, scale, tier);
  addDeckFittings(group, hullLength, hullWidth, scale, tier, spec.color);
  addBowspritAndRudder(group, hullLength, hullWidth, scale, tier);
  if (tier >= 1) addCannonPorts(group, 2 + tier, hullWidth, hullLength, scale);
  if (tier >= 2) addCabin(group, 0, hullLength * 0.22, Math.min(2.4, hullWidth * 0.68), 1.35 + tier * 0.18, scale, type === "galleon" || type === "carrack" || type === "manowar" ? 0x563a48 : 0x7a5030);
  if (tier >= 3) {
    addCabin(group, 0, -hullLength * 0.24, Math.min(2.0, hullWidth * 0.58), 1.0, scale * 0.9, 0x604237);
    const figure = new THREE.Mesh(new THREE.ConeGeometry(0.22 * scale, 0.95 * scale, 8), mats.gold);
    figure.rotation.x = Math.PI / 2;
    figure.position.set(0, 1.65 * scale, -hullLength * 0.6 * scale);
    group.add(figure);
  }
  if (type === "skiff" || type === "cog" || type === "cat" || type === "longship" || type === "galley") {
    addOars(group, type === "galley" ? 8 : type === "longship" ? 7 : type === "cat" ? 4 : 3, hullWidth, hullLength, scale);
  }
}

function makeShip(type = "skiff", remote = false) {
  const spec = getShipStats(type);
  const group = new THREE.Group();
  group.userData.shipType = type;
  const scale = {
    shallop: 0.86,
    pinnace: 0.88,
    dart: 0.82,
    cat: 0.92,
    longship: 0.92,
    dogger: 0.96,
    sloop: 0.94,
    tartane: 0.96,
    storm: 0.92,
    brig: 1.12,
    brigantine: 1.1,
    packet: 1.05,
    barquentine: 1.12,
    barque: 1.15,
    bombketch: 1.22,
    turtle: 1.22,
    corvette: 1.16,
    frigate: 1.22,
    razee: 1.28,
    galleon: 1.28,
    merchantman: 1.28,
    eastindiaman: 1.34,
    carrack: 1.34,
    treasure: 1.48,
    fourthrate: 1.38,
    manowar: 1.42,
    firstrate: 1.5,
    ironclad: 1.48,
  }[type] || 1;
  const hullSize = {
    shallop: [5.6, 1.85],
    pinnace: [6.5, 1.75],
    hoy: [5.7, 2.75],
    dart: [7.7, 1.75],
    clipper: [7.4, 2.35],
    galleon: [7.2, 3.25],
    brig: [6.9, 3.05],
    brigantine: [7.2, 2.75],
    cat: [5.8, 1.45],
    turtle: [6.2, 3.55],
    bombketch: [6.4, 3.4],
    storm: [8.1, 2.25],
    sloop: [7.4, 2.0],
    dhow: [7.1, 2.25],
    cog: [6.2, 3.05],
    hoy: [5.9, 2.85],
    dogger: [6.6, 2.2],
    xebec: [8.3, 2.4],
    tartane: [7.2, 2.15],
    caravel: [6.9, 2.65],
    pink: [6.6, 2.55],
    ketch: [6.9, 2.5],
    frigate: [8.2, 2.9],
    corvette: [7.8, 2.65],
    razee: [8.5, 3.0],
    carrack: [7.4, 3.5],
    manowar: [8.4, 3.8],
    fourthrate: [8.3, 3.65],
    firstrate: [9.0, 4.0],
    longship: [8.7, 1.7],
    knarr: [6.5, 2.6],
    lugger: [7.0, 2.15],
    galley: [8.8, 2.2],
    snow: [7.5, 2.8],
    packet: [7.8, 2.45],
    barquentine: [7.7, 2.55],
    barque: [8.0, 2.8],
    fluyt: [7.0, 3.4],
    merchantman: [7.4, 3.45],
    eastindiaman: [7.8, 3.55],
    treasure: [8.0, 4.15],
    ironclad: [7.8, 3.7],
  }[type] || [6.5, 2.7];
  const profile = spec.model || type;
  const darkHulled = ["brig", "brigantine", "corvette", "frigate", "razee", "galleon", "eastindiaman", "carrack", "fourthrate", "manowar", "firstrate", "ironclad"].includes(type);
  group.add(hullMesh(hullSize[0] * scale, hullSize[1] * scale, 1.15 * scale, darkHulled ? mats.hullDark : mats.hull, profile));
  [-1, 1].forEach((side) => {
    const accent = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * scale, 0.055 * scale, 4.7 * scale, 8), mat(spec.color));
    accent.rotation.x = Math.PI / 2;
    accent.position.set(side * (hullSize[1] * 0.36) * scale, 1.42 * scale, 0.15 * scale);
    accent.castShadow = true;
    group.add(accent);
  });
  const deck = hullMesh(hullSize[0] * 0.58 * scale, hullSize[1] * 0.62 * scale, 0.24 * scale, mats.wood, profile);
  deck.position.y = 1.08 * scale;
  deck.castShadow = true;
  group.add(deck);

  [-1, 1].forEach((side) => {
    const railPath = [];
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const z = (-hullSize[0] * 0.27 + t * hullSize[0] * 0.54) * scale;
      const centerPull = 1 - Math.abs(t - 0.5) * 1.2;
      const x = side * hullSize[1] * (0.23 + centerPull * 0.17) * scale;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * scale, 0.055 * scale, 0.52 * scale, 6), mats.wood);
      post.position.set(x, 1.7 * scale, z);
      post.castShadow = true;
      group.add(post);
      railPath.push(new THREE.Vector3(x, 1.96 * scale, z));
    }
    for (let i = 1; i < railPath.length; i++) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * scale, 0.04 * scale, 1, 6), mats.wood);
      setCylinderBetween(rail, railPath[i - 1], railPath[i]);
      rail.castShadow = true;
      group.add(rail);
    }
  });
  const stemPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.13 * scale, 1.25 * scale, 7), mat(spec.color));
  stemPost.position.set(0, 1.2 * scale, (-hullSize[0] * 0.51) * scale);
  stemPost.rotation.x = -0.28;
  stemPost.castShadow = true;
  group.add(stemPost);
  const sternPost = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * scale, 0.11 * scale, 1.05 * scale, 7), mats.hullDark);
  sternPost.position.set(0, 1.14 * scale, (hullSize[0] * 0.48) * scale);
  sternPost.rotation.x = 0.2;
  sternPost.castShadow = true;
  group.add(sternPost);
  const keelLine = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * scale, 0.045 * scale, hullSize[0] * 0.78 * scale, 6), mats.dark);
  keelLine.rotation.x = Math.PI / 2;
  keelLine.position.set(0, 0.16 * scale, -0.05 * scale);
  group.add(keelLine);
  const pennant = lateenPanel(0.9 * scale, 0.42 * scale, spec.color, 0.035 * scale);
  pennant.position.set(0.42 * scale, 5.25 * scale, -0.2 * scale);
  group.add(pennant);
  if (type === "clipper") {
    addSquareSail(group, -0.25, -1.35, 0.92, 0xfff3ce, 2);
    addSquareSail(group, 0.35, 0.9, 0.78, 0xffdf9b, 2);
  } else if (type === "brig" || type === "brigantine") {
    addSquareSail(group, -0.45, -1.1, 0.9, 0xf2ead5, 2);
    if (type === "brigantine") addSail(group, 0.55, 1.15, 0.86, 0xf8efd8);
    else addSquareSail(group, 0.55, 1.15, 0.86, 0xf8efd8, 2);
    const armor = hullMesh(5.2 * scale, 3.0 * scale, 0.16 * scale, mat(0x65717b), "brig");
    armor.position.y = 1.02 * scale;
    group.add(armor);
  } else if (type === "junk") {
    addSquareSail(group, -0.3, -0.7, 0.9, 0xf4e1b4, 3);
    addSquareSail(group, 0.45, 1.25, 0.68, 0xf0dba2, 2);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 1.5), mat(0xb7493f));
    roof.position.set(0, 2, 1.6);
    group.add(roof);
  } else if (type === "galleon") {
    addSquareSail(group, -0.7, -1.8, 0.95, 0xf6ead0, 2);
    addSquareSail(group, 0.7, 0.15, 1.08, 0xf8df88, 3);
    addSquareSail(group, 0, 2.15, 0.82, 0xf6ead0, 2);
    addCabin(group, 0, 2.45, 2.65, 1.8, scale, 0x563a48);
  } else if (type === "merchantman" || type === "eastindiaman") {
    addSquareSail(group, -0.8, -1.75, 0.92, 0xf3e5c8, 2);
    addSquareSail(group, 0.25, 0.15, 1.02, 0xf7edcf, 2);
    addSquareSail(group, 0.9, 1.95, 0.74, 0xf3e5c8, 1);
    addCabin(group, 0, 2.45, 2.8, 1.85, scale, type === "eastindiaman" ? 0x6a4636 : 0x7a5030);
    addDeckFittings(group, hullSize[0], hullSize[1], scale, 3, spec.color);
  } else if (type === "shallop") {
    addSail(group, 0, -0.1, 0.72, 0xf6ead0);
    addOars(group, 3, hullSize[1], hullSize[0], scale);
  } else if (type === "pinnace") {
    addSail(group, -0.22, -0.9, 0.72, 0xd9f8ff);
    addSail(group, 0.28, 0.75, 0.62, 0xf7f0df);
    addCabin(group, 0, 1.55, 1.35, 0.85, scale * 0.75, 0x76523d);
  } else if (type === "dart") {
    addSail(group, 0, 0, 0.75, 0xc8fbff);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.65, 2.2, 8), mat(0xf2f8ef));
    nose.position.set(0, 0.9, -3.55);
    nose.rotation.x = Math.PI / 2;
    group.add(nose);
  } else if (type === "schooner" || type === "packet") {
    addSail(group, -0.35, -1.4, 0.82, 0xd8f5ff);
    addSail(group, 0.35, 0.9, 1.08, 0xbfefff);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 1.1), mat(0x9ee8ff));
    glass.position.set(0, 2, 1.9);
    group.add(glass);
    if (type === "packet") addSquareSail(group, -0.65, -2.0, 0.62, 0xf8efd8, 1);
  } else if (type === "cat") {
    const outriggerA = hullMesh(5.7 * scale, 0.85 * scale, 0.65 * scale, mats.hull, "dart");
    const outriggerB = hullMesh(5.7 * scale, 0.85 * scale, 0.65 * scale, mats.hull, "dart");
    outriggerA.position.x = -2.2 * scale;
    outriggerB.position.x = 2.2 * scale;
    group.add(outriggerA, outriggerB);
    addSail(group, 0, -0.15, 0.95, 0xffe1d0);
  } else if (type === "dhow") {
    addSail(group, 0.25, -0.25, 1.18, 0xffefbe);
    const prow = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.08, 6, 14, Math.PI), mat(0xf0d05a));
    prow.position.set(0, 1.5, -3.55);
    prow.rotation.x = Math.PI / 2;
    group.add(prow);
  } else if (type === "bombketch") {
    addSquareSail(group, -0.4, -1.4, 0.74, 0xe7dcc4, 1);
    addSail(group, 0.45, 1.0, 0.7, 0xf4ead8);
    const mortarBed = new THREE.Mesh(new THREE.CylinderGeometry(0.62 * scale, 0.7 * scale, 0.36 * scale, 12), mat(0x3f3b35));
    mortarBed.position.set(0, 1.72 * scale, -0.15 * scale);
    group.add(mortarBed);
    const mortar = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.32 * scale, 0.7 * scale, 12), mats.dark);
    mortar.rotation.x = -0.75;
    mortar.position.set(0, 2.0 * scale, -0.25 * scale);
    group.add(mortar);
    addCabin(group, 0, 2.05, 1.9, 1.2, scale * 0.9, 0x58463a);
  } else if (type === "turtle") {
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1.85 * scale, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x456b4b));
    shell.position.y = 1.45 * scale;
    shell.scale.z = 1.55;
    group.add(shell);
    addSail(group, 0, 0.5, 0.72, 0xd8f0c8);
  } else if (type === "sloop") {
    addSail(group, -0.05, -0.9, 1.08, 0xd8f8ff);
    addSail(group, 0.35, 1.45, 0.68, 0xf8f4e5);
    addCabin(group, 0, 1.9, 1.35, 0.85, scale * 0.82, 0x624534);
  } else if (type === "storm") {
    addSail(group, -0.15, -1.05, 1.05, 0xc8cdfd);
    addSail(group, 0.2, 1.35, 0.82, 0xf4f4ff);
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.6, 6), mat(0xdfe7ff));
    blade.position.set(0, 1.15, -3.8);
    blade.rotation.x = Math.PI / 2;
    group.add(blade);
  } else if (type === "cog" || type === "hoy") {
    addSquareSail(group, 0, -0.2, 0.92, 0xf1e5c4, 1);
    addCabin(group, 0, 2.0, 2.0, 1.0, scale * 0.85, 0x7a5030);
    const highStern = new THREE.Mesh(new THREE.BoxGeometry(2.3 * scale, 0.85 * scale, 0.9 * scale), mat(0x7a5030));
    highStern.position.set(0, 2.0 * scale, 2.65 * scale);
    group.add(highStern);
  } else if (type === "longship") {
    addSquareSail(group, 0, -0.15, 0.78, 0xf4d2b8, 1);
    const dragon = new THREE.Mesh(new THREE.ConeGeometry(0.28 * scale, 1.1 * scale, 8), mat(0xd8b24a));
    dragon.rotation.x = Math.PI / 2.25;
    dragon.position.set(0, 1.85 * scale, -4.15 * scale);
    group.add(dragon);
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.34 * scale, 0.055 * scale, 8, 16, Math.PI), mats.hullDark);
    tail.position.set(0, 1.75 * scale, 3.8 * scale);
    tail.rotation.x = -Math.PI / 2;
    group.add(tail);
  } else if (type === "knarr") {
    addSquareSail(group, 0, -0.25, 0.86, 0xead7a8, 1);
    addCabin(group, 0, 1.85, 1.7, 1.0, scale * 0.8, 0x8b5a32);
    addDeckFittings(group, hullSize[0], hullSize[1], scale, 2, spec.color);
  } else if (type === "lugger" || type === "dogger") {
    addSail(group, -0.25, -1.2, 0.82, 0xe9f0dc);
    addSail(group, 0.35, 1.05, 0.78, 0xdfe8cf);
    const net = new THREE.Mesh(new THREE.TorusGeometry(0.42 * scale, 0.035 * scale, 8, 18), mats.rope);
    net.rotation.x = Math.PI / 2;
    net.position.set(-0.72 * scale, 1.6 * scale, 0.7 * scale);
    group.add(net);
  } else if (type === "xebec" || type === "tartane") {
    addSail(group, -0.65, -1.65, 0.88, 0xffead6);
    addSail(group, 0.15, 0.05, 1.08, 0xfff4df);
    if (type === "xebec") addSail(group, 0.75, 1.75, 0.78, 0xffead6);
    addOars(group, type === "xebec" ? 5 : 3, hullSize[1], hullSize[0], scale);
  } else if (type === "galley") {
    addSail(group, -0.2, -0.65, 1.0, 0xf8e8bc);
    addOars(group, 9, hullSize[1], hullSize[0], scale);
    const ram = new THREE.Mesh(new THREE.ConeGeometry(0.22 * scale, 1.6 * scale, 6), mats.gold);
    ram.rotation.x = Math.PI / 2;
    ram.position.set(0, 0.75 * scale, -4.35 * scale);
    group.add(ram);
  } else if (type === "caravel" || type === "pink" || type === "ketch") {
    addSquareSail(group, -0.45, -1.2, 0.85, 0xf5ead3, 1);
    addSail(group, 0.45, 0.8, 0.95, 0xf8efd8);
    if (type === "ketch") addSail(group, 0.9, 2.05, 0.62, 0xf5ead3);
    addCabin(group, 0, 2.05, 2.0, 1.15, scale * 0.9, 0x77513a);
  } else if (type === "snow" || type === "barque" || type === "barquentine") {
    addSquareSail(group, -0.45, -1.35, 0.9, 0xf4f0dd, 2);
    if (type === "barquentine") addSail(group, 0.45, 0.8, 0.86, 0xe4edf7);
    else addSquareSail(group, 0.45, 0.8, 0.84, 0xe4edf7, 2);
    addSail(group, 0.75, 2.1, 0.62, 0xf4f0dd);
  } else if (type === "fluyt") {
    addSquareSail(group, -0.55, -1.35, 0.85, 0xf3e2c4, 2);
    addSquareSail(group, 0.35, 0.65, 0.95, 0xf7ead2, 2);
    addCabin(group, 0, 2.25, 2.45, 1.55, scale, 0x7a5030);
    const cargoHouse = hullMesh(2.0 * scale, 2.1 * scale, 0.35 * scale, mats.plank, "fluyt");
    cargoHouse.position.y = 1.55 * scale;
    group.add(cargoHouse);
  } else if (type === "frigate" || type === "corvette" || type === "razee") {
    addSquareSail(group, -0.8, -1.8, 0.9, 0xf2ead5, 2);
    addSquareSail(group, 0, 0, 1.02, 0xf8efd8, 3);
    addSquareSail(group, 0.78, 1.85, type === "corvette" ? 0.68 : 0.78, 0xf2ead5, type === "corvette" ? 1 : 2);
    if (type === "razee") addCabin(group, 0, 2.65, 2.65, 1.65, scale, 0x4f3a35);
  } else if (type === "carrack") {
    addSquareSail(group, -0.55, -1.6, 0.95, 0xf6ead0, 2);
    addSquareSail(group, 0.55, 0.25, 1.04, 0xf8e7bb, 2);
    addSail(group, 0, 2.0, 0.86, 0xf6ead0);
    addCabin(group, 0, 2.55, 2.9, 2.1, scale, 0x694432);
    const forecastle = new THREE.Mesh(new THREE.BoxGeometry(2.15 * scale, 1.05 * scale, 1.15 * scale), mat(0x694432));
    forecastle.position.set(0, 2.25 * scale, -2.75 * scale);
    group.add(forecastle);
  } else if (type === "manowar" || type === "fourthrate" || type === "firstrate") {
    const sailBoost = type === "firstrate" ? 1.08 : type === "fourthrate" ? 0.96 : 1;
    addSquareSail(group, -0.9, -2.1, 1.0 * sailBoost, 0xf6ead0, type === "fourthrate" ? 2 : 3);
    addSquareSail(group, 0, -0.1, 1.08 * sailBoost, 0xf8e7bb, 3);
    addSquareSail(group, 0.9, 2.0, 0.95 * sailBoost, 0xf6ead0, type === "firstrate" ? 3 : 2);
    addCabin(group, 0, 2.75, type === "firstrate" ? 3.55 : 3.2, 2.2, scale, 0x503b34);
    const gunDeck = hullMesh(5.9 * scale, 3.35 * scale, 0.14 * scale, mat(0x252833), "manowar");
    gunDeck.position.y = 1.7 * scale;
    group.add(gunDeck);
  } else if (type === "treasure") {
    addSquareSail(group, -0.85, -1.8, 1.05, 0xf5df9b, 3);
    addSquareSail(group, 0.25, 0.1, 1.18, 0xf8e8aa, 3);
    addSquareSail(group, 0.9, 2.15, 0.95, 0xf1d98d, 2);
    addCabin(group, 0, 2.55, 3.15, 2.2, scale, 0x9d4b3e);
    const pagoda = new THREE.Mesh(new THREE.ConeGeometry(1.35 * scale, 0.75 * scale, 4), mat(0xd6a83c));
    pagoda.position.set(0, 3.35 * scale, 2.55 * scale);
    pagoda.rotation.y = Math.PI / 4;
    group.add(pagoda);
  } else if (type === "ironclad") {
    const armorDeck = hullMesh(5.8 * scale, 3.0 * scale, 0.28 * scale, mat(0x4f555b), "ironclad");
    armorDeck.position.y = 1.28 * scale;
    group.add(armorDeck);
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.72 * scale, 0.78 * scale, 0.48 * scale, 14), mat(0x30363b));
    turret.position.set(0, 1.88 * scale, -0.35 * scale);
    group.add(turret);
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.14 * scale, 1.8 * scale, 10), mats.dark);
    gun.rotation.x = Math.PI / 2;
    gun.position.set(0, 1.88 * scale, -1.45 * scale);
    group.add(gun);
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * scale, 0.28 * scale, 1.25 * scale, 10), mats.dark);
    stack.position.set(0.72 * scale, 2.2 * scale, 1.0 * scale);
    group.add(stack);
  } else {
    addSail(group, 0, 0.2, 0.86);
  }
  addHistoricalDetails(group, type, hullSize[0], hullSize[1], scale, spec);
  const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * scale, 0.2 * scale, 1.5 * scale, 8), mats.dark);
  cannon.rotation.z = Math.PI / 2;
  cannon.position.set(0, 1.7 * scale, -1.65 * scale);
  group.add(cannon);
  const visual = new THREE.Group();
  while (group.children.length) visual.add(group.children[0]);
  visual.rotation.y = Math.PI;
  group.add(visual);
  group.traverse((obj) => {
    obj.castShadow = obj.castShadow || obj.isMesh;
    obj.receiveShadow = obj.receiveShadow || obj.isMesh;
  });
  if (remote) group.scale.setScalar(0.86);
  return group;
}

function makeCharacter() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.1, 4, 8), mat(0x2c5f80));
  body.position.y = 1.1;
  body.castShadow = true;
  group.add(body);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.55, 8), mat(0xd9a028));
  hat.position.y = 2.15;
  hat.castShadow = true;
  group.add(hat);
  group.visible = false;
  scene.add(group);
  return group;
}

function makeProjectile(owner, pos, dir, damage, range) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), mats.dark);
  mesh.position.copy(pos);
  mesh.position.y = 1.2;
  mesh.castShadow = true;
  scene.add(mesh);
  projectiles.push({ owner, mesh, dir: dir.clone(), speed: 52, life: range / 52, damage });
}

function makeFish() {
  const group = new THREE.Group();
  const rippleMat = new THREE.MeshBasicMaterial({ color: 0xd9fbff, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  const ripple = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.72, 18), rippleMat);
  ripple.rotation.x = -Math.PI / 2;
  group.add(ripple);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.46, 4), mat(0x267c94));
  fin.position.y = 0.22;
  fin.rotation.x = Math.PI / 2;
  group.add(fin);
  group.position.set((Math.random() - 0.5) * 250, 0.15, (Math.random() - 0.5) * 250);
  group.userData.phase = Math.random() * 20;
  scene.add(group);
  fish.push(group);
}

function dropCrates(pos, count) {
  for (let i = 0; i < count; i++) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.05, 1.25), mats.crate);
    crate.position.set(pos.x + (Math.random() - 0.5) * 5, 0.65, pos.z + (Math.random() - 0.5) * 5);
    crate.rotation.y = Math.random() * Math.PI;
    crate.castShadow = true;
    scene.add(crate);
    crates.push({ mesh: crate, heal: 18 + Math.random() * 22, xp: 12 + Math.random() * 18 });
  }
}

function clearFishingRig() {
  if (fishingLine) scene.remove(fishingLine);
  if (fishingBobber) scene.remove(fishingBobber);
  fishingLine = null;
  fishingBobber = null;
}

function nearestFishTo(point, maxDistance) {
  let best = null;
  let bestDist = maxDistance;
  fish.forEach((item) => {
    const d = dist2(point, item.position);
    if (d < bestDist) {
      best = item;
      bestDist = d;
    }
  });
  return best;
}

function startFishing(dir) {
  if (state.fishing) return toast("Already reeling. Hold steady.");
  const castPoint = playerShip.position.clone().add(dir.clone().multiplyScalar(12 + Math.random() * 8));
  castPoint.y = 0.18;
  let target = nearestFishTo(castPoint, 32);
  if (!target) {
    target = new THREE.Group();
    target.position.copy(castPoint).add(new THREE.Vector3((Math.random() - 0.5) * 9, 0, (Math.random() - 0.5) * 9));
    target.userData.phase = Math.random() * 10;
    scene.add(target);
    fish.push(target);
  }
  fishingBobber = new THREE.Group();
  const bobberCore = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), mat(0xf4f1df));
  bobberCore.position.y = 0.18;
  fishingBobber.add(bobberCore);
  const bobberTop = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), mat(0xd84b3d));
  bobberTop.position.y = 0.48;
  fishingBobber.add(bobberTop);
  const splash = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.0, 24), new THREE.MeshBasicMaterial({ color: 0xd9fbff, transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
  splash.rotation.x = -Math.PI / 2;
  fishingBobber.add(splash);
  fishingBobber.position.copy(castPoint);
  scene.add(fishingBobber);
  fishingLine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 1, 8),
    new THREE.MeshBasicMaterial({ color: 0xf8f4e5, transparent: true, opacity: 0.92 })
  );
  setCylinderBetween(fishingLine, playerShip.position.clone().add(new THREE.Vector3(0, 1.45, 0)), castPoint.clone());
  scene.add(fishingLine);
  state.fishing = {
    target,
    castPoint: castPoint.clone(),
    timer: 0,
    biteTime: 1.2 + Math.random() * 3.2,
    reelTime: 0.9 + Math.random() * 1.25,
    phase: "waiting",
  };
  toast("Line cast. Waiting for a bite...");
}

function finishFishing() {
  const target = state.fishing?.target;
  if (target && fish.includes(target)) {
    scene.remove(target);
    fish.splice(fish.indexOf(target), 1);
  }
  clearFishingRig();
  state.fishing = null;
  state.gold += 16 + state.level * 3 + Math.floor(Math.random() * 14);
  addXP(22 + Math.floor(Math.random() * 10));
  toast("Fish reeled in after a hard pull.");
  makeFish();
}

function alertBot(bot, seconds = 24) {
  bot.agroUntil = Math.max(bot.agroUntil || 0, clock.elapsedTime + seconds + bot.level * 0.8);
  bot.target = playerShip.position.clone();
  bot.turn = Math.min(bot.turn || 0, 0.2);
  bot.fireCooldown = Math.min(bot.fireCooldown || 1.5, 0.7);
}

function damageTarget(target, amount) {
  const armor = target.isBot ? getShipStats(target.shipType).armor : getShipStats().armor;
  target.hp -= amount * (1 - armor);
  if (target.isBot && target.hp > 0) alertBot(target);
  if (target.hp <= 0) {
    const level = target.level || 1;
    const deathPos = target.isBot ? target.group.position : playerShip.position;
    dropCrates(deathPos, crateDropCount(target));
    if (target.isBot) {
      target.hp = getShipStats(target.shipType).hp;
      target.group.position.set((Math.random() - 0.5) * 170, SHIP_WATERLINE_Y, (Math.random() - 0.5) * 170);
      target.level = Math.max(1, target.level + (Math.random() > 0.55 ? 1 : 0));
      target.agroUntil = 0;
      target.fireCooldown = 1.8 + Math.random() * 2;
      state.gold += 45 + level * 12;
      addXP(40 + level * 22);
      toast(`Sank a level ${level} ship. Crates overboard!`);
    } else {
      target.hp = maxHp();
      const lostGold = Math.floor(state.gold * 0.25);
      state.gold = Math.max(0, state.gold - lostGold);
      target.position.set(-15, 0, -12);
      playerShip.position.copy(target.position);
      playerShip.position.y = SHIP_WATERLINE_Y;
      state.velocity.set(0, 0, 0);
      toast(`Your ship was sunk. Repairs cost ${lostGold}g.`);
    }
  }
}

function initWorld() {
  addLights();
  addSea();
  for (let i = 0; i < 14; i++) makeCloud();
  islandData.forEach((data) => islands.push(makeIsland(data)));
  playerShip = makeShip(state.shipType);
  playerShip.position.copy(state.position);
  playerShip.position.y = SHIP_WATERLINE_Y;
  scene.add(playerShip);
  character = makeCharacter();
  for (let i = 0; i < 12; i++) makeFish();
  for (let i = 0; i < 12; i++) {
    const spec = shipCatalog[1 + Math.floor(Math.random() * (shipCatalog.length - 1))];
    const group = makeShip(spec.id, true);
    const spawn = new THREE.Vector3();
    do {
      spawn.set((Math.random() - 0.5) * 250, SHIP_WATERLINE_Y, (Math.random() - 0.5) * 250);
    } while (dist2(spawn, state.position) < 58);
    group.position.copy(spawn);
    group.rotation.y = Math.random() * Math.PI * 2;
    scene.add(group);
    bots.push({
      isBot: true,
      group,
      shipType: spec.id,
      hp: spec.hp,
      level: 1 + Math.floor(Math.random() * 7),
      turn: Math.random() * 10,
      velocity: new THREE.Vector3(),
      rotation: group.rotation.y,
      agroUntil: 0,
      fireCooldown: 1.6 + Math.random() * 2.4,
    });
  }
}

function setTool(tool) {
  state.tool = tool;
  Object.entries(ui.toolButtons).forEach(([name, button]) => button.classList.toggle("active", name === tool));
}

ui.toolButtons.cannon.addEventListener("click", () => setTool("cannon"));
ui.toolButtons.rod.addEventListener("click", () => setTool("rod"));
ui.toolButtons.glass.addEventListener("click", () => setTool("glass"));
ui.closeShop.addEventListener("click", () => closeShop());
ui.tabs.forEach((tab) => tab.addEventListener("click", () => {
  state.shopTab = tab.dataset.tab;
  ui.tabs.forEach((item) => item.classList.toggle("active", item === tab));
  renderShop();
}));

addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key === "t" && state.mode === "ship") {
    const island = currentIsland();
    if (island) {
      event.preventDefault();
      dockAtIsland(island);
    } else {
      toast("Get closer to an island to dock.");
    }
    return;
  }
  if (key === "c" && state.mode === "land") {
    event.preventDefault();
    setSail();
    return;
  }
  if (key === "r" && state.mode === "land") {
    event.preventDefault();
    openIslandShop();
    return;
  }
  if ((key === " " || key === "spacebar") && state.mode === "land" && state.grounded) {
    event.preventDefault();
    state.walkVelocityY = 12;
    state.grounded = false;
    return;
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    state.cameraYaw += 0.38;
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    state.cameraYaw -= 0.38;
  }
  if (key === "g") {
    event.preventDefault();
    setTool("glass");
    inspectWithSpyglass();
    return;
  }
  if (key === " ") {
    event.preventDefault();
  }
  keys.add(key);
  if (event.key === "1") setTool("cannon");
  if (event.key === "2") setTool("rod");
  if (event.key === "3") {
    setTool("glass");
    inspectWithSpyglass();
  }
});
addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
addEventListener("mousemove", (event) => {
  mouse.x = (event.clientX / innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / innerHeight) * 2 + 1;
});
addEventListener("mousedown", () => useTool());

function currentIsland() {
  const pos = state.mode === "ship" ? playerShip.position : character.position;
  if (state.mode === "land" && state.dockedAt) {
    return islands.find((island) => island.name === state.dockedAt);
  }
  return islands.find((island) => {
    const dockDistance = dist2(pos, island.dock);
    const islandDistance = dist2(pos, island.group.position);
    return state.mode === "ship"
      ? dockDistance < 18 || islandDistance < island.radius + 12
      : dockDistance < 16 || islandDistance < island.radius + 2;
  });
}

function dockAtIsland(island) {
  if (!island) return;
  state.mode = "land";
  state.dockedAt = island.name;
  state.walkingPos.copy(island.dock).add(new THREE.Vector3(0, 0, -4));
  character.position.copy(state.walkingPos);
  character.visible = true;
  state.walkHeight = 0;
  state.walkVelocityY = 0;
  state.grounded = true;
  playerShip.position.copy(island.dock);
  playerShip.position.y = SHIP_WATERLINE_Y;
  state.velocity.set(0, 0, 0);
  closeShop();
  toast(`Docked at ${island.name}. Press R for the market or C to set sail.`);
  updateHud();
}

function setSail() {
  if (state.mode !== "land") return;
  closeShop();
  state.mode = "ship";
  state.dockedAt = null;
  character.visible = false;
  state.position.copy(playerShip.position);
  state.position.y = SHIP_WATERLINE_Y;
  playerShip.position.y = SHIP_WATERLINE_Y;
  toast("Sails raised.");
  updateHud();
}

function openIslandShop() {
  if (state.mode !== "land") return toast("Dock at an island before shopping.");
  const island = islands.find((item) => item.name === state.dockedAt) || currentIsland();
  if (!island) return toast("Dock at an island before shopping.");
  openShop(island);
}

function useTool() {
  if (ui.shop.classList.contains("hidden") === false) return;
  if (state.mode !== "ship") return;
  raycaster.setFromCamera(mouse, camera);
  raycaster.ray.intersectPlane(aimPlane, aimPoint);
  const dir = aimPoint.clone().sub(playerShip.position);
  dir.y = 0;
  if (dir.lengthSq() < 0.1) return;
  dir.normalize();
  if (state.tool === "cannon") {
    const fireDelay = Math.max(0.18, 0.72 - state.upgrades.fireRate * 0.08);
    if (state.cooldown > 0) return;
    state.cooldown = fireDelay;
    const damage = 26 + state.upgrades.damage * 8;
    const range = 36 + state.upgrades.range * 8;
    const origin = playerShip.position.clone().add(dir.clone().multiplyScalar(3.8));
    makeProjectile(playerId, origin, dir, damage, range);
    publishShot(origin, dir, damage, range);
  } else if (state.tool === "rod") {
    if (state.rodCooldown > 0) return;
    state.rodCooldown = 1.1;
    let best = null;
    let bestDist = 17;
    crates.forEach((crate) => {
      const toCrate = crate.mesh.position.clone().sub(playerShip.position);
      const d = dist2(playerShip.position, crate.mesh.position);
      const alignment = dir.dot(toCrate.normalize());
      if (d < bestDist && alignment > 0.35) {
        best = crate;
        bestDist = d;
      }
    });
    if (best) {
      collectCrate(best);
    } else {
      startFishing(dir);
    }
  } else if (state.tool === "glass") {
    inspectWithSpyglass(dir);
  }
}

function collectCrate(crate) {
  state.hp = clamp(state.hp + crate.heal, 0, maxHp());
  addXP(crate.xp);
  state.gold += 10 + Math.floor(Math.random() * 26);
  scene.remove(crate.mesh);
  crates.splice(crates.indexOf(crate), 1);
  toast("Crate recovered: repairs, gold, and XP.");
}

function inspectWithSpyglass(dir = null) {
  if (state.mode !== "ship") return toast("Use the spyglass from your ship.");
  if (!dir) {
    dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    if (dir.lengthSq() < 0.01) dir.set(Math.sin(state.rotation), 0, Math.cos(state.rotation));
    dir.normalize();
  }
  const candidates = [
    ...bots.map((bot) => {
      const spec = getShipStats(bot.shipType);
      return { kind: "Hostile", name: spec.name, level: bot.level, hp: bot.hp, max: spec.hp, armor: spec.armor, speed: spec.speed, regen: spec.regen, pos: bot.group.position, shipType: bot.shipType };
    }),
    ...[...remotePlayers.values()].map((p) => {
      const spec = getShipStats(p.shipType);
      return { kind: "Captain", name: p.name, level: p.level || 1, hp: p.hp || spec.hp, max: spec.hp, armor: spec.armor, speed: spec.speed, regen: spec.regen, pos: p.lookPosition || p.group.position, shipType: p.shipType };
    }),
  ];
  const target = candidates
    .map((item) => {
      const toTarget = item.pos.clone().sub(playerShip.position);
      const distance = toTarget.length();
      toTarget.y = 0;
      const aim = toTarget.lengthSq() ? dir.dot(toTarget.normalize()) : 0;
      return { ...item, distance, aim };
    })
    .filter((item) => item.distance < 135 && item.aim > -0.2)
    .sort((a, b) => (b.aim * 55 - b.distance * 0.35) - (a.aim * 55 - a.distance * 0.35))[0]
    || candidates
      .map((item) => ({ ...item, distance: dist2(playerShip.position, item.pos), aim: 0 }))
      .filter((item) => item.distance < 80)
      .sort((a, b) => a.distance - b.distance)[0];
  if (!target) {
    state.spyTarget = null;
    toast("Spyglass found no ships. Aim toward a sail.");
    updateSpyPanel();
    return;
  }
  const crateEstimate = crateDropCount({ isBot: true, shipType: target.shipType, level: target.level });
  const threat = target.level > state.level + 2 ? "Dangerous" : target.hp < target.max * 0.4 ? "Wounded" : "Manageable";
  state.spyTarget = { ...target, crateEstimate, threat, expires: clock.elapsedTime + 8 };
  toast(`Spyglass locked: ${target.name}.`);
  updateSpyPanel();
}

function openShop(island) {
  state.dockedAt = island.name;
  ui.shopIsland.textContent = island.name;
  ui.shop.classList.remove("hidden");
  renderShop();
}

function closeShop() {
  ui.shop.classList.add("hidden");
}

function renderShop() {
  const island = islands.find((item) => item.name === state.dockedAt) || islands[0];
  ui.tabs.forEach((item) => item.classList.toggle("active", item.dataset.tab === state.shopTab));
  if (state.shopTab === "goods") {
    ui.shopBody.innerHTML = goods.map((name) => {
      const owned = state.cargo[name] || 0;
      const price = island.goods[name];
      return `<div class="row"><div><h3>${name} <span class="price">${price}g</span></h3><p>Owned ${owned}. Prices vary by island, so buy low and sell high.</p></div><div class="actions"><button data-buy="${name}">Buy</button><button data-sell="${name}">Sell</button></div></div>`;
    }).join("");
  } else if (state.shopTab === "ships") {
    ui.shopBody.innerHTML = shipCatalog.map((ship) => {
      const owned = ship.id === state.shipType;
      return `<div class="row"><div><h3>${ship.name} <span class="price">${ship.price}g</span></h3><p>HP ${ship.hp} / Armor ${Math.round(ship.armor * 100)}% / Speed ${ship.speed} / Regen ${ship.regen}/s</p></div><button data-ship="${ship.id}" ${owned ? "disabled" : ""}>${owned ? "Sailing" : "Buy"}</button></div>`;
    }).join("");
  } else {
    const ups = [
      ["damage", "Cannon Damage", `+${8 * state.upgrades.damage} damage`],
      ["fireRate", "Fire Rate", `${Math.round((0.72 - Math.max(0.18, 0.72 - state.upgrades.fireRate * 0.08)) * 100) / 100}s faster`],
      ["range", "Cannon Range", `+${8 * state.upgrades.range} range`],
    ];
    ui.shopBody.innerHTML = `<p class="stats">Upgrade points: <b>${state.points}</b></p>` + ups.map(([id, name, desc]) => (
      `<div class="row"><div><h3>${name} Lv.${state.upgrades[id]}</h3><p>${desc}</p></div><button data-upgrade="${id}">Spend</button></div>`
    )).join("");
  }
}

ui.shopBody.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const island = islands.find((item) => item.name === state.dockedAt);
  if (button.dataset.buy) {
    const name = button.dataset.buy;
    const price = island.goods[name];
    if (state.gold < price) return toast("Not enough gold.");
    state.gold -= price;
    state.cargo[name] = (state.cargo[name] || 0) + 1;
    toast(`Bought ${name}.`);
  }
  if (button.dataset.sell) {
    const name = button.dataset.sell;
    if (!state.cargo[name]) return toast("No cargo to sell.");
    state.cargo[name]--;
    state.gold += island.goods[name];
    addXP(6);
    toast(`Sold ${name}.`);
  }
  if (button.dataset.ship) {
    const ship = getShipStats(button.dataset.ship);
    if (state.gold < ship.price) return toast("Not enough gold.");
    state.gold -= ship.price;
    state.shipType = ship.id;
    state.hp = ship.hp;
    const old = playerShip;
    playerShip = makeShip(ship.id);
    playerShip.position.copy(old.position);
    playerShip.position.y = SHIP_WATERLINE_Y;
    playerShip.rotation.copy(old.rotation);
    scene.remove(old);
    scene.add(playerShip);
    toast(`${ship.name} launched.`);
  }
  if (button.dataset.upgrade) {
    if (state.points < 1) return toast("Level up to earn upgrade points.");
    state.points--;
    state.upgrades[button.dataset.upgrade]++;
    toast("Upgrade installed.");
  }
  renderShop();
  updateHud();
});

function updateShip(dt) {
  const spec = getShipStats();
  state.cooldown = Math.max(0, state.cooldown - dt);
  state.rodCooldown = Math.max(0, state.rodCooldown - dt);
  state.hp = clamp(state.hp + spec.regen * dt, 0, maxHp());
  const turn = (keys.has("a") ? 1 : 0) - (keys.has("d") ? 1 : 0);
  const throttle = (keys.has("w") ? 1 : 0) - (keys.has("s") ? 0.55 : 0);
  state.rotation += turn * dt * (1.7 + spec.speed / 28);
  const forward = new THREE.Vector3(Math.sin(state.rotation), 0, Math.cos(state.rotation));
  state.velocity.add(forward.multiplyScalar(throttle * spec.speed * dt));
  state.velocity.multiplyScalar(Math.pow(0.86, dt * 9));
  const next = playerShip.position.clone().add(state.velocity.clone().multiplyScalar(dt));
  const blocked = islands.some((island) => dist2(next, island.group.position) < island.radius - 1);
  if (!blocked) playerShip.position.copy(next);
  playerShip.rotation.y = state.rotation;
  playerShip.position.y = SHIP_WATERLINE_Y + Math.sin(clock.elapsedTime * 2.8) * 0.08;
  state.position.copy(playerShip.position);
  crates.slice().forEach((crate) => {
    if (dist2(playerShip.position, crate.mesh.position) < 3.1) collectCrate(crate);
  });
}

function updateWalker(dt) {
  const island = islands.find((item) => item.name === state.dockedAt);
  if (!island) return;
  const move = new THREE.Vector3((keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0), 0, (keys.has("s") ? 1 : 0) - (keys.has("w") ? 1 : 0));
  if (move.lengthSq() > 0) {
    move.normalize();
    character.rotation.y = Math.atan2(move.x, move.z);
    state.cameraYaw = lerpAngle(state.cameraYaw, character.rotation.y, 0.12);
    const next = character.position.clone().add(move.multiplyScalar(dt * 11));
    const onIsland = dist2(next, island.group.position) < island.radius - 2;
    const onDock = dist2(next, island.dock) < 8;
    const blocked = island.obstacles.some((obstacle) => dist2(next, obstacle) < obstacle.r + 0.7);
    if ((onIsland || onDock) && !blocked) {
      character.position.copy(next);
    }
  }
  state.walkVelocityY -= 28 * dt;
  state.walkHeight = Math.max(0, state.walkHeight + state.walkVelocityY * dt);
  if (state.walkHeight <= 0) {
    state.walkHeight = 0;
    state.walkVelocityY = 0;
    state.grounded = true;
  }
  character.position.y = 2.95 + state.walkHeight + Math.sin(clock.elapsedTime * 5) * 0.035;
}

function updateBots(dt) {
  bots.forEach((bot, i) => {
    const spec = getShipStats(bot.shipType);
    const aggressive = state.mode === "ship" && (bot.agroUntil || 0) > clock.elapsedTime;
    bot.turn -= dt;
    bot.fireCooldown = Math.max(0, (bot.fireCooldown || 0) - dt);
    if (aggressive) {
      bot.target = playerShip.position.clone();
    } else if (bot.turn < 0) {
      bot.turn = 2.4 + Math.random() * 4.5;
      bot.target = new THREE.Vector3((Math.random() - 0.5) * 240, 0, (Math.random() - 0.5) * 240);
    }
    const target = bot.target || playerShip.position;
    const toTarget = target.clone().sub(bot.group.position);
    toTarget.y = 0;
    if (toTarget.lengthSq() > 8) {
      const desired = Math.atan2(toTarget.x, toTarget.z);
      const turnRate = aggressive ? 1.35 + spec.speed / 32 : 1.05 + spec.speed / 36;
      const turnStep = clamp(angleDelta(desired, bot.rotation), -dt * turnRate, dt * turnRate);
      bot.rotation += turnStep;
      const forward = new THREE.Vector3(Math.sin(bot.rotation), 0, Math.cos(bot.rotation));
      const sailPower = aggressive ? 0.68 : 0.52;
      bot.velocity.add(forward.multiplyScalar(spec.speed * sailPower * dt));
      bot.velocity.multiplyScalar(Math.pow(aggressive ? 0.9 : 0.88, dt * 9));
      const next = bot.group.position.clone().add(bot.velocity.clone().multiplyScalar(dt));
      const blocked = islands.some((island) => dist2(next, island.group.position) < island.radius + 3);
      if (!blocked) bot.group.position.copy(next);
      else {
        bot.velocity.multiplyScalar(0.25);
        bot.rotation += 1.4 * dt;
        bot.target = new THREE.Vector3((Math.random() - 0.5) * 240, 0, (Math.random() - 0.5) * 240);
      }
      bot.group.rotation.y = bot.rotation;
    }
    bot.group.position.y = SHIP_WATERLINE_Y + Math.sin(clock.elapsedTime * 2.4 + i) * 0.08;
    const playerDistance = dist2(bot.group.position, playerShip.position);
    const shotDir = playerShip.position.clone().sub(bot.group.position);
    shotDir.y = 0;
    const facing = shotDir.lengthSq()
      ? new THREE.Vector3(Math.sin(bot.rotation), 0, Math.cos(bot.rotation)).dot(shotDir.clone().normalize())
      : 0;
    const canFire = state.mode === "ship" && bot.fireCooldown <= 0 && facing > 0.45;
    if (aggressive && playerDistance < 48 && canFire) {
      const shot = shotDir.normalize();
      makeProjectile(`bot-${i}`, bot.group.position.clone().add(shot.clone().multiplyScalar(3.4)), shot, 7 + bot.level * 1.25, 34);
      bot.fireCooldown = Math.max(1.1, 2.8 - Math.min(1.4, bot.level * 0.12));
    } else if (!aggressive && playerDistance < 15 && Math.random() < dt * 0.01 && canFire) {
      const shot = shotDir.normalize();
      makeProjectile(`bot-${i}`, bot.group.position.clone().add(shot.clone().multiplyScalar(3.4)), shot, 4 + bot.level, 22);
      bot.fireCooldown = 3.2 + Math.random() * 1.8;
    }
  });
}

function updateProjectiles(dt) {
  projectiles.slice().forEach((shot) => {
    shot.life -= dt;
    shot.mesh.position.add(shot.dir.clone().multiplyScalar(shot.speed * dt));
    shot.mesh.position.y = 1.1 + Math.sin(clock.elapsedTime * 16) * 0.1;
    let hit = false;
    if (shot.owner === playerId) {
      bots.forEach((bot) => {
        if (!hit && dist2(shot.mesh.position, bot.group.position) < 3) {
          damageTarget(bot, shot.damage);
          addXP(3 + Math.floor(shot.damage / 9));
          hit = true;
        }
      });
      remotePlayers.forEach((remote) => {
        if (!hit && dist2(shot.mesh.position, remote.group.position) < 3) {
          addXP(5 + Math.floor(shot.damage / 8));
          hit = true;
        }
      });
    } else if (state.mode === "ship" && dist2(shot.mesh.position, playerShip.position) < 3) {
      damageTarget(state, shot.damage);
      hit = true;
    }
    if (shot.life <= 0 || hit) {
      scene.remove(shot.mesh);
      projectiles.splice(projectiles.indexOf(shot), 1);
    }
  });
}

function updateFish(dt) {
  fish.forEach((item, i) => {
    item.userData.phase += dt;
    item.position.x += Math.sin(item.userData.phase + i) * dt * 0.7;
    item.position.z += Math.cos(item.userData.phase * 0.7 + i) * dt * 0.7;
    item.rotation.y = item.userData.phase;
    const pulse = 1 + Math.sin(item.userData.phase * 5) * 0.12;
    item.scale.set(pulse, 1, pulse);
  });
  if (state.fishing) {
    state.fishing.timer += dt;
    const targetPos = state.fishing.target?.position || state.fishing.castPoint;
    if (state.fishing.phase === "waiting") {
      const t = clamp(state.fishing.timer / state.fishing.biteTime, 0, 1);
      fishingBobber.position.lerpVectors(state.fishing.castPoint, targetPos, t * 0.35);
      fishingBobber.position.y = 0.2 + Math.sin(clock.elapsedTime * 9) * 0.12;
      if (state.fishing.timer >= state.fishing.biteTime) {
        state.fishing.phase = "reeling";
        state.fishing.timer = 0;
        toast("Bite! Reeling in...");
      }
    } else {
      const t = clamp(state.fishing.timer / state.fishing.reelTime, 0, 1);
      const shipTip = playerShip.position.clone().add(new THREE.Vector3(0, 1.2, 0));
      fishingBobber.position.lerpVectors(targetPos, shipTip, t);
      fishingBobber.position.y = 0.25 + Math.sin(clock.elapsedTime * 18) * 0.2;
      if (t >= 1) finishFishing();
    }
    if (fishingLine && fishingBobber) {
      setCylinderBetween(
        fishingLine,
        playerShip.position.clone().add(new THREE.Vector3(0, 1.45, 0)),
        fishingBobber.position.clone()
      );
    }
  }
  crates.forEach((crate) => {
    crate.mesh.rotation.y += dt * 0.65;
    crate.mesh.position.y = 0.72 + Math.sin(clock.elapsedTime * 2 + crate.mesh.id) * 0.1;
  });
}

function updateCamera(dt) {
  if (keys.has("arrowleft")) state.cameraYaw += 1.9 * dt;
  if (keys.has("arrowright")) state.cameraYaw -= 1.9 * dt;
  const target = state.mode === "ship" ? playerShip.position : character.position;
  const offset = new THREE.Vector3(Math.sin(state.cameraYaw) * 58, 46, Math.cos(state.cameraYaw) * 58);
  const desired = target.clone().add(offset);
  camera.position.lerp(desired, 0.08);
  camera.lookAt(target.x, target.y, target.z);
  labels.forEach((label) => label.lookAt(camera.position));
}

function updateHud() {
  const spec = getShipStats();
  ui.playerName.textContent = state.name;
  ui.modeLabel.textContent = state.mode === "ship" ? "At sea" : `Docked: ${state.dockedAt}`;
  ui.hpBar.style.width = `${clamp((state.hp / maxHp()) * 100, 0, 100)}%`;
  ui.xpBar.style.width = `${clamp((state.xp / xpForLevel(state.level)) * 100, 0, 100)}%`;
  ui.statsLine.textContent = `Lv.${state.level} | ${Math.floor(state.gold)}g | ${spec.name} | HP ${Math.ceil(state.hp)}/${spec.hp} | Armor ${Math.round(spec.armor * 100)}% | Speed ${spec.speed}`;
  const entries = Object.entries(state.cargo).filter(([, count]) => count > 0);
  ui.cargoList.innerHTML = entries.length ? entries.map(([name, count]) => `<span>${name} x${count}</span>`).join("") : "<span>Empty hold</span>";
  const island = currentIsland();
  const showPrompt = ui.shop.classList.contains("hidden") && (island || state.mode === "land");
  ui.dockPrompt.classList.toggle("hidden", !showPrompt);
  if (showPrompt) {
    ui.dockPrompt.innerHTML = state.mode === "ship"
      ? `Press <b>T</b> to dock at ${island.name}`
      : `Press <b>C</b> to set sail or <b>R</b> for the shop`;
  }
  updateSpyPanel();
}

function updateSpyPanel() {
  const target = state.spyTarget;
  if (!target || clock.elapsedTime > target.expires) {
    state.spyTarget = null;
    ui.spyPanel.classList.add("hidden");
    return;
  }
  const distance = Math.round(dist2(playerShip.position, target.pos));
  const hpPct = Math.round((target.hp / target.max) * 100);
  ui.spyPanel.classList.remove("hidden");
  ui.spyName.textContent = `${target.kind}: ${target.name}`;
  ui.spyDetails.innerHTML = `Lv.${target.level} | ${distance}m | ${target.threat}<br>HP ${Math.ceil(target.hp)}/${target.max} (${hpPct}%) | Armor ${Math.round(target.armor * 100)}%<br>Speed ${target.speed} | Regen ${target.regen}/s | Crates ${target.crateEstimate}`;
}

function multiplayerPayload() {
  return {
    name: state.name,
    level: state.level,
    hp: state.hp,
    shipType: state.shipType,
    mode: state.mode,
    x: playerShip.position.x,
    z: playerShip.position.z,
    rotation: playerShip.rotation.y,
    landX: character.position.x,
    landZ: character.position.z,
    landRotation: character.rotation.y,
  };
}

function sendMultiplayer(message) {
  if (typeof WebSocket !== "undefined" && multiplayer.socket?.readyState === WebSocket.OPEN) {
    multiplayer.socket.send(JSON.stringify(message));
    return true;
  }
  if (multiplayer.channel) {
    multiplayer.channel.postMessage(message);
    return true;
  }
  return false;
}

function makeRemoteCharacter() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.95, 4, 8), mat(0x28678c));
  body.position.y = 1.0;
  body.castShadow = true;
  group.add(body);
  const sash = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.12, 0.16), mats.gold);
  sash.position.set(0, 1.05, 0.36);
  sash.castShadow = true;
  group.add(sash);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.46, 8), mat(0xd9a028));
  hat.position.y = 1.95;
  hat.castShadow = true;
  group.add(hat);
  group.visible = false;
  return group;
}

function updateRemoteLabel(remote, name) {
  if (remote.name === name) return;
  scene.remove(remote.label);
  remote.label = makeLabel(name || "Captain");
  scene.add(remote.label);
  remote.name = name;
}

function removeRemotePlayer(id) {
  const remote = remotePlayers.get(id);
  if (!remote) return;
  scene.remove(remote.group, remote.avatar, remote.label);
  remotePlayers.delete(id);
}

function upsertRemotePlayer(data) {
  if (!data || !data.id || data.id === playerId || data.id === multiplayer.networkId) return;
  const x = Number(data.x);
  const z = Number(data.z);
  if (!Number.isFinite(x) || !Number.isFinite(z)) return;

  const shipType = data.shipType || "skiff";
  let remote = remotePlayers.get(data.id);
  if (!remote) {
    const group = makeShip(shipType, true);
    const avatar = makeRemoteCharacter();
    const label = makeLabel(data.name || "Captain");
    scene.add(group, avatar, label);
    remote = { group, avatar, label, updated: 0, name: data.name || "Captain", shipType };
    remotePlayers.set(data.id, remote);
  } else if (remote.shipType !== shipType) {
    scene.remove(remote.group);
    remote.group = makeShip(shipType, true);
    scene.add(remote.group);
    remote.shipType = shipType;
  }

  updateRemoteLabel(remote, data.name || "Captain");
  remote.updated = clock.elapsedTime;
  remote.level = data.level || 1;
  remote.hp = data.hp || getShipStats(shipType).hp;
  remote.group.position.set(x, SHIP_WATERLINE_Y, z);
  remote.group.rotation.y = Number(data.rotation) || 0;
  remote.group.visible = true;

  const onLand = data.mode === "land";
  remote.avatar.visible = onLand;
  if (onLand && Number.isFinite(Number(data.landX)) && Number.isFinite(Number(data.landZ))) {
    remote.avatar.position.set(Number(data.landX), 2.95, Number(data.landZ));
    remote.avatar.rotation.y = Number(data.landRotation) || 0;
    remote.lookPosition = remote.avatar.position;
    remote.label.position.set(remote.avatar.position.x, 5.8, remote.avatar.position.z);
  } else {
    remote.lookPosition = remote.group.position;
    remote.label.position.set(x, 7, z);
  }
  remote.label.lookAt(camera.position);
}

function spawnRemoteShot(data) {
  if (!data || data.owner === playerId || data.owner === multiplayer.networkId) return;
  const pos = new THREE.Vector3(Number(data.x), 0, Number(data.z));
  const dir = new THREE.Vector3(Number(data.dirX), 0, Number(data.dirZ));
  if (![pos.x, pos.z, dir.x, dir.z].every(Number.isFinite) || dir.lengthSq() < 0.01) return;
  makeProjectile(data.owner || "remote", pos, dir.normalize(), Number(data.damage) || 20, Number(data.range) || 36);
}

function handleMultiplayerMessage(message) {
  if (!message) return;
  if (message.type === "welcome") {
    multiplayer.networkId = message.id;
  } else if (message.type === "state") {
    upsertRemotePlayer(message.player);
  } else if (message.type === "leave") {
    removeRemotePlayer(message.id);
  } else if (message.type === "shot") {
    spawnRemoteShot(message.shot);
  } else if (message.x !== undefined) {
    upsertRemotePlayer(message);
  }
}

function startLocalMultiplayer(message) {
  if (multiplayer.channel || typeof BroadcastChannel === "undefined") return;
  try {
    multiplayer.channel = new BroadcastChannel("islandwake");
    multiplayer.mode = "local";
    multiplayer.channel.onmessage = (event) => handleMultiplayerMessage(event.data);
    if (message) toast(message);
  } catch {
    multiplayer.channel = null;
  }
}

function scheduleMultiplayerReconnect() {
  if (multiplayer.reconnectTimer || !location.protocol.startsWith("http")) return;
  multiplayer.mode = "reconnecting";
  const delay = clamp(1 + multiplayer.reconnectAttempts * 0.75, 1, 6);
  multiplayer.reconnectAttempts += 1;
  multiplayer.reconnectTimer = setTimeout(() => {
    multiplayer.reconnectTimer = null;
    setupMultiplayer(true);
  }, delay * 1000);
}

function setupMultiplayer(reconnecting = false) {
  const canUseSocket = typeof WebSocket !== "undefined" && location.protocol.startsWith("http");
  if (!canUseSocket) {
    startLocalMultiplayer("Local tab multiplayer is active.");
    return;
  }
  if (multiplayer.socket && [WebSocket.CONNECTING, WebSocket.OPEN].includes(multiplayer.socket.readyState)) return;

  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(`${protocol}//${location.host}`);
  multiplayer.socket = socket;
  let opened = false;

  socket.addEventListener("open", () => {
    opened = true;
    multiplayer.hasConnected = true;
    multiplayer.reconnectAttempts = 0;
    multiplayer.mode = "online";
    if (multiplayer.channel) {
      multiplayer.channel.close();
      multiplayer.channel = null;
    }
    sendMultiplayer({ type: "hello", player: multiplayerPayload() });
    toast(reconnecting ? "Reconnected to multiplayer waters." : "Connected to multiplayer waters.");
  });

  socket.addEventListener("message", (event) => {
    try {
      handleMultiplayerMessage(JSON.parse(event.data));
    } catch {
      // Ignore malformed network packets.
    }
  });

  socket.addEventListener("error", () => {
    if (!opened && !multiplayer.hasConnected) startLocalMultiplayer("Multiplayer server unavailable. Local tab multiplayer is active.");
  });

  socket.addEventListener("close", () => {
    if (multiplayer.socket === socket) multiplayer.socket = null;
    if (opened || multiplayer.hasConnected) {
      if (multiplayer.mode !== "reconnecting") toast("Multiplayer disconnected. Reconnecting...");
      scheduleMultiplayerReconnect();
    } else {
      startLocalMultiplayer("Multiplayer server unavailable. Local tab multiplayer is active.");
    }
  });
}

addEventListener("beforeunload", () => {
  if (multiplayer.channel) multiplayer.channel.postMessage({ type: "leave", id: playerId });
});

function publishShot(origin, dir, damage, range) {
  sendMultiplayer({
    type: "shot",
    shot: {
      owner: playerId,
      x: origin.x,
      z: origin.z,
      dirX: dir.x,
      dirZ: dir.z,
      damage,
      range,
    },
  });
}

function publishMultiplayer() {
  if (clock.elapsedTime - multiplayer.lastSent >= 0.16) {
    multiplayer.lastSent = clock.elapsedTime;
    const player = multiplayerPayload();
    sendMultiplayer({
      type: "state",
      player: { ...player, id: playerId },
    });
  }
  remotePlayers.forEach((remote, id) => {
    if (clock.elapsedTime - remote.updated > 5) {
      removeRemotePlayer(id);
    }
  });
}

function animateSea() {
  scene.traverse((obj) => {
    if (obj.userData.drift !== undefined) {
      obj.position.x += Math.sin(clock.elapsedTime + obj.userData.drift) * 0.004;
      obj.position.z += 0.014;
      if (obj.position.z > 130) obj.position.z = -130;
    }
    if (obj.userData.cloud !== undefined) {
      obj.position.x += obj.userData.cloud * 0.006;
      if (obj.position.x > 145) obj.position.x = -145;
    }
  });
}

function frame() {
  const dt = Math.min(0.033, clock.getDelta());
  if (state.mode === "ship") updateShip(dt);
  else updateWalker(dt);
  updateBots(dt);
  updateProjectiles(dt);
  updateFish(dt);
  updateCamera(dt);
  animateSea();
  publishMultiplayer();
  updateHud();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

initWorld();
setupMultiplayer();
updateHud();
toast("Islandwake launched. Multiplayer connects when the server is running.");
frame();
