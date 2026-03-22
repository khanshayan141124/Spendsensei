let myChart = null;

// --- UTILITY: Format Date to DD-MM-YYYY ---
function formatDateDisplay(isoDateString) {
    const parts = isoDateString.split('-');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD -> DD-MM-YYYY
    }
    return isoDateString;
}

// --- 1. LOAD MAIN DASHBOARD ---
async function loadDashboard() {
    const res = await fetch('/dashboard_data');
    const data = await res.json();

    // Update Total
    document.getElementById('dash-total').innerText = `₹${data.total}`;

    // Update Budget Math
    let budget = localStorage.getItem('sensei_budget') || 0;
    const budgetStatus = document.getElementById('budget-status');
    if (budget > 0) {
        let remaining = budget - data.total;
        if (remaining >= 0) {
            budgetStatus.innerText = `₹${remaining} remaining for today!`;
            budgetStatus.style.color = "#ffffff";
        } else {
            budgetStatus.innerText = `Over budget by ₹${Math.abs(remaining)}`;
            budgetStatus.style.color = "#ef4444"; // Red
        }
    }

    // Update List
    const list = document.getElementById('current-list');
    list.innerHTML = '';
    if (data.list.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:#94a3b8; font-size:0.85rem; padding:10px;">No expenses yet. Add one above!</p>`;
    } else {
        data.list.forEach(item => {
            const displayDate = formatDateDisplay(item.date);
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="item-info">
                    <span class="item-date">${displayDate}</span>
                    <span class="item-main"><b>${item.currency}${item.amount}</b> - ${item.category}</span>
                </div>
                <button class="del-btn" onclick="deleteItem(${item.id})">Delete</button>
            `;
            list.appendChild(li);
        });
    }

    // Update Chart
    renderChart(data.chart);
}

// --- 2. RENDER CHART ---
function renderChart(chartData) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    
    if (myChart) {
        myChart.destroy();
    }

    if (chartData.length === 0) {
        // Draw empty state if no data
        myChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['Empty'], datasets: [{ data: [1], backgroundColor: ['#334155'] }] },
            options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
        });
        return;
    }

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartData.map(d => d.category),
            datasets: [{
                data: chartData.map(d => d.amount),
                backgroundColor: ['#22c55e', '#3b82f6', '#facc15', '#ef4444', '#a855f7', '#ec4899', '#06b6d4'],
                borderWidth: 0
            }]
        },
        options: {
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { position: 'right', labels: { color: '#f8fafc', font: { family: 'Inter', size: 11 } } }
            }
        }
    });
}

// --- 3. ADD EXPENSE ---
document.getElementById('expenseForm').onsubmit = async (e) => {
    e.preventDefault();
    const payload = {
        amount: parseFloat(document.getElementById('amt').value),
        category: document.getElementById('cat').value,
        currency: document.getElementById('curr').value
    };

    await fetch('/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    document.getElementById('amt').value = '';
    document.getElementById('cat').value = '';
    loadDashboard();
};

// --- 4. SAVE DAY ---
async function saveDay() {
    if (confirm("Save today's expenses? This will clear your dashboard so you can start fresh tomorrow.")) {
        await fetch('/save_day', { method: 'POST' });
        loadDashboard();
    }
}

// --- 5. DELETE ITEM ---
async function deleteItem(id) {
    await fetch(`/delete/${id}`, { method: 'DELETE' });
    loadDashboard();
}

// --- 6. BUDGET LOGIC ---
window.setBudget = () => {
    const val = document.getElementById('budget-input').value;
    if (val) {
        localStorage.setItem('sensei_budget', val);
        document.getElementById('budget-input').value = '';
        loadDashboard();
    }
};

// --- 7. HISTORY MODAL LOGIC ---
window.openHistory = () => {
    document.getElementById('historyModal').style.display = 'block';
    loadHistory();
};

window.closeHistory = () => {
    document.getElementById('historyModal').style.display = 'none';
};

window.loadHistory = async () => {
    const timeframe = document.getElementById('history-filter').value;
    const res = await fetch(`/history?timeframe=${timeframe}`);
    const data = await res.json();
    
    const container = document.getElementById('history-list');
    let total = 0;
    
    if (data.length === 0) {
        container.innerHTML = "<p style='text-align:center; color:#94a3b8; padding: 20px;'>No saved history for this period.</p>";
    } else {
        container.innerHTML = data.map(item => {
            total += item.amount;
            const displayDate = formatDateDisplay(item.date);
            return `
            <div class="history-item">
                <div style="display:flex; flex-direction:column;">
                    <span style="font-size:0.7rem; color:#94a3b8;">${displayDate}</span>
                    <span style="font-weight:600;">${item.category}</span>
                </div>
                <span style="font-weight:800;">${item.currency}${item.amount}</span>
            </div>`;
        }).join('');
    }
    
    document.getElementById('history-total').innerText = `Total: ₹${total}`;
};

// Initialize app on load
loadDashboard();