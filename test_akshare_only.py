# -*- coding: utf-8 -*-
"""单独测试akshare数据获取"""
import sys
import pandas as pd
from app.config import Config
from app.data_fetcher import DataFetcher

# 设置UTF-8编码
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

config = Config()
config.set('data_source', 'akshare')
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
    print(f"\nts_code值: {df['ts_code'].unique()}")
    print(f"ts_code是否为NaN: {df['ts_code'].isna().any()}")

