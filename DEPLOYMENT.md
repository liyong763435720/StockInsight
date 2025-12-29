# StockInsight - 股票洞察分析系统 v1.0.0 部署指南

## 系统要求

- Python 3.11 或更高版本
- 至少 2GB 可用内存
- 至少 1GB 可用磁盘空间（用于数据库存储）

## 方式一：直接部署（Windows/Linux）

### Windows 部署

1. **安装Python**
   - 下载并安装 Python 3.11+：https://www.python.org/downloads/
   - 安装时勾选 "Add Python to PATH"

2. **部署系统**
   ```cmd
   # 解压或克隆项目到目标目录
   cd C:\GPFX2
   
   # 运行启动脚本（会自动安装依赖）
   start.bat
   ```

3. **访问系统**
   - 打开浏览器访问：http://localhost:8588
   - 默认管理员账号：`admin` / `admin123`

### Linux 部署

1. **安装Python3**
   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install python3 python3-pip -y
   
   # CentOS/RHEL
   sudo yum install python3 python3-pip -y
   ```

2. **部署系统**
   ```bash
   # 解压或克隆项目到目标目录（推荐使用 /opt/stock-insight）
   cd /opt/stock-insight
   
   # 添加执行权限
   chmod +x start.sh
   
   # 运行启动脚本（会自动安装依赖）
   ./start.sh
   ```

3. **访问系统**
   - 打开浏览器访问：http://服务器IP:8588
   - 默认管理员账号：`admin` / `admin123`

### 后台运行（Linux）

使用 `nohup` 或 `systemd` 服务：

**方式1：使用 nohup（简单快速）**
```bash
# 启动服务（后台运行）
nohup python3 start_prod.py > app.log 2>&1 &

# 查看进程
ps aux | grep start_prod.py

# 查看日志
tail -f app.log

# 停止服务（需要先找到进程ID）
ps aux | grep start_prod.py
kill <PID>
```

**方式2：使用 systemd（推荐，自动重启）**

1. 复制服务文件到系统目录：
```bash
# 将项目中的 stock-insight.service 复制到系统目录
sudo cp stock-insight.service /etc/systemd/system/stock-insight.service

# 或者手动创建服务文件
sudo nano /etc/systemd/system/stock-insight.service
```

2. 修改服务文件中的路径和用户（根据实际部署路径和系统）：
```ini
[Unit]
Description=StockInsight - 股票洞察分析系统
After=network.target

[Service]
Type=simple
# Ubuntu/Debian使用www-data，CentOS使用apache或nobody
User=www-data
Group=www-data
WorkingDirectory=/opt/stock-insight
# 确认Python路径：which python3
ExecStart=/usr/bin/python3 /opt/stock-insight/start_prod.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment="PYTHONUNBUFFERED=1"
Environment="DB_PATH=/opt/stock-insight/stock_data.db"
Environment="CONFIG_PATH=/opt/stock-insight/config.json"

[Install]
WantedBy=multi-user.target
```

**注意：**
- 如果www-data用户不存在，可以改为`nobody`或创建专用用户：
  ```bash
  sudo useradd -r -s /bin/false stockinsight
  # 然后修改服务文件中的User=stockinsight
  ```
- 确保数据库文件权限正确：
  ```bash
  sudo chown www-data:www-data /opt/stock-insight/stock_data.db
  sudo chmod 660 /opt/stock-insight/stock_data.db
  ```

3. 启动和管理服务：
```bash
# 重新加载systemd配置
sudo systemctl daemon-reload

# 设置开机自启
sudo systemctl enable stock-insight

# 启动服务
sudo systemctl start stock-insight

# 查看服务状态
sudo systemctl status stock-insight

# 查看服务日志
sudo journalctl -u stock-insight -f

# 停止服务
sudo systemctl stop stock-insight

# 重启服务
sudo systemctl restart stock-insight

# 禁用开机自启
sudo systemctl disable stock-insight
```

**方式3：使用 screen（适合临时测试）**
```bash
# 安装screen（如果没有）
sudo apt-get install screen -y

# 创建新的screen会话
screen -S stock-insight

# 在screen中启动服务
python3 start_prod.py

# 按 Ctrl+A 然后按 D 退出screen（服务继续运行）

# 重新连接到screen
screen -r stock-insight

