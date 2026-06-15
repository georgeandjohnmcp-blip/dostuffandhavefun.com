const canvas = document.getElementById("arcadeCanvas");
const ctx = canvas.getContext("2d");
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
const colors = [coral, yellow, aqua, green];

const gameTitles = {
  "dot-dodge": "Dot Dodge",
  "star-catch": "Star Catch",
  "snake-snack": "Snake Snack",
  "memory-match": "Memory Match",
  "target-pop": "Target Pop",
  "color-swap": "Color Swap",
  "mini-pong": "Mini Pong",
  "maze-run": "Maze Run",
  "stack-jump": "Stack Jump",
  "number-nudge": "Number Nudge"
};

const arcade = {
  id: "dot-dodge",
  running: false,
  score: 0,
  best: 0,
  last: 0,
  keys: new Set(),
  data: {}
};

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

function endGame(label = "Done") {
  arcade.running = false;
  setStatus(label);
  syncScore();
  showMessage(`${label}. Press Start to play again.`, "Round over");
}

const games = {
  "dot-dodge": {
    init() {
      arcade.data = { player: { x: 454, y: 460, w: 52, h: 52 }, blocks: [], spawn: 0, speed: 3.5 };
    },
    update(dt) {
      const d = arcade.data;
      if (arcade.keys.has("left")) d.player.x -= 420 * dt;
      if (arcade.keys.has("right")) d.player.x += 420 * dt;
      d.player.x = Math.max(20, Math.min(canvas.width - d.player.w - 20, d.player.x));
      d.spawn -= dt;
      if (d.spawn <= 0) {
        d.blocks.push({ x: rand(20, 890), y: -70, w: rand(38, 86), h: rand(38, 86) });
        d.spawn = Math.max(0.25, 0.72 - arcade.score * 0.004);
      }
      d.speed += dt * 0.08;
      d.blocks.forEach((item) => item.y += (150 + d.speed * 38) * dt);
      d.blocks = d.blocks.filter((item) => item.y < 620);
      if (d.blocks.some((item) => overlap(d.player, item))) endGame("Hit");
      arcade.score += dt * 12;
    },
    draw() {
      const d = arcade.data;
      clear();
      d.blocks.forEach((item) => block(item.x, item.y, item.w, item.h, coral));
      block(d.player.x, d.player.y, d.player.w, d.player.h, aqua);
    }
  },
  "star-catch": {
    init() {
      arcade.data = { tray: { x: 410, y: 470, w: 140, h: 34 }, drops: [], spawn: 0, lives: 3 };
    },
    update(dt) {
      const d = arcade.data;
      if (arcade.keys.has("left")) d.tray.x -= 430 * dt;
      if (arcade.keys.has("right")) d.tray.x += 430 * dt;
      d.tray.x = Math.max(15, Math.min(canvas.width - d.tray.w - 15, d.tray.x));
      d.spawn -= dt;
      if (d.spawn <= 0) {
        d.drops.push({ x: rand(35, 925), y: -30, r: 18, good: Math.random() > 0.22, vy: rand(180, 290) });
        d.spawn = 0.48;
      }
      for (const drop of d.drops) drop.y += drop.vy * dt;
      for (let i = d.drops.length - 1; i >= 0; i -= 1) {
        const drop = d.drops[i];
        const box = { x: drop.x - drop.r, y: drop.y - drop.r, w: drop.r * 2, h: drop.r * 2 };
        if (overlap(d.tray, box)) {
          arcade.score += drop.good ? 10 : -15;
          if (!drop.good) d.lives -= 1;
          d.drops.splice(i, 1);
        } else if (drop.y > 570) {
          if (drop.good) d.lives -= 1;
          d.drops.splice(i, 1);
        }
      }
      if (d.lives <= 0) endGame("Out");
      setStatus(`${d.lives} left`);
    },
    draw() {
      const d = arcade.data;
      clear();
      d.drops.forEach((drop) => circle(drop.x, drop.y, drop.r, drop.good ? yellow : coral));
      block(d.tray.x, d.tray.y, d.tray.w, d.tray.h, aqua);
    }
  },
  "snake-snack": {
    init() {
      arcade.data = { tick: 0, dir: { x: 1, y: 0 }, next: { x: 1, y: 0 }, snake: [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }], food: { x: 16, y: 10 } };
    },
    update(dt) {
      const d = arcade.data;
      if (arcade.keys.has("up") && d.dir.y !== 1) d.next = { x: 0, y: -1 };
      if (arcade.keys.has("down") && d.dir.y !== -1) d.next = { x: 0, y: 1 };
      if (arcade.keys.has("left") && d.dir.x !== 1) d.next = { x: -1, y: 0 };
      if (arcade.keys.has("right") && d.dir.x !== -1) d.next = { x: 1, y: 0 };
      d.tick += dt;
      if (d.tick < 0.12) return;
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
        d.food = { x: Math.floor(rand(0, 24)), y: Math.floor(rand(0, 14)) };
      } else {
        d.snake.pop();
      }
    },
    draw() {
      const d = arcade.data;
      clear();
      const s = 34;
      d.snake.forEach((p, i) => block(72 + p.x * s, 34 + p.y * s, 28, 28, i === 0 ? aqua : green, 6));
      circle(86 + d.food.x * s, 48 + d.food.y * s, 14, yellow);
    },
    action() {
      arcade.data.next = { x: 0, y: -1 };
    }
  },
  "memory-match": {
    init() {
      const values = ["A", "B", "C", "D", "E", "F", "G", "H"];
      const cards = [...values, ...values].sort(() => Math.random() - 0.5).map((value, i) => ({ value, i, flipped: false, matched: false }));
      arcade.data = { cards, open: [], lock: 0 };
    },
    update(dt) {
      const d = arcade.data;
      if (d.lock > 0) {
        d.lock -= dt;
        if (d.lock <= 0) {
          d.open.forEach((card) => card.flipped = false);
          d.open = [];
        }
      }
      if (d.cards.every((card) => card.matched)) endGame("Cleared");
    },
    draw() {
      clear();
      const d = arcade.data;
      d.cards.forEach((card, i) => {
        const x = 210 + (i % 4) * 138;
        const y = 52 + Math.floor(i / 4) * 108;
        block(x, y, 104, 76, card.matched ? green : card.flipped ? yellow : aqua);
        text(card.flipped || card.matched ? card.value : "?", x + 38, y + 50, 34);
      });
    },
    click(x, y) {
      const d = arcade.data;
      if (d.lock > 0 || d.open.length >= 2) return;
      d.cards.forEach((card, i) => {
        const cx = 210 + (i % 4) * 138;
        const cy = 52 + Math.floor(i / 4) * 108;
        if (x >= cx && x <= cx + 104 && y >= cy && y <= cy + 76 && !card.flipped && !card.matched) {
          card.flipped = true;
          d.open.push(card);
          if (d.open.length === 2) {
            arcade.score += 1;
            if (d.open[0].value === d.open[1].value) {
              d.open.forEach((item) => item.matched = true);
              d.open = [];
              arcade.score += 10;
            } else {
              d.lock = 0.7;
            }
          }
        }
      });
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
  },
  "color-swap": {
    init() {
      arcade.data = { color: 0, drop: { x: 480, y: -30, c: 1, vy: 160 }, lives: 3 };
    },
    update(dt) {
      const d = arcade.data;
      if (arcade.keys.has("left")) d.color = (d.color + 3) % 4;
      if (arcade.keys.has("right")) d.color = (d.color + 1) % 4;
      arcade.keys.delete("left");
      arcade.keys.delete("right");
      d.drop.y += d.drop.vy * dt;
      if (d.drop.y > 430) {
        if (d.drop.c === d.color) arcade.score += 10;
        else d.lives -= 1;
        d.drop = { x: rand(120, 840), y: -30, c: Math.floor(rand(0, 4)), vy: rand(150, 240) };
      }
      setStatus(`${d.lives} left`);
      if (d.lives <= 0) endGame("Miss");
    },
    draw() {
      const d = arcade.data;
      clear();
      circle(d.drop.x, d.drop.y, 34, colors[d.drop.c]);
      block(380, 430, 200, 48, colors[d.color]);
      text("Match this color", 374, 520, 24);
    },
    action() {
      arcade.data.color = (arcade.data.color + 1) % 4;
    }
  },
  "mini-pong": {
    init() {
      arcade.data = { paddle: { x: 42, y: 210, w: 26, h: 120 }, ball: { x: 520, y: 260, r: 16, vx: -260, vy: 170 } };
    },
    update(dt) {
      const d = arcade.data;
      if (arcade.keys.has("up") || arcade.keys.has("left")) d.paddle.y -= 430 * dt;
      if (arcade.keys.has("down") || arcade.keys.has("right")) d.paddle.y += 430 * dt;
      d.paddle.y = Math.max(12, Math.min(canvas.height - d.paddle.h - 12, d.paddle.y));
      const b = d.ball;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < b.r || b.y > canvas.height - b.r) b.vy *= -1;
      if (overlap(d.paddle, { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 })) {
        b.vx = Math.abs(b.vx) + 18;
        arcade.score += 5;
      }
      if (b.x > canvas.width - b.r) b.vx = -Math.abs(b.vx);
      if (b.x < -20) endGame("Lost");
    },
    draw() {
      const d = arcade.data;
      clear();
      block(d.paddle.x, d.paddle.y, d.paddle.w, d.paddle.h, aqua);
      circle(d.ball.x, d.ball.y, d.ball.r, yellow);
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
      if (arcade.keys.has("up")) d.player.y -= 260 * dt;
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
    },
    action() {
      arcade.keys.add("up");
      setTimeout(() => arcade.keys.delete("up"), 120);
    }
  },
  "stack-jump": {
    init() {
      arcade.data = { runner: { x: 130, y: 386, w: 50, h: 62, vy: 0 }, blocks: [], spawn: 0.9, speed: 260 };
    },
    update(dt) {
      const d = arcade.data;
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
    },
    action() {
      if (arcade.data.runner.y >= 386) arcade.data.runner.vy = -520;
    }
  },
  "number-nudge": {
    init() {
      arcade.data = { value: 5, target: Math.floor(rand(1, 10)), timer: 15 };
    },
    update(dt) {
      const d = arcade.data;
      if (arcade.keys.has("left")) d.value = Math.max(0, d.value - 1);
      if (arcade.keys.has("right")) d.value = Math.min(10, d.value + 1);
      arcade.keys.delete("left");
      arcade.keys.delete("right");
      d.timer -= dt;
      setStatus(`${Math.ceil(d.timer)}s`);
      if (d.timer <= 0) endGame("Time");
    },
    draw() {
      const d = arcade.data;
      clear();
      text(`Target: ${d.target}`, 360, 180, 44);
      text(`Your number: ${d.value}`, 330, 286, 44);
      block(350, 340, 260, 60, yellow);
      text("Press Action", 392, 382, 24);
    },
    action() {
      const d = arcade.data;
      if (d.value === d.target) {
        arcade.score += 20;
        d.target = Math.floor(rand(1, 10));
        d.timer = Math.min(20, d.timer + 5);
      } else {
        arcade.score = Math.max(0, arcade.score - 5);
      }
    }
  }
};

