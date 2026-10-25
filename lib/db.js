/**
 * Supabase 数据库写入封装，直接调用 Supabase 的 REST API (PostgREST)
 * 需要环境变量 SUPABASE_URL 和 SUPABASE_SECRET_KEY（Supabase 控制台 Project Settings → API Keys）
 * 表结构见 supabase/schema.sql
 */

const BATCH_SIZE = 500;

function isDbConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

function authHeaders() {
  const key = process.env.SUPABASE_SECRET_KEY;
  const headers = { apikey: key };
  // 旧版 service_role key 是 JWT，需要同时放进 Authorization；新版 sb_secret_ key 只放 apikey 即可
  if (!key.startsWith('sb_')) headers.Authorization = `Bearer ${key}`;
  return headers;
}

async function request(method, pathAndQuery, body, prefer) {
  const url = `${process.env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${pathAndQuery}`;
  const res = await fetch(url, {
    method,
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${method} ${pathAndQuery.split('?')[0]} 失败 (HTTP ${res.status}): ${text}`);
  }
}

// 同一个团地/房间可能被两个区域重复返回，同一批 upsert 里主键重复会报错，所以先去重
function uniqueBy(rows, keyField) {
  const map = new Map();
  for (const row of rows) map.set(row[keyField], row);
  return [...map.values()];
}

async function upsert(table, rows, keyField) {
  const unique = uniqueBy(rows, keyField);
  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    await request(
      'POST',
      `${table}?on_conflict=${keyField}`,
      unique.slice(i, i + BATCH_SIZE),
      'resolution=merge-duplicates,return=minimal'
    );
  }
}

function parseNumber(str) {
  if (!str) return null;
  const match = String(str).replace(/,/g, '').match(/[\d.]+/);
  return match ? Number(match[0]) : null;
}

/**
 * 把一次完整抓取的结果同步进数据库:
 *   1. upsert 所有团地（包括没有空室的）
 *   2. upsert 所有当前空室，status=available，first_seen 只在新增时由数据库默认值写入
 *   3. 这次没抓到、但数据库里还是 available 的房间 → 标记为 gone
 * 第3步依赖"这次抓取是完整的"，fetchAllData 任何一个区域失败都会抛异常，不会走到这里
 */
async function syncToDb({ danchi, rooms }, runAt = new Date()) {
  const now = runAt.toISOString();

  await upsert(
    'danchi',
    danchi.map((d) => ({
      id: d.id,
      name: d.name,
      pref: d.pref,
      area: d.area,
      place: d.place,
      traffic: d.traffic,
      image_url: d.imageUrl,
      room_count: d.roomCount,
      last_seen: now,
    })),
    'id'
  );

  await upsert(
    'rooms',
    rooms.map((r) => ({
      key: r.key,
      danchi_id: r.danchiId,
      building: r.building,
      room_no: r.roomNo,
      type: r.type,
      floor: r.floor,
      floorspace: r.floorspace,
      floorspace_m2: parseNumber(r.floorspace),
      rent: r.rent,
      rent_yen: parseNumber(r.rent),
      commonfee: r.commonfee,
      commonfee_yen: parseNumber(r.commonfee),
      madori_img: r.madoriImg,
      url: r.url,
      status: 'available',
      last_seen: now,
      gone_at: null, // 消失后又重新出现的房间，清掉之前的 gone_at
    })),
    'key'
  );

  await request(
    'PATCH',
    `rooms?status=eq.available&last_seen=lt.${encodeURIComponent(now)}`,
    { status: 'gone', gone_at: now },
    'return=minimal'
  );
}

module.exports = { isDbConfigured, syncToDb };
