# Done Safe

Done Safe 是一个离线优先的 POD（Proof of Delivery，交付凭证）网页应用，面向配送司机和运营管理员。网络暂时不可用时，司机仍可查看任务、采集照片和签名，并在网络恢复后同步数据。

## 主要功能

### 司机端

- 展示当天配送任务、星期和日期。
- 使用 Leaflet 和 OpenStreetMap 展示配送路线。
- 支持 Google Maps、Waze 和 Apple Maps 导航。
- 使用摄像头或相册采集照片。
- 支持手机触控签名。
- 至少有照片或签名之一才能完成配送；两者都没有时必须填写异常原因。
- 使用 IndexedDB 保存本地订单、POD 文件和待同步队列。
- 根据浏览器真实在线/离线状态显示顶部状态和自动消失提示。
- 显示待同步数量和同步队列。
- 在“我的”页面查看配送历史。
- 用户菜单支持修改密码和注销登录。

### 管理端

- 首次初始化页面，配置管理员、Cloudflare R2、MongoDB 和邮件服务。
- 管理司机、车辆和账号安全状态。
- 密码连续错误 5 次后锁定 15 分钟。
- 管理员和司机支持 Passkey 注册及登录。
- 支持 SMTP 邮件通知配置，并可选配置 IMAP。

### 多语言

支持 English、简体中文和繁体中文。用户选择的语言会保存到本地 Cookie，下一次访问时自动恢复。

## 技术栈

- React 19、Vite、Leaflet
- IndexedDB、Service Worker、Web App Manifest
- Cloudflare R2：保存照片和签名等交付凭证
- MongoDB：保存订单、用户、车辆、POD 元数据和审计记录
- Node.js：负责认证、同步和外部服务访问

## 环境要求与安装

- Node.js 18 或更高版本
- npm
- 生产环境需要配套的 Node.js 后端 API

```bash
npm install
npm run dev
```

开发服务器默认地址为 `http://localhost:5173`。

## Demo 模式和生产模式

系统默认使用生产模式。只有环境变量严格配置 `mode=demo` 时，才会启用 Demo 模式。

本地运行 Demo 模式时，创建 `.env.local`：

```env
mode=demo
```

生产模式可以不配置该变量，或者配置为：

```env
mode=production
```

修改环境文件后需要重启 Vite。Demo 模式会启用演示账号、演示订单、本地管理员记录和模拟同步；生产模式不会注入演示数据，而是调用后端 API。

MongoDB、R2、SMTP 和 IMAP 密钥不能放入会暴露给浏览器的 Vite 环境变量中，应由 Node.js 后端的 Secret 管理系统保存。

## 可用命令

```bash
npm run dev       # 启动开发服务器
npm run build     # 创建生产构建
npm run preview   # 预览生产构建
npm run lint      # 运行 Oxlint
```

## 后端接口

前端需要后端提供会话、密码、Passkey、初始化、管理员、配送和同步接口。完整的 API、数据库结构和安全要求请参考 [BACKEND_REQUIREMENTS.md](./BACKEND_REQUIREMENTS.md)。

主要生产接口：

```text
GET  /api/auth/session
POST /api/auth/password/login
POST /api/auth/password/change
POST /api/auth/logout
POST /api/auth/passkey/register/options
POST /api/auth/passkey/register/verify
POST /api/auth/passkey/login/options
POST /api/auth/passkey/login/verify
GET  /api/driver/deliveries?date=YYYY-MM-DD
GET  /api/driver/deliveries/history
POST /api/driver/sync/batch
POST /api/setup
```

所有权限和业务规则必须由后端再次校验。没有照片、签名或异常原因时不能完成配送；离线同步必须支持幂等，重复同步不能生成重复记录。

## R2 对象命名规则

```text
{orderId}/{YYYYMMDDHHMMSS}-photo-{uuid}.jpg
{orderId}/{YYYYMMDDHHMMSS}-signature-{uuid}.png
```

R2 对象应保持私有，需要查看文件时由后端生成短期有效的签名 URL。

## 项目结构

```text
src/admin/       管理员控制台
src/auth/        登录、密码和 Passkey 工具
src/config/      运行模式配置
src/driver/      司机端、地图、POD 采集和本地存储
src/i18n.jsx     语言切换和本地化处理
public/          PWA Manifest 和 Service Worker
BACKEND_REQUIREMENTS.md
```

当前仓库包含前端页面结构和离线交互模型。生产环境的凭证持久化、认证、R2 上传和 MongoDB 操作仍需要由 Node.js 后端实现。
