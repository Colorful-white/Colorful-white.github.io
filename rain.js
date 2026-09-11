/* 首页的雨 + 两栏中间那块玻璃界线
   页面里要有这四个元素：.glow / #far / #near / #glass
   玻璃会自动对齐到 .layout 里 main 和 aside 中间；窄屏不画 */
(function () {
  var far = document.getElementById('far');
  var near = document.getElementById('near');
  if (!far || !near) return;

  var slow = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, DPR = 1;

  /* ---------- 背景的雨：远景一层（CSS 糊掉）+ 近景一层 ---------- */
  var L = [
    { cv: far,  ctx: null, drops: [], dense: 185, spMin: 1.1, spVar: 2.2, lenMin: 5,  lenVar: 15, wMin: .22, wVar: .26, aMin: .075, aVar: .11 },
    { cv: near, ctx: null, drops: [], dense: 760, spMin: 3.0, spVar: 5.0, lenMin: 10, lenVar: 30, wMin: .32, wVar: .52, aMin: .085, aVar: .17 }
  ];
  for (var q = 0; q < L.length; q++) L[q].ctx = L[q].cv.getContext('2d');

  // 亮度：底下有片光池，中间极淡的一道竖光
  function litOf(x, y) {
    var t = y / H;
    var k = Math.abs(x - (.46 + .10 * t) * W) / ((.16 + .24 * t) * W);
    var beam = k < 1 ? (1 - k * k) * .30 : 0;
    var pool = t < .45 ? 0 : Math.pow((t - .45) / .55, 1.5);
    return Math.min(1.5, .45 + beam + pool * 1.15);
  }

  function newDrop(l, spread) {
    var layer = Math.pow(Math.random(), .75);
    var streak = Math.random() < .12 ? 2.2 + Math.random() * 1.6 : 1;   // 一成是长条
    return {
      x: Math.random() * W * 1.25 - W * .12,
      y: spread ? Math.random() * H : -Math.random() * H * .5,
      len: (l.lenMin + layer * l.lenVar) * streak,
      sp: (l.spMin + layer * l.spVar) * (H / 900),
      w: l.wMin + layer * l.wVar,
      a: (l.aMin + layer * l.aVar) / (streak > 1 ? 1.9 : 1),
      floor: H * (.70 + Math.random() * .30),    // 每滴自己的落点，所以没有一条地面线
      layer: layer
    };
  }

  // 上万条线一条条 stroke 会卡，按「粗细 × 亮度」分 24 档，每档只画一次
  var W_TIERS = 3, A_TIERS = 8, LINE_W = [.22, .4, .62];
  var paths = new Array(W_TIERS * A_TIERS);
  var splashes = [];

  function drawLayer(l, isNear) {
    var ctx = l.ctx;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (var b = 0; b < paths.length; b++) paths[b] = null;

    for (var i = 0; i < l.drops.length; i++) {
      var d = l.drops[i];
      d.y += slow ? d.sp * .25 : d.sp;
      d.x += d.sp * .12;                          // 一点点风

      var lit = litOf(d.x, d.y);
      var a = Math.min(.8, d.a * (.55 + lit * 2.1));

      var wt = d.w < .32 ? 0 : (d.w < .52 ? 1 : 2);
      var at = Math.min(A_TIERS - 1, (a / .8 * A_TIERS) | 0);
      var p = paths[wt * A_TIERS + at] || (paths[wt * A_TIERS + at] = new Path2D());
      p.moveTo(d.x, d.y);
      p.lineTo(d.x - d.sp * .35, d.y - d.len);

      if (d.y >= d.floor) {
        if (isNear && Math.random() < .5) {
          var n = 1 + (Math.random() * 3 | 0);
          for (var s = 0; s < n; s++) {
            splashes.push({
              x: d.x, y: d.floor,
              vx: (Math.random() - .5) * 1.8,
              vy: -(.5 + Math.random() * 1.5),
              life: 1, sz: .3 + Math.random() * .8 * (.5 + d.layer), lit: lit
            });
          }
        }
        l.drops[i] = newDrop(l, false);
      }
    }

    for (var wi = 0; wi < W_TIERS; wi++) {
      for (var ai = 0; ai < A_TIERS; ai++) {
        var pp = paths[wi * A_TIERS + ai];
        if (!pp) continue;
        ctx.strokeStyle = 'rgba(196,222,255,' + ((ai + .5) / A_TIERS * .8) + ')';
        ctx.lineWidth = LINE_W[wi];
        ctx.stroke(pp);
      }
    }
  }

  function drawSplashes(ctx) {
    ctx.globalCompositeOperation = 'lighter';
    for (var i = splashes.length - 1; i >= 0; i--) {
      var p = splashes[i];
      p.vy += .09;                                // 重力，走抛物线
      p.x += p.vx; p.y += p.vy; p.life -= .024;
      if (p.life <= 0) { splashes.splice(i, 1); continue; }
      ctx.fillStyle = 'rgba(205,230,255,' + (p.life * (.10 + p.lit * .55)) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.sz * p.life, 0, 6.284);
      ctx.fill();
    }
  }

  /* ---------- 中间那块玻璃 ---------- */
  var gcv = document.getElementById('glass');
  var gx = gcv ? gcv.getContext('2d') : null;
  var GW = 150, GH = 0;
  var stuck = [], runners = [], trail = null, tx = null, glassOn = false;

  function placeGlass() {
    glassOn = false;
    if (!gcv) return;
    var side = document.querySelector('.layout > aside');
    var main = document.querySelector('.layout > main');
    if (!side || !main || innerWidth <= 900) return;

    var a = main.getBoundingClientRect(), b = side.getBoundingClientRect();
    GH = innerHeight;
    gcv.width = GW * DPR; gcv.height = GH * DPR;
    gcv.style.width = GW + 'px'; gcv.style.height = GH + 'px';
    gcv.style.left = Math.round((a.right + b.left) / 2 - GW / 2) + 'px';
    gx.setTransform(DPR, 0, 0, DPR, 0, 0);

    trail = document.createElement('canvas');
    trail.width = GW * DPR; trail.height = GH * DPR;
    tx = trail.getContext('2d');
    tx.setTransform(DPR, 0, 0, DPR, 0, 0);
    glassOn = true;
  }

  function stickDrop() {
    stuck.push({
      x: 6 + Math.random() * (GW - 12),
      y: Math.random() * GH,
      r: .5 + Math.random() * 2.6,
      a: .25 + Math.random() * .45
    });
    if (stuck.length > 280) stuck.shift();
  }

  function drawGlass() {
    if (!glassOn) return;

    // 水痕慢慢干掉
    tx.globalCompositeOperation = 'destination-out';
    tx.fillStyle = 'rgba(0,0,0,.005)';
    tx.fillRect(0, 0, GW, GH);
    tx.globalCompositeOperation = 'source-over';

    if (Math.random() < .85) stickDrop();

    // 挂住的够大就开始往下滑
    for (var i = stuck.length - 1; i >= 0; i--) {
      if (stuck[i].r > 1.6 && Math.random() < .035) {
        runners.push({ x: stuck[i].x, y: stuck[i].y, r: stuck[i].r, v: .2, wob: Math.random() * 6.28 });
        stuck.splice(i, 1);
      }
    }

    // 往下滑：留水痕、吃掉路过的小水珠、越滑越快
    for (var j = runners.length - 1; j >= 0; j--) {
      var r = runners[j];
      r.v = Math.min(3.2, r.v + .028 + r.r * .004);   // 加速但有上限，不会越掉越野
      r.wob += .045;
      r.y += r.v;
      r.x += Math.sin(r.wob) * .09;                  // 只剩一丝丝摆动

      tx.fillStyle = 'rgba(176,214,255,.42)';
      tx.beginPath();
      tx.arc(r.x, r.y, Math.max(.6, r.r * .42), 0, 6.284);
      tx.fill();

      for (var k = stuck.length - 1; k >= 0; k--) {
        var t = stuck[k];
        if (Math.abs(t.x - r.x) < r.r + t.r && Math.abs(t.y - r.y) < r.r + t.r + 2) {
          r.r = Math.min(5.5, Math.sqrt(r.r * r.r + t.r * t.r));
          stuck.splice(k, 1);
        }
      }
      if (r.y > GH + 10) runners.splice(j, 1);
    }

    // 玻璃本身完全透明，不铺任何底色——那层白雾就是从这儿来的
    gx.clearRect(0, 0, GW, GH);
    gx.globalCompositeOperation = 'lighter';
    gx.drawImage(trail, 0, 0, GW, GH);

    for (var m = 0; m < stuck.length; m++) {
      var s = stuck[m];
      s.r += .004;                                 // 慢慢积大，直到够重
      var rg = gx.createRadialGradient(s.x - s.r * .3, s.y - s.r * .3, 0, s.x, s.y, s.r * 1.8);
      rg.addColorStop(0, 'rgba(215,238,255,' + (s.a * .9) + ')');
      rg.addColorStop(.6, 'rgba(150,200,255,' + (s.a * .25) + ')');
      rg.addColorStop(1, 'rgba(120,170,235,0)');
      gx.fillStyle = rg;
      gx.beginPath();
      gx.arc(s.x, s.y, s.r * 1.8, 0, 6.284);
      gx.fill();
    }

    for (var n2 = 0; n2 < runners.length; n2++) {
      var rr = runners[n2];
      var rg2 = gx.createRadialGradient(rr.x - rr.r * .3, rr.y - rr.r * .4, 0, rr.x, rr.y, rr.r * 2);
      rg2.addColorStop(0, 'rgba(220,240,255,.6)');
      rg2.addColorStop(.55, 'rgba(160,208,255,.3)');
      rg2.addColorStop(1, 'rgba(120,170,235,0)');
      gx.fillStyle = rg2;
      gx.beginPath();
      gx.ellipse(rr.x, rr.y, rr.r * 1.6, rr.r * 2.1, 0, 0, 6.284);
      gx.fill();
    }
    gx.globalCompositeOperation = 'source-over';
  }

  /* ---------- 驱动 + 帧率兜底 ---------- */
  var last = 0, slowFrames = 0, scale = 1;

  function trim() {                                // 卡了就自己减雨量，最低到三成
    scale *= .72;
    for (var i = 0; i < L.length; i++) {
      L[i].drops.length = Math.max(120, Math.round(L[i].drops.length * .72));
    }
    if (stuck.length > 120) stuck.length = 120;
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    for (var i = 0; i < L.length; i++) {
      var l = L[i];
      l.cv.width = W * DPR; l.cv.height = H * DPR;
      l.cv.style.width = W + 'px'; l.cv.style.height = H + 'px';
      l.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var n = Math.min(6500, Math.round(W * H / l.dense));
      l.drops.length = 0;
      for (var j = 0; j < n; j++) l.drops.push(newDrop(l, true));
    }
    stuck.length = 0; runners.length = 0;
    scale = 1; slowFrames = 0; last = 0;
    placeGlass();
    if (glassOn) for (var k = 0; k < 140; k++) stickDrop();
  }

  function frame(ts) {
    requestAnimationFrame(frame);
    if (document.hidden) { last = 0; return; }

    if (last) {
      var dt = ts - last;
      if (dt > 23 && scale > .3) {                 // 低于约 43 帧
        if (++slowFrames > 90) { trim(); slowFrames = 0; }
      } else if (slowFrames > 0) slowFrames--;
    }
    last = ts;

    drawLayer(L[0], false);
    drawLayer(L[1], true);
    drawSplashes(L[1].ctx);
    drawGlass();
  }

  var rt;
  addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 150); });
  resize();
  requestAnimationFrame(frame);
})();
