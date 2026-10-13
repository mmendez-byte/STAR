// Genera las miniaturas del hub (public/assets/img/thumbs/<id>.jpg) a partir
// del portal corriendo en local. Requiere Playwright instalado globalmente.
//
//   npm run dev                       # en otra terminal
//   STAR_PASSWORD=... node scripts/thumbs.mjs
//
// Variables: STAR_URL (por defecto http://127.0.0.1:8787) y STAR_PASSWORD.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const base = process.env.STAR_URL || "http://127.0.0.1:8787";
const password = process.env.STAR_PASSWORD;
if (!password) {
  console.error("Falta STAR_PASSWORD");
  process.exit(1);
}

const root = fileURLToPath(new URL("..", import.meta.url));
const scenarios = JSON.parse(await readFile(`${root}public/escenarios.json`, "utf8"));

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
const page = await context.newPage();

await page.goto(`${base}/login`);
await page.fill("#password", password);
await Promise.all([page.waitForURL(`${base}/`), page.click("button[type=submit]")]);

for (const sc of scenarios) {
  const mobile = sc.device === "mobile";
  await page.setViewportSize(mobile ? { width: 1280, height: 1400 } : { width: 700, height: 900 });
  await page.goto(`${base}/escenarios/${sc.id}`);
  await page.evaluate(() => document.fonts.ready);
  const target = page.locator(mobile ? ".device-screen" : ".browser");
  const box = await target.boundingBox();
  const height = mobile ? Math.min(box.height, 940) : box.height;
  await page.screenshot({
    path: `${root}public/assets/img/thumbs/${sc.id}.jpg`,
    type: "jpeg",
    quality: 82,
    clip: { x: box.x, y: box.y, width: box.width, height },
  });
  console.log(`  ${sc.id}  ${Math.round(box.width)}x${Math.round(height)}`);
}

await browser.close();
