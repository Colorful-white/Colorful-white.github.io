/* 网页版桌宠：形象和台词都来自 pet-data.js（从桌宠原项目导出的）
   会做的事：溜达、发呆眨眼、被戳一下蹦起来、能拖着走、松手掉下来、
            你太久没动鼠标就自己睡着，一动又醒过来、双击睡觉/叫醒
   没做的：听歌联动——浏览器拿不到系统正在放的声音 */
(function () {
  var D = window.PET_DATA;
  if (!D) return;
  if (innerWidth < 640) return;                    // 手机屏太小，出来会挡字

  var slow = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ZOOM = 3;
  var PW = D.w * ZOOM, PH = D.h * ZOOM;
  var SLEEP_AFTER = 90 * 1000;                     // 多久没动静就睡着

  /* ---------- 把字符画烤成图 ---------- */
  function bake(rows) {
    var c = document.createElement('canvas');
    var w = 0;
    for (var i = 0; i < rows.length; i++) w = Math.max(w, rows[i].length);
    c.width = w * ZOOM; c.height = rows.length * ZOOM;
    var x = c.getContext('2d');
    for (var y = 0; y < rows.length; y++) {
      for (var k = 0; k < rows[y].length; k++) {
        var ch = rows[y][k];
        if (ch === '.' || !D.palette[ch]) continue;
        x.fillStyle = D.palette[ch];
        x.fillRect(k * ZOOM, y * ZOOM, ZOOM, ZOOM);
      }
    }
    return c;
  }

  var FR = {};
  for (var name in D.frames) FR[name] = D.frames[name].map(bake);
  var ZZZ = bake(D.zzz);

  function say(kind) {
    var list = D.lines[kind];
    if (!list || !list.length) return;
    var t = list[(Math.random() * list.length) | 0];
    bubble.textContent = t;
    bubble.style.opacity = '1';
    clearTimeout(say.t);
    say.t = setTimeout(function () { bubble.style.opacity = '0'; }, 3400);
  }

  /* ---------- 元素 ---------- */
  var el = document.createElement('canvas');
  el.width = PW; el.height = PH;
  el.className = 'webpet';
  el.title = '戳一下 · 拖着走 · 双击睡觉';
  var ctx = el.getContext('2d');

  var bubble = document.createElement('div');
  bubble.className = 'webpet-bubble';

  var zz = document.createElement('canvas');
  zz.width = ZZZ.width; zz.height = ZZZ.height;
  zz.className = 'webpet-zzz';
  zz.getContext('2d').drawImage(ZZZ, 0, 0);

  document.body.appendChild(el);
  document.body.appendChild(bubble);
  document.body.appendChild(zz);

  /* ---------- 状态 ---------- */
  var x = PW + Math.random() * Math.max(10, innerWidth - PW * 3);
  var y = 0;                                       // 离地高度，>0 表示在空中
  var vy = 0;
  var dir = Math.random() < .5 ? -1 : 1;
  var state = 'idle', stateUntil = 0;
  var frame = 0, frameAt = 0;
  var lastActive = performance.now();
  var dragging = false, dragDX = 0, dragDY = 0, downAt = 0, moved = false;

  var FPS = { idle: 2, blink: 6, walk: 8, sleep: 1.5, drag: 6, jump: 6, dance: 6, clap: 6 };

  function setState(s, ms) {
    state = s; frame = 0; frameAt = 0;
    stateUntil = ms ? performance.now() + ms : 0;
  }

  function place() {
    el.style.left = Math.round(x) + 'px';
    el.style.bottom = Math.round(y) + 'px';
    bubble.style.left = Math.round(x + PW / 2) + 'px';
    bubble.style.bottom = Math.round(y + PH + 6) + 'px';
    zz.style.left = Math.round(x + PW * .72) + 'px';
    zz.style.bottom = Math.round(y + PH * .78) + 'px';
    zz.style.opacity = state === 'sleep' ? '1' : '0';
  }

  function draw() {
    var seq = FR[state] || FR.idle;
    var img = seq[frame % seq.length];
    ctx.clearRect(0, 0, PW, PH);
    ctx.save();
    if (dir < 0) { ctx.translate(PW, 0); ctx.scale(-1, 1); }
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }

  /* ---------- 该干嘛了 ---------- */
  function decide(now) {
    if (slow) { setState('idle'); return; }
    var r = Math.random();
    if (r < .45) {
      setState('walk', 2500 + Math.random() * 5000);
      if (Math.random() < .35) dir = -dir;
      if (Math.random() < .15) say('walk');
    } else if (r < .55) {
      setState('blink', 400);
    } else if (r < .6) {
      setState('dance', 1600);
    } else {
      setState('idle', 2500 + Math.random() * 4500);
      if (Math.random() < .18) say('idle');
    }
  }

  /* ---------- 交互 ---------- */
  function wake() {
    lastActive = performance.now();
    if (state === 'sleep' && !dragging) { setState('idle', 1200); say('wake'); }
  }
  addEventListener('mousemove', wake, { passive: true });
  addEventListener('keydown', wake);
  addEventListener('scroll', wake, { passive: true });

  el.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    dragging = true; moved = false; downAt = performance.now();
    dragDX = e.clientX - x;
    dragDY = (innerHeight - e.clientY) - y;
    lastActive = downAt;
  });

  el.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var nx = e.clientX - dragDX;
    var ny = (innerHeight - e.clientY) - dragDY;
    if (!moved && Math.abs(nx - x) + Math.abs(ny - y) > 4) {
      moved = true; setState('drag'); say('drag');
    }
    if (moved) {
      x = Math.max(0, Math.min(innerWidth - PW, nx));
      y = Math.max(0, Math.min(innerHeight - PH, ny));
      vy = 0;
    }
  });

  el.addEventListener('pointerup', function () {
    if (!dragging) return;
    dragging = false;
    if (moved) {
      if (y > 0) setState('drag');                 // 在空中继续晃，落地再说话
      else { setState('idle', 1500); say('drop'); }  // 贴着地面拖的，松手就算放下了
    } else {
      if (state === 'sleep') { setState('idle', 1200); say('wake'); }
      else { setState('jump', 700); vy = 6; say('click'); }
    }
  });

  el.addEventListener('dblclick', function () {
    if (state === 'sleep') { setState('idle', 1200); say('wake'); }
    else { setState('sleep'); say('sleep'); }
  });

  addEventListener('resize', function () {
    x = Math.max(0, Math.min(innerWidth - PW, x));
    place();
  });

  /* ---------- 主循环 ---------- */
  var last = performance.now();
  function tick(now) {
    requestAnimationFrame(tick);
    if (document.hidden) { last = now; return; }
    var dt = Math.min(50, now - last); last = now;
    var step = dt / 16.67;

    // 太久没动静就睡
    if (!dragging && state !== 'sleep' && state !== 'drag' && y === 0 &&
        now - lastActive > SLEEP_AFTER) {
      setState('sleep'); say('sleep');
    }

    // 重力：松手后或者被戳跳起来
    if (!dragging && (y > 0 || vy > 0)) {
      vy -= .45 * step;
      y += vy * step;
      if (y <= 0) {
        y = 0; vy = 0;
        if (state === 'drag') { setState('idle', 1500); say('drop'); }
      }
    }

    if (state === 'walk' && !dragging && y === 0) {
      x += dir * .7 * step;
      if (x < 4) { x = 4; dir = 1; }
      if (x > innerWidth - PW - 4) { x = innerWidth - PW - 4; dir = -1; }
    }

    if (stateUntil && now > stateUntil && !dragging && y === 0) decide(now);
    if (!stateUntil && state === 'idle' && !dragging) stateUntil = now + 3000;

    frameAt += dt;
    var fps = FPS[state] || 4;
    if (frameAt > 1000 / fps) { frameAt = 0; frame++; draw(); }

    place();
  }

  place(); draw();
  setTimeout(function () { say('idle'); }, 1800);  // 打开网页先打个招呼
  requestAnimationFrame(tick);
})();
