/* The threshold — a wall of machine screws that tighten as your
   wrench approaches. Click anywhere to enter; the wall spins shut. */
(function () {
  "use strict";

  var canvas = document.getElementById("screws");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var SPACING = 76;
  var R = 23;
  var SIGMA = 150;
  var TURN = 2.6;
  var screws = [];
  var W = 0, H = 0;
  var mouse = { x: -9999, y: -9999, real: false };
  var t = 0;
  var leaving = false;
  var leaveSpin = 0;

  var sprite = document.createElement("canvas");
  function buildSprite() {
    var s = Math.ceil((R + 6) * 2 * DPR);
    sprite.width = s; sprite.height = s;
    var c = sprite.getContext("2d");
    c.scale(DPR, DPR);
    var cx = s / (2 * DPR), cy = cx;

    var sh = c.createRadialGradient(cx, cy, R * 0.6, cx, cy, R + 5);
    sh.addColorStop(0, "rgba(0,0,0,0)");
    sh.addColorStop(1, "rgba(0,0,0,0.55)");
    c.fillStyle = sh;
    c.beginPath(); c.arc(cx, cy, R + 5, 0, 7); c.fill();

    var rim = c.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    rim.addColorStop(0, "#4b4f55");
    rim.addColorStop(0.5, "#26282b");
    rim.addColorStop(1, "#111214");
    c.fillStyle = rim;
    c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill();

    var face = c.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R * 0.92);
    face.addColorStop(0, "#3c3f44");
    face.addColorStop(0.65, "#2a2c30");
    face.addColorStop(1, "#191a1d");
    c.fillStyle = face;
    c.beginPath(); c.arc(cx, cy, R * 0.86, 0, 7); c.fill();

    c.strokeStyle = "rgba(255,255,255,0.14)";
    c.lineWidth = 1.4;
    c.beginPath(); c.arc(cx, cy, R * 0.93, Math.PI * 0.8, Math.PI * 1.55); c.stroke();
  }

  function layout() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildSprite();

    screws = [];
    var cols = Math.ceil(W / SPACING) + 1;
    var rows = Math.ceil(H / SPACING) + 1;
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        screws.push({
          x: i * SPACING + (j % 2 ? SPACING / 2 : 0),
          y: j * SPACING,
          base: Math.random() * Math.PI * 2,
          angle: 0,
          phase: Math.random() * Math.PI * 2,
          cross: Math.random() < 0.45
        });
      }
    }
  }

  function slot(x, y, a, cross, glow) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    var L = R * 1.28, wdt = R * 0.24;
    ctx.fillStyle = "#0a0b0c";
    ctx.fillRect(-L / 2, -wdt / 2, L, wdt);
    if (cross) ctx.fillRect(-wdt / 2, -L / 2, wdt, L);
    ctx.fillStyle = "rgba(255,255,255," + (0.05 + glow * 0.1) + ")";
    ctx.fillRect(-L / 2, wdt / 2, L, 1);
    ctx.restore();
  }

  var lastFrame = 0;
  function frame() {
    lastFrame = Date.now();
    t += 0.016;
    if (window.innerWidth !== W || window.innerHeight !== H) layout();
    ctx.clearRect(0, 0, W, H);

    if (leaving) leaveSpin += 0.28;

    var vx = mouse.real ? mouse.x : W / 2 + Math.sin(t * 0.35) * W * 0.32;
    var vy = mouse.real ? mouse.y : H / 2 + Math.cos(t * 0.27) * H * 0.26;

    var half = sprite.width / (2 * DPR);
    for (var k = 0; k < screws.length; k++) {
      var s = screws[k];
      var dx = s.x - vx, dy = s.y - vy;
      var inf = Math.exp(-(dx * dx + dy * dy) / (2 * SIGMA * SIGMA));
      var target = inf * TURN + Math.sin(t * 0.4 + s.phase) * 0.05 + leaveSpin;
      s.angle += (target - s.angle) * 0.085;

      ctx.drawImage(sprite, s.x - half, s.y - half, half * 2, half * 2);
      slot(s.x, s.y, s.base + s.angle, s.cross, inf);

      if (inf > 0.03 && !leaving) {
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = "rgba(196,104,95," + inf * 0.15 + ")";
        ctx.beginPath(); ctx.arc(s.x, s.y, R * 0.9, 0, 7); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
      }
    }
  }

  function loop() {
    frame();
    requestAnimationFrame(loop);
  }

  /* -- the invitation follows the wrench -------------------------- */
  var chase = document.getElementById("chase");
  var cx = -100, cy = -100;
  if (chase) {
    // resting spot for touch / before first mouse move
    chase.style.left = "50%";
    chase.style.top = "72%";
    setTimeout(function () { chase.classList.add("on"); }, 1400);

    window.addEventListener("mousemove", function (e) {
      cx += (e.clientX - cx) * 0.16;
      cy += (e.clientY - cy) * 0.16;
      chase.style.left = cx + "px";
      chase.style.top = cy + "px";
    });
  }

  /* -- click anywhere: the wall spins shut, then we enter ----------- */
  document.addEventListener("click", function (e) {
    if (leaving || e.target.closest("a")) return;
    leaving = true;
    sessionStorage.setItem("dramatic", "1");
    document.body.classList.add("exit");
    setTimeout(function () { location.href = "mission.html"; }, 750);
  });

  window.addEventListener("mousemove", function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.real = true;
  });
  window.addEventListener("mouseout", function () { mouse.real = false; });
  window.addEventListener("resize", layout);

  layout();
  window.addEventListener("load", layout);
  window.setTimeout(layout, 400);
  requestAnimationFrame(loop);
  window.setInterval(function () {
    if (Date.now() - lastFrame > 700) frame();
  }, 500);
})();
