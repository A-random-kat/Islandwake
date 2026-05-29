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
scene.fog = new THREE.Fog(0x8edff0, 150, 430);

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
  nameGate: document.querySelector("#nameGate"),
  nameForm: document.querySelector("#nameForm"),
  nameInput: document.querySelector("#captainNameInput"),
  tabs: [...document.querySelectorAll(".tab")],
  toolButtons: {
    cannon: document.querySelector("#toolCannon"),
    rod: document.querySelector("#toolRod"),
    glass: document.querySelector("#toolGlass"),
  },
};

const keys = new Set();
const goods = ["Silk", "Spice", "Iron", "Tea", "Pearls"];
const STARTER_SHIP = "skiff";
const MAP_LIMIT = 280;
const SEA_SIZE = 760;
const islandData = [
  { name: "Port Azure", culture: "Freeport", x: -34, z: -24, radius: 20, color: 0x7dcf7a, accent: 0x2f87a5, theme: "starter", shipMarket: ["shallop", "pinnace", "hoy", "cog", "ketch"], goods: { Silk: 32, Spice: 57, Iron: 38, Tea: 24, Pearls: 88 } },
  { name: "Vikholm", culture: "Viking", x: -184, z: -122, radius: 23, color: 0x86ba73, accent: 0xbd463b, theme: "norse", shipMarket: ["longship", "knarr", "dogger"], goods: { Silk: 38, Spice: 83, Iron: 80, Tea: 46, Pearls: 76 } },
  { name: "Seville", culture: "Spanish", x: 182, z: -138, radius: 24, color: 0xd4ad65, accent: 0xc94f3f, theme: "iberian", shipMarket: ["caravel", "carrack", "galleon", "merchantman"], goods: { Silk: 64, Spice: 38, Iron: 48, Tea: 68, Pearls: 112 } },
  { name: "Venice", culture: "Venetian", x: 116, z: 142, radius: 21, color: 0x82bd72, accent: 0xd7b44a, theme: "lagoon", shipMarket: ["galley", "tartane", "xebec", "brigantine"], goods: { Silk: 58, Spice: 92, Iron: 61, Tea: 28, Pearls: 121 } },
  { name: "Amsterdam", culture: "Dutch", x: -142, z: 118, radius: 22, color: 0x68b779, accent: 0xe08d3f, theme: "trade", shipMarket: ["hoy", "dogger", "fluyt", "barque", "barquentine"], goods: { Silk: 74, Spice: 48, Iron: 96, Tea: 57, Pearls: 84 } },
  { name: "Portsmouth", culture: "Royal Navy", x: 36, z: 226, radius: 24, color: 0x6fa36a, accent: 0x4051a8, theme: "naval", shipMarket: ["storm", "corvette", "frigate", "razee", "fourthrate", "manowar", "firstrate"], goods: { Silk: 48, Spice: 102, Iron: 72, Tea: 35, Pearls: 126 } },
  { name: "Zanzibar", culture: "Swahili-Arab", x: 226, z: 28, radius: 20, color: 0x88c478, accent: 0xf0d05a, theme: "dhow", shipMarket: ["dhow", "tartane", "xebec"], goods: { Silk: 70, Spice: 30, Iron: 54, Tea: 63, Pearls: 132 } },
  { name: "Canton", culture: "Chinese", x: -222, z: 32, radius: 22, color: 0x68c46f, accent: 0xc93636, theme: "pagoda", shipMarket: ["junk", "treasure"], goods: { Silk: 42, Spice: 70, Iron: 67, Tea: 95, Pearls: 143 } },
  { name: "Baltimore", culture: "American", x: -26, z: -214, radius: 20, color: 0x75caa5, accent: 0x58c6f2, theme: "schooner", shipMarket: ["schooner", "packet", "clipper", "sloop"], goods: { Silk: 91, Spice: 54, Iron: 34, Tea: 82, Pearls: 109 } },
  { name: "Brest", culture: "French", x: 104, z: -224, radius: 21, color: 0x91c96d, accent: 0x4c64a6, theme: "fort", shipMarket: ["brigantine", "snow", "barquentine", "corvette"], goods: { Silk: 69, Spice: 42, Iron: 62, Tea: 66, Pearls: 130 } },
  { name: "Lisbon", culture: "Portuguese", x: -232, z: -204, radius: 22, color: 0xbac96d, accent: 0xd2a94b, theme: "iberian", shipMarket: ["caravel", "pink", "carrack"], goods: { Silk: 52, Spice: 34, Iron: 60, Tea: 58, Pearls: 118 } },
  { name: "Calicut", culture: "Indian Ocean", x: 214, z: 210, radius: 22, color: 0x92d37e, accent: 0xda9c5c, theme: "market", shipMarket: ["dhow", "ketch", "merchantman", "eastindiaman"], goods: { Silk: 82, Spice: 44, Iron: 72, Tea: 36, Pearls: 120 } },
  { name: "Tonga", culture: "Polynesian", x: 4, z: 84, radius: 18, color: 0x5fa66a, accent: 0xef6f4f, theme: "atoll", shipMarket: ["cat", "sloop", "lugger"], goods: { Silk: 61, Spice: 64, Iron: 46, Tea: 75, Pearls: 94 } },
  { name: "Crown Harbor", culture: "Crown Colony", x: 164, z: -22, radius: 21, color: 0x82bd72, accent: 0xd99928, theme: "fort", shipMarket: ["dart", "storm", "bombketch", "frigate"], goods: { Silk: 58, Spice: 92, Iron: 61, Tea: 28, Pearls: 121 } },
  { name: "Blackreef", culture: "Privateer", x: -96, z: 216, radius: 20, color: 0x5fa66a, accent: 0x3f87a6, theme: "rocky", shipMarket: ["dart", "lugger", "brigantine", "xebec"], goods: { Silk: 78, Spice: 52, Iron: 101, Tea: 55, Pearls: 86 } },
  { name: "New Albion", culture: "Merchant", x: 246, z: -222, radius: 21, color: 0x70bf61, accent: 0xb5773c, theme: "trade", shipMarket: ["sloop", "packet", "barque", "merchantman", "eastindiaman"], goods: { Silk: 46, Spice: 80, Iron: 66, Tea: 98, Pearls: 142 } },
];

const shipCatalog = [
  { id: "skiff", name: "Skiff", price: 0, hp: 145, armor: 0.02, speed: 15, regen: 1.6, color: 0xcc4e3f, model: "skiff" },
  { id: "shallop", name: "Shallop", price: 380, hp: 165, armor: 0.02, speed: 17, regen: 1.7, color: 0xb86d3d, model: "skiff" },
  { id: "pinnace", name: "Pinnace", price: 520, hp: 185, armor: 0.03, speed: 20, regen: 1.8, color: 0x5b9eb5, model: "dart" },
  { id: "hoy", name: "Hoy", price: 680, hp: 220, armor: 0.04, speed: 11, regen: 1.9, color: 0xb0824a, model: "cog" },
  { id: "cog", name: "Cog", price: 880, hp: 260, armor: 0.06, speed: 10, regen: 2.0, color: 0xa86e3a, model: "cog" },
  { id: "longship", name: "Longship", price: 980, hp: 205, armor: 0.03, speed: 24, regen: 1.8, color: 0xc84f3f, model: "longship" },
  { id: "dogger", name: "Dogger", price: 1120, hp: 230, armor: 0.04, speed: 18, regen: 1.9, color: 0x7c9a7e, model: "lugger" },
  { id: "dhow", name: "Dhow", price: 1250, hp: 235, armor: 0.03, speed: 19, regen: 2.2, color: 0xf0d05a, model: "dhow" },
  { id: "sloop", name: "Sloop", price: 1420, hp: 225, armor: 0.04, speed: 27, regen: 1.8, color: 0x4aa5c6, model: "storm" },
  { id: "knarr", name: "Knarr", price: 1580, hp: 290, armor: 0.06, speed: 12, regen: 2.2, color: 0x9b6b35, model: "knarr" },
  { id: "lugger", name: "Lugger", price: 1720, hp: 245, armor: 0.04, speed: 22, regen: 2.0, color: 0x4f9a9a, model: "lugger" },
  { id: "tartane", name: "Tartane", price: 1880, hp: 250, armor: 0.04, speed: 24, regen: 2.0, color: 0xc96446, model: "xebec" },
  { id: "pink", name: "Pink", price: 2050, hp: 300, armor: 0.06, speed: 15, regen: 2.3, color: 0xc88b58, model: "caravel" },
  { id: "cat", name: "Catamaran", price: 2180, hp: 210, armor: 0.02, speed: 28, regen: 1.8, color: 0xef6f4f, model: "cat" },
  { id: "dart", name: "Cutter", price: 2350, hp: 230, armor: 0.04, speed: 30, regen: 1.7, color: 0x35a9b5, model: "dart" },
  { id: "junk", name: "Junk", price: 2520, hp: 330, armor: 0.07, speed: 15, regen: 2.8, color: 0x4aa66b, model: "junk" },
  { id: "ketch", name: "Ketch", price: 2720, hp: 340, armor: 0.06, speed: 16, regen: 2.5, color: 0xc58e45, model: "caravel" },
  { id: "schooner", name: "Schooner", price: 2920, hp: 300, armor: 0.05, speed: 26, regen: 2.1, color: 0x58c6f2, model: "schooner" },
  { id: "galley", name: "Galley", price: 3150, hp: 310, armor: 0.04, speed: 23, regen: 2.2, color: 0xd7b44a, model: "galley" },
  { id: "xebec", name: "Xebec", price: 3380, hp: 320, armor: 0.05, speed: 29, regen: 2.1, color: 0xd45f3f, model: "xebec" },
  { id: "brigantine", name: "Brigantine", price: 3650, hp: 360, armor: 0.07, speed: 22, regen: 2.3, color: 0x3f87a6, model: "brig" },
  { id: "caravel", name: "Caravel", price: 3920, hp: 390, armor: 0.08, speed: 16, regen: 2.6, color: 0xd2a94b, model: "caravel" },
  { id: "snow", name: "Snow", price: 4250, hp: 430, armor: 0.09, speed: 19, regen: 2.5, color: 0xa4c9e8, model: "snow" },
  { id: "packet", name: "Packet Ship", price: 4550, hp: 350, armor: 0.05, speed: 27, regen: 2.0, color: 0x67bdd8, model: "schooner" },
  { id: "barquentine", name: "Barquentine", price: 4850, hp: 400, armor: 0.07, speed: 24, regen: 2.2, color: 0x82b26a, model: "snow" },
  { id: "clipper", name: "Clipper", price: 5050, hp: 360, armor: 0.04, speed: 33, regen: 1.9, color: 0xe2aa32, model: "clipper" },
  { id: "fluyt", name: "Fluyt", price: 5200, hp: 500, armor: 0.08, speed: 13, regen: 2.8, color: 0xd18b45, model: "fluyt" },
  { id: "bombketch", name: "Bomb Ketch", price: 5600, hp: 560, armor: 0.11, speed: 10, regen: 2.7, color: 0x75856f, model: "turtle" },
  { id: "barque", name: "Barque", price: 6050, hp: 470, armor: 0.08, speed: 21, regen: 2.4, color: 0x7e9bc9, model: "snow" },
  { id: "corvette", name: "Corvette", price: 6650, hp: 510, armor: 0.1, speed: 25, regen: 2.4, color: 0x4c64a6, model: "frigate" },
  { id: "frigate", name: "Frigate", price: 7300, hp: 580, armor: 0.12, speed: 24, regen: 2.5, color: 0x4051a8, model: "frigate" },
  { id: "storm", name: "Sloop-of-War", price: 7800, hp: 380, armor: 0.07, speed: 31, regen: 2.0, color: 0x3556b8, model: "storm" },
  { id: "galleon", name: "Galleon", price: 8500, hp: 680, armor: 0.14, speed: 12, regen: 2.9, color: 0x7e4c9d, model: "galleon" },
  { id: "merchantman", name: "Merchantman", price: 9100, hp: 760, armor: 0.12, speed: 11, regen: 3.0, color: 0xb5773c, model: "fluyt" },
  { id: "eastindiaman", name: "East Indiaman", price: 9900, hp: 820, armor: 0.15, speed: 12, regen: 3.2, color: 0xd09a42, model: "galleon" },
  { id: "carrack", name: "Carrack", price: 10800, hp: 780, armor: 0.15, speed: 10, regen: 3.1, color: 0xb84f44, model: "carrack" },
  { id: "treasure", name: "Treasure Junk", price: 11800, hp: 900, armor: 0.14, speed: 9, regen: 3.5, color: 0xd6a83c, model: "treasure" },
  { id: "razee", name: "Razee Frigate", price: 13000, hp: 850, armor: 0.16, speed: 18, regen: 3.0, color: 0x6150a3, model: "frigate" },
  { id: "fourthrate", name: "Fourth Rate", price: 14600, hp: 980, armor: 0.18, speed: 12, regen: 3.4, color: 0x8e5a3f, model: "manowar" },
  { id: "manowar", name: "Ship of the Line", price: 16800, hp: 1120, armor: 0.2, speed: 11, regen: 3.6, color: 0xd8b24a, model: "manowar" },
  { id: "firstrate", name: "First Rate", price: 20500, hp: 1320, armor: 0.2, speed: 9, regen: 4.0, color: 0xc9b05a, model: "manowar" },
];

