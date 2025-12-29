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
python3 -c "import fastapi" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "[信息] 正在安装依赖包..."
    pip3 install -r requirements.txt --root-user-action=ignore
    if [ $? -ne 0 ]; then
        echo "[错误] 依赖包安装失败"
        exit 1
    fi
fi

# 特别检查akshare是否安装（因为它是可选但常用的）
echo "[信息] 检查akshare..."
python3 -c "import akshare" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "[信息] akshare未安装，正在安装..."
    pip3 install "akshare>=1.17,<3.0" --root-user-action=ignore
    if [ $? -ne 0 ]; then
        echo "[警告] akshare安装失败，将无法使用akshare数据源"
    else
        echo "[信息] akshare安装成功"
    fi
fi

echo "[信息] 启动服务..."
echo "[信息] 服务地址: http://localhost:8588"
echo "[信息] 按 Ctrl+C 停止服务"
echo ""

python3 main.py

