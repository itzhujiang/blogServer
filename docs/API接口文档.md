# 博客后端 API 接口文档

> 基于 Express.js + Sequelize 的 RESTful API 文档

## 基础信息

| 项目 | 值 |
|------|-----|
| 基础路径 | `/api` |
| 认证方式 | JWT Bearer Token |
| 响应格式 | JSON |

### 统一响应格式

```json
{
  "code": 200,
  "msg": "success",
  "data": { ... }
}
```

### 分页响应格式

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "data": [...],
    "pagination": {
      "page": 1,
      "size": 10,
      "total": 100
    }
  }
}
```

### 错误响应

```json
{
  "code": 500,
  "msg": "错误信息",
  "data": null
}
```

---

## 一、用户管理

### 1.1 管理员登录

| 属性 | 值 |
|------|-----|
| **URL** | `/api/user/admin/login` |
| **Method** | `POST` |
| **Content-Type** | `application/json` |

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| username | string | 是 | 账号（3-50字符） |
| password | string | 是 | 密码（至少6字符） |

**请求示例：**
```json
{
  "username": "admin",
  "password": "123456"
}
```

**成功响应：**
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**错误响应：**
```json
{
  "code": 401,
  "msg": "用户名或密码错误",
  "data": null
}
```

---

### 1.2 获取用户信息

| 属性 | 值 |
|------|-----|
| **URL** | `/api/user/admin/getUesrInfo` |
| **Method** | `GET` |
| **认证** | 需要 JWT Token |

**请求头：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| Authorization | string | 是 | Bearer {token} |

**请求参数：**

无（从 Token 中获取用户ID）

**成功响应：**
```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "id": 1,
    "username": "admin",
    "displayName": "翎羽",
    "email": "admin@example.com",
    "avatarUrl": "/uploads/avatar/xxx.jpg"
  }
}
```

**错误响应：**
```json
{
  "code": 500,
  "msg": "当前用户不存在",
  "data": null
}
```

---

## 二、文章管理

### 2.1 获取文章列表

| 属性 | 值 |
|------|-----|
| **URL** | `/api/blog/article/getArticleList` |
| **Method** | `GET` |

**请求参数 (Query)：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| page | number | 否 | 页码，默认 1 |
| size | number | 否 | 每页数量，默认 10，最大 100 |
| title | string | 否 | 文章标题（模糊查询） |
| status | string | 否 | 状态：draft/published/archived |
| categoryId | number | 否 | 分类ID |
| publishedAtStart | number | 否 | 发布时间开始（毫秒时间戳） |
| publishedAtEnd | number | 否 | 发布时间结束（毫秒时间戳） |
| viewCountSort | string | 否 | 浏览量排序：asc/desc |

**响应示例：**
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "data": [
      {
        "id": 1,
        "title": "文章标题",
        "slug": "article-slug",
        "excerpt": "文章摘要",
        "thumbnailUrl": "/uploads/file/2024/01/xxx.jpg",
        "fileUrl": "/uploads/file/2024/01/article-content.md",
        "attachmentUrlArr": [
          "/uploads/file/2024/01/attachment1.pdf",
          "/uploads/file/2024/01/attachment2.zip"
        ],
        "authorName": "翎羽",
        "readingTime": 10,
        "viewCount": 100,
        "status": "published",
        "publishedAt": 1704067200000,
        "categories": [
          { "id": 1, "name": "技术", "slug": "tech" }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "size": 10,
      "total": 50
    }
  }
}
```

---

### 2.2 添加文章

| 属性 | 值 |
|------|-----|
| **URL** | `/api/blog/article/addArticle` |
| **Method** | `POST` |
| **Content-Type** | `application/json` |

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| title | string | 是 | 文章标题 |
| slug | string | 是 | URL友好标识（唯一） |
| thumbnailCode | string | 否 | 缩略图文件Code |
| excerpt | string | 是 | 文章摘要 |
| articleCode | string | 是 | 文章内容文件Code |
| attachmentList | {code: string, source: string} | 否 | 附件文件Code数组 |
| categories | number[] | 否 | 分类ID数组 |

**成功响应：**
```json
{
  "code": 200,
  "msg": "添加文章成功",
  "data": null
}
```

---

### 2.3 修改文章

