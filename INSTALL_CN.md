# Trip Agent 桌面应用 - 安装指南

## 快速安装

### 方式一：从源码构建（推荐开发者）

**前置要求：**
- Node.js v18+
- pnpm
- Rust 和 Cargo（Tauri 需要）

**步骤：**

1. 安装 Rust（如果未安装）
   - Windows: 访问 https://www.rust-lang.org/tools/install.html
   - 下载并运行 `rustup-init.exe`
   - 按照屏幕提示完成安装

2. 克隆项目并安装依赖
   ```bash
   git clone https://github.com/ava-agent/trip-agent.git
   cd trip-agent
   pnpm install
   ```

3. 配置环境变量
   - 复制 `.env.example` 为 `.env`
   - 填入你的 API 密钥

4. 配置 Rust 和 Cargo
   - 确保 Rust 和 Cargo 已添加到系统 PATH

5. 构建桌面应用
   ```bash
   pnpm tauri build
   ```

6. 运行应用
   - Windows: `src-tauri/target/release/bundle/trip-agent.exe`
   - macOS: `src-tauri/target/release/bundle/m/Trip Agent`
   - Linux: `src-tauri/target/release/bundle/trip-agent`

### 方式二：下载预编译版本

**推荐用于快速体验和测试**

#### Windows 下载

访问以下链接下载最新版本：

```
https://github.com/ava-agent/trip-agent/releases/latest/download/trip-agent-setup.exe
```

#### macOS 下载

```
https://github.com/ava-agent/trip-agent/releases/latest/download/trip-agent.dmg
```

#### Linux 下载

```
https://github.com/ava-agent/trip-agent/releases/latest/download/trip-agent.AppImage
```

#### 下载提示

1. 下载后检查文件大小（约 80-120 MB）
2. Windows 可能提示安全警告，点击"更多信息"即可继续
3. macOS: 打开 .dmg 文件，拖拽到应用程序文件夹
4. Linux: 运行 AppImage

## 验证安装

运行应用后，在设置中配置 API 密钥即可开始使用。

## 系统要求

### 最低配置

| 组件 | 要求 |
|-------|--------|
| CPU | 双核或以上 |
| 内存 | 4 GB+ 推荐 |
| 硬盘 | 500 MB 可用空间 |

### API 密钥

应用需要以下 API 密钥才能正常工作：

- **智谱 AI GLM API**（必需）
  - 获取地址：https://open.bigmodel.cn/
- **OpenWeatherMap API**（可选）
  - 获取地址：https://openweathermap.org/api
- **Google Places API**（可选）
  - 获取地址：https://developers.google.com/maps/documentation/places/web-service/get-api-key

## 功能说明

应用基于 Multi-Agent 系统提供智能旅行规划服务：

- **5 个专业 Agent 协同工作**
  - 协调者：意图识别和任务分配
  - 规划师：生成详细行程
  - 推荐师：景点、餐厅、酒店推荐
  - 预订师：价格比较和预订链接
  - 文档师：行程格式化和导出

- **智能信息收集**
  - 当目的地、天数等信息不完整时，系统主动询问补充

- **实时进度展示**
  - 可视化展示 Agent 思考过程和工具调用状态

- **LLM 集成**
  - 使用智谱 AI GLM-4-Flash 生成个性化行程

## 故障排除

### 应用无法启动

1. 检查系统是否安装 Rust
2. 检查 Node.js 和 pnpm 版本
3. 重新克隆项目并安装依赖

### API 错误

1. 检查 `.env` 文件配置
2. 验证 API 密钥有效性
3. 查看浏览器控制台或日志

## 技术支持

- GitHub Issues: https://github.com/ava-agent/trip-agent/issues
- 文档: https://github.com/ava-agent/trip-agent

---

**版本**: 1.0.0
**更新日期**: 2025-02-14
