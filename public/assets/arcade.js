const canvas = document.getElementById("arcadeCanvas");
const ctx = canvas.getContext("2d");
const stage = canvas.parentElement;
const spotlightCanvas = document.createElement("canvas");
spotlightCanvas.id = "spotlightCanvas";
spotlightCanvas.width = canvas.width;
spotlightCanvas.height = canvas.height;
spotlightCanvas.hidden = true;
spotlightCanvas.setAttribute("aria-label", "3D spotlight game area");
canvas.after(spotlightCanvas);
const fpsOverlay = document.createElement("div");
fpsOverlay.className = "fps-overlay";
fpsOverlay.hidden = true;
fpsOverlay.innerHTML = `<div class="fps-hud"><span id="fpsHealth">HP 100</span><span id="fpsAmmo">Ammo ∞</span><span id="fpsMode">Bots</span></div><div class="fps-crosshair" aria-hidden="true"></div><div class="fps-hit" id="fpsHit">HIT</div>`;
spotlightCanvas.after(fpsOverlay);
const blockOverlay = document.createElement("div");
blockOverlay.className = "fps-overlay block-overlay";
blockOverlay.hidden = true;
blockOverlay.innerHTML = `<div class="fps-hud"><span id="blockCount">Blocks 0</span><span id="blockTarget">Aim 0,0</span><span id="blockMode">Build</span></div><div class="fps-crosshair block-crosshair" aria-hidden="true"></div>`;
fpsOverlay.after(blockOverlay);
const titleEl = document.getElementById("currentGameTitle");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const statusEl = document.getElementById("status");
const messageEl = document.getElementById("gameMessage");
const gamePickers = document.querySelectorAll("[data-game-picker]");
const startButton = document.getElementById("startButton");
const leftButton = document.getElementById("leftButton");
const rightButton = document.getElementById("rightButton");
const actionButton = document.getElementById("actionButton");

const ink = "#10233f";
const paper = "#fffaf0";
const yellow = "#ffd23f";
const coral = "#ff5b4a";
const aqua = "#25c7d9";
const green = "#7bd629";
const blue = "#2968e8";
const purple = "#8d5cff";
const pieceColors = [aqua, yellow, coral, green, blue, purple];
const threeGameIds = new Set(["turbo-racer-3d", "arena-fps-3d", "spotlight-dash-3d", "sky-platformer-3d", "block-builder-3d"]);

const gameTitles = {
  "turbo-racer-3d": "Turbo Racer 3D",
  "arena-fps-3d": "Arena FPS 3D",
  "spotlight-dash-3d": "Spotlight Dash 3D",
  "sky-platformer-3d": "Sky Platformer 3D",
  "block-builder-3d": "Block Builder 3D",
  "classic-snake": "Classic Snake",
  "solo-pong": "Solo Pong",
  "falling-blocks": "Falling Blocks",
  "two-player-pong": "Two Player Pong",
  "brick-breaker": "Brick Breaker",
  "asteroid-drift": "Asteroid Drift",
  "invader-blast": "Invader Blast",
  "maze-run": "Maze Run",
  "neon-cube-dash": "Neon Cube Dash",
  "stack-jump": "Stack Jump",
  "target-pop": "Target Pop"
};

const arcade = {
  id: "turbo-racer-3d",
  running: false,
  score: 0,
  best: 0,
  last: 0,
  keys: new Set(),
  taps: new Set(),
  data: {}
};

let threePromise;
let shared3dRenderer;
const spotlight3d = {
  ready: false,
  loading: false,
  failed: false,
  THREE: null,
  renderer: null,
  scene: null,
  camera: null,
  player: null,
  floor: null,
  spotlight: null,
  spotlightTarget: null,
  cone: null,
  objects: []
};

const fps3d = {
  ready: false,
  loading: false,
  failed: false,
  mode: "bots",
  THREE: null,
  renderer: null,
  scene: null,
  camera: null,
  playerRig: null,
  muzzle: null,
  muzzleLight: null,
  weapon: null,
  bots: [],
  cover: [],
  beams: [],
  remote: null,
  walls: [],
  yaw: 0,
  pitch: 0,
  peer: null,
  channel: null,
  lastNet: 0,
  connected: false
};

const fpsAudio = {
  context: null,
  master: null,
  unlocked: false
};

const racing3d = {
  ready: false,
  loading: false,
  failed: false,
  THREE: null,
  renderer: null,
  scene: null,
  camera: null,
  car: null,
  road: null,
  objects: [],
  botCars: [],
  laneMarkers: []
};

const platform3d = {
  ready: false,
  loading: false,
  failed: false,
  THREE: null,
  renderer: null,
  scene: null,
  camera: null,
  player: null,
  goal: null,
  objects: [],
  platforms: [],
  coins: [],
  hazards: []
};

const block3d = {
  ready: false,
  loading: false,
  failed: false,
  THREE: null,
  renderer: null,
  scene: null,
  camera: null,
  selector: null,
  marker: null,
  blocks: [],
  base: [],
  blockMap: new Map(),
  materials: {}
};

function setStageMode(is3d) {
  canvas.hidden = is3d;
  spotlightCanvas.hidden = !is3d;
  stage.classList.toggle("is-3d", is3d);
  fpsOverlay.hidden = arcade.id !== "arena-fps-3d";
  blockOverlay.hidden = arcade.id !== "block-builder-3d";
}

function is3dGame(id) {
  return threeGameIds.has(id);
}

function loadThree() {
  threePromise ??= import("/assets/three.module.js");
  return threePromise;
}

function ensureFpsAudio() {
  if (!window.AudioContext && !window.webkitAudioContext) return;
  if (!fpsAudio.context) {
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    fpsAudio.context = new AudioEngine();
    fpsAudio.master = fpsAudio.context.createGain();
    fpsAudio.master.gain.value = 0.34;
    fpsAudio.master.connect(fpsAudio.context.destination);
  }
  fpsAudio.context.resume?.();
  fpsAudio.unlocked = fpsAudio.context.state !== "suspended";
}

function playEnemyStep(distance, side = 0) {
  if (!fpsAudio.context || fpsAudio.context.state === "suspended") return;
  const ctxAudio = fpsAudio.context;
  const closeness = Math.max(0, Math.min(1, 1 - distance / 16));
  const now = ctxAudio.currentTime;
  const pitch = 138 - closeness * 86;
  const volume = 0.018 + closeness * 0.095;
  const osc = ctxAudio.createOscillator();
  const gain = ctxAudio.createGain();
  const filter = ctxAudio.createBiquadFilter();
  const panner = ctxAudio.createStereoPanner?.();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(pitch, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(34, pitch * 0.58), now + 0.12);
  filter.type = "lowpass";
  filter.frequency.value = 260 - closeness * 90;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  if (panner) {
    panner.pan.value = Math.max(-0.72, Math.min(0.72, side / 10));
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(fpsAudio.master);
  } else {
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(fpsAudio.master);
  }
  osc.start(now);
  osc.stop(now + 0.2);
}

function get3dRenderer() {
  if (!shared3dRenderer) {
    shared3dRenderer = new fps3d.THREE.WebGLRenderer({ canvas: spotlightCanvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
    shared3dRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    shared3dRenderer.shadowMap.enabled = true;
    shared3dRenderer.shadowMap.type = fps3d.THREE.PCFSoftShadowMap;
  }
  return shared3dRenderer;
}

function resize3d() {
  const width = Math.max(1, spotlightCanvas.clientWidth);
  const height = Math.max(1, spotlightCanvas.clientHeight);
  if (shared3dRenderer) shared3dRenderer.setSize(width, height, false);
  for (const camera of [spotlight3d.camera, fps3d.camera, racing3d.camera, platform3d.camera, block3d.camera]) {
    if (!camera) continue;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

function clearPlatformScene() {
  if (!platform3d.scene) return;
  [...platform3d.objects, ...platform3d.platforms.map((item) => item.mesh), ...platform3d.coins.map((item) => item.mesh), ...platform3d.hazards.map((item) => item.mesh), platform3d.goal].forEach((item) => {
    if (item) platform3d.scene.remove(item);
  });
  platform3d.objects = [];
  platform3d.platforms = [];
  platform3d.coins = [];
  platform3d.hazards = [];
  platform3d.goal = null;
}

function clearBlockScene() {
  if (!block3d.scene) return;
  [...block3d.blocks, ...block3d.base].forEach((item) => block3d.scene.remove(item));
  block3d.blocks = [];
  block3d.base = [];
  block3d.blockMap.clear();
}

function voxelKey(x, z) {
  return `${x},${z}`;
}

function voxelStackHeight(x, z) {
  return block3d.blockMap.get(voxelKey(x, z))?.length || 0;
}

function addVoxelBlock(x, z, layer, materialName = "grass") {
  const THREE = block3d.THREE;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.96, 0.96, 0.96),
    block3d.materials[materialName] || block3d.materials.grass
  );
  mesh.position.set(x, layer + 0.48, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = { x, z, layer };
  block3d.scene.add(mesh);
  block3d.blocks.push(mesh);
  const key = voxelKey(x, z);
  if (!block3d.blockMap.has(key)) block3d.blockMap.set(key, []);
  block3d.blockMap.get(key).push(mesh);
  return mesh;
}

function removeTopVoxelBlock(x, z) {
  const stack = block3d.blockMap.get(voxelKey(x, z));
  if (!stack?.length) return false;
  const mesh = stack.pop();
  block3d.scene.remove(mesh);
  block3d.blocks = block3d.blocks.filter((block) => block !== mesh);
  return true;
}

function moveVoxelCursor(dx, dz) {
  const d = arcade.data;
  d.cursorX = Math.max(-6, Math.min(6, d.cursorX + dx));
  d.cursorZ = Math.max(-6, Math.min(6, d.cursorZ + dz));
}

function updateFirstPersonVoxelTarget() {
  const d = arcade.data;
  if (!d) return;
  const forwardX = Math.sin(d.yaw || 0);
  const forwardZ = -Math.cos(d.yaw || 0);
  d.cursorX = Math.max(-6, Math.min(6, Math.round(d.playerX + forwardX * 2.8)));
  d.cursorZ = Math.max(-6, Math.min(6, Math.round(d.playerZ + forwardZ * 2.8)));
}

function updateVoxelSelector() {
  const d = arcade.data;
  if (!block3d.selector || !block3d.marker) return;
  const height = voxelStackHeight(d.cursorX, d.cursorZ);
  block3d.selector.position.set(d.cursorX, height + 0.53, d.cursorZ);
  block3d.marker.position.set(d.cursorX, 0.04, d.cursorZ);
}

function updateBlockHud() {
  const count = document.getElementById("blockCount");
  const target = document.getElementById("blockTarget");
  const mode = document.getElementById("blockMode");
  if (!count || !target || !mode) return;
  const d = arcade.data || {};
  count.textContent = `Blocks ${block3d.blocks.length}`;
  target.textContent = `Aim ${d.cursorX ?? 0},${d.cursorZ ?? 0}`;
  mode.textContent = "First person";
}

function buildVoxelIsland() {
  const THREE = block3d.THREE;
  clearBlockScene();
  const baseMaterials = [block3d.materials.groundA, block3d.materials.groundB];
  for (let x = -6; x <= 6; x += 1) {
    for (let z = -6; z <= 6; z += 1) {
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(0.98, 0.18, 0.98),
        baseMaterials[(x + z + 64) % 2]
      );
      tile.position.set(x, -0.09, z);
      tile.receiveShadow = true;
      block3d.scene.add(tile);
      block3d.base.push(tile);
    }
  }
  [
    [-3, -2, 0, "dirt"],
    [-3, -2, 1, "grass"],
    [2, 1, 0, "stone"],
    [3, 1, 0, "stone"],
    [2, 2, 0, "wood"],
    [0, -4, 0, "glow"],
    [0, -4, 1, "glow"]
  ].forEach(([x, z, layer, material]) => addVoxelBlock(x, z, layer, material));
}

async function setupBlock3d() {
  if (block3d.ready || block3d.loading || block3d.failed) return;
  block3d.loading = true;
  setStatus("Loading blocks");
  try {
    const THREE = await loadThree();
    block3d.THREE = THREE;
    fps3d.THREE = THREE;
    const renderer = get3dRenderer();
    renderer.setClearColor(0x8bdcff, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x8bdcff, 18, 55);
    const camera = new THREE.PerspectiveCamera(56, 16 / 9, 0.1, 90);
    camera.position.set(8, 10, 12);
    camera.lookAt(0, 1, 0);
    scene.add(new THREE.HemisphereLight(0xcaf6ff, 0x385c2c, 1.15));
    const sun = new THREE.DirectionalLight(0xfff2a3, 2.4);
    sun.position.set(-8, 14, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);

    block3d.materials = {
      grass: new THREE.MeshStandardMaterial({ color: 0x7bd629, roughness: 0.72 }),
      dirt: new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.86 }),
      stone: new THREE.MeshStandardMaterial({ color: 0x7c8797, roughness: 0.62, metalness: 0.04 }),
      wood: new THREE.MeshStandardMaterial({ color: 0xc9863a, roughness: 0.78 }),
      glow: new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x775900, roughness: 0.38 }),
      groundA: new THREE.MeshStandardMaterial({ color: 0x49a454, roughness: 0.9 }),
      groundB: new THREE.MeshStandardMaterial({ color: 0x3f934c, roughness: 0.9 })
    };

    const selector = new THREE.Mesh(
      new THREE.BoxGeometry(1.04, 1.04, 1.04),
      new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.24, wireframe: true })
    );
    selector.renderOrder = 4;
    scene.add(selector);
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(1.08, 0.08, 1.08),
      new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.42 })
    );
    scene.add(marker);

    block3d.renderer = renderer;
    block3d.scene = scene;
    block3d.camera = camera;
    block3d.selector = selector;
    block3d.marker = marker;
    buildVoxelIsland();
    block3d.ready = true;
    block3d.loading = false;
    resize3d();
    updateFirstPersonVoxelTarget();
    updateVoxelSelector();
    updateBlockHud();
    games["block-builder-3d"].draw();
  } catch {
    block3d.failed = true;
    block3d.loading = false;
    setStatus("Blocks failed");
    showMessage("The block-building game did not load. Refresh and try again.", "3D");
  }
}

