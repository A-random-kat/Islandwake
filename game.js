import * as THREE from "./three.module.js";

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
  minimapPanel: document.querySelector("#minimapPanel"),
  minimap: document.querySelector("#minimap"),
  closeMinimap: document.querySelector("#closeMinimap"),
  openMinimap: document.querySelector("#openMinimap"),
  toggleWindMap: document.querySelector("#toggleWindMap"),
  leaderboardPanel: document.querySelector("#leaderboardPanel"),
  leaderboardList: document.querySelector("#leaderboardList"),
  closeLeaderboard: document.querySelector("#closeLeaderboard"),
  openLeaderboard: document.querySelector("#openLeaderboard"),
  ammoHotbar: document.querySelector("#ammoHotbar"),
  nameGate: document.querySelector("#nameGate"),
  nameForm: document.querySelector("#nameForm"),
  nameInput: document.querySelector("#captainNameInput"),
  developerTokenInput: document.querySelector("#developerTokenInput"),
  nameButton: document.querySelector("#setSailButton") || document.querySelector("#nameForm button"),
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
const MAX_PLAYER_LEVEL = 100;
const MAX_RELOAD_UPGRADES = 20;
const TRADE_SELL_RATE = 0.85;
const CRATE_DROP_MULTIPLIER = 1.2;
const KRAKEN_ATTACK_LIFE = 3.8;
const KRAKEN_SLAM_DELAY_MS = 2900;
const KRAKEN_SLAM_T = KRAKEN_SLAM_DELAY_MS / (KRAKEN_ATTACK_LIFE * 1000);
const MAP_LIMIT = 400;
const MINIMAP_VISIBLE_LIMIT = MAP_LIMIT * 1.12;
const WATERFALL_LIMIT = MINIMAP_VISIBLE_LIMIT + 170;
const ISLAND_RADIUS_SCALE = 2;
const ISLAND_SPACING_SCALE = 1.35;
const ISLAND_SPACING_ANCHOR = { x: -34, z: -24 };
const CHARACTER_SCALE = 0.34;
const SEA_SIZE = 2400;
const WIND_MARKER_COUNT = 18;
const BALLOON_BOMB_GRAVITY = 18;
const CANNONBALL_TYPES = {
  basic: { id: "basic", name: "Basic Shell", short: "Shell", price: 0, infinite: true, pellets: 1, damageScale: 1, rangeScale: 1, spread: 0, radius: 0.35, color: 0x2f3342, trail: 0xd9fbff },
  grapeshot: { id: "grapeshot", name: "Grapeshot", short: "Grape", price: 16, pellets: 6, damageScale: 0.25, rangeScale: 0.72, spread: 0.46, radius: 0.18, color: 0x4a3932, trail: 0xffe4c4 },
  hotshot: { id: "hotshot", name: "Hotshot", short: "Hot", price: 23, pellets: 1, damageScale: 1, rangeScale: 1, spread: 0, radius: 0.36, color: 0xc94f3f, trail: 0xffb347, fire: { dps: 10, duration: 3 } },
  harpoon: { id: "harpoon", name: "Harpoon", short: "Harpoon", price: 20, pellets: 1, fixedDamage: 20, whaleDamage: 100, rangeScale: 0.86, spread: 0, radius: 0.16, color: 0xd8d0bd, trail: 0xf8f4e5, noRangeDamage: true },
  airburst: { id: "airburst", name: "Airburst Shell", short: "Air", price: 16, pellets: 1, fixedDamage: 0, rangeScale: 1, spread: 0, radius: 0.32, color: 0x82cfff, trail: 0xbfefff, airburst: true, noRangeDamage: true },
};
const AMMO_SLOT_TYPES = ["basic", "grapeshot", "hotshot", "harpoon", "airburst"];
const SPECIAL_AMMO_TYPES = Object.keys(CANNONBALL_TYPES).filter((id) => !CANNONBALL_TYPES[id].infinite);
function spreadIslandData(data) {
  return {
    ...data,
    x: ISLAND_SPACING_ANCHOR.x + (data.x - ISLAND_SPACING_ANCHOR.x) * ISLAND_SPACING_SCALE,
    z: ISLAND_SPACING_ANCHOR.z + (data.z - ISLAND_SPACING_ANCHOR.z) * ISLAND_SPACING_SCALE,
  };
}

const islandData = [
  { name: "Port Azure", culture: "Freeport", x: -34, z: -24, radius: 20, color: 0x7dcf7a, accent: 0x2f87a5, theme: "starter", shipMarket: ["shallop", "pinnace", "hoy", "yawl", "balinger", "cog", "ketch"], goods: { Silk: 32, Spice: 57, Iron: 38, Tea: 24, Pearls: 88 } },
  { name: "Vikholm", culture: "Viking", x: -184, z: -122, radius: 23, color: 0x86ba73, accent: 0xbd463b, theme: "norse", shipMarket: ["longship", "knarr", "dogger", "balinger"], goods: { Silk: 38, Spice: 83, Iron: 80, Tea: 46, Pearls: 76 } },
  { name: "Seville", culture: "Spanish", x: 182, z: -138, radius: 24, color: 0xd4ad65, accent: 0xc94f3f, theme: "iberian", shipMarket: ["caravel", "carrack", "galleon", "merchantman"], goods: { Silk: 64, Spice: 38, Iron: 48, Tea: 68, Pearls: 112 } },
  { name: "Venice", culture: "Venetian", x: 116, z: 142, radius: 21, color: 0x82bd72, accent: 0xd7b44a, theme: "lagoon", shipMarket: ["galley", "tartane", "xebec", "brigantine"], goods: { Silk: 58, Spice: 92, Iron: 61, Tea: 28, Pearls: 121 } },
  { name: "Amsterdam", culture: "Dutch", x: -142, z: 118, radius: 22, color: 0x68b779, accent: 0xe08d3f, theme: "trade", shipMarket: ["hoy", "dogger", "bilander", "fluyt", "barque", "barquentine"], goods: { Silk: 74, Spice: 48, Iron: 96, Tea: 57, Pearls: 84 } },
  { name: "Portsmouth", culture: "Royal Navy", x: 36, z: 226, radius: 24, color: 0x6fa36a, accent: 0x4051a8, theme: "naval", shipMarket: ["storm", "corvette", "frigate", "whaler", "razee", "ballooner", "fourthrate", "grandfrigate", "manowar", "windrunner", "firstrate"], goods: { Silk: 48, Spice: 102, Iron: 72, Tea: 35, Pearls: 126 } },
  { name: "Zanzibar", culture: "Swahili-Arab", x: 226, z: 28, radius: 20, color: 0x88c478, accent: 0xf0d05a, theme: "dhow", shipMarket: ["dhow", "felucca", "tartane", "xebec"], goods: { Silk: 70, Spice: 30, Iron: 54, Tea: 63, Pearls: 132 } },
  { name: "Canton", culture: "Chinese", x: -222, z: 32, radius: 22, color: 0x68c46f, accent: 0xc93636, theme: "pagoda", shipMarket: ["junk", "treasure"], goods: { Silk: 42, Spice: 70, Iron: 67, Tea: 95, Pearls: 143 } },
  { name: "Baltimore", culture: "American", x: -26, z: -214, radius: 20, color: 0x75caa5, accent: 0x58c6f2, theme: "schooner", shipMarket: ["schooner", "packet", "clipper", "sloop", "ballooner", "windrunner"], goods: { Silk: 91, Spice: 54, Iron: 34, Tea: 82, Pearls: 109 } },
  { name: "Brest", culture: "French", x: 104, z: -224, radius: 21, color: 0x91c96d, accent: 0x4c64a6, theme: "fort", shipMarket: ["brigantine", "snow", "barquentine", "corvette"], goods: { Silk: 69, Spice: 42, Iron: 62, Tea: 66, Pearls: 130 } },
  { name: "Lisbon", culture: "Portuguese", x: -232, z: -204, radius: 22, color: 0xbac96d, accent: 0xd2a94b, theme: "iberian", shipMarket: ["caravel", "pink", "carrack"], goods: { Silk: 52, Spice: 34, Iron: 60, Tea: 58, Pearls: 118 } },
  { name: "Calicut", culture: "Indian Ocean", x: 214, z: 210, radius: 22, color: 0x92d37e, accent: 0xda9c5c, theme: "market", shipMarket: ["dhow", "ketch", "merchantman", "eastindiaman"], goods: { Silk: 82, Spice: 44, Iron: 72, Tea: 36, Pearls: 120 } },
  { name: "Tonga", culture: "Polynesian", x: 4, z: 84, radius: 18, color: 0x5fa66a, accent: 0xef6f4f, theme: "atoll", shipMarket: ["cat", "sloop", "lugger"], goods: { Silk: 61, Spice: 64, Iron: 46, Tea: 75, Pearls: 94 } },
  { name: "Crown Harbor", culture: "Crown Colony", x: 164, z: -22, radius: 21, color: 0x82bd72, accent: 0xd99928, theme: "fort", shipMarket: ["dart", "storm", "bombketch", "frigate"], goods: { Silk: 58, Spice: 92, Iron: 61, Tea: 28, Pearls: 121 } },
  { name: "Blackreef", culture: "Privateer", x: -96, z: 216, radius: 20, color: 0x5fa66a, accent: 0x3f87a6, theme: "rocky", shipMarket: ["dart", "lugger", "brigantine", "xebec"], goods: { Silk: 78, Spice: 52, Iron: 101, Tea: 55, Pearls: 86 } },
  { name: "New Albion", culture: "Merchant", x: 246, z: -222, radius: 21, color: 0x70bf61, accent: 0xb5773c, theme: "trade", shipMarket: ["sloop", "packet", "barque", "merchantman", "whaler", "eastindiaman", "grandfrigate"], goods: { Silk: 46, Spice: 80, Iron: 66, Tea: 98, Pearls: 142 } },
].map(spreadIslandData);

const whaleZonePortAzure = islandData.find((island) => island.name === "Port Azure") || { z: -24 };
const whaleZoneBaltimore = islandData.find((island) => island.name === "Baltimore") || { z: -280 };
const WHALE_NORTH_MIN_Z = Math.min(whaleZonePortAzure.z, whaleZoneBaltimore.z) - 42;
const WHALE_NORTH_MAX_Z = Math.max(whaleZonePortAzure.z, whaleZoneBaltimore.z) + 10;
const WHALE_NORTH_CENTER_Z = (WHALE_NORTH_MIN_Z + WHALE_NORTH_MAX_Z) * 0.5;

const shipCatalog = [
  { id: "skiff", name: "Skiff", price: 0, hp: 145, armor: 0.02, speed: 15, regen: 1.6, color: 0xcc4e3f, model: "skiff" },
  { id: "shallop", name: "Shallop", price: 380, hp: 165, armor: 0.02, speed: 17, regen: 1.7, color: 0xb86d3d, model: "skiff" },
  { id: "pinnace", name: "Pinnace", price: 520, hp: 185, armor: 0.03, speed: 20, regen: 1.8, color: 0x5b9eb5, model: "dart" },
  { id: "hoy", name: "Hoy", price: 680, hp: 220, armor: 0.04, speed: 11, regen: 1.9, color: 0xb0824a, model: "cog" },
  { id: "yawl", name: "Yawl", price: 950, hp: 195, armor: 0.02, speed: 18, regen: 1.6, color: 0x7db0a6, model: "skiff" },
  { id: "balinger", name: "Balinger", price: 1250, hp: 240, armor: 0.04, speed: 14, regen: 1.9, color: 0xb5894e, model: "cog" },
  { id: "felucca", name: "Felucca", price: 1850, hp: 215, armor: 0.02, speed: 25, regen: 1.7, color: 0xe2bc55, model: "dhow" },
  { id: "bilander", name: "Bilander", price: 2150, hp: 280, armor: 0.05, speed: 16, regen: 2.1, color: 0x84a76c, model: "snow" },
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
  { id: "whaler", name: "Whaler", price: 11500, hp: 500, armor: 0.05, speed: 10, regen: 2.0, color: 0x6f8792, model: "frigate" },
  { id: "razee", name: "Razee Frigate", price: 13000, hp: 850, armor: 0.16, speed: 18, regen: 3.0, color: 0x6150a3, model: "frigate" },
  { id: "ballooner", name: "Ballooner", price: 14500, hp: 450, armor: 0, speed: 16, regen: 2.0, color: 0xbb7c43, model: "frigate" },
  { id: "fourthrate", name: "Fourth Rate", price: 14600, hp: 980, armor: 0.18, speed: 12, regen: 3.4, color: 0x8e5a3f, model: "manowar" },
  { id: "grandfrigate", name: "Grand Frigate", price: 28500, hp: 1060, armor: 0.12, speed: 18, regen: 5.2, color: 0x4f78b5, model: "frigate" },
  { id: "manowar", name: "Ship of the Line", price: 16800, hp: 1120, armor: 0.2, speed: 11, regen: 3.6, color: 0xd8b24a, model: "manowar" },
  { id: "windrunner", name: "Windrunner", price: 31500, hp: 1040, armor: 0.04, speed: 28, regen: 4.2, color: 0xe0b24a, model: "clipper" },
  { id: "firstrate", name: "First Rate", price: 20500, hp: 1320, armor: 0.2, speed: 9, regen: 4.0, color: 0xc9b05a, model: "manowar" },
];

const shipBalance = {
  skiff: { name: "Skiff", price: 0, hp: 435, armor: 0, speed: 15, regen: 1, capacity: 4, hitbox: 2.4 },
  shallop: { name: "Shallop", price: 380, hp: 495, armor: 0, speed: 17, regen: 1, capacity: 5, hitbox: 2.5 },
  pinnace: { name: "Pinnace", price: 560, hp: 555, armor: 0, speed: 20, regen: 1, capacity: 4, hitbox: 2.6 },
  hoy: { name: "Hoy", price: 760, hp: 660, armor: 0.03, speed: 11, regen: 2, capacity: 10, hitbox: 2.9 },
  yawl: { name: "Yawl", price: 950, fixedPrice: true, hp: 585, armor: 0, speed: 18, regen: 1, capacity: 5, hitbox: 2.6, weight: 62 },
  balinger: { name: "Balinger", price: 1250, fixedPrice: true, hp: 720, armor: 0.02, speed: 14, regen: 2, capacity: 11, hitbox: 3.0, weight: 88 },
  felucca: { name: "Felucca", price: 1850, fixedPrice: true, hp: 650, armor: 0, speed: 25, regen: 1, capacity: 6, hitbox: 3.0, weight: 72 },
  bilander: { name: "Bilander", price: 2150, fixedPrice: true, hp: 840, armor: 0.04, speed: 16, regen: 2, capacity: 13, hitbox: 3.2, weight: 98 },
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
  whaler: { name: "Whaler", price: 11500, fixedPrice: true, hp: 1500, armor: 0.05, speed: 10, regen: 2, capacity: 4, blubberCapacity: 40, hitbox: 4.6, weight: 205, ramTakenScale: 0.5, whaleRamTakenScale: 0.25 },
  razee: { name: "Razee Frigate", price: 17000, hp: 2550, armor: 0.14, speed: 18, regen: 4, capacity: 20, hitbox: 4.6 },
  ballooner: { name: "Ballooner", price: 14500, fixedPrice: true, hp: 1350, armor: 0, speed: 16, regen: 2, capacity: 10, hitbox: 4.1, weight: 160 },
  fourthrate: { name: "Fourth Rate", price: 22000, hp: 2940, armor: 0.17, speed: 12, regen: 5, capacity: 22, hitbox: 4.9 },
  grandfrigate: { name: "Grand Frigate", price: 28500, fixedPrice: true, hp: 3150, armor: 0.12, speed: 18, regen: 6, capacity: 24, hitbox: 5.0, weight: 255 },
  manowar: { name: "Ship of the Line", price: 26500, hp: 3360, armor: 0.19, speed: 11, regen: 6, capacity: 24, hitbox: 5.2 },
  windrunner: { name: "Windrunner", price: 31500, fixedPrice: true, hp: 3000, armor: 0, speed: 28, regen: 5, capacity: 18, hitbox: 4.8, weight: 210 },
  firstrate: { name: "First Rate", price: 33500, hp: 3960, armor: 0.2, speed: 9, regen: 8, capacity: 26, hitbox: 5.6 },
};

function armorCapForSpeed(speed) {
  if (speed > 22) return 0;
  if (speed >= 20) return 0.04;
  if (speed >= 17) return 0.08;
  if (speed >= 14) return 0.13;
  return 0.2;
}

function deriveShipWeight(ship) {
  const hullMass = (ship.hitbox || 3) ** 2 * 8;
  const structureMass = (ship.hp || 500) / 150;
  const cargoMass = (ship.capacity || 8) * 0.5;
  const speedTrim = (ship.speed || 15) * 0.05;
  return Math.round(clamp(hullMass + structureMass + cargoMass - speedTrim, 35, 320));
}

function deriveFairShipPrice(ship) {
  if (ship.id === STARTER_SHIP) return 0;
  const value = ship.hp * 2.2
    + ship.speed * 95
    + ship.regen * 260
    + ship.capacity * 65
    + ship.armor * 8500
    + ship.hitbox * 260;
  const sizePremium = 1 + Math.max(0, (ship.hitbox || 3) - 3) * 0.18;
  const blended = ship.price * 0.55 + value * sizePremium * 0.45;
  return Math.max(ship.price, Math.round(blended / 50) * 50);
}

for (const ship of shipCatalog) {
  const balance = shipBalance[ship.id];
  if (!balance) continue;
  Object.assign(ship, balance);
  ship.armor = clamp(Math.min(ship.armor, armorCapForSpeed(ship.speed)), 0, 0.2);
  ship.regen = Math.round(clamp(ship.regen, 1, 8));
  ship.price = balance.fixedPrice ? balance.price : deriveFairShipPrice(ship);
  if (ship.price < 2500) {
    const progress = clamp(ship.price / 2500, 0, 1);
    ship.hp = Math.min(ship.hp, Math.round(420 + progress * 380));
    ship.speed = Math.min(ship.speed, Math.round(15 + progress * 9));
    ship.regen = Math.min(ship.regen, ship.price < 1200 ? 1 : 2);
    ship.capacity = Math.min(ship.capacity || 8, Math.round(5 + progress * 9));
    ship.armor = Math.min(ship.armor, progress > 0.75 ? 0.04 : 0.02);
  }
  const tierScale = 1 + Math.max(0, shipTier(ship.id) - 2) * 0.045;
  ship.hitbox = Math.round((ship.hitbox || 3) * tierScale * 10) / 10;
  ship.weight = Math.round((balance.weight ?? deriveShipWeight(ship)) * tierScale * tierScale);
}

function readSavedValue(key, fallback = "") {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function saveValue(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Joining the game should still work if browser storage is blocked.
  }
}

const captainId = readSavedValue("islandwakeId") || crypto.randomUUID();
saveValue("islandwakeId", captainId);
const playerId = crypto.randomUUID();
const state = {
  name: readSavedValue("islandwakeName"),
  devToken: "",
  infiniteGold: false,
  joined: false,
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
  ammo: { grapeshot: 0, hotshot: 0, harpoon: 0, airburst: 0 },
  ammoSlots: [...AMMO_SLOT_TYPES],
  selectedAmmo: "basic",
  selectedAmmoSlot: 0,
  pendingAmmoAssign: null,
  docking: null,
  fallingOffWorld: false,
  fallingTimer: 0,
  viewMode: "ship",
  activeBalloonIndex: -1,
  balloonStock: 0,
  maxBalloons: 5,
  showWindMarkers: readSavedValue("islandwakeWindMarkers") === "1",
  fire: null,
  cooldown: 0,
  rodCooldown: 0,
  position: new THREE.Vector3(-15, 0, -12),
  velocity: new THREE.Vector3(),
  rotation: 0,
  walkingPos: new THREE.Vector3(),
  walkHeight: 0,
  walkVelocityY: 0,
  grounded: true,
  leviathanGrabbed: false,
  cameraYaw: 0,
  cameraPitch: 0.28,
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
const seenRemoteShots = new Set();
const impactEffects = [];
const fish = [];
const animals = [];
const storms = [];
const waveHazards = [];
const activeKrakenAttacks = [];
const windCurrents = [];
const balloons = [];
const balloonBombs = [];
const crates = [];
const labels = [];
const ramCooldowns = new Map();
const SHIP_WATERLINE_Y = -0.42;
const CANNONBALL_SPEED = 29.3;
const BOT_CANNON_RANGE = 34;
const SHOT_REPLAY_MAX_AGE_MS = 3200;
const CRATE_LIFETIME = 120;
const CRATE_SINK_TIME = 5;
const MAX_TREASURES = 3;
const CENTER_BOT_CLEAR_RADIUS = 88;
const minimapCtx = ui.minimap.getContext("2d");
const shipPreviewCache = new Map();
let ammoHotbarSignature = "";
let shipPreviewRenderer;
let shipPreviewScene;
let shipPreviewCamera;
let fishingLine;
let fishingBobber;
let balloonReticle;
let leviathan;
let leviathanCooldown = 0;
let krakenBoss = null;
let treasureSpawnTimer = 10 + Math.random() * 18;
let nextStormAt = 35 + Math.random() * 85;
const leviathanAttacks = [
  { id: "breach", label: "breaches over the waves and smashes your ship" },
];

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
  return Math.round((50 + level * 24) * 1.25);
}

