# -*- coding: utf-8 -*-
"""
对比不同数据源的数据准确性
"""
import sys
import pandas as pd
from datetime import datetime
from app.config import Config
from app.data_fetcher import DataFetcher

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def get_data_from_source(data_source: str, ts_code: str, start_date: str, end_date: str):
    """从指定数据源获取数据"""
    try:
        config = Config()
        config.set('data_source', data_source)
        fetcher = DataFetcher(config)
        df = fetcher.get_monthly_kline(ts_code, start_date, end_date)
        return df
    except Exception as e:
        print(f"  [错误] {data_source}获取失败: {str(e)}")
        return pd.DataFrame()

def compare_sources(ts_code: str, stock_name: str, start_date: str = "20230101", end_date: str = "20231231"):
    """对比不同数据源的数据"""
    print("="*80)
    print(f"对比数据源: {stock_name} ({ts_code})")
    print(f"日期范围: {start_date} - {end_date}")
    print("="*80)
    
    # 获取不同数据源的数据
    sources = ['akshare', 'tushare', 'baostock']
    data_dict = {}
    
    for source in sources:
        print(f"\n正在从 {source} 获取数据...")
        df = get_data_from_source(source, ts_code, start_date, end_date)
        if not df.empty:
            data_dict[source] = df
            print(f"  [成功] 获取到 {len(df)} 条数据")
        else:
            print(f"  [失败] 未获取到数据")
    
    if not data_dict:
        print("\n所有数据源都获取失败")
        return
    
    # 对比数据
    print("\n" + "="*80)
    print("数据对比分析")
    print("="*80)
    
    # 1. 数据量对比
    print("\n1. 数据量对比:")
    for source, df in data_dict.items():
        print(f"   {source:12s}: {len(df)} 条")
    
    # 2. 日期范围对比
    print("\n2. 日期范围对比:")
    for source, df in data_dict.items():
        if not df.empty:
            print(f"   {source:12s}: {df['trade_date'].min()} 至 {df['trade_date'].max()}")
    
    # 3. 合并数据对比（按日期）
    print("\n3. 按日期对比数据:")
    print("-"*80)
    
    # 获取所有日期
    all_dates = set()
    for df in data_dict.values():
        all_dates.update(df['trade_date'].tolist())
    all_dates = sorted(list(all_dates))
    
    # 创建对比表
    comparison_data = []
    for date in all_dates[-12:]:  # 只显示最近12个月
        row = {'trade_date': date}
        for source in sources:
            if source in data_dict:
                df = data_dict[source]
                match = df[df['trade_date'] == date]
                if not match.empty:
                    r = match.iloc[0]
                    row[f'{source}_open'] = r['open']
                    row[f'{source}_close'] = r['close']
                    row[f'{source}_pct_chg'] = r['pct_chg'] if pd.notna(r['pct_chg']) else None
                else:
                    row[f'{source}_open'] = None
                    row[f'{source}_close'] = None
                    row[f'{source}_pct_chg'] = None
            else:
                row[f'{source}_open'] = None
                row[f'{source}_close'] = None
                row[f'{source}_pct_chg'] = None
        comparison_data.append(row)
    
    comparison_df = pd.DataFrame(comparison_data)
    
    # 显示对比表
    print("\n最近12个月数据对比:")
    print(f"{'日期':<12} | {'akshare':<25} | {'tushare':<25} | {'baostock':<25}")
    print(f"{'':12} | {'开盘':<8} {'收盘':<8} {'涨跌%':<8} | {'开盘':<8} {'收盘':<8} {'涨跌%':<8} | {'开盘':<8} {'收盘':<8} {'涨跌%':<8}")
    print("-"*80)
    
    for _, row in comparison_df.iterrows():
        date = row['trade_date']
        ak_open = f"{row['akshare_open']:.2f}" if pd.notna(row.get('akshare_open')) else "N/A"
        ak_close = f"{row['akshare_close']:.2f}" if pd.notna(row.get('akshare_close')) else "N/A"
        ak_pct = f"{row['akshare_pct_chg']:.2f}" if pd.notna(row.get('akshare_pct_chg')) else "N/A"
        
        ts_open = f"{row['tushare_open']:.2f}" if pd.notna(row.get('tushare_open')) else "N/A"
        ts_close = f"{row['tushare_close']:.2f}" if pd.notna(row.get('tushare_close')) else "N/A"
        ts_pct = f"{row['tushare_pct_chg']:.2f}" if pd.notna(row.get('tushare_pct_chg')) else "N/A"
        
        bs_open = f"{row['baostock_open']:.2f}" if pd.notna(row.get('baostock_open')) else "N/A"
        bs_close = f"{row['baostock_close']:.2f}" if pd.notna(row.get('baostock_close')) else "N/A"
        bs_pct = f"{row['baostock_pct_chg']:.2f}" if pd.notna(row.get('baostock_pct_chg')) else "N/A"
        
        print(f"{date:<12} | {ak_open:<8} {ak_close:<8} {ak_pct:<8} | {ts_open:<8} {ts_close:<8} {ts_pct:<8} | {bs_open:<8} {bs_close:<8} {bs_pct:<8}")
    
    # 4. 数据差异分析
    print("\n4. 数据差异分析:")
    print("-"*80)
    
    # 找出有数据的日期交集
    common_dates = None
    for source, df in data_dict.items():
        if common_dates is None:
            common_dates = set(df['trade_date'].tolist())
        else:
            common_dates = common_dates.intersection(set(df['trade_date'].tolist()))
    
    if common_dates and len(common_dates) > 0:
        print(f"\n共同日期数量: {len(common_dates)}")
        
        # 对比价格差异
        differences = []
        for date in sorted(list(common_dates))[-12:]:  # 最近12个月
            closes = {}
            for source in sources:
                if source in data_dict:
                    df = data_dict[source]
                    match = df[df['trade_date'] == date]
                    if not match.empty:
                        closes[source] = match.iloc[0]['close']
            
            if len(closes) >= 2:
                values = list(closes.values())
                max_val = max(values)
                min_val = min(values)
                diff_pct = ((max_val - min_val) / min_val * 100) if min_val > 0 else 0
                differences.append({
                    'date': date,
                    'diff_pct': diff_pct,
                    'closes': closes
                })
        
        if differences:
            print("\n收盘价差异（最近12个月）:")
            for diff in differences:
                closes_str = ", ".join([f"{k}:{v:.2f}" for k, v in diff['closes'].items()])
                print(f"  {diff['date']}: 差异 {diff['diff_pct']:.2f}% ({closes_str})")
            
            avg_diff = sum(d['diff_pct'] for d in differences) / len(differences)
            max_diff = max(d['diff_pct'] for d in differences)
            print(f"\n  平均差异: {avg_diff:.2f}%")
            print(f"  最大差异: {max_diff:.2f}%")
    
    # 5. 负价格检查
    print("\n5. 负价格数据检查:")
    print("-"*80)
    for source, df in data_dict.items():
        negative = df[(df['open'] < 0) | (df['close'] < 0)]
        if not negative.empty:
            print(f"  {source:12s}: 发现 {len(negative)} 条负价格数据")
            print(f"    日期范围: {negative['trade_date'].min()} 至 {negative['trade_date'].max()}")
        else:
            print(f"  {source:12s}: 无负价格数据")

def main():
    """主函数"""
    print("="*80)
    print("不同数据源数据对比测试")
    print("="*80)
    
    # 测试股票列表
    test_stocks = [
        ('000001.SZ', '平安银行'),
        ('000002.SZ', '万科A'),
    ]
    
    # 对比2023年的数据
    start_date = "20230101"
    end_date = "20231231"
    
    for ts_code, stock_name in test_stocks:
        compare_sources(ts_code, stock_name, start_date, end_date)
        print("\n\n")

if __name__ == "__main__":
    main()