function clearRacingScene() {
  if (!racing3d.scene) return;
  [...racing3d.objects, ...racing3d.laneMarkers, ...racing3d.botCars.map((bot) => bot.mesh)].forEach((item) => racing3d.scene.remove(item));
  racing3d.objects = [];
  racing3d.botCars = [];
  racing3d.laneMarkers = [];
}

function makeRacingCar(color = 0xff5b4a, accent = 0xffd23f) {
  const THREE = racing3d.THREE;
  const car = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.62, 2.9),
    new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.24 })
  );
  body.position.y = 0.55;
  body.castShadow = true;
  car.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.48, 1.18),
    new THREE.MeshStandardMaterial({ color: 0x25c7d9, roughness: 0.2, metalness: 0.1 })
  );
  cabin.position.set(0, 1.03, -0.28);
  cabin.castShadow = true;
  car.add(cabin);
  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(1.42, 0.18, 0.16),
    new THREE.MeshBasicMaterial({ color: accent })
  );
  nose.position.set(0, 0.72, -1.54);
  car.add(nose);
  [-0.68, 0.68].forEach((x) => {
    [-1.02, 1.02].forEach((z) => {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.24, 18),
        new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 })
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.34, z);
      wheel.castShadow = true;
      car.add(wheel);
    });
  });
  return car;
}

async function setupRacing3d() {
  if (racing3d.ready || racing3d.loading || racing3d.failed) return;
  racing3d.loading = true;
  setStatus("Loading race");
  try {
    const THREE = await loadThree();
    racing3d.THREE = THREE;
    fps3d.THREE = THREE;
    const renderer = get3dRenderer();
    renderer.setClearColor(0x78d7ff, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x78d7ff, 28, 96);
    const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 120);
    camera.position.set(0, 5.6, 11);
    camera.lookAt(0, 0.5, -12);

    const sun = new THREE.DirectionalLight(0xfff2b0, 2.3);
    sun.position.set(-8, 14, 8);
    sun.castShadow = true;
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0xbfeeff, 0x335533, 1.15));

    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(46, 150),
      new THREE.MeshStandardMaterial({ color: 0x49a454, roughness: 0.85 })
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.z = -42;
    grass.receiveShadow = true;
    scene.add(grass);

    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(13.5, 160),
      new THREE.MeshStandardMaterial({ color: 0x232a35, roughness: 0.72, metalness: 0.03 })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.z = -46;
    road.position.y = 0.025;
    road.receiveShadow = true;
    scene.add(road);

    const car = makeRacingCar(0xff5b4a, 0xffd23f);
    car.position.set(0, 0, 6);
    scene.add(car);

    racing3d.renderer = renderer;
    racing3d.scene = scene;
    racing3d.camera = camera;
    racing3d.car = car;
    racing3d.road = road;
    racing3d.ready = true;
    racing3d.loading = false;
    resize3d();
    games["turbo-racer-3d"].draw();
  } catch {
    racing3d.failed = true;
    racing3d.loading = false;
    setStatus("Race failed");
    showMessage("The racing engine did not load. Refresh and try again.", "3D");
  }
}

function makeRaceObject(kind) {
  const THREE = racing3d.THREE;
  const lane = [-4, 0, 4][Math.floor(rand(0, 3))];
  const mesh = kind === "coin"
    ? new THREE.Mesh(
        new THREE.TorusGeometry(0.48, 0.12, 14, 30),
        new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x5c4300, roughness: 0.25 })
      )
    : new THREE.Mesh(
        new THREE.BoxGeometry(rand(1.3, 2.0), rand(0.95, 1.6), rand(1.6, 2.6)),
        new THREE.MeshStandardMaterial({ color: Math.random() > 0.5 ? 0x2968e8 : 0xff5b4a, roughness: 0.42, metalness: 0.12 })
      );
  mesh.position.set(lane, kind === "coin" ? 1.05 : 0.58, -72);
  mesh.rotation.y = kind === "coin" ? Math.PI / 2 : 0;
  mesh.castShadow = true;
  mesh.userData = { kind, lane, hit: false };
  racing3d.scene.add(mesh);
  racing3d.objects.push(mesh);
}

function makeRaceBotCar(name, lane, distance, speed, color, accent) {
  const mesh = makeRacingCar(color, accent);
  mesh.position.set(lane, 0, 6 - (distance - arcade.data.distance));
  mesh.scale.setScalar(0.95);
  racing3d.scene.add(mesh);
  const bot = {
    name,
    mesh,
    lane,
    targetLane: lane,
    distance,
    speed,
    laneTimer: rand(1.2, 3.2)
  };
  racing3d.botCars.push(bot);
  return bot;
}

function racePlace() {
  const racers = [
    { name: "You", distance: arcade.data.distance },
    ...racing3d.botCars.map((bot) => ({ name: bot.name, distance: bot.distance }))
  ].sort((a, b) => b.distance - a.distance);
  return racers.findIndex((racer) => racer.name === "You") + 1;
}

function racePlaceLabel(place) {
  return ["1st", "2nd", "3rd", "4th"][place - 1] || `${place}th`;
}

function raceClock(seconds) {
  const safe = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(safe / 60);
  const secs = String(safe % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function makePlatformPlayer() {
  const THREE = platform3d.THREE;
  const player = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.15, 0.9),
    new THREE.MeshStandardMaterial({ color: 0xff5b4a, roughness: 0.36, metalness: 0.08 })
  );
  body.position.y = 0.58;
  body.castShadow = true;
  player.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 24, 18),
    new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.4 })
  );
  head.position.y = 1.34;
  head.castShadow = true;
  player.add(head);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x10233f });
  [-0.13, 0.13].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), eyeMat);
    eye.position.set(x, 1.42, 0.34);
    player.add(eye);
  });
  return player;
}

function addPlatformBlock(x, top, width, color = 0x25c7d9) {
  const THREE = platform3d.THREE;
  const height = 0.52;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, 5.2),
    new THREE.MeshStandardMaterial({ color, roughness: 0.58, metalness: 0.06 })
  );
  mesh.position.set(x, top - height / 2, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  platform3d.scene.add(mesh);
  platform3d.platforms.push({ x, top, width, height, mesh });
  const grass = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.08, 0.08, 5.28),
    new THREE.MeshBasicMaterial({ color: 0x7bd629 })
  );
  grass.position.set(x, top + 0.055, 0);
  platform3d.scene.add(grass);
  platform3d.objects.push(grass);
}

function addPlatformCoin(x, y) {
  const THREE = platform3d.THREE;
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.08, 14, 30),
    new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x604400, roughness: 0.28 })
  );
  mesh.position.set(x, y, 0);
  mesh.rotation.y = Math.PI / 2;
  mesh.castShadow = true;
  platform3d.scene.add(mesh);
  platform3d.coins.push({ x, y, mesh, taken: false });
}

function addPlatformHazard(x, width) {
  const THREE = platform3d.THREE;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.18, 5.4),
    new THREE.MeshStandardMaterial({ color: 0xff5b4a, emissive: 0x541000, roughness: 0.4 })
  );
  mesh.position.set(x, -0.2, 0);
  platform3d.scene.add(mesh);
  platform3d.hazards.push({ x, width, mesh });
}

function platformLevelData(level = 1) {
  const safeLevel = Math.max(1, Math.min(20, level));
  const count = 7 + Math.floor(safeLevel / 3);
  const startX = -9;
  const platforms = [[startX, 0, 7.2]];
  let x = startX;
  let top = 0;
  for (let i = 1; i < count; i += 1) {
    const gap = 4.2 + (safeLevel % 4) * 0.23 + (i % 3) * 0.2;
    x += gap;
    top += Math.sin((safeLevel + i) * 1.15) * 0.86 + (i % 2 ? 0.35 : -0.22);
    top = Math.max(0.55, Math.min(3.35, top));
    const width = Math.max(2.65, 4.05 - safeLevel * 0.035 - (i % 3) * 0.18);
    platforms.push([x, top, width]);
  }
  const finishX = x + 4.2;
  const finishTop = Math.max(0.9, Math.min(3.0, top + Math.sin(safeLevel) * 0.45));
  platforms.push([finishX, finishTop, 4.6]);

  const coins = platforms.slice(1, -1).map(([coinX, coinTop], index) => [
    coinX + (index % 2 ? 0.58 : -0.58),
    coinTop + 1.05 + ((safeLevel + index) % 2) * 0.16
  ]);
  const hazards = [];
  for (let i = 1; i < platforms.length - 1; i += 2) {
    if (safeLevel < 3 && i > 3) continue;
    const left = platforms[i - 1];
    const right = platforms[i];
    const gapCenter = (left[0] + right[0]) / 2;
    const gapWidth = Math.max(1.25, right[0] - left[0] - left[2] * 0.42 - right[2] * 0.42);
    hazards.push([gapCenter, Math.min(3.6, gapWidth + 0.55)]);
  }

  return {
    level: safeLevel,
    platforms,
    coins,
    hazards,
    startX,
    startY: 0.65,
    goalX: finishX,
    goalY: finishTop + 1.5,
    coinTotal: coins.length
  };
}

function buildPlatformLevel(level = 1) {
  const THREE = platform3d.THREE;
  const layout = platformLevelData(level);
  clearPlatformScene();
  layout.platforms.forEach(([x, top, width], index) => {
    const colors = [0x25c7d9, 0x2968e8, 0x8d5cff, 0x7bd629];
    addPlatformBlock(x, top, width, colors[(index + level) % colors.length]);
  });
  layout.coins.forEach(([x, y]) => addPlatformCoin(x, y));
  layout.hazards.forEach(([x, width]) => addPlatformHazard(x, width));

  const goal = new THREE.Group();
  const postMat = new THREE.MeshStandardMaterial({ color: 0x8d5cff, roughness: 0.35, metalness: 0.12 });
  const topMat = new THREE.MeshBasicMaterial({ color: 0xffd23f });
  [-0.8, 0.8].forEach((x) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.7, 0.18), postMat);
    post.position.set(x, 1.25, 0);
    post.castShadow = true;
    goal.add(post);
  });
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.22, 0.2), topMat);
  top.position.set(0, 2.65, 0);
  goal.add(top);
  goal.position.set(layout.goalX, layout.goalY, 0);
  platform3d.scene.add(goal);
  platform3d.goal = goal;
  return layout;
}

async function setupPlatform3d() {
  if (platform3d.ready || platform3d.loading || platform3d.failed) return;
  platform3d.loading = true;
  setStatus("Loading jump");
  try {
    const THREE = await loadThree();
    platform3d.THREE = THREE;
    fps3d.THREE = THREE;
    const renderer = get3dRenderer();
    renderer.setClearColor(0x8bdcff, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x8bdcff, 24, 86);
    const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 120);
    camera.position.set(0, 5.5, 12);
    camera.lookAt(2, 1.4, 0);

    const sun = new THREE.DirectionalLight(0xfff0a0, 2.7);
    sun.position.set(-8, 14, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0xcaf6ff, 0x355522, 1.1));

    const skyBase = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 24),
      new THREE.MeshBasicMaterial({ color: 0xb9f2ff })
    );
    skyBase.position.set(20, -1.0, -3.1);
    scene.add(skyBase);

    for (let i = 0; i < 9; i += 1) {
      const cloud = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      [0, 0.55, -0.55].forEach((offset, index) => {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(index === 1 ? 0.55 : 0.42, 16, 10), mat);
        puff.position.x = offset;
        cloud.add(puff);
      });
      cloud.position.set(-8 + i * 6.2, 5.6 + Math.sin(i) * 0.7, -3.4);
      scene.add(cloud);
    }

    platform3d.renderer = renderer;
    platform3d.scene = scene;
    platform3d.camera = camera;
    platform3d.player = makePlatformPlayer();
    platform3d.player.position.set(-8.6, 0.65, 0);
    scene.add(platform3d.player);

    platform3d.ready = true;
    platform3d.loading = false;
    buildPlatformLevel(1);
    resize3d();
    games["sky-platformer-3d"].draw();
  } catch {
    platform3d.failed = true;
    platform3d.loading = false;
    setStatus("Jump failed");
    showMessage("The 3D platform game did not load. Refresh and try again.", "3D");
  }
}

