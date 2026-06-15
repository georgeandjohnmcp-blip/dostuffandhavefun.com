# Do Stuff & Have Fun

This is the Astro website for `dostuffandhavefun.com`: a 10-game browser arcade with one YouTube link to EPICMAPPING.

## What Is Here

- One games-first homepage
- 10 playable mini-games in the browser
- One external YouTube link: `https://www.youtube.com/@EPICMAPPING023`
- No extra content sections or logo assets
- Astro source files in `src/`
- A lightweight static deploy copy in `dist/`
- Deployment instructions in `deploy/`

## Design Rule

This site should never look like generic AI output. Keep it handmade, punchy, playful, and specific. The site should be games first.

## Rebuild

If npm is unavailable on this Mac, use the no-dependency fallback:

```bash
/Users/georgiemcpherson/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/render-static.mjs
```

That rebuilds `dist/` without installing `node_modules`.

## Analytics And Search Console

GA4 and Google Search Console are wired but not activated yet. Add the real GA4 measurement ID and Search Console verification token in `src/data/tracking.js`, then rebuild and deploy.

Requested admin email: `geompcherson@gmail.com`.

GA4 handoff state: Chrome is open at Google Analytics setup with account name `Do Stuff and Have Fun`, property name `dostuffandhavefun.com`, industry `Arts & Entertainment`, business size `Small - 1 to 10 employees`, and objectives `Understand web and/or app traffic` plus `View user engagement & retention`. The next action must be the user accepting Google's Analytics Terms of Service. Codex must not click `I Accept` for the user.

See `deploy/google-youtube-setup.md` for the full setup checklist.

## Deployment Safety

The VPS is shared with other real sites. Future Codex chats must inspect the server first, only touch isolated `dostuffandhavefun.com` resources, validate Nginx before reload, and never disturb existing sites such as `my-ccs.com`.

Current hosting route: Hostinger has a dedicated website slot for `dostuffandhavefun.com`. Deploy only the built static files for this project into that slot, then verify `https://dostuffandhavefun.com/`.

## Current Live Status

The current site is a 10-game arcade with one EPICMAPPING YouTube link.

Deployment note for future chats: the Hostinger MCP static deploy tool may fail during TUS upload if it follows the returned `Location` URL. The working path is to upload the archive to the original `files/upload-urls` target with `X-Auth`, `X-Auth-Rest`, `Upload-Length`, `Upload-Offset`, and `Tus-Resumable`, then trigger `/api/hosting/v1/accounts/u937775855/websites/dostuffandhavefun.com/deploy` with the archive filename.

DNS note: the root `AAAA` record was removed because IPv6 connections reset while IPv4 works. Keep the root `A` record pointed to `185.162.53.21` and `www` as a CNAME to `dostuffandhavefun.com`.
