# POD Node.js 后端需求文档

## 1. 文档目的

本文档说明当前 React 前端要完整运行时，Node.js 后端需要实现的功能、API、数据结构和安全要求。

推荐技术组合：

- Node.js + TypeScript
- Fastify 或 Express
- MongoDB
- Cloudflare R2（S3-compatible API）
- WebAuthn / Passkey
- SMTP 邮件服务；IMAP 仅在确实需要读取邮箱时启用

前端默认按生产模式运行。只有环境变量严格配置为 `mode=demo` 时，才使用演示数据和本地演示逻辑。

## 2. 后端必须负责的核心功能

1. 初始化工作区和加密保存配置。
2. 管理员、司机、车辆和账号权限管理。
3. Passkey 注册、登录、注销和凭证管理。
4. 司机账号密码登录、6 位密码校验、失败次数和 15 分钟冷却。
5. 密码修改、忘记密码和邮件验证码/重置链接。
6. 按司机和日期返回配送订单。
7. 接收司机离线期间产生的 POD 证据，并上传到 Cloudflare R2。
8. 批量同步离线队列，并保证幂等，避免重复订单或重复文件。
9. 提供订单历史、同步状态、异常原因和审计记录。
10. 提供管理员查看账号状态并解除密码冷却的能力。

## 3. 认证与会话

### 3.1 会话

建议使用服务端 Session，并通过 HttpOnly Cookie 保存 Session ID。

Cookie 至少应具备：

- `HttpOnly`
- `Secure`（生产环境）
- `SameSite=Lax` 或更严格策略
- 合理的过期时间和服务端撤销能力

前端会请求：

```text
GET /api/auth/session
```

返回示例：

```json
{
  "authenticated": true,
  "role": "driver",
  "user": {
    "id": "DRV-001",
    "name": "Jordan Davis",
    "email": "driver@example.com"
  }
}
```

### 3.2 密码登录

```text
POST /api/auth/password/login
```

请求：

```json
{
  "role": "driver",
  "email": "driver@example.com",
  "password": "123456"
}
```

要求：

- 司机默认必须是严格 6 位数字密码。
- 连续失败 5 次后锁定 15 分钟。
- 锁定期间不应继续尝试密码校验。
- 成功登录后重置失败计数。
- 必须使用密码哈希，不能保存明文密码。
- 建议使用 Argon2id；bcrypt 也可以，但应使用足够成本参数。
- 失败计数必须存储在 MongoDB 或 Redis，不能依赖浏览器 LocalStorage。
- 登录接口需要限速、审计和防止账号枚举。

### 3.3 注销

```text
POST /api/auth/logout
```

服务端撤销 Session，清除 Cookie，并返回 `204` 或成功 JSON。

### 3.4 Passkey / WebAuthn

需要实现以下接口：

```text
POST /api/auth/passkey/register/options
POST /api/auth/passkey/register/verify
POST /api/auth/passkey/login/options
POST /api/auth/passkey/login/verify
GET  /api/auth/passkeys
DELETE /api/auth/passkeys/:credentialId
```

实现要求：

- 使用正式 WebAuthn 服务端库，不自行实现签名验证。
- 服务端保存 credential ID、public key、sign count、 transports、创建时间和最近使用时间。
- 注册时必须绑定已认证的管理员或司机账号。
- 登录 options 必须使用短期 challenge，并在服务端保存或绑定到 Session。
- verify 后必须校验 challenge、origin、RP ID、用户存在性和签名计数器。
- 管理员和司机都可以拥有多个 Passkey。
- 删除 Passkey 前应要求当前会话再次验证或确认。

初始化页面的管理员注册使用：

```text
POST /api/auth/passkey/register/options
POST /api/auth/passkey/register/verify
```

### 3.5 修改密码

```text
POST /api/auth/password/change
```

