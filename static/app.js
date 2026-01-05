// 全局变量
let updateProgressInterval = null;
let currentUser = null;

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    // 设置当前年份
    var currentYearElement = document.getElementById('current-year');
    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
    }
    
    // 设置所有结束年份字段为当前年份
    var currentYear = new Date().getFullYear();
    var endYearElements = [
        'stock-end-year',
        'stock-multi-end-year',
        'filter-end-year',
        'industry-end-year',
        'compare-year'
    ];
    for (var i = 0; i < endYearElements.length; i++) {
        var element = document.getElementById(endYearElements[i]);
        if (element) {
            element.value = currentYear;
        }
    }
    
    checkLoginStatus();
});

// 显示标签页
function showTab(tabName, eventElement) {
    // 隐藏所有标签页
    var allTabs = document.querySelectorAll('.tab-content');
    for (var i = 0; i < allTabs.length; i++) {
        allTabs[i].style.display = 'none';
    }
    // 显示选中的标签页
    var targetTab = document.getElementById(tabName);
    if (targetTab) {
        targetTab.style.display = 'block';
    }
    
    // 更新导航栏活动状态
    var allLinks = document.querySelectorAll('.nav-link');
    for (var i = 0; i < allLinks.length; i++) {
        allLinks[i].classList.remove('active');
    }
    // 如果传入了事件元素，则激活它
    if (eventElement) {
        eventElement.classList.add('active');
    } else if (window.event && window.event.target) {
        window.event.target.classList.add('active');
    }
    
    // 如果切换到首页，加载公告并更新快速入口
    if (tabName === 'home') {
        loadAnnouncements();
        updateQuickAccessButtons();
    }
    
    // 如果切换到系统配置标签页，加载配置和数据状态
    if (tabName === 'config') {
        // 检查是否有管理员权限
        if (currentUser && currentUser.role === 'admin') {
            loadConfig();
            // 加载数据状态（如果有数据管理权限）
            if (currentUser.role === 'admin' || (currentUser.permissions && currentUser.permissions.includes('data_management'))) {
                loadDataStatus();
                checkAndShowProgress();
            }
            // 加载公告管理列表
            loadAnnouncementsManagement();
        }
    }
    
    // 如果切换到股票分析标签页，重新初始化自动完成功能
    if (tabName === 'stock-analysis') {
        // 延迟初始化，确保DOM已完全渲染
        setTimeout(function() {
            initStockAutocomplete();
            initStockAnalysisTypeToggle();
        }, 100);
    }
    
    // 如果切换到数据源对比标签页，重新初始化自动完成功能
    if (tabName === 'source-compare') {
        // 延迟初始化，确保DOM已完全渲染
        setTimeout(function() {
            initStockAutocomplete();
        }, 100);
    }
}

// 加载数据状态
async function loadDataStatus() {
    try {
        const response = await fetch('/api/data/status', {
            credentials: 'include'
        });
        const result = await response.json();
        if (result.success) {
            const data = result.data;
            let html = `
                <strong>股票总数:</strong> ${data.total_stocks || 0}<br>
                <strong>数据总量:</strong> ${(data.total_data_count || 0).toLocaleString()}<br>
                <strong>最新数据日期:</strong> ${data.latest_date || '无'}
            `;
            
            // 显示每个数据源的统计信息
            if (data.data_sources && data.data_sources.length > 0) {
                html += '<hr class="my-3"><h6 class="mt-3 mb-2">数据源统计</h6>';
                html += '<div class="table-responsive"><table class="table table-sm table-bordered table-hover">';
                html += '<thead class="table-light"><tr><th>数据源</th><th>数据量</th><th>股票数</th><th>最新日期</th></tr></thead><tbody>';
                
                data.data_sources.forEach(source => {
                    html += `<tr>
                        <td><span class="badge bg-info">${source.data_source}</span></td>
                        <td>${source.data_count.toLocaleString()}</td>
                        <td>${source.stock_count}</td>
                        <td>${source.latest_date || '无'}</td>
                    </tr>`;
                });
                
                html += '</tbody></table></div>';
            }
            
            document.getElementById('data-status').innerHTML = html;
        } else {
            // 如果请求失败，显示错误信息
            let errorMsg = result.message || '加载失败';
            if (errorMsg.includes('权限') || errorMsg.includes('permission')) {
                document.getElementById('data-status').innerHTML = '<div class="alert alert-warning">您没有数据管理权限</div>';
            } else {
                document.getElementById('data-status').innerHTML = `<div class="alert alert-danger">${errorMsg}</div>`;
            }
        }
    } catch (error) {
        console.error('Error loading data status:', error);
        document.getElementById('data-status').innerHTML = '<span class="text-danger">加载失败</span>';
    }
}

// 更新数据（需要数据管理权限）
async function updateData(type) {
    // 检查是否有数据管理权限（管理员或有data_management权限的用户）
    if (!currentUser || (currentUser.role !== 'admin' && (!currentUser.permissions || !currentUser.permissions.includes('data_management')))) {
        alert('需要数据管理权限');
        return;
    }
    try {
        // 如果是全量更新，获取更新模式
        let overwrite_mode = false;
        if (type === 'full') {
            const modeRadio = document.querySelector('input[name="fullUpdateMode"]:checked');
            if (modeRadio && modeRadio.value === 'overwrite') {
                overwrite_mode = true;
                // 确认覆盖模式
                if (!confirm('覆盖模式将删除当前数据源的所有数据，然后重新获取。\n\n此操作不可恢复，确定要继续吗？')) {
                    return;
                }
            }
        }
        
        const response = await fetch('/api/data/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                update_type: type,
                overwrite_mode: overwrite_mode
            })
        });
        const result = await response.json();
        
        if (result.success) {
            // 显示进度条
            document.getElementById('update-progress-container').style.display = 'block';
            // 开始轮询进度
            if (updateProgressInterval) {
                clearInterval(updateProgressInterval);
            }
            updateProgressInterval = setInterval(checkUpdateProgress, 1000);
            
            // 如果更新已在进行中，立即检查一次进度
            if (result.already_running) {
                checkUpdateProgress();
            }
        } else {
            alert(result.message || '更新失败');
        }
    } catch (error) {
        console.error('Error updating data:', error);
        alert('更新失败: ' + error.message);
    }
}

// 检查更新进度
async function checkUpdateProgress() {
    try {
        const response = await fetch('/api/data/progress', {
            credentials: 'include'
        });
        const result = await response.json();
        if (result.success) {
            const data = result.data;
            const progress = (data.current / data.total) * 100;
            document.getElementById('update-progress-bar').style.width = progress + '%';
            document.getElementById('update-progress-bar').setAttribute('aria-valuenow', progress);
            document.getElementById('update-progress-message').textContent = data.message;
            
            if (!data.is_running) {
                clearInterval(updateProgressInterval);
                updateProgressInterval = null;
                setTimeout(() => {
                    document.getElementById('update-progress-container').style.display = 'none';
                    loadDataStatus();
                }, 2000);
            }
        }
    } catch (error) {
        console.error('Error checking progress:', error);
    }
}

// 检查并显示进度（页面加载时调用）
async function checkAndShowProgress() {
    try {
        const response = await fetch('/api/data/progress');
        const result = await response.json();
        if (result.success) {
            const data = result.data;
            // 如果有正在进行的更新，显示进度条并开始轮询
            if (data.is_running) {
                document.getElementById('update-progress-container').style.display = 'block';
                const progress = (data.current / data.total) * 100;
                document.getElementById('update-progress-bar').style.width = progress + '%';
                document.getElementById('update-progress-bar').setAttribute('aria-valuenow', progress);
                document.getElementById('update-progress-message').textContent = data.message;
                
                // 开始轮询进度
                if (updateProgressInterval) {
                    clearInterval(updateProgressInterval);
                }
                updateProgressInterval = setInterval(checkUpdateProgress, 1000);
            }
        }
    } catch (error) {
        console.error('Error checking progress on load:', error);
    }
}

// 单只股票分析
async function analyzeStock() {
    const code = document.getElementById('stock-code').value.trim();
    const month = parseInt(document.getElementById('stock-month').value);
    const startYear = parseInt(document.getElementById('stock-start-year').value);
    const endYear = parseInt(document.getElementById('stock-end-year').value);
    const dataSource = document.getElementById('stock-data-source').value;
    
    if (!code) {
        alert('请输入股票代码');
        return;
    }
    
    const resultDiv = document.getElementById('stock-result');
    resultDiv.innerHTML = '<div class="loading">查询中...</div>';
    
    try {
        const requestBody = {
            code: code,
            month: month,
            start_year: startYear,
            end_year: endYear
        };
        if (dataSource) {
            requestBody.data_source = dataSource;
        }
        
        const response = await fetch('/api/stock/statistics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        if (result.success) {
            displayStockResult(result.data);
        } else {
            resultDiv.innerHTML = '<div class="alert alert-danger">查询失败: ' + (result.message || '未知错误') + '</div>';
        }
    } catch (error) {
        resultDiv.innerHTML = '<div class="alert alert-danger">查询失败: ' + error.message + '</div>';
    }
}

// 显示股票分析结果
function displayStockResult(data) {
    const resultDiv = document.getElementById('stock-result');
    
    if (data.total_count === 0) {
        resultDiv.innerHTML = '<div class="alert alert-warning">该股票在指定月份没有数据</div>';
        return;
    }
    
    // 获取数据源信息
    const dataSource = data.data_source || '未知';
    const dataSourceBadge = `<span class="badge bg-secondary ms-2">数据源: ${dataSource}</span>`;
    
    const html = `
        <h6>${data.name} (${data.symbol}) - ${data.month}月统计 ${dataSourceBadge}</h6>
        <div class="row">
            <div class="col-md-3">
                <div class="stat-card">
                    <div class="stat-label">总交易次数</div>
                    <div class="stat-value">${data.total_count}</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card">
                    <div class="stat-label">上涨次数</div>
                    <div class="stat-value">${data.up_count}</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card">
                    <div class="stat-label">下跌次数</div>
                    <div class="stat-value">${data.down_count}</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card">
                    <div class="stat-label">上涨概率</div>
                    <div class="stat-value">${data.up_probability}%</div>
                </div>
            </div>
        </div>
        <div class="row mt-3">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <h6>平均涨幅</h6>
                        <p class="text-success" style="font-size: 20px; font-weight: bold;">${data.avg_up_pct}%</p>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <h6>平均跌幅</h6>
                        <p class="text-danger" style="font-size: 20px; font-weight: bold;">${data.avg_down_pct}%</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="mt-3">
            <button class="btn btn-success" onclick="exportStockStatistics()">
                <i class="bi bi-file-earmark-excel"></i> 导出Excel
            </button>
        </div>
    `;
    
    resultDiv.innerHTML = html;
}

