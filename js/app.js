// ============================================================
// js/app.js —— 渲染引擎（index.html 预览与 dist 成品共用）
// 只读 window.JX_DATA 渲染，不在本文件里塞数据
// ============================================================
(function () {
  "use strict";
  var D = (typeof window !== "undefined" && window.JX_DATA) || null;
  var view = document.getElementById("view");
  var foot = document.getElementById("jxFoot");

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function fmtDate(ymd) {
    if (!ymd) return "";
    var m = String(ymd).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    return m ? m[1] + "年" + (+m[2]) + "月" + (+m[3]) + "日" : String(ymd);
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  function h(tag, cls, html) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html != null) el.innerHTML = html;
    return el;
  }

  function chip(text, cls) {
    return '<span class="chip ' + (cls || "") + '">' + esc(text) + "</span>";
  }

  function photosBlock(photos, gridCls) {
    if (!photos || !photos.length) return "";
    var one = photos.length === 1 ? " single" : "";
    var figs = photos.map(function (p) {
      var cap = p.caption ? "<figcaption>" + esc(p.caption) + "</figcaption>" : "";
      return '<figure><img src="' + esc(p.file) + '" alt="' + esc(p.caption || "") + '" loading="lazy">' + cap + "</figure>";
    }).join("");
    return '<div class="day-photos' + one + '">' + figs + "</div>";
  }

  function renderCover(m) {
    var logo = m.logo
      ? '<div class="cover-top"><img class="cover-logo" src="' + esc(m.logo) + '" alt="校徽">' +
        '<div class="cover-sch">"+esc(m.school)+"<b>WHUT</b></div></div>'
      : "";
    var rangeChip;
    if (m.start && m.end) rangeChip = chip(fmtDate(m.start) + " — " + fmtDate(m.end));
    else if (D.days && D.days.length) rangeChip = chip("第 1 天 — 第 " + D.days.length + " 天");
    else rangeChip = chip("军训 · 进行时");
    var countChip = chip("共 <b>" + (D.days ? D.days.length : 0) + "</b> 天记录");
    var whoChip = chip("记录人 " + m.author + " · " + m.role);
    return '<section class="cover"><div class="cover-inner">' +
      logo +
      '<h1 class="cover-title">' + esc(m.title) + "</h1>" +
      '<div class="cover-rule"></div>' +
      '<div class="cover-sub">' + esc(m.college) + " · " + esc(m.cls) + "</div>" +
      '<div class="cover-meta">' + rangeChip + countChip + whoChip + "</div>" +
      '<span class="cover-star s1">★</span><span class="cover-star s2">★</span>' +
      "</div></section>";
  }

  function renderDays(days) {
    if (!days || !days.length) {
      return '<section class="card empty-day"><span class="star">★</span>' +
        "<p><b>时间流待开启</b></p>" +
        "<p>军训开始后，每天把今天发生的事告诉 Codex，这里就会长出一条条属于 2605 的记录。</p></section>";
    }
    var out = '<div class="timeline-head">DAY BY DAY · 每天一条，都是 2605 的集体记忆</div>';
    days.forEach(function (d, i) {
      var no = d.day || (i + 1);
      var chips = [];
      if (d.date) chips.push(chip(fmtDate(d.date)));
      if (d.weather) chips.push(chip(d.weather, "weather"));
      (d.tags || []).forEach(function (t) { chips.push(chip(t, "tag")); });
      var paras = (d.paragraphs || []).map(function (p) {
        return "<p class=\"day-para\">" + esc(p) + "</p>";
      }).join("");
      var quote = d.quote ? '<div class="day-quote">' + esc(d.quote) + "</div>" : "";
      out +=
        '<section class="card day" data-no="' + esc(no) + '">' +
        '<div class="day-top"><span class="day-no"><i>★</i>第 ' + esc(no) + " 天</span>" + chips.join("") + "</div>" +
        (d.title ? '<h3 class="day-title">' + esc(d.title) + "</h3>" : "") +
        paras + quote + photosBlock(d.photos) +
        "</section>";
    });
    return out;
  }

  function renderGallery(list) {
    if (!list || !list.length) return "";
    var figs = list.map(function (g) {
      var cap = g.caption ? "<figcaption>" + esc(g.caption) + "</figcaption>" : "";
      return '<figure><img src="' + esc(g.file) + '" alt="' + esc(g.caption || "") + '" loading="lazy">' + cap + "</figure>";
    }).join("");
    return '<section class="card gallery"><h2 class="section-label">光影留念 · GALLERY</h2>' +
      '<div class="gallery-grid">' + figs + "</div></section>";
  }

  function renderClosing(m) {
    return '<section class="card closing"><h2 class="section-label">结营感言 · TO 2605</h2>' +
      '<p class="closing-text">' + esc(D.closing || "") + "</p>" +
      '<div class="sign">—— <b>' + esc(m.author) + "</b> · " + esc(m.cls) + "</div></section>";
  }

  function renderFooter(m) {
    var n = D.days ? D.days.length : 0;
    var parts = [];
    parts.push(m.school + " · " + m.college + " · " + m.cls);
    if (n) parts.push("共 " + n + " 天记录");
    parts.push("最近整理 " + (m.buildAt || ""));
    foot.innerHTML = parts.join('<span class="sep">|</span>') +
      '<br><span style="opacity:.75">本纪念册由 ' + esc(m.author) + "（" + esc(m.role) + "）整理 · 本地文件，未联网上传</span>";
  }

  function bindLightbox(root) {
    root.addEventListener("click", function (ev) {
      var t = ev.target;
      if (t && t.tagName === "IMG" && t.closest && (t.closest(".day-photos") || t.closest(".gallery-grid"))) {
        var lb = h("div", "lightbox");
        var img = h("img");
        img.src = t.currentSrc || t.src;
        img.alt = t.alt || "";
        lb.appendChild(img);
        document.body.appendChild(lb);
        var close = function () { if (lb.parentNode) lb.parentNode.removeChild(lb); };
        lb.addEventListener("click", close);
        document.addEventListener("keydown", function onKey(e) {
          if (e.key === "Escape") { close(); document.removeEventListener("keydown", onKey); }
        });
      }
    });
  }

  if (!D) {
    view.innerHTML = '<section class="card empty-day"><span class="star">★</span><p><b>未找到数据</b></p><p>请确认 js/data.js 已存在且定义了 window.JX_DATA。</p></section>';
    return;
  }
  var m = D.meta || {};
  if (m.title) document.title = m.title + " · " + (m.school || "");
  view.innerHTML =
    renderCover(m) +
    (D.intro ? '<section class="card intro"><h2 class="section-label">开营寄语</h2><p class="intro-text">' + esc(D.intro) + "</p></section>" : "") +
    renderDays(D.days) +
    renderGallery(D.gallery) +
    renderClosing(m);
  renderFooter(m);
  bindLightbox(view);
})();