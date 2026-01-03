# -*- coding: utf-8 -*-
"""检查各数据源返回的字段"""
import sys
import pandas as pd
import tushare as ts
import baostock as bs

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

try:
    import akshare as ak
    AKSHARE_AVAILABLE = True
except ImportError:
    AKSHARE_AVAILABLE = False

# 测试股票
ts_code = "000001.SZ"  # 平安银行，一个老股票
code = "000001"
start_date = "20240101"
end_date = "20240228"

print("="*80)
print("检查各数据源返回的字段（月K线）")
print("="*80)

# 1. 检查 tushare
print("\n1. Tushare (pro_bar, freq='M'):")
print("-"*60)
try:
    from app.config import Config
    config = Config()
    token = config.get('tushare.token', '')
    if token:
        ts.set_token(token)
        pro = ts.pro_api()
        df = ts.pro_bar(ts_code=ts_code, adj='qfq', start_date=start_date, end_date=end_date, freq='M')
        if df is not None and not df.empty:
            print(f"返回的列: {list(df.columns)}")
            print(f"是否有pct_chg字段: {'pct_chg' in df.columns}")
            if 'pct_chg' in df.columns:
                print(f"pct_chg示例值: {df['pct_chg'].head(3).tolist()}")
            print(f"\n前3行数据:")
            print(df.head(3).to_string())
        else:
            print("未获取到数据")
    else:
        print("未配置tushare token")
except Exception as e:
    print(f"错误: {e}")
    import traceback
    traceback.print_exc()

# 2. 检查 baostock
print("\n2. BaoStock (query_history_k_data_plus, frequency='m'):")
print("-"*60)
try:
    lg = bs.login()
    if lg.error_code == '0':
        code_bs = "sz.000001"
        start_date_bs = "2024-01-01"
        end_date_bs = "2024-02-28"
        rs = bs.query_history_k_data_plus(
            code_bs,
            "date,open,high,low,close,volume,amount,pctChg",  # 尝试请求pctChg字段
            start_date=start_date_bs,
            end_date=end_date_bs,
            frequency="m",
            adjustflag="3"
        )
        if rs.error_code == '0':
            df = rs.get_data()
            if not df.empty:
                print(f"返回的列: {list(df.columns)}")
                print(f"是否有pctChg字段: {'pctChg' in df.columns}")
                if 'pctChg' in df.columns:
                    print(f"pctChg示例值: {df['pctChg'].head(3).tolist()}")
                print(f"\n前3行数据:")
                print(df.head(3).to_string())
            else:
                print("未获取到数据")
        else:
            print(f"查询错误: {rs.error_msg}")
        bs.logout()
    else:
        print(f"登录失败: {lg.error_msg}")
except Exception as e:
    print(f"错误: {e}")
    import traceback
    traceback.print_exc()

# 3. 检查 akshare
print("\n3. AkShare (stock_zh_a_hist, period='monthly'):")
print("-"*60)
if AKSHARE_AVAILABLE:
    try:
        df = ak.stock_zh_a_hist(symbol=code, period="monthly", start_date=start_date, end_date=end_date, adjust="qfq")
        if df is not None and not df.empty:
            print(f"返回的列: {list(df.columns)}")
            # 检查是否有涨跌幅相关的列
            pct_cols = [col for col in df.columns if '涨' in str(col) or '跌' in str(col) or 'pct' in str(col).lower() or 'chg' in str(col).lower()]
            print(f"是否有涨跌幅相关字段: {len(pct_cols) > 0}")
            if pct_cols:
                print(f"涨跌幅相关字段: {pct_cols}")
                for col in pct_cols:
                    print(f"  {col}示例值: {df[col].head(3).tolist()}")
            print(f"\n前3行数据:")
            print(df.head(3).to_string())
        else:
            print("未获取到数据")
    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()
else:
    print("akshare未安装")

print("\n" + "="*80)
print("总结")
print("="*80)
print("检查各数据源是否直接提供了月K线的涨跌幅字段")

