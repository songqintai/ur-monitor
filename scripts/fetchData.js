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
 * 新增：和上一次写入的 rooms.json 做 diff，如果发现房租超过 RENT_ALERT_THRESHOLD
 * 的新房源，通过 lib/mailer.js 发一封提醒邮件（需要环境变量 RESEND_API_KEY，
 * 详见 DEPLOY_GITHUB_PAGES.md）。
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { fetchAllRooms } = require('../lib/urClient');
const { sendMail } = require('../lib/mailer');

const OUTPUT_FILE = path.join(__dirname, '..', 'docs', 'data', 'rooms.json');
const RENT_ALERT_THRESHOLD = 150000; // 房租超过这个数(日元)的新房源才提醒
const ALERT_MAIL_TO = process.env.ALERT_MAIL_TO || 'songqintai169@gmail.com';

function parseRent(rentStr) {
  if (!rentStr) return null;
  const digits = rentStr.replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : null;
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
  return `<p>发现 ${rooms.length} 个新房源，房租超过 ${RENT_ALERT_THRESHOLD.toLocaleString()}円：</p><ul>${items}</ul>`;
}

async function main() {
  console.log('== 抓取数据 (静态JSON输出模式) ==');

  const prevKeys = new Set(loadPreviousRooms().map((r) => r.key));

  const rooms = await fetchAllRooms((done, total, label) => {
    console.log(`   ${label}: ${done}/${total} 个团地`);
  });

  const alertRooms = rooms.filter((r) => {
    if (prevKeys.has(r.key)) return false;
    const rent = parseRent(r.rent);
    return rent !== null && rent > RENT_ALERT_THRESHOLD;
  });

  if (alertRooms.length > 0) {
    console.log(`发现 ${alertRooms.length} 个符合提醒条件的新房源，发送邮件...`);
    try {
      await sendMail({
        to: ALERT_MAIL_TO,
        subject: `UR房源监控：发现 ${alertRooms.length} 个新房源（房租 > ${RENT_ALERT_THRESHOLD}円）`,
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
