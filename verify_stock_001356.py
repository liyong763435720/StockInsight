# -*- coding: utf-8 -*-
"""验证001356在2025年1月和2月的数据准确性"""
import sys
import pandas as pd
from datetime import datetime
from app.config import Config
from app.data_fetcher import DataFetcher

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def get_data_from_source(data_source: str, ts_code: str, year: int, months: list):
    """从指定数据源获取指定年月的月K线数据"""
    try:
        config = Config()
        config.set('data_source', data_source)
        fetcher = DataFetcher(config)
        
        # 构建日期范围（包含上一年12月，以便正确计算1月的涨跌幅）
        start_date = f"{year-1}1201"  # 从去年12月开始
        end_date = f"{year}0228"  # 到2月28日
        
        print(f"  日期范围: {start_date} - {end_date}")
        df = fetcher.get_monthly_kline(ts_code, start_date, end_date)
        
        if df.empty:
            return None
        
        # 筛选指定年月的记录
        results = {}
        for month in months:
            match = df[(df['year'] == year) & (df['month'] == month)]
            if not match.empty:
                results[month] = match.iloc[0].to_dict()
            else:
                results[month] = None
        
        return results
    except Exception as e:
        print(f"  [错误] {data_source}获取失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def main():
    ts_code = "001356.SZ"  # 需要确认股票名称
    stock_name = "001356"
    year = 2025
    months = [1, 2]
    
    # 预期数据
    expected = {
        1: -33.54,
        2: -3.73
    }
    
    print("="*80)
    print(f"验证股票: {stock_name} ({ts_code})")
    print(f"验证月份: {year}年1月和2月")
    print(f"预期涨跌幅: 1月 {expected[1]:.2f}%, 2月 {expected[2]:.2f}%")
    print("="*80)
    
    sources = ['akshare', 'tushare', 'baostock']
    all_results = {}
    
    for source in sources:
        print(f"\n正在从 {source} 获取数据...")
        results = get_data_from_source(source, ts_code, year, months)
        if results:
            all_results[source] = results
            for month in months:
                if results[month]:
                    data = results[month]
                    print(f"  [{month}月] 交易日期: {data.get('trade_date', 'N/A')}, "
                          f"开盘: {data.get('open', 0):.2f}, "
                          f"收盘: {data.get('close', 0):.2f}, "
                          f"涨跌幅: {data.get('pct_chg', 0):.2f}%" if pd.notna(data.get('pct_chg')) else f"涨跌幅: N/A")
        else:
            print(f"  [失败] 未获取到数据")
    
    if not all_results:
        print("\n所有数据源都获取失败")
        return
    
    # 对比分析
    print("\n" + "="*80)
    print("数据对比分析")
    print("="*80)
    
    for month in months:
        print(f"\n{year}年{month}月数据对比:")
        print(f"预期涨跌幅: {expected[month]:.2f}%")
        print(f"\n{'数据源':<12} | {'交易日期':<12} | {'开盘':<10} | {'收盘':<10} | {'涨跌幅':<12} | {'与预期差异':<12}")
        print("-"*80)
        
        for source in sources:
            if source in all_results and all_results[source][month]:
                data = all_results[source][month]
                trade_date = data.get('trade_date', 'N/A')
                open_price = f"{data.get('open', 0):.2f}" if pd.notna(data.get('open')) else "N/A"
                close_price = f"{data.get('close', 0):.2f}" if pd.notna(data.get('close')) else "N/A"
                pct_chg = data.get('pct_chg')
                if pd.notna(pct_chg):
                    pct_str = f"{pct_chg:.2f}%"
                    diff = abs(pct_chg - expected[month])
                    diff_str = f"{diff:.2f}%"
                    status = "✓" if diff < 0.1 else "✗"
                else:
                    pct_str = "N/A"
                    diff_str = "N/A"
                    status = "?"
                print(f"{source:<12} | {trade_date:<12} | {open_price:<10} | {close_price:<10} | {pct_str:<12} | {diff_str:<12} {status}")
            else:
                print(f"{source:<12} | {'N/A':<12} | {'N/A':<10} | {'N/A':<10} | {'N/A':<12} | {'N/A':<12}")
    
    # 判断最准确的数据源
    print(f"\n" + "="*80)
    print("准确性判断")
    print("="*80)
    
    source_scores = {}
    for source in sources:
        if source in all_results:
            total_diff = 0
            valid_count = 0
            for month in months:
                if all_results[source][month]:
                    pct_chg = all_results[source][month].get('pct_chg')
                    if pd.notna(pct_chg):
                        diff = abs(pct_chg - expected[month])
                        total_diff += diff
                        valid_count += 1
            if valid_count > 0:
                source_scores[source] = total_diff / valid_count
    
    if source_scores:
        best_source = min(source_scores, key=source_scores.get)
        min_diff = source_scores[best_source]
        
        print(f"\n各数据源平均差异:")
        for source, avg_diff in sorted(source_scores.items(), key=lambda x: x[1]):
            status = "✓ 最准确" if source == best_source else ""
            print(f"  {source:12s}: {avg_diff:7.2f}%  {status}")
        
        print(f"\n最准确的数据源: {best_source} (平均差异: {min_diff:.2f}%)")
        if min_diff < 0.1:
            print(f"  ✓ {best_source} 的数据与预期完全匹配！")
        elif min_diff < 0.5:
            print(f"  ✓ {best_source} 的数据非常接近预期")
        else:
            print(f"  ⚠ {best_source} 的数据与预期有差异，建议进一步验证")

if __name__ == "__main__":
    main()

