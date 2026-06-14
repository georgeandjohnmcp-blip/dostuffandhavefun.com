import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { channels, buildFeaturedVideos, growthLoops, topicHubs, youtubeConnectionSteps } from "../src/data/site.js";
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

function header(currentGameLabel = "Game") {
  return `<header class="topbar" aria-label="Site header">
      <a class="brand" href="/" aria-label="Do Stuff and Have Fun home"><img src="/assets/do-stuff-logo.png" alt="Do Stuff & Have Fun logo" /></a>
      <nav aria-label="Main navigation"><a href="/videos/">Videos</a><a href="/games/pong/">${currentGameLabel}</a><a href="/#channels">Channels</a><a href="/#growth">Growth</a></nav>
    </header>`;
}

function footer() {
  return `<footer><img src="/assets/do-stuff-logo.png" alt="" /><p>Do Stuff & Have Fun is being built as a playful, family-friendly video hub.</p></footer>`;
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
  <body>
    ${body}
  </body>
</html>
`;
}

function tags(items = []) {
  return `<div class="tags">${items.map((keyword) => `<span>${esc(keyword)}</span>`).join("")}</div>`;
}

function videoCard(video) {
  const href = video.isLive && video.id ? `/videos/${esc(video.id)}/` : video.url;
  return `<article class="video-card">
            <a href="${esc(href)}" aria-label="Open ${esc(video.title)}"><img src="${esc(video.thumbnail)}" alt="" loading="lazy" /><span class="play">${esc(video.status ?? "Watch")}</span></a>
            <div class="video-card-copy"><p>${esc(video.channel)}</p><h3>${esc(video.title)}</h3><p>${esc(video.description)}</p>${tags(video.keywords)}</div>
          </article>`;
}

function channelCard(channel) {
  return `<article class="channel-card ${esc(channel.color)}"><span>${esc(channel.theme)}</span><h3>${esc(channel.name)}</h3><p>${esc(channel.handle)}</p><p>${esc(channel.description)}</p><a href="${esc(channel.url)}">${channel.url.startsWith("https://") ? "Visit channel" : "Connect channel"}</a></article>`;
}

function topicCard(topic) {
  return `<article class="topic-card"><h3>${esc(topic.title)}</h3><p>${esc(topic.answer)}</p>${tags(topic.keywords)}<a href="/topics/${esc(topic.slug)}/">Open topic hub</a></article>`;
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
      name: "Do Stuff & Have Fun",
      logo: {
        "@type": "ImageObject",
        url: "https://dostuffandhavefun.com/assets/do-stuff-logo.png"
      }
    }
  }));

  return scriptJson({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Do Stuff & Have Fun",
        url: "https://dostuffandhavefun.com",
        logo: "https://dostuffandhavefun.com/assets/do-stuff-logo.png",
        sameAs: channels.map((channel) => channel.url).filter((url) => url.startsWith("https://"))
      },
      {
        "@type": "WebSite",
        name: "Do Stuff & Have Fun",
        url: "https://dostuffandhavefun.com",
        potentialAction: {
          "@type": "SearchAction",
          target: "https://dostuffandhavefun.com/?q={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What can kids watch on Do Stuff & Have Fun?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Kids can find family-friendly videos, playful challenges, crafts, experiments, Shorts, animations, mapping videos, Minecraft videos, and creative things to watch next."
            }
          },
          {
            "@type": "Question",
            name: "How does this website help the YouTube channels grow?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "The website gives every channel and video a searchable home with clear summaries, topic pages, video schema, FAQs, and internal links that help search engines understand what each video is about."
            }
          }
        ]
      },
      ...videoSchema
    ]
  });
}

async function renderHome() {
  const description = "A bright home base for Do Stuff & Have Fun videos, playful YouTube channels, family-friendly challenges, crafts, experiments, and kid-safe things to watch next.";
  const body = `${header()}
    <main>
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Kid-friendly video adventures</p>
          <h1>Do Stuff & Have Fun</h1>
          <p class="lede">A bright launchpad for playful videos, creative challenges, crafts, experiments, mapping videos, animations, Minecraft, and funny little discoveries kids want to watch next.</p>
          <div class="hero-actions"><a class="button primary" href="/videos/">Watch the showcase</a><a class="button secondary" href="/games/pong/">Play the game</a></div>
        </div>
        <div class="hero-art" aria-label="Playful creator studio artwork"><img src="/assets/play-lab-hero.png" alt="Colorful craft and video studio with science and art supplies" /></div>
      </section>
      <section class="search-strip" aria-label="Popular discovery topics"><span>Things to do when bored</span><span>Safe funny challenges</span><span>Crafts for kids</span><span>Easy experiments</span><span>Family-friendly Shorts</span></section>
      <section id="videos" class="section"><div class="section-heading"><p class="eyebrow">Newest watch paths</p><h2>Real videos from the connected channels</h2><p>Showing the newest ${Math.min(videos.length, 9)} public uploads pulled from ${channels.length} connected YouTube channel feeds.</p></div><div class="video-grid">${featuredVideos.map(videoCard).join("")}</div></section>
      <section id="channels" class="section channel-band"><div class="section-heading"><p class="eyebrow">Channel universe</p><h2>Several channels, one fun home base</h2><p>Each channel gets its own lane, audience promise, and topic cluster so visitors can quickly pick the kind of video they want.</p></div><div class="channel-grid">${channels.map(channelCard).join("")}</div></section>
      <section class="section topic-section"><div class="section-heading"><p class="eyebrow">Search magnets</p><h2>Topic hubs built for kid-friendly discovery</h2><p>These are the first content lanes I would grow around. They match what kids and parents naturally search for, then point visitors back to the best YouTube videos.</p></div><div class="topic-grid">${topicHubs.map(topicCard).join("")}</div></section>
      <section id="growth" class="section growth"><div class="section-heading"><p class="eyebrow">SEO + AEO growth engine</p><h2>How this becomes a traffic machine</h2><p>The site is designed around strong search basics: indexable pages, useful content, clean structure, video pages, and accurate structured data.</p></div><div class="growth-layout"><ol class="growth-list">${growthLoops.map((item) => `<li>${esc(item)}</li>`).join("")}</ol><aside class="monetization"><h3>Monetization target</h3><p>The first YouTube Partner Program milestone is 500 subscribers plus either 3,000 public watch hours in 12 months or 3 million valid Shorts views in 90 days. Ad revenue requires 1,000 subscribers plus 4,000 watch hours or 10 million Shorts views.</p></aside></div></section>
      <section id="youtube-connection" class="section connection"><div class="section-heading"><p class="eyebrow">YouTube connector</p><h2>Connected to the current channel list</h2><p>The newest public uploads can be refreshed from the connected channel feeds. Add new handles to the config when new channels are created.</p></div><ol class="connection-list">${youtubeConnectionSteps.map((step) => `<li>${esc(step)}</li>`).join("")}</ol></section>
      <section class="section answer-box"><p class="eyebrow">Answer engine bait, but useful</p><h2>What should my kid watch when they are bored?</h2><p>Start with a short, funny video if they want quick energy. Pick a challenge video if they want to laugh along. Choose a craft, mapping, animation, Minecraft, or experiment video if they want something creative to try with an adult nearby.</p></section>
    </main>${footer()}`;
  await writePage("", htmlShell({ title: "Do Stuff & Have Fun | Kid-Friendly YouTube Videos, Challenges, Crafts, and Experiments", description, canonical: "https://dostuffandhavefun.com/", schema: pageSchema(), body }));
}

async function renderVideosIndex() {
  const description = "A growing library for Do Stuff & Have Fun videos, kid-friendly challenges, Shorts, crafts, experiments, animations, mapping, and Minecraft videos.";
  const body = `${header()}<main><section class="topic-hero"><div class="topic-hero-inner"><p class="eyebrow">Video library</p><h1>Videos Built For Curious Clicks</h1><p>The newest connected YouTube uploads appear here automatically, with search-friendly summaries and watch paths.</p></div></section><section class="section"><div class="video-grid">${featuredVideos.map(videoCard).join("")}</div></section></main>${footer()}`;
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
        name: "Do Stuff & Have Fun",
        logo: {
          "@type": "ImageObject",
          url: "https://dostuffandhavefun.com/assets/do-stuff-logo.png"
        }
      }
    });
    const body = `${header()}<main><section class="topic-hero"><div class="topic-hero-inner"><p class="eyebrow">${esc(video.channel)}</p><h1>${esc(video.title)}</h1><p>${esc(description)}</p><a class="button primary" href="${esc(video.url)}">Watch on YouTube</a></div></section><section class="section"><div class="video-embed"><iframe src="https://www.youtube-nocookie.com/embed/${esc(video.id)}" title="${esc(video.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div></section><section class="section"><div class="topic-content"><article class="topic-panel"><p class="eyebrow">Why this video matters</p><h2>Search-friendly summary</h2><p>${esc(description)}</p></article><aside class="topic-panel"><p class="eyebrow">Discovery tags</p><h2>Watch next signals</h2>${tags(video.keywords || [])}</aside></div></section></main>${footer()}`;
    await writePage(`videos/${video.id}`, htmlShell({ title: `${video.title} | Do Stuff & Have Fun`, description, canonical: `https://dostuffandhavefun.com/videos/${video.id}/`, ogType: "video.other", ogImage: video.thumbnail || "https://dostuffandhavefun.com/assets/play-lab-hero.png", schema, body }));
  }
}

