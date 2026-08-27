/**
 * UR賃貸住宅 API 客户端
 * 数据来源: POST https://chintai.r6.ur-net.go.jp/chintai/api/bukken/result/bukken_result/
 *   (从浏览器 DevTools Network 面板抓到的真实接口，mode=area 按区域搜索)
 */

const axios = require('axios');

const RESULT_API = 'https://chintai.r6.ur-net.go.jp/chintai/api/bukken/result/bukken_result/';
const REQUEST_DELAY_MS = 800;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 东京都23区 + 神奈川县 + 千叶县。skcs = 区代码, tdfk = 都道府県代码(13=東京都,14=神奈川県,12=千葉県), block = 地方区块(kanto=关东)
// 各都道府県的代码是从 UR 官网区域选择页（比如 https://www.ur-net.go.jp/chintai/kanto/kanagawa/ ）里的链接提取的，
// 只包含 UR 在当地实际有房源覆盖的市区（比如横浜市泉区、木更津市等没有 UR 房源，官网页面里也没有对应链接）
// pref 字段用于前端按都道府県分 Tab 显示
const TOKYO_AREAS = [
  { skcs: '101', block: 'kanto', tdfk: '13', label: '千代田区' },
  { skcs: '102', block: 'kanto', tdfk: '13', label: '中央区' },
  { skcs: '103', block: 'kanto', tdfk: '13', label: '港区' },
  { skcs: '104', block: 'kanto', tdfk: '13', label: '新宿区' },
  { skcs: '105', block: 'kanto', tdfk: '13', label: '文京区' },
  { skcs: '106', block: 'kanto', tdfk: '13', label: '台東区' },
  { skcs: '107', block: 'kanto', tdfk: '13', label: '墨田区' },
  { skcs: '108', block: 'kanto', tdfk: '13', label: '江東区' },
  { skcs: '109', block: 'kanto', tdfk: '13', label: '品川区' },
  { skcs: '110', block: 'kanto', tdfk: '13', label: '目黒区' },
  { skcs: '111', block: 'kanto', tdfk: '13', label: '大田区' },
  { skcs: '112', block: 'kanto', tdfk: '13', label: '世田谷区' },
  { skcs: '113', block: 'kanto', tdfk: '13', label: '渋谷区' },
  { skcs: '114', block: 'kanto', tdfk: '13', label: '中野区' },
  { skcs: '115', block: 'kanto', tdfk: '13', label: '杉並区' },
  { skcs: '116', block: 'kanto', tdfk: '13', label: '豊島区' },
  { skcs: '117', block: 'kanto', tdfk: '13', label: '北区' },
  { skcs: '118', block: 'kanto', tdfk: '13', label: '荒川区' },
  { skcs: '119', block: 'kanto', tdfk: '13', label: '板橋区' },
  { skcs: '120', block: 'kanto', tdfk: '13', label: '練馬区' },
  { skcs: '121', block: 'kanto', tdfk: '13', label: '足立区' },
  { skcs: '122', block: 'kanto', tdfk: '13', label: '葛飾区' },
  { skcs: '123', block: 'kanto', tdfk: '13', label: '江戸川区' },
];

