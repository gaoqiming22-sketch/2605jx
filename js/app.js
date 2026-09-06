// ============================================================
// js/app.js —— 渲染引擎（index 预览与 dist 成品共用）
// 只读 window.JX_DATA 渲染；不要在文件里塞数据
// 普通模式：顶栏五模块页签切换
// 长图模式（body.jx-long）：隐藏页签，纵向全展开成“纪念册”
// ============================================================
(function () {
  "use strict";
  var D = (typeof window !== "undefined" && window.JX_DATA) || null;
  var m = D && D.meta ? D.meta : {};
  var isLong = document.body && document.body.classList.contains("jx-long");
  var view = document.getElementById("view");
  var brandEl = document.getElementById("jxBrand");
  var tabsEl = document.getElementById("jxTabs");
  var foot = document.getElementById("jxFoot");
  if (!view) return;

  var TABS = [
    { id: "overview", label: "总览" },
    { id: "daily",    label: "每日记录" },
    { id: "quotes",   label: "语录·趣事" },
    { id: "photos",   label: "照片墙" },
    { id: "plan",     label: "安排·通知" }
  ];

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function fmtDate(ymd) {
    if (!ymd) return "";
    var mm = String(ymd).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    return mm ? mm[1] + "年" + (+mm[2]) + "月" + (+mm[3]) + "日" : String(ymd);
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function txt(x) { return typeof x === "string" ? x : (x && x.text) || ""; }
  function by(x) { return (typeof x === "object" && x && x.by) ? x.by : ""; }
  function dayNo(d, i) { return d.day || (i + 1); }
  function dateLabel(d) {
    var s = "第 " + dayNo(d, 0) + " 天";
    if (d.date) s += " · " + fmtDate(d.date);
    return s;
  }
  function chip(text, cls) {
    return '<span class="chip ' + (cls || "") + '">' + esc(text) + "</span>";
  }

  /* ---------- 汇总数据 ---------- */
  function allQuotes() {
    var out = [];
    (D.days || []).forEach(function (d, i) {
      (d.quotes || []).forEach(function (q) {
        out.push({ day: dayNo(d, i), date: d.date, text: txt(q), by: by(q) });
      });
    });
    return out;
  }
  function allFun() {
    var out = [];
    (D.days || []).forEach(function (d, i) {
      (d.fun || []).forEach(function (f) {
        out.push({ day: dayNo(d, i), date: d.date, text: txt(f) });
      });
    });
    return out;
  }
  function allPhotos() {
    var out = [];
    (D.days || []).forEach(function (d, i) {
      (d.photos || []).forEach(function (p) {
        out.push({ file: p.file, caption: p.caption || "", day: dayNo(d, i), date: d.date });
      });
    });
    (D.gallery || []).forEach(function (g) {
      out.push({ file: g.file, caption: g.caption || "", day: null, date: null });
    });
    return out;
  }
  function rangeText() {
    if (m.start && m.end) return fmtDate(m.start) + " — " + fmtDate(m.end);
    var n = (D.days || []).length;
    return n ? "第 1 天 — 第 " + n + " 天" : "军训 · 进行时";
  }

  /* ---------- 小组件 ---------- */
  function heroHtml() {
    var logo = m.logo
      ? '<div class="hero-top"><img class="hero-logo" src="' + esc(m.logo) + '" alt="校徽">' +
        '<div class="hero-sch">' + esc(m.school) + "<b>WHUT</b></div></div>" : "";
    var meta = "";
    meta += '<span>时间：<b>' + esc(rangeText()) + "</b></span>";
    meta += "<span>共 <b>" + (D.days || []).length + "</b> 天记录</span>";
    meta += "<span>记录人 " + esc(m.author) + " · " + esc(m.role) + "</span>";
    if (m.college && m.cls) meta += "<span>" + esc(m.college) + " · " + esc(m.cls) + "</span>";
    return '<section class="hero"><div class="hero-inner">' + logo +
      '<h1 class="hero-title">' + esc(m.title) + "</h1>" +
      '<div class="hero-rule"></div>' +
      '<div class="hero-sub">' + esc((D.overview && D.overview.team) || m.college + " · " + m.cls) + "</div>" +
      '<div class="hero-meta">' + meta + "</div>" +
      '<span class="hero-star s1">★</span><span class="hero-star s2">★</span>' +
      "</div></section>";
  }
  function emptyTip(text) {
    return '<div class="empty-tip"><span class="star">★</span><p>' + text + "</p></div>";
  }
  function cardOpen(label, cls) {
    return '<section class="card ' + (cls || "") + '"><h2 class="section-label">' + esc(label) + "</h2>";
  }

  /* ---------- 模块：总览 ---------- */
  function buildOverview() {
    var ov = D.overview || {};
    var days = D.days || [];
    var qs = allQuotes(), fs = allFun(), ps = allPhotos();
    var stats =
      '<div class="stat-grid">' +
      stat("记录天数", (days.length || 0)) +
      stat("金句语录", qs.length) +
      stat("趣事名场面", fs.length) +
      stat("照片", ps.length) +
      "</div>";
    var html = heroHtml() + stats;
    if (ov.slogan) html += cardOpen("开营寄语") + '<p class="ov-slogan">' + esc(ov.slogan) + "</p>" +
      (ov.place || ov.note ? '<p class="ov-note">' + esc([ov.place && ("训练场地：" + ov.place), ov.note].filter(Boolean).join(" · ")) + "</p>" : "") + "</section>";
    if (days.length) {
      var last = days[days.length - 1];
      html += cardOpen("最近一天") + '<div class="latest-day">' + esc(dateLabel(last)) + "</div>" +
        dayCard(last, days.length - 1, true) +
        '<div class="latest-more">更多内容见「每日记录」页签</div></section>';
    } else {
      html += emptyTip("军训开始后，每天把当天发生的事告诉我，这里会长出<b>第 1 天、第 2 天……</b>的记录");
    }
    if (D.closing) {
      html += '<section class="card closing"><h2 class="section-label">结营感言 · TO 2605</h2>' +
        '<p class="closing-text">' + esc(D.closing) + "</p>" +
        '<div class="sign">—— <b>' + esc(m.author) + "</b> · " + esc(m.cls) + "</div></section>";
    }
    return html;
  }
  function stat(label, n) {
    return '<div class="stat"><b>' + n + "</b><span>" + esc(label) + "</span></div>";
  }

  /* ---------- 模块：每日记录 ---------- */
  function dayCard(d, i, brief) {
    var no = dayNo(d, i);
    var chipsArr = [];
    if (d.date) chipsArr.push(chip(fmtDate(d.date)));
    if (d.weather) chipsArr.push(chip(d.weather, "weather"));
    (d.tags || []).forEach(function (t) { chipsArr.push(chip(t, "tag")); });
    var paras = (d.paragraphs || []).map(function (p) {
      return '<p class="day-para">' + esc(p) + "</p>";
    }).join("");
    var quotes = (d.quotes || []).map(function (q) {
      return '<div class="day-quote">' + esc(txt(q)) + (by(q) ? "<span style=\"display:block;text-align:right;font-size:12px;opacity:.7;margin-top:4px\">—— " + esc(by(q)) + "</span>" : "") + "</div>";
    }).join("");
    var fun = (d.fun || []).length
      ? '<ul class="day-fun">' + (d.fun || []).map(function (f) {
          return "<li>" + esc(txt(f)) + "</li>";
        }).join("") + "</ul>" : "";
    var photos = photosBlock(d.photos);
    if (brief) {
      return '<div class="latest-title">' + (d.title ? esc(d.title) : "") + "</div>" + paras;
    }
    return '<section class="card day" data-no="' + esc(no) + '">' +
      '<div class="day-top"><span class="day-no"><i>★</i>第 ' + esc(no) + " 天</span>" + chipsArr.join("") + "</div>" +
      (d.title ? '<h3 class="day-title">' + esc(d.title) + "</h3>" : "") +
      paras + quotes + fun + photos +
      "</section>";
  }
  function buildDaily() {
    var days = D.days || [];
    if (!days.length) {
      return emptyTip("时间流待开启<br>每天训练结束，把今天发生的事告诉 Codex，<b>这里就会长出一条条记录</b>。");
    }
    var html = '<div class="timeline-head">DAY BY DAY · 每天一条，都是 2605 的集体记忆</div>';
    days.forEach(function (d, i) { html += dayCard(d, i); });
    return html;
  }

  /* ---------- 模块：语录·趣事 ---------- */
  function qfList(items, kind) {
    if (!items.length) return "";
    return '<div class="qf-grid">' + items.map(function (it) {
      return '<div class="qf-card ' + kind + '"><p class="qf-text">' + esc(it.text) + "</p>" +
        '<div class="qf-src">第 ' + esc(it.day) + " 天" + (it.date ? " · " + fmtDate(it.date) : "") +
        (it.by ? " · " + esc(it.by) : "") + "</div></div>";
    }).join("") + "</div>";
  }
  function buildQuotes() {
    var qs = allQuotes(), fs = allFun();
    if (!qs.length && !fs.length) {
      return emptyTip("语录和金句会从每天的记录里自动收集。<br>记下<b>教官语录</b>或<b>趣事名场面</b>，它们就会出现在这里。");
    }
    var html = "";
    if (qs.length) html += cardOpen("语录 · 教官与我们的金句") + qfList(qs, "quote") + "</section>";
    else html += emptyTip("还没有语录，之后会出现在这里");
    if (fs.length) html += cardOpen("趣事 · 名场面") + qfList(fs, "fun") + "</section>";
    else html += emptyTip("还没有趣事记录");
    return html;
  }

  /* ---------- 模块：照片墙 ---------- */
  function buildPhotos() {
    var ps = allPhotos();
    if (!ps.length) {
      return emptyTip("照片会从每天的记录里自动汇总。<br>把照片放进 <b>assets/photos/</b> 并告诉我，就能在这里拼成照片墙。");
    }
    return cardOpen("光影留念 · 2605") +
      '<div class="ph-grid">' + ps.map(function (p) {
        var cap = esc(p.caption);
        var src = p.day ? "第 " + p.day + " 天" + (p.date ? " · " + fmtDate(p.date) : "") : "纪念合影";
        return "<figure><img src=\"" + esc(p.file) + "\" alt=\"" + cap + "\" loading=\"lazy\">" +
          "<figcaption><b>" + esc(src) + "</b>" + (p.caption ? " · " + cap : "") + "</figcaption></figure>";
      }).join("") + "</div></section>";
  }

  /* ---------- 模块：安排·通知 ---------- */
  function buildPlan() {
    var sched = D.schedule || [], notes = D.notices || [];
    if (!sched.length && !notes.length) {
      return emptyTip("这里放<b>作息/阶段安排</b>和<b>需要转达的通知</b>。<br>把教官/辅导员的通知告诉我，就能记在这里。");
    }
    var html = "";
    if (sched.length) {
      html += cardOpen("安排 · 作息与阶段") + '<ul class="sched">' + sched.map(function (s) {
        var items = (s.items || []).map(function (it) { return "<div>· " + esc(it) + "</div>"; }).join("");
        return "<li><div class=\"sched-period\">" + esc(s.period || "") + "</div><div class=\"sched-items\">" + items + "</div></li>";
      }).join("") + "</ul></section>";
    } else html += emptyTip("暂时还没有安排条目");
    if (notes.length) {
      html += cardOpen("通知 · 需要大家知道的事") + notes.map(function (n) {
        var uncertain = /待核实|待确认|以.*为准/.test(n.text || "") ? ' class="notice-src uncertain"' : ' class="notice-src"';
        return '<div class="notice">' +
          (n.date ? '<div class="notice-date">' + fmtDate(n.date) + "</div>" : "") +
          '<div class="notice-main"><div class="notice-title">' + esc(n.title || "通知") + "</div>" +
          '<div class="notice-text">' + esc(n.text || "") + "</div>" +
          (n.src ? "<span" + uncertain + ">" + esc(n.src) + "</span>" : "") +
          "</div></div>";
      }).join("") + "</section>";
    } else html += emptyTip("暂时还没有通知");
    return html;
  }

  /* ---------- 照片区（每日卡内） ---------- */
  function photosBlock(photos) {
    if (!photos || !photos.length) return "";
    var one = photos.length === 1 ? " single" : "";
    var figs = photos.map(function (p) {
      var cap = p.caption ? "<figcaption>" + esc(p.caption) + "</figcaption>" : "";
      return '<figure><img src="' + esc(p.file) + '" alt="' + esc(p.caption || "") + '" loading="lazy">' + cap + "</figure>";
    }).join("");
    return '<div class="day-photos' + one + '">' + figs + "</div>";
  }

  /* ---------- 页签导航 ---------- */
  function fillHeader() {
    if (!brandEl) return;
    brandEl.innerHTML =
      (m.logo ? '<img src="' + esc(m.logo) + '" alt="校徽">' : "") +
      '<div><div class="hd-title">' + esc(m.title) + "</div>" +
      '<div class="hd-sub">' + esc((m.school || "") + " · " + (m.college || "") + " · " + (m.cls || "")) + "</div></div>";
    if (!tabsEl) return;
    TABS.forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "jx-tab";
      b.setAttribute("data-tab", t.id);
      b.textContent = t.label;
      b.addEventListener("click", function () { show(t.id); });
      tabsEl.appendChild(b);
    });
  }
  function setTabActive(id) {
    if (!tabsEl) return;
    var btns = tabsEl.querySelectorAll(".jx-tab");
    for (var k = 0; k < btns.length; k++) {
      btns[k].classList.toggle("on", btns[k].getAttribute("data-tab") === id);
    }
  }
  function show(id) {
    var html = "";
    if (id === "overview") html = buildOverview();
    else if (id === "daily") html = buildDaily();
    else if (id === "quotes") html = buildQuotes();
    else if (id === "photos") html = buildPhotos();
    else if (id === "plan") html = buildPlan();
    setTabActive(id);
    view.innerHTML = html;
    bindLightbox(view);
    if (window.scrollTo) window.scrollTo(0, 0);
  }

  /* ---------- 长图模式：整册纵向展开 ---------- */
  function buildLong() {
    var days = D.days || [];
    var html = heroHtml();
    var ov = D.overview || {};
    if (ov.slogan) html += cardOpen("开营寄语") + '<p class="ov-slogan">' + esc(ov.slogan) + "</p></section>";
    html += '<div class="timeline-head">DAY BY DAY · 每天一条，都是 2605 的集体记忆</div>';
    if (!days.length) html += emptyTip("时间流待开启");
    days.forEach(function (d, i) { html += dayCard(d, i); });
    var ps = allPhotos();
    if (ps.length) {
      html += cardOpen("光影留念 · 2605") + '<div class="ph-grid">' + ps.map(function (p) {
        var cap = esc(p.caption);
        var src = p.day ? "第 " + p.day + " 天" : "纪念合影";
        return "<figure><img src=\"" + esc(p.file) + "\" alt=\"" + cap + "\"><figcaption><b>" + esc(src) + "</b>" + (p.caption ? " · " + cap : "") + "</figcaption></figure>";
      }).join("") + "</div></section>";
    }
    if (D.closing) {
      html += '<section class="card closing"><h2 class="section-label">结营感言 · TO 2605</h2>' +
        '<p class="closing-text">' + esc(D.closing) + "</p>" +
        '<div class="sign">—— <b>' + esc(m.author) + "</b> · " + esc(m.cls) + "</div></section>";
    }
    return html;
  }

  /* ---------- 页脚 ---------- */
  function renderFooter() {
    if (!foot) return;
    var days = D.days || [];
    var qs = allQuotes().length, fs = allFun().length, ps = allPhotos().length;
    var parts = [m.school + " · " + m.college + " · " + m.cls];
    parts.push("记录 " + days.length + " 天");
    parts.push("语录 " + qs + " · 趣事 " + fs + " · 照片 " + ps);
    parts.push("整理 " + (m.buildAt || ""));
    foot.innerHTML = parts.join('<span class="sep">|</span>') +
      "<br><span style=\"opacity:.8\">想更新？直接对 Codex 说：记录军训：今天…… ｜ 本页为本地文件，未联网上传</span>";
  }

  /* ---------- 灯箱 ---------- */
  function bindLightbox(root) {
    root.addEventListener("click", function (ev) {
      var t = ev.target;
      if (t && t.tagName === "IMG" && t.closest && (t.closest(".day-photos") || t.closest(".ph-grid"))) {
        var lb = document.createElement("div");
        lb.className = "lightbox";
        var img = document.createElement("img");
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

  /* ---------- 启动 ---------- */
  if (!D) {
    view.innerHTML = '<div class="empty-tip"><span class="star">★</span><p><b>未找到数据</b></p><p>请确认 js/data.js 已定义 window.JX_DATA。</p></div>';
    return;
  }
  if (m.title) document.title = m.title + " · " + (m.school || "");
  renderFooter();
  if (isLong) {
    view.innerHTML = buildLong();
    bindLightbox(view);
  } else {
    fillHeader();
    show("overview");
  }
})();