const shipBalance = {
  skiff: { name: "Skiff", price: 0, hp: 435, armor: 0, speed: 15, regen: 1, capacity: 4, hitbox: 2.4 },
  shallop: { name: "Shallop", price: 380, hp: 495, armor: 0, speed: 17, regen: 1, capacity: 5, hitbox: 2.5 },
  pinnace: { name: "Pinnace", price: 560, hp: 555, armor: 0, speed: 20, regen: 1, capacity: 4, hitbox: 2.6 },
  hoy: { name: "Hoy", price: 760, hp: 660, armor: 0.03, speed: 11, regen: 2, capacity: 10, hitbox: 2.9 },
  cog: { name: "Cog", price: 980, hp: 780, armor: 0.05, speed: 10, regen: 2, capacity: 14, hitbox: 3.1 },
  longship: { name: "Longship", price: 1200, hp: 615, armor: 0, speed: 24, regen: 1, capacity: 6, hitbox: 3.2 },
  dogger: { name: "Dogger", price: 1320, hp: 690, armor: 0.03, speed: 18, regen: 2, capacity: 8, hitbox: 2.9 },
  dhow: { name: "Dhow", price: 1450, hp: 705, armor: 0.01, speed: 19, regen: 2, capacity: 12, hitbox: 3.0 },
  sloop: { name: "Sloop", price: 1720, hp: 675, armor: 0.02, speed: 27, regen: 1, capacity: 6, hitbox: 3.0 },
  knarr: { name: "Knarr", price: 1850, hp: 870, armor: 0.05, speed: 12, regen: 2, capacity: 16, hitbox: 3.2 },
  lugger: { name: "Lugger", price: 2050, hp: 735, armor: 0.02, speed: 22, regen: 2, capacity: 9, hitbox: 3.0 },
  tartane: { name: "Tartane", price: 2250, hp: 750, armor: 0.02, speed: 24, regen: 2, capacity: 9, hitbox: 3.1 },
  pink: { name: "Pink", price: 2500, hp: 900, armor: 0.04, speed: 15, regen: 2, capacity: 16, hitbox: 3.2 },
  cat: { name: "Catamaran", price: 2550, hp: 630, armor: 0, speed: 28, regen: 1, capacity: 5, hitbox: 3.0 },
  dart: { name: "Cutter", price: 2900, hp: 690, armor: 0.02, speed: 30, regen: 1, capacity: 5, hitbox: 3.0 },
  junk: { name: "Junk", price: 3200, hp: 990, armor: 0.06, speed: 15, regen: 3, capacity: 22, hitbox: 3.6 },
  ketch: { name: "Ketch", price: 3300, hp: 1020, armor: 0.05, speed: 16, regen: 2, capacity: 14, hitbox: 3.3 },
  schooner: { name: "Schooner", price: 3600, hp: 900, armor: 0.03, speed: 26, regen: 2, capacity: 10, hitbox: 3.3 },
  galley: { name: "Galley", price: 3900, hp: 930, armor: 0.02, speed: 23, regen: 2, capacity: 7, hitbox: 3.5 },
  xebec: { name: "Xebec", price: 4300, hp: 960, armor: 0.03, speed: 29, regen: 2, capacity: 8, hitbox: 3.4 },
  brigantine: { name: "Brigantine", price: 4850, hp: 1080, armor: 0.06, speed: 22, regen: 2, capacity: 14, hitbox: 3.6 },
  caravel: { name: "Caravel", price: 5200, hp: 1170, armor: 0.06, speed: 16, regen: 3, capacity: 18, hitbox: 3.5 },
  snow: { name: "Snow", price: 5750, hp: 1290, armor: 0.07, speed: 19, regen: 3, capacity: 18, hitbox: 3.7 },
  packet: { name: "Packet Ship", price: 6100, hp: 1050, armor: 0.03, speed: 27, regen: 2, capacity: 12, hitbox: 3.5 },
  barquentine: { name: "Barquentine", price: 6750, hp: 1200, armor: 0.05, speed: 24, regen: 2, capacity: 24, hitbox: 3.7 },
  clipper: { name: "Clipper", price: 7200, hp: 1080, armor: 0.02, speed: 33, regen: 2, capacity: 18, hitbox: 3.6 },
  fluyt: { name: "Fluyt", price: 7600, hp: 1500, armor: 0.08, speed: 13, regen: 3, capacity: 34, hitbox: 4.0 },
  storm: { name: "Sloop-of-War", price: 8500, hp: 1140, armor: 0.04, speed: 31, regen: 2, capacity: 7, hitbox: 3.4 },
  bombketch: { name: "Bomb Ketch", price: 8300, hp: 1680, armor: 0.1, speed: 10, regen: 3, capacity: 12, hitbox: 3.9 },
  barque: { name: "Barque", price: 8750, hp: 1410, armor: 0.06, speed: 21, regen: 3, capacity: 28, hitbox: 3.9 },
  corvette: { name: "Corvette", price: 9400, hp: 1530, armor: 0.08, speed: 25, regen: 3, capacity: 14, hitbox: 3.9 },
  frigate: { name: "Frigate", price: 10500, hp: 1740, armor: 0.1, speed: 24, regen: 3, capacity: 16, hitbox: 4.1 },
  merchantman: { name: "Merchantman", price: 11600, hp: 2280, armor: 0.1, speed: 11, regen: 4, capacity: 42, hitbox: 4.4 },
  carrack: { name: "Carrack", price: 12600, hp: 2340, armor: 0.11, speed: 10, regen: 4, capacity: 30, hitbox: 4.4 },
  galleon: { name: "Galleon", price: 14200, hp: 2700, armor: 0.14, speed: 12, regen: 5, capacity: 38, hitbox: 4.6 },
  eastindiaman: { name: "East Indiaman", price: 15600, hp: 2460, armor: 0.13, speed: 12, regen: 4, capacity: 52, hitbox: 4.7 },
  treasure: { name: "Treasure Junk", price: 16800, hp: 2700, armor: 0.12, speed: 9, regen: 5, capacity: 56, hitbox: 4.9 },
  razee: { name: "Razee Frigate", price: 17000, hp: 2550, armor: 0.14, speed: 18, regen: 4, capacity: 20, hitbox: 4.6 },
  fourthrate: { name: "Fourth Rate", price: 22000, hp: 2940, armor: 0.17, speed: 12, regen: 5, capacity: 22, hitbox: 4.9 },
  manowar: { name: "Ship of the Line", price: 26500, hp: 3360, armor: 0.19, speed: 11, regen: 6, capacity: 24, hitbox: 5.2 },
  firstrate: { name: "First Rate", price: 33500, hp: 3960, armor: 0.2, speed: 9, regen: 8, capacity: 26, hitbox: 5.6 },
};

for (const ship of shipCatalog) {
  const balance = shipBalance[ship.id];
  if (!balance) continue;
  Object.assign(ship, balance);
  ship.armor = clamp(ship.armor, 0, 0.2);
  ship.regen = Math.round(clamp(ship.regen, 1, 8));
}

