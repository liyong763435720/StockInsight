# -*- coding: utf-8 -*-
"""验证002839在2025年11月的数据准确性"""
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
        
        # 构建日期范围（包含上个月，以便正确计算涨跌幅）
        # 起始日期：上个月的第一天
        if month == 1:
            prev_month = 12
            prev_year = year - 1
        else:
            prev_month = month - 1
            prev_year = year
        start_date = f"{prev_year}{prev_month:02d}01"
        
        # 结束日期：该月最后一天
        if month == 12:
            end_date = f"{year}{month:02d}31"
        else:
            # 下个月的第一天减1天
            next_month = month + 1
            next_year = year
            from datetime import datetime, timedelta
            next_month_first = datetime(next_year, next_month, 1)
            last_day = (next_month_first - timedelta(days=1)).day
            end_date = f"{year}{month:02d}{last_day:02d}"
        
        print(f"  日期范围: {start_date} - {end_date}")
        df = fetcher.get_monthly_kline(ts_code, start_date, end_date)
        
        if df.empty:
            return None
        
        # 筛选指定年月的记录
        match = df[(df['year'] == year) & (df['month'] == month)]
        if match.empty:
            return None
        
        return match.iloc[0].to_dict()
    except Exception as e:
        print(f"  [错误] {data_source}获取失败: {str(e)}")
        return None

def main():
    ts_code = "002839.SZ"  # 张家港行
    stock_name = "张家港行"
    year = 2025
    month = 11
    
    print("="*80)
    print(f"验证股票: {stock_name} ({ts_code})")
    print(f"验证月份: {year}年{month}月")
    print(f"预期涨跌幅: +2.25%")
    print("="*80)
    
    sources = ['akshare', 'tushare', 'baostock']
    results = {}
    
    for source in sources:
        print(f"\n正在从 {source} 获取数据...")
        data = get_data_from_source(source, ts_code, year, month)
        if data:
            results[source] = data
            print(f"  [成功] 获取到数据")
            print(f"  交易日期: {data.get('trade_date', 'N/A')}")
            print(f"  开盘: {data.get('open', 'N/A'):.2f}" if pd.notna(data.get('open')) else f"  开盘: N/A")
            print(f"  收盘: {data.get('close', 'N/A'):.2f}" if pd.notna(data.get('close')) else f"  收盘: N/A")
            print(f"  涨跌幅: {data.get('pct_chg', 'N/A'):.2f}%" if pd.notna(data.get('pct_chg')) else f"  涨跌幅: N/A")
        else:
            print(f"  [失败] 未获取到数据")
    
    if not results:
        print("\n所有数据源都获取失败")
        return
    
    # 对比分析
    print("\n" + "="*80)
    print("数据对比分析")
    print("="*80)
    
    print(f"\n预期涨跌幅: +2.25%")
    print(f"\n各数据源涨跌幅:")
    for source, data in results.items():
        pct_chg = data.get('pct_chg')
        if pd.notna(pct_chg):
            diff = abs(pct_chg - 2.25)
            status = "✓ 匹配" if diff < 0.1 else f"✗ 差异 {diff:.2f}%"
            print(f"  {source:12s}: {pct_chg:7.2f}%  {status}")
        else:
            print(f"  {source:12s}: N/A")
    
    # 详细对比表
    print(f"\n详细数据对比:")
    print(f"{'数据源':<12} | {'交易日期':<12} | {'开盘':<10} | {'收盘':<10} | {'涨跌幅':<10} | {'与预期差异':<12}")
    print("-"*80)
    for source, data in results.items():
        trade_date = data.get('trade_date', 'N/A')
        open_price = f"{data.get('open', 0):.2f}" if pd.notna(data.get('open')) else "N/A"
        close_price = f"{data.get('close', 0):.2f}" if pd.notna(data.get('close')) else "N/A"
        pct_chg = data.get('pct_chg')
        if pd.notna(pct_chg):
            pct_str = f"{pct_chg:.2f}%"
            diff = abs(pct_chg - 2.25)
            diff_str = f"{diff:.2f}%"
        else:
            pct_str = "N/A"
            diff_str = "N/A"
        print(f"{source:<12} | {trade_date:<12} | {open_price:<10} | {close_price:<10} | {pct_str:<10} | {diff_str:<12}")
    
    # 判断最准确的数据源
    print(f"\n准确性判断:")
    best_source = None
    min_diff = float('inf')
    
    for source, data in results.items():
        pct_chg = data.get('pct_chg')
        if pd.notna(pct_chg):
            diff = abs(pct_chg - 2.25)
            if diff < min_diff:
                min_diff = diff
                best_source = source
    
    if best_source:
        print(f"  最接近预期的数据源: {best_source} (差异: {min_diff:.2f}%)")
        if min_diff < 0.1:
            print(f"  ✓ {best_source} 的数据与预期完全匹配！")
        elif min_diff < 0.5:
            print(f"  ✓ {best_source} 的数据非常接近预期")
        else:
            print(f"  ⚠ {best_source} 的数据与预期有较大差异，建议进一步验证")

if __name__ == "__main__":
    main()