function selectGame(id) {
  arcade.id = id;
  arcade.running = false;
  arcade.score = 0;
  arcade.best = Number(localStorage.getItem(bestKey(id)) || 0);
  titleEl.textContent = gameTitles[id];
  scoreEl.textContent = "0";
  bestEl.textContent = arcade.best;
  setStatus("Ready");
  games[id].init();
  games[id].draw();
  showMessage(`${gameTitles[id]} is selected. Press Start.`);
  picker.querySelectorAll("button").forEach((button) => button.classList.toggle("selected", button.dataset.game === id));
}

function startGame() {
  arcade.running = true;
  arcade.score = 0;
  arcade.last = performance.now();
  arcade.keys.clear();
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
leftButton.addEventListener("pointerdown", () => arcade.keys.add("left"));
leftButton.addEventListener("pointerup", () => arcade.keys.delete("left"));
leftButton.addEventListener("pointerleave", () => arcade.keys.delete("left"));
rightButton.addEventListener("pointerdown", () => arcade.keys.add("right"));
rightButton.addEventListener("pointerup", () => arcade.keys.delete("right"));
rightButton.addEventListener("pointerleave", () => arcade.keys.delete("right"));
actionButton.addEventListener("click", () => games[arcade.id].action?.());
canvas.addEventListener("click", (event) => games[arcade.id].click?.(canvasPoint(event).x, canvasPoint(event).y));

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") arcade.keys.add("left");
  if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") arcade.keys.add("right");
  if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") arcade.keys.add("up");
  if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") arcade.keys.add("down");
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    games[arcade.id].action?.();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") arcade.keys.delete("left");
  if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") arcade.keys.delete("right");
  if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") arcade.keys.delete("up");
  if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") arcade.keys.delete("down");
});

selectGame("dot-dodge");