async function setupSpotlight3d() {
  if (spotlight3d.ready || spotlight3d.loading || spotlight3d.failed) return;
  spotlight3d.loading = true;
  setStatus("Loading 3D");
  try {
    const THREE = await loadThree();
    spotlight3d.THREE = THREE;
    fps3d.THREE = THREE;
    const renderer = get3dRenderer();
    renderer.setClearColor(0x060711, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x060711, 16, 72);

    const camera = new THREE.PerspectiveCamera(54, 16 / 9, 0.1, 120);
    camera.position.set(0, 6.4, 13);
    camera.lookAt(0, 0.9, -12);

    const hemi = new THREE.HemisphereLight(0x315cff, 0x060711, 0.5);
    scene.add(hemi);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 120, 18, 80),
      new THREE.MeshStandardMaterial({ color: 0x101a31, roughness: 0.75, metalness: 0.06 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -28;
    floor.receiveShadow = true;
    scene.add(floor);

    const laneMaterial = new THREE.MeshBasicMaterial({ color: 0x25c7d9, transparent: true, opacity: 0.22 });
    [-3, 0, 3].forEach((x) => {
      const lane = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 106), laneMaterial);
      lane.position.set(x, 0.04, -28);
      scene.add(lane);
    });

    const player = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.72, 1.15),
      new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.38, metalness: 0.12 })
    );
    body.castShadow = true;
    player.add(body);
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 24, 16),
      new THREE.MeshStandardMaterial({ color: 0xff5b4a, roughness: 0.4 })
    );
    crown.position.y = 0.72;
    crown.castShadow = true;
    player.add(crown);
    player.position.set(0, 0.74, 5);
    scene.add(player);

    const spotlightTarget = new THREE.Object3D();
    spotlightTarget.position.set(0, 0.5, 4);
    scene.add(spotlightTarget);

    const spotlight = new THREE.SpotLight(0xfff2a3, 420, 46, Math.PI / 5.4, 0.5, 1.05);
    spotlight.position.set(0, 13, 8);
    spotlight.target = spotlightTarget;
    spotlight.castShadow = true;
    spotlight.shadow.mapSize.width = 2048;
    spotlight.shadow.mapSize.height = 2048;
    scene.add(spotlight);
    scene.add(spotlight.target);

    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(5.8, 12, 48, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
    );
    cone.position.set(0, 6.4, 4.4);
    scene.add(cone);

    spotlight3d.renderer = renderer;
    spotlight3d.scene = scene;
    spotlight3d.camera = camera;
    spotlight3d.player = player;
    spotlight3d.floor = floor;
    spotlight3d.spotlight = spotlight;
    spotlight3d.spotlightTarget = spotlightTarget;
    spotlight3d.cone = cone;
    spotlight3d.ready = true;
    spotlight3d.loading = false;
    resize3d();
    games["spotlight-dash-3d"].draw();
  } catch {
    spotlight3d.failed = true;
    spotlight3d.loading = false;
    setStatus("3D failed");
    showMessage("The 3D engine did not load. Refresh and try again.", "3D");
  }
}

function clearFpsScene() {
  if (!fps3d.scene) return;
  [...fps3d.bots, ...fps3d.beams, fps3d.remote].filter(Boolean).forEach((item) => fps3d.scene.remove(item));
  fps3d.bots = [];
  fps3d.beams = [];
  fps3d.remote = null;
}

function updateFpsHud(extra = "") {
  const health = document.getElementById("fpsHealth");
  const ammo = document.getElementById("fpsAmmo");
  const mode = document.getElementById("fpsMode");
  if (!health || !ammo || !mode) return;
  health.textContent = `HP ${Math.max(0, Math.ceil(arcade.data.hp ?? 100))}`;
  ammo.textContent = extra || (arcade.data.flash > 0 ? "BLAST" : "Ammo ∞");
  mode.textContent = fps3d.mode === "online" ? (fps3d.connected ? "Online" : "Room") : "Bots";
}

async function setupFps3d() {
  if (fps3d.ready || fps3d.loading || fps3d.failed) return;
  fps3d.loading = true;
  setStatus("Loading FPS");
  try {
    const THREE = await loadThree();
    fps3d.THREE = THREE;
    const renderer = get3dRenderer();
    renderer.setClearColor(0x8bdcff, 1);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8bdcff);
    scene.fog = new THREE.Fog(0x8bdcff, 28, 92);
    const camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.1, 90);

    const ambient = new THREE.HemisphereLight(0xcaf6ff, 0x26345c, 1.06);
    scene.add(ambient);
    const arenaLight = new THREE.SpotLight(0xfff0a0, 620, 62, Math.PI / 4.2, 0.52, 1);
    arenaLight.position.set(-7, 20, 8);
    arenaLight.castShadow = true;
    scene.add(arenaLight);
    scene.add(arenaLight.target);

    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(2.1, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff0a0 })
    );
    sun.position.set(-21, 24, -35);
    scene.add(sun);

    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = 0; i < 7; i += 1) {
      const cloud = new THREE.Group();
      [0, 0.7, -0.72, 1.32].forEach((offset, index) => {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(index === 1 ? 0.72 : 0.52, 16, 10), cloudMat);
        puff.position.set(offset, Math.sin(index) * 0.18, 0);
        cloud.add(puff);
      });
      cloud.position.set(-22 + i * 7.3, 11.5 + Math.sin(i * 1.4) * 1.1, -26 - (i % 3) * 8);
      scene.add(cloud);
      fps3d.cover.push(cloud);
    }

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 34, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0x496b5c, roughness: 0.82, metalness: 0.03 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const gridMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 });
    for (let i = -16; i <= 16; i += 4) {
      const a = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.035, 32), gridMat);
      a.position.set(i, 0.03, 0);
      scene.add(a);
      const b = new THREE.Mesh(new THREE.BoxGeometry(32, 0.035, 0.04), gridMat);
      b.position.set(0, 0.03, i);
      scene.add(b);
    }

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2d3d65, roughness: 0.62, metalness: 0.08 });
    [[0, -16, 34, 1], [0, 16, 34, 1], [-16, 0, 1, 34], [16, 0, 1, 34]].forEach(([x, z, w, d]) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 3.4, d), wallMat);
      wall.position.set(x, 1.7, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      scene.add(wall);
      fps3d.walls.push(wall);
    });

    const coverMat = new THREE.MeshStandardMaterial({ color: 0x34466f, roughness: 0.56, metalness: 0.12 });
    const crateMat = new THREE.MeshStandardMaterial({ color: 0xb56a3a, roughness: 0.82, metalness: 0.03 });
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.5, metalness: 0.05 });
    [
      [-8.4, -6.2, 2.2, 2.2, 1.7, coverMat],
      [-5.8, -0.8, 1.45, 4.8, 1.15, barrierMat],
      [-8.7, 5.9, 3.4, 1.3, 1.4, crateMat],
      [-3.2, 6.4, 1.5, 2.8, 2.05, coverMat],
      [0, -8.8, 4.9, 1.15, 1.25, barrierMat],
      [0, -1.2, 1.4, 5.4, 1.35, coverMat],
      [3.8, 3.6, 5.2, 1.25, 1.15, barrierMat],
      [6.4, -4.1, 2.1, 3.4, 1.9, coverMat],
      [8.8, 1.7, 1.55, 2.1, 1.35, crateMat],
      [8.0, 7.1, 3.0, 1.4, 1.55, crateMat],
      [-11.6, 0.4, 1.4, 2.9, 1.6, crateMat],
      [11.7, -8.1, 1.45, 4.2, 1.2, barrierMat]
    ].forEach(([x, z, w, d, h, material]) => {
      const cover = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      cover.position.set(x, h / 2, z);
      cover.castShadow = true;
      cover.receiveShadow = true;
      scene.add(cover);
      fps3d.cover.push(cover);
    });

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x8d5cff, roughness: 0.45, metalness: 0.12 });
    [[-11, -11], [11, -11], [-11, 10], [11, 10], [-2.5, -4.4], [4.7, -0.2]].forEach(([x, z]) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.74, 2.9, 18), pillarMat);
      pillar.position.set(x, 1.45, z);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      scene.add(pillar);
      fps3d.cover.push(pillar);
    });

    const bannerMat = new THREE.MeshBasicMaterial({ color: 0xff5b4a });
    [-10, 10].forEach((x) => {
      const banner = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.22, 0.16), bannerMat);
      banner.position.set(x, 3.2, -15.42);
      scene.add(banner);
      fps3d.cover.push(banner);
    });

    const rig = new THREE.Object3D();
    rig.position.set(0, 1.45, 10);
    scene.add(rig);
    rig.add(camera);

    const weapon = new THREE.Group();
    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.42, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.45, metalness: 0.35 })
    );
    grip.position.set(0.34, -0.55, -0.58);
    grip.rotation.x = -0.18;
    weapon.add(grip);
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.24, 0.78),
      new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x211600, roughness: 0.32, metalness: 0.18 })
    );
    body.position.set(0.36, -0.38, -0.92);
    weapon.add(body);
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.075, 0.74, 16),
      new THREE.MeshStandardMaterial({ color: 0x25c7d9, emissive: 0x08363b, roughness: 0.26, metalness: 0.45 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0.36, -0.34, -1.38);
    weapon.add(barrel);
    const sight = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.08, 0.16),
      new THREE.MeshBasicMaterial({ color: 0xff5b4a })
    );
    sight.position.set(0.36, -0.21, -1.05);
    weapon.add(sight);
    const muzzleLight = new THREE.PointLight(0xffd23f, 0, 8);
    muzzleLight.position.set(0.36, -0.34, -1.8);
    weapon.add(muzzleLight);
    camera.add(weapon);

    fps3d.renderer = renderer;
    fps3d.scene = scene;
    fps3d.camera = camera;
    fps3d.playerRig = rig;
    fps3d.weapon = weapon;
    fps3d.muzzle = barrel;
    fps3d.muzzleLight = muzzleLight;
    fps3d.ready = true;
    fps3d.loading = false;
    resize3d();
    games["arena-fps-3d"].draw();
  } catch {
    fps3d.failed = true;
    fps3d.loading = false;
    setStatus("FPS failed");
    showMessage("The FPS engine did not load. Refresh and try again.", "3D");
  }
}

function makeFpsBot(x, z, color = 0xff5b4a) {
  const THREE = fps3d.THREE;
  const bot = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.48, 1.05, 8, 18),
    new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.04 })
  );
  body.castShadow = true;
  bot.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 18, 14),
    new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x251500, roughness: 0.36 })
  );
  head.position.set(0, 0.9, 0);
  head.castShadow = true;
  bot.add(head);
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xfff0a0 });
  [-0.13, 0.13].forEach((eyeX) => {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.07), eyeMaterial);
    eye.position.set(eyeX, 0.98, -0.31);
    bot.add(eye);
  });
  const browMaterial = new THREE.MeshBasicMaterial({ color: 0x111827 });
  const leftBrow = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.055, 0.07), browMaterial);
  leftBrow.position.set(-0.14, 1.09, -0.305);
  leftBrow.rotation.z = -0.48;
  bot.add(leftBrow);
  const rightBrow = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.055, 0.07), browMaterial);
  rightBrow.position.set(0.14, 1.09, -0.305);
  rightBrow.rotation.z = 0.48;
  bot.add(rightBrow);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.055, 0.07), browMaterial);
  mouth.position.set(0, 0.78, -0.318);
  mouth.rotation.z = 0.08;
  bot.add(mouth);

  const weaponMat = new THREE.MeshStandardMaterial({ color: 0x17213b, roughness: 0.42, metalness: 0.35 });
  const glowMat = new THREE.MeshStandardMaterial({ color: 0xff5b4a, emissive: 0x431008, roughness: 0.3, metalness: 0.18 });
  const handMat = new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.36 });
  const armMat = new THREE.MeshStandardMaterial({ color, roughness: 0.46, metalness: 0.03 });

  [
    [-0.32, 0.38, -0.42, -0.2],
    [0.32, 0.38, -0.42, 0.2]
  ].forEach(([x, y, z, angle]) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.72), armMat);
    arm.position.set(x, y, z);
    arm.rotation.y = angle;
    arm.rotation.x = -0.1;
    arm.castShadow = true;
    bot.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), handMat);
    hand.position.set(x * 0.62, y - 0.02, z - 0.36);
    hand.castShadow = true;
    bot.add(hand);
  });

  const weapon = new THREE.Group();
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.34, 0.18), weaponMat);
  grip.position.set(0.12, 0.16, -0.56);
  grip.rotation.x = -0.22;
  weapon.add(grip);
  const blasterBody = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.24, 0.62), glowMat);
  blasterBody.position.set(0, 0.34, -0.78);
  blasterBody.castShadow = true;
  weapon.add(blasterBody);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.28), weaponMat);
  stock.position.set(0, 0.34, -0.39);
  stock.castShadow = true;
  weapon.add(stock);
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.07, 0.64, 14),
    new THREE.MeshStandardMaterial({ color: 0x25c7d9, emissive: 0x082f38, roughness: 0.26, metalness: 0.42 })
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.36, -1.2);
  weapon.add(barrel);
  const muzzleLight = new THREE.PointLight(0xff5b4a, 0, 6);
  muzzleLight.position.set(0, 0.36, -1.55);
  weapon.add(muzzleLight);
  bot.add(weapon);

  bot.position.set(x, 0.9, z);
  bot.userData = {
    hp: 3,
    cooldown: rand(0.4, 1.2),
    strafe: rand(-1, 1),
    step: rand(0.05, 0.45),
    shotFlash: 0,
    muzzleLight,
    barrel
  };
  fps3d.scene.add(bot);
  return bot;
}

function addShotBeam(endPoint, hit = false) {
  const THREE = fps3d.THREE;
  const start = new THREE.Vector3(0.36, -0.34, -1.78);
  fps3d.camera.localToWorld(start);
  const geometry = new THREE.BufferGeometry().setFromPoints([start, endPoint]);
  const beam = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color: hit ? 0xffd23f : 0x25c7d9, transparent: true, opacity: 0.95 })
  );
  beam.userData.life = 0.12;
  fps3d.scene.add(beam);
  fps3d.beams.push(beam);
}