function addXP(amount) {
  if (state.level >= MAX_PLAYER_LEVEL) {
    state.level = MAX_PLAYER_LEVEL;
    state.xp = 0;
    return;
  }
  state.xp += amount;
  while (state.level < MAX_PLAYER_LEVEL && state.xp >= xpForLevel(state.level)) {
    state.xp -= xpForLevel(state.level);
    state.level++;
    state.points++;
    toast(`Level ${state.level}! Upgrade point earned.`);
  }
  if (state.level >= MAX_PLAYER_LEVEL) {
    state.level = MAX_PLAYER_LEVEL;
    state.xp = 0;
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
  const base = Math.floor((level + 1) / 4) + Math.max(0, tier);
  return Math.max(1, Math.min(15, Math.ceil(base * CRATE_DROP_MULTIPLIER)));
}

function shipHitRadius(type = state.shipType) {
  return getShipStats(type).hitbox || 3;
}

function shipWeight(type = state.shipType) {
  return Math.max(1, getShipStats(type).weight || 80);
}

function shipVisualScale(type = state.shipType) {
  const baseScale = {
    shallop: 0.86,
    pinnace: 0.88,
    yawl: 0.9,
    balinger: 0.96,
    felucca: 0.98,
    bilander: 1.02,
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
    whaler: 1.36,
    ballooner: 1.18,
    razee: 1.28,
    grandfrigate: 1.38,
    windrunner: 1.34,
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
  return baseScale * (1 + Math.max(0, shipTier(type) - 3) * 0.055);
}

function shipHullDimensions(type = state.shipType) {
  const [length, width] = {
    shallop: [5.6, 1.85],
    pinnace: [6.5, 1.75],
    yawl: [6.0, 1.85],
    balinger: [6.4, 2.7],
    felucca: [7.4, 1.95],
    bilander: [6.8, 2.55],
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
    whaler: [8.6, 3.05],
    ballooner: [8.1, 2.9],
    corvette: [7.8, 2.65],
    razee: [8.5, 3.0],
    grandfrigate: [8.9, 3.18],
    windrunner: [9.4, 2.55],
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
    whaler: [8.3, 3.05],
    ballooner: [8.0, 3.05],
    ironclad: [7.8, 3.7],
  }[type] || [6.5, 2.7];
  const scale = shipVisualScale(type);
  return { length: length * scale, width: width * scale };
}

function projectileHitsHull(localPoint, type) {
  const { length, width } = shipHullDimensions(type);
  const halfLength = length * 0.53 + 0.25;
  const zT = Math.abs(localPoint.z) / halfLength;
  if (zT > 1) return false;
  const taper = clamp(1 - Math.pow(zT, 1.65) * 0.82, 0.18, 1);
  const halfWidth = width * 0.52 * taper + 0.18;
  const hullTop = 1.72 * shipVisualScale(type) + shipTier(type) * 0.16;
  if (localPoint.y < -0.42 || localPoint.y > hullTop) return false;
  const deckCurve = clamp(1 - Math.pow(Math.abs(localPoint.x) / Math.max(0.2, halfWidth), 2), 0, 1);
  const allowedY = hullTop - (1 - deckCurve) * 0.42;
  return Math.abs(localPoint.x) <= halfWidth && localPoint.y <= allowedY;
}

function projectileHitsMast(localPoint, type) {
  const { length } = shipHullDimensions(type);
  const scale = shipVisualScale(type);
  const tier = shipTier(type);
  const mastBottom = 1.05 * scale;
  const mastTop = (5.2 + Math.min(1.4, tier * 0.32)) * scale;
  if (localPoint.y < mastBottom || localPoint.y > mastTop) return false;
  return mastPlan(type, length / scale).some((mastZ) => {
    const z = -mastZ * scale;
    const mastRadius = 0.22 * scale + 0.22;
    return Math.hypot(localPoint.x, localPoint.z - z) <= mastRadius;
  });
}

function projectileHitsShip(shot, ship, type) {
  if (!ship) return false;
  const broadRadius = Math.max(shipHitRadius(type) + 0.75, shipHullDimensions(type).length * 0.56);
  if (dist2(shot.mesh.position, ship.position || ship) >= broadRadius) return false;
  const localPoint = ship.worldToLocal
    ? ship.worldToLocal(shot.mesh.position.clone())
    : shot.mesh.position.clone().sub(ship.position || ship);
  return projectileHitsHull(localPoint, type) || projectileHitsMast(localPoint, type);
}

function cargoCount() {
  return Object.entries(state.cargo).reduce((total, [name, count]) => (
    name === "Whale Blubber" ? total : total + count
  ), 0);
}

function cargoCapacity() {
  return getShipStats().capacity || 8;
}

function blubberCount() {
  return state.cargo["Whale Blubber"] || 0;
}

function blubberCapacity() {
  return getShipStats().blubberCapacity || 0;
}

function marketBuyPrice(island, name) {
  if (name === "Whale Blubber") return 0;
  return island?.goods?.[name] || 0;
}

function marketSellPrice(island, name) {
  if (name === "Whale Blubber") return island?.name === "Portsmouth" ? 200 : 0;
  return Math.max(1, Math.floor(marketBuyPrice(island, name) * TRADE_SELL_RATE));
}

function cannonDamage() {
  return 34 + state.upgrades.damage * 2;
}

function cannonReload() {
  return Math.max(0.36, 0.78 - Math.min(state.upgrades.fireRate, MAX_RELOAD_UPGRADES) * 0.02);
}

function cannonRange() {
  return 34 + state.upgrades.range * 4;
}

function rangeDamageMultiplier(distance, range) {
  return 1 + clamp(distance / Math.max(1, range), 0, 1) * 0.5;
}

function scaleDamageByRange(baseDamage, distance, range) {
  return Math.round(baseDamage * rangeDamageMultiplier(distance, range));
}

function currentAmmoType() {
  const slotType = state.ammoSlots[state.selectedAmmoSlot] || "basic";
  return CANNONBALL_TYPES[slotType] || CANNONBALL_TYPES.basic;
}

function ammoCount(type) {
  const ammo = CANNONBALL_TYPES[type] || CANNONBALL_TYPES.basic;
  return ammo.infinite ? Infinity : Math.max(0, Math.floor(state.ammo[type] || 0));
}

function selectAmmoSlot(index, announce = false) {
  const slot = clamp(Math.floor(Number(index) || 0), 0, state.ammoSlots.length - 1);
  const type = state.ammoSlots[slot];
  if (!type) {
    toast("That ammo slot is empty.");
    return false;
  }
  const ammo = CANNONBALL_TYPES[type];
  if (!ammo) return false;
  if (!ammo.infinite && ammoCount(type) <= 0) {
    toast(`${ammo.name} is empty.`);
    return false;
  }
  state.selectedAmmoSlot = slot;
  state.selectedAmmo = type;
  updateAmmoHotbar();
  if (announce) toast(`${ammo.name} equipped.`);
  return true;
}

function selectAmmo(type) {
  const slot = state.ammoSlots.findIndex((item) => item === type);
  if (slot < 0) return toast("Put that shot in a hotbar slot first.");
  selectAmmoSlot(slot);
}

function assignAmmoSlot(slot, type) {
  const index = Math.floor(Number(slot));
  if (!Number.isFinite(index) || index < 0 || index >= state.ammoSlots.length) return;
  if (index === 0) return toast("Basic Shell stays in slot 1.");
  if (type && !CANNONBALL_TYPES[type]) return;
  const nextType = type || null;
  const previousSelectedType = state.ammoSlots[state.selectedAmmoSlot];
  if (nextType) {
    state.ammoSlots.forEach((slotType, slotIndex) => {
      if (slotIndex > 0 && slotIndex !== index && slotType === nextType) {
        state.ammoSlots[slotIndex] = null;
      }
    });
  }
  state.ammoSlots[index] = nextType;
  if (type && state.pendingAmmoAssign === type) state.pendingAmmoAssign = null;
  if (nextType && (state.selectedAmmoSlot === index || previousSelectedType === nextType)) {
    state.selectedAmmoSlot = index;
    state.selectedAmmo = nextType;
  }
  if (state.selectedAmmoSlot === index && !nextType) {
    state.selectedAmmoSlot = 0;
    state.selectedAmmo = "basic";
  }
  updateAmmoHotbar();
}

function placeAmmoOnHotbar(type) {
  if (!CANNONBALL_TYPES[type] || CANNONBALL_TYPES[type].infinite) return true;
  if (state.ammoSlots.includes(type)) {
    state.pendingAmmoAssign = null;
    updateAmmoHotbar();
    return true;
  }
  const openSlot = state.ammoSlots.findIndex((item, index) => index > 0 && !item);
  if (openSlot > 0) {
    assignAmmoSlot(openSlot, type);
    return true;
  }
  state.pendingAmmoAssign = type;
  updateAmmoHotbar();
  return false;
}

function consumeAmmo(ammo) {
  if (!ammo || ammo.infinite) return true;
  if (ammoCount(ammo.id) <= 0) {
    state.selectedAmmoSlot = 0;
    state.selectedAmmo = "basic";
    updateAmmoHotbar();
    toast(`${ammo.name} is empty.`);
    return false;
  }
  state.ammo[ammo.id] = ammoCount(ammo.id) - 1;
  if (state.ammo[ammo.id] <= 0) {
    state.selectedAmmoSlot = 0;
    state.selectedAmmo = "basic";
  }
  updateAmmoHotbar();
  return true;
}

function rotateFlatDirection(dir, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return new THREE.Vector3(dir.x * cos + dir.z * sin, 0, dir.z * cos - dir.x * sin).normalize();
}

function updateAmmoHotbar(force = false) {
  if (!ui.ammoHotbar) return;
  const signature = state.ammoSlots.map((type, index) => {
    if (!type) return `${index}:empty`;
    const ammo = CANNONBALL_TYPES[type] || CANNONBALL_TYPES.basic;
    return `${index}:${type}:${ammo.infinite ? "inf" : ammoCount(type)}:${state.selectedAmmoSlot === index ? "active" : ""}`;
  }).join("|");
  if (!force && signature === ammoHotbarSignature) return;
  ammoHotbarSignature = signature;
  ui.ammoHotbar.innerHTML = state.ammoSlots.map((type, index) => {
    if (!type) {
      const active = state.selectedAmmoSlot === index ? " active" : "";
      return `<button class="ammo-slot empty${active}" data-ammo-slot="${index}" title="Empty slot"><span>${index + 1}</span><strong>Empty</strong><em>-</em></button>`;
    }
    const ammo = CANNONBALL_TYPES[type] || CANNONBALL_TYPES.basic;
    const count = ammo.infinite ? "&infin;" : ammoCount(type);
    const active = state.selectedAmmoSlot === index ? " active" : "";
    const empty = !ammo.infinite && ammoCount(type) <= 0 ? " empty" : "";
    return `<button class="ammo-slot${active}${empty}" data-ammo-slot="${index}" title="${ammo.name}"><span>${index + 1}</span><strong>${ammo.short}</strong><em>${count}</em></button>`;
  }).join("");
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
      if (kind === "reload" && upgrades.reload >= MAX_RELOAD_UPGRADES) continue;
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

function botCannonRange(botOrLevel = 1) {
  return BOT_CANNON_RANGE + botUpgradeLevels(botOrLevel).range * 4;
}

function compareStatLabel(label, delta, suffix = "") {
  if (!delta) return `<span class="same">${label} =</span>`;
  const sign = delta > 0 ? "+" : "";
  const className = delta > 0 ? "better" : "worse";
  return `<span class="${className}">${label} ${sign}${delta}${suffix}</span>`;
}

function shipCompareMarkup(ship) {
  const current = getShipStats();
  const parts = [
    compareStatLabel("HP", ship.hp - current.hp),
    compareStatLabel("Armor", Math.round((ship.armor - current.armor) * 100), "%"),
    compareStatLabel("Speed", ship.speed - current.speed),
    compareStatLabel("Regen", ship.regen - current.regen),
    compareStatLabel("Hold", ship.capacity - current.capacity),
  ];
  return `<div class="ship-compare">Vs your ${current.name}: ${parts.join(" ")}</div>`;
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
  addWorldWaterfall();
}

function addWorldWaterfall() {
  const matWaterfall = new THREE.MeshBasicMaterial({ color: 0xbdefff, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false });
  const makeWall = (x, z, width, rot) => {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(width, 90, 16, 4), matWaterfall.clone());
    wall.position.set(x, -22, z);
    wall.rotation.y = rot;
    wall.userData.waterfall = true;
    scene.add(wall);
    const foam = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, 7), new THREE.MeshBasicMaterial({ color: 0xf1fdff, transparent: true, opacity: 0.72, depthWrite: false }));
    foam.position.set(x, 0.09, z);
    foam.rotation.y = rot;
    foam.userData.waterfallFoam = true;
    scene.add(foam);
    for (let i = 0; i < 10; i++) {
      const mist = new THREE.Mesh(new THREE.PlaneGeometry(width * (0.16 + Math.random() * 0.16), 18 + Math.random() * 14), new THREE.MeshBasicMaterial({ color: 0xe7fbff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
      mist.position.set(x, -6 - Math.random() * 20, z);
      mist.rotation.y = rot;
      mist.position.x += rot === 0 || rot === Math.PI ? (Math.random() - 0.5) * width : 0;
      mist.position.z += rot === Math.PI / 2 || rot === -Math.PI / 2 ? (Math.random() - 0.5) * width : 0;
      mist.userData.waterfallMist = Math.random() * 100;
      scene.add(mist);
    }
  };
  makeWall(0, WATERFALL_LIMIT, WATERFALL_LIMIT * 2, 0);
  makeWall(0, -WATERFALL_LIMIT, WATERFALL_LIMIT * 2, Math.PI);
  makeWall(WATERFALL_LIMIT, 0, WATERFALL_LIMIT * 2, Math.PI / 2);
  makeWall(-WATERFALL_LIMIT, 0, WATERFALL_LIMIT * 2, -Math.PI / 2);
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
  const radius = (data.radius || 20) * ISLAND_RADIUS_SCALE;
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
  const terrainFeatures = [];
  const addCollisionBox = (x, z, w, d, pad = 0.45, rot = 0) => {
    collisionBoxes.push({ x: data.x + x, z: data.z + z, w, d, pad, rot });
  };
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
  const addBlock = (x, z, w, h, d, color, y = 3.2, blocks = true) => {
    const block = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    block.position.set(x, y + h * 0.5, z);
    block.castShadow = true;
    block.receiveShadow = true;
    group.add(block);
    if (blocks) collisionBoxes.push({ x: data.x + x, z: data.z + z, w, d });
    return block;
  };
  const addCone = (x, z, r, h, color, y = 5.4, sides = 4) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, sides), mat(color));
    cone.position.set(x, y, z);
    cone.rotation.y = Math.PI / sides;
    cone.castShadow = true;
    group.add(cone);
    return cone;
  };
  const addTent = (x, z, color) => {
    const cloth = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.2, 4), mat(color));
    cloth.position.set(x, 3.55, z);
    cloth.rotation.y = Math.PI / 4;
    cloth.castShadow = true;
    group.add(cloth);
    obstacles.push({ x: data.x + x, z: data.z + z, r: 1.6 });
  };
  const addInteriorHouse = (x, z, w, d, color, roofColor = accent) => {
    const house = new THREE.Group();
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), mats.plank);
    floor.position.y = 3.08;
    floor.receiveShadow = true;
    house.add(floor);
    const back = new THREE.Mesh(new THREE.BoxGeometry(w, 1.9, 0.22), mat(color));
    back.position.set(0, 4.05, -d * 0.5);
    house.add(back);
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.9, d), mat(color));
      wall.position.set(side * w * 0.5, 4.05, 0);
      house.add(wall);
      const window = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.42, 0.08), mats.gold);
      window.position.set(side * (w * 0.5 + 0.02), 4.3, -d * 0.06);
      house.add(window);
    }
    const leftFront = new THREE.Mesh(new THREE.BoxGeometry(w * 0.34, 1.9, 0.22), mat(color));
    leftFront.position.set(-w * 0.33, 4.05, d * 0.5);
    const rightFront = leftFront.clone();
    rightFront.position.x = w * 0.33;
    house.add(leftFront, rightFront);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.58, 1.25, 4), mat(roofColor));
    roof.position.y = 5.35;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    house.add(roof);
    const table = new THREE.Mesh(new THREE.BoxGeometry(w * 0.32, 0.22, d * 0.24), mats.wood);
    table.position.set(0.1, 3.35, -d * 0.08);
    house.add(table);
    house.position.set(x, 0, z);
    house.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    group.add(house);
    const wallPad = 0.08;
    addCollisionBox(x, z - d * 0.5, w, 0.28, wallPad);
    addCollisionBox(x - w * 0.5, z, 0.28, d, wallPad);
    addCollisionBox(x + w * 0.5, z, 0.28, d, wallPad);
    addCollisionBox(x - w * 0.33, z + d * 0.5, w * 0.34, 0.28, wallPad);
    addCollisionBox(x + w * 0.33, z + d * 0.5, w * 0.34, 0.28, wallPad);
    return house;
  };
  const addMountain = (x, z, r, h, color = 0x66706e, cave = false) => {
    const mountain = new THREE.Group();
    const peakProfiles = [];
    const makePeak = (px, pz, pr, ph, tint, yaw = 0, snow = false) => {
      const peak = new THREE.Mesh(new THREE.ConeGeometry(pr, ph, 7, 1), mat(tint));
      peak.position.set(px, 3 + ph * 0.5, pz);
      peak.scale.z = 0.78 + Math.random() * 0.22;
      peak.rotation.set(0.06, yaw, -0.04);
      peak.castShadow = true;
      peak.receiveShadow = true;
      mountain.add(peak);
      peakProfiles.push({ x: px, z: pz, r: pr, h: ph });
      if (snow) {
        const cap = new THREE.Mesh(new THREE.ConeGeometry(pr * 0.34, ph * 0.24, 6, 1), mat(0xd9e4df));
        cap.position.set(px - pr * 0.06, 3 + ph * 0.88, pz - pr * 0.04);
        cap.scale.z = peak.scale.z;
        cap.rotation.copy(peak.rotation);
        cap.castShadow = true;
        mountain.add(cap);
      }
    };
    const baseColor = color;
    const shadowColor = new THREE.Color(color).multiplyScalar(0.78).getHex();
    makePeak(0, 0, r * 1.18, h * 1.55, baseColor, Math.random() * Math.PI, true);
    makePeak(-r * 0.34, r * 0.14, r * 0.74, h * 1.06, shadowColor, Math.random() * Math.PI, false);
    makePeak(r * 0.35, -r * 0.1, r * 0.68, h * 0.96, baseColor, Math.random() * Math.PI, false);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.22;
      const ridge = new THREE.Mesh(new THREE.ConeGeometry(r * 0.085, h * 0.86, 3), mat(i % 2 ? shadowColor : baseColor));
      ridge.position.set(Math.cos(angle) * r * 0.34, 3 + h * 0.48, Math.sin(angle) * r * 0.28);
      ridge.rotation.set(0.82, -angle, 0.2);
      ridge.castShadow = true;
      mountain.add(ridge);
    }
    const foothill = new THREE.Mesh(new THREE.ConeGeometry(r * 1.45, h * 0.38, 9, 1), mat(shadowColor));
    foothill.position.y = 3 + h * 0.18;
    foothill.scale.z = 0.68;
    foothill.rotation.y = Math.random() * Math.PI;
    foothill.receiveShadow = true;
    mountain.add(foothill);
    if (cave) {
      const mouth = new THREE.Mesh(new THREE.TorusGeometry(r * 0.28, 0.18, 8, 20, Math.PI), mat(0x28313a));
      mouth.position.set(0, 3.55, r * 0.73);
      mouth.rotation.x = Math.PI / 2;
      mountain.add(mouth);
      const tunnel = new THREE.Mesh(new THREE.BoxGeometry(r * 0.48, 1.25, r * 0.86), new THREE.MeshBasicMaterial({ color: 0x111820 }));
      tunnel.position.set(0, 3.25, r * 0.5);
      mountain.add(tunnel);
    }
    mountain.position.set(x, 0, z);
    group.add(mountain);
    terrainFeatures.push({
      x: data.x + x,
      z: data.z + z,
      r: r * 1.32,
      h: h * 1.05,
      cave,
      peaks: peakProfiles.map((peak) => ({
        x: data.x + x + peak.x,
        z: data.z + z + peak.z,
        r: peak.r,
        h: peak.h,
      })),
    });
  };
  const addShipwreck = (angle, type = "galleon") => {
    const wreck = new THREE.Group();
    const wreckLength = type === "frigate" ? 10.4 : 9.2;
    const wreckWidth = type === "frigate" ? 3.6 : 3.2;
    const shoreDistance = radius * 0.72;
    const x = Math.sin(angle) * shoreDistance;
    const z = Math.cos(angle) * shoreDistance;
    const yaw = angle + Math.PI * 0.5 + (Math.random() - 0.5) * 0.5;
    const wreckWood = mat(0x5a3522);
    const wetWood = mat(0x39261c);
    const paleWood = mat(0x8c623f);
    const makePiece = (w, h, d, px, py, pz, material = wreckWood, rot = [0, 0, 0]) => {
      const piece = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      piece.position.set(px, py, pz);
      piece.rotation.set(rot[0], rot[1], rot[2]);
      piece.castShadow = true;
      piece.receiveShadow = true;
      wreck.add(piece);
      return piece;
    };
    makePiece(wreckWidth * 0.42, 0.34, wreckLength * 0.96, -wreckWidth * 0.56, 0.38, -0.2, wreckWood, [0.08, 0.04, -0.38]);
    makePiece(wreckWidth * 0.36, 0.32, wreckLength * 0.72, wreckWidth * 0.52, 0.34, -0.7, wetWood, [-0.02, -0.14, 0.46]);
    makePiece(wreckWidth * 0.58, 0.28, wreckLength * 0.52, 0.1, 0.18, -0.52, paleWood, [0.04, 0.02, 0.03]);
    makePiece(wreckWidth * 0.78, 0.46, 1.5, -0.4, 0.55, wreckLength * 0.42, wetWood, [0.16, 0.18, -0.12]);
    makePiece(wreckWidth * 0.62, 0.38, 1.3, 0.68, 0.42, -wreckLength * 0.48, wreckWood, [-0.2, -0.22, 0.18]);
    for (let i = 0; i < 5; i++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(wreckWidth * (0.48 + i * 0.015), 0.045, 6, 12, Math.PI), paleWood);
      rib.position.set((i - 2) * 0.18, 0.74, -wreckLength * 0.34 + i * wreckLength * 0.16);
      rib.rotation.set(Math.PI / 2, 0.18 * (i - 2), Math.PI * 0.5 + (i % 2 ? 0.18 : -0.14));
      rib.scale.y = 0.78;
      rib.castShadow = true;
      wreck.add(rib);
    }
    makePiece(0.22, 0.22, wreckLength * 0.72, 0.9, 0.78, -0.12, wetWood, [1.42, 0.32, -0.28]);
    makePiece(0.16, 0.16, wreckLength * 0.34, -1.42, 0.62, -0.98, paleWood, [1.22, -0.52, 0.36]);
    for (let i = 0; i < 7; i++) {
      const px = (Math.random() - 0.5) * wreckWidth * 2.2;
      const pz = (Math.random() - 0.5) * wreckLength * 1.1;
      makePiece(0.22 + Math.random() * 0.18, 0.12, 1.2 + Math.random() * 1.9, px, 0.12 + Math.random() * 0.3, pz, i % 2 ? wetWood : paleWood, [Math.random() * 0.24, Math.random() * Math.PI, (Math.random() - 0.5) * 0.3]);
    }
    wreck.position.set(x, 2.35, z);
    wreck.rotation.set(-0.04, yaw, 0.08);
    group.add(wreck);
    const worldX = data.x + x;
    const worldZ = data.z + z;
    obstacles.push({ x: worldX - Math.sin(yaw) * 2.4, z: worldZ - Math.cos(yaw) * 2.4, r: 1.15 });
    obstacles.push({ x: worldX + Math.sin(yaw) * 2.1, z: worldZ + Math.cos(yaw) * 2.1, r: 1.0 });
    addCollisionBox(x, z, wreckWidth * 0.9, wreckLength * 0.42, 0.16, yaw);
  };
  addInteriorHouse(radius * 0.18, radius * 0.03, 4.0, 3.2, data.theme === "norse" ? 0x8b5a32 : 0xd9a45e, accent);
  if (!["atoll", "lagoon"].includes(data.theme)) {
    addMountain(-radius * 0.18, -radius * 0.2, radius * (data.theme === "rocky" ? 0.27 : 0.2), 3.8 + radius * 0.08, data.theme === "rocky" ? 0x4f5963 : 0x66706e, ["rocky", "norse", "fort", "naval"].includes(data.theme));
  }
  if (["rocky", "schooner", "naval", "trade"].includes(data.theme)) {
    const wreckAngle = data.theme === "naval" ? -1.0 : data.theme === "trade" ? 1.05 : data.theme === "rocky" ? -2.2 : 2.35;
    addShipwreck(wreckAngle, data.theme === "naval" ? "frigate" : "galleon");
  }
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
  if (data.theme === "starter") {
    const light = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 4.6, 10), mat(0xf6ead0));
    light.position.set(5.6, 4.9, -5.4);
    light.castShadow = true;
    group.add(light);
    addCone(5.6, -5.4, 1.25, 0.9, accent, 7.7, 10);
    obstacles.push({ x: data.x + 5.6, z: data.z - 5.4, r: 1.25 });
  }
  if (data.theme === "iberian") {
    addBlock(4.7, -4.5, 3.2, 3.6, 3.0, 0xf4e5c9);
    addCone(4.7, -4.5, 2.2, 1.4, 0xb84f44, 6.7);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.13, 8, 18, Math.PI), mat(accent));
    arch.position.set(-1.2, 3.65, -7.2);
    arch.rotation.x = Math.PI / 2;
    group.add(arch);
  }
  if (data.theme === "lagoon") {
    const bridge = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.16, 8, 18, Math.PI), mat(0xd7b44a));
    bridge.position.set(3.7, 3.25, 3.0);
    bridge.rotation.x = Math.PI / 2;
    group.add(bridge);
    addCollisionBox(3.7, 3.0, 5.4, 0.7, 0.18);
    addBlock(-5.1, -4.1, 2.5, 2.5, 2.4, 0xe2d0a5);
    addCone(-5.1, -4.1, 1.8, 0.9, accent, 5.3);
  }
  if (data.theme === "trade") {
    addBlock(4.8, -4.0, 4.8, 2.6, 3.2, 0xb77b42);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 5.2, 7), mats.wood);
    mast.position.set(-5.4, 5.0, -2.6);
    group.add(mast);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.5, 0.16), mat(0xf8f4e5));
    blade.position.set(-5.4, 6.8, -2.6);
    group.add(blade);
    const blade2 = blade.clone();
    blade2.rotation.z = Math.PI / 2;
    group.add(blade2);
    obstacles.push({ x: data.x - 5.4, z: data.z - 2.6, r: 1.2 });
  }
  if (data.theme === "dhow" || data.theme === "market") {
    addTent(4.6, -3.9, accent);
    addTent(1.8, -6.2, 0xf0d05a);
    addTent(6.8, -0.8, 0xda9c5c);
  }
  if (data.theme === "schooner") {
    addBlock(4.8, -4.2, 5.6, 1.0, 2.2, 0xb77b42, 3.0);
    for (let i = 0; i < 3; i++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(1.05 + i * 0.2, 0.055, 6, 12, Math.PI), mats.wood);
      rib.position.set(3.7 + i * 0.9, 3.65, -4.2);
      rib.rotation.x = Math.PI / 2;
      group.add(rib);
    }
  }
  if (data.theme === "atoll") {
    addTent(4.4, -4.0, 0xef6f4f);
    const shell = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.16, 8, 18), mat(0xf8f4e5));
    shell.position.set(-5.2, 3.05, -4.2);
    shell.scale.z = 0.5;
    group.add(shell);
    obstacles.push({ x: data.x - 5.2, z: data.z - 4.2, r: 1.2 });
  }
  if (data.theme === "rocky") {
    const cave = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.45, 8, 18, Math.PI), mat(0x3f4650));
    cave.position.set(5.2, 3.3, -4.5);
    cave.rotation.x = Math.PI / 2;
    group.add(cave);
    obstacles.push({ x: data.x + 3.65, z: data.z - 4.5, r: 0.85 });
    obstacles.push({ x: data.x + 6.75, z: data.z - 4.5, r: 0.85 });
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
    terrainFeatures,
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
  let y = island.landY - edgeSlope * 0.82;
  (island.terrainFeatures || []).forEach((feature) => {
    const d = dist2(point, feature);
    if (d > feature.r * 1.08 && !(feature.peaks || []).some((peak) => dist2(point, peak) < peak.r * 1.08)) return;
    const caveMouth = feature.cave && Math.abs(point.x - feature.x) < feature.r * 0.28 && point.z > feature.z + feature.r * 0.28 && point.z < feature.z + feature.r * 1.02;
    if (caveMouth) {
      y = Math.max(y, island.landY + 0.08);
      return;
    }
    if (d < feature.r * 1.08) {
      const climb = Math.pow(1 - d / (feature.r * 1.08), 1.45);
      y = Math.max(y, island.landY + climb * feature.h * 0.38);
    }
    (feature.peaks || []).forEach((peak) => {
      const peakDistance = dist2(point, peak);
      if (peakDistance > peak.r * 1.04) return;
      const coneSlope = clamp(1 - peakDistance / (peak.r * 1.04), 0, 1);
      y = Math.max(y, island.landY + coneSlope * peak.h * 0.94);
    });
  });
  return y;
}

function pointBlockedOnIsland(island, point) {
  if (island.obstacles.some((obstacle) => dist2(point, obstacle) < obstacle.r + 0.72)) return true;
  return island.collisionBoxes?.some((box) => {
    const pad = box.pad ?? 0.45;
    const dx = point.x - box.x;
    const dz = point.z - box.z;
    const rot = box.rot || 0;
    const cos = Math.cos(-rot);
    const sin = Math.sin(-rot);
    const localX = dx * cos - dz * sin;
    const localZ = dx * sin + dz * cos;
    return Math.abs(localX) < box.w * 0.5 + pad && Math.abs(localZ) < box.d * 0.5 + pad;
  });
}

function walkableGroundY(island, point) {
  const y = islandGroundY(island, point);
  if (y === null || pointBlockedOnIsland(island, point)) return null;
  return y;
}

function pointInAnyIsland(point, margin = 0) {
  return islands.some((island) => dist2(point, island.group.position) < island.radius + margin);
}

function starterIslandCenter() {
  return islands[0]?.group?.position || new THREE.Vector3(islandData[0].x, 0, islandData[0].z);
}

function nearStarterIsland(point, margin = CENTER_BOT_CLEAR_RADIUS) {
  const center = starterIslandCenter();
  return dist2(point, center) < margin;
}

function randomWaterPoint(range = MAP_LIMIT * 0.9, minFromStart = 0) {
  const point = new THREE.Vector3();
  for (let i = 0; i < 80; i++) {
    point.set((Math.random() - 0.5) * range * 2, SHIP_WATERLINE_Y, (Math.random() - 0.5) * range * 2);
    if (dist2(point, state.position) >= minFromStart && !pointInAnyIsland(point, 12)) return point.clone();
  }
  return new THREE.Vector3(range * 0.65, SHIP_WATERLINE_Y, range * 0.65);
}

function randomNorthernWaterPoint(range = MAP_LIMIT * 0.9, minFromStart = 0) {
  const point = new THREE.Vector3();
  const minZ = Math.max(-range, WHALE_NORTH_MIN_Z);
  const maxZ = Math.min(range, WHALE_NORTH_MAX_Z);
  for (let i = 0; i < 100; i++) {
    point.set((Math.random() - 0.5) * range * 2, SHIP_WATERLINE_Y, minZ + Math.random() * Math.max(8, maxZ - minZ));
    if (dist2(point, state.position) >= minFromStart && !pointInAnyIsland(point, 16)) return point.clone();
  }
  return new THREE.Vector3(range * 0.15, SHIP_WATERLINE_Y, WHALE_NORTH_CENTER_Z);
}

function pointInWhaleNorthZone(point, pad = 0) {
  return point.z >= WHALE_NORTH_MIN_Z - pad && point.z <= WHALE_NORTH_MAX_Z + pad;
}

function whaleZoneReturnDirection(position) {
  const target = new THREE.Vector3(position.x * 0.45, 0, clamp(position.z, WHALE_NORTH_MIN_Z + 34, WHALE_NORTH_MAX_Z - 34));
  target.z = WHALE_NORTH_CENTER_Z;
  const toZone = target.sub(position);
  toZone.y = 0;
  if (toZone.lengthSq() < 0.01) toZone.set(0, 0, WHALE_NORTH_CENTER_Z > position.z ? 1 : -1);
  return Math.atan2(toZone.x, toZone.z);
}

function randomTravelWaterPoint(range = MAP_LIMIT * 0.92) {
  const point = new THREE.Vector3();
  for (let i = 0; i < 90; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = range * (0.42 + Math.random() * 0.55);
    point.set(Math.sin(angle) * radius, SHIP_WATERLINE_Y, Math.cos(angle) * radius);
    if (!pointInAnyIsland(point, 22) && !nearStarterIsland(point, CENTER_BOT_CLEAR_RADIUS)) return point.clone();
  }
  return randomWaterPoint(range, 92);
}

function initWindCurrents() {
  windCurrents.length = 0;
  for (let i = 0; i < WIND_MARKER_COUNT; i++) {
    const angle = (i / WIND_MARKER_COUNT) * Math.PI * 2 + Math.sin(i * 7.1) * 0.55;
    const radius = MAP_LIMIT * (0.18 + (i % 6) * 0.12);
    const x = Math.cos(angle) * radius + Math.sin(i * 1.9) * 28;
    const z = Math.sin(angle) * radius + Math.cos(i * 2.3) * 28;
    const dir = angle + Math.PI * 0.42 + Math.sin(i * 3.4) * 0.85;
    windCurrents.push({
      x: clamp(x, -MAP_LIMIT * 0.9, MAP_LIMIT * 0.9),
      z: clamp(z, -MAP_LIMIT * 0.9, MAP_LIMIT * 0.9),
      radius: 86 + (i % 4) * 24,
      strength: 1.4 + (i % 5) * 0.45,
      dir,
      vector: new THREE.Vector3(Math.sin(dir), 0, Math.cos(dir)),
    });
  }
}

function windAt(position) {
  const result = new THREE.Vector3();
  windCurrents.forEach((wind) => {
    const dx = position.x - wind.x;
    const dz = position.z - wind.z;
    const distance = Math.hypot(dx, dz);
    if (distance > wind.radius) return;
    const falloff = Math.pow(1 - distance / wind.radius, 1.35);
    result.add(wind.vector.clone().multiplyScalar(wind.strength * falloff));
  });
  return result;
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

function shipSeparationDistance(typeA, typeB) {
  return (shipHitRadius(typeA) + shipHitRadius(typeB)) * 0.72;
}

function separateShipPositions(posA, typeA, velA, posB, typeB, velB, aShare = 0.5, bShare = 0.5) {
  const dx = posA.x - posB.x;
  const dz = posA.z - posB.z;
  const distance = Math.hypot(dx, dz);
  const minDistance = shipSeparationDistance(typeA, typeB);
  if (distance >= minDistance || minDistance <= 0) return false;
  const normal = distance > 0.001
    ? new THREE.Vector3(dx / distance, 0, dz / distance)
    : new THREE.Vector3(Math.sin(clock.elapsedTime * 8.17), 0, Math.cos(clock.elapsedTime * 8.17)).normalize();
  const overlap = minDistance - distance;
  const massA = shipWeight(typeA);
  const massB = shipWeight(typeB);
  const aMotion = aShare / massA;
  const bMotion = bShare / massB;
  const totalMotion = Math.max(0.000001, aMotion + bMotion);
  const correction = Math.max(0, overlap - 0.08) * 0.68;
  posA.add(normal.clone().multiplyScalar(correction * (aMotion / totalMotion)));
  posB.add(normal.clone().multiplyScalar(-correction * (bMotion / totalMotion)));

  const invMassA = velA && aShare > 0 ? aShare / massA : 0;
  const invMassB = velB && bShare > 0 ? bShare / massB : 0;
  const totalInvMass = invMassA + invMassB;
  if (totalInvMass > 0) {
    const velocityA = velA ? velA.dot(normal) : 0;
    const velocityB = velB ? velB.dot(normal) : 0;
    const relativeNormalSpeed = velocityA - velocityB;
    const biasSpeed = clamp(Math.max(0, overlap - 0.12) * 0.42, 0, 1.9);
    let normalImpulse = 0;
    if (relativeNormalSpeed < biasSpeed) {
      const restitution = relativeNormalSpeed < -5 ? 0.12 : 0.02;
      normalImpulse = clamp((biasSpeed - (1 + restitution) * relativeNormalSpeed) / totalInvMass, 0, 900);
      if (velA) velA.add(normal.clone().multiplyScalar(normalImpulse * invMassA));
      if (velB) velB.add(normal.clone().multiplyScalar(-normalImpulse * invMassB));
    }
    if (normalImpulse > 0) {
      const relativeVelocity = new THREE.Vector3();
      if (velA) relativeVelocity.add(velA);
      if (velB) relativeVelocity.sub(velB);
      const tangent = relativeVelocity.sub(normal.clone().multiplyScalar(relativeVelocity.dot(normal)));
      const tangentSpeed = tangent.length();
      if (tangentSpeed > 0.001) {
        const frictionImpulse = Math.min(tangentSpeed / totalInvMass, normalImpulse * 0.42);
        tangent.multiplyScalar(-frictionImpulse / tangentSpeed);
        if (velA) velA.add(tangent.clone().multiplyScalar(invMassA));
        if (velB) velB.add(tangent.clone().multiplyScalar(-invMassB));
      }
    }
    if (velA) velA.multiplyScalar(0.985);
    if (velB) velB.multiplyScalar(0.985);
  }
  return true;
}

function ramKey(a, b) {
  return [a.id, b.id].sort().join(":");
}

function entityForward(entity) {
  const rotation = entity.rotation ?? entity.group?.rotation?.y ?? 0;
  return new THREE.Vector3(Math.sin(rotation), 0, Math.cos(rotation));
}

function applyRamDamage(a, b) {
  if (!a?.target || !b?.target || !a.velocity || !b.velocity) return;
  const key = ramKey(a, b);
  if ((ramCooldowns.get(key) || 0) > clock.elapsedTime) return;
  const normal = a.position.clone().sub(b.position);
  normal.y = 0;
  if (normal.lengthSq() < 0.001) return;
  normal.normalize();
  const relativeVelocity = a.velocity.clone().sub(b.velocity);
  const closing = -relativeVelocity.dot(normal);
  if (closing < 2.2) return;
  const baseWeight = shipWeight("skiff");
  const base = 40 * clamp(closing / 15, 0.22, 2.2);
  const aNose = entityForward(a).dot(normal.clone().multiplyScalar(-1));
  const bNose = entityForward(b).dot(normal);
  let damageToA = base * Math.sqrt(shipWeight(b.type) / baseWeight) * 0.42;
  let damageToB = base * Math.sqrt(shipWeight(a.type) / baseWeight) * 0.42;
  if (aNose > 0.58 && Math.abs(bNose) < 0.42) {
    damageToB *= 1.35;
    damageToA *= 0.55;
  } else if (bNose > 0.58 && Math.abs(aNose) < 0.42) {
    damageToA *= 1.35;
    damageToB *= 0.55;
  }
  if (a.type === "whaler") damageToA *= getShipStats("whaler").ramTakenScale || 0.5;
  if (b.type === "whaler") damageToB *= getShipStats("whaler").ramTakenScale || 0.5;
  if (damageToA > 3 && a.canDamage !== false) damageTarget(a.target, damageToA);
  if (damageToB > 3 && b.canDamage !== false) damageTarget(b.target, damageToB);
  ramCooldowns.set(key, clock.elapsedTime + 1.15);
}

function pushShipOutOfIslands(position, shipType, velocity = null, padding = 4) {
  const radius = shipHitRadius(shipType) * 0.55 + padding;
  let pushed = false;
  islands.forEach((island) => {
    const dx = position.x - island.group.position.x;
    const dz = position.z - island.group.position.z;
    const distance = Math.hypot(dx, dz);
    const minDistance = island.radius + radius;
    if (distance >= minDistance) return;
    const normal = distance > 0.001
      ? new THREE.Vector3(dx / distance, 0, dz / distance)
      : new THREE.Vector3(1, 0, 0);
    position.x = island.group.position.x + normal.x * minDistance;
    position.z = island.group.position.z + normal.z * minDistance;
    if (velocity) {
      const inward = velocity.dot(normal);
      if (inward < 0) velocity.add(normal.multiplyScalar(-inward * 1.05));
      velocity.multiplyScalar(0.62);
    }
    pushed = true;
  });
  return pushed;
}

function krakenHeadWorldPosition() {
  if (!krakenBoss?.group) return null;
  return krakenBoss.group.localToWorld(new THREE.Vector3(0, 0, -6.55));
}

function pushShipOutOfKraken(position, shipType, velocity = null, padding = 1) {
  if (!krakenBoss?.alive || !krakenBoss.group?.visible) return false;
  const center = krakenHeadWorldPosition();
  if (!center) return false;
  const minDistance = 7.5 + shipHitRadius(shipType) * 0.72 + padding;
  const dx = position.x - center.x;
  const dz = position.z - center.z;
  const distance = Math.hypot(dx, dz);
  if (distance >= minDistance) return false;
  const normal = distance > 0.001
    ? new THREE.Vector3(dx / distance, 0, dz / distance)
    : new THREE.Vector3(1, 0, 0);
  position.x = center.x + normal.x * minDistance;
  position.z = center.z + normal.z * minDistance;
  if (velocity) {
    const inward = velocity.dot(normal);
    if (inward < 0) velocity.add(normal.clone().multiplyScalar(-inward * 1.35));
    velocity.multiplyScalar(0.58);
  }
  return true;
}

function resolveShipContacts() {
  if (state.mode === "ship" && playerShip) {
    bots.forEach((bot) => {
      if (separateShipPositions(playerShip.position, state.shipType, state.velocity, bot.group.position, bot.shipType, bot.velocity, 0.42, 0.58)) {
        bot.agroUntil = Math.max(bot.agroUntil || 0, clock.elapsedTime + 1.2);
        applyRamDamage(
          { id: "player", target: state, position: playerShip.position, velocity: state.velocity, type: state.shipType, rotation: state.rotation },
          { id: bot.localId || bot.serverId, target: bot, position: bot.group.position, velocity: bot.velocity, type: bot.shipType, rotation: bot.rotation ?? bot.group.rotation.y },
        );
      }
    });
    remotePlayers.forEach((remote) => {
      if (remote.group.visible) separateShipPositions(playerShip.position, state.shipType, state.velocity, remote.group.position, remote.shipType, null, 1, 0);
    });
    remotePlayers.forEach((remote) => {
      if (remote.group.visible) pushShipOutOfKraken(remote.group.position, remote.shipType, remote.velocity, 1);
    });
    pushShipOutOfIslands(playerShip.position, state.shipType, state.velocity, 3);
    pushShipOutOfKraken(playerShip.position, state.shipType, state.velocity, 1.2);
    playerShip.position.y = SHIP_WATERLINE_Y + Math.sin(clock.elapsedTime * 2.8) * 0.08;
    state.position.copy(playerShip.position);
  }
  for (let i = 0; i < bots.length; i++) {
    const bot = bots[i];
    pushShipOutOfIslands(bot.group.position, bot.shipType, bot.velocity, 5);
    pushShipOutOfKraken(bot.group.position, bot.shipType, bot.velocity, 1);
    for (let j = i + 1; j < bots.length; j++) {
      if (separateShipPositions(bot.group.position, bot.shipType, bot.velocity, bots[j].group.position, bots[j].shipType, bots[j].velocity, 0.5, 0.5)) {
        applyRamDamage(
          { id: bot.localId || bot.serverId, target: bot, position: bot.group.position, velocity: bot.velocity, type: bot.shipType, rotation: bot.rotation ?? bot.group.rotation.y },
          { id: bots[j].localId || bots[j].serverId, target: bots[j], position: bots[j].group.position, velocity: bots[j].velocity, type: bots[j].shipType, rotation: bots[j].rotation ?? bots[j].group.rotation.y },
        );
      }
    }
    remotePlayers.forEach((remote) => {
      if (remote.group.visible) separateShipPositions(bot.group.position, bot.shipType, bot.velocity, remote.group.position, remote.shipType, null, 1, 0);
    });
  }
  remotePlayers.forEach((remote) => {
    if (remote.group.visible) pushShipOutOfKraken(remote.group.position, remote.shipType, remote.velocity, 1);
  });
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
  const mastBottom = 1.42 * scale;
  const mastHeight = 4.6 * scale;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * scale, 0.14 * scale, mastHeight, 7), mats.dark);
  mast.position.set(mastX, mastBottom + mastHeight * 0.5, mastZ);
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
  const mastBottom = 1.42 * scale;
  const mastHeight = (4.6 + tiers * 0.55) * scale;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.16 * scale, mastHeight, 7), mats.dark);
  mast.position.set(mastX, mastBottom + mastHeight * 0.5, mastZ);
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
  if (type === "whaler") return [-length * 0.18, length * 0.16];
  if (type === "ballooner") return [-length * 0.22, length * 0.08];
  if (["sloop", "storm", "dart", "lugger", "dogger", "tartane"].includes(type)) return [-length * 0.16, length * 0.18];
  if (["galleon", "carrack", "merchantman", "eastindiaman", "treasure", "manowar", "fourthrate", "firstrate", "frigate", "razee"].includes(type)) {
    return [-length * 0.28, -length * 0.02, length * 0.17];
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
    "xebec", "tartane", "firstrate", "whaler", "ballooner",
  ]);
  const customDeckTypes = new Set([
    "carrack", "eastindiaman", "firstrate", "fourthrate", "galleon", "ironclad",
    "knarr", "manowar", "merchantman", "razee", "treasure",
  ]);
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
  if ((tier >= 4 && !["whaler", "ballooner"].includes(type)) || ["galleon", "carrack", "eastindiaman", "treasure", "manowar", "fourthrate", "firstrate", "razee"].includes(type)) {
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
  const scale = shipVisualScale(type);
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
  } else if (type === "merchantman" || type === "eastindiaman") {
    addSquareSail(group, -0.8, -1.75, 0.92, 0xf3e5c8, 2);
    addSquareSail(group, 0.25, 0.15, 1.02, 0xf7edcf, 2);
    addSquareSail(group, 0.9, 1.95, 0.74, 0xf3e5c8, 1);
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
    addCabin(group, 0, 1.45, 1.8, 0.82, scale * 0.78, 0x7a5030);
    const highStern = new THREE.Mesh(new THREE.BoxGeometry(2.3 * scale, 0.85 * scale, 0.9 * scale), mat(0x7a5030));
    highStern.position.set(0, 1.66 * scale, 2.72 * scale);
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
  } else if (type === "whaler") {
    addSquareSail(group, -0.65, -1.55, 0.78, 0xe8eadf, 1);
    addSail(group, 0.45, 0.8, 0.86, 0xf4efd9);
    addCabin(group, 0, 2.0, 2.1, 1.05, scale * 0.88, 0x526069);
    const tryworks = new THREE.Mesh(new THREE.BoxGeometry(1.1 * scale, 0.42 * scale, 0.8 * scale), mat(0x394047));
    tryworks.position.set(-0.55 * scale, 1.72 * scale, -0.1 * scale);
    group.add(tryworks);
    const boat = hullMesh(1.75 * scale, 0.42 * scale, 0.25 * scale, mats.plank, "dart");
    boat.position.set(1.0 * scale, 1.82 * scale, 0.35 * scale);
    boat.rotation.z = 0.12;
    group.add(boat);
    const harpoonRack = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 0.12 * scale, 1.7 * scale), mats.dark);
    harpoonRack.position.set(-1.1 * scale, 1.82 * scale, -1.1 * scale);
    harpoonRack.rotation.y = 0.35;
    group.add(harpoonRack);
  } else if (type === "ballooner") {
    addSquareSail(group, -0.62, -1.5, 0.78, 0xf2ead5, 1);
    addSail(group, 0.28, 0.45, 0.84, 0xf8efd8);
    addCabin(group, 0, 1.55, 1.75, 0.92, scale * 0.84, 0x7a5030);
    const platform = new THREE.Mesh(new THREE.BoxGeometry(3.35 * scale, 0.16 * scale, 2.55 * scale), mats.plank);
    platform.position.set(0, 1.74 * scale, hullSize[0] * 0.36 * scale);
    platform.castShadow = true;
    platform.receiveShadow = true;
    group.add(platform);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.18 * scale, 0.045 * scale, 8, 28), mat(0xf3d178));
    ring.position.set(0, 1.86 * scale, hullSize[0] * 0.36 * scale);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08 * scale, 0.48 * scale, 2.65 * scale), mats.wood);
      rail.position.set(side * 1.72 * scale, 2.02 * scale, hullSize[0] * 0.36 * scale);
      group.add(rail);
    }
  } else if (type === "carrack") {
    addSquareSail(group, -0.55, -1.6, 0.95, 0xf6ead0, 2);
    addSquareSail(group, 0.55, 0.25, 1.04, 0xf8e7bb, 2);
    addSail(group, 0, 2.0, 0.86, 0xf6ead0);
  } else if (type === "manowar" || type === "fourthrate" || type === "firstrate") {
    const sailBoost = type === "firstrate" ? 1.08 : type === "fourthrate" ? 0.96 : 1;
    addSquareSail(group, -0.9, -2.1, 1.0 * sailBoost, 0xf6ead0, type === "fourthrate" ? 2 : 3);
    addSquareSail(group, 0, -0.1, 1.08 * sailBoost, 0xf8e7bb, 3);
    addSquareSail(group, 0.9, 2.0, 0.95 * sailBoost, 0xf6ead0, type === "firstrate" ? 3 : 2);
  } else if (type === "treasure") {
    addSquareSail(group, -0.85, -1.8, 1.05, 0xf5df9b, 3);
    addSquareSail(group, 0.25, 0.1, 1.18, 0xf8e8aa, 3);
    addSquareSail(group, 0.9, 2.15, 0.95, 0xf1d98d, 2);
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
  const hasBuiltInGuns = [
    "bombketch", "brigantine", "barque", "barquentine", "corvette", "frigate", "fourthrate",
    "galleon", "ironclad", "manowar", "merchantman", "eastindiaman", "razee", "storm",
    "treasure", "firstrate", "snow",
  ].includes(type);
  if (!hasBuiltInGuns) {
    const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * scale, 0.2 * scale, 1.5 * scale, 8), mats.dark);
    cannon.rotation.z = Math.PI / 2;
    cannon.position.set(0, 1.58 * scale, -1.65 * scale);
    group.add(cannon);
  }
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
  group.scale.setScalar(CHARACTER_SCALE);
  group.visible = false;
  scene.add(group);
  return group;
}

