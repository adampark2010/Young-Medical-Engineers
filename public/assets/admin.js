/* Young Medical Engineers: the admin page (/admin). Two groups of tabs: Sessions and Articles.
   Sessions tab: adds sessions through /admin/api/sessions (they go live at once), lists them, and
   deletes the ticked ones. Sign-Ups tab: everyone who signed up on the website (/admin/api/signups),
   grouped by session, with copy emails, a CSV download, and delete. Forms tab: tutoring requests,
   volunteer applications and messages (/admin/api/forms), with delete. Articles: In the News and Our
   Updates (/admin/api/posts), added, edited and deleted. Deleting always asks for the
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
    send("/admin/api/sessions", "POST", d).then(function () {
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
    noun: ["session", "sessions"], endpoint: "/admin/api/sessions",
    warning: "They disappear from the website straight away and can't be brought back.",
    gone: function (n) { return n === 1 ? "It's off the website now." : "They're off the website now."; }, reload: loadSessions
  });
  function loadSessions() {
    $("a-list-msg").textContent = "";
    get("/admin/api/sessions?scope=admin", "Could not load sessions.").then(function (data) {
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
    noun: ["sign-up", "sign-ups"], endpoint: "/admin/api/signups",
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
    return get("/admin/api/signups", "Could not load sign-ups.").then(function (data) {
      signups = data.signups || [];
      drawSignups(Boolean(data.canDelete));
    }).catch(function (err) { signupPicker.error(err.message); });
  }
  $("g-refresh").addEventListener("click", function () {
    $("g-status").textContent = "";
    loadSignups().then(function () { if (!$("g-msg").textContent) $("g-status").textContent = "Up to date."; });
  });

  /* -- Forms tab: tutoring requests, volunteer applications and messages ---- */
  var FORM_GROUPS = [["tutoring", "Tutoring Requests"], ["volunteer", "Volunteer Applications"], ["contact", "Messages"]];
  var formList = $("f-list"), submissions = [];
  var formPicker = picker({
    ids: { list: "f-list", tools: "f-tools", all: "f-all", del: "f-delete", form: "f-del-form", text: "f-del-text", pass: "f-del-pass",
      go: "f-del-go", cancel: "f-del-cancel", msg: "f-msg", status: "f-status", off: "f-del-off" },
    noun: ["submission", "submissions"], endpoint: "/admin/api/forms",
    warning: "This can't be undone.", reload: loadForms
  });
  function drawForms(canDelete) {
    formList.textContent = "";
    $("t-forms-count").textContent = submissions.length ? String(submissions.length) : "";
    $("f-summary").textContent = !submissions.length ? "Nothing yet. Tutoring requests, volunteer applications and messages appear here as soon as someone sends one."
      : FORM_GROUPS.map(function (g) {
        var n = submissions.filter(function (s) { return s.form === g[0]; }).length;
        return n ? n + " " + (n === 1 ? g[1].replace(/s$/, "") : g[1]).toLowerCase() : "";
      }).filter(Boolean).join(", ") + ".";
    FORM_GROUPS.forEach(function (g) {
      var items = submissions.filter(function (s) { return s.form === g[0]; });
      if (!items.length) return;
      var section = el("section", "signup-group");
      var head = el("div", "signup-group__head");
      var label = el("div");
      label.appendChild(el("h3", null, g[1]));
      label.appendChild(el("p", null, items.length + " · newest first"));
      head.appendChild(label);
      section.appendChild(head);
      var ul = el("ul", "admin-list");
      items.forEach(function (s) {
        var fields = Array.isArray(s.fields) ? s.fields : [];
        /* the first answer is the person's name; the rest are listed with their questions */
        var lines = fields.slice(1).map(function (f) { return { text: f[0] + ": " + f[1], cls: "admin-item__note" }; });
        lines.push({ text: signedUpAt(s.created_at).replace("Signed up", "Sent"), cls: "admin-item__who" });
        ul.appendChild(formPicker.row(s.id, fields[0] ? fields[0][1] : "Someone", lines, canDelete));
      });
      section.appendChild(ul);
      formList.appendChild(section);
    });
    formPicker.ready(canDelete, submissions.length);
  }
  function loadForms() {
    $("f-msg").textContent = "";
    return get("/admin/api/forms", "Could not load form submissions.").then(function (data) {
      submissions = data.submissions || [];
      drawForms(Boolean(data.canDelete));
    }).catch(function (err) { formPicker.error(err.message); });
  }
  $("f-refresh").addEventListener("click", function () {
    $("f-status").textContent = "";
    loadForms().then(function () { if (!$("f-msg").textContent) $("f-status").textContent = "Up to date."; });
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

  /* -- Articles: In the News and Our Updates (/admin/api/posts) ------------ */
  /* One editor per sub-tab: a form that adds a post, or saves changes to the one being edited, and
     the list with Edit, Select all and Delete Selected. Until anything is added here the page shows
     its file (news.json or updates.json), which can be copied in with one click. */
  function postEditor(o) {
    var p = o.prefix, form = $(p + "-form"), saveBtn = $(p + "-save"), cancel = $(p + "-cancel");
    var note = $(p + "-form-status"), heading = $(p + "-heading"), list = $(p + "-list");
    var editing = null, pendingId = null, busy = false;
    var pick = picker({
      ids: { list: p + "-list", tools: p + "-tools", all: p + "-all", del: p + "-delete", form: p + "-del-form", text: p + "-del-text",
        pass: p + "-del-pass", go: p + "-del-go", cancel: p + "-del-cancel", msg: p + "-msg", status: p + "-status", off: p + "-del-off" },
      noun: o.noun, endpoint: "/admin/api/posts",
      warning: "They disappear from the page straight away and can't be brought back.", reload: load
    });
    function mode(post) {
      editing = post;
      heading.textContent = post ? "Edit “" + post.data.title + "”" : o.addTitle;
      saveBtn.textContent = post ? "Save Changes" : "Add to the Page";
      cancel.hidden = !post;
    }
    function edit(post) {
      form.reset();
      o.fill(post);
      previews.forEach(function (show) { show(); });
      mode(post);
      note.textContent = "";
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      form.querySelector("input, select, textarea").focus({ preventScroll: true });
    }
    cancel.addEventListener("click", function () { form.reset(); mode(null); note.textContent = ""; });
    form.addEventListener("input", function () { if (!editing) pendingId = null; note.textContent = ""; });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (busy) return;
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var body = o.read();
      body.id = editing ? editing.id : (pendingId = pendingId || uuid()); /* a retry never adds it twice */
      busy = true;
      saveBtn.setAttribute("aria-busy", "true");
      note.textContent = "Saving…";
      var wasEditing = Boolean(editing);
      send("/admin/api/posts", "POST", body).then(function () {
        pendingId = null;
        form.reset();
        mode(null);
        note.textContent = wasEditing ? "Saved. The page shows the change now." : "Added. It's on the page now.";
        load();
      }).catch(function (err) {
        note.textContent = err.message;
      }).then(function () {
        busy = false;
        saveBtn.removeAttribute("aria-busy");
      });
    });

    var importBox = $(p + "-import"), importText = $(p + "-import-text"), importGo = $(p + "-import-go"), fileItems = [];
    importGo.addEventListener("click", function () {
      importGo.disabled = true;
      importGo.setAttribute("aria-busy", "true");
      $(p + "-msg").textContent = "";
      /* one at a time, oldest first, so the page keeps the same order */
      fileItems.slice().reverse().reduce(function (chain, item) {
        return chain.then(function () { var body = o.fromFile(item); body.id = uuid(); return send("/admin/api/posts", "POST", body); });
      }, Promise.resolve()).then(function () {
        $(p + "-status").textContent = "Copied in. You can edit them now.";
      }).catch(function (err) {
        $(p + "-msg").textContent = err.message;
      }).then(function () {
        importGo.disabled = false;
        importGo.removeAttribute("aria-busy");
        load();
      });
    });

    function load() {
      $(p + "-msg").textContent = "";
      return get("/admin/api/posts?scope=admin", "Could not load the articles.").then(function (data) {
        var posts = (data.posts || []).filter(function (x) { return o.kinds.indexOf(x.kind) !== -1; });
        var canDelete = Boolean(data.canDelete);
        list.textContent = "";
        $(o.count).textContent = posts.length ? String(posts.length) : "";
        posts.forEach(function (post) {
          var li = pick.row(post.id, post.data.title, o.lines(post), canDelete);
          li.classList.add("admin-item--edit");
          var btn = el("button", "btn btn--secondary btn--small", "Edit");
          btn.type = "button";
          btn.setAttribute("aria-label", "Edit “" + post.data.title + "”");
          btn.addEventListener("click", function () { edit(post); });
          li.appendChild(btn);
          list.appendChild(li);
        });
        pick.ready(canDelete, posts.length);
        importBox.hidden = true;
        if (posts.length) return;
        list.appendChild(el("li", "builder__empty", "Nothing added here yet. Use the form to add the first one."));
        /* nothing in the database yet: offer to copy in what the page shows from its file */
        return fetch(o.file, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (file) {
          fileItems = file ? o.fileItems(file) : [];
          if (!fileItems.length) return;
          importText.textContent = "The page is showing " + fileItems.length + (fileItems.length === 1 ? " entry" : " entries") +
            " from " + o.file + ". Copy them in here to edit or remove them; once anything is added here, the page shows only what is listed here.";
          importBox.hidden = false;
        }).catch(function () {});
      }).catch(function (err) { pick.error(err.message); });
    }
    return { load: load };
  }

  function when(iso) {
    var d = iso ? new Date(iso + "T00:00:00") : null;
    return d && !isNaN(d) ? S.MONTHS_LONG[d.getMonth()].slice(0, 3) + " " + d.getDate() + ", " + d.getFullYear() : "";
  }
  /* Picture fields on the Articles forms. "Upload a Picture" shrinks the file in the browser (longest
     side 1600px, saved as JPEG) unless it is already small, sends it to /admin/api/images, and puts the
     address it gets back (api/images/<id>) in the field; the entry keeps it once it is added or saved.
     A small preview shows any picture stored on this site. */
  var MAX_SIDE = 1600, KEEP_UNDER = 400000;
  function shrink(file) {
    if (file.type === "image/gif" || !window.createImageBitmap) return Promise.resolve(file); /* resizing would stop a GIF moving */
    return createImageBitmap(file).then(function (img) {
      var scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      if (scale === 1 && file.size <= KEEP_UNDER) return file;
      var canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff"; /* see-through parts turn white, not black */
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return new Promise(function (done) { canvas.toBlob(function (b) { done(b || file); }, "image/jpeg", 0.85); });
    });
  }
  function uploader(id) {
    var field = $(id), input = $(id + "-file"), status = $(id + "-file-status"), preview = $(id + "-preview");
    var button = input.parentNode;
    function show() {
      var v = field.value.trim();
      var ours = /^api\/images\/[a-f\d-]{36}$/i.test(v) || /^assets\/[\w\-.\/]+\.(jpe?g|png|webp|gif)$/i.test(v);
      preview.hidden = !ours;
      if (ours) preview.src = "/" + v;
      else preview.removeAttribute("src");
    }
    preview.addEventListener("error", function () { preview.hidden = true; });
    field.addEventListener("input", show);
    field.form.addEventListener("reset", function () { setTimeout(function () { show(); status.textContent = ""; }, 0); });
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      input.value = "";
      if (!file) return;
      if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) { status.textContent = "Please choose a JPEG, PNG, WebP or GIF picture."; return; }
      button.setAttribute("aria-busy", "true");
      status.textContent = "Uploading…";
      shrink(file).then(function (blob) {
        return fetch("/admin/api/images", {
          method: "POST", credentials: "same-origin",
          headers: { "Content-Type": blob.type || file.type, Accept: "application/json" }, body: blob
        });
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (data) {
          if (!r.ok) throw new Error(data.error || "The upload didn't work (" + r.status + "). Please try again.");
          return data;
        });
      }).then(function (data) {
        field.value = data.url;
        field.dispatchEvent(new Event("input", { bubbles: true }));
        status.textContent = "Uploaded. It's kept when you add or save the entry.";
      }).catch(function (err) {
        status.textContent = err.message || "The upload didn't work. Please try again.";
      }).then(function () { button.removeAttribute("aria-busy"); });
    });
    return show;
  }
  var previews = [uploader("n-image"), uploader("u-image")];

  var news = postEditor({
    prefix: "n", kinds: ["article", "podcast"], noun: ["entry", "entries"], count: "t-news-count",
    addTitle: "Add to In the News", file: "/news.json",
    read: function () {
      return { kind: $("n-kind").value, title: value("n-title"), source: value("n-source"), date: $("n-date").value,
        url: value("n-url"), note: value("n-note"), image: value("n-image"), credit: value("n-credit") };
    },
    fill: function (post) {
      var d = post.data;
      $("n-kind").value = post.kind; $("n-title").value = d.title || ""; $("n-source").value = d.source || "";
      $("n-date").value = d.date || ""; $("n-url").value = d.url || ""; $("n-note").value = d.note || "";
      $("n-image").value = d.image || ""; $("n-credit").value = d.credit || "";
    },
    lines: function (post) {
      return [{ text: (post.kind === "podcast" ? "Podcast" : "Article") + " · " + post.data.source + " · " + when(post.data.date) },
        post.data.note ? { text: post.data.note, cls: "admin-item__who" } : null];
    },
    fileItems: function (file) {
      return [].concat((file.articles || []).map(function (i) { return { kind: "article", item: i }; }),
        (file.podcasts || []).map(function (i) { return { kind: "podcast", item: i }; }));
    },
    fromFile: function (x) {
      var i = x.item;
      return { kind: x.kind, title: i.title, source: i.source, date: i.date, url: i.url, note: i.note || "", image: i.image || "", credit: i.credit || "" };
    }
  });
  var updates = postEditor({
    prefix: "u", kinds: ["update"], noun: ["update", "updates"], count: "t-updates-count",
    addTitle: "Add an Update", file: "/updates.json",
    read: function () {
      return { kind: "update", title: value("u-title"), label: value("u-label"), date: $("u-date").value, body: $("u-body").value,
        image: value("u-image"), alt: value("u-alt"), credit: value("u-credit"),
        links: [{ text: value("u-l1-text"), href: value("u-l1-href") }, { text: value("u-l2-text"), href: value("u-l2-href") }] };
    },
    fill: function (post) {
      var d = post.data, links = d.links || [];
      $("u-title").value = d.title || ""; $("u-label").value = d.label || ""; $("u-date").value = d.date || "";
      $("u-body").value = (d.body || []).join("\n\n"); $("u-image").value = d.image || ""; $("u-alt").value = d.alt || "";
      $("u-credit").value = d.credit || "";
      $("u-l1-text").value = links[0] ? links[0].text : ""; $("u-l1-href").value = links[0] ? links[0].href : "";
      $("u-l2-text").value = links[1] ? links[1].text : ""; $("u-l2-href").value = links[1] ? links[1].href : "";
    },
    lines: function (post) {
      var first = (post.data.body || [])[0] || "";
      return [{ text: [post.data.label, when(post.data.date)].filter(Boolean).join(" · ") },
        first ? { text: first.length > 140 ? first.slice(0, 140) + "…" : first, cls: "admin-item__who" } : null];
    },
    fileItems: function (file) { return file.updates || []; },
    fromFile: function (u) {
      return { kind: "update", title: u.title, label: u.kind || "", date: u.date, body: u.body || [], image: u.image || "",
        alt: u.alt || "", credit: u.credit || "", links: (u.links || []).slice(0, 3) };
    }
  });

  /* -- tabs: a main row (Sessions, Articles), each with its own sub-tabs. The address remembers the
     open sub-tab: /admin#signups, #forms, #news, #updates --------------------------------------- */
  var HASH = { "t-signups": "#signups", "t-forms": "#forms", "t-news": "#news", "t-updates": "#updates" };
  var LOADERS = { "t-signups": loadSignups, "t-forms": loadForms, "t-news": news.load, "t-updates": updates.load };
  function rowOf(tab) { return Array.prototype.slice.call(tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]')); }
  function openTab(tab, focus) {
    rowOf(tab).forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) tab.focus();
    /* a main tab shows whichever of its sub-tabs was open */
    var sub = tab.closest(".tabs--main") ? $(tab.getAttribute("aria-controls")).querySelector('.tabs--sub [aria-selected="true"]') : tab;
    history.replaceState(null, "", location.pathname + location.search + (HASH[sub.id] || ""));
    if (LOADERS[sub.id]) LOADERS[sub.id]();
  }
  Array.prototype.slice.call(document.querySelectorAll('[role="tab"]')).forEach(function (t) {
    t.addEventListener("click", function () { openTab(t); });
    t.addEventListener("keydown", function (e) {
      var row = rowOf(t), i = row.indexOf(t);
      var next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? row.length - 1 : null;
      if (next === null) return;
      e.preventDefault();
      openTab(row[(next + row.length) % row.length], true);
    });
  });

  update();
  loadSessions();
  var startTab = null;
  Object.keys(HASH).forEach(function (id) { if (HASH[id] === location.hash) startTab = $(id); });
  if (startTab) {
    openTab($(startTab.closest('[role="tabpanel"]').getAttribute("aria-labelledby")));
    openTab(startTab);
  }
  /* the counts on every sub-tab */
  Object.keys(LOADERS).forEach(function (id) { if (!startTab || startTab.id !== id) LOADERS[id](); });
})();
