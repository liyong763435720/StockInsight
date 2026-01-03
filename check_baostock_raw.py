# -*- coding: utf-8 -*-
"""检查BaoStock返回的原始pctChg值"""
import sys
import baostock as bs
import pandas as pd

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

lg = bs.login()
if lg.error_code == '0':
    rs = bs.query_history_k_data_plus(
        'sz.000001',
        'date,open,close,pctChg',
        '2024-01-01',
        '2024-02-28',
        'm',
        '3'
    )
    if rs.error_code == '0':
        df = rs.get_data()
        print("BaoStock原始数据:")
        print(df[['date', 'open', 'close', 'pctChg']])
        print(f"\npctChg原始值类型: {type(df['pctChg'].iloc[0])}")
        print(f"pctChg原始值: {repr(df['pctChg'].iloc[0])}")
        
        # 手动计算涨跌幅
        open_val = float(df['open'].iloc[0])
        close_val = float(df['close'].iloc[0])
        manual_pct = (close_val - open_val) / open_val * 100
        print(f"\n手动计算涨跌幅: ({close_val} - {open_val}) / {open_val} * 100 = {manual_pct:.2f}%")
        
        # 检查pctChg的值
        pct_chg_val = float(df['pctChg'].iloc[0])
        print(f"BaoStock返回的pctChg值: {pct_chg_val}")
        print(f"如果pctChg是小数形式（0.7455表示0.7455%），则: {pct_chg_val * 100:.2f}%")
        print(f"如果pctChg是百分比形式（74.55表示74.55%），则: {pct_chg_val:.2f}%")
        
        # 判断哪个更接近手动计算的值
        if abs(pct_chg_val * 100 - manual_pct) < abs(pct_chg_val - manual_pct):
            print(f"\n结论: pctChg是小数形式，需要乘以100")
        else:
            print(f"\n结论: pctChg是百分比形式，直接使用")
    else:
        print(f"查询错误: {rs.error_msg}")
    bs.logout()
else:
    print(f"登录失败: {lg.error_msg}")