function makeProjectile(owner, pos, dir, damage, range, options = {}) {
  const ammo = CANNONBALL_TYPES[options.ammoType] || CANNONBALL_TYPES.basic;
  const target = options.target
    ? options.target.clone()
    : pos.clone().add(dir.clone().normalize().multiplyScalar(range));
  target.y = ammo.airburst ? 24 : 0;
  const start = pos.clone();
  start.y = 1.15;
  const distance = Math.max(1, ammo.airburst ? start.distanceTo(target) : dist2(start, target));
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(ammo.radius || 0.35, 10, 8),
    new THREE.MeshStandardMaterial({ color: ammo.color || 0x2f3342, roughness: 0.84, metalness: 0.04 })
  );
  mesh.position.copy(start);
  mesh.castShadow = true;
  scene.add(mesh);
  const trail = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([start.clone(), start.clone()]),
    new THREE.LineBasicMaterial({ color: ammo.trail || 0xd9fbff, transparent: true, opacity: 0.62 })
  );
  scene.add(trail);
  projectiles.push({
    owner,
    mesh,
    trail,
    trailPoints: [start.clone()],
    start,
    target,
    dir: dir.clone().normalize(),
    speed: CANNONBALL_SPEED,
    traveled: 0,
    distance,
    damage,
    targetKind: options.targetKind || "any",
    ammoType: ammo.id,
    airburst: Boolean(ammo.airburst),
    fire: ammo.fire ? { ...ammo.fire } : null,
    arcHeight: ammo.airburst ? 0 : clamp(distance * 0.16, 3.2, 10.5),
    createdWallAt: Date.now(),
    maxWallAge: Math.max(2200, (distance / CANNONBALL_SPEED + 1.2) * 1000),
  });
}

function removeProjectile(shot, impact = "none") {
  if (!shot) return;
  if (impact === "hit") {
    if (shot.ammoType === "hotshot") makeFireImpactEffect(shot.mesh.position.clone(), shot.dir);
    else makeSplinterEffect(shot.mesh.position.clone(), shot.dir);
  }
  if (impact === "splash") makeSplashEffect(shot.target);
  scene.remove(shot.mesh, shot.trail);
  shot.mesh.geometry.dispose();
  shot.mesh.material.dispose();
  shot.trail.geometry.dispose();
  shot.trail.material.dispose();
  const index = projectiles.indexOf(shot);
  if (index >= 0) projectiles.splice(index, 1);
}

function addImpactEffect(group, life = 0.7) {
  scene.add(group);
  impactEffects.push({ group, life, age: 0 });
}

function makeSplashEffect(position) {
  const group = new THREE.Group();
  group.position.set(position.x, 0.08, position.z);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xd9fbff, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.78, 24), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.userData.baseScale = 1;
  group.add(ring);
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.25;
    const drop = new THREE.Mesh(
      new THREE.SphereGeometry(0.11 + Math.random() * 0.07, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0xf1fdff, transparent: true, opacity: 0.88 })
    );
    drop.position.set(Math.cos(angle) * 0.25, 0.16, Math.sin(angle) * 0.25);
    drop.userData.velocity = new THREE.Vector3(Math.cos(angle) * (2.2 + Math.random()), 3.2 + Math.random() * 1.4, Math.sin(angle) * (2.2 + Math.random()));
    group.add(drop);
  }
  addImpactEffect(group, 0.68);
}

function addWaveHazard(position, options = {}) {
  waveHazards.push({
    position: position.clone().setY(0),
    born: clock.elapsedTime + (options.delay || 0),
    life: options.life || 1.6,
    radiusStart: options.radiusStart || 5,
    radiusEnd: options.radiusEnd || 24,
    thickness: options.thickness || 3,
    dps: options.dps || 10,
    force: options.force || 18,
    damageShips: options.damageShips !== false,
  });
}

function updateWaveHazards(dt) {
  waveHazards.slice().forEach((hazard) => {
    const age = clock.elapsedTime - hazard.born;
    if (age < 0) return;
    const t = clamp(age / hazard.life, 0, 1);
    const radius = hazard.radiusStart + (hazard.radiusEnd - hazard.radiusStart) * t;
    const applyTo = (target, position, velocity, type) => {
      const d = dist2(position, hazard.position);
      if (Math.abs(d - radius) > hazard.thickness + shipHitRadius(type) * 0.35) return;
      const away = position.clone().sub(hazard.position);
      away.y = 0;
      if (away.lengthSq() < 0.001) away.set(1, 0, 0);
      away.normalize();
      if (hazard.damageShips) damageTarget(target, hazard.dps * dt);
      if (velocity) velocity.add(away.multiplyScalar(hazard.force * dt));
    };
    if (state.mode === "ship") applyTo(state, playerShip.position, state.velocity, state.shipType);
    bots.forEach((bot) => applyTo(bot, bot.group.position, bot.velocity, bot.shipType));
    if (age > hazard.life) waveHazards.splice(waveHazards.indexOf(hazard), 1);
  });
}

function makeSplinterEffect(position, dir) {
  const group = new THREE.Group();
  group.position.copy(position);
  const forward = dir.clone().normalize();
  const side = new THREE.Vector3(forward.z, 0, -forward.x);
  for (let i = 0; i < 13; i++) {
    const shard = new THREE.Mesh(
      new THREE.BoxGeometry(0.08 + Math.random() * 0.08, 0.08 + Math.random() * 0.08, 0.55 + Math.random() * 0.55),
      new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xd6a45d : 0x8b5a32, transparent: true, opacity: 0.95 })
    );
    shard.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    const spread = forward.clone().multiplyScalar(1.2 + Math.random() * 2.0)
      .add(side.clone().multiplyScalar((Math.random() - 0.5) * 4.2))
      .add(new THREE.Vector3(0, 1.1 + Math.random() * 2.4, 0));
    shard.userData.velocity = spread;
    shard.userData.spin = new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8);
    group.add(shard);
  }
  const puff = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xf2dfb7, transparent: true, opacity: 0.5 })
  );
  puff.userData.puff = true;
  group.add(puff);
  addImpactEffect(group, 0.78);
}

function makeFireImpactEffect(position, dir) {
  const group = new THREE.Group();
  group.position.copy(position);
  const forward = dir.clone().normalize();
  const side = new THREE.Vector3(forward.z, 0, -forward.x);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.38, 0.92, 28),
    new THREE.MeshBasicMaterial({ color: 0xff3d1f, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  group.add(ring);
  for (let i = 0; i < 18; i++) {
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.08 + Math.random() * 0.08, 7, 5),
      new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xfff0a6 : i % 2 === 0 ? 0xff8b28 : 0xd61f15,
        transparent: true,
        opacity: 0.95,
      })
    );
    const spread = forward.clone().multiplyScalar(0.8 + Math.random() * 1.6)
      .add(side.clone().multiplyScalar((Math.random() - 0.5) * 3.4))
      .add(new THREE.Vector3(0, 1.3 + Math.random() * 2.1, 0));
    spark.userData.velocity = spread;
    spark.userData.spin = new THREE.Vector3(Math.random() * 7, Math.random() * 7, Math.random() * 7);
    group.add(spark);
  }
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xff4b1f, transparent: true, opacity: 0.58 })
  );
  flash.userData.puff = true;
  group.add(flash);
  addImpactEffect(group, 0.72);
}

function makeLeviathanSkullGeometry() {
  const sections = [
    { z: -2.6, w: 2.75, top: 3.45, mid: 2.55, bottom: 1.28 },
    { z: -4.5, w: 3.35, top: 4.0, mid: 2.7, bottom: 1.05 },
    { z: -6.5, w: 2.72, top: 3.72, mid: 2.42, bottom: 0.9 },
    { z: -8.7, w: 1.68, top: 3.1, mid: 2.04, bottom: 0.78 },
    { z: -10.9, w: 0.72, top: 2.48, mid: 1.68, bottom: 0.68 },
  ];
  const vertices = [];
  const indices = [];
  sections.forEach((section) => {
    const { z, w, top, mid, bottom } = section;
    vertices.push(
      0, top, z,
      w * 0.56, top - 0.34, z,
      w, mid, z,
      w * 0.62, bottom + 0.2, z,
      0, bottom, z,
      -w * 0.62, bottom + 0.2, z,
      -w, mid, z,
      -w * 0.56, top - 0.34, z,
    );
  });
  const ringSize = 8;
  for (let i = 0; i < sections.length - 1; i++) {
    const ring = i * ringSize;
    const nextRing = (i + 1) * ringSize;
    for (let j = 0; j < ringSize; j++) {
      const next = (j + 1) % ringSize;
      indices.push(ring + j, nextRing + j, ring + next);
      indices.push(ring + next, nextRing + j, nextRing + next);
    }
  }
  const backCenter = vertices.length / 3;
  vertices.push(0, 2.45, sections[0].z);
  for (let j = 0; j < ringSize; j++) indices.push(backCenter, j, (j + 1) % ringSize);
  const frontCenter = vertices.length / 3;
  const frontRing = (sections.length - 1) * ringSize;
  const lastSection = sections[sections.length - 1];
  vertices.push(0, lastSection.mid, lastSection.z);
  for (let j = 0; j < ringSize; j++) indices.push(frontCenter, frontRing + ((j + 1) % ringSize), frontRing + j);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeLeviathanJawGeometry(upper = true) {
  const sections = [
    { z: 0.9, w: 1.86, h: upper ? 0.36 : 0.3 },
    { z: -1.35, w: 1.52, h: upper ? 0.3 : 0.26 },
    { z: -3.75, w: 0.88, h: upper ? 0.24 : 0.2 },
    { z: -5.05, w: 0.3, h: upper ? 0.16 : 0.14 },
  ];
  const vertices = [];
  const indices = [];
  sections.forEach(({ z, w, h }) => {
    vertices.push(
      0, h, z,
      w, h * 0.28, z,
      w * 0.82, -h, z,
      0, -h * 1.12, z,
      -w * 0.82, -h, z,
      -w, h * 0.28, z,
    );
  });
  const ringSize = 6;
  for (let i = 0; i < sections.length - 1; i++) {
    const ring = i * ringSize;
    const nextRing = (i + 1) * ringSize;
    for (let j = 0; j < ringSize; j++) {
      const next = (j + 1) % ringSize;
      indices.push(ring + j, nextRing + j, ring + next);
      indices.push(ring + next, nextRing + j, nextRing + next);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeLeviathanMesh() {
  const group = new THREE.Group();
  const hide = mat(0x6d4d4a, 0.92);
  const darkHide = mat(0x3e2e31, 0.96);
  const bellyMat = mat(0x8a6860, 0.92);
  const reptileHide = new THREE.MeshStandardMaterial({ color: 0x6d4d4a, roughness: 0.96, metalness: 0.03, flatShading: true });
  const reptileDark = new THREE.MeshStandardMaterial({ color: 0x3e2e31, roughness: 0.98, metalness: 0.02, flatShading: true });
  const toothMat = mat(0xf0e2c6, 0.76);
  const scarMat = new THREE.MeshStandardMaterial({ color: 0xb9372c, emissive: 0x5a0d08, emissiveIntensity: 0.45, roughness: 0.7, metalness: 0.02 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffa126, emissive: 0xff6b00, emissiveIntensity: 1.85, roughness: 0.45, metalness: 0 });
  const bodyPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0, -4.1, 7.1),
    new THREE.Vector3(-1.05, -4.75, 17.5),
    new THREE.Vector3(1.45, -5.8, 29.8),
    new THREE.Vector3(-1.15, -7.05, 43.2),
    new THREE.Vector3(0.35, -8.7, 61.5),
  ], false, "catmullrom", 0.38);
  const body = new THREE.Mesh(makeTaperedTubeGeometry(bodyPath, 3.15, 0.78, {
    segments: 58,
    radialSegments: 18,
    oval: 0.76,
  }), hide);
  body.castShadow = true;
  group.add(body);
  const backRidgePath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0, -1.2, 7.7),
    new THREE.Vector3(-1.18, -1.72, 18.6),
    new THREE.Vector3(1.42, -2.55, 31.2),
    new THREE.Vector3(-1.0, -3.72, 45.0),
    new THREE.Vector3(0.2, -5.05, 58.0),
  ], false, "catmullrom", 0.34);
  const backRidge = new THREE.Mesh(makeTaperedTubeGeometry(backRidgePath, 1.55, 0.28, {
    segments: 52,
    radialSegments: 10,
    oval: 0.42,
  }), reptileDark);
  backRidge.castShadow = true;
  group.add(backRidge);
  const bellyPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0, -5.15, 7.0),
    new THREE.Vector3(-0.9, -5.9, 17.4),
    new THREE.Vector3(1.16, -6.95, 29.4),
    new THREE.Vector3(-0.86, -8.1, 42.8),
    new THREE.Vector3(0.25, -9.55, 58.0),
  ], false, "catmullrom", 0.38);
  const bodyBelly = new THREE.Mesh(makeTaperedTubeGeometry(bellyPath, 1.1, 0.22, {
    segments: 48,
    radialSegments: 10,
    oval: 0.36,
  }), bellyMat);
  bodyBelly.castShadow = true;
  group.add(bodyBelly);
  const neckPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0, -5.0, 7.8),
    new THREE.Vector3(0.7, -2.9, 4.2),
    new THREE.Vector3(-0.55, -0.4, 0.2),
    new THREE.Vector3(0.15, 1.65, -3.15),
  ]);
  const neck = new THREE.Mesh(new THREE.TubeGeometry(neckPath, 42, 2.15, 18, false), hide);
  neck.scale.set(0.78, 1.0, 1.08);
  neck.castShadow = true;
  group.add(neck);
  const throat = new THREE.Mesh(new THREE.TubeGeometry(neckPath, 42, 1.04, 12, false), bellyMat);
  throat.position.y = -0.58;
  throat.position.z = -0.32;
  throat.scale.set(0.35, 0.34, 0.95);
  group.add(throat);

  const head = new THREE.Mesh(makeLeviathanSkullGeometry(), reptileHide);
  head.castShadow = true;
  group.add(head);

  const brow = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.42, 1.15), reptileDark);
  brow.position.set(0, 3.54, -7.04);
  brow.rotation.x = -0.12;
  brow.castShadow = true;
  group.add(brow);

  const snoutRidge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 5.4), reptileDark);
  snoutRidge.position.set(0, 3.0, -8.15);
  snoutRidge.rotation.x = -0.1;
  snoutRidge.castShadow = true;
  group.add(snoutRidge);

  const upperJaw = new THREE.Mesh(makeLeviathanJawGeometry(true), reptileDark);
  upperJaw.position.set(0, 1.72, -6.65);
  upperJaw.rotation.x = 0.04;
  upperJaw.scale.set(1.18, 1.0, 1.0);
  upperJaw.userData.leviathanUpperJaw = true;
  upperJaw.userData.baseRotationX = upperJaw.rotation.x;
  upperJaw.castShadow = true;
  group.add(upperJaw);
  const lowerJaw = new THREE.Mesh(makeLeviathanJawGeometry(false), bellyMat);
  lowerJaw.position.set(0, 0.82, -6.4);
  lowerJaw.rotation.x = -0.16;
  lowerJaw.scale.set(1.08, 0.95, 0.96);
  lowerJaw.userData.leviathanLowerJaw = true;
  lowerJaw.userData.baseRotationX = lowerJaw.rotation.x;
  lowerJaw.castShadow = true;
  group.add(lowerJaw);

  for (let side of [-1, 1]) {
    const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.82, 12, 7), darkHide);
    eyeSocket.scale.set(1.72, 0.42, 0.32);
    eyeSocket.position.set(side * 2.18, 3.62, -7.82);
    eyeSocket.rotation.y = side * 0.36;
    eyeSocket.rotation.z = side * -0.2;
    eyeSocket.castShadow = true;
    group.add(eyeSocket);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 7), eyeMat);
    eye.scale.set(1.35, 0.34, 0.18);
    eye.position.set(side * 2.24, 3.6, -8.1);
    eye.rotation.y = side * 0.34;
    eye.rotation.z = side * -0.1;
    group.add(eye);

    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.38, 2.65, 7), mats.rock);
    horn.position.set(side * 1.54, 4.62, -5.52);
    horn.rotation.x = -0.72;
    horn.rotation.z = side * 0.38;
    horn.castShadow = true;
    group.add(horn);
    const cheekFin = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3.9, 4), darkHide);
    cheekFin.position.set(side * 3.12, 1.65, -5.72);
    cheekFin.rotation.z = side * -1.1;
    cheekFin.rotation.y = side * 0.54;
    cheekFin.castShadow = true;
    group.add(cheekFin);

    const nostril = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.48), darkHide);
    nostril.position.set(side * 0.54, 2.32, -10.42);
    nostril.rotation.y = side * 0.18;
    nostril.rotation.x = -0.18;
    group.add(nostril);

    for (let i = 0; i < 7; i++) {
      const topTooth = new THREE.Mesh(new THREE.ConeGeometry(0.12 + i * 0.014, 0.78 + i * 0.07, 6), toothMat);
      topTooth.position.set(side * (0.18 + i * 0.34), 1.42, -7.2 - i * 0.36);
      topTooth.rotation.x = Math.PI;
      topTooth.userData.leviathanUpperJaw = true;
      topTooth.userData.baseRotationX = topTooth.rotation.x;
      group.add(topTooth);
      const bottomTooth = new THREE.Mesh(new THREE.ConeGeometry(0.11 + i * 0.012, 0.62 + i * 0.05, 6), toothMat);
      bottomTooth.position.set(side * (0.2 + i * 0.32), 1.22, -6.96 - i * 0.3);
      bottomTooth.rotation.x = 0.1;
      bottomTooth.userData.leviathanLowerJaw = true;
      bottomTooth.userData.baseRotationX = bottomTooth.rotation.x;
      group.add(bottomTooth);
    }

    for (let i = 0; i < 5; i++) {
      const gill = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.56 - i * 0.035, 0.16), scarMat);
      gill.position.set(side * 3.45, 2.25 - i * 0.32, -4.9 + i * 0.18);
      gill.rotation.y = side * 0.86;
      gill.rotation.z = side * 0.14;
      group.add(gill);
    }
  }

  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.22 + Math.sin(t * Math.PI) * 0.3, 1.25 + Math.sin(t * Math.PI) * 1.25, 6), i % 3 === 0 ? mats.rock : darkHide);
    crest.position.set(0, 2.7 + t * 2.15, 3.6 - t * 11.2);
    crest.rotation.x = Math.PI - 0.1;
    crest.castShadow = true;
    group.add(crest);
  }

  for (let i = 0; i < 18; i++) {
    const t = i / 17;
    const side = i % 2 ? 1 : -1;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.62 - t * 0.25, 0.12, 0.38 + t * 0.18), reptileDark);
    plate.position.set(side * (0.55 + Math.sin(t * Math.PI) * 1.18), 3.25 + Math.sin(t * Math.PI) * 0.55, -3.6 - t * 6.25);
    plate.rotation.set(-0.22, side * 0.42, side * 0.18);
    plate.castShadow = true;
    group.add(plate);
  }

  for (let i = 0; i < 8; i++) {
    const slash = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.92 + (i % 3) * 0.24), scarMat);
    slash.position.set((i % 2 ? 1 : -1) * (0.55 + (i % 4) * 0.38), 3.2 + Math.sin(i) * 0.5, -5.4 - i * 0.38);
    slash.rotation.set(0.2, (i % 2 ? 0.6 : -0.6), (i % 2 ? 0.45 : -0.45));
    group.add(slash);
  }

  for (let i = 0; i < 22; i++) {
    const t = i / 21;
    const p = bodyPath.getPoint(t);
    const spine = new THREE.Mesh(
      new THREE.ConeGeometry(0.72 - t * 0.44, 2.85 - t * 1.45, 6),
      i % 4 === 0 ? mats.rock : darkHide
    );
    spine.position.copy(p);
    spine.position.y += 3.25 - t * 1.65;
    spine.rotation.x = Math.PI - 0.22 + Math.sin(t * Math.PI * 3) * 0.1;
    spine.rotation.z = Math.sin(t * Math.PI * 2) * 0.22;
    spine.castShadow = true;
    group.add(spine);
  }

  for (let side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const whiskerPath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * (1.0 + i * 0.25), 1.65 - i * 0.18, -8.2),
        new THREE.Vector3(side * (2.8 + i * 0.7), 1.2 - i * 0.35, -8.8 - i * 0.2),
        new THREE.Vector3(side * (4.4 + i * 0.9), 0.35 - i * 0.25, -8.25 + i * 0.22),
      ]);
      const whisker = new THREE.Mesh(new THREE.TubeGeometry(whiskerPath, 12, 0.055, 6, false), darkHide);
      whisker.castShadow = true;
      group.add(whisker);
    }
  }

  const waterMask = new THREE.Mesh(new THREE.RingGeometry(3.8, 6.8, 36), new THREE.MeshBasicMaterial({ color: 0xd9fbff, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  waterMask.rotation.x = -Math.PI / 2;
  waterMask.position.y = -2.8;
  group.add(waterMask);

  return group;
}

function setLeviathanJawOpen(group, open, crush = 0) {
  const amount = clamp(open, 0, 1);
  group.traverse((child) => {
    if (child.userData?.leviathanUpperJaw) {
      child.rotation.x = (child.userData.baseRotationX ?? child.rotation.x) - amount * 0.48 + crush * 0.1;
    }
    if (child.userData?.leviathanLowerJaw) {
      child.rotation.x = (child.userData.baseRotationX ?? child.rotation.x) + amount * 0.78 - crush * 0.16;
    }
  });
}

function makeLeviathanMouthDebris(shipType = state.shipType) {
  const group = new THREE.Group();
  const ship = getShipStats(shipType);
  const plankMat = mat(0x8b5a32);
  const darkWood = mat(0x4d2f1d);
  const sailMat = new THREE.MeshBasicMaterial({ color: ship.color || 0xd9c3a0, transparent: true, opacity: 0.86, side: THREE.DoubleSide });
  for (let i = 0; i < 9; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 1.4 + Math.random() * 1.2), i % 3 ? plankMat : darkWood);
    plank.position.set((Math.random() - 0.5) * 3.0, (Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 2.0);
    plank.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    plank.castShadow = true;
    group.add(plank);
  }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 7), darkWood);
  mast.position.set(-0.65, 0.15, -0.25);
  mast.rotation.set(0.8, 0.35, -1.05);
  mast.castShadow = true;
  group.add(mast);
  const sailGeo = new THREE.BufferGeometry();
  sailGeo.setAttribute("position", new THREE.Float32BufferAttribute([
    0, 0.85, 0,
    1.55, -0.45, 0.08,
    -0.95, -0.72, -0.05,
  ], 3));
  sailGeo.setIndex([0, 1, 2]);
  sailGeo.computeVertexNormals();
  const sail = new THREE.Mesh(sailGeo, sailMat);
  sail.position.set(0.15, 0.05, -0.55);
  sail.rotation.set(-0.35, 0.4, 0.25);
  group.add(sail);
  group.visible = false;
  return group;
}

