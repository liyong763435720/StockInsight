# 新股涨跌幅计算修复总结

## 问题描述

对于新股（如001356），第一个月没有上个月的历史数据，导致涨跌幅无法正确计算：
- **akshare**: 显示 N/A（缺少12月数据）
- **tushare**: 显示错误的 178.87%（使用了错误的上月收盘价）
- **baostock**: 显示 N/A（缺少12月数据）

## 解决方案

### 1. 修改 `calculate_pct_chg` 方法

**位置**: `app/data_fetcher.py`

**改进**:
- 自动从数据库获取股票的上市日期（`list_date`）
- 对于新股第一个月（没有上月数据），使用当月开盘价作为基准计算涨跌幅
- 计算公式：`(月末收盘 - 月初开盘) / 月初开盘 * 100`
- 这样第一个月的涨跌幅就是相对于首日开盘价的涨跌幅

**代码逻辑**:
```python
# 处理新股第一个月的情况
if list_date and len(list_date) == 8:
    list_year = int(list_date[:4])
    list_month = int(list_date[4:6])
    
    # 找到第一个月的数据
    first_month_mask = (df['year'] == list_year) & (df['month'] == list_month)
    if first_month_mask.any():
        first_month_idx = df[first_month_mask].index[0]
        # 如果第一个月的涨跌幅是NaN，使用当月开盘价作为基准
        if pd.isna(df.loc[first_month_idx, 'pct_chg']):
            first_open = df.loc[first_month_idx, 'open']
            first_close = df.loc[first_month_idx, 'close']
            if pd.notna(first_open) and pd.notna(first_close) and first_open > 0:
                df.loc[first_month_idx, 'pct_chg'] = (first_close - first_open) / first_open * 100
```

### 2. 修复 tushare 异常涨跌幅

**位置**: `app/data_fetcher.py` - `_get_monthly_kline_tushare` 方法

**改进**:
- 检查 tushare 返回的 `pct_chg` 是否异常（绝对值超过500%）
- 如果异常，清除该值，让 `calculate_pct_chg` 重新计算

**代码逻辑**:
```python
# 如果tushare返回了pct_chg，检查其合理性
if 'pct_chg' in df.columns:
    df = df.copy()
    for idx in df.index:
        pct = df.loc[idx, 'pct_chg']
        if pd.notna(pct) and abs(pct) > 500:
            # 涨跌幅异常，清除它
            df.loc[idx, 'pct_chg'] = pd.NA
```

### 3. 修复 tushare 日线聚合逻辑

**位置**: `app/data_fetcher.py` - `_get_monthly_kline_tushare` 方法（日线聚合部分）

**改进**:
- 在计算涨跌幅时，检查计算出的值是否合理（绝对值不超过500%）
- 如果异常，不设置该值，让 `calculate_pct_chg` 处理

## 测试结果

### 001356 测试结果

**预期数据**:
- 1月: -33.54%
- 2月: -3.73%

**实际结果**:
- **akshare**: 
  - 1月: -33.54% ✓（完全匹配）
  - 2月: -3.73% ✓（完全匹配）
  
- **tushare**: 
  - 1月: 178.87% ✗（仍然错误，需要进一步检查）
  - 2月: -3.72% ✓（非常接近）
  
- **baostock**: 
  - 1月: N/A（但手动计算为 -33.48%，接近预期）
  - 2月: -3.72% ✓（非常接近）

## 待解决问题

1. **tushare 的 178.87% 问题**: 
   - 虽然已经添加了异常值检查，但 tushare 的 `pro_bar` 可能直接返回了错误的涨跌幅
   - 需要进一步检查 tushare 返回的数据结构，确保异常值检查生效
   - 或者，对于 tushare，直接使用日线聚合方式，避免使用 `pro_bar` 的月线数据

## 使用说明

修复后的代码会自动处理新股情况：
1. 如果股票有上市日期（`list_date`），会自动识别第一个月
2. 对于第一个月，如果没有上月数据，会使用当月开盘价作为基准
3. 对于其他月份，正常使用上月收盘价作为基准

## 注意事项

1. 新股第一个月的涨跌幅是相对于首日开盘价计算的，而不是相对于发行价
2. 如果数据源缺少某些月份的数据，也会使用当月开盘价作为基准
3. 异常涨跌幅（绝对值超过500%）会被自动清除并重新计算

