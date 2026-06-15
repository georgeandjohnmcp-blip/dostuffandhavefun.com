import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { channels, buildFeaturedVideos } from "../src/data/site.js";
import { tracking } from "../src/data/tracking.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const publicDir = join(root, "public");
const videos = JSON.parse(await readFile(join(root, "src/data/videos.generated.json"), "utf8"));
const featuredVideos = buildFeaturedVideos(videos);

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function scriptJson(value) {
  return JSON.stringify(value).replaceAll("</", "<\\/");
}

function absoluteImageUrl(url = "") {
  return url.startsWith("http") ? url : `https://dostuffandhavefun.com${url}`;
}

async function writePage(path, html) {
  const filePath = join(dist, path, "index.html");
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, html);
}

function header() {
  return `<header class="topbar" aria-label="Site header">
      <a class="brand wordmark" href="/" aria-label="Do Stuff and Have Fun home"><span>Do Stuff</span><strong>Videos</strong></a>
      <nav aria-label="Main navigation"><a href="/#videos">Latest</a><a href="/#channels">Channels</a><a href="/videos/">All Videos</a></nav>
    </header>`;
}

function footer() {
  return `<footer><p>Do Stuff & Have Fun. Latest connected videos, updated from YouTube.</p></footer>`;
}

function htmlShell({ title, description, canonical, ogType = "website", ogImage = "https://dostuffandhavefun.com/assets/play-lab-hero.png", schema = "", body }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-video-preview:-1" />
    <link rel="canonical" href="${esc(canonical)}" />
    <link rel="stylesheet" href="/assets/global.css" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:type" content="${esc(ogType)}" />
    <meta property="og:url" content="${esc(canonical)}" />
    <meta property="og:image" content="${esc(ogImage)}" />
    <meta name="twitter:card" content="summary_large_image" />
    ${tracking.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(tracking.googleSiteVerification)}" />` : ""}
    ${schema ? `<script type="application/ld+json">${schema}</script>` : ""}
    ${tracking.ga4MeasurementId ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(tracking.ga4MeasurementId)}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${esc(tracking.ga4MeasurementId)}',{send_page_view:true});</script>` : ""}
  </head>
  <body class="video-site">
    ${body}
  </body>
</html>
`;
}

function tags(items = []) {
  return `<div class="tags">${items.map((keyword) => `<span>${esc(keyword)}</span>`).join("")}</div>`;
}

function videoHref(video) {
  return video.isLive && video.id ? `/videos/${esc(video.id)}/` : video.url;
}

function videoCard(video) {
  return `<article class="video-card">
            <a href="${esc(videoHref(video))}" aria-label="Open ${esc(video.title)}"><img src="${esc(video.thumbnail)}" alt="" loading="lazy" /><span class="play">${esc(video.status ?? "Watch")}</span></a>
            <div class="video-card-copy"><p>${esc(video.channel)}</p><h3>${esc(video.title)}</h3><p>${esc(video.description)}</p>${tags(video.keywords)}</div>
          </article>`;
}

function channelCard(channel) {
  return `<article class="channel-card ${esc(channel.color)}"><span>${esc(channel.theme)}</span><h3>${esc(channel.name)}</h3><p>${esc(channel.handle)}</p><p>${esc(channel.description)}</p><a href="${esc(channel.url)}">Visit channel</a></article>`;
}

function pageSchema() {
  const videoSchema = featuredVideos.filter((video) => video.isLive).map((video) => ({
    "@type": "VideoObject",
    name: video.title,
    description: video.description,
    thumbnailUrl: [absoluteImageUrl(video.thumbnail)],
    uploadDate: video.published || "2026-06-14",
    embedUrl: video.url,
    publisher: {
      "@type": "Organization",
      name: "Do Stuff & Have Fun"
    }
  }));

  return scriptJson({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "Do Stuff & Have Fun",
        url: "https://dostuffandhavefun.com"
      },
      {
        "@type": "ItemList",
        name: "Latest videos",
        itemListElement: featuredVideos.map((video, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: video.title,
          url: video.isLive && video.id ? `https://dostuffandhavefun.com/videos/${video.id}/` : video.url
        }))
      },
      ...videoSchema
    ]
  });
}

