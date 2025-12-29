# StockInsight VPS 部署步骤

## 📋 部署前准备

### 服务器要求
- ✅ Python 3.11 或更高版本
- ✅ 至少 2GB 内存
- ✅ 至少 1GB 磁盘空间
- ✅ 开放端口 8588

### 需要准备的文件
- 项目所有文件（app/, static/, templates/, 等）
- `requirements.txt`
- `stock-insight.service`
- `start_prod.py`

---

## 🚀 部署步骤（按顺序执行）

### 步骤 1: 连接服务器

```bash
# SSH登录到VPS服务器
ssh username@your-server-ip
```

### 步骤 2: 更新系统（可选但推荐）

```bash
# Ubuntu/Debian
sudo apt-get update && sudo apt-get upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 步骤 3: 安装Python（如果未安装）

```bash
# Ubuntu/Debian
sudo apt-get install python3 python3-pip -y

# CentOS/RHEL
sudo yum install python3 python3-pip -y

# 验证安装
python3 --version
# 应该显示: Python 3.11.x 或更高
```

### 步骤 4: 创建部署目录

```bash
# 创建目录
sudo mkdir -p /opt/stock-insight

# 设置所有者（使用当前用户）
sudo chown $USER:$USER /opt/stock-insight

# 进入目录
cd /opt/stock-insight
```

### 步骤 5: 上传项目文件

**方式1: 使用SCP（从本地Windows）**
```bash
# 在本地Windows PowerShell执行
scp -r C:\Users\Administrator\Documents\GitHub\StockInsight\* username@your-server-ip:/opt/stock-insight/
```

**方式2: 使用Git（如果项目在GitHub）**
```bash
# 在服务器上执行
cd /opt/stock-insight
git clone https://github.com/your-repo/StockInsight.git .
```

**方式3: 使用FTP工具**
- 使用FileZilla、WinSCP等工具上传所有文件到 `/opt/stock-insight`

### 步骤 6: 安装Python依赖

```bash
cd /opt/stock-insight

# 安装依赖
pip3 install -r requirements.txt

# 如果安装慢，可以使用国内镜像
# pip3 install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### 步骤 7: 检查并设置用户权限

```bash
# 检查www-data用户是否存在
id www-data

# 如果存在（Ubuntu/Debian），使用www-data
SERVICE_USER="www-data"

# 如果不存在（CentOS），检查apache用户
id apache || SERVICE_USER="nobody"

# 设置文件所有者
if [ "$SERVICE_USER" != "nobody" ]; then
    sudo chown -R $SERVICE_USER:$SERVICE_USER /opt/stock-insight
    sudo chmod 755 /opt/stock-insight
fi
```

### 步骤 8: 配置systemd服务

```bash
# 1. 复制服务文件
sudo cp /opt/stock-insight/stock-insight.service /etc/systemd/system/

# 2. 获取Python路径
PYTHON_PATH=$(which python3)
echo "Python路径: $PYTHON_PATH"

# 3. 编辑服务文件（根据实际情况修改）
sudo nano /etc/systemd/system/stock-insight.service

# 需要确认的内容：
# - User: www-data 或 apache 或 nobody（根据步骤7的结果）
# - WorkingDirectory: /opt/stock-insight
# - ExecStart: $PYTHON_PATH /opt/stock-insight/start_prod.py
```

**服务文件内容示例：**
```ini
[Unit]
Description=StockInsight - 股票洞察分析系统
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/stock-insight
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

### 步骤 9: 启动服务

```bash
# 1. 重新加载systemd配置
sudo systemctl daemon-reload

# 2. 设置开机自启
sudo systemctl enable stock-insight

# 3. 启动服务
sudo systemctl start stock-insight

# 4. 检查服务状态
sudo systemctl status stock-insight
```

**期望输出：**
```
● stock-insight.service - StockInsight - 股票洞察分析系统
   Loaded: loaded (/etc/systemd/system/stock-insight.service; enabled)
   Active: active (running) since ...
