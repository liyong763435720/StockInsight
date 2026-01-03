# -*- coding: utf-8 -*-
"""检查603248数据获取问题"""
import sys
import pandas as pd
from app.config import Config
from app.data_fetcher import DataFetcher

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("="*80)
print("检查603248数据获取问题")
print("="*80)

sources = ['akshare', 'tushare', 'baostock']

for source in sources:
    print(f"\n{'='*60}")
    print(f"检查 {source} 数据源")
    print(f"{'='*60}")
    
    config = Config()
    config.set('data_source', source)
    fetcher = DataFetcher(config)
    
    # 尝试获取更广泛的数据范围
    print("\n1. 获取2025年10-12月数据:")
    df = fetcher.get_monthly_kline('603248.SH', '20251001', '20251231')
    if not df.empty:
        print(f"  获取到 {len(df)} 条数据")
        print(df[['trade_date', 'year', 'month', 'open', 'close', 'pct_chg']].to_string(index=False))
    else:
        print("  未获取到数据")
    
    # 检查11月数据
    print("\n2. 单独获取2025年11月数据:")
    df_nov = fetcher.get_monthly_kline('603248.SH', '20251101', '20251130')
    if not df_nov.empty:
        print(f"  获取到 {len(df_nov)} 条数据")
        print(df_nov[['trade_date', 'year', 'month', 'open', 'close', 'pct_chg']].to_string(index=False))
    else:
        print("  未获取到11月数据")
    
    # 检查12月数据
    print("\n3. 单独获取2025年12月数据:")
    df_dec = fetcher.get_monthly_kline('603248.SH', '20251201', '20251231')
    if not df_dec.empty:
        print(f"  获取到 {len(df_dec)} 条数据")
        print(df_dec[['trade_date', 'year', 'month', 'open', 'close', 'pct_chg']].to_string(index=False))
        
        # 分析12月的涨跌幅
        if len(df_dec) > 0:
            row = df_dec.iloc[0]
            print(f"\n  12月数据分析:")
            print(f"    开盘: {row['open']:.2f}")
            print(f"    收盘: {row['close']:.2f}")
            print(f"    数据源涨跌幅: {row['pct_chg']:.2f}%" if pd.notna(row['pct_chg']) else "    数据源涨跌幅: N/A")
            
            # 手动计算
            if pd.notna(row['open']) and pd.notna(row['close']):
                manual_pct = (row['close'] - row['open']) / row['open'] * 100
                print(f"    手动计算（相对于开盘）: {manual_pct:.2f}%")
                
                if not df_nov.empty:
                    nov_close = df_nov.iloc[0]['close']
                    if pd.notna(nov_close):
                        manual_pct_vs_prev = (row['close'] - nov_close) / nov_close * 100
                        print(f"    手动计算（相对于11月收盘）: {manual_pct_vs_prev:.2f}%")
    else:
        print("  未获取到12月数据")

print("\n" + "="*80)
print("问题分析")
print("="*80)
print("1. 检查为什么没有获取到11月数据")
print("2. 检查为什么数据源返回的涨跌幅是117.52%（明显错误）")
print("3. 用户期望的-22.78%是相对于12月开盘价计算的")

