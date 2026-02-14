# Trip Agent - 桌面应用安装指南

## 当前状态

✅ **所有代码优化已完成**
✅ **所有测试通过** (415 个测试)
✅ **所有更改已推送到 GitHub**
✅ **Tauri 配置已修复** (bundle identifier 问题已解决)

## 如何使用桌面应用

### 方式一：使用在线 Web 版本（推荐）✨

**最简单方式 - 无需安装！**

1. **访问在线应用**
   - 打开浏览器访问：https://ava-agent.dev
   - 应用界面与桌面版完全相同
   - 无需安装任何软件
   - 支持所有现代浏览器（Chrome、Edge、Firefox、Safari）
   - **自动更新** - 应用始终保持最新版本

2. **开始使用**
   - 直接打开应用即可开始规划您的旅行
   - 在设置中配置 API 密钥（智谱 AI GLM API）
   - 输入目的地、天数等信息，系统自动生成完整行程

---

### 方式二：从源码构建（高级用户）⚙️

**注意**：此方式需要安装 Node.js 和 Rust，适合开发者用户。

如果您已安装开发环境：

#### Windows 系统
```bash
# 安装 Rust（如果未安装）
https://www.rust-lang.org/tools/install.html

# 克隆项目
git clone https://github.com/ava-agent/trip-agent.git
cd trip-agent

# 安装项目依赖
npm install
```

#### macOS 系统
```bash
# 安装 Rust
curl --proto '=https' https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env
```

#### 构建和运行应用
```bash
# 构建 Tauri 应用
npm run tauri build

# 运行开发服务器
npm run tauri dev
```

---

## 配置 API 密钥

应用启动后，在设置中配置以下 API 密钥：

1. **智谱 AI GLM API**（必需）- 用于行程生成
2. **OpenWeatherMap API**（可选）- 用于天气数据
3. **Google Places API**（可选）- 用于景点、酒店、餐厅推荐

### 获取 API 密钥

- **智谱 AI GLM**: https://open.bigmodel.cn/
- **OpenWeatherMap**: https://openweathermap.org/api
- **Google Places**: https://developers.google.com/maps/documentation/places/web-service/get-api-key

---

## 功能说明

### Multi-Agent 系统
- 5 个专业 Agent 协同工作
- 智能旅行规划生成
- 实时天气、景点、酒店、餐厅数据集成

### A2UI 智能询问
- 自动检测缺失信息（目的地、天数、预算、偏好）
- 主动询问补充必要信息

### AGUI 可视化界面
- Agent 思考过程可视化展示
- 工具调用状态实时追踪

---

## 技术栈

- **前端**: React 19 + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS
- **状态管理**: Zustand
- **桌面端**: Tauri (Rust)
- **LLM 集成**: 智谱 AI GLM-4-Flash

---

## 项目链接

- **GitHub**: https://github.com/ava-agent/trip-agent
- **在线应用**: https://ava-agent.dev

---

## 许可证

MIT License
