#!/bin/bash

# Azoth Path - 项目运行脚本
# 用于快速启动前端和后端服务

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"
DATABASE_DIR="$PROJECT_ROOT/database"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 命令未找到，请先安装 $1"
        exit 1
    fi
}

# 检查Node.js版本
check_node_version() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt 18 ]; then
            log_error "Node.js 版本过低，需要 >= 18.0.0，当前版本: $(node -v)"
            exit 1
        fi
        log_success "Node.js 版本检查通过: $(node -v)"
    else
        log_error "Node.js 未安装，请先安装 Node.js >= 18.0.0"
        exit 1
    fi
}

# 安装依赖
install_dependencies() {
    log_info "开始安装项目依赖..."
    
    # 安装后端依赖
    log_info "安装后端依赖..."
    cd "$BACKEND_DIR"
    if [ ! -d "node_modules" ]; then
        npm install
        log_success "后端依赖安装完成"
    else
        log_info "后端依赖已存在，跳过安装"
    fi
    
    # 安装前端依赖
    log_info "安装前端依赖..."
    cd "$FRONTEND_DIR"
    if [ ! -d "node_modules" ]; then
        npm install
        log_success "前端依赖安装完成"
    else
        log_info "前端依赖已存在，跳过安装"
    fi
    
    cd "$PROJECT_ROOT"
}

# 初始化数据库
init_database() {
    log_info "初始化数据库..."
    
    # 检查数据库文件是否存在
    if [ ! -f "$DATABASE_DIR/azothpath.db" ]; then
        log_info "数据库文件不存在，开始初始化..."
        cd "$BACKEND_DIR"
        npm run db:init
        log_success "数据库初始化完成"
    else
        log_info "数据库文件已存在，跳过初始化"
    fi
    
    cd "$PROJECT_ROOT"
}

# 创建环境配置文件
create_env_file() {
    log_info "检查环境配置文件..."
    
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        log_info "创建环境配置文件..."
        cat > "$BACKEND_DIR/.env" << EOF
# Azoth Path 后端环境配置
NODE_ENV=development
PORT=3000

# 数据库配置
DB_PATH=../database/azothpath.db

# JWT 配置
JWT_SECRET=azoth-path-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# 外部API配置（可选）
GAME_API_ENDPOINT=https://api.example.com

# 日志配置
LOG_LEVEL=info
EOF
        log_success "环境配置文件创建完成"
    else
        log_info "环境配置文件已存在"
    fi
}

# 启动后端服务
start_backend() {
    log_info "启动后端服务..."
    cd "$BACKEND_DIR"
    
    # 检查端口是否被占用
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
        log_warning "端口 3000 已被占用，尝试停止现有服务..."
        pkill -f "node.*backend" || true
        sleep 2
    fi
    
    # 启动后端服务
    npm run dev &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$PROJECT_ROOT/.backend.pid"
    
    # 等待后端启动
    log_info "等待后端服务启动..."
    for i in {1..30}; do
        if curl -s http://localhost:3000/health > /dev/null 2>&1; then
            log_success "后端服务启动成功 (PID: $BACKEND_PID)"
            return 0
        fi
        sleep 1
    done
    
    log_error "后端服务启动失败"
    return 1
}

# 启动前端服务
start_frontend() {
    log_info "启动前端服务..."
    cd "$FRONTEND_DIR"
    
    # 检查端口是否被占用
    if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null ; then
        log_warning "端口 5173 已被占用，尝试停止现有服务..."
        pkill -f "vite" || true
        sleep 2
    fi
    
    # 启动前端服务
    npm run dev &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "$PROJECT_ROOT/.frontend.pid"
    
    # 等待前端启动
    log_info "等待前端服务启动..."
    for i in {1..30}; do
        if curl -s http://localhost:5173 > /dev/null 2>&1; then
            log_success "前端服务启动成功 (PID: $FRONTEND_PID)"
            return 0
        fi
        sleep 1
    done
    
    log_error "前端服务启动失败"
    return 1
}

# 停止服务
stop_services() {
    log_info "停止所有服务..."
    
    # 停止后端
    if [ -f "$PROJECT_ROOT/.backend.pid" ]; then
        BACKEND_PID=$(cat "$PROJECT_ROOT/.backend.pid")
        if kill -0 "$BACKEND_PID" 2>/dev/null; then
            kill "$BACKEND_PID"
            log_success "后端服务已停止"
        fi
        rm -f "$PROJECT_ROOT/.backend.pid"
    fi
    
    # 停止前端
    if [ -f "$PROJECT_ROOT/.frontend.pid" ]; then
        FRONTEND_PID=$(cat "$PROJECT_ROOT/.frontend.pid")
        if kill -0 "$FRONTEND_PID" 2>/dev/null; then
            kill "$FRONTEND_PID"
            log_success "前端服务已停止"
        fi
        rm -f "$PROJECT_ROOT/.frontend.pid"
    fi
    
    # 清理进程
    pkill -f "node.*backend" || true
    pkill -f "vite" || true
}

# 显示状态
show_status() {
    log_info "服务状态:"
    
    # 检查后端
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        log_success "后端服务: 运行中 (http://localhost:3000)"
    else
        log_error "后端服务: 未运行"
    fi
    
    # 检查前端
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        log_success "前端服务: 运行中 (http://localhost:5173)"
    else
        log_error "前端服务: 未运行"
    fi
}

# 显示帮助信息
show_help() {
    echo "Azoth Path - 项目运行脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  start     启动项目 (默认)"
    echo "  stop      停止项目"
    echo "  restart   重启项目"
    echo "  status    显示服务状态"
    echo "  install   仅安装依赖"
    echo "  init      仅初始化数据库"
    echo "  help      显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 start    # 启动项目"
    echo "  $0 stop     # 停止项目"
    echo "  $0 status   # 查看状态"
}

# 主函数
main() {
    case "${1:-start}" in
        "start")
            log_info "🚀 启动 Azoth Path 项目..."
            check_command "node"
            check_command "npm"
            check_node_version
            install_dependencies
            create_env_file
            init_database
            start_backend
            start_frontend
            log_success "🎉 项目启动完成！"
            log_info "前端地址: http://localhost:5173"
            log_info "后端地址: http://localhost:3000"
            log_info "管理员账号: admin / admin123"
            echo ""
            log_info "按 Ctrl+C 停止服务"
            # 等待用户中断
            trap 'stop_services; exit 0' INT
            wait
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            stop_services
            sleep 2
            main start
            ;;
        "status")
            show_status
            ;;
        "install")
            check_command "node"
            check_command "npm"
            check_node_version
            install_dependencies
            ;;
        "init")
            check_command "node"
            check_command "npm"
            create_env_file
            init_database
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
