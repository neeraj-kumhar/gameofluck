const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { connectDB, sequelize } = require('./config/db');
const { initSocket } = require('./services/socket');

// Load Engines
const colorEngine = require('./services/engines/ColorPredictionEngine');
const aviatorEngine = require('./services/engines/AviatorEngine');
const marbleEngine = require('./services/engines/MarbleRaceEngine');

const auth = require('./routes/auth');
const wallet = require('./routes/wallet');

dotenv.config();

// Check for required Env Vars
const requiredEnv = ['JWT_SECRET', 'DB_PASSWORD'];
const missingEnv = requiredEnv.filter(k => !process.env[k] && !process.env['MYSQL_URL']);
if (missingEnv.length > 0 && process.env.VERCEL) {
    console.error(`❌ CRITICAL: Missing Environment Variables: ${missingEnv.join(', ')}`);
}

// Connect to MySQL (Async)
connectDB().catch(err => {
    console.error('Initial DB Connection Failure:', err.message);
});

// Sync Database Tables - Only in non-production or if explicitly allowed
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    sequelize.sync({ alter: true })
        .then(() => console.log('Database tables synchronized'))
        .catch(err => console.error('Error synchronizing tables:', err));
}

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize Socket.io
const io = initSocket(server);

// Start Game Engines
colorEngine.start();
aviatorEngine.start();
marbleEngine.start();

// Request Logging Middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Mount routers
app.use('/api/auth', auth);
app.use('/api/wallet', wallet);
app.use('/api/admin', require('./routes/admin'));

// Health check route
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'Backend is running with Game Engines active',
        uptime: process.uptime()
    });
});

// Production handling
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
    // Standard Production Server
} else if (process.env.VERCEL) {
    // Vercel fallback
} else {
    // Local development: Serve Frontend Static Files
    const clientPath = path.join(__dirname, '../client/dist');
    app.use(express.static(clientPath));
}

// Start the server (Required for Railway)
server.listen(PORT, () => {
    console.log(`🚀 Server with Game Engines running on port ${PORT}`);
});

// For Vercel Serverless Functions
module.exports = app;
