# -*- coding: utf-8 -*-
"""详细检查001356的数据"""
import sys
import pandas as pd
from app.config import Config
from app.data_fetcher import DataFetcher

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def check_source(source_name):
    print(f"\n{'='*60}")
    print(f"检查 {source_name} 数据源")
    print(f"{'='*60}")
    
    config = Config()
    config.set('data_source', source_name)
    fetcher = DataFetcher(config)
    
    # 获取2024年12月到2025年2月的数据
    df = fetcher.get_monthly_kline('001356.SZ', '20241201', '20250228')
    
    if df.empty:
        print("未获取到数据")
        return
    
    print(f"\n获取到的数据:")
    print(df[['trade_date', 'year', 'month', 'open', 'close', 'pct_chg']].to_string(index=False))
    
    # 手动计算1月涨跌幅
    dec_data = df[df['month'] == 12]
    jan_data = df[df['month'] == 1]
    feb_data = df[df['month'] == 2]
    
    print(f"\n手动计算涨跌幅:")
    if not dec_data.empty and not jan_data.empty:
        dec_close = dec_data.iloc[0]['close']
        jan_close = jan_data.iloc[0]['close']
        jan_pct = (jan_close - dec_close) / dec_close * 100
        print(f"  2024年12月收盘: {dec_close:.2f}")
        print(f"  2025年1月收盘: {jan_close:.2f}")
        print(f"  1月涨跌幅（手动计算）: {jan_pct:.2f}%")
        print(f"  预期涨跌幅: -33.54%")
        print(f"  差异: {abs(jan_pct - (-33.54)):.2f}%")
    
    if not jan_data.empty and not feb_data.empty:
        jan_close = jan_data.iloc[0]['close']
        feb_close = feb_data.iloc[0]['close']
        feb_pct = (feb_close - jan_close) / jan_close * 100
        print(f"\n  2025年1月收盘: {jan_close:.2f}")
        print(f"  2025年2月收盘: {feb_close:.2f}")
        print(f"  2月涨跌幅（手动计算）: {feb_pct:.2f}%")
        print(f"  预期涨跌幅: -3.73%")
        print(f"  差异: {abs(feb_pct - (-3.73)):.2f}%")

# 检查所有数据源
for source in ['akshare', 'tushare', 'baostock']:
    try:
        check_source(source)
    except Exception as e:
        print(f"\n{source} 检查失败: {str(e)}")
        import traceback
        traceback.print_exc()

