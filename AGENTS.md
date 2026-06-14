# dostuffandhavefun.com Project Instructions

## User Style

- The primary user is nontechnical and wants Codex to make fun projects end to end.
- Keep explanations plain and short. Handle technical setup, GitHub, hosting, and deployment automatically.
- Do not expect the user to understand branches, commits, pull requests, merges, DNS, build systems, or server administration.

## Design Quality Bar

- The site must never look like generic AI output.
- Use intentional layouts, polished spacing, clear hierarchy, restrained copy, and assets that feel specific to the project.
- Avoid filler sections, vague marketing language, repetitive generated art, fake testimonials, random gradients, and unfinished placeholder text.
- If exact YouTube channel/video data is unavailable, present the missing state as a deliberate launch-ready framework, not as broken or fake content.
- Future visual updates should feel playful, crafted, and trustworthy for kids and parents.
- Preserve the YouTube auto-update path: channel IDs live in `src/data/youtube.config.js`, generated videos live in `src/data/videos.generated.json`, and the scheduled GitHub workflow is `.github/workflows/update-youtube.yml`.
- Google/YouTube/analytics setup notes live in `deploy/google-youtube-setup.md`.
- The user asked that Chrome be opened every time an update is deployed. If Chrome is not running, ask permission before launching it and do not claim deployment verification without Chrome.

## Disk Space

- This computer has very limited local hard drive space.
- Keep this folder lightweight. Avoid storing large dependencies, archives, videos, exported builds, generated image batches, or duplicated repositories here.
- Prefer GitHub, Hostinger, the VPS, and other cloud services for durable work, builds, deployment, and backups.
- Remove temporary files after use unless they are small notes or source files that should stay.

## Image Generation

- Codex has built-in image generation available through the image generation skill/tool. Use it for project assets such as logos, banners, backgrounds, illustrations, thumbnails, sprites, placeholders, and social images when useful.
- Natural-language image requests are enough. The user does not need to know the `$imagegen` keyword, but Codex may use it internally when appropriate.
- For normal project assets, use the built-in Codex image generation capability rather than setting up a separate MCP server.
- Built-in Codex image generation uses OpenAI image generation and counts against the user's Codex/ChatGPT usage limits.
- For large batches or production pipelines, use the OpenAI API only if an `OPENAI_API_KEY` is configured. Do not assume the ChatGPT Pro subscription provides an API key.
- Because disk space is limited, save only final selected images locally. Store reusable project assets in GitHub or deploy them to the cloud.

## Hosting And Deployment

- Main domain: `dostuffandhavefun.com`.
- VPS IP: `2.25.190.115`.
- Contact email: `georgeandjohnmcp@gmail.com`.
- Hostinger access is available through the global MCP server named `hostinger-api`.
- The VPS has other real projects on it. Do not disturb them.
- All future chats must treat the VPS as a shared production server.
- Before any VPS change, inspect the current web server configs, enabled sites, document roots, active services, process managers, firewall, and certificates.
- Only create or modify isolated resources for `dostuffandhavefun.com`, preferably `/var/www/dostuffandhavefun.com` and `/etc/nginx/sites-available/dostuffandhavefun.com`.
- Do not overwrite global Nginx/Apache configs or existing site configs. Validate before reload.
- Do not stop, restart, delete, reinstall, reset, rebuild, restore, or broadly reconfigure server services unless the user explicitly asks after being warned.
- Only create or modify resources clearly dedicated to `dostuffandhavefun.com` or to a user-requested project.
- Deploys should be automatic. Codex should handle release steps and then verify the public URL.

## Current Deployment Facts

- Hostinger VPS ID for `2.25.190.115`: `1744303`.
- DNS has `@` A record pointing to `2.25.190.115`.
- DNS has `www` CNAME pointing to `dostuffandhavefun.com.`
- On June 14, 2026, HTTP for `dostuffandhavefun.com` redirected to `https://my-ccs.com/`.
- On June 14, 2026, HTTPS answered with a certificate that did not include `dostuffandhavefun.com`.
- Fix by adding an isolated `dostuffandhavefun.com` site config and issuing SSL only for this domain and `www`, not by disturbing existing sites.

## GitHub

- GitHub account: `georgeandjohnmcp-blip`.
- Main repository: `georgeandjohnmcp-blip/dostuffandhavefun.com`.
- GitHub access is stored privately at `~/.codex/secrets/github.env`. Do not print, paste, commit, or reveal it.
- Keep the repository beginner-friendly with clear names and helpful README notes.
