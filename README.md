# 文件全流程管控系统

> 💼 **实习项目**
>
> 这个项目是我 **实习期间独立负责** 的，一个给公司内部用的 **文件管理系统**。我们公司有一点军工保密性质，对文件管控这块要求比较特殊，但说实话，市面上开源的方案其实够用的，调整调整完全能跑起来。可公司偏不，非要自己开发，我也不太理解……感觉很多单位都这样，非要自己动手，我其实挺感慨的：都 2026 年了，开源世界这么庞大，宁愿自己造轮子也不用现成的。所以说，市场真的没有想象中那么饱和。
>
> 项目比较急，公司又提倡用 AI 提效，高级工程师就告诉我说："别从零手写了，用 AI 快速出成果。" 还明确指定了技术栈，于是我就 Vibe Coding 半天时间把 POC 撸出来了。说实话，代码质量肯定还有提升空间，也存在一些小 BUG，但基本功能已经能跑了，该有的都有：用户管理、权限控制、文件上传下载、审计日志……该有的都有。

轻量的企业级内部文件全流程管控系统，适用于小团队、保密单位、军工企业等内部使用。

---

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始（开发环境）](#快速开始开发环境)
- [Docker 一键部署（推荐）](#docker-一键部署推荐)
- [传统手动部署](#传统手动部署)
- [配置说明](#配置说明)
- [API 接口](#api-接口)
- [安全特性](#安全特性)
- [运维操作](#运维操作)
- [常见问题](#常见问题)

---

## 功能特性

- **文件管理**：文件上传/下载/预览，支持公开/私有两种空间，目录管理
- **用户管理**：用户注册/登录，角色权限控制（管理员/普通用户）
- **权限系统**：细粒度位掩码权限（查看/上传/下载/导出/拷贝/目录管理），按公开/私有空间独立配置
- **审计日志**：完整的操作日志记录，文件拷贝专项审计
- **公告管理**：系统公告发布与管理
- **回收站**：文件软删除/恢复/永久删除
- **安全策略**：密码策略、账户锁定、会话超时、JWT 双 Token 认证
- **文件过滤**：扩展名黑白名单，防止恶意文件上传

---

## 技术栈

| 层 | 技术 |
|---|---|
| **后端** | Python 3.12 + Flask 3.1 + SQLAlchemy + Flask-JWT-Extended |
| **前端** | React 19 + React Router 7 + Vite 6 + Tailwind CSS 4 |
| **数据库** | MySQL 8.0（默认）/ SQLite / PostgreSQL |
| **认证** | JWT Token（Access 2h + Refresh 30d） |
| **部署** | Docker Compose + Nginx / Gunicorn + Systemd |

---

## 项目结构

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
│   ├── middleware/                  # 中间件（CORS 配置）
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

## 快速开始（开发环境）

### 后端

```bash
cd backend

# 创建并激活虚拟环境
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux / macOS

# 安装依赖
pip install -r requirements.txt

# 启动（默认 http://localhost:5000）
python app.py
```

### 前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:5173，自动代理 /api 到后端）
npm run dev
```

### 默认管理员账号

| 角色 | 账号 | 密码 |
|---|---|---|
| 管理员 | `admin` | `admin123` |

> ⚠️ 首次登录后请立即修改默认密码！

---

## Docker 一键部署（推荐）

适合快速部署、标准化交付、多机部署。

### 第一步：准备部署包

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

### 第二步：配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，**必须修改**以下项：

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

### 第三步：启动服务

```bash
# 构建并启动（首次运行或代码变更后加 --build）
docker-compose up -d --build

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 第四步：验证

```bash
# 后端健康检查（应返回 401）
curl http://localhost:5000/api/auth/me

# 前端（应返回 200）
curl -I http://localhost
```

浏览器访问 `http://your-server-ip`，使用 `admin` / `admin123` 登录。

---

## 传统手动部署

适合无 Docker 环境、开发调试、或需要精细控制的场景。

### 环境要求

| 软件 | 最低版本 | 说明 |
|---|---|---|
| Python | 3.10+ | 推荐 3.12 |
| MySQL | 8.0+ | 或 MariaDB 10.5+；开发环境可用 SQLite |
| Node.js | 18+ | 仅构建前端时需要 |
| Nginx | 1.20+ | 生产环境反向代理（可选） |

### 1. 创建数据库

```sql
CREATE DATABASE file_control
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

### 2. 部署后端

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

### 3. 构建前端

```bash
cd frontend
npm install
npm run build
```

构建产物生成在 `frontend/dist/`。

### 4. 配置 Nginx

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

### 5. 配置 Systemd 服务（Linux 生产环境）

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

## 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|---|---|---|
| `DATABASE_URL` | 数据库连接字符串 | `mysql+pymysql://root:123456@localhost:3306/file_control?charset=utf8mb4` |
| `SECRET_KEY` | Flask 应用密钥 | `dev-secret-key-...` |
| `JWT_SECRET_KEY` | JWT 签名密钥 | `jwt-dev-secret-key-...` |
| `CORS_ORIGINS` | 允许的跨域来源（逗号分隔） | `http://localhost:5173,http://localhost:3000` |

### config.py 内置配置项

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

### 数据库

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

## API 接口

共 **43 个接口**，分布在 5 个蓝图中。所有接口返回 `{ data: ... }` 或 `{ error: ... }` 格式。

### 认证模块 `/api/auth`

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/login` | 用户登录（返回 JWT Token） |
| POST | `/api/auth/logout` | 退出登录 |
| GET | `/api/auth/me` | 获取当前用户信息及权限 |
| PUT | `/api/auth/profile` | 更新个人资料 |
| POST | `/api/auth/refresh` | 刷新 Access Token |
| POST | `/api/auth/change-password` | 修改密码 |

### 管理模块 `/api/admin`（需管理员权限）

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

### 文件模块 `/api/files`（需登录）

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

### 审计模块 `/api/audit`（需管理员权限）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/audit/logs` | 审计日志查询（筛选+分页） |
| GET | `/api/audit/log-options` | 获取日志筛选下拉选项 |
| GET | `/api/audit/copy` | 拷贝专项审计日志 |

### 公告模块 `/api/announcements`

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/announcements/` | 公告列表 |
| POST | `/api/announcements/` | 创建公告（管理员） |
| DELETE | `/api/announcements/<id>` | 删除公告（管理员） |

---

## 安全特性

- ✅ JWT 双 Token 认证（Access 2h + Refresh 30d，前端自动续期）
- ✅ 密码加密存储（Werkzeug bcrypt）
- ✅ 账户锁定机制（5 次失败锁定 30 分钟）
- ✅ 会话超时控制
- ✅ 文件扩展名黑白名单
- ✅ 位掩码权限系统（细粒度按目录/空间控制）
- ✅ 完整的审计日志（操作记录 + 拷贝专项审计）
- ✅ CORS 跨域控制

---

## 运维操作

### 服务管理

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

### 数据备份与恢复

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

### 更新部署

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

### HTTPS 配置（Let's Encrypt）

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 常见问题

### 1. `ModuleNotFoundError: No module named 'flask'`

使用了全局 Python 而非虚拟环境。确保激活了 `.venv`。

### 2. 数据库连接失败

- 确认 MySQL 已启动，`DATABASE_URL` 中的用户名/密码/端口正确
- Docker 环境中数据库主机名应为 `db`（容器名），而非 `localhost`

### 3. 前端页面空白 / 404

- 确认已执行 `npm run build` 生成 `dist/`
- 确认 Nginx 的 `root` 路径正确，且配置了 `try_files $uri $uri/ /index.html`

### 4. 上传文件失败

- 检查 `uploads/` 目录存在且有写入权限
- 检查文件大小是否超过 50MB（`SINGLE_FILE_MAX_SIZE`）
- 检查扩展名是否在允许列表中
- Nginx 环境下检查 `client_max_body_size`

### 5. Token 过期 / 频繁登出

- Access Token 默认 2h 过期，前端自动用 Refresh Token 续期
- Refresh Token 默认 30d 过期，过期后需重新登录
- 可在 `config.py` 中调整有效期

### 6. Docker 构建慢

配置国内镜像加速，编辑 `/etc/docker/daemon.json`：

```json
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://hub-mirror.c.163.com"
  ]
}
```

### 7. 中文文件名乱码

确保数据库连接字符串包含 `?charset=utf8mb4`，MySQL 使用 `utf8mb4` 字符集。
