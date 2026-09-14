/* 右上角的音效栏。声音全部是浏览器里实时合成的，不用下载音频文件。
   要加新声音：在下面 SOUNDS 里加一项，写一个 make 函数就行。 */
(function () {
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;

  var KEY = 'budroval-sound';
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {} }

  var ctx = null;
  function audio() {
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* ---------- 噪声素材 ---------- */
  // 粉红噪声：比白噪声柔，低频多一点，听着不刺耳
  function pinkBuffer(c, seconds) {
    var len = c.sampleRate * seconds, buf = c.createBuffer(2, len, c.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch), b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (var i = 0; i < len; i++) {
        var w = Math.random() * 2 - 1;
        b0 = .99886 * b0 + w * .0555179; b1 = .99332 * b1 + w * .0750759;
        b2 = .969 * b2 + w * .153852;    b3 = .8665 * b3 + w * .3104856;
        b4 = .55 * b4 + w * .5329522;    b5 = -.7616 * b5 - w * .016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362) * .11;
        b6 = w * .115926;
      }
    }
    return buf;
  }
  // 褐噪声：更闷，当远处的雨幕
  function brownBuffer(c, seconds) {
    var len = c.sampleRate * seconds, buf = c.createBuffer(2, len, c.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch), last = 0;
      for (var i = 0; i < len; i++) {
        last = (last + .02 * (Math.random() * 2 - 1)) / 1.02;
        d[i] = last * 3.5;
      }
    }
    return buf;
  }
  function loop(c, buf) {
    var s = c.createBufferSource();
    s.buffer = buf; s.loop = true;
    s.offset = Math.random() * buf.duration;           // 两层错开起点，避免听出同一段
    return s;
  }

  /* ---------- 雨 ---------- */
  function makeRain(c, out) {
    var nodes = [];

    // 1) 沙沙的主体
    var hiss = loop(c, pinkBuffer(c, 6));
    var hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 400;
    var lp = c.createBiquadFilter(); lp.type = 'lowpass';  lp.frequency.value = 3800;
    var hissGain = c.createGain(); hissGain.gain.value = .55;
    hiss.connect(hp); hp.connect(lp); lp.connect(hissGain); hissGain.connect(out);

    // 2) 远处的雨幕，低沉
    var body = loop(c, brownBuffer(c, 7));
    var blp = c.createBiquadFilter(); blp.type = 'lowpass'; blp.frequency.value = 520;
    var bodyGain = c.createGain(); bodyGain.gain.value = .35;
    body.connect(blp); blp.connect(bodyGain); bodyGain.connect(out);

    // 雨势慢慢起伏：两个很慢的 LFO 叠在主体音量上
    var lfo1 = c.createOscillator(); lfo1.frequency.value = .043;
    var lfo2 = c.createOscillator(); lfo2.frequency.value = .11;
    var l1g = c.createGain(); l1g.gain.value = .12;
    var l2g = c.createGain(); l2g.gain.value = .05;
    lfo1.connect(l1g); l1g.connect(hissGain.gain);
    lfo2.connect(l2g); l2g.connect(hissGain.gain);

    hiss.start(0, hiss.offset); body.start(0, body.offset); lfo1.start(); lfo2.start();
    nodes.push(hiss, body, lfo1, lfo2);

    // 3) 雨点：随机的短促滴答，淅淅沥沥全靠这层
    var tick = c.createBuffer(1, Math.floor(c.sampleRate * .06), c.sampleRate);
    var td = tick.getChannelData(0);
    for (var i = 0; i < td.length; i++) td[i] = Math.random() * 2 - 1;

    var dropBus = c.createGain(); dropBus.gain.value = .5; dropBus.connect(out);
    var next = c.currentTime + .1, timer;

    function drop(t) {
      var s = c.createBufferSource(); s.buffer = tick;
      var heavy = Math.random() < .12;
      var f = c.createBiquadFilter(); f.type = 'bandpass';
      f.frequency.value = heavy ? 700 + Math.random() * 900 : 1800 + Math.random() * 4200;
      f.Q.value = heavy ? 2 : 1.2 + Math.random() * 3;
      var g = c.createGain();
      var peak = (heavy ? .5 : .16) * (.35 + Math.random() * .65);
      var decay = heavy ? .05 + Math.random() * .05 : .008 + Math.random() * .03;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + .002);
      g.gain.exponentialRampToValueAtTime(.0001, t + decay);
      var chain = f;
      if (c.createStereoPanner) {
        var p = c.createStereoPanner(); p.pan.value = Math.random() * 1.6 - .8;
        f.connect(p); chain = p;
      }
      s.connect(f); chain.connect(g); g.connect(dropBus);
      s.start(t); s.stop(t + decay + .02);
    }

    // 用"往前排一段"的方式调度：后台标签页里定时器会被压到一秒一次，排得够远就不会断
    function schedule() {
      var horizon = c.currentTime + 1.6;
      while (next < horizon) {
        drop(next);
        next += -Math.log(1 - Math.random()) / 28;   // 平均每秒 28 滴，间隔随机
      }
    }
    schedule();
    timer = setInterval(schedule, 250);

    return {
      stop: function (at) {
        clearInterval(timer);
        for (var k = 0; k < nodes.length; k++) { try { nodes[k].stop(at); } catch (e) {} }
      }
    };
  }

  /* ---------- 声音清单：以后加新声音往这儿加 ---------- */
  var SOUNDS = [
    { id: 'rain', name: '雨声', make: makeRain }
  ];

  /* ---------- 播放控制 ---------- */
  var playing = {};    // id -> { gain, handle }

  function setVol(id, v) {
    saved[id] = saved[id] || {};
    saved[id].vol = v; save();
    if (playing[id]) playing[id].gain.gain.setTargetAtTime(v, ctx.currentTime, .15);
  }

  function start(id) {
    if (playing[id]) return;
    var def = SOUNDS.filter(function (s) { return s.id === id; })[0];
    var c = audio();
    var g = c.createGain();
    g.gain.value = 0;
    g.connect(c.destination);
    var vol = (saved[id] && saved[id].vol != null) ? saved[id].vol : .5;
    g.gain.setTargetAtTime(vol, c.currentTime, .6);       // 慢慢淡入，不会"砰"地响起来
    playing[id] = { gain: g, handle: def.make(c, g) };
    saved[id] = saved[id] || {}; saved[id].on = true; save();
    refresh();
  }

  function stop(id) {
    var p = playing[id];
    if (!p) return;
    var t = ctx.currentTime;
    p.gain.gain.setTargetAtTime(0, t, .4);                // 淡出
    p.handle.stop(t + 2);
    setTimeout(function () { p.gain.disconnect(); }, 2200);
    delete playing[id];
    saved[id] = saved[id] || {}; saved[id].on = false; save();
    refresh();
  }

  /* ---------- 界面 ---------- */
  var ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
             '<path d="M7 15a4 4 0 0 1-.6-7.96A5.5 5.5 0 0 1 17 8a3.5 3.5 0 0 1 .5 6.97"/>' +
             '<path d="M9 18l-1 2M13 17l-1 2.5M17 18l-1 2"/></svg>';

  var wrap = document.createElement('div');
  wrap.className = 'sfx';
  var btn = document.createElement('button');
  btn.className = 'sfx-btn';
  btn.type = 'button';
  btn.title = '音效';
  btn.setAttribute('aria-label', '音效');
  btn.innerHTML = ICON;

  var panel = document.createElement('div');
  panel.className = 'sfx-panel';
  panel.hidden = true;

  var rowsHtml = '<div class="sfx-title">音效</div>';
  SOUNDS.forEach(function (s) {
    var vol = (saved[s.id] && saved[s.id].vol != null) ? saved[s.id].vol : .5;
    rowsHtml +=
      '<div class="sfx-row" data-id="' + s.id + '">' +
        '<button type="button" class="sfx-toggle" aria-pressed="false">' +
          '<span class="sfx-dot"></span>' + s.name +
        '</button>' +
        '<input class="sfx-vol" type="range" min="0" max="1" step="0.01" value="' + vol + '" aria-label="' + s.name + '音量">' +
      '</div>';
  });
  rowsHtml += '<div class="sfx-hint">更多声音以后再加</div>';
  panel.innerHTML = rowsHtml;

  wrap.appendChild(btn);
  wrap.appendChild(panel);
  document.body.appendChild(wrap);

  function refresh() {
    var any = false;
    [].forEach.call(panel.querySelectorAll('.sfx-row'), function (row) {
      var on = !!playing[row.getAttribute('data-id')];
      any = any || on;
      row.classList.toggle('on', on);
      row.querySelector('.sfx-toggle').setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    btn.classList.toggle('on', any);
  }

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    panel.hidden = !panel.hidden;
  });
  panel.addEventListener('click', function (e) { e.stopPropagation(); });
  document.addEventListener('click', function () { panel.hidden = true; });

  panel.addEventListener('click', function (e) {
    var t = e.target.closest('.sfx-toggle');
    if (!t) return;
    var id = t.parentNode.getAttribute('data-id');
    playing[id] ? stop(id) : start(id);
  });
  panel.addEventListener('input', function (e) {
    if (!e.target.classList.contains('sfx-vol')) return;
    setVol(e.target.parentNode.getAttribute('data-id'), parseFloat(e.target.value));
  });

  /* 上次开着的，这次接着放。
     浏览器不允许网页没被点过就出声，所以要等你在页面上点一下或按个键 */
  var wanted = SOUNDS.filter(function (s) { return saved[s.id] && saved[s.id].on; });
  if (wanted.length) {
    btn.classList.add('pending');
    btn.title = '点一下页面任意位置，继续播放上次开着的声音';
    var resume = function (e) {
      removeEventListener('pointerdown', resume, true);
      removeEventListener('keydown', resume, true);
      btn.classList.remove('pending');
      btn.title = '音效';
      // 这一下本来就是点在音效栏上的，交给按钮自己处理，不然会"开了又关"
      if (e && e.target && e.target.closest && e.target.closest('.sfx')) return;
      wanted.forEach(function (s) { start(s.id); });
    };
    addEventListener('pointerdown', resume, true);
    addEventListener('keydown', resume, true);
  }

  refresh();
})();
