# -*- coding: utf-8 -*-
"""测试baostock数据获取"""
import sys
import pandas as pd
from app.config import Config
from app.data_fetcher import DataFetcher

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

config = Config()
config.set('data_source', 'baostock')
fetcher = DataFetcher(config)

test_code = "000001.SZ"
start_date = "20230101"
end_date = "20231231"

print(f"测试股票: {test_code}")
print(f"日期范围: {start_date} - {end_date}")
print("\n正在获取数据...")

df = fetcher.get_monthly_kline(test_code, start_date, end_date)

if df is None or df.empty:
    print("获取失败: 返回空数据")
else:
    print(f"获取成功! 数据条数: {len(df)}")
    print(f"\n数据列: {list(df.columns)}")
    print(f"\n前5条数据:")
    print(df.head())
    print(f"\n后5条数据:")
    print(df.tail())
    print(f"\n数据质量:")
    print(f"  ts_code字段: {'正常' if df['ts_code'].notna().all() else '有NaN'}")
    print(f"  价格数据: 开盘{df['open'].notna().sum()}/{len(df)}, 收盘{df['close'].notna().sum()}/{len(df)}")
    print(f"  涨跌幅: {df['pct_chg'].notna().sum()}/{len(df)}")
    print(f"  负价格: {len(df[(df['open'] < 0) | (df['close'] < 0)])}条")

