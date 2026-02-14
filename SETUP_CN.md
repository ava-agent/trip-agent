# Trip Agent - 桌面应用安装指南

## 当前状态

✅ **所有代码优化已完成**
✅ **所有测试通过** (415 个测试)
✅ **所有更改已推送到 GitHub**
✅ **Tauri 配置已修复** (bundle identifier 问题已解决)

## 桌面应用安装

### 方式一：使用预编译版本（推荐）

由于您的系统未安装 Rust，**推荐使用预编译版本**：

1. **下载最新版本**
   - 访问：https://github.com/ava-agent/trip-agent/releases
   - 下载最新版本的 `Trip.Agent.Setup.exe` (Windows) 或 `Trip.Agent.dmg` (macOS)

2. **运行安装程序**
   - Windows: 双击 `Trip.Agent.Setup.exe`
   - macOS: 打开 `Trip.Agent.dmg` 并拖拽到应用程序文件夹
   - Linux: 运行 `Trip.Agent.AppImage`

3. **完成**
   - 应用程序安装后，会自动启动
   - 在设置中配置 API 密钥即可开始使用

---

### 方式二：从源码构建（高级用户）

如果您已安装 Node.js 和 npm，可以从源码构建：

#### 1. 安装 Rust（必需）

**Windows 系统：**
```bash
# 访问以下网址下载 Rust
https://www.rust-lang.org/tools/install.html

# 运行下载的安装程序
# 按照提示完成安装
```

**macOS 系统：**
```bash
curl --proto '=https' https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env
```

#### 2. 安装项目依赖

```bash
# 进入项目目录
cd trip-agent

# 安装 Node.js 依赖
npm install
```

#### 3. 构建桌面应用

```bash
# 构建 Tauri 应用
npm run tauri build
```

#### 4. 运行应用

**Windows：**
```bash
# 运行开发服务器（可选）
npm run tauri dev
```

---

## 配置 API 密钥

应用启动后，需要在设置中配置以下 API 密钥：

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
- **在线文档**: 完整的 README.md

---

## 许可证

MIT License

---

**注意**:
- 确保您的系统已安装 Node.js (v18+) 和 npm
- 如遇构建问题，推荐使用预编译版本（方式一）
- Windows 用户需要以管理员身份运行安装程序