const captainId = localStorage.islandwakeId || crypto.randomUUID();
localStorage.islandwakeId = captainId;
const playerId = crypto.randomUUID();
const state = {
  name: localStorage.islandwakeName || "",
  level: 1,
  xp: 0,
  gold: 240,
  points: 0,
  mode: "ship",
  tool: "cannon",
  dockedAt: null,
  shopTab: "goods",
  shipType: STARTER_SHIP,
  hp: shipBalance[STARTER_SHIP].hp,
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
  serverWorld: false,
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
let leviathan;
let leviathanCooldown = 0;

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

function captainName() {
  return state.name.trim() || `Captain ${captainId.slice(0, 3).toUpperCase()}`;
}

function nameGateOpen() {
  return ui.nameGate && !ui.nameGate.classList.contains("hidden");
}

function xpForLevel(level) {
  return Math.round(50 + level * 24);
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
  if (price >= 26000) return 6;
  if (price >= 16000) return 5;
  if (price >= 10000) return 4;
  if (price >= 6000) return 3;
  if (price >= 2500) return 2;
  if (price >= 900) return 1;
  return 0;
}

function crateDropCount(target) {
  const level = target.level || 1;
  const tier = target.isBot ? shipTier(target.shipType) : shipTier(state.shipType);
  return 2 + Math.floor(level / 2) + tier;
}

function shipHitRadius(type = state.shipType) {
  return getShipStats(type).hitbox || 3;
}

function cargoCount() {
  return Object.values(state.cargo).reduce((total, count) => total + count, 0);
}

function cargoCapacity() {
  return getShipStats().capacity || 8;
}

function cannonDamage() {
  return 34 + state.upgrades.damage * 4;
}

function cannonReload() {
  return Math.max(0.22, 0.78 - state.upgrades.fireRate * 0.105);
}

function cannonRange() {
  return 34 + state.upgrades.range * 12;
}

function availableShipsForIsland(island) {
  const ids = new Set([STARTER_SHIP, ...(island?.shipMarket || [])]);
  return shipCatalog.filter((ship) => ids.has(ship.id)).sort((a, b) => a.price - b.price);
}

function replacePlayerShip(type, spawnPosition = null) {
  const ship = getShipStats(type);
  const old = playerShip;
  const position = spawnPosition || old?.position || state.position;
  const rotation = old?.rotation?.clone();
  state.shipType = ship.id;
  state.hp = ship.hp;
  playerShip = makeShip(ship.id);
  playerShip.position.copy(position);
  playerShip.position.y = SHIP_WATERLINE_Y;
  if (rotation) playerShip.rotation.copy(rotation);
  if (old) scene.remove(old);
  scene.add(playerShip);
  state.position.copy(playerShip.position);
  state.rotation = playerShip.rotation.y;
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
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(SEA_SIZE, SEA_SIZE, 104, 104), mats.water);
  sea.rotation.x = -Math.PI / 2;
  sea.receiveShadow = true;
  sea.userData.wave = true;
  scene.add(sea);
  const grid = new THREE.GridHelper(SEA_SIZE, 76, 0x87e7f3, 0x87e7f3);
  grid.position.y = 0.025;
  grid.material.transparent = true;
  grid.material.opacity = 0.08;
  scene.add(grid);
  for (let i = 0; i < 230; i++) {
    const foam = new THREE.Mesh(new THREE.BoxGeometry(3 + Math.random() * 8, 0.04, 0.14), mat(0xd9fbff));
    foam.position.set((Math.random() - 0.5) * SEA_SIZE, 0.035, (Math.random() - 0.5) * SEA_SIZE);
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
  cloud.position.set((Math.random() - 0.5) * SEA_SIZE * 0.72, 42 + Math.random() * 18, (Math.random() - 0.5) * SEA_SIZE * 0.72);
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
  const radius = data.radius || 20;
  const accent = data.accent || 0xd64f45;
  const shallows = new THREE.Mesh(new THREE.CylinderGeometry(radius + 7, radius + 10, 0.08, 24), mats.shallows);
  shallows.position.y = 0.08;
  shallows.receiveShadow = true;
  group.add(shallows);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.6, radius * 0.86, 2.2, 18), mats.sand);
  base.position.y = 0.7;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.44, radius * 0.62, 1.25, 16), mat(data.color));
  grass.position.y = 2.25;
  grass.castShadow = true;
  grass.receiveShadow = true;
  group.add(grass);
  const dock = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.45, 11), mats.wood);
  dock.position.set(0, 1.45, radius - 2);
  dock.castShadow = true;
  group.add(dock);
  const obstacles = [
    { x: data.x - radius * 0.24, z: data.z - radius * 0.05, r: 3.8 },
    { x: data.x + 2.35, z: data.z + radius - 6, r: 0.8 },
    { x: data.x - 2.35, z: data.z + radius - 3, r: 0.8 },
    { x: data.x - 2.35, z: data.z + radius, r: 0.8 },
  ];
  const collisionBoxes = [
    { x: data.x - radius * 0.24, z: data.z - radius * 0.05, w: 5.8, d: 5.0 },
  ];
  const banner = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.2, 2.2), mat(accent));
  banner.position.set(2.7, 3.45, radius - 6.2);
  banner.castShadow = true;
  group.add(banner);
  for (let i = 0; i < 3; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.4, 6), mats.wood);
    post.position.set(i % 2 ? 2.3 : -2.3, 2.2, radius - 6 + i * 3);
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
  shop.position.set(-radius * 0.24, 0, -radius * 0.05);
  group.add(shop);
  if (data.theme === "norse") {
    const hall = new THREE.Mesh(new THREE.BoxGeometry(6.6, 2.4, 3.1), mat(0x8b5a32));
    hall.position.set(4.4, 3.7, -3.4);
    hall.castShadow = true;
    group.add(hall);
    const hallRoof = new THREE.Mesh(new THREE.ConeGeometry(4.0, 1.7, 4), mat(0x5a3b25));
    hallRoof.position.set(4.4, 5.45, -3.4);
    hallRoof.rotation.y = Math.PI / 4;
    group.add(hallRoof);
    collisionBoxes.push({ x: data.x + 4.4, z: data.z - 3.4, w: 7.2, d: 3.8 });
  } else if (data.theme === "pagoda") {
    for (let i = 0; i < 3; i++) {
      const tier = new THREE.Mesh(new THREE.ConeGeometry(2.7 - i * 0.4, 0.75, 4), mat(i % 2 ? 0xd99928 : accent));
      tier.position.set(4, 3.5 + i * 0.82, -3.6);
      tier.rotation.y = Math.PI / 4;
      tier.castShadow = true;
      group.add(tier);
    }
    collisionBoxes.push({ x: data.x + 4, z: data.z - 3.6, w: 4.2, d: 4.2 });
  } else if (data.theme === "fort" || data.theme === "naval") {
    for (let side of [-1, 1]) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, 3.2, 8), mats.rock);
      tower.position.set(side * 5.2, 3.55, -5.2);
      tower.castShadow = true;
      group.add(tower);
      obstacles.push({ x: data.x + side * 5.2, z: data.z - 5.2, r: 1.8 });
    }
  }
  const palmCount = data.theme === "atoll" ? 8 : 5;
  for (let i = 0; i < palmCount; i++) {
    const palm = makePalm();
    palm.position.set(Math.cos(i * 1.7) * (radius * 0.28 + Math.random() * radius * 0.22), 2.3, Math.sin(i * 1.7) * (radius * 0.28 + Math.random() * radius * 0.2));
    palm.scale.setScalar(0.75 + Math.random() * 0.45);
    group.add(palm);
    obstacles.push({ x: data.x + palm.position.x, z: data.z + palm.position.z, r: 1.35 * palm.scale.x });
  }
  for (let i = 0; i < 8; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7 + Math.random() * 0.7, 0), mats.rock);
    rock.position.set(Math.cos(i * 1.9) * (radius * 0.46 + Math.random() * radius * 0.2), 2.7, Math.sin(i * 1.9) * (radius * 0.42 + Math.random() * radius * 0.18));
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
  return {
    ...data,
    group,
    radius,
    landY: 2.9,
    obstacles,
    collisionBoxes,
    dock: new THREE.Vector3(data.x, 0, data.z + radius),
    shop: new THREE.Vector3(data.x - radius * 0.24, 0, data.z - radius * 0.05),
  };
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

function islandGroundY(island, point) {
  const dockDistance = dist2(point, island.dock);
  if (dockDistance < 7.2) return 1.72;
  const distance = dist2(point, island.group.position);
  if (distance > island.radius - 0.6) return null;
  const edgeSlope = clamp((distance - island.radius * 0.62) / (island.radius * 0.34), 0, 1);
  return island.landY - edgeSlope * 0.82;
}

function pointBlockedOnIsland(island, point) {
  if (island.obstacles.some((obstacle) => dist2(point, obstacle) < obstacle.r + 0.72)) return true;
  return island.collisionBoxes?.some((box) => Math.abs(point.x - box.x) < box.w * 0.5 + 0.45 && Math.abs(point.z - box.z) < box.d * 0.5 + 0.45);
}

function walkableGroundY(island, point) {
  const y = islandGroundY(island, point);
  if (y === null || pointBlockedOnIsland(island, point)) return null;
  return y;
}

function pointInAnyIsland(point, margin = 0) {
  return islands.some((island) => dist2(point, island.group.position) < island.radius + margin);
}

function randomWaterPoint(range = MAP_LIMIT * 0.9, minFromStart = 0) {
  const point = new THREE.Vector3();
  for (let i = 0; i < 80; i++) {
    point.set((Math.random() - 0.5) * range * 2, SHIP_WATERLINE_Y, (Math.random() - 0.5) * range * 2);
    if (dist2(point, state.position) >= minFromStart && !pointInAnyIsland(point, 12)) return point.clone();
  }
  return new THREE.Vector3(range * 0.65, SHIP_WATERLINE_Y, range * 0.65);
}

function landingPointForShip(island, shipPosition) {
  const center = island.group.position;
  const baseAngle = Math.atan2(shipPosition.x - center.x, shipPosition.z - center.z);
  const offsets = [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05, Math.PI];
  for (const offset of offsets) {
    const angle = baseAngle + offset;
    const point = new THREE.Vector3(
      center.x + Math.sin(angle) * (island.radius - 4.1),
      0,
      center.z + Math.cos(angle) * (island.radius - 4.1),
    );
    const y = walkableGroundY(island, point);
    if (y !== null) return { point, y };
  }
  const fallback = island.dock.clone().add(new THREE.Vector3(0, 0, -4));
  return { point: fallback, y: islandGroundY(island, fallback) || island.landY };
}

function collidesWithShipAt(point, ownType = state.shipType) {
  const ownRadius = shipHitRadius(ownType);
  for (const bot of bots) {
    if (dist2(point, bot.group.position) < (ownRadius + shipHitRadius(bot.shipType)) * 0.72) return true;
  }
  for (const remote of remotePlayers.values()) {
    if (remote.group.visible && dist2(point, remote.group.position) < (ownRadius + shipHitRadius(remote.shipType)) * 0.72) return true;
  }
  return false;
}

const DEFAULT_HULL_TUNING = { stern: 0.46, bow: 0.05, mid: 0.96, fullness: 0.72, bowLift: 0.18, sternLift: 0.09, keel: 0.6 };
const HULL_TUNING = {
  skiff: { stern: 0.42, bow: 0.04, mid: 0.92, fullness: 0.72, bowLift: 0.2, sternLift: 0.1, keel: 0.55 },
  dart: { stern: 0.22, bow: 0.025, mid: 0.78, fullness: 0.58, bowLift: 0.28, sternLift: 0.06, keel: 0.5 },
  storm: { stern: 0.28, bow: 0.025, mid: 0.82, fullness: 0.6, bowLift: 0.26, sternLift: 0.06, keel: 0.5 },
  clipper: { stern: 0.22, bow: 0.02, mid: 0.84, fullness: 0.55, bowLift: 0.24, sternLift: 0.05, keel: 0.55 },
  schooner: { stern: 0.28, bow: 0.03, mid: 0.86, fullness: 0.6, bowLift: 0.22, sternLift: 0.06, keel: 0.52 },
  dhow: { stern: 0.2, bow: 0.02, mid: 0.78, fullness: 0.56, bowLift: 0.34, sternLift: 0.04, keel: 0.52 },
  xebec: { stern: 0.2, bow: 0.02, mid: 0.82, fullness: 0.55, bowLift: 0.32, sternLift: 0.06, keel: 0.52 },
  lugger: { stern: 0.3, bow: 0.04, mid: 0.84, fullness: 0.62, bowLift: 0.2, sternLift: 0.08, keel: 0.52 },
  brig: { stern: 0.55, bow: 0.05, mid: 0.98, fullness: 0.72, bowLift: 0.16, sternLift: 0.1, keel: 0.62 },
  cog: { stern: 0.72, bow: 0.08, mid: 1.02, fullness: 0.88, bowLift: 0.14, sternLift: 0.16, keel: 0.58 },
  junk: { stern: 0.66, bow: 0.1, mid: 1.0, fullness: 0.85, bowLift: 0.12, sternLift: 0.12, keel: 0.52 },
  fluyt: { stern: 0.78, bow: 0.08, mid: 1.08, fullness: 0.95, bowLift: 0.12, sternLift: 0.1, keel: 0.66 },
  galleon: { stern: 0.72, bow: 0.06, mid: 1.08, fullness: 0.9, bowLift: 0.18, sternLift: 0.15, keel: 0.76 },
  carrack: { stern: 0.78, bow: 0.08, mid: 1.1, fullness: 0.95, bowLift: 0.16, sternLift: 0.2, keel: 0.72 },
  manowar: { stern: 0.72, bow: 0.06, mid: 1.12, fullness: 0.92, bowLift: 0.15, sternLift: 0.12, keel: 0.82 },
  frigate: { stern: 0.52, bow: 0.04, mid: 1.0, fullness: 0.72, bowLift: 0.18, sternLift: 0.08, keel: 0.7 },
  turtle: { stern: 0.82, bow: 0.12, mid: 1.12, fullness: 1.05, bowLift: 0.08, sternLift: 0.08, keel: 0.6 },
  treasure: { stern: 0.82, bow: 0.1, mid: 1.14, fullness: 1.0, bowLift: 0.12, sternLift: 0.16, keel: 0.72 },
  longship: { stern: 0.05, bow: 0.04, mid: 0.68, fullness: 0.55, bowLift: 0.3, sternLift: 0.24, keel: 0.45 },
  galley: { stern: 0.08, bow: 0.03, mid: 0.72, fullness: 0.52, bowLift: 0.26, sternLift: 0.16, keel: 0.44 },
  cat: { stern: 0.18, bow: 0.04, mid: 0.65, fullness: 0.55, bowLift: 0.18, sternLift: 0.08, keel: 0.34 },
  ironclad: { stern: 0.76, bow: 0.14, mid: 1.08, fullness: 1.05, bowLift: 0.05, sternLift: 0.05, keel: 0.48 },
};

function hullProfile(profile = "skiff") {
  return { ...DEFAULT_HULL_TUNING, ...(HULL_TUNING[profile] || {}) };
}

