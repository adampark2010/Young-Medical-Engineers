/* Young Medical Engineers: session manager (/admin).
   Sessions tab: adds sessions through /api/sessions (they go live at once), lists them, and
   deletes the ticked ones. Sign-Ups tab: everyone who signed up on the website (/api/signups),
   grouped by session, with copy emails, a CSV download, and delete. Deleting always asks for the
   separate delete password, which is never stored. The browser sends the admin sign-in with each
   request. */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var S = window.YMESessions;
  var form = $("a-form"), preview = $("a-preview"), msg = $("a-msg"), save = $("a-save"), status = $("a-status");
  var placeFields = $("a-place-fields");
  var pendingId = null; /* kept until a save succeeds, so a retry never adds the session twice */
  var saving = false;
  var justSaved = false; /* after a save the empty form needs no "Still needed" warning */

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join("");
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
  }
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }
  function isPast(date) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var p = date.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]) < today;
  }
  function value(id) { return $(id).value.trim(); }
  function entry() {
    var online = form.querySelector('input[name="where"]:checked').value === "online";
    return {
      type: $("a-type").value, title: value("a-title"), date: $("a-date").value, start: $("a-start").value,
      end: $("a-end").value || null, online: online, place: online ? "" : value("a-place"),
      street: online ? "" : value("a-street"), town: online ? "" : value("a-town"), description: value("a-desc")
    };
  }
  function problem(d) {
    var missing = [];
    if (!d.type) missing.push("type");
    if (!d.title) missing.push("title");
    if (!d.date) missing.push("date");
    if (!d.start) missing.push("start time");
    if (!d.online && !d.place && !d.street) missing.push("place or address");
    if (missing.length) return "Still needed: " + missing.join(", ") + ".";
    if (d.end && d.end <= d.start) return "The end time is before the start time.";
    return "";
  }

  function update() {
    var d = entry(), issue = problem(d);
    placeFields.hidden = d.online;
    preview.textContent = "";
    if (issue) {
      preview.appendChild(el("li", "builder__empty", "Your session will appear here."));
      msg.textContent = justSaved ? "" : issue;
      save.disabled = true;
      return;
    }
    preview.appendChild(S.build(d));
    msg.textContent = isPast(d.date) ? "This date has passed, so the session would not show on the website." : "";
    save.disabled = saving;
  }

  function send(url, method, body) {
    return fetch(url, {
      method: method, credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) throw new Error(data.error || "Something went wrong (" + r.status + "). Please try again.");
        return data;
      });
    });
  }
  function get(url, fallback) {
    return fetch(url, { credentials: "same-origin", headers: { Accept: "application/json" }, cache: "no-store" })
      .then(function (r) { return r.json().then(function (data) { if (!r.ok) throw new Error(data.error || fallback); return data; }); });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var d = entry(), issue = problem(d);
    if (issue || saving) { msg.textContent = issue; return; }
    saving = true;
    save.disabled = true;
    save.setAttribute("aria-busy", "true");
    status.textContent = "Saving…";
    pendingId = pendingId || uuid();
    d.id = pendingId;
    send("/api/sessions", "POST", d).then(function () {
      pendingId = null;
      form.reset();
      justSaved = true;
      status.textContent = "Added. It's live on Upcoming Sessions now.";
      loadSessions();
    }).catch(function (err) {
      status.textContent = err.message;
    }).then(function () {
      saving = false;
      save.removeAttribute("aria-busy");
      update();
    });
  });
  form.addEventListener("input", function () { pendingId = null; justSaved = false; status.textContent = ""; update(); });
  form.addEventListener("change", function () { justSaved = false; update(); });

  /* -- ticking rows and deleting them (both tabs) ---------------------- */
  /* ids: the page's element ids for this list's controls. noun: ["session", "sessions"].
     warning: the sentence after "Delete 2 sessions?". gone(n): optional words after "Deleted 2 sessions." */
  function picker(o) {
    var list = $(o.ids.list), tools = $(o.ids.tools), all = $(o.ids.all), del = $(o.ids.del);
    var box = $(o.ids.form), text = $(o.ids.text), pass = $(o.ids.pass), go = $(o.ids.go);
    var errors = $(o.ids.msg), done = $(o.ids.status);
    function boxes() { return Array.prototype.slice.call(list.querySelectorAll('input[type="checkbox"]')); }
    function ticked() { return boxes().filter(function (b) { return b.checked; }); }
    function close() { box.hidden = true; pass.value = ""; }
    function words(n) { return n === 1 ? "1 " + o.noun[0] : n + " " + o.noun[1]; }
    function confirmText() {
      var picked = ticked();
      text.textContent = "";
      text.appendChild(el("strong", null, picked.length === 1 ? "Delete “" + picked[0].getAttribute("data-title") + "”?" : "Delete " + words(picked.length) + "?"));
      text.appendChild(document.createTextNode(" " + o.warning));
    }
    /* keeps Select all, the Delete Selected count and the open password check in step with the ticks */
    function selection() {
      var n = ticked().length, total = boxes().length;
      del.disabled = n === 0;
      del.textContent = "Delete Selected" + (n ? " (" + n + ")" : "");
      all.checked = total > 0 && n === total;
      all.indeterminate = n > 0 && n < total;
      if (!n) close();
      else if (!box.hidden) confirmText();
    }
    list.addEventListener("change", function () { done.textContent = ""; selection(); });
    all.addEventListener("change", function () {
      boxes().forEach(function (b) { b.checked = all.checked; });
      done.textContent = "";
      selection();
    });
    del.addEventListener("click", function () {
      errors.textContent = "";
      confirmText();
      box.hidden = false;
      pass.focus();
    });
    $(o.ids.cancel).addEventListener("click", function () { close(); del.focus(); });
    box.addEventListener("keydown", function (e) { if (e.key === "Escape") { close(); del.focus(); } });
    box.addEventListener("submit", function (e) {
      e.preventDefault();
      var ids = ticked().map(function (b) { return b.value; });
      if (!ids.length) return;
      if (!pass.value) { errors.textContent = "Type the delete password first."; pass.focus(); return; }
      var password = pass.value;
      pass.value = "";
      go.disabled = true;
      go.setAttribute("aria-busy", "true");
      errors.textContent = "";
      send(o.endpoint, "DELETE", { ids: ids, password: password }).then(function (data) {
        close();
        done.textContent = data.removed ? ("Deleted " + words(data.removed) + ". " + (o.gone ? o.gone(data.removed) : "")).trim() : "Those were already gone.";
        o.reload();
      }).catch(function (err) {
        errors.textContent = err.message;
        pass.focus();
      }).then(function () {
        go.disabled = false;
        go.removeAttribute("aria-busy");
      });
    });
    return {
      selection: selection,
      /* one row: a tick box (when deleting is on) and the lines of text */
      row: function (id, title, lines, canDelete) {
        var li = el("li", "admin-item");
        var pick = el(canDelete ? "label" : "div", "admin-item__pick" + (canDelete ? "" : " admin-item__pick--plain"));
        if (canDelete) {
          var tick = el("input");
          tick.type = "checkbox";
          tick.value = id;
          tick.setAttribute("data-title", title);
          pick.appendChild(tick);
        }
        var body = el("span", "admin-item__text");
        body.appendChild(el("strong", null, title));
        lines.forEach(function (l) { if (l) body.appendChild(el("span", l.cls || null, l.text)); });
        pick.appendChild(body);
        li.appendChild(pick);
        return li;
      },
      ready: function (canDelete, count) {
        tools.hidden = !canDelete || !count;
        $(o.ids.off).hidden = canDelete || !count;
        selection();
      },
      error: function (message) { errors.textContent = message; }
    };
  }

  /* -- Sessions tab: what's on the website ----------------------------- */
  var sessionList = $("a-list");
  var sessionPicker = picker({
    ids: { list: "a-list", tools: "a-tools", all: "a-all", del: "a-delete", form: "a-del-form", text: "a-del-text", pass: "a-del-pass",
      go: "a-del-go", cancel: "a-del-cancel", msg: "a-list-msg", status: "a-list-status", off: "a-del-off" },
    noun: ["session", "sessions"], endpoint: "/api/sessions",
    warning: "They disappear from the website straight away and can't be brought back.",
    gone: function (n) { return n === 1 ? "It's off the website now." : "They're off the website now."; }, reload: loadSessions
  });
  function loadSessions() {
    $("a-list-msg").textContent = "";
    get("/api/sessions?scope=admin", "Could not load sessions.").then(function (data) {
      sessionList.textContent = "";
      if (!data.sessions.length) sessionList.appendChild(el("li", "builder__empty", "No sessions yet. Add one with the form."));
      data.sessions.forEach(function (s) {
        sessionList.appendChild(sessionPicker.row(s.id, s.title, [
          { text: s.type + " · " + S.when(s) + " · " + (s.online ? "Online" : [s.place, s.town].filter(Boolean).join(", ")) },
          { text: (isPast(s.date) ? "Past · " : "") + "Added by " + s.created_by, cls: "admin-item__who" }
        ], data.canDelete));
      });
      sessionPicker.ready(Boolean(data.canDelete), data.sessions.length);
    }).catch(function (err) { sessionPicker.error(err.message); });
  }

  /* -- Sign-Ups tab ------------------------------------------------------- */
  var signupList = $("g-list"), signups = [];
  var signupPicker = picker({
    ids: { list: "g-list", tools: "g-tools", all: "g-all", del: "g-delete", form: "g-del-form", text: "g-del-text", pass: "g-del-pass",
      go: "g-del-go", cancel: "g-del-cancel", msg: "g-msg", status: "g-status", off: "g-del-off" },
    noun: ["sign-up", "sign-ups"], endpoint: "/api/signups",
    warning: "This can't be undone.", reload: loadSignups
  });
  function signedUpAt(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    var h = d.getHours(), m = d.getMinutes();
    return "Signed up " + S.MONTHS_LONG[d.getMonth()].slice(0, 3) + " " + d.getDate() + ", " + ((h % 12) || 12) + ":" + (m < 10 ? "0" : "") + m + " " + (h < 12 ? "am" : "pm");
  }
  /* sign-ups grouped: upcoming sessions by date, then the "tell me" list, then past sessions (latest first) */
  function groups() {
    var byKey = {}, order = [];
    signups.slice().reverse().forEach(function (g) { /* the server lists newest first; groups read oldest first */
      var key = g.session_id || "notify";
      if (!byKey[key]) {
        byKey[key] = { key: key, title: g.session_id ? g.session_title || "A deleted session" : "Tell Me When New Sessions Open",
          date: g.session_date || "", start: g.session_start || "", people: [] };
        order.push(byKey[key]);
      }
      byKey[key].people.push(g);
    });
    var rank = function (x) { return x.key === "notify" ? 1 : x.date && !isPast(x.date) ? 0 : 2; };
    order.sort(function (a, b) {
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      var x = a.date + a.start, y = b.date + b.start;
      return rank(a) === 2 ? (x < y ? 1 : x > y ? -1 : 0) : (x < y ? -1 : x > y ? 1 : 0);
    });
    order.forEach(function (x) { x.people.sort(function (a, b) { return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0; }); });
    return order;
  }
  function drawSignups(canDelete) {
    signupList.textContent = "";
    var all = groups();
    var forSessions = signups.filter(function (g) { return g.session_id; }).length;
    var waiting = signups.length - forSessions;
    $("t-signups-count").textContent = signups.length ? String(signups.length) : "";
    $("g-summary").textContent = !signups.length ? "No sign-ups yet. They appear here as soon as someone signs up on the website."
      : [forSessions ? forSessions + (forSessions === 1 ? " sign-up" : " sign-ups") + " for sessions" : "",
         waiting ? waiting + " asking to hear about new sessions" : ""].filter(Boolean).join(", ") + ".";
    $("g-csv").disabled = !signups.length;
    all.forEach(function (group) {
      var section = el("section", "signup-group");
      var head = el("div", "signup-group__head");
      var label = el("div");
      label.appendChild(el("h3", null, group.title));
      var when = group.date ? S.when({ date: group.date, start: group.start || "00:00" }).split(" · ")[0] + (group.start ? " · " + S.times({ start: group.start }) : "") : "";
      label.appendChild(el("p", null, [when, isPast(group.date || "9999-12-31") ? "Past" : "", group.people.length + (group.people.length === 1 ? " person" : " people")].filter(Boolean).join(" · ")));
      head.appendChild(label);
      var copyBtn = el("button", "btn btn--secondary btn--small", "Copy Emails");
      copyBtn.type = "button";
      copyBtn.addEventListener("click", function () {
        var emails = group.people.map(function (g) { return g.email; }).join(", ");
        copy(emails).then(function (ok) {
          $("g-status").textContent = ok ? "Copied " + group.people.length + (group.people.length === 1 ? " email address" : " email addresses") + " for “" + group.title + "”." : "Couldn't copy. The addresses: " + emails;
        });
      });
      head.appendChild(copyBtn);
      section.appendChild(head);
      var ul = el("ul", "admin-list");
      group.people.forEach(function (g) {
        ul.appendChild(signupPicker.row(g.id, g.name, [
          { text: g.email + (g.grade ? " · " + (g.grade === "Other" ? "Other grade" : g.grade + " grade") : "") },
          g.note ? { text: g.note, cls: "admin-item__note" } : null,
          { text: signedUpAt(g.created_at), cls: "admin-item__who" }
        ], canDelete));
      });
      section.appendChild(ul);
      signupList.appendChild(section);
    });
    signupPicker.ready(canDelete, signups.length);
  }
  function loadSignups() {
    $("g-msg").textContent = "";
    return get("/api/signups", "Could not load sign-ups.").then(function (data) {
      signups = data.signups || [];
      drawSignups(Boolean(data.canDelete));
    }).catch(function (err) { signupPicker.error(err.message); });
  }
  $("g-refresh").addEventListener("click", function () {
    $("g-status").textContent = "";
    loadSignups().then(function () { if (!$("g-msg").textContent) $("g-status").textContent = "Up to date."; });
  });

  /* CSV for a spreadsheet. Cells that start like a formula are prefixed, so a spreadsheet shows them as text. */
  function csv() {
    var cell = function (v) {
      v = v === null || v === undefined ? "" : String(v);
      if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
      return '"' + v.replace(/"/g, '""') + '"';
    };
    var rows = [["Session", "Session date", "Session time", "Name", "Email", "Grade", "Note", "Signed up"]];
    groups().forEach(function (group) {
      group.people.forEach(function (g) {
        rows.push([group.title, group.date, group.start, g.name, g.email, g.grade, g.note, g.created_at]);
      });
    });
    return "﻿" + rows.map(function (r) { return r.map(cell).join(","); }).join("\r\n") + "\r\n";
  }
  $("g-csv").addEventListener("click", function () {
    var link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv()], { type: "text/csv;charset=utf-8" }));
    var d = new Date();
    link.download = "yme-sign-ups-" + d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2) + ".csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  });

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    var area = el("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.className = "hp";
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    area.remove();
    return Promise.resolve(ok);
  }

  /* -- tabs (the address remembers the open one: /admin#signups) -------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  function openTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) tab.focus();
    history.replaceState(null, "", location.pathname + location.search + (tab.id === "t-signups" ? "#signups" : ""));
    if (tab.id === "t-signups") loadSignups();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { openTab(t); });
    t.addEventListener("keydown", function (e) {
      var next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
      if (next === null) return;
      e.preventDefault();
      openTab(tabs[(next + tabs.length) % tabs.length], true);
    });
  });

  update();
  loadSessions();
  if (location.hash === "#signups") openTab($("t-signups"));
  else loadSignups(); /* for the count on the tab */
})();
