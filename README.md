# Do Stuff & Have Fun

This is the new Astro website for `dostuffandhavefun.com`: a bright, playful home base for kid-friendly YouTube videos, channels, challenges, crafts, experiments, and search-friendly video discovery.

## What Is Here

- A generated logo: `public/assets/do-stuff-logo.png`
- Generated hero artwork: `public/assets/play-lab-hero.png`
- Astro source files in `src/`
- A lightweight static preview/deploy copy in `dist/`
- Deployment instructions in `deploy/`

## YouTube Channels

The site currently has placeholder YouTube channel/video links because the exact channels were not identifiable from public search. Replace the links in `src/data/site.js` when the channel URLs are available.

## Deployment Safety

The VPS is shared with other real sites. Future Codex chats must inspect the server first, only touch isolated `dostuffandhavefun.com` resources, validate Nginx before reload, and never disturb existing sites such as `my-ccs.com`.

Current known issue: `dostuffandhavefun.com` points to the VPS, but the VPS currently redirects this domain to `https://my-ccs.com/`, and SSL is not yet issued for `dostuffandhavefun.com`.
