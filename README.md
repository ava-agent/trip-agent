# Trip Agent - AI 智能旅行规划助手

> Multi-Agent 驱动的智能旅行规划应用，通过多个 AI 专家协作为你生成个性化行程。

**在线体验**: [trip.rxcloud.group](https://trip.rxcloud.group)

## 功能特性

- **Multi-Agent 协作**: 5 个专业 Agent（主管、规划师、推荐师、预订专员、文档专员）协同工作
- **A2UI 主动询问**: 智能收集缺失的旅行信息（目的地、天数、预算、偏好）
- **AGUI 实时界面**: 可视化展示 Agent 思考过程和工具调用状态
- **实时行程生成**: LLM 流式生成，实时展示 Agent 工作过程
- **行程地图**: Leaflet 地图标注景点位置和路线
- **PDF/Markdown 导出**: 一键导出行程文档
- **暗色模式**: 支持亮色/暗色主题切换
- **多平台**: 支持 Web (Vercel) 和桌面 (Tauri) 两种部署方式

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui + Framer Motion |
| 状态管理 | Zustand |
| 地图 | Leaflet + OpenStreetMap |
| LLM | GLM-4-Flash / OpenAI / Anthropic (多模型支持) |
| 后端 | Vercel Serverless Edge Functions |
| 数据库 | Supabase PostgreSQL (RLS) |
| 桌面 | Tauri 2.x (Rust) |
| 测试 | Vitest (415 tests) |

## 快速开始

### 前置要求

- **Node.js** v18+ (推荐 v20+)
- **pnpm** 最新版本

### 1. 克隆并安装

```bash
git clone https://github.com/ava-agent/trip-agent.git
cd trip-agent
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，填入你的 API 密钥：

```env
# 必需：至少配置一个 LLM 提供商
VITE_GLM_API_KEY=your-glm-api-key    # 推荐，国内访问快速

# 可选：外部 API
VITE_OPENWEATHER_API_KEY=your-key    # 天气数据
VITE_GOOGLE_PLACES_API_KEY=your-key  # 景点/酒店推荐
```

### 3. 启动开发

```bash
pnpm dev          # Web 开发模式
pnpm tauri dev    # 桌面开发模式（需要 Rust）
```

### 4. 运行测试

```bash
pnpm test:run          # 运行全部 415 个测试
pnpm test:coverage     # 运行测试覆盖率报告
```

## 部署

### Vercel 部署 (推荐)

1. Fork 本仓库到你的 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量：

| 变量 | 说明 | 必需 |
|------|------|------|
| `GLM_API_KEY` | LLM API 密钥（服务端安全存储） | 是 |
| `VITE_SUPABASE_URL` | Supabase 项目 URL | 否 |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | 否 |
| `OPENWEATHER_API_KEY` | 天气 API 密钥 | 否 |
| `GOOGLE_PLACES_API_KEY` | 地图 API 密钥 | 否 |

4. 部署完成，自动获得 HTTPS 域名

> 所有 API 密钥通过 Vercel Edge Functions 代理调用，不会暴露给浏览器。

### Supabase 数据库 (可选)

1. 创建 [Supabase](https://supabase.com) 项目
2. 在 SQL Editor 中运行 `supabase/migrations/001_init.sql`
3. 表结构自动创建（trips + user_preferences），RLS 策略自动启用

### 桌面应用构建

需要额外安装 [Rust](https://www.rust-lang.org/tools/install)：

```bash
pnpm tauri build    # 构建桌面安装包
```

## 项目结构

```
trip-agent/
├── api/                        # Vercel Edge Functions
│   ├── llm.ts                  #   LLM 聊天代理
│   ├── weather.ts              #   天气查询代理
│   └── places.ts               #   景点/酒店搜索代理
├── src/
│   ├── components/
│   │   ├── chat/               #   聊天界面
│   │   ├── itinerary/          #   行程卡片、地图
│   │   ├── layout/             #   布局 (Header, Sidebar)
│   │   ├── settings/           #   API 配置
│   │   ├── user/               #   用户面板、偏好
│   │   └── ui/                 #   shadcn/ui 基础组件
│   ├── services/
│   │   ├── multiAgentService   #   Multi-Agent 编排引擎
│   │   ├── llmService          #   LLM 多模型集成
│   │   ├── externalApiService  #   外部 API (天气/地点)
│   │   └── contextValidator    #   A2UI 上下文验证
│   ├── stores/                 #   Zustand 状态管理
│   ├── hooks/                  #   React Hooks
│   ├── lib/                    #   工具库 (Supabase, 导出)
│   └── types/                  #   TypeScript 类型定义
├── supabase/migrations/        # 数据库迁移脚本
├── src-tauri/                  # Tauri Rust 后端
├── docs/                       # 设计文档
└── vercel.json                 # Vercel 部署配置
```

## Multi-Agent 架构

```
用户输入 → [主管 Agent] → 意图识别 + 任务分配
                ├── [规划师 Agent] → 生成每日行程
                ├── [推荐师 Agent] → 天气/餐厅/酒店推荐
                ├── [预订专员 Agent] → 价格对比/预订链接
                └── [文档专员 Agent] → 格式化导出
```

| Agent | 职责 | 工具 |
|-------|------|------|
| **SupervisorAgent** | 意图识别、任务分配、上下文验证 | `analyze_intent`, `delegate_agents` |
| **PlannerAgent** | 生成详细每日行程 | `search_attractions`, `calculate_route` |
| **RecommenderAgent** | 个性化推荐（天气、酒店、餐厅） | `get_weather`, `search_hotels` |
| **BookingAgent** | 价格对比、预订链接 | `check_availability`, `get_price` |
| **DocumentAgent** | 行程格式化与导出 | `format_itinerary` |

### 工作流程

1. **A2UI 上下文验证** — 自动收集缺失的旅行信息（支持 1-365 天）
2. **主管分析意图** — 识别用户需求并分配任务
3. **专家协作处理** — 各 Agent 执行专业任务
4. **流式输出结果** — 实时展示 Agent 生成过程
5. **行程卡片展示** — 完整行程 + 地图 + 导出

## API 密钥获取

| 服务 | 获取地址 | 用途 |
|------|---------|------|
| 智谱 AI (GLM) | https://open.bigmodel.cn/usercenter/apikeys | LLM 行程生成 |
| OpenAI | https://platform.openai.com/api-keys | LLM (备选) |
| OpenWeatherMap | https://openweathermap.org/api | 天气数据 |
| Google Places | https://console.cloud.google.com/ | 景点/酒店 |

## 许可证

MIT License
