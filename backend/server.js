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

// Sync Database Tables
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
                password: 'rummy@4545', // Will be hashed by model hook
                role: 'admin',
                balance: 1000000
            });
            console.log('🛡️ Master Admin Account Created!');
        }
    })
    .catch(err => console.error('Error synchronizing tables:', err));

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

// Catch-all route for SPA - must be last
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
});

server.listen(PORT, () => {
    console.log(`🚀 Server with Game Engines running on port ${PORT}`);
});