function makeTaperedTubeGeometry(curve, baseRadius, tipRadius, options = {}) {
  const segments = options.segments || 14;
  const radialSegments = options.radialSegments || 7;
  const oval = options.oval || 0.88;
  const frames = curve.computeFrenetFrames(segments, false);
  const vertices = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = curve.getPointAt(t);
    const radius = baseRadius + (tipRadius - baseRadius) * t;
    const normal = frames.normals[i];
    const binormal = frames.binormals[i];
    for (let j = 0; j < radialSegments; j++) {
      const angle = (j / radialSegments) * Math.PI * 2;
      const radial = normal.clone().multiplyScalar(Math.cos(angle) * radius)
        .add(binormal.clone().multiplyScalar(Math.sin(angle) * radius * oval));
      vertices.push(point.x + radial.x, point.y + radial.y, point.z + radial.z);
    }
  }
  for (let i = 0; i < segments; i++) {
    const ring = i * radialSegments;
    const nextRing = (i + 1) * radialSegments;
    for (let j = 0; j < radialSegments; j++) {
      const next = (j + 1) % radialSegments;
      indices.push(ring + j, nextRing + j, ring + next);
      indices.push(ring + next, nextRing + j, nextRing + next);
    }
  }
  if (!options.openStart) {
    const frontCenter = vertices.length / 3;
    const start = curve.getPointAt(0);
    vertices.push(start.x, start.y, start.z);
    for (let j = 0; j < radialSegments; j++) {
      indices.push(frontCenter, (j + 1) % radialSegments, j);
    }
  }
  if (!options.openEnd) {
    const backCenter = vertices.length / 3;
    const end = curve.getPointAt(1);
    vertices.push(end.x, end.y, end.z);
    const backRing = segments * radialSegments;
    for (let j = 0; j < radialSegments; j++) {
      indices.push(backCenter, backRing + j, backRing + ((j + 1) % radialSegments));
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeTaperedTentacle(curve, baseRadius, tipRadius, material, options = {}) {
  const group = new THREE.Group();
  const tentacle = new THREE.Mesh(makeTaperedTubeGeometry(curve, baseRadius, tipRadius, options), material);
  tentacle.castShadow = true;
  group.add(tentacle);
  if (options.suckerMat) {
    const suckerTs = options.suckerTs || [0.32, 0.48, 0.64, 0.8];
    suckerTs.forEach((t, index) => {
      const point = curve.getPoint(t);
      const size = Math.max(0.12, baseRadius * 0.38 - index * 0.04);
      const sucker = new THREE.Mesh(new THREE.SphereGeometry(size, 7, 5), options.suckerMat);
      sucker.position.copy(point);
      sucker.position.y -= baseRadius * 0.62;
      sucker.scale.y = 0.26;
      group.add(sucker);
    });
  }
  return group;
}

function makeKrakenCoreGeometry() {
  const radialSegments = 20;
  const rings = [
    { z: -9.4, rx: 0.9, ry: 0.55, cy: 1.05 },
    { z: -8.45, rx: 3.55, ry: 1.75, cy: 1.62 },
    { z: -7.2, rx: 5.9, ry: 2.9, cy: 2.08 },
    { z: -5.65, rx: 7.45, ry: 3.85, cy: 2.45 },
    { z: -3.55, rx: 8.25, ry: 4.75, cy: 2.72 },
    { z: -1.1, rx: 8.55, ry: 5.28, cy: 2.96 },
    { z: 1.25, rx: 7.55, ry: 5.45, cy: 3.15 },
    { z: 3.35, rx: 5.65, ry: 4.92, cy: 3.42 },
    { z: 5.05, rx: 3.25, ry: 3.42, cy: 3.84 },
    { z: 6.3, rx: 0.65, ry: 0.85, cy: 4.05 },
  ];
  const upper = new THREE.Color(0x941517);
  const belly = new THREE.Color(0xc83d2e);
  const dark = new THREE.Color(0x3d080b);
  const vertices = [];
  const colors = [];
  const indices = [];

  rings.forEach((ring, i) => {
    const t = i / (rings.length - 1);
    const shoulder = Math.sin(t * Math.PI);
    for (let j = 0; j < radialSegments; j++) {
      const angle = (j / radialSegments) * Math.PI * 2;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const surfaceRipple = 1
        + Math.sin(angle * 3 + t * 5.3) * 0.028
        + Math.sin(angle * 7 - t * 4.1) * 0.014;
      const topLift = Math.max(0, s) * shoulder * 0.28;
      const bottomFlatten = s < 0 ? 0.58 : 1;
      const x = c * ring.rx * surfaceRipple;
      const y = ring.cy + s * ring.ry * bottomFlatten + topLift;
      const z = ring.z + Math.sin(angle * 2 + i * 0.45) * 0.1 * (0.35 + shoulder);
      vertices.push(x, y, z);

      const undersideBlend = clamp((-s - 0.14) / 0.86, 0, 1) * (0.92 - t * 0.18);
      const ridgeBlend = Math.max(0, s - 0.76) * 0.42 + Math.max(0, Math.abs(c) - 0.86) * 0.16;
      const color = upper.clone().lerp(belly, undersideBlend).lerp(dark, clamp(ridgeBlend, 0, 0.34));
      colors.push(color.r, color.g, color.b);
    }
  });

  for (let i = 0; i < rings.length - 1; i++) {
    const ring = i * radialSegments;
    const nextRing = (i + 1) * radialSegments;
    for (let j = 0; j < radialSegments; j++) {
      const next = (j + 1) % radialSegments;
      indices.push(ring + j, nextRing + j, ring + next);
      indices.push(ring + next, nextRing + j, nextRing + next);
    }
  }

  const frontCenter = vertices.length / 3;
  vertices.push(0, rings[0].cy, rings[0].z);
  colors.push(upper.r, upper.g, upper.b);
  for (let j = 0; j < radialSegments; j++) {
    indices.push(frontCenter, j, (j + 1) % radialSegments);
  }

  const backCenter = vertices.length / 3;
  const lastRing = rings[rings.length - 1];
  vertices.push(0, lastRing.cy, lastRing.z);
  colors.push(dark.r, dark.g, dark.b);
  const backRing = (rings.length - 1) * radialSegments;
  for (let j = 0; j < radialSegments; j++) {
    indices.push(backCenter, backRing + ((j + 1) % radialSegments), backRing + j);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeKrakenMesh() {
  const group = new THREE.Group();
  const lowMat = (color, options = {}) => new THREE.MeshStandardMaterial({
    color,
    roughness: 0.88,
    metalness: 0.02,
    flatShading: options.flatShading ?? false,
    vertexColors: options.vertexColors || false,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    side: options.side || THREE.DoubleSide,
  });
  const bodyMat = lowMat(0xffffff, { vertexColors: true });
  const skin = lowMat(0xb3201c);
  const darkSkin = lowMat(0x3d080b);
  const suckerMat = lowMat(0xf06a50);
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xfff15a,
    emissive: 0xffd400,
    emissiveIntensity: 1.65,
    roughness: 0.34,
    metalness: 0,
  });
  const pupilMat = lowMat(0x16112a);

  const core = new THREE.Mesh(makeKrakenCoreGeometry(), bodyMat);
  core.castShadow = true;
  group.add(core);

  const mantleCap = new THREE.Mesh(new THREE.SphereGeometry(6.65, 24, 12), darkSkin);
  mantleCap.scale.set(1.02, 0.34, 0.62);
  mantleCap.position.set(0, 5.05, -1.25);
  mantleCap.castShadow = true;
  group.add(mantleCap);

  for (let side of [-1, 1]) {
    const sideMantle = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 9), skin);
    sideMantle.scale.set(0.52, 0.42, 1.18);
    sideMantle.position.set(side * 5.15, 2.55, -3.35);
    sideMantle.rotation.z = side * -0.18;
    sideMantle.castShadow = true;
    group.add(sideMantle);
  }

  const faceBulge = new THREE.Mesh(new THREE.SphereGeometry(5.25, 22, 12), skin);
  faceBulge.scale.set(1.03, 0.5, 0.5);
  faceBulge.position.set(0, 2.25, -6.9);
  faceBulge.castShadow = true;
  group.add(faceBulge);

  const cheekMantle = new THREE.Mesh(new THREE.SphereGeometry(5.8, 18, 10), darkSkin);
  cheekMantle.scale.set(1.1, 0.18, 0.36);
  cheekMantle.position.set(0, 1.3, -5.7);
  cheekMantle.castShadow = true;
  group.add(cheekMantle);

  const beakUpper = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.55, 9), pupilMat);
  beakUpper.position.set(0, 1.56, -9.0);
  beakUpper.rotation.x = -Math.PI / 2;
  beakUpper.scale.set(1.35, 0.72, 0.92);
  beakUpper.castShadow = true;
  group.add(beakUpper);
  const beakLower = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.25, 9), pupilMat);
  beakLower.position.set(0, 0.86, -8.72);
  beakLower.rotation.x = Math.PI / 2;
  beakLower.scale.set(1.15, 0.62, 0.85);
  beakLower.castShadow = true;
  group.add(beakLower);

  const mouthShadow = new THREE.Mesh(new THREE.SphereGeometry(1.65, 12, 7), pupilMat);
  mouthShadow.scale.set(1.35, 0.32, 0.32);
  mouthShadow.position.set(0, 1.16, -8.78);
  group.add(mouthShadow);

  for (let side of [-1, 1]) {
    const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(1.08, 14, 8), darkSkin);
    eyeSocket.scale.set(1.6, 0.58, 0.36);
    eyeSocket.position.set(side * 2.85, 3.18, -8.48);
    eyeSocket.rotation.y = side * 0.22;
    eyeSocket.rotation.z = side * -0.08;
    eyeSocket.castShadow = true;
    group.add(eyeSocket);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 8), eyeMat);
    eye.scale.set(1.25, 0.52, 0.2);
    eye.position.set(side * 2.9, 3.2, -8.96);
    eye.rotation.y = side * 0.2;
    group.add(eye);

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.76, 14, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe64d, transparent: true, opacity: 0.38 })
    );
    glow.scale.set(1.45, 0.6, 0.24);
    glow.position.copy(eye.position);
    glow.rotation.copy(eye.rotation);
    group.add(glow);

    const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.54, 0.08), pupilMat);
    pupil.position.set(side * 2.92, 3.2, -9.08);
    pupil.rotation.y = side * 0.2;
    group.add(pupil);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.25, 0.3), darkSkin);
    brow.position.set(side * 2.76, 3.68, -8.84);
    brow.rotation.y = side * 0.2;
    brow.rotation.z = side * 0.28;
    brow.castShadow = true;
    group.add(brow);

    const cheekGroove = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 1.6), darkSkin);
    cheekGroove.position.set(side * 3.85, 2.3, -6.92);
    cheekGroove.rotation.y = side * 0.7;
    cheekGroove.rotation.z = side * -0.28;
    group.add(cheekGroove);
  }

  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.52 - Math.abs(t - 0.5) * 0.28, 2.1 - Math.abs(t - 0.5) * 0.65, 7), darkSkin);
    spike.position.set((t - 0.5) * 5.9, 6.15 + Math.sin(t * Math.PI) * 1.05, -3.6 + Math.cos(t * Math.PI) * 1.4);
    spike.rotation.x = Math.PI;
    spike.rotation.z = (t - 0.5) * -0.45;
    spike.castShadow = true;
    group.add(spike);
  }

  for (let side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const hook = new THREE.Mesh(new THREE.ConeGeometry(0.14 + i * 0.018, 0.52 + i * 0.05, 6), lowMat(0xf0d9b7));
      hook.position.set(side * (0.44 + i * 0.34), 0.86 + i * 0.08, -8.18 - i * 0.18);
      hook.rotation.x = Math.PI * 0.86;
      hook.rotation.z = side * 0.08;
      hook.castShadow = true;
      group.add(hook);
    }
  }

  const tentacleAngles = Array.from({ length: 8 }, (_, i) => -Math.PI + i * (Math.PI / 4));
  tentacleAngles.forEach((angle, i) => {
    const outward = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
    const tangent = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle));
    const root = new THREE.Vector3(outward.x * 10.2, -12.5, outward.z * 9.0 - 0.4);
    const surface = new THREE.Vector3(outward.x * 10.7, -0.62, outward.z * 9.7 - 0.4);
    const lift = 13.5 + (i % 2) * 3.6 + Math.abs(outward.z) * 1.8;
    const curl = (i % 2 ? 1 : -1) * (1.25 + (i % 3) * 0.32);
    const curve = new THREE.CatmullRomCurve3([
      root,
      surface.clone().add(new THREE.Vector3(0, -1.8, 0)),
      surface.clone().add(outward.clone().multiplyScalar(1.7)).add(tangent.clone().multiplyScalar(curl * 0.16)).add(new THREE.Vector3(0, lift * 0.34, 0)),
      surface.clone().add(outward.clone().multiplyScalar(3.1)).add(tangent.clone().multiplyScalar(curl * 0.34)).add(new THREE.Vector3(0, lift * 0.82, 0)),
      surface.clone().add(outward.clone().multiplyScalar(3.75)).add(tangent.clone().multiplyScalar(curl * 0.18)).add(new THREE.Vector3(0, lift * 1.15, 0)),
    ], false, "catmullrom", 0.34);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.05, 2.05, 22), new THREE.MeshBasicMaterial({ color: 0xd9fbff, transparent: true, opacity: 0.48, side: THREE.DoubleSide }));
    ring.position.copy(surface);
    ring.position.y = -0.38;
    ring.rotation.x = -Math.PI / 2;
    ring.userData.krakenWaterRing = true;
    ring.userData.phase = i * 0.7;
    group.add(ring);

    const tentacle = makeTaperedTentacle(curve, i < 4 ? 1.12 : 0.92, i < 4 ? 0.34 : 0.24, skin, {
      segments: 18,
      radialSegments: 9,
      suckerMat,
    });
    tentacle.userData.tentacle = true;
    tentacle.userData.phase = i * 0.74;
    tentacle.userData.anchor = surface.clone();
    tentacle.userData.homeY = 0;
    group.add(tentacle);

    for (let j = 0; j < 4; j++) {
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.62 - j * 0.045, 0.025, 5, 12), darkSkin);
      const p = curve.getPoint(0.34 + j * 0.12);
      stripe.position.copy(p);
      stripe.rotation.x = Math.PI / 2;
      stripe.scale.set(1.25, 0.55, 1);
      tentacle.add(stripe);
    }
  });

  for (let i = 0; i < 15; i++) {
    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.38 - (i % 3) * 0.045, 7, 5), i % 4 ? darkSkin : suckerMat);
    spot.position.set(Math.sin(i * 2.1) * (2.2 + (i % 3) * 1.15), 4.4 + Math.sin(i) * 1.55, 0.9 + Math.cos(i * 1.3) * 2.45);
    spot.scale.y = 0.32;
    group.add(spot);
  }

  const waterShadow = new THREE.Mesh(new THREE.RingGeometry(8.2, 14.8, 42), new THREE.MeshBasicMaterial({ color: 0x0c4655, transparent: true, opacity: 0.28, side: THREE.DoubleSide }));
  waterShadow.rotation.x = -Math.PI / 2;
  waterShadow.position.y = -0.52;
  group.add(waterShadow);

  group.userData.radius = 25;
  return group;
}

function syncKraken(data) {
  if (!data) return;
  if (!krakenBoss) {
    krakenBoss = {
      group: makeKrakenMesh(),
      hp: Number(data.hp) || 10000,
      maxHp: Number(data.maxHp) || 10000,
      alive: data.alive !== false,
      radius: Number(data.radius) || 25,
    };
    scene.add(krakenBoss.group);
  }
  krakenBoss.hp = Number(data.hp) || 0;
  krakenBoss.maxHp = Number(data.maxHp) || 10000;
  krakenBoss.alive = data.alive !== false;
  krakenBoss.radius = Number(data.radius) || 25;
  krakenBoss.defeatedAt = Number(data.defeatedAt) || 0;
  const lastPosition = krakenBoss.group.position.clone();
  krakenBoss.group.position.x = Number(data.x) || 0;
  krakenBoss.group.position.z = Number(data.z) || 0;
  const moved = krakenBoss.group.position.clone().sub(lastPosition);
  moved.y = 0;
  krakenBoss.group.rotation.y = moved.lengthSq() > 0.0025 ? Math.atan2(moved.x, moved.z) : Number(data.rotation) || 0;
  if (krakenBoss.alive) {
    krakenBoss.group.visible = true;
    krakenBoss.group.position.y = Math.sin(clock.elapsedTime * 0.6) * 0.18;
  } else {
    const sinkAge = krakenBoss.defeatedAt ? Math.max(0, (Date.now() - krakenBoss.defeatedAt) / 1000) : 0;
    krakenBoss.group.position.y = -Math.min(9, sinkAge * 0.75);
    krakenBoss.group.visible = sinkAge < 18;
  }
}

function projectileHitsKraken(shot) {
  if (!krakenBoss?.alive || !krakenBoss.group.visible) return false;
  const localPoint = krakenBoss.group.worldToLocal(shot.mesh.position.clone());
  const headCenter = new THREE.Vector3(0, 2.75, -6.55);
  const dx = (localPoint.x - headCenter.x) / 5.8;
  const dy = (localPoint.y - headCenter.y) / 4.5;
  const dz = (localPoint.z - headCenter.z) / 4.0;
  return dx * dx + dy * dy + dz * dz <= 1 && shot.mesh.position.y < 12;
}

function submergeKrakenTentacleNear(worldPoint) {
  if (!krakenBoss?.group) return;
  let closest = null;
  let closestDistance = Infinity;
  krakenBoss.group.children.forEach((child) => {
    if (!child.userData?.tentacle || !child.userData.anchor) return;
    const anchor = krakenBoss.group.localToWorld(child.userData.anchor.clone());
    const distance = dist2(anchor, worldPoint);
    if (distance < closestDistance) {
      closest = child;
      closestDistance = distance;
    }
  });
  if (!closest) return;
  closest.userData.submergeStart = clock.elapsedTime;
  closest.userData.submergeUntil = clock.elapsedTime + KRAKEN_ATTACK_LIFE * 0.82;
  closest.userData.submergeDepth = 72;
}

function krakenAttackCurve(data, t) {
  const ease = (value) => value * value * (3 - 2 * value);
  const rise = ease(clamp(t / 0.36, 0, 1));
  const curl = ease(clamp((t - 0.18) / 0.42, 0, 1));
  const slam = ease(clamp((t - (KRAKEN_SLAM_T - 0.18)) / 0.18, 0, 1));
  const retreat = ease(clamp((t - (KRAKEN_SLAM_T + 0.08)) / 0.16, 0, 1));
  const target = data.target;
  const dir = data.dir;
  const side = data.side;
  const surface = data.surface;
  const root = data.root;

  const tipHidden = surface.clone().add(dir.clone().multiplyScalar(1.2));
  tipHidden.y = -30;
  const tipRaised = target.clone().add(dir.clone().multiplyScalar(-5.5)).add(side.clone().multiplyScalar(2.2));
  tipRaised.y = 22;
  const tipHover = target.clone().add(dir.clone().multiplyScalar(-2)).add(side.clone().multiplyScalar(0.7));
  tipHover.y = 18;
  const tipStrike = target.clone().add(new THREE.Vector3(0, 0.9, 0));
  const tipGone = surface.clone().add(dir.clone().multiplyScalar(2.4));
  tipGone.y = -28;
  const tip = tipHidden.clone()
    .lerp(tipRaised, rise)
    .lerp(tipHover, curl * 0.55)
    .lerp(tipStrike, slam)
    .lerp(tipGone, retreat);

  const base = surface.clone();
  base.y = -9 + rise * 9 - retreat * 9;
  const lower = surface.clone().add(dir.clone().multiplyScalar(1.8));
  lower.y = -16 + rise * 19 - retreat * 11;
  const upper = target.clone().add(dir.clone().multiplyScalar(-7.5)).add(side.clone().multiplyScalar(2.8));
  upper.y = -5 + rise * 23 + curl * 4 - slam * 8 - retreat * 8;
  const bend = target.clone().add(dir.clone().multiplyScalar(-3.8)).add(side.clone().multiplyScalar(1.2));
  bend.y = 5 + rise * 13 + curl * 4 - slam * 14 - retreat * 7;

  return new THREE.CatmullRomCurve3([
    root.clone(),
    base,
    lower,
    upper,
    bend,
    tip,
  ], false, "catmullrom", 0.45);
}

function makeKrakenAttackEffect(attack) {
  const group = new THREE.Group();
  const target = new THREE.Vector3(Number(attack.x) || 0, 0, Number(attack.z) || 0);
  const source = new THREE.Vector3(Number(attack.sourceX) || target.x + 18, 0, Number(attack.sourceZ) || target.z + 18);
  const dir = target.clone().sub(source);
  if (dir.lengthSq() < 0.01) dir.set(1, 0, 0);
  dir.normalize();
  const side = new THREE.Vector3(dir.z, 0, -dir.x);
  group.userData.krakenAttack = true;
  const attackMat = new THREE.MeshStandardMaterial({
    color: 0xb82724,
    roughness: 0.86,
    metalness: 0.02,
    flatShading: false,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    side: THREE.DoubleSide,
  });

  const attackData = {
    target,
    source,
    dir,
    side,
    surface: target.clone().add(dir.clone().multiplyScalar(-6.5)).add(side.clone().multiplyScalar(2.2)),
    root: target.clone().add(dir.clone().multiplyScalar(-6.8)).add(side.clone().multiplyScalar(2.2)).add(new THREE.Vector3(0, -44, 0)),
  };
  attackData.surface.y = 0;
  const tubeOptions = {
    segments: 44,
    radialSegments: 13,
    openStart: true,
    openEnd: false,
    oval: 0.82,
  };
  const tentacle = new THREE.Mesh(makeTaperedTubeGeometry(krakenAttackCurve(attackData, 0), 2.2, 0.28, tubeOptions), attackMat.clone());
  tentacle.castShadow = true;
  tentacle.userData.krakenAttackTentacle = true;
  tentacle.userData.attackData = attackData;
  tentacle.userData.baseRadius = 2.2;
  tentacle.userData.tipRadius = 0.28;
  tentacle.userData.tubeOptions = tubeOptions;
  group.add(tentacle);

  for (let i = 0; i < 11; i++) {
    const sucker = new THREE.Mesh(new THREE.SphereGeometry(0.28 - i * 0.015, 8, 5), new THREE.MeshStandardMaterial({ color: 0xd76b55, roughness: 0.86, metalness: 0.02 }));
    sucker.scale.y = 0.28;
    sucker.userData.krakenAttackSucker = true;
    sucker.userData.curveT = 0.2 + i * 0.06;
    group.add(sucker);
  }

  const splash = new THREE.Mesh(new THREE.RingGeometry(5.2, 14.0, 54), new THREE.MeshBasicMaterial({ color: 0xe9fdff, transparent: true, opacity: 0.88, side: THREE.DoubleSide, depthWrite: false }));
  splash.position.copy(target);
  splash.position.y = 0.12;
  splash.rotation.x = -Math.PI / 2;
  splash.userData.baseScale = 0.9;
  splash.visible = false;
  splash.userData.krakenSplash = true;
  group.add(splash);
  for (let i = 0; i < 42; i++) {
    const angle = (i / 42) * Math.PI * 2 + Math.random() * 0.16;
    const radius = 2.5 + Math.random() * 5.5;
    const spray = new THREE.Mesh(
      new THREE.SphereGeometry(0.24 + Math.random() * 0.22, 6, 5),
      new THREE.MeshBasicMaterial({ color: i % 4 ? 0xf1fdff : 0x9eddea, transparent: true, opacity: 0 })
    );
    spray.position.set(target.x + Math.cos(angle) * radius, 0.24, target.z + Math.sin(angle) * radius);
    spray.userData.krakenSlamSpray = true;
    spray.userData.start = spray.position.clone();
    spray.userData.velocity = new THREE.Vector3(Math.cos(angle) * (5.5 + Math.random() * 6), 9 + Math.random() * 12, Math.sin(angle) * (5.5 + Math.random() * 6));
    group.add(spray);
  }
  for (let i = 0; i < 22; i++) {
    const angle = (i / 22) * Math.PI * 2;
    const radius = 7.2 + Math.random() * 3.2;
    const height = 8 + Math.random() * 10;
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(1.1 + Math.random() * 0.7, height, 0.34),
      new THREE.MeshBasicMaterial({ color: i % 3 ? 0xafeef8 : 0xffffff, transparent: true, opacity: 0, depthWrite: false })
    );
    wall.position.set(target.x + Math.cos(angle) * radius, height * 0.45, target.z + Math.sin(angle) * radius);
    wall.rotation.y = -angle;
    wall.userData.krakenWaterWall = true;
    wall.userData.baseY = wall.position.y;
    wall.userData.height = height;
    wall.userData.radius = radius;
    wall.userData.angle = angle;
    group.add(wall);
  }
  const riseSplash = new THREE.Mesh(new THREE.RingGeometry(4.8, 9.2, 42), new THREE.MeshBasicMaterial({ color: 0xd9fbff, transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false }));
  riseSplash.position.copy(attackData.surface);
  riseSplash.position.y = 0.1;
  riseSplash.rotation.x = -Math.PI / 2;
  riseSplash.userData.krakenRiseSplash = true;
  group.add(riseSplash);
  addImpactEffect(group, KRAKEN_ATTACK_LIFE);
  addWaveHazard(target, { dps: 10, force: 22, radiusStart: 5.2, radiusEnd: 25, thickness: 3.4, life: 1.55, delay: KRAKEN_SLAM_DELAY_MS / 1000 });
}

function krakenAttackWallContains(position, attack, padding = 0) {
  const target = new THREE.Vector3(Number(attack.x) || 0, 0, Number(attack.z) || 0);
  const source = new THREE.Vector3(Number(attack.sourceX) || target.x + 18, 0, Number(attack.sourceZ) || target.z + 18);
  const dir = target.clone().sub(source);
  if (dir.lengthSq() < 0.01) dir.set(1, 0, 0);
  dir.normalize();
  const side = new THREE.Vector3(dir.z, 0, -dir.x);
  const offset = position.clone().sub(target);
  offset.y = 0;
  const along = Math.abs(offset.dot(dir));
  const across = Math.abs(offset.dot(side));
  return along <= 7 + padding && across <= 17 + padding;
}

function krakenAttackSlamContains(position, attack, padding = 0) {
  const target = new THREE.Vector3(Number(attack.x) || 0, 0, Number(attack.z) || 0);
  return dist2(position, target) <= 6.5 + padding;
}

function krakenAttackEvadePoint(position, attack, shipType = "skiff") {
  if (!attack) return null;
  const padding = shipHitRadius(shipType) + 5;
  if (!krakenAttackSlamContains(position, attack, padding) && !krakenAttackWallContains(position, attack, padding * 0.45)) return null;
  const target = new THREE.Vector3(Number(attack.x) || 0, 0, Number(attack.z) || 0);
  const source = new THREE.Vector3(Number(attack.sourceX) || target.x + 18, 0, Number(attack.sourceZ) || target.z + 18);
  const dir = target.clone().sub(source);
  if (dir.lengthSq() < 0.01) dir.set(1, 0, 0);
  dir.normalize();
  const side = new THREE.Vector3(dir.z, 0, -dir.x);
  const offset = position.clone().sub(target);
  offset.y = 0;
  const sideSign = offset.dot(side) >= 0 ? 1 : -1;
  const away = position.clone().sub(target);
  away.y = 0;
  if (away.lengthSq() < 0.01) away.copy(side).multiplyScalar(sideSign);
  away.normalize().multiplyScalar(70);
  const dodge = side.multiplyScalar(sideSign * 105).add(away);
  const point = position.clone().add(dodge);
  point.x = clamp(point.x, -MAP_LIMIT * 0.94, MAP_LIMIT * 0.94);
  point.z = clamp(point.z, -MAP_LIMIT * 0.94, MAP_LIMIT * 0.94);
  point.y = 0;
  return point;
}

function activeKrakenEvadePoint(position, shipType = "skiff") {
  const now = clock.elapsedTime;
  for (let i = activeKrakenAttacks.length - 1; i >= 0; i--) {
    if ((activeKrakenAttacks[i].until || 0) < now) {
      activeKrakenAttacks.splice(i, 1);
      continue;
    }
    const evade = krakenAttackEvadePoint(position, activeKrakenAttacks[i], shipType);
    if (evade) return evade;
  }
  return null;
}

function applyKrakenAttack(attack) {
  if (!attack) return;
  const slamPoint = new THREE.Vector3(Number(attack.x) || 0, 0, Number(attack.z) || 0);
  activeKrakenAttacks.push({ ...attack, until: clock.elapsedTime + KRAKEN_ATTACK_LIFE });
  submergeKrakenTentacleNear(slamPoint);
  makeKrakenAttackEffect(attack);
  setTimeout(() => {
    if (state.mode === "ship" && (krakenAttackSlamContains(playerShip.position, attack, shipHitRadius(state.shipType)) || krakenAttackWallContains(playerShip.position, attack, shipHitRadius(state.shipType) * 0.4))) {
      damageTarget(state, maxHp() * 4);
    }
    if (!multiplayer.serverWorld) {
      bots.forEach((bot) => {
        if (krakenAttackSlamContains(bot.group.position, attack, shipHitRadius(bot.shipType)) || krakenAttackWallContains(bot.group.position, attack, shipHitRadius(bot.shipType) * 0.4)) {
          damageTarget(bot, getShipStats(bot.shipType).hp * 4);
        }
      });
    }
  }, KRAKEN_SLAM_DELAY_MS);
}

function makeLeviathanAttackEffect(position, outward, attackId) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.position.y = 0.08;
  const side = new THREE.Vector3(outward.z, 0, -outward.x).normalize();
  const foamMat = new THREE.MeshBasicMaterial({ color: 0xd9fbff, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(4.4, 10.6, 42), foamMat);
  ring.rotation.x = -Math.PI / 2;
  ring.userData.baseScale = 1.0;
  group.add(ring);
  for (let i = 0; i < 3; i++) {
    const wake = new THREE.Mesh(
      new THREE.RingGeometry(1.2 + i * 0.8, 1.9 + i * 1.0, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.36 - i * 0.06, side: THREE.DoubleSide })
    );
    wake.position.copy(outward.clone().multiplyScalar(-2.4 - i * 2.7));
    wake.rotation.x = -Math.PI / 2;
    wake.scale.x = 1.8 + i * 0.35;
    wake.scale.y = 0.55;
    wake.userData.baseScale = 1;
    group.add(wake);
  }
  for (let i = 0; i < 24; i++) {
    const spray = new THREE.Mesh(new THREE.SphereGeometry(0.14 + Math.random() * 0.2, 6, 5), new THREE.MeshBasicMaterial({ color: i % 4 ? 0xf1fdff : 0x9eddea, transparent: true, opacity: 0.86 }));
    spray.position.copy(side.clone().multiplyScalar((Math.random() - 0.5) * 13)).add(outward.clone().multiplyScalar((Math.random() - 0.5) * 7));
    spray.position.y = 0.3 + Math.random() * 0.8;
    spray.userData.velocity = side.clone().multiplyScalar((Math.random() - 0.5) * 7)
      .add(outward.clone().multiplyScalar(-2.4 - Math.random() * 4.4))
      .add(new THREE.Vector3(0, 3 + Math.random() * 4.2, 0));
    group.add(spray);
  }
  addImpactEffect(group, attackId === "crush" ? 1.25 : 1.75);
  addWaveHazard(position, { dps: 0, force: 30, radiusStart: 6, radiusEnd: 28, thickness: 4.5, life: 1.8, damageShips: false });
}

function leviathanAttackHits(position, impactPoint, sideDir, type = state.shipType) {
  const offset = position.clone().sub(impactPoint);
  offset.y = 0;
  const forward = sideDir.clone().normalize();
  const cross = new THREE.Vector3(forward.z, 0, -forward.x);
  const along = Math.abs(offset.dot(forward));
  const across = Math.abs(offset.dot(cross));
  return along <= 11 + shipHitRadius(type) * 0.35 && across <= 8 + shipHitRadius(type) * 0.45;
}

function summonLeviathan() {
  if (leviathan || clock.elapsedTime < leviathanCooldown || state.mode !== "ship") return;
  leviathanCooldown = clock.elapsedTime + 10.2;
  const forward = new THREE.Vector3(Math.sin(state.rotation), 0, Math.cos(state.rotation));
  const outward = playerShip.position.clone().setY(0);
  if (outward.lengthSq() < 0.01) outward.copy(forward);
  outward.normalize();
  const sideDir = new THREE.Vector3(forward.z, 0, -forward.x).normalize();
  if (sideDir.dot(outward) < 0) sideDir.multiplyScalar(-1);
  const attack = leviathanAttacks[Math.floor(Math.random() * leviathanAttacks.length)];
  const group = makeLeviathanMesh();
  const impactPoint = playerShip.position.clone();
  impactPoint.y = 0;
  const startPosition = impactPoint.clone().add(sideDir.clone().multiplyScalar(64));
  startPosition.y = -24;
  const smashPosition = impactPoint.clone().add(sideDir.clone().multiplyScalar(8.6));
  smashPosition.y = 0.55;
  const divePosition = impactPoint.clone().add(sideDir.clone().multiplyScalar(-30));
  divePosition.y = -24;
  group.position.copy(startPosition);
  group.rotation.y = Math.atan2(sideDir.x, sideDir.z);
  group.rotation.x = 0.48;
  group.scale.setScalar(1.1);
  setLeviathanJawOpen(group, 1);
  scene.add(group);
  makeLeviathanAttackEffect(startPosition.clone().setY(0), sideDir, "breach");
  leviathan = {
    group,
    born: clock.elapsedTime,
    grabbed: false,
    crushed: false,
    damaged: false,
    sideDir: sideDir.clone(),
    attack,
    startPosition,
    smashPosition,
    divePosition,
    impactPoint,
    slamAt: 0,
  };
  toast(`You left the charted sea. The Leviathan ${attack.label}.`);
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
  group.userData.kind = "fish";
  group.userData.speed = 8;
  group.userData.radius = 0.75;
  group.userData.direction = Math.random() * Math.PI * 2;
  scene.add(group);
  fish.push(group);
}

function makeSquid() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), mat(0xb24f5d));
  body.scale.set(0.72, 0.45, 1.15);
  body.position.y = 0.24;
  group.add(body);
  for (let i = 0; i < 6; i++) {
    const tentacle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.025, 1.05, 5), mat(0xd06d71));
    const angle = (i / 6) * Math.PI * 2;
    tentacle.position.set(Math.cos(angle) * 0.22, 0.12, 0.55 + Math.sin(angle) * 0.12);
    tentacle.rotation.x = Math.PI / 2 + Math.sin(angle) * 0.4;
    tentacle.rotation.z = angle;
    group.add(tentacle);
  }
  const point = randomWaterPoint(MAP_LIMIT * 0.92, 18);
  group.position.set(point.x, 0.12, point.z);
  group.userData.phase = Math.random() * 20;
  group.userData.kind = "squid";
  group.userData.speed = 8;
  group.userData.radius = 1.05;
  group.userData.direction = Math.random() * Math.PI * 2;
  scene.add(group);
  fish.push(group);
}

