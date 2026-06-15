import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { epicMappingUrl, games } from "../src/data/games.js";
import { tracking } from "../src/data/tracking.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const publicDir = join(root, "public");

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
  const title = "Do Stuff & Have Fun | 3D Spotlight Game, Snake, Pong, and Blocks";
  const description = "A browser arcade led by a 3D spotlight runner, plus Snake, Pong, falling blocks, two-player Pong, and more quick games.";
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
    <link rel="stylesheet" href="/assets/global.css?v=spotlight-3d-20260615" />
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
    <script type="module" src="/assets/arcade.js?v=spotlight-3d-20260615"></script>
  </body>
</html>
`;
}

function renderGameButtons() {
  return games.map((game, index) => `<button class="${index === 0 ? "selected" : ""}" type="button" data-game="${esc(game.id)}">
              <span>${esc(game.label)}</span>
              <strong>${esc(game.title)}</strong>
              <em>${esc(game.description)}</em>
              <small>${esc(game.controls)}</small>
            </button>`).join("");
}

async function renderHome() {
  const body = `<header class="topbar arcade-topbar" aria-label="Site header">
      <a class="brand wordmark" href="/" aria-label="Do Stuff and Have Fun home"><span>Do Stuff</span><strong>Games</strong></a>
      <nav aria-label="Main navigation"><a href="#play">Play</a><a href="#games">${games.length} Games</a><a href="${epicMappingUrl}">EPICMAPPING</a></nav>
    </header>
    <main>
      <section class="games-hero">
        <div class="games-hero-copy">
          <p class="eyebrow">3D spotlight arcade</p>
          <h1>A giant spotlight. A fast 3D run.</h1>
          <p class="lede">Dodge glowing blocks in a dark 3D stage, then jump into Snake, Pong, blocks, and local multiplayer.</p>
          <div class="hero-actions"><a class="button primary" href="#play">Play now</a><a class="button secondary" href="${epicMappingUrl}">EPICMAPPING</a></div>
        </div>
        <div class="cabinet-preview" aria-hidden="true"><div class="cabinet-screen"><span></span><span></span><span></span><strong>${games.length}</strong></div><div class="cabinet-controls"><i></i><i></i><i></i></div></div>
      </section>
      <section id="play" class="play-section">
        <div class="arcade-machine">
          <div class="machine-head"><div><p class="eyebrow">Now playing</p><h2 id="currentGameTitle">${esc(games[0].title)}</h2></div><div class="score-pills" aria-label="Game stats"><span>Score <strong id="score">0</strong></span><span>Best <strong id="best">0</strong></span><span>Status <strong id="status">Ready</strong></span></div></div>
          <div class="game-stage"><canvas id="arcadeCanvas" width="960" height="540" aria-label="Game play area"></canvas><div class="game-message" id="gameMessage"><p class="eyebrow">Ready?</p><h3>Choose a game below, then press Start.</h3></div></div>
          <div class="machine-controls"><button id="startButton" type="button">Start</button><button id="leftButton" type="button">Left</button><button id="actionButton" type="button">Action</button><button id="rightButton" type="button">Right</button></div>
        </div>
      </section>
      <section id="games" class="section games-list-section"><div class="section-heading"><p class="eyebrow">Game shelf</p><h2>${games.length} games</h2><p>A 3D spotlight game plus quick arcade classics and one EPICMAPPING link.</p></div><div class="ten-game-grid" id="gamePicker">${renderGameButtons()}</div></section>
    </main>
    <footer><p>Do Stuff & Have Fun Games</p><a href="${epicMappingUrl}">EPICMAPPING on YouTube</a></footer>`;
  await writePage("", htmlShell(body));
}

async function renderTextFiles() {
  await writeFile(join(dist, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: https://dostuffandhavefun.com/sitemap-index.xml\n\nLLMS: https://dostuffandhavefun.com/llms.txt\n`);
  await writeFile(join(dist, "sitemap-index.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap>\n    <loc>https://dostuffandhavefun.com/sitemap-0.xml</loc>\n  </sitemap>\n</sitemapindex>\n`);
  await writeFile(join(dist, "sitemap-0.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://dostuffandhavefun.com/</loc>\n    <lastmod>2026-06-14</lastmod>\n  </url>\n  <url>\n    <loc>https://dostuffandhavefun.com/llms.txt</loc>\n    <lastmod>2026-06-14</lastmod>\n  </url>\n</urlset>\n`);
  await writeFile(join(dist, "llms.txt"), `# Do Stuff & Have Fun\n\nDo Stuff & Have Fun is an ${games.length}-game browser arcade led by a 3D spotlight game. The site has one YouTube link: ${epicMappingUrl}\n\nMain page:\n- https://dostuffandhavefun.com/\n\nGames:\n${games.map((game) => `- ${game.title}: ${game.description}`).join("\n")}\n`);
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(publicDir, dist, { recursive: true });
await cp(join(publicDir, ".htaccess"), join(dist, ".htaccess"));
await cp(join(root, "src/styles/global.css"), join(dist, "assets/global.css"));
await renderHome();
await renderTextFiles();

console.log(`Rendered static arcade with ${games.length} games.`);
