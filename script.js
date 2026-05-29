document.addEventListener('DOMContentLoaded', () => {
    // ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
    let suppliersData = [
        { id: 1, name: "ООО 'Альфа'", avgPrice: 150.50, avgDelivery: 5, missedDeadlines: 10, rating: 4.2, category: "electronics", branch: "филиал-москва", date: null, priceHistory: [145, 148, 150.5, 152, 151] },
        { id: 2, name: "ИП 'Бета'", avgPrice: 130.20, avgDelivery: 7, missedDeadlines: 5, rating: 4.8, category: "home-appliances", branch: "филиал-питер", date: null, priceHistory: [128, 129, 130.2, 131, 130.5] },
        { id: 3, name: "ООО 'Гамма'", avgPrice: 170.00, avgDelivery: 3, missedDeadlines: 15, rating: 3.5, category: "electronics", branch: "филиал-москва", date: null, priceHistory: [165, 168, 170, 172, 171] },
        { id: 4, name: "ООО 'Дельта'", avgPrice: 140.00, avgDelivery: 6, missedDeadlines: 8, rating: 4.0, category: "stationery", branch: "филиал-новосибирск", date: null, priceHistory: [138, 139, 140, 141, 140.5] },
        { id: 5, name: "ИП 'Эпсилон'", avgPrice: 160.00, avgDelivery: 4, missedDeadlines: 12, rating: 3.8, category: "home-appliances", branch: "филиал-питер", date: null, priceHistory: [158, 159, 160, 161, 160.5] }
    ];
    
    // Автоматическое обновление дат поставщиков на текущую дату
    function updateSupplierDatesToCurrent() {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const currentDay = today.getDate();
        
        suppliersData.forEach((supplier, index) => {
            // Создаём дату: текущий год, текущий месяц, день = текущий день - index*2 (чтобы даты были разные)
            let day = currentDay - (index * 2);
            if (day < 1) day = 1 + index;
            const date = new Date(currentYear, currentMonth, day);
            supplier.date = date.toISOString().slice(0, 10);
        });
    }
    
    // Вызываем обновление дат
    updateSupplierDatesToCurrent();
    
    let budgetData = [
        { branch: "филиал-москва", period: "Январь", planned: 100000, actual: 95000, remaining: 5000, executionPercent: 95 },
        { branch: "филиал-москва", period: "Февраль", planned: 120000, actual: 130000, remaining: -10000, executionPercent: 108.3 },
        { branch: "филиал-москва", period: "Март", planned: 110000, actual: 105000, remaining: 5000, executionPercent: 95.5 },
        { branch: "филиал-питер", period: "Январь", planned: 80000, actual: 78000, remaining: 2000, executionPercent: 97.5 },
        { branch: "филиал-питер", period: "Февраль", planned: 90000, actual: 85000, remaining: 5000, executionPercent: 94.4 },
        { branch: "филиал-питер", period: "Март", planned: 95000, actual: 92000, remaining: 3000, executionPercent: 96.8 },
        { branch: "филиал-новосибирск", period: "Январь", planned: 50000, actual: 48000, remaining: 2000, executionPercent: 96.0 },
        { branch: "филиал-новосибирск", period: "Февраль", planned: 60000, actual: 62000, remaining: -2000, executionPercent: 103.3 },
        { branch: "филиал-новосибирск", period: "Март", planned: 55000, actual: 53000, remaining: 2000, executionPercent: 96.4 }
    ];
    
    let nextId = 6;
    let autoRefreshInterval = null;
    let autoRefreshEnabled = true;
    let refreshCountdown = 120;  // 2 минуты
    
    const categoryNames = {
        "electronics": "Электроника",
        "home-appliances": "Бытовая техника",
        "stationery": "Канцтовары"
    };
    
    const branchNames = {
        "филиал-москва": "Филиал Москва",
        "филиал-питер": "Филиал Питер",
        "филиал-новосибирск": "Филиал Новосибирск"
    };
    
    const orderProposals = [
        { sku: "ELEC-001", name: "Смартфон XYZ", stock: 10, forecast: 25, inTransit: 5, recommended: 10, basis: "Прогноз+Запас" },
        { sku: "HOME-010", name: "Чайник", stock: 5, forecast: 15, inTransit: 0, recommended: 10, basis: "Прогноз" },
        { sku: "OFFICE-101", name: "Ручка синяя", stock: 100, forecast: 200, inTransit: 50, recommended: 50, basis: "Прогноз+Запас" }
    ];
    
    let chartInstances = {
        priceDelivery: null,
        priceTrend: null,
        topSuppliers: null,
        budgetExecution: null,
        budgetDistribution: null,
        budgetGauge: null,
        budgetForecast: null,
        missedForecast: null
    };
    
    let savedFilters = JSON.parse(localStorage.getItem('savedFilters') || '{}');
    let columnSettings = JSON.parse(localStorage.getItem('columnSettings') || '{"name":true,"price":true,"delivery":true,"missed":true,"rating":true,"category":true,"branch":true}');
    let currentTheme = localStorage.getItem('theme') || 'light';
    
    // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
    
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i> ${message}`;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    function showLoader(show = true) {
        const loader = document.getElementById('loader-overlay');
        if (loader) loader.style.display = show ? 'flex' : 'none';
    }
    
    function updateLastUpdateTime() {
        const timeSpan = document.getElementById('last-update-time');
        if (timeSpan) {
            timeSpan.textContent = new Date().toLocaleTimeString('ru-RU');
        }
    }
    
    function applyTheme() {
        if (currentTheme === 'dark') {
            document.body.classList.add('dark');
            const themeBtn = document.getElementById('theme-toggle');
            if (themeBtn) themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            document.body.classList.remove('dark');
            const themeBtn = document.getElementById('theme-toggle');
            if (themeBtn) themeBtn.innerHTML = '<i class="fas fa-moon"></i>';
        }
    }
    
    // ========== АВТООБНОВЛЕНИЕ ==========
    
    function startAutoRefresh() {
        if (autoRefreshInterval) clearInterval(autoRefreshInterval);
        
        autoRefreshInterval = setInterval(() => {
            if (!autoRefreshEnabled) return;
            
            refreshCountdown--;
            const indicator = document.getElementById('auto-refresh-indicator');
            const countdownSpan = document.getElementById('auto-refresh-countdown');
            
            if (indicator && countdownSpan) {
                indicator.classList.add('visible');
                countdownSpan.textContent = refreshCountdown;
            }
            
            if (refreshCountdown <= 0) {
                refreshData();
                refreshCountdown = 120;
            }
        }, 1000);
    }
    
    function refreshData() {
        showLoader(true);
        setTimeout(() => {
            const activePage = document.querySelector('.page.active');
            const pageId = activePage?.id;
            
            if (pageId === 'supplier-analytics') {
                applyFiltersAndRender();
                updateCharts();
                renderTopSuppliersChart();
                renderPriceTrendChart();
            } else if (pageId === 'budget-pf') {
                const branch = document.getElementById('budget-branch').value;
                renderBudgetDetailTable(branch === 'all' ? budgetData : budgetData.filter(b => b.branch === branch));
                renderBudgetExecutionChart(branch);
                renderBudgetDistributionChart();
                renderBudgetGaugeChart();
            } else if (pageId === 'order-recommendations') {
                renderOrderProposalTable(orderProposals);
            } else if (pageId === 'forecast') {
                calculateForecast();
                renderBudgetForecastChart();
                renderMissedForecastChart();
                calculateROI();
            }
            
            updateLastUpdateTime();
            showLoader(false);
            showNotification('Данные обновлены', 'success');
        }, 500);
    }
    
    document.getElementById('cancel-auto-refresh')?.addEventListener('click', () => {
        autoRefreshEnabled = false;
        const indicator = document.getElementById('auto-refresh-indicator');
        if (indicator) indicator.classList.remove('visible');
        showNotification('Автообновление отключено на 5 минут', 'info');
        setTimeout(() => { 
            autoRefreshEnabled = true;
            showNotification('Автообновление включено', 'success');
        }, 300000);
    });
    
    // ========== ГОРЯЧИЕ КЛАВИШИ ==========
    
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'e') {
            e.preventDefault();
            document.getElementById('global-export-excel-btn')?.click();
        }
        if (e.ctrlKey && e.shiftKey && e.key === 'S') {
            e.preventDefault();
            document.getElementById('transfer-to-1c')?.click();
        }
    });
    
    // ========== ТЕМА ==========
    
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', currentTheme);
        applyTheme();
        showNotification(`${currentTheme === 'dark' ? 'Тёмная' : 'Светлая'} тема активирована`, 'success');
    });
    
    // ========== СОРТИРОВКА ТАБЛИЦ ==========
    
    function makeTableSortable(tableId) {
        const table = document.querySelector(tableId);
        if (!table) return;
        const headers = table.querySelectorAll('th.sortable-header');
        headers.forEach((header, index) => {
            const newHeader = header.cloneNode(true);
            header.parentNode.replaceChild(newHeader, header);
            newHeader.addEventListener('click', () => {
                const tbody = table.querySelector('tbody');
                const rows = Array.from(tbody.querySelectorAll('tr'));
                const isAsc = newHeader.classList.contains('asc');
                document.querySelectorAll(`${tableId} th.sortable-header`).forEach(h => h.classList.remove('asc', 'desc'));
                if (!isAsc) newHeader.classList.add('asc');
                else newHeader.classList.add('desc');
                rows.sort((a, b) => {
                    let aVal = a.cells[index]?.innerText.trim().replace('%', '') || '';
                    let bVal = b.cells[index]?.innerText.trim().replace('%', '') || '';
                    const aNum = parseFloat(aVal);
                    const bNum = parseFloat(bVal);
                    if (!isNaN(aNum) && !isNaN(bNum)) return isAsc ? aNum - bNum : bNum - aNum;
                    return isAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                });
                rows.forEach(row => tbody.appendChild(row));
                showNotification('Сортировка применена', 'success');
            });
        });
    }
    
    // ========== НАСТРОЙКА СТОЛБЦОВ ==========
    
    function applyColumnSettings() {
        const columns = ['name', 'price', 'delivery', 'missed', 'rating', 'category', 'branch'];
        columns.forEach((col, idx) => {
            const cells = document.querySelectorAll(`#supplier-kpi-table th.column-toggle[data-col="${col}"], #supplier-kpi-table td:nth-child(${idx + 1})`);
            const isVisible = columnSettings[col];
            cells.forEach(cell => {
                if (cell) cell.style.display = isVisible ? '' : 'none';
            });
        });
    }
    
    document.getElementById('toggle-supplier-columns')?.addEventListener('click', () => {
        const modal = document.getElementById('column-settings-modal');
        const list = document.getElementById('column-settings-list');
        if (list) {
            list.innerHTML = `
                <label><input type="checkbox" data-col="name" ${columnSettings.name ? 'checked' : ''}> Поставщик</label><br>
                <label><input type="checkbox" data-col="price" ${columnSettings.price ? 'checked' : ''}> Средняя цена</label><br>
                <label><input type="checkbox" data-col="delivery" ${columnSettings.delivery ? 'checked' : ''}> Срок поставки</label><br>
                <label><input type="checkbox" data-col="missed" ${columnSettings.missed ? 'checked' : ''}> % Просрочек</label><br>
                <label><input type="checkbox" data-col="rating" ${columnSettings.rating ? 'checked' : ''}> Рейтинг</label><br>
                <label><input type="checkbox" data-col="category" ${columnSettings.category ? 'checked' : ''}> Категория</label><br>
                <label><input type="checkbox" data-col="branch" ${columnSettings.branch ? 'checked' : ''}> Филиал</label>
            `;
        }
        modal.classList.add('active');
    });
    
    document.getElementById('save-column-settings')?.addEventListener('click', () => {
        document.querySelectorAll('#column-settings-list input').forEach(input => {
            columnSettings[input.dataset.col] = input.checked;
        });
        localStorage.setItem('columnSettings', JSON.stringify(columnSettings));
        applyColumnSettings();
        document.getElementById('column-settings-modal').classList.remove('active');
        showNotification('Настройки столбцов сохранены', 'success');
    });
    
    document.getElementById('reset-column-settings')?.addEventListener('click', () => {
        columnSettings = { name: true, price: true, delivery: true, missed: true, rating: true, category: true, branch: true };
        localStorage.setItem('columnSettings', JSON.stringify(columnSettings));
        applyColumnSettings();
        document.getElementById('column-settings-modal').classList.remove('active');
        showNotification('Настройки столбцов сброшены', 'success');
    });
    
    document.getElementById('close-column-modal')?.addEventListener('click', () => {
        document.getElementById('column-settings-modal').classList.remove('active');
    });
    
    // ========== ДЕТАЛЬНАЯ КАРТОЧКА ПОСТАВЩИКА ==========
    
    function showSupplierDetail(supplier) {
        const modal = document.getElementById('supplier-detail-modal');
        const content = document.getElementById('supplier-detail-content');
        if (content) {
            content.innerHTML = `
                <div style="text-align: center;">
                    <i class="fas fa-building" style="font-size: 3em; color: var(--accent-blue);"></i>
                    <h2>${supplier.name}</h2>
                </div>
                <table style="width:100%; margin-top:15px;">
                    <tr><td><strong>Средняя цена:</strong></td><td>${supplier.avgPrice.toFixed(2)} ₽</td></tr>
                    <tr><td><strong>Срок поставки:</strong></td><td>${supplier.avgDelivery} дней</td></tr>
                    <tr><td><strong>% просрочек:</strong></td><td>${supplier.missedDeadlines}%</td></tr>
                    <tr><td><strong>Рейтинг:</strong></td><td>${supplier.rating} / 5</td></tr>
                    <tr><td><strong>Категория:</strong></td><td>${categoryNames[supplier.category]}</td></tr>
                    <tr><td><strong>Филиал:</strong></td><td>${branchNames[supplier.branch]}</td></tr>
                    <tr><td><strong>Дата активности:</strong></td><td>${supplier.date || 'не указана'}</td></tr>
                </table>
                <div style="margin-top:15px; padding:10px; background:var(--bg-primary); border-radius:8px;">
                    <strong>Динамика цен:</strong>
                    <canvas id="detail-price-chart" height="100"></canvas>
                </div>
            `;
            setTimeout(() => {
                const canvas = document.getElementById('detail-price-chart');
                if (canvas && supplier.priceHistory) {
                    const ctx = canvas.getContext('2d');
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: ['Месяц 1', 'Месяц 2', 'Месяц 3', 'Месяц 4', 'Месяц 5'],
                            datasets: [{ label: 'Цена', data: supplier.priceHistory, borderColor: '#3498db', tension: 0.3 }]
                        },
                        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
                    });
                }
            }, 100);
        }
        modal.classList.add('active');
    }
    
    document.getElementById('close-detail-modal')?.addEventListener('click', () => {
        document.getElementById('supplier-detail-modal').classList.remove('active');
    });
    
    // ========== РЕНДЕР ТАБЛИЦЫ ПОСТАВЩИКОВ ==========
    
    function renderSupplierTable(data) {
        const tableBody = document.querySelector('#supplier-kpi-table tbody');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        
        data.forEach(supplier => {
            const row = document.createElement('tr');
            row.dataset.id = supplier.id;
            row.style.cursor = 'pointer';
            row.innerHTML = `
                <td class="column-toggle" data-col="name" style="${!columnSettings.name ? 'display:none' : ''}">${supplier.name}</td>
                <td class="column-toggle" data-col="price" style="${!columnSettings.price ? 'display:none' : ''}">${supplier.avgPrice.toFixed(2)}</td>
                <td class="column-toggle" data-col="delivery" style="${!columnSettings.delivery ? 'display:none' : ''}">${supplier.avgDelivery}</td>
                <td class="column-toggle" data-col="missed" style="${!columnSettings.missed ? 'display:none' : ''}">${supplier.missedDeadlines}%</td>
                <td class="column-toggle" data-col="rating" style="${!columnSettings.rating ? 'display:none' : ''}">${supplier.rating}</td>
                <td class="column-toggle" data-col="category" style="${!columnSettings.category ? 'display:none' : ''}">${categoryNames[supplier.category]}</td>
                <td class="column-toggle" data-col="branch" style="${!columnSettings.branch ? 'display:none' : ''}">${branchNames[supplier.branch]}</td>
                <td class="supplier-actions">
                    <button class="edit-supplier-btn" data-id="${supplier.id}"><i class="fas fa-edit"></i></button>
                    <button class="delete-supplier-btn" data-id="${supplier.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            row.addEventListener('click', (e) => {
                if (!e.target.closest('.edit-supplier-btn') && !e.target.closest('.delete-supplier-btn')) {
                    showSupplierDetail(supplier);
                }
            });
            tableBody.appendChild(row);
        });
        
        document.querySelectorAll('.edit-supplier-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                editSupplier(parseInt(btn.dataset.id));
            });
        });
        
        document.querySelectorAll('.delete-supplier-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Удалить поставщика?')) {
                    suppliersData = suppliersData.filter(s => s.id !== parseInt(btn.dataset.id));
                    applyFiltersAndRender();
                    updateCharts();
                    showNotification('Поставщик удален', 'success');
                }
            });
        });
        
        makeTableSortable('#supplier-kpi-table');
    }
    
    function editSupplier(id) {
        const supplier = suppliersData.find(s => s.id === id);
        if (!supplier) return;
        
        const newName = prompt('Название поставщика:', supplier.name);
        if (newName && newName.trim()) supplier.name = newName.trim();
        const newPrice = prompt('Средняя цена:', supplier.avgPrice);
        if (newPrice && !isNaN(parseFloat(newPrice))) supplier.avgPrice = parseFloat(newPrice);
        const newDelivery = prompt('Срок поставки (дни):', supplier.avgDelivery);
        if (newDelivery && !isNaN(parseInt(newDelivery))) supplier.avgDelivery = parseInt(newDelivery);
        const newMissed = prompt('% просроченных:', supplier.missedDeadlines);
        if (newMissed && !isNaN(parseInt(newMissed))) supplier.missedDeadlines = parseInt(newMissed);
        const newRating = prompt('Рейтинг (1-5):', supplier.rating);
        if (newRating && !isNaN(parseFloat(newRating))) supplier.rating = parseFloat(newRating);
        
        applyFiltersAndRender();
        updateCharts();
        showNotification('Данные поставщика обновлены', 'success');
    }
    
    // ========== ФИЛЬТРАЦИЯ ПО ДАТАМ (ОСНОВНАЯ ЛОГИКА) ==========
    
    function getFilteredSuppliers() {
        const category = document.getElementById('supplier-category')?.value || 'all';
        const branch = document.getElementById('supplier-branch')?.value || 'all';
        const period = document.getElementById('supplier-period')?.value || 'month';
        const customDateFrom = document.getElementById('date-from')?.value;
        const customDateTo = document.getElementById('date-to')?.value;
        
        let filtered = [...suppliersData];
        
        // Фильтр по категории
        if (category !== 'all') {
            filtered = filtered.filter(s => s.category === category);
        }
        
        // Фильтр по филиалу
        if (branch !== 'all') {
            filtered = filtered.filter(s => s.branch === branch);
        }
        
        // Фильтр по датам
        const now = new Date();
        let startDate = null;
        let endDate = null;
        
        switch(period) {
            case 'month':
                startDate = new Date();
                startDate.setMonth(now.getMonth() - 1);
                endDate = now;
                break;
            case 'quarter':
                startDate = new Date();
                startDate.setMonth(now.getMonth() - 3);
                endDate = now;
                break;
            case 'year':
                startDate = new Date();
                startDate.setFullYear(now.getFullYear() - 1);
                endDate = now;
                break;
            case 'custom':
                if (customDateFrom) {
                    startDate = new Date(customDateFrom);
                    startDate.setHours(0, 0, 0, 0);
                }
                if (customDateTo) {
                    endDate = new Date(customDateTo);
                    endDate.setHours(23, 59, 59, 999);
                }
                break;
            default:
                startDate = new Date();
                startDate.setMonth(now.getMonth() - 1);
                endDate = now;
        }
        
        // Применяем фильтр по датам
        filtered = filtered.filter(s => {
            if (!s.date) return true;
            const supplierDate = new Date(s.date);
            
            if (startDate && endDate) {
                return supplierDate >= startDate && supplierDate <= endDate;
            } else if (startDate) {
                return supplierDate >= startDate;
            } else if (endDate) {
                return supplierDate <= endDate;
            }
            return true;
        });
        
        return filtered;
    }
    
    function applyFiltersAndRender() {
        const filtered = getFilteredSuppliers();
        renderSupplierTable(filtered);
        return filtered;
    }
    
    // ========== KPI КАРТОЧКИ ==========
    
    function renderSupplierKPICards(data) {
        const container = document.getElementById('supplier-kpi-cards');
        if (!container) return;
        
        if (data && data.length) {
            const totalSuppliers = data.length;
            const avgRating = (data.reduce((sum, s) => sum + s.rating, 0) / totalSuppliers).toFixed(1);
            const avgDelivery = (data.reduce((sum, s) => sum + s.avgDelivery, 0) / totalSuppliers).toFixed(1);
            const totalMissed = (data.reduce((sum, s) => sum + s.missedDeadlines, 0) / totalSuppliers).toFixed(1);
            
            const period = document.getElementById('supplier-period')?.value || 'month';
            const customFrom = document.getElementById('date-from')?.value;
            const customTo = document.getElementById('date-to')?.value;
            let periodText = '';
            
            switch(period) {
                case 'month': periodText = 'за последний месяц'; break;
                case 'quarter': periodText = 'за последний квартал'; break;
                case 'year': periodText = 'за последний год'; break;
                case 'custom': 
                    if (customFrom && customTo) periodText = `с ${customFrom} по ${customTo}`;
                    else if (customFrom) periodText = `с ${customFrom}`;
                    else if (customTo) periodText = `по ${customTo}`;
                    else periodText = 'за выбранный период';
                    break;
                default: periodText = '';
            }
            
            container.innerHTML = `
                <div class="kpi-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <i class="fas fa-users"></i><h4>Всего поставщиков ${periodText}</h4>
                    <div class="kpi-value">${totalSuppliers}</div>
                </div>
                <div class="kpi-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                    <i class="fas fa-star"></i><h4>Средний рейтинг</h4>
                    <div class="kpi-value">${avgRating}</div><div class="kpi-unit">из 5.0</div>
                </div>
                <div class="kpi-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                    <i class="fas fa-clock"></i><h4>Средний срок поставки</h4>
                    <div class="kpi-value">${avgDelivery}</div><div class="kpi-unit">дней</div>
                </div>
                <div class="kpi-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
                    <i class="fas fa-exclamation-triangle"></i><h4>Просрочки в среднем</h4>
                    <div class="kpi-value">${totalMissed}%</div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="kpi-card" style="background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);">
                    <i class="fas fa-info-circle"></i><h4>Нет данных</h4>
                    <div class="kpi-value">0</div>
                    <div class="kpi-unit">поставщиков</div>
                </div>
            `;
        }
    }
    
    function renderBudgetKPICards() {
        const container = document.getElementById('budget-kpi-cards');
        if (!container) return;
        
        const totalPlanned = budgetData.reduce((sum, i) => sum + i.planned, 0);
        const totalActual = budgetData.reduce((sum, i) => sum + i.actual, 0);
        const totalRemaining = totalPlanned - totalActual;
        const executionPercent = totalPlanned > 0 ? (totalActual / totalPlanned * 100).toFixed(1) : 0;
        
        container.innerHTML = `
            <div class="kpi-card" style="background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);">
                <i class="fas fa-chart-line"></i><h4>Всего запланировано</h4>
                <div class="kpi-value">${totalPlanned.toLocaleString('ru-RU')}</div>
            </div>
            <div class="kpi-card" style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);">
                <i class="fas fa-chart-line"></i><h4>Всего потрачено</h4>
                <div class="kpi-value">${totalActual.toLocaleString('ru-RU')}</div>
            </div>
            <div class="kpi-card" style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);">
                <i class="fas fa-chart-line"></i><h4>Остаток бюджета</h4>
                <div class="kpi-value">${totalRemaining.toLocaleString('ru-RU')}</div>
            </div>
            <div class="kpi-card" style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);">
                <i class="fas fa-chart-line"></i><h4>Исполнение</h4>
                <div class="kpi-value">${executionPercent}%</div>
            </div>
        `;
    }
    
    // ========== ГРАФИКИ ==========
    
    function renderPriceDeliveryChart(data) {
        const canvas = document.getElementById('price-delivery-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const scatterData = data.map(s => ({
            x: s.avgPrice, y: s.avgDelivery, r: s.missedDeadlines / 2,
            label: s.name, missed: s.missedDeadlines
        }));
        if (chartInstances.priceDelivery) chartInstances.priceDelivery.destroy();
        chartInstances.priceDelivery = new Chart(ctx, {
            type: 'bubble',
            data: { datasets: [{ label: 'Поставщики', data: scatterData, backgroundColor: 'rgba(54, 162, 235, 0.6)', borderColor: 'rgba(54, 162, 235, 1)', borderWidth: 1 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { tooltip: { callbacks: { label: function(context) { 
                    const point = context.raw;
                    return `${point.label} (Цена: ${point.x.toFixed(2)}, Срок: ${point.y} дн., Просрочено: ${point.missed}%)`;
                } } } },
                scales: { x: { title: { display: true, text: 'Средняя цена' } }, y: { title: { display: true, text: 'Средний срок поставки (дни)' } } }
            }
        });
    }
    
    function renderPriceTrendChart() {
        const canvas = document.getElementById('price-trend-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const months = ['Месяц 1', 'Месяц 2', 'Месяц 3', 'Месяц 4', 'Месяц 5'];
        const datasets = suppliersData.map(s => ({
            label: s.name,
            data: s.priceHistory || [s.avgPrice, s.avgPrice, s.avgPrice, s.avgPrice, s.avgPrice],
            borderColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
            tension: 0.3,
            fill: false
        }));
        if (chartInstances.priceTrend) chartInstances.priceTrend.destroy();
        chartInstances.priceTrend = new Chart(ctx, {
            type: 'line',
            data: { labels: months, datasets: datasets },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    
    function renderTopSuppliersChart() {
        const canvas = document.getElementById('top-suppliers-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const sorted = [...suppliersData].sort((a, b) => b.rating - a.rating).slice(0, 5);
        if (chartInstances.topSuppliers) chartInstances.topSuppliers.destroy();
        chartInstances.topSuppliers = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sorted.map(s => s.name),
                datasets: [{ label: 'Рейтинг', data: sorted.map(s => s.rating), backgroundColor: 'rgba(243, 156, 18, 0.7)' }]
            },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y' }
        });
    }
    
    function renderBudgetExecutionChart(branch) {
        const canvas = document.getElementById('budget-execution-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let filtered = branch === 'all' ? budgetData : budgetData.filter(b => b.branch === branch);
        const months = ["Январь", "Февраль", "Март"];
        const planned = [], actual = [], remaining = [];
        months.forEach(month => {
            const monthData = filtered.filter(item => item.period === month);
            if (monthData.length > 0) {
                planned.push(monthData.reduce((sum, item) => sum + item.planned, 0));
                actual.push(monthData.reduce((sum, item) => sum + item.actual, 0));
                remaining.push(monthData.reduce((sum, item) => sum + (item.planned - item.actual), 0));
            } else { planned.push(0); actual.push(0); remaining.push(0); }
        });
        if (chartInstances.budgetExecution) chartInstances.budgetExecution.destroy();
        chartInstances.budgetExecution = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    { label: 'Запланировано', data: planned, backgroundColor: 'rgba(54, 162, 235, 0.7)' },
                    { label: 'Фактически', data: actual, backgroundColor: 'rgba(255, 99, 132, 0.7)' },
                    { label: 'Остаток', data: remaining, type: 'line', borderColor: 'rgba(75, 192, 192, 1)', fill: false }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    
    function renderBudgetDistributionChart() {
        const canvas = document.getElementById('budget-distribution-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const branches = {};
        budgetData.forEach(item => { branches[item.branch] = (branches[item.branch] || 0) + item.planned; });
        if (chartInstances.budgetDistribution) chartInstances.budgetDistribution.destroy();
        chartInstances.budgetDistribution = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(branches).map(b => branchNames[b]),
                datasets: [{ data: Object.values(branches), backgroundColor: ['#3498db', '#e74c3c', '#2ecc71'] }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    
    function renderBudgetGaugeChart() {
        const canvas = document.getElementById('budget-gauge-chart');
        if (!canvas) return;
        
        canvas.style.width = '250px';
        canvas.style.height = '250px';
        
        const ctx = canvas.getContext('2d');
        const totalPlanned = budgetData.reduce((sum, i) => sum + i.planned, 0);
        const totalActual = budgetData.reduce((sum, i) => sum + i.actual, 0);
        const percent = totalPlanned > 0 ? (totalActual / totalPlanned * 100) : 0;
        
        if (chartInstances.budgetGauge) chartInstances.budgetGauge.destroy();
        chartInstances.budgetGauge = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Выполнено', 'Осталось'],
                datasets: [{ data: [percent, 100 - percent], backgroundColor: ['#2ecc71', '#e74c3c'] }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: true,
                aspectRatio: 1,
                cutout: '65%',
                plugins: { 
                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw.toFixed(1)}%` } },
                    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
                }
            }
        });
    }
    
    function renderBudgetDetailTable(data) {
        const tableBody = document.querySelector('#budget-detail-table tbody');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${branchNames[item.branch] || item.branch}</td><td>${item.period}</td><td>${item.planned.toLocaleString('ru-RU')}</td><td>${item.actual.toLocaleString('ru-RU')}</td><td>${item.remaining.toLocaleString('ru-RU')}</td><td>${item.executionPercent.toFixed(1)}%</td>`;
            tableBody.appendChild(row);
        });
        makeTableSortable('#budget-detail-table');
    }
    
    function renderOrderProposalTable(data) {
        const tableBody = document.querySelector('#order-proposal-table tbody');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        const multiplier = parseFloat(document.getElementById('forecast-multiplier')?.value || 1);
        const multiplierSpan = document.getElementById('multiplier-value');
        if (multiplierSpan) multiplierSpan.textContent = multiplier;
        
        data.forEach(item => {
            const adjustedForecast = Math.round(item.forecast * multiplier);
            const recommended = Math.max(0, adjustedForecast - item.stock - item.inTransit);
            const row = document.createElement('tr');
            row.innerHTML = `
                <tr>${item.name} (${item.sku})</td>
                <td>${item.stock}</td>
                <td>${adjustedForecast} <span style="font-size:0.7em;">(x${multiplier})</span></td>
                <td>${item.inTransit}</td>
                <td>${recommended}</td>
                <td><input type="number" value="${recommended}" min="0" style="width:70px;padding:4px;"></td>
                <td>${item.basis}</td>
            `;
            tableBody.appendChild(row);
        });
        makeTableSortable('#order-proposal-table');
    }
    
    document.getElementById('forecast-multiplier')?.addEventListener('input', (e) => {
        const multiplierSpan = document.getElementById('multiplier-value');
        if (multiplierSpan) multiplierSpan.textContent = e.target.value;
        renderOrderProposalTable(orderProposals);
    });
    
    // ========== ПРОГНОЗЫ ==========
    
    function calculateForecast() {
        const months = parseInt(document.getElementById('forecast-months')?.value || 6);
        const historicalData = budgetData.map(item => item.actual);
        const avg = historicalData.reduce((a, b) => a + b, 0) / historicalData.length;
        const trend = (historicalData[historicalData.length - 1] - historicalData[0]) / historicalData.length;
        const forecast = [];
        for (let i = 1; i <= months; i++) {
            forecast.push(Math.round(avg + trend * i));
        }
        return forecast;
    }
    
    function renderBudgetForecastChart() {
        const canvas = document.getElementById('budget-forecast-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const historical = budgetData.map(item => item.actual);
        const monthsCount = parseInt(document.getElementById('forecast-months')?.value || 6);
        const forecast = calculateForecast();
        const labels = [...budgetData.map((_, i) => `Месяц ${i + 1}`), ...Array(monthsCount).fill().map((_, i) => `Прогноз ${i + 1}`)];
        if (chartInstances.budgetForecast) chartInstances.budgetForecast.destroy();
        chartInstances.budgetForecast = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Исторические данные', data: [...historical, ...Array(monthsCount).fill(null)], borderColor: '#3498db', tension: 0.3 },
                    { label: 'Прогноз', data: [...Array(historical.length).fill(null), ...forecast], borderColor: '#e74c3c', borderDash: [5, 5], tension: 0.3 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    
    function renderMissedForecastChart() {
        const canvas = document.getElementById('missed-forecast-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const missedData = suppliersData.map(s => s.missedDeadlines);
        const avgMissed = missedData.reduce((a, b) => a + b, 0) / missedData.length;
        const forecast = Array(6).fill().map((_, i) => Math.min(30, Math.max(0, avgMissed + (i * 0.5))));
        if (chartInstances.missedForecast) chartInstances.missedForecast.destroy();
        chartInstances.missedForecast = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Текущий', 'Месяц 1', 'Месяц 2', 'Месяц 3', 'Месяц 4', 'Месяц 5', 'Месяц 6'],
                datasets: [{ label: 'Прогноз просрочек (%)', data: [avgMissed, ...forecast], borderColor: '#e74c3c', fill: true, backgroundColor: 'rgba(231, 76, 60, 0.1)' }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    
    function calculateROI() {
        const tableBody = document.querySelector('#roi-table tbody');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        suppliersData.forEach(supplier => {
            const roi = (supplier.rating * 20 - supplier.avgPrice / 10).toFixed(1);
            const status = roi > 50 ? '🟢 Высокая' : roi > 20 ? '🟡 Средняя' : '🔴 Низкая';
            const row = document.createElement('tr');
            row.innerHTML = `<td>${supplier.name}</td><td style="font-weight:bold;">${roi}%</td><td>${status}</td>`;
            tableBody.appendChild(row);
        });
    }
    
    document.getElementById('apply-forecast')?.addEventListener('click', () => {
        renderBudgetForecastChart();
        renderMissedForecastChart();
        showNotification('Прогноз рассчитан', 'success');
    });
    
    // ========== СРАВНЕНИЕ ПЕРИОДОВ ==========
    
    document.getElementById('compare-period-btn')?.addEventListener('click', () => {
        const currentTotal = budgetData.reduce((sum, i) => sum + i.actual, 0);
        const previousTotal = currentTotal * 0.92;
        const change = ((currentTotal - previousTotal) / previousTotal * 100).toFixed(1);
        showNotification(`Сравнение: текущий период vs прошлый: ${change > 0 ? '+' : ''}${change}%`, change > 0 ? 'success' : 'warning');
    });
    
    // ========== АНАЛИЗ "ЧТО ЕСЛИ" ==========
    
    document.getElementById('apply-whatif')?.addEventListener('click', () => {
        const newPlanned = parseFloat(document.getElementById('whatif-planned').value);
        if (isNaN(newPlanned)) { showNotification('Введите корректное значение', 'warning'); return; }
        const totalActual = budgetData.reduce((sum, i) => sum + i.actual, 0);
        const newRemaining = newPlanned - totalActual;
        const resultDiv = document.getElementById('whatif-result');
        if (resultDiv) {
            resultDiv.innerHTML = `
                <strong>Результат анализа:</strong><br>
                Новый план: ${newPlanned.toLocaleString('ru-RU')}<br>
                Текущие фактические: ${totalActual.toLocaleString('ru-RU')}<br>
                Новый остаток: ${newRemaining.toLocaleString('ru-RU')}<br>
                ${newRemaining >= 0 ? '✅ Бюджет сбалансирован' : '❌ Превышение бюджета!'}
            `;
        }
        showNotification('Анализ "что если" выполнен', 'success');
    });
    
    
    // ========== ЭКСПОРТ EXCEL ==========
    
    document.getElementById('global-export-excel-btn')?.addEventListener('click', () => {
        const activePage = document.querySelector('.page.active');
        const pageId = activePage?.id;
        let worksheetData = [];
        let sheetName = '';
        
        if (pageId === 'supplier-analytics') {
            const table = document.querySelector('#supplier-kpi-table');
            if (table) {
                const rows = table.querySelectorAll('tr');
                rows.forEach(row => {
                    const rowData = [];
                    row.querySelectorAll('th, td').forEach((cell, idx) => {
                        if (idx === 7) return;
                        let text = cell.innerText.trim();
                        text = text.replace(/[↓↑⇅]/g, '').trim();
                        if (text && !text.includes('Редактировать') && !text.includes('Удалить')) rowData.push(text);
                    });
                    if (rowData.length > 0) worksheetData.push(rowData);
                });
                sheetName = 'Аналитика_поставщиков';
            }
        } else if (pageId === 'budget-pf') {
            const table = document.querySelector('#budget-detail-table');
            if (table) {
                const rows = table.querySelectorAll('tr');
                rows.forEach(row => {
                    const rowData = [];
                    row.querySelectorAll('th, td').forEach(cell => {
                        let text = cell.innerText.trim();
                        text = text.replace(/[↓↑⇅]/g, '').trim();
                        if (text) rowData.push(text);
                    });
                    if (rowData.length > 0) worksheetData.push(rowData);
                });
                sheetName = 'План_факт_бюджета';
            }
        } else if (pageId === 'order-recommendations') {
            const table = document.querySelector('#order-proposal-table');
            if (table) {
                const rows = table.querySelectorAll('tr');
                rows.forEach(row => {
                    const rowData = [];
                    row.querySelectorAll('th, td').forEach((cell, idx) => {
                        if (idx === 5 && cell.querySelector('input')) rowData.push(cell.querySelector('input').value);
                        else { let text = cell.innerText.trim(); text = text.replace(/[↓↑⇅]/g, '').trim(); if (text) rowData.push(text); }
                    });
                    if (rowData.length > 0) worksheetData.push(rowData);
                });
                sheetName = 'Рекомендации_по_закупкам';
            }
        } else if (pageId === 'forecast') {
            const table = document.querySelector('#roi-table');
            if (table) {
                const rows = table.querySelectorAll('tr');
                rows.forEach(row => {
                    const rowData = [];
                    row.querySelectorAll('th, td').forEach(cell => rowData.push(cell.innerText.trim()));
                    if (rowData.length > 0) worksheetData.push(rowData);
                });
                sheetName = 'ROI_аналитика';
            }
        }
        
        if (worksheetData.length === 0) { showNotification('Нет данных для экспорта', 'warning'); return; }
        const ws = XLSX.utils.aoa_to_sheet(worksheetData);
        ws['!cols'] = worksheetData[0]?.map(() => ({ wch: 20 })) || [];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `${sheetName}_${new Date().toISOString().slice(0,19)}.xlsx`);
        showNotification(`✅ Экспорт "${sheetName}" завершен`, 'success');
    });
    
    // ========== ПЕРЕДАЧА В 1С ==========
    
    function showTransferDialog(proposals) {
        const existingDialog = document.querySelector('.custom-transfer-dialog');
        if (existingDialog) existingDialog.remove();
        
        const dialog = document.createElement('div');
        dialog.className = 'custom-transfer-dialog';
        dialog.innerHTML = `
            <div class="custom-transfer-overlay">
                <div class="custom-transfer-content">
                    <div class="custom-transfer-header"><i class="fas fa-exchange-alt"></i><h3>Передача в 1С</h3></div>
                    <div class="custom-transfer-body">
                        <div class="transfer-icon"><i class="fas fa-boxes"></i></div>
                        <p class="transfer-count">📦 Будет передано <strong>${proposals.length}</strong> позиций</p>
                        <div class="transfer-items-preview">${proposals.slice(0, 5).map(p => `<div class="transfer-item"><span class="item-name">${p.name}</span><span class="item-quantity">${p.quantity} шт.</span></div>`).join('')}${proposals.length > 5 ? `<div class="transfer-more">...и ещё ${proposals.length - 5} позиций</div>` : ''}</div>
                    </div>
                    <div class="custom-transfer-buttons">
                        <button id="transfer-save-btn" class="transfer-btn save-btn"><i class="fas fa-database"></i> Сохранить в localStorage</button>
                        <button id="transfer-download-btn" class="transfer-btn download-btn"><i class="fas fa-download"></i> Скачать JSON</button>
                        <button id="transfer-cancel-btn" class="transfer-btn cancel-btn"><i class="fas fa-times"></i> Отмена</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);
        
        const style = document.createElement('style');
        style.textContent = `.custom-transfer-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:30000}.custom-transfer-content{background:var(--bg-secondary);border-radius:16px;width:90%;max-width:450px;animation:slideUp 0.3s}.custom-transfer-header{background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:20px;text-align:center}.custom-transfer-header i{font-size:2em}.custom-transfer-header h3{margin:10px 0 0}.custom-transfer-body{padding:25px;text-align:center}.transfer-icon i{font-size:3em;color:#27ae60}.transfer-count{font-size:1.1em;margin-bottom:20px}.transfer-items-preview{background:var(--bg-primary);border-radius:12px;padding:15px;max-height:200px;overflow-y:auto}.transfer-item{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-color)}.item-quantity{font-weight:bold;color:#27ae60}.transfer-more{text-align:center;padding-top:10px;color:var(--text-secondary);font-style:italic}.custom-transfer-buttons{display:flex;gap:10px;padding:20px;background:var(--bg-primary);flex-wrap:wrap}.transfer-btn{flex:1;padding:12px;border:none;border-radius:8px;cursor:pointer;font-weight:500;display:flex;align-items:center;justify-content:center;gap:8px}.save-btn{background:linear-gradient(135deg,#667eea,#764ba2);color:white}.download-btn{background:linear-gradient(135deg,#27ae60,#2ecc71);color:white}.cancel-btn{background:#e74c3c;color:white}.transfer-btn:hover{transform:translateY(-2px)}@keyframes slideUp{from{transform:translateY(50px);opacity:0}to{transform:translateY(0);opacity:1}}`;
        document.head.appendChild(style);
        
        document.getElementById('transfer-save-btn').onclick = () => {
            const saved = JSON.parse(localStorage.getItem('1c_transfers') || '[]');
            saved.push({ id: Date.now(), branch: document.getElementById('order-branch')?.value || 'all', items: proposals, date: new Date().toISOString() });
            localStorage.setItem('1c_transfers', JSON.stringify(saved));
            showNotification(`✅ Сохранено локально. Всего передач: ${saved.length}`, 'success');
            dialog.remove(); style.remove();
        };
        document.getElementById('transfer-download-btn').onclick = () => {
            const data = { branch: document.getElementById('order-branch')?.value || 'all', items: proposals, exportDate: new Date().toISOString(), user: 'Менеджер закупок' };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `1c_transfer_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showNotification(`✅ Файл сохранён`, 'success');
            dialog.remove(); style.remove();
        };
        document.getElementById('transfer-cancel-btn').onclick = () => { dialog.remove(); style.remove(); showNotification('Передача отменена', 'info'); };
        dialog.querySelector('.custom-transfer-overlay').onclick = (e) => { if (e.target === dialog.querySelector('.custom-transfer-overlay')) { dialog.remove(); style.remove(); } };
    }
    
    document.getElementById('transfer-to-1c')?.addEventListener('click', () => {
        const proposals = [];
        document.querySelectorAll('#order-proposal-table tbody tr').forEach(row => {
            const input = row.cells[5]?.querySelector('input');
            if (input && parseInt(input.value) > 0) {
                const skuMatch = row.cells[0].innerText.match(/\(([^)]+)\)/);
                proposals.push({ sku: skuMatch ? skuMatch[1] : 'N/A', quantity: parseInt(input.value), name: row.cells[0].innerText.split('(')[0].trim() });
            }
        });
        if (proposals.length === 0) showNotification('Нет товаров для передачи', 'warning');
        else showTransferDialog(proposals);
    });
    
    document.getElementById('calculate-roi')?.addEventListener('click', () => {
        calculateROI();
        showNotification('ROI рассчитан', 'success');
        document.querySelector('.nav-item[data-page="forecast"]')?.click();
    });
    
    // ========== ИМПОРТ ДАННЫХ ==========
    
    function importSuppliersFromJSON(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (Array.isArray(data)) {
                data.forEach(supplier => {
                    if (supplier.name) suppliersData.push({ id: nextId++, name: supplier.name, avgPrice: parseFloat(supplier.avgPrice) || 0, avgDelivery: parseInt(supplier.avgDelivery) || 0, missedDeadlines: parseInt(supplier.missedDeadlines) || 0, rating: parseFloat(supplier.rating) || 0, category: supplier.category || "electronics", branch: supplier.branch || "филиал-москва", date: new Date().toISOString().slice(0,10), priceHistory: [100, 105, 110, 108, 112] });
                });
                applyFiltersAndRender(); updateCharts(); renderTopSuppliersChart(); renderPriceTrendChart();
                showNotification(`Импортировано ${data.length} поставщиков`, 'success');
            } else throw new Error();
        } catch (e) { showNotification('Ошибка импорта JSON', 'warning'); }
    }
    
    function importBudgetFromJSON(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (Array.isArray(data)) {
                data.forEach(item => {
                    if (item.branch && item.period) {
                        const planned = parseFloat(item.planned) || 0;
                        const actual = parseFloat(item.actual) || 0;
                        budgetData.push({ branch: item.branch, period: item.period, planned, actual, remaining: planned - actual, executionPercent: planned > 0 ? (actual / planned * 100) : 0 });
                    }
                });
                const branch = document.getElementById('budget-branch').value;
                renderBudgetDetailTable(branch === 'all' ? budgetData : budgetData.filter(b => b.branch === branch));
                renderBudgetExecutionChart(branch); renderBudgetDistributionChart(); renderBudgetGaugeChart();
                showNotification(`Импортировано ${data.length} записей`, 'success');
            } else throw new Error();
        } catch (e) { showNotification('Ошибка импорта JSON', 'warning'); }
    }
    
    function importFromExcel(file, type) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            if (type === 'suppliers') {
                rows.forEach(row => { suppliersData.push({ id: nextId++, name: row['Поставщик'] || row['name'] || 'Unknown', avgPrice: parseFloat(row['Средняя цена'] || row['avgPrice'] || 0), avgDelivery: parseInt(row['Ср. срок поставки (дни)'] || row['avgDelivery'] || 0), missedDeadlines: parseInt(row['% Просроченных'] || row['missedDeadlines'] || 0), rating: parseFloat(row['Рейтинг'] || row['rating'] || 0), category: row['Категория'] || row['category'] || "electronics", branch: row['Филиал'] || row['branch'] || "филиал-москва", date: new Date().toISOString().slice(0,10), priceHistory: [100, 105, 110, 108, 112] }); });
                applyFiltersAndRender(); updateCharts(); renderTopSuppliersChart(); renderPriceTrendChart();
                showNotification(`Импортировано ${rows.length} поставщиков`, 'success');
            } else if (type === 'budget') {
                rows.forEach(row => {
                    const planned = parseFloat(row['Запланировано'] || row['planned'] || 0);
                    const actual = parseFloat(row['Фактически'] || row['actual'] || 0);
                    budgetData.push({ branch: row['Филиал'] || row['branch'] || "филиал-москва", period: row['Период'] || row['period'] || "Январь", planned, actual, remaining: planned - actual, executionPercent: planned > 0 ? (actual / planned * 100) : 0 });
                });
                const branch = document.getElementById('budget-branch').value;
                renderBudgetDetailTable(branch === 'all' ? budgetData : budgetData.filter(b => b.branch === branch));
                renderBudgetExecutionChart(branch); renderBudgetDistributionChart(); renderBudgetGaugeChart();
                showNotification(`Импортировано ${rows.length} записей`, 'success');
            }
        };
        reader.readAsArrayBuffer(file);
    }
    
    document.getElementById('import-suppliers-btn')?.addEventListener('click', () => {
        const input = document.getElementById('import-suppliers-file');
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.name.endsWith('.json')) { const reader = new FileReader(); reader.onload = (ev) => importSuppliersFromJSON(ev.target.result); reader.readAsText(file); }
            else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) importFromExcel(file, 'suppliers');
            else showNotification('Поддерживаются JSON и Excel', 'warning');
            input.value = '';
        };
        input.click();
    });
    
    document.getElementById('import-budget-btn')?.addEventListener('click', () => {
        const input = document.getElementById('import-budget-file');
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.name.endsWith('.json')) { const reader = new FileReader(); reader.onload = (ev) => importBudgetFromJSON(ev.target.result); reader.readAsText(file); }
            else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) importFromExcel(file, 'budget');
            else showNotification('Поддерживаются JSON и Excel', 'warning');
            input.value = '';
        };
        input.click();
    });
    
    document.getElementById('save-filters-btn')?.addEventListener('click', () => {
        const filters = { category: document.getElementById('supplier-category').value, branch: document.getElementById('supplier-branch').value, period: document.getElementById('supplier-period').value, dateFrom: document.getElementById('date-from').value, dateTo: document.getElementById('date-to').value };
        localStorage.setItem('savedFilters', JSON.stringify(filters));
        showNotification('Фильтры сохранены', 'success');
    });
    
    // ========== ПОКАЗ/СКРЫТИЕ ПОЛЕЙ "С" И "ПО" ==========
    
    const periodSelect = document.getElementById('supplier-period');
    const dateRangeGroup = document.getElementById('date-range-group');
    
    if (periodSelect && dateRangeGroup) {
        periodSelect.addEventListener('change', () => {
            if (periodSelect.value === 'custom') {
                dateRangeGroup.style.display = 'flex';
            } else {
                dateRangeGroup.style.display = 'none';
                document.getElementById('date-from').value = '';
                document.getElementById('date-to').value = '';
                // Принудительно обновляем данные при смене периода
                applyFiltersAndRender();
                updateCharts();
                renderTopSuppliersChart();
                renderPriceTrendChart();
                renderSupplierKPICards(getFilteredSuppliers());
            }
        });
    }
    
    // ========== ИНИЦИАЛИЗАЦИЯ ФИЛЬТРОВ ==========
    
    const catFilter = document.getElementById('supplier-category');
    if (catFilter) {
        catFilter.innerHTML = '<option value="all">Все</option>';
        Object.entries(categoryNames).forEach(([val, name]) => { const opt = document.createElement('option'); opt.value = val; opt.textContent = name; catFilter.appendChild(opt); });
    }
    
    ['supplier-branch', 'budget-branch', 'order-branch'].forEach(id => {
        const filter = document.getElementById(id);
        if (filter) {
            filter.innerHTML = '<option value="all">Все</option>';
            Object.entries(branchNames).forEach(([val, name]) => { const opt = document.createElement('option'); opt.value = val; opt.textContent = name; filter.appendChild(opt); });
        }
    });
    
    // ========== НАВИГАЦИЯ ==========
    
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    let currentPage = 'supplier-analytics';
    
    function setActivePage(pageId) {
        navItems.forEach(n => n.classList.remove('active'));
        pages.forEach(p => p.classList.remove('active'));
        document.querySelector(`.nav-item[data-page="${pageId}"]`)?.classList.add('active');
        document.getElementById(pageId)?.classList.add('active');
        currentPage = pageId;
        
        if (pageId === 'supplier-analytics') { applyFiltersAndRender(); updateCharts(); renderTopSuppliersChart(); renderPriceTrendChart(); renderSupplierKPICards(getFilteredSuppliers()); }
        else if (pageId === 'budget-pf') { const branch = document.getElementById('budget-branch').value; renderBudgetDetailTable(branch === 'all' ? budgetData : budgetData.filter(b => b.branch === branch)); renderBudgetExecutionChart(branch); renderBudgetDistributionChart(); renderBudgetGaugeChart(); renderBudgetKPICards(); }
        else if (pageId === 'order-recommendations') renderOrderProposalTable(orderProposals);
        else if (pageId === 'forecast') { calculateROI(); renderBudgetForecastChart(); renderMissedForecastChart(); }
        updateLastUpdateTime();
    }
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.dataset.page;
            if (target !== currentPage) setActivePage(target);
        });
    });
    
    document.getElementById('apply-supplier-filters')?.addEventListener('click', () => {
        applyFiltersAndRender();
        updateCharts();
        renderTopSuppliersChart();
        renderPriceTrendChart();
        renderSupplierKPICards(getFilteredSuppliers());
        showNotification('Фильтры применены', 'success');
    });
    
    document.getElementById('apply-budget-filters')?.addEventListener('click', () => {
        const branch = document.getElementById('budget-branch').value;
        renderBudgetDetailTable(branch === 'all' ? budgetData : budgetData.filter(b => b.branch === branch));
        renderBudgetExecutionChart(branch);
        renderBudgetKPICards();
        showNotification('Фильтры бюджета применены', 'success');
    });
    
    function updateCharts() {
        const filtered = getFilteredSuppliers();
        renderPriceDeliveryChart(filtered);
        renderSupplierKPICards(filtered);
    }
    
    const modal = document.getElementById('supplier-modal');
    document.getElementById('add-supplier-btn')?.addEventListener('click', () => modal.classList.add('active'));
    document.getElementById('close-modal-btn')?.addEventListener('click', () => modal.classList.remove('active'));
    
    document.getElementById('save-supplier-btn')?.addEventListener('click', () => {
        const name = document.getElementById('new-supplier-name').value.trim();
        const price = parseFloat(document.getElementById('new-supplier-price').value);
        const delivery = parseInt(document.getElementById('new-supplier-delivery').value);
        const missed = parseInt(document.getElementById('new-supplier-missed').value);
        const rating = parseFloat(document.getElementById('new-supplier-rating').value);
        const category = document.getElementById('new-supplier-category').value;
        const branch = document.getElementById('new-supplier-branch').value;
        const date = new Date().toISOString().slice(0, 10);
        if (!name || isNaN(price) || isNaN(delivery) || isNaN(missed) || isNaN(rating)) { showNotification('Заполните все поля', 'warning'); return; }
        suppliersData.push({ id: nextId++, name, avgPrice: price, avgDelivery: delivery, missedDeadlines: missed, rating, category, branch, date, priceHistory: [price, price, price, price, price] });
        applyFiltersAndRender(); updateCharts(); renderTopSuppliersChart(); renderPriceTrendChart();
        modal.classList.remove('active');
        document.getElementById('new-supplier-name').value = ''; document.getElementById('new-supplier-price').value = ''; document.getElementById('new-supplier-delivery').value = ''; document.getElementById('new-supplier-missed').value = ''; document.getElementById('new-supplier-rating').value = '';
        showNotification('Поставщик добавлен', 'success');
    });
    
    // ========== ЗАПУСК ==========
    applyTheme();
    applyFiltersAndRender();
    updateCharts();
    renderTopSuppliersChart();
    renderPriceTrendChart();
    renderBudgetDetailTable(budgetData);
    renderBudgetExecutionChart('all');
    renderBudgetDistributionChart();
    renderBudgetGaugeChart();
    renderBudgetKPICards();
    renderOrderProposalTable(orderProposals);
    calculateROI();
    renderBudgetForecastChart();
    renderMissedForecastChart();
    updateLastUpdateTime();
    startAutoRefresh();
    applyColumnSettings();
    
    if (savedFilters.category) {
        if (document.getElementById('supplier-category')) document.getElementById('supplier-category').value = savedFilters.category;
        if (document.getElementById('supplier-branch')) document.getElementById('supplier-branch').value = savedFilters.branch;
        if (document.getElementById('supplier-period')) document.getElementById('supplier-period').value = savedFilters.period || 'month';
        if (document.getElementById('date-from')) document.getElementById('date-from').value = savedFilters.dateFrom || '';
        if (document.getElementById('date-to')) document.getElementById('date-to').value = savedFilters.dateTo || '';
        if (savedFilters.period === 'custom') {
            const dateRangeGroupEl = document.getElementById('date-range-group');
            if (dateRangeGroupEl) dateRangeGroupEl.style.display = 'flex';
        }
        applyFiltersAndRender();
    }
});