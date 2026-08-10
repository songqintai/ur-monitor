/**
 * 抓取数据并写成静态 JSON 文件 (给 GitHub Actions 定时任务用)
 *
 * 用法: node scripts/fetchData.js
 * 输出: docs/data/rooms.json
 *
 * 跟 monitor.js / server.js 的区别：
 *   这个脚本不做 diff、不常驻、不开端口，纯粹就是"抓一次、写一个文件、退出"，
 *   专门配合 GitHub Actions 的定时任务使用。
 */

const fs = require('fs');
const path = require('path');
const { fetchAllRooms } = require('../lib/urClient');

const OUTPUT_FILE = path.join(__dirname, '..', 'docs', 'data', 'rooms.json');

async function main() {
  console.log('== 抓取数据 (静态JSON输出模式) ==');

  const rooms = await fetchAllRooms((done, total, label) => {
    console.log(`   ${label}: ${done}/${total} 个团地`);
  });

  const output = {
    lastUpdated: new Date().toISOString(),
    total: rooms.length,
    rooms,
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\n完成，共 ${rooms.length} 个空室，已写入 ${OUTPUT_FILE}`);
}

main().catch((err) => {
  if (err.response) {
    console.error(`请求失败，HTTP状态码: ${err.response.status}`);
  } else {
    console.error('运行出错:', err.message);
  }
  process.exit(1);
});
