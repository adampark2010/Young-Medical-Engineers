/* Young Medical Engineers — shared behaviors.
   Navigation, transitions, panels, forms, charts, and small delights. */
(function () {
  "use strict";

  var ROOMS = ["index.html", "mission.html", "about.html", "programs.html",
               "impact.html", "board.html", "tutoring.html", "volunteer.html",
               "donate.html", "contact.html"];
  var HERE = document.body.getAttribute("data-room");

  /* -- pretty URLs on real hosting (GitHub Pages resolves /about to
        about.html); local file:// and http://localhost keep .html --- */
  var PRETTY = location.protocol === "https:";
  function prettyHref(href) {
    if (!PRETTY || !/\.html$/.test(href)) return href;
    return href === "index.html" ? "./" : href.replace(/\.html$/, "");
  }
  if (PRETTY && /\.html$/.test(location.pathname)) {
    history.replaceState(null, "", prettyHref(location.pathname.split("/").pop()));
  }

  /* -- dramatic entrance after the threshold -------------------- */
  if (sessionStorage.getItem("dramatic")) {
    sessionStorage.removeItem("dramatic");
    document.body.classList.add("dramatic");
  }

  function currentIndex() {
    var file = location.pathname.split("/").pop() || "index.html";
    if (!/\.html$/.test(file)) file += ".html";
    var i = ROOMS.indexOf(file);
    return i < 0 ? 0 : i;
  }

  /* -- soft page transitions -------------------------------------- */
  function travel(href) {
    document.body.classList.add("exit");
    window.setTimeout(function () { location.href = prettyHref(href); }, 340);
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (/^(https?:|mailto:|#)/.test(href) || a.target === "_blank") return;
    e.preventDefault();
    travel(href);
  });

  /* -- arrow keys move between pages (not on the landing) --------- */
  if (HERE !== "threshold") {
    document.addEventListener("keydown", function (e) {
      if (/(INPUT|TEXTAREA|SELECT)/.test(document.activeElement.tagName)) return;
      var i = currentIndex();
      if (e.key === "ArrowRight" && i < ROOMS.length - 1) travel(ROOMS[i + 1]);
      if (e.key === "ArrowLeft" && i > 0) travel(ROOMS[i - 1]);
    });
  }

  /* -- panel sliders (programs) ------------------------------------ */
  document.querySelectorAll(".panels").forEach(function (root) {
    var track = root.querySelector(".track");
    var panels = track.children.length;
    var dots = root.parentElement.querySelectorAll(".dot");
    var at = 0;

    function go(n) {
      at = (n + panels) % panels;
      track.style.transform = "translateX(" + (-100 * at) + "%)";
      dots.forEach(function (d, i) {
        d.setAttribute("aria-selected", i === at ? "true" : "false");
      });
      gearKick(120);
    }
    root.parentElement.querySelectorAll(".parrow").forEach(function (b) {
      b.addEventListener("click", function () {
        go(at + (b.dataset.dir === "next" ? 1 : -1));
      });
    });
    dots.forEach(function (d, i) {
      d.addEventListener("click", function () { go(i); });
    });
    go(0);
  });

  /* -- forms: required-complete gating + real delivery -------------- */
  document.querySelectorAll("form.js-form").forEach(function (f) {
    var btn = f.querySelector('button[type="submit"]');
    var err = f.querySelector(".form-err");
    var cta = btn ? btn.textContent : "Send";

    function gate() { if (btn) btn.disabled = !f.checkValidity(); }
    f.addEventListener("input", gate);
    f.addEventListener("change", gate);
    gate();

    f.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!f.checkValidity()) { f.reportValidity(); return; }
      btn.disabled = true;
      btn.textContent = "Sending…";
      if (err) err.classList.remove("show");

      var data = {};
      new FormData(f).forEach(function (v, k) { data[k] = v; });
      data._subject = "YME website — " + (f.dataset.subject || "form submission");
      data._template = "table";

      fetch("https://formsubmit.co/ajax/youngmedicalengineers@gmail.com", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data)
      }).then(function (r) {
        if (!r.ok) throw new Error("send failed");
        f.parentElement.classList.add("sent");
      }).catch(function () {
        btn.disabled = false;
        btn.textContent = cta;
        if (err) err.classList.add("show");
      });
    });
  });

  /* -- impact bar charts (reads window.IMPACT set on the page) ------- */
  if (window.IMPACT) {
    Object.keys(window.IMPACT).forEach(function (key) {
      var m = window.IMPACT[key];
      var host = document.querySelector('[data-metric="' + key + '"]');
      if (!host) return;

      var entries = Object.keys(m.values).map(function (k) { return [k, m.values[k]]; });
      var max = Math.max.apply(null, entries.map(function (e) { return e[1]; }));
      var headline = m.total === "last"
        ? entries[entries.length - 1][1]
        : entries.reduce(function (s, e) { return s + e[1]; }, 0);

      host.querySelector(".big").textContent =
        (m.prefix || "") + headline.toLocaleString() + (m.suffix || "");

      var chart = host.querySelector(".chart");
      var xl = host.querySelector(".xlabels");
      entries.forEach(function (e) {
        var bar = document.createElement("div");
        bar.className = "bar";
        if (m.color) bar.style.setProperty("--bar", m.color);
        var v = document.createElement("span");
        v.textContent = (m.prefix || "") + e[1].toLocaleString();
        bar.appendChild(v);
        chart.appendChild(bar);
        var lab = document.createElement("span");
        lab.textContent = e[0];
        xl.appendChild(lab);
        setTimeout(function () {
          bar.style.height = max > 0 ? Math.max(4, (e[1] / max) * 100) + "%" : "0%";
        }, 200);
      });
    });
  }

  /* -- reveal on scroll (board) --------------------------------------- */
  var revealed = document.querySelectorAll(".member, .reveal");
  if (revealed.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en, idx) {
        if (en.isIntersecting) {
          var el = en.target;
          setTimeout(function () { el.classList.add("in"); }, (el.dataset.stagger || 0) * 70);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.15 });
    revealed.forEach(function (el, i) {
      el.dataset.stagger = i % 6;
      io.observe(el);
    });
    // safety net: if the observer never fires (odd embeds), show everything
    setTimeout(function () {
      if (!document.querySelector(".member.in, .reveal.in")) {
        revealed.forEach(function (el) { el.classList.add("in"); });
      }
    }, 2000);
  } else {
    revealed.forEach(function (el) { el.classList.add("in"); });
  }

  /* -- gimmick: magnetic buttons --------------------------------------- */
  document.querySelectorAll(".btn").forEach(function (b) {
    b.addEventListener("mousemove", function (e) {
      var r = b.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2);
      var dy = e.clientY - (r.top + r.height / 2);
      b.style.transform = "translate(" + dx * 0.12 + "px," + dy * 0.22 + "px)";
    });
    b.addEventListener("mouseleave", function () { b.style.transform = ""; });
  });

  /* -- gimmick: slow gear + kicks (programs) ----------------------------- */
  var gear = document.querySelector(".gear");
  var gearDeg = 0, gearTarget = 0;
  function gearKick(amount) { gearTarget += amount || 0; }
  window.gearKick = gearKick;
  if (gear) {
    (function spin() {
      gearTarget += 0.04;
      gearDeg += (gearTarget - gearDeg) * 0.06;
      gear.style.transform = "rotate(" + gearDeg + "deg)";
      requestAnimationFrame(spin);
    })();
  }

  /* -- gimmick: watermark parallax ---------------------------------------- */
  var wm = document.querySelector(".watermark");
  if (wm) {
    window.addEventListener("mousemove", function (e) {
      var x = (e.clientX / window.innerWidth - 0.5) * -22;
      var y = (e.clientY / window.innerHeight - 0.5) * -16;
      wm.style.transform = "translateY(-50%) translate(" + x + "px," + y + "px)";
    });
  }
})();