// 导出单只股票统计
async function exportStockStatistics() {
    const code = document.getElementById('stock-code').value.trim();
    const month = parseInt(document.getElementById('stock-month').value);
    const startYear = parseInt(document.getElementById('stock-start-year').value);
    const endYear = parseInt(document.getElementById('stock-end-year').value);
    const dataSource = document.getElementById('stock-data-source').value;
    
    if (!code) {
        alert('请输入股票代码');
        return;
    }
    
    try {
        const requestBody = {
            code: code,
            month: month,
            start_year: startYear,
            end_year: endYear
        };
        if (dataSource) {
            requestBody.data_source = dataSource;
        }
        
        console.log('开始导出，请求参数:', requestBody);
        const response = await fetch('/api/export/stock-statistics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('导出响应状态:', response.status, response.statusText);
        console.log('导出响应头:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const contentDisposition = response.headers.get('Content-Disposition') || '';
            let filename = '股票统计.xlsx';
            if (contentDisposition) {
                // 处理 filename*=UTF-8'' 格式
                const match = contentDisposition.match(/filename\*=UTF-8''(.+)/);
                if (match) {
                    filename = decodeURIComponent(match[1]);
                } else {
                    const match2 = contentDisposition.match(/filename="?([^"]+)"?/);
                    if (match2) {
                        filename = match2[1];
                    }
                }
            }
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            let errorMsg = '未知错误';
            try {
                const error = await response.json();
                errorMsg = error.detail || error.message || '未知错误';
            } catch (e) {
                errorMsg = `HTTP ${response.status}: ${response.statusText}`;
            }
            alert('导出失败: ' + errorMsg);
        }
    } catch (error) {
        alert('导出失败: ' + error.message);
    }
}

// 月份筛选统计
async function filterByMonth() {
    const month = parseInt(document.getElementById('filter-month').value);
    const startYear = parseInt(document.getElementById('filter-start-year').value);
    const endYear = parseInt(document.getElementById('filter-end-year').value);
    const topN = parseInt(document.getElementById('filter-top-n').value);
    const minCount = parseInt(document.getElementById('filter-min-count').value) || 0;
    const dataSource = document.getElementById('filter-data-source').value;
    
    const resultDiv = document.getElementById('filter-result');
    resultDiv.innerHTML = '<div class="loading">查询中...</div>';
    
    try {
        const requestBody = {
            month: month,
            start_year: startYear,
            end_year: endYear,
            top_n: topN,
            min_count: minCount
        };
        if (dataSource) {
            requestBody.data_source = dataSource;
        }
        
        const response = await fetch('/api/month/filter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        if (result.success) {
            displayFilterResult(result.data, month, result.data_source, minCount);
        } else {
            resultDiv.innerHTML = '<div class="alert alert-danger">查询失败: ' + (result.message || '未知错误') + '</div>';
        }
    } catch (error) {
        resultDiv.innerHTML = '<div class="alert alert-danger">查询失败: ' + error.message + '</div>';
    }
}

// 显示月份筛选结果
function displayFilterResult(data, month, dataSource, minCount) {
    const resultDiv = document.getElementById('filter-result');
    
    if (data.length === 0) {
        resultDiv.innerHTML = '<div class="alert alert-warning">没有找到数据</div>';
        return;
    }
    
    const dataSourceBadge = dataSource ? `<span class="badge bg-secondary ms-2">数据源: ${dataSource}</span>` : '';
    const minCountBadge = minCount > 0 ? `<span class="badge bg-info ms-2">最小涨跌次数: ${minCount}</span>` : '';
    let html = `<h6>${month}月上涨概率最高的前${data.length}支股票 ${dataSourceBadge} ${minCountBadge}</h6>`;
    html += '<div class="table-responsive"><table class="table table-striped table-hover">';
    html += '<thead><tr><th>排名</th><th>股票代码</th><th>股票名称</th><th>上涨概率</th><th>上涨次数</th><th>下跌次数</th><th>平均涨幅</th><th>平均跌幅</th><th>数据源</th></tr></thead><tbody>';
    
    data.forEach((item, index) => {
        const itemDataSource = item.data_source || dataSource || '未知';
        html += `<tr>
            <td>${index + 1}</td>
            <td>${item.symbol}</td>
            <td>${item.name}</td>
            <td><span class="badge bg-success">${item.up_probability}%</span></td>
            <td>${item.up_count}</td>
            <td>${item.down_count}</td>
            <td class="text-success">${item.avg_up_pct}%</td>
            <td class="text-danger">${item.avg_down_pct}%</td>
            <td><span class="badge bg-info">${itemDataSource}</span></td>
        </tr>`;
    });
    
    html += '</tbody></table></div>';
    
    // 添加导出按钮
    html += `
        <div class="mt-3">
            <button class="btn btn-success" onclick="exportMonthFilter()">
                <i class="bi bi-file-earmark-excel"></i> 导出Excel
            </button>
        </div>
    `;
    
    resultDiv.innerHTML = html;
}

// 导出月份筛选统计
async function exportMonthFilter() {
    const month = parseInt(document.getElementById('filter-month').value);
    const startYear = parseInt(document.getElementById('filter-start-year').value);
    const endYear = parseInt(document.getElementById('filter-end-year').value);
    const topN = parseInt(document.getElementById('filter-top-n').value);
    const minCount = parseInt(document.getElementById('filter-min-count').value) || 0;
    const dataSource = document.getElementById('filter-data-source').value;
    
    try {
        const requestBody = {
            month: month,
            start_year: startYear,
            end_year: endYear,
            top_n: topN,
            min_count: minCount
        };
        if (dataSource) {
            requestBody.data_source = dataSource;
        }
        
        const response = await fetch('/api/export/month-filter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || '月份筛选统计.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            const error = await response.json();
            alert('导出失败: ' + (error.detail || '未知错误'));
        }
    } catch (error) {
        alert('导出失败: ' + error.message);
    }
}

// 行业分析
async function analyzeIndustry() {
    const industryType = document.getElementById('industry-type').value;
    const month = parseInt(document.getElementById('industry-month').value);
    const startYear = parseInt(document.getElementById('industry-start-year').value);
    const endYear = parseInt(document.getElementById('industry-end-year').value);
    const dataSource = document.getElementById('industry-data-source').value;
    
    const resultDiv = document.getElementById('industry-result');
    resultDiv.innerHTML = '<div class="loading">查询中...</div>';
    
    try {
        const requestBody = {
            month: month,
            start_year: startYear,
            end_year: endYear,
            industry_type: industryType
        };
        if (dataSource) {
            requestBody.data_source = dataSource;
        }
        
        const response = await fetch('/api/industry/statistics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        if (result.success) {
            displayIndustryResult(result.data, month, industryType, result.data_source);
            // 更新行业选择下拉框
            updateIndustrySelect(result.data);
        } else {
            resultDiv.innerHTML = '<div class="alert alert-danger">查询失败: ' + (result.message || '未知错误') + '</div>';
        }
    } catch (error) {
        resultDiv.innerHTML = '<div class="alert alert-danger">查询失败: ' + error.message + '</div>';
    }
}

// 显示行业分析结果
function displayIndustryResult(data, month, industryType, dataSource) {
    const resultDiv = document.getElementById('industry-result');
    
    if (data.length === 0) {
        resultDiv.innerHTML = '<div class="alert alert-warning">没有找到数据</div>';
        return;
    }
    
    const typeName = industryType === 'sw' ? '申万' : '中信';
    const dataSourceBadge = dataSource ? `<span class="badge bg-secondary ms-2">数据源: ${dataSource}</span>` : '';
    let html = `<h6>${typeName}行业分类 - ${month}月上涨概率统计 ${dataSourceBadge}</h6>`;
    html += '<div class="table-responsive"><table class="table table-striped table-hover">';
    html += '<thead><tr><th>排名</th><th>行业名称</th><th>股票数量</th><th>上涨概率</th><th>上涨次数</th><th>下跌次数</th><th>平均涨幅</th><th>平均跌幅</th><th>数据源</th></tr></thead><tbody>';
    
    data.forEach((item, index) => {
        const itemDataSource = item.data_source || dataSource || '未知';
        html += `<tr>
            <td>${index + 1}</td>
            <td>${item.industry_name}</td>
            <td>${item.stock_count}</td>
            <td><span class="badge bg-success">${item.up_probability}%</span></td>
            <td>${item.up_count}</td>
            <td>${item.down_count}</td>
            <td class="text-success">${item.avg_up_pct}%</td>
            <td class="text-danger">${item.avg_down_pct}%</td>
            <td><span class="badge bg-info">${itemDataSource}</span></td>
        </tr>`;
    });
    
    html += '</tbody></table></div>';
    
    // 添加导出按钮
    html += `
        <div class="mt-3">
            <button class="btn btn-success" onclick="exportIndustryStatistics()">
                <i class="bi bi-file-earmark-excel"></i> 导出Excel
            </button>
        </div>
    `;
    
    resultDiv.innerHTML = html;
}

// 导出行业统计
async function exportIndustryStatistics() {
    const industryType = document.getElementById('industry-type').value;
    const month = parseInt(document.getElementById('industry-month').value);
    const startYear = parseInt(document.getElementById('industry-start-year').value);
    const endYear = parseInt(document.getElementById('industry-end-year').value);
    const dataSource = document.getElementById('industry-data-source').value;
    
    try {
        const requestBody = {
            month: month,
            start_year: startYear,
            end_year: endYear,
            industry_type: industryType
        };
        if (dataSource) {
            requestBody.data_source = dataSource;
        }
        
        const response = await fetch('/api/export/industry-statistics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || '行业统计.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            const error = await response.json();
            alert('导出失败: ' + (error.detail || '未知错误'));
        }
    } catch (error) {
        alert('导出失败: ' + error.message);
    }
}

// 更新行业选择下拉框
function updateIndustrySelect(industryData) {
    const select = document.getElementById('industry-select');
    select.innerHTML = '<option value="">请选择行业</option>';
    industryData.forEach(item => {
        const option = document.createElement('option');
        option.value = item.industry_name;
        option.textContent = item.industry_name;
        select.appendChild(option);
    });
}

// 获取行业前20支股票
async function getIndustryTopStocks() {
    const industryName = document.getElementById('industry-select').value;
    const industryType = document.getElementById('industry-type').value;
    const month = parseInt(document.getElementById('industry-month').value);
    const startYear = parseInt(document.getElementById('industry-start-year').value);
    const endYear = parseInt(document.getElementById('industry-end-year').value);
    const topN = parseInt(document.getElementById('industry-top-n').value);
    const dataSource = document.getElementById('industry-top-data-source').value;
    
    if (!industryName) {
        alert('请先选择行业');
        return;
    }
    
    const resultDiv = document.getElementById('industry-result');
    resultDiv.innerHTML = '<div class="loading">查询中...</div>';
    
    try {
        const requestBody = {
            industry_name: industryName,
            month: month,
            start_year: startYear,
            end_year: endYear,
            industry_type: industryType,
            top_n: topN
        };
        if (dataSource) {
            requestBody.data_source = dataSource;
        }
        
        const response = await fetch('/api/industry/top-stocks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        if (result.success) {
            displayIndustryTopStocks(result.data, industryName, month, result.data_source);
        } else {
            resultDiv.innerHTML = '<div class="alert alert-danger">查询失败: ' + (result.message || '未知错误') + '</div>';
        }
    } catch (error) {
        resultDiv.innerHTML = '<div class="alert alert-danger">查询失败: ' + error.message + '</div>';
    }
}

