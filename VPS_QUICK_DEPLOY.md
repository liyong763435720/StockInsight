# VPS快速部署指南 - StockInsight

## 一键部署脚本（推荐）

### 完整部署步骤

```bash
#!/bin/bash
# StockInsight VPS 一键部署脚本

set -e

echo "=========================================="
echo "  StockInsight VPS 部署脚本"
echo "=========================================="
echo ""

# 1. 创建部署目录
DEPLOY_DIR="/opt/stock-insight"
echo "[1/7] 创建部署目录: $DEPLOY_DIR"
sudo mkdir -p $DEPLOY_DIR
sudo chown $USER:$USER $DEPLOY_DIR

# 2. 检查Python环境
echo "[2/7] 检查Python环境..."
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到Python3，请先安装Python 3.11+"
    exit 1
fi
PYTHON_VERSION=$(python3 --version)
echo "  Python版本: $PYTHON_VERSION"

# 3. 安装依赖
echo "[3/7] 安装Python依赖..."
cd $DEPLOY_DIR
pip3 install -r requirements.txt

# 4. 设置文件权限
echo "[4/7] 设置文件权限..."
# 创建数据目录
mkdir -p $DEPLOY_DIR/data
# 设置权限（如果数据库已存在）
if [ -f "$DEPLOY_DIR/stock_data.db" ]; then
    sudo chown www-data:www-data $DEPLOY_DIR/stock_data.db 2>/dev/null || sudo chown $USER:$USER $DEPLOY_DIR/stock_data.db
    sudo chmod 660 $DEPLOY_DIR/stock_data.db
fi

# 5. 配置systemd服务
echo "[5/7] 配置systemd服务..."
# 检查www-data用户是否存在
if id "www-data" &>/dev/null; then
    SERVICE_USER="www-data"
elif id "apache" &>/dev/null; then
    SERVICE_USER="apache"
else
    SERVICE_USER="nobody"
fi

# 获取Python路径
PYTHON_PATH=$(which python3)

# 创建服务文件
sudo tee /etc/systemd/system/stock-insight.service > /dev/null <<EOF
[Unit]
Description=StockInsight - 股票洞察分析系统
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$DEPLOY_DIR
ExecStart=$PYTHON_PATH $DEPLOY_DIR/start_prod.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment="PYTHONUNBUFFERED=1"
Environment="DB_PATH=$DEPLOY_DIR/stock_data.db"
Environment="CONFIG_PATH=$DEPLOY_DIR/config.json"

[Install]
WantedBy=multi-user.target
EOF

# 如果使用专用用户，需要设置权限
if [ "$SERVICE_USER" != "nobody" ]; then
    sudo chown -R $SERVICE_USER:$SERVICE_USER $DEPLOY_DIR
fi

# 6. 配置防火墙
echo "[6/7] 配置防火墙..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 8588/tcp
    echo "  UFW防火墙已配置"
elif command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --permanent --add-port=8588/tcp
    sudo firewall-cmd --reload
    echo "  Firewalld防火墙已配置"
else
    echo "  警告: 未检测到防火墙工具，请手动配置端口8588"
fi

# 7. 启动服务
echo "[7/7] 启动服务..."
sudo systemctl daemon-reload
sudo systemctl enable stock-insight
sudo systemctl start stock-insight

# 等待服务启动
sleep 3

# 检查服务状态
if sudo systemctl is-active --quiet stock-insight; then
    echo ""
    echo "=========================================="
    echo "  部署成功！"
    echo "=========================================="
    echo ""
    echo "服务状态:"
    sudo systemctl status stock-insight --no-pager -l
    echo ""
    echo "访问地址: http://$(hostname -I | awk '{print $1}'):8588"
    echo "默认账号: admin / admin123"
    echo ""
    echo "常用命令:"
    echo "  查看状态: sudo systemctl status stock-insight"
    echo "  查看日志: sudo journalctl -u stock-insight -f"
    echo "  重启服务: sudo systemctl restart stock-insight"
    echo "  停止服务: sudo systemctl stop stock-insight"
    echo ""
else
    echo ""
    echo "=========================================="
    echo "  服务启动失败！"
    echo "=========================================="
    echo ""
    echo "请检查日志:"
    echo "  sudo journalctl -u stock-insight -n 50"
    echo ""
    exit 1
fi
```

## 手动部署步骤

### 步骤1: 准备服务器

```bash
# 更新系统
sudo apt-get update && sudo apt-get upgrade -y

# 安装Python和pip（如果未安装）
sudo apt-get install python3 python3-pip -y

# 创建部署目录
sudo mkdir -p /opt/stock-insight
sudo chown $USER:$USER /opt/stock-insight
```

### 步骤2: 上传项目文件

```bash
# 方式1: 使用scp（从本地）
scp -r StockInsight/* user@your-server-ip:/opt/stock-insight/

# 方式2: 使用git（如果项目在GitHub）
cd /opt/stock-insight
git clone https://github.com/your-repo/StockInsight.git .

# 方式3: 使用FTP工具上传
```

### 步骤3: 安装依赖

