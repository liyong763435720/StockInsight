# -*- coding: utf-8 -*-
"""验证已更新的数据"""
import sys
import pandas as pd
from app.database import Database

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db = Database()

# 测试的10只股票
test_stocks = [
    ('000001.SZ', '平安银行'),
    ('000002.SZ', '万科A'),
    ('000004.SZ', 'ST国华'),
    ('000006.SZ', '深振业A'),
    ('000007.SZ', '全新好'),
    ('000008.SZ', '神州高铁'),
    ('000009.SZ', '中国宝安'),
    ('000010.SZ', '美丽生态'),
    ('000011.SZ', '深物业A'),
    ('000012.SZ', '南玻A'),
]

print("="*80)
print("数据验证报告")
print("="*80)

for ts_code, name in test_stocks:
    print(f"\n{name} ({ts_code}):")
    print("-"*80)
    
    df = db.get_monthly_kline(ts_code=ts_code, data_source='akshare')
    
    if df.empty:
        print("  数据库中没有数据")
        continue
    
    print(f"  总记录数: {len(df)}")
    print(f"  数据范围: {df['trade_date'].min()} 至 {df['trade_date'].max()}")
    print(f"  年份范围: {df['year'].min()} 至 {df['year'].max()}")
    
    # 检查数据质量
    print(f"\n  数据质量:")
    print(f"    ts_code字段完整: {df['ts_code'].notna().all()}")
    print(f"    价格数据完整: 开盘{df['open'].notna().sum()}/{len(df)}, 收盘{df['close'].notna().sum()}/{len(df)}")
    print(f"    涨跌幅完整: {df['pct_chg'].notna().sum()}/{len(df)}")
    
    # 检查异常值
    negative_prices = df[(df['open'] < 0) | (df['close'] < 0)]
    if not negative_prices.empty:
        print(f"    [警告] 发现负价格数据: {len(negative_prices)}条")
        print(f"    负价格记录示例:")
        for idx, row in negative_prices.head(3).iterrows():
            print(f"      {row['trade_date']}: 开盘{row['open']:.2f}, 收盘{row['close']:.2f}")
    
    # 显示最新5条数据
    df_sorted = df.sort_values('trade_date', ascending=False)
    latest = df_sorted.head(5)
    print(f"\n  最新5条数据:")
    for idx, row in latest.iterrows():
        pct = f"{row['pct_chg']:.2f}%" if pd.notna(row['pct_chg']) else "N/A"
        print(f"    {row['trade_date']} | {row['year']}年{row['month']}月 | 开盘:{row['open']:.2f} | 收盘:{row['close']:.2f} | 涨跌:{pct}")
    
    # 显示最早5条数据
    earliest = df_sorted.tail(5)
    print(f"\n  最早5条数据:")
    for idx, row in earliest.iterrows():
        pct = f"{row['pct_chg']:.2f}%" if pd.notna(row['pct_chg']) else "N/A"
        print(f"    {row['trade_date']} | {row['year']}年{row['month']}月 | 开盘:{row['open']:.2f} | 收盘:{row['close']:.2f} | 涨跌:{pct}")

print("\n" + "="*80)
print("验证完成")
print("="*80)