| 属性 | 值 |
|------|-----|
| **URL** | `/api/blog/article/updateArticle` |
| **Method** | `PUT` |
| **Content-Type** | `application/json` |

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| id | number | 是 | 文章ID |
| title | string | 否 | 文章标题 |
| slug | string | 否 | URL友好标识 |
| thumbnailCode | string | 否 | 缩略图文件Code |
| excerpt | string | 否 | 文章摘要 |
| articleCode | string | 否 | 文章内容文件Code |
| attachmentList | {code: string, source: string} | 否 | 附件文件Code数组 |
| categories | number[] | 否 | 分类ID数组 |
| isUpdateArticle | boolean | 否 | 是否更新文章内容 |
| isUpdateThumbnail | boolean | 否 | 是否更新缩略图 |

**成功响应：**
```json
{
  "code": 200,
  "msg": "修改文章成功",
  "data": null
}
```

---

### 2.4 删除文章

| 属性 | 值 |
|------|-----|
| **URL** | `/api/blog/article/delArticle` |
| **Method** | `DELETE` |

**请求参数 (Query)：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| id | number | 是 | 文章ID |

**成功响应：**
```json
{
  "code": 200,
  "msg": "删除文章成功",
  "data": null
}
```

---

## 三、分类管理

### 3.1 获取分类列表

| 属性 | 值 |
|------|-----|
| **URL** | `/api/blog/category/getCategoryList` |
| **Method** | `GET` |

**请求参数 (Query)：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| page | number | 否 | 页码，默认 1 |
| size | number | 否 | 每页数量，默认 10 |
| name | string | 否 | 分类名称（模糊查询） |

**响应示例：**
```json
{
  "code": 200,
  "msg": "获取分类列表成功",
  "data": {
    "data": [
      {
        "id": 1,
        "name": "技术",
        "slug": "tech",
        "createdAt": 1704067200000,
        "updatedAt": 1704067200000
      }
    ],
    "pagination": {
      "page": 1,
      "size": 10,
      "total": 20
    }
  }
}
```

---

### 3.2 添加分类

| 属性 | 值 |
|------|-----|
| **URL** | `/api/blog/category/addCategory` |
| **Method** | `POST` |
| **Content-Type** | `application/json` |

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| name | string | 是 | 分类名称 |
| slug | string | 是 | URL标识（唯一） |

**成功响应：**
```json
{
  "code": 200,
  "msg": "添加分类成功",
  "data": null
}
```

**错误响应：**
```json
{
  "code": 500,
  "err": "分类URL标识已存在"
}
```

---

### 3.3 修改分类

| 属性 | 值 |
|------|-----|
| **URL** | `/api/blog/category/updateCategory` |
| **Method** | `PUT` |
| **Content-Type** | `application/json` |

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| id | number | 是 | 分类ID |
| name | string | 是 | 分类名称 |
| slug | string | 是 | URL标识 |

**成功响应：**
```json
{
  "code": 200,
  "msg": "修改分类成功",
  "data": null
}
```

**错误响应：**
```json
{
  "code": 500,
  "err": "分类ID不存在"
}
```

---

### 3.4 删除分类

| 属性 | 值 |
|------|-----|
| **URL** | `/api/blog/category/delCategory` |
| **Method** | `DELETE` |

**请求参数 (Query)：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| id | number | 是 | 分类ID |

**成功响应：**
```json
{
  "code": 200,
  "msg": "删除分类成功",
  "data": null
}
```

**错误响应：**
```json
{
  "code": 500,
  "msg": "分类不存在，无法删除",
  "data": null
}
```

---

## 四、评论管理

### 4.1 获取评论列表

| 属性 | 值 |
|------|-----|
| **URL** | `/api/blog/comment/getCommentsList` |
| **Method** | `GET` |

**请求参数 (Query)：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| page | number | 否 | 页码，默认 1 |
| size | number | 否 | 每页数量，默认 10 |
| id | number | 否 | 评论ID |
| parentId | number | 否 | 父评论ID |
| status | string | 否 | 状态：pending/approved/spam/trash |
| authorName | string | 否 | 评论者名称（模糊查询） |
| articleId | number | 否 | 文章ID |
| likeCountSort | string | 否 | 点赞数排序：asc/desc |
| createDateTimeStart | number | 否 | 创建时间开始（毫秒时间戳） |
| createDateTimeEnd | number | 否 | 创建时间结束（毫秒时间戳） |

