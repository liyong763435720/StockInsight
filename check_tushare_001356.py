# -*- coding: utf-8 -*-
"""检查tushare对001356的数据获取和计算"""
import sys
import pandas as pd
import tushare as ts
from app.config import Config

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

config = Config()
token = config.get('tushare.token', '')
if token:
    ts.set_token(token)
    pro = ts.pro_api()
    
    print("="*80)
    print("检查tushare原始数据")
    print("="*80)
    
    # 获取月K线数据
    print("\n1. 获取月K线数据（freq='M'）:")
    try:
        monthly_df = pro.monthly(ts_code='001356.SZ', start_date='20241201', end_date='20250228', fields='ts_code,trade_date,open,high,low,close,vol,amount')
        if not monthly_df.empty:
            monthly_df = monthly_df.sort_values('trade_date')
            print(monthly_df[['trade_date', 'open', 'close']].to_string(index=False))
            
            # 计算涨跌幅
            monthly_df['pct_chg'] = monthly_df['close'].pct_change() * 100
            print("\n使用pct_change计算的涨跌幅:")
            print(monthly_df[['trade_date', 'close', 'pct_chg']].to_string(index=False))
        else:
            print("未获取到月K线数据")
    except Exception as e:
        print(f"获取月K线数据失败: {e}")
        import traceback
        traceback.print_exc()
    
    # 获取日K线数据（2024年12月）
    print("\n2. 获取2024年12月日K线数据:")
    try:
        daily_df = pro.daily(ts_code='001356.SZ', start_date='20241201', end_date='20241231', fields='ts_code,trade_date,open,high,low,close,vol,amount')
        if not daily_df.empty:
            daily_df = daily_df.sort_values('trade_date')
            print(f"获取到 {len(daily_df)} 条日K线数据")
            print(f"最后一天: {daily_df.iloc[-1]['trade_date']}, 收盘: {daily_df.iloc[-1]['close']:.2f}")
        else:
            print("未获取到2024年12月日K线数据")
    except Exception as e:
        print(f"获取日K线数据失败: {e}")
    
    # 获取日K线数据（2025年1月）
    print("\n3. 获取2025年1月日K线数据:")
    try:
        daily_df = pro.daily(ts_code='001356.SZ', start_date='20250101', end_date='20250131', fields='ts_code,trade_date,open,high,low,close,vol,amount')
        if not daily_df.empty:
            daily_df = daily_df.sort_values('trade_date')
            print(f"获取到 {len(daily_df)} 条日K线数据")
            print(f"第一天: {daily_df.iloc[0]['trade_date']}, 开盘: {daily_df.iloc[0]['open']:.2f}, 收盘: {daily_df.iloc[0]['close']:.2f}")
            print(f"最后一天: {daily_df.iloc[-1]['trade_date']}, 收盘: {daily_df.iloc[-1]['close']:.2f}")
        else:
            print("未获取到2025年1月日K线数据")
    except Exception as e:
        print(f"获取日K线数据失败: {e}")
    
    # 获取股票基本信息
    print("\n4. 获取股票基本信息:")
    try:
        basic_df = pro.stock_basic(ts_code='001356.SZ', fields='ts_code,symbol,name,list_date')
        if not basic_df.empty:
            print(basic_df.to_string(index=False))
    except Exception as e:
        print(f"获取股票基本信息失败: {e}")

