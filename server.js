const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Helper functions to read/write JSON files
async function readJSONFile(filename) {
    try {
        const data = await fs.readFile(path.join(__dirname, 'data', filename), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filename}:`, error);
        return filename === 'stocks.json' ? {} : [];
    }
}

async function writeJSONFile(filename, data) {
    try {
        await fs.writeFile(path.join(__dirname, 'data', filename), JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Error writing ${filename}:`, error);
    }
}

// Routes

// Get all stocks with live prices
app.get('/api/stocks', async (req, res) => {
    try {
        const stocks = await readJSONFile('stocks.json');
        // Simulate price updates (in real app, you'd connect to actual API)
        Object.keys(stocks).forEach(symbol => {
            const randomChange = (Math.random() - 0.5) * 2; // Random change between -1 and 1
            stocks[symbol].price = Math.max(0.01, stocks[symbol].price + randomChange);
            stocks[symbol].change = randomChange;
            stocks[symbol].changePercent = (randomChange / stocks[symbol].price) * 100;
        });
        await writeJSONFile('stocks.json', stocks);
        res.json(stocks);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stocks' });
    }
});

// Search stocks
app.get('/api/stocks/search/:query', async (req, res) => {
    try {
        const stocks = await readJSONFile('stocks.json');
        const query = req.params.query.toLowerCase();
        const results = Object.values(stocks).filter(stock => 
            stock.symbol.toLowerCase().includes(query) || 
            stock.name.toLowerCase().includes(query)
        );
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'Search failed' });
    }
});

// Place order
app.post('/api/orders', async (req, res) => {
    try {
        const { symbol, type, orderType, quantity, price } = req.body;
        const orders = await readJSONFile('orders.json');
        const stocks = await readJSONFile('stocks.json');
        
        if (!stocks[symbol]) {
            return res.status(400).json({ error: 'Invalid stock symbol' });
        }

        const order = {
            id: Date.now().toString(),
            symbol,
            type, // 'buy' or 'sell'
            orderType, // 'market', 'limit', 'stop'
            quantity: parseInt(quantity),
            price: orderType === 'market' ? stocks[symbol].price : parseFloat(price),
            status: 'pending',
            timestamp: new Date().toISOString()
        };

        // For market orders, execute immediately
        if (orderType === 'market') {
            order.status = 'executed';
            order.executedPrice = stocks[symbol].price;
            
            // Add to trades
            const trades = await readJSONFile('trades.json');
            trades.push({
                id: order.id,
                symbol: order.symbol,
                type: order.type,
                quantity: order.quantity,
                price: order.executedPrice,
                timestamp: order.timestamp
            });
            await writeJSONFile('trades.json', trades);
        }

        orders.push(order);
        await writeJSONFile('orders.json', orders);
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: 'Failed to place order' });
    }
});

// Get orders
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await readJSONFile('orders.json');
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Get trades
app.get('/api/trades', async (req, res) => {
    try {
        const trades = await readJSONFile('trades.json');
        res.json(trades);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch trades' });
    }
});

// Cancel order
app.delete('/api/orders/:id', async (req, res) => {
    try {
        const orders = await readJSONFile('orders.json');
        const orderIndex = orders.findIndex(order => order.id === req.params.id);
        
        if (orderIndex === -1) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (orders[orderIndex].status === 'executed') {
            return res.status(400).json({ error: 'Cannot cancel executed order' });
        }

        orders[orderIndex].status = 'cancelled';
        await writeJSONFile('orders.json', orders);
        res.json(orders[orderIndex]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to cancel order' });
    }
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});

