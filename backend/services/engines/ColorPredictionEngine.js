const { getIO } = require('../socket');
const Transaction = require('../../models/Transaction');
const User = require('../../models/User');

class ColorPredictionEngine {
    constructor() {
        this.phase = 'BETTING'; // BETTING, RESULT
        this.timer = 30;
        this.history = [];
        this.interval = null;
        this.currentRoundBets = [];
    }

    start() {
        console.log('🚀 Color Prediction Engine Started...');
        this.interval = setInterval(() => {
            this.tick();
        }, 1000);
    }

    tick() {
        this.timer--;

        if (this.timer <= 5 && this.phase === 'BETTING') {
            this.phase = 'RESULT';
            this.generateResult();
        }

        if (this.timer <= 0) {
            this.timer = 30;
            this.phase = 'BETTING';
            this.currentRoundBets = []; // Clear for next round
        }

        // Broadcast state to all users in the room
        const io = getIO();
        io.to('color-prediction').emit('game-state', {
            phase: this.phase,
            timer: this.timer,
            history: this.history.slice(0, 10)
        });
    }

    generateResult() {
        const colors = ['red', 'green', 'violet'];
        const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

        const winNumber = numbers[Math.floor(Math.random() * numbers.length)];
        let winColor = [];

        if (winNumber === 0) winColor = ['red', 'violet'];
        else if (winNumber === 5) winColor = ['green', 'violet'];
        else if (winNumber % 2 === 0) winColor = ['red'];
        else winColor = ['green'];

        const result = {
            id: Date.now(),
            number: winNumber,
            color: winColor,
            period: new Date().getTime().toString().slice(-6)
        };

        this.history.unshift(result);
        const io = getIO();
        io.to('color-prediction').emit('game-result', result);

        console.log(`🎨 Color Prediction Result: ${winColor} (${winNumber})`);
    }

    // This would be called by the wallet controller/route
    addBet(bet) {
        this.currentRoundBets.push(bet);
    }

    getState() {
        return {
            phase: this.phase,
            timer: this.timer,
            history: this.history.slice(0, 10)
        };
    }
}

module.exports = new ColorPredictionEngine();
