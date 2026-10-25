-- UR房源监控 数据库表结构
-- 用法: 在 Supabase 控制台的 SQL Editor 里粘贴整个文件执行一次即可（重复执行也不会出错）

-- 団地（包括当前没有空室的団地）
create table if not exists public.danchi (
  id          text primary key,            -- `${shisya}_${danchi}_${shikibetu}`
  name        text not null,               -- 団地名
  pref        text not null,               -- 前端Tab用的分类: 東京都 / 市部 / 神奈川県 / 千葉県 / 埼玉県
  area        text not null,               -- 区市名
  place       text,                        -- 所在地
  traffic     text,                        -- 交通（UR返回的 <li> HTML）
  image_url   text,
  room_count  integer not null default 0,  -- 最近一次抓取时的空室数
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);

create index if not exists danchi_name_idx on public.danchi (name);

-- 空室（抓到过的每一个房间都保留，消失后 status 变为 gone）
create table if not exists public.rooms (
  key            text primary key,         -- `${shisya}_${danchi}_${roomId}`，和 rooms.json 的 key 一致
  danchi_id      text not null references public.danchi (id),
  building       text,
  room_no        text,
  type           text,                     -- 間取り 2DK 等
  floor          text,
  floorspace     text,                     -- 原文 "48㎡"
  floorspace_m2  numeric,                  -- 解析后的数值，方便按面积查询
  rent           text,                     -- 原文 "93,200円"
  rent_yen       integer,                  -- 解析后的数值
  commonfee      text,
  commonfee_yen  integer,
  madori_img     text,
  url            text,
  status         text not null default 'available' check (status in ('available', 'gone')),
  first_seen     timestamptz not null default now(),  -- 第一次抓到的时间（只在新增时写入）
  last_seen      timestamptz not null default now(),  -- 最后一次抓到的时间
  gone_at        timestamptz                          -- 从UR上消失的时间
);

create index if not exists rooms_danchi_id_idx on public.rooms (danchi_id);
create index if not exists rooms_status_idx on public.rooms (status);

-- 开启 RLS 且不建任何 policy：匿名访问（publishable/anon key）完全读写不了，
-- 只有 GitHub Actions 使用的 secret key（绕过 RLS）可以读写
alter table public.danchi enable row level security;
alter table public.rooms enable row level security;