function makeWhale() {
  const group = new THREE.Group();
  const bodyMat = mat(0x315f89);
  const darkMat = mat(0x234b6c);
  const bellyMat = mat(0xb1d0df);
  const grooveMat = mat(0x6f9ebb);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x071018 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), bodyMat);
  body.scale.set(1.65, 0.46, 3.6);
  body.position.set(0, 0.42, -0.55);
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 14), bodyMat);
  head.scale.set(1.95, 0.48, 1.28);
  head.position.set(0, 0.36, 2.55);
  head.castShadow = true;
  group.add(head);

  const snout = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 10), bodyMat);
  snout.scale.set(1.72, 0.34, 0.62);
  snout.position.set(0, 0.31, 3.36);
  snout.castShadow = true;
  group.add(snout);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 10), bellyMat);
  belly.scale.set(1.28, 0.12, 3.15);
  belly.position.set(0, 0.08, 0.82);
  group.add(belly);

  for (let i = -3; i <= 3; i++) {
    const groove = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.022, 2.2), grooveMat);
    groove.position.set(i * 0.22, 0.02, 1.72);
    groove.rotation.x = -0.08;
    group.add(groove);
  }

  const tailStock = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.58, 2.4, 12), darkMat);
  tailStock.position.set(0, 0.36, -4.05);
  tailStock.rotation.x = Math.PI / 2;
  tailStock.scale.x = 0.72;
  tailStock.castShadow = true;
  group.add(tailStock);

  for (const side of [-1, 1]) {
    const fluke = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.72, 4), darkMat);
    fluke.position.set(side * 0.82, 0.36, -5.15);
    fluke.rotation.z = side * Math.PI / 2;
    fluke.rotation.y = side * 0.32;
    fluke.scale.set(1.25, 0.48, 0.12);
    fluke.castShadow = true;
    group.add(fluke);
  }

  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.85, 4), darkMat);
  dorsal.position.set(0, 0.88, -2.15);
  dorsal.rotation.x = -0.22;
  dorsal.scale.z = 0.7;
  dorsal.castShadow = true;
  group.add(dorsal);

  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.34, 2.25, 4), darkMat);
    fin.position.set(side * 1.82, 0.16, 1.05);
    fin.rotation.z = side * -1.22;
    fin.rotation.x = -0.38;
    fin.rotation.y = side * 0.18;
    fin.scale.set(0.62, 1, 0.16);
    fin.castShadow = true;
    group.add(fin);
  }

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 5), eyeMat);
    eye.position.set(side * 1.22, 0.56, 2.92);
    group.add(eye);
  }

  for (const side of [-1, 1]) {
    const blowhole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.018, 0.34), darkMat);
    blowhole.position.set(side * 0.16, 0.84, 2.44);
    blowhole.rotation.y = side * 0.12;
    group.add(blowhole);
  }

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.02, 4), darkMat);
  tail.visible = false;
  tail.position.set(0, 0.25, -4.4);
  tail.rotation.x = Math.PI / 2;
  group.add(tail);

  const point = randomNorthernWaterPoint(MAP_LIMIT * 0.9, 70);
  group.position.set(point.x, 0.05, clamp(point.z, WHALE_NORTH_MIN_Z, WHALE_NORTH_MAX_Z));
  group.rotation.y = Math.random() * Math.PI * 2;
  scene.add(group);
  animals.push({
    kind: "whale",
    group,
    hp: 1000,
    maxHp: 1000,
    speed: 14,
    direction: group.rotation.y,
    turnAt: clock.elapsedTime + 3 + Math.random() * 5,
    submergedUntil: 0,
    ramCooldown: 0,
  });
}

function makeCrateMesh(x, z, kind = "crate") {
  const group = new THREE.Group();
  group.position.set(x, 0.65, z);
  group.rotation.y = Math.random() * Math.PI;
  if (kind === "whale") {
    const bodyMat = mat(0x315f89);
    const darkMat = mat(0x234b6c);
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 12), bodyMat);
    body.scale.set(1.55, 0.34, 2.75);
    body.position.set(0, 0.22, -0.35);
    body.castShadow = true;
    group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 9), bodyMat);
    head.scale.set(1.72, 0.32, 0.88);
    head.position.set(0, 0.18, 2.0);
    group.add(head);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), mat(0xa8c9df));
    belly.scale.set(1.12, 0.08, 2.35);
    belly.position.set(0, -0.02, 0.48);
    group.add(belly);
    const tailStock = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.42, 1.7, 10), darkMat);
    tailStock.position.set(0, 0.18, -3.15);
    tailStock.rotation.x = Math.PI / 2;
    group.add(tailStock);
    for (const side of [-1, 1]) {
      const fluke = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.08, 4), darkMat);
      fluke.position.set(side * 0.54, 0.18, -3.95);
      fluke.rotation.z = side * Math.PI / 2;
      fluke.rotation.y = side * 0.3;
      fluke.scale.set(1.2, 0.42, 0.12);
      group.add(fluke);
    }
    scene.add(group);
    return group;
  }
  if (kind === "kraken") {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.8, 0, -0.4),
      new THREE.Vector3(-0.8, 0.55, 0.8),
      new THREE.Vector3(1.5, 0.15, 0.3),
      new THREE.Vector3(3.1, 0.45, -0.6),
    ]);
    const tentacle = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.42, 9, false), mat(0x6b3d69));
    tentacle.castShadow = true;
    group.add(tentacle);
    const glow = new THREE.Mesh(new THREE.RingGeometry(1.7, 2.15, 24), new THREE.MeshBasicMaterial({ color: 0xf3c33b, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -0.45;
    group.add(glow);
    scene.add(group);
    return group;
  }
  const isTreasure = kind === "treasure";
  const chest = new THREE.Mesh(
    new THREE.BoxGeometry(isTreasure ? 1.65 : 1.25, isTreasure ? 1.12 : 1.05, isTreasure ? 1.35 : 1.25),
    isTreasure ? mats.gold : mats.crate
  );
  chest.castShadow = true;
  group.add(chest);
  if (isTreasure) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.18, 1.48), mats.dark);
    band.position.y = 0.13;
    band.castShadow = true;
    group.add(band);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.32, 1.18), mat(0xf6cc55));
    lid.position.y = 0.62;
    lid.castShadow = true;
    group.add(lid);
  }
  scene.add(group);
  return group;
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
      kind: "crate",
      born: clock.elapsedTime,
      heal: 8 + Math.random() * 8,
      xp: 6 + Math.random() * 9,
      gold: 5 + Math.floor(Math.random() * 13),
    });
  }
}

function dropPlayerDeathCrates(pos) {
  const count = crateDropCount(state);
  if (multiplayer.serverWorld) {
    if (sendMultiplayer({
      type: "playerSunk",
      x: pos.x,
      z: pos.z,
      level: state.level,
      shipType: state.shipType,
    })) return;
  }
  dropCrates(pos, count);
  if (multiplayer.channel) {
    sendMultiplayer({
      type: "playerSunk",
      x: pos.x,
      z: pos.z,
      count,
      level: state.level,
      shipType: state.shipType,
    });
  }
}

function spawnTreasure(position = null) {
  const point = position || randomWaterPoint(MAP_LIMIT * 0.94, 55);
  crates.push({
    mesh: makeCrateMesh(point.x, point.z, "treasure"),
    kind: "treasure",
    born: clock.elapsedTime,
    heal: 18 + Math.random() * 14,
    xp: 220 + Math.random() * 120,
    gold: 110 + Math.floor(Math.random() * 80),
  });
}

function nearestTreasureTo(point, maxDistance = 150) {
  let best = null;
  let bestDist = maxDistance;
  crates.forEach((crate) => {
    if (crate.kind !== "treasure") return;
    const d = dist2(point, crate.mesh.position);
    if (d < bestDist) {
      best = crate;
      bestDist = d;
    }
  });
  return best;
}

function nearestPickupTo(point, maxDistance = 215, bot = null) {
  let best = null;
  let bestScore = Infinity;
  const healthNeed = bot?.shipType ? clamp((getShipStats(bot.shipType).hp - bot.hp) / getShipStats(bot.shipType).hp, 0, 1) : 0;
  crates.forEach((crate) => {
    if (islands.some((island) => dist2(crate.mesh.position, island.group.position) < island.radius + 8)) return;
    const d = dist2(point, crate.mesh.position);
    const valuable = crate.kind === "treasure" || crate.kind === "kraken";
    const searchDistance = valuable ? maxDistance * 1.35 : maxDistance;
    if (d > searchDistance) return;
    const priority = crate.kind === "kraken" ? 0.22 : crate.kind === "treasure" ? 0.3 : 1 - healthNeed * 0.38;
    const score = d * priority - healthNeed * 36;
    if (score < bestScore) {
      best = crate;
      bestScore = score;
    }
  });
  return best;
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

function fishHitRadius(item) {
  return item?.userData?.radius || (item?.userData?.kind === "squid" ? 1.05 : 0.75);
}

function startFishing(dir) {
  if (state.fishing) return toast("Already reeling. Hold steady.");
  const castPoint = playerShip.position.clone().add(dir.clone().multiplyScalar(12 + Math.random() * 8));
  castPoint.y = 0.18;
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
    target: null,
    castPoint: castPoint.clone(),
    timer: 0,
    biteTime: 0,
    reelTime: 0.9 + Math.random() * 1.25,
    phase: "waiting",
  };
  toast("Line cast. Waiting for a bite...");
}

function finishFishing() {
  const target = state.fishing?.target;
  const kind = target?.userData?.kind === "squid" ? "Squid" : "Fish";
  if (target && fish.includes(target)) {
    scene.remove(target);
    fish.splice(fish.indexOf(target), 1);
  }
  clearFishingRig();
  state.fishing = null;
  state.gold += 16 + state.level * 3 + Math.floor(Math.random() * 14);
  addXP(22 + Math.floor(Math.random() * 10));
  toast(`${kind} reeled in after a hard pull.`);
  kind === "Squid" ? makeSquid() : makeFish();
}

function alertBot(bot, seconds = 12) {
  bot.agroUntil = Math.max(bot.agroUntil || 0, clock.elapsedTime + seconds + bot.level * 0.8);
  bot.target = playerShip.position.clone();
  bot.turn = Math.min(bot.turn || 0, 0.2);
  bot.fireCooldown = Math.min(bot.fireCooldown || 1.5, 1.25);
}

function targetFireState(target) {
  return target === state ? state.fire : target?.fire;
}

function setTargetFireState(target, fire) {
  if (target === state) state.fire = fire;
  else if (target) target.fire = fire;
}

function targetShipGroup(target) {
  if (target === state) return playerShip;
  return target?.group || null;
}

function disposeVisualMesh(mesh) {
  if (!mesh) return;
  mesh.geometry?.dispose?.();
  if (Array.isArray(mesh.material)) mesh.material.forEach((item) => item?.dispose?.());
  else mesh.material?.dispose?.();
}

function clearBurnVisual(target) {
  const fire = targetFireState(target);
  if (!fire?.scorch) return;
  fire.scorch.parent?.remove(fire.scorch);
  disposeVisualMesh(fire.scorch);
  fire.scorch = null;
}

function addScorchMark(target, worldPosition = null) {
  const fire = targetFireState(target);
  const group = targetShipGroup(target);
  if (!fire || !group) return;
  if (!fire.scorch) {
    fire.scorch = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 14, 8),
      new THREE.MeshStandardMaterial({ color: 0x120807, roughness: 0.98, metalness: 0, transparent: true, opacity: 0.88 })
    );
    fire.scorch.userData.burnScorch = true;
    group.add(fire.scorch);
  }
  const type = target === state ? state.shipType : target.shipType || STARTER_SHIP;
  const radius = shipHitRadius(type);
  const hit = worldPosition?.clone?.() || group.position.clone().add(new THREE.Vector3(0, 1.05, -radius * 0.16));
  const local = group.worldToLocal(hit);
  local.x = clamp(local.x, -radius * 0.72, radius * 0.72);
  local.y = clamp(local.y, 0.45, 2.4);
  local.z = clamp(local.z, -radius * 0.88, radius * 0.88);
  const size = clamp(radius * 0.13, 0.4, 0.92);
  fire.scorch.position.copy(local);
  fire.scorch.rotation.set(-0.18 + Math.random() * 0.14, Math.random() * Math.PI, Math.random() * 0.3);
  fire.scorch.scale.set(size * 1.35, size * 0.13, size * 0.72);
}

function makeBurnSmoke(position) {
  const group = new THREE.Group();
  group.position.copy(position);
  for (let i = 0; i < 5; i++) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.16 + Math.random() * 0.14, 8, 6),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0x31343a : 0x5d5f62, transparent: true, opacity: 0.42 })
    );
    puff.position.set((Math.random() - 0.5) * 0.35, Math.random() * 0.22, (Math.random() - 0.5) * 0.35);
    puff.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.45, 1.35 + Math.random() * 0.8, (Math.random() - 0.5) * 0.45);
    puff.userData.puff = true;
    group.add(puff);
  }
  addImpactEffect(group, 1.15);
}

function updateBurnVisual(target, dt) {
  const fire = targetFireState(target);
  const group = targetShipGroup(target);
  if (!fire || !group) return;
  if (!fire.scorch) addScorchMark(target);
  if (fire.scorch?.material) {
    const heat = clamp(fire.remaining / 12, 0, 1);
    fire.scorch.material.opacity = 0.62 + heat * 0.24;
  }
  fire.smokeTimer = (fire.smokeTimer || 0) - dt;
  if (fire.smokeTimer <= 0) {
    fire.smokeTimer = 0.16 + Math.random() * 0.14;
    const smokePoint = new THREE.Vector3();
    if (fire.scorch?.parent) fire.scorch.getWorldPosition(smokePoint);
    else smokePoint.copy(group.position).y += 1.25;
    smokePoint.y += 0.38;
    makeBurnSmoke(smokePoint);
  }
}

function igniteTarget(target, fire, hitPosition = null, visualOnly = false) {
  if (!fire) return;
  const current = targetFireState(target);
  const effect = {
    dps: Number(fire.dps) || 2,
    remaining: Number(fire.duration) || 12,
  };
  const next = {
    dps: effect.dps,
    remaining: Math.max(current?.remaining || 0, effect.remaining),
    visualOnly: Boolean(visualOnly) && current?.visualOnly !== false,
    scorch: current?.scorch || null,
    smokeTimer: current?.smokeTimer || 0,
  };
  setTargetFireState(target, next);
  addScorchMark(target, hitPosition);
}

function updateFireDamage(target, dt, speed = 0) {
  const fire = targetFireState(target);
  if (!fire) return;
  const movementWear = 1 + clamp(speed / 32, 0, 0.9);
  fire.remaining -= dt * movementWear;
  updateBurnVisual(target, dt);
  if (!fire.visualOnly) {
    const damage = (Number(fire.dps) || 2) * dt;
    target.hp -= damage;
  }
  if (fire.remaining <= 0) {
    clearBurnVisual(target);
    setTargetFireState(target, null);
  }
  if (!fire.visualOnly && target.hp <= 0) {
    clearBurnVisual(target);
    setTargetFireState(target, null);
    if (target.isBot) {
      damageTarget(target, 0);
    } else {
      damageTarget(state, maxHp() * 4);
    }
  }
}

function animalHitRadius(animal) {
  return animal.kind === "whale" ? 5.2 : 1;
}

function whaleIslandSteer(position, forward, radius, submerged = false, extra = 0) {
  const steer = new THREE.Vector3();
  let active = false;
  islands.forEach((island) => {
    const away = position.clone().sub(island.group.position);
    away.y = 0;
    const distance = away.length();
    const danger = island.radius + radius + (submerged ? 18 : 30) + extra;
    if (distance <= 0.001 || distance >= danger) return;
    active = true;
    const pressure = Math.pow((danger - distance) / danger, 1.35);
    const radial = away.normalize();
    const tangent = new THREE.Vector3(radial.z, 0, -radial.x);
    if (tangent.dot(forward) < 0) tangent.multiplyScalar(-1);
    steer.add(radial.multiplyScalar(pressure * (submerged ? 1.05 : 1.75)));
    steer.add(tangent.multiplyScalar(pressure * (submerged ? 1.25 : 1.55)));
  });
  if (!active) return null;
  const blended = forward.clone().multiplyScalar(0.42).add(steer);
  return blended.lengthSq() > 0.001 ? blended.normalize() : forward.clone();
}

function projectileHitsAnimal(shot, animal) {
  if (!animal || animal.hp <= 0 || animal.kind !== "whale") return false;
  if (animal.submergedUntil > clock.elapsedTime && shot.ammoType !== "harpoon") return false;
  const local = animal.group.worldToLocal(shot.mesh.position.clone());
  const lengthHit = 5.65;
  const widthHit = 2.05;
  const heightHit = animal.submergedUntil > clock.elapsedTime ? 1.35 : 2.3;
  const ellipse = (local.x / widthHit) ** 2 + (local.z / lengthHit) ** 2;
  return ellipse <= 1 && local.y > -1.2 && local.y < heightHit;
}

function damageAnimal(animal, shot) {
  if (animal.kind !== "whale") return false;
  const damage = shot.ammoType === "harpoon" ? CANNONBALL_TYPES.harpoon.whaleDamage : shot.damage * 0.5;
  animal.hp -= damage;
  animal.aggressiveUntil = clock.elapsedTime + 18;
  animal.submergedUntil = 0;
  makeSplashEffect(animal.group.position);
  if (animal.hp > 0) return false;
  const pos = animal.group.position.clone();
  scene.remove(animal.group);
  animals.splice(animals.indexOf(animal), 1);
  crates.push({
    mesh: makeCrateMesh(pos.x, pos.z, "whale"),
    kind: "whale",
    born: clock.elapsedTime,
    heal: 0,
    xp: 0,
    gold: 0,
    blubber: 3 + Math.floor(Math.random() * 3),
  });
  toast("Whale down. A carcass surfaced.");
  return true;
}

function updateAnimals(dt) {
  animals.slice().forEach((animal) => {
    if (animal.kind !== "whale") return;
    if (!pointInWhaleNorthZone(animal.group.position, 80)) {
      animal.group.position.z = clamp(animal.group.position.z, WHALE_NORTH_MIN_Z + 8, WHALE_NORTH_MAX_Z - 8);
      animal.direction = whaleZoneReturnDirection(animal.group.position);
    }
    animal.turnAt -= dt;
    if (animal.turnAt <= 0) {
      animal.turnAt = 3 + Math.random() * 6;
      animal.direction += (Math.random() - 0.5) * 1.2;
      if (Math.random() < 0.28) animal.submergedUntil = clock.elapsedTime + 4 + Math.random() * 5;
    }
    const underIsland = pointInAnyIsland(animal.group.position, animalHitRadius(animal) * 0.65);
    if (underIsland && animal.submergedUntil <= clock.elapsedTime + 0.6) {
      animal.submergedUntil = clock.elapsedTime + 2.4;
    }
    const nearWhaleBoundary = animal.group.position.z < WHALE_NORTH_MIN_Z + 42 || animal.group.position.z > WHALE_NORTH_MAX_Z - 42;
    if ((animal.aggressiveUntil || 0) > clock.elapsedTime && state.mode === "ship" && pointInWhaleNorthZone(playerShip.position, -12)) {
      animal.direction = lerpAngle(
        animal.direction,
        Math.atan2(playerShip.position.x - animal.group.position.x, playerShip.position.z - animal.group.position.z),
        clamp(dt * 2.4, 0, 0.2)
      );
      animal.submergedUntil = 0;
    }
    if (nearWhaleBoundary || !pointInWhaleNorthZone(animal.group.position)) {
      animal.direction = lerpAngle(animal.direction, whaleZoneReturnDirection(animal.group.position), clamp(dt * 3.8, 0, 0.32));
    }
    const submerged = animal.submergedUntil > clock.elapsedTime;
    const desiredForward = new THREE.Vector3(Math.sin(animal.direction), 0, Math.cos(animal.direction));
    const islandSteer = whaleIslandSteer(animal.group.position, desiredForward, animalHitRadius(animal), submerged);
    if (islandSteer) {
      animal.direction = lerpAngle(animal.direction, Math.atan2(islandSteer.x, islandSteer.z), clamp(dt * (submerged ? 1.9 : 3.2), 0, 0.26));
    }
    const targetY = submerged ? -1.15 : 0.05 + Math.sin(clock.elapsedTime * 1.3) * 0.12;
    animal.group.position.y += (targetY - animal.group.position.y) * clamp(dt * 2, 0, 0.12);
    animal.group.rotation.y = lerpAngle(animal.group.rotation.y, animal.direction, clamp(dt * 2, 0, 0.12));
    const forward = new THREE.Vector3(Math.sin(animal.group.rotation.y), 0, Math.cos(animal.group.rotation.y));
    const next = animal.group.position.clone().add(forward.multiplyScalar(animal.speed * dt * (submerged ? 0.82 : (animal.aggressiveUntil || 0) > clock.elapsedTime ? 1.08 : 1)));
    const blockedIsland = islands.find((island) => dist2(next, island.group.position) < island.radius + animalHitRadius(animal) * 0.85);
    if (!pointInWhaleNorthZone(next)) {
      animal.direction = lerpAngle(animal.direction, whaleZoneReturnDirection(animal.group.position), 0.62);
      animal.group.position.z = clamp(animal.group.position.z, WHALE_NORTH_MIN_Z + 2, WHALE_NORTH_MAX_Z - 2);
      return;
    }
    if (Math.abs(next.x) > MAP_LIMIT * 0.94 || Math.abs(next.z) > MAP_LIMIT * 0.94 || blockedIsland) {
      if (blockedIsland) {
        const escape = whaleIslandSteer(animal.group.position, forward, animalHitRadius(animal), submerged, 44);
        if (escape) animal.direction = lerpAngle(animal.direction, Math.atan2(escape.x, escape.z), 0.42);
        const away = animal.group.position.clone().sub(blockedIsland.group.position);
        away.y = 0;
        if (away.lengthSq() > 0.01) animal.group.position.add(away.normalize().multiplyScalar(dt * animal.speed * 0.35));
      } else {
        animal.direction += Math.PI * (0.8 + Math.random() * 0.4);
      }
      animal.group.position.x = clamp(animal.group.position.x, -MAP_LIMIT * 0.94, MAP_LIMIT * 0.94);
      animal.group.position.z = clamp(animal.group.position.z, WHALE_NORTH_MIN_Z + 2, WHALE_NORTH_MAX_Z - 2);
    } else {
      animal.group.position.copy(next);
    }
    animal.group.traverse((child) => {
      if (child.material) child.material.opacity = submerged ? 0.34 : 1;
      if (child.material) child.material.transparent = submerged;
    });
    animal.ramCooldown = Math.max(0, animal.ramCooldown - dt);
    if (!submerged && state.mode === "ship" && animal.ramCooldown <= 0 && dist2(animal.group.position, playerShip.position) < animalHitRadius(animal) + shipHitRadius(state.shipType) * 0.5) {
      const away = playerShip.position.clone().sub(animal.group.position);
      away.y = 0;
      if (away.lengthSq() < 0.01) away.set(Math.sin(animal.group.rotation.y), 0, Math.cos(animal.group.rotation.y));
      away.normalize();
      const whaleScale = state.shipType === "whaler" ? getShipStats().whaleRamTakenScale || 0.25 : 1;
      damageTarget(state, 50 * whaleScale);
      state.velocity.add(away.multiplyScalar(10));
      animal.submergedUntil = clock.elapsedTime + 5 + Math.random() * 3;
      animal.ramCooldown = 9;
      toast("A whale rammed your ship.");
    }
  });
}

function makeStormCloud() {
  const group = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0x3c4148, roughness: 1, transparent: true, opacity: 0.9 });
  for (let i = 0; i < 12; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(4 + Math.random() * 3.8, 8, 6), cloudMat);
    puff.position.set((Math.random() - 0.5) * 56, Math.random() * 7, (Math.random() - 0.5) * 48);
    group.add(puff);
  }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0x1f2b35, transparent: true, opacity: 0.22, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -47.82;
  shadow.userData.stormShadow = true;
  group.add(shadow);
  group.position.y = 48;
  return group;
}

function spawnStorm() {
  const group = makeStormCloud();
  const northBias = Math.random() < 0.72;
  const x = (Math.random() - 0.5) * MAP_LIMIT * 1.4;
  const z = northBias ? Math.random() * MAP_LIMIT * 0.9 : (Math.random() - 0.5) * MAP_LIMIT * 1.5;
  group.position.x = x;
  group.position.z = z;
  scene.add(group);
  const direction = Math.random() * Math.PI * 2;
  const radius = 58 + Math.random() * 34;
  const shadow = group.children.find((child) => child.userData.stormShadow);
  if (shadow) shadow.scale.setScalar(radius);
  storms.push({
    group,
    radius,
    velocity: new THREE.Vector3(Math.sin(direction), 0, Math.cos(direction)).multiplyScalar(4),
    born: clock.elapsedTime,
    life: 600,
    strikeAt: clock.elapsedTime + 2 + Math.random() * 6,
  });
}

function makeLightningBolt(start, end) {
  const group = new THREE.Group();
  const points = [];
  const segments = 8;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = start.clone().lerp(end, t);
    p.x += (Math.random() - 0.5) * 3.6 * (1 - Math.abs(t - 0.5));
    p.z += (Math.random() - 0.5) * 3.6 * (1 - Math.abs(t - 0.5));
    points.push(p);
  }
  const main = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0xd9fbff, transparent: true, opacity: 0.95 })
  );
  group.add(main);
  for (let i = 2; i < points.length - 2; i += 2) {
    const base = points[i];
    const branchEnd = base.clone().add(new THREE.Vector3((Math.random() - 0.5) * 8, -3 - Math.random() * 5, (Math.random() - 0.5) * 8));
    group.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([base, branchEnd]),
      new THREE.LineBasicMaterial({ color: 0x89dfff, transparent: true, opacity: 0.72 })
    ));
  }
  addImpactEffect(group, 0.28);
}

function lightningStrike(storm) {
  const candidates = [];
  if (state.mode === "ship" && dist2(playerShip.position, storm.group.position) < storm.radius) {
    candidates.push({ kind: "player", position: playerShip.position, target: state, type: state.shipType });
  }
  bots.forEach((bot) => {
    if (dist2(bot.group.position, storm.group.position) < storm.radius) {
      candidates.push({ kind: "bot", position: bot.group.position, target: bot, type: bot.shipType });
    }
  });
  balloons.forEach((balloon) => {
    if (!balloon.destroyed && dist2(balloon.group.position, storm.group.position) < storm.radius) {
      candidates.push({ kind: "balloon", position: balloon.group.position, target: balloon });
    }
  });
  islands.forEach((island) => {
    if (dist2(island.group.position, storm.group.position) < storm.radius + island.radius) {
      const angle = Math.random() * Math.PI * 2;
      candidates.push({
        kind: "island",
        position: island.group.position.clone().add(new THREE.Vector3(Math.sin(angle) * island.radius * 0.45, 0, Math.cos(angle) * island.radius * 0.45)),
      });
    }
  });
  if (!candidates.length) return;
  const hit = candidates[Math.floor(Math.random() * candidates.length)];
  const start = new THREE.Vector3(hit.position.x, storm.group.position.y + 6, hit.position.z);
  const end = hit.position.clone().setY(0.6);
  makeLightningBolt(start, end);
  makeFireImpactEffect(end.clone(), new THREE.Vector3(1, 0, 0));
  if (hit.kind === "player" || hit.kind === "bot") {
    damageTarget(hit.target, 50, { fire: { dps: 10, duration: 3 }, hitPosition: end });
  } else if (hit.kind === "balloon") {
    destroyBalloon(hit.target, "lightning");
  }
}

function updateStorms(dt) {
  if (clock.elapsedTime >= nextStormAt) {
    nextStormAt = clock.elapsedTime + 130 + Math.random() * 220;
    if (Math.random() < 0.65) spawnStorm();
  }
  storms.slice().forEach((storm) => {
    storm.group.position.add(storm.velocity.clone().multiplyScalar(dt));
    storm.group.rotation.y += dt * 0.04;
    if (clock.elapsedTime >= storm.strikeAt) {
      storm.strikeAt = clock.elapsedTime + 3 + Math.random() * 7;
      lightningStrike(storm);
    }
    if (clock.elapsedTime - storm.born > storm.life) {
      scene.remove(storm.group);
      storms.splice(storms.indexOf(storm), 1);
    }
  });
}

function damageTarget(target, amount, options = {}) {
  if (target.serverId && multiplayer.serverWorld) {
    sendMultiplayer({ type: "hitBot", id: target.serverId, damage: amount, fire: options.fire || null });
    return;
  }
  const armor = target.isBot ? getShipStats(target.shipType).armor : getShipStats().armor;
  target.hp -= amount * (1 - armor);
  if (target.hp > 0 && options.fire) igniteTarget(target, options.fire, options.hitPosition || null);
  if (target.isBot && target.hp > 0) alertBot(target);
  if (target.hp <= 0) {
    const level = target.level || 1;
    const deathPos = target.isBot ? target.group.position : playerShip.position;
    if (target.isBot) {
      clearBurnVisual(target);
      target.fire = null;
      dropCrates(deathPos, crateDropCount(target));
      target.hp = getShipStats(target.shipType).hp;
      target.group.position.copy(randomWaterPoint(MAP_LIMIT * 0.9, 82));
      target.level = Math.max(1, target.level + (Math.random() > 0.55 ? 1 : 0));
      target.agroUntil = 0;
      target.fireCooldown = 1.8 + Math.random() * 2;
      state.gold += 45 + level * 12;
      addXP(40 + level * 22);
      toast(`Sank a level ${level} ship. Crates overboard!`);
    } else {
      dropPlayerDeathCrates(deathPos);
      const lostGold = Math.floor(state.gold * 0.25);
      state.gold = Math.max(0, state.gold - lostGold);
      clearBurnVisual(state);
      state.fire = null;
      state.leviathanGrabbed = false;
      state.fallingOffWorld = false;
      state.fallingTimer = 0;
      state.viewMode = "ship";
      state.activeBalloonIndex = -1;
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
  initWindCurrents();
  for (let i = 0; i < 20; i++) makeCloud();
  islandData.forEach((data) => islands.push(makeIsland(data)));
  playerShip = makeShip(state.shipType);
  playerShip.position.copy(state.position);
  playerShip.position.y = SHIP_WATERLINE_Y;
  scene.add(playerShip);
  character = makeCharacter();
  for (let i = 0; i < 12; i++) makeFish();
  for (let i = 0; i < 6; i++) makeSquid();
  for (let i = 0; i < 7; i++) makeWhale();
  for (let i = 0; i < 15; i++) {
    const spec = shipCatalog[1 + Math.floor(Math.random() * (shipCatalog.length - 1))];
    const group = makeShip(spec.id, true);
    const spawn = randomWaterPoint(MAP_LIMIT * 0.9, 96);
    group.position.copy(spawn);
    group.rotation.y = Math.random() * Math.PI * 2;
    scene.add(group);
    bots.push({
      localId: `bot-${i}`,
      isBot: true,
      group,
      shipType: spec.id,
      hp: spec.hp,
      level: 1 + Math.floor(Math.random() * 7),
      turn: Math.random() * 10,
      velocity: new THREE.Vector3(),
      rotation: group.rotation.y,
      agroUntil: 0,
      naturallyAggressive: Math.random() < 0.24,
      courageous: Math.random() < 1 / 3,
      upgradeFocus: ["damage", "reload", "range"][i % 3],
      targetBot: null,
      botFightUntil: 0,
      fireCooldown: 1.6 + Math.random() * 2.4,
    });
  }
}

function setTool(tool) {
  state.tool = tool;
  if (tool !== "glass" && state.spyTarget) {
    state.spyTarget = null;
    updateSpyPanel();
  }
  Object.entries(ui.toolButtons).forEach(([name, button]) => button.classList.toggle("active", name === tool));
}

ui.toolButtons.cannon.addEventListener("click", () => setTool("cannon"));
ui.toolButtons.rod.addEventListener("click", () => setTool("rod"));
ui.toolButtons.glass.addEventListener("click", () => setTool("glass"));
ui.ammoHotbar?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-ammo-slot]");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  if (selectAmmoSlot(button.dataset.ammoSlot, true)) setTool("cannon");
});
ui.ammoHotbar?.addEventListener("mousedown", (event) => {
  if (!event.target.closest("[data-ammo-slot]")) return;
  event.preventDefault();
  event.stopPropagation();
});
ui.closeShop.addEventListener("click", () => closeShop());
ui.dockPrompt.addEventListener("click", () => {
  if (nameGateOpen()) return;
  if (state.mode === "land") {
    setSail();
    return;
  }
  const island = currentIsland();
  if (island) dockAtIsland(island);
});
ui.closeMinimap.addEventListener("click", () => {
  ui.minimapPanel.classList.add("hidden");
  ui.minimapPanel.classList.remove("expanded");
  ui.openMinimap.classList.remove("hidden");
});
ui.openMinimap.addEventListener("click", () => {
  ui.minimapPanel.classList.remove("hidden");
  ui.minimapPanel.classList.remove("expanded");
  ui.openMinimap.classList.add("hidden");
});
ui.toggleWindMap?.addEventListener("click", () => {
  state.showWindMarkers = !state.showWindMarkers;
  saveValue("islandwakeWindMarkers", state.showWindMarkers ? "1" : "0");
  toast(state.showWindMarkers ? "Wind markers shown." : "Wind markers hidden.");
});
ui.closeLeaderboard?.addEventListener("click", () => {
  ui.leaderboardPanel.classList.add("hidden");
  ui.openLeaderboard.classList.remove("hidden");
});
ui.openLeaderboard?.addEventListener("click", () => {
  ui.leaderboardPanel.classList.remove("hidden");
  ui.openLeaderboard.classList.add("hidden");
  renderLeaderboard();
});
ui.tabs.forEach((tab) => tab.addEventListener("click", () => {
  state.shopTab = tab.dataset.tab;
  ui.tabs.forEach((item) => item.classList.toggle("active", item === tab));
  renderShop();
}));

