# 我的小站

## 本地预览
双击 `index.html`，浏览器打开就能看。改完文件刷新页面（F5）即可。

## 文件说明
```
site/
├── index.html          首页（自我介绍、作品列表、随手写）
├── style.css           所有页面共用的样式，改颜色/字号来这儿
├── images/             图片都放这里
└── projects/
    └── deskpet.html    作品详情页，加新作品就复制这个文件改
```

## 常见改动
- **换名字/介绍** → `index.html` 里 `<header class="site-head">` 那一块
- **加作品** → `index.html` 里复制一整块 `<a class="card">…</a>`，再复制 `projects/deskpet.html` 改成新页面
- **加图片** → 图片丢进 `images/`，用 `<img src="images/文件名.png" alt="说明">` 引用
- **换配色** → `style.css` 最上面 `:root` 里的颜色值

## 上线（GitHub Pages）
1. 注册 GitHub，新建仓库，名字取 `你的用户名.github.io`，选 Public
2. 把 `site/` 里的**所有文件**传上去（注意是里面的文件，不是 site 文件夹本身）
3. 仓库 Settings → Pages → Branch 选 `main` → Save
4. 等 1~2 分钟，访问 `https://你的用户名.github.io`

以后更新：
```bash
git add -A && git commit -m "update" && git push
```
