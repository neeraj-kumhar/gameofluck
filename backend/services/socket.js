const socketio = require('socket.io');
let io;

const initSocket = (server) => {
    io = socketio(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log(`New client connected: ${socket.id}`);

        socket.on('join-game', (gameName) => {
            socket.join(gameName);
            console.log(`Socket ${socket.id} joined room: ${gameName}`);

            // Send instant state update
            if (gameName === 'color-prediction') {
                const colorEngine = require('./engines/ColorPredictionEngine');
                socket.emit('game-state', colorEngine.getState());
            } else if (gameName === 'aviator') {
                const aviatorEngine = require('./engines/AviatorEngine');
                socket.emit('game-state', aviatorEngine.getState());
            } else if (gameName === 'marble-race') {
                const marbleEngine = require('./engines/MarbleRaceEngine');
                socket.emit('game-state', marbleEngine.getState());
            }
        });

        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

module.exports = { initSocket, getIO };
