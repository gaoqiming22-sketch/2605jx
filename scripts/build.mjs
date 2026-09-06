// ============================================================
// scripts/build.mjs —— 生成成品（基于 index.html 单源）
//   用法： node scripts/build.mjs
//   可选： --data 路径（默认 js/data.js） --out 目录（默认 dist）
//   产物： dist/2605军训纪念册.html  单文件自包含（图片base64内联）
//         dist/长图.html            长图源页（body.jx-long，供截图）
//         dist/2605军训总长图.png   长图.png（发QQ群直接看的备份）
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
// 只对“数据 JSON”做转义（它会被写进 <script>，防止用户文字里的 </script> 破坏页面）
const jsonForScript = JSON.stringify(inlined).replace(/<\//g, "<\\/");

/* ---------- 读取骨架/样式/脚本 ---------- */
const indexHtml = readFileSync(path.join(root, "index.html"), "utf8");
const css = readFileSync(path.join(root, "styles.css"), "utf8");
const appJs = readFileSync(path.join(root, "js", "app.js"), "utf8");

function assemble(bodyClass) {
  let doc = indexHtml;
  doc = doc.replace('<link rel="stylesheet" href="styles.css">', "<style>\n" + css + "\n</style>");
  doc = doc.replace('<script src="js/data.js"></script>', "<script>window.JX_DATA = " + jsonForScript + ";</script>");
  doc = doc.replace('<script src="js/app.js"></script>', "<script>\n" + appJs + "\n</script>");
  const logoUri = toDataUri(meta.logo);
  doc = doc.replace('<link rel="icon" href="assets/logo.png">', logoUri ? '<link rel="icon" href="' + logoUri + '">' : "");
  if (bodyClass) doc = doc.replace("<body>", '<body class="' + bodyClass + '">');
  return doc;
}

/* ---------- 生成 1) 单文件纪念册（网页版自包含） ---------- */
const bookPath = path.join(outDir, "2605军训纪念册.html");
writeFileSync(bookPath, assemble(""), "utf8");
console.log("✓ 已生成 " + rel(bookPath) + "（" + kb(bookPath) + " KB，单文件自包含网页版）");

/* ---------- 生成 2) 长图源页 ---------- */
const longPath = path.join(outDir, "长图.html");
writeFileSync(longPath, assemble("jx-long"), "utf8");
console.log("✓ 已生成 " + rel(longPath) + "（长图源页，可不上传）");

/* ---------- 生成 3) 总长图 PNG（可选备份） ---------- */
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
      try { pw = req(mod); break; } catch (e) { /* 继续 */ }
    }
    if (!pw) {
      const home = process.env.USERPROFILE || process.env.HOME || "";
      const bundled = path.join(home, ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright-core");
      if (existsSync(bundled)) pw = req(bundled);
    }
  } catch (e) { pw = null; }
  if (!pw) { console.warn("⚠ 未找到 playwright-core，跳过总长图 PNG。可重跑：node scripts/build.mjs"); return; }
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
      args: ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb"],
    });
    const page = await browser.newPage({ viewport: { width: 1080, height: 900 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(longHtmlPath).href, { waitUntil: "networkidle" });
    try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch (e) { /* 忽略 */ }
    await page.waitForTimeout(400);
    await page.screenshot({ path: pngPath, fullPage: true, type: "png" });
    const h = await page.evaluate(() => document.body.scrollHeight);
    await browser.close();
    console.log("✓ 已生成 " + rel(pngPath) + "（" + kb(pngPath) + " KB，宽 1080，高约 " + h + " px）");
    if (kb(pngPath) > 10240) console.warn("⚠ 总长图超过 10MB，QQ 发送可能受限，建议减少照片。");
  } catch (e) {
    console.warn("⚠ 总长图生成失败：" + e.message);
  }
}