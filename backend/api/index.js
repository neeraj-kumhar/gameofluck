const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mysql2 = require('mysql2'); // Critical for bundling

// Import from the same folder (backend)
const { connectDB, sequelize } = require('../config/db');
const { initSocket } = require('../services/socket');

// Load Engines
const colorEngine = require('../services/engines/ColorPredictionEngine');
const aviatorEngine = require('../services/engines/AviatorEngine');
const marbleEngine = require('../services/engines/MarbleRaceEngine');

const auth = require('../routes/auth');
const wallet = require('../routes/wallet');

dotenv.config();

// Connect to MySQL
connectDB().catch(err => console.error('DB Connection Error:', err));

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Initialize Socket.io
const io = initSocket(server);

// Routes
app.use('/api/auth', auth);
app.use('/api/wallet', wallet);
app.use('/api/admin', require('../routes/admin'));

app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'Backend API is running from backend/api/',
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.status(200).send('Game of Luck Backend is live. Use /api/health for status.');
});

module.exports = app;
