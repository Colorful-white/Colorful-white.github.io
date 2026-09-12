# Colorful-white 的小站

线上地址：https://colorful-white.github.io

## 本地预览
双击 `index.html` 就能看。改完文件刷新页面（F5）即可。

## 文件说明
```
index.html                 首页：介绍 + 作品卡片 + 随手写
style.css                  所有页面共用的样式，改配色/字号来这儿
notes.js                   ★ 随手写的内容，加日记改这个文件
notes-render.js            把 notes.js 排成页面，不用动
rain.js                    首页的雨 + 中间那块玻璃界线
ripple.js                  详情页的地面水波
images/                    图片
projects/
  deskpet.html             桌宠详情页
  phototag.html            PhotoTag 详情页
  matlab.html              MATLAB 学习（待填）
  embedded.html            嵌入式开发（待填）
  football.html            足球联机小游戏（待填）
```

## 常见改动
- **改介绍** → `index.html` 里 `<header class="site-head">` 那一块
- **加一条随手写** → 打开 `notes.js`，照着里面的样子在最上面加一段，不用碰 HTML
- **加作品** → 复制一整块 `<a class="card">…</a>`，再复制一个 `projects/*.html` 改内容
- **主推作品** → 卡片上加 `card--feature` 类，它就占满一行、图文横排
- **像素图** → 图片加 `thumb--pixel` / `pixel` 类，放大后保持硬边不发糊
- **加图片** → 丢进 `images/`，用 `<img src="images/xxx.png" alt="说明">` 引用
- **换配色** → `style.css` 最上面 `:root` 里的色值
- **雨大小/密度** → `rain.js` 顶上 `dense`（数字越小雨越密）、`lenMin/lenVar`（长短）、`wMin/wVar`（粗细）
- **玻璃界线** → 角度在 `style.css` 的 `#glass` 里（`rotateY(26deg)`），宽度和水量在 `rain.js` 的 `GW` 和 `stickDrop`
- **水波** → `ripple.js` 里 `spawn` 的频率和 `max`（圈能扩多大）

雨量太大卡的话不用管——`rain.js` 里有帧率兜底，掉帧会自己减量。

## 更新上线
```bash
git add -A && git commit -m "update" && git push
```
推完等 1 分钟左右生效。
