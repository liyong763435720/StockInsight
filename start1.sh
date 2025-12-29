#!/bin/bash

BASE_DIR=$(cd "$(dirname "$0")" && pwd)
VENV_DIR="$BASE_DIR/env"

echo "========================================"
echo "  StockInsight - 股票洞察分析系统 v1.0.0"
echo "========================================"
echo ""

# 1. 检查虚拟环境
if [ ! -d "$VENV_DIR" ]; then
    echo "[错误] 未找到虚拟环境 env，请先创建虚拟环境"
    exit 1
fi

# 2. 激活虚拟环境
source "$VENV_DIR/bin/activate"

echo "[信息] 使用 Python:"
python --version

# 3. 检查依赖
echo "[信息] 检查依赖包..."
python - <<EOF
import fastapi, akshare
print("依赖检查通过")
EOF

if [ $? -ne 0 ]; then
    echo "[信息] 正在安装依赖包..."
    pip install -r requirements.txt || exit 1
fi

# 4. 启动服务（生产环境，不用 reload）
echo ""
echo "[信息] 启动服务..."
echo "[信息] 服务地址: http://localhost:8588"
echo "[信息] 按 Ctrl+C 停止服务"
echo ""

python main.py