**响应示例：**
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "data": [
      {
        "id": 1,
        "articleId": 1,
        "parentId": null,
        "authorName": "张三",
        "authorEmail": "zhangsan@example.com",
        "authorUrl": "https://example.com",
        "content": "这是一条评论",
        "status": "approved",
        "likeCount": 10,
        "createdAt": 1704067200000
      }
    ],
    "pagination": {
      "page": 1,
      "size": 10,
      "total": 50
    }
  }
}
```

---

### 4.2 审核评论

| 属性 | 值 |
|------|-----|
| **URL** | `/api/blog/comment/reviewComment` |
| **Method** | `PUT` |
| **Content-Type** | `application/json` |

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| id | number | 是 | 评论ID |
| status | string | 是 | 状态：pending/approved/spam/trash |

**成功响应：**
```json
{
  "code": 200,
  "msg": "评论审核状态更新成功",
  "data": null
}
```

**错误响应：**
```json
{
  "code": 500,
  "msg": "评论不存在",
  "data": null
}
```

---

### 4.3 删除评论

| 属性 | 值 |
|------|----|
| **URL** | `/api/blog/comment/delComment` |
| **Method** | `delete` |
| **Content-Type** | `application/json` |

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| id | number | 是 | 评论ID |

**成功响应：**
```json
{
  "code": 200,
  "msg": "评论删除成功",
  "data": null
}
```

**错误响应：**
```json
{
  "code": 500,
  "msg": "评论不存在",
  "data": null
}
```


## 五、媒体文件上传

### 5.1 单文件上传

| 属性 | 值 |
|------|-----|
| **URL** | `/api/blog/media/upload` |
| **Method** | `POST` |
| **Content-Type** | `multipart/form-data` |

**请求参数 (Form)：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| file | File | 是 | 上传的文件（最大 **2MB**） |

**响应示例：**
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "code": "uuid-code-string",
    "size": 1024000,
    "url": "/uploads/temp/uuid-filename.jpg",
    "fileName": "original-name.jpg"
  }
}
```

---

### 5.2 大文件初始化

| 属性 | 值 |
|------|-----|
| **URL** | `/api/blog/media/bigFileInit` |
| **Method** | `POST` |
| **Content-Type** | `application/json` |

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| fileName | string | 是 | 文件名 |
| fileSize | number | 是 | 文件大小（字节） |
| mimeType | string | 是 | 文件 MIME 类型 |
| fileHash | string | 是 | 文件 MD5（用于秒传） |
| chunkSize | number | 否 | 分片大小，默认 2MB |

**响应示例：**
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "identifier": "uuid-string",
    "chunkSize": 2097152,
    "totalChunks": 10,
    "uploadedChunks": [1, 2, 3],
    "isNew": true,
    "existingFileUrl": null
  }
}
```

**秒传响应示例：**
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "identifier": "uuid-string",
    "chunkSize": 2097152,
    "totalChunks": 10,
    "uploadedChunks": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    "isNew": false,
    "existingFileUrl": "/uploads/temp/existing-file.mp4"
  }
}
```

---

### 5.3 大文件分片上传

| 属性 | 值 |
|------|-----|
| **URL** | `/api/blog/media/bigFileChunk` |
| **Method** | `POST` |
| **Content-Type** | `multipart/form-data` |

**请求参数 (Form)：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| file | File | 是 | 分片文件 |
| identifier | string | 是 | 文件标识 |
| chunkNumber | number | 是 | 分片序号（从1开始） |
| chunkHash | string | 否 | 分片 MD5 |

**响应示例：**
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "chunkNumber": 3,
    "uploadedChunks": [1, 2, 3],
    "progress": 30
  }
}
```

---

### 5.4 大文件合并

| 属性 | 值 |
|------|-----|
| **URL** | `/api/blog/media/bigFileMerge` |
| **Method** | `POST` |
| **Content-Type** | `application/json` |

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| identifier | string | 是 | 文件标识 |

**响应示例：**
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "code": "uuid-code-string",
    "size": 20480000,
    "url": "/uploads/temp/merged-file.mp4",
    "fileName": "original-name.mp4"
  }
}
```

---

### 5.5 大文件上传状态查询

