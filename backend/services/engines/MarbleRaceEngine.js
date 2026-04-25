const { getIO } = require('../socket');

class MarbleRaceEngine {
    constructor() {
        this.phase = 'BETTING'; // BETTING, RACING, RESULT
        this.timer = 15;
        this.winnerId = null;
        this.history = [];
        this.marbles = [
            { id: 1, name: 'Red Rocket', short: 'RED', color: '#ef4444', multiplier: 6.0 },
            { id: 2, name: 'Blue Blizzard', short: 'BLU', color: '#3b82f6', multiplier: 6.0 },
            { id: 3, name: 'Neon Green', short: 'GRN', color: '#22c55e', multiplier: 6.0 },
            { id: 4, name: 'Gold Rush', short: 'GLD', color: '#eab308', multiplier: 6.0 },
            { id: 5, name: 'Purple Rain', short: 'PUR', color: '#a855f7', multiplier: 6.0 },
            { id: 6, name: 'Cyan Cyclone', short: 'CYN', color: '#06b6d4', multiplier: 6.0 },
            { id: 7, name: 'Pink Panther', short: 'PNK', color: '#ec4899', multiplier: 6.0 },
            { id: 8, name: 'Orange Orbit', short: 'ORG', color: '#f97316', multiplier: 6.0 },
        ];
        this.interval = null;
    }

    start() {
        console.log('🏎️ Marble Race Engine Started...');
        this.resetGame();
        this.interval = setInterval(() => {
            this.tick();
        }, 1000);
    }

    resetGame() {
        this.phase = 'BETTING';
        this.timer = 15;
        this.winnerId = this.marbles[Math.floor(Math.random() * this.marbles.length)].id;
    }

    tick() {
        this.timer--;

        if (this.timer <= 0) {
            if (this.phase === 'BETTING') {
                this.phase = 'RACING';
                this.timer = 12; // Race takes ~12 seconds
            } 
            else if (this.phase === 'RACING') {
                this.phase = 'RESULT';
                this.timer = 5;
                const winMarble = this.marbles.find(m => m.id === this.winnerId);
                this.history.unshift({ marble: winMarble, time: new Date().toLocaleTimeString() });
                this.history = this.history.slice(0, 15);
            } 
            else if (this.phase === 'RESULT') {
                this.resetGame();
            }
        }

        const io = getIO();
        io.to('marble-race').emit('game-state', this.getState());
    }

    getState() {
        return {
            phase: this.phase,
            timer: this.timer,
            winnerId: this.winnerId,
            history: this.history
        };
    }
}

module.exports = new MarbleRaceEngine();
