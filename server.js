# reward-vip-backend
Backend Server for Rewards VIP Watches
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const ORDERS_FILE = path.join(__dirname, 'orders.json');
const ADMIN_PASSWORD = 'reward2025';

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
}

const readOrders = () => {
  try {
    const data = fs.readFileSync(ORDERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const writeOrders = (orders) => {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.post('/api/orders', (req, res) => {
  try {
    const { name, phone, alternativePhone, address, state, quantity, comment } = req.body;

    if (!name || !phone || !address || !state || !quantity) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please fill in all required fields' 
      });
    }

    const orders = readOrders();
    const newOrder = {
      id: uuidv4(),
      name: name.trim(),
      phone: phone.trim(),
      alternativePhone: alternativePhone?.trim() || '',
      address: address.trim(),
      state: state.trim(),
      quantity: parseInt(quantity),
      comment: comment?.trim() || '',
      totalAmount: parseInt(quantity) * 85000,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    orders.unshift(newOrder);
    writeOrders(orders);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      order: newOrder
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to place order. Please try again.' 
    });
  }
});

app.get('/api/orders', (req, res) => {
  const { password } = req.query;
  
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized access' 
    });
  }

  try {
    const orders = readOrders();
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

app.patch('/api/orders/:id', (req, res) => {
  const { password } = req.query;
  
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Unauthorized access' });
  }

  try {
    const { status } = req.body;
    const orders = readOrders();
    const orderIndex = orders.findIndex(o => o.id === req.params.id);

    if (orderIndex === -1) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    orders[orderIndex].status = status;
    writeOrders(orders);

    res.json({
      success: true,
      message: 'Order updated successfully',
      order: orders[orderIndex]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update order' });
  }
});

app.delete('/api/orders/:id', (req, res) => {
  const { password } = req.query;
  
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Unauthorized access' });
  }

  try {
    const orders = readOrders();
    const filteredOrders = orders.filter(o => o.id !== req.params.id);
    
    if (filteredOrders.length === orders.length) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    writeOrders(filteredOrders);
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete order' });
  }
});

app.get('/api/stats', (req, res) => {
  const { password } = req.query;
  
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Unauthorized access' });
  }

  try {
    const orders = readOrders();
    const stats = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + o.totalAmount, 0),
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      confirmedOrders: orders.filter(o => o.status === 'confirmed').length,
      deliveredOrders: orders.filter(o => o.status === 'delivered').length,
      totalWatches: orders.reduce((sum, o) => sum + o.quantity, 0)
    };

    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
                                               
