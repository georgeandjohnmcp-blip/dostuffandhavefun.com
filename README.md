# Do Stuff & Have Fun

This is the new Astro website for `dostuffandhavefun.com`: a bright, playful home base for kid-friendly YouTube videos, channels, challenges, crafts, experiments, and search-friendly video discovery.

## What Is Here

- A generated logo: `public/assets/do-stuff-logo.png`
- Generated hero artwork: `public/assets/play-lab-hero.png`
- Handcrafted thumbnail artwork for starter video lanes
- Astro source files in `src/`
- A lightweight static preview/deploy copy in `dist/`
- Deployment instructions in `deploy/`

## Design Rule

This site should never look like generic AI output. Keep it polished, specific, playful, and trustworthy. If real YouTube data is missing, make the empty state feel intentional and launch-ready.

## YouTube Channels

The site is ready to stay updated from YouTube channel feeds. Add each channel ID and URL in `src/data/youtube.config.js`, then run:

```bash
npm run youtube:update
```

That writes the newest videos to `src/data/videos.generated.json`, and the homepage automatically switches from starter lanes to real YouTube videos.

The exact channels still need to be collected from the signed-in YouTube account.

## Analytics And Search Console

GA4 and Google Search Console are wired but not activated yet. Add the real GA4 measurement ID and Search Console verification token in `src/data/tracking.js`, then rebuild and deploy.

Requested admin email: `geompcherson@gmail.com`.

## Deployment Safety

The VPS is shared with other real sites. Future Codex chats must inspect the server first, only touch isolated `dostuffandhavefun.com` resources, validate Nginx before reload, and never disturb existing sites such as `my-ccs.com`.

Current known issue: `dostuffandhavefun.com` points to the VPS, but the VPS currently redirects this domain to `https://my-ccs.com/`, and SSL is not yet issued for `dostuffandhavefun.com`.
