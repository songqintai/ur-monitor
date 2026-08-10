/**
 * UR賃貸住宅 房源监控脚本 (命令行diff版)
 *
 * 覆盖范围: 東京都23区 (定义在 lib/urClient.js 的 AREAS 数组里)
 *
 * 逻辑:
 *   1. 抓取所有已配置区域的空室数据 (复用 lib/urClient.js)
 *   2. 和上次快照(snapshot.json)做 diff，打印新出现/消失的房间
 */

const fs = require('fs');
const path = require('path');
const { fetchAllRooms } = require('./lib/urClient');

const SNAPSHOT_FILE = path.join(__dirname, 'snapshot.json');

function loadSnapshot() {
  if (fs.existsSync(SNAPSHOT_FILE)) {
    return JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf-8'));
  }
  return {};
}

function saveSnapshot(snapshot) {
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2), 'utf-8');
}

async function main() {
  console.log('== UR 房源监控（東京都23区）==');
  const rooms = await fetchAllRooms((done, total, label) => {
    console.log(`   ${label}: ${done}/${total} 个团地`);
  });
  console.log(`\n共获取 ${rooms.length} 个空室`);

  const currentRooms = {};
  for (const r of rooms) currentRooms[r.key] = r;

  const prevRooms = loadSnapshot();
  const newlyFound = [];
  const noLongerAvailable = [];

  for (const [key, room] of Object.entries(currentRooms)) {
    if (!prevRooms[key]) newlyFound.push(room);
  }
  for (const key of Object.keys(prevRooms)) {
    if (!currentRooms[key]) noLongerAvailable.push(prevRooms[key]);
  }

  saveSnapshot(currentRooms);

  console.log('\n== 结果 ==');
  if (newlyFound.length === 0) {
    console.log('本次没有发现新房源。');
  } else {
    console.log(`\n🆕 发现 ${newlyFound.length} 个新房源:`);
    for (const r of newlyFound) {
      console.log(`  - [${r.area}/${r.danchiNm}] ${r.type} ${r.rent} (${r.floorspace}, ${r.floor}) ${r.building}${r.roomNo}`);
      console.log(`    ${r.url}`);
    }
    // TODO: 这里接入邮件 / LINE Notify / Webhook 等通知渠道
  }

  if (noLongerAvailable.length > 0) {
    console.log(`\n📤 ${noLongerAvailable.length} 个房源已不在空室列表中（可能已被租走/下架）:`);
    for (const r of noLongerAvailable) {
      console.log(`  - [${r.area}/${r.danchiNm}] ${r.type} ${r.building}${r.roomNo}`);
    }
  }
}

main().catch((err) => {
  if (err.response) {
    console.error(`请求失败，HTTP状态码: ${err.response.status}`);
    console.error('返回内容:', JSON.stringify(err.response.data).slice(0, 1000));
  } else {
    console.error('运行出错:', err.message);
  }
  process.exit(1);
});