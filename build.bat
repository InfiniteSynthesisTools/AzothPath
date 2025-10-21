@echo off
chcp 65001 >nul
echo ========================================
echo   Azoth Path 项目打包脚本
echo ========================================
echo.

REM 检查 Node.js 是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误: 未检测到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

echo ✅ Node.js 版本:
call node --version
echo.

REM 检查 npm 是否安装
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误: 未检测到 npm
    pause
    exit /b 1
)

echo ✅ npm 版本:
call npm --version
echo.

REM 设置构建目录
set BUILD_DIR=dist
set FRONTEND_DIR=frontend
set BACKEND_DIR=backend

echo ========================================
echo   步骤 1/5: 清理旧的构建文件
echo ========================================
echo.

if exist "%BUILD_DIR%" (
    echo 🗑️  删除旧的 dist 目录...
    rmdir /s /q "%BUILD_DIR%"
)

mkdir "%BUILD_DIR%"
mkdir "%BUILD_DIR%\frontend"
mkdir "%BUILD_DIR%\backend"
mkdir "%BUILD_DIR%\backend\database"

echo ✅ 构建目录已创建
echo.

echo ========================================
echo   步骤 2/5: 构建前端
echo ========================================
echo.

cd "%FRONTEND_DIR%"

echo 📦 安装前端依赖（详细模式）...
echo 💡 提示: 安装原生模块时可能需要几分钟，请耐心等待
call npm install --verbose --progress=true
if %errorlevel% neq 0 (
    echo ❌ 前端依赖安装失败
    cd ..
    pause
    exit /b 1
)

echo 🔨 构建前端生产版本...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ 前端构建失败
    cd ..
    pause
    exit /b 1
)

echo 📁 复制前端构建文件到 dist...
xcopy /s /e /y "dist\*" "..\%BUILD_DIR%\frontend\"

cd ..
echo ✅ 前端构建完成
echo.

echo ========================================
echo   步骤 3/5: 构建后端
echo ========================================
echo.

cd "%BACKEND_DIR%"

echo 📦 安装后端依赖（详细模式）...
echo 💡 提示: 编译 sqlite3 原生模块可能需要 2-5 分钟，请耐心等待
echo 📊 正在显示详细安装日志...
echo.
call npm install --verbose --progress=true
if %errorlevel% neq 0 (
    echo ❌ 后端依赖安装失败
    cd ..
    pause
    exit /b 1
)

echo 🔨 构建后端 TypeScript...
call npx tsc
if %errorlevel% neq 0 (
    echo ❌ 后端构建失败
    cd ..
    pause
    exit /b 1
)

echo 📁 复制后端文件到 dist...
xcopy /s /e /y "dist\*" "..\%BUILD_DIR%\backend\dist\"
copy "package.json" "..\%BUILD_DIR%\backend\"
copy "package-lock.json" "..\%BUILD_DIR%\backend\" 2>nul

cd ..
echo ✅ 后端构建完成
echo.

echo ========================================
echo   步骤 4/5: 复制必要文件
echo ========================================
echo.

REM 复制数据库初始化脚本
echo 📁 复制数据库初始化脚本...
copy "database\init.sql" "%BUILD_DIR%\backend\database\init.sql"

REM 创建生产环境配置文件
echo 📝 创建生产环境配置...
(
echo NODE_ENV=production
echo PORT=19198
echo DB_PATH=database/azothpath.db
echo VALIDATION_API_URL=https://hc.tsdo.in/api
) > "%BUILD_DIR%\backend\.env.example"

echo ✅ 文件复制完成
echo.

echo ========================================
echo   步骤 5/5: 创建部署文件
echo ========================================
echo.

REM 创建 Linux 启动脚本
echo 📝 创建启动脚本 start.sh...
(
echo #!/bin/bash
echo echo "========================================"
echo echo "   Azoth Path 启动脚本"
echo echo "========================================"
echo echo ""
echo echo "前端地址: http://localhost:11451"
echo echo "后端地址: http://localhost:19198"
echo echo "API 文档: http://localhost:19198/api"
echo echo ""
echo echo "正在启动后端服务..."
echo cd backend
echo npm install --verbose --progress=true --production
echo echo ""
echo echo "初始化数据库..."
echo node dist/database/connection.js
echo echo ""
echo echo "✅ 后端服务启动中..."
echo LOGFILE="../logs/backend_$(date +%%Y%%m%%d_%%H%%M%%S).log"
echo nohup node dist/index.js ^> "$LOGFILE" 2^>^&1 ^&
echo cd ..
echo echo ""
echo echo "✅ 后端已启动，日志文件: $LOGFILE"
echo echo "📝 前端静态文件位于 frontend 目录"
echo echo "💡 请使用 Nginx 或其他 Web 服务器托管前端文件"
) > "%BUILD_DIR%\start.sh"