```bash
cd /opt/stock-insight
pip3 install -r requirements.txt
```

### 步骤4: 配置systemd服务

```bash
# 复制服务文件
sudo cp stock-insight.service /etc/systemd/system/

# 根据实际情况修改服务文件
sudo nano /etc/systemd/system/stock-insight.service

# 需要修改的内容：
# - User: 根据系统选择（www-data/apache/nobody）
# - WorkingDirectory: 确认路径为 /opt/stock-insight
# - ExecStart: 确认Python路径（使用 which python3 查看）
```

### 步骤5: 设置权限

```bash
# 检查www-data用户是否存在
id www-data

# 如果存在，设置权限
sudo chown -R www-data:www-data /opt/stock-insight
sudo chmod 755 /opt/stock-insight
sudo chmod 660 /opt/stock-insight/stock_data.db 2>/dev/null || true

# 如果www-data不存在，使用当前用户
# sudo chown -R $USER:$USER /opt/stock-insight
```

### 步骤6: 启动服务

```bash
# 重新加载systemd配置
sudo systemctl daemon-reload

# 设置开机自启
sudo systemctl enable stock-insight

# 启动服务
sudo systemctl start stock-insight

# 检查状态
sudo systemctl status stock-insight
```

### 步骤7: 配置防火墙

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 8588/tcp
sudo ufw reload

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=8588/tcp
sudo firewall-cmd --reload
```

## 验证部署

### 1. 检查服务状态

```bash
# 查看服务状态
sudo systemctl status stock-insight

# 应该看到: Active: active (running)
```

### 2. 检查端口监听

```bash
# 检查端口是否监听
sudo netstat -tlnp | grep 8588
# 或
sudo ss -tlnp | grep 8588

# 应该看到: 0.0.0.0:8588 或 :::8588
```

### 3. 测试访问

```bash
# 本地测试
curl http://localhost:8588

# 外部测试（使用服务器IP）
curl http://your-server-ip:8588
```

### 4. 查看日志

```bash
# 查看实时日志
sudo journalctl -u stock-insight -f

# 查看最近50条日志
sudo journalctl -u stock-insight -n 50
```

## 后台运行确认

### systemd服务特性

✅ **自动重启**: `Restart=always` - 服务异常退出时自动重启
✅ **开机自启**: `systemctl enable` - 服务器重启后自动启动
✅ **后台运行**: systemd自动管理进程，无需nohup或screen
✅ **日志管理**: 日志自动记录到journal，无需手动管理日志文件

### 验证后台运行

```bash
# 1. 确认服务在运行
sudo systemctl is-active stock-insight
# 输出: active

# 2. 确认进程存在
ps aux | grep start_prod.py
# 应该看到Python进程

# 3. 断开SSH连接后，服务继续运行
# 重新连接后检查
sudo systemctl status stock-insight
# 服务应该仍在运行
```

## 常用管理命令

```bash
# 启动服务
sudo systemctl start stock-insight

# 停止服务
sudo systemctl stop stock-insight

# 重启服务
sudo systemctl restart stock-insight

# 查看状态
sudo systemctl status stock-insight

# 查看日志
sudo journalctl -u stock-insight -f

# 查看最近100条日志
sudo journalctl -u stock-insight -n 100

# 禁用开机自启
sudo systemctl disable stock-insight

# 启用开机自启
sudo systemctl enable stock-insight

# 重新加载配置（修改服务文件后）
sudo systemctl daemon-reload
sudo systemctl restart stock-insight
```

## 故障排查

### 服务无法启动

```bash
# 1. 查看详细错误
sudo journalctl -u stock-insight -n 50

# 2. 检查Python路径
which python3

# 3. 检查文件权限
ls -la /opt/stock-insight

# 4. 手动测试启动
cd /opt/stock-insight
python3 start_prod.py
```

### 端口无法访问

```bash
# 1. 检查防火墙
sudo ufw status
# 或
sudo firewall-cmd --list-all

# 2. 检查服务是否运行
sudo systemctl status stock-insight

# 3. 检查端口监听
sudo netstat -tlnp | grep 8588
```

### 权限问题

```bash
# 检查文件所有者
ls -la /opt/stock-insight/stock_data.db

# 修复权限
sudo chown www-data:www-data /opt/stock-insight/stock_data.db
sudo chmod 660 /opt/stock-insight/stock_data.db
```

## 配置Nginx反向代理（可选）

```bash
# 安装Nginx
sudo apt-get install nginx -y

# 创建配置文件
sudo nano /etc/nginx/sites-available/stock-insight

# 添加配置（参考DEPLOYMENT.md中的Nginx配置）

# 启用配置
sudo ln -s /etc/nginx/sites-available/stock-insight /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 完成！

部署完成后：
- ✅ 服务在后台运行
- ✅ 自动重启（异常退出时）
- ✅ 开机自启
- ✅ 日志自动管理
- ✅ 可通过systemctl管理

访问地址: `http://your-server-ip:8588`
默认账号: `admin` / `admin123`

**首次登录后请立即修改密码！**

