# -*- coding: utf-8 -*-
"""详细检查603248的数据"""
import sys
import pandas as pd
from app.config import Config
from app.data_fetcher import DataFetcher

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("="*80)
print("详细检查603248在2025年11月和12月的数据")
print("="*80)

# 预期数据
expected_pct = -22.78

sources = ['akshare', 'tushare', 'baostock']

for source in sources:
    print(f"\n{'='*60}")
    print(f"检查 {source} 数据源")
    print(f"{'='*60}")
    
    config = Config()
    config.set('data_source', source)
    fetcher = DataFetcher(config)
    
    # 获取2025年11月和12月的数据
    df = fetcher.get_monthly_kline('603248.SH', '20251101', '20251231')
    
    if df.empty:
        print("未获取到数据")
        continue
    
    print(f"\n获取到的数据:")
    print(df[['trade_date', 'year', 'month', 'open', 'close', 'pct_chg']].to_string(index=False))
    
    # 手动计算12月涨跌幅
    nov_data = df[df['month'] == 11]
    dec_data = df[df['month'] == 12]
    
    print(f"\n手动计算涨跌幅:")
    if not nov_data.empty and not dec_data.empty:
        nov_close = nov_data.iloc[0]['close']
        dec_open = dec_data.iloc[0]['open']
        dec_close = dec_data.iloc[0]['close']
        
        print(f"  11月收盘: {nov_close:.2f}")
        print(f"  12月开盘: {dec_open:.2f}")
        print(f"  12月收盘: {dec_close:.2f}")
        
        # 相对于11月收盘价计算
        pct_vs_prev = (dec_close - nov_close) / nov_close * 100
        print(f"\n  12月涨跌幅（相对于11月收盘）: {pct_vs_prev:.2f}%")
        print(f"  数据源计算的涨跌幅: {dec_data.iloc[0]['pct_chg']:.2f}%" if pd.notna(dec_data.iloc[0]['pct_chg']) else "  数据源计算的涨跌幅: N/A")
        
        # 相对于12月开盘价计算
        pct_vs_open = (dec_close - dec_open) / dec_open * 100
        print(f"  12月涨跌幅（相对于12月开盘）: {pct_vs_open:.2f}%")
        print(f"  预期涨跌幅: {expected_pct:.2f}%")
        print(f"  差异: {abs(pct_vs_open - expected_pct):.2f}%")
        
        if abs(pct_vs_open - expected_pct) < 0.1:
            print(f"  ✓ 相对于开盘价的计算与预期完全匹配！")
    elif not dec_data.empty:
        dec_open = dec_data.iloc[0]['open']
        dec_close = dec_data.iloc[0]['close']
        print(f"  12月开盘: {dec_open:.2f}")
        print(f"  12月收盘: {dec_close:.2f}")
        
        # 相对于12月开盘价计算
        pct_vs_open = (dec_close - dec_open) / dec_open * 100
        print(f"  12月涨跌幅（相对于12月开盘）: {pct_vs_open:.2f}%")
        print(f"  预期涨跌幅: {expected_pct:.2f}%")
        print(f"  差异: {abs(pct_vs_open - expected_pct):.2f}%")
        
        if abs(pct_vs_open - expected_pct) < 0.1:
            print(f"  ✓ 相对于开盘价的计算与预期完全匹配！")

print("\n" + "="*80)
print("总结")
print("="*80)
print("检查各数据源计算的涨跌幅是基于什么基准（上月收盘 vs 当月开盘）")

