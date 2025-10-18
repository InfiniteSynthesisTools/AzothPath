@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM Azoth Path - 项目运行脚本 (Windows版本)
REM 用于快速启动前端和后端服务

set "PROJECT_ROOT=%~dp0"
set "FRONTEND_DIR=%PROJECT_ROOT%frontend"
set "BACKEND_DIR=%PROJECT_ROOT%backend"
set "DATABASE_DIR=%PROJECT_ROOT%database"

REM 颜色定义 (Windows 10+ 支持)
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM 日志函数
:log_info
echo %BLUE%[INFO]%NC% %~1
goto :eof

:log_success
echo %GREEN%[SUCCESS]%NC% %~1
goto :eof

:log_warning
echo %YELLOW%[WARNING]%NC% %~1
goto :eof

:log_error
echo %RED%[ERROR]%NC% %~1
goto :eof

REM 检查命令是否存在
:check_command
where %1 >nul 2>&1
if %errorlevel% neq 0 (
    call :log_error "%1 命令未找到，请先安装 %1"
    exit /b 1
)
goto :eof

REM 检查Node.js版本
:check_node_version
node -v >nul 2>&1
if %errorlevel% neq 0 (
    call :log_error "Node.js 未安装，请先安装 Node.js >= 18.0.0"
    exit /b 1
)

for /f "tokens=1 delims=." %%a in ('node -v') do set "NODE_VERSION=%%a"
set "NODE_VERSION=!NODE_VERSION:v=!"
if !NODE_VERSION! lss 18 (
    call :log_error "Node.js 版本过低，需要 >= 18.0.0，当前版本: "
    node -v
    exit /b 1
)
call :log_success "Node.js 版本检查通过: "
node -v
goto :eof

REM 安装依赖
:install_dependencies
call :log_info "开始安装项目依赖..."

REM 安装后端依赖
call :log_info "安装后端依赖..."
cd /d "%BACKEND_DIR%"
if not exist "node_modules" (
    npm install
    if %errorlevel% neq 0 (
        call :log_error "后端依赖安装失败"
        exit /b 1
    )
    call :log_success "后端依赖安装完成"
) else (
    call :log_info "后端依赖已存在，跳过安装"
)

REM 安装前端依赖
call :log_info "安装前端依赖..."
cd /d "%FRONTEND_DIR%"
if not exist "node_modules" (
    npm install
    if %errorlevel% neq 0 (
        call :log_error "前端依赖安装失败"
        exit /b 1
    )
    call :log_success "前端依赖安装完成"
) else (
    call :log_info "前端依赖已存在，跳过安装"
)

cd /d "%PROJECT_ROOT%"
goto :eof

REM 初始化数据库
:init_database
call :log_info "初始化数据库..."

REM 检查数据库文件是否存在
if not exist "%DATABASE_DIR%\azothpath.db" (
    call :log_info "数据库文件不存在，开始初始化..."
    cd /d "%BACKEND_DIR%"
    npm run db:init
    if %errorlevel% neq 0 (
        call :log_error "数据库初始化失败"
        exit /b 1
    )
    call :log_success "数据库初始化完成"
) else (
    call :log_info "数据库文件已存在，跳过初始化"
)

cd /d "%PROJECT_ROOT%"
goto :eof

REM 创建环境配置文件
:create_env_file
call :log_info "检查环境配置文件..."

if not exist "%BACKEND_DIR%\.env" (
    call :log_info "创建环境配置文件..."
    (
        echo # Azoth Path 后端环境配置
        echo NODE_ENV=development
        echo PORT=3000
        echo.
        echo # 数据库配置
        echo DB_PATH=../database/azothpath.db
        echo.
        echo # JWT 配置
        echo JWT_SECRET=azoth-path-secret-key-change-in-production
        echo JWT_EXPIRES_IN=7d
        echo.
        echo # 外部API配置（可选）
        echo GAME_API_ENDPOINT=https://api.example.com
        echo.
        echo # 日志配置
        echo LOG_LEVEL=info
    ) > "%BACKEND_DIR%\.env"
    call :log_success "环境配置文件创建完成"
) else (
    call :log_info "环境配置文件已存在"
)
goto :eof

REM 启动后端服务
:start_backend
call :log_info "启动后端服务..."
cd /d "%BACKEND_DIR%"

REM 检查端口是否被占用
netstat -an | findstr ":3000" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    call :log_warning "端口 3000 已被占用，尝试停止现有服务..."
    taskkill /f /im node.exe >nul 2>&1
    timeout /t 2 >nul
)

