/**
 * UR賃貸住宅 房源展示服务器
 *
 * 启动: node server.js
 * 打开浏览器访问: http://localhost:3000
 *
 * 逻辑:
 *   - 启动时抓一次数据放进内存缓存
 *   - 每隔 REFRESH_INTERVAL_MS (1小时) 自动刷新一次，不提供手动触发抓取的接口
 *   - GET /api/rooms 返回当前缓存的房间列表，支持 ?area=&keyword= 过滤（只读缓存，不触发抓取）
 */

const express = require('express');
const path = require('path');
const { AREAS, fetchAllRooms } = require('./lib/urClient');

const PORT = 3000;
const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 自动刷新间隔：1小时（固定，不允许手动触发）

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let cache = {
  rooms: [],
  lastUpdated: null,
  isRefreshing: false,
  progress: null, // { label, done, total } 抓取进度，给前端做加载提示
};

async function refreshCache() {
  if (cache.isRefreshing) return; // 避免重复并发刷新
  cache.isRefreshing = true;
  cache.progress = { label: '准备中...', done: 0, total: 0 };
  try {
    console.log(`[${new Date().toLocaleString()}] 开始刷新数据...`);
    const rooms = await fetchAllRooms((done, total, label) => {
      cache.progress = { label, done, total };
      console.log(`  ${label}: ${done}/${total} 个团地`);
    });
    cache.rooms = rooms;
    cache.lastUpdated = new Date().toISOString();
    console.log(`[${new Date().toLocaleString()}] 刷新完成，共 ${rooms.length} 个空室`);
  } catch (err) {
    console.error('刷新失败:', err.message);
  } finally {
    cache.isRefreshing = false;
    cache.progress = null;
  }
}

// 提供区域列表，给前端做筛选下拉框
app.get('/api/areas', (req, res) => {
  res.json(AREAS.map((a) => a.label));
});

// 提供房间列表，支持按区域(area)和团地名关键词(keyword)过滤
app.get('/api/rooms', (req, res) => {
  const { area, keyword } = req.query;
  let rooms = cache.rooms;

  if (area) {
    rooms = rooms.filter((r) => r.area === area);
  }
  if (keyword) {
    const kw = keyword.trim();
    rooms = rooms.filter((r) => r.danchiNm && r.danchiNm.includes(kw));
  }

  res.json({
    rooms,
    total: rooms.length,
    lastUpdated: cache.lastUpdated,
    isRefreshing: cache.isRefreshing,
    progress: cache.progress,
  });
});

// 注意：没有手动触发抓取的接口。数据只按 REFRESH_INTERVAL_MS 的节奏自动更新。

app.listen(PORT, () => {
  console.log(`服务器已启动: http://localhost:${PORT}`);
  refreshCache(); // 启动时先抓一次
  setInterval(refreshCache, REFRESH_INTERVAL_MS);
});