function setupNameGate() {
  if (!ui.nameGate || !ui.nameForm || !ui.nameInput) return;
  const joinGame = (event = null, forcedName = "", forcedToken = "") => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (ui.nameGate.classList.contains("hidden")) return;
    if (forcedName) ui.nameInput.value = forcedName;
    if (forcedToken && ui.developerTokenInput) ui.developerTokenInput.value = forcedToken;
    const nextName = ui.nameInput.value.trim().replace(/\s+/g, " ").slice(0, 18);
    if (!nextName) {
      ui.nameInput.focus();
      return;
    }
    const token = ui.developerTokenInput?.value?.trim() || "";
    state.name = nextName;
    state.devToken = token;
    state.infiniteGold = token === "GoldDigger";
    if (state.infiniteGold) state.gold = 999999999;
    state.joined = true;
    saveValue("islandwakeName", nextName);
    ui.nameGate.classList.add("hidden");
    sendMultiplayer({ type: "hello", player: multiplayerPayload() });
    updateHud();
  };
  window.islandwakeJoin = (name = "", token = "") => joinGame(null, String(name || ""), String(token || ""));
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
  ui.nameButton?.addEventListener("click", joinGame);
  ui.nameForm.addEventListener("submit", joinGame);
  ui.nameGate.addEventListener("click", (event) => {
    const button = event.target?.closest?.("button");
    if (!button || !ui.nameGate.contains(button)) return;
    joinGame(event);
  }, true);
  ui.nameInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    joinGame(event);
  });
  ui.developerTokenInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    joinGame(event);
  });
  if (window.ISLANDWAKE_PENDING_JOIN) {
    joinGame(null, String(window.ISLANDWAKE_PENDING_JOIN), String(window.ISLANDWAKE_PENDING_TOKEN || ""));
    window.ISLANDWAKE_PENDING_JOIN = "";
    window.ISLANDWAKE_PENDING_TOKEN = "";
  }
}

addEventListener("keydown", (event) => {
  if (nameGateOpen()) return;
  const key = event.key.toLowerCase();
  const code = event.code?.toLowerCase?.() || "";
  if ((key === "t" || code === "keyt") && state.mode === "ship") {
    const island = currentIsland();
    if (island) {
      event.preventDefault();
      startDocking(island);
    } else {
      toast("Get closer to an island to dock.");
    }
    return;
  }
  if ((key === "c" || code === "keyc") && state.mode === "land") {
    event.preventDefault();
    setSail();
    return;
  }
  if ((key === "r" || code === "keyr") && state.mode === "land") {
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
  if (event.key === "ArrowUp") {
    event.preventDefault();
    state.cameraPitch = clamp(state.cameraPitch + 0.08, -0.18, 0.92);
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    state.cameraPitch = clamp(state.cameraPitch - 0.08, -0.18, 0.92);
  }
  if (key === "g") {
    event.preventDefault();
    setTool("glass");
    inspectWithSpyglass();
    return;
  }
  if (key === "b") {
    event.preventDefault();
    launchBalloon();
    return;
  }
  if (key === "v") {
    event.preventDefault();
    cycleViewMode();
    return;
  }
  if (key === "l") {
    event.preventDefault();
    landActiveBalloon();
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

function startDocking(island) {
  if (!island || state.mode !== "ship") return;
  state.docking = { island: island.name, remaining: 5 };
  state.velocity.multiplyScalar(0.25);
  toast(`Docking at ${island.name}: 5 seconds.`);
}

function updateDocking(dt) {
  if (!state.docking || state.mode !== "ship") return;
  const island = islands.find((item) => item.name === state.docking.island);
  if (!island || currentIsland() !== island) {
    state.docking = null;
    toast("Docking cancelled. Stay close to the island.");
    return;
  }
  state.velocity.multiplyScalar(Math.pow(0.58, dt * 6));
  state.docking.remaining -= dt;
  if (state.docking.remaining <= 0) {
    state.docking = null;
    dockAtIsland(island);
  }
}

function dockAtIsland(island) {
  if (!island) return;
  state.docking = null;
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
  const island = islands.find((item) => item.name === state.dockedAt) || currentIsland();
  closeShop();
  ["w", "a", "s", "d", "c"].forEach((key) => keys.delete(key));
  if (island) {
    const away = playerShip.position.clone().sub(island.group.position);
    away.y = 0;
    if (away.lengthSq() < 0.001) {
      away.set(Math.sin(character.rotation.y), 0, Math.cos(character.rotation.y));
    }
    away.normalize();
    const minDistance = island.radius + shipHitRadius(state.shipType) + 2.5;
    if (dist2(playerShip.position, island.group.position) < minDistance) {
      playerShip.position.x = island.group.position.x + away.x * minDistance;
      playerShip.position.z = island.group.position.z + away.z * minDistance;
    }
  }
  state.mode = "ship";
  state.dockedAt = null;
  character.visible = false;
  playerShip.visible = true;
  state.walkHeight = 0;
  state.walkVelocityY = 0;
  state.grounded = false;
  state.velocity.set(0, 0, 0);
  state.position.copy(playerShip.position);
  state.position.y = SHIP_WATERLINE_Y;
  playerShip.position.y = SHIP_WATERLINE_Y;
  multiplayer.lastSent = 0;
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
  if (state.viewMode === "balloon") {
    dropBalloonBomb(activeBalloon());
    return;
  }
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
    const ammo = currentAmmoType();
    if (!consumeAmmo(ammo)) return;
    state.cooldown = fireDelay;
    const range = cannonRange() * (ammo.rangeScale || 1);
    const targetDistance = clamp(dist2(playerShip.position, aimPoint), 4, range);
    const pellets = ammo.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const spread = pellets > 1 || ammo.spread ? (Math.random() - 0.5) * (ammo.spread || 0) : 0;
      const shotDir = rotateFlatDirection(dir, spread);
      const baseDamage = Number.isFinite(ammo.fixedDamage) ? ammo.fixedDamage : cannonDamage() * (ammo.damageScale || 1);
      const damage = ammo.noRangeDamage ? baseDamage : scaleDamageByRange(baseDamage, targetDistance, range);
      const target = playerShip.position.clone().add(shotDir.clone().multiplyScalar(targetDistance));
      target.y = 0;
      const origin = playerShip.position.clone().add(shotDir.clone().multiplyScalar(3.8));
      makeProjectile(playerId, origin, shotDir, damage, range, { target, ammoType: ammo.id });
      publishShot(origin, shotDir, damage, range, target, ammo.id);
    }
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
    inspectWithSpyglass(dir, true);
  }
}

function collectCrate(crate) {
  if (crate.serverId && multiplayer.serverWorld) {
    if (crate.pending) return;
    crate.pending = true;
    sendMultiplayer({ type: "collectCrate", id: crate.serverId });
    return;
  }
  if (crate.kind === "whale") {
    const amount = crate.blubber || (3 + Math.floor(Math.random() * 3));
    const capacity = blubberCapacity();
    if (!capacity) return toast("You need a Whaler to carry whale blubber.");
    const room = Math.max(0, capacity - blubberCount());
    if (room <= 0) return toast("Your whale blubber hold is full.");
    const taken = Math.min(room, amount);
    state.cargo["Whale Blubber"] = blubberCount() + taken;
    removeCrate(crate);
    toast(`Recovered ${taken} whale blubber.`);
    return;
  }
  state.hp = clamp(state.hp + crate.heal, 0, maxHp());
  addXP(crate.xp);
  state.gold += crate.gold ?? (10 + Math.floor(Math.random() * 26));
  const kind = crate.kind === "kraken" ? "Kraken tentacle" : crate.kind === "treasure" ? "Treasure" : "Crate";
  removeCrate(crate);
  toast(`${kind} recovered: repairs, gold, and XP.`);
}

function botCollectCrates(bot) {
  if (multiplayer.serverWorld || !bot?.group || !crates.length) return;
  const spec = getShipStats(bot.shipType);
  const pickupRadius = shipHitRadius(bot.shipType) + 1.15;
  crates.slice().forEach((crate) => {
    if (dist2(bot.group.position, crate.mesh.position) > pickupRadius) return;
    bot.hp = clamp((Number(bot.hp) || spec.hp) + (Number(crate.heal) || 0), 0, bot.serverMaxHp || spec.hp);
    if (crate.kind === "treasure" || crate.kind === "kraken") {
      bot.level = Math.min(40, (bot.level || 1) + 2);
      bot.fireCooldown = Math.min(bot.fireCooldown || 1.5, 1.1);
    }
    removeCrate(crate);
  });
}

function inspectWithSpyglass(dir = null, requireShipHit = false) {
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
      return { kind: "Hostile", name: spec.name, level: bot.level, hp: bot.hp, max: bot.serverMaxHp || spec.hp, armor: spec.armor, speed: spec.speed, regen: spec.regen, pos: bot.group.position, shipPos: bot.group.position, shipType: bot.shipType, group: bot.group };
    }),
    ...[...remotePlayers.values()].map((p) => {
      const spec = getShipStats(p.shipType);
      return { kind: "Captain", name: p.name, level: p.level || 1, hp: p.hp || spec.hp, max: spec.hp, armor: spec.armor, speed: spec.speed, regen: spec.regen, pos: p.lookPosition || p.group.position, shipPos: p.group.position, shipType: p.shipType, group: p.group };
    }),
  ];
  const directTarget = requireShipHit
    ? candidates
      .map((item) => {
        if (!item.group?.visible) return null;
        const hit = raycaster.intersectObject(item.group, true)[0];
        return hit ? { ...item, pos: item.shipPos, distance: dist2(playerShip.position, item.shipPos), hitDistance: hit.distance } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.hitDistance - b.hitDistance)[0]
    : null;
  const scanned = requireShipHit ? [] : candidates.map((item) => {
    const scanPos = requireShipHit ? item.shipPos : item.pos;
    const toTarget = scanPos.clone().sub(playerShip.position);
    toTarget.y = 0;
    const distance = toTarget.length();
    const forward = toTarget.dot(dir);
    const closest = playerShip.position.clone().add(dir.clone().multiplyScalar(forward));
    const missDistance = dist2(scanPos, closest);
    const aim = distance > 0.01 ? dir.dot(toTarget.clone().normalize()) : 0;
    return {
      ...item,
      pos: scanPos,
      distance,
      aim,
      forward,
      missDistance,
      hitRadius: shipHitRadius(item.shipType) * 0.95,
    };
  });
  const target = requireShipHit
    ? directTarget
    : scanned
      .filter((item) => item.distance < 135 && item.aim > -0.2)
      .sort((a, b) => (b.aim * 55 - b.distance * 0.35) - (a.aim * 55 - a.distance * 0.35))[0]
      || scanned
        .filter((item) => item.distance < 80)
        .sort((a, b) => a.distance - b.distance)[0];
  if (!target) {
    state.spyTarget = null;
    if (!requireShipHit) toast("Spyglass found no ships. Aim toward a sail.");
    updateSpyPanel();
    return;
  }
  const crateEstimate = crateDropCount({ isBot: true, shipType: target.shipType, level: target.level });
  const threat = target.level > state.level + 2 ? "Dangerous" : target.hp < target.max * 0.4 ? "Wounded" : "Manageable";
  state.spyTarget = { ...target, crateEstimate, threat, expires: clock.elapsedTime + 8 };
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

function ensureShipPreviewRenderer() {
  if (shipPreviewRenderer) return;
  shipPreviewScene = new THREE.Scene();
  shipPreviewCamera = new THREE.OrthographicCamera(-6.6, 6.6, 4.2, -4.2, 0.1, 90);
  shipPreviewCamera.position.set(7.4, 5.4, 8.2);
  shipPreviewCamera.lookAt(0, 1.0, 0);
  const fill = new THREE.HemisphereLight(0xffffff, 0x5fabb9, 1.9);
  shipPreviewScene.add(fill);
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 8, 5);
  shipPreviewScene.add(key);
  shipPreviewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  shipPreviewRenderer.setPixelRatio(1);
  shipPreviewRenderer.setSize(190, 112, false);
  shipPreviewRenderer.setClearColor(0x000000, 0);
  shipPreviewRenderer.outputColorSpace = THREE.SRGBColorSpace;
  shipPreviewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  shipPreviewRenderer.toneMappingExposure = 1.1;
}

function shipPreviewImage(type) {
  if (shipPreviewCache.has(type)) return shipPreviewCache.get(type);
  try {
    ensureShipPreviewRenderer();
    const group = makeShip(type, true);
    group.rotation.set(-0.06, -0.72, 0);
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 1);
    group.position.sub(center);
    group.position.y += 0.5;
    group.scale.multiplyScalar(Math.min(1.25, 7.4 / maxDim));
    shipPreviewScene.add(group);
    shipPreviewRenderer.render(shipPreviewScene, shipPreviewCamera);
    const url = shipPreviewRenderer.domElement.toDataURL("image/png");
    shipPreviewScene.remove(group);
    shipPreviewCache.set(type, url);
    return url;
  } catch (error) {
    shipPreviewCache.set(type, "");
    return "";
  }
}

function tradeDescription(island, name, owned, buyPrice, sellPrice) {
  if (name === "Whale Blubber") {
    return `Owned ${owned}. Portsmouth pays 200g each; other ports will not buy it. Whalers can carry up to 40 blubber outside their normal hold.`;
  }
  const markets = islandData
    .map((item) => ({ name: item.name, sell: marketSellPrice(item, name) }))
    .sort((a, b) => b.sell - a.sell);
  const best = markets[0] || { name: island.name, sell: sellPrice };
  const profit = best.sell - buyPrice;
  const routeText = best.name === island.name
    ? "This is one of the better places to sell it."
    : `Best known resale is ${best.sell}g at ${best.name}.`;
  const profitText = profit > 0
    ? `${profit}g possible profit if you haul it there.`
    : "Buying here is not a strong trade route right now.";
  return `Owned ${owned}. Sell here for ${sellPrice}g. ${routeText} ${profitText}`;
}

function shipRoleDescription(ship) {
  const speed = ship.speed >= 28 ? "very fast" : ship.speed >= 22 ? "quick" : ship.speed <= 12 ? "slow" : "steady";
  const defense = ship.armor <= 0 ? "no armor" : ship.armor >= 0.14 ? "heavy armor" : ship.armor >= 0.08 ? "solid armor" : "light armor";
  const hold = ship.capacity >= 38 ? "huge cargo hold" : ship.capacity >= 22 ? "large cargo hold" : ship.capacity <= 7 ? "small cargo hold" : "useful cargo hold";
  const durability = ship.hp >= 2400 ? "massive hull HP" : ship.hp >= 1500 ? "high hull HP" : ship.hp <= 750 ? "light hull HP" : "good hull HP";
  const handling = ship.speed > 22 && ship.armor <= 0 ? "Built for speed, not soaking hits." : ship.speed <= 12 ? "Heavy and hard to push, but slow to reposition." : "Balanced enough for trading and fights.";
  return `${speed} ship with ${durability}, ${defense}, and a ${hold}. ${handling}`;
}

function ammoDescription(ammo) {
  if (ammo.id === "hotshot") {
    const fire = ammo.fire || { dps: 0, duration: 0 };
    return `Same direct hit as Basic Shell, then burns for ${fire.dps}/s for ${fire.duration}s. Fire ignores cannon damage upgrades and moving ships burn out faster.`;
  }
  if (ammo.id === "grapeshot") {
    return `${ammo.pellets} pellets in a wide spread. Each pellet does ${Math.round(ammo.damageScale * 100)}% direct damage and reaches ${Math.round(ammo.rangeScale * 100)}% of cannon range. Best up close.`;
  }
  if (ammo.id === "harpoon") {
    return "Fixed 20 damage to ships. Whales take 100 damage from it, and cannon damage upgrades do not boost it.";
  }
  if (ammo.id === "airburst") {
    return "Explodes high above the aim point. It does no ship damage, but deals 40-60 damage to hot air balloons in the blast.";
  }
  return "Reliable single cannonball with infinite ammo.";
}

function upgradeDescription(id) {
  if (id === "damage") {
    return `Current ${cannonDamage()} direct damage. Each point adds +2 direct damage; Hotshot fire stays separate.`;
  }
  if (id === "fireRate") {
    return `Current ${cannonReload().toFixed(2)}s reload. Each point lowers reload by 0.02s, up to Lv.${MAX_RELOAD_UPGRADES}.`;
  }
  return `Current ${cannonRange()}m range. Each point adds +4m. Farther hits also deal up to +50% direct damage.`;
}

function renderShop() {
  const island = islands.find((item) => item.name === state.dockedAt) || islands[0];
  ui.tabs.forEach((item) => item.classList.toggle("active", item.dataset.tab === state.shopTab));
  if (state.shopTab === "goods") {
    const marketGoods = [...goods];
    if (island.name === "Portsmouth" || blubberCount() > 0) marketGoods.push("Whale Blubber");
    ui.shopBody.innerHTML = `<p class="stats">${island.culture} market | Hold ${cargoCount()}/${cargoCapacity()}${blubberCapacity() ? ` | Blubber ${blubberCount()}/${blubberCapacity()}` : ""}. Buy low, then sell where demand is higher.</p>` + marketGoods.map((name) => {
      const owned = state.cargo[name] || 0;
      const buyPrice = marketBuyPrice(island, name);
      const sellPrice = marketSellPrice(island, name);
      const actions = name === "Whale Blubber"
        ? `<button data-sell="${name}" ${sellPrice <= 0 ? "disabled" : ""}>Sell</button>`
        : `<button data-buy="${name}">Buy</button><button data-sell="${name}">Sell</button>`;
      return `<div class="row"><div><h3>${name} <span class="price">${buyPrice > 0 ? `Buy ${buyPrice}g / ` : ""}Sell ${sellPrice}g</span></h3><p>${tradeDescription(island, name, owned, buyPrice, sellPrice)}</p></div><div class="actions">${actions}</div></div>`;
    }).join("");
  } else if (state.shopTab === "ships") {
    const ships = availableShipsForIsland(island);
    ui.shopBody.innerHTML = `<p class="stats">${island.name} shipwrights sell ${island.culture} hulls. Faster ships usually have less armor; larger ships carry and push more.</p>` + ships.map((ship) => {
      const owned = ship.id === state.shipType;
      const preview = shipPreviewImage(ship.id);
      const previewMarkup = preview
        ? `<img class="ship-preview" src="${preview}" alt="${ship.name} preview">`
        : `<div class="ship-preview empty" aria-hidden="true"></div>`;
      return `<div class="row ship-row">${previewMarkup}<div class="ship-info"><div class="ship-title-line"><h3>${ship.name} <span class="price">${ship.price}g</span></h3><button data-ship="${ship.id}" ${owned ? "disabled" : ""}>${owned ? "Sailing" : "Buy"}</button></div><p>${shipRoleDescription(ship)}</p><p>HP ${ship.hp} / Armor ${Math.round(ship.armor * 100)}% / Speed ${ship.speed} / Regen ${ship.regen}/s / Hold ${ship.capacity}</p>${shipCompareMarkup(ship)}</div></div>`;
    }).join("");
  } else if (state.shopTab === "ammo") {
    const slotStatus = `<div class="ammo-slot-status">${state.ammoSlots.map((type, index) => {
      const ammo = type ? CANNONBALL_TYPES[type] : null;
      return `<span>${index + 1}: ${index === 0 ? "Basic" : ammo?.short || "Empty"}</span>`;
    }).join("")}</div>`;
    const replacePrompt = state.pendingAmmoAssign && CANNONBALL_TYPES[state.pendingAmmoAssign]
      ? `<div class="row"><div><h3>Hotbar Full</h3><p>Replace one non-basic slot with ${CANNONBALL_TYPES[state.pendingAmmoAssign].name}.</p></div><div class="actions">${[1, 2, 3, 4].map((slot) => `<button data-replace-ammo="${state.pendingAmmoAssign}" data-slot="${slot}">Slot ${slot + 1}</button>`).join("")}</div></div>`
      : "";
    const balloonRow = `<div class="row"><div><h3>Hot Air Balloon <span class="price">450g each</span></h3><p>Owned ${state.balloonStock}/${state.maxBalloons}. Ballooners can launch them for scouting and bombing.</p></div><div class="actions"><button data-buy-balloon="1" ${state.balloonStock >= state.maxBalloons ? "disabled" : ""}>Buy</button></div></div>`;
    ui.shopBody.innerHTML = `${slotStatus}${replacePrompt}` + SPECIAL_AMMO_TYPES.map((id) => {
      const ammo = CANNONBALL_TYPES[id];
      const owned = ammoCount(id);
      const description = ammoDescription(ammo);
      return `<div class="row"><div><h3>${ammo.name} <span class="price">${ammo.price}g each</span></h3><p>Owned ${owned}. ${description}</p></div><div class="actions"><button data-buy-ammo="${id}" data-amount="1">Buy</button><button data-buy-ammo="${id}" data-amount="5">Buy 5</button></div></div>`;
    }).join("") + balloonRow;
  } else {
    const ups = [
      ["damage", "Cannon Damage", upgradeDescription("damage")],
      ["fireRate", "Fire Rate", upgradeDescription("fireRate")],
      ["range", "Cannon Range", upgradeDescription("range")],
    ];
    ui.shopBody.innerHTML = `<p class="stats">Upgrade points: <b>${state.points}</b></p>` + ups.map(([id, name, desc]) => (
      `<div class="row"><div><h3>${name} Lv.${state.upgrades[id]}${id === "fireRate" ? `/${MAX_RELOAD_UPGRADES}` : ""}</h3><p>${desc}</p></div><button data-upgrade="${id}" ${id === "fireRate" && state.upgrades.fireRate >= MAX_RELOAD_UPGRADES ? "disabled" : ""}>${id === "fireRate" && state.upgrades.fireRate >= MAX_RELOAD_UPGRADES ? "Max" : "Spend"}</button></div>`
    )).join("");
  }
}

ui.shopBody.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const island = islands.find((item) => item.name === state.dockedAt);
  if (button.dataset.buy) {
    const name = button.dataset.buy;
    const price = marketBuyPrice(island, name);
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
    state.gold += marketSellPrice(island, name);
    addXP(4);
    toast(`Sold ${name}.`);
  }
  if (button.dataset.ship) {
    const ship = getShipStats(button.dataset.ship);
    if (state.gold < ship.price) return toast("Not enough gold.");
    if (cargoCount() > ship.capacity) return toast(`Sell cargo first. ${ship.name} holds ${ship.capacity}.`);
    if (blubberCount() > (ship.blubberCapacity || 0)) return toast(`${ship.name} cannot carry that much whale blubber.`);
    state.gold -= ship.price;
    replacePlayerShip(ship.id);
    if (ship.id === "ballooner") state.balloonStock = Math.max(state.balloonStock, 3);
    toast(`${ship.name} launched.`);
  }
  if (button.dataset.buyAmmo) {
    const ammo = CANNONBALL_TYPES[button.dataset.buyAmmo];
    if (!ammo || ammo.infinite) return;
    const amount = clamp(Math.floor(Number(button.dataset.amount) || 1), 1, 20);
    const cost = ammo.price * amount;
    if (state.gold < cost) return toast("Not enough gold.");
    state.gold -= cost;
    state.ammo[ammo.id] = ammoCount(ammo.id) + amount;
    const placed = placeAmmoOnHotbar(ammo.id);
    toast(placed ? `Bought ${amount} ${ammo.name}.` : `Bought ${amount} ${ammo.name}. Replace a hotbar slot.`);
  }
  if (button.dataset.replaceAmmo) {
    const ammo = CANNONBALL_TYPES[button.dataset.replaceAmmo];
    if (!ammo) return;
    assignAmmoSlot(button.dataset.slot, ammo.id);
    toast(`${ammo.name} assigned to slot ${Number(button.dataset.slot) + 1}.`);
  }
  if (button.dataset.buyBalloon) {
    if (state.balloonStock >= state.maxBalloons) return toast("You already have the maximum number of balloons.");
    if (state.gold < 450) return toast("Not enough gold.");
    state.gold -= 450;
    state.balloonStock++;
    toast("Hot air balloon purchased.");
  }
  if (button.dataset.upgrade) {
    if (state.points < 1) return toast("Level up to earn upgrade points.");
    if (button.dataset.upgrade === "fireRate" && state.upgrades.fireRate >= MAX_RELOAD_UPGRADES) return toast("Reload upgrade is maxed.");
    state.points--;
    state.upgrades[button.dataset.upgrade]++;
    toast("Upgrade installed.");
  }
  renderShop();
  updateHud();
});

function makeBalloonMesh() {
  const group = new THREE.Group();
  const envelope = new THREE.Mesh(new THREE.SphereGeometry(1.8, 18, 12), new THREE.MeshStandardMaterial({ color: 0xd85842, roughness: 0.82, metalness: 0.02 }));
  envelope.scale.set(1.05, 1.22, 1.05);
  envelope.position.y = 4.6;
  envelope.castShadow = true;
  group.add(envelope);
  const band = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.055, 6, 24), mat(0xf3d178));
  band.position.y = 4.2;
  group.add(band);
  const basket = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.72, 1.1), mats.plank);
  basket.position.y = 1.9;
  basket.castShadow = true;
  group.add(basket);
  for (const sx of [-0.45, 0.45]) {
    for (const sz of [-0.4, 0.4]) {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.5, 5), mat(0x3b2d24));
      rope.position.set(sx, 3.0, sz);
      rope.rotation.x = sx * 0.08;
      group.add(rope);
    }
  }
  group.userData.balloon = true;
  return group;
}

function activeBalloon() {
  return state.viewMode === "balloon" ? balloons[state.activeBalloonIndex] : null;
}

function ensureBalloonReticle() {
  if (balloonReticle) return balloonReticle;
  balloonReticle = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.75, 40), new THREE.MeshBasicMaterial({ color: 0xfff1a6, transparent: true, opacity: 0.82, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  balloonReticle.add(ring);
  const crossA = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.035, 0.08), new THREE.MeshBasicMaterial({ color: 0xfff1a6, transparent: true, opacity: 0.72 }));
  crossA.position.y = 0.04;
  balloonReticle.add(crossA);
  const crossB = crossA.clone();
  crossB.rotation.y = Math.PI / 2;
  balloonReticle.add(crossB);
  balloonReticle.visible = false;
  scene.add(balloonReticle);
  return balloonReticle;
}

function predictedBalloonBombPoint(balloon) {
  const plan = ensureBalloonBombPlan(balloon);
  const start = balloon.group.position.clone().add(plan.offset);
  const velocity = balloonBombVelocity(balloon, plan);
  return simulateBalloonBombImpact(start, velocity);
}

function updateBalloonReticle() {
  const reticle = ensureBalloonReticle();
  const balloon = activeBalloon();
  reticle.visible = Boolean(balloon && !balloon.destroyed && balloon.bomb && !balloon.landing);
  if (!reticle.visible) return;
  const point = predictedBalloonBombPoint(balloon);
  reticle.position.copy(point);
  const pulse = 1 + Math.sin(clock.elapsedTime * 5.4) * 0.08;
  reticle.scale.set(pulse, pulse, pulse);
}

function launchBalloon() {
  if (state.mode !== "ship" || state.shipType !== "ballooner") return toast("Only a Ballooner can launch hot air balloons.");
  if (balloons.filter((balloon) => !balloon.destroyed).length >= 3) return toast("Only 3 balloons can be launched at once.");
  if (state.balloonStock <= 0) return toast("No spare hot air balloons.");
  const group = makeBalloonMesh();
  group.position.copy(playerShip.position).add(new THREE.Vector3(0, 22, 0));
  group.rotation.y = state.rotation;
  scene.add(group);
  state.balloonStock--;
  balloons.push({
    group,
    hp: 100,
    velocity: new THREE.Vector3(Math.sin(state.rotation), 0, Math.cos(state.rotation)).multiplyScalar(6),
    rotation: state.rotation,
    bomb: true,
    landing: false,
    destroyed: false,
  });
  toast("Balloon launched. Press V to switch view.");
}

function ensureBalloonBombPlan(balloon) {
  if (!balloon.bombPlan) {
    balloon.bombPlan = {
      offset: new THREE.Vector3((Math.random() - 0.5) * 2.4, -2.1, (Math.random() - 0.5) * 2.4),
      drift: new THREE.Vector3((Math.random() - 0.5) * 2.4, -10, (Math.random() - 0.5) * 2.4),
    };
  }
  return balloon.bombPlan;
}

function balloonBombVelocity(balloon, plan = ensureBalloonBombPlan(balloon)) {
  return new THREE.Vector3(balloon.velocity.x, 0, balloon.velocity.z).multiplyScalar(0.85).add(plan.drift);
}

function simulateBalloonBombImpact(start, velocity) {
  const fallHeight = Math.max(0.01, start.y - 0.2);
  const time = Math.max(0.01, (velocity.y + Math.sqrt(velocity.y * velocity.y + 2 * BALLOON_BOMB_GRAVITY * fallHeight)) / BALLOON_BOMB_GRAVITY);
  return start.clone().add(velocity.clone().multiplyScalar(time)).setY(0.08);
}

function cycleViewMode() {
  const usable = balloons.filter((balloon) => !balloon.destroyed);
  if (!usable.length || state.viewMode !== "balloon") {
    if (!usable.length) {
      state.viewMode = "ship";
      state.activeBalloonIndex = -1;
      return toast("Ship view.");
    }
    state.viewMode = "balloon";
    state.activeBalloonIndex = balloons.indexOf(usable[0]);
    return toast("Balloon view.");
  }
  const current = usable.indexOf(balloons[state.activeBalloonIndex]);
  if (current < usable.length - 1) {
    state.activeBalloonIndex = balloons.indexOf(usable[current + 1]);
    toast("Next balloon view.");
  } else {
    state.viewMode = "ship";
    state.activeBalloonIndex = -1;
    toast("Ship view.");
  }
}

function landActiveBalloon() {
  const balloon = activeBalloon();
  if (!balloon || balloon.destroyed) return;
  balloon.landing = true;
  toast("Balloon descending. Keep it above the Ballooner.");
}

function destroyBalloon(balloon, cause = "crash") {
  if (!balloon || balloon.destroyed) return;
  balloon.destroyed = true;
  balloon.fallVelocity = -1.6;
  balloon.fallSpin = new THREE.Vector3((Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 1.0, (Math.random() - 0.5) * 1.8);
  balloon.cause = cause;
  if (state.activeBalloonIndex === balloons.indexOf(balloon)) {
    state.viewMode = "ship";
    state.activeBalloonIndex = -1;
  }
}

function dropBalloonBomb(balloon) {
  if (!balloon || balloon.destroyed) return;
  if (!balloon.bomb) return toast("This balloon has already dropped its bomb.");
  balloon.bomb = false;
  const plan = ensureBalloonBombPlan(balloon);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.72, 12, 9), mat(0x2f2a24));
  mesh.position.copy(balloon.group.position).add(plan.offset);
  mesh.castShadow = true;
  scene.add(mesh);
  balloonBombs.push({ mesh, start: mesh.position.clone(), velocity: balloonBombVelocity(balloon, plan), born: clock.elapsedTime });
  toast("Bomb away.");
}

function detonateAirburst(shot) {
  const center = shot.target.clone();
  center.y = 24;
  const group = new THREE.Group();
  group.position.copy(center);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), new THREE.MeshBasicMaterial({ color: 0xbfefff, transparent: true, opacity: 0.82 }));
  flash.userData.puff = true;
  group.add(flash);
  addImpactEffect(group, 0.45);
  balloons.forEach((balloon) => {
    if (balloon.destroyed) return;
    const d = balloon.group.position.distanceTo(center);
    if (d > 17) return;
    balloon.hp -= 40 + 20 * clamp(1 - d / 17, 0, 1);
    if (balloon.hp <= 0) destroyBalloon(balloon, "airburst");
  });
}

function detonateBalloonBomb(position) {
  makeSplashEffect(position);
  const boom = new THREE.Group();
  boom.position.copy(position).setY(1.2);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(2.8, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffd06b, transparent: true, opacity: 0.86 }));
  flash.userData.puff = true;
  boom.add(flash);
  for (let i = 0; i < 14; i++) {
    const shard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.8), mat(i % 2 ? 0x5a3725 : 0x2f2a24));
    shard.position.set((Math.random() - 0.5) * 2.2, 0.2 + Math.random() * 1.2, (Math.random() - 0.5) * 2.2);
    shard.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 8, 5 + Math.random() * 8, (Math.random() - 0.5) * 8);
    shard.userData.spin = new THREE.Vector3(Math.random() * 7, Math.random() * 7, Math.random() * 7);
    boom.add(shard);
  }
  addImpactEffect(boom, 0.9);
  addWaveHazard(position, { dps: 15, force: 24, radiusStart: 4, radiusEnd: 26, thickness: 4, life: 3.5, damageShips: true });
  const hitShip = (target, pos, type) => {
    const d = dist2(position, pos);
    if (d < shipHitRadius(type) + 4) damageTarget(target, 1000 * clamp(1 - d / 10, 0.35, 1));
  };
  if (state.mode === "ship") hitShip(state, playerShip.position, state.shipType);
  bots.forEach((bot) => hitShip(bot, bot.group.position, bot.shipType));
  animals.forEach((animal) => {
    const d = dist2(position, animal.group.position);
    if (d < animalHitRadius(animal) + 5) {
      animal.hp -= 700 * clamp(1 - d / 16, 0.25, 1);
      if (animal.hp <= 0) damageAnimal(animal, { ammoType: "bomb", damage: 9999, mesh: { position } });
    }
  });
  balloons.forEach((balloon) => {
    if (balloon.destroyed) return;
    const d = dist2(position, balloon.group.position);
    if (d < 9) {
      balloon.hp -= 100;
      if (balloon.hp <= 0) destroyBalloon(balloon, "bomb");
    }
  });
}