async function renderTopics() {
  for (const topic of topicHubs) {
    const schema = scriptJson({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: topic.questions.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer
        }
      }))
    });
    const body = `${header()}<main><section class="topic-hero"><div class="topic-hero-inner"><p class="eyebrow">Topic hub</p><h1>${esc(topic.title)}</h1><p>${esc(topic.intro)}</p><a class="button primary" href="/videos/">Watch connected videos</a></div></section><section class="section"><div class="topic-content"><article class="topic-panel"><p class="eyebrow">Watch path</p><h2>How this hub should grow</h2><ol>${topic.watchPlan.map((item) => `<li>${esc(item)}</li>`).join("")}</ol></article><aside class="topic-panel"><p class="eyebrow">Search phrases</p><h2>What this page targets</h2>${tags(topic.keywords)}</aside></div></section><section class="section"><div class="section-heading"><p class="eyebrow">Helpful answers</p><h2>Questions this hub can win</h2></div><div class="faq-stack">${topic.questions.map((item) => `<article><h3>${esc(item.question)}</h3><p>${esc(item.answer)}</p></article>`).join("")}</div></section></main>${footer()}`;
    await writePage(`topics/${topic.slug}`, htmlShell({ title: `${topic.title} | Do Stuff & Have Fun`, description: topic.answer, canonical: `https://dostuffandhavefun.com/topics/${topic.slug}/`, ogType: "article", schema, body }));
  }
}

