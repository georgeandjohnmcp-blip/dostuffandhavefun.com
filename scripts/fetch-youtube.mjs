import { writeFile } from "node:fs/promises";
import { youtubeChannels } from "../src/data/youtube.config.js";

const outputPath = new URL("../src/data/videos.generated.json", import.meta.url);
const youtubeOrigin = "https://www.youtube.com";

function decodeHtml(value = "") {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}

function readTag(entry, tag) {
  const match = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeHtml(match[1].trim()) : "";
}

function readAttr(entry, tag, attr) {
  const match = entry.match(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]+)"[^>]*>`, "i"));
  return match ? decodeHtml(match[1].trim()) : "";
}

function readMeta(html, property) {
  const pattern = `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`;
  const match = html.match(new RegExp(pattern, "i"));
  return match ? decodeHtml(match[1].trim()) : "";
}

function readLink(html, rel) {
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  return links.find((link) => new RegExp(`\\brel=["'][^"']*${rel}[^"']*["']`, "i").test(link)) ?? "";
}

function readHref(tag = "") {
  return readAttr(tag, "link", "href");
}

function normalizeYouTubeUrl(channel) {
  if (channel.url) {
    return channel.url.startsWith("http") ? channel.url : `${youtubeOrigin}/${channel.url.replace(/^\/+/, "")}`;
  }

  if (channel.handle) {
    const handle = channel.handle.replace(/^@/, "");
    return `${youtubeOrigin}/@${handle}`;
  }

  return "";
}

function findChannelId(value = "") {
  const decoded = decodeHtml(value);
  const patterns = [
    /channel_id=(UC[\w-]{22})/i,
    /\/channel\/(UC[\w-]{22})/i,
    /"channelId":"(UC[\w-]{22})"/i,
    /"externalId":"(UC[\w-]{22})"/i,
    /"browseId":"(UC[\w-]{22})"/i
  ];
  return patterns.map((pattern) => decoded.match(pattern)?.[1]).find(Boolean) ?? "";
}

async function resolveChannel(channel) {
  if (channel.channelId) {
    return {
      ...channel,
      channelId: channel.channelId,
      url: channel.url || `${youtubeOrigin}/channel/${channel.channelId}`
    };
  }

  const pageUrl = normalizeYouTubeUrl(channel);
  if (!pageUrl) {
    return null;
  }

  const response = await fetch(pageUrl, {
    headers: {
      "user-agent": "DoStuffAndHaveFunBot/1.0 (+https://dostuffandhavefun.com)"
    }
  });

  if (!response.ok) {
    throw new Error(`Could not open ${pageUrl}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const rssLink = readLink(html, "alternate");
  const canonical = readHref(readLink(html, "canonical"));
  const channelId = findChannelId(rssLink) || findChannelId(canonical) || findChannelId(html);

  if (!channelId) {
    throw new Error(`Could not find a YouTube channel ID at ${pageUrl}`);
  }

  return {
    ...channel,
    channelId,
    name: channel.name || readMeta(html, "og:title") || "Do Stuff & Have Fun",
    url: channel.url || canonical || `${youtubeOrigin}/channel/${channelId}`
  };
}

function parseFeed(xml, channel) {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) ?? [];
  return entries.map((entry) => {
    const videoId = readTag(entry, "yt:videoId");
    const published = readTag(entry, "published");
    const title = readTag(entry, "title");
    const url = videoId ? `https://www.youtube.com/watch?v=${videoId}` : readAttr(entry, "link", "href");
    return {
      id: videoId,
      title,
      channel: channel.name,
      channelUrl: channel.url,
      url,
      published,
      description: readTag(entry, "media:description"),
      thumbnail: readAttr(entry, "media:thumbnail", "url"),
      keywords: [channel.lane, "kid friendly videos", "Do Stuff & Have Fun"].filter(Boolean),
      isLive: Boolean(videoId && title && url)
    };
  });
}

const connectedChannels = [];
const videos = [];

for (const channel of youtubeChannels) {
  const connectedChannel = await resolveChannel(channel);
  if (connectedChannel) {
    connectedChannels.push(connectedChannel);
  }
}

for (const channel of connectedChannels) {
  const feedUrl = `${youtubeOrigin}/feeds/videos.xml?channel_id=${encodeURIComponent(channel.channelId)}`;
  const response = await fetch(feedUrl);
  if (!response.ok) {
    throw new Error(`Could not fetch ${channel.name}: ${response.status} ${response.statusText}`);
  }
  const xml = await response.text();
  videos.push(...parseFeed(xml, channel));
}

videos.sort((a, b) => String(b.published).localeCompare(String(a.published)));
await writeFile(outputPath, `${JSON.stringify(videos, null, 2)}\n`);
console.log(`Saved ${videos.length} YouTube videos from ${connectedChannels.length} channels.`);
