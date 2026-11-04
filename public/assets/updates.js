/* Our Updates: YME's own news, read from updates.json and shown in full as cards, newest first.
   Each update has its own address (updates.html#its-id) for sharing. Everything is written in as
   text, never as HTML, and links may only go to this site or to https addresses. */
(function () {
  "use strict";
  var list = document.getElementById("updates-list");
  if (!list) return;
  var status = document.getElementById("updates-status");

  var MONTHS = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];
  function when(iso) {
    var p = String(iso || "").split("-");
    if (p.length !== 3) return "";
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return isNaN(d) ? "" : d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }
  function safeHref(href) {
    href = String(href || "");
    return /^https:\/\//i.test(href) || /^[a-z0-9][\w\-./#?=&%]*$/i.test(href) ? href : null;
  }

  /* one update as a card, laid out like the In the News cards (news.js) */
  function post(u) {
    var li = el("li", "newsitem");
    if (/^[a-z0-9-]+$/.test(u.id || "")) li.id = u.id;
    if (u.image && safeHref(u.image)) {
      var fig = el("figure", "newsitem__media");
      var img = el("img");
      img.src = u.image;
      img.alt = u.alt || "";
      img.loading = "lazy";
      img.decoding = "async";
      fig.appendChild(img);
      if (u.credit) fig.appendChild(el("figcaption", null, u.credit));
      li.appendChild(fig);
    }
    var meta = el("p", "newsitem__meta");
    if (u.kind) meta.appendChild(el("span", "newsitem__source", u.kind));
    if (when(u.date)) {
      var t = el("time", null, when(u.date));
      t.dateTime = u.date;
      meta.appendChild(t);
    }
    li.appendChild(meta);
    li.appendChild(el("h3", null, u.title));
    (Array.isArray(u.body) ? u.body : [u.body]).forEach(function (para) { if (para) li.appendChild(el("p", "newsitem__note", para)); });
    var links = (Array.isArray(u.links) ? u.links : []).filter(function (l) { return l && l.text && safeHref(l.href); });
    if (links.length) {
      var row = el("p", "newsitem__links");
      links.forEach(function (l) {
        var a = el("a", null, l.text);
        a.href = safeHref(l.href);
        if (/^https:/i.test(l.href)) {
          a.target = "_blank";
          a.rel = "noopener";
          a.appendChild(el("span", "sr-only", " (opens in a new tab)"));
        }
        row.appendChild(a);
      });
      li.appendChild(row);
    }
    return li;
  }

  fetch("updates.json", { headers: { Accept: "application/json" }, cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (data) {
      var updates = (data && Array.isArray(data.updates) ? data.updates : []).filter(function (u) { return u && u.title; });
      updates.sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
      if (!updates.length) { status.textContent = "Our first updates are on their way. Check back soon."; return; }
      updates.forEach(function (u) { list.appendChild(post(u)); });
      status.hidden = true;
      list.hidden = false;
      /* a shared link to one update lands on it once the list is drawn */
      if (location.hash.length > 1) {
        var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (target) target.scrollIntoView();
      }
    })
    .catch(function () { status.textContent = "We could not load our updates just now. Try again shortly."; });
})();
