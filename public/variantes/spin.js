/* Spin 360 compartilhado pelas variantes.
   192 frames WebP num canvas, girando com a seta do mouse.
   Carga progressiva: passada grossa primeiro, refina depois. */
window.initSpin = function (opts) {
  var TOTAL = 192, CONCORRENCIA = 8;
  var canvas = document.getElementById(opts.canvas);
  var scene  = document.querySelector(opts.scene);
  if (!canvas || !scene) return;

  var ctx = canvas.getContext("2d", { alpha: false });
  ctx.fillStyle = "#0a0a0c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  var images = new Array(TOTAL), ready = new Uint8Array(TOTAL), drawn = -1;

  var order = [], seen = new Uint8Array(TOTAL), steps = [16, 8, 4, 2, 1];
  for (var si = 0; si < steps.length; si++)
    for (var i = 0; i < TOTAL; i += steps[si])
      if (!seen[i]) { seen[i] = 1; order.push(i); }

  var next = 0, ativos = 0;
  function pump() {
    while (next < order.length && ativos < CONCORRENCIA) {
      (function (idx) {
        ativos++;
        var img = new Image();
        img.decoding = "async";
        img.onload = img.onerror = function () {
          if (img.naturalWidth) { ready[idx] = 1; drawn = -1; }
          ativos--; pump();
        };
        img.src = "/collar/f" + ("00" + idx).slice(-3) + ".webp";
        images[idx] = img;
      })(order[next++]);
    }
  }
  pump();

  function maisProximoPronto(i) {
    if (ready[i]) return i;
    for (var d = 1; d <= TOTAL >> 1; d++) {
      var e = (i - d + TOTAL) % TOTAL; if (ready[e]) return e;
      var r = (i + d) % TOTAL;         if (ready[r]) return r;
    }
    return -1;
  }

  var current = 0, target = 0, hovering = false, last = performance.now();
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var onFrame = opts.onFrame || function () {};

  function draw(index) {
    var i = ((Math.round(index) % TOTAL) + TOTAL) % TOTAL;
    var f = maisProximoPronto(i);
    if (f < 0 || f === drawn) return;
    ctx.drawImage(images[f], 0, 0, canvas.width, canvas.height);
    drawn = f;
    onFrame(i, TOTAL);
  }

  function tick(now) {
    var dt = Math.min(now - last, 64); last = now;
    if (!hovering && !reduce) target += (dt / (opts.idleMs || 14000)) * TOTAL;
    current += (target - current) * (1 - Math.exp(-dt / 90));
    draw(current);
    requestAnimationFrame(tick);
  }

  scene.addEventListener("pointermove", function (e) {
    var r = scene.getBoundingClientRect();
    if (!r.width) return;
    hovering = true;
    scene.classList.add("engaged");
    var ratio = (e.clientX - r.left) / r.width;
    ratio = ratio < 0 ? 0 : ratio > 1 ? 1 : ratio;
    var raw = ratio * TOTAL;
    target = raw + Math.round((current - raw) / TOTAL) * TOTAL;
  }, { passive: true });

  scene.addEventListener("pointerleave", function () { hovering = false; });
  requestAnimationFrame(tick);
};
