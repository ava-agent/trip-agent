# Trip Agent

基于 Multi-Agent 系统的智能旅行规划助手，使用 React + TypeScript + Tauri 构建。

## 功能特性

- **Multi-Agent 系统**: 5 个专业 Agent 协同工作（协调者、规划师、推荐师、预订师、文档师）
- **A2UI 主动询问**: 智能收集缺失的旅行信息（目的地、天数、预算、偏好）
- **AGUI 实时界面**: 可视化展示 Agent 思考过程和工具调用状态
- **LLM 集成**: 使用智谱 AI GLM-4-Flash 生成个性化行程
- **外部 API 集成**: OpenWeatherMap、Google Places 提供实时数据
- **Tauri 桌面应用**: 跨平台桌面应用支持

## 技术栈

- **前端**: React 19 + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS
- **状态管理**: Zustand
- **LLM**: 智谱 AI GLM-4-Flash
- **外部 API**: OpenWeatherMap, Google Places
- **桌面端**: Tauri (Rust)
- **测试**: Vitest + Playwright

## 开发环境设置

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并配置：

```env
# 智谱 AI GLM API
VITE_GLM_API_KEY=your_glm_api_key_here

# OpenWeatherMap API (天气数据)
VITE_OPENWEATHER_API_KEY=your_openweather_api_key_here

# Google Places API (景点、酒店推荐)
VITE_GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
```

### 3. 启动开发服务器

```bash
pnpm dev
```

### 4. 运行测试

```bash
# 运行所有测试
pnpm test

# 测试 UI 模式
pnpm test:ui

# E2E 测试
pnpm test:e2e
```

## 项目结构

```
trip-agent/
├── src/
│   ├── components/      # React 组件
│   │   ├── chat/       # 聊天界面组件
│   │   └── ui/         # shadcn/ui 组件
│   ├── services/       # 业务逻辑服务
│   │   ├── multiAgentService.ts  # Multi-Agent 核心逻辑
│   │   ├── llmService.ts         # LLM API 集成
│   │   ├── externalApiService.ts # 外部 API 集成
│   │   └── agentUtils.ts         # Agent 工具函数
│   ├── stores/         # Zustand 状态管理
│   ├── types/          # TypeScript 类型定义
│   └── lib/            # 工具库
├── src-tauri/          # Tauri Rust 后端
└── docs/               # 项目文档
```

## Agent 架构

| Agent | 职责 |
|-------|------|
| SupervisorAgent | 协调各 Agent 工作流程 |
| PlannerAgent | 生成基础行程框架 |
| RecommenderAgent | 推荐景点、餐厅、酒店 |
| BookingAgent | 处理预订相关信息 |
| DocumentAgent | 生成可导出的行程文档 |

## API 密钥获取

- **智谱 AI**: https://open.bigmodel.cn/
- **OpenWeatherMap**: https://openweathermap.org/api
- **Google Places**: https://developers.google.com/maps/documentation/places/web-service/get-api-key

## 构建桌面应用

```bash
# 开发模式
pnpm tauri dev

# 构建生产版本
pnpm tauri build
```

## 许可证

MIT License
