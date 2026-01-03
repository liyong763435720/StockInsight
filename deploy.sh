#!/bin/bash

echo "========================================"
echo "  StockInsight - 股票洞察分析系统 v1.0.0 一键部署脚本"
echo "========================================"
echo ""
echo "此脚本将自动完成以下操作："
echo "  1. 检查Python环境"
echo "  2. 安装依赖包"
echo "  3. 创建systemd服务"
echo "  4. 配置防火墙"
echo "  5. 启动服务并设置开机自启"
echo ""

# 获取当前脚本所在目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
    echo "[错误] 请使用 sudo 运行此脚本"
    echo "用法: sudo ./deploy.sh"
    exit 1
fi

# 运行安装脚本
bash "$SCRIPT_DIR/install.sh"

