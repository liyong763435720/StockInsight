# -*- coding: utf-8 -*-
"""验证603248在2025年12月的数据准确性"""
import sys
import pandas as pd
from datetime import datetime
from app.config import Config
from app.data_fetcher import DataFetcher

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def get_data_from_source(data_source: str, ts_code: str, year: int, month: int):
    """从指定数据源获取指定年月的月K线数据"""
    try:
        config = Config()
        config.set('data_source', data_source)
        fetcher = DataFetcher(config)
        
        # 构建日期范围（包含上一个月，以便正确计算涨跌幅）
        if month == 1:
            prev_year = year - 1
            prev_month = 12
        else:
            prev_year = year
            prev_month = month - 1
        
        start_date = f"{prev_year}{prev_month:02d}01"  # 从上个月开始
        end_date = f"{year}{month:02d}31"  # 到本月31日
        
        print(f"  日期范围: {start_date} - {end_date}")
        df = fetcher.get_monthly_kline(ts_code, start_date, end_date)
        
        if df.empty:
            return None
        
        # 筛选指定年月的记录
        match = df[(df['year'] == year) & (df['month'] == month)]
        if not match.empty:
            return match.iloc[0].to_dict()
        else:
            return None
    except Exception as e:
        print(f"  [错误] {data_source}获取失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def main():
    ts_code = "603248.SH"  # 需要确认股票代码格式
    stock_name = "603248"
    year = 2025
    month = 12
    
    # 预期数据
    expected_pct = -22.78
    
    print("="*80)
    print(f"验证股票: {stock_name} ({ts_code})")
    print(f"验证月份: {year}年{month}月")
    print(f"预期涨跌幅: {expected_pct:.2f}%")
    print("="*80)
    
    sources = ['akshare', 'tushare', 'baostock']
    all_results = {}
    
    for source in sources:
        print(f"\n正在从 {source} 获取数据...")
        result = get_data_from_source(source, ts_code, year, month)
        if result:
            all_results[source] = result
            pct = result.get('pct_chg')
            if pd.notna(pct):
                print(f"  [成功] 交易日期: {result.get('trade_date', 'N/A')}, "
                      f"开盘: {result.get('open', 0):.2f}, "
                      f"收盘: {result.get('close', 0):.2f}, "
                      f"涨跌幅: {pct:.2f}%")
            else:
                print(f"  [部分成功] 交易日期: {result.get('trade_date', 'N/A')}, "
                      f"开盘: {result.get('open', 0):.2f}, "
                      f"收盘: {result.get('close', 0):.2f}, "
                      f"涨跌幅: N/A")
        else:
            print(f"  [失败] 未获取到数据")
    
    if not all_results:
        print("\n所有数据源都获取失败")
        return
    
    # 对比分析
    print("\n" + "="*80)
    print("数据对比分析")
    print("="*80)
    
    print(f"\n{year}年{month}月数据对比:")
    print(f"预期涨跌幅: {expected_pct:.2f}%")
    print(f"\n{'数据源':<12} | {'交易日期':<12} | {'开盘':<10} | {'收盘':<10} | {'涨跌幅':<12} | {'与预期差异':<12} | {'状态':<6}")
    print("-"*90)
    
    for source in sources:
        if source in all_results:
            data = all_results[source]
            trade_date = data.get('trade_date', 'N/A')
            open_price = f"{data.get('open', 0):.2f}" if pd.notna(data.get('open')) else "N/A"
            close_price = f"{data.get('close', 0):.2f}" if pd.notna(data.get('close')) else "N/A"
            pct_chg = data.get('pct_chg')
            if pd.notna(pct_chg):
                pct_str = f"{pct_chg:.2f}%"
                diff = abs(pct_chg - expected_pct)
                diff_str = f"{diff:.2f}%"
                if diff < 0.1:
                    status = "✓ 完全匹配"
                elif diff < 0.5:
                    status = "✓ 非常接近"
                else:
                    status = "✗ 有差异"
            else:
                pct_str = "N/A"
                diff_str = "N/A"
                status = "? 无法判断"
            print(f"{source:<12} | {trade_date:<12} | {open_price:<10} | {close_price:<10} | {pct_str:<12} | {diff_str:<12} | {status}")
        else:
            print(f"{source:<12} | {'N/A':<12} | {'N/A':<10} | {'N/A':<10} | {'N/A':<12} | {'N/A':<12} | {'失败'}")
    
    # 判断最准确的数据源
    print(f"\n" + "="*80)
    print("准确性判断")
    print("="*80)
    
    source_diffs = {}
    for source in sources:
        if source in all_results:
            pct_chg = all_results[source].get('pct_chg')
            if pd.notna(pct_chg):
                diff = abs(pct_chg - expected_pct)
                source_diffs[source] = diff
    
    if source_diffs:
        best_source = min(source_diffs, key=source_diffs.get)
        min_diff = source_diffs[best_source]
        
        print(f"\n各数据源与预期差异:")
        for source, diff in sorted(source_diffs.items(), key=lambda x: x[1]):
            status = "✓ 最准确" if source == best_source else ""
            print(f"  {source:12s}: {diff:7.2f}%  {status}")
        
        print(f"\n最准确的数据源: {best_source} (差异: {min_diff:.2f}%)")
        if min_diff < 0.1:
            print(f"  ✓ {best_source} 的数据与预期完全匹配！")
        elif min_diff < 0.5:
            print(f"  ✓ {best_source} 的数据非常接近预期")
        else:
            print(f"  ⚠ {best_source} 的数据与预期有差异，建议进一步验证")
    else:
        print("\n所有数据源的涨跌幅都是N/A，无法判断准确性")

if __name__ == "__main__":
    main()

