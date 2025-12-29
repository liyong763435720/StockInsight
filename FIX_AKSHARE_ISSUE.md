# akshare 安装问题修复说明

## 问题分析

在使用 `start.sh` 部署时遇到以下问题：

1. **pip root 用户警告**：在 root 用户下运行 pip 会显示警告
2. **akshare 导入错误**：虽然 requirements.txt 中包含了 akshare，但启动时仍然报错 `ImportError: akshare未安装`

## 根本原因

1. **requirements.txt 版本问题**：
   - 使用了固定版本 `akshare==1.12.0`（旧版本）
   - 新版本要求是 `akshare>=1.17,<3.0`，但被注释掉了

2. **start.sh 依赖检查不完整**：
   - 只检查 `fastapi` 是否安装
   - 如果 fastapi 已安装，就不会安装其他依赖（包括 akshare）

3. **错误处理不够健壮**：
   - 如果 akshare 不可用，系统直接崩溃
   - 没有优雅降级机制

## 修复内容

### 1. 修复 requirements.txt
```diff
- akshare==1.12.0
- #akshare>=1.17,<3.0
+ akshare>=1.17,<3.0
```

### 2. 修复 start.sh
- 检查所有关键依赖（fastapi, uvicorn, pandas, akshare）
- 使用 `--root-user-action=ignore` 忽略 root 用户警告
- 添加更详细的安装信息

### 3. 改进 data_fetcher.py
- 如果 akshare 不可用，自动切换到 tushare 数据源
- 添加警告信息，不直接抛出异常

### 4. 改进 config.py
- 默认配置会根据 akshare 是否可用来选择默认数据源
- 如果 akshare 不可用，默认使用 tushare

### 5. 改进 api.py
- 处理 DataUpdater 初始化失败的情况
- 如果 updater 为 None，返回友好的错误信息

## 使用说明

### 重新部署步骤

1. **确保所有依赖已安装**：
   ```bash
   pip3 install --root-user-action=ignore -r requirements.txt
   ```

2. **启动服务**：
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

### 如果 akshare 仍然无法安装

系统会自动降级到 tushare 数据源，但需要配置 tushare token：

1. 登录系统（管理员账号）
2. 进入"系统配置"页面
3. 配置 Tushare Token
4. 保存配置

### 验证修复

1. 检查服务是否正常启动：
   ```bash
   curl http://localhost:8588
   ```

2. 检查日志中是否有警告信息：
   - 如果看到 "警告: akshare未安装，切换到tushare数据源"，说明降级机制正常工作

## 注意事项

1. **root 用户警告**：使用 `--root-user-action=ignore` 可以忽略警告，但建议在生产环境中使用虚拟环境

2. **数据源切换**：如果 akshare 不可用，系统会自动使用 tushare，但需要配置相应的 token

3. **依赖安装**：确保所有依赖都正确安装，特别是 akshare 及其依赖包

## 相关文件

- `requirements.txt` - 依赖包列表
- `start.sh` - 启动脚本
- `app/data_fetcher.py` - 数据获取模块
- `app/config.py` - 配置管理模块
- `app/api.py` - API 路由模块