function hullMesh(length, width, height, material = mats.hull, profile = "skiff") {
  const tuning = hullProfile(profile);
  const vertices = [];
  const indices = [];
  const stationCount = 10;
  const sectionCount = 7;
  const addVertex = (x, y, z) => {
    vertices.push(x, y, z);
    return vertices.length / 3 - 1;
  };
  for (let i = 0; i < stationCount; i++) {
    const t = i / (stationCount - 1);
    const z = length * (0.52 - t * 1.1);
    const midCurve = Math.pow(Math.sin(t * Math.PI), tuning.fullness);
    const endWidth = tuning.stern * (1 - t) + tuning.bow * t;
    const beam = width * (endWidth * (1 - midCurve) + tuning.mid * midCurve);
    const topHalf = beam * 0.48;
    const chineHalf = beam * (0.38 + 0.08 * midCurve);
    const bilgeHalf = beam * (0.18 + 0.04 * midCurve);
    const bowLift = Math.pow(t, 2.2) * tuning.bowLift * height;
    const sternLift = Math.pow(1 - t, 2.4) * tuning.sternLift * height;
    const deckY = height * (0.92 + 0.08 * Math.sin(t * Math.PI)) + bowLift + sternLift;
    const chineY = height * (0.35 + 0.06 * midCurve);
    const bilgeY = height * (0.08 + 0.04 * midCurve);
    const keelY = -height * (0.08 + tuning.keel * (0.18 + 0.82 * midCurve));
    [
      [-topHalf, deckY, z],
      [-chineHalf, chineY, z],
      [-bilgeHalf, bilgeY, z],
      [0, keelY, z],
      [bilgeHalf, bilgeY, z],
      [chineHalf, chineY, z],
      [topHalf, deckY, z],
    ].forEach((point) => addVertex(...point));
  }
  for (let i = 0; i < stationCount - 1; i++) {
    for (let j = 0; j < sectionCount - 1; j++) {
      const a = i * sectionCount + j;
      const b = i * sectionCount + j + 1;
      const c = (i + 1) * sectionCount + j;
      const d = (i + 1) * sectionCount + j + 1;
      indices.push(a, c, b, b, c, d);
    }
    const leftTop = i * sectionCount;
    const rightTop = i * sectionCount + sectionCount - 1;
    const nextLeftTop = (i + 1) * sectionCount;
    const nextRightTop = (i + 1) * sectionCount + sectionCount - 1;
    indices.push(leftTop, rightTop, nextLeftTop, rightTop, nextRightTop, nextLeftTop);
  }
  const sternCenter = addVertex(0, height * 0.34, length * 0.52);
  const bowCenter = addVertex(0, height * (0.42 + tuning.bowLift), -length * 0.58);
  for (let j = 0; j < sectionCount - 1; j++) {
    indices.push(sternCenter, j + 1, j);
    const bowStart = (stationCount - 1) * sectionCount;
    indices.push(bowCenter, bowStart + j, bowStart + j + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const renderMaterial = material.clone();
  renderMaterial.side = THREE.DoubleSide;
  renderMaterial.needsUpdate = true;
  const mesh = new THREE.Mesh(geo, renderMaterial);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addMastBase(group, z, scale) {
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.24 * scale, 0.12 * scale, 10), mats.hullDark);
  collar.position.set(0, 1.34 * scale, z);
  collar.castShadow = true;
  group.add(collar);
}

function addSail(group, x, z, scale, color = 0xfff4da) {
  const mastX = 0;
  const mastZ = z;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * scale, 0.14 * scale, 5.5 * scale, 7), mats.dark);
  mast.position.set(mastX, 3.2 * scale, mastZ);
  mast.castShadow = true;
  group.add(mast);
  addMastBase(group, mastZ, scale);
  const sail = foreAftLateenPanel(2.8 * scale, 3.45 * scale, color, 0.12 * scale);
  sail.position.set(0.04 * scale, 3.45 * scale, mastZ + 0.08 * scale);
  group.add(sail);
  addRope(
    group,
    new THREE.Vector3(mastX, 5.25 * scale, mastZ + 1.25 * scale),
    new THREE.Vector3(mastX, 2.3 * scale, mastZ - 1.25 * scale),
    scale,
    0.045,
  );
  addRope(
    group,
    new THREE.Vector3(mastX, 2.28 * scale, mastZ + 1.1 * scale),
    new THREE.Vector3(mastX, 2.12 * scale, mastZ - 1.2 * scale),
    scale,
    0.036,
  );
  addRope(group, new THREE.Vector3(mastX, 5.85 * scale, mastZ), new THREE.Vector3(-1.05 * scale, 1.55 * scale, mastZ + 1.25 * scale), scale, 0.015);
  addRope(group, new THREE.Vector3(mastX, 5.85 * scale, mastZ), new THREE.Vector3(1.05 * scale, 1.55 * scale, mastZ + 1.25 * scale), scale, 0.015);
  addRope(group, new THREE.Vector3(mastX, 5.85 * scale, mastZ), new THREE.Vector3(0, 1.5 * scale, mastZ - 1.7 * scale), scale, 0.014);
}

function addSquareSail(group, x, z, scale, color = 0xfff4da, tiers = 1) {
  const mastX = 0;
  const mastZ = z;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.16 * scale, (5.2 + tiers) * scale, 7), mats.dark);
  mast.position.set(mastX, 3.25 * scale, mastZ);
  mast.castShadow = true;
  group.add(mast);
  addMastBase(group, mastZ, scale);
  for (let i = 0; i < tiers; i++) {
    const y = (3.15 + i * 1.15) * scale;
    const sailWidth = (2.35 - i * 0.28) * scale;
    const sailHeight = (1.08 - i * 0.06) * scale;
    const sail = clothPanel(sailWidth, sailHeight, color, 0.16 * scale);
    sail.position.set(mastX, y, mastZ - 0.05 * scale);
    group.add(sail);
    const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * scale, 0.045 * scale, (2.55 - i * 0.2) * scale, 6), mats.dark);
    yard.rotation.z = Math.PI / 2;
    yard.position.set(mastX, y + 0.5 * scale, mastZ - 0.08 * scale);
    group.add(yard);
    for (let seam = -1; seam <= 1; seam += 2) {
      addRope(
        group,
        new THREE.Vector3(mastX - sailWidth * 0.45, y + seam * sailHeight * 0.18, mastZ - 0.11 * scale),
        new THREE.Vector3(mastX + sailWidth * 0.45, y + seam * sailHeight * 0.18, mastZ - 0.11 * scale),
        scale,
        0.014,
      );
    }
    for (let seam = -1; seam <= 1; seam += 2) {
      addRope(
        group,
        new THREE.Vector3(mastX + seam * sailWidth * 0.18, y - sailHeight * 0.43, mastZ - 0.12 * scale),
        new THREE.Vector3(mastX + seam * sailWidth * 0.18, y + sailHeight * 0.43, mastZ - 0.12 * scale),
        scale,
        0.011,
      );
    }
    addRope(group, new THREE.Vector3(mastX, (5.75 + tiers * 0.35) * scale, mastZ), new THREE.Vector3(mastX - (1.25 - i * 0.1) * scale, y + 0.45 * scale, mastZ), scale * 0.82, 0.014);
    addRope(group, new THREE.Vector3(mastX, (5.75 + tiers * 0.35) * scale, mastZ), new THREE.Vector3(mastX + (1.25 - i * 0.1) * scale, y + 0.45 * scale, mastZ), scale * 0.82, 0.014);
  }
}

function addRope(group, start, end, scale = 1, radius = 0.022, material = mats.rope) {
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(radius * scale, radius * scale, 1, 6), material);
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

function foreAftLateenPanel(length, height, color, belly = 0.12) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute([
    belly, height * 0.52, length * 0.48,
    -belly * 0.45, -height * 0.42, -length * 0.55,
    -belly * 0.25, -height * 0.34, length * 0.34,
    belly, -height * 0.05, -length * 0.04,
  ], 3));
  geo.setIndex([0, 1, 3, 0, 3, 2, 1, 2, 3]);
  geo.computeVertexNormals();
  const sail = new THREE.Mesh(geo, sailMaterial(color));
  sail.castShadow = true;
  return sail;
}

function addCabin(group, x, z, width, depth, scale, color = 0x6b432b) {
  const px = x;
  const pz = z;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(width * scale, 1.0 * scale, depth * scale), mat(color));
  cabin.position.set(px, 1.82 * scale, pz);
  cabin.castShadow = true;
  group.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry((width + 0.35) * scale, 0.22 * scale, (depth + 0.28) * scale), mat(0x2f3342));
  roof.position.set(px, 2.43 * scale, pz);
  roof.castShadow = true;
  group.add(roof);
  for (let side of [-1, 1]) {
    const window = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 0.34 * scale, 0.38 * scale), mats.gold);
    window.position.set(px + side * (width * 0.52) * scale, 1.86 * scale, pz);
    group.add(window);
  }
}

function addSternGallery(group, length, width, scale, color) {
  const gallery = new THREE.Mesh(new THREE.BoxGeometry(width * 0.64 * scale, 0.72 * scale, 0.28 * scale), mat(color));
  gallery.position.set(0, 1.55 * scale, length * 0.41 * scale);
  gallery.castShadow = true;
  group.add(gallery);
  for (let i = -1; i <= 1; i++) {
    const window = new THREE.Mesh(new THREE.BoxGeometry(0.34 * scale, 0.26 * scale, 0.05 * scale), mats.gold);
    window.position.set(i * width * 0.18 * scale, 1.58 * scale, length * 0.49 * scale);
    group.add(window);
  }
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * scale, 0.035 * scale, width * 0.72 * scale, 7), mats.wood);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0, 1.92 * scale, length * 0.5 * scale);
  group.add(rail);
}

function addCannonPorts(group, count, width, length, scale, profile = "skiff") {
  for (let i = 0; i < count; i++) {
    const z = (-length * 0.28 + (i / Math.max(1, count - 1)) * length * 0.55) * scale;
    for (let side of [-1, 1]) {
      const port = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 0.28 * scale, 0.32 * scale), mats.dark);
      const sideX = side * hullSideXAt(length, width, scale, z, 0.98, profile);
      port.position.set(sideX, 1.25 * scale, z);
      group.add(port);
      const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, 0.5 * scale, 8), mats.dark);
      muzzle.rotation.z = Math.PI / 2;
      muzzle.position.set(sideX + side * 0.18 * scale, 1.25 * scale, z);
      group.add(muzzle);
    }
  }
}

function addOars(group, count, width, length, scale, profile = "skiff") {
  for (let i = 0; i < count; i++) {
    const z = (-length * 0.28 + i * length * 0.56 / Math.max(1, count - 1)) * scale;
    for (let side of [-1, 1]) {
      const rowlockX = side * hullSideXAt(length, width, scale, z, 1.02, profile);
      const rowlock = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 0.08 * scale, 0.16 * scale), mats.hullDark);
      rowlock.position.set(rowlockX, 1.22 * scale, z);
      group.add(rowlock);
      const grip = new THREE.Vector3(rowlockX, 1.18 * scale, z);
      const bladePoint = new THREE.Vector3(rowlockX + side * 1.65 * scale, 0.82 * scale, z);
      addRope(group, grip, bladePoint, scale, 0.035, mats.wood);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.38 * scale, 0.05 * scale, 0.18 * scale), mats.wood);
      blade.position.copy(bladePoint);
      blade.rotation.z = -0.22 * side;
      group.add(blade);
    }
  }
}

