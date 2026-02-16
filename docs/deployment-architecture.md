# Trip Agent 部署架构设计：Vercel + Supabase

## 架构概览

```
┌─────────────────────────────────────────────────────┐
│                    Vercel Platform                    │
│                                                       │
│  ┌──────────────┐     ┌────────────────────────────┐ │
│  │  Static SPA  │     │   Serverless API Routes     │ │
│  │  (React App) │────▶│                              │ │
│  │              │     │  /api/llm/chat               │ │
│  │  Vite Build  │     │  /api/weather                │ │
│  │  dist/       │     │  /api/places/search          │ │
│  │              │     │  /api/places/hotels           │ │
│  └──────────────┘     │  /api/trips (CRUD)           │ │
│                        └──────────┬─────────────────┘ │
└───────────────────────────────────┼───────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌──────────┐   ┌──────────────┐  ┌──────────┐
            │  LLM API │   │   Supabase   │  │External  │
            │  (GLM/   │   │              │  │APIs      │
            │  OpenAI/ │   │  PostgreSQL  │  │(Weather, │
            │  Claude) │   │  Auth        │  │ Places)  │
            └──────────┘   │  Storage     │  └──────────┘
                           └──────────────┘
```

## 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 前端 | React 19 + TypeScript + Vite | SPA 页面 |
| UI | Tailwind CSS + shadcn/ui | 组件库 |
| 状态 | Zustand | 客户端状态管理 |
| 地图 | Leaflet + OpenStreetMap | 行程地图 |
| 后端 API | Vercel Serverless Functions (Node.js) | API 代理 + 业务逻辑 |
| 数据库 | Supabase PostgreSQL | 行程数据、用户数据 |
| 认证 | Supabase Auth | 用户登录/注册 |
| 文件存储 | Supabase Storage | PDF 导出存储（可选） |
| 部署 | Vercel | 自动部署、CDN |

---

## 一、Vercel Serverless API Routes

### 目录结构

```
api/
├── llm/
│   └── chat.ts          # LLM 聊天代理（支持 GLM/OpenAI/Anthropic）
├── weather/
│   └── index.ts         # 天气查询代理
├── places/
│   ├── search.ts        # 景点/餐厅搜索代理
│   └── hotels.ts        # 酒店搜索代理
├── trips/
│   ├── index.ts         # GET (list) / POST (create)
│   └── [id].ts          # GET / PUT / DELETE 单个行程
├── preferences/
│   └── index.ts         # GET / PUT 用户偏好
└── _lib/
    ├── supabase.ts      # Supabase 客户端初始化
    ├── auth.ts          # 认证中间件
    └── rateLimit.ts     # 速率限制
```

### API 路由设计

#### 1. LLM 聊天代理 — `POST /api/llm/chat`

```typescript
// api/llm/chat.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  // 认证校验
  const user = await authenticateRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  // 速率限制
  const limited = await checkRateLimit(user.id, 'llm', 30) // 30次/分
  if (limited) return res.status(429).json({ error: 'Rate limit exceeded' })

  const { messages, provider = 'glm', model } = req.body

  // 服务端持有密钥，安全调用 LLM API
  const apiKey = getProviderKey(provider) // 从 process.env 读取
  const response = await callLLM(provider, apiKey, messages, model)

  res.status(200).json(response)
}
```

**支持的 Provider:**
- `glm` → `process.env.GLM_API_KEY`
- `openai` → `process.env.OPENAI_API_KEY`
- `anthropic` → `process.env.ANTHROPIC_API_KEY`

#### 2. 天气代理 — `GET /api/weather?city=东京`

```typescript
// api/weather/index.ts
export default async function handler(req, res) {
  const { city } = req.query
  const apiKey = process.env.OPENWEATHER_API_KEY
  const data = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=zh_cn`
  )
  res.json(await data.json())
}
```

#### 3. 景点搜索代理 — `GET /api/places/search?query=...&location=...&type=...`

#### 4. 酒店搜索代理 — `GET /api/places/hotels?destination=...`

#### 5. 行程 CRUD — `GET/POST /api/trips`, `GET/PUT/DELETE /api/trips/[id]`

所有行程操作通过 Supabase 客户端进行，带 RLS 保护。

---

## 二、Supabase 数据库设计

### 表结构

```sql
-- 用户表（Supabase Auth 自动管理）
-- auth.users 已内置

-- 行程表
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  destination JSONB NOT NULL,  -- { name, country, coordinates }
  duration JSONB NOT NULL,     -- { days, startDate, endDate }
  itinerary JSONB NOT NULL,    -- DayPlan[]
  preferences JSONB,           -- UserPreferences
  status TEXT DEFAULT 'draft', -- draft | planned | completed
  total_budget NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户偏好表
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 更新时间自动触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Row Level Security (RLS)

```sql
-- 启用 RLS
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的行程
CREATE POLICY "Users can view own trips"
  ON trips FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trips"
  ON trips FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips"
  ON trips FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips"
  ON trips FOR DELETE USING (auth.uid() = user_id);

-- 用户只能访问自己的偏好
CREATE POLICY "Users can manage own preferences"
  ON user_preferences FOR ALL USING (auth.uid() = user_id);
```

---

## 三、前端改造

### 3.1 移除 Tauri 依赖

**package.json** — 移除：
- `@tauri-apps/api`
- `@tauri-apps/cli`