| 属性 | 值 |
|------|-----|
| **URL** | `/api/blog/media/bigFileStatus` |
| **Method** | `GET` |

**请求参数 (Query)：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| identifier | string | 是 | 文件标识 |

**响应示例：**
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "identifier": "uuid-string",
    "status": "uploading",
    "uploadedChunks": [1, 2, 3, 4, 5],
    "progress": 50
  }
}
```

**状态说明：**
- `uploading`: 上传中
- `completed`: 已完成
- `failed`: 上传失败

---

## 六、关于我页面

### 6.1 获取关于我信息

| 属性 | 值 |
|------|-----|
| **URL** | `/api/blog/about-me/info` |
| **Method** | `GET` |

**响应示例：**
```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "data": [{
      "id": 1,
      "nickname": "翎羽",
      "jobTitle": "全栈开发工程师",
      "avatarUrl": "/uploads/file/2024/01/avatar.jpg",
      "contentUrl": "/uploads/file/2024/01/about-content.md",
      "personalTags": ["技术", "设计"],
      "contactInfo": {
        "email": "example@email.com",
        "phone": "13800000000"
      },
      "socialLinks": {
        "github": "https://github.com/xxx"
      },
      "skills": [
        {
          "category": "前端开发",
          "items": [
            { "name": "React & Next.js", "level": 90 },
            { "name": "Vue & Nuxt.js", "level": 85 }
          ]
        }
      ],
      "timeline": [
        {
          "timestamp": 1704067200000,
          "title": "开启博客之旅",
          "description": "创建个人博客，记录技术与生活。"
        }
      ]
    }],
    "pagination": {
      "page": 1,
      "size": 1,
      "total": 1
    }
  }
}
```

**字段说明：**
- `avatarUrl`: 头像图片 URL
- `contentUrl`: 个人简介内容文件 URL（Markdown 格式）
- 前端需要通过 `contentUrl` 获取 Markdown 文件内容并渲染

---

### 6.2 更新关于我信息

| 属性 | 值 |
|------|-----|
| **URL** | `/api/blog/about-me/update` |
| **Method** | `PUT` |
| **Content-Type** | `application/json` |

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| id | number | 是 | 关于我ID |
| jobTitle | string | 是 | 职业标签 |
| avatarCode | string | 否 | 头像文件Code |
| contentCode | string | 否 | 内容文件Code（Markdown格式） |
| personalTags | array | 是 | 个人标签数组 |
| contactInfo | object | 是 | 联系方式 |
| socialLinks | object | 是 | 社交媒体链接 |
| skills | array | 是 | 技能专长数组 |
| timeline | array | 是 | 成长足迹数组 |
| isUpdateAvatar | boolean | 是 | 是否更新头像 |
| isUpdateContent | boolean | 是 | 是否更新内容文件 |

**请求示例：**
```json
{
  "id": 1,
  "jobTitle": "全栈开发工程师",
  "avatarCode": "uuid-avatar-code",
  "contentCode": "uuid-content-code",
  "personalTags": ["技术", "设计"],
  "contactInfo": {
    "email": "example@email.com",
    "phone": "13800000000"
  },
  "socialLinks": {
    "github": "https://github.com/xxx"
  },
  "skills": [
    {
      "category": "前端开发",
      "items": [
        { "name": "React", "level": 90 }
      ]
    }
  ],
  "timeline": [
    {
      "timestamp": 1704067200000,
      "title": "开启博客之旅",
      "description": "创建个人博客"
    }
  ],
  "isUpdateAvatar": true,
  "isUpdateContent": true
}
```

**成功响应：**
```json
{
  "code": 200,
  "msg": "关于我信息更新成功",
  "data": null
}
```

**字段说明：**
- `avatarCode`: 通过媒体上传接口获取的头像文件 Code
- `contentCode`: 通过媒体上传接口获取的内容文件 Code（需上传 Markdown 文件）
- `isUpdateAvatar`: 设置为 `true` 时才会更新头像
- `isUpdateContent`: 设置为 `true` 时才会更新内容文件
- 可以同时更新头像和内容，也可以只更新其中一个

---

## 七、站点设置

### 7.1 获取站点设置

| 属性 | 值 |
|------|-----|
| **URL** | `/api/blog/site-setting/getSettings` |
| **Method** | `GET` |

**请求参数 (Query)：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| page | number | 否 | 页码，默认 1 |
| size | number | 否 | 每页数量，默认 10，最大 100 |

**响应示例：**
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "data": [
      {
        "id": 1,
        "settingKey": "site_title",
        "settingValue": "我的博客",
        "settingType": "string",
        "description": "网站标题",
        "updatedAt": 1704067200000,
        "createdAt": 1704067200000
      },
      {
        "id": 2,
        "settingKey": "posts_per_page",
        "settingValue": "10",
        "settingType": "number",
        "description": "每页文章数",
        "updatedAt": 1704067200000,
        "createdAt": 1704067200000
      }
    ],
    "pagination": {
      "page": 1,
      "size": 10,
      "total": 20
    }
  }
}
```

