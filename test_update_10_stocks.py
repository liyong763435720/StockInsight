# -*- coding: utf-8 -*-
"""
测试更新10只股票的数据，检查数据准确性
"""
import sys
import pandas as pd
from datetime import datetime
from app.database import Database
from app.config import Config
from app.data_updater import DataUpdater

# 设置UTF-8编码
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def progress_callback(current: int, total: int, message: str = ""):
    """进度回调函数"""
    print(f"[进度 {current}/{total}] {message}")

def main():
    print("="*60)
    print("测试更新10只股票数据")
    print("="*60)
    
    # 初始化
    db = Database()
    config = Config()
    updater = DataUpdater(db, config)
    updater.set_progress_callback(progress_callback)
    
    # 获取股票列表
    print("\n正在获取股票列表...")
    fetcher = updater.fetcher
    stocks_df = fetcher.get_stock_list()
    
    if stocks_df.empty:
        print("错误: 无法获取股票列表")
        return
    
    print(f"获取到 {len(stocks_df)} 只股票")
    
    # 只取前10只股票
    test_stocks = stocks_df.head(10)
    print(f"\n将更新以下10只股票:")
    for idx, row in test_stocks.iterrows():
        print(f"  {idx+1}. {row.get('name', 'N/A')} ({row['ts_code']})")
    
    # 手动更新这10只股票
    print(f"\n开始更新数据...")
    print(f"数据源: {config.get('data_source', 'akshare')}")
    print("-"*60)
    
    current_year = datetime.now().year
    start_year = 2000
    processed = 0
    
    for idx, row in test_stocks.iterrows():
        ts_code = row['ts_code']
        stock_name = row.get('name', 'N/A')
        
        # 确定起始日期
        list_date = row.get('list_date', '')
        if list_date and len(list_date) == 8:
            start_date = max(list_date, f"{start_year}0101")
        else:
            start_date = f"{start_year}0101"
        
        end_date = datetime.now().strftime('%Y%m%d')
        
        print(f"\n[{processed+1}/10] 正在更新: {stock_name} ({ts_code})")
        print(f"  日期范围: {start_date} - {end_date}")
        
        try:
            # 获取数据
            kline_df = fetcher.get_monthly_kline(ts_code, start_date, end_date)
            
            if kline_df.empty:
                print(f"  [警告] 未获取到数据")
                processed += 1
                continue
            
            # 计算涨跌幅（如果需要）
            kline_df = fetcher.calculate_pct_chg(kline_df)
            
            # 保存数据
            data_source = config.get('data_source', 'akshare')
            db.save_monthly_kline(kline_df, data_source=data_source)
            
            # 显示数据统计
            print(f"  [成功] 获取到 {len(kline_df)} 条月K线数据")
            print(f"  日期范围: {kline_df['trade_date'].min()} - {kline_df['trade_date'].max()}")
            print(f"  年份范围: {kline_df['year'].min()} - {kline_df['year'].max()}")
            
            # 显示前3条和后3条数据
            print(f"\n  前3条数据:")
            print(f"    {kline_df.head(3)[['trade_date', 'year', 'month', 'open', 'close', 'pct_chg']].to_string(index=False)}")
            print(f"\n  后3条数据:")
            print(f"    {kline_df.tail(3)[['trade_date', 'year', 'month', 'open', 'close', 'pct_chg']].to_string(index=False)}")
            
            # 检查数据质量
            print(f"\n  数据质量检查:")
            print(f"    ts_code字段: {'正常' if kline_df['ts_code'].notna().all() else '有NaN'}")
            print(f"    涨跌幅有效: {kline_df['pct_chg'].notna().sum()}/{len(kline_df)}")
            print(f"    价格数据有效: 开盘{kline_df['open'].notna().sum()}, 收盘{kline_df['close'].notna().sum()}")
            
            processed += 1
            
        except Exception as e:
            print(f"  [错误] 更新失败: {str(e)}")
            import traceback
            traceback.print_exc()
            processed += 1
            continue
    
    print("\n" + "="*60)
    print("更新完成!")
    print("="*60)
    
    # 查询数据库中的数据，验证准确性
    print("\n验证数据库中的数据...")
    print("-"*60)
    
    for idx, row in test_stocks.iterrows():
        ts_code = row['ts_code']
        stock_name = row.get('name', 'N/A')
        data_source = config.get('data_source', 'akshare')
        
        # 从数据库查询
        db_df = db.get_monthly_kline(ts_code=ts_code, data_source=data_source)
        
        if db_df.empty:
            print(f"{stock_name} ({ts_code}): 数据库中没有数据")
        else:
            print(f"\n{stock_name} ({ts_code}):")
            print(f"  数据库记录数: {len(db_df)}")
            print(f"  数据源: {data_source}")
            print(f"  最新数据: {db_df['trade_date'].max()}")
            print(f"  最早数据: {db_df['trade_date'].min()}")
            print(f"  最新3条数据:")
            # 将trade_date转换为字符串排序
            db_df_sorted = db_df.sort_values('trade_date', ascending=False)
            latest = db_df_sorted.head(3)
            for _, r in latest.iterrows():
                pct_chg_str = f"{r['pct_chg']:.2f}%" if pd.notna(r['pct_chg']) else "N/A"
                print(f"    {r['trade_date']} | {r['year']}年{r['month']}月 | 开盘:{r['open']:.2f} | 收盘:{r['close']:.2f} | 涨跌:{pct_chg_str}")

if __name__ == "__main__":
    main()