**新增：**
- `@supabase/supabase-js` — Supabase 客户端

### 3.2 存储层替换

将 `src/services/tauriService.ts` 替换为 `src/services/supabaseStorageService.ts`：

```typescript
// src/services/supabaseStorageService.ts
import { supabase } from '@/lib/supabase'
import type { Trip, TripMetadata } from '@/types'

export const storageService = {
  async loadTrips(): Promise<Trip[]> {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) throw error
    return data.map(mapDbToTrip)
  },

  async loadTrip(id: string): Promise<Trip | null> {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return null
    return mapDbToTrip(data)
  },

  async saveTrip(trip: Trip): Promise<void> {
    const { error } = await supabase
      .from('trips')
      .upsert(mapTripToDb(trip))
    if (error) throw error
  },

  async deleteTrip(id: string): Promise<void> {
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
```

### 3.3 LLM 调用改为 API 代理

将 `llmService.ts` 的直接 API 调用改为经过 `/api/llm/chat`：

```typescript
// 修改前（不安全）：
const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
  headers: { Authorization: `Bearer ${config.apiKey}` },
  body: JSON.stringify({ messages })
})

// 修改后（安全）：
const response = await fetch('/api/llm/chat', {
  headers: { Authorization: `Bearer ${supabaseAccessToken}` },
  body: JSON.stringify({ messages, provider: 'glm' })
})
```

### 3.4 外部 API 调用改为代理

```typescript
// 修改前（不安全）：
const url = `https://api.openweathermap.org/...&appid=${this.openWeatherApiKey}`

// 修改后（安全）：
const url = `/api/weather?city=${encodeURIComponent(city)}`
```

### 3.5 认证集成

新增 `src/lib/supabase.ts`：

```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

新增 `src/hooks/useAuth.ts` 和登录/注册页面。

---

## 四、环境变量迁移

### 前端 (.env) — 仅公开安全的 key

```env
# Supabase 公开配置（anon key 是安全的，有 RLS 保护）
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Vercel 环境变量（服务端，不暴露给浏览器）

```
GLM_API_KEY=ae8e2815...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OPENWEATHER_API_KEY=...
GOOGLE_PLACES_API_KEY=...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # 服务端专用，绕过 RLS
```

---

## 五、实施步骤

### Phase 1：基础设施搭建（Supabase + Vercel 项目）
1. 创建 Supabase 项目，执行建表 SQL
2. 启用 Supabase Auth（邮箱+密码 或 OAuth）
3. 创建 Vercel 项目，连接 Git 仓库
4. 配置 Vercel 环境变量

### Phase 2：后端 API 路由
5. 创建 `api/` 目录，实现 LLM 代理路由
6. 实现天气、地点搜索代理路由
7. 实现行程 CRUD 路由（连接 Supabase）
8. 添加认证中间件 + 速率限制

### Phase 3：前端改造
9. 安装 `@supabase/supabase-js`，移除 Tauri 依赖
10. 替换 `tauriService` 为 `supabaseStorageService`
11. 修改 `llmService` 调用路径为 `/api/llm/chat`
12. 修改 `externalApiService` 调用路径为 `/api/weather`、`/api/places/*`
13. 添加登录/注册页面和路由守卫

### Phase 4：测试 + 部署
14. 本地测试所有 API 路由（`vercel dev`）
15. 更新测试用例适配新的 API 调用方式
16. 部署到 Vercel，验证全流程

---

## 六、关键文件改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `package.json` | 修改 | 移除 Tauri，添加 Supabase |
| `api/llm/chat.ts` | 新增 | LLM API 代理 |
| `api/weather/index.ts` | 新增 | 天气 API 代理 |
| `api/places/search.ts` | 新增 | 景点搜索代理 |
| `api/places/hotels.ts` | 新增 | 酒店搜索代理 |
| `api/trips/index.ts` | 新增 | 行程列表 + 创建 |
| `api/trips/[id].ts` | 新增 | 行程详情 CRUD |
| `api/_lib/supabase.ts` | 新增 | 服务端 Supabase 客户端 |
| `api/_lib/auth.ts` | 新增 | 认证中间件 |
| `src/lib/supabase.ts` | 新增 | 前端 Supabase 客户端 |
| `src/hooks/useAuth.ts` | 新增 | 认证 Hook |
| `src/services/tauriService.ts` | 替换 | → `supabaseStorageService.ts` |
| `src/services/llmService.ts` | 修改 | API 调用改为代理路径 |
| `src/services/externalApiService.ts` | 修改 | API 调用改为代理路径 |
| `src/stores/tripStore.ts` | 修改 | 存储调用改为 Supabase |
| `src/components/auth/LoginPage.tsx` | 新增 | 登录页面 |
| `vercel.json` | 新增 | Vercel 部署配置 |
| `supabase/migrations/001_init.sql` | 新增 | 数据库迁移脚本 |

---

## 七、安全保障

1. **API 密钥**：所有第三方 API 密钥仅存于 Vercel 服务端环境变量
2. **认证**：所有 API 路由要求有效的 Supabase JWT Token
3. **RLS**：数据库层面强制用户数据隔离
4. **速率限制**：LLM 调用限制 30次/分钟/用户
5. **CORS**：Vercel 自动处理同域请求，无 CORS 问题
6. **输入校验**：API 路由使用 Zod 校验请求体
