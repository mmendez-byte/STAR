// Genera las miniaturas del hub (public/assets/img/thumbs/<id>.jpg) con la app
// corriendo en local, en tamaño celular. Requiere Playwright instalado.
//
//   npm run dev                       # en otra terminal
//   STAR_PASSWORD=... node scripts/thumbs.mjs
//
// Variables: STAR_URL (por defecto http://127.0.0.1:8787), STAR_PASSWORD y,
// si hace falta, CHROMIUM_PATH. Los escenarios salen de public/app/data.js.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { chromium } from "playwright";

const base = process.env.STAR_URL || "http://127.0.0.1:8787";
const password = process.env.STAR_PASSWORD;
if (!password) {
  console.error("Falta STAR_PASSWORD");
  process.exit(1);
}

const root = fileURLToPath(new URL("..", import.meta.url));
const sandbox = { window: {} };
vm.runInNewContext(await readFile(`${root}public/app/data.js`, "utf8"), sandbox);
const scenarios = sandbox.window.STAR.SCENARIOS;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
const page = await context.newPage();

await page.goto(`${base}/login`);
await page.fill("#password", password);
await Promise.all([page.waitForURL(`${base}/`), page.click("button[type=submit]")]);

for (const sc of scenarios) {
  await page.goto(`${base}/escenarios/${sc.id}`);
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: ".demo { display: none !important; }" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${root}public/assets/img/thumbs/${sc.id}.jpg`, type: "jpeg", quality: 82 });
  console.log(`  ${sc.id}  ${sc.title}`);
}

await browser.close();
