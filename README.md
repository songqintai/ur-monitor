# UR江東区房源监控

包含三种用法：

## 用法0：公开发布给别人访问（GitHub Pages，免费，每日自动更新）

详见 [DEPLOY_GITHUB_PAGES.md](./DEPLOY_GITHUB_PAGES.md)。不需要服务器，
GitHub Actions 每天定时抓一次数据，GitHub Pages 免费托管网页。

## 用法1：命令行diff监控

```bash
npm install
node monitor.js
```

每次运行会和上一次的 snapshot.json 做对比，打印新增/消失的房源。适合配合 cron 定时跑、检测到新房源后接通知。

## 用法2：网页展示

```bash
npm install
node server.js
```

然后浏览器打开 http://localhost:3000

- 启动时自动抓一次全部东京都23区的数据，**之后固定每1小时自动刷新一次**
- **没有手动触发抓取的入口**——不管是按钮还是接口都不提供，抓取只按固定节奏跑
- 页面上的"検索"按钮（或者在团地名输入框按回车）只从内存缓存里按团地名过滤显示，**不会触发重新抓取UR官网**
- 区域下拉框可以按区筛选，同样只读缓存

## 项目结构

```
ur-monitor/
├── lib/
│   └── urClient.js      # 抓取UR API的核心逻辑（两种用法共用）
├── public/
│   └── index.html         # 网页前端（纯HTML+原生JS，无需构建工具）
├── monitor.js              # 命令行diff监控脚本
├── server.js                 # 网页服务器
└── snapshot.json           # monitor.js生成的历史快照（首次运行后出现）
```

## 数据来源

真实接口(浏览器 DevTools 抓到的):

```
POST https://chintai.r6.ur-net.go.jp/chintai/api/bukken/result/bukken_result/
```

`mode=area` + `skcs=区代码` + `block=地区` + `tdfk=都道府县代码` 就是按区域搜索。
东京都23区的代码定义在 `lib/urClient.js` 的 `AREAS` 数组里。

## 后续可以做的事

- **通知渠道**：`monitor.js` 里有 `TODO` 注释，标出了接入邮件/LINE Notify的位置
- **筛选条件**：接口本身支持 `rent_low`/`rent_high`/`floorspace_low` 等参数，
  可以在 `lib/urClient.js` 的 `fetchBukkenResult()` 里传具体值做条件筛选
- **数据持久化**：目前 server.js 的缓存存在内存里，重启就丢，人多起来可以考虑换成 SQLite
