/* 右上角的音效栏。
   雨声：4 段窗边实录，按雨的大小排好，横条上 4 个点切换，切换时交叉淡入淡出。
   屋檐滴水：两个水滴单音，隔 0.8~4 秒随机滴一下。
   素材都来自 OpenGameArt.org，CC0 许可。 */
(function () {
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;

  var BASE = new URL('.', (document.currentScript && document.currentScript.src) || location.href).href;

  var RAIN_LEVELS = [
    // gain：几段录音原本的响度差了 17dB，这里拉近一点，只保留"越大越响一些"
    { src: 'sounds/rain-lv1.mp3', gain: 2.8,  label: '毛毛雨' },
    { src: 'sounds/rain-lv2.mp3', gain: 1.58, label: '小雨' },
    { src: 'sounds/rain-lv3.mp3', gain: 1.3,  label: '中雨' },
    { src: 'sounds/rain-lv4.mp3', gain: 1.0,  label: '大雨' }
  ];
  var DRIPS = ['sounds/drip-1.ogg', 'sounds/drip-2.ogg'];

  /* ---------- 记住上次的设置 ---------- */
  var KEY = 'budroval-sound';
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  saved.rain = saved.rain || {};
  saved.drip = saved.drip || {};
  if (saved.rain.vol == null) saved.rain.vol = .6;
  if (saved.rain.level == null) saved.rain.level = 1;
  if (saved.drip.vol == null) saved.drip.vol = .6;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {} }

  // 人耳听音量是对数的，滑块直接当音量用的话，拖到一半听着几乎没变化
  function curve(v) { return v * v; }

  var ctx = null;
  function audio() {
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  var buffers = {};
  function load(path) {
    if (!buffers[path]) {
      buffers[path] = fetch(BASE + path)
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(function (a) { return new Promise(function (ok, bad) { audio().decodeAudioData(a, ok, bad); }); });
      buffers[path].catch(function () { delete buffers[path]; showError(); });
    }
    return buffers[path];
  }

  /* ---------- 无缝循环：首尾交叠 1.5 秒做等功率交叉淡化 ----------
     mp3 编码时首尾会补一小段静音，直接 loop 会在接头处"咔"一下，交叠着放就听不出来 */
  var FADE = 1.5, UP = new Float32Array(64), DOWN = new Float32Array(64);
  for (var i = 0; i < 64; i++) {
    UP[i] = Math.sin(i / 63 * Math.PI / 2);
    DOWN[i] = Math.cos(i / 63 * Math.PI / 2);
  }

  function looper(c, buf, out) {
    var dur = buf.duration, next = c.currentTime + .05, live = [], timer;
    function seg(t) {
      var s = c.createBufferSource(), g = c.createGain();
      s.buffer = buf;
      g.gain.setValueCurveAtTime(UP, t, FADE);
      g.gain.setValueCurveAtTime(DOWN, t + dur - FADE, FADE);
      s.connect(g); g.connect(out);
      s.start(t); s.stop(t + dur + .05);
      live.push(s);
      s.onended = function () { var k = live.indexOf(s); if (k >= 0) live.splice(k, 1); g.disconnect(); };
    }
    function schedule() {
      // 往前排一整段：后台标签页里定时器一秒才跑一次，也不会断
      while (next < c.currentTime + dur) { seg(next); next += dur - FADE; }
    }
    schedule();
    timer = setInterval(schedule, 1000);
    return { stop: function (t) { clearInterval(timer); live.forEach(function (s) { try { s.stop(t); } catch (e) {} }); } };
  }

  /* ---------- 雨 ---------- */
  var rain = null;   // { master, layers: [{level, gain, loop}] }

  function rainLevel(level) {
    var c = audio(), r = rain, def = RAIN_LEVELS[level];
    load(def.src).then(function (buf) {
      if (rain !== r || !rain) return;                    // 等解码的时候已经关掉了
      if (saved.rain.level !== level) return;             // 等解码的时候又换档了
      var t = c.currentTime;
      rain.layers.forEach(function (L) {                  // 旧的慢慢淡出
        L.gain.gain.cancelScheduledValues(t);
        L.gain.gain.setTargetAtTime(0, t, .8);
        L.loop.stop(t + 4);
      });
      var g = c.createGain();
      g.gain.value = 0;
      g.gain.setTargetAtTime(def.gain, t, .8);            // 新的慢慢淡入
      g.connect(rain.master);
      rain.layers = [{ level: level, gain: g, loop: looper(c, buf, g) }];
    });
    // 旁边两档先解码好，切换时不用等
    [level - 1, level + 1].forEach(function (n) { if (RAIN_LEVELS[n]) load(RAIN_LEVELS[n].src); });
  }

  function rainOn() {
    if (rain) return;
    var c = audio(), m = c.createGain();
    m.gain.value = 0;
    m.gain.setTargetAtTime(curve(saved.rain.vol), c.currentTime, .6);
    m.connect(c.destination);
    rain = { master: m, layers: [] };
    rainLevel(saved.rain.level);
    saved.rain.on = true; save(); refresh();
  }

  function rainOff() {
    if (!rain) return;
    var c = ctx, r = rain, t = c.currentTime;
    r.master.gain.setTargetAtTime(0, t, .5);
    r.layers.forEach(function (L) { L.loop.stop(t + 3); });
    setTimeout(function () { r.master.disconnect(); }, 3200);
    rain = null;
    saved.rain.on = false; save(); refresh();
  }

  /* ---------- 屋檐滴水 ---------- */
  var drip = null;   // { master, timer, next }

  function dripOn() {
    if (drip) return;
    var c = audio(), m = c.createGain();
    m.gain.value = curve(saved.drip.vol);
    m.connect(c.destination);
    drip = { master: m, next: c.currentTime + .6, timer: null };
    var d = drip;
    Promise.all(DRIPS.map(load)).then(function (bufs) {
      if (drip !== d) return;
      d.next = c.currentTime + .3;                        // 从加载完那一刻起算，别把等待期间"欠"的水滴一口气补上
      function one(t) {
        var s = c.createBufferSource(), g = c.createGain();
        s.buffer = bufs[(Math.random() * bufs.length) | 0];
        s.playbackRate.value = .85 + Math.random() * .3;  // 音高偏一点点，不会每滴都一样
        g.gain.value = .35 + Math.random() * .6;
        var tail = g;
        if (c.createStereoPanner) {
          var p = c.createStereoPanner(); p.pan.value = Math.random() * 1.2 - .6;
          g.connect(p); tail = p;
        }
        s.connect(g); tail.connect(d.master);
        s.start(t);
      }
      function schedule() {
        while (d.next < c.currentTime + 5) {
          one(d.next);
          d.next += .8 + Math.random() * 3.2;
        }
      }
      schedule();
      d.timer = setInterval(schedule, 1000);
    });
    saved.drip.on = true; save(); refresh();
  }

  function dripOff() {
    if (!drip) return;
    var d = drip;
    clearInterval(d.timer);
    d.master.gain.setTargetAtTime(0, ctx.currentTime, .3);
    setTimeout(function () { d.master.disconnect(); }, 1500);
    drip = null;
    saved.drip.on = false; save(); refresh();
  }

  /* ---------- 界面 ---------- */
  var ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
             '<path d="M7 15a4 4 0 0 1-.6-7.96A5.5 5.5 0 0 1 17 8a3.5 3.5 0 0 1 .5 6.97"/>' +
             '<path d="M9 18l-1 2M13 17l-1 2.5M17 18l-1 2"/></svg>';

  var wrap = document.createElement('div');
  wrap.className = 'sfx';
  wrap.innerHTML =
    '<button type="button" class="sfx-btn" title="音效" aria-label="音效">' + ICON + '</button>' +
    '<div class="sfx-panel" hidden>' +
      '<div class="sfx-title">音效</div>' +

      '<div class="sfx-block" data-id="rain">' +
        '<button type="button" class="sfx-toggle"><span class="sfx-dot"></span>雨声</button>' +
        '<div class="sfx-levels" role="radiogroup" aria-label="雨的大小">' +
          '<div class="sfx-track"><div class="sfx-fill"></div></div>' +
          RAIN_LEVELS.map(function (L, n) {
            return '<button type="button" class="sfx-node" data-level="' + n + '" role="radio" title="' + L.label + '" aria-label="' + L.label + '"></button>';
          }).join('') +
        '</div>' +
        '<div class="sfx-level-names"><span>小</span><span class="sfx-level-now"></span><span>大</span></div>' +
        '<label class="sfx-vol-row">音量<input class="sfx-vol" type="range" min="0" max="1" step="0.01" value="' + saved.rain.vol + '"></label>' +
      '</div>' +

      '<div class="sfx-block" data-id="drip">' +
        '<button type="button" class="sfx-toggle"><span class="sfx-dot"></span>屋檐滴水</button>' +
        '<label class="sfx-vol-row">音量<input class="sfx-vol" type="range" min="0" max="1" step="0.01" value="' + saved.drip.vol + '"></label>' +
      '</div>' +

      '<div class="sfx-hint"></div>' +
    '</div>';
  document.body.appendChild(wrap);

  var btn = wrap.querySelector('.sfx-btn');
  var panel = wrap.querySelector('.sfx-panel');
  var hint = wrap.querySelector('.sfx-hint');

  function showError() {
    hint.textContent = location.protocol === 'file:'
      ? '直接双击打开的本地页面放不了声音，推上线之后就能听'
      : '声音文件没加载出来，刷新一下试试';
  }

  function refresh() {
    var rb = wrap.querySelector('[data-id="rain"]'), db = wrap.querySelector('[data-id="drip"]');
    rb.classList.toggle('on', !!rain);
    db.classList.toggle('on', !!drip);
    var lv = saved.rain.level;
    [].forEach.call(wrap.querySelectorAll('.sfx-node'), function (n) {
      var k = +n.getAttribute('data-level');
      n.classList.toggle('active', k === lv);
      n.classList.toggle('passed', k < lv);
      n.setAttribute('aria-checked', k === lv ? 'true' : 'false');
    });
    wrap.querySelector('.sfx-fill').style.width = (lv / (RAIN_LEVELS.length - 1) * 100) + '%';
    wrap.querySelector('.sfx-level-now').textContent = RAIN_LEVELS[lv].label;
    btn.classList.toggle('on', !!(rain || drip));
  }

  btn.addEventListener('click', function (e) { e.stopPropagation(); panel.hidden = !panel.hidden; });
  panel.addEventListener('click', function (e) { e.stopPropagation(); });
  document.addEventListener('click', function () { panel.hidden = true; });

  panel.addEventListener('click', function (e) {
    var tg = e.target.closest('.sfx-toggle');
    if (tg) {
      var id = tg.parentNode.getAttribute('data-id');
      if (id === 'rain') rain ? rainOff() : rainOn();
      else drip ? dripOff() : dripOn();
      return;
    }
    var node = e.target.closest('.sfx-node');
    if (node) {
      var lv = +node.getAttribute('data-level');
      if (lv === saved.rain.level && rain) return;
      saved.rain.level = lv; save(); refresh();
      rain ? rainLevel(lv) : rainOn();                    // 点档位就当你想听雨了
    }
  });

  panel.addEventListener('input', function (e) {
    if (!e.target.classList.contains('sfx-vol')) return;
    var id = e.target.closest('.sfx-block').getAttribute('data-id');
    var v = parseFloat(e.target.value);
    saved[id].vol = v; save();
    var node = id === 'rain' ? (rain && rain.master) : (drip && drip.master);
    if (node) node.gain.setTargetAtTime(curve(v), ctx.currentTime, .08);
  });

  /* 上次开着的，这次接着放。浏览器不允许网页没被点过就出声，所以要等你点一下页面 */
  if (saved.rain.on || saved.drip.on) {
    btn.classList.add('pending');
    btn.title = '点一下页面任意位置，继续播放上次开着的声音';
    var resume = function (e) {
      removeEventListener('pointerdown', resume, true);
      removeEventListener('keydown', resume, true);
      btn.classList.remove('pending');
      btn.title = '音效';
      if (e && e.target && e.target.closest && e.target.closest('.sfx')) return;  // 点的就是音效栏，交给它自己处理
      if (saved.rain.on) rainOn();
      if (saved.drip.on) dripOn();
    };
    addEventListener('pointerdown', resume, true);
    addEventListener('keydown', resume, true);
  }

  refresh();
})();
