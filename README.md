# Colorful-white 的小站

线上地址：https://colorful-white.github.io

## 本地预览
双击 `index.html` 就能看。改完文件刷新页面（F5）即可。

## 文件说明
```
index.html                 首页：介绍 + 作品卡片 + 随手写
style.css                  所有页面共用的样式，改配色/字号来这儿
images/                    图片
projects/
  deskpet.html             桌宠详情页
  phototag.html            PhotoTag 详情页
  embedded.html            嵌入式开发（待填）
  football.html            足球联机小游戏（待填）
```

## 常见改动
- **改介绍** → `index.html` 里 `<header class="site-head">` 那一块
- **加作品** → 复制一整块 `<a class="card">…</a>`，再复制一个 `projects/*.html` 改内容
- **主推作品** → 卡片上加 `card--feature` 类，它就占满一行、图文横排
- **像素图** → 图片加 `thumb--pixel` / `pixel` 类，放大后保持硬边不发糊
- **加图片** → 丢进 `images/`，用 `<img src="images/xxx.png" alt="说明">` 引用
- **换配色** → `style.css` 最上面 `:root` 里的色值（深色模式在下面那块）

## 更新上线
```bash
git add -A && git commit -m "update" && git push
```
推完等 1 分钟左右生效。