function addHullDetailLines(group, length, width, scale, tier, profile = "skiff") {
  const rows = 2 + Math.min(3, tier);
  for (let side of [-1, 1]) {
    for (let row = 0; row < rows; row++) {
      const y = (0.55 + row * 0.23) * scale;
      addHullSideLine(
        group,
        length,
        width,
        scale,
        side,
        y,
        -length * 0.34 * scale,
        length * 0.34 * scale,
        mats.rope,
        0.014,
        0.72 - row * 0.035,
        profile,
      );
    }
    const ribCount = 4 + tier;
    for (let i = 0; i < ribCount; i++) {
      const t = i / Math.max(1, ribCount - 1);
      const z = (-length * 0.33 + t * length * 0.66) * scale;
      const lowerX = side * hullSideXAt(length, width, scale, z, 0.68, profile);
      const upperX = side * hullSideXAt(length, width, scale, z, 0.94, profile);
      addRope(group, new THREE.Vector3(lowerX, 0.36 * scale, z), new THREE.Vector3(upperX, 1.26 * scale, z), scale, 0.022);
    }
  }
}

function addDeckFittings(group, length, width, scale, tier, color, profile = "skiff") {
  const hatch = hullMesh(1.0 * scale, 0.72 * scale, 0.12 * scale, mats.hullDark, "skiff");
  hatch.position.set(0, 1.28 * scale, -0.35 * scale);
  hatch.scale.z = 0.72;
  group.add(hatch);
  const cargoCount = 1 + Math.min(3, tier);
  for (let i = 0; i < cargoCount; i++) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.2 * scale, 0.44 * scale, 8), mats.wood);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(((i % 2) ? 0.52 : -0.52) * width * 0.22 * scale, 1.38 * scale, (0.18 + i * 0.52) * scale);
    group.add(barrel);
  }
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.22 * scale, 0.035 * scale, 8, 18), mats.rope);
  coil.rotation.x = Math.PI / 2;
  coil.position.set(width * 0.17 * scale, 1.42 * scale, -length * 0.16 * scale);
  group.add(coil);
  const anchor = new THREE.Mesh(new THREE.TorusGeometry(0.22 * scale, 0.045 * scale, 8, 16, Math.PI * 1.3), mats.dark);
  anchor.position.set(-hullSideXAt(length, width, scale, -length * 0.34 * scale, 0.96, profile), 1.12 * scale, -length * 0.34 * scale);
  anchor.rotation.set(Math.PI / 2, 0, 0.45);
  group.add(anchor);
  if (tier >= 2) {
    for (let side of [-1, 1]) {
      const lanternX = side * hullSideXAt(length, width, scale, length * 0.3 * scale, 0.86, profile);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * scale, 0.03 * scale, 0.42 * scale, 6), mats.dark);
      post.position.set(lanternX, 1.52 * scale, length * 0.3 * scale);
      group.add(post);
      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.14 * scale, 8, 6), mats.gold);
      lantern.position.set(lanternX, 1.72 * scale, length * 0.3 * scale);
      group.add(lantern);
    }
  }
  if (tier >= 3) {
    const crest = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.22 * scale, 0.08 * scale, 16), mat(color));
    crest.rotation.x = Math.PI / 2;
    crest.position.set(0, 1.72 * scale, length * 0.38 * scale);
    group.add(crest);
  }
}

function addBowspritAndRudder(group, length, width, scale, tier) {
  const bowsprit = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * scale, 0.075 * scale, (1.5 + tier * 0.22) * scale, 7), mats.wood);
  bowsprit.rotation.x = Math.PI / 2.25;
  bowsprit.position.set(0, 1.2 * scale, -length * 0.5 * scale);
  group.add(bowsprit);
  const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.1 * scale, 0.62 * scale, 0.42 * scale), mats.hullDark);
  rudder.position.set(0, 0.64 * scale, length * 0.48 * scale);
  group.add(rudder);
}

function deckWidthAt(length, width, scale, z, profile = "skiff") {
  return hullSideXAt(length, width, scale, z, 0.72, profile) * 2;
}

function hullSideXAt(length, width, scale, z, inset = 1, profile = "skiff") {
  const tuning = hullProfile(profile);
  const localZ = z / scale;
  const t = clamp((0.52 - localZ / length) / 1.1, 0, 1);
  const midCurve = Math.pow(Math.max(0.001, Math.sin(t * Math.PI)), tuning.fullness);
  const endWidth = tuning.stern * (1 - t) + tuning.bow * t;
  const beam = width * scale * (endWidth * (1 - midCurve) + tuning.mid * midCurve);
  return beam * 0.45 * inset;
}

function addHullSideLine(group, length, width, scale, side, y, zStart, zEnd, material, radius = 0.026, inset = 0.98, profile = "skiff") {
  const points = [];
  const segments = 7;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const z = zStart + (zEnd - zStart) * t;
    points.push(new THREE.Vector3(side * hullSideXAt(length, width, scale, z, inset, profile), y, z));
  }
  for (let i = 1; i < points.length; i++) {
    addRope(group, points[i - 1], points[i], scale, radius, material);
  }
}

function addDeckPlanking(group, length, width, scale, tier, profile = "skiff") {
  const deckLength = length * 0.62 * scale;
  const deckY = 1.32 * scale;
  const plankCount = 3 + Math.min(3, tier);
  for (let i = 0; i < plankCount; i++) {
    const x = (i - (plankCount - 1) / 2) * width * 0.12 * scale;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.026 * scale, 0.025 * scale, deckLength), mats.hullDark);
    plank.position.set(x, deckY, 0);
    group.add(plank);
  }
  const beamCount = 4 + Math.min(4, tier);
  for (let i = 0; i < beamCount; i++) {
    const t = i / Math.max(1, beamCount - 1);
    const z = (-deckLength * 0.42 + t * deckLength * 0.84);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(deckWidthAt(length, width, scale, z, profile), 0.025 * scale, 0.045 * scale), mats.hullDark);
    beam.position.set(0, deckY + 0.015 * scale, z);
    group.add(beam);
  }
}

function addHullPaintBands(group, length, width, scale, spec, tier, profile = "skiff") {
  const bandLength = length * (tier >= 3 ? 0.74 : 0.62) * scale;
  const bandRows = tier >= 3 ? [0.78, 1.04] : [0.9];
  for (let side of [-1, 1]) {
    bandRows.forEach((row, index) => {
      addHullSideLine(
        group,
        length,
        width,
        scale,
        side,
        row * scale,
        -bandLength * 0.5,
        bandLength * 0.5,
        mat(index ? spec.color : 0x2f241e),
        0.022,
        index ? 0.94 : 0.9,
        profile,
      );
    });
  }
}

function mastPlan(type, length) {
  if (["skiff", "shallop", "dhow", "cat", "cog", "hoy", "longship", "knarr"].includes(type)) return [0];
  if (["sloop", "storm", "dart", "lugger", "dogger", "tartane"].includes(type)) return [-length * 0.16, length * 0.18];
  if (["galleon", "carrack", "merchantman", "eastindiaman", "treasure", "manowar", "fourthrate", "firstrate", "frigate", "razee"].includes(type)) {
    return [-length * 0.28, 0, length * 0.28];
  }
  return [-length * 0.22, length * 0.18];
}

function addStandingRigging(group, type, length, width, scale, tier) {
  if (["cat"].includes(type)) return;
  const topY = (4.25 + Math.min(1.2, tier * 0.22)) * scale;
  const deckY = 1.42 * scale;
  mastPlan(type, length).forEach((mastZ) => {
    const z = mastZ * scale;
    for (let side of [-1, 1]) {
      const railX = side * width * 0.44 * scale;
      addRope(group, new THREE.Vector3(0, topY, z), new THREE.Vector3(railX, deckY, z - length * 0.18 * scale), scale, 0.013);
      addRope(group, new THREE.Vector3(0, topY, z), new THREE.Vector3(railX, deckY, z + length * 0.16 * scale), scale, 0.013);
    }
  });
}

function addAttachedPennant(group, length, scale, color, tier) {
  const z = length * 0.38 * scale;
  const poleHeight = (1.05 + Math.min(0.4, tier * 0.08)) * scale;
  const deckY = 1.52 * scale;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.028 * scale, 0.036 * scale, poleHeight, 6), mats.dark);
  pole.position.set(0, deckY + poleHeight * 0.5, z);
  group.add(pole);
  const flag = clothPanel(0.72 * scale, 0.36 * scale, color, 0.025 * scale);
  flag.position.set(0.32 * scale, deckY + poleHeight * 0.78, z);
  flag.rotation.z = -0.08;
  group.add(flag);
}

function addRailCaps(group, length, width, scale, tier, profile = "skiff") {
  const actualLength = length * scale;
  const railLength = actualLength * 0.66;
  for (let side of [-1, 1]) {
    addHullSideLine(group, length, width, scale, side, 1.58 * scale, -railLength * 0.5, railLength * 0.5, mats.wood, 0.04, 1.0, profile);
  }
  if (tier >= 3) {
    const sternRail = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72 * scale, 0.08 * scale, 0.08 * scale), mats.wood);
    sternRail.position.set(0, 1.62 * scale, actualLength * 0.42);
    group.add(sternRail);
  }
}

function addWindowRow(group, width, z, y, scale, color = 0xd99928, count = 5) {
  const rowWidth = width * scale * 0.56;
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const window = new THREE.Mesh(new THREE.BoxGeometry(0.28 * scale, 0.2 * scale, 0.045 * scale), mat(color));
    window.position.set((t - 0.5) * rowWidth, y, z);
    group.add(window);
  }
}

function addLargeShipArchitecture(group, type, length, width, scale, spec, tier, profile = "skiff") {
  const actualLength = length * scale;
  const actualWidth = width * scale;
  const sternZ = actualLength * 0.34;
  const bowZ = -actualLength * 0.34;
  const castleColor = ["galleon", "carrack", "eastindiaman", "merchantman", "treasure"].includes(type) ? 0x654231 : 0x40342f;
  const sternDeck = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * 0.68, 0.7 * scale, actualLength * 0.17), mat(castleColor));
  sternDeck.position.set(0, 1.57 * scale, sternZ);
  sternDeck.castShadow = true;
  group.add(sternDeck);
  const sternRoof = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * 0.72, 0.16 * scale, actualLength * 0.19), mats.hullDark);
  sternRoof.position.set(0, 2.01 * scale, sternZ);
  sternRoof.castShadow = true;
  group.add(sternRoof);
  addWindowRow(group, width, sternZ + actualLength * 0.09, 1.68 * scale, scale, 0xd99928, type === "firstrate" ? 7 : 5);

  const quarterDepth = actualLength * 0.12;
  for (let side of [-1, 1]) {
    const quarter = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * 0.16, 0.46 * scale, quarterDepth), mat(castleColor));
    quarter.position.set(side * hullSideXAt(length, width, scale, sternZ, 0.9, profile), 1.5 * scale, sternZ + actualLength * 0.02);
    quarter.castShadow = true;
    group.add(quarter);
    const quarterWindow = new THREE.Mesh(new THREE.BoxGeometry(0.045 * scale, 0.2 * scale, quarterDepth * 0.52), mats.gold);
    quarterWindow.position.set(side * hullSideXAt(length, width, scale, sternZ, 1.02, profile), 1.54 * scale, sternZ + actualLength * 0.02);
    group.add(quarterWindow);
  }

  const forecastle = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * 0.48, 0.42 * scale, actualLength * 0.12), mat(castleColor));
  forecastle.position.set(0, 1.42 * scale, bowZ);
  forecastle.castShadow = true;
  group.add(forecastle);
  const forecastleRail = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * 0.52, 0.08 * scale, actualLength * 0.13), mats.wood);
  forecastleRail.position.set(0, 1.69 * scale, bowZ);
  group.add(forecastleRail);

  const rows = tier >= 5 ? [0.98, 1.2] : [1.06];
  rows.forEach((row, rowIndex) => {
    for (let side of [-1, 1]) {
      for (let i = 0; i < 7 + rowIndex * 2; i++) {
        const t = i / (6 + rowIndex * 2);
        const z = -actualLength * 0.27 + t * actualLength * 0.54;
        const port = new THREE.Mesh(new THREE.BoxGeometry(0.055 * scale, 0.17 * scale, 0.18 * scale), mats.dark);
        const sideX = side * hullSideXAt(length, width, scale, z, 0.98, profile);
        port.position.set(sideX, row * scale, z);
        group.add(port);
        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.062 * scale, 0.02 * scale, 0.23 * scale), mat(spec.color));
        trim.position.set(sideX + side * 0.01 * scale, (row + 0.12) * scale, z);
        group.add(trim);
      }
    }
  });
}

