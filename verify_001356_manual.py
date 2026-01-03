# -*- coding: utf-8 -*-
"""手动验证001356的数据计算"""
import sys
import pandas as pd
from app.config import Config
from app.data_fetcher import DataFetcher

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 预期数据
expected = {
    1: -33.54,
    2: -3.73
}

print("="*80)
print("001356 数据验证和手动计算")
print("="*80)

sources = ['akshare', 'tushare', 'baostock']
all_data = {}

for source in sources:
    print(f"\n{source} 数据源:")
    print("-"*60)
    
    config = Config()
    config.set('data_source', source)
    fetcher = DataFetcher(config)
    
    # 获取更广泛的数据范围，确保包含2024年12月
    df = fetcher.get_monthly_kline('001356.SZ', '20241101', '20250228')
    
    if df.empty:
        print("  未获取到数据")
        continue
    
    print(f"  获取到 {len(df)} 条数据")
    print(f"  数据范围: {df['trade_date'].min()} 至 {df['trade_date'].max()}")
    
    # 显示所有数据
    print(f"\n  所有月份数据:")
    for _, row in df.iterrows():
        print(f"    {row['trade_date']} | {row['year']}年{row['month']}月 | "
              f"开盘:{row['open']:.2f} | 收盘:{row['close']:.2f} | "
              f"涨跌:{row['pct_chg']:.2f}%" if pd.notna(row['pct_chg']) else f"涨跌:N/A")
    
    # 手动计算1月涨跌幅
    dec_data = df[df['month'] == 12]
    jan_data = df[df['month'] == 1]
    feb_data = df[df['month'] == 2]
    
    print(f"\n  手动计算:")
    
    # 计算1月涨跌幅
    if not dec_data.empty and not jan_data.empty:
        dec_close = dec_data.iloc[0]['close']
        jan_close = jan_data.iloc[0]['close']
        jan_pct_manual = (jan_close - dec_close) / dec_close * 100
        print(f"    1月涨跌幅计算:")
        print(f"      12月收盘: {dec_close:.2f}")
        print(f"      1月收盘: {jan_close:.2f}")
        print(f"      计算涨跌幅: {jan_pct_manual:.2f}%")
        print(f"      预期涨跌幅: {expected[1]:.2f}%")
        print(f"      差异: {abs(jan_pct_manual - expected[1]):.2f}%")
        print(f"      数据源计算的涨跌幅: {jan_data.iloc[0]['pct_chg']:.2f}%" if pd.notna(jan_data.iloc[0]['pct_chg']) else "      数据源计算的涨跌幅: N/A")
    elif not jan_data.empty:
        print(f"    1月数据: 收盘 {jan_data.iloc[0]['close']:.2f}")
        print(f"    缺少12月数据，无法计算1月涨跌幅")
        # 根据预期涨跌幅反推12月收盘价
        jan_close = jan_data.iloc[0]['close']
        expected_dec_close = jan_close / (1 + expected[1] / 100)
        print(f"    根据预期涨跌幅反推12月收盘价应为: {expected_dec_close:.2f}")
    
    # 计算2月涨跌幅
    if not jan_data.empty and not feb_data.empty:
        jan_close = jan_data.iloc[0]['close']
        feb_close = feb_data.iloc[0]['close']
        feb_pct_manual = (feb_close - jan_close) / jan_close * 100
        print(f"\n    2月涨跌幅计算:")
        print(f"      1月收盘: {jan_close:.2f}")
        print(f"      2月收盘: {feb_close:.2f}")
        print(f"      计算涨跌幅: {feb_pct_manual:.2f}%")
        print(f"      预期涨跌幅: {expected[2]:.2f}%")
        print(f"      差异: {abs(feb_pct_manual - expected[2]):.2f}%")
        print(f"      数据源计算的涨跌幅: {feb_data.iloc[0]['pct_chg']:.2f}%" if pd.notna(feb_data.iloc[0]['pct_chg']) else "      数据源计算的涨跌幅: N/A")
    
    all_data[source] = df

# 总结
print("\n" + "="*80)
print("总结")
print("="*80)

print("\n2月数据准确性:")
for source in sources:
    if source in all_data:
        df = all_data[source]
        feb_data = df[df['month'] == 2]
        if not feb_data.empty:
            pct = feb_data.iloc[0]['pct_chg']
            if pd.notna(pct):
                diff = abs(pct - expected[2])
                status = "✓" if diff < 0.1 else "✗"
                print(f"  {source:12s}: {pct:7.2f}% (差异: {diff:.2f}%) {status}")

print("\n1月数据准确性:")
for source in sources:
    if source in all_data:
        df = all_data[source]
        dec_data = df[df['month'] == 12]
        jan_data = df[df['month'] == 1]
        if not dec_data.empty and not jan_data.empty:
            dec_close = dec_data.iloc[0]['close']
            jan_close = jan_data.iloc[0]['close']
            pct_manual = (jan_close - dec_close) / dec_close * 100
            diff = abs(pct_manual - expected[1])
            status = "✓" if diff < 0.5 else "✗"
            print(f"  {source:12s}: {pct_manual:7.2f}% (差异: {diff:.2f}%) {status}")
        elif not jan_data.empty:
            print(f"  {source:12s}: 缺少12月数据，无法计算")