async function renderHome() {
  const description = "Watch the latest videos from the connected Do Stuff & Have Fun YouTube channels.";
  const heroVideos = featuredVideos.slice(0, 3);
  const heroStack = heroVideos.map((video) => `<a href="${esc(videoHref(video))}"><img src="${esc(video.thumbnail)}" alt="" loading="eager" /><span>${esc(video.title)}</span></a>`).join("");
  const body = `${header()}
    <main>
      <section class="video-hero">
        <div class="video-hero-copy">
          <p class="eyebrow">Latest uploads</p>
          <h1>Your videos, all in one place.</h1>
          <p class="lede">${videos.length} videos from the connected YouTube channels, with fresh pages for watching, sharing, and search.</p>
          <div class="hero-actions"><a class="button primary" href="#videos">Watch latest</a><a class="button secondary" href="/videos/">Open library</a></div>
        </div>
        <div class="hero-video-stack" aria-label="Featured video thumbnails">${heroStack}</div>
      </section>
      <section id="videos" class="section"><div class="section-heading"><p class="eyebrow">Watch next</p><h2>Latest videos</h2><p>Only real uploads from the connected channels are shown here.</p></div><div class="video-grid">${featuredVideos.map(videoCard).join("")}</div></section>
      <section id="channels" class="section channel-band"><div class="section-heading"><p class="eyebrow">Channels</p><h2>Connected YouTube channels</h2><p>These are the channels currently feeding the site.</p></div><div class="channel-grid">${channels.map(channelCard).join("")}</div></section>
    </main>${footer()}`;
  await writePage("", htmlShell({ title: "Do Stuff & Have Fun | Videos", description, canonical: "https://dostuffandhavefun.com/", schema: pageSchema(), ogImage: heroVideos[0]?.thumbnail || "https://dostuffandhavefun.com/assets/play-lab-hero.png", body }));
}

async function renderVideosIndex() {
  const description = "A library of the latest connected Do Stuff & Have Fun YouTube uploads.";
  const body = `${header()}<main><section class="topic-hero video-library-hero"><div class="topic-hero-inner"><p class="eyebrow">Video library</p><h1>All Videos</h1><p>The latest connected YouTube uploads are collected here.</p></div></section><section class="section"><div class="video-grid">${featuredVideos.map(videoCard).join("")}</div></section></main>${footer()}`;
  await writePage("videos", htmlShell({ title: "Video Library | Do Stuff & Have Fun", description, canonical: "https://dostuffandhavefun.com/videos/", body }));
}

async function renderVideoPages() {
  for (const video of videos.filter((item) => item.id)) {
    const description = video.description || "A Do Stuff & Have Fun video ready to watch on YouTube.";
    const schema = scriptJson({
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: video.title,
      description,
      thumbnailUrl: video.thumbnail ? [video.thumbnail] : ["https://dostuffandhavefun.com/assets/play-lab-hero.png"],
      uploadDate: video.published,
      embedUrl: video.url,
      publisher: {
        "@type": "Organization",
        name: "Do Stuff & Have Fun"
      }
    });
    const body = `${header()}<main><section class="topic-hero video-library-hero"><div class="topic-hero-inner"><p class="eyebrow">${esc(video.channel)}</p><h1>${esc(video.title)}</h1><p>${esc(description)}</p><a class="button primary" href="${esc(video.url)}">Watch on YouTube</a></div></section><section class="section"><div class="video-embed"><iframe src="https://www.youtube-nocookie.com/embed/${esc(video.id)}" title="${esc(video.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div></section><section class="section"><div class="topic-content"><article class="topic-panel"><p class="eyebrow">Summary</p><h2>About this video</h2><p>${esc(description)}</p></article><aside class="topic-panel"><p class="eyebrow">Tags</p><h2>Video signals</h2>${tags(video.keywords || [])}</aside></div></section></main>${footer()}`;
    await writePage(`videos/${video.id}`, htmlShell({ title: `${video.title} | Do Stuff & Have Fun`, description, canonical: `https://dostuffandhavefun.com/videos/${video.id}/`, ogType: "video.other", ogImage: video.thumbnail || "https://dostuffandhavefun.com/assets/play-lab-hero.png", schema, body }));
  }
}

async function renderTextFiles() {
  await writeFile(join(dist, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: https://dostuffandhavefun.com/sitemap-index.xml\n\nLLMS: https://dostuffandhavefun.com/llms.txt\n`);
  await writeFile(join(dist, "sitemap-index.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap>\n    <loc>https://dostuffandhavefun.com/sitemap-0.xml</loc>\n  </sitemap>\n</sitemapindex>\n`);
  const urls = [
    "",
    "videos/",
    ...videos.filter((video) => video.id).map((video) => `videos/${video.id}/`),
    "llms.txt"
  ];
  await writeFile(join(dist, "sitemap-0.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url>\n    <loc>https://dostuffandhavefun.com/${url}</loc>\n    <lastmod>2026-06-14</lastmod>\n  </url>`).join("\n")}\n</urlset>\n`);
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(publicDir, dist, { recursive: true });
await cp(join(root, "src/styles/global.css"), join(dist, "assets/global.css"));
await renderHome();
await renderVideosIndex();
await renderVideoPages();
await renderTextFiles();

console.log(`Rendered static video site with ${videos.length} videos and ${channels.length} channels.`);
