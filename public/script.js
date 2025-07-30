// Global variables
let stocks = {};
let orders = [];
let trades = [];

// DOM Elements
const tabButtons = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');
const stockList = document.getElementById('stockList');
const searchInput = document.getElementById('searchInput');
const orderForm = document.getElementById('orderForm');
const orderType = document.getElementById('orderType');
const priceGroup = document.getElementById('priceGroup');
const ordersList = document.getElementById('ordersList');
const tradesList = document.getElementById('tradesList');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    loadStocks();
    loadOrders();
    loadTrades();
    setupEventListeners();
    
    // Auto-refresh stocks every 5 seconds
    setInterval(loadStocks, 5000);
});

// Tab functionality
function initializeTabs() {
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    // Update buttons
    tabButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update content
    tabContents.forEach(content => content.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    
    // Load data for specific tabs
    if (tabName === 'orders') loadOrders();
    if (tabName === 'trades') loadTrades();
}

// Event listeners
function setupEventListeners() {
    // Search functionality
    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase();
        filterStocks(query);
    });
    
    // Order form
    orderType.addEventListener('change', function() {
        if (this.value === 'market') {
            priceGroup.style.display = 'none';
        } else {
            priceGroup.style.display = 'block';
        }
    });
    
    orderForm.addEventListener('submit', function(e) {
        e.preventDefault();
        placeOrder();
    });
}

// API functions
async function loadStocks() {
    try {
        const response = await fetch('/api/stocks');
        stocks = await response.json();
        displayStocks(Object.values(stocks));
    } catch (error) {
        console.error('Error loading stocks:', error);
        showError('Failed to load stock data');
    }
}

async function loadOrders() {
    try {
        const response = await fetch('/api/orders');
        orders = await response.json();
        displayOrders();
    } catch (error) {
        console.error('Error loading orders:', error);
        showError('Failed to load orders');
    }
}

async function loadTrades() {
    try {
        const response = await fetch('/api/trades');
        trades = await response.json();
        displayTrades();
    } catch (error) {
        console.error('Error loading trades:', error);
        showError('Failed to load trades');
    }
}

async function placeOrder() {
    const formData = new FormData(orderForm);
    const orderData = {
        symbol: formData.get('symbol').toUpperCase(),
        type: formData.get('type'),
        orderType: formData.get('orderType'),
        quantity: formData.get('quantity'),
        price: formData.get('price')
    };
    
    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showSuccess('Order placed successfully!');
            orderForm.reset();
            loadOrders();
            loadTrades();
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to place order');
        }
    } catch (error) {
        console.error('Error placing order:', error);
        showError('Failed to place order');
    }
}

async function cancelOrder(orderId) {
    try {
        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showSuccess('Order cancelled successfully!');
            loadOrders();
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to cancel order');
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        showError('Failed to cancel order');
    }
}

// Display functions
function displayStocks(stocksToShow) {
    stockList.innerHTML = '';
    
    stocksToShow.forEach(stock => {
        const stockItem = document.createElement('div');
        stockItem.className = 'stock-item';
        
        const changeClass = stock.change >= 0 ? 'positive' : 'negative';
        const changeSymbol = stock.change >= 0 ? '+' : '';
        
        stockItem.innerHTML = `
            <div class="stock-symbol">${stock.symbol}</div>
            <div class="stock-name">${stock.name}</div>
            <div class="stock-price">$${stock.price.toFixed(2)}</div>
            <div class="stock-change ${changeClass}">
                ${changeSymbol}${stock.change.toFixed(2)} (${changeSymbol}${stock.changePercent.toFixed(2)}%)
            </div>
        `;
        
        // Click to populate trade form
        stockItem.addEventListener('click', function() {
            document.getElementById('symbol').value = stock.symbol;
            switchTab('trade');
        });
        
        stockList.appendChild(stockItem);
    });
}

function displayOrders() {
    ordersList.innerHTML = '';
    
    if (orders.length === 0) {
        ordersList.innerHTML = '<p>No orders found.</p>';
        return;
    }
    
    orders.reverse().forEach(order => {
        const orderItem = document.createElement('div');
        orderItem.className = 'order-item';
        
        orderItem.innerHTML = `
            <div class="order-header">
                <strong>${order.symbol} - ${order.type.toUpperCase()}</strong>
                <span class="status-${order.status}">${order.status.toUpperCase()}</span>
            </div>
            <div class="order-details">
                <div><strong>Type:</strong> ${order.orderType}</div>
                <div><strong>Quantity:</strong> ${order.quantity}</div>
                <div><strong>Price:</strong> $${order.price.toFixed(2)}</div>
                <div><strong>Date:</strong> ${new Date(order.timestamp).toLocaleString()}</div>
            </div>
            ${order.status === 'pending' ? `<button class="cancel-btn" onclick="cancelOrder('${order.id}')">Cancel</button>` : ''}
        `;
        
        ordersList.appendChild(orderItem);
    });
}

function displayTrades() {
    tradesList.innerHTML = '';
    
    if (trades.length === 0) {
        tradesList.innerHTML = '<p>No trades found.</p>';
        return;
    }
    
    trades.reverse().forEach(trade => {
        const tradeItem = document.createElement('div');
        tradeItem.className = 'trade-item';
        
        tradeItem.innerHTML = `
            <div class="trade-header">
                <strong>${trade.symbol} - ${trade.type.toUpperCase()}</strong>
                <span class="status-executed">EXECUTED</span>
            </div>
            <div class="trade-details">
                <div><strong>Quantity:</strong> ${trade.quantity}</div>
                <div><strong>Price:</strong> $${trade.price.toFixed(2)}</div>
                <div><strong>Total:</strong> $${(trade.quantity * trade.price).toFixed(2)}</div>
                <div><strong>Date:</strong> ${new Date(trade.timestamp).toLocaleString()}</div>
            </div>
        `;
        
        tradesList.appendChild(tradeItem);
    });
}

function filterStocks(query) {
    const filteredStocks = Object.values(stocks).filter(stock =>
        stock.symbol.toLowerCase().includes(query) ||
        stock.name.toLowerCase().includes(query)
    );
    displayStocks(filteredStocks);
}

// Utility functions
function showSuccess(message) {
    alert('Success: ' + message);
}

function showError(message) {
    alert('Error: ' + message);
}