请求：

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password"
}
```

服务端必须验证当前密码、密码强度、重复使用策略，并使其他高风险 Session 失效。

### 3.6 忘记密码

建议接口：

```text
POST /api/auth/password/forgot
POST /api/auth/password/reset
```

要求：

- 无论账号是否存在，forgot 接口都返回相同提示，避免账号枚举。
- 重置 Token 必须随机、短期有效、单次使用，并只保存哈希值。
- 重置链接通过 SMTP 发出。
- 成功重置后撤销旧 Session 和旧重置 Token。

## 4. 初始化 Setup API

当前 Setup 页面收集管理员、Cloudflare R2、MongoDB、邮件和通知配置。需要实现：

```text
GET  /api/setup/status
POST /api/setup
POST /api/setup/test/cloudflare
POST /api/setup/test/mongodb
POST /api/setup/test/email
```

### 4.1 初始化配置

`POST /api/setup` 必须：

- 只允许首次初始化或已认证管理员调用。
- 校验管理员邮箱和密码。
- 校验 R2、MongoDB 和 SMTP 连接信息。
- 加密后保存所有 Secret。
- 创建第一个管理员账号。
- 创建必要的 MongoDB 索引。
- 返回初始化成功状态，不能把 Secret 原样返回给前端。

### 4.2 配置字段

至少支持：

- 管理员姓名、管理员邮箱、初始密码
- Cloudflare Account ID、R2 Bucket、Access Key ID、Secret Access Key
- MongoDB URI、Database、Orders Collection
- 发件邮箱、SMTP Host、SMTP Port、SMTP Username、SMTP Password
- 可选 IMAP Host、IMAP Port、IMAP Username、IMAP Password
- 工作区时区
- 在线/离线 Alert 自动消失秒数

SMTP 用于发送邮件；IMAP 不是发送邮件的协议，只在后端需要读取邮箱、处理回复或同步邮箱状态时使用。

## 5. 管理员 API

所有管理员 API 必须要求管理员 Session，并执行 RBAC 校验。

### 5.1 司机

```text
GET    /api/admin/drivers
POST   /api/admin/drivers
GET    /api/admin/drivers/:driverId
PATCH  /api/admin/drivers/:driverId
DELETE /api/admin/drivers/:driverId
POST   /api/admin/drivers/:driverId/invite
POST   /api/admin/drivers/:driverId/unlock
```

司机至少包含：

```json
{
  "id": "DRV-001",
  "name": "Jordan Davis",
  "email": "driver@example.com",
  "phone": "+61 400 123 456",
  "status": "active",
  "vehicleId": "VAN-042",
  "passwordHash": "...",
  "failedPasswordAttempts": 0,
  "lockedUntil": null,
  "createdAt": "2026-08-31T00:00:00.000Z",
  "updatedAt": "2026-08-31T00:00:00.000Z"
}
```

### 5.2 车辆

```text
GET    /api/admin/vehicles
POST   /api/admin/vehicles
PATCH  /api/admin/vehicles/:vehicleId
DELETE /api/admin/vehicles/:vehicleId
```

车辆至少包含：

```json
{
  "id": "VAN-042",
  "plate": "NSW 42 POD",
  "type": "Transit van",
  "status": "in_service",
  "driverId": "DRV-001"
}
```

删除司机或车辆时建议采用软删除，避免破坏历史订单和审计记录。

### 5.3 账号安全状态

```text
GET  /api/admin/accounts/security
POST /api/admin/accounts/:accountId/unlock
```

返回失败次数、锁定截止时间、最近登录时间、Passkey 数量和账号状态。解除冷却后必须写入审计记录。

## 6. 配送订单 API

### 6.1 获取今日配送

```text
GET /api/driver/deliveries?date=YYYY-MM-DD
```

只返回当前司机被分配的订单。订单应包含收件人、地址、包裹数量、配送类型、优先级和地图坐标。

### 6.2 订单详情和历史

```text
GET /api/driver/deliveries/:orderId
GET /api/driver/deliveries/history?page=1&pageSize=30
```

必须校验司机是否有权访问该订单，不能仅依赖前端传入的 `orderId`。

### 6.3 订单建议结构

```json
{
  "orderId": "ORD-1028",
  "driverId": "DRV-001",
  "vehicleId": "VAN-042",
  "status": "assigned",
  "recipient": "Harbour Homewares",
  "contact": "Mia Chen",
  "address": "12 Wynyard Walk, Sydney NSW 2000",
  "coordinates": [-33.8642, 151.2068],
  "packages": 3,
  "type": "standard",
  "priority": "high",
  "deliveryDate": "2026-08-31",
  "proof": {
    "proofId": null,
    "hasPhoto": false,
    "hasSignature": false,
    "exceptionReason": null,
    "capturedAtClient": null,
    "syncedAt": null
  },
  "createdAt": "2026-08-30T12:00:00.000Z",
  "updatedAt": "2026-08-31T00:00:00.000Z"
}
```

完成规则必须由服务端再次校验：

- 至少有一张照片或一个签名时，可以完成配送。
- 如果照片和签名都没有，必须提供 `exceptionReason`。
- 不能相信前端传来的 `status=completed`，必须根据实际证据重新判断。

## 7. POD 证据和 Cloudflare R2

### 7.1 推荐同步接口

```text
POST /api/driver/sync/batch
```

请求可以使用 `multipart/form-data`，包含订单字段、签名图片和照片；也可以分两阶段上传：先申请上传地址，再直接上传 R2。

推荐两阶段方式：

```text
POST /api/driver/proofs/upload-urls
POST /api/driver/proofs/complete
```

### 7.2 对象 Key

必须支持用户指定的对象划分：

```text
{orderId}/{YYYYMMDDHHMMSS}-photo-{uuid}.jpg
{orderId}/{YYYYMMDDHHMMSS}-signature-{uuid}.png
```

要求：

- 时间统一使用工作区时区或明确使用 UTC，并在元数据中保存原始时间。
- UUID 必须由服务端或安全随机源生成，不能只依赖客户端。
- 服务端验证 MIME、文件扩展名、大小和图片内容。
- 生成对象 Key 时必须防止路径穿越和非法 `orderId`。
- R2 对象应设为私有。
- 查看证据时返回短期 Presigned URL，不直接暴露永久公开 URL。
- 建议限制照片大小，例如 10 MB；签名图片例如 2 MB。

### 7.3 证据元数据

MongoDB 中应保存：

- `proofId`
- `orderId`
- `driverId`
- `objectKey`
- `kind`：`photo` 或 `signature`
- MIME type、文件大小、SHA-256
- 客户端采集时间和服务端接收时间
- 上传状态
- 重试次数和错误信息

## 8. 离线同步和幂等

司机端会先把证明保存在 IndexedDB，再放入 outbox。后端必须允许设备恢复网络后重复发送请求而不产生重复数据。

每个同步项目至少需要：

```json
{
  "clientOperationId": "sync-POD-ORD-1028-abc123",
  "orderId": "ORD-1028",
  "proofId": "POD-ORD-1028-abc123",
  "clientCapturedAt": "2026-08-31T04:30:20.123Z",
  "attempt": 1
}
```

后端要求：

- 对 `clientOperationId` 建唯一索引。
- 重复请求返回原操作结果，而不是重复创建记录。
- 订单状态更新和证据元数据写入应使用 MongoDB Transaction；若部署环境不支持 Transaction，必须设计补偿机制。
- 单个订单同步失败不能阻塞其他订单。
- 返回每个项目的成功、跳过或失败状态。
- 失败结果需要包含可展示给司机的安全错误信息。
- 支持重试，且重试不能重复上传相同证据。

批量响应示例：

```json
{
  "results": [
    { "clientOperationId": "sync-1", "status": "synced", "orderId": "ORD-1028" },
    { "clientOperationId": "sync-2", "status": "failed", "orderId": "ORD-1034", "message": "Temporary storage error" }
  ]
}
```

## 9. MongoDB 建议集合和索引

可以继续使用现有 MongoDB，并为订单单独创建 collection。建议集合如下：

- `orders`
- `users`
- `passkeys`
- `vehicles`
- `proofs`
- `syncOperations`
- `auditLogs`
- `workspaceSettings`

如果希望先简化，也可以把 `proof` 元数据嵌入 `orders`，但独立的 `proofs` 集合更适合多张照片、重试和审计。

至少创建：

```text
orders: { orderId: 1 } unique
orders: { driverId: 1, deliveryDate: 1, status: 1 }
orders: { 'proof.proofId': 1 }
users: { email: 1 } unique
passkeys: { credentialId: 1 } unique
passkeys: { userId: 1 }
syncOperations: { clientOperationId: 1 } unique
proofs: { orderId: 1, kind: 1 }
auditLogs: { actorId: 1, createdAt: -1 }
```

## 10. 邮件服务

### SMTP

SMTP 用于发送：

- 新司机邀请邮件
- Passkey 注册提示
- 忘记密码链接
- 密码修改通知
- 管理员安全告警

必须支持 TLS/STARTTLS、连接超时、发送失败重试和邮件模板。

### IMAP

IMAP 不是发送邮件所必需的。只有以下需求存在时才实现：

- 读取退信。
- 读取司机回复邮件。
- 将外部邮箱内容导入系统。
- 监听人工审核邮箱。

如果没有这些需求，后端只实现 SMTP 即可，不建议为了发送邮件额外引入 IMAP 密钥。

## 11. 安全要求

- 所有 API 使用 HTTPS。
- CORS 只允许实际前端域名。
- Cookie 使用 HttpOnly、Secure、SameSite。
- 对修改、删除、登录和上传接口进行限速。
- 验证所有请求体、查询参数和文件内容。
- 管理员和司机使用最小权限 RBAC。
- R2、MongoDB、SMTP、IMAP Secret 只能存在服务端 Secret 管理系统或加密配置中。
- 不能把 MongoDB URI、R2 Secret Access Key、SMTP 密码返回前端。
- 记录管理员操作、登录失败、密码重置、Passkey 注册/删除和订单状态变化。
- 错误响应不能泄露数据库、文件路径或账号是否存在。
- 上传文件需要防止恶意 SVG、脚本文件和伪造 MIME。
- 对订单、司机和证据访问执行对象级权限校验。

## 12. 推荐环境变量

```env
NODE_ENV=production
PORT=3000
PUBLIC_ORIGIN=https://pod.example.com
MONGODB_URI=mongodb+srv://...
MONGODB_DATABASE=pod
MONGODB_ORDERS_COLLECTION=orders
SESSION_SECRET=...
WEBAUTHN_RP_ID=pod.example.com
WEBAUTHN_RP_NAME=POD
WEBAUTHN_ORIGIN=https://pod.example.com
R2_ACCOUNT_ID=...
R2_BUCKET=pod-evidence-prod
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
MAIL_FROM=admin@example.com
IMAP_HOST=imap.example.com
IMAP_PORT=993
IMAP_USERNAME=...
IMAP_PASSWORD=...
```

`mode=demo` 是前端 Vite 环境变量，不应把生产 Secret 放在 React 前端 `.env` 中。

## 13. HTTP 状态码建议

- `200`：查询或操作成功
- `201`：创建成功
- `204`：注销或删除成功
- `400`：请求格式错误
- `401`：未登录
- `403`：权限不足
- `404`：资源不存在
- `409`：幂等冲突或资源已存在
- `413`：文件过大
- `422`：业务规则校验失败
- `429`：请求过于频繁或密码冷却
- `500/503`：服务端或外部服务暂时不可用

## 14. 完整运行验收标准

后端完成后，至少应验证：

1. 未登录访问 `/` 显示登录页，登录后进入正确的司机或管理员页面。
2. 司机可以使用 6 位密码或 Passkey 登录。
3. 连续输错 5 次后锁定 15 分钟，管理员可以解除锁定。
4. 司机离线时可以查看已经缓存的订单并完成 POD 采集。
5. 只有照片和签名都没有时才要求异常原因。
6. 有照片或签名时订单可以完成且异常原因为空。
7. 恢复网络后 outbox 可以批量同步。
8. 重复点击同步不会生成重复订单、证明或 R2 对象。
9. R2 对象按照指定 Key 规则保存，并可以通过短期 URL 查看。
10. 司机可以查看历史订单，管理员可以管理司机和车辆。
11. 忘记密码、Passkey 注册和安全通知可以通过 SMTP 正常发送。
12. 所有敏感配置不会出现在浏览器存储、响应体或日志中。

