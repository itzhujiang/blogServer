# 大文件上传方案设计

## 需求概述
- **分片上传**: 支持超大文件分片上传
- **断点续传**: 上传中断后可从断点继续
- **秒传**: 相同文件 MD5 匹配后直接使用
- **复用现有机制**: 大文件上传完毕后放入临时文件夹，用户传入 code 后永久保存

## 目录结构

所有代码放在现有文件中，不新建文件：

| 内容 | 文件路径 |
|------|----------|
| 接口定义 | `src/api/blog/mediaFile.ts` |
| 业务逻辑 | `src/services/blog/mediaFile.ts` |
| 数据模型 | `src/models/media-file.ts` (新增 fileHash 字段) |

---

## 一、数据模型扩展

### MediaFile 新增字段
```typescript
interface MediaFileAttributes {
  // ... 现有字段
  fileHash?: string | null;  // 文件 MD5（用于大文件秒传）
}
```

---

## 二、API 接口设计

所有接口定义在 `src/api/blog/mediaFile.ts` 中：

### 1. 初始化上传（支持秒传）
```
POST /api/blog/media/bigFileInit
Content-Type: application/json

请求:
{
  "fileName": "example.mp4",
  "fileSize": 524288000,
  "mimeType": "video/mp4",
  "chunkSize": 2097152,   // 可选，默认 2MB
  "fileHash": "abc123..." // 可选，文件 MD5（用于秒传）
}

响应:
{
  "code": 200,
  "data": {
    "identifier": "abc123...",      // 文件唯一标识
    "chunkSize": 2097152,
    "totalChunks": 250,
    "uploadedChunks": [],           // 已上传的分片列表
    "isNew": true,                  // 是否新文件（false 表示秒传）
    "existingFileUrl": null         // 秒传时返回已有文件 URL
  }
}
```

### 秒传流程
1. 前端计算文件 MD5
2. 发送 init 请求时传入 fileHash
3. 服务端查询 MediaFile 中是否存在相同 fileHash
4. 如果存在且 fileHash 不为空，返回已存在的文件 URL，`isNew: false`

### 2. 上传分片
```
POST /api/blog/media/bigFileChunk
Content-Type: multipart/form-data

请求:
- file: 分片文件
- identifier: 文件标识
- chunkNumber: 分片序号 (从 1 开始)
- chunkHash: 分片 MD5 (可选)

响应:
{
  "code": 200,
  "data": {
    "chunkNumber": 1,
    "uploadedChunks": [1],
    "progress": 0.4
  }
}
```

### 3. 合并分片
```
POST /api/blog/media/bigFileMerge
Content-Type: application/json

请求:
{
  "identifier": "abc123..."
}

响应:
{
  "code": 200,
  "data": {
    "code": "abc123...",              // 用于永久保存的凭证
    "size": 524288000,                // 文件大小
    "url": "/uploads/temp/xxx.mp4",   // 临时文件 URL
    "fileName": "example.mp4"         // 原始文件名
  }
}
```

### 4. 查询上传状态
```
GET /api/blog/media/bigFileStatus?identifier=xxx

响应:
{
  "code": 200,
  "data": {
    "identifier": "abc123...",
    "status": "uploading",
    "uploadedChunks": [1, 2, 5, 6],
    "progress": 1.6
  }
}
```

---

## 二、文件存储

### 分片存储
- 临时目录: `uploads/temp/chunks/{identifier}/`
- 分片文件: `{chunkNumber}.part`

### 合并后文件
- 临时目录: `uploads/temp/`
- 文件名: `{identifier}{ext}`

---

## 三、永久保存流程

大文件合并后返回 `code`，用户在其他需要永久保存文件的接口中传入该 code，调用 `confirmTempMedia()` 方法保存文件。

---

## 四、实现步骤

### 阶段 1: 路由层 (`src/api/blog/mediaFile.ts`)
- [ ] 添加 `/big-file/init` 接口
- [ ] 添加 `/big-file/chunk` 接口
- [ ] 添加 `/big-file/merge` 接口
- [ ] 添加 `/big-file/status` 接口

### 阶段 2: 服务层 (`src/services/blog/mediaFile.ts`)
- [ ] 实现 `initBigFileUpload()` - 初始化大文件上传
- [ ] 实现 `uploadBigFileChunk()` - 上传分片
- [ ] 实现 `mergeBigFileChunks()` - 合并分片
- [ ] 实现 `getBigFileStatus()` - 查询状态
- [ ] 导出 `confirmTempMedia` 给路由层使用

### 阶段 3: 辅助功能
- [ ] 添加清理临时分片文件的逻辑
- [ ] 添加清理过期大文件记录的定时任务

---

## 五、关键文件

| 文件 | 修改内容 |
|------|----------|
| `src/api/blog/mediaFile.ts` | 新增大文件上传接口 |
| `src/services/blog/mediaFile.ts` | 新增大文件上传逻辑 |
| `src/index.ts` | 注册新路由 `/api/blog/media/big-file/*` |
