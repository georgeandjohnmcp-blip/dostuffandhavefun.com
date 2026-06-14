import { writeFile } from "node:fs/promises";
import { youtubeChannels } from "../src/data/youtube.config.js";

const outputPath = new URL("../src/data/videos.generated.json", import.meta.url);

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

const connectedChannels = youtubeChannels.filter((channel) => channel.channelId);
const videos = [];

for (const channel of connectedChannels) {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channel.channelId)}`;
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
