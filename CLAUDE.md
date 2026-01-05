# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 TypeScript 的博客后端项目，使用 Express.js 和 Sequelize ORM 构建。项目配置了热重载开发环境和严格的 TypeScript 类型检查。

## 开发命令

- `npm run dev` - 启动开发服务器，支持热重载（nodemon + ts-node）
- `npm run build` - 编译 TypeScript 为 JavaScript（输出到 `dist/` 目录）
- `npm start` - 运行编译后的生产版本（从 `dist/` 目录）

## 项目结构

- **`src/`** - TypeScript 源代码目录
  - `index.ts` - 应用入口文件，Express 服务器配置
- **`dist/`** - 编译后的 JavaScript 输出目录（由 `tsc` 生成）
- **`.env`** - 环境变量配置文件（不纳入版本控制）

## 环境配置

应用使用 `dotenv` 进行配置管理，环境变量从 `.env` 文件加载：

- **端口配置**: 使用 `process.env.prot`（注意：是小写的 "prot"，不是 "PORT"）
  - 在 `.env` 中设置为: `prot=8089`

## TypeScript 配置

项目使用严格的 TypeScript 配置：
- 编译目标: ES2020
- 模块系统: CommonJS
- 启用严格模式及额外检查：
  - 禁止未使用的局部变量/参数
  - 禁止隐式返回
  - 禁止 switch 语句中的穿透
- 启用 source maps 用于调试
- 生成声明文件

## 核心依赖

- **Express 5.x** - Web 框架
- **Sequelize 6.x** - ORM（尚未配置数据库连接）
- **dotenv** - 环境变量管理
- **nodemon** - 开发环境热重载
- **ts-node** - 开发环境 TypeScript 执行器
