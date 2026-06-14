export function GET() {
  return new Response(
    `User-agent: *
Allow: /

Sitemap: https://dostuffandhavefun.com/sitemap-index.xml
`,
    {
      headers: {
        "Content-Type": "text/plain"
      }
    }
  );
}