REM 创建 Nginx 配置示例
echo 📝 创建 Nginx 配置 nginx.conf...
(
echo server {
echo     listen 80;
echo     server_name your-domain.com;  # 修改为你的域名
echo.
echo     # 前端静态文件
echo     location / {
echo         root /path/to/azothpath/frontend;  # 修改为实际路径
echo         try_files $uri $uri/ /index.html;
echo         
echo         # Gzip 压缩
echo         gzip on;
echo         gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
echo     }
echo.
echo     # 后端 API 代理
echo     location /api {
echo         proxy_pass http://localhost:19198;
echo         proxy_http_version 1.1;
echo         proxy_set_header Upgrade $http_upgrade;
echo         proxy_set_header Connection 'upgrade';
echo         proxy_set_header Host $host;
echo         proxy_set_header X-Real-IP $remote_addr;
echo         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
echo         proxy_set_header X-Forwarded-Proto $scheme;
echo         proxy_cache_bypass $http_upgrade;
echo     }
echo }
) > "%BUILD_DIR%\nginx.conf"

REM 创建部署说明文档
echo 📝 创建部署说明 DEPLOY.md...
(
echo # Azoth Path 部署指南
echo.
echo ## 系统要求
echo.
echo - Ubuntu 20.04+ / Debian 11+
echo - Node.js 18+ / 20+
echo - Nginx
echo.
echo ## 部署步骤
echo.
echo ### 1. 上传文件
echo.
echo 将 `dist` 目录上传到服务器，例如 `/var/www/azothpath/`
echo.
echo ```bash
echo scp -r dist/ user@server:/var/www/azothpath/
echo ```
echo.
echo ### 2. 安装 Node.js 依赖
echo.
echo ```bash
echo cd /var/www/azothpath/backend
echo npm install --production
echo ```
echo.
echo ### 3. 配置环境变量
echo.
echo ```bash
echo cp .env.example .env
echo nano .env
echo ```
echo.
echo 修改配置：
echo - `PORT`: 后端端口 ^(默认 19198^)
echo - `DB_PATH`: 数据库文件路径
echo - `VALIDATION_API_URL`: 外部验证 API 地址
echo.
echo ### 4. 初始化数据库
echo.
echo ```bash
echo cd /var/www/azothpath/backend
echo node dist/database/connection.js
echo ```
echo.
echo ### 5. 启动后端服务
echo.
echo #### 方法 1: 使用 systemd
echo.
echo 创建服务文件 `/etc/systemd/system/azothpath.service`:
echo.
echo ```ini
echo [Unit]
echo Description=Azoth Path Backend
echo After=network.target
echo.
echo [Service]
echo Type=simple
echo User=www-data
echo WorkingDirectory=/var/www/azothpath/backend
echo ExecStart=/usr/bin/node /var/www/azothpath/backend/dist/index.js
echo Restart=on-failure
echo RestartSec=10
echo # 建议使用应用内置文件日志（每次启动生成新文件 logs/backend_YYYYMMDD_HHmmss.log）
echo # 如需 systemd 重定向，使用 append 模式，避免清理旧日志：
echo StandardOutput=append:/var/www/azothpath/logs/backend.log
echo StandardError=append:/var/www/azothpath/logs/backend-error.log
echo.
echo Environment=NODE_ENV=production
echo Environment=PORT=19198
echo.
echo [Install]
echo WantedBy=multi-user.target
echo ```
echo.
echo 启动服务：
echo.
echo ```bash
echo sudo systemctl enable azothpath
echo sudo systemctl start azothpath
echo sudo systemctl status azothpath
echo ```
echo.
echo ### 6. 配置 Nginx
echo.
echo ```bash
echo sudo cp nginx.conf /etc/nginx/sites-available/azothpath
echo sudo ln -s /etc/nginx/sites-available/azothpath /etc/nginx/sites-enabled/
echo.
echo # 修改配置中的域名和路径
echo sudo nano /etc/nginx/sites-available/azothpath
echo.
echo # 测试配置
echo sudo nginx -t
echo.
echo # 重启 Nginx
echo sudo systemctl restart nginx
echo ```
echo.
echo ### 7. 配置 SSL ^(可选^)
echo.
echo 使用 Let's Encrypt 免费 SSL 证书：
echo.
echo ```bash
echo sudo apt install certbot python3-certbot-nginx
echo sudo certbot --nginx -d your-domain.com
echo ```
echo.
echo ## 目录结构
echo.
echo ```
echo /var/www/azothpath/
echo ├── frontend/              # 前端静态文件
echo │   ├── index.html
echo │   ├── assets/
echo │   └── ...
echo ├── backend/               # 后端应用
echo │   ├── dist/              # 编译后的代码
echo │   ├── database/          # 数据库文件
echo │   │   ├── azothpath.db
echo │   │   └── init.sql
echo │   ├── package.json
echo │   └── .env
echo ├── logs/                  # 日志目录（按启动时间命名）
echo ├── nginx.conf             # Nginx 配置示例
echo └── start.sh               # 启动脚本
echo ```
echo.
echo ## 端口配置
echo.
echo - 前端: 80/443 ^(Nginx^)
echo - 后端: 19198
echo - 数据库: SQLite ^(本地文件^)
echo.
echo ## 日志管理
echo.
echo - 后端日志: `logs/backend_YYYYMMDD_HHmmss.log` ^(应用自动生成，每次启动一个^)
echo - 兼容: 如使用 systemd 重定向，仍会生成 `logs/backend.log` （追加写入）
echo - 错误日志: `logs/backend-error.log`
echo - Nginx 访问日志: `/var/log/nginx/access.log`
echo - Nginx 错误日志: `/var/log/nginx/error.log`
echo.
echo ## 常用命令
echo.
echo ```bash
echo # 查看最新日志文件
echo tail -f \^$(ls -1tr logs/backend_*.log ^| tail -1)
echo ```
echo.
echo ## 故障排查
echo.
echo 1. **后端无法启动**
echo    - 检查端口是否被占用: `lsof -i :19198`
echo    - 检查数据库权限: `ls -l backend/database/`
echo.
echo 2. **前端无法访问**
echo    - 检查 Nginx 配置: `sudo nginx -t`
echo    - 检查 Nginx 状态: `sudo systemctl status nginx`
echo    - 检查文件权限: `ls -l frontend/`
echo.
echo 3. **API 请求失败**
echo    - 检查网络连接: `curl http://localhost:19198/api`
echo    - 检查 Nginx 代理配置
echo.
echo ## 备份建议
echo.
echo 定期备份数据库文件：
echo.
echo ```bash
echo # 创建备份脚本
echo cat ^> backup.sh ^<^<'EOF'
echo #!/bin/bash
echo BACKUP_DIR=/var/backups/azothpath
echo DATE=^$^(date +%%Y%%m%%d_%%H%%M%%S^)
echo mkdir -p $BACKUP_DIR
echo cp /var/www/azothpath/backend/database/azothpath.db $BACKUP_DIR/azothpath_$DATE.db
echo find $BACKUP_DIR -name "*.db" -mtime +7 -delete
echo EOF
echo.
echo chmod +x backup.sh
echo.
echo # 添加定时任务
echo ^(crontab -l 2^>/dev/null; echo "0 2 * * * /var/www/azothpath/backup.sh"^) ^| crontab -
echo ```
echo.
echo ## 更新流程
echo.
echo 1. 备份数据库
echo 2. 上传新的构建文件
echo 3. 安装新依赖: `cd backend ^&^& npm install --production`
echo.
echo ## 监控建议
echo.
echo - 配置告警通知
echo - 使用 Prometheus + Grafana 监控服务器资源
) > "%BUILD_DIR%\DEPLOY.md"

REM 创建 logs 目录
mkdir "%BUILD_DIR%\logs" 2>nul

echo ✅ 部署文件已创建
echo.

echo ========================================
echo   🎉 构建完成！
echo ========================================
echo.
echo 📦 构建产物位于: %BUILD_DIR%
echo.
echo 📂 目录结构:
echo    %BUILD_DIR%/
echo    ├── frontend/              (前端静态文件)
echo    ├── backend/               (后端 Node.js 应用)
echo    │   ├── dist/              (编译后的代码)
echo    │   ├── database/          (数据库目录)
echo    │   ├── package.json
echo    │   └── .env.example
echo    ├── logs/                  (日志目录)
echo    └── start.sh               (Linux 启动脚本)
echo.
echo 🚀 端口配置:
echo    - 前端: 通过 Nginx 托管 (80/443)
echo    - 后端: http://localhost:19198
echo.
echo 💡 下一步:
echo    1. 将 dist 目录上传到 Ubuntu 服务器
echo    2. 配置 Nginx 和环境变量
echo.
echo 📖 详细文档: dist/DEPLOY.md
echo.

pause
