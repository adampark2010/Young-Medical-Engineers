/* Our Updates: YME's own news, added on /admin (or, until any are, read from updates.json), shown in
   full as cards, newest first.
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

  /* a source that is slow or missing gives up after 8 seconds, so the other one still shows */
  function load(url) {
    var stop = window.AbortController ? new AbortController() : null;
    var timer = stop && setTimeout(function () { stop.abort(); }, 8000);
    return fetch(url, { headers: { Accept: "application/json" }, cache: "no-cache", signal: stop ? stop.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .catch(function () { return null; })
      .then(function (data) { clearTimeout(timer); return data; });
  }

  /* Updates added on /admin (the database) are used when there are any; otherwise updates.json.
     In the database the short label above the title is "label"; in updates.json it is "kind". */
  Promise.all([load("api/posts?page=updates"), load("updates.json")])
    .then(function (sources) {
      var posts = sources[0] && Array.isArray(sources[0].posts) ? sources[0].posts : [];
      var file = sources[1];
      if (!posts.length && !file) throw new Error("no updates");
      var updates = posts.length
        ? posts.map(function (p) { var d = p.data || {}; return { id: "u-" + String(p.id).slice(0, 8), kind: d.label, title: d.title, date: d.date, body: d.body, image: d.image, alt: d.alt, credit: d.credit, links: d.links }; })
        : (Array.isArray(file.updates) ? file.updates : []);
      updates = updates.filter(function (u) { return u && u.title; });
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