const KANAGAWA_AREAS = [
  { skcs: '101', block: 'kanto', tdfk: '14', label: '横浜市鶴見区' },
  { skcs: '102', block: 'kanto', tdfk: '14', label: '横浜市神奈川区' },
  { skcs: '103', block: 'kanto', tdfk: '14', label: '横浜市西区' },
  { skcs: '104', block: 'kanto', tdfk: '14', label: '横浜市中区' },
  { skcs: '105', block: 'kanto', tdfk: '14', label: '横浜市南区' },
  { skcs: '106', block: 'kanto', tdfk: '14', label: '横浜市保土ケ谷区' },
  { skcs: '107', block: 'kanto', tdfk: '14', label: '横浜市磯子区' },
  { skcs: '108', block: 'kanto', tdfk: '14', label: '横浜市金沢区' },
  { skcs: '109', block: 'kanto', tdfk: '14', label: '横浜市港北区' },
  { skcs: '110', block: 'kanto', tdfk: '14', label: '横浜市戸塚区' },
  { skcs: '111', block: 'kanto', tdfk: '14', label: '横浜市港南区' },
  { skcs: '112', block: 'kanto', tdfk: '14', label: '横浜市旭区' },
  { skcs: '113', block: 'kanto', tdfk: '14', label: '横浜市緑区' },
  { skcs: '114', block: 'kanto', tdfk: '14', label: '横浜市瀬谷区' },
  { skcs: '115', block: 'kanto', tdfk: '14', label: '横浜市栄区' },
  { skcs: '117', block: 'kanto', tdfk: '14', label: '横浜市青葉区' },
  { skcs: '118', block: 'kanto', tdfk: '14', label: '横浜市都筑区' },
  { skcs: '131', block: 'kanto', tdfk: '14', label: '川崎市川崎区' },
  { skcs: '132', block: 'kanto', tdfk: '14', label: '川崎市幸区' },
  { skcs: '133', block: 'kanto', tdfk: '14', label: '川崎市中原区' },
  { skcs: '134', block: 'kanto', tdfk: '14', label: '川崎市高津区' },
  { skcs: '135', block: 'kanto', tdfk: '14', label: '川崎市多摩区' },
  { skcs: '136', block: 'kanto', tdfk: '14', label: '川崎市宮前区' },
  { skcs: '137', block: 'kanto', tdfk: '14', label: '川崎市麻生区' },
  { skcs: '151', block: 'kanto', tdfk: '14', label: '相模原市緑区' },
  { skcs: '152', block: 'kanto', tdfk: '14', label: '相模原市中央区' },
  { skcs: '153', block: 'kanto', tdfk: '14', label: '相模原市南区' },
  { skcs: '201', block: 'kanto', tdfk: '14', label: '横須賀市' },
  { skcs: '203', block: 'kanto', tdfk: '14', label: '平塚市' },
  { skcs: '204', block: 'kanto', tdfk: '14', label: '鎌倉市' },
  { skcs: '205', block: 'kanto', tdfk: '14', label: '藤沢市' },
  { skcs: '207', block: 'kanto', tdfk: '14', label: '茅ヶ崎市' },
  { skcs: '211', block: 'kanto', tdfk: '14', label: '秦野市' },
  { skcs: '212', block: 'kanto', tdfk: '14', label: '厚木市' },
  { skcs: '213', block: 'kanto', tdfk: '14', label: '大和市' },
  { skcs: '215', block: 'kanto', tdfk: '14', label: '海老名市' },
  { skcs: '216', block: 'kanto', tdfk: '14', label: '座間市' },
];

const CHIBA_AREAS = [
  { skcs: '101', block: 'kanto', tdfk: '12', label: '千葉市中央区' },
  { skcs: '102', block: 'kanto', tdfk: '12', label: '千葉市花見川区' },
  { skcs: '103', block: 'kanto', tdfk: '12', label: '千葉市稲毛区' },
  { skcs: '104', block: 'kanto', tdfk: '12', label: '千葉市若葉区' },
  { skcs: '106', block: 'kanto', tdfk: '12', label: '千葉市美浜区' },
  { skcs: '203', block: 'kanto', tdfk: '12', label: '市川市' },
  { skcs: '204', block: 'kanto', tdfk: '12', label: '船橋市' },
  { skcs: '207', block: 'kanto', tdfk: '12', label: '松戸市' },
  { skcs: '211', block: 'kanto', tdfk: '12', label: '成田市' },
  { skcs: '212', block: 'kanto', tdfk: '12', label: '佐倉市' },
  { skcs: '216', block: 'kanto', tdfk: '12', label: '習志野市' },
  { skcs: '217', block: 'kanto', tdfk: '12', label: '柏市' },
  { skcs: '220', block: 'kanto', tdfk: '12', label: '流山市' },
  { skcs: '221', block: 'kanto', tdfk: '12', label: '八千代市' },
  { skcs: '222', block: 'kanto', tdfk: '12', label: '我孫子市' },
  { skcs: '224', block: 'kanto', tdfk: '12', label: '鎌ケ谷市' },
  { skcs: '227', block: 'kanto', tdfk: '12', label: '浦安市' },
  { skcs: '231', block: 'kanto', tdfk: '12', label: '印西市' },
  { skcs: '232', block: 'kanto', tdfk: '12', label: '白井市' },
];

