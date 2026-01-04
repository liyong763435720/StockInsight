# GitHub 上传指南

## 数据源API存储位置

**数据源API配置存储在 `config.json` 文件中**

该文件包含：
- Tushare Token
- FinnHub API Key
- 数据源选择
- 其他配置信息

⚠️ **重要：`config.json` 包含敏感信息，不应上传到GitHub！**

## 文件上传清单

### ✅ 应该上传的文件

#### 核心代码文件
- `app/` - 应用核心代码目录
  - `__init__.py`
  - `api.py`
  - `auth.py`
  - `config.py`
  - `data_fetcher.py`
  - `data_updater.py`
  - `database.py`
  - `permissions.py`
  - `statistics.py`
- `static/` - 静态文件目录
  - `app.js`
- `templates/` - 模板文件目录
  - `index.html`

#### 启动和配置文件
- `main.py` - 开发模式启动脚本
- `start_prod.py` - 生产模式启动脚本
- `start.sh` - Linux启动脚本
- `start.bat` - Windows启动脚本
- `config.json.example` - 配置文件模板（**必须上传**）

#### 部署相关文件
- `install.sh` - Linux一键部署脚本
- `install.bat` - Windows安装脚本
- `deploy.sh` - 部署脚本
- `stock-insight.service` - systemd服务文件
- `Dockerfile` - Docker镜像构建文件
- `docker-compose.yml` - Docker Compose配置
- `docker-entrypoint.sh` - Docker入口脚本

#### 依赖和文档
- `requirements.txt` - Python依赖列表（**必须上传**）
- `README.md` - 项目说明文档
- `README_DEPLOY.md` - 部署文档
- `DEPLOYMENT.md` - 详细部署指南
- `LICENSE` - 许可证文件
- `VERSION.txt` - 版本信息

#### 其他
- `.gitignore` - Git忽略文件（**必须上传**）
- `PACKAGE.md` - 打包说明（如果有）

### ❌ 不应该上传的文件

#### 敏感配置文件
- `config.json` - **包含API密钥，绝对不能上传！**
  - 使用 `config.json.example` 作为模板

#### 数据库文件
- `*.db` - 所有数据库文件
- `stock_data.db` - 主数据库文件
- `*.sqlite` / `*.sqlite3` - SQLite数据库文件

#### 日志文件
- `*.log` - 所有日志文件
- `app.log` - 应用日志
- `logs/` - 日志目录

#### Python缓存和编译文件
- `__pycache__/` - Python缓存目录
- `*.pyc` - Python编译文件
- `*.pyo` - Python优化文件
- `*.pyd` - Python扩展模块

#### 虚拟环境
- `venv/` - Python虚拟环境
- `env/` - 虚拟环境
- `.venv/` - 虚拟环境

#### 测试和临时文件
- `test_*.py` - 测试脚本
- `check_*.py` - 检查脚本
- `verify_*.py` - 验证脚本
- `compare_*.py` - 对比脚本
- `enhance_*.py` - 增强脚本

#### IDE和系统文件
- `.vscode/` - VS Code配置
- `.idea/` - PyCharm配置
- `.DS_Store` - macOS系统文件
- `Thumbs.db` - Windows缩略图
- `desktop.ini` - Windows系统文件

#### 文档（可选）
- `*_COMPARISON_REPORT.md` - 测试报告
- `*_VERIFICATION.md` - 验证文档
- `*_SUMMARY.md` - 总结文档
- `*_ANALYSIS.md` - 分析文档
- `*_PLAN.md` - 计划文档

## 上传前检查清单

在推送到GitHub之前，请确认：

- [ ] `config.json` 已添加到 `.gitignore`
- [ ] `config.json.example` 已创建并上传
- [ ] 所有数据库文件（`*.db`）已忽略
- [ ] 所有日志文件（`*.log`）已忽略
- [ ] `__pycache__/` 目录已忽略
- [ ] 测试脚本已忽略（如果不想上传）
- [ ] 敏感信息已从代码中移除

## 首次上传步骤

1. **创建配置文件模板**
   ```bash
   cp config.json config.json.example
   # 然后编辑 config.json.example，清空所有敏感信息
   ```

2. **检查 .gitignore**
   ```bash
   # 确保 .gitignore 包含所有敏感文件
   cat .gitignore
   ```

3. **检查要上传的文件**
   ```bash
   git status
   # 确认 config.json 显示为未跟踪或已忽略
   ```

4. **添加文件**
   ```bash
   git add .
   git add config.json.example
   ```

5. **提交**
   ```bash
   git commit -m "Initial commit"
   ```

6. **推送到GitHub**
   ```bash
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

## 如果已经上传了敏感文件

如果之前已经将 `config.json` 上传到GitHub，需要：

1. **从Git历史中删除**
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch config.json" \
     --prune-empty --tag-name-filter cat -- --all
   ```

2. **强制推送（谨慎使用）**
   ```bash
   git push origin --force --all
   ```

3. **立即更换所有API密钥**
   - 更换Tushare Token
   - 更换FinnHub API Key
   - 更换其他所有敏感凭证

## 配置文件模板说明

`config.json.example` 是配置文件的模板，包含：
- 所有配置项的结构
- 空白的API密钥字段
- 默认配置值

用户克隆项目后，应该：
```bash
cp config.json.example config.json
# 然后编辑 config.json，填入自己的API密钥
```