---

### 7.2 添加站点设置

| 属性 | 值 |
|------|-----|
| **URL** | `/api/blog/site-setting/addSettings` |
| **Method** | `POST` |
| **Content-Type** | `application/json` |

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| settingKey | string | 是 | 设置键（唯一标识） |
| settingValue | any | 是 | 设置值 |
| settingType | string | 是 | 类型：string/number/boolean/json |
| description | string | 是 | 设置描述 |

**请求示例：**
```json
{
  "settingKey": "site_title",
  "settingValue": "我的博客",
  "settingType": "string",
  "description": "网站标题"
}
```

**成功响应：**
```json
{
  "code": 200,
  "msg": "站点设置添加成功",
  "data": null
}
```

**错误响应（设置键已存在）：**
```json
{
  "code": 500,
  "msg": "已存在该站点设置",
  "data": null
}
```

---

### 7.3 更新站点设置

| 属性 | 值 |
|------|-----|
| **URL** | `/api/blog/site-setting/updateSettings` |
| **Method** | `PUT` |
| **Content-Type** | `application/json` |

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|:----:|------|
| id | number | 是 | 设置ID |
| settingKey | string | 否 | 设置键 |
| settingType | string | 否 | 类型：string/number/boolean/json |
| settingValue | any | 否 | 设置值 |
| description | string | 否 | 设置描述 |

**请求示例：**
```json
{
  "id": 1,
  "settingValue": "新的博客名称",
  "description": "网站标题（已更新）"
}
```

**成功响应：**
```json
{
  "code": 200,
  "msg": "站点设置更新成功",
  "data": null
}
```

**错误响应：**
```json
{
  "code": 500,
  "msg": "不存在该站点设置",
  "data": null
}
```

---

### 7.4 响应字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | number | 设置ID |
| settingKey | string | 配置键名（唯一标识） |
| settingValue | string/number/boolean/json | 配置值 |
| settingType | string | 值类型（string/number/boolean/json） |
| description | string | 配置说明 |
| updatedAt | number | 更新时间（毫秒级Unix时间戳） |
| createdAt | number | 创建时间（毫秒级Unix时间戳） |

---

## 八、枚举值说明

### 文章状态 (ArticleStatus)
| 值 | 说明 |
|----|------|
| draft | 草稿 |
| published | 已发布 |
| archived | 已归档 |

### 评论状态 (CommentStatus)
| 值 | 说明 |
|----|------|
| pending | 待审核 |
| approved | 已通过 |
| spam | 垃圾评论 |
| trash | 已删除 |

### 设置类型 (SettingType)
| 值 | 说明 |
|----|------|
| string | 字符串 |
| number | 数字 |
| boolean | 布尔 |
| json | JSON对象 |

---

## 九、接口文件索引

| 模块 | 路由文件 | 服务文件 |
|------|---------|---------|
| 用户管理 | `src/api/user/admin.ts` | `src/services/user/admin.ts` |
| 文章 | `src/api/blog/article.ts` | `src/services/blog/article.ts` |
| 分类 | `src/api/blog/category.ts` | `src/services/blog/category.ts` |
| 评论 | `src/api/blog/comment.ts` | `src/services/blog/comment.ts` |
| 媒体 | `src/api/blog/mediaFile.ts` | `src/services/blog/mediaFile.ts` |
| 关于我 | `src/api/blog/aboutMe.ts` | `src/services/blog/aboutMe.ts` |
| 站点设置 | `src/api/blog/siteSetting.ts` | `src/services/blog/siteSetting.ts` |
