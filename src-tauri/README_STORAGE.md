# Tauri 后端存储服务

## 概述

此存储服务为 Trip Agent MVP 提供安全的本地数据持久化功能。

## 文件结构

```
~/.trip-agent/                 # 用户应用数据目录
├── trips/                     # 旅行计划存储
│   ├── trip-{id}.json        # 单个旅行文件
│   └── ...
├── conversations/             # 聊天历史存储
│   └── chat-history.json    # 聊天记录
└── preferences.json          # 用户偏好设置
```

## Rust 模块

### `commands.rs`

核心存储模块，包含：

- **错误类型**: `StorageError` 枚举处理所有存储相关错误
- **数据模型**: 与 TypeScript 类型匹配的 Rust 结构体
- **StorageManager**: 负责文件系统操作的类

### Tauri 命令

| 命令 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `save_trip` | `trip: Trip` | `()` | 保存旅行计划 |
| `load_trips` | - | `Vec<Trip>` | 加载所有旅行 |
| `load_trip` | `id: String` | `Trip` | 加载单个旅行 |
| `delete_trip` | `id: String` | `()` | 删除旅行 |
| `save_preferences` | `prefs: UserPreferences` | `()` | 保存偏好 |
| `load_preferences` | - | `Option<UserPreferences>` | 加载偏好 |
| `get_data_dir` | - | `String` | 获取数据目录 |
| `trip_exists` | `id: String` | `bool` | 检查旅行存在 |

## TypeScript 接口

### `tauriService.ts`

提供类型安全的 TypeScript 接口：

```typescript
import { saveTrip, loadTrips, loadTrip, deleteTrip, savePreferences, loadPreferences } from '@/services/tauriService'

// 保存旅行
await saveTrip(trip)

// 加载所有旅行
const trips = await loadTrips()

// 加载单个旅行
const trip = await loadTrip(tripId)

// 删除旅行
await deleteTrip(tripId)

// 保存偏好
await savePreferences(preferences)

// 加载偏好
const prefs = await loadPreferences()
```

## 数据结构

### Trip (旅行计划)

```json
{
  "id": "trip-1234567890",
  "name": "东京之旅",
  "destination": {
    "name": "东京",
    "country": "日本",
    "coordinates": { "lat": 35.6762, "lng": 139.6503 }
  },
  "duration": {
    "startDate": "2025-04-01T00:00:00.000Z",
    "endDate": "2025-04-07T00:00:00.000Z",
    "days": 7
  },
  "preferences": {
    "interests": ["文化", "美食", "购物"],
    "budget": { "min": 5000, "max": 10000, "currency": "CNY" }
  },
  "itinerary": [],
  "status": "planning",
  "createdAt": "2025-02-10T12:00:00.000Z",
  "updatedAt": "2025-02-10T12:00:00.000Z"
}
```

## 构建说明

### 添加依赖

依赖已在 `Cargo.toml` 中配置：

```toml
[dependencies]
serde_json = "1.0"
serde = { version = "1.0", features = ["derive"] }
log = "0.4"
tauri = { version = "2.10.0" }
tauri-plugin-log = "2"
tokio = { version = "1.42", features = ["fs", "io-util"] }
thiserror = "2.0"
chrono = { version = "0.4", features = ["serde"] }
```

### 编译

```bash
cd src-tauri
cargo build
```

### 开发模式

```bash
npm run tauri dev
```

## 错误处理

所有错误都会通过 `StorageError` 类型包装并返回到前端：

- `Io`: 文件系统 IO 错误
- `JsonSerialization`: JSON 序列化/反序列化错误
- `DataDirNotFound`: 应用数据目录未找到
- `TripNotFound`: 指定的旅行不存在
- `InvalidTripData`: 无效的旅行数据

## 浏览器回退

当在浏览器环境中运行时（非 Tauri），服务会自动回退到 `mockTauri.ts` 实现，使用 localStorage 进行数据持久化。
