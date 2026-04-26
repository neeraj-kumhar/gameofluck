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

// Connect to MySQL
connectDB();

// Sync Database Tables - Only in non-production or if explicitly allowed
// In Vercel (serverless), we don't want to sync on every request
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    sequelize.sync({ alter: true })
        .then(async () => {
            console.log('Database tables synchronized');
            
            // Seed Admin User
            const User = require('./models/User');
            const adminEmail = 'admin@rummy.com';
            const adminExists = await User.findOne({ where: { email: adminEmail } });
            
            if (!adminExists) {
                await User.create({
                    username: 'Admin',
                    email: adminEmail,
                    password: 'rummy@4545', 
                    role: 'admin',
                    balance: 1000000
                });
                console.log('🛡️ Master Admin Account Created!');
            }
        })
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

// Serve Frontend Static Files
const clientPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientPath));

// Health check route
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Backend is running' });
});

// Catch-all route for SPA - must be last
app.get(/.*/, (req, res) => {
    // Check if file exists in clientPath
    const filePath = path.join(clientPath, 'index.html');
    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(200).send('Backend is running, but frontend build was not found. If this is Vercel, the frontend should be handled by Vercel rewrites.');
        }
    });
});

// For Vercel Serverless Functions
module.exports = app;

// Only start the server if not running as a Vercel function
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    server.listen(PORT, () => {
        console.log(`🚀 Server with Game Engines running on port ${PORT}`);
    });
}
