/* Young Medical Engineers: the sign-up pages.
   signup.html?session=<id> shows one session and a short form; signup.html?notify is the
   "tell me when new sessions open" list. A sign-up is saved for the admins (/api/signups, seen
   on /admin) and emailed to the YME inbox through FormSubmit; either one reaching the team is
   enough. Then the visitor moves on to signed-up.html, which offers Add to Calendar and a link
   to share. Needs assets/sessions.js (window.YMESessions). */
(function () {
  "use strict";

  var S = window.YMESessions;
  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(location.search);
  var sessionId = (params.get("session") || "").toLowerCase();
  var notify = !sessionId;
  var KEY = "yme-signup"; /* first name and session, kept only for this tab to greet the visitor */
  var INBOX = "youngmedicalengineers@gmail.com";

  function remember(value) { try { sessionStorage.setItem(KEY, JSON.stringify(value)); } catch (e) { /* private mode */ } }
  function recall() { try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join("");
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
  }

  if ($("su-form")) signupPage();
  else if ($("d-title")) donePage();

  /* -- signup.html ---------------------------------------------------- */
  function signupPage() {
    var form = $("su-form"), card = $("su-card"), err = $("su-err"), go = $("su-go");
    var eyebrow = $("su-eyebrow"), title = $("su-title"), lede = $("su-lede"), box = $("su-details"), actions = $("su-actions");
    var session = null, pendingId = null, sending = false;

    function unavailable(heading, text) {
      eyebrow.textContent = "Sign Up";
      title.textContent = heading;
      lede.textContent = text;
      box.hidden = card.hidden = true;
      actions.hidden = false;
      document.title = heading + " · Young Medical Engineers";
    }

    if (notify) {
      eyebrow.textContent = "Get Notified";
      title.textContent = "Tell Me When Sessions Open";
      lede.textContent = "Leave your details and we'll email you when new talks, hands-on demos and design challenges open.";
      card.querySelector("h2").textContent = "Your Details";
      $("su-intro").textContent = "It's free, and it only takes a moment.";
      go.textContent = "Notify Me";
      card.hidden = false;
      document.title = "Get Notified · Young Medical Engineers";
    } else {
      S.find(sessionId).then(function (result) {
        if (!result.ok) return unavailable("We Couldn't Load This Session", "Please try again in a moment, or see what's coming up.");
        if (!result.session) return unavailable("This Session Isn't Open", "It may have already happened or been removed. Have a look at what's coming up, or ask us to tell you when new sessions open.");
        session = result.session;
        eyebrow.textContent = session.type || "Session";
        title.textContent = session.title;
        lede.textContent = session.description || "Come learn something new about medical engineering.";
        box.appendChild(S.dateBlock(session));
        box.appendChild(S.meta(session));
        var note = document.createElement("p");
        note.className = "signup__note";
        note.textContent = "Free, and all students are welcome. No experience needed.";
        box.appendChild(note);
        box.hidden = false;
        card.hidden = false;
        document.title = session.title + " · Sign Up · Young Medical Engineers";
      });
    }

    /* saved for the admins: true, false (not saved), or "closed" when the session no longer takes sign-ups.
       Sessions from sessions.json (the no-server backup) aren't in the database, so those go by email only. */
    function save(entry) {
      if (session && session.source === "file") return Promise.resolve(false);
      return fetch("api/signups", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(entry)
      }).then(function (r) {
        if (r.ok) return true;
        return r.json().then(function (d) { return d && d.closed ? "closed" : false; }, function () { return false; });
      }).catch(function () { return false; });
    }
    /* emailed to the YME inbox, like the other forms on the site */
    function email(entry) {
      if (entry._honey) return Promise.resolve(true);
      var data = {
        Name: entry.name, Email: entry.email, Grade: entry.grade || "Not given", Note: entry.note || "None",
        Session: session ? session.title + " (" + S.when(session) + ")" : "Tell me when new sessions open",
        _subject: "YME website: " + (session ? "Session sign-up" : "Tell me when new sessions open"),
        _template: "table", _replyto: entry.email
      };
      return fetch("https://formsubmit.co/ajax/" + INBOX, {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data)
      }).then(function (r) { return r.ok; }).catch(function () { return false; });
    }
    function problem(closed) {
      err.textContent = "";
      if (closed) {
        err.appendChild(document.createTextNode("Sorry, this session has just closed for sign-ups. "));
        var more = document.createElement("a");
        more.href = "sessions.html";
        more.textContent = "See other sessions";
        err.appendChild(more);
        err.appendChild(document.createTextNode("."));
      } else {
        err.appendChild(document.createTextNode("We couldn't send your sign-up. Please try again, or email "));
        var mail = document.createElement("a");
        mail.href = "mailto:" + INBOX;
        mail.textContent = INBOX;
        err.appendChild(mail);
        err.appendChild(document.createTextNode(" and we'll take it from there."));
      }
      err.classList.add("show");
      err.focus();
    }

    form.addEventListener("input", function () { pendingId = null; err.classList.remove("show"); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (sending) return;
      if (!form.checkValidity()) { form.reportValidity(); return; }
      sending = true;
      var label = go.textContent;
      go.setAttribute("aria-busy", "true");
      go.textContent = "Sending…";
      err.classList.remove("show");
      pendingId = pendingId || uuid(); /* the same id on a retry, so the sign-up is never saved twice */
      var entry = {
        id: pendingId, session: session ? session.id : null, name: $("su-name").value.trim(), email: $("su-email").value.trim(),
        grade: $("su-grade").value, note: $("su-note").value.trim(), _honey: $("su-hp").value
      };
      save(entry).then(function (saved) {
        if (saved === "closed") return "closed";
        return email(entry).then(function (sent) { return saved || sent; });
      }).then(function (outcome) {
        if (outcome === true) {
          remember({ name: entry.name.split(/\s+/)[0].slice(0, 40), session: session });
          location.href = "signed-up.html" + (session ? "?session=" + encodeURIComponent(session.id) : "?notify");
          return;
        }
        sending = false;
        go.removeAttribute("aria-busy");
        go.textContent = label;
        problem(outcome === "closed");
      });
    });
  }

  /* -- signed-up.html ---------------------------------------------------- */
  function donePage() {
    var saved = recall() || {};
    var name = typeof saved.name === "string" ? saved.name : "";
    var msg = $("d-msg");
    if (notify) {
      $("d-eyebrow").textContent = "You're on the List";
      $("d-title").textContent = name ? "Thanks, " + name + "!" : "We'll Be in Touch";
      $("d-lede").textContent = "We'll email you when new sessions open. In the meantime, have a look at what's already coming up.";
      document.title = "You're on the List · Young Medical Engineers";
      return;
    }
    if (name) $("d-title").textContent = "See You There, " + name + "!";

    function show(s) {
      var ticket = $("d-ticket");
      ticket.appendChild(S.build(s, { heading: "h2", cta: false }));
      ticket.hidden = false;
      var ics = $("d-ics"), share = $("d-share");
      ics.hidden = share.hidden = false;
      ics.addEventListener("click", function () {
        var link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([calendar(s)], { type: "text/calendar;charset=utf-8" }));
        link.download = "yme-" + s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) + ".ics";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
        msg.textContent = "Your calendar file is downloading. Open it to add the session.";
      });
      share.addEventListener("click", function () {
        var url = new URL(S.signupUrl(s), location.href).href;
        if (navigator.share) {
          navigator.share({ title: s.title, text: "Come with me to " + s.title + ", a free session from Young Medical Engineers.", url: url }).catch(function () {});
          return;
        }
        copy(url).then(function (ok) {
          msg.textContent = ok ? "Link copied. Send it to a friend." : "Copy this link to share it: " + url;
        });
      });
    }
    var known = S.normalize(saved.session);
    if (known && known.id === sessionId) show(known);
    else S.find(sessionId).then(function (result) { if (result.session) show(result.session); });
  }

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    area.remove();
    return Promise.resolve(ok);
  }

  /* An .ics calendar file for one session, in local time (calendars show it at the stated hour). */
  function calendar(s) {
    var escape = function (t) { return String(t).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); };
    var day = s.date.replace(/-/g, "");
    var end = s.end;
    if (!end) { /* no end time given: an hour, ending by midnight */
      var h = Math.min(parseInt(s.start.slice(0, 2), 10) + 1, 23);
      end = (h < 10 ? "0" : "") + h + ":" + (h === 23 && s.start >= "23:00" ? "59" : s.start.slice(3, 5));
    }
    var details = [s.description, s.online ? "Online: we'll email you the link." : "", "Session page: " + new URL(S.signupUrl(s), location.href).href].filter(Boolean).join("\n");
    var lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Young Medical Engineers//Sessions//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:" + s.id + "@medengineers.org",
      "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""),
      "DTSTART:" + day + "T" + s.start.replace(":", "") + "00",
      "DTEND:" + day + "T" + end.replace(":", "") + "00",
      "SUMMARY:" + escape(s.title + " (Young Medical Engineers)"),
      "LOCATION:" + escape(S.where(s)),
      "DESCRIPTION:" + escape(details),
      "END:VEVENT", "END:VCALENDAR"
    ];
    /* calendar files wrap long lines at 75 characters, continuing with a space */
    return lines.map(function (text) {
      var chars = Array.from(text), out = [];
      while (chars.length > 74) { out.push(chars.splice(0, out.length ? 73 : 74).join("")); }
      out.push(chars.join(""));
      return out.join("\r\n ");
    }).join("\r\n") + "\r\n";
  }
})();
