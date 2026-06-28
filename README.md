# 文件全流程管控系统

> 📁 项目背景
>
> 这是我实习期间负责开发的一个企业内部文件全流程管控系统。
>
> 项目来源于公司实际业务需求，由 XX（高级工程师）负责核心需求设计与技术选型，我根据明确的功能要求、业务流程及指定技术栈独立完成系统开发与交付。由于项目研发周期紧、交付要求高，公司积极鼓励引入 AI 生产力工具提效。
>
> 因此，整个项目采用了 **"需求驱动 + Multi-Agent 协同开发 + 自动化与人工双重 Code Review"** 的开发模式。我基于 **Hermes Agent** 与 **Claude Code** 辅助完成需求拆解、任务规划、代码生成、模块开发、重构及问题排查，并结合 Agent 自动化 Code Review、功能测试以及人工业务逻辑验证，对代码质量、异常处理和边界场景进行持续优化，最终完成了一个可部署、可运行的企业内部管理系统。
>
> 该系统主要部署于公司内网，面向部分内部员工使用，重点关注文件全生命周期管理、权限控制、操作审计和安全访问等能力，非常适用于小团队、企业内网以及对数据安全、权限管理要求较高的场景（如军工、保密单位等）。

## 📺 项目演示

[![Bilibili](https://img.shields.io/badge/Bilibili-项目演示-FE2C55?style=for-the-badge&logo=bilibili&logoColor=white)](https://www.bilibili.com/video/BV1EWTK6iEV4/)

---

## 目录

- [📺 项目演示](#-项目演示)
- [1. 项目特点](#1-项目特点)
- [2. 功能特性](#2-功能特性)
- [3. 技术栈](#3-技术栈)
- [4. 项目结构](#4-项目结构)
- [5. 快速开始（开发环境）](#5-快速开始开发环境)
- [6. 部署方案](#6-部署方案)
  - [6.1. Docker 一键部署（推荐）](#61-docker-一键部署推荐)
  - [6.2. 传统手动部署](#62-传统手动部署)
- [7. 配置说明](#7-配置说明)
- [8. API 接口](#8-api-接口)
- [9. 运维操作](#9-运维操作)
- [10. 常见问题](#10-常见问题)

---

## 1. 项目特点

-   **真实企业项目**：来源于实际业务需求，完整经历需求分析、功能开发、测试调试、部署交付等开发流程，并非个人练手 Demo。
-   **AI 工程实践**：基于 Hermes Agent Kanban（多 Profile、多 Agent 协同）与 Claude Code 构建 AI 辅助开发流程，完成需求拆解、任务规划、代码生成、重构、调试及自动化 Code Review，在保证代码质量的前提下显著提升研发效率。
-   **代码质量保障**：结合 Agent 自动化 Code Review 与人工测试，对业务逻辑、权限控制、异常处理及边界条件进行验证与优化，确保系统稳定运行。
-   **完整业务功能**：实现用户管理、RBAC 权限控制、文件上传下载、分片上传、目录管理、文件分享、操作日志、审计记录等核心模块。
-   **工程化实践**：支持 Docker Compose 一键部署，兼容 MySQL、SQLite、PostgreSQL 等数据库，可根据不同环境快速部署与扩展。
-   **独立完成项目交付**：在既定需求、业务流程及技术栈基础上，独立完成系统设计细化、数据库设计、前后端开发、接口联调、部署测试及文档编写，并借助 AI Agent 提升开发效率，实现项目快速交付。

---

## 2. 功能特性

| 模块 | 功能说明 |
|---|---|
| **文件管理** | 文件上传/下载/预览，支持公开/私有两种空间，目录管理 |
| **用户管理** | 用户注册/登录，角色权限控制（管理员/普通用户） |
| **权限系统** | 细粒度位掩码权限（查看/上传/下载/导出/拷贝/目录管理），按公开/私有空间独立配置 |
| **审计日志** | 完整的操作日志记录，文件拷贝专项审计 |
| **公告管理** | 系统公告发布与管理 |
| **回收站** | 文件软删除/恢复/永久删除 |
| **安全策略** | 密码策略、账户锁定、会话超时、JWT 双 Token 认证 |
| **文件过滤** | 扩展名黑白名单，防止恶意文件上传 |

### 安全特性

- ✅ JWT 双 Token 认证（Access 2h + Refresh 30d，前端自动续期）
- ✅ 密码加密存储（Werkzeug bcrypt）
- ✅ 账户锁定机制（5 次失败锁定 30 分钟）
- ✅ 会话超时控制
- ✅ 文件扩展名黑白名单
- ✅ 位掩码权限系统（细粒度按目录/空间控制）
- ✅ 完整的审计日志（操作记录 + 拷贝专项审计）
- ✅ CORS 跨域控制

---

## 3. 技术栈

| 层 | 技术 |
|---|---|
| **后端** | Python 3.12 + Flask 3.1 + SQLAlchemy + Flask-JWT-Extended |
| **前端** | React 19 + React Router 7 + Vite 6 + Tailwind CSS 4 |
| **数据库** | MySQL 8.0（默认）/ SQLite / PostgreSQL |
| **认证** | JWT Token（Access 2h + Refresh 30d） |
| **部署** | Docker Compose + Nginx / Gunicorn + Systemd |

---

## 4. 项目结构

```
文件全流程管控系统/
├── backend/                        # 后端服务
│   ├── app.py                      # Flask 应用入口，蓝图注册，JWT 初始化
│   ├── config.py                   # 配置文件（数据库、JWT、文件策略、安全策略）
│   ├── requirements.txt            # Python 依赖清单
│   ├── Dockerfile                  # 后端 Docker 镜像构建文件
│   ├── models/                     # 数据库模型
│   │   ├── user.py                 # 用户账号与权限模型（位掩码）
│   │   ├── file.py                 # 文件记录与目录模型
│   │   ├── log.py                  # 审计日志模型
│   │   ├── config.py               # 系统配置键值对模型
│   │   └── announcement.py         # 公告模型
│   ├── services/                   # 业务逻辑层
│   │   ├── auth_service.py         # 认证：登录、注册、Token 刷新
│   │   ├── user_service.py         # 用户管理：CRUD、权限设置
│   │   ├── file_service.py         # 文件管理：上传、下载、目录、回收站
│   │   └── audit_service.py        # 审计日志查询
│   ├── blueprints/                 # 路由模块
│   │   ├── auth/                   # 认证接口（/api/auth）
│   │   ├── admin/                  # 管理接口（/api/admin）
│   │   ├── file/                   # 文件接口（/api/files）
│   │   ├── audit/                  # 审计接口（/api/audit）
│   │   └── announce/               # 公告接口（/api/announcements）
│   ├── utils/                      # 工具函数（权限校验、文件验证、请求处理）
│   ├── middleware/                 # 中间件（CORS 配置）
│   └── uploads/                    # 文件存储目录
│       ├── public/                 # 公开文件
│       └── private/                # 私有文件（按用户目录隔离）
├── frontend/                       # 前端应用
│   ├── src/
│   │   ├── api/                    # API 调用封装，JWT Token 管理
│   │   ├── components/             # 共享 UI 组件
│   │   ├── pages/admin/            # 管理员页面
│   │   ├── pages/user/             # 普通用户页面
│   │   └── pages/                  # 公共页面（登录、个人中心、回收站）
│   ├── dist/                       # 构建产物（部署用）
│   ├── package.json                # Node 依赖
│   └── vite.config.js              # Vite 配置（含 API 代理）
├── docker-compose.yml              # Docker 编排文件
├── nginx.conf                      # Nginx 反向代理配置
└── .env.example                    # 环境变量模板
```

---

## 5. 快速开始（开发环境）

### 5.1 后端

```bash
cd backend

# 创建并激活虚拟环境
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux / macOS

# 安装依赖
pip install -r requirements.txt

# 启动（默认 http://localhost: 5000）
python app.py
```

### 5.2 前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost: 5173，自动代理 /api 到后端）
npm run dev
```

### 5.3 默认管理员账号

| 角色 | 账号 | 密码 |
|---|---|---|
| 管理员 | `admin` | `admin123` |

> ⚠️ 首次登录后请立即修改默认密码！

---

## 6. 部署方案

系统提供两种部署方式，根据实际环境选择：

| 方式 | 适用场景 | 复杂度 |
|---|---|---|
| **Docker 一键部署** | 快速部署、标准化交付、多机部署 | 低 |
| **传统手动部署** | 无 Docker 环境、开发调试、精细控制 | 中 |

### 6.1 Docker 一键部署（推荐）

#### 6.1.1 准备部署包

将以下文件/目录拷贝到目标机器：

```
backend/                    # 整个目录（排除 .venv/、__pycache__/）
frontend/dist/              # 仅构建产物（无 Node.js 环境需先 npm run build）
docker-compose.yml
nginx.conf
.env.example
```

如果 `frontend/dist/` 还没有生成，需要先在有 Node.js 环境的机器上构建：

```bash
cd frontend && npm install && npm run build
```

#### 6.1.2 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，**必须修改** 以下项：

```ini
# MySQL root 密码
MYSQL_ROOT_PASSWORD=your_strong_password_here

# Flask 密钥（≥32 位随机字符串）
SECRET_KEY=your-random-secret-key-at-least-32-bytes

# JWT 密钥（≥32 位随机字符串）
JWT_SECRET_KEY=your-random-jwt-secret-key
```

> 生成随机密钥：
> ```bash
> # Linux / macOS
> openssl rand -hex 32
>
> # Windows PowerShell
> -join ((1..32) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
> ```

#### 6.1.3 启动服务

```bash
# 构建并启动（首次运行或代码变更后加 --build）
docker-compose up -d --build

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

#### 6.1.4 验证

```bash
# 后端健康检查（应返回 401）
curl http://localhost:5000/api/auth/me

# 前端（应返回 200）
curl -I http://localhost
```

浏览器访问 `http://your-server-ip`，使用 `admin` / `admin123` 登录。

---

### 6.2 传统手动部署

#### 6.2.1 环境要求

| 软件 | 最低版本 | 说明 |
|---|---|---|
| Python | 3.10+ | 推荐 3.12 |
| MySQL | 8.0+ | 或 MariaDB 10.5+；开发环境可用 SQLite |
| Node.js | 18+ | 仅构建前端时需要 |
| Nginx | 1.20+ | 生产环境反向代理（可选） |

#### 6.2.2 创建数据库

```sql
CREATE DATABASE file_control
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

#### 6.2.3 部署后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Linux / macOS
# .venv\Scripts\activate           # Windows
pip install -r requirements.txt
```

配置数据库连接（任选一种）：

**方式 A：环境变量（推荐）**

```bash
export DATABASE_URL="mysql+pymysql://user:password@localhost:3306/file_control?charset=utf8mb4"
export SECRET_KEY="your-random-secret-key-at-least-32-bytes"
export JWT_SECRET_KEY="your-random-jwt-secret-key"
```

**方式 B：直接修改 `config.py`**

编辑 `backend/config.py` 中的 `SQLALCHEMY_DATABASE_URI`。

启动：

```bash
# 开发模式
python app.py

# 生产模式（Linux）
pip install gunicorn
gunicorn --bind 127.0.0.1:5000 --workers 4 --timeout 120 app:create_app()

# 生产模式（Windows）
pip install waitress
waitress-serve --host=0.0.0.0 --port=5000 --threads=4 app:create_app
```

#### 6.2.4 构建前端

```bash
cd frontend
npm install
npm run build
```

构建产物生成在 `frontend/dist/`。

#### 6.2.5 配置 Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_for_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 100M;
    }

    # 安全头
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
}
```

#### 6.2.6 配置 Systemd 服务（Linux 生产环境）

创建 `/etc/systemd/system/file-control.service`：

```ini
[Unit]
Description=File Control Backend
After=network.target mysql.service

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/opt/file-control/backend
Environment="DATABASE_URL=mysql+pymysql://root:password@localhost:3306/file_control?charset=utf8mb4"
Environment="SECRET_KEY=your-random-secret-key-at-least-32-bytes"
Environment="JWT_SECRET_KEY=your-random-jwt-secret-key"
ExecStart=/opt/file-control/backend/.venv/bin/gunicorn \
    --bind 127.0.0.1:5000 \
    --workers 4 \
    --timeout 120 \
    --access-logfile /var/log/file-control/access.log \
    --error-logfile /var/log/file-control/error.log \
    app:create_app()
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo mkdir -p /var/log/file-control
sudo chown www-data:www-data /var/log/file-control
sudo chown -R www-data:www-data /opt/file-control/backend/uploads
sudo systemctl daemon-reload
sudo systemctl enable --now file-control
```

---

## 7. 配置说明

### 7.1 环境变量

| 变量名 | 说明 | 默认值 |
|---|---|---|
| `DATABASE_URL` | 数据库连接字符串 | `mysql+pymysql://root:123456@localhost:3306/file_control?charset=utf8mb4` |
| `SECRET_KEY` | Flask 应用密钥 | `dev-secret-key-...` |
| `JWT_SECRET_KEY` | JWT 签名密钥 | `jwt-dev-secret-key-...` |
| `CORS_ORIGINS` | 允许的跨域来源（逗号分隔） | `http://localhost:5173,http://localhost:3000` |

### 7.2 config.py 内置配置项

以下配置需直接修改 `backend/config.py`：

| 配置项 | 说明 | 默认值 |
|---|---|---|
| `MAX_CONTENT_LENGTH` | 单次请求最大体积 | 100 MB |
| `SINGLE_FILE_MAX_SIZE` | 单文件最大体积 | 50 MB |
| `BATCH_MAX_SIZE` | 批量上传总体积限制 | 200 MB |
| `ALLOWED_EXTENSIONS` | 允许上传的文件扩展名 | doc, docx, xls, xlsx, pdf, txt, jpg, png, zip, mp4 等 |
| `BLOCKED_EXTENSIONS` | 禁止上传的文件扩展名 | exe, bat, cmd, sh, ps1, vbs, js, msi, dll, scr |
| `PASSWORD_MIN_LENGTH` | 密码最小长度 | 8 |
| `PASSWORD_EXPIRE_DAYS` | 密码过期天数 | 90 |
| `LOGIN_MAX_ATTEMPTS` | 登录失败锁定次数 | 5 |
| `LOGIN_LOCKOUT_MINUTES` | 锁定时长（分钟） | 30 |
| `JWT_ACCESS_TOKEN_EXPIRES` | Access Token 有效期 | 2 小时 |
| `JWT_REFRESH_TOKEN_EXPIRES` | Refresh Token 有效期 | 30 天 |

### 7.3 数据库

应用首次启动时自动执行：

1. 创建所有数据表
2. 创建默认管理员账号（`admin` / `admin123`）
3. 创建根目录（`/public` 和 `/private`）

**无需手动执行 SQL 迁移脚本。**

| 表名 | 说明 |
|---|---|
| `users` | 用户账号信息 |
| `user_permissions` | 用户权限（位掩码） |
| `directories` | 目录/文件夹 |
| `file_records` | 文件元数据记录 |
| `audit_logs` | 操作审计日志 |
| `copy_audits` | 文件拷贝专项审计 |
| `system_configs` | 系统配置键值对 |
| `announcements` | 系统公告 |

---

## 8. API 接口

共 **43 个接口**，分布在 5 个蓝图中。所有接口返回 `{ data: ... }` 或 `{ error: ... }` 格式。

### 8.1 认证模块 `/api/auth`

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/login` | 用户登录（返回 JWT Token） |
| POST | `/api/auth/logout` | 退出登录 |
| GET | `/api/auth/me` | 获取当前用户信息及权限 |
| PUT | `/api/auth/profile` | 更新个人资料 |
| POST | `/api/auth/refresh` | 刷新 Access Token |
| POST | `/api/auth/change-password` | 修改密码 |

### 8.2 管理模块 `/api/admin`（需管理员权限）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/admin/stats` | 仪表盘统计数据 |
| GET | `/api/admin/users` | 用户列表（分页+搜索） |
| POST | `/api/admin/users` | 创建用户 |
| GET | `/api/admin/users/<id>` | 获取用户详情 |
| PUT | `/api/admin/users/<id>` | 更新用户信息 |
| DELETE | `/api/admin/users/<id>` | 删除用户 |
| POST | `/api/admin/users/<id>/reset-password` | 重置用户密码 |
| GET | `/api/admin/users/<id>/permissions` | 获取用户权限 |
| POST | `/api/admin/users/<id>/permissions` | 设置用户权限 |
| GET | `/api/admin/config` | 获取系统配置 |
| PUT | `/api/admin/config` | 更新系统配置 |

### 8.3 文件模块 `/api/files`（需登录）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/files/upload` | 上传文件（支持批量） |
| GET | `/api/files/` | 文件列表（筛选+排序+分页） |
| GET | `/api/files/filter-options` | 获取筛选下拉选项 |
| GET | `/api/files/<id>/download` | 下载文件 |
| GET | `/api/files/<id>/preview` | 预览文件 |
| DELETE | `/api/files/<id>` | 删除文件（移入回收站） |
| POST | `/api/files/batch/delete` | 批量删除 |
| POST | `/api/files/batch/move` | 批量移动 |
| POST | `/api/files/batch/copy` | 批量拷贝 |
| GET | `/api/files/recycle-bin` | 回收站列表 |
| POST | `/api/files/<id>/restore` | 恢复文件 |
| DELETE | `/api/files/<id>/permanent` | 永久删除 |
| DELETE | `/api/files/recycle-bin/empty` | 清空回收站 |
| PUT | `/api/files/<id>/rename` | 重命名文件 |
| PUT | `/api/files/<id>/move` | 移动文件 |
| POST | `/api/files/<id>/copy` | 拷贝文件 |
| GET | `/api/files/directories` | 目录列表 |
| POST | `/api/files/directories` | 创建目录 |
| DELETE | `/api/files/directories/<id>` | 删除目录 |
| PUT | `/api/files/directories/<id>/rename` | 重命名目录 |

### 8.4 审计模块 `/api/audit`（需管理员权限）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/audit/logs` | 审计日志查询（筛选+分页） |
| GET | `/api/audit/log-options` | 获取日志筛选下拉选项 |
| GET | `/api/audit/copy` | 拷贝专项审计日志 |

### 8.5 公告模块 `/api/announcements`

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/announcements/` | 公告列表 |
| POST | `/api/announcements/` | 创建公告（管理员） |
| DELETE | `/api/announcements/<id>` | 删除公告（管理员） |

---

## 9. 运维操作

### 9.1 服务管理

```bash
# Docker
docker-compose up -d              # 启动
docker-compose down               # 停止
docker-compose restart backend    # 重启后端
docker-compose logs -f backend    # 查看日志
docker-compose exec backend bash  # 进入容器调试

# Systemd（Linux）
sudo systemctl start file-control
sudo systemctl stop file-control
sudo systemctl restart file-control
journalctl -u file-control -f     # 查看日志
```

### 9.2 数据备份与恢复

```bash
# 备份数据库
mysqldump -u root -p file_control > backup_$(date +%Y%m%d).sql

# 恢复数据库
mysql -u root -p file_control < backup_20260101.sql

# 备份上传文件
tar czf uploads_backup.tar.gz backend/uploads/

# Docker 环境
docker-compose exec db mysqldump -u root -p file_control > backup.sql
```

### 9.3 更新部署

```bash
# 1. 拉取最新代码 / 替换文件
# 2. 重新构建前端
cd frontend && npm run build && cd ..

# 3. Docker 方式
docker-compose up -d --build

# 4. 传统方式
cd backend && source .venv/bin/activate
pip install -r requirements.txt
# 重启后端服务
```

### 9.4 HTTPS 配置（Let's Encrypt）

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 10. 常见问题

### 10.1 `ModuleNotFoundError: No module named 'flask'`

使用了全局 Python 而非虚拟环境。确保激活了 `.venv`。

### 10.2 数据库连接失败

- 确认 MySQL 已启动，`DATABASE_URL` 中的用户名/密码/端口正确
- Docker 环境中数据库主机名应为 `db`（容器名），而非 `localhost`

### 10.3 前端页面空白 / 404

- 确认已执行 `npm run build` 生成 `dist/`
- 确认 Nginx 的 `root` 路径正确，且配置了 `try_files $uri $uri/ /index.html`

### 10.4 上传文件失败

- 检查 `uploads/` 目录存在且有写入权限
- 检查文件大小是否超过 50MB（`SINGLE_FILE_MAX_SIZE`）
- 检查扩展名是否在允许列表中
- Nginx 环境下检查 `client_max_body_size`

### 10.5 Token 过期 / 频繁登出

- Access Token 默认 2h 过期，前端自动用 Refresh Token 续期
- Refresh Token 默认 30d 过期，过期后需重新登录
- 可在 `config.py` 中调整有效期

### 10.6 Docker 构建慢

配置国内镜像加速，编辑 `/etc/docker/daemon.json`：

```json
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://hub-mirror.c.163.com"
  ]
}
```

### 10.7 中文文件名乱码

确保数据库连接字符串包含 `?charset=utf8mb4`，MySQL 使用 `utf8mb4` 字符集。
