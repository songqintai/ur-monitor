# GitHub Pages 部署方法（免费、每日自动更新）

这套方案跟 `server.js`/`monitor.js` 是独立的——不需要任何常驻服务器，
完全免费，适合"每天更新一次、给别人访问"的场景。

## 原理

```
GitHub Actions（每天 JST 0:00 自动触发）
   ↓ 运行 scripts/fetchData.js
   ↓ 抓取东京都23区数据，写入 docs/data/rooms.json
   ↓ 自动 git commit 提交这个文件
GitHub Pages（托管 docs/ 文件夹）
   ↓ docs/index.html 打开时直接 fetch 这份 JSON
   ↓ 搜索/筛选全部在浏览器端完成，不发任何请求给UR或任何后端
```

## 部署步骤

### 1. 建仓库、推代码

```bash
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/你的用户名/ur-monitor.git
git push -u origin main
```

仓库必须是**公开(Public)**的才能免费使用 GitHub Actions 的完整额度。

### 2. 开启 GitHub Pages

进入仓库的 Settings → Pages：
- Source 选 "Deploy from a branch"
- Branch 选 `main`，文件夹选 `/docs`
- 保存后，GitHub 会给一个形如 `https://你的用户名.github.io/ur-monitor/` 的网址

### 3. 手动触发一次，验证流程

进入仓库的 Actions 标签页 → 左侧选择"每日抓取UR房源数据" → 右侧点击
"Run workflow"手动跑一次（不用等到半夜）。跑完之后检查：
- Actions 页面这次运行是绿色✅（没报错）
- 仓库里 `docs/data/rooms.json` 的内容被更新了（可以在仓库文件列表里直接看）
- 打开 GitHub Pages 网址，应该能看到数据了

### 4. 之后就不用管了

每天日本时间 0 点，GitHub Actions 会自动跑一次，抓新数据、提交、
GitHub Pages 网站自动跟着更新。不需要你做任何操作。

## 跟本地版本(`server.js`)的区别

| | `server.js`（本地/常驻服务器） | `docs/`（GitHub Pages） |
|---|---|---|
| 运行方式 | 常驻进程，一直挂着 | 无服务器，纯静态文件 |
| 数据刷新 | 代码里设定的间隔 | Actions 的 cron 时间表 |
| 部署成本 | 需要付费云主机 | 完全免费 |
| 检索方式 | 请求服务器接口 `/api/rooms` | 浏览器直接过滤已加载的 JSON |
| 适合场景 | 自己本地用、想要更灵活的刷新频率 | 想公开给别人访问、预算是0 |

两套代码可以同时存在，互不影响——`docs/` 文件夹是专门给 GitHub Pages 用的，
不会干扰你本地跑 `node server.js` 的用法。

## 修改刷新时间

改 `.github/workflows/fetch-data.yml` 里的 cron 表达式。注意 GitHub Actions
的 cron 用的是 **UTC 时间**，日本时间(JST)是 UTC+9：

```yaml
schedule:
  - cron: '0 15 * * *'  # UTC 15:00 = JST 次日 0:00
```

比如想改成每天 JST 早上7点：`UTC 22:00` → `cron: '0 22 * * *'`

## 常见问题

- **Actions 没有按时触发**：GitHub Actions 的定时任务在系统繁忙时可能延迟几分钟到十几分钟，
  这是 GitHub 的已知限制，免费额度下无法保证分钟级精确，但对"每天一次"这种低频任务基本没影响。
- **想立刻更新一次，不想等到明天**：去 Actions 页面手动点 "Run workflow" 就行（第3步提到的那个按钮）。
- **`docs/data/rooms.json` 一直没被更新**：去 Actions 页面看那次运行的日志，
  通常是抓取过程本身报错（比如 UR 网站改版），把报错信息发给我，一起排查。
