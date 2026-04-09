# On-Demand Revalidation 接口文档

## 1. 文档概述

本文档说明博客前台项目提供的缓存主动刷新接口，用于在后台发布或更新文章后，通知 Next.js 立即刷新指定页面的 ISR 缓存。

接口适用场景：
- 后台新增文章后刷新前台首页、列表页、详情页
- 后台修改文章内容后刷新相关文章页面
- 后台调整分类归属后刷新列表页和详情页

相关代码位置：
- `app/api/revalidate/route.ts:14`
- `app/api/revalidate/route.ts:20`
- `app/api/revalidate/route.ts:28`
- `app/api/revalidate/route.ts:54`

---

## 2. 接口信息

### 2.1 请求方式

```http
POST /api/revalidate
```

### 2.2 示例地址

本地开发环境：

```http
http://localhost:3000/api/revalidate
```

生产环境示例：

```http
https://your-domain.com/api/revalidate
```

---

## 3. 接口用途

该接口用于调用 Next.js 的 `revalidatePath(path)`，让指定页面缓存失效。

当后台完成文章发布后，可以主动调用此接口刷新以下页面：
- `/` 首页
- `/articles` 文章列表页
- `/articles/{slug}` 文章详情页

这样前台用户下次访问这些页面时，就会看到最新内容。

---

## 4. 认证方式

接口通过请求体中的 `secret` 字段校验调用权限。

服务端要求：

```env
REVALIDATION_SECRET=your-strong-secret
```

`.env` 中已存在该变量：
- `REVALIDATION_SECRET`

只有当请求体中的 `secret` 与服务端环境变量 `REVALIDATION_SECRET` 完全一致时，请求才会通过。

---

## 5. 请求头

```http
Content-Type: application/json
```

---

## 6. 请求参数

### 6.1 请求体示例

```json
{
  "secret": "your-revalidation-secret",
  "paths": ["/", "/articles", "/articles/my-article-slug"]
}
```

### 6.2 字段说明

| 字段名 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `secret` | `string` | 是 | 刷新密钥，必须与 `REVALIDATION_SECRET` 一致 |
| `paths` | `string[]` | 是 | 需要刷新的路径数组，每个路径必须以 `/` 开头 |

---

## 7. 参数校验规则

### 7.1 `secret` 校验

校验规则：
- 必须存在
- 必须等于 `process.env.REVALIDATION_SECRET`

失败时返回：

```json
{
  "error": "无效的密钥"
}
```

状态码：

```http
401 Unauthorized
```

### 7.2 `paths` 校验

校验规则：
- 必须是数组
- 不能为空数组
- 最多 20 项
- 每项都必须是字符串
- 每项都必须以 `/` 开头

#### 非空数组校验失败

```json
{
  "error": "paths 必须为非空数组"
}
```

#### 超过最大数量

```json
{
  "error": "paths 最多 20 个"
}
```

#### 路径格式错误

```json
{
  "error": "每个路径必须为以 / 开头的字符串",
  "invalidPaths": ["articles/test", 123]
}
```

状态码：

```http
400 Bad Request
```

---

## 8. 成功响应

状态码：

```http
200 OK
```

响应体示例：

```json
{
  "revalidated": true,
  "paths": ["/", "/articles", "/articles/my-article-slug"]
}
```

字段说明：

| 字段名 | 类型 | 说明 |
|---|---|---|
| `revalidated` | `boolean` | 是否已触发刷新 |
| `paths` | `string[]` | 实际执行刷新的路径列表 |

---

## 9. 失败响应

### 9.1 密钥错误

```http
401 Unauthorized
```

```json
{
  "error": "无效的密钥"
}
```

### 9.2 请求参数错误

```http
400 Bad Request
```

```json
{
  "error": "paths 必须为非空数组"
}
```

或：

```json
{
  "error": "每个路径必须为以 / 开头的字符串",
  "invalidPaths": ["articles/test"]
}
```

### 9.3 服务端异常

```http
500 Internal Server Error
```

```json
{
  "error": "Revalidation 失败"
}
```

---

## 10. 调用示例

### 10.1 cURL 调用示例

```bash
curl -X POST "http://localhost:3000/api/revalidate" \
  -H "Content-Type: application/json" \
  -d "{\"secret\":\"your-secret\",\"paths\":[\"/\",\"/articles\",\"/articles/my-article-slug\"]}"
```

### 10.2 fetch 调用示例

```ts
await fetch('http://localhost:3000/api/revalidate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    secret: 'your-secret',
    paths: ['/', '/articles', '/articles/my-article-slug'],
  }),
});
```

### 10.3 axios 调用示例

```ts
import axios from 'axios';

await axios.post('http://localhost:3000/api/revalidate', {
  secret: 'your-secret',
  paths: ['/', '/articles', '/articles/my-article-slug'],
});
```

---

## 11. 后台发布文章后的推荐调用方式

当后台成功发布一篇新文章后，建议刷新以下页面：

```json
{
  "secret": "your-secret",
  "paths": [
    "/",
    "/articles",
    "/articles/my-article-slug"
  ]
}
```

推荐原因：
- `/`：首页通常展示最新文章
- `/articles`：文章列表页需要同步更新
- `/articles/{slug}`：文章详情页需要更新正文内容

如果是修改已有文章，也建议传同样的路径集合。

---

## 12. 接入流程建议

推荐接入流程如下：

1. 后台系统完成文章入库
2. 获取文章 `slug`
3. 拼接需要刷新的路径数组
4. 使用服务端请求调用 `/api/revalidate`
5. 接口返回成功后，表示前台缓存失效已触发

示例流程：

```ts
const slug = 'my-article-slug';

await fetch('https://your-domain.com/api/revalidate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    secret: process.env.REVALIDATION_SECRET,
    paths: ['/', '/articles', `/articles/${slug}`],
  }),
});
```

---

## 13. 安全建议

### 13.1 不要在前端暴露 `secret`

`secret` 只能在服务端使用，例如：
- Java 后台
- Node.js 服务端
- Python 后台
- 管理系统后端接口
- Webhook 服务

不要在浏览器端直接携带该密钥调用接口。

### 13.2 使用强随机密钥

建议 `REVALIDATION_SECRET` 使用高强度随机字符串，例如：

```env
REVALIDATION_SECRET=blog-ai-revalidate-strong-secret-2026
```

### 13.3 仅允许后台系统调用

如果后续有需要，可以继续扩展：
- 增加来源 IP 白名单
- 增加调用日志记录
- 增加请求签名机制

---

## 14. 常见问题

### 14.1 为什么调用成功后页面没有立刻变化？

该接口触发的是路径缓存失效。通常在下一次访问该页面时，系统会重新生成页面内容。

### 14.2 可以一次刷新多个页面吗？

可以。通过 `paths` 数组传多个路径即可，但最多 20 个。

### 14.3 文章更新时应该刷新哪些页面？

通常建议至少刷新：
- `/`
- `/articles`
- `/articles/{slug}`

### 14.4 这个接口适合给第三方后台调用吗？

适合，但必须由服务端调用，不能在公开前端环境中暴露密钥。

---

## 15. 接口速查

### 请求

```http
POST /api/revalidate
Content-Type: application/json
```

```json
{
  "secret": "your-secret",
  "paths": ["/", "/articles", "/articles/my-article-slug"]
}
```

### 成功响应

```json
{
  "revalidated": true,
  "paths": ["/", "/articles", "/articles/my-article-slug"]
}
```

### 常见错误

- `401`：密钥错误
- `400`：参数格式错误
- `500`：服务端内部异常