// 显示行业前20支股票
function displayIndustryTopStocks(data, industryName, month, dataSource) {
    const resultDiv = document.getElementById('industry-result');
    
    if (data.length === 0) {
        resultDiv.innerHTML = '<div class="alert alert-warning">该行业没有找到数据</div>';
        return;
    }
    
    const dataSourceBadge = dataSource ? `<span class="badge bg-secondary ms-2">数据源: ${dataSource}</span>` : '';
    let html = `<h6>${industryName} - ${month}月上涨概率最高的前${data.length}支股票 ${dataSourceBadge}</h6>`;
    html += '<div class="table-responsive"><table class="table table-striped table-hover">';
    html += '<thead><tr><th>排名</th><th>股票代码</th><th>股票名称</th><th>上涨概率</th><th>上涨次数</th><th>下跌次数</th><th>平均涨幅</th><th>平均跌幅</th><th>数据源</th></tr></thead><tbody>';
    
    data.forEach((item, index) => {
        const itemDataSource = item.data_source || dataSource || '未知';
        html += `<tr>
            <td>${index + 1}</td>
            <td>${item.symbol}</td>
            <td>${item.name}</td>
            <td><span class="badge bg-success">${item.up_probability}%</span></td>
            <td>${item.up_count}</td>
            <td>${item.down_count}</td>
            <td class="text-success">${item.avg_up_pct}%</td>
            <td class="text-danger">${item.avg_down_pct}%</td>
            <td><span class="badge bg-info">${itemDataSource}</span></td>
        </tr>`;
    });
    
    html += '</tbody></table></div>';
    
    // 添加导出按钮
    html += `
        <div class="mt-3">
            <button class="btn btn-success" onclick="exportIndustryTopStocks()">
                <i class="bi bi-file-earmark-excel"></i> 导出Excel
            </button>
        </div>
    `;
    
    resultDiv.innerHTML = html;
}

// 导出行业前20支股票
async function exportIndustryTopStocks() {
    const industryName = document.getElementById('industry-select').value;
    const industryType = document.getElementById('industry-type').value;
    const month = parseInt(document.getElementById('industry-month').value);
    const startYear = parseInt(document.getElementById('industry-start-year').value);
    const endYear = parseInt(document.getElementById('industry-end-year').value);
    const topN = parseInt(document.getElementById('industry-top-n').value);
    const dataSource = document.getElementById('industry-top-data-source').value;
    
    if (!industryName) {
        alert('请先选择行业');
        return;
    }
    
    try {
        const requestBody = {
            industry_name: industryName,
            month: month,
            start_year: startYear,
            end_year: endYear,
            industry_type: industryType,
            top_n: topN
        };
        if (dataSource) {
            requestBody.data_source = dataSource;
        }
        
        const response = await fetch('/api/export/industry-top-stocks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || '行业前20支股票.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            const error = await response.json();
            alert('导出失败: ' + (error.detail || '未知错误'));
        }
    } catch (error) {
        alert('导出失败: ' + error.message);
    }
}

