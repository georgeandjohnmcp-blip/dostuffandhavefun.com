import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { epicMappingUrl, games } from "../src/data/games.js";
import { tracking } from "../src/data/tracking.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const publicDir = join(root, "public");
const featuredGameId = "turbo-racer-3d";
const featuredGame = games.find((game) => game.id === featuredGameId) ?? games[0];
const threeDGameIds = new Set(["turbo-racer-3d", "arena-fps-3d", "spotlight-dash-3d", "sky-platformer-3d", "block-builder-3d"]);
const threeDGames = games.filter((game) => threeDGameIds.has(game.id));
const laggyGameIds = new Set(["neon-cube-dash", "stack-jump", "two-player-pong"]);
const laggyGames = games.filter((game) => laggyGameIds.has(game.id));
const horrorGameIds = new Set(["night-watch"]);
const horrorGames = games.filter((game) => horrorGameIds.has(game.id));
const regularGames = games.filter((game) => !laggyGameIds.has(game.id) && !threeDGameIds.has(game.id) && !horrorGameIds.has(game.id));

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function writePage(path, html) {
  const filePath = join(dist, path, "index.html");
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, html);
}

function htmlShell(body) {
  const title = "Welcome to Have Fun and Do Stuff | 3D Racing, FPS, and Arcade Games";
  const description = "A browser arcade led by 3D racing, block-building, platforming, first-person shooting, rhythm dash games, and more quick games.";
  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Do Stuff & Have Fun",
    url: "https://dostuffandhavefun.com"
  }).replaceAll("</", "<\\/");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="canonical" href="https://dostuffandhavefun.com/" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="/assets/global.css?v=night-watch-3d-slower-20260616" />
    <meta property="og:title" content="Do Stuff & Have Fun Games" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://dostuffandhavefun.com/" />
    <meta property="og:image" content="https://dostuffandhavefun.com/assets/play-lab-hero.png" />
    <meta name="twitter:card" content="summary_large_image" />
    ${tracking.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(tracking.googleSiteVerification)}" />` : ""}
    <script type="application/ld+json">${schema}</script>
    ${tracking.ga4MeasurementId ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(tracking.ga4MeasurementId)}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${esc(tracking.ga4MeasurementId)}',{send_page_view:true});</script>` : ""}
  </head>
  <body class="game-site">
    ${body}
    <script type="module" src="/assets/arcade.js?v=night-watch-3d-slower-20260616"></script>
  </body>
