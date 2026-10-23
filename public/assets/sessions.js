/* Young Medical Engineers: Upcoming Sessions.
   One place for session data and how a session looks, used by the sessions page, the sign-up
   pages and the admin preview (window.YMESessions).
   Sessions come from the server (/api/sessions, added on /admin) and from /sessions.json (the
   backup list the Session Builder writes, for hosting without a server). Past sessions hide
   themselves after their day; the rest are listed in date order.
   On sessions.html it also draws the list: filters, months, and a Sign Up link per session. */
(function () {
  "use strict";

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var TYPES = ["Talk", "Hands-On Demo", "Design Challenge"];
  var PLURAL = { "Talk": "Talks", "Hands-On Demo": "Hands-On Demos", "Design Challenge": "Design Challenges" };
  var SLUG = { "Talk": "talk", "Hands-On Demo": "demo", "Design Challenge": "challenge" };
  var ICON = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">';
  var ICONS = {
    clock: ICON + '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    pin: ICON + '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>',
    screen: ICON + '<path d="M2 3h20v14H2z"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>',
    arrow: ICON + '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>'
  };

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }
  function line(icon, node) {
    var li = document.createElement("li");
    li.innerHTML = icon; /* fixed icon markup only; all session text goes in via textContent */
    li.appendChild(node);
    return li;
  }
  /* "13:30" -> {text:"1:30", ampm:"pm"} */
  function clock(t) {
    var h = parseInt(t.slice(0, 2), 10);
    return { text: ((h % 12) || 12) + ":" + t.slice(3, 5), ampm: h < 12 ? "am" : "pm" };
  }
  function dateParts(date) {
    var p = date.split("-"), y = +p[0], m = +p[1], d = +p[2];
    return { y: y, m: m, d: d, day: new Date(y, m - 1, d) };
  }
  /* "10:00 to 11:30 am" */
  function times(s) {
    var a = clock(s.start);
    if (!s.end) return a.text + " " + a.ampm;
    var b = clock(s.end);
    return a.ampm === b.ampm ? a.text + " to " + b.text + " " + b.ampm : a.text + " " + a.ampm + " to " + b.text + " " + b.ampm;
  }
  /* "Sat, Nov 14 · 10:00 to 11:30 am" */
  function when(s) {
    var p = dateParts(s.date);
    return DAYS[p.day.getDay()] + ", " + MONTHS[p.m - 1] + " " + p.d + " · " + times(s);
  }

  /* A clean copy of a session, or null if it is incomplete. */
  function normalize(s) {
    if (!s || !s.title || !/^\d{4}-\d{2}-\d{2}$/.test(s.date || "") || !/^\d{2}:\d{2}/.test(s.start || "")) return null;
    return {
      id: typeof s.id === "string" && /^[\w-]{1,64}$/.test(s.id) ? s.id.toLowerCase() : "",
      type: TYPES.indexOf(s.type) >= 0 ? s.type : "", title: String(s.title), date: s.date,
      start: s.start.slice(0, 5), end: s.end ? String(s.end).slice(0, 5) : "", online: Boolean(s.online),
      place: s.place || "", street: s.street || "", town: s.town || "", description: s.description || ""
    };
  }
  function isPast(s) { return new Date(s.date + "T23:59:59") < new Date(); }
  function signupUrl(s) { return "signup.html?session=" + encodeURIComponent(s.id); }
  function where(s) { return s.online ? "Online" : [s.place, s.street, s.town].filter(Boolean).join(", "); }
  function directionsUrl(s) {
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([s.street || s.place, s.town].filter(Boolean).join(" ")).replace(/%20/g, "+");
  }

  /* The details list (time, place or online) shared by cards and the sign-up pages. */
  function meta(s) {
    var list = el("ul", "session__meta");
    var time = el("time", null, when(s));
    time.setAttribute("datetime", s.date + "T" + s.start);
    list.appendChild(line(ICONS.clock, time));
    if (s.online) {
      list.appendChild(line(ICONS.screen, el("span", null, "Online · we'll email you the link")));
    } else {
      var place = el("span", null, where(s) + " ");
      var map = el("a", null, "Get directions");
      map.href = directionsUrl(s);
      map.target = "_blank";
      map.rel = "noopener";
      map.appendChild(el("span", "sr-only", " (opens in a new tab)"));
      place.appendChild(map);
      list.appendChild(line(ICONS.pin, place));
    }
    return list;
  }
  function dateBlock(s) {
    var p = dateParts(s.date);
    var date = el("p", "session__date");
    date.setAttribute("aria-hidden", "true");
    date.appendChild(el("span", "session__month", MONTHS[p.m - 1]));
    date.appendChild(el("span", "session__day", String(p.d)));
    date.appendChild(el("span", "session__weekday", DAYS[p.day.getDay()]));
    return date;
  }

  /* One session as a ticket: date, details, and a stub with the Sign Up link.
     options.heading: the title's tag (default h3); options.cta: false to leave out the stub. */
  function build(s, options) {
    s = normalize(s);
    if (!s) return null;
    options = options || {};
    var li = el("li", "session");
    li.setAttribute("data-date", s.date);
    li.appendChild(dateBlock(s));

    var body = el("div", "session__body");
    var tags = el("p", "session__tags");
    if (s.type) tags.appendChild(el("span", "session__type", s.type));
    tags.appendChild(el("span", "session__format", s.online ? "Online" : "In person"));
    body.appendChild(tags);
    body.appendChild(el(options.heading || "h3", "session__title", s.title));
    body.appendChild(meta(s));
    if (s.description) body.appendChild(el("p", "session__desc", s.description));
    li.appendChild(body);

    if (options.cta === false) li.classList.add("session--plain");
    else {
      var stub = el("div", "session__stub");
      var free = el("p", "session__free");
      free.appendChild(el("strong", null, "Free"));
      free.appendChild(el("span", null, "All students welcome"));
      stub.appendChild(free);
      var cta = el("a", "btn btn--primary session__cta", "Sign Up");
      cta.href = s.id ? signupUrl(s) : "signup.html?notify";
      cta.insertAdjacentHTML("beforeend", ICONS.arrow);
      cta.appendChild(el("span", "sr-only", " for " + s.title));
      stub.appendChild(cta);
      li.appendChild(stub);
    }
    return li;
  }

  /* Every upcoming session, from the server and from sessions.json, in date order. Each carries
     source: "server" or "file" (sign-ups for sessions.json ones can only go by email).
     Resolves to { sessions, ok }; ok is false only when neither source could be read. */
  function load() {
    if (!window.fetch || location.protocol === "file:") return Promise.resolve({ sessions: [], ok: false });
    var get = function (url) {
      return fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (data) { return (data && data.sessions) || []; })
        .catch(function () { return null; });
    };
    return Promise.all([get("/api/sessions"), get("/sessions.json")]).then(function (sources) {
      var byId = {}, all = [];
      sources.forEach(function (list, i) {
        (list || []).forEach(function (raw) {
          var s = normalize(raw);
          if (!s || isPast(s) || (s.id && byId[s.id])) return;
          if (s.id) byId[s.id] = true;
          s.source = i === 0 ? "server" : "file";
          all.push(s);
        });
      });
      all.sort(function (a, b) { var x = a.date + a.start, y = b.date + b.start; return x < y ? -1 : x > y ? 1 : 0; });
      return { sessions: all, ok: sources[0] !== null || sources[1] !== null };
    });
  }
  function find(id) {
    return load().then(function (result) {
      id = String(id || "").toLowerCase();
      return { ok: result.ok, session: result.sessions.filter(function (s) { return s.id === id; })[0] || null };
    });
  }

  window.YMESessions = {
    build: build, when: when, times: times, meta: meta, dateBlock: dateBlock, load: load, find: find,
    normalize: normalize, where: where, signupUrl: signupUrl, directionsUrl: directionsUrl, MONTHS_LONG: MONTHS_LONG
  };

  /* -- the home page: Coming Up, the next three sessions ---------------- */
  var next = document.getElementById("home-sessions");
  if (next) {
    load().then(function (result) {
      var soon = result.sessions.slice(0, 3);
      soon.forEach(function (s) { next.appendChild(build(s)); });
      next.hidden = document.getElementById("home-more").hidden = !soon.length;
      document.getElementById("home-none").hidden = soon.length > 0; /* nothing on (or not reachable): offer Get Notified */
      document.getElementById("coming-up").hidden = false;
    });
  }

  /* -- the Upcoming Sessions page --------------------------------------- */
  var board = document.getElementById("s-list");
  if (!board) return;
  var $ = function (id) { return document.getElementById(id); };
  var status = $("s-status"), found = $("s-found"), empty = $("s-empty"), filters = $("s-filters");
  var count = $("s-count"), none = $("s-nomatch"), summary = $("s-summary");
  var sessions = [];
  var chosen = { type: "", where: "" };

  /* filter choices live in the address (?type=talk&where=online), so a filtered list can be shared */
  (function () {
    var q = new URLSearchParams(location.search);
    TYPES.forEach(function (t) { if (q.get("type") === SLUG[t]) chosen.type = t; });
    if (q.get("where") === "online" || q.get("where") === "in-person") chosen.where = q.get("where");
  })();
  function remember() {
    var q = new URLSearchParams(location.search);
    q.delete("type"); q.delete("where");
    if (chosen.type) q.set("type", SLUG[chosen.type]);
    if (chosen.where) q.set("where", chosen.where);
    var search = q.toString();
    history.replaceState(null, "", location.pathname + (search ? "?" + search : "") + location.hash);
  }
  function matches(s) {
    if (chosen.type && s.type !== chosen.type) return false;
    if (chosen.where === "online" && !s.online) return false;
    if (chosen.where === "in-person" && s.online) return false;
    return true;
  }

  /* a row of chips (radio buttons) for one filter; left out when there is nothing to choose between */
  function chips(name, legend, options) {
    if (options.length < 3) return null; /* "All" plus at least two real choices */
    var set = el("fieldset", "chips");
    set.appendChild(el("legend", "sr-only", legend));
    options.forEach(function (o) {
      var label = el("label", "chip");
      var input = el("input");
      input.type = "radio";
      input.name = name;
      input.value = o.value;
      input.checked = chosen[name] === o.value;
      label.appendChild(input);
      label.appendChild(el("span", null, o.label));
      if (o.count !== undefined) label.appendChild(el("span", "chip__count", String(o.count)));
      set.appendChild(label);
    });
    return set;
  }
  function drawFilters() {
    filters.textContent = "";
    var typeOptions = [{ value: "", label: "All" }];
    TYPES.forEach(function (t) {
      var n = sessions.filter(function (s) { return s.type === t; }).length;
      if (n) typeOptions.push({ value: t, label: PLURAL[t], count: n });
    });
    var online = sessions.filter(function (s) { return s.online; }).length;
    var whereOptions = [{ value: "", label: "Anywhere" }];
    if (online && online < sessions.length) {
      whereOptions.push({ value: "in-person", label: "In person", count: sessions.length - online });
      whereOptions.push({ value: "online", label: "Online", count: online });
    }
    /* a filter saved in the address that no longer applies is dropped */
    if (typeOptions.length < 3 || !typeOptions.some(function (o) { return o.value === chosen.type; })) chosen.type = "";
    if (whereOptions.length < 3) chosen.where = "";
    [chips("type", "Type of session", typeOptions), chips("where", "Where", whereOptions)].forEach(function (set) {
      if (set) filters.appendChild(set);
    });
    filters.hidden = !filters.children.length;
  }

  function drawList() {
    board.textContent = "";
    var shown = sessions.filter(matches), month = null, list = null;
    shown.forEach(function (s) {
      var key = s.date.slice(0, 7);
      if (key !== month) {
        month = key;
        var p = dateParts(s.date);
        var group = el("section", "agenda__month");
        var label = el("h3", "agenda__label", MONTHS_LONG[p.m - 1] + " " + p.y);
        label.id = "month-" + key;
        group.setAttribute("aria-labelledby", label.id);
        group.appendChild(label);
        list = el("ol", "sessions");
        group.appendChild(list);
        board.appendChild(group);
      }
      list.appendChild(build(s, { heading: "h4" }));
    });
    none.hidden = shown.length > 0;
    count.textContent = shown.length === sessions.length
      ? sessions.length + (sessions.length === 1 ? " session" : " sessions")
      : "Showing " + shown.length + " of " + sessions.length;
  }

  filters.addEventListener("change", function (e) {
    if (!e.target.name) return;
    chosen[e.target.name] = e.target.value;
    remember();
    drawList();
  });
  $("s-showall").addEventListener("click", function () {
    chosen.type = chosen.where = "";
    remember();
    drawFilters();
    drawList();
  });

  function show() {
    status.hidden = false;
    status.textContent = "Loading sessions…";
    load().then(function (result) {
      sessions = result.sessions;
      if (!result.ok) {
        status.textContent = "We couldn't load sessions right now. Please try again in a moment.";
        status.appendChild(document.createTextNode(" "));
        var again = el("button", "linklike", "Try again");
        again.type = "button";
        again.addEventListener("click", show);
        status.appendChild(again);
        return;
      }
      status.hidden = true;
      found.hidden = !sessions.length;
      empty.hidden = sessions.length > 0;
      if (summary && sessions.length) {
        summary.textContent = sessions.length + (sessions.length === 1 ? " session" : " sessions") + " coming up · next on " + when(sessions[0]).split(" · ")[0];
        summary.hidden = false;
      }
      if (!sessions.length) return;
      drawFilters();
      drawList();
    });
  }
  show();
})();
