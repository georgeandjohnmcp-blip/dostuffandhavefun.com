export function GET() {
  return new Response(
    `User-agent: *
Allow: /

Sitemap: https://dostuffandhavefun.com/sitemap-index.xml

LLMS: https://dostuffandhavefun.com/llms.txt
`,
    {
      headers: {
        "Content-Type": "text/plain"
      }
    }
  );
}