function updateBalloons(dt) {
  const controlled = activeBalloon();
  balloons.slice().forEach((balloon, index) => {
    if (balloon.destroyed) {
      balloon.fallVelocity = (balloon.fallVelocity || -1.6) - 7.5 * dt;
      balloon.group.position.y += balloon.fallVelocity * dt;
      balloon.group.position.x += Math.sin(clock.elapsedTime * 3.4 + index) * dt * 0.9;
      balloon.group.position.z += Math.cos(clock.elapsedTime * 2.9 + index) * dt * 0.9;
      balloon.group.rotation.x += dt * (balloon.fallSpin?.x || 0.8);
      balloon.group.rotation.y += dt * (balloon.fallSpin?.y || 0.4);
      balloon.group.rotation.z += dt * (balloon.fallSpin?.z || 1.0);
      if (balloon.group.position.y <= 0.4) {
        const pos = balloon.group.position.clone().setY(0);
        makeSplashEffect(pos);
        makeSplinterEffect(pos.clone().setY(0.8), new THREE.Vector3(1, 0, 0));
        if (state.mode === "ship" && dist2(balloon.group.position, playerShip.position) < shipHitRadius(state.shipType) + 3) damageTarget(state, 50);
        scene.remove(balloon.group);
        const actualIndex = balloons.indexOf(balloon);
        if (actualIndex >= 0) balloons.splice(actualIndex, 1);
      }
      return;
    }
    if (balloon === controlled && !balloon.landing) {
      const turn = (keys.has("a") ? 1 : 0) - (keys.has("d") ? 1 : 0);
      const throttle = (keys.has("w") ? 1 : 0) - (keys.has("s") ? 0.55 : 0);
      balloon.rotation += turn * dt * 1.7;
      const forward = new THREE.Vector3(Math.sin(balloon.rotation), 0, Math.cos(balloon.rotation));
      balloon.velocity.add(forward.multiplyScalar(throttle * 20 * dt));
      balloon.velocity.multiplyScalar(Math.pow(0.9, dt * 6));
    } else if (!balloon.landing) {
      balloon.velocity.multiplyScalar(Math.pow(0.58, dt * 6));
    }
    if (balloon === controlled || balloon.landing) {
      balloon.velocity.add(windAt(balloon.group.position).multiplyScalar(dt * (balloon.landing ? 0.45 : 2.35)));
    }
    if (balloon.landing) {
      const toShip = playerShip.position.clone().sub(balloon.group.position);
      toShip.y = 0;
      if (toShip.lengthSq() > 0.01) {
        toShip.normalize();
        balloon.velocity.lerp(toShip.multiplyScalar(12), clamp(dt * 2.2, 0, 0.2));
      }
      balloon.velocity.x += Math.sin(clock.elapsedTime * 2.4 + index) * dt * 0.75;
      balloon.velocity.z += Math.cos(clock.elapsedTime * 1.9 + index) * dt * 0.75;
      balloon.group.position.y -= dt * 4.8;
    }
    balloon.group.position.add(balloon.velocity.clone().multiplyScalar(dt));
    if (balloon.landing) {
      if (balloon.group.position.y <= 5.0 && dist2(balloon.group.position, playerShip.position) < shipHitRadius(state.shipType) + 4 && state.shipType === "ballooner") {
        const actualIndex = balloons.indexOf(balloon);
        scene.remove(balloon.group);
        if (actualIndex >= 0) balloons.splice(actualIndex, 1);
        state.balloonStock = Math.min(state.maxBalloons, state.balloonStock + 1);
        if (state.activeBalloonIndex === actualIndex) {
          state.viewMode = "ship";
          state.activeBalloonIndex = -1;
        }
        toast("Balloon recovered.");
        return;
      }
      if (balloon.group.position.y <= 0.55) {
        const pos = balloon.group.position.clone().setY(0);
        makeSplashEffect(pos);
        const actualIndex = balloons.indexOf(balloon);
        scene.remove(balloon.group);
        if (actualIndex >= 0) balloons.splice(actualIndex, 1);
        if (state.activeBalloonIndex === actualIndex) {
          state.viewMode = "ship";
          state.activeBalloonIndex = -1;
        }
        toast("Balloon splashed down.");
        return;
      }
    } else {
      balloon.group.position.y += (24 + Math.sin(clock.elapsedTime * 1.4 + index) * 1.2 - balloon.group.position.y) * clamp(dt * 0.8, 0, 0.05);
    }
    balloon.group.rotation.y = balloon.rotation;
    if (Math.abs(balloon.group.position.x) > WATERFALL_LIMIT || Math.abs(balloon.group.position.z) > WATERFALL_LIMIT) destroyBalloon(balloon, "edge");
  });
  for (let i = 0; i < balloons.length; i++) {
    for (let j = i + 1; j < balloons.length; j++) {
      if (!balloons[i].destroyed && !balloons[j].destroyed && balloons[i].group.position.distanceTo(balloons[j].group.position) < 3.2) {
        destroyBalloon(balloons[i], "collision");
        destroyBalloon(balloons[j], "collision");
      }
    }
  }
  balloonBombs.slice().forEach((bomb) => {
    const age = Math.max(0, clock.elapsedTime - (bomb.born ?? clock.elapsedTime));
    bomb.mesh.position.copy(bomb.start.clone().add(bomb.velocity.clone().multiplyScalar(age)));
    bomb.mesh.position.y = bomb.start.y + bomb.velocity.y * age - 0.5 * BALLOON_BOMB_GRAVITY * age * age;
    bomb.mesh.rotation.x += dt * 4;
    if (bomb.mesh.position.y <= 0.2) {
      const pos = bomb.mesh.position.clone().setY(0);
      scene.remove(bomb.mesh);
      balloonBombs.splice(balloonBombs.indexOf(bomb), 1);
      detonateBalloonBomb(pos);
    }
  });
}

function updateShip(dt) {
  const spec = getShipStats();
  state.cooldown = Math.max(0, state.cooldown - dt);
  state.rodCooldown = Math.max(0, state.rodCooldown - dt);
  updateFireDamage(state, dt, state.velocity.length());
  state.hp = clamp(state.hp + spec.regen * dt, 0, maxHp());
  updateDocking(dt);
  if (state.fallingOffWorld) {
    state.fallingTimer += dt;
    const outward = new THREE.Vector3(playerShip.position.x, 0, playerShip.position.z);
    if (outward.lengthSq() > 0.01) outward.normalize();
    state.velocity.add(outward.multiplyScalar(dt * 3.2));
    state.velocity.multiplyScalar(0.985);
    playerShip.position.add(state.velocity.clone().multiplyScalar(dt));
    playerShip.position.y -= (4.5 + state.fallingTimer * 8.5) * dt;
    playerShip.rotation.x += dt * (0.65 + state.fallingTimer * 0.18);
    playerShip.rotation.z += dt * (0.95 + state.fallingTimer * 0.22);
    if (Math.floor(state.fallingTimer * 6) !== Math.floor((state.fallingTimer - dt) * 6)) {
      makeSplashEffect(playerShip.position.clone().setY(0));
    }
    state.position.copy(playerShip.position);
    if (state.fallingTimer > 4.6) {
      state.fallingOffWorld = false;
      state.fallingTimer = 0;
      damageTarget(state, maxHp() * 4);
    }
    return;
  }
  if (state.leviathanGrabbed) {
    state.velocity.set(0, 0, 0);
    state.position.copy(playerShip.position);
    return;
  }
  if (state.viewMode === "balloon") {
    state.velocity.multiplyScalar(Math.pow(0.55, dt * 8));
    playerShip.position.y = SHIP_WATERLINE_Y + Math.sin(clock.elapsedTime * 2.8) * 0.08;
    state.position.copy(playerShip.position);
    return;
  }
  const turn = (keys.has("a") ? 1 : 0) - (keys.has("d") ? 1 : 0);
  const throttle = (keys.has("w") ? 1 : 0) - (keys.has("s") ? 0.55 : 0);
  state.rotation += turn * dt * (1.7 + spec.speed / 28);
  const forward = new THREE.Vector3(Math.sin(state.rotation), 0, Math.cos(state.rotation));
  state.velocity.add(forward.multiplyScalar(throttle * spec.speed * dt));
  const wind = windAt(playerShip.position);
  state.velocity.add(wind.multiplyScalar(dt * (Math.abs(throttle) > 0.05 ? 0.35 : 0.82)));
  state.velocity.multiplyScalar(Math.pow(0.86, dt * 9));
  const next = playerShip.position.clone().add(state.velocity.clone().multiplyScalar(dt));
  const hullRadius = shipHitRadius(state.shipType);
  const blockedIsland = islands.some((island) => dist2(next, island.group.position) < island.radius + hullRadius * 0.28);
  if (!blockedIsland) {
    playerShip.position.copy(next);
  } else {
    state.velocity.multiplyScalar(-0.22);
  }
  playerShip.rotation.y = state.rotation;
  playerShip.position.y = SHIP_WATERLINE_Y + Math.sin(clock.elapsedTime * 2.8) * 0.08;
  state.position.copy(playerShip.position);
  if (Math.abs(playerShip.position.x) > WATERFALL_LIMIT || Math.abs(playerShip.position.z) > WATERFALL_LIMIT) {
    state.fallingOffWorld = true;
    state.fallingTimer = 0;
    toast("You crossed the waterfall at the edge of the world.");
  } else if (Math.abs(playerShip.position.x) > MINIMAP_VISIBLE_LIMIT || Math.abs(playerShip.position.z) > MINIMAP_VISIBLE_LIMIT) summonLeviathan();
  crates.slice().forEach((crate) => {
    if (dist2(playerShip.position, crate.mesh.position) < hullRadius + 1.1) collectCrate(crate);
  });
}

