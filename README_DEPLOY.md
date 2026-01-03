# StockInsight Linux 一键部署指南

## 快速部署（推荐）

### 方式一：一键部署脚本（自动配置systemd服务）

```bash
# 1. 克隆或解压项目到目标目录
cd /opt/stock-insight  # 或你的项目目录

# 2. 添加执行权限
chmod +x install.sh deploy.sh

# 3. 运行一键部署脚本（需要root权限）
sudo ./install.sh
```

脚本会自动完成：
- ✅ 检查Python环境
- ✅ 安装依赖包
- ✅ 创建systemd服务文件
- ✅ 配置防火墙（如果启用）
- ✅ 启动服务并设置开机自启

### 方式二：仅安装依赖（不配置服务）

```bash
sudo ./install.sh --no-service
```

## 服务管理

部署完成后，服务会自动启动并设置为开机自启。你可以使用以下命令管理服务：

```bash
# 查看服务状态
sudo systemctl status stock-insight

# 查看实时日志
sudo journalctl -u stock-insight -f

# 停止服务
sudo systemctl stop stock-insight

# 启动服务
sudo systemctl start stock-insight

# 重启服务
sudo systemctl restart stock-insight

# 禁用开机自启
sudo systemctl disable stock-insight

# 启用开机自启
sudo systemctl enable stock-insight
```

## 访问系统

部署完成后，访问：
- 本地访问：http://localhost:8588
- 远程访问：http://服务器IP:8588

默认管理员账号：
- 用户名：`admin`
- 密码：`admin123`

## 手动配置（如果需要）

如果自动配置失败，可以手动配置：

### 1. 创建服务文件

```bash
sudo nano /etc/systemd/system/stock-insight.service
```

复制以下内容（根据实际路径修改）：

```ini
[Unit]
Description=StockInsight - 股票洞察分析系统
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/stock-insight
ExecStart=/usr/bin/python3 /opt/stock-insight/start_prod.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment="PYTHONUNBUFFERED=1"

[Install]
WantedBy=multi-user.target
```

### 2. 启动服务

```bash
sudo systemctl daemon-reload
sudo systemctl enable stock-insight
sudo systemctl start stock-insight
```

## 故障排查

### 服务无法启动

```bash
# 查看详细日志
sudo journalctl -u stock-insight -n 100

# 检查服务文件语法
sudo systemctl cat stock-insight

# 检查Python路径
which python3
```

### 端口被占用

```bash
# 检查端口占用
sudo netstat -tlnp | grep 8588
# 或
sudo ss -tlnp | grep 8588

# 修改端口（编辑 start_prod.py 或 main.py）
```

### 权限问题

```bash
# 确保项目目录权限正确
sudo chown -R www-data:www-data /opt/stock-insight
sudo chmod +x /opt/stock-insight/start_prod.py
```

## 更新系统

```bash
# 1. 停止服务
sudo systemctl stop stock-insight

# 2. 更新代码（git pull 或其他方式）

# 3. 重新安装依赖（如果需要）
sudo ./install.sh --no-service

# 4. 启动服务
sudo systemctl start stock-insight
```

## 卸载

```bash
# 停止并禁用服务
sudo systemctl stop stock-insight
sudo systemctl disable stock-insight

# 删除服务文件
sudo rm /etc/systemd/system/stock-insight.service
sudo systemctl daemon-reload

# 删除项目目录（可选）
# sudo rm -rf /opt/stock-insight
```

