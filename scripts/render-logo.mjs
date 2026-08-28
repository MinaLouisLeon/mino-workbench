// Renders the app logo from SVG to the 1024px PNG that `tauri icon` needs.
//
// Kept as a script rather than a committed binary step so the icon has one
// source of truth: edit icons/logo.svg, run this, then run `npx tauri icon`.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { chromium } from "playwright";

const SIZE = 1024;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "apps", "desktop", "src-tauri", "icons", "logo.svg");
const out = process.argv[2] ?? path.join(root, "apps", "desktop", "src-tauri", "icons", "source.png");

const svg = readFileSync(source, "utf8");
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: SIZE, height: SIZE },
  deviceScaleFactor: 1,
});
// `omitBackground` keeps the rounded corners transparent rather than white.
await page.setContent(
  `<body style="margin:0">${svg.replace(/width="\d+" height="\d+"/, `width="${SIZE}" height="${SIZE}"`)}</body>`,
);
await page.screenshot({ path: out, omitBackground: true });
await browser.close();
console.log("wrote", out);
