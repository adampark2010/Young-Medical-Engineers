/* Latest News: links out to other people's reporting, read from news.json.
   Kept as data rather than hand-written HTML so the list is easy to update.
   Search indexing does not matter here: these pages are not ours to rank. */
(function () {
  "use strict";
  var lists = {
    articles: document.getElementById("news-list"),
    podcasts: document.getElementById("pod-list")
  };
  if (!lists.articles && !lists.podcasts) return;
  var status = document.getElementById("news-status");

  var MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];

  function when(iso) {
    var p = String(iso || "").split("-");
    if (p.length !== 3) return "";
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    if (isNaN(d)) return "";
    return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
  }

  function card(item) {
    var li = document.createElement("li");
    li.className = "newsitem";

    /* optional: an image the org has the right to use, or the source's own
       og:image. Cards without one simply run as text. */
    if (item.image) {
      var fig = document.createElement("figure");
      fig.className = "newsitem__media";
      var im = document.createElement("img");
      im.src = item.image;
      im.alt = "";
      im.loading = "lazy";
      im.decoding = "async";
      fig.appendChild(im);
      if (item.credit) {
        var cap = document.createElement("figcaption");
        cap.textContent = item.credit;
        fig.appendChild(cap);
      }
      li.appendChild(fig);
    }

    var meta = document.createElement("p");
    meta.className = "newsitem__meta";
    var src = document.createElement("span");
    src.className = "newsitem__source";
    src.textContent = item.source || "";
    meta.appendChild(src);
    if (item.date) {
      var t = document.createElement("time");
      t.dateTime = item.date;
      t.textContent = when(item.date);
      meta.appendChild(t);
    }

    var h = document.createElement("h3");
    var a = document.createElement("a");
    a.href = item.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = item.title || item.url;
    var sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = " (opens in a new tab)";
    a.appendChild(sr);
    h.appendChild(a);

    li.appendChild(meta);
    li.appendChild(h);
    if (item.note) {
      var p = document.createElement("p");
      p.className = "newsitem__note";
      p.textContent = item.note;
      li.appendChild(p);
    }
    return li;
  }

  fetch("news.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error("news.json " + r.status); return r.json(); })
    .then(function (data) {
      var any = false;
      Object.keys(lists).forEach(function (key) {
        var el = lists[key];
        var items = (data && data[key]) || [];
        if (!el || !items.length) return;
        items.forEach(function (i) { if (i && i.url) el.appendChild(card(i)); });
        el.hidden = false;
        var section = el.closest("section");
        if (section) section.hidden = false;
        any = true;
      });
      if (!any && status) status.hidden = false;
    })
    .catch(function () { if (status) status.hidden = false; });
})();
