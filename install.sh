#!/bin/bash

echo "========================================"
echo "  StockInsight - 股票洞察分析系统 v1.0.0 一键部署脚本"
echo "========================================"
echo ""

# 获取当前脚本所在目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
SERVICE_NAME="stock-insight"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为root用户
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        echo -e "${RED}[错误] 请使用 sudo 运行此脚本${NC}"
        exit 1
    fi
}

# 检查Python
check_python() {
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}[错误] 未检测到Python3，请先安装Python 3.11+${NC}"
        echo "Ubuntu/Debian: sudo apt-get install python3 python3-pip -y"
        echo "CentOS/RHEL: sudo yum install python3 python3-pip -y"
        exit 1
    fi
    
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
    PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d'.' -f1)
    PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d'.' -f2)
    
    if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 11 ]); then
        echo -e "${YELLOW}[警告] Python版本过低 ($PYTHON_VERSION)，建议使用Python 3.11+${NC}"
    fi
    
    echo -e "${GREEN}[信息] Python版本: $(python3 --version)${NC}"
}

# 检查pip
check_pip() {
    if ! command -v pip3 &> /dev/null; then
        echo -e "${RED}[错误] 未检测到pip3，请先安装pip${NC}"
        exit 1
    fi
}

# 安装依赖
install_dependencies() {
    echo -e "${GREEN}[信息] 升级pip...${NC}"
    pip3 install --upgrade pip -q
    
    echo -e "${GREEN}[信息] 安装依赖包...${NC}"
    cd "$PROJECT_DIR"
    pip3 install -r requirements.txt
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}[错误] 依赖安装失败${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}[成功] 依赖安装完成${NC}"
}

# 检测Python路径
detect_python_path() {
    PYTHON_PATH=$(which python3)
    if [ -z "$PYTHON_PATH" ]; then
        PYTHON_PATH="/usr/bin/python3"
    fi
    echo "$PYTHON_PATH"
}

# 检测运行用户
detect_user() {
    # 优先使用当前用户，如果没有则使用www-data
    if [ -n "$SUDO_USER" ]; then
        echo "$SUDO_USER"
    elif [ -n "$USER" ] && [ "$USER" != "root" ]; then
        echo "$USER"
    else
        # 检查www-data是否存在
        if id "www-data" &>/dev/null; then
            echo "www-data"
        else
            # 创建www-data用户（如果不存在）
            useradd -r -s /bin/false www-data 2>/dev/null || echo "www-data"
        fi
    fi
}

# 创建systemd服务文件
create_service_file() {
    PYTHON_PATH=$(detect_python_path)
    RUN_USER=$(detect_user)
    
    echo -e "${GREEN}[信息] 创建systemd服务文件...${NC}"
    echo -e "${GREEN}[信息] 项目目录: $PROJECT_DIR${NC}"
    echo -e "${GREEN}[信息] Python路径: $PYTHON_PATH${NC}"
    echo -e "${GREEN}[信息] 运行用户: $RUN_USER${NC}"
    
    # 确保start_prod.py存在
    if [ ! -f "$PROJECT_DIR/start_prod.py" ]; then
        echo -e "${YELLOW}[警告] start_prod.py 不存在，将使用 main.py${NC}"
        EXEC_START="$PYTHON_PATH $PROJECT_DIR/main.py"
    else
        EXEC_START="$PYTHON_PATH $PROJECT_DIR/start_prod.py"
    fi
    
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=StockInsight - 股票洞察分析系统
After=network.target

[Service]
Type=simple
User=$RUN_USER
Group=$RUN_USER
WorkingDirectory=$PROJECT_DIR
ExecStart=$EXEC_START
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# 环境变量
Environment="PYTHONUNBUFFERED=1"
Environment="PYTHONPATH=$PROJECT_DIR"

# 资源限制（可选）
# LimitNOFILE=65536
# MemoryMax=2G

[Install]
WantedBy=multi-user.target
EOF
    
    # 设置文件权限
    chmod 644 "$SERVICE_FILE"
    echo -e "${GREEN}[成功] 服务文件已创建: $SERVICE_FILE${NC}"
}

# 配置防火墙
configure_firewall() {
    echo -e "${GREEN}[信息] 配置防火墙...${NC}"
    
    # 检测防火墙类型
    if command -v ufw &> /dev/null; then
        # Ubuntu/Debian (ufw)
        if ufw status | grep -q "Status: active"; then
            ufw allow 8588/tcp
            echo -e "${GREEN}[成功] 已添加防火墙规则 (ufw)${NC}"
        else
            echo -e "${YELLOW}[信息] ufw未启用，跳过防火墙配置${NC}"
        fi
    elif command -v firewall-cmd &> /dev/null; then
        # CentOS/RHEL (firewalld)
        if systemctl is-active --quiet firewalld; then
            firewall-cmd --permanent --add-port=8588/tcp
            firewall-cmd --reload
            echo -e "${GREEN}[成功] 已添加防火墙规则 (firewalld)${NC}"
        else
            echo -e "${YELLOW}[信息] firewalld未启用，跳过防火墙配置${NC}"
        fi
    else
        echo -e "${YELLOW}[信息] 未检测到防火墙，跳过防火墙配置${NC}"
    fi
}

# 启动服务
start_service() {
    echo -e "${GREEN}[信息] 启动服务...${NC}"
    
    # 重新加载systemd配置
    systemctl daemon-reload
    
    # 启用开机自启
    systemctl enable "$SERVICE_NAME"
    
    # 启动服务
    systemctl start "$SERVICE_NAME"
    
    # 等待服务启动
    sleep 2
    
    # 检查服务状态
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        echo -e "${GREEN}[成功] 服务已启动并设置为开机自启${NC}"
        echo ""
        echo "服务管理命令："
        echo "  查看状态: sudo systemctl status $SERVICE_NAME"
        echo "  查看日志: sudo journalctl -u $SERVICE_NAME -f"
        echo "  停止服务: sudo systemctl stop $SERVICE_NAME"
        echo "  重启服务: sudo systemctl restart $SERVICE_NAME"
        echo "  禁用自启: sudo systemctl disable $SERVICE_NAME"
        echo ""
        echo "服务地址: http://$(hostname -I | awk '{print $1}'):8588"
        echo "          http://localhost:8588"
    else
        echo -e "${RED}[错误] 服务启动失败${NC}"
        echo "请查看日志: sudo journalctl -u $SERVICE_NAME -n 50"
        exit 1
    fi
}

# 主函数
main() {
    # 检查root权限（仅在需要创建服务时）
    if [ "$1" != "--no-service" ]; then
        check_root
    fi
    
    check_python
    check_pip
    install_dependencies
    
    if [ "$1" != "--no-service" ]; then
        create_service_file
        configure_firewall
        start_service
    else
        echo ""
        echo -e "${GREEN}[成功] 安装完成！${NC}"
        echo ""
        echo "启动方式："
        echo "  开发模式: python3 main.py"
        echo "  生产模式: python3 start_prod.py"
        echo "  或使用: ./start.sh"
        echo ""
    fi
}

# 运行主函数
main "$@"