</html>
`;
}

function renderGameButtons(items, selectedId = "") {
  return items.map((game) => `<button class="${game.id === selectedId ? "selected" : ""}" type="button" data-game="${esc(game.id)}">
              <span>${esc(game.label)}</span>
              <strong>${esc(game.title)}</strong>
              <em>${esc(game.description)}</em>
              <small>${esc(game.controls)}</small>
            </button>`).join("");
}

async function renderHome() {
  const body = `<header class="topbar arcade-topbar" aria-label="Site header">
      <a class="brand wordmark" href="/" aria-label="Have Fun and Do Stuff home"><span>Welcome to</span><strong>Have Fun and Do Stuff</strong></a>
      <nav aria-label="Main navigation"><a href="#play">Play</a><a href="#three-d-games">3-D</a><a href="#horror-games">Horror</a><a href="#laggy-games">Laggy</a><a href="#games">Games</a></nav>
    </header>
    <main>
      <section class="games-hero">
        <div class="games-hero-copy">
          <p class="eyebrow">3D racing arcade</p>
          <h1>Welcome to Have Fun and Do Stuff.</h1>
          <p class="lede">Race bot cars for one minute, dodge traffic, grab coins, boost hard, then jump into FPS battles and classic arcade games.</p>
          <div class="hero-actions"><a class="button primary" href="#play">Play now</a><a class="button secondary" href="${epicMappingUrl}">EPICMAPPING</a></div>
        </div>
        <div class="cabinet-preview" aria-hidden="true"><div class="cabinet-screen"><span></span><span></span><span></span><strong>${games.length}</strong></div><div class="cabinet-controls"><i></i><i></i><i></i></div></div>
      </section>
      <section id="play" class="play-section">
        <div class="arcade-machine">
          <div class="machine-head"><div><p class="eyebrow">Now playing</p><h2 id="currentGameTitle">${esc(featuredGame.title)}</h2></div><div class="score-pills" aria-label="Game stats"><span>Score <strong id="score">0</strong></span><span>Best <strong id="best">0</strong></span><span>Status <strong id="status">Ready</strong></span></div></div>
          <div class="game-stage"><canvas id="arcadeCanvas" width="960" height="540" aria-label="Game play area"></canvas><div class="game-message" id="gameMessage"><p class="eyebrow">Ready?</p><h3>Choose a game below, then press Start.</h3></div></div>
          <div class="machine-controls"><button id="startButton" type="button">Start</button><button id="leftButton" type="button">Left</button><button id="actionButton" type="button">Action</button><button id="rightButton" type="button">Right</button></div>
        </div>
      </section>
      <section id="three-d-games" class="section games-list-section three-d-games-section"><div class="section-heading"><p class="eyebrow">3-D games</p><h2>3-D games</h2><p>Racing, shooting, platforming, spotlight running, and first-person block building.</p></div><div class="ten-game-grid" data-game-picker>${renderGameButtons(threeDGames, featuredGameId)}</div></section>
      <section id="horror-games" class="section games-list-section horror-games-section"><div class="section-heading"><p class="eyebrow">Horror games</p><h2>Horror games</h2><p>Dark camera games with power, doors, and things moving around after midnight.</p></div><div class="ten-game-grid" data-game-picker>${renderGameButtons(horrorGames)}</div></section>
      <section id="laggy-games" class="section games-list-section laggy-games-section"><div class="section-heading"><p class="eyebrow">Laggy games</p><h2>Laggy games</h2><p>Fast, flashy games that may run heavier on some computers.</p></div><div class="ten-game-grid" data-game-picker>${renderGameButtons(laggyGames)}</div></section>
      <section id="games" class="section games-list-section"><div class="section-heading"><p class="eyebrow">Game shelf</p><h2>${regularGames.length} games</h2><p>Quick arcade games that load fast and are easy to jump into.</p></div><div class="ten-game-grid" data-game-picker>${renderGameButtons(regularGames)}</div></section>
    </main>
    <footer><p>Do Stuff & Have Fun Games</p><a href="${epicMappingUrl}">EPICMAPPING on YouTube</a></footer>`;
  await writePage("", htmlShell(body));
}

async function renderTextFiles() {
  await writeFile(join(dist, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: https://dostuffandhavefun.com/sitemap-index.xml\n\nLLMS: https://dostuffandhavefun.com/llms.txt\n`);
  await writeFile(join(dist, "sitemap-index.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap>\n    <loc>https://dostuffandhavefun.com/sitemap-0.xml</loc>\n  </sitemap>\n</sitemapindex>\n`);
  await writeFile(join(dist, "sitemap-0.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://dostuffandhavefun.com/</loc>\n    <lastmod>2026-06-14</lastmod>\n  </url>\n  <url>\n    <loc>https://dostuffandhavefun.com/llms.txt</loc>\n    <lastmod>2026-06-14</lastmod>\n  </url>\n</urlset>\n`);
  await writeFile(join(dist, "llms.txt"), `# Welcome to Have Fun and Do Stuff\n\nHave Fun and Do Stuff is a ${games.length}-game browser arcade led by 3D racing, block-building, platforming, first-person shooting, rhythm dash games, and classic arcade games. The site has one YouTube link: ${epicMappingUrl}\n\nMain page:\n- https://dostuffandhavefun.com/\n\nGames:\n${games.map((game) => `- ${game.title}: ${game.description}`).join("\n")}\n`);
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(publicDir, dist, { recursive: true });
await cp(join(publicDir, ".htaccess"), join(dist, ".htaccess"));
await cp(join(root, "src/styles/global.css"), join(dist, "assets/global.css"));
await renderHome();
await renderTextFiles();

console.log(`Rendered static arcade with ${games.length} games.`);
