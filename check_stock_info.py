# -*- coding: utf-8 -*-
"""检查股票信息"""
import sys
from app.database import Database

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db = Database()
stock = db.get_stock_by_code('001356')

if stock:
    print("股票信息:")
    print(f"  代码: {stock.get('ts_code', 'N/A')}")
    print(f"  名称: {stock.get('name', 'N/A')}")
    print(f"  上市日期: {stock.get('list_date', 'N/A')}")
else:
    print("未找到股票信息")

