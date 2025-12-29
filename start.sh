#!/bin/bash

echo "========================================"
echo "  StockInsight - 股票洞察分析系统 v1.0.0"
echo "========================================"
echo ""

# 检查Python是否安装
if ! command -v python3 &> /dev/null; then
    echo "[错误] 未检测到Python3，请先安装Python 3.11+"
    exit 1
fi

echo "[信息] 检查Python环境..."
python3 --version

# 检查依赖是否安装
echo "[信息] 检查依赖包..."
python3 -c "import fastapi, uvicorn, pandas, akshare" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "[信息] 正在安装依赖包..."
    # 使用 --root-user-action=ignore 忽略root用户警告
    pip3 install --root-user-action=ignore -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "[错误] 依赖包安装失败"
        exit 1
    fi
    echo "[信息] 依赖包安装完成"
else
    echo "[信息] 依赖包已安装"
fi

echo "[信息] 启动服务..."
echo "[信息] 服务地址: http://localhost:8588"
echo "[信息] 按 Ctrl+C 停止服务"
echo ""

python3 main.py

