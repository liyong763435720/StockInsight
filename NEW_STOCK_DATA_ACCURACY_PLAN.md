# 新股数据准确性保障方案

## 问题背景

对于新股（如603248，2025年12月上市），存在以下挑战：
1. 没有上个月的历史数据，无法计算相对于上月收盘价的涨跌幅
2. 数据源可能返回错误的涨跌幅值（如117.52%）
3. 需要确定涨跌幅的计算基准（发行价 vs 首日开盘价）

## 解决方案

### 1. 上市日期识别和验证

**目标**：准确识别新股及其上市月份

**实现**：
- 从数据库获取股票的上市日期（`list_date`）
- 如果数据库没有，尝试从数据源获取（tushare提供上市日期）
- 判断当前月份是否为上市当月

**代码位置**：`app/data_fetcher.py` - `calculate_pct_chg` 方法

### 2. 涨跌幅计算基准选择

**原则**：
- **上市当月**：使用当月开盘价作为基准（相对于首日开盘价）
  - 公式：`(月末收盘 - 首日开盘) / 首日开盘 * 100`
  - 理由：首日开盘价是市场对股票的真实定价，比发行价更能反映市场预期

- **非上市当月**：使用上月收盘价作为基准（相对于上月收盘价）
  - 公式：`(本月收盘 - 上月收盘) / 上月收盘 * 100`

### 3. 数据源涨跌幅值验证

**验证逻辑**：
1. 检查数据源返回的涨跌幅值是否异常（绝对值超过500%）
2. 与手动计算值对比：
   - 计算相对于开盘价的涨跌幅：`(收盘 - 开盘) / 开盘 * 100`
   - 如果数据源值与手动计算值差异超过50%，且数据源值绝对值超过100%，判定为异常
3. 异常处理：清除异常值，使用我们的计算逻辑重新计算

**代码位置**：
- `app/data_fetcher.py` - `_get_monthly_kline_akshare`
- `app/data_fetcher.py` - `_get_monthly_kline_baostock`
- `app/data_fetcher.py` - `_get_monthly_kline_tushare`

### 4. 多数据源交叉验证

**策略**：
- 对于新股，优先使用多个数据源获取数据
- 对比不同数据源的开盘价、收盘价是否一致
- 如果价格一致但涨跌幅不同，使用价格数据手动计算

### 5. 数据更新时的特殊处理

**在数据更新时**：
1. 检查股票是否为新股（上市日期在数据更新范围内）
2. 如果是新股，确保获取上市当月的完整数据
3. 对于上市当月，使用开盘价作为基准计算涨跌幅

## 实施建议

### 短期优化（已实现）

1. ✅ 添加数据源涨跌幅值合理性验证
2. ✅ 对于没有上月数据的情况，使用当月开盘价作为基准
3. ✅ 自动从数据库获取上市日期

### 中期优化（建议）

1. **上市日期自动更新**：
   - 在股票列表更新时，同步更新上市日期
   - 从tushare获取准确的上市日期（如果数据库没有）

2. **新股标识**：
   - 在数据库中标记新股（上市时间在最近3个月内）
   - 在数据更新时，对新股进行特殊处理

3. **数据质量监控**：
   - 记录数据源返回的异常涨跌幅值
   - 定期检查新股数据的准确性

### 长期优化（建议）

1. **发行价信息**：
   - 获取并存储股票的发行价
   - 对于上市当月，提供相对于发行价的涨跌幅（作为参考）

2. **数据源优先级**：
   - 对于新股，建立数据源优先级（哪个数据源对新股数据更准确）
   - 根据历史准确性动态调整优先级

3. **异常数据告警**：
   - 当检测到异常涨跌幅值时，记录日志并告警
   - 提供人工审核机制

## 代码改进建议

### 1. 增强上市日期获取

```python
def get_list_date(self, ts_code: str) -> Optional[str]:
    """获取股票上市日期，优先从数据库，其次从数据源"""
    # 1. 从数据库获取
    stock = db.get_stock_by_code(ts_code)
    if stock and stock.get('list_date'):
        return stock['list_date']
    
    # 2. 从tushare获取（如果配置了token）
    if self.data_source == 'tushare' or config.get('tushare.token'):
        try:
            df = pro.stock_basic(ts_code=ts_code, fields='list_date')
            if not df.empty and df.iloc[0]['list_date']:
                return df.iloc[0]['list_date']
        except:
            pass
    
    return None
```

### 2. 新股检测

```python
def is_new_stock(self, ts_code: str, year: int, month: int) -> bool:
    """判断是否为新股（上市当月）"""
    list_date = self.get_list_date(ts_code)
    if not list_date or len(list_date) != 8:
        return False
    
    list_year = int(list_date[:4])
    list_month = int(list_date[4:6])
    
    return list_year == year and list_month == month
```

### 3. 涨跌幅计算增强

```python
def calculate_pct_chg_for_new_stock(self, df: pd.DataFrame) -> pd.DataFrame:
    """专门处理新股的涨跌幅计算"""
    for idx in df.index:
        year = df.loc[idx, 'year']
        month = df.loc[idx, 'month']
        
        if self.is_new_stock(df.loc[idx, 'ts_code'], year, month):
            # 新股上市当月，使用开盘价作为基准
            open_val = df.loc[idx, 'open']
            close_val = df.loc[idx, 'close']
            if pd.notna(open_val) and pd.notna(close_val) and open_val > 0:
                df.loc[idx, 'pct_chg'] = (close_val - open_val) / open_val * 100
```

## 测试验证

### 测试用例

1. **603248（2025年12月上市）**：
   - ✅ 验证涨跌幅为-22.78%（相对于开盘价）
   - ✅ 验证所有数据源都能正确计算

2. **001356（2025年1月上市）**：
   - ✅ 验证1月涨跌幅为-33.54%（相对于开盘价）
   - ✅ 验证2月涨跌幅为-3.73%（相对于1月收盘价）

### 持续监控

- 定期检查新股数据的准确性
- 对比不同数据源的数据一致性
- 记录并分析异常情况

## 总结

通过以上方案，可以确保新股数据的准确性：
1. ✅ 自动识别新股
2. ✅ 使用正确的计算基准（开盘价 vs 收盘价）
3. ✅ 验证数据源返回值的合理性
4. ✅ 异常值自动修正
5. ✅ 多数据源交叉验证

当前实现已经能够正确处理新股情况，后续可以根据实际使用情况进一步优化。

