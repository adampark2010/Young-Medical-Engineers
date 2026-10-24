/* Session Builder (session-builder.html): the backup way to list sessions when the site runs
   without its server. It reads the published sessions.json, adds the session in the form, leaves
   out any that are unticked or past, and gives the whole new file to paste into GitHub.
   It only produces text; publishing happens on GitHub. Needs assets/sessions.js. */
(function () {
  "use strict";

  /* where staff edit the list (change if the site is published from another repository) */
  var EDIT_URL = "https://github.com/adampark2010/Young-Medical-Engineers/edit/main/public/sessions.json";

  var S = window.YMESessions;
  var $ = function (id) { return document.getElementById(id); };
  var form = $("builder"), preview = $("b-preview"), code = $("b-code"), msg = $("b-msg");
  var copyBtn = $("b-copy"), copied = $("b-copied"), placeFields = $("b-place-fields");
  var current = $("b-current"), currentNote = $("b-current-note");
  var existing = []; /* sessions already in sessions.json */
  var newId = uuid();
  $("b-edit").href = EDIT_URL;

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join("");
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
  }
  function val(id) { return $(id).value.trim(); }
  function past(date) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var p = date.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]) < today;
  }

  /* the session in the form: { session } when complete, { error } when something is missing, {} when empty */
  function fromForm() {
    var online = form.querySelector('input[name="where"]:checked').value === "online";
    placeFields.hidden = online;
    var s = {
      id: newId, type: val("b-type"), title: val("b-title"), date: $("b-date").value, start: $("b-start").value,
      end: $("b-end").value || null, online: online, place: online ? "" : val("b-place"), street: online ? "" : val("b-street"),
      town: online ? "" : val("b-town"), description: val("b-desc")
    };
    var touched = s.type || s.title || s.date || s.start || s.place || s.street || s.description;
    if (!touched) return {};
    var missing = [];
    if (!s.type) missing.push("type");
    if (!s.title) missing.push("title");
    if (!s.date) missing.push("date");
    if (!s.start) missing.push("start time");
    if (!online && !s.place && !s.street) missing.push("place or address");
    if (missing.length) return { error: "Still needed: " + missing.join(", ") + "." };
    if (s.end && s.end <= s.start) return { error: "The end time is before the start time." };
    return { session: s };
  }

  function update() {
    var r = fromForm();
    copied.textContent = "";
    preview.textContent = "";
    if (r.session) {
      preview.appendChild(S.build(r.session));
      msg.textContent = past(r.session.date) ? "This date has passed, so the session would hide itself as soon as it is added." : "";
    } else {
      var empty = document.createElement("li");
      empty.className = "builder__empty";
      empty.textContent = "Your new session will appear here.";
      preview.appendChild(empty);
      msg.textContent = r.error || "";
    }
    /* the new file: ticked sessions still to come, plus the new one, in date order */
    var keep = existing.filter(function (s, i) { return !past(s.date) && $("b-keep-" + i).checked; });
    if (r.session && !past(r.session.date)) keep.push(r.session);
    keep.sort(function (a, b) { var x = a.date + a.start, y = b.date + b.start; return x < y ? -1 : x > y ? 1 : 0; });
    var clean = keep.map(function (s) {
      return { id: s.id, type: s.type, title: s.title, date: s.date, start: s.start, end: s.end || null, online: Boolean(s.online),
        place: s.place || "", street: s.street || "", town: s.town || "", description: s.description || "" };
    });
    code.value = JSON.stringify({ sessions: clean }, null, 2) + "\n";
    copyBtn.disabled = Boolean(r.error);
  }

  /* the list as published now, so nothing already there is lost */
  function loadCurrent() {
    fetch("sessions.json", { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(); return r.json(); }).then(function (data) {
      existing = ((data && data.sessions) || []).map(function (raw) {
        var s = S.normalize(raw);
        if (s && !s.id) s.id = uuid();
        return s;
      }).filter(Boolean);
      current.textContent = "";
      if (!existing.length) currentNote.textContent = "sessions.json is empty right now.";
      else currentNote.textContent = "Untick any you want to take off. Past ones are left out by themselves.";
      existing.forEach(function (s, i) {
        var li = document.createElement("li");
        li.className = "admin-item";
        var label = document.createElement("label");
        label.className = "admin-item__pick";
        var box = document.createElement("input");
        box.type = "checkbox";
        box.id = "b-keep-" + i;
        box.checked = !past(s.date);
        box.disabled = past(s.date);
        var text = document.createElement("span");
        text.className = "admin-item__text";
        var title = document.createElement("strong");
        title.textContent = s.title;
        var info = document.createElement("span");
        info.textContent = (past(s.date) ? "Past · " : "") + (s.type ? s.type + " · " : "") + S.when(s) + " · " + S.where(s);
        text.appendChild(title);
        text.appendChild(info);
        label.appendChild(box);
        label.appendChild(text);
        li.appendChild(label);
        current.appendChild(li);
      });
      update();
    }).catch(function () {
      currentNote.textContent = "Couldn't read sessions.json here, so the new file below holds only the new session. Check the file on GitHub before replacing it.";
      update();
    });
  }

  copyBtn.addEventListener("click", function () {
    var done = function () { copied.textContent = "Copied. Now replace everything in sessions.json with it."; };
    var fallback = function () {
      code.focus(); code.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      copied.textContent = ok ? "Copied. Now replace everything in sessions.json with it." : "Text selected: press Ctrl+C (Cmd+C on a Mac) to copy.";
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code.value).then(done, fallback);
    else fallback();
  });

  form.addEventListener("input", update);
  form.addEventListener("change", update);
  current.addEventListener("change", update);
  update();
  loadCurrent();
})();
