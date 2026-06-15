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
const titleEl = document.getElementById("currentGameTitle");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const statusEl = document.getElementById("status");
const messageEl = document.getElementById("gameMessage");
const picker = document.getElementById("gamePicker");
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
const threeGameIds = new Set(["arena-fps-3d", "spotlight-dash-3d"]);

const gameTitles = {
  "arena-fps-3d": "Arena FPS 3D",
  "spotlight-dash-3d": "Spotlight Dash 3D",
  "classic-snake": "Classic Snake",
  "solo-pong": "Solo Pong",
  "falling-blocks": "Falling Blocks",
  "two-player-pong": "Two Player Pong",
  "brick-breaker": "Brick Breaker",
  "asteroid-drift": "Asteroid Drift",
  "invader-blast": "Invader Blast",
  "maze-run": "Maze Run",
  "stack-jump": "Stack Jump",
  "target-pop": "Target Pop"
};

const arcade = {
  id: "arena-fps-3d",
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
  bots: [],
  remote: null,
  walls: [],
  yaw: 0,
  pitch: 0,
  peer: null,
  channel: null,
  lastNet: 0,
  connected: false
};

function setStageMode(is3d) {
  canvas.hidden = is3d;
  spotlightCanvas.hidden = !is3d;
  stage.classList.toggle("is-3d", is3d);
}

function is3dGame(id) {
  return threeGameIds.has(id);
}

function loadThree() {
  threePromise ??= import("/assets/three.module.js");
  return threePromise;
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
  for (const camera of [spotlight3d.camera, fps3d.camera]) {
    if (!camera) continue;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
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
  [...fps3d.bots, ...fps3d.walls, fps3d.remote].filter(Boolean).forEach((item) => fps3d.scene.remove(item));
  fps3d.bots = [];
  fps3d.walls = [];
  fps3d.remote = null;
}

async function setupFps3d() {
  if (fps3d.ready || fps3d.loading || fps3d.failed) return;
  fps3d.loading = true;
  setStatus("Loading FPS");
  try {
    const THREE = await loadThree();
    fps3d.THREE = THREE;
    const renderer = get3dRenderer();
    renderer.setClearColor(0x07090f, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x07090f, 12, 64);
    const camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.1, 90);

    const ambient = new THREE.HemisphereLight(0x7aa7ff, 0x07090f, 0.58);
    scene.add(ambient);
    const arenaLight = new THREE.SpotLight(0xfff0a0, 520, 50, Math.PI / 4.6, 0.45, 1);
    arenaLight.position.set(0, 16, 0);
    arenaLight.castShadow = true;
    scene.add(arenaLight);
    scene.add(arenaLight.target);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 34, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0x101a31, roughness: 0.72, metalness: 0.08 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const gridMat = new THREE.MeshBasicMaterial({ color: 0x25c7d9, transparent: true, opacity: 0.18 });
    for (let i = -16; i <= 16; i += 4) {
      const a = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.035, 32), gridMat);
      a.position.set(i, 0.03, 0);
      scene.add(a);
      const b = new THREE.Mesh(new THREE.BoxGeometry(32, 0.035, 0.04), gridMat);
      b.position.set(0, 0.03, i);
      scene.add(b);
    }

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x26345c, roughness: 0.58, metalness: 0.1 });
    [[0, -16, 34, 1], [0, 16, 34, 1], [-16, 0, 1, 34], [16, 0, 1, 34]].forEach(([x, z, w, d]) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 3.4, d), wallMat);
      wall.position.set(x, 1.7, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      scene.add(wall);
      fps3d.walls.push(wall);
    });

    const rig = new THREE.Object3D();
    rig.position.set(0, 1.45, 10);
    scene.add(rig);
    rig.add(camera);

    const muzzle = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.16, 0.8),
      new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x3b2d00, roughness: 0.4 })
    );
    muzzle.position.set(0.42, -0.34, -0.78);
    camera.add(muzzle);

    fps3d.renderer = renderer;
    fps3d.scene = scene;
    fps3d.camera = camera;
    fps3d.playerRig = rig;
    fps3d.muzzle = muzzle;
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
    new THREE.CapsuleGeometry(0.45, 1.0, 6, 14),
    new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.04 })
  );
  body.castShadow = true;
  bot.add(body);
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.08), new THREE.MeshBasicMaterial({ color: 0xfff0a0 }));
  eye.position.set(0, 0.38, -0.42);
  bot.add(eye);
  bot.position.set(x, 0.9, z);
  bot.userData = { hp: 3, cooldown: rand(0.4, 1.2), strafe: rand(-1, 1) };
  fps3d.scene.add(bot);
  return bot;
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
  "arena-fps-3d": {
    init() {
      setStageMode(true);
      clearFpsScene();
      arcade.data = {
        hp: 100,
        fire: 0,
        flash: 0,
        botSpawn: 0,
        onlineNotice: 0
      };
      fps3d.yaw = 0;
      fps3d.pitch = 0;
      setupFps3d();
      if (fps3d.ready) {
        fps3d.playerRig.position.set(0, 1.45, 10);
        if (fps3d.mode === "bots") {
          fps3d.bots = [makeFpsBot(-6, -5), makeFpsBot(4, -7), makeFpsBot(0, -12)];
        }
      }
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
      fps3d.muzzle.material.emissive.setHex(d.flash > 0 ? 0xffd23f : 0x3b2d00);
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
      bot.userData.cooldown -= dt;
      if (dist < 10 && bot.userData.cooldown <= 0) {
        arcade.data.hp -= 8;
        bot.userData.cooldown = rand(0.65, 1.35);
        setStatus(`${Math.max(0, Math.ceil(arcade.data.hp))} HP`);
      }
    },
    shoot() {
      const d = arcade.data;
      if (d.fire > 0 || !fps3d.ready) return;
      d.fire = 0.18;
      d.flash = 1;
      arcade.score += 1;
      const ray = new fps3d.THREE.Raycaster();
      ray.setFromCamera(new fps3d.THREE.Vector2(0, 0), fps3d.camera);
      const targets = fps3d.mode === "bots" ? fps3d.bots : [fps3d.remote].filter(Boolean);
      const hits = ray.intersectObjects(targets, true);
      if (!hits.length) {
        setStatus(fps3d.mode === "online" ? "Miss" : "Fired");
        return;
      }
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
      fps3d.renderer.setClearColor(0x07090f, 1);
      fps3d.renderer.render(fps3d.scene, fps3d.camera);
      const ctx2d = ctx;
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    },
    click() {
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
  picker.querySelectorAll("button").forEach((button) => button.classList.toggle("selected", button.dataset.game === id));
}

function startGame() {
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

picker.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-game]");
  if (button) selectGame(button.dataset.game);
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
  if (document.pointerLockElement !== spotlightCanvas || arcade.id !== "arena-fps-3d") return;
  fps3d.yaw -= event.movementX * 0.0025;
  fps3d.pitch = Math.max(-1.05, Math.min(1.05, fps3d.pitch - event.movementY * 0.002));
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

selectGame("arena-fps-3d");