REM 启动后端服务
start "Azoth Path Backend" /min cmd /c "npm run dev"
timeout /t 3 >nul

REM 等待后端启动
call :log_info "等待后端服务启动..."
for /l %%i in (1,1,30) do (
    curl -s http://localhost:3000/health >nul 2>&1
    if !errorlevel! equ 0 (
        call :log_success "后端服务启动成功"
        goto :backend_started
    )
    timeout /t 1 >nul
)

call :log_error "后端服务启动失败"
exit /b 1

:backend_started
goto :eof

REM 启动前端服务
:start_frontend
call :log_info "启动前端服务..."
cd /d "%FRONTEND_DIR%"

REM 检查端口是否被占用
netstat -an | findstr ":5173" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    call :log_warning "端口 5173 已被占用，尝试停止现有服务..."
    taskkill /f /im node.exe >nul 2>&1
    timeout /t 2 >nul
)

REM 启动前端服务
start "Azoth Path Frontend" /min cmd /c "npm run dev"
timeout /t 3 >nul

REM 等待前端启动
call :log_info "等待前端服务启动..."
for /l %%i in (1,1,30) do (
    curl -s http://localhost:5173 >nul 2>&1
    if !errorlevel! equ 0 (
        call :log_success "前端服务启动成功"
        goto :frontend_started
    )
    timeout /t 1 >nul
)

call :log_error "前端服务启动失败"
exit /b 1

:frontend_started
goto :eof

REM 停止服务
:stop_services
call :log_info "停止所有服务..."

REM 停止Node.js进程
taskkill /f /im node.exe >nul 2>&1
if %errorlevel% equ 0 (
    call :log_success "所有服务已停止"
) else (
    call :log_info "没有运行中的服务"
)
goto :eof

REM 显示状态
:show_status
call :log_info "服务状态:"

REM 检查后端
curl -s http://localhost:3000/health >nul 2>&1
if %errorlevel% equ 0 (
    call :log_success "后端服务: 运行中 (http://localhost:3000)"
) else (
    call :log_error "后端服务: 未运行"
)

REM 检查前端
curl -s http://localhost:5173 >nul 2>&1
if %errorlevel% equ 0 (
    call :log_success "前端服务: 运行中 (http://localhost:5173)"
) else (
    call :log_error "前端服务: 未运行"
)
goto :eof

REM 显示帮助信息
:show_help
echo Azoth Path - 项目运行脚本 (Windows版本)
echo.
echo 用法: %~nx0 [选项]
echo.
echo 选项:
echo   start     启动项目 (默认)
echo   stop      停止项目
echo   restart   重启项目
echo   status    显示服务状态
echo   install   仅安装依赖
echo   init      仅初始化数据库
echo   help      显示此帮助信息
echo.
echo 示例:
echo   %~nx0 start    # 启动项目
echo   %~nx0 stop     # 停止项目
echo   %~nx0 status   # 查看状态
goto :eof

REM 主函数
:main
if "%1"=="" set "1=start"
if "%1"=="start" goto :start
if "%1"=="stop" goto :stop
if "%1"=="restart" goto :restart
if "%1"=="status" goto :status
if "%1"=="install" goto :install
if "%1"=="init" goto :init
if "%1"=="help" goto :show_help
if "%1"=="-h" goto :show_help
if "%1"=="--help" goto :show_help

call :log_error "未知选项: %1"
call :show_help
exit /b 1

:start
call :log_info "🚀 启动 Azoth Path 项目..."
call :check_command "node"
call :check_command "npm"
call :check_node_version
call :install_dependencies
call :create_env_file
call :init_database
call :start_backend
call :start_frontend
call :log_success "🎉 项目启动完成！"
call :log_info "前端地址: http://localhost:5173"
call :log_info "后端地址: http://localhost:3000"
call :log_info "管理员账号: admin / admin123"
echo.
call :log_info "按 Ctrl+C 停止服务"
pause
goto :eof

:stop
call :stop_services
goto :eof

:restart
call :stop_services
timeout /t 2 >nul
goto :start

:status
call :show_status
goto :eof

:install
call :check_command "node"
call :check_command "npm"
call :check_node_version
call :install_dependencies
goto :eof

:init
call :check_command "node"
call :check_command "npm"
call :create_env_file
call :init_database
goto :eof

REM 执行主函数
call :main %*