function addEnemyShotBeam(bot, endPoint) {
  const THREE = fps3d.THREE;
  const start = new THREE.Vector3(0, 0.36, -1.55);
  bot.localToWorld(start);
  const aimedEnd = start.clone().lerp(endPoint, 0.94);
  const geometry = new THREE.BufferGeometry().setFromPoints([start, aimedEnd]);
  const beam = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color: 0xff5b4a, transparent: true, opacity: 0.92 })
  );
  beam.userData.life = 0.16;
  fps3d.scene.add(beam);
  fps3d.beams.push(beam);
}

function showHitMarker(hit = false) {
  const marker = document.getElementById("fpsHit");
  if (!marker) return;
  marker.textContent = hit ? "HIT" : "SHOT";
  marker.classList.toggle("active", true);
  marker.classList.toggle("miss", !hit);
  window.clearTimeout(showHitMarker.timer);
  showHitMarker.timer = window.setTimeout(() => {
    marker.classList.remove("active", "miss");
  }, 160);
}

function showFpsLobby() {
  messageEl.hidden = false;
  messageEl.innerHTML = `<div class="fps-lobby">
    <p class="eyebrow">Arena FPS 3D</p>
    <h3>Choose Bots or Online Multiplayer</h3>
    <div class="fps-mode-row">
      <button type="button" data-fps-mode="bots">Versus Bots</button>
      <button type="button" data-fps-mode="online">Online Multiplayer</button>
    </div>
    <div class="fps-online" ${fps3d.mode === "online" ? "" : "hidden"}>
      <div class="fps-mode-row">
        <button type="button" data-fps-host>Make Room Code</button>
        <button type="button" data-fps-join>Use Code</button>
        <button type="button" data-fps-answer>Make Answer</button>
      </div>
      <textarea id="fpsSignalInput" placeholder="Paste room code or answer here"></textarea>
      <textarea id="fpsSignalOutput" readonly placeholder="Your room code or answer appears here"></textarea>
    </div>
    <p class="fps-note">WASD moves, mouse aims, click or Action fires.</p>
  </div>`;
}

function setFpsMode(mode) {
  fps3d.mode = mode;
  setStatus(mode === "online" ? "Online" : "Bots");
  showFpsLobby();
}

async function createPeer(isHost, remoteOffer = "") {
  const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
  fps3d.peer?.close();
  fps3d.peer = peer;
  fps3d.connected = false;
  const finishIce = new Promise((resolve) => {
    if (peer.iceGatheringState === "complete") resolve();
    peer.addEventListener("icegatheringstatechange", () => {
      if (peer.iceGatheringState === "complete") resolve();
    });
    setTimeout(resolve, 3000);
  });
  function attachChannel(channel) {
    fps3d.channel = channel;
    channel.addEventListener("open", () => {
      fps3d.connected = true;
      setStatus("Online");
    });
    channel.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "state") updateRemotePlayer(data);
      if (data.type === "hit") {
        arcade.score = Math.max(0, arcade.score - 20);
        setStatus("Tagged");
      }
    });
  }
  if (isHost) {
    attachChannel(peer.createDataChannel("arena"));
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    await finishIce;
    return btoa(JSON.stringify(peer.localDescription));
  }
  peer.addEventListener("datachannel", (event) => attachChannel(event.channel));
  await peer.setRemoteDescription(JSON.parse(atob(remoteOffer.trim())));
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  await finishIce;
  return btoa(JSON.stringify(peer.localDescription));
}

async function acceptPeerAnswer(answer) {
  if (!fps3d.peer) return;
  await fps3d.peer.setRemoteDescription(JSON.parse(atob(answer.trim())));
  setStatus("Connecting");
}

function updateRemotePlayer(data) {
  if (!fps3d.ready) return;
  fps3d.remote ??= makeFpsBot(0, 0, 0x25c7d9);
  fps3d.remote.position.set(data.x, 0.9, data.z);
  fps3d.remote.rotation.y = data.yaw;
}

function sendFpsState(dt) {
  fps3d.lastNet += dt;
  if (!fps3d.channel || fps3d.channel.readyState !== "open" || fps3d.lastNet < 0.08) return;
  fps3d.lastNet = 0;
  const p = fps3d.playerRig.position;
  fps3d.channel.send(JSON.stringify({ type: "state", x: p.x, z: p.z, yaw: fps3d.yaw }));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function bestKey(id) {
  return `dshf-best-${id}`;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function syncScore() {
  scoreEl.textContent = Math.floor(arcade.score);
  arcade.best = Math.max(arcade.best, Math.floor(arcade.score));
  bestEl.textContent = arcade.best;
  localStorage.setItem(bestKey(arcade.id), String(arcade.best));
}

function showMessage(title, eyebrow = "Ready?") {
  messageEl.hidden = false;
  messageEl.innerHTML = `<p class="eyebrow">${eyebrow}</p><h3>${title}</h3>`;
}

function hideMessage() {
  messageEl.hidden = true;
}

function clear() {
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(16,35,63,0.12)";
  ctx.lineWidth = 2;
  for (let x = 0; x < canvas.width; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function block(x, y, w, h, fill = aqua, radius = 10) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
  ctx.stroke();
}

function circle(x, y, r, fill = yellow) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function text(value, x, y, size = 26) {
  ctx.fillStyle = ink;
  ctx.font = `900 ${size}px system-ui, sans-serif`;
  ctx.fillText(value, x, y);
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function consumeTap(name) {
  if (!arcade.taps.has(name)) return false;
  arcade.taps.delete(name);
  return true;
}

function endGame(label = "Done") {
  arcade.running = false;
  setStatus(label);
  syncScore();
  showMessage(`${label}. Press Start to play again.`, "Round over");
}

function drawPlayfield(x, y, cols, rows, cell) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, cols * cell, rows * cell);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5;
  ctx.strokeRect(x, y, cols * cell, rows * cell);
  ctx.strokeStyle = "rgba(16,35,63,0.12)";
  ctx.lineWidth = 1;
  for (let col = 1; col < cols; col += 1) {
    ctx.beginPath();
    ctx.moveTo(x + col * cell, y);
    ctx.lineTo(x + col * cell, y + rows * cell);
    ctx.stroke();
  }
  for (let row = 1; row < rows; row += 1) {
    ctx.beginPath();
    ctx.moveTo(x, y + row * cell);
    ctx.lineTo(x + cols * cell, y + row * cell);
    ctx.stroke();
  }
}

const tetrominoes = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]],
  [[1, 1, 0], [0, 1, 1]],
  [[0, 1, 1], [1, 1, 0]]
];

function rotateMatrix(matrix) {
  return matrix[0].map((_, i) => matrix.map((row) => row[i]).reverse());
}

function newPiece() {
  const shape = tetrominoes[Math.floor(rand(0, tetrominoes.length))].map((row) => [...row]);
  return { x: 3, y: 0, shape, color: pieceColors[Math.floor(rand(0, pieceColors.length))] };
}