// 加载行业列表
async function loadIndustries() {
    const industryType = document.getElementById('industry-type').value;
    try {
        const response = await fetch(`/api/industries?industry_type=${industryType}`);
        const result = await response.json();
        if (result.success) {
            const select = document.getElementById('industry-select');
            select.innerHTML = '<option value="">请先查询行业统计</option>';
            result.data.forEach(industry => {
                const option = document.createElement('option');
                option.value = industry;
                option.textContent = industry;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading industries:', error);
    }
}

// 加载配置（仅管理员）
async function loadConfig() {
    if (!currentUser || currentUser.role !== 'admin') {
        return;
    }
    try {
        const response = await fetch('/api/config', {
            credentials: 'include'
        });
        const result = await response.json();
        if (result.success) {
            const config = result.data;
            document.getElementById('config-data-source').value = config.data_source || 'tushare';
            document.getElementById('config-tushare-token').value = config.tushare?.token || '';
            document.getElementById('config-finnhub-key').value = config.finnhub?.api_key || '';
        }
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

// 保存配置（仅管理员）
async function saveConfig() {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('需要管理员权限');
        return;
    }
    const dataSource = document.getElementById('config-data-source').value;
    const tushareToken = document.getElementById('config-tushare-token').value;
    const finnhubKey = document.getElementById('config-finnhub-key').value;
    
    try {
        const response = await fetch('/api/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                'data_source': dataSource,
                'tushare.token': tushareToken,
                'finnhub.api_key': finnhubKey
            })
        });
        
        const result = await response.json();
        if (result.success) {
            alert('配置已保存');
            // 保存成功后重新加载配置，确保显示最新值
            await loadConfig();
        } else {
            alert('保存失败: ' + (result.message || '未知错误'));
        }
    } catch (error) {
        alert('保存失败: ' + error.message);
    }
}

// 加载数据源列表
async function loadDataSources() {
    try {
        const response = await fetch('/api/data/sources');
        const result = await response.json();
        if (result.success) {
            const sources = result.data || [];
            
            // 更新所有数据源选择下拉框
            const selectors = [
                'stock-data-source',
                'stock-multi-data-source',
                'filter-data-source',
                'industry-data-source',
                'industry-top-data-source'
            ];
            
            selectors.forEach(selectorId => {
                const select = document.getElementById(selectorId);
                if (select) {
                    // 保留"使用默认"选项
                    const defaultOption = select.options[0];
                    select.innerHTML = '';
                    select.appendChild(defaultOption);
                    
                    // 添加可用数据源
                    sources.forEach(source => {
                        const option = document.createElement('option');
                        option.value = source;
                        option.textContent = source;
                        select.appendChild(option);
                    });
                }
            });
        }
    } catch (error) {
        console.error('Error loading data sources:', error);
    }
}

// 初始化单只股票分析类型切换
function initStockAnalysisTypeToggle() {
    var singleMonthRadio = document.getElementById('stock-single-month');
    var multiMonthRadio = document.getElementById('stock-multi-month');
    var singleMonthForm = document.getElementById('stock-single-month-form');
    var multiMonthForm = document.getElementById('stock-multi-month-form');
    
    if (singleMonthRadio && multiMonthRadio) {
        singleMonthRadio.addEventListener('change', function() {
            if (this.checked) {
                if (singleMonthForm) singleMonthForm.style.display = 'block';
                if (multiMonthForm) multiMonthForm.style.display = 'none';
                // 重新初始化自动完成（确保事件监听器正确绑定）
                initStockAutocomplete();
            }
        });
        
        multiMonthRadio.addEventListener('change', function() {
            if (this.checked) {
                if (singleMonthForm) singleMonthForm.style.display = 'none';
                if (multiMonthForm) multiMonthForm.style.display = 'block';
                // 重新初始化自动完成（确保事件监听器正确绑定）
                initStockAutocomplete();
            }
        });
    }
}

// 按月统计查询
// 全选月份
function selectAllMonths() {
    var monthContainer = document.getElementById('stock-multi-months');
    if (!monthContainer) return;
    
    var monthCheckboxes = monthContainer.querySelectorAll('input[type="checkbox"]');
    for (var i = 0; i < monthCheckboxes.length; i++) {
        monthCheckboxes[i].checked = true;
    }
}

// 清空月份选择
function clearAllMonths() {
    var monthContainer = document.getElementById('stock-multi-months');
    if (!monthContainer) return;
    
    var monthCheckboxes = monthContainer.querySelectorAll('input[type="checkbox"]');
    for (var i = 0; i < monthCheckboxes.length; i++) {
        monthCheckboxes[i].checked = false;
    }
}

function analyzeStockMultiMonth() {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e0faeb7e-95cd-4fa7-be5d-ce4cdc8bf3c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:979',message:'analyzeStockMultiMonth called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(function(){}); 
    // #endregion
    var code = document.getElementById('stock-multi-code').value.trim();
    var startYear = parseInt(document.getElementById('stock-multi-start-year').value);
    var endYear = parseInt(document.getElementById('stock-multi-end-year').value);
    var dataSource = document.getElementById('stock-multi-data-source').value;
    
    // 获取选中的月份（从checkbox获取，兼容所有浏览器）
    var monthContainer = document.getElementById('stock-multi-months');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e0faeb7e-95cd-4fa7-be5d-ce4cdc8bf3c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:987',message:'Month container check',data:{monthContainerExists:!!monthContainer,containerTagName:monthContainer?monthContainer.tagName:'N/A'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(function(){}); 
    // #endregion
    var monthCheckboxes = monthContainer ? monthContainer.querySelectorAll('input[type="checkbox"]') : [];
    var selectedMonths = [];
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e0faeb7e-95cd-4fa7-be5d-ce4cdc8bf3c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:990',message:'Checkboxes found',data:{checkboxCount:monthCheckboxes.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(function(){}); 
    // #endregion
    
    // 使用兼容所有浏览器的方式遍历
    for (var i = 0; i < monthCheckboxes.length; i++) {
        if (monthCheckboxes[i].checked) {
            var monthValue = parseInt(monthCheckboxes[i].value);
            if (!isNaN(monthValue)) {
                selectedMonths.push(monthValue);
            }
        }
    }
    
    // 如果没有选择任何月份，则查询所有月份
    var months = selectedMonths.length > 0 ? selectedMonths : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    
    if (!code) {
        alert('请输入股票代码');
        return;
    }
    
    var resultDiv = document.getElementById('stock-result');
    resultDiv.innerHTML = '<div class="loading">查询中...</div>';
    
    var requestBody = {
        code: code,
        months: months,
        start_year: startYear,
        end_year: endYear
    };
    if (dataSource) {
        requestBody.data_source = dataSource;
    }
    
    // 使用兼容所有浏览器的fetch
    fetch('/api/stock/multi-month-statistics', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    })
    .then(function(response) {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(function(result) {
        if (result.success) {
            displayStockMultiMonthResult(result.data);
        } else {
            resultDiv.innerHTML = '<div class="alert alert-danger">查询失败: ' + (result.message || '未知错误') + '</div>';
        }
    })
    .catch(function(error) {
        resultDiv.innerHTML = '<div class="alert alert-danger">查询失败: ' + error.message + '</div>';
    });
}

// 显示按月统计结果
function displayStockMultiMonthResult(data) {
    var resultDiv = document.getElementById('stock-result');
    
    if (!data || data.length === 0) {
        resultDiv.innerHTML = '<div class="alert alert-warning">该股票在指定月份没有数据</div>';
        return;
    }
    
    var stockName = data[0].name || '';
    var stockSymbol = data[0].symbol || '';
    var dataSource = data[0].data_source || '';
    var dataSourceBadge = dataSource ? '<span class="badge bg-secondary ms-2">数据源: ' + escapeHtml(dataSource) + '</span>' : '';
    
    var html = '<h6>' + escapeHtml(stockName) + ' (' + escapeHtml(stockSymbol) + ') - 按月统计 ' + dataSourceBadge + '</h6>';
    html += '<div class="table-responsive"><table class="table table-striped table-hover">';
    html += '<thead><tr><th>月份</th><th>总次数</th><th>上涨次数</th><th>下跌次数</th><th>上涨概率</th><th>下跌概率</th><th>平均涨幅</th><th>平均跌幅</th></tr></thead><tbody>';
    
    // 使用兼容所有浏览器的方式遍历
    for (var i = 0; i < data.length; i++) {
        var item = data[i];
        var upProbClass = item.up_probability >= 50 ? 'bg-success' : 'bg-warning';
        var downProbClass = item.down_probability >= 50 ? 'bg-danger' : 'bg-secondary';
        
        html += '<tr>';
        html += '<td><strong>' + item.month + '月</strong></td>';
        html += '<td>' + item.total_count + '</td>';
        html += '<td class="text-success">' + item.up_count + '</td>';
        html += '<td class="text-danger">' + item.down_count + '</td>';
        html += '<td><span class="badge ' + upProbClass + '">' + item.up_probability + '%</span></td>';
        html += '<td><span class="badge ' + downProbClass + '">' + item.down_probability + '%</span></td>';
        html += '<td class="text-success">' + item.avg_up_pct + '%</td>';
        html += '<td class="text-danger">' + item.avg_down_pct + '%</td>';
        html += '</tr>';
    }
    
    html += '</tbody></table></div>';
    
    // 添加导出按钮
    html += '<div class="mt-3">';
    html += '<button class="btn btn-success" onclick="exportMultiMonthStatistics()">';
    html += '<i class="bi bi-file-earmark-excel"></i> 导出Excel';
    html += '</button>';
    html += '</div>';
    
    resultDiv.innerHTML = html;
}

// 导出按月统计
function exportMultiMonthStatistics() {
    var code = document.getElementById('stock-multi-code').value.trim();
    var startYear = parseInt(document.getElementById('stock-multi-start-year').value);
    var endYear = parseInt(document.getElementById('stock-multi-end-year').value);
    var dataSource = document.getElementById('stock-multi-data-source').value;
    
    // 获取选中的月份（从checkbox获取，兼容所有浏览器）
    var monthContainer = document.getElementById('stock-multi-months');
    var monthCheckboxes = monthContainer.querySelectorAll('input[type="checkbox"]');
    var selectedMonths = [];
    
    // 使用兼容所有浏览器的方式遍历
    for (var i = 0; i < monthCheckboxes.length; i++) {
        if (monthCheckboxes[i].checked) {
            var monthValue = parseInt(monthCheckboxes[i].value);
            if (!isNaN(monthValue)) {
                selectedMonths.push(monthValue);
            }
        }
    }
    
    // 如果没有选择任何月份，则查询所有月份
    var months = selectedMonths.length > 0 ? selectedMonths : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    
    if (!code) {
        alert('请输入股票代码');
        return;
    }
    
    var requestBody = {
        code: code,
        months: months,
        start_year: startYear,
        end_year: endYear
    };
    if (dataSource) {
        requestBody.data_source = dataSource;
    }
    
    // 使用兼容所有浏览器的fetch
    fetch('/api/export/multi-month-statistics', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    })
    .then(function(response) {
        if (response.ok) {
            return response.blob().then(function(blob) {
                var url = window.URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                
                // 兼容所有浏览器的文件名获取
                var contentDisposition = response.headers.get('Content-Disposition');
                var filename = '按月统计.xlsx';
                if (contentDisposition) {
                    var filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                    if (filenameMatch && filenameMatch[1]) {
                        filename = filenameMatch[1].replace(/['"]/g, '');
                    }
                }
                a.download = filename;
                
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            });
        } else {
            return response.json().then(function(error) {
                alert('导出失败: ' + (error.detail || '未知错误'));
            });
        }
    })
    .catch(function(error) {
        alert('导出失败: ' + error.message);
    });
}

// 数据源对比
async function compareDataSources() {
    const code = document.getElementById('compare-code').value.trim();
    const year = document.getElementById('compare-year').value;
    const month = document.getElementById('compare-month').value;
    const date = document.getElementById('compare-date').value.trim();
    
    if (!code) {
        alert('请输入股票代码');
        return;
    }
    
    // 转换股票代码格式（如果用户输入的是6位数字，添加交易所后缀）
    let ts_code = code;
    if (/^\d{6}$/.test(code)) {
        // 根据代码判断交易所
        if (code.startsWith('0') || code.startsWith('3')) {
            ts_code = code + '.SZ';
        } else if (code.startsWith('6') || code.startsWith('9')) {
            ts_code = code + '.SH';
        } else if (code.startsWith('8') || code.startsWith('4')) {
            ts_code = code + '.BJ';
        } else {
            ts_code = code + '.SH'; // 默认上海
        }
    }
    
    const resultDiv = document.getElementById('compare-result');
    resultDiv.innerHTML = '<div class="loading">查询中...</div>';
    
    try {
        const requestBody = {
            ts_code: ts_code
        };
        
        if (date) {
            requestBody.trade_date = date;
        } else {
            if (year) {
                requestBody.year = parseInt(year);
            }
            if (month) {
                requestBody.month = parseInt(month);
            }
        }
        
        const response = await fetch('/api/data/compare-sources', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        if (result.success) {
            displayCompareResult(result.data, result.message);
        } else {
            resultDiv.innerHTML = '<div class="alert alert-danger">对比失败: ' + (result.message || '未知错误') + '</div>';
        }
    } catch (error) {
        resultDiv.innerHTML = '<div class="alert alert-danger">对比失败: ' + error.message + '</div>';
    }
}

// 显示数据源对比结果
function displayCompareResult(data, message) {
    const resultDiv = document.getElementById('compare-result');
    
    if (!data || data.length === 0) {
        resultDiv.innerHTML = `<div class="alert alert-info">${message || '没有找到对比数据，请先使用不同数据源更新数据'}</div>`;
        return;
    }
    
    // 按交易日期分组
    const groupedByDate = {};
    data.forEach(item => {
        const date = item.trade_date;
        if (!groupedByDate[date]) {
            groupedByDate[date] = [];
        }
        groupedByDate[date].push(item);
    });
    
    // 获取所有数据源
    const allSources = [...new Set(data.map(item => item.data_source))];
    
    // 选择第一个数据源作为基准
    const baseSource = allSources[0];
    
    let html = '<div class="table-responsive"><table class="table table-bordered table-hover table-striped">';
    html += '<thead class="table-light"><tr>';
    html += '<th>交易日期</th>';
    html += '<th>数据源</th>';
    html += '<th>开盘价</th>';
    html += '<th>收盘价</th>';
    html += '<th>涨跌幅(%)</th>';
    html += '<th>差异说明</th>';
    html += '</tr></thead><tbody>';
    
    // 按日期排序
    const sortedDates = Object.keys(groupedByDate).sort();
    
    sortedDates.forEach(date => {
        const items = groupedByDate[date];
        const baseItem = items.find(item => item.data_source === baseSource);
        
        items.forEach((item, index) => {
            const isBase = item.data_source === baseSource;
            const rowClass = isBase ? 'table-warning' : '';
            
            let diffText = '';
            if (baseItem && !isBase) {
                const openDiff = ((item.open - baseItem.open) / baseItem.open * 100).toFixed(2);
                const closeDiff = ((item.close - baseItem.close) / baseItem.close * 100).toFixed(2);
                const pctDiff = (item.pct_chg - baseItem.pct_chg).toFixed(2);
                
                diffText = `开盘: ${openDiff > 0 ? '+' : ''}${openDiff}%, `;
                diffText += `收盘: ${closeDiff > 0 ? '+' : ''}${closeDiff}%, `;
                diffText += `涨跌: ${pctDiff > 0 ? '+' : ''}${pctDiff}%`;
            } else if (isBase) {
                diffText = '<span class="badge bg-warning">基准数据源</span>';
            }
            
            html += `<tr class="${rowClass}">`;
            if (index === 0) {
                html += `<td rowspan="${items.length}">${date}</td>`;
            }
            html += `<td><span class="badge bg-info">${item.data_source}</span></td>`;
            html += `<td>${item.open ? parseFloat(item.open).toFixed(2) : '-'}</td>`;
            html += `<td>${item.close ? parseFloat(item.close).toFixed(2) : '-'}</td>`;
            html += `<td>${item.pct_chg ? parseFloat(item.pct_chg).toFixed(2) : '-'}%</td>`;
            html += `<td>${diffText}</td>`;
            html += '</tr>';
        });
    });
    
    html += '</tbody></table></div>';
    
    // 添加导出按钮
    html += `
        <div class="mt-3">
            <button class="btn btn-success" onclick="exportCompareSources()">
                <i class="bi bi-file-earmark-excel"></i> 导出Excel
            </button>
        </div>
    `;
    
    resultDiv.innerHTML = html;
}

// 导出数据源对比结果
async function exportCompareSources() {
    const code = document.getElementById('compare-code').value.trim();
    const year = document.getElementById('compare-year').value;
    const month = document.getElementById('compare-month').value;
    const date = document.getElementById('compare-date').value.trim();
    
    if (!code) {
        alert('请输入股票代码');
        return;
    }
    
    // 转换股票代码格式
    let ts_code = code;
    if (/^\d{6}$/.test(code)) {
        if (code.startsWith('0') || code.startsWith('3')) {
            ts_code = code + '.SZ';
        } else if (code.startsWith('6') || code.startsWith('9')) {
            ts_code = code + '.SH';
        } else if (code.startsWith('8') || code.startsWith('4')) {
            ts_code = code + '.BJ';
        } else {
            ts_code = code + '.SH';
        }
    }
    
    try {
        const requestBody = {
            ts_code: ts_code
        };
        
        if (date) {
            requestBody.trade_date = date;
        } else {
            if (year) {
                requestBody.year = parseInt(year);
            }
            if (month) {
                requestBody.month = parseInt(month);
            }
        }
        
        const response = await fetch('/api/export/compare-sources', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || '数据源对比.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            const error = await response.json();
            alert('导出失败: ' + (error.detail || error.message || '未知错误'));
        }
    } catch (error) {
        alert('导出失败: ' + error.message);
    }
}

// 股票代码自动补全
var stockAutocompleteTimeout = null;

function initStockAutocomplete() {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e0faeb7e-95cd-4fa7-be5d-ce4cdc8bf3c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:1422',message:'initStockAutocomplete called',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(function(){}); 
    // #endregion
    var stockCodeInput = document.getElementById('stock-code');
    var stockMultiCodeInput = document.getElementById('stock-multi-code');
    var compareCodeInput = document.getElementById('compare-code');
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e0faeb7e-95cd-4fa7-be5d-ce4cdc8bf3c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:1426',message:'Input elements found',data:{stockCodeInput:!!stockCodeInput,stockMultiCodeInput:!!stockMultiCodeInput},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(function(){}); 
    // #endregion
    
    // 为单月统计输入框初始化自动完成
    if (stockCodeInput && !stockCodeInput.hasAttribute('data-autocomplete-initialized')) {
        stockCodeInput.setAttribute('data-autocomplete-initialized', 'true');
        stockCodeInput.addEventListener('input', function(e) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/e0faeb7e-95cd-4fa7-be5d-ce4cdc8bf3c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:1429',message:'Stock code input event',data:{value:e.target.value},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(function(){}); 
            // #endregion
            handleStockAutocomplete(e.target, 'stock-autocomplete');
        });
        stockCodeInput.addEventListener('blur', function() {
            // 延迟隐藏，允许点击下拉项
            setTimeout(function() {
                var dropdown = document.getElementById('stock-autocomplete');
                if (dropdown) dropdown.style.display = 'none';
            }, 200);
        });
        stockCodeInput.addEventListener('focus', function(e) {
            if (e.target.value && e.target.value.length >= 1) {
                handleStockAutocomplete(e.target, 'stock-autocomplete');
            }
        });
        // 添加键盘导航支持（兼容所有浏览器）
        stockCodeInput.addEventListener('keydown', function(e) {
            var dropdown = document.getElementById('stock-autocomplete');
            if (!dropdown || dropdown.style.display === 'none') return;
            
            var items = dropdown.querySelectorAll('.autocomplete-item');
            if (items.length === 0) return;
            
            var currentIndex = -1;
            for (var i = 0; i < items.length; i++) {
                if (items[i].classList.contains('active')) {
                    currentIndex = i;
                    break;
                }
            }
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                currentIndex = (currentIndex + 1) % items.length;
                for (var j = 0; j < items.length; j++) {
                    items[j].classList.remove('active');
                }
                items[currentIndex].classList.add('active');
                if (items[currentIndex].scrollIntoView) {
                    items[currentIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                currentIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
                for (var j = 0; j < items.length; j++) {
                    items[j].classList.remove('active');
                }
                items[currentIndex].classList.add('active');
                if (items[currentIndex].scrollIntoView) {
                    items[currentIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
            } else if (e.key === 'Enter' && currentIndex >= 0) {
                e.preventDefault();
                items[currentIndex].click();
            } else if (e.key === 'Escape') {
                dropdown.style.display = 'none';
            }
        });
    }
    
    // 为按月统计输入框初始化自动完成
    if (stockMultiCodeInput) {
        stockMultiCodeInput.addEventListener('input', function(e) {
            handleStockAutocomplete(e.target, 'stock-multi-autocomplete');
        });
        stockMultiCodeInput.addEventListener('blur', function() {
            // 延迟隐藏，允许点击下拉项
            setTimeout(function() {
                var dropdown = document.getElementById('stock-multi-autocomplete');
                if (dropdown) dropdown.style.display = 'none';
            }, 200);
        });
        stockMultiCodeInput.addEventListener('focus', function(e) {
            if (e.target.value && e.target.value.length >= 1) {
                handleStockAutocomplete(e.target, 'stock-multi-autocomplete');
            }
        });
        // 添加键盘导航支持（兼容所有浏览器）
        stockMultiCodeInput.addEventListener('keydown', function(e) {
            var dropdown = document.getElementById('stock-multi-autocomplete');
            if (!dropdown || dropdown.style.display === 'none') return;
            
            var items = dropdown.querySelectorAll('.autocomplete-item');
            if (items.length === 0) return;
            
            var currentIndex = -1;
            for (var i = 0; i < items.length; i++) {
                if (items[i].classList.contains('active')) {
                    currentIndex = i;
                    break;
                }
            }
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                currentIndex = (currentIndex + 1) % items.length;
                for (var j = 0; j < items.length; j++) {
                    items[j].classList.remove('active');
                }
                items[currentIndex].classList.add('active');
                if (items[currentIndex].scrollIntoView) {
                    items[currentIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                currentIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
                for (var j = 0; j < items.length; j++) {
                    items[j].classList.remove('active');
                }
                items[currentIndex].classList.add('active');
                if (items[currentIndex].scrollIntoView) {
                    items[currentIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
            } else if (e.key === 'Enter' && currentIndex >= 0) {
                e.preventDefault();
                items[currentIndex].click();
            } else if (e.key === 'Escape') {
                dropdown.style.display = 'none';
            }
        });
    }
    
    // 为数据源对比输入框初始化自动完成
    if (compareCodeInput && !compareCodeInput.hasAttribute('data-autocomplete-initialized')) {
        compareCodeInput.setAttribute('data-autocomplete-initialized', 'true');
        compareCodeInput.addEventListener('input', function(e) {
            handleStockAutocomplete(e.target, 'compare-autocomplete');
        });
        compareCodeInput.addEventListener('blur', function() {
            // 延迟隐藏，允许点击下拉项
            setTimeout(function() {
                var dropdown = document.getElementById('compare-autocomplete');
                if (dropdown) dropdown.style.display = 'none';
            }, 200);
        });
        compareCodeInput.addEventListener('focus', function(e) {
            if (e.target.value && e.target.value.length >= 1) {
                handleStockAutocomplete(e.target, 'compare-autocomplete');
            }
        });
        // 添加键盘导航支持（兼容所有浏览器）
        compareCodeInput.addEventListener('keydown', function(e) {
            var dropdown = document.getElementById('compare-autocomplete');
            if (!dropdown || dropdown.style.display === 'none') return;
            
            var items = dropdown.querySelectorAll('.autocomplete-item');
            if (items.length === 0) return;
            
            var currentIndex = -1;
            for (var i = 0; i < items.length; i++) {
                if (items[i].classList.contains('active')) {
                    currentIndex = i;
                    break;
                }
            }
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                currentIndex = (currentIndex + 1) % items.length;
                for (var j = 0; j < items.length; j++) {
                    items[j].classList.remove('active');
                }
                items[currentIndex].classList.add('active');
                if (items[currentIndex].scrollIntoView) {
                    items[currentIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                currentIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
                for (var j = 0; j < items.length; j++) {
                    items[j].classList.remove('active');
                }
                items[currentIndex].classList.add('active');
                if (items[currentIndex].scrollIntoView) {
                    items[currentIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
            } else if (e.key === 'Enter' && currentIndex >= 0) {
                e.preventDefault();
                items[currentIndex].click();
            } else if (e.key === 'Escape') {
                dropdown.style.display = 'none';
            }
        });
    }
}

function handleStockAutocomplete(inputElement, dropdownId) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e0faeb7e-95cd-4fa7-be5d-ce4cdc8bf3c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:1535',message:'handleStockAutocomplete called',data:{keyword:inputElement.value.trim(),dropdownId:dropdownId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(function(){}); 
    // #endregion
    var keyword = inputElement.value.trim();
    var dropdown = document.getElementById(dropdownId);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e0faeb7e-95cd-4fa7-be5d-ce4cdc8bf3c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:1540',message:'Dropdown element check',data:{dropdownExists:!!dropdown,keywordLength:keyword.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(function(){}); 
    // #endregion
    
    if (!dropdown) return;
    
    if (stockAutocompleteTimeout) {
        clearTimeout(stockAutocompleteTimeout);
    }
    
    if (keyword.length < 1) {
        dropdown.style.display = 'none';
        return;
    }
    
    // 使用兼容所有浏览器的setTimeout和fetch
    stockAutocompleteTimeout = setTimeout(function() {
        // 使用fetch API（现代浏览器支持，IE11需要polyfill，但这里假设已支持）
        fetch('/api/stocks/search?keyword=' + encodeURIComponent(keyword) + '&limit=10')
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(function(result) {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/e0faeb7e-95cd-4fa7-be5d-ce4cdc8bf3c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:1560',message:'Search API response',data:{success:result.success,dataLength:result.data?result.data.length:0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(function(){}); 
                // #endregion
                if (result.success && result.data && result.data.length > 0) {
                    displayStockAutocomplete(result.data, dropdown, inputElement);
                } else {
                    dropdown.style.display = 'none';
                }
            })
            .catch(function(error) {
                // 兼容所有浏览器的错误处理
                if (typeof console !== 'undefined' && console.error) {
                    console.error('搜索股票失败:', error);
                }
                dropdown.style.display = 'none';
            });
    }, 300);
}

function displayStockAutocomplete(results, dropdown, inputElement) {
    dropdown.innerHTML = '';
    
    if (!results || results.length === 0) {
        dropdown.style.display = 'none';
        return;
    }
    
    // 使用兼容所有浏览器的方式遍历（包括IE11+）
    // 使用立即执行函数（IIFE）解决闭包问题
    for (var i = 0; i < results.length; i++) {
        (function(index) {
            var stock = results[index];
            var item = document.createElement('div');
            item.className = 'autocomplete-item';
            var symbol = stock.symbol || stock.ts_code || '';
            var name = stock.name || '';
            var exchange = stock.exchange || '';
            
            // 将symbol存储在data属性中，确保点击时能正确获取
            item.setAttribute('data-symbol', symbol);
            
            // 使用textContent和innerHTML的组合，确保兼容性
            item.innerHTML = '<strong>' + escapeHtml(symbol) + '</strong> <span class="text-muted">' + escapeHtml(name) + '</span><small class="text-muted ms-2">' + escapeHtml(exchange) + '</small>';
            
            // 点击选择 - 使用data属性获取symbol，避免闭包问题
            item.addEventListener('click', function() {
                var selectedSymbol = this.getAttribute('data-symbol');
                inputElement.value = selectedSymbol;
                dropdown.style.display = 'none';
                // 兼容所有浏览器的事件触发
                if (typeof Event !== 'undefined') {
                    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                } else {
                    // IE11兼容
                    var evt = document.createEvent('HTMLEvents');
                    evt.initEvent('input', true, true);
                    inputElement.dispatchEvent(evt);
                }
            });
        
            // 鼠标悬停高亮
            item.addEventListener('mouseenter', function() {
                item.style.backgroundColor = '#f8f9fa';
                // 移除其他项的active类
                var allItems = dropdown.querySelectorAll('.autocomplete-item');
                for (var j = 0; j < allItems.length; j++) {
                    if (allItems[j] !== item) {
                        allItems[j].classList.remove('active');
                    }
                }
                item.classList.add('active');
            });
            
            item.addEventListener('mouseleave', function() {
                // 保持active类以便键盘导航
            });
            
            dropdown.appendChild(item);
        })(i);
    }
    
    dropdown.style.display = 'block';
    
    // 计算下拉框位置（兼容所有浏览器）
    var inputRect = inputElement.getBoundingClientRect();
    var parentElement = inputElement.offsetParent || inputElement.parentElement;
    var parentRect = parentElement ? parentElement.getBoundingClientRect() : { left: 0, top: 0 };
    
    // 设置位置（相对于父容器）
    dropdown.style.top = (inputElement.offsetTop + inputElement.offsetHeight) + 'px';
    dropdown.style.left = inputElement.offsetLeft + 'px';
    dropdown.style.width = inputElement.offsetWidth + 'px';
    dropdown.style.minWidth = inputElement.offsetWidth + 'px';
}

// HTML转义函数，防止XSS攻击并确保兼容性
function escapeHtml(text) {
    if (!text) return '';
    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
}

// ========== 认证和权限管理 ==========

// 检查登录状态
async function checkLoginStatus() {
    try {
        const response = await fetch('/api/auth/current-user', {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success && result.user) {
            currentUser = result.user;
            
            // 检查账号是否过期
            if (currentUser.expired) {
                alert(currentUser.expired_message || '账号已过期，请联系管理员重新授权。管理员微信：yyongzf8');
                showLoginPage();
                return;
            }
            
            // 确保权限信息存在
            if (!currentUser.permissions) {
                currentUser.permissions = [];
            }
            showMainContent();
            updateUIByRole();
            updateUIByPermissions();
        } else {
            showLoginPage();
        }
    } catch (error) {
        console.error('检查登录状态失败:', error);
        showLoginPage();
    }
}

// 显示登录页面
function showLoginPage() {
    document.getElementById('login-page').style.display = 'block';
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('logout-btn').style.display = 'none';
    document.getElementById('current-user-info').style.display = 'none';
    document.getElementById('account-settings-link').style.display = 'none';
    currentUser = null;
}

// 显示主内容
function showMainContent() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
    document.getElementById('logout-btn').style.display = 'block';
    document.getElementById('current-user-info').style.display = 'block';
    document.getElementById('account-settings-link').style.display = 'block';
    
    // 显示用户信息
    if (currentUser) {
        const roleText = currentUser.role === 'admin' ? '管理员' : '普通用户';
        document.getElementById('current-user-info').innerHTML = 
            `<i class="bi bi-person-circle"></i> ${currentUser.username} <span class="badge bg-info">${roleText}</span>`;
    }
    
    // 先根据权限更新UI（在加载数据之前）
    updateUIByPermissions();
    
    // 设置默认显示的标签页（根据权限）
    setDefaultTab();
    
    // 初始化主页面功能（根据权限决定是否加载）
    if (currentUser && (currentUser.role === 'admin' || (currentUser.permissions && currentUser.permissions.includes('data_management')))) {
        loadDataStatus();
        checkAndShowProgress();
    }
    
    loadConfig();
    loadIndustries();
    loadDataSources();
    initStockAnalysisTypeToggle();
    initStockAutocomplete();
    initPasswordStrengthIndicator();
    
    // 加载首页公告
    loadAnnouncements();
    
    // 更新快速入口按钮（根据权限）
    updateQuickAccessButtons();
    
    // 如果是管理员，加载用户列表和系统配置
    if (currentUser && currentUser.role === 'admin') {
        loadUsers();
        loadSystemConfig();
    }
}

// 设置默认显示的标签页
function setDefaultTab() {
    if (!currentUser) return;
    
    // 默认显示首页
    const homeNavItem = document.querySelector('.navbar-nav .nav-item a[onclick*="showTab(\'home\'"]');
    if (homeNavItem) {
        showTab('home', homeNavItem);
        return;
    }
    
    const permissions = currentUser.permissions || [];
    const isAdmin = currentUser.role === 'admin';
    
    // 默认标签页优先级（按顺序检查）
    const defaultTabs = [
        'stock-analysis',      // 单只股票分析（优先）
        'month-filter',        // 月份筛选统计
        'industry-analysis',   // 行业分析
        'source-compare'       // 数据源对比
    ];
    
    // 权限映射
    const tabPermissionMap = {
        'stock-analysis': ['stock_analysis_single', 'stock_analysis_multi'],
        'month-filter': ['month_filter'],
        'industry-analysis': ['industry_statistics', 'industry_top_stocks'],
        'source-compare': ['source_compare']
    };
    
    // 如果是管理员，默认显示单只股票分析（如果首页不存在）
    if (isAdmin) {
        const navItem = document.querySelector('.navbar-nav .nav-item a[onclick*="showTab(\'stock-analysis\'"]');
        if (navItem) {
            showTab('stock-analysis', navItem);
            return;
        }
    }
    
    // 查找第一个有权限的标签页
    for (const tabId of defaultTabs) {
        const requiredPerms = tabPermissionMap[tabId] || [];
        
        // 检查是否有任一权限
        const hasPermission = requiredPerms.some(perm => permissions.includes(perm));
        
        if (hasPermission) {
            const navItem = document.querySelector(`.navbar-nav .nav-item a[onclick*="showTab('${tabId}'"]`);
            if (navItem && navItem.closest('.nav-item').style.display !== 'none') {
                showTab(tabId, navItem);
                return;
            }
        }
    }
    
    // 如果都没有权限，显示第一个可见的标签页
    const firstVisibleNavItem = document.querySelector('.navbar-nav .nav-item[style=""] a, .navbar-nav .nav-item:not([style*="none"]) a');
    if (firstVisibleNavItem) {
        const onclick = firstVisibleNavItem.getAttribute('onclick');
        if (onclick) {
            const match = onclick.match(/showTab\('([^']+)'/);
            if (match) {
                showTab(match[1], firstVisibleNavItem);
            }
        }
    }
}

// 根据角色更新UI
function updateUIByRole() {
    const isAdmin = currentUser && currentUser.role === 'admin';
    const adminElements = document.querySelectorAll('.admin-only');
    
    adminElements.forEach(el => {
        el.style.display = isAdmin ? '' : 'none';
    });
    
    // 隐藏普通用户不应该看到的功能
    if (!isAdmin) {
        const configTab = document.getElementById('config');
        const userManagementTab = document.getElementById('user-management');
        if (configTab) configTab.style.display = 'none';
        if (userManagementTab) userManagementTab.style.display = 'none';
    }
}

// 根据用户权限更新UI（隐藏/显示功能）
function updateUIByPermissions() {
    if (!currentUser) return;
    
    const permissions = currentUser.permissions || [];
    const isAdmin = currentUser.role === 'admin';
    
    // 权限映射到功能标签页
    const permissionMap = {
        'stock_analysis_single': ['stock-analysis'],
        'stock_analysis_multi': ['stock-analysis'],
        'month_filter': ['month-filter'],
        'industry_statistics': ['industry-analysis'],
        'industry_top_stocks': ['industry-analysis'],
        'source_compare': ['source-compare']
        // 注意：data_management权限现在在config标签页中，由管理员权限控制
    };
    
    // 先显示所有标签页（除了admin-only的）
    document.querySelectorAll('.navbar-nav .nav-item').forEach(item => {
        if (!item.classList.contains('admin-only')) {
            item.style.display = '';
        }
    });
    
    // 如果是管理员，显示所有功能（包括admin-only的）
    if (isAdmin) {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = '';
        });
        return;
    }
    
    // 隐藏admin-only的元素
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = 'none';
    });
    
    // 根据权限隐藏/显示功能标签页
    Object.keys(permissionMap).forEach(perm => {
        if (!permissions.includes(perm)) {
            permissionMap[perm].forEach(tabId => {
                // 查找对应的导航项
                const navItems = document.querySelectorAll('.navbar-nav .nav-item');
                navItems.forEach(item => {
                    const link = item.querySelector('a');
                    if (link && link.getAttribute('onclick') && link.getAttribute('onclick').includes(`'${tabId}'`)) {
                        item.style.display = 'none';
                        // 如果当前显示的是这个标签页，切换到第一个可见的标签页
                        const currentTab = document.getElementById(tabId);
                        if (currentTab && currentTab.style.display !== 'none') {
                            const firstVisibleTab = document.querySelector('.tab-content[style*="block"]');
                            if (!firstVisibleTab || firstVisibleTab.id === tabId) {
                                // 找到第一个可见的标签页并显示
                                const visibleNavItem = document.querySelector('.navbar-nav .nav-item[style=""] a');
                                if (visibleNavItem) {
                                    const onclick = visibleNavItem.getAttribute('onclick');
                                    if (onclick) {
                                        const match = onclick.match(/showTab\('([^']+)'/);
                                        if (match) {
                                            showTab(match[1], visibleNavItem);
                                        }
                                    }
                                }
                            }
                        }
                    }
                });
            });
        }
    });
    
    // 如果没有导出权限，隐藏所有导出按钮
    if (!permissions.includes('export_excel')) {
        document.querySelectorAll('button[onclick*="export"]').forEach(btn => {
            btn.style.display = 'none';
        });
    } else {
        // 有导出权限，显示所有导出按钮
        document.querySelectorAll('button[onclick*="export"]').forEach(btn => {
            btn.style.display = '';
        });
    }
    
    // 更新首页快速入口按钮的显示
    updateQuickAccessButtons();
}

// 更新首页快速入口按钮的显示（根据权限）
function updateQuickAccessButtons() {
    if (!currentUser) return;
    
    const permissions = currentUser.permissions || [];
    const isAdmin = currentUser.role === 'admin';
    const quickAccessButtons = document.querySelectorAll('.quick-access-btn');
    const noQuickAccessMsg = document.getElementById('no-quick-access');
    
    let visibleCount = 0;
    
    quickAccessButtons.forEach(btn => {
        const requiredPerms = btn.getAttribute('data-permissions').split(',');
        
        // 管理员显示所有按钮
        if (isAdmin) {
            btn.style.display = '';
            visibleCount++;
        } else {
            // 检查用户是否有任一所需权限
            const hasPermission = requiredPerms.some(perm => permissions.includes(perm.trim()));
            if (hasPermission) {
                btn.style.display = '';
                visibleCount++;
            } else {
                btn.style.display = 'none';
            }
        }
    });
    
    // 如果没有可见的快速入口，显示提示信息
    if (visibleCount === 0 && noQuickAccessMsg) {
        noQuickAccessMsg.style.display = 'block';
    } else if (noQuickAccessMsg) {
        noQuickAccessMsg.style.display = 'none';
    }
}

// 登录
async function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    
    if (!username || !password) {
        errorDiv.textContent = '请输入用户名和密码';
        errorDiv.style.display = 'block';
        return;
    }
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentUser = result.user;
            // 确保权限信息存在
            if (!currentUser.permissions) {
                currentUser.permissions = [];
            }
            // 先更新UI，再加载内容
            updateUIByRole();
            updateUIByPermissions();
            showMainContent();
            errorDiv.style.display = 'none';
        } else {
            let errorMessage = result.message || '登录失败';
            // 如果是账号过期，显示更友好的提示
            if (errorMessage.includes('账号已过期') || errorMessage.includes('过期')) {
                errorMessage = '账号已过期，请联系管理员重新授权。\n管理员微信：yyongzf8';
            }
            errorDiv.innerHTML = errorMessage.replace(/\n/g, '<br>');
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = '登录失败: ' + error.message;
        errorDiv.style.display = 'block';
    }
}

// 登出
async function logout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        showLoginPage();
    } catch (error) {
        console.error('登出失败:', error);
        showLoginPage();
    }
}

// 加载用户列表
async function loadUsers() {
    try {
        const response = await fetch('/api/users', {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            displayUsersList(result.data);
        }
    } catch (error) {
        console.error('加载用户列表失败:', error);
    }
}

// 显示用户列表
function displayUsersList(users) {
    const listDiv = document.getElementById('users-list');
    let html = '<div class="table-responsive"><table class="table table-striped table-hover">';
    html += '<thead><tr><th>ID</th><th>用户名</th><th>角色</th><th>状态</th><th>有效期</th><th>创建时间</th><th>操作</th></tr></thead><tbody>';
    
    users.forEach(user => {
        const roleBadge = user.role === 'admin' ? '<span class="badge bg-danger">管理员</span>' : '<span class="badge bg-secondary">普通用户</span>';
        const statusBadge = user.is_active ? '<span class="badge bg-success">启用</span>' : '<span class="badge bg-danger">禁用</span>';
        const validUntil = user.valid_until ? new Date(
            user.valid_until.substring(0,4) + '-' + 
            user.valid_until.substring(4,6) + '-' + 
            user.valid_until.substring(6,8) + 'T' +
            user.valid_until.substring(8,10) + ':' +
            user.valid_until.substring(10,12) + ':' +
            user.valid_until.substring(12,14)
        ).toLocaleString('zh-CN') : '永久';
        const createdAt = new Date(
            user.created_at.substring(0,4) + '-' + 
            user.created_at.substring(4,6) + '-' + 
            user.created_at.substring(6,8) + 'T' +
            user.created_at.substring(8,10) + ':' +
            user.created_at.substring(10,12) + ':' +
            user.created_at.substring(12,14)
        ).toLocaleString('zh-CN');
        
        html += `<tr>
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${roleBadge}</td>
            <td>${statusBadge}</td>
            <td>${validUntil}</td>
            <td>${createdAt}</td>
            <td>
                ${user.role !== 'admin' ? `<button class="btn btn-sm btn-info" onclick="showPermissionModal(${user.id})">权限</button>` : '<span class="badge bg-success">全部权限</span>'}
                <button class="btn btn-sm btn-warning" onclick="showEditUserModal(${user.id})">编辑</button>
                ${user.id !== currentUser.id ? `<button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">删除</button>` : ''}
            </td>
        </tr>`;
    });
    
    html += '</tbody></table></div>';
    listDiv.innerHTML = html;
}

// 显示添加用户模态框
function showAddUserModal() {
    document.getElementById('add-username').value = '';
    document.getElementById('add-password').value = '';
    document.getElementById('add-role').value = 'user';
    document.getElementById('add-valid-until').value = '';
    const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
    modal.show();
}

// 添加用户
async function addUser() {
    const username = document.getElementById('add-username').value.trim();
    const password = document.getElementById('add-password').value;
    const role = document.getElementById('add-role').value;
    const validUntil = document.getElementById('add-valid-until').value;
    
    if (!username || !password) {
        alert('用户名和密码不能为空');
        return;
    }
    
    // 转换日期格式
    let validUntilFormatted = null;
    if (validUntil) {
        const date = new Date(validUntil);
        validUntilFormatted = date.getFullYear().toString() + 
                            (date.getMonth() + 1).toString().padStart(2, '0') +
                            date.getDate().toString().padStart(2, '0') +
                            date.getHours().toString().padStart(2, '0') +
                            date.getMinutes().toString().padStart(2, '0') +
                            date.getSeconds().toString().padStart(2, '0');
    }
    
    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                username,
                password,
                role,
                valid_until: validUntilFormatted
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('用户添加成功');
            bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();
            loadUsers();
        } else {
            alert('添加用户失败: ' + result.message);
        }
    } catch (error) {
        alert('添加用户失败: ' + error.message);
    }
}

// 编辑用户（使用模态框）
let currentEditUserId = null;

async function showEditUserModal(userId) {
    currentEditUserId = userId;
    
    try {
        // 获取用户信息
        const response = await fetch(`/api/users/${userId}`, {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            const user = result.data;
            
            // 填充表单
            document.getElementById('edit-username').value = user.username || '';
            document.getElementById('edit-password').value = '';
            document.getElementById('edit-role').value = user.role || 'user';
            document.getElementById('edit-is-active').checked = user.is_active !== false;
            
            // 处理有效期
            if (user.valid_until) {
                const dateStr = user.valid_until;
                // 格式：YYYYMMDDHHMMSS -> YYYY-MM-DDTHH:MM
                const year = dateStr.substring(0, 4);
                const month = dateStr.substring(4, 6);
                const day = dateStr.substring(6, 8);
                const hour = dateStr.substring(8, 10);
                const minute = dateStr.substring(10, 12);
                document.getElementById('edit-valid-until').value = `${year}-${month}-${day}T${hour}:${minute}`;
            } else {
                document.getElementById('edit-valid-until').value = '';
            }
            
            // 显示模态框
            const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
            modal.show();
        } else {
            alert('获取用户信息失败: ' + result.message);
        }
    } catch (error) {
        alert('获取用户信息失败: ' + error.message);
    }
}

// 更新用户
async function updateUser() {
    if (!currentEditUserId) {
        return;
    }
    
    const username = document.getElementById('edit-username').value.trim();
    const password = document.getElementById('edit-password').value;
    const role = document.getElementById('edit-role').value;
    const isActive = document.getElementById('edit-is-active').checked;
    const validUntil = document.getElementById('edit-valid-until').value;
    
    if (!username) {
        alert('用户名不能为空');
        return;
    }
    
    // 转换日期格式
    let validUntilFormatted = null;
    if (validUntil) {
        const date = new Date(validUntil);
        validUntilFormatted = date.getFullYear().toString() + 
                            (date.getMonth() + 1).toString().padStart(2, '0') +
                            date.getDate().toString().padStart(2, '0') +
                            date.getHours().toString().padStart(2, '0') +
                            date.getMinutes().toString().padStart(2, '0') +
                            date.getSeconds().toString().padStart(2, '0');
    }
    
    try {
        const updateData = {
            username: username,
            role: role,
            is_active: isActive
        };
        
        // 只有输入了密码才更新
        if (password) {
            updateData.password = password;
        }
        
        if (validUntilFormatted) {
            updateData.valid_until = validUntilFormatted;
        } else {
            updateData.valid_until = null;
        }
        
        const response = await fetch(`/api/users/${currentEditUserId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('用户信息已更新');
            bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
            loadUsers();
        } else {
            alert('更新用户失败: ' + result.message);
        }
    } catch (error) {
        alert('更新用户失败: ' + error.message);
    }
}

// 删除用户
async function deleteUser(userId) {
    if (!confirm('确定要删除该用户吗？此操作不可恢复！')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('用户已删除');
            loadUsers();
        } else {
            alert('删除用户失败: ' + result.message);
        }
    } catch (error) {
        alert('删除用户失败: ' + error.message);
    }
}

// 修改密码（用户管理页面，管理员使用）
async function changePassword() {
    const oldPassword = document.getElementById('old-password').value;
    const newPassword = document.getElementById('new-password').value;
    
    if (!oldPassword || !newPassword) {
        alert('请输入旧密码和新密码');
        return;
    }
    
    // 验证密码强度
    const strengthResult = validatePasswordStrength(newPassword);
    if (!strengthResult.valid) {
        alert('密码强度不足：' + strengthResult.message);
        return;
    }
    
    try {
        const response = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                old_password: oldPassword,
                new_password: newPassword
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('密码修改成功');
            document.getElementById('old-password').value = '';
            document.getElementById('new-password').value = '';
        } else {
            alert('修改密码失败: ' + result.message);
        }
    } catch (error) {
        alert('修改密码失败: ' + error.message);
    }
}

// 修改账户密码（账户设置页面，所有用户使用）
async function changeAccountPassword() {
    const oldPassword = document.getElementById('account-old-password').value;
    const newPassword = document.getElementById('account-new-password').value;
    const confirmPassword = document.getElementById('account-confirm-password').value;
    
    if (!oldPassword || !newPassword || !confirmPassword) {
        alert('请填写所有密码字段');
        return;
    }
    
    // 验证两次密码是否一致
    if (newPassword !== confirmPassword) {
        document.getElementById('password-match-error').style.display = 'block';
        return;
    } else {
        document.getElementById('password-match-error').style.display = 'none';
    }
    
    // 验证密码强度
    const strengthResult = validatePasswordStrength(newPassword);
    if (!strengthResult.valid) {
        alert('密码强度不足：' + strengthResult.message);
        return;
    }
    
    try {
        const response = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                old_password: oldPassword,
                new_password: newPassword
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('密码修改成功，请重新登录');
            // 清空表单
            document.getElementById('account-old-password').value = '';
            document.getElementById('account-new-password').value = '';
            document.getElementById('account-confirm-password').value = '';
            document.getElementById('password-strength').innerHTML = '';
            // 可选：自动登出
            // logout();
        } else {
            alert('修改密码失败: ' + result.message);
        }
    } catch (error) {
        alert('修改密码失败: ' + error.message);
    }
}

// 验证密码强度
function validatePasswordStrength(password) {
    if (!password) {
        return { valid: false, message: '密码不能为空' };
    }
    
    if (password.length < 8) {
        return { valid: false, message: '密码长度至少8位' };
    }
    
    // 检查是否包含字母和数字
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    if (!hasLetter || !hasNumber) {
        return { valid: false, message: '密码必须包含字母和数字' };
    }
    
    return { valid: true, message: '密码强度良好' };
}

// 实时显示密码强度
function initPasswordStrengthIndicator() {
    const passwordInput = document.getElementById('account-new-password');
    const strengthDiv = document.getElementById('password-strength');
    
    if (passwordInput && strengthDiv) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            if (!password) {
                strengthDiv.innerHTML = '';
                return;
            }
            
            let strength = 0;
            let feedback = [];
            
            if (password.length >= 8) {
                strength++;
            } else {
                feedback.push('长度至少8位');
            }
            
            if (/[a-z]/.test(password)) {
                strength++;
            } else {
                feedback.push('包含小写字母');
            }
            
            if (/[A-Z]/.test(password)) {
                strength++;
            } else {
                feedback.push('包含大写字母');
            }
            
            if (/[0-9]/.test(password)) {
                strength++;
            } else {
                feedback.push('包含数字');
            }
            
            if (/[^a-zA-Z0-9]/.test(password)) {
                strength++;
            } else {
                feedback.push('包含特殊字符');
            }
            
            let strengthText = '';
            let strengthClass = '';
            
            if (strength <= 2) {
                strengthText = '弱';
                strengthClass = 'text-danger';
            } else if (strength <= 3) {
                strengthText = '中';
                strengthClass = 'text-warning';
            } else {
                strengthText = '强';
                strengthClass = 'text-success';
            }
            
            strengthDiv.innerHTML = `<span class="${strengthClass}">密码强度: ${strengthText}</span> ${feedback.length > 0 ? '<br><small class="text-muted">建议：' + feedback.slice(0, 2).join('、') + '</small>' : ''}`;
        });
    }
}