function updateWalker(dt) {
  const island = islands.find((item) => item.name === state.dockedAt);
  if (!island) return;
  const turn = (keys.has("a") ? 1 : 0) - (keys.has("d") ? 1 : 0);
  character.rotation.y += turn * dt * 2.45;
  state.cameraYaw = lerpAngle(state.cameraYaw, character.rotation.y, 0.18);
  const throttle = (keys.has("w") ? 1 : 0) - (keys.has("s") ? 1 : 0);
  if (throttle) {
    const forward = new THREE.Vector3(Math.sin(character.rotation.y), 0, Math.cos(character.rotation.y));
    const next = character.position.clone().add(forward.multiplyScalar(throttle * dt * 10.5));
    const groundY = walkableGroundY(island, next);
    if (groundY !== null) {
      character.position.x = next.x;
      character.position.z = next.z;
    } else if (!state.grounded && throttle > 0) {
      const rawGround = islandGroundY(island, next);
      if (rawGround !== null) {
        character.position.x = next.x;
        character.position.z = next.z;
        state.walkHeight = Math.max(state.walkHeight, Math.min(1.4, rawGround - character.position.y + 0.6));
      }
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

function nearestBotEnemy(bot, maxDistance = 52) {
  let best = null;
  let bestDistance = maxDistance;
  bots.forEach((other) => {
    if (other === bot || other.hp <= 0) return;
    const distance = dist2(bot.group.position, other.group.position);
    if (distance < bestDistance) {
      best = other;
      bestDistance = distance;
    }
  });
  return best;
}

function startBotFeud(bot, enemy, seconds = 9) {
  if (!bot || !enemy) return;
  bot.targetBot = enemy.localId;
  bot.botFightUntil = clock.elapsedTime + seconds;
  if (Math.random() < 0.7) {
    enemy.targetBot = bot.localId;
    enemy.botFightUntil = clock.elapsedTime + seconds * 0.85;
  }
}

function botAimedTargetPoint(origin, targetPosition, targetVelocity = null, maxRange = BOT_CANNON_RANGE) {
  const target = targetPosition.clone();
  target.y = 0;
  const baseOffset = target.clone().sub(origin);
  baseOffset.y = 0;
  const distance = baseOffset.length();
  if (targetVelocity && distance > 0.01) {
    const leadTime = clamp(distance / CANNONBALL_SPEED, 0, 1.35);
    const lead = targetVelocity.clone();
    lead.y = 0;
    target.add(lead.multiplyScalar(leadTime * 0.82));
  }
  if (distance > 0.01) {
    const jitter = clamp(0.45 + distance * 0.012, 0.45, 1.4);
    target.x += (Math.random() - 0.5) * jitter;
    target.z += (Math.random() - 0.5) * jitter;
  }
  const offset = target.clone().sub(origin);
  offset.y = 0;
  const aimedDistance = offset.length();
  if (aimedDistance > maxRange && aimedDistance > 0.001) {
    target.copy(origin).add(offset.normalize().multiplyScalar(maxRange));
  }
  target.y = 0;
  return target;
}

function updateBots(dt) {
  if (multiplayer.serverWorld) {
    bots.forEach((bot, i) => {
      if (bot.serverPosition) {
        bot.velocity.copy(bot.serverPosition).sub(bot.group.position).multiplyScalar(1 / Math.max(dt, 0.001));
        bot.group.position.lerp(bot.serverPosition, clamp(dt * 8, 0, 0.35));
      }
      if (Number.isFinite(bot.serverRotation)) {
        bot.group.rotation.y = lerpAngle(bot.group.rotation.y, bot.serverRotation, clamp(dt * 7, 0, 0.32));
        bot.rotation = bot.group.rotation.y;
      }
      bot.group.position.y = SHIP_WATERLINE_Y + Math.sin(clock.elapsedTime * 2.4 + i) * 0.08;
      updateFireDamage(bot, dt, bot.velocity.length());
    });
    return;
  }
  bots.forEach((bot, i) => {
    const spec = getShipStats(bot.shipType);
    const playerDistance = dist2(bot.group.position, playerShip.position);
    let aggressive = state.mode === "ship" && ((bot.agroUntil || 0) > clock.elapsedTime || (bot.naturallyAggressive && playerDistance < 34));
    const lowHealth = bot.hp < spec.hp * 0.58;
    let fightingBot = bot.targetBot && bot.botFightUntil > clock.elapsedTime
      ? bots.find((other) => other.localId === bot.targetBot && other.hp > 0)
      : null;
    if (!fightingBot && !aggressive && Math.random() < dt * 0.018) {
      fightingBot = nearestBotEnemy(bot, 54);
      if (fightingBot) startBotFeud(bot, fightingBot, 8 + Math.random() * 8);
    }
    let pickupTarget = nearestPickupTo(bot.group.position, lowHealth ? 250 : 215, bot);
    const pickupDistance = pickupTarget ? dist2(bot.group.position, pickupTarget.mesh.position) : Infinity;
    const valuablePickup = pickupTarget && (pickupTarget.kind === "treasure" || pickupTarget.kind === "kraken");
    if (pickupTarget && (lowHealth || (!aggressive && !fightingBot) || (valuablePickup && pickupDistance < 155))) {
      if (lowHealth || valuablePickup) {
        aggressive = false;
        bot.agroUntil = 0;
        fightingBot = null;
        bot.targetBot = null;
        bot.botFightUntil = 0;
      }
    } else {
      pickupTarget = null;
    }
    const krakenEvade = activeKrakenEvadePoint(bot.group.position, bot.shipType);
    if (krakenEvade) {
      aggressive = false;
      bot.agroUntil = 0;
      fightingBot = null;
      bot.targetBot = null;
      bot.botFightUntil = 0;
      pickupTarget = null;
      bot.turn = Math.max(bot.turn, 2.4);
    }
    bot.turn -= dt;
    bot.fireCooldown = Math.max(0, (bot.fireCooldown || 0) - dt);
    if (krakenEvade) {
      bot.target = krakenEvade;
    } else if (aggressive) {
      bot.target = playerShip.position.clone();
    } else if (fightingBot) {
      bot.target = fightingBot.group.position.clone();
    } else if (pickupTarget) {
      bot.target = pickupTarget.mesh.position.clone();
    } else if (bot.turn < 0) {
      bot.turn = 4 + Math.random() * 7;
      bot.target = randomTravelWaterPoint(MAP_LIMIT * 0.92);
    }
    const target = bot.target || playerShip.position;
    const toTarget = target.clone().sub(bot.group.position);
    toTarget.y = 0;
    const targetDistance = toTarget.length();
    if (!aggressive && !fightingBot && !pickupTarget && targetDistance < 9) {
      bot.velocity.multiplyScalar(Math.pow(0.62, dt * 3));
      bot.turn = 1.5 + Math.random() * 2.5;
      bot.target = randomTravelWaterPoint(MAP_LIMIT * 0.92);
    }
    if (targetDistance > 5) {
      const avoidance = new THREE.Vector3();
      islands.forEach((island) => {
        const away = bot.group.position.clone().sub(island.group.position);
        away.y = 0;
        const distance = away.length();
        const danger = island.radius + shipHitRadius(bot.shipType) * 1.8 + 12;
        if (distance > 0.001 && distance < danger) avoidance.add(away.normalize().multiplyScalar((danger - distance) / danger * 38));
      });
      if (!aggressive && !fightingBot) {
        const awayFromStarter = bot.group.position.clone().sub(starterIslandCenter());
        awayFromStarter.y = 0;
        const starterDistance = awayFromStarter.length();
        if (starterDistance > 0.001 && starterDistance < CENTER_BOT_CLEAR_RADIUS) {
          avoidance.add(awayFromStarter.normalize().multiplyScalar((CENTER_BOT_CLEAR_RADIUS - starterDistance) / CENTER_BOT_CLEAR_RADIUS * 64));
          if (!pickupTarget && targetDistance < CENTER_BOT_CLEAR_RADIUS * 0.7) {
            bot.target = randomTravelWaterPoint(MAP_LIMIT * 0.92);
            bot.turn = Math.max(bot.turn, 2.5);
          }
        }
      }
      const edgeMargin = 44;
      const edgeX = MAP_LIMIT - Math.abs(bot.group.position.x);
      const edgeZ = MAP_LIMIT - Math.abs(bot.group.position.z);
      if (edgeX < edgeMargin) avoidance.x += -Math.sign(bot.group.position.x || 1) * ((edgeMargin - edgeX) / edgeMargin) * 48;
      if (edgeZ < edgeMargin) avoidance.z += -Math.sign(bot.group.position.z || 1) * ((edgeMargin - edgeZ) / edgeMargin) * 48;
      const avoidShip = (position, type, weight = 1) => {
        const away = bot.group.position.clone().sub(position);
        away.y = 0;
        const distance = away.length();
        const danger = shipSeparationDistance(bot.shipType, type) + 9;
        if (distance > 0.001 && distance < danger) avoidance.add(away.normalize().multiplyScalar((danger - distance) / danger * 18 * weight));
      };
      if (state.mode === "ship") avoidShip(playerShip.position, state.shipType, aggressive ? 0.55 : 1);
      bots.forEach((other) => {
        if (other !== bot) avoidShip(other.group.position, other.shipType, fightingBot === other ? 0.28 : 0.75);
      });
      remotePlayers.forEach((remote) => {
        if (remote.group.visible) avoidShip(remote.group.position, remote.shipType, 0.8);
      });
      if (krakenBoss?.alive && krakenBoss.group?.visible) {
        const head = krakenHeadWorldPosition();
        if (head) {
          const away = bot.group.position.clone().sub(head);
          away.y = 0;
          const krakenDistance = away.length();
          const danger = 48 + shipHitRadius(bot.shipType);
          if (krakenDistance > 0.001 && krakenDistance < danger) {
            avoidance.add(away.clone().normalize().multiplyScalar((danger - krakenDistance) / danger * (krakenEvade ? 130 : 54)));
            if (!krakenEvade && krakenDistance < 30 + shipHitRadius(bot.shipType) * 0.5) {
              aggressive = false;
              fightingBot = null;
              pickupTarget = null;
              bot.target = bot.group.position.clone().add(away.normalize().multiplyScalar(105));
              bot.turn = Math.max(bot.turn, 2.2);
            }
          }
        }
      }
      const steerTarget = toTarget.clone().add(avoidance);
      const desired = Math.atan2(steerTarget.x, steerTarget.z);
      const delta = angleDelta(desired, bot.rotation);
      const inCombat = aggressive || Boolean(fightingBot);
      const chasingPickup = Boolean(pickupTarget);
      const evadingKraken = Boolean(krakenEvade);
      const turnRate = evadingKraken ? 1.25 + spec.speed / 40 : inCombat ? 0.95 + spec.speed / 46 : chasingPickup ? 0.86 + spec.speed / 52 : 0.6 + spec.speed / 64;
      const turnStep = clamp(delta, -dt * turnRate, dt * turnRate);
      bot.rotation += turnStep;
      const forward = new THREE.Vector3(Math.sin(bot.rotation), 0, Math.cos(bot.rotation));
      const facing = clamp(Math.cos(delta), 0.18, 1);
      const arrive = evadingKraken ? 1 : chasingPickup ? clamp(targetDistance / 14, 0.24, 1) : clamp(targetDistance / (inCombat ? 20 : 34), 0.18, 1);
      const pickupCruise = pickupTarget?.kind === "treasure" || pickupTarget?.kind === "kraken" ? 0.6 : 0.48;
      const cruise = evadingKraken ? 0.74 : inCombat ? 0.48 : chasingPickup ? pickupCruise : 0.28;
      const desiredVelocity = forward.multiplyScalar(spec.speed * cruise * facing * arrive);
      bot.velocity.lerp(desiredVelocity, clamp(dt * (evadingKraken ? 2.1 : inCombat ? 1.5 : chasingPickup ? 1.35 : 1.0), 0, evadingKraken ? 0.26 : 0.18));
      bot.velocity.multiplyScalar(Math.pow(0.92, dt * 3));
      const next = bot.group.position.clone().add(bot.velocity.clone().multiplyScalar(dt));
      const blockedIsland = islands.find((island) => dist2(next, island.group.position) < island.radius + shipHitRadius(bot.shipType) * 0.6 + 5);
      const blocked = Boolean(blockedIsland);
      if (!blocked) bot.group.position.copy(next);
      else {
        bot.velocity.multiplyScalar(0.08);
        const away = Math.atan2(bot.group.position.x - blockedIsland.group.position.x, bot.group.position.z - blockedIsland.group.position.z);
        bot.rotation = lerpAngle(bot.rotation, away, 0.08);
        bot.target = randomTravelWaterPoint(MAP_LIMIT * 0.92);
        bot.agroUntil = 0;
        bot.targetBot = null;
        bot.turn = 2 + Math.random() * 3;
      }
      bot.group.rotation.y = bot.rotation;
    }
    bot.group.position.y = SHIP_WATERLINE_Y + Math.sin(clock.elapsedTime * 2.4 + i) * 0.08;
    updateFireDamage(bot, dt, bot.velocity.length());
    botCollectCrates(bot);
    const shotTarget = aggressive ? playerShip : fightingBot?.group;
    const shotDir = shotTarget ? shotTarget.position.clone().sub(bot.group.position) : new THREE.Vector3();
    shotDir.y = 0;
    const facing = shotDir.lengthSq()
      ? new THREE.Vector3(Math.sin(bot.rotation), 0, Math.cos(bot.rotation)).dot(shotDir.clone().normalize())
      : 0;
    const shotDistance = shotDir.length();
    const canFire = shotTarget && bot.fireCooldown <= 0 && facing > 0.45;
    const botRange = botCannonRange(bot);
    if (canFire && shotDistance <= botRange && shotDistance > 0.01) {
      const targetVelocity = fightingBot ? fightingBot.velocity : state.velocity;
      const origin = bot.group.position.clone();
      const targetPoint = botAimedTargetPoint(origin, shotTarget.position, targetVelocity, botRange);
      const shot = targetPoint.clone().sub(origin);
      shot.y = 0;
      if (shot.lengthSq() < 0.01) return;
      shot.normalize();
      const damage = scaleDamageByRange(botCannonDamage(bot), shotDistance, botRange);
      makeProjectile(
        bot.localId,
        origin.add(shot.clone().multiplyScalar(3.4)),
        shot,
        damage,
        botRange,
        { target: targetPoint, targetKind: fightingBot ? "bot" : "player" },
      );
      bot.fireCooldown = botCannonReload(bot);
    }
  });
}

function updateProjectiles(dt) {
  const now = Date.now();
  projectiles.slice().forEach((shot) => {
    if (now - (shot.createdWallAt || now) > (shot.maxWallAge || 4200)) {
      removeProjectile(shot);
      return;
    }
    shot.traveled += shot.speed * dt;
    const progress = clamp(shot.traveled / shot.distance, 0, 1);
    shot.mesh.position.lerpVectors(shot.start, shot.target, progress);
    if (!shot.airburst) {
      shot.mesh.position.y = 1.05 + Math.sin(progress * Math.PI) * shot.arcHeight + Math.sin(clock.elapsedTime * 16) * 0.08;
    } else {
      shot.mesh.position.y += Math.sin(progress * Math.PI) * 1.8;
    }
    shot.trailPoints.push(shot.mesh.position.clone());
    while (shot.trailPoints.length > 7) shot.trailPoints.shift();
    shot.trail.geometry.setFromPoints(shot.trailPoints);
    shot.trail.material.opacity = 0.28 + 0.34 * (1 - progress);
    let hit = false;
    if (shot.owner === playerId) {
      if (shot.ammoType === "airburst" && progress >= 0.92) {
        detonateAirburst(shot);
        hit = true;
      }
      animals.forEach((animal) => {
        if (!hit && projectileHitsAnimal(shot, animal)) {
          damageAnimal(animal, shot);
          hit = true;
        }
      });
      if (shot.ammoType !== "airburst") {
        bots.forEach((bot) => {
          if (!hit && projectileHitsShip(shot, bot.group, bot.shipType)) {
            const hitPosition = shot.mesh.position.clone();
            if (multiplayer.serverWorld && bot.serverId) {
              sendMultiplayer({ type: "hitBot", id: bot.serverId, damage: shot.damage, fire: shot.fire || null });
              if (shot.fire) igniteTarget(bot, shot.fire, hitPosition, true);
            } else {
              damageTarget(bot, shot.damage, { fire: shot.fire, hitPosition });
            }
            addXP(1 + Math.floor(shot.damage / 27));
            hit = true;
          }
        });
        remotePlayers.forEach((remote) => {
          if (!hit && projectileHitsShip(shot, remote.group, remote.shipType)) {
            if (remote.mode !== "land") addXP(2 + Math.floor(shot.damage / 24));
            if (shot.fire) igniteTarget(remote, shot.fire, shot.mesh.position.clone(), true);
            hit = true;
          }
        });
        if (!hit && projectileHitsKraken(shot)) {
          if (multiplayer.serverWorld) sendMultiplayer({ type: "hitKraken", damage: shot.damage });
          krakenBoss.hp = Math.max(0, (krakenBoss.hp || 0) - shot.damage);
          hit = true;
        }
      }
    } else if (shot.targetKind !== "bot" && state.mode === "ship" && projectileHitsShip(shot, playerShip, state.shipType)) {
      damageTarget(state, shot.damage, { fire: shot.fire, hitPosition: shot.mesh.position.clone() });
      hit = true;
    } else if (!multiplayer.serverWorld && shot.targetKind !== "player") {
      bots.forEach((bot) => {
        if (!hit && bot.localId !== shot.owner && projectileHitsShip(shot, bot.group, bot.shipType)) {
          damageTarget(bot, shot.damage, { fire: shot.fire, hitPosition: shot.mesh.position.clone() });
          hit = true;
        }
      });
    }
    if (progress >= 1 || hit) {
      removeProjectile(shot, hit ? "hit" : "splash");
    }
  });
}

function updateKrakenAttackEffect(effect, t) {
  const ease = (value) => value * value * (3 - 2 * value);
  const rise = ease(clamp(t / 0.36, 0, 1));
  const slam = ease(clamp((t - (KRAKEN_SLAM_T - 0.06)) / 0.12, 0, 1));
  const after = ease(clamp((t - KRAKEN_SLAM_T) / 0.22, 0, 1));
  effect.group.children.forEach((child) => {
    if (child.userData.krakenAttackTentacle) {
      child.visible = true;
      const curve = krakenAttackCurve(child.userData.attackData, t);
      child.geometry.dispose();
      child.geometry = makeTaperedTubeGeometry(curve, child.userData.baseRadius, child.userData.tipRadius, child.userData.tubeOptions);
      effect.group.userData.latestAttackCurve = curve;
    }
    if (child.userData.krakenAttackSucker) {
      const curve = effect.group.userData.latestAttackCurve;
      if (!curve) return;
      const point = curve.getPoint(clamp(child.userData.curveT, 0, 1));
      child.visible = t > 0.08 && point.y > -6;
      child.position.copy(point);
      child.position.y -= 0.42;
      const scale = 0.68 + rise * 0.32;
      child.scale.set(1, 0.28, 0.86).multiplyScalar(scale);
    }
    if (child.userData.krakenRiseSplash) {
      child.visible = t < 0.52;
      const scale = 0.8 + rise * 2.9;
      child.scale.set(scale, scale, scale);
      child.material.opacity = Math.max(0, 0.58 * (1 - rise));
    }
    if (child.userData.krakenSplash) {
      child.visible = t >= KRAKEN_SLAM_T;
      const scale = 0.9 + slam * 0.65 + after * 2.0;
      child.scale.set(scale, scale, scale);
      child.material.opacity = Math.max(0, 0.92 * (1 - after));
    }
    if (child.userData.krakenWaterWall) {
      const local = clamp((t - KRAKEN_SLAM_T) / 0.48, 0, 1);
      child.visible = local > 0 && local < 1;
      const surge = ease(clamp(local / 0.42, 0, 1));
      const fall = ease(clamp((local - 0.32) / 0.68, 0, 1));
      child.scale.y = 0.35 + surge * 1.35;
      child.scale.x = 0.8 + local * 0.65;
      child.position.y = child.userData.baseY + surge * 5.2 - fall * 7.8;
      child.material.opacity = Math.max(0, 0.72 * (1 - fall));
    }
    if (child.userData.krakenSlamSpray) {
      const local = clamp((t - KRAKEN_SLAM_T) / 0.44, 0, 1);
      child.visible = local > 0 && local < 1;
      child.position.copy(child.userData.start);
      child.position.addScaledVector(child.userData.velocity, local);
      child.position.y = child.userData.start.y + child.userData.velocity.y * local - 15.5 * local * local;
      child.material.opacity = Math.max(0, 0.9 * (1 - local));
    }
  });
}

function updateImpactEffects(dt) {
  impactEffects.slice().forEach((effect) => {
    effect.age += dt;
    const t = clamp(effect.age / effect.life, 0, 1);
    const fade = 1 - t;
    if (effect.group.userData.krakenAttack) updateKrakenAttackEffect(effect, t);
    effect.group.children.forEach((child) => {
      if (effect.group.userData.krakenAttack && (
        child.userData.krakenAttackTentacle
        || child.userData.krakenAttackSucker
        || child.userData.krakenRiseSplash
        || child.userData.krakenSplash
        || child.userData.krakenWaterWall
        || child.userData.krakenSlamSpray
      )) return;
      if (child.userData.velocity) {
        child.position.addScaledVector(child.userData.velocity, dt);
        child.userData.velocity.y -= 8.5 * dt;
      }
      if (child.userData.spin) {
        child.rotation.x += child.userData.spin.x * dt;
        child.rotation.y += child.userData.spin.y * dt;
        child.rotation.z += child.userData.spin.z * dt;
      }
      if (child.userData.puff) {
        const scale = 1 + t * 2.6;
        child.scale.setScalar(scale);
      } else if (child.geometry?.type === "RingGeometry") {
        const scale = 1 + t * 2.8;
        child.scale.set(scale, scale, scale);
      }
      if (child.material) child.material.opacity = Math.max(0, fade * (child.userData.puff ? 0.45 : 0.9));
    });
    if (effect.age >= effect.life) {
      scene.remove(effect.group);
      effect.group.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      impactEffects.splice(impactEffects.indexOf(effect), 1);
    }
  });
}

function updateFish(dt) {
  fish.forEach((item, i) => {
    item.userData.phase += dt;
    const bait = state.fishing?.phase === "waiting" ? fishingBobber?.position : null;
    let direction = item.userData.direction || 0;
    if (bait && dist2(item.position, bait) < (item.userData.kind === "squid" ? 45 : 30)) {
      direction = Math.atan2(bait.x - item.position.x, bait.z - item.position.z);
      item.userData.direction = lerpAngle(item.userData.direction || direction, direction, clamp(dt * 2.2, 0, 0.18));
      if (dist2(item.position, bait) < fishHitRadius(item) + 0.72 && state.fishing) {
        state.fishing.target = item;
        state.fishing.phase = "reeling";
        state.fishing.timer = 0;
        toast(`${item.userData.kind === "squid" ? "Squid" : "Fish"} on the line!`);
      }
    } else if (Math.random() < dt * 0.28) {
      item.userData.direction += (Math.random() - 0.5) * 0.9;
    }
    direction = item.userData.direction || direction;
    const speed = item.userData.speed || 8;
    const next = item.position.clone();
    next.x += Math.sin(direction) * speed * dt;
    next.z += Math.cos(direction) * speed * dt;
    const hitRadius = fishHitRadius(item);
    if (Math.abs(next.x) > MAP_LIMIT * 0.95 || Math.abs(next.z) > MAP_LIMIT * 0.95 || pointInAnyIsland(next, hitRadius + 5)) {
      item.userData.direction += Math.PI * (0.85 + Math.random() * 0.3);
      item.position.x = clamp(item.position.x, -MAP_LIMIT * 0.94, MAP_LIMIT * 0.94);
      item.position.z = clamp(item.position.z, -MAP_LIMIT * 0.94, MAP_LIMIT * 0.94);
    } else {
      item.position.copy(next);
    }
    item.rotation.y = direction;
    const pulse = 1 + Math.sin(item.userData.phase * 5) * 0.12;
    item.scale.set(pulse, 1, pulse);
  });
  if (state.fishing) {
    state.fishing.timer += dt;
    const targetPos = state.fishing.target?.position || state.fishing.castPoint;
    if (state.fishing.phase === "waiting") {
      fishingBobber.position.copy(state.fishing.castPoint);
      fishingBobber.position.y = 0.2 + Math.sin(clock.elapsedTime * 9) * 0.12;
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
  if (!multiplayer.serverWorld) {
    treasureSpawnTimer -= dt;
    if (treasureSpawnTimer <= 0) {
      treasureSpawnTimer = 28 + Math.random() * 42;
      const treasureCount = crates.filter((crate) => crate.kind === "treasure").length;
      if (treasureCount < MAX_TREASURES && Math.random() < 0.45) spawnTreasure();
    }
  }
  crates.slice().forEach((crate) => {
    if (crate.born === undefined) crate.born = clock.elapsedTime;
    crate.mesh.rotation.y += dt * (crate.kind === "treasure" || crate.kind === "kraken" ? 0.92 : 0.65);
    const age = clock.elapsedTime - crate.born;
    const lifetime = crate.kind === "kraken" ? CRATE_LIFETIME * 4 : CRATE_LIFETIME;
    const sink = clamp((age - lifetime) / CRATE_SINK_TIME, 0, 1);
    const baseY = crate.kind === "kraken" ? 0.54 : crate.kind === "treasure" ? 0.78 : 0.72;
    crate.mesh.position.y = baseY + Math.sin(clock.elapsedTime * 2 + crate.mesh.id) * 0.1 - sink * 1.8;
    const baseScale = crate.kind === "kraken" ? 1.2 : crate.kind === "treasure" ? 1.08 : 1;
    crate.mesh.scale.setScalar(baseScale * (1 - sink * 0.35));
    if (!crate.serverId && age > lifetime + CRATE_SINK_TIME) removeCrate(crate);
  });
}

function updateLeviathan(dt) {
  if (!leviathan?.group) return;
  const age = clock.elapsedTime - leviathan.born;
  const ease = (value) => value * value * (3 - 2 * value);
  const sideDir = leviathan.sideDir || new THREE.Vector3(1, 0, 0);
  const jawForward = sideDir.clone().multiplyScalar(-1);
  leviathan.group.rotation.y = Math.atan2(sideDir.x, sideDir.z);

  const leapDuration = 3.15;
  if (!leviathan.crushed) {
    if (age < 2.75 && state.mode === "ship") {
      const liveTarget = playerShip.position.clone();
      liveTarget.y = 0;
      leviathan.impactPoint.lerp(liveTarget, clamp(dt * 5.6, 0, 0.7));
      leviathan.smashPosition.copy(leviathan.impactPoint).add(sideDir.clone().multiplyScalar(8.6));
      leviathan.smashPosition.y = 0.55;
      leviathan.divePosition.copy(leviathan.impactPoint).add(sideDir.clone().multiplyScalar(-30));
      leviathan.divePosition.y = -24;
    }

    const leapT = ease(clamp(age / leapDuration, 0, 1));
    const leapPosition = leviathan.startPosition.clone().lerp(leviathan.smashPosition, leapT);
    leapPosition.y = leviathan.startPosition.y
      + (leviathan.smashPosition.y - leviathan.startPosition.y) * leapT
      + Math.sin(leapT * Math.PI) * 43;
    leviathan.group.position.copy(leapPosition);
    const arcLift = Math.sin(leapT * Math.PI);
    const tipDown = ease(clamp((leapT - 0.12) / 0.82, 0, 1));
    const slamLean = ease(clamp((age - 2.48) / 0.58, 0, 1));
    leviathan.group.rotation.z = Math.sin(clock.elapsedTime * 3.1) * 0.065 * (1 - slamLean);
    leviathan.group.rotation.x = (0.48 * (1 - tipDown) - 1.0 * tipDown + arcLift * 0.14) * (1 - slamLean) - 1.18 * slamLean;
    leviathan.group.scale.setScalar(1.06 + arcLift * 0.22 + slamLean * 0.12);
    setLeviathanJawOpen(leviathan.group, 0.95 - slamLean * 0.28);

    if (age >= leapDuration) {
      leviathan.crushed = true;
      leviathan.slamAt = clock.elapsedTime;
      const hit = state.mode === "ship" && leviathanAttackHits(playerShip.position, leviathan.impactPoint, sideDir, state.shipType);
      if (hit) {
        state.leviathanGrabbed = true;
        state.velocity.set(0, 0, 0);
        playerShip.position.copy(leviathan.impactPoint);
        playerShip.position.y = SHIP_WATERLINE_Y + 0.18;
        state.position.copy(playerShip.position);
        makeSplinterEffect(playerShip.position.clone().add(new THREE.Vector3(0, 1.0, 0)), jawForward);
        playerShip.visible = false;
      } else {
        leviathan.missed = true;
      }
      makeLeviathanAttackEffect(leviathan.impactPoint.clone().setY(0), sideDir, hit ? "crush" : "miss");
    }
    return;
  }

  const slamAge = clock.elapsedTime - leviathan.slamAt;
  const diveT = ease(clamp(slamAge / 2.25, 0, 1));
  const divePosition = leviathan.smashPosition.clone().lerp(leviathan.divePosition, diveT);
  divePosition.y = leviathan.smashPosition.y
    + (leviathan.divePosition.y - leviathan.smashPosition.y) * diveT
    + Math.sin(diveT * Math.PI) * 5.5;
  leviathan.group.position.copy(divePosition);
  leviathan.group.rotation.z = Math.sin(clock.elapsedTime * 4.6) * 0.045 * (1 - diveT);
  leviathan.group.rotation.x = -1.18 + diveT * 1.36;
  leviathan.group.scale.setScalar(1.18 - diveT * 0.16);
  setLeviathanJawOpen(leviathan.group, 0.67 - diveT * 0.26, diveT * 0.1);

  if (state.leviathanGrabbed && !leviathan.damaged) {
    state.velocity.set(0, 0, 0);
    state.position.copy(playerShip.position);
  }

  if (!leviathan.missed && !leviathan.damaged && slamAge > 0.48) {
    leviathan.damaged = true;
    damageTarget(state, maxHp() * 4);
  }

  if (slamAge > 2.45 || age > 6.4) {
    state.leviathanGrabbed = false;
    scene.remove(leviathan.group);
    leviathan = null;
  }
}

function updateKraken(dt) {
  if (!krakenBoss?.group) return;
  const ease = (value) => value * value * (3 - 2 * value);
  const now = clock.elapsedTime;
  if (krakenBoss.alive) {
    krakenBoss.group.position.y = Math.sin(clock.elapsedTime * 0.58) * 0.18;
  }
  krakenBoss.group.children.forEach((child) => {
    if (child.userData?.tentacle) {
      const started = child.userData.submergeStart;
      let dive = 0;
      if (Number.isFinite(started)) {
        const until = child.userData.submergeUntil || started + KRAKEN_ATTACK_LIFE * 0.82;
        const down = ease(clamp((now - started) / 0.8, 0, 1));
        const up = ease(clamp((now - until) / 1.25, 0, 1));
        dive = down * (1 - up);
        if (now > until + 1.35) {
          delete child.userData.submergeStart;
          delete child.userData.submergeUntil;
          delete child.userData.submergeDepth;
        }
      }
      child.visible = dive < 0.72;
      if (!Number.isFinite(child.userData.homeX)) {
        child.userData.homeX = child.position.x;
        child.userData.homeZ = child.position.z;
      }
      const sway = Math.sin(now * 0.46 + child.userData.phase) * 0.28;
      const bob = Math.sin(now * 0.82 + child.userData.phase) * 0.34;
      child.position.y = (child.userData.homeY || 0) + bob - dive * (child.userData.submergeDepth || 18);
      child.position.x = child.userData.homeX + Math.sin(now * 0.31 + child.userData.phase) * 0.18;
      child.position.z = child.userData.homeZ + Math.cos(now * 0.28 + child.userData.phase) * 0.18;
      child.rotation.x = Math.sin(now * 0.54 + child.userData.phase) * 0.07 + dive * 0.18;
      child.rotation.y = Math.sin(now * 0.7 + child.userData.phase) * 0.13 + sway * 0.05;
      child.rotation.z = Math.cos(now * 0.52 + child.userData.phase) * 0.09;
    }
    if (child.userData?.krakenWaterRing) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 1.4 + child.userData.phase) * 0.12;
      child.scale.set(pulse, pulse, pulse);
      child.material.opacity = 0.35 + Math.sin(clock.elapsedTime * 1.8 + child.userData.phase) * 0.08;
    }
  });
}

function updateCamera(dt) {
  if (keys.has("arrowleft")) state.cameraYaw += 1.9 * dt;
  if (keys.has("arrowright")) state.cameraYaw -= 1.9 * dt;
  if (keys.has("arrowup")) state.cameraPitch = clamp(state.cameraPitch + 0.55 * dt, -0.18, 0.92);
  if (keys.has("arrowdown")) state.cameraPitch = clamp(state.cameraPitch - 0.55 * dt, -0.18, 0.92);
  camera.up.set(0, 1, 0);
  if (state.mode === "land") {
    if (character) character.visible = false;
    const eye = character.position.clone().add(new THREE.Vector3(0, 1.18, 0));
    const yaw = character.rotation.y;
    const look = eye.clone().add(new THREE.Vector3(Math.sin(yaw), clamp(state.cameraPitch * 0.75 - 0.12, -0.28, 0.58), Math.cos(yaw)).normalize().multiplyScalar(16));
    camera.position.lerp(eye, 0.36);
    camera.lookAt(look);
    labels.forEach((label) => label.lookAt(camera.position));
    return;
  }
  if (character) character.visible = false;
  const balloon = activeBalloon();
  if (balloon && !balloon.destroyed) {
    camera.up.set(0, 0, -1);
    const height = clamp(54 + state.cameraPitch * 18, 48, 72);
    const desired = balloon.group.position.clone().add(new THREE.Vector3(0, height, 0));
    camera.position.lerp(desired, 0.18);
    camera.lookAt(balloon.group.position.x, balloon.group.position.y - 18, balloon.group.position.z + 0.01);
    labels.forEach((label) => label.lookAt(camera.position));
    return;
  }
  const target = state.mode === "ship" ? playerShip.position : character.position;
  const cameraHeight = clamp(22 + state.cameraPitch * 48, 8, 70);
  const orbitRadius = clamp(62 - state.cameraPitch * 18, 36, 68);
  const offset = new THREE.Vector3(Math.sin(state.cameraYaw) * orbitRadius, cameraHeight, Math.cos(state.cameraYaw) * orbitRadius);
  const desired = target.clone().add(offset);
  desired.y = Math.max(2.8, desired.y);
  camera.position.lerp(desired, 0.08);
  camera.lookAt(target.x, target.y + clamp(state.cameraPitch * 6, 0, 7), target.z);
  labels.forEach((label) => label.lookAt(camera.position));
}

function updateHud() {
  if (state.infiniteGold) state.gold = 999999999;
  const spec = getShipStats();
  ui.playerName.textContent = captainName();
  ui.modeLabel.textContent = state.mode === "ship" ? "At sea" : `Docked: ${state.dockedAt}`;
  ui.hpBar.style.width = `${clamp((state.hp / maxHp()) * 100, 0, 100)}%`;
  ui.xpBar.style.width = state.level >= MAX_PLAYER_LEVEL ? "100%" : `${clamp((state.xp / xpForLevel(state.level)) * 100, 0, 100)}%`;
  const levelLabel = state.level >= MAX_PLAYER_LEVEL ? `Lv.${MAX_PLAYER_LEVEL} MAX` : `Lv.${state.level}`;
  const fireLabel = state.fire ? ` | Burning ${Math.ceil(state.fire.remaining)}s` : "";
  const blubberLabel = blubberCapacity() ? ` | Blubber ${blubberCount()}/${blubberCapacity()}` : "";
  ui.statsLine.textContent = `${levelLabel} | ${Math.floor(state.gold)}g | ${spec.name} | HP ${Math.ceil(state.hp)}/${spec.hp} | Armor ${Math.round(spec.armor * 100)}% | Speed ${spec.speed} | Regen ${spec.regen} | Hold ${cargoCount()}/${cargoCapacity()}${blubberLabel}${fireLabel}`;
  const entries = Object.entries(state.cargo).filter(([, count]) => count > 0);
  ui.cargoList.innerHTML = entries.length ? entries.map(([name, count]) => `<span>${name} x${count}</span>`).join("") : "<span>Empty hold</span>";
  const island = currentIsland();
  const showPrompt = ui.shop.classList.contains("hidden") && (island || state.mode === "land");
  ui.dockPrompt.classList.toggle("hidden", !showPrompt);
  if (showPrompt) {
    ui.dockPrompt.innerHTML = state.docking
      ? `Docking ${state.docking.island}: <b>${Math.ceil(state.docking.remaining)}s</b>`
      : state.mode === "ship"
      ? `Press <b>T</b> to dock at ${island.name}`
      : `Press <b>C</b> to set sail or <b>R</b> for the shop`;
  }
  updateSpyPanel();
  updateAmmoHotbar();
  renderLeaderboard();
}

function renderLeaderboard() {
  if (!ui.leaderboardList || ui.leaderboardPanel.classList.contains("hidden")) return;
  const rows = [
    { name: captainName(), gold: Math.floor(state.gold), self: true },
    ...[...remotePlayers.values()].map((player) => ({
      name: player.name || "Captain",
      gold: Math.floor(Number(player.gold) || 0),
      self: false,
    })),
  ]
    .sort((a, b) => b.gold - a.gold)
    .slice(0, 10);
  ui.leaderboardList.innerHTML = rows.map((row) => (
    `<li${row.self ? ' class="self"' : ""}><span>${escapeMarkup(row.name)}</span><b>${row.gold}g</b></li>`
  )).join("");
}

function escapeMarkup(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
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
  ui.spyName.textContent = target.name;
  ui.spyDetails.innerHTML = `Lv.${target.level} | ${distance}m | ${target.threat}<br>HP ${Math.ceil(target.hp)}/${target.max} (${hpPct}%) | Armor ${Math.round(target.armor * 100)}%<br>Speed ${target.speed} | Regen ${target.regen}/s | Crates ${target.crateEstimate}`;
}

function mapPoint(x, z) {
  const range = MINIMAP_VISIBLE_LIMIT;
  const size = ui.minimap.width;
  return {
    x: size * 0.5 + (x / range) * size * 0.5,
    y: size * 0.5 + (z / range) * size * 0.5,
  };
}

function drawMapDot(ctx, x, z, radius, color, stroke = null) {
  const { x: px, y: py } = mapPoint(x, z);
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
  return { x: px, y: py };
}

function drawKrakenMapMarker(ctx, x, z, ratio, hp, maxHp) {
  const pos = mapPoint(x, z);
  const pulse = (Math.sin(clock.elapsedTime * 3.4) + 1) * 0.5;
  const radius = (5.8 + pulse * 0.9) * ratio;
  const hpRatio = clamp((Number(hp) || 0) / Math.max(1, Number(maxHp) || 10000), 0, 1);
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.lineCap = "round";

  ctx.fillStyle = "rgba(184,39,36,0.94)";
  ctx.strokeStyle = "rgba(243,195,59,0.9)";
  ctx.lineWidth = 1.5 * ratio;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,238,166,0.58)";
  ctx.lineWidth = 0.9 * ratio;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 2.3 * ratio, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#f3c33b";
  ctx.lineWidth = 1.4 * ratio;
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.rotate((Math.PI * 2 * i) / 6 + Math.sin(clock.elapsedTime * 1.2) * 0.08);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(1.8 * ratio, -2.0 * ratio, 4.0 * ratio, -1.2 * ratio, 5.4 * ratio, -3.4 * ratio);
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = "#e95055";
  ctx.lineWidth = 1.7 * ratio;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 4.0 * ratio, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpRatio);
  ctx.stroke();

  ctx.restore();
  return pos;
}

function updateMinimap() {
  if (!minimapCtx || ui.minimapPanel.classList.contains("hidden")) return;
  const canvas = ui.minimap;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  const cssSize = Math.max(120, Math.round(canvas.clientWidth || 180));
  const pixelSize = Math.round(cssSize * ratio);
  if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
    canvas.width = pixelSize;
    canvas.height = pixelSize;
  }
  const ctx = minimapCtx;
  const size = canvas.width;
  const expanded = ui.minimapPanel.classList.contains("expanded");
  ctx.clearRect(0, 0, size, size);
  const sea = ctx.createLinearGradient(0, 0, size, size);
  sea.addColorStop(0, "#8de6ee");
  sea.addColorStop(1, "#279abd");
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const p = (size / 4) * i;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }
  storms.forEach((storm) => {
    const pos = mapPoint(storm.group.position.x, storm.group.position.z);
    const r = Math.max(8, storm.radius * size / (MINIMAP_VISIBLE_LIMIT * 2));
    const cloud = ctx.createRadialGradient(pos.x, pos.y, r * 0.15, pos.x, pos.y, r);
    cloud.addColorStop(0, "rgba(35,39,47,0.5)");
    cloud.addColorStop(1, "rgba(35,39,47,0.12)");
    ctx.fillStyle = cloud;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(217,251,255,0.42)";
    ctx.lineWidth = 1.2 * ratio;
    ctx.beginPath();
    ctx.moveTo(pos.x - 2 * ratio, pos.y - 5 * ratio);
    ctx.lineTo(pos.x + 2 * ratio, pos.y - 1 * ratio);
    ctx.lineTo(pos.x - 1 * ratio, pos.y - 1 * ratio);
    ctx.lineTo(pos.x + 3 * ratio, pos.y + 5 * ratio);
    ctx.stroke();
  });
  ui.toggleWindMap?.classList.toggle("active", state.showWindMarkers);
  if (state.showWindMarkers) {
    windCurrents.forEach((wind) => {
      const pos = mapPoint(wind.x, wind.z);
      const len = 8 * ratio;
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(Math.PI - wind.dir);
      ctx.strokeStyle = "rgba(255,253,242,0.72)";
      ctx.fillStyle = "rgba(255,253,242,0.72)";
      ctx.lineWidth = 1.2 * ratio;
      ctx.beginPath();
      ctx.moveTo(0, len * 0.65);
      ctx.lineTo(0, -len * 0.65);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -len * 0.85);
      ctx.lineTo(-3 * ratio, -len * 0.35);
      ctx.lineTo(3 * ratio, -len * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
  }
  islands.forEach((island) => {
    const pos = drawMapDot(ctx, island.group.position.x, island.group.position.z, Math.max(3, island.radius * size / (MAP_LIMIT * 2.45)), "#72bf61", "#f3df9b");
    ctx.fillStyle = "#17313c";
    ctx.font = `700 ${Math.max(7, size * 0.024)}px sans-serif`;
    ctx.fillText(island.name, pos.x + 4, pos.y - 4);
  });
  crates.forEach((crate) => drawMapDot(
    ctx,
    crate.mesh.position.x,
    crate.mesh.position.z,
    crate.kind === "kraken" ? 4.2 : crate.kind === "treasure" ? 3.6 : 2.2,
    crate.kind === "kraken" ? "#6b3d69" : crate.kind === "treasure" ? "#f3c33b" : "#b87533",
    "#fff0bc"
  ));
  if (krakenBoss?.group?.visible) {
    drawKrakenMapMarker(ctx, krakenBoss.group.position.x, krakenBoss.group.position.z, ratio, krakenBoss.hp, krakenBoss.maxHp);
  }
  bots.forEach((bot) => drawMapDot(ctx, bot.group.position.x, bot.group.position.z, expanded ? 4 : 3, "#cf493f", "#341918"));
  remotePlayers.forEach((remote) => {
    if (remote.group.visible) drawMapDot(ctx, remote.group.position.x, remote.group.position.z, expanded ? 4 : 3, "#7e55c7", "#f7ecff");
    (remote.balloons || []).forEach((balloon) => {
      if (balloon.group.visible) drawMapDot(ctx, balloon.group.position.x, balloon.group.position.z, expanded ? 3.5 : 2.6, "#c565db", "#f7ecff");
    });
  });
  balloons.forEach((balloon) => {
    if (balloon.destroyed) return;
    const pos = drawMapDot(ctx, balloon.group.position.x, balloon.group.position.z, expanded ? 4 : 3, "#d85842", "#fff1a6");
    ctx.fillStyle = "#fff1a6";
    ctx.fillRect(pos.x - 1.5 * ratio, pos.y + 3 * ratio, 3 * ratio, 2 * ratio);
  });
  const playerPos = state.mode === "ship" ? playerShip.position : character.position;
  const playerMap = drawMapDot(ctx, playerPos.x, playerPos.z, expanded ? 5 : 4, "#fffdf2", "#123742");
  const rotation = state.mode === "ship" ? state.rotation : character.rotation.y;
  ctx.save();
  ctx.translate(playerMap.x, playerMap.y);
  ctx.rotate(Math.PI - rotation);
  ctx.fillStyle = "#10313d";
  ctx.beginPath();
  ctx.moveTo(0, -8 * ratio);
  ctx.lineTo(5 * ratio, 6 * ratio);
  ctx.lineTo(-5 * ratio, 6 * ratio);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(16,32,42,0.55)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);
}

function multiplayerPayload() {
  return {
    name: captainName(),
    level: state.level,
    gold: Math.floor(state.gold),
    hp: state.hp,
    shipType: state.shipType,
    mode: state.mode,
    x: playerShip.position.x,
    z: playerShip.position.z,
    vx: state.velocity.x,
    vz: state.velocity.z,
    rotation: playerShip.rotation.y,
    landX: character.position.x,
    landZ: character.position.z,
    landRotation: character.rotation.y,
    balloons: balloons
      .filter((balloon) => !balloon.destroyed)
      .slice(0, 5)
      .map((balloon, index) => ({
        id: `${captainId}-balloon-${index}`,
        x: balloon.group.position.x,
        y: balloon.group.position.y,
        z: balloon.group.position.z,
        rotation: balloon.rotation,
        hp: balloon.hp,
        bomb: Boolean(balloon.bomb),
        landing: Boolean(balloon.landing),
      })),
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
  clearBurnVisual(remote);
  scene.remove(remote.group, remote.avatar, remote.label);
  (remote.balloons || []).forEach((balloon) => scene.remove(balloon.group));
  remotePlayers.delete(id);
}

function syncRemoteBalloons(remote, dataBalloons = []) {
  remote.balloons = remote.balloons || [];
  const wanted = Array.isArray(dataBalloons) ? dataBalloons.slice(0, 5) : [];
  while (remote.balloons.length > wanted.length) {
    const removed = remote.balloons.pop();
    scene.remove(removed.group);
  }
  wanted.forEach((entry, index) => {
    let balloon = remote.balloons[index];
    if (!balloon) {
      balloon = { group: makeBalloonMesh() };
      balloon.group.scale.setScalar(0.86);
      scene.add(balloon.group);
      remote.balloons[index] = balloon;
    }
    balloon.group.position.set(Number(entry.x) || 0, Number(entry.y) || 24, Number(entry.z) || 0);
    balloon.group.rotation.y = Number(entry.rotation) || 0;
    balloon.group.visible = true;
  });
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
    remote = { group, avatar, label, updated: 0, name: data.name || "Captain", shipType, velocity: new THREE.Vector3() };
    remotePlayers.set(data.id, remote);
  } else if (remote.shipType !== shipType) {
    clearBurnVisual(remote);
    scene.remove(remote.group);
    remote.group = makeShip(shipType, true);
    scene.add(remote.group);
    remote.shipType = shipType;
  }

  updateRemoteLabel(remote, data.name || "Captain");
  remote.updated = clock.elapsedTime;
  remote.mode = data.mode || "ship";
  remote.level = data.level || 1;
  remote.gold = Number(data.gold) || 0;
  remote.hp = data.hp || getShipStats(shipType).hp;
  remote.velocity = remote.velocity || new THREE.Vector3();
  remote.velocity.set(Number(data.vx) || 0, 0, Number(data.vz) || 0);
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
  syncRemoteBalloons(remote, data.balloons);
  remote.label.lookAt(camera.position);
}

function removeBot(bot) {
  if (!bot) return;
  clearBurnVisual(bot);
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
        localId: data.id,
        group,
        velocity: new THREE.Vector3(),
        turn: 0,
        fireCooldown: 0,
        courageous: Boolean(data.courageous),
      };
      bot.group.position.copy(serverPosition);
      bot.group.rotation.y = serverRotation;
      bots.push(bot);
    } else if (bot.shipType !== data.shipType) {
      clearBurnVisual(bot);
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
    bot.courageous = Boolean(data.courageous);
    bot.serverMaxHp = Number(data.maxHp) || spec.hp;
    bot.serverPosition = serverPosition;
    bot.serverRotation = serverRotation;
    if (data.fire) {
      bot.fire = {
        dps: Number(data.fire.dps) || 2,
        remaining: Number(data.fire.remaining) || 0,
        visualOnly: true,
        scorch: bot.fire?.scorch || null,
        smokeTimer: bot.fire?.smokeTimer || 0,
      };
      if (!bot.fire.scorch) addScorchMark(bot);
    } else if (bot.fire) {
      clearBurnVisual(bot);
      bot.fire = null;
    }
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
      const kind = data.kind === "treasure" ? "treasure" : data.kind === "kraken" ? "kraken" : "crate";
      crate = {
        serverId: data.id,
        mesh: makeCrateMesh(Number(data.x) || 0, Number(data.z) || 0, kind),
        kind,
        heal: Number(data.heal) || 10,
        xp: Number(data.xp) || 16,
        gold: Number(data.gold) || 14,
        born: Number.isFinite(Number(data.born)) ? clock.elapsedTime - Math.max(0, (Date.now() - Number(data.born)) / 1000) : clock.elapsedTime,
      };
      crates.push(crate);
    }
    crate.kind = data.kind === "treasure" ? "treasure" : data.kind === "kraken" ? "kraken" : "crate";
    if (Number.isFinite(Number(data.born))) crate.born = clock.elapsedTime - Math.max(0, (Date.now() - Number(data.born)) / 1000);
    crate.heal = Number(data.heal) || crate.heal;
    crate.xp = Number(data.xp) || crate.xp;
    crate.gold = Number(data.gold) || crate.gold;
    crate.mesh.position.x = Number(data.x) || crate.mesh.position.x;
    crate.mesh.position.z = Number(data.z) || crate.mesh.position.z;
  });
  crates.slice().forEach((crate) => {
    if (!crate.serverId || !seenCrates.has(crate.serverId)) removeCrate(crate);
  });
  syncKraken(world.kraken);
}

function applyCrateReward(crate) {
  if (!crate) return;
  const local = crates.find((item) => item.serverId === crate.id);
  if (local) removeCrate(local);
  state.hp = clamp(state.hp + (Number(crate.heal) || 0), 0, maxHp());
  addXP(Number(crate.xp) || 0);
  state.gold += Number(crate.gold) || 0;
  toast(`${crate.kind === "kraken" ? "Kraken tentacle" : crate.kind === "treasure" ? "Treasure" : "Crate"} recovered: repairs, gold, and XP.`);
}

function applyRemotePlayerSunk(message) {
  if (multiplayer.serverWorld) return;
  const x = Number(message.x);
  const z = Number(message.z);
  if (!Number.isFinite(x) || !Number.isFinite(z)) return;
  const count = clamp(Math.floor(Number(message.count) || 1), 1, 15);
  dropCrates(new THREE.Vector3(x, 0, z), count);
}

function spawnRemoteShot(data) {
  if (!data || data.owner === playerId || data.owner === multiplayer.networkId) return;
  const sentAt = Number(data.sentAt);
  if (Number.isFinite(sentAt) && Date.now() - sentAt > SHOT_REPLAY_MAX_AGE_MS) return;
  if (data.id) {
    if (seenRemoteShots.has(data.id)) return;
    seenRemoteShots.add(data.id);
    if (seenRemoteShots.size > 220) {
      const oldest = seenRemoteShots.values().next().value;
      seenRemoteShots.delete(oldest);
    }
  }
  const pos = new THREE.Vector3(Number(data.x), 0, Number(data.z));
  const dir = new THREE.Vector3(Number(data.dirX), 0, Number(data.dirZ));
  if (![pos.x, pos.z, dir.x, dir.z].every(Number.isFinite) || dir.lengthSq() < 0.01) return;
  const target = Number.isFinite(Number(data.targetX)) && Number.isFinite(Number(data.targetZ))
    ? new THREE.Vector3(Number(data.targetX), 0, Number(data.targetZ))
    : null;
  makeProjectile(data.owner || "remote", pos, dir.normalize(), Number(data.damage) || 20, Number(data.range) || 36, {
    target,
    targetKind: data.targetKind || "any",
    ammoType: data.ammoType || "basic",
  });
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
  } else if (message.type === "playerSunk") {
    applyRemotePlayerSunk(message);
  } else if (message.type === "krakenAttack") {
    applyKrakenAttack(message.attack);
  } else if (message.type === "krakenDefeated") {
    // The dropped tentacle reward is visible in-world; no popup needed.
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
    if (state.joined) sendMultiplayer({ type: "hello", player: multiplayerPayload() });
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

function publishShot(origin, dir, damage, range, target = null, ammoType = "basic") {
  sendMultiplayer({
    type: "shot",
    shot: {
      id: crypto.randomUUID(),
      owner: playerId,
      sentAt: Date.now(),
      x: origin.x,
      z: origin.z,
      dirX: dir.x,
      dirZ: dir.z,
      targetX: target?.x,
      targetZ: target?.z,
      damage,
      range,
      targetKind: "any",
      ammoType,
    },
  });
}

function publishMultiplayer() {
  if (!state.joined) return;
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
    if (obj.userData.waterfall) {
      obj.material.opacity = 0.34 + Math.sin(clock.elapsedTime * 2.6 + obj.position.x * 0.01 + obj.position.z * 0.01) * 0.08;
    }
    if (obj.userData.waterfallFoam) {
      obj.scale.z = 1 + Math.sin(clock.elapsedTime * 3.2 + obj.position.x * 0.01) * 0.08;
    }
    if (obj.userData.waterfallMist !== undefined) {
      obj.position.y -= 0.025;
      obj.material.opacity = 0.1 + Math.sin(clock.elapsedTime + obj.userData.waterfallMist) * 0.05;
      if (obj.position.y < -44) obj.position.y = -6;
    }
  });
}

function frame() {
  const dt = Math.min(0.033, clock.getDelta());
  if (state.joined) {
    if (state.mode === "ship") updateShip(dt);
    else updateWalker(dt);
    updateBots(dt);
    remotePlayers.forEach((remote) => updateFireDamage(remote, dt, remote.velocity?.length?.() || 0));
    resolveShipContacts();
    updateProjectiles(dt);
    updateImpactEffects(dt);
    updateWaveHazards(dt);
    updateFish(dt);
    updateAnimals(dt);
    updateBalloons(dt);
    updateBalloonReticle();
    updateStorms(dt);
    updateLeviathan(dt);
    updateKraken(dt);
  }
  updateCamera(dt);
  animateSea();
  publishMultiplayer();
  updateHud();
  updateMinimap();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

initWorld();
setupNameGate();
setupMultiplayer();
updateHud();
frame();