function addHistoricalDetails(group, type, hullLength, hullWidth, scale, spec, profile = "skiff") {
  const tier = spec.price > 16000 ? 5 : spec.price > 10000 ? 4 : spec.price > 5500 ? 3 : spec.price > 2500 ? 2 : spec.price > 800 ? 1 : 0;
  const customCabinTypes = new Set([
    "bombketch", "caravel", "carrack", "cog", "dart", "eastindiaman", "fluyt", "fourthrate",
    "galley", "galleon", "hoy", "junk", "ketch", "knarr", "manowar", "merchantman",
    "packet", "pink", "pinnace", "razee", "schooner", "sloop", "storm", "treasure",
    "xebec", "tartane", "firstrate",
  ]);
  const customDeckTypes = new Set(["eastindiaman", "knarr", "merchantman"]);
  const customProwTypes = new Set(["cat", "dhow", "galley", "longship", "turtle", "ironclad"]);
  const gunDeckTypes = new Set([
    "bombketch", "brigantine", "barque", "barquentine", "corvette", "frigate", "fourthrate",
    "galleon", "manowar", "merchantman", "eastindiaman", "razee", "storm", "treasure",
    "firstrate", "snow",
  ]);
  addHullDetailLines(group, hullLength, hullWidth, scale, tier, profile);
  addDeckPlanking(group, hullLength, hullWidth, scale, tier, profile);
  addHullPaintBands(group, hullLength, hullWidth, scale, spec, tier, profile);
  if (!customDeckTypes.has(type)) addDeckFittings(group, hullLength, hullWidth, scale, tier, spec.color, profile);
  if (!customProwTypes.has(type)) addBowspritAndRudder(group, hullLength, hullWidth, scale, tier);
  addAttachedPennant(group, hullLength, scale, spec.color, tier);
  addRailCaps(group, hullLength, hullWidth, scale, tier, profile);
  if (tier >= 4 || ["galleon", "carrack", "eastindiaman", "treasure", "manowar", "fourthrate", "firstrate", "razee"].includes(type)) {
    addLargeShipArchitecture(group, type, hullLength, hullWidth, scale, spec, tier, profile);
  }
  if (gunDeckTypes.has(type) || tier >= 4) addCannonPorts(group, 1 + Math.min(5, tier), hullWidth, hullLength, scale, profile);
  if (!customCabinTypes.has(type)) {
    if (tier >= 2) addCabin(group, 0, hullLength * 0.22, Math.min(2.4, hullWidth * 0.68), 1.35 + tier * 0.18, scale, 0x7a5030);
    if (tier >= 3) {
      addCabin(group, 0, -hullLength * 0.24, Math.min(2.0, hullWidth * 0.58), 1.0, scale * 0.9, 0x604237);
      addSternGallery(group, hullLength, hullWidth, scale, 0x5f4235);
    }
  }
  if (tier >= 3) {
    const figure = new THREE.Mesh(new THREE.ConeGeometry(0.2 * scale, 0.8 * scale, 8), mats.gold);
    figure.rotation.x = Math.PI / 2;
    figure.position.set(0, 1.22 * scale, -hullLength * 0.5 * scale);
    group.add(figure);
  }
  if (type === "skiff" || type === "cat" || type === "longship") {
    addOars(group, type === "longship" ? 7 : type === "cat" ? 4 : 3, hullWidth, hullLength, scale, profile);
  }
}

function makeShip(type = "skiff", remote = false) {
  const spec = getShipStats(type);
  const group = new THREE.Group();
  group.userData.shipType = type;
  group.userData.hitRadius = shipHitRadius(type);
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
    addHullSideLine(
      group,
      hullSize[0],
      hullSize[1],
      scale,
      side,
      1.4 * scale,
      -hullSize[0] * 0.31 * scale,
      hullSize[0] * 0.31 * scale,
      mat(spec.color),
      0.035,
      0.96,
      profile,
    );
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
      const x = side * hullSideXAt(hullSize[0], hullSize[1], scale, z, 0.98, profile);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * scale, 0.055 * scale, 0.52 * scale, 6), mats.wood);
      post.position.set(x, 1.55 * scale, z);
      post.castShadow = true;
      group.add(post);
      railPath.push(new THREE.Vector3(x, 1.81 * scale, z));
    }
    for (let i = 1; i < railPath.length; i++) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * scale, 0.04 * scale, 1, 6), mats.wood);
      setCylinderBetween(rail, railPath[i - 1], railPath[i]);
      rail.castShadow = true;
      group.add(rail);
    }
  });
  const stemPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.13 * scale, 1.25 * scale, 7), mat(spec.color));
  stemPost.position.set(0, 1.1 * scale, (-hullSize[0] * 0.5) * scale);
  stemPost.rotation.x = -0.28;
  stemPost.castShadow = true;
  group.add(stemPost);
  const sternPost = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * scale, 0.11 * scale, 1.05 * scale, 7), mats.hullDark);
  sternPost.position.set(0, 1.06 * scale, (hullSize[0] * 0.47) * scale);
  sternPost.rotation.x = 0.2;
  sternPost.castShadow = true;
  group.add(sternPost);
  const keelLine = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * scale, 0.045 * scale, hullSize[0] * 0.78 * scale, 6), mats.dark);
  keelLine.rotation.x = Math.PI / 2;
  keelLine.position.set(0, 0.16 * scale, -0.05 * scale);
  group.add(keelLine);
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
    const house = new THREE.Mesh(new THREE.BoxGeometry(1.8 * scale, 0.62 * scale, 1.18 * scale), mats.wood);
    house.position.set(0, 1.55 * scale, 1.55 * scale);
    house.castShadow = true;
    group.add(house);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.25 * scale, 0.38 * scale, 1.45 * scale), mat(0xb7493f));
    roof.position.set(0, 1.98 * scale, 1.55 * scale);
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
    addDeckFittings(group, hullSize[0], hullSize[1], scale, 3, spec.color, profile);
  } else if (type === "shallop") {
    addSail(group, 0, -0.1, 0.72, 0xf6ead0);
    addOars(group, 3, hullSize[1], hullSize[0], scale, profile);
  } else if (type === "pinnace") {
    addSail(group, -0.22, -0.9, 0.72, 0xd9f8ff);
    addSail(group, 0.28, 0.75, 0.62, 0xf7f0df);
    addCabin(group, 0, 1.55, 1.35, 0.85, scale * 0.75, 0x76523d);
  } else if (type === "dart") {
    addSail(group, 0, 0, 0.75, 0xc8fbff);
    addCabin(group, 0, 1.75, 1.25, 0.78, scale * 0.72, 0x4d5f62);
  } else if (type === "schooner" || type === "packet") {
    addSail(group, -0.35, -1.4, 0.82, 0xd8f5ff);
    addSail(group, 0.35, 0.9, 1.08, 0xbfefff);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.35 * scale, 0.48 * scale, 0.95 * scale), mat(0x9ee8ff));
    glass.position.set(0, 1.62 * scale, 1.75 * scale);
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
    prow.position.set(0, 1.32 * scale, -hullSize[0] * 0.48 * scale);
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
    shell.position.y = 1.22 * scale;
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
    addCabin(group, 0, 1.9, 1.45, 0.9, scale * 0.82, 0x4f4c65);
  } else if (type === "cog" || type === "hoy") {
    addSquareSail(group, 0, -0.2, 0.92, 0xf1e5c4, 1);
    addCabin(group, 0, 2.0, 2.0, 1.0, scale * 0.85, 0x7a5030);
    const highStern = new THREE.Mesh(new THREE.BoxGeometry(2.3 * scale, 0.85 * scale, 0.9 * scale), mat(0x7a5030));
    highStern.position.set(0, 1.72 * scale, 2.55 * scale);
    group.add(highStern);
  } else if (type === "longship") {
    addSquareSail(group, 0, -0.15, 0.78, 0xf4d2b8, 1);
    const dragon = new THREE.Mesh(new THREE.ConeGeometry(0.28 * scale, 1.1 * scale, 8), mat(0xd8b24a));
    dragon.rotation.x = Math.PI / 2.25;
    dragon.position.set(0, 1.54 * scale, -4.08 * scale);
    group.add(dragon);
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.34 * scale, 0.055 * scale, 8, 16, Math.PI), mats.hullDark);
    tail.position.set(0, 1.46 * scale, 3.76 * scale);
    tail.rotation.x = -Math.PI / 2;
    group.add(tail);
  } else if (type === "knarr") {
    addSquareSail(group, 0, -0.25, 0.86, 0xead7a8, 1);
    addCabin(group, 0, 1.85, 1.7, 1.0, scale * 0.8, 0x8b5a32);
    addDeckFittings(group, hullSize[0], hullSize[1], scale, 2, spec.color, profile);
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
    addOars(group, type === "xebec" ? 5 : 3, hullSize[1], hullSize[0], scale, profile);
  } else if (type === "galley") {
    addSail(group, -0.2, -0.65, 1.0, 0xf8e8bc);
    addOars(group, 9, hullSize[1], hullSize[0], scale, profile);
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
    forecastle.position.set(0, 1.83 * scale, -2.65 * scale);
    group.add(forecastle);
  } else if (type === "manowar" || type === "fourthrate" || type === "firstrate") {
    const sailBoost = type === "firstrate" ? 1.08 : type === "fourthrate" ? 0.96 : 1;
    addSquareSail(group, -0.9, -2.1, 1.0 * sailBoost, 0xf6ead0, type === "fourthrate" ? 2 : 3);
    addSquareSail(group, 0, -0.1, 1.08 * sailBoost, 0xf8e7bb, 3);
    addSquareSail(group, 0.9, 2.0, 0.95 * sailBoost, 0xf6ead0, type === "firstrate" ? 3 : 2);
    addCabin(group, 0, 2.75, type === "firstrate" ? 3.55 : 3.2, 2.2, scale, 0x503b34);
    addSternGallery(group, hullSize[0], hullSize[1], scale, 0x4c372f);
  } else if (type === "treasure") {
    addSquareSail(group, -0.85, -1.8, 1.05, 0xf5df9b, 3);
    addSquareSail(group, 0.25, 0.1, 1.18, 0xf8e8aa, 3);
    addSquareSail(group, 0.9, 2.15, 0.95, 0xf1d98d, 2);
    addCabin(group, 0, 2.55, 3.15, 2.2, scale, 0x9d4b3e);
    const pagoda = new THREE.Mesh(new THREE.ConeGeometry(1.35 * scale, 0.75 * scale, 4), mat(0xd6a83c));
    pagoda.position.set(0, 2.9 * scale, 2.55 * scale);
    pagoda.rotation.y = Math.PI / 4;
    group.add(pagoda);
  } else if (type === "ironclad") {
    const armorDeck = hullMesh(5.8 * scale, 3.0 * scale, 0.28 * scale, mat(0x4f555b), "ironclad");
    armorDeck.position.y = 1.28 * scale;
    group.add(armorDeck);
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.72 * scale, 0.78 * scale, 0.48 * scale, 14), mat(0x30363b));
    turret.position.set(0, 1.78 * scale, -0.35 * scale);
    group.add(turret);
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.14 * scale, 1.8 * scale, 10), mats.dark);
    gun.rotation.x = Math.PI / 2;
    gun.position.set(0, 1.78 * scale, -1.45 * scale);
    group.add(gun);
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * scale, 0.28 * scale, 1.25 * scale, 10), mats.dark);
    stack.position.set(0.72 * scale, 2.12 * scale, 1.0 * scale);
    group.add(stack);
  } else {
    addSail(group, 0, 0.2, 0.86);
  }
  addHistoricalDetails(group, type, hullSize[0], hullSize[1], scale, spec, profile);
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

