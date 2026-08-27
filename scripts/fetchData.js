/**
 * 抓取数据并写成静态 JSON 文件 (给 GitHub Actions 定时任务用)
 *
 * 用法: node scripts/fetchData.js
 * 输出: docs/data/rooms.json
 *
 * 跟 monitor.js / server.js 的区别：
 *   这个脚本本身不常驻、不开端口，纯粹就是"抓一次、写一个文件、退出"，
 *   专门配合 GitHub Actions 的定时任务使用。
 *
 * 新增：和上一次写入的 rooms.json 做 diff，如果发现地区为 ALERT_AREA_PREF（市部）
 * 且専有面積超过 FLOORSPACE_ALERT_THRESHOLD 的新房源，通过 lib/mailer.js 发一封
 * 提醒邮件（需要环境变量 RESEND_API_KEY，详见 DEPLOY_GITHUB_PAGES.md）。
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { fetchAllRooms } = require('../lib/urClient');
const { sendMail } = require('../lib/mailer');

const OUTPUT_FILE = path.join(__dirname, '..', 'docs', 'data', 'rooms.json');
const FLOORSPACE_ALERT_THRESHOLD = 65; // 専有面積超过这个数(㎡)的新房源才提醒
const ALERT_AREA_PREF = '市部'; // 只提醒这个地区(pref)的新房源
const ALERT_MAIL_TO = process.env.ALERT_MAIL_TO || 'songqintai169@gmail.com';

function parseFloorspace(floorspaceStr) {
  if (!floorspaceStr) return null;
  const match = String(floorspaceStr).match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

function loadPreviousRooms() {
  if (!fs.existsSync(OUTPUT_FILE)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    return Array.isArray(data.rooms) ? data.rooms : [];
  } catch {
    return [];
  }
}

function buildAlertHtml(rooms) {
  const items = rooms
    .map(
      (r) =>
        `<li><a href="${r.url}">[${r.area}] ${r.danchiNm} ${r.type} ${r.rent}</a>（${r.floorspace}, ${r.floor}）</li>`
    )
    .join('');
  return `<p>发现 ${rooms.length} 个新房源，地区为${ALERT_AREA_PREF}，専有面積超过 ${FLOORSPACE_ALERT_THRESHOLD}㎡：</p><ul>${items}</ul>`;
}

async function main() {
  console.log('== 抓取数据 (静态JSON输出模式) ==');

  const prevKeys = new Set(loadPreviousRooms().map((r) => r.key));

  const rooms = await fetchAllRooms((done, total, label) => {
    console.log(`   ${label}: ${done}/${total} 个团地`);
  });

  const alertRooms = rooms.filter((r) => {
    if (prevKeys.has(r.key)) return false;
    if (r.pref !== ALERT_AREA_PREF) return false;
    const floorspace = parseFloorspace(r.floorspace);
    return floorspace !== null && floorspace > FLOORSPACE_ALERT_THRESHOLD;
  });

  if (alertRooms.length > 0) {
    console.log(`发现 ${alertRooms.length} 个符合提醒条件的新房源，发送邮件...`);
    try {
      await sendMail({
        to: ALERT_MAIL_TO,
        subject: `UR房源监控：发现 ${alertRooms.length} 个新房源（${ALERT_AREA_PREF}・専有面積 > ${FLOORSPACE_ALERT_THRESHOLD}㎡）`,
        html: buildAlertHtml(alertRooms),
      });
      console.log('提醒邮件已发送');
    } catch (err) {
      console.error('提醒邮件发送失败:', err.message);
    }
  } else {
    console.log('没有符合提醒条件的新房源，不发邮件。');
  }

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