# 查看所有screen会话
screen -ls
```

## 方式二：VPS服务器部署

### 1. 上传文件到服务器

使用 `scp` 或 `FTP` 工具上传项目文件到服务器：
```bash
# 创建部署目录
sudo mkdir -p /opt/stock-insight
sudo chown $USER:$USER /opt/stock-insight

# 上传文件
scp -r StockInsight/* user@your-server-ip:/opt/stock-insight/
```

### 2. 安装依赖

```bash
cd /opt/stock-insight
pip3 install -r requirements.txt
```

### 3. 配置防火墙

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 8588/tcp
sudo ufw reload

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=8588/tcp
sudo firewall-cmd --reload
```

### 4. 启动服务（后台运行，自动重启，开机自启）

**推荐方式：使用 systemd 服务（✅ 完整后台运行方案）**

```bash
# 1. 复制服务文件
sudo cp stock-insight.service /etc/systemd/system/

# 2. 根据实际情况修改服务文件
sudo nano /etc/systemd/system/stock-insight.service
# 需要修改：
#   - User: 根据系统选择（www-data/apache/nobody，使用 id www-data 检查）
#   - WorkingDirectory: 确认路径为 /opt/stock-insight
#   - ExecStart: 确认Python路径（使用 which python3 查看）

# 3. 设置文件权限（如果使用www-data用户）
sudo chown -R www-data:www-data /opt/stock-insight
sudo chmod 755 /opt/stock-insight
sudo chmod 660 /opt/stock-insight/stock_data.db 2>/dev/null || true

# 4. 启动服务
sudo systemctl daemon-reload
sudo systemctl enable stock-insight    # 设置开机自启
sudo systemctl start stock-insight     # 启动服务
sudo systemctl status stock-insight    # 查看状态

# 5. 验证后台运行
# 服务会自动在后台运行，即使断开SSH连接也会继续运行
# 服务异常退出时会自动重启（Restart=always）
# 服务器重启后会自动启动（systemctl enable）
```

**systemd服务特性：**
- ✅ **后台运行**: 自动管理进程，无需nohup或screen
- ✅ **自动重启**: 服务异常退出时自动重启（Restart=always）
- ✅ **开机自启**: 服务器重启后自动启动（systemctl enable）
- ✅ **日志管理**: 日志自动记录到journal，使用 `journalctl -u stock-insight -f` 查看

**验证后台运行：**
```bash
# 检查服务状态
sudo systemctl is-active stock-insight
# 输出: active 表示服务正在运行

# 检查进程
ps aux | grep start_prod.py
# 应该看到Python进程

# 断开SSH后重新连接，服务应该仍在运行
sudo systemctl status stock-insight
```

**或者使用 nohup（简单方式）**

```bash
# 后台启动
nohup python3 start_prod.py > app.log 2>&1 &

# 查看日志
tail -f app.log
```

### 5. 配置Nginx反向代理（可选）

创建 `/etc/nginx/sites-available/stock-insight`：
```nginx
# HTTP配置（建议配置HTTPS）
server {
    listen 80;
    server_name your-domain.com;

    # 重定向到HTTPS（如果配置了SSL证书）
    # return 301 https://$server_name$request_uri;

    # 或者直接使用HTTP（不推荐生产环境）
    location / {
        proxy_pass http://127.0.0.1:8588;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket支持（如果将来需要）
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 直接服务静态文件（提高性能）
    location /static/ {
        alias /opt/stock-insight/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}

# HTTPS配置（推荐生产环境使用）
# server {
#     listen 443 ssl http2;
#     server_name your-domain.com;
#
#     ssl_certificate /path/to/cert.pem;
#     ssl_certificate_key /path/to/key.pem;
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_ciphers HIGH:!aNULL:!MD5;
#
#     # 安全头
#     add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
#     add_header X-Frame-Options "SAMEORIGIN" always;
#     add_header X-Content-Type-Options "nosniff" always;
#     add_header X-XSS-Protection "1; mode=block" always;
#
#     location / {
#         proxy_pass http://127.0.0.1:8588;
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
#         
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection "upgrade";
#     }
#
#     location /static/ {
#         alias /opt/stock-insight/static/;
#         expires 30d;
#         add_header Cache-Control "public, immutable";
#     }
#
#     # 请求大小限制
#     client_max_body_size 10M;
# }
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/stock-insight /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 方式三：Docker部署

### 1. 安装Docker和Docker Compose

**Windows/Mac:**
- 下载并安装 Docker Desktop：https://www.docker.com/products/docker-desktop

**Linux:**
```bash
# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. 准备部署目录

```bash
# 创建部署目录
mkdir -p /opt/stock-insight
cd /opt/stock-insight

# 复制项目文件（不包括数据库和测试文件）
# 确保包含以下文件：
# - app/
# - static/
# - templates/
# - main.py
# - start_prod.py
# - requirements.txt
# - Dockerfile
# - docker-compose.yml
# - config.json（可选，可通过环境变量配置）
```

### 3. 配置数据持久化

```bash
# 创建数据目录
mkdir -p ./data

# 如果需要，复制现有数据库
# cp stock_data.db ./data/
```

### 4. 启动Docker容器

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 查看状态
docker-compose ps
```

### 5. 停止和重启

```bash
# 停止
docker-compose down

# 重启
docker-compose restart

# 更新代码后重新构建
docker-compose up -d --build
```

### 6. 数据备份

```bash
# 备份数据库
docker cp stock-analysis-v1:/app/data/stock_data.db ./backup/

# 或直接备份数据目录
tar -czf backup-$(date +%Y%m%d).tar.gz ./data
```

## 配置说明

### 环境变量（可选）

可以通过环境变量覆盖配置：
- `DATA_SOURCE`: 默认数据源（akshare/tushare/baostock/finnhub）
- `TUSHARE_TOKEN`: Tushare API Token
- `FINNHUB_API_KEY`: Finnhub API Key

### 配置文件

编辑 `config.json` 修改配置：
```json
{
    "data_source": "akshare",
    "tushare": {
        "token": "your_token"
    },
    "finnhub": {
        "api_key": "your_api_key"
    }
}
```

## 默认账号

- **管理员账号**: `admin`
- **默认密码**: `admin123`

**首次登录后请立即修改密码！**

## 端口配置

默认端口：`8588`

如需修改端口：
- **直接部署**: 修改 `main.py` 或 `start_prod.py` 中的 `port=8588`
- **Docker部署**: 修改 `docker-compose.yml` 中的端口映射

## 数据存储

- **数据库文件**: `stock_data.db`（SQLite）
- **配置文件**: `config.json`
- **进度文件**: `update_progress.json`

**重要**: 定期备份 `stock_data.db` 文件！

### 自动备份配置

1. **使用提供的备份脚本**：
```bash
# 复制备份脚本
sudo cp backup.sh /opt/stock-insight/
sudo chmod +x /opt/stock-insight/backup.sh

# 设置定时任务（每天凌晨2点备份）
sudo crontab -e
# 添加以下行：
0 2 * * * /opt/stock-insight/backup.sh >> /var/log/stock-insight-backup.log 2>&1
```

2. **手动备份**：
```bash
cd /opt/stock-insight
tar -czf backup-$(date +%Y%m%d).tar.gz stock_data.db config.json
```

3. **恢复备份**：
```bash
# 停止服务
sudo systemctl stop stock-insight

# 恢复备份
cd /opt/stock-insight
tar -xzf backup-YYYYMMDD.tar.gz

# 确保文件权限正确
sudo chown www-data:www-data stock_data.db config.json
sudo chmod 660 stock_data.db config.json

# 启动服务
sudo systemctl start stock-insight
```

### 日志轮转配置

1. **安装logrotate配置**：
```bash
sudo cp logrotate-stock-insight /etc/logrotate.d/stock-insight
sudo chmod 644 /etc/logrotate.d/stock-insight
```

2. **测试日志轮转**：
```bash
sudo logrotate -d /etc/logrotate.d/stock-insight
```

3. **手动执行日志轮转**：
```bash
sudo logrotate -f /etc/logrotate.d/stock-insight
```

## 常见问题

### 1. 端口被占用

```bash
# Linux/Mac 查看端口占用
lsof -i :8588

# Windows 查看端口占用
netstat -ano | findstr :8588
```

### 2. 依赖安装失败

```bash
# 升级pip
pip install --upgrade pip

# 使用国内镜像源
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### 3. 数据库权限问题（Linux）

```bash
# 确保数据库文件有写权限
chmod 666 stock_data.db
chown www-data:www-data stock_data.db
```

### 4. Docker容器无法访问

- 检查防火墙设置
- 检查端口映射是否正确
- 查看容器日志：`docker-compose logs`

## 更新系统

1. 停止服务
2. 备份数据库和配置
3. 更新代码文件
4. 重启服务

## 技术支持

如有问题，请联系管理员微信：**yyongzf8**