// 東京都下の市部（多摩地区）。tdfk は23区と同じ13（東京都）だが、
// pref を別枠の「市部」にして23区とは別Tabで表示する
const TAMA_AREAS = [
  { skcs: '201', block: 'kanto', tdfk: '13', label: '八王子市' },
  { skcs: '202', block: 'kanto', tdfk: '13', label: '立川市' },
  { skcs: '203', block: 'kanto', tdfk: '13', label: '武蔵野市' },
  { skcs: '204', block: 'kanto', tdfk: '13', label: '三鷹市' },
  { skcs: '206', block: 'kanto', tdfk: '13', label: '府中市' },
  { skcs: '207', block: 'kanto', tdfk: '13', label: '昭島市' },
  { skcs: '208', block: 'kanto', tdfk: '13', label: '調布市' },
  { skcs: '209', block: 'kanto', tdfk: '13', label: '町田市' },
  { skcs: '210', block: 'kanto', tdfk: '13', label: '小金井市' },
  { skcs: '211', block: 'kanto', tdfk: '13', label: '小平市' },
  { skcs: '212', block: 'kanto', tdfk: '13', label: '日野市' },
  { skcs: '213', block: 'kanto', tdfk: '13', label: '東村山市' },
  { skcs: '214', block: 'kanto', tdfk: '13', label: '国分寺市' },
  { skcs: '215', block: 'kanto', tdfk: '13', label: '国立市' },
  { skcs: '218', block: 'kanto', tdfk: '13', label: '福生市' },
  { skcs: '219', block: 'kanto', tdfk: '13', label: '狛江市' },
  { skcs: '221', block: 'kanto', tdfk: '13', label: '清瀬市' },
  { skcs: '222', block: 'kanto', tdfk: '13', label: '東久留米市' },
  { skcs: '223', block: 'kanto', tdfk: '13', label: '武蔵村山市' },
  { skcs: '224', block: 'kanto', tdfk: '13', label: '多摩市' },
  { skcs: '225', block: 'kanto', tdfk: '13', label: '稲城市' },
  { skcs: '227', block: 'kanto', tdfk: '13', label: '羽村市' },
  { skcs: '229', block: 'kanto', tdfk: '13', label: '西東京市' },
];

const SAITAMA_AREAS = [
  { skcs: '102', block: 'kanto', tdfk: '11', label: 'さいたま市北区' },
  { skcs: '103', block: 'kanto', tdfk: '11', label: 'さいたま市大宮区' },
  { skcs: '104', block: 'kanto', tdfk: '11', label: 'さいたま市見沼区' },
  { skcs: '105', block: 'kanto', tdfk: '11', label: 'さいたま市中央区' },
  { skcs: '106', block: 'kanto', tdfk: '11', label: 'さいたま市桜区' },
  { skcs: '107', block: 'kanto', tdfk: '11', label: 'さいたま市浦和区' },
  { skcs: '108', block: 'kanto', tdfk: '11', label: 'さいたま市南区' },
  { skcs: '109', block: 'kanto', tdfk: '11', label: 'さいたま市緑区' },
  { skcs: '201', block: 'kanto', tdfk: '11', label: '川越市' },
  { skcs: '203', block: 'kanto', tdfk: '11', label: '川口市' },
  { skcs: '208', block: 'kanto', tdfk: '11', label: '所沢市' },
  { skcs: '214', block: 'kanto', tdfk: '11', label: '春日部市' },
  { skcs: '215', block: 'kanto', tdfk: '11', label: '狭山市' },
  { skcs: '217', block: 'kanto', tdfk: '11', label: '鴻巣市' },
  { skcs: '219', block: 'kanto', tdfk: '11', label: '上尾市' },
  { skcs: '221', block: 'kanto', tdfk: '11', label: '草加市' },
  { skcs: '222', block: 'kanto', tdfk: '11', label: '越谷市' },
  { skcs: '223', block: 'kanto', tdfk: '11', label: '蕨市' },
  { skcs: '224', block: 'kanto', tdfk: '11', label: '戸田市' },
  { skcs: '225', block: 'kanto', tdfk: '11', label: '入間市' },
  { skcs: '227', block: 'kanto', tdfk: '11', label: '朝霞市' },
  { skcs: '229', block: 'kanto', tdfk: '11', label: '和光市' },
  { skcs: '230', block: 'kanto', tdfk: '11', label: '新座市' },
  { skcs: '231', block: 'kanto', tdfk: '11', label: '桶川市' },
  { skcs: '232', block: 'kanto', tdfk: '11', label: '久喜市' },
  { skcs: '233', block: 'kanto', tdfk: '11', label: '北本市' },
  { skcs: '234', block: 'kanto', tdfk: '11', label: '八潮市' },
  { skcs: '235', block: 'kanto', tdfk: '11', label: '富士見市' },
  { skcs: '237', block: 'kanto', tdfk: '11', label: '三郷市' },
  { skcs: '239', block: 'kanto', tdfk: '11', label: '坂戸市' },
  { skcs: '240', block: 'kanto', tdfk: '11', label: '幸手市' },
  { skcs: '241', block: 'kanto', tdfk: '11', label: '鶴ヶ島市' },
  { skcs: '242', block: 'kanto', tdfk: '11', label: '日高市' },
  { skcs: '243', block: 'kanto', tdfk: '11', label: '吉川市' },
  { skcs: '245', block: 'kanto', tdfk: '11', label: 'ふじみ野市' },
];

