/* 详情页：雨停了，只剩地上的水波。页面里要有 #water */
(function () {
  var cv = document.getElementById('water');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var slow = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0;
  var ripples = [];

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // 越靠下 = 离得越近：圈更大更圆；越靠上 = 更小更扁，这样才有地面的透视
  function spawn() {
    var t = Math.pow(Math.random(), .6);
    var y = H * (.12 + t * .84);
    var near = y / H;
    ripples.push({
      x: Math.random() * W,
      y: y,
      r: 1,
      max: (14 + Math.random() * 26) * (.45 + near),
      flat: .13 + near * .2,
      life: 1,
      speed: (.30 + Math.random() * .30) * (.6 + near),
      inner: -0.35                                   // 内圈晚一步出发
    });
  }

  var acc = 0;
  function frame() {
    requestAnimationFrame(frame);
    if (document.hidden) return;

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    // 水面：极淡的一层冷光，暗示有水但没有边界
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(90,150,230,0)');
    g.addColorStop(1, 'rgba(70,130,220,.055)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    acc++;
    if (acc > (slow ? 120 : 34 + Math.random() * 46)) { spawn(); acc = 0; }

    for (var i = ripples.length - 1; i >= 0; i--) {
      var p = ripples[i];
      p.r += p.speed * (slow ? .3 : 1);
      p.inner += p.speed * .012;
      p.life = 1 - p.r / p.max;
      if (p.life <= 0) { ripples.splice(i, 1); continue; }

      var fade = Math.pow(p.life, 1.6);

      ctx.strokeStyle = 'rgba(175,215,255,' + (fade * .5) + ')';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r, p.r * p.flat, 0, 0, 6.284);
      ctx.stroke();

      if (p.inner > 0) {                             // 跟在后面的第二道
        var r2 = p.r * p.inner;
        ctx.strokeStyle = 'rgba(150,200,255,' + (fade * .28) + ')';
        ctx.lineWidth = .9;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, r2, r2 * p.flat, 0, 0, 6.284);
        ctx.stroke();
      }

      if (p.life > .7) {                             // 圈心一点点亮，像水面被顶起来
        var a = (p.life - .7) / .3;
        var rg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 7);
        rg.addColorStop(0, 'rgba(210,238,255,' + (a * .25) + ')');
        rg.addColorStop(1, 'rgba(150,200,255,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(p.x - 7, p.y - 7, 14, 14);
      }
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  var rt;
  addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 150); });
  resize();
  for (var k = 0; k < 4; k++) spawn();
  requestAnimationFrame(frame);
})();