const games = {
  "turbo-racer-3d": {
    init() {
      setStageMode(true);
      clearRacingScene();
      arcade.data = {
        carX: 0,
        targetX: 0,
        speed: 24,
        roadPulse: 0,
        spawn: 0.25,
        distance: 0,
        boost: 0,
        timeLeft: 60,
        bumped: 0,
        finished: false
      };
      setupRacing3d();
      this.prepareRace();
    },
    prepareRace() {
      if (!racing3d.ready) return;
      racing3d.car.position.set(0, 0, 6);
      if (!racing3d.botCars.length) {
        makeRaceBotCar("Bolt", -4, 4, 34, 0x2968e8, 0xfff0a0);
        makeRaceBotCar("Flash", 0, -7, 35.5, 0xffd23f, 0xff5b4a);
        makeRaceBotCar("Zap", 4, -14, 33.2, 0x7bd629, 0x10233f);
      }
      if (!racing3d.laneMarkers.length) {
        for (let z = -6; z > -78; z -= 8) this.addMarker(z);
      }
    },
    addMarker(z) {
      if (!racing3d.ready) return;
      const THREE = racing3d.THREE;
      [-2, 2].forEach((x) => {
        const marker = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.035, 2.8),
          new THREE.MeshBasicMaterial({ color: 0xfff0a0 })
        );
        marker.position.set(x, 0.065, z);
        racing3d.scene.add(marker);
        racing3d.laneMarkers.push(marker);
      });
    },
    update(dt) {
      const d = arcade.data;
      if (!racing3d.ready) {
        setupRacing3d();
        return;
      }
      this.prepareRace();
      d.timeLeft -= dt;
      d.bumped = Math.max(0, d.bumped - dt);
      if (d.timeLeft <= 0) {
        const place = racePlace();
        endGame(place === 1 ? "You win" : `${racePlaceLabel(place)} place`);
        return;
      }
      if (consumeTap("left")) d.targetX = Math.max(-4, d.targetX - 4);
      if (consumeTap("right")) d.targetX = Math.min(4, d.targetX + 4);
      const boost = arcade.keys.has("action") && d.bumped <= 0 ? 1.55 : 1;
      d.speed = Math.min(52, d.speed + dt * 0.75);
      d.boost = boost;
      d.distance += dt * d.speed * boost * (d.bumped > 0 ? 0.58 : 1);
      d.carX += (d.targetX - d.carX) * Math.min(1, dt * 8.5);
      racing3d.car.position.x = d.carX;
      racing3d.car.rotation.z = (d.carX - d.targetX) * -0.04;
      racing3d.car.rotation.x = Math.sin(performance.now() * 0.013) * 0.012 * boost;

      d.spawn -= dt;
      if (d.spawn <= 0) {
        makeRaceObject(Math.random() > 0.7 ? "coin" : "traffic");
        d.spawn = Math.max(0.36, 1.1 - d.distance * 0.0009);
      }

      racing3d.laneMarkers.forEach((marker) => {
        marker.position.z += d.speed * boost * dt;
        if (marker.position.z > 10) marker.position.z -= 88;
      });
      racing3d.botCars.forEach((bot) => {
        bot.laneTimer -= dt;
        if (bot.laneTimer <= 0) {
          bot.targetLane = [-4, 0, 4][Math.floor(rand(0, 3))];
          bot.laneTimer = rand(1.4, 3.7);
        }
        bot.distance += bot.speed * dt * (0.92 + Math.sin(performance.now() * 0.001 + bot.speed) * 0.05);
        bot.lane += (bot.targetLane - bot.lane) * Math.min(1, dt * 2.4);
        bot.mesh.position.x = bot.lane;
        bot.mesh.position.z = 6 - (bot.distance - d.distance);
        bot.mesh.position.y = 0;
        bot.mesh.rotation.z = (bot.lane - bot.targetLane) * -0.025;
        bot.mesh.visible = bot.mesh.position.z > -82 && bot.mesh.position.z < 22;
        const near = Math.abs(bot.mesh.position.z - racing3d.car.position.z) < 2;
        const sideBySide = Math.abs(bot.mesh.position.x - d.carX) < 1.55;
        if (near && sideBySide && d.bumped <= 0) {
          d.bumped = 1.15;
          d.speed = Math.max(18, d.speed - 9);
          setStatus("Bumped");
        }
      });
      for (let i = racing3d.objects.length - 1; i >= 0; i -= 1) {
        const object = racing3d.objects[i];
        object.position.z += d.speed * boost * dt;
        object.rotation.y += object.userData.kind === "coin" ? dt * 4 : dt * 0.15;
        const near = Math.abs(object.position.z - racing3d.car.position.z) < 1.65;
        const inLane = Math.abs(object.position.x - d.carX) < 1.25;
        if (near && inLane && !object.userData.hit) {
          object.userData.hit = true;
          if (object.userData.kind === "coin") {
            arcade.score += 25;
            racing3d.scene.remove(object);
            racing3d.objects.splice(i, 1);
            setStatus("Coin");
          } else {
            endGame("Crash");
            return;
          }
        } else if (object.position.z > 14) {
          if (object.userData.kind === "traffic") arcade.score += 8;
          racing3d.scene.remove(object);
          racing3d.objects.splice(i, 1);
        }
      }
      arcade.score += dt * boost * 6;
      const place = racePlace();
      if (d.bumped > 0) setStatus("Bumped");
      else setStatus(`${racePlaceLabel(place)} ${raceClock(d.timeLeft)}`);
    },
    draw() {
      if (!racing3d.ready) return;
      resize3d();
      const d = arcade.data;
      racing3d.camera.position.x += (d.carX * 0.28 - racing3d.camera.position.x) * 0.08;
      racing3d.camera.position.y = 5.5 + (d.boost > 1 ? 0.25 : 0);
      racing3d.camera.lookAt(d.carX * 0.2, 0.7, -14);
      racing3d.renderer.setClearColor(0x78d7ff, 1);
      racing3d.renderer.render(racing3d.scene, racing3d.camera);
    }
  },
  "arena-fps-3d": {
    init() {
      setStageMode(true);
      clearFpsScene();
      arcade.data = {
        hp: 100,
        fire: 0,
        flash: 0,
        recoil: 0,
        botSpawn: 0,
        onlineNotice: 0
      };
      fps3d.yaw = 0;
      fps3d.pitch = 0;
      setupFps3d();
      if (fps3d.ready) {
        fps3d.playerRig.position.set(0, 1.45, 10);
        if (fps3d.mode === "bots") {
          fps3d.bots = [makeFpsBot(0, -7), makeFpsBot(-6, -5), makeFpsBot(5, -10)];
        }
      }
      updateFpsHud();
    },
    update(dt) {
      const d = arcade.data;
      if (!fps3d.ready) {
        setupFps3d();
        return;
      }
      const rig = fps3d.playerRig;
      const move = new fps3d.THREE.Vector3();
      if (arcade.keys.has("up") || arcade.keys.has("p1up")) move.z -= 1;
      if (arcade.keys.has("down") || arcade.keys.has("p1down")) move.z += 1;
      if (arcade.keys.has("left")) move.x -= 1;
      if (arcade.keys.has("right")) move.x += 1;
      if (move.lengthSq() > 0) {
        move.normalize().applyAxisAngle(new fps3d.THREE.Vector3(0, 1, 0), fps3d.yaw);
        rig.position.x += move.x * dt * 7.4;
        rig.position.z += move.z * dt * 7.4;
      }
      rig.position.x = Math.max(-14.5, Math.min(14.5, rig.position.x));
      rig.position.z = Math.max(-14.5, Math.min(14.5, rig.position.z));
      fps3d.yaw += ((arcade.keys.has("right") ? -1 : 0) + (arcade.keys.has("left") ? 1 : 0)) * dt * 0.55;
      rig.rotation.y = fps3d.yaw;
      fps3d.camera.rotation.x = fps3d.pitch;
      d.fire -= dt;
      d.flash = Math.max(0, d.flash - dt * 5);
      d.recoil = Math.max(0, d.recoil - dt * 7);
      if (consumeTap("action") || consumeTap("shoot")) this.shoot();

      if (fps3d.mode === "bots") {
        d.botSpawn -= dt;
        if (d.botSpawn <= 0 && fps3d.bots.length < 5) {
          fps3d.bots.push(makeFpsBot(rand(-12, 12), rand(-13, -5)));
          d.botSpawn = rand(2.5, 5);
        }
        fps3d.bots.forEach((bot) => this.updateBot(bot, dt));
      } else {
        sendFpsState(dt);
        d.onlineNotice += dt;
        setStatus(fps3d.connected ? "Online" : "Room code");
      }
      fps3d.muzzle.material.emissive.setHex(d.flash > 0 ? 0xffd23f : 0x08363b);
      fps3d.muzzleLight.intensity = d.flash > 0 ? 18 : 0;
      fps3d.weapon.position.z = d.recoil * 0.18;
      for (let i = fps3d.beams.length - 1; i >= 0; i -= 1) {
        const beam = fps3d.beams[i];
        beam.userData.life -= dt;
        beam.material.opacity = Math.max(0, beam.userData.life / 0.12);
        if (beam.userData.life <= 0) {
          fps3d.scene.remove(beam);
          fps3d.beams.splice(i, 1);
        }
      }
      updateFpsHud();
      if (d.hp <= 0) endGame("Tagged out");
    },
    updateBot(bot, dt) {
      const p = fps3d.playerRig.position;
      const dx = p.x - bot.position.x;
      const dz = p.z - bot.position.z;
      const dist = Math.hypot(dx, dz);
      bot.lookAt(p.x, bot.position.y, p.z);
      if (dist > 4) {
        bot.position.x += (dx / dist) * dt * 1.8;
        bot.position.z += (dz / dist) * dt * 1.8;
      } else {
        bot.position.x += Math.cos(performance.now() * 0.001 + bot.userData.strafe) * dt * 1.2;
      }
      bot.userData.step -= dt;
      if (bot.userData.step <= 0 && dist < 17) {
        playEnemyStep(dist, bot.position.x - p.x);
        bot.userData.step = Math.max(0.24, 0.68 - Math.max(0, 1 - dist / 17) * 0.22 + rand(-0.04, 0.08));
      }
      bot.userData.shotFlash = Math.max(0, bot.userData.shotFlash - dt * 7);
      if (bot.userData.muzzleLight) bot.userData.muzzleLight.intensity = bot.userData.shotFlash > 0 ? 12 : 0;
      if (bot.userData.barrel) bot.userData.barrel.material.emissive.setHex(bot.userData.shotFlash > 0 ? 0xff5b4a : 0x082f38);
      bot.userData.cooldown -= dt;
      if (dist < 10 && bot.userData.cooldown <= 0) {
        arcade.data.hp -= 8;
        bot.userData.shotFlash = 1;
        addEnemyShotBeam(bot, new fps3d.THREE.Vector3(p.x, p.y - 0.35, p.z));
        bot.userData.cooldown = rand(0.65, 1.35);
        setStatus(`${Math.max(0, Math.ceil(arcade.data.hp))} HP`);
      }
    },
    shoot() {
      const d = arcade.data;
      if (d.fire > 0 || !fps3d.ready) return;
      d.fire = 0.18;
      d.flash = 1;
      d.recoil = 1;
      arcade.score += 1;
      fps3d.camera.updateMatrixWorld(true);
      fps3d.scene.updateMatrixWorld(true);
      const ray = new fps3d.THREE.Raycaster();
      ray.setFromCamera(new fps3d.THREE.Vector2(0, 0), fps3d.camera);
      const targets = fps3d.mode === "bots" ? fps3d.bots : [fps3d.remote].filter(Boolean);
      const solidHits = ray.intersectObjects([...targets, ...fps3d.cover, ...fps3d.walls], true);
      const hits = solidHits.filter((hit) => {
        let target = hit.object;
        while (target.parent && !targets.includes(target)) target = target.parent;
        return targets.includes(target);
      });
      const firstHit = solidHits[0];
      if (firstHit && (!hits.length || firstHit.distance < hits[0].distance)) {
        addShotBeam(firstHit.point, false);
        showHitMarker(false);
        setStatus("Cover hit");
        return;
      }
      if (!hits.length) {
        const missPoint = new fps3d.THREE.Vector3(0, 0, -28).applyMatrix4(fps3d.camera.matrixWorld);
        addShotBeam(missPoint, false);
        showHitMarker(false);
        setStatus(fps3d.mode === "online" ? "Miss" : "Fired");
        return;
      }
      addShotBeam(hits[0].point, true);
      showHitMarker(true);
      let target = hits[0].object;
      while (target.parent && !targets.includes(target)) target = target.parent;
      target.userData.hp -= 1;
      if (fps3d.mode === "online" && fps3d.channel?.readyState === "open") {
        fps3d.channel.send(JSON.stringify({ type: "hit" }));
        arcade.score += 25;
        setStatus("Hit player");
        return;
      }
      if (target.userData.hp <= 0) {
        fps3d.scene.remove(target);
        fps3d.bots = fps3d.bots.filter((bot) => bot !== target);
        arcade.score += 50;
        setStatus("Bot down");
      } else {
        arcade.score += 10;
        setStatus("Hit");
      }
    },
    draw() {
      if (!fps3d.ready) return;
      resize3d();
      fps3d.renderer.setClearColor(0x8bdcff, 1);
      fps3d.renderer.render(fps3d.scene, fps3d.camera);
      const ctx2d = ctx;
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    },
    click() {
      ensureFpsAudio();
      if (spotlightCanvas.requestPointerLock && arcade.running) {
        try {
          const lock = spotlightCanvas.requestPointerLock();
          lock?.catch?.(() => {});
        } catch {
          // Some headless browsers do not allow pointer lock.
        }
      }
      arcade.taps.add("shoot");
    }
  },
  "spotlight-dash-3d": {
    init() {
      setStageMode(true);
      if (spotlight3d.ready) {
        spotlight3d.objects.forEach((object) => spotlight3d.scene.remove(object));
        spotlight3d.objects = [];
      }
      arcade.data = {
        playerX: 0,
        targetX: 0,
        speed: 16,
        spawn: 0.18,
        time: 0,
        objects: []
      };
      setupSpotlight3d();
    },
    makeObject(kind) {
      const THREE = spotlight3d.THREE;
      const lane = [-3, 0, 3][Math.floor(rand(0, 3))];
      const isRing = kind === "ring";
      const mesh = isRing
        ? new THREE.Mesh(
            new THREE.TorusGeometry(0.74, 0.11, 14, 34),
            new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x6b4d00, roughness: 0.32 })
          )
        : new THREE.Mesh(
            new THREE.BoxGeometry(1.35, rand(1.2, 2.4), 1.35),
            new THREE.MeshStandardMaterial({ color: 0xff5b4a, emissive: 0x2a0502, roughness: 0.55 })
          );
      mesh.position.set(lane, isRing ? 1.55 : 0.68, -58);
      mesh.rotation.set(isRing ? Math.PI / 2 : 0, rand(-0.5, 0.5), rand(-0.2, 0.2));
      mesh.castShadow = true;
      mesh.userData = { kind, lane, hit: false };
      spotlight3d.scene.add(mesh);
      spotlight3d.objects.push(mesh);
      arcade.data.objects.push(mesh);
    },
    update(dt) {
      const d = arcade.data;
      if (!spotlight3d.ready) {
        setupSpotlight3d();
        return;
      }
      if (consumeTap("left")) d.targetX = Math.max(-3, d.targetX - 3);
      if (consumeTap("right")) d.targetX = Math.min(3, d.targetX + 3);
      const boost = arcade.keys.has("action") ? 1.55 : 1;
      d.time += dt;
      d.speed = Math.min(30, d.speed + dt * 0.45);
      d.playerX += (d.targetX - d.playerX) * Math.min(1, dt * 9);
      d.spawn -= dt;
      if (d.spawn <= 0) {
        this.makeObject(Math.random() > 0.72 ? "ring" : "block");
        d.spawn = Math.max(0.48, 1.05 - d.time * 0.008);
      }
      spotlight3d.player.position.x = d.playerX;
      spotlight3d.player.rotation.y += dt * 2.8 * boost;
      spotlight3d.spotlight.position.x += (d.playerX - spotlight3d.spotlight.position.x) * Math.min(1, dt * 5);
      spotlight3d.spotlight.intensity = arcade.keys.has("action") ? 620 : 420;
      spotlight3d.spotlightTarget.position.x = d.playerX;
      spotlight3d.cone.position.x = d.playerX;
      spotlight3d.cone.scale.setScalar(arcade.keys.has("action") ? 1.12 : 1);

      for (let i = d.objects.length - 1; i >= 0; i -= 1) {
        const item = d.objects[i];
        item.position.z += d.speed * boost * dt;
        item.rotation.y += dt * (item.userData.kind === "ring" ? 3.2 : 0.75);
        const nearPlayer = Math.abs(item.position.z - 5) < 1.05;
        const inLane = Math.abs(item.position.x - d.playerX) < 1.05;
        if (nearPlayer && inLane && !item.userData.hit) {
          item.userData.hit = true;
          if (item.userData.kind === "ring") {
            arcade.score += 20;
            spotlight3d.scene.remove(item);
            d.objects.splice(i, 1);
            spotlight3d.objects = spotlight3d.objects.filter((object) => object !== item);
          } else {
            endGame("Hit");
            return;
          }
        } else if (item.position.z > 12) {
          if (item.userData.kind === "block") arcade.score += 6;
          spotlight3d.scene.remove(item);
          d.objects.splice(i, 1);
          spotlight3d.objects = spotlight3d.objects.filter((object) => object !== item);
        }
      }
      arcade.score += dt * boost * 3;
      setStatus(arcade.keys.has("action") ? "Boost" : "Spotlight");
    },
    draw() {
      if (!spotlight3d.ready) return;
      resize3d();
      const d = arcade.data;
      spotlight3d.floor.position.z = -28 + ((d.time * d.speed) % 6);
      spotlight3d.camera.position.x += (d.playerX * 0.18 - spotlight3d.camera.position.x) * 0.06;
      spotlight3d.camera.lookAt(d.playerX * 0.16, 0.75, -12);
      spotlight3d.renderer.render(spotlight3d.scene, spotlight3d.camera);
    }
  },
  "sky-platformer-3d": {
    init() {
      setStageMode(true);
      arcade.data = {
        level: 1,
        x: -8.6,
        y: 0.65,
        vy: 0,
        grounded: false,
        coins: 0,
        coinTotal: 0,
        jumps: 0,
        time: 0,
        respawnX: -8.6,
        respawnY: 0.65,
        goalX: 29.5,
        won: false
      };
      if (platform3d.ready) {
        const layout = buildPlatformLevel(arcade.data.level);
        arcade.data.x = layout.startX;
        arcade.data.y = layout.startY;
        arcade.data.respawnX = layout.startX;
        arcade.data.respawnY = layout.startY;
        arcade.data.goalX = layout.goalX;
        arcade.data.coinTotal = layout.coinTotal;
        platform3d.player.position.set(arcade.data.x, arcade.data.y, 0);
        platform3d.player.rotation.set(0, 0, 0);
      }
      setupPlatform3d();
    },
    loadLevel(level) {
      const d = arcade.data;
      const layout = buildPlatformLevel(level);
      d.level = layout.level;
      d.x = layout.startX;
      d.y = layout.startY;
      d.vy = 0;
      d.grounded = false;
      d.coins = 0;
      d.coinTotal = layout.coinTotal;
      d.respawnX = layout.startX;
      d.respawnY = layout.startY;
      d.goalX = layout.goalX;
      d.won = false;
      if (platform3d.player) {
        platform3d.player.position.set(d.x, d.y, 0);
        platform3d.player.rotation.set(0, 0, 0);
      }
      setStatus(`Level ${d.level}/20`);
    },
    respawn() {
      const d = arcade.data;
      d.x = d.respawnX;
      d.y = d.respawnY;
      d.vy = 0;
      d.grounded = false;
      setStatus("Lava");
    },
    update(dt) {
      const d = arcade.data;
      if (!platform3d.ready) {
        setupPlatform3d();
        return;
      }
      if (!d.coinTotal) this.loadLevel(d.level || 1);
      d.time += dt;
      const move = (arcade.keys.has("right") ? 1 : 0) - (arcade.keys.has("left") ? 1 : 0);
      d.x += move * dt * 6.2;
      if ((consumeTap("action") || consumeTap("up")) && d.grounded) {
        d.vy = 8.8;
        d.grounded = false;
        d.jumps += 1;
        setStatus("Jump");
      }
      const oldY = d.y;
      d.vy -= 20 * dt;
      d.y += d.vy * dt;
      d.grounded = false;

      platform3d.platforms.forEach((platform) => {
        const half = platform.width / 2 + 0.34;
        const footNow = d.y - 0.65;
        const footBefore = oldY - 0.65;
        const onX = d.x > platform.x - half && d.x < platform.x + half;
        if (onX && d.vy <= 0 && footBefore >= platform.top - 0.08 && footNow <= platform.top + 0.22) {
          d.y = platform.top + 0.65;
          d.vy = 0;
          d.grounded = true;
          if (platform.top > d.respawnY - 0.8) {
            d.respawnX = platform.x;
            d.respawnY = platform.top + 0.65;
          }
        }
      });

      platform3d.coins.forEach((coin) => {
        if (coin.taken) return;
        coin.mesh.rotation.y += dt * 4.5;
        coin.mesh.position.y = coin.y + Math.sin(d.time * 4 + coin.x) * 0.08;
        if (Math.hypot(coin.x - d.x, coin.y - d.y) < 1.0) {
          coin.taken = true;
          coin.mesh.visible = false;
          d.coins += 1;
          arcade.score += 25;
          setStatus(`L${d.level} ${d.coins}/${d.coinTotal}`);
        }
      });

      const inLava = platform3d.hazards.some((hazard) => d.x > hazard.x - hazard.width / 2 && d.x < hazard.x + hazard.width / 2 && d.y < 0.95);
      if (inLava || d.y < -4.2) this.respawn();

      platform3d.player.position.set(d.x, d.y, 0);
      platform3d.player.rotation.y = move < 0 ? -0.28 : move > 0 ? 0.28 : platform3d.player.rotation.y * 0.9;
      platform3d.player.rotation.z = Math.sin(d.time * 8) * (move ? 0.08 : 0.02);
      if (platform3d.goal) platform3d.goal.rotation.y = Math.sin(d.time * 1.7) * 0.08;

      arcade.score += dt * 2;
      if (!d.won && d.x > d.goalX - 0.65 && d.y > 0.85) {
        d.won = true;
        arcade.score += 100 + d.coins * 15;
        if (d.level >= 20) {
          endGame("All 20 clear");
        } else {
          const nextLevel = d.level + 1;
          this.loadLevel(nextLevel);
          showMessage(`Level ${nextLevel}. Keep going.`, "Gate clear");
          window.setTimeout(() => {
            if (arcade.running && arcade.id === "sky-platformer-3d") hideMessage();
          }, 900);
        }
        return;
      }
      if (!d.grounded && d.vy > 0) setStatus("Jump");
      else if (!d.grounded) setStatus("Fall");
      else setStatus(`L${d.level} ${d.coins}/${d.coinTotal}`);
    },
    draw() {
      if (!platform3d.ready) return;
      resize3d();
      const d = arcade.data;
      platform3d.camera.position.x += (d.x + 1.8 - platform3d.camera.position.x) * 0.08;
      platform3d.camera.position.y += (Math.max(4.6, d.y + 4.3) - platform3d.camera.position.y) * 0.08;
      platform3d.camera.lookAt(d.x + 2.2, Math.max(1.2, d.y + 0.4), 0);
      platform3d.renderer.setClearColor(0x8bdcff, 1);
      platform3d.renderer.render(platform3d.scene, platform3d.camera);
    }
  },
  "block-builder-3d": {
    init() {
      setStageMode(true);
      arcade.data = {
        cursorX: 0,
        cursorZ: 0,
        playerX: 0,
        playerZ: 7,
        yaw: 0,
        pitch: -0.1,
        placed: 0,
        materialIndex: 0,
        moveWait: 0,
        time: 0
      };
      if (block3d.ready) {
        buildVoxelIsland();
        updateFirstPersonVoxelTarget();
        updateVoxelSelector();
        updateBlockHud();
      }
      setupBlock3d();
    },
    placeBlock() {
      const d = arcade.data;
      const height = voxelStackHeight(d.cursorX, d.cursorZ);
      if (height >= 6) {
        removeTopVoxelBlock(d.cursorX, d.cursorZ);
        arcade.score = Math.max(0, arcade.score - 2);
        setStatus("Trimmed");
        updateBlockHud();
        updateVoxelSelector();
        return;
      }
      const materials = ["grass", "dirt", "stone", "wood", "glow"];
      addVoxelBlock(d.cursorX, d.cursorZ, height, materials[d.materialIndex % materials.length]);
      d.materialIndex += 1;
      d.placed += 1;
      arcade.score += height >= 4 ? 16 : 8;
      setStatus(`${block3d.blocks.length} blocks`);
      updateBlockHud();
      updateVoxelSelector();
    },
    update(dt) {
      const d = arcade.data;
      if (!block3d.ready) {
        setupBlock3d();
        return;
      }
      d.time += dt;
      d.moveWait = Math.max(0, d.moveWait - dt);
      if (arcade.keys.has("left")) d.yaw += dt * 1.8;
      if (arcade.keys.has("right")) d.yaw -= dt * 1.8;
      const forward = (arcade.keys.has("up") ? 1 : 0) - (arcade.keys.has("down") ? 1 : 0);
      const strafe = (arcade.keys.has("p2up") ? 0 : 0);
      const forwardX = Math.sin(d.yaw);
      const forwardZ = -Math.cos(d.yaw);
      const sideX = Math.cos(d.yaw);
      const sideZ = Math.sin(d.yaw);
      d.playerX += (forwardX * forward + sideX * strafe) * dt * 4.1;
      d.playerZ += (forwardZ * forward + sideZ * strafe) * dt * 4.1;
      d.playerX = Math.max(-6.4, Math.min(6.4, d.playerX));
      d.playerZ = Math.max(-6.4, Math.min(6.4, d.playerZ));
      updateFirstPersonVoxelTarget();
      updateVoxelSelector();
      updateBlockHud();
      if (consumeTap("action")) this.placeBlock();
      if (block3d.selector) block3d.selector.rotation.y += dt * 1.8;
      if (block3d.marker) block3d.marker.material.opacity = 0.32 + Math.sin(d.time * 5) * 0.1;
      arcade.score += dt * Math.min(4, block3d.blocks.length * 0.02);
    },
    draw() {
      if (!block3d.ready) return;
      resize3d();
      const d = arcade.data;
      const footX = Math.max(-6, Math.min(6, Math.round(d.playerX)));
      const footZ = Math.max(-6, Math.min(6, Math.round(d.playerZ)));
      const eyeY = voxelStackHeight(footX, footZ) + 1.72;
      const look = new block3d.THREE.Vector3(
        d.playerX + Math.sin(d.yaw) * Math.cos(d.pitch),
        eyeY + Math.sin(d.pitch),
        d.playerZ - Math.cos(d.yaw) * Math.cos(d.pitch)
      );
      block3d.camera.position.set(d.playerX, eyeY, d.playerZ);
      block3d.camera.lookAt(look);
      block3d.renderer.setClearColor(0x8bdcff, 1);
      block3d.renderer.render(block3d.scene, block3d.camera);
    },
    click() {
      if (spotlightCanvas.requestPointerLock && arcade.running) {
        try {
          const lock = spotlightCanvas.requestPointerLock();
          lock?.catch?.(() => {});
        } catch {
          // Pointer lock can be blocked in automated browsers.
        }
      }
      this.placeBlock();
    }
  },
  "classic-snake": {
    init() {
      arcade.data = {
        tick: 0,
        dir: { x: 1, y: 0 },
        next: { x: 1, y: 0 },
        snake: [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }],
        food: { x: 16, y: 10 }
      };
    },
    update(dt) {
      const d = arcade.data;
      if ((arcade.keys.has("up") || consumeTap("action")) && d.dir.y !== 1) d.next = { x: 0, y: -1 };
      if (arcade.keys.has("down") && d.dir.y !== -1) d.next = { x: 0, y: 1 };
      if (arcade.keys.has("left") && d.dir.x !== 1) d.next = { x: -1, y: 0 };
      if (arcade.keys.has("right") && d.dir.x !== -1) d.next = { x: 1, y: 0 };
      d.tick += dt;
      if (d.tick < Math.max(0.07, 0.13 - arcade.score * 0.001)) return;
      d.tick = 0;
      d.dir = d.next;
      const head = { x: d.snake[0].x + d.dir.x, y: d.snake[0].y + d.dir.y };
      if (head.x < 0 || head.x >= 24 || head.y < 0 || head.y >= 14 || d.snake.some((p) => p.x === head.x && p.y === head.y)) {
        endGame("Crash");
        return;
      }
      d.snake.unshift(head);
      if (head.x === d.food.x && head.y === d.food.y) {
        arcade.score += 10;
        do {
          d.food = { x: Math.floor(rand(0, 24)), y: Math.floor(rand(0, 14)) };
        } while (d.snake.some((p) => p.x === d.food.x && p.y === d.food.y));
      } else {
        d.snake.pop();
      }
      setStatus(`${d.snake.length} long`);
    },
    draw() {
      const d = arcade.data;
      clear();
      const s = 34;
      drawPlayfield(72, 34, 24, 14, s);
      d.snake.forEach((p, i) => block(75 + p.x * s, 37 + p.y * s, 28, 28, i === 0 ? aqua : green, 6));
      circle(89 + d.food.x * s, 51 + d.food.y * s, 14, yellow);
    }
  },
  "solo-pong": {
    init() {
      arcade.data = { paddle: { x: 44, y: 210, w: 26, h: 120 }, ball: { x: 520, y: 260, r: 16, vx: -280, vy: 175 } };
    },
    update(dt) {
      const d = arcade.data;
      if (arcade.keys.has("up") || arcade.keys.has("left")) d.paddle.y -= 460 * dt;
      if (arcade.keys.has("down") || arcade.keys.has("right")) d.paddle.y += 460 * dt;
      d.paddle.y = Math.max(12, Math.min(canvas.height - d.paddle.h - 12, d.paddle.y));
      const b = d.ball;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < b.r || b.y > canvas.height - b.r) b.vy *= -1;
      if (overlap(d.paddle, { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 })) {
        b.vx = Math.abs(b.vx) + 22;
        b.vy += ((b.y - (d.paddle.y + d.paddle.h / 2)) / d.paddle.h) * 180;
        arcade.score += 5;
      }
      if (b.x > canvas.width - b.r) b.vx = -Math.abs(b.vx);
      if (b.x < -25) endGame("Lost");
    },
    draw() {
      const d = arcade.data;
      clear();
      block(d.paddle.x, d.paddle.y, d.paddle.w, d.paddle.h, aqua);
      circle(d.ball.x, d.ball.y, d.ball.r, yellow);
    }
  },
  "falling-blocks": {
    init() {
      arcade.data = { cols: 10, rows: 18, cell: 28, x: 340, y: 18, board: Array.from({ length: 18 }, () => Array(10).fill(null)), piece: newPiece(), drop: 0, speed: 0.62 };
    },
    collide(piece, offX = 0, offY = 0, shape = piece.shape) {
      const d = arcade.data;
      for (let y = 0; y < shape.length; y += 1) {
        for (let x = 0; x < shape[y].length; x += 1) {
          if (!shape[y][x]) continue;
          const px = piece.x + x + offX;
          const py = piece.y + y + offY;
          if (px < 0 || px >= d.cols || py >= d.rows || (py >= 0 && d.board[py][px])) return true;
        }
      }
      return false;
    },
    lockPiece() {
      const d = arcade.data;
      for (let y = 0; y < d.piece.shape.length; y += 1) {
        for (let x = 0; x < d.piece.shape[y].length; x += 1) {
          if (d.piece.shape[y][x]) d.board[d.piece.y + y][d.piece.x + x] = d.piece.color;
        }
      }
      let cleared = 0;
      d.board = d.board.filter((row) => {
        if (row.every(Boolean)) {
          cleared += 1;
          return false;
        }
        return true;
      });
      while (d.board.length < d.rows) d.board.unshift(Array(d.cols).fill(null));
      arcade.score += cleared * cleared * 100;
      d.piece = newPiece();
      if (this.collide(d.piece)) endGame("Stacked");
    },
    update(dt) {
      const d = arcade.data;
      if (consumeTap("left") && !this.collide(d.piece, -1, 0)) d.piece.x -= 1;
      if (consumeTap("right") && !this.collide(d.piece, 1, 0)) d.piece.x += 1;
      if (consumeTap("action") || consumeTap("up")) {
        const rotated = rotateMatrix(d.piece.shape);
        if (!this.collide(d.piece, 0, 0, rotated)) d.piece.shape = rotated;
      }
      if (arcade.keys.has("down")) d.drop += dt * 5;
      d.drop += dt;
      if (d.drop >= d.speed) {
        d.drop = 0;
        if (!this.collide(d.piece, 0, 1)) d.piece.y += 1;
        else this.lockPiece();
      }
      setStatus("Drop");
    },
    draw() {
      const d = arcade.data;
      clear();
      drawPlayfield(d.x, d.y, d.cols, d.rows, d.cell);
      d.board.forEach((row, y) => row.forEach((color, x) => {
        if (color) block(d.x + x * d.cell + 2, d.y + y * d.cell + 2, d.cell - 4, d.cell - 4, color, 4);
      }));
      d.piece.shape.forEach((row, y) => row.forEach((cell, x) => {
        if (cell) block(d.x + (d.piece.x + x) * d.cell + 2, d.y + (d.piece.y + y) * d.cell + 2, d.cell - 4, d.cell - 4, d.piece.color, 4);
      }));
      text("Left/Right move, Action rotates", 42, 510, 22);
    }
  },
  "two-player-pong": {
    init() {
      arcade.data = {
        left: { x: 40, y: 210, w: 24, h: 120, score: 0 },
        right: { x: 896, y: 210, w: 24, h: 120, score: 0 },
        ball: { x: 480, y: 270, r: 15, vx: 310, vy: 170 }
      };
    },
    update(dt) {
      const d = arcade.data;
      if (arcade.keys.has("p1up")) d.left.y -= 460 * dt;
      if (arcade.keys.has("p1down")) d.left.y += 460 * dt;
      if (arcade.keys.has("p2up")) d.right.y -= 460 * dt;
      if (arcade.keys.has("p2down")) d.right.y += 460 * dt;
      for (const paddle of [d.left, d.right]) paddle.y = Math.max(14, Math.min(canvas.height - paddle.h - 14, paddle.y));
      const b = d.ball;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < b.r || b.y > canvas.height - b.r) b.vy *= -1;
      if (b.vx < 0 && overlap(d.left, { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 })) {
        b.vx = Math.abs(b.vx) + 20;
        b.vy += ((b.y - (d.left.y + d.left.h / 2)) / d.left.h) * 190;
      }
      if (b.vx > 0 && overlap(d.right, { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 })) {
        b.vx = -Math.abs(b.vx) - 20;
        b.vy += ((b.y - (d.right.y + d.right.h / 2)) / d.right.h) * 190;
      }
      if (b.x < -30 || b.x > canvas.width + 30) {
        const rightScored = b.x < 0;
        if (rightScored) d.right.score += 1;
        else d.left.score += 1;
        arcade.score = Math.max(d.left.score, d.right.score);
        b.x = 480;
        b.y = 270;
        b.vx = (rightScored ? 1 : -1) * 310;
        b.vy = rand(-210, 210);
      }
      setStatus(`${d.left.score}-${d.right.score}`);
      if (d.left.score >= 7 || d.right.score >= 7) endGame(d.left.score > d.right.score ? "P1 wins" : "P2 wins");
    },
    draw() {
      const d = arcade.data;
      clear();
      ctx.strokeStyle = "rgba(16,35,63,0.28)";
      ctx.lineWidth = 6;
      ctx.setLineDash([16, 16]);
      ctx.beginPath();
      ctx.moveTo(480, 26);
      ctx.lineTo(480, 514);
      ctx.stroke();
      ctx.setLineDash([]);
      block(d.left.x, d.left.y, d.left.w, d.left.h, aqua);
      block(d.right.x, d.right.y, d.right.w, d.right.h, coral);
      circle(d.ball.x, d.ball.y, d.ball.r, yellow);
      text("P1: W/S", 56, 48, 22);
      text("P2: Up/Down", 760, 48, 22);
    }
  },
  "brick-breaker": {
    init() {
      const bricks = [];
      for (let row = 0; row < 4; row += 1) {
        for (let col = 0; col < 9; col += 1) bricks.push({ x: 88 + col * 86, y: 54 + row * 42, w: 68, h: 26, color: pieceColors[(row + col) % pieceColors.length] });
      }
      arcade.data = { paddle: { x: 390, y: 482, w: 180, h: 24 }, ball: { x: 480, y: 430, r: 13, vx: 260, vy: -280 }, bricks };
    },
    update(dt) {
      const d = arcade.data;
      if (arcade.keys.has("left")) d.paddle.x -= 520 * dt;
      if (arcade.keys.has("right")) d.paddle.x += 520 * dt;
      d.paddle.x = Math.max(20, Math.min(canvas.width - d.paddle.w - 20, d.paddle.x));
      const b = d.ball;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < b.r || b.x > canvas.width - b.r) b.vx *= -1;
      if (b.y < b.r) b.vy *= -1;
      if (overlap(d.paddle, { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 })) {
        b.vy = -Math.abs(b.vy);
        b.vx += ((b.x - (d.paddle.x + d.paddle.w / 2)) / d.paddle.w) * 180;
      }
      for (let i = d.bricks.length - 1; i >= 0; i -= 1) {
        if (overlap(d.bricks[i], { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 })) {
          d.bricks.splice(i, 1);
          b.vy *= -1;
          arcade.score += 10;
          break;
        }
      }
      if (d.bricks.length === 0) endGame("Cleared");
      if (b.y > canvas.height + 30) endGame("Dropped");
      setStatus(`${d.bricks.length} bricks`);
    },
    draw() {
      const d = arcade.data;
      clear();
      d.bricks.forEach((brick) => block(brick.x, brick.y, brick.w, brick.h, brick.color, 5));
      block(d.paddle.x, d.paddle.y, d.paddle.w, d.paddle.h, aqua);
      circle(d.ball.x, d.ball.y, d.ball.r, yellow);
    }
  },
  "asteroid-drift": {
    init() {
      arcade.data = { ship: { x: 130, y: 260, w: 48, h: 42 }, rocks: [], spawn: 0, lives: 3 };
    },
    update(dt) {
      const d = arcade.data;
      if (arcade.keys.has("up") || arcade.keys.has("action")) d.ship.y -= 360 * dt;
      if (arcade.keys.has("down")) d.ship.y += 360 * dt;
      if (arcade.keys.has("left")) d.ship.x -= 260 * dt;
      if (arcade.keys.has("right")) d.ship.x += 260 * dt;
      d.ship.x = Math.max(18, Math.min(430, d.ship.x));
      d.ship.y = Math.max(18, Math.min(canvas.height - d.ship.h - 18, d.ship.y));
      d.spawn -= dt;
      if (d.spawn <= 0) {
        d.rocks.push({ x: 990, y: rand(42, 490), r: rand(18, 42), vx: rand(190, 360) });
        d.spawn = rand(0.35, 0.75);
      }
      d.rocks.forEach((rock) => rock.x -= rock.vx * dt);
      for (let i = d.rocks.length - 1; i >= 0; i -= 1) {
        const rock = d.rocks[i];
        if (overlap(d.ship, { x: rock.x - rock.r, y: rock.y - rock.r, w: rock.r * 2, h: rock.r * 2 })) {
          d.lives -= 1;
          d.rocks.splice(i, 1);
        } else if (rock.x < -80) {
          d.rocks.splice(i, 1);
          arcade.score += 3;
        }
      }
      setStatus(`${d.lives} lives`);
      if (d.lives <= 0) endGame("Crashed");
    },
    draw() {
      const d = arcade.data;
      clear();
      d.rocks.forEach((rock) => circle(rock.x, rock.y, rock.r, coral));
      ctx.fillStyle = aqua;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(d.ship.x + d.ship.w, d.ship.y + d.ship.h / 2);
      ctx.lineTo(d.ship.x, d.ship.y);
      ctx.lineTo(d.ship.x + 8, d.ship.y + d.ship.h / 2);
      ctx.lineTo(d.ship.x, d.ship.y + d.ship.h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  },
  "invader-blast": {
    init() {
      const invaders = [];
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 8; col += 1) invaders.push({ x: 142 + col * 84, y: 70 + row * 54, w: 42, h: 30 });
      }
      arcade.data = { player: { x: 450, y: 480, w: 58, h: 26 }, shots: [], invaders, dir: 1, step: 0 };
    },
    update(dt) {
      const d = arcade.data;
      if (arcade.keys.has("left")) d.player.x -= 500 * dt;
      if (arcade.keys.has("right")) d.player.x += 500 * dt;
      d.player.x = Math.max(20, Math.min(canvas.width - d.player.w - 20, d.player.x));
      if (consumeTap("action") && d.shots.length < 3) d.shots.push({ x: d.player.x + d.player.w / 2 - 4, y: d.player.y - 18, w: 8, h: 20 });
      d.shots.forEach((shot) => shot.y -= 520 * dt);
      d.shots = d.shots.filter((shot) => shot.y > -30);
      d.step += dt;
      if (d.step > 0.45) {
        d.step = 0;
        const edge = d.invaders.some((item) => item.x < 40 || item.x > 880);
        if (edge) {
          d.dir *= -1;
          d.invaders.forEach((item) => item.y += 24);
        } else {
          d.invaders.forEach((item) => item.x += d.dir * 18);
        }
      }
      for (let s = d.shots.length - 1; s >= 0; s -= 1) {
        for (let i = d.invaders.length - 1; i >= 0; i -= 1) {
          if (overlap(d.shots[s], d.invaders[i])) {
            d.shots.splice(s, 1);
            d.invaders.splice(i, 1);
            arcade.score += 10;
            break;
          }
        }
      }
      if (d.invaders.length === 0) endGame("Cleared");
      if (d.invaders.some((item) => item.y > 430)) endGame("Invaded");
      setStatus(`${d.invaders.length} left`);
    },
    draw() {
      const d = arcade.data;
      clear();
      block(d.player.x, d.player.y, d.player.w, d.player.h, aqua);
      d.shots.forEach((shot) => block(shot.x, shot.y, shot.w, shot.h, yellow, 3));
      d.invaders.forEach((item) => block(item.x, item.y, item.w, item.h, coral, 6));
    }
  },
  "maze-run": {
    init() {
      arcade.data = {
        player: { x: 44, y: 44, w: 28, h: 28 },
        goal: { x: 878, y: 456, w: 42, h: 42 },
        walls: [
          { x: 130, y: 0, w: 34, h: 390 },
          { x: 260, y: 150, w: 34, h: 390 },
          { x: 390, y: 0, w: 34, h: 390 },
          { x: 520, y: 150, w: 34, h: 390 },
          { x: 650, y: 0, w: 34, h: 390 },
          { x: 780, y: 150, w: 34, h: 390 }
        ]
      };
    },
    update(dt) {
      const d = arcade.data;
      const old = { ...d.player };
      if (arcade.keys.has("left")) d.player.x -= 260 * dt;
      if (arcade.keys.has("right")) d.player.x += 260 * dt;
      if (arcade.keys.has("up") || arcade.keys.has("action")) d.player.y -= 260 * dt;
      if (arcade.keys.has("down")) d.player.y += 260 * dt;
      d.player.x = Math.max(10, Math.min(canvas.width - d.player.w - 10, d.player.x));
      d.player.y = Math.max(10, Math.min(canvas.height - d.player.h - 10, d.player.y));
      if (d.walls.some((wall) => overlap(d.player, wall))) d.player = old;
      arcade.score += dt;
      if (overlap(d.player, d.goal)) endGame("Escaped");
    },
    draw() {
      const d = arcade.data;
      clear();
      block(d.goal.x, d.goal.y, d.goal.w, d.goal.h, green);
      d.walls.forEach((wall) => block(wall.x, wall.y, wall.w, wall.h, coral, 4));
      block(d.player.x, d.player.y, d.player.w, d.player.h, aqua, 6);
    }
  },
  "neon-cube-dash": {
    init() {
      const ground = 438;
      arcade.data = {
        ground,
        cube: { x: 150, y: ground - 48, w: 48, h: 48, vy: 0, rotation: 0 },
        distance: 0,
        speed: 330,
        pulse: 0,
        jumpGrace: 0,
        length: 4650,
        finished: false,
        orbsHit: new Set(),
        course: [
          { type: "spike", x: 720 },
          { type: "spike", x: 930 },
          { type: "block", x: 1160, y: ground - 42, w: 96, h: 42 },
          { type: "orb", x: 1390, y: ground - 122 },
          { type: "spike", x: 1620 },
          { type: "spike", x: 1760 },
          { type: "platform", x: 1980, y: ground - 118, w: 210, h: 28 },
          { type: "spike", x: 2240 },
          { type: "block", x: 2470, y: ground - 70, w: 116, h: 70 },
          { type: "orb", x: 2720, y: ground - 154 },
          { type: "spike", x: 2950 },
          { type: "spike", x: 3090 },
          { type: "platform", x: 3310, y: ground - 155, w: 240, h: 28 },
          { type: "orb", x: 3610, y: ground - 135 },
          { type: "spike", x: 3830 },
          { type: "block", x: 4060, y: ground - 58, w: 92, h: 58 },
          { type: "spike", x: 4245 },
          { type: "finish", x: 4550 }
        ]
      };
      setStatus("0%");
    },
    jump(power = 720) {
      const d = arcade.data;
      d.cube.vy = -power;
      d.jumpGrace = 0;
      setStatus("Jump");
    },
    update(dt) {
      const d = arcade.data;
      const cube = d.cube;
      d.pulse += dt;
      d.distance += d.speed * dt;
      d.speed = Math.min(460, d.speed + dt * 4.5);
      d.jumpGrace = Math.max(0, d.jumpGrace - dt);
      const jumpPressed = consumeTap("action") || consumeTap("up");
      if (jumpPressed && d.jumpGrace > 0) this.jump();

      cube.vy += 1850 * dt;
      cube.y += cube.vy * dt;
      cube.rotation += dt * (cube.vy < 0 ? 8.2 : 6.4);
      let floor = d.ground - cube.h;
      d.course.forEach((item) => {
        if (item.type !== "platform" && item.type !== "block") return;
        const screenX = item.x - d.distance + cube.x;
        const cubeWorldX = d.distance + cube.x;
        const closeX = cubeWorldX + cube.w > item.x && cubeWorldX < item.x + item.w;
        const top = item.y - cube.h;
        if (closeX && cube.y <= top + 22 && cube.y + cube.h + cube.vy * dt >= item.y - 4) floor = Math.min(floor, top);
        if (screenX < -180 || screenX > canvas.width + 180) return;
      });
      if (cube.y >= floor) {
        cube.y = floor;
        cube.vy = 0;
        d.jumpGrace = 0.11;
        cube.rotation = Math.round(cube.rotation / (Math.PI / 2)) * (Math.PI / 2);
      }
      if (cube.y > canvas.height + 80) {
        endGame("Dropped");
        return;
      }

      const cubeWorld = { x: d.distance + cube.x + 22, y: cube.y + 22, w: cube.w - 44, h: cube.h - 34 };
      for (const item of d.course) {
        if (item.type === "finish" && d.distance + cube.x > item.x) {
          endGame("Clear");
          return;
        }
        if (item.type === "spike") {
          const hazard = { x: item.x + 29.5, y: d.ground - 10, w: 1, h: 10 };
          if (overlap(cubeWorld, hazard)) {
            endGame("Spiked");
            return;
          }
        }
        if (item.type === "block") {
          const wall = { x: item.x + 8, y: item.y + 6, w: item.w - 16, h: item.h - 6 };
          if (overlap(cubeWorld, wall) && cubeWorld.y + cubeWorld.h > item.y + 18) {
            endGame("Bonked");
            return;
          }
        }
        if (item.type === "orb") {
          const orbBox = { x: item.x - 23, y: item.y - 23, w: 46, h: 46 };
          if (overlap(cubeWorld, orbBox) && !d.orbsHit.has(item.x)) {
            d.orbsHit.add(item.x);
            arcade.score += 40;
            if (jumpPressed || arcade.keys.has("action")) this.jump(820);
            setStatus("Orb");
          }
        }
      }
      const progress = Math.min(100, Math.floor((d.distance / d.length) * 100));
      arcade.score += dt * 9 + progress * dt * 0.12;
      setStatus(`${progress}%`);
      if (d.distance > d.length) endGame("Clear");
    },
    drawSpike(x, ground, pulse) {
      ctx.fillStyle = coral;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x + 16, ground);
      ctx.lineTo(x + 30, ground - 34 - pulse * 3);
      ctx.lineTo(x + 44, ground);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    },
    draw() {
      const d = arcade.data;
      const beat = (Math.sin(d.pulse * 9) + 1) / 2;
      ctx.fillStyle = "#101a31";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = `rgba(37,199,217,${0.12 + beat * 0.12})`;
      ctx.lineWidth = 2;
      for (let x = -((d.distance * 0.45) % 54); x < canvas.width; x += 54) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 30; y < canvas.height; y += 54) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      ctx.fillStyle = "#172344";
      ctx.fillRect(0, d.ground, canvas.width, canvas.height - d.ground);
      ctx.fillStyle = `rgba(255,210,63,${0.16 + beat * 0.18})`;
      ctx.fillRect(0, d.ground - 6, canvas.width, 6);
      d.course.forEach((item) => {
        const x = item.x - d.distance + d.cube.x;
        if (x < -180 || x > canvas.width + 180) return;
        if (item.type === "spike") this.drawSpike(x, d.ground, beat);
        if (item.type === "block" || item.type === "platform") block(x, item.y, item.w, item.h, item.type === "platform" ? aqua : purple, item.type === "platform" ? 5 : 3);
        if (item.type === "orb" && !d.orbsHit.has(item.x)) {
          circle(x, item.y, 22 + beat * 3, yellow);
          ctx.fillStyle = aqua;
          ctx.beginPath();
          ctx.arc(x, item.y, 8, 0, Math.PI * 2);
          ctx.fill();
        }
        if (item.type === "finish") {
          block(x, d.ground - 136, 22, 136, green, 4);
          text("FINISH", x - 42, d.ground - 152, 22);
        }
      });
      ctx.save();
      ctx.translate(d.cube.x + d.cube.w / 2, d.cube.y + d.cube.h / 2);
      ctx.rotate(d.cube.rotation);
      block(-d.cube.w / 2, -d.cube.h / 2, d.cube.w, d.cube.h, yellow, 5);
      ctx.fillStyle = ink;
      ctx.fillRect(4, -13, 8, 8);
      ctx.restore();
      const progress = Math.min(1, d.distance / d.length);
      block(54, 34, 852, 18, "rgba(255,255,255,0.9)", 8);
      ctx.fillStyle = aqua;
      ctx.fillRect(58, 38, 844 * progress, 10);
      text("Neon Cube Dash", 54, 88, 24);
    }
  },
  "stack-jump": {
    init() {
      arcade.data = { runner: { x: 130, y: 386, w: 50, h: 62, vy: 0 }, blocks: [], spawn: 0.9, speed: 260 };
    },
    update(dt) {
      const d = arcade.data;
      if (consumeTap("action") && d.runner.y >= 386) d.runner.vy = -520;
      d.runner.vy += 900 * dt;
      d.runner.y += d.runner.vy * dt;
      if (d.runner.y > 386) {
        d.runner.y = 386;
        d.runner.vy = 0;
      }
      d.spawn -= dt;
      if (d.spawn <= 0) {
        d.blocks.push({ x: 980, y: 408, w: rand(36, 64), h: rand(42, 78) });
        d.spawn = rand(0.75, 1.35);
      }
      d.blocks.forEach((item) => item.x -= d.speed * dt);
      d.blocks = d.blocks.filter((item) => item.x > -80);
      if (d.blocks.some((item) => overlap(d.runner, item))) endGame("Tripped");
      arcade.score += dt * 10;
    },
    draw() {
      const d = arcade.data;
      clear();
      ctx.fillStyle = green;
      ctx.fillRect(0, 450, canvas.width, 90);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 450);
      ctx.lineTo(canvas.width, 450);
      ctx.stroke();
      d.blocks.forEach((item) => block(item.x, item.y, item.w, item.h, coral));
      block(d.runner.x, d.runner.y, d.runner.w, d.runner.h, aqua);
    }
  },
  "target-pop": {
    init() {
      arcade.data = { target: { x: 480, y: 270, r: 46 }, timer: 20 };
    },
    update(dt) {
      arcade.data.timer -= dt;
      setStatus(`${Math.ceil(arcade.data.timer)}s`);
      if (arcade.data.timer <= 0) endGame("Time");
    },
    draw() {
      clear();
      circle(arcade.data.target.x, arcade.data.target.y, arcade.data.target.r, coral);
      circle(arcade.data.target.x, arcade.data.target.y, arcade.data.target.r * 0.48, yellow);
    },
    click(x, y) {
      const t = arcade.data.target;
      if (Math.hypot(x - t.x, y - t.y) <= t.r) {
        arcade.score += 10;
        t.x = rand(70, 890);
        t.y = rand(70, 470);
        t.r = Math.max(22, t.r - 1);
      }
    }
  }
};

