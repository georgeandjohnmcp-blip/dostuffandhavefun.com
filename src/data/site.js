import { youtubeChannels } from "./youtube.config.js";

const starterChannels = [
  {
    name: "Adventure Lab",
    handle: "Ready for channel link",
    description: "The home for bigger playful videos: challenges, experiments, projects, and moments kids can get excited about.",
    url: "#youtube-connection",
    theme: "Maker challenges",
    color: "coral"
  },
  {
    name: "Shorts Spark",
    handle: "Ready for channel link",
    description: "Fast, funny ideas made for quick discovery, repeat watching, and short-form growth.",
    url: "#youtube-connection",
    theme: "Shorts and quick laughs",
    color: "aqua"
  },
  {
    name: "Creative Workshop",
    handle: "Ready for channel link",
    description: "Crafts, learning moments, and curious little projects with bright visuals and parent-friendly framing.",
    url: "#youtube-connection",
    theme: "Crafts and experiments",
    color: "green"
  }
];

function channelUrl(channel) {
  if (channel.url) {
    return channel.url;
  }

  if (channel.handle) {
    return `https://www.youtube.com/@${channel.handle.replace(/^@/, "")}`;
  }

  if (channel.channelId) {
    return `https://www.youtube.com/channel/${channel.channelId}`;
  }

  return "#youtube-connection";
}