async function renderPong() {
  const html = await readFile(join(root, "src/pages/games/pong.astro"), "utf8");
  const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/);
  const headTitle = "Pong Game | Do Stuff & Have Fun";
  const body = bodyMatch ? bodyMatch[1].replaceAll("{pageTitle}", headTitle) : "";
  await writePage("games/pong", htmlShell({ title: headTitle, description: "A fast, fun browser Pong game for Do Stuff & Have Fun.", canonical: "https://dostuffandhavefun.com/games/pong/", body }));
}

async function renderSparkCatcher() {
  const source = await readFile(join(root, "src/pages/games/spark-catcher.astro"), "utf8");
  const bodyMatch = source.match(/<body>([\s\S]*?)<\/body>/);
  await writePage("games/spark-catcher", htmlShell({ title: "Spark Catcher Game | Do Stuff & Have Fun", description: "A bright kid-friendly catching game for Do Stuff & Have Fun.", canonical: "https://dostuffandhavefun.com/games/spark-catcher/", body: bodyMatch ? bodyMatch[1] : "" }));
}

async function renderTextFiles() {
  await writeFile(join(dist, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: https://dostuffandhavefun.com/sitemap-index.xml\n\nLLMS: https://dostuffandhavefun.com/llms.txt\n`);
  await writeFile(join(dist, "sitemap-index.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap>\n    <loc>https://dostuffandhavefun.com/sitemap-0.xml</loc>\n  </sitemap>\n</sitemapindex>\n`);
  const urls = [
    "",
    "videos/",
    "games/pong/",
    "games/spark-catcher/",
    ...videos.filter((video) => video.id).map((video) => `videos/${video.id}/`),
    ...topicHubs.map((topic) => `topics/${topic.slug}/`),
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
await renderTopics();
await renderPong();
await renderSparkCatcher();
await renderTextFiles();

console.log(`Rendered static site with ${videos.length} videos and ${channels.length} channels.`);