function selectGame(id) {
  arcade.id = id;
  arcade.running = false;
  setStageMode(is3dGame(id));
  arcade.score = 0;
  arcade.best = Number(localStorage.getItem(bestKey(id)) || 0);
  arcade.keys.clear();
  arcade.taps.clear();
  titleEl.textContent = gameTitles[id];
  scoreEl.textContent = "0";
  bestEl.textContent = arcade.best;
  setStatus("Ready");
  games[id].init();
  games[id].draw();
  if (id === "arena-fps-3d") showFpsLobby();
  else showMessage(`${gameTitles[id]} is selected. Press Start.`);
  document.querySelectorAll("button[data-game]").forEach((button) => button.classList.toggle("selected", button.dataset.game === id));
}

function startGame() {
  if (arcade.id === "arena-fps-3d") ensureFpsAudio();
  startButton.blur();
  arcade.running = true;
  setStageMode(is3dGame(arcade.id));
  arcade.score = 0;
  arcade.last = performance.now();
  arcade.keys.clear();
  arcade.taps.clear();
  setStatus("Play");
  games[arcade.id].init();
  hideMessage();
  syncScore();
  requestAnimationFrame(loop);
}

function loop(now) {
  if (!arcade.running) return;
  const dt = Math.min(0.04, (now - arcade.last) / 1000 || 0.016);
  arcade.last = now;
  games[arcade.id].update(dt);
  games[arcade.id].draw();
  syncScore();
  if (arcade.running) requestAnimationFrame(loop);
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height
  };
}

