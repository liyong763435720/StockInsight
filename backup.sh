#!/bin/bash
# StockInsight 数据备份脚本

# 配置
BACKUP_DIR="/opt/backups/stock-insight"
SOURCE_DIR="/opt/stock-insight"
RETENTION_DAYS=30  # 保留30天备份

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 生成备份文件名（带时间戳）
BACKUP_FILE="stock-insight-backup-$(date +%Y%m%d-%H%M%S).tar.gz"

# 执行备份
echo "开始备份 StockInsight 数据..."
tar -czf "$BACKUP_DIR/$BACKUP_FILE" \
    -C "$SOURCE_DIR" \
    stock_data.db \
    config.json \
    2>/dev/null

if [ $? -eq 0 ]; then
    echo "备份成功: $BACKUP_DIR/$BACKUP_FILE"
    
    # 清理旧备份
    find "$BACKUP_DIR" -name "stock-insight-backup-*.tar.gz" -mtime +$RETENTION_DAYS -delete
    echo "已清理 $RETENTION_DAYS 天前的旧备份"
else
    echo "备份失败！"
    exit 1
fi