```

### 步骤 10: 配置防火墙

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 8588/tcp
sudo ufw reload
sudo ufw status

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=8588/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-ports
```

### 步骤 11: 验证部署

```bash
# 1. 检查服务状态
sudo systemctl is-active stock-insight
# 应该输出: active

# 2. 检查端口监听
sudo netstat -tlnp | grep 8588
# 或
sudo ss -tlnp | grep 8588
# 应该看到: 0.0.0.0:8588

# 3. 本地测试
curl http://localhost:8588
# 应该返回HTML内容

# 4. 查看日志（确认没有错误）
sudo journalctl -u stock-insight -n 50
```

### 步骤 12: 访问系统

```bash
# 获取服务器IP
hostname -I

# 在浏览器中访问
# http://your-server-ip:8588
```

**默认登录信息：**
- 用户名: `admin`
- 密码: `admin123`

**⚠️ 首次登录后请立即修改密码！**

---

## ✅ 部署完成检查清单

- [ ] 服务状态为 `active (running)`
- [ ] 端口 8588 正在监听
- [ ] 防火墙已开放端口 8588
- [ ] 可以通过浏览器访问系统
- [ ] 可以正常登录
- [ ] 服务设置为开机自启（`systemctl is-enabled stock-insight` 显示 `enabled`）

---

## 🔧 常用管理命令

```bash
# 查看服务状态
sudo systemctl status stock-insight

# 启动服务
sudo systemctl start stock-insight

# 停止服务
sudo systemctl stop stock-insight

# 重启服务
sudo systemctl restart stock-insight

# 查看实时日志
sudo journalctl -u stock-insight -f

# 查看最近100条日志
sudo journalctl -u stock-insight -n 100

# 禁用开机自启
sudo systemctl disable stock-insight

# 启用开机自启
sudo systemctl enable stock-insight
```

---

## 🐛 常见问题排查

### 问题1: 服务无法启动

```bash
# 查看详细错误信息
sudo journalctl -u stock-insight -n 50

# 检查Python路径
which python3

# 检查文件权限
ls -la /opt/stock-insight

# 手动测试启动
cd /opt/stock-insight
python3 start_prod.py
```

### 问题2: 端口无法访问

```bash
# 检查服务是否运行
sudo systemctl status stock-insight

# 检查端口监听
sudo netstat -tlnp | grep 8588

# 检查防火墙
sudo ufw status
# 或
sudo firewall-cmd --list-all
```

### 问题3: 权限错误

```bash
# 检查文件所有者
ls -la /opt/stock-insight/stock_data.db

# 修复权限
sudo chown www-data:www-data /opt/stock-insight/stock_data.db
sudo chmod 660 /opt/stock-insight/stock_data.db
```

### 问题4: 依赖安装失败

```bash
# 升级pip
pip3 install --upgrade pip

# 使用国内镜像
pip3 install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

---

## 📝 后续配置（可选）

### 配置Nginx反向代理

参考 `DEPLOYMENT.md` 中的Nginx配置部分

### 配置HTTPS

使用Let's Encrypt免费SSL证书：
```bash
sudo apt-get install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

### 配置自动备份

```bash
# 复制备份脚本
sudo cp /opt/stock-insight/backup.sh /opt/stock-insight/

# 设置执行权限
sudo chmod +x /opt/stock-insight/backup.sh

# 设置定时任务（每天凌晨2点备份）
sudo crontab -e
# 添加: 0 2 * * * /opt/stock-insight/backup.sh >> /var/log/stock-insight-backup.log 2>&1
```

---

## 🎉 部署完成！

现在系统已经：
- ✅ 在后台运行
- ✅ 自动重启（异常退出时）
- ✅ 开机自启
- ✅ 日志自动管理

访问地址: `http://your-server-ip:8588`

如有问题，查看日志: `sudo journalctl -u stock-insight -f`