gamePickers.forEach((picker) => {
  picker.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-game]");
    if (button) selectGame(button.dataset.game);
  });
});

startButton.addEventListener("click", startGame);
leftButton.addEventListener("pointerdown", () => {
  arcade.keys.add("left");
  arcade.taps.add("left");
});
leftButton.addEventListener("pointerup", () => arcade.keys.delete("left"));
leftButton.addEventListener("pointerleave", () => arcade.keys.delete("left"));
rightButton.addEventListener("pointerdown", () => {
  arcade.keys.add("right");
  arcade.taps.add("right");
});
rightButton.addEventListener("pointerup", () => arcade.keys.delete("right"));
rightButton.addEventListener("pointerleave", () => arcade.keys.delete("right"));
actionButton.addEventListener("pointerdown", () => {
  arcade.keys.add("action");
  arcade.taps.add("action");
});
actionButton.addEventListener("pointerup", () => arcade.keys.delete("action"));
actionButton.addEventListener("pointerleave", () => arcade.keys.delete("action"));
canvas.addEventListener("click", (event) => games[arcade.id].click?.(canvasPoint(event).x, canvasPoint(event).y));
spotlightCanvas.addEventListener("click", (event) => games[arcade.id].click?.(event));
messageEl.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button || arcade.id !== "arena-fps-3d") return;
  const input = document.getElementById("fpsSignalInput");
  const output = document.getElementById("fpsSignalOutput");
  try {
    if (button.dataset.fpsMode) setFpsMode(button.dataset.fpsMode);
    if (button.hasAttribute("data-fps-host")) {
      fps3d.mode = "online";
      setStatus("Making room");
      output.value = await createPeer(true);
    }
    if (button.hasAttribute("data-fps-join")) {
      fps3d.mode = "online";
      setStatus("Joining");
      output.value = await createPeer(false, input.value);
    }
    if (button.hasAttribute("data-fps-answer")) {
      await acceptPeerAnswer(input.value);
      output.value = "Connected. Press Start.";
    }
  } catch {
    setStatus("Code error");
  }
});
window.addEventListener("resize", resize3d);
document.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement !== spotlightCanvas) return;
  if (arcade.id === "arena-fps-3d") {
    fps3d.yaw -= event.movementX * 0.0025;
    fps3d.pitch = Math.max(-1.05, Math.min(1.05, fps3d.pitch - event.movementY * 0.002));
  }
  if (arcade.id === "block-builder-3d") {
    arcade.data.yaw -= event.movementX * 0.0025;
    arcade.data.pitch = Math.max(-0.72, Math.min(0.42, arcade.data.pitch - event.movementY * 0.0018));
    updateFirstPersonVoxelTarget();
    updateVoxelSelector();
    updateBlockHud();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    arcade.keys.add("left");
    arcade.taps.add("left");
  }
  if (event.key === "ArrowRight") {
    arcade.keys.add("right");
    arcade.taps.add("right");
  }
  if (event.key === "ArrowUp") {
    arcade.keys.add("up");
    arcade.keys.add("p2up");
    arcade.taps.add("up");
  }
  if (event.key === "ArrowDown") {
    arcade.keys.add("down");
    arcade.keys.add("p2down");
  }
  if (event.key === "a" || event.key === "A") {
    arcade.keys.add("left");
    arcade.taps.add("left");
  }
  if (event.key === "d" || event.key === "D") {
    arcade.keys.add("right");
    arcade.taps.add("right");
  }
  if (event.key === "w" || event.key === "W") {
    arcade.keys.add("p1up");
    arcade.keys.add("up");
    arcade.taps.add("up");
  }
  if (event.key === "s" || event.key === "S") {
    arcade.keys.add("p1down");
    arcade.keys.add("down");
  }
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    arcade.keys.add("action");
    arcade.taps.add("action");
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") arcade.keys.delete("left");
  if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") arcade.keys.delete("right");
  if (event.key === "ArrowUp") {
    arcade.keys.delete("up");
    arcade.keys.delete("p2up");
  }
  if (event.key === "ArrowDown") {
    arcade.keys.delete("down");
    arcade.keys.delete("p2down");
  }
  if (event.key === "w" || event.key === "W") arcade.keys.delete("up");
  if (event.key === "s" || event.key === "S") arcade.keys.delete("down");
  if (event.key === "w" || event.key === "W") arcade.keys.delete("p1up");
  if (event.key === "s" || event.key === "S") arcade.keys.delete("p1down");
  if (event.key === " " || event.key === "Enter") arcade.keys.delete("action");
});

selectGame("turbo-racer-3d");
