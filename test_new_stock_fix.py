# -*- coding: utf-8 -*-
"""测试新股涨跌幅计算修复"""
import sys
import pandas as pd
from app.config import Config
from app.data_fetcher import DataFetcher

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("="*80)
print("测试新股涨跌幅计算修复 - 001356")
print("="*80)

# 预期数据
expected = {
    1: -33.54,
    2: -3.73
}

sources = ['akshare', 'tushare', 'baostock']

for source in sources:
    print(f"\n{'='*60}")
    print(f"测试 {source} 数据源")
    print(f"{'='*60}")
    
    config = Config()
    config.set('data_source', source)
    fetcher = DataFetcher(config)
    
    # 获取2025年1月和2月的数据
    df = fetcher.get_monthly_kline('001356.SZ', '20250101', '20250228')
    
    if df.empty:
        print("  未获取到数据")
        continue
    
    print(f"\n获取到的数据:")
    print(df[['trade_date', 'year', 'month', 'open', 'close', 'pct_chg']].to_string(index=False))
    
    # 检查1月和2月的数据
    for month in [1, 2]:
        month_data = df[df['month'] == month]
        if not month_data.empty:
            row = month_data.iloc[0]
            pct = row['pct_chg']
            expected_pct = expected[month]
            
            if pd.notna(pct):
                diff = abs(pct - expected_pct)
                status = "✓" if diff < 0.1 else "✗"
                print(f"\n{month}月数据:")
                print(f"  开盘: {row['open']:.2f}, 收盘: {row['close']:.2f}")
                print(f"  涨跌幅: {pct:.2f}% (预期: {expected_pct:.2f}%, 差异: {diff:.2f}%) {status}")
            else:
                print(f"\n{month}月数据:")
                print(f"  开盘: {row['open']:.2f}, 收盘: {row['close']:.2f}")
                print(f"  涨跌幅: N/A (预期: {expected_pct:.2f}%)")
                
                # 手动计算（使用开盘价作为基准）
                if pd.notna(row['open']) and pd.notna(row['close']) and row['open'] > 0:
                    manual_pct = (row['close'] - row['open']) / row['open'] * 100
                    print(f"  手动计算（相对于开盘价）: {manual_pct:.2f}%")

print("\n" + "="*80)
print("测试完成")
print("="*80)

