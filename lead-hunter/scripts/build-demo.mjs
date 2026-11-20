// Builds a single self-contained HTML demo (sample data, in-browser API) into ./demo-dist/index.html.
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "demo-dist");
mkdirSync(out, { recursive: true });

const js = await build({
  entryPoints: [path.join(root, "src/demo/entry.tsx")],
  bundle: true,
  write: false,
  minify: true,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  alias: {
    "@": path.join(root, "src"),
    "next/link": path.join(root, "src/demo/shims/next-link.tsx"),
    "next/navigation": path.join(root, "src/demo/shims/next-navigation.ts"),
  },
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "none",
});

execFileSync("npx", ["@tailwindcss/cli", "-i", "src/app/globals.css", "-o", "demo-dist/app.css", "--minify"], { cwd: root, stdio: "inherit" });
const css = readFileSync(path.join(out, "app.css"), "utf8");
const script = js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

const html = `<title>MONSTA Lead Hunter</title>
<style>${css}
:root{color-scheme:dark}
body{background:#071219;color:#f0f4f6}
.demo-header{top:env(safe-area-inset-top,0px)}
body::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:40;background:#071219}
</style>
<div id="root"></div>
<script>${script}</script>
`;
writeFileSync(path.join(out, "index.html"), html);
console.log(`demo-dist/index.html ${(html.length / 1024).toFixed(0)} KB`);