function makeLeviathanMesh() {
  const group = new THREE.Group();
  const bodyMat = mat(0x223142, 0.82);
  const bellyMat = mat(0x5c6f78, 0.9);
  for (let i = 0; i < 8; i++) {
    const segment = new THREE.Mesh(new THREE.SphereGeometry(2.7 - i * 0.12, 16, 10), bodyMat);
    segment.position.set(Math.sin(i * 0.85) * 2.8, -0.5 + Math.sin(i * 0.6) * 0.7, i * 2.2);
    segment.scale.set(1.35, 0.62, 0.9);
    segment.castShadow = true;
    group.add(segment);
    if (i < 6) {
      const crest = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.6, 5), mats.dark);
      crest.position.set(segment.position.x, segment.position.y + 1.6, segment.position.z);
      crest.rotation.x = Math.PI;
      group.add(crest);
    }
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(3.1, 18, 12), bodyMat);
  head.position.set(0, 0.35, -2.9);
  head.scale.set(1.25, 0.82, 1.05);
  group.add(head);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.65, 2.4), bellyMat);
  jaw.position.set(0, -0.68, -3.45);
  group.add(jaw);
  for (let side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), mats.gold);
    eye.position.set(side * 1.25, 0.78, -5.55);
    group.add(eye);
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.6, 7), mats.rock);
    horn.position.set(side * 1.0, 1.55, -4.5);
    horn.rotation.x = -0.55;
    group.add(horn);
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.62, 3.5, 4), bodyMat);
    fin.position.set(side * 3.0, -0.2, 2.8);
    fin.rotation.z = side * -1.2;
    fin.rotation.y = Math.PI / 4;
    group.add(fin);
  }
  return group;
}

function summonLeviathan() {
  if (clock.elapsedTime < leviathanCooldown || state.mode !== "ship") return;
  leviathanCooldown = clock.elapsedTime + 5.5;
  if (leviathan?.group) scene.remove(leviathan.group);
  const outward = playerShip.position.clone();
  outward.y = 0;
  if (outward.lengthSq() < 0.01) outward.set(1, 0, 0);
  outward.normalize();
  const group = makeLeviathanMesh();
  group.position.copy(playerShip.position).add(outward.multiplyScalar(-10));
  group.position.y = -4.8;
  group.rotation.y = Math.atan2(outward.x, outward.z);
  group.scale.setScalar(0.35);
  scene.add(group);
  leviathan = { group, born: clock.elapsedTime, struck: false };
  toast("You reached forbidden waters. The Leviathan rises.");
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
  const fishPoint = randomWaterPoint(MAP_LIMIT * 0.92, 18);
  group.position.set(fishPoint.x, 0.15, fishPoint.z);
  group.userData.phase = Math.random() * 20;
  scene.add(group);
  fish.push(group);
}

function makeCrateMesh(x, z) {
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.05, 1.25), mats.crate);
  crate.position.set(x, 0.65, z);
  crate.rotation.y = Math.random() * Math.PI;
  crate.castShadow = true;
  scene.add(crate);
  return crate;
}

function removeCrate(crate) {
  if (!crate) return;
  scene.remove(crate.mesh);
  const index = crates.indexOf(crate);
  if (index >= 0) crates.splice(index, 1);
}

