# -*- coding: utf-8 -*-
"""检查603248数据源返回的原始涨跌幅值"""
import sys
import pandas as pd
import baostock as bs

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 检查BaoStock原始数据
print("="*80)
print("检查BaoStock返回的原始涨跌幅值")
print("="*80)

lg = bs.login()
if lg.error_code == '0':
    rs = bs.query_history_k_data_plus(
        'sh.603248',
        'date,open,close,pctChg',
        '2025-12-01',
        '2025-12-31',
        'm',
        '3'
    )
    if rs.error_code == '0':
        df = rs.get_data()
        print("BaoStock原始数据:")
        print(df[['date', 'open', 'close', 'pctChg']])
        print(f"\npctChg原始值: {df['pctChg'].iloc[0]}")
        
        # 手动计算
        open_val = float(df['open'].iloc[0])
        close_val = float(df['close'].iloc[0])
        manual_pct = (close_val - open_val) / open_val * 100
        print(f"\n手动计算（相对于开盘）: {manual_pct:.2f}%")
        print(f"BaoStock返回的pctChg: {float(df['pctChg'].iloc[0]):.2f}%")
    else:
        print(f"查询错误: {rs.error_msg}")
    bs.logout()
else:
    print(f"登录失败: {lg.error_msg}")

# 检查akshare原始数据
print("\n" + "="*80)
print("检查AkShare返回的原始涨跌幅值")
print("="*80)

try:
    import akshare as ak
    df = ak.stock_zh_a_hist(symbol='603248', period="monthly", start_date='20251201', end_date='20251231', adjust="qfq")
    if not df.empty:
        print("AkShare原始数据:")
        print(df[['日期', '开盘', '收盘', '涨跌幅']].head())
        if '涨跌幅' in df.columns:
            print(f"\n涨跌幅原始值: {df['涨跌幅'].iloc[0]}")
            
            # 手动计算
            open_val = float(df['开盘'].iloc[0])
            close_val = float(df['收盘'].iloc[0])
            manual_pct = (close_val - open_val) / open_val * 100
            print(f"\n手动计算（相对于开盘）: {manual_pct:.2f}%")
            print(f"AkShare返回的涨跌幅: {df['涨跌幅'].iloc[0]:.2f}%")
except Exception as e:
    print(f"错误: {e}")

print("\n" + "="*80)
print("结论")
print("="*80)
print("数据源返回的涨跌幅值可能是错误的，需要验证其合理性")

