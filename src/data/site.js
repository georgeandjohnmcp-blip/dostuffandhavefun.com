export const channels = [
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

export const featuredVideos = [
  {
    title: "Challenge Playlist",
    channel: "Adventure Lab",
    description: "A spotlight lane for the most clickable challenge videos once the YouTube channel links are connected.",
    url: "#youtube-connection",
    thumbnail: "/assets/play-lab-hero.png",
    keywords: ["kids challenge video", "fun videos for kids", "family friendly YouTube"],
    status: "Channel link needed",
    isLive: false
  },
  {
    title: "Shorts Watch Path",
    channel: "Shorts Spark",
    description: "A Shorts-friendly lane for quick clips that can earn repeat views and send viewers to full videos.",
    url: "#youtube-connection",
    thumbnail: "/assets/play-lab-hero.png",
    keywords: ["funny kids shorts", "quick kid videos", "YouTube shorts for kids"],
    status: "Channel link needed",
    isLive: false
  },
  {
    title: "Creative Project Episodes",
    channel: "Creative Workshop",
    description: "A home for craft, experiment, and learning videos that answer parent and kid search questions.",
    url: "#youtube-connection",
    thumbnail: "/assets/play-lab-hero.png",
    keywords: ["craft videos for kids", "easy kids experiments", "creative kids activities"],
    status: "Channel link needed",
    isLive: false
  }
];

export const topicHubs = [
  {
    title: "Things To Do When Bored",
    answer: "A page cluster for videos that give kids quick, safe ideas when they want something fun to watch or try.",
    keywords: ["things to do when bored for kids", "fun kid activities", "videos for bored kids"]
  },
  {
    title: "Funny Safe Challenges",
    answer: "A discovery lane for challenge videos that feel energetic without encouraging dangerous copycat behavior.",
    keywords: ["safe challenges for kids", "funny kid challenges", "family friendly challenge videos"]
  },
  {
    title: "Crafts And Experiments",
    answer: "A parent-friendly topic hub for creative projects, simple experiments, and watch-next learning videos.",
    keywords: ["craft videos for kids", "easy experiments for kids", "creative activities for kids"]
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
  "Open the signed-in YouTube account and collect the exact channel URLs.",
  "Choose 6 to 12 starter videos across the channels: best long video, best Short, best challenge, best craft, best experiment, and newest upload.",
  "Replace this starter data with real titles, thumbnails, URLs, upload dates, and short summaries.",
  "Generate one search page per strong video so Google and answer engines have text they can understand.",
  "Track which pages send viewers back to YouTube and double down on the topics that earn watch time."
];