const AREAS = [
  ...TOKYO_AREAS.map((a) => ({ ...a, pref: '東京都' })),
  ...KANAGAWA_AREAS.map((a) => ({ ...a, pref: '神奈川県' })),
  ...CHIBA_AREAS.map((a) => ({ ...a, pref: '千葉県' })),
  ...TAMA_AREAS.map((a) => ({ ...a, pref: '市部' })),
  ...SAITAMA_AREAS.map((a) => ({ ...a, pref: '埼玉県' })),
];

async function fetchBukkenResult(area, pageIndex, pageSize = 50) {
  const body = new URLSearchParams({
    rent_low: '',
    rent_high: '',
    walk: '',
    floorspace_low: '',
    floorspace_high: '',
    years: '',
    mode: 'area',
    skcs: area.skcs,
    block: area.block,
    tdfk: area.tdfk,
    rireki_tdfk: area.tdfk,
    orderByField: '1',
    pageSize: String(pageSize),
    pageIndex: String(pageIndex),
    shisya: '',
    danchi: '',
    shikibetu: '',
    pageIndexRoom: '0',
    sp: '',
  });

  const res = await axios.post(RESULT_API, body.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      Origin: 'https://www.ur-net.go.jp',
      Referer: 'https://www.ur-net.go.jp/',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
    timeout: 15000,
  });
  return res.data;
}

async function fetchAllDanchiForArea(area, onProgress) {
  const pageSize = 50;
  let pageIndex = 0;
  let all = [];
  let totalCount = Infinity;

  while (all.length < totalCount) {
    const data = await fetchBukkenResult(area, pageIndex, pageSize);
    if (!Array.isArray(data) || data.length === 0) break;

    if (data[0]?.bukkenCount) {
      totalCount = parseInt(data[0].bukkenCount, 10) || data.length;
    }
    all = all.concat(data);
    if (onProgress) onProgress(all.length, totalCount, `${area.pref} ${area.label}`);

    if (data.length < pageSize) break;
    pageIndex += 1;
    await sleep(REQUEST_DELAY_MS);
  }

  return all;
}

function decodeFloorspace(str) {
  if (!str) return str;
  return str.replace(/&#13217;/g, '㎡');
}

/**
 * 把团地列表展开成扁平的房间数组，附带区域标签和都道府県，方便前端搜索/筛选
 */
function extractRooms(danchiList, area) {
  const rooms = [];
  for (const d of danchiList) {
    if (!Array.isArray(d.room)) continue;
    for (const r of d.room) {
      rooms.push({
        key: `${d.shisya}_${d.danchi}_${r.id}`,
        area: area.label,
        pref: area.pref,
        danchiNm: d.danchiNm,
        place: d.place,
        traffic: d.traffic,
        building: r.roomNmMain,
        roomNo: r.roomNmSub,
        rent: r.rent,
        commonfee: r.commonfee,
        type: r.type,
        floor: r.floor,
        floorspace: decodeFloorspace(r.floorspace),
        madoriImg: r.madori,
        url: r.roomLinkPc ? `https://www.ur-net.go.jp${r.roomLinkPc}` : null,
      });
    }
  }
  return rooms;
}

/**
 * 抓取所有已配置区域的空室数据，返回扁平房间数组
 */
async function fetchAllRooms(onProgress) {
  let allRooms = [];
  for (const area of AREAS) {
    const danchiList = await fetchAllDanchiForArea(area, onProgress);
    allRooms = allRooms.concat(extractRooms(danchiList, area));
    await sleep(REQUEST_DELAY_MS); // 区域之间也留个间隔
  }
  return allRooms;
}

module.exports = { AREAS, fetchAllRooms, fetchAllDanchiForArea, extractRooms };