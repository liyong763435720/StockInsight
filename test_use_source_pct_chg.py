# -*- coding: utf-8 -*-
"""测试使用数据源提供的涨跌幅字段"""
import sys
import pandas as pd
from app.config import Config
from app.data_fetcher import DataFetcher

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("="*80)
print("测试使用数据源提供的涨跌幅字段")
print("="*80)

# 测试股票
ts_code = "000001.SZ"  # 平安银行
start_date = "20240101"
end_date = "20240228"

sources = ['akshare', 'baostock']

for source in sources:
    print(f"\n{'='*60}")
    print(f"测试 {source} 数据源")
    print(f"{'='*60}")
    
    config = Config()
    config.set('data_source', source)
    fetcher = DataFetcher(config)
    
    df = fetcher.get_monthly_kline(ts_code, start_date, end_date)
    
    if df.empty:
        print("  未获取到数据")
        continue
    
    print(f"\n获取到的数据:")
    print(df[['trade_date', 'year', 'month', 'open', 'close', 'pct_chg']].to_string(index=False))
    
    # 检查涨跌幅是否合理
    if 'pct_chg' in df.columns:
        valid_pct = df[df['pct_chg'].notna()]['pct_chg']
        if len(valid_pct) > 0:
            print(f"\n涨跌幅统计:")
            print(f"  有效值数量: {len(valid_pct)}")
            print(f"  最小值: {valid_pct.min():.2f}%")
            print(f"  最大值: {valid_pct.max():.2f}%")
            print(f"  平均值: {valid_pct.mean():.2f}%")
            
            # 检查是否有异常值
            abnormal = valid_pct[valid_pct.abs() > 500]
            if len(abnormal) > 0:
                print(f"  ⚠ 发现异常值: {abnormal.tolist()}")
            else:
                print(f"  ✓ 所有涨跌幅值都在合理范围内")

print("\n" + "="*80)
print("测试完成")
print("="*80)

