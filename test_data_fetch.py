"""
测试数据源获取月K线数据
"""
import sys
import pandas as pd
from datetime import datetime
from app.config import Config
from app.data_fetcher import DataFetcher

def test_data_source(data_source_name: str):
    """测试指定数据源获取月K线数据"""
    print(f"\n{'='*60}")
    print(f"测试数据源: {data_source_name}")
    print(f"{'='*60}")
    
    try:
        # 创建配置
        config = Config()
        config.set('data_source', data_source_name)
        
        # 创建数据获取器
        fetcher = DataFetcher(config)
        
        # 测试股票代码（平安银行）
        test_code = "000001.SZ"
        start_date = "20230101"
        end_date = "20231231"
        
        print(f"测试股票: {test_code}")
        print(f"日期范围: {start_date} - {end_date}")
        print(f"\n正在获取数据...")
        
        # 获取月K线数据
        df = fetcher.get_monthly_kline(test_code, start_date, end_date)
        
        if df is None or df.empty:
            print(f"[失败] 获取失败: 返回空数据")
            return False
        
        print(f"[成功] 获取成功!")
        print(f"数据条数: {len(df)}")
        print(f"\n数据列: {list(df.columns)}")
        print(f"\n前5条数据:")
        print(df.head().to_string())
        
        # 检查必要字段
        required_fields = ['ts_code', 'trade_date', 'year', 'month', 'open', 'close', 'high', 'low', 'vol', 'amount', 'pct_chg']
        missing_fields = [f for f in required_fields if f not in df.columns]
        if missing_fields:
            print(f"\n[警告] 缺少字段: {missing_fields}")
        else:
            print(f"\n[成功] 所有必要字段都存在")
        
        # 检查数据质量
        if 'pct_chg' in df.columns:
            valid_pct = df['pct_chg'].notna().sum()
            print(f"涨跌幅有效数据: {valid_pct}/{len(df)}")
        
        return True
        
    except Exception as e:
        print(f"[失败] 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """主测试函数"""
    print("="*60)
    print("数据源月K线获取测试")
    print("="*60)
    
    # 测试的数据源列表
    data_sources = ['akshare', 'baostock', 'tushare']
    
    results = {}
    
    for data_source in data_sources:
        try:
            result = test_data_source(data_source)
            results[data_source] = result
        except Exception as e:
            print(f"\n[失败] {data_source} 测试异常: {str(e)}")
            results[data_source] = False
        print("\n")
    
    # 汇总结果
    print("="*60)
    print("测试结果汇总")
    print("="*60)
    for data_source, result in results.items():
        status = "[通过]" if result else "[失败]"
        print(f"{data_source:15s}: {status}")

if __name__ == "__main__":
    main()