function channelHandle(channel) {
  if (channel.handle) {
    return channel.handle.startsWith("@") ? channel.handle : `@${channel.handle}`;
  }

  const handleMatch = channel.url?.match(/youtube\.com\/@([^/?#]+)/i);
  if (handleMatch) {
    return `@${handleMatch[1]}`;
  }

  return channel.channelId ? "Connected YouTube feed" : "Ready for channel link";
}

const connectedChannels = youtubeChannels.filter((channel) => channel.channelId || channel.handle || channel.url);

export const channels = connectedChannels.length
  ? connectedChannels.map((channel) => ({
      name: channel.name,
      handle: channelHandle(channel),
      description:
        channel.description ||
        `Latest ${channel.lane || "videos"} from this YouTube channel flow into the Do Stuff & Have Fun video library.`,
      url: channelUrl(channel),
      theme: channel.lane || "YouTube uploads",
      color: channel.color || "coral"
    }))
  : starterChannels;

export const featuredVideos = [
  {
    title: "Challenge Playlist",
    channel: "Adventure Lab",
    description: "A spotlight lane for the most clickable challenge videos once the YouTube channel links are connected.",
    url: "#youtube-connection",
    thumbnail: "/assets/thumb-challenges.svg",
    keywords: ["kids challenge video", "fun videos for kids", "family friendly YouTube"],
    status: "Starter lane",
    isLive: false
  },
  {
    title: "Shorts Watch Path",
    channel: "Shorts Spark",
    description: "A Shorts-friendly lane for quick clips that can earn repeat views and send viewers to full videos.",
    url: "#youtube-connection",
    thumbnail: "/assets/thumb-shorts.svg",
    keywords: ["funny kids shorts", "quick kid videos", "YouTube shorts for kids"],
    status: "Starter lane",
    isLive: false
  },
  {
    title: "Creative Project Episodes",
    channel: "Creative Workshop",
    description: "A home for craft, experiment, and learning videos that answer parent and kid search questions.",
    url: "#youtube-connection",
    thumbnail: "/assets/thumb-crafts.svg",
    keywords: ["craft videos for kids", "easy kids experiments", "creative kids activities"],
    status: "Starter lane",
    isLive: false
  }
];

export function buildFeaturedVideos(generatedVideos = []) {
  if (!Array.isArray(generatedVideos) || generatedVideos.length === 0) {
    return featuredVideos;
  }

  return generatedVideos.slice(0, 9).map((video) => ({
    id: video.id,
    title: video.title,
    channel: video.channel,
    channelUrl: video.channelUrl,
    description: video.description || "A new Do Stuff & Have Fun upload, ready to watch on YouTube.",
    url: video.url,
    thumbnail: video.thumbnail || "/assets/thumb-challenges.svg",
    keywords: video.keywords || ["kid friendly videos", "fun videos for kids"],
    status: "Watch on YouTube",
    isLive: true,
    published: video.published
  }));
}

export const topicHubs = [
  {
    slug: "things-to-do-when-bored",
    title: "Things To Do When Bored",
    answer: "A page cluster for videos that give kids quick, safe ideas when they want something fun to watch or try.",
    keywords: ["things to do when bored for kids", "fun kid activities", "videos for bored kids"],
    intro:
      "This hub is for videos that solve the classic bored-kid problem: quick ideas, upbeat energy, and safe prompts that can turn a slow afternoon into something playful.",
    watchPlan: [
      "Lead with short videos that create instant momentum.",
      "Pair each video with one simple activity idea a parent can understand in ten seconds.",
      "Link viewers toward the next challenge, craft, or experiment so the watch path keeps going."
    ],
    questions: [
      {
        question: "What can kids watch when they are bored?",
        answer: "Start with a quick, family-friendly video that gives them an idea to laugh at, copy safely, or talk about with a parent."
      },
      {
        question: "How does this help the YouTube channels grow?",
        answer: "The page catches broad search demand, answers it clearly, and routes viewers toward playlists that can build watch time."
      }
    ]
  },
  {
    slug: "safe-funny-challenges",
    title: "Funny Safe Challenges",
    answer: "A discovery lane for challenge videos that feel energetic without encouraging dangerous copycat behavior.",
    keywords: ["safe challenges for kids", "funny kid challenges", "family friendly challenge videos"],
    intro:
      "Challenge videos can be the highest-energy part of the site, but they need to feel parent-safe. This hub frames the fun around laughter, timing, creativity, and harmless surprise.",
    watchPlan: [
      "Show the funniest challenge videos first.",
      "Use page copy that avoids risky dares and keeps the tone safe.",
      "Suggest related challenge videos by mood: silly, creative, fast, messy, or teamwork."
    ],
    questions: [
      {
        question: "What makes a challenge video safe for kids?",
        answer: "A safe challenge avoids danger, pressure, and copycat risk, while still giving kids a clear playful idea to enjoy."
      },
      {
        question: "Why make a dedicated challenge hub?",
        answer: "Challenge searches are specific and high-intent, so a focused page can bring viewers who already know what kind of video they want."
      }
    ]
  },
  {
    slug: "crafts-and-experiments",
    title: "Crafts And Experiments",
    answer: "A parent-friendly topic hub for creative projects, simple experiments, and watch-next learning videos.",
    keywords: ["craft videos for kids", "easy experiments for kids", "creative activities for kids"],
    intro:
      "This hub turns craft and experiment videos into a trustworthy watch path for parents and a colorful discovery path for kids.",
    watchPlan: [
      "Group videos by what the child wants to make, test, or discover.",
      "Write plain summaries that help parents judge supplies, mess, and supervision.",
      "Use related links to move from one project video into the next natural idea."
    ],
    questions: [
      {
        question: "Are craft and experiment videos good for search traffic?",
        answer: "Yes. Parents and kids search for specific projects, materials, and easy experiments, which makes these pages strong SEO targets."
      },
      {
        question: "What should each craft video page include?",
        answer: "Each page should include the video, a short answer, a supply note, a simple summary, and related videos."
      }
    ]
  }
];

export const growthLoops = [
  "Create one page per video with a short answer, parent-friendly summary, embedded video, transcript, and related activity ideas.",
  "Turn each video into 3 discovery paths: a YouTube title, a Google-search question page, and a Shorts teaser.",
  "Group videos by topics kids search for, such as challenges, crafts, experiments, funny moments, and things to do when bored.",
  "Use clear schema for videos and FAQs so search engines and answer engines can understand the site.",
  "Keep every page safe, accurate, and family friendly so parents trust the site and kids know what to watch next."
];

export const youtubeConnectionSteps = [
  "Add each signed-in YouTube channel link, handle, or channel ID to the connector config.",
  "Run the YouTube updater so the public RSS feeds provide real titles, thumbnails, URLs, dates, and summaries.",
  "Publish the rebuilt static site so the homepage, video library, video pages, sitemap, and schema use the live uploads.",
  "Keep the scheduled GitHub workflow turned on so new uploads can refresh the site automatically.",
  "Track which pages send viewers back to YouTube and grow the topics that earn watch time."
];