// 加载系统配置
async function loadSystemConfig() {
    try {
        const response = await fetch('/api/system/config', {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('session-duration').value = result.data.session_duration_hours;
        }
    } catch (error) {
        console.error('加载系统配置失败:', error);
    }
}

// 保存系统配置
async function saveSystemConfig() {
    const sessionDuration = parseInt(document.getElementById('session-duration').value);
    
    if (!sessionDuration || sessionDuration < 1 || sessionDuration > 8760) {
        alert('会话时长必须在1-8760小时之间');
        return;
    }
    
    try {
        const response = await fetch('/api/system/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                session_duration_hours: sessionDuration
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('系统配置已保存');
        } else {
            alert('保存系统配置失败: ' + result.message);
        }
    } catch (error) {
        alert('保存系统配置失败: ' + error.message);
    }
}

// 权限管理
let currentPermissionUserId = null;

// 显示权限管理模态框
async function showPermissionModal(userId) {
    currentPermissionUserId = userId;
    
    try {
        // 获取所有权限列表
        const permissionsResponse = await fetch('/api/permissions', {
            credentials: 'include'
        });
        const permissionsResult = await permissionsResponse.json();
        
        // 获取用户当前权限
        const userPermResponse = await fetch(`/api/users/${userId}/permissions`, {
            credentials: 'include'
        });
        const userPermResult = await userPermResponse.json();
        
        if (permissionsResult.success && userPermResult.success) {
            const allPermissions = permissionsResult.data;
            const userPermissions = userPermResult.data || [];
            
            // 获取用户名
            const usersResponse = await fetch('/api/users', {
                credentials: 'include'
            });
            const usersResult = await usersResponse.json();
            const user = usersResult.data.find(u => u.id === userId);
            const username = user ? user.username : '未知用户';
            
            document.getElementById('permission-username').textContent = username;
            
            // 显示权限列表
            let html = '<div class="list-group">';
            allPermissions.forEach(perm => {
                const isChecked = userPermissions.includes(perm.code);
                html += `
                    <div class="list-group-item">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" 
                                   id="perm-${perm.code}" 
                                   value="${perm.code}" 
                                   ${isChecked ? 'checked' : ''}>
                            <label class="form-check-label" for="perm-${perm.code}">
                                <strong>${perm.name}</strong>
                                <br><small class="text-muted">${perm.description}</small>
                            </label>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            
            document.getElementById('permissions-list').innerHTML = html;
            
            const modal = new bootstrap.Modal(document.getElementById('permissionModal'));
            modal.show();
        }
    } catch (error) {
        alert('加载权限失败: ' + error.message);
    }
}

// 保存权限
async function savePermissions() {
    if (!currentPermissionUserId) {
        return;
    }
    
    const checkboxes = document.querySelectorAll('#permissions-list input[type="checkbox"]');
    const selectedPermissions = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    
    try {
        const response = await fetch(`/api/users/${currentPermissionUserId}/permissions`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                permissions: selectedPermissions
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('权限已保存');
            bootstrap.Modal.getInstance(document.getElementById('permissionModal')).hide();
            loadUsers(); // 重新加载用户列表
        } else {
            alert('保存权限失败: ' + result.message);
        }
    } catch (error) {
        alert('保存权限失败: ' + error.message);
    }
}

// ========== 公告管理 ==========

// 加载首页公告列表
async function loadAnnouncements() {
    try {
        const response = await fetch('/api/announcements?limit=10', {
            credentials: 'include'
        });
        const result = await response.json();
        if (result.success) {
            const announcements = result.data;
            const container = document.getElementById('announcements-list');
            
            if (announcements.length === 0) {
                container.innerHTML = '<div class="text-center text-muted py-4"><i class="bi bi-inbox"></i> 暂无公告</div>';
                return;
            }
            
            let html = '';
            announcements.forEach(announcement => {
                const date = formatDateTime(announcement.created_at);
                const pinnedBadge = announcement.is_pinned ? '<span class="badge bg-danger ms-2">置顶</span>' : '';
                html += `
                    <div class="card mb-3 ${announcement.is_pinned ? 'border-danger' : ''}">
                        <div class="card-header ${announcement.is_pinned ? 'bg-danger text-white' : 'bg-light'}">
                            <h6 class="mb-0">
                                ${announcement.is_pinned ? '<i class="bi bi-pin-angle-fill"></i> ' : ''}
                                ${announcement.title}
                                ${pinnedBadge}
                            </h6>
                            <small class="text-muted">${date} | 发布者: ${announcement.created_by_name}</small>
                        </div>
                        <div class="card-body">
                            <p class="card-text">${announcement.content.replace(/\n/g, '<br>')}</p>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        } else {
            document.getElementById('announcements-list').innerHTML = 
                '<div class="alert alert-danger">加载公告失败: ' + (result.message || '未知错误') + '</div>';
        }
    } catch (error) {
        console.error('Error loading announcements:', error);
        document.getElementById('announcements-list').innerHTML = 
            '<div class="alert alert-danger">加载公告失败</div>';
    }
}

// 加载公告管理列表（管理员）
async function loadAnnouncementsManagement() {
    if (!currentUser || currentUser.role !== 'admin') {
        return;
    }
    try {
        const response = await fetch('/api/announcements/all', {
            credentials: 'include'
        });
        const result = await response.json();
        if (result.success) {
            const announcements = result.data;
            const container = document.getElementById('announcements-management-list');
            
            if (announcements.length === 0) {
                container.innerHTML = '<div class="text-center text-muted py-3"><i class="bi bi-inbox"></i> 暂无公告</div>';
                return;
            }
            
            let html = '<div class="table-responsive"><table class="table table-hover">';
            html += '<thead><tr><th>标题</th><th>发布时间</th><th>发布者</th><th>状态</th><th>操作</th></tr></thead><tbody>';
            
            announcements.forEach(announcement => {
                const date = formatDateTime(announcement.created_at);
                const pinnedBadge = announcement.is_pinned ? 
                    '<span class="badge bg-danger">置顶</span>' : 
                    '<span class="badge bg-secondary">普通</span>';
                html += `
                    <tr>
                        <td>${announcement.title}</td>
                        <td>${date}</td>
                        <td>${announcement.created_by_name}</td>
                        <td>${pinnedBadge}</td>
                        <td>
                            <button class="btn btn-sm btn-primary" onclick="editAnnouncement(${announcement.id})">
                                <i class="bi bi-pencil"></i> 编辑
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteAnnouncement(${announcement.id})">
                                <i class="bi bi-trash"></i> 删除
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table></div>';
            container.innerHTML = html;
        } else {
            document.getElementById('announcements-management-list').innerHTML = 
                '<div class="alert alert-danger">加载公告失败: ' + (result.message || '未知错误') + '</div>';
        }
    } catch (error) {
        console.error('Error loading announcements management:', error);
        document.getElementById('announcements-management-list').innerHTML = 
            '<div class="alert alert-danger">加载公告失败</div>';
    }
}

// 显示公告编辑模态框
function showAnnouncementModal(announcementId = null) {
    const modal = new bootstrap.Modal(document.getElementById('announcementModal'));
    const titleEl = document.getElementById('announcementModalTitle');
    const form = document.getElementById('announcementForm');
    
    // 重置表单
    form.reset();
    document.getElementById('announcement-id').value = '';
    
    if (announcementId) {
        // 编辑模式
        titleEl.textContent = '编辑公告';
        loadAnnouncementForEdit(announcementId);
    } else {
        // 新建模式
        titleEl.textContent = '发布公告';
    }
    
    modal.show();
}

// 加载公告用于编辑
async function loadAnnouncementForEdit(announcementId) {
    try {
        const response = await fetch('/api/announcements/all', {
            credentials: 'include'
        });
        const result = await response.json();
        if (result.success) {
            const announcement = result.data.find(a => a.id === announcementId);
            if (announcement) {
                document.getElementById('announcement-id').value = announcement.id;
                document.getElementById('announcement-title').value = announcement.title;
                document.getElementById('announcement-content').value = announcement.content;
                document.getElementById('announcement-pinned').checked = announcement.is_pinned;
            }
        }
    } catch (error) {
        console.error('Error loading announcement for edit:', error);
        alert('加载公告失败');
    }
}

// 保存公告
async function saveAnnouncement() {
    const title = document.getElementById('announcement-title').value.trim();
    const content = document.getElementById('announcement-content').value.trim();
    const isPinned = document.getElementById('announcement-pinned').checked;
    const announcementId = document.getElementById('announcement-id').value;
    
    if (!title || !content) {
        alert('标题和内容不能为空');
        return;
    }
    
    try {
        const url = announcementId ? 
            `/api/announcements/${announcementId}` : 
            '/api/announcements';
        const method = announcementId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                title: title,
                content: content,
                is_pinned: isPinned
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: '请求失败' }));
            throw new Error(errorData.detail || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        if (result.success) {
            alert('公告保存成功');
            bootstrap.Modal.getInstance(document.getElementById('announcementModal')).hide();
            loadAnnouncementsManagement();
            loadAnnouncements(); // 刷新首页公告
        } else {
            alert('保存失败: ' + (result.message || result.detail || '未知错误'));
        }
    } catch (error) {
        console.error('保存公告错误:', error);
        alert('保存失败: ' + (error.message || '未知错误'));
    }
}

// 编辑公告
function editAnnouncement(announcementId) {
    showAnnouncementModal(announcementId);
}

// 删除公告
async function deleteAnnouncement(announcementId) {
    if (!confirm('确定要删除这条公告吗？')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/announcements/${announcementId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const result = await response.json();
        if (result.success) {
            alert('公告删除成功');
            loadAnnouncementsManagement();
            loadAnnouncements(); // 刷新首页公告
        } else {
            alert('删除失败: ' + (result.message || '未知错误'));
        }
    } catch (error) {
        alert('删除失败: ' + error.message);
    }
}

// 格式化日期时间
function formatDateTime(dateStr) {
    if (!dateStr) return '';
    try {
        // 格式: YYYYMMDDHHmmss
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const hour = dateStr.substring(8, 10);
        const minute = dateStr.substring(10, 12);
        return `${year}-${month}-${day} ${hour}:${minute}`;
    } catch (e) {
        return dateStr;
    }
}

