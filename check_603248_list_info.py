# -*- coding: utf-8 -*-
"""检查603248的上市信息"""
import sys
from app.database import Database

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db = Database()
stock = db.get_stock_by_code('603248')

if stock:
    print("股票信息:")
    print(f"  代码: {stock.get('ts_code', 'N/A')}")
    print(f"  名称: {stock.get('name', 'N/A')}")
    print(f"  上市日期: {stock.get('list_date', 'N/A')}")
else:
    print("未找到股票信息，尝试从数据源获取...")
    
    # 尝试从tushare获取
    try:
        from app.config import Config
        import tushare as ts
        config = Config()
        token = config.get('tushare.token', '')
        if token:
            ts.set_token(token)
            pro = ts.pro_api()
            df = pro.stock_basic(ts_code='603248.SH', fields='ts_code,symbol,name,list_date')
            if not df.empty:
                print("\n从tushare获取的股票信息:")
                print(df.to_string(index=False))
    except Exception as e:
        print(f"从tushare获取失败: {e}")

