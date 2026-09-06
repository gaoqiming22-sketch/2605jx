// ============================================================
// scripts/build.mjs —— 生成成品
//   用法： node scripts/build.mjs
//   可选： --data 路径（默认 js/data.js） --out 目录（默认 dist）
//   产物： dist/2605军训纪念册.html  单文件自包含（图片base64内联）
//         dist/长图.html            1080宽纵向版（供截图，可不上传）
//         dist/2605军训总长图.png   长图.png（发QQ群直接看）
// ============================================================
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
function argVal(name) {
  const i = args.indexOf("--" + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
}
const dataPath = path.resolve(root, argVal("data") || "js/data.js");
const outDir = path.resolve(root, argVal("out") || "dist");
const wantPng = !args.includes("--no-png");

mkdirSync(outDir, { recursive: true });

/* ---------- 读取数据源 ---------- */
const code = readFileSync(dataPath, "utf8");
const sandbox = { window: {} };
try {
  vm.runInNewContext(code, sandbox, { filename: dataPath });
} catch (e) {
  console.error("✗ js/data.js 解析失败：" + e.message);
  process.exit(1);
}
const data = sandbox.window.JX_DATA;
if (!data || !data.meta) {
  console.error("✗ js/data.js 里没有找到 window.JX_DATA（含 meta）");
  process.exit(1);
}
const days = data.days || [];
const meta = data.meta || {};

/* ---------- 图片 → base64 内联 ---------- */
const mimeMap = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };
function toDataUri(rel) {
  if (!rel) return null;
  const p = path.resolve(root, rel);
  if (!existsSync(p)) { console.warn("  ⚠ 找不到图片（已跳过该图）：" + rel); return null; }
  const mime = mimeMap[path.extname(p).toLowerCase()] || "application/octet-stream";
  return "data:" + mime + ";base64," + readFileSync(p).toString("base64");
}
function cloneInlined(d) {
  const c = JSON.parse(JSON.stringify(d));
  if (c.meta && c.meta.logo) { const u = toDataUri(c.meta.logo); if (u) c.meta.logo = u; else delete c.meta.logo; }
  (c.days || []).forEach((day) => {
    if (Array.isArray(day.photos)) {
      day.photos = day.photos.map((p) => ({ ...p, file: toDataUri(p.file) || "" })).filter((p) => p.file);
    }
  });
  if (Array.isArray(c.gallery)) {
    c.gallery = c.gallery.map((g) => ({ ...g, file: toDataUri(g.file) || "" })).filter((g) => g.file);
  }
  return c;
}
const inlined = cloneInlined(data);
const jsonForScript = JSON.stringify(inlined).replace(/<\//g, "<\\/");

/* ---------- 读取样式与渲染脚本 ---------- */
const css = readFileSync(path.join(root, "styles.css"), "utf8");
const appJs = readFileSync(path.join(root, "js", "app.js"), "utf8");
const skin = `
  <style>${css}</style>`;

function pageDoc(bodyClass) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<title>${(meta.title || "2605 · 军训纪").replace(/</g, "&lt;")}</title>
${skin}
</head>
<body${bodyClass ? ' class="' + bodyClass + '"' : ""}>
<main id="view"></main>
<footer id="jxFoot" class="jx-foot"></footer>
<script>window.JX_DATA = ${jsonForScript};</script>
<script>${appJs}</script>
</body>
</html>`;
}

/* ---------- 生成 1) 单文件纪念册 ---------- */
const bookPath = path.join(outDir, "2605军训纪念册.html");
writeFileSync(bookPath, pageDoc(""), "utf8");
console.log("✓ 已生成 " + rel(bookPath) + "（" + kb(bookPath) + " KB，单文件自包含）");

/* ---------- 生成 2) 长图源页 ---------- */
const longPath = path.join(outDir, "长图.html");
writeFileSync(longPath, pageDoc("jx-long"), "utf8");
console.log("✓ 已生成 " + rel(longPath) + "（长图源页，可不上传）");

/* ---------- 生成 3) 总长图 PNG ---------- */
if (wantPng) {
  await makeLongPng(longPath, path.join(outDir, "2605军训总长图.png"));
}

console.log("\n共 " + days.length + " 天记录。完成！");

/* ========== 工具函数 ========== */
function rel(p) { return path.relative(root, p); }
function kb(p) { return Math.round(statSync(p).size / 1024); }

async function makeLongPng(longHtmlPath, pngPath) {
  let pw = null;
  try {
    const { createRequire } = await import("node:module");
    const req = createRequire(import.meta.url);
    for (const mod of ["playwright-core", "playwright"]) {
      try { pw = req(mod); break; } catch (e) { /* 继续尝试 */ }
    }
    if (!pw) {
      const home = process.env.USERPROFILE || process.env.HOME || "";
      const bundled = path.join(home, ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright-core");
      if (existsSync(bundled)) { pw = req(bundled); }
    }
  } catch (e) { pw = null; }
  if (!pw) {
    console.warn("⚠ 未找到 playwright-core，跳过总长图 PNG。可设置后重跑：node scripts/build.mjs");
    return;
  }
  const chromeCands = [
    process.env.PROGRAMFILES + "\\Google\\Chrome\\Application\\chrome.exe",
    process.env["PROGRAMFILES(X86)"] + "\\Google\\Chrome\\Application\\chrome.exe",
    process.env.PROGRAMFILES + "\\Microsoft\\Edge\\Application\\msedge.exe",
    process.env["PROGRAMFILES(X86)"] + "\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  const chrome = chromeCands.find((c) => c && existsSync(c));
  if (!chrome) { console.warn("⚠ 未找到 Chrome/Edge，跳过总长图 PNG。"); return; }
  try {
    const browser = await pw.chromium.launch({
      executablePath: chrome, headless: true,
      args: ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb", "--font-render-hinting=none"],
    });
    const page = await browser.newPage({ viewport: { width: 1080, height: 900 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(longHtmlPath).href, { waitUntil: "networkidle" });
    if (page.evaluate(() => document.fonts && document.fonts.ready)) {
      try { await page.evaluate(() => document.fonts.ready); } catch (e) { /* 忽略 */ }
    }
    await page.waitForTimeout(400);
    await page.screenshot({ path: pngPath, fullPage: true, type: "png" });
    const h = await page.evaluate(() => document.body.scrollHeight);
    await browser.close();
    console.log("✓ 已生成 " + rel(pngPath) + "（" + kb(pngPath) + " KB，宽 1080，高约 " + h + " px）");
    if (kb(pngPath) > 10240) console.warn("⚠ 总长图超过 10MB，QQ 发送可能被压缩/受限，建议减少照片或拆分。");
  } catch (e) {
    console.warn("⚠ 总长图生成失败：" + e.message);
  }
}