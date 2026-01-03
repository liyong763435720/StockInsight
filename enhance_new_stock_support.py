# -*- coding: utf-8 -*-
"""增强新股支持的代码改进示例"""
import sys
import pandas as pd
from typing import Optional
from app.config import Config
from app.database import Database

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

class EnhancedDataFetcher:
    """增强版数据获取器，专门优化新股支持"""
    
    def __init__(self, config: Config):
        self.config = config
        self.data_source = config.get('data_source', 'tushare')
        self.db = Database()
        self._init_data_source()
    
    def _init_data_source(self):
        """初始化数据源"""
        if self.data_source == 'tushare':
            token = self.config.get('tushare.token', '')
            if token:
                import tushare as ts
                ts.set_token(token)
                self.pro = ts.pro_api()
    
    def get_list_date(self, ts_code: str) -> Optional[str]:
        """获取股票上市日期，优先从数据库，其次从数据源"""
        # 1. 从数据库获取
        code = ts_code.replace('.SZ', '').replace('.SH', '')
        stock = self.db.get_stock_by_code(code)
        if stock and stock.get('list_date'):
            return stock['list_date']
        
        # 2. 从tushare获取（如果配置了token）
        if hasattr(self, 'pro') and self.pro:
            try:
                df = self.pro.stock_basic(ts_code=ts_code, fields='list_date')
                if not df.empty and pd.notna(df.iloc[0]['list_date']):
                    list_date = str(df.iloc[0]['list_date'])
                    if len(list_date) == 8:
                        # 更新数据库中的上市日期
                        try:
                            self.db.update_stock_list_date(code, list_date)
                        except:
                            pass
                        return list_date
            except Exception as e:
                print(f"从tushare获取上市日期失败 {ts_code}: {e}")
        
        return None
    
    def is_new_stock_month(self, ts_code: str, year: int, month: int) -> bool:
        """判断是否为新股上市当月"""
        list_date = self.get_list_date(ts_code)
        if not list_date or len(list_date) != 8:
            return False
        
        list_year = int(list_date[:4])
        list_month = int(list_date[4:6])
        
        return list_year == year and list_month == month
    
    def calculate_pct_chg_enhanced(self, df: pd.DataFrame) -> pd.DataFrame:
        """增强版涨跌幅计算，专门处理新股"""
        if df.empty:
            return df
        
        df = df.sort_values('trade_date').copy()
        
        # 确保有pct_chg列
        if 'pct_chg' not in df.columns:
            df['pct_chg'] = pd.NA
        
        # 处理每一行
        for idx in df.index:
            year = df.loc[idx, 'year']
            month = df.loc[idx, 'month']
            ts_code = df.loc[idx, 'ts_code']
            
            # 检查是否为新股上市当月
            is_new_stock = self.is_new_stock_month(ts_code, year, month)
            
            if is_new_stock:
                # 新股上市当月：使用开盘价作为基准
                open_val = df.loc[idx, 'open']
                close_val = df.loc[idx, 'close']
                if pd.notna(open_val) and pd.notna(close_val) and open_val > 0:
                    df.loc[idx, 'pct_chg'] = (close_val - open_val) / open_val * 100
            else:
                # 非上市当月：尝试使用上月收盘价
                # 计算上月日期
                if month == 1:
                    prev_year = year - 1
                    prev_month = 12
                else:
                    prev_year = year
                    prev_month = month - 1
                
                # 查找上月数据
                prev_data = df[(df['year'] == prev_year) & (df['month'] == prev_month)]
                if not prev_data.empty:
                    prev_close = prev_data.iloc[0]['close']
                    current_close = df.loc[idx, 'close']
                    if pd.notna(prev_close) and pd.notna(current_close) and prev_close > 0:
                        df.loc[idx, 'pct_chg'] = (current_close - prev_close) / prev_close * 100
                else:
                    # 没有上月数据，使用开盘价作为基准
                    open_val = df.loc[idx, 'open']
                    close_val = df.loc[idx, 'close']
                    if pd.notna(open_val) and pd.notna(close_val) and open_val > 0:
                        df.loc[idx, 'pct_chg'] = (close_val - open_val) / open_val * 100
        
        return df

# 测试
if __name__ == "__main__":
    print("="*80)
    print("新股数据准确性保障方案 - 代码示例")
    print("="*80)
    
    config = Config()
    fetcher = EnhancedDataFetcher(config)
    
    # 测试603248
    ts_code = "603248.SH"
    list_date = fetcher.get_list_date(ts_code)
    print(f"\n股票: {ts_code}")
    print(f"上市日期: {list_date if list_date else '未找到'}")
    
    if list_date:
        list_year = int(list_date[:4])
        list_month = int(list_date[4:6])
        print(f"上市年月: {list_year}年{list_month}月")
        
        is_new = fetcher.is_new_stock_month(ts_code, 2025, 12)
        print(f"是否为2025年12月新股: {is_new}")

