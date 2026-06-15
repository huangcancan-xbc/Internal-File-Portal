# Internal File Portal

> 💼 **实习项目**
>
> 这个项目是我 **实习期间独立负责** 的，一个给公司内部用的 **文件管理系统**。我们公司有一点军工保密性质，对文件管控这块要求比较特殊，但说实话，市面上开源的方案其实够用的，调整调整完全能跑起来。可公司偏不，非要自己开发，我也不太理解……感觉很多单位都这样，非要自己动手，我其实挺感慨的：都 2026 年了，开源世界这么庞大，宁愿自己造轮子也不用现成的。所以说，市场真的没有想象中那么饱和。
>
> 项目比较急，公司又提倡用 AI 提效，高级工程师就告诉我说："别从零手写了，用 AI 快速出成果。" 还明确指定了技术栈，于是我就 Vibe Coding 半天时间把 POC 撸出来了。说实话，代码质量肯定还有提升空间，也存在一些小 BUG，但基本功能已经能跑了，该有的都有：用户管理、权限控制、文件上传下载、审计日志……该有的都有。
>

这是一个轻量的企业级内部文件全流程管控系统，适用于小团队、保密单位、军工企业等内部使用。

## ✨ 功能特性

- **文件管理**：文件上传/下载，支持公开/私有两种空间
- **用户管理**：用户注册/登录，角色权限控制
- **权限系统**：细粒度权限控制（查看/上传/下载）
- **审计日志**：完整的操作日志记录
- **公告管理**：系统公告发布与管理
- **安全策略**：密码策略、账户锁定、会话超时
- **文件过滤**：扩展名黑白名单，防止恶意文件上传

## 🛠️ 技术栈

| 层 | 技术 |
| --- | --- |
| **后端** | Flask 3.x + SQLAlchemy + JWT |
| **前端** | React 19 + Vite + Tailwind CSS |
| **数据库** | SQLite（默认）/ MySQL / PostgreSQL |
| **认证** | JWT Token（Access + Refresh） |

## 📁 项目结构

```
Internal-File-Portal/
├── backend/
│   ├── app.py              # Flask 应用入口
│   ├── config.py           # 配置文件
│   ├── requirements.txt    # Python 依赖
│   ├── blueprints/         # 路由模块
│   │   ├── auth/           # 认证接口
│   │   ├── admin/          # 管理接口
│   │   ├── file/           # 文件接口
│   │   ├── audit/          # 审计接口
│   │   └── announce/       # 公告接口
│   ├── models/             # 数据模型
│   ├── services/           # 业务逻辑
│   ├── middleware/         # 中间件
│   ├── utils/              # 工具函数
│   └── uploads/            # 文件存储
│       ├── public/         # 公开文件
│       └── private/        # 私有文件
└── frontend/
    ├── src/                # React 源码
    ├── public/             # 静态资源
    ├── package.json        # 前端依赖
    └── vite.config.js      # Vite 配置
```

## 🚀 快速开始

### 后端

```bash
# 进入后端目录
cd backend

# 创建虚拟环境
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # Linux/Mac

# 安装依赖
pip install -r requirements.txt

# 启动服务
python app.py
```

后端默认运行在 `http://localhost:5000`

### 前端

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端默认运行在 `http://localhost:5173`

## 🔑 默认账号

| 角色 | 账号 | 密码 |
| --- | --- | --- |
| 管理员 | admin | admin123 |

> ⚠️ 首次登录后请立即修改默认密码！

## 🔧 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
| --- | --- | --- |
| `SECRET_KEY` | Flask 密钥 | `dev-secret-key-...` |
| `JWT_SECRET_KEY` | JWT 密钥 | `jwt-dev-secret-...` |
| `DATABASE_URL` | 数据库连接 | `sqlite:///app.db` |

### 文件限制

| 配置项 | 说明 | 默认值 |
| --- | --- | --- |
| `MAX_CONTENT_LENGTH` | 单次请求最大大小 | 100MB |
| `SINGLE_FILE_MAX_SIZE` | 单文件最大大小 | 50MB |
| `BATCH_MAX_SIZE` | 批量上传最大大小 | 200MB |

### 安全策略

| 配置项 | 说明 | 默认值 |
| --- | --- | --- |
| `LOGIN_MAX_ATTEMPTS` | 最大登录尝试次数 | 5 次 |
| `LOGIN_LOCKOUT_MINUTES` | 锁定时间 | 30 分钟 |
| `SESSION_TIMEOUT_MINUTES` | 会话超时 | 30 分钟 |
| `PASSWORD_EXPIRE_DAYS` | 密码过期天数 | 90 天 |

## 📡 API 接口

### 认证模块

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/refresh` | 刷新 Token |
| POST | `/api/auth/logout` | 退出登录 |

### 文件模块

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/file/list` | 获取文件列表 |
| POST | `/api/file/upload` | 上传文件 |
| GET | `/api/file/download/{id}` | 下载文件 |
| DELETE | `/api/file/delete/{id}` | 删除文件 |

### 管理模块

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/admin/users` | 获取用户列表 |
| PUT | `/api/admin/users/{id}` | 更新用户信息 |
| DELETE | `/api/admin/users/{id}` | 删除用户 |

### 审计模块

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/audit/logs` | 获取审计日志 |

### 公告模块

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/announce/list` | 获取公告列表 |
| POST | `/api/announce/create` | 创建公告 |

## 🔒 安全特性

- ✅ JWT Token 认证（Access + Refresh）
- ✅ 密码加密存储（bcrypt）
- ✅ 账户锁定机制（防暴力破解）
- ✅ 会话超时控制
- ✅ 文件扩展名黑白名单
- ✅ 完整的审计日志

## 📝 开发说明

### 数据库迁移

```bash
# 初始化迁移
flask db init

# 生成迁移脚本
flask db migrate -m "description"

# 执行迁移
flask db upgrade
```

### 添加新的 API 接口

1. 在 `blueprints/` 下创建新的蓝图
2. 在 `models/` 下定义数据模型
3. 在 `services/` 下实现业务逻辑
4. 在 `app.py` 中注册蓝图