function dropCrates(pos, count) {
  for (let i = 0; i < count; i++) {
    crates.push({
      mesh: makeCrateMesh(pos.x + (Math.random() - 0.5) * 5, pos.z + (Math.random() - 0.5) * 5),
      heal: 8 + Math.random() * 8,
      xp: 12 + Math.random() * 18,
      gold: 10 + Math.floor(Math.random() * 26),
    });
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

function alertBot(bot, seconds = 12) {
  bot.agroUntil = Math.max(bot.agroUntil || 0, clock.elapsedTime + seconds + bot.level * 0.8);
  bot.target = playerShip.position.clone();
  bot.turn = Math.min(bot.turn || 0, 0.2);
  bot.fireCooldown = Math.min(bot.fireCooldown || 1.5, 1.25);
}

function damageTarget(target, amount) {
  if (target.serverId && multiplayer.serverWorld) {
    sendMultiplayer({ type: "hitBot", id: target.serverId, damage: amount });
    return;
  }
  const armor = target.isBot ? getShipStats(target.shipType).armor : getShipStats().armor;
  target.hp -= amount * (1 - armor);
  if (target.isBot && target.hp > 0) alertBot(target);
  if (target.hp <= 0) {
    const level = target.level || 1;
    const deathPos = target.isBot ? target.group.position : playerShip.position;
    dropCrates(deathPos, crateDropCount(target));
    if (target.isBot) {
      target.hp = getShipStats(target.shipType).hp;
      target.group.position.copy(randomWaterPoint(MAP_LIMIT * 0.9, 82));
      target.level = Math.max(1, target.level + (Math.random() > 0.55 ? 1 : 0));
      target.agroUntil = 0;
      target.fireCooldown = 1.8 + Math.random() * 2;
      state.gold += 45 + level * 12;
      addXP(40 + level * 22);
      toast(`Sank a level ${level} ship. Crates overboard!`);
    } else {
      const lostGold = Math.floor(state.gold * 0.25);
      state.gold = Math.max(0, state.gold - lostGold);
      target.mode = "ship";
      target.dockedAt = null;
      closeShop();
      character.visible = false;
      target.position.set(-15, 0, -12);
      replacePlayerShip(STARTER_SHIP, target.position);
      state.velocity.set(0, 0, 0);
      toast(`Your ship was sunk. You lost ${lostGold}g and restarted in a Skiff.`);
    }
  }
}

function initWorld() {
  addLights();
  addSea();
  for (let i = 0; i < 20; i++) makeCloud();
  islandData.forEach((data) => islands.push(makeIsland(data)));
  playerShip = makeShip(state.shipType);
  playerShip.position.copy(state.position);
  playerShip.position.y = SHIP_WATERLINE_Y;
  scene.add(playerShip);
  character = makeCharacter();
  for (let i = 0; i < 12; i++) makeFish();
  for (let i = 0; i < 15; i++) {
    const spec = shipCatalog[1 + Math.floor(Math.random() * (shipCatalog.length - 1))];
    const group = makeShip(spec.id, true);
    const spawn = randomWaterPoint(MAP_LIMIT * 0.9, 96);
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
      naturallyAggressive: Math.random() < 0.04,
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

function setupNameGate() {
  if (!ui.nameGate || !ui.nameForm || !ui.nameInput) return;
  ui.nameInput.value = state.name;
  ui.nameGate.classList.remove("hidden");
  setTimeout(() => {
    ui.nameInput.focus();
    ui.nameInput.select();
  }, 100);
  ui.playerName.style.cursor = "pointer";
  ui.playerName.title = "Change captain name";
  ui.playerName.addEventListener("click", () => {
    ui.nameInput.value = state.name;
    ui.nameGate.classList.remove("hidden");
    ui.nameInput.focus();
    ui.nameInput.select();
  });
  ui.nameForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const nextName = ui.nameInput.value.trim().replace(/\s+/g, " ").slice(0, 18);
    if (!nextName) {
      ui.nameInput.focus();
      return;
    }
    state.name = nextName;
    localStorage.islandwakeName = nextName;
    ui.nameGate.classList.add("hidden");
    sendMultiplayer({ type: "hello", player: multiplayerPayload() });
    updateHud();
    toast(`Welcome aboard, ${nextName}.`);
  });
}

addEventListener("keydown", (event) => {
  if (nameGateOpen()) return;
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
  const landing = landingPointForShip(island, playerShip.position);
  state.walkingPos.copy(landing.point);
  character.position.copy(state.walkingPos);
  character.position.y = landing.y;
  character.visible = true;
  state.walkHeight = 0;
  state.walkVelocityY = 0;
  state.grounded = true;
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
  if (nameGateOpen()) return;
  if (ui.shop.classList.contains("hidden") === false) return;
  if (state.mode !== "ship") return;
  raycaster.setFromCamera(mouse, camera);
  raycaster.ray.intersectPlane(aimPlane, aimPoint);
  const dir = aimPoint.clone().sub(playerShip.position);
  dir.y = 0;
  if (dir.lengthSq() < 0.1) return;
  dir.normalize();
  if (state.tool === "cannon") {
    const fireDelay = cannonReload();
    if (state.cooldown > 0) return;
    state.cooldown = fireDelay;
    const damage = cannonDamage();
    const range = cannonRange();
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
  if (crate.serverId && multiplayer.serverWorld) {
    if (crate.pending) return;
    crate.pending = true;
    sendMultiplayer({ type: "collectCrate", id: crate.serverId });
    return;
  }
  state.hp = clamp(state.hp + crate.heal, 0, maxHp());
  addXP(crate.xp);
  state.gold += crate.gold ?? (10 + Math.floor(Math.random() * 26));
  removeCrate(crate);
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
      return { kind: "Hostile", name: spec.name, level: bot.level, hp: bot.hp, max: bot.serverMaxHp || spec.hp, armor: spec.armor, speed: spec.speed, regen: spec.regen, pos: bot.group.position, shipType: bot.shipType };
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
    ui.shopBody.innerHTML = `<p class="stats">${island.culture} market | Hold ${cargoCount()}/${cargoCapacity()}</p>` + goods.map((name) => {
      const owned = state.cargo[name] || 0;
      const price = island.goods[name];
      return `<div class="row"><div><h3>${name} <span class="price">${price}g</span></h3><p>Owned ${owned}. Prices vary by island, so buy low and sell high.</p></div><div class="actions"><button data-buy="${name}">Buy</button><button data-sell="${name}">Sell</button></div></div>`;
    }).join("");
  } else if (state.shopTab === "ships") {
    const ships = availableShipsForIsland(island);
    ui.shopBody.innerHTML = `<p class="stats">Ships sold at ${island.name}. Travel to other cultures for different hulls.</p>` + ships.map((ship) => {
      const owned = ship.id === state.shipType;
      return `<div class="row"><div><h3>${ship.name} <span class="price">${ship.price}g</span></h3><p>HP ${ship.hp} / Armor ${Math.round(ship.armor * 100)}% / Speed ${ship.speed} / Regen ${ship.regen}/s / Hold ${ship.capacity}</p></div><button data-ship="${ship.id}" ${owned ? "disabled" : ""}>${owned ? "Sailing" : "Buy"}</button></div>`;
    }).join("");
  } else {
    const ups = [
      ["damage", "Cannon Damage", `${cannonDamage()} damage`],
      ["fireRate", "Fire Rate", `${cannonReload().toFixed(2)}s reload`],
      ["range", "Cannon Range", `${cannonRange()}m range`],
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
    if (cargoCount() >= cargoCapacity()) return toast("Your hold is full. Upgrade ship capacity or sell cargo.");
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
    if (cargoCount() > ship.capacity) return toast(`Sell cargo first. ${ship.name} holds ${ship.capacity}.`);
    state.gold -= ship.price;
    replacePlayerShip(ship.id);
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
  const hullRadius = shipHitRadius(state.shipType);
  const blocked = islands.some((island) => dist2(next, island.group.position) < island.radius + hullRadius * 0.28) || collidesWithShipAt(next);
  if (!blocked) {
    playerShip.position.copy(next);
  } else {
    state.velocity.multiplyScalar(-0.22);
  }
  playerShip.rotation.y = state.rotation;
  playerShip.position.y = SHIP_WATERLINE_Y + Math.sin(clock.elapsedTime * 2.8) * 0.08;
  state.position.copy(playerShip.position);
  if (Math.abs(playerShip.position.x) > MAP_LIMIT || Math.abs(playerShip.position.z) > MAP_LIMIT) summonLeviathan();
  crates.slice().forEach((crate) => {
    if (dist2(playerShip.position, crate.mesh.position) < hullRadius + 1.1) collectCrate(crate);
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
    const groundY = walkableGroundY(island, next);
    if (groundY !== null) {
      character.position.x = next.x;
      character.position.z = next.z;
    }
  }
  state.walkVelocityY -= 28 * dt;
  state.walkHeight = Math.max(0, state.walkHeight + state.walkVelocityY * dt);
  if (state.walkHeight <= 0) {
    state.walkHeight = 0;
    state.walkVelocityY = 0;
    state.grounded = true;
  }
  const groundY = islandGroundY(island, character.position) ?? island.landY;
  character.position.y = groundY + state.walkHeight + Math.sin(clock.elapsedTime * 5) * 0.035;
}

function updateBots(dt) {
  if (multiplayer.serverWorld) {
    bots.forEach((bot, i) => {
      if (bot.serverPosition) {
        bot.group.position.lerp(bot.serverPosition, clamp(dt * 8, 0, 0.35));
      }
      if (Number.isFinite(bot.serverRotation)) {
        bot.group.rotation.y = lerpAngle(bot.group.rotation.y, bot.serverRotation, clamp(dt * 7, 0, 0.32));
        bot.rotation = bot.group.rotation.y;
      }
      bot.group.position.y = SHIP_WATERLINE_Y + Math.sin(clock.elapsedTime * 2.4 + i) * 0.08;
    });
    return;
  }
  bots.forEach((bot, i) => {
    const spec = getShipStats(bot.shipType);
    const playerDistance = dist2(bot.group.position, playerShip.position);
    const aggressive = state.mode === "ship" && ((bot.agroUntil || 0) > clock.elapsedTime || (bot.naturallyAggressive && playerDistance < 28));
    bot.turn -= dt;
    bot.fireCooldown = Math.max(0, (bot.fireCooldown || 0) - dt);
    if (aggressive) {
      bot.target = playerShip.position.clone();
    } else if (bot.turn < 0) {
      bot.turn = 4 + Math.random() * 7;
      bot.target = randomWaterPoint(MAP_LIMIT * 0.86);
    }
    const target = bot.target || playerShip.position;
    const toTarget = target.clone().sub(bot.group.position);
    toTarget.y = 0;
    if (toTarget.lengthSq() > 8) {
      const desired = Math.atan2(toTarget.x, toTarget.z);
      const delta = angleDelta(desired, bot.rotation);
      const turnRate = aggressive ? 0.95 + spec.speed / 46 : 0.6 + spec.speed / 64;
      const turnStep = clamp(delta, -dt * turnRate, dt * turnRate);
      bot.rotation += turnStep;
      const forward = new THREE.Vector3(Math.sin(bot.rotation), 0, Math.cos(bot.rotation));
      const facing = clamp(Math.cos(delta), 0.18, 1);
      const arrive = clamp(toTarget.length() / (aggressive ? 20 : 34), 0.25, 1);
      const desiredVelocity = forward.multiplyScalar(spec.speed * (aggressive ? 0.55 : 0.34) * facing * arrive);
      bot.velocity.lerp(desiredVelocity, clamp(dt * (aggressive ? 1.5 : 1.0), 0, 0.18));
      bot.velocity.multiplyScalar(0.985);
      const next = bot.group.position.clone().add(bot.velocity.clone().multiplyScalar(dt));
      const blockedIsland = islands.find((island) => dist2(next, island.group.position) < island.radius + 10);
      const blocked = Boolean(blockedIsland);
      if (!blocked) bot.group.position.copy(next);
      else {
        bot.velocity.multiplyScalar(0.15);
        const away = Math.atan2(bot.group.position.x - blockedIsland.group.position.x, bot.group.position.z - blockedIsland.group.position.z);
        bot.rotation = lerpAngle(bot.rotation, away, 0.08);
        bot.target = randomWaterPoint(MAP_LIMIT * 0.86);
        bot.agroUntil = 0;
        bot.turn = 2 + Math.random() * 3;
      }
      bot.group.rotation.y = bot.rotation;
    }
    bot.group.position.y = SHIP_WATERLINE_Y + Math.sin(clock.elapsedTime * 2.4 + i) * 0.08;
    const shotDir = playerShip.position.clone().sub(bot.group.position);
    shotDir.y = 0;
    const facing = shotDir.lengthSq()
      ? new THREE.Vector3(Math.sin(bot.rotation), 0, Math.cos(bot.rotation)).dot(shotDir.clone().normalize())
      : 0;
    const canFire = state.mode === "ship" && bot.fireCooldown <= 0 && facing > 0.45;
    if (aggressive && playerDistance < 34 && canFire) {
      const shot = shotDir.normalize();
      makeProjectile(`bot-${i}`, bot.group.position.clone().add(shot.clone().multiplyScalar(3.4)), shot, 7 + bot.level * 1.25, 34);
      bot.fireCooldown = Math.max(1.6, 3.6 - Math.min(1.2, bot.level * 0.1));
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
        if (!hit && dist2(shot.mesh.position, bot.group.position) < shipHitRadius(bot.shipType) + 0.35) {
          if (multiplayer.serverWorld && bot.serverId) {
            sendMultiplayer({ type: "hitBot", id: bot.serverId, damage: shot.damage });
          } else {
            damageTarget(bot, shot.damage);
          }
          addXP(3 + Math.floor(shot.damage / 9));
          hit = true;
        }
      });
      remotePlayers.forEach((remote) => {
        if (!hit && dist2(shot.mesh.position, remote.group.position) < shipHitRadius(remote.shipType) + 0.35) {
          addXP(5 + Math.floor(shot.damage / 8));
          hit = true;
        }
      });
    } else if (state.mode === "ship" && dist2(shot.mesh.position, playerShip.position) < shipHitRadius(state.shipType) + 0.35) {
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

function updateLeviathan(dt) {
  if (!leviathan?.group) return;
  const age = clock.elapsedTime - leviathan.born;
  leviathan.group.position.y = -4.8 + Math.sin(clamp(age / 1.1, 0, 1) * Math.PI * 0.5) * 5.0;
  leviathan.group.rotation.z = Math.sin(clock.elapsedTime * 3) * 0.08;
  leviathan.group.scale.setScalar(0.35 + clamp(age / 1.2, 0, 1) * 0.8);
  if (!leviathan.struck && age > 0.85) {
    leviathan.struck = true;
    damageTarget(state, maxHp() * 4);
  }
  if (age > 3.2) {
    scene.remove(leviathan.group);
    leviathan = null;
  }
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
  ui.playerName.textContent = captainName();
  ui.modeLabel.textContent = state.mode === "ship" ? "At sea" : `Docked: ${state.dockedAt}`;
  ui.hpBar.style.width = `${clamp((state.hp / maxHp()) * 100, 0, 100)}%`;
  ui.xpBar.style.width = `${clamp((state.xp / xpForLevel(state.level)) * 100, 0, 100)}%`;
  ui.statsLine.textContent = `Lv.${state.level} | ${Math.floor(state.gold)}g | ${spec.name} | HP ${Math.ceil(state.hp)}/${spec.hp} | Armor ${Math.round(spec.armor * 100)}% | Speed ${spec.speed} | Regen ${spec.regen} | Hold ${cargoCount()}/${cargoCapacity()}`;
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
    name: captainName(),
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

function removeBot(bot) {
  if (!bot) return;
  scene.remove(bot.group);
  const index = bots.indexOf(bot);
  if (index >= 0) bots.splice(index, 1);
}

function syncServerWorld(world) {
  if (!world) return;
  multiplayer.serverWorld = true;

  const seenBots = new Set();
  (world.bots || []).forEach((data) => {
    if (!data?.id) return;
    seenBots.add(data.id);
    let bot = bots.find((item) => item.serverId === data.id);
    const serverPosition = new THREE.Vector3(Number(data.x) || 0, SHIP_WATERLINE_Y, Number(data.z) || 0);
    const serverRotation = Number(data.rotation) || 0;
    if (!bot) {
      const group = makeShip(data.shipType || "cog", true);
      scene.add(group);
      bot = {
        isBot: true,
        serverId: data.id,
        group,
        velocity: new THREE.Vector3(),
        turn: 0,
        fireCooldown: 0,
      };
      bot.group.position.copy(serverPosition);
      bot.group.rotation.y = serverRotation;
      bots.push(bot);
    } else if (bot.shipType !== data.shipType) {
      scene.remove(bot.group);
      bot.group = makeShip(data.shipType || "cog", true);
      bot.group.position.copy(serverPosition);
      bot.group.rotation.y = serverRotation;
      scene.add(bot.group);
    }
    const spec = getShipStats(data.shipType);
    bot.shipType = data.shipType || "cog";
    bot.hp = Number(data.hp) || spec.hp;
    bot.level = Number(data.level) || 1;
    bot.serverMaxHp = Number(data.maxHp) || spec.hp;
    bot.serverPosition = serverPosition;
    bot.serverRotation = serverRotation;
  });
  bots.slice().forEach((bot) => {
    if (!bot.serverId || !seenBots.has(bot.serverId)) removeBot(bot);
  });

  const seenCrates = new Set();
  (world.crates || []).forEach((data) => {
    if (!data?.id) return;
    seenCrates.add(data.id);
    let crate = crates.find((item) => item.serverId === data.id);
    if (!crate) {
      crate = {
        serverId: data.id,
        mesh: makeCrateMesh(Number(data.x) || 0, Number(data.z) || 0),
        heal: Number(data.heal) || 10,
        xp: Number(data.xp) || 16,
        gold: Number(data.gold) || 14,
      };
      crates.push(crate);
    }
    crate.heal = Number(data.heal) || crate.heal;
    crate.xp = Number(data.xp) || crate.xp;
    crate.gold = Number(data.gold) || crate.gold;
    crate.mesh.position.x = Number(data.x) || crate.mesh.position.x;
    crate.mesh.position.z = Number(data.z) || crate.mesh.position.z;
  });
  crates.slice().forEach((crate) => {
    if (!crate.serverId || !seenCrates.has(crate.serverId)) removeCrate(crate);
  });
}

function applyCrateReward(crate) {
  if (!crate) return;
  const local = crates.find((item) => item.serverId === crate.id);
  if (local) removeCrate(local);
  state.hp = clamp(state.hp + (Number(crate.heal) || 0), 0, maxHp());
  addXP(Number(crate.xp) || 0);
  state.gold += Number(crate.gold) || 0;
  toast("Crate recovered: repairs, gold, and XP.");
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
  } else if (message.type === "world") {
    syncServerWorld(message);
  } else if (message.type === "crateReward") {
    applyCrateReward(message.crate);
  } else if (message.type === "crateRemove") {
    removeCrate(crates.find((crate) => crate.serverId === message.id));
  } else if (message.type === "botReward") {
    state.gold += Number(message.gold) || 0;
    addXP(Number(message.xp) || 0);
    toast(`Sank a level ${message.level || 1} ship. Crates overboard!`);
  } else if (message.x !== undefined) {
    upsertRemotePlayer(message);
  }
}

function startLocalMultiplayer(message) {
  if (multiplayer.channel || typeof BroadcastChannel === "undefined") return;
  try {
    multiplayer.channel = new BroadcastChannel("islandwake");
    multiplayer.mode = "local";
    multiplayer.serverWorld = false;
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
      if (obj.position.z > SEA_SIZE * 0.5) obj.position.z = -SEA_SIZE * 0.5;
    }
    if (obj.userData.cloud !== undefined) {
      obj.position.x += obj.userData.cloud * 0.006;
      if (obj.position.x > SEA_SIZE * 0.38) obj.position.x = -SEA_SIZE * 0.38;
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
  updateLeviathan(dt);
  updateCamera(dt);
  animateSea();
  publishMultiplayer();
  updateHud();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

initWorld();
setupNameGate();
setupMultiplayer();
updateHud();
toast("Islandwake launched. Multiplayer connects when the server is running.");
frame();
