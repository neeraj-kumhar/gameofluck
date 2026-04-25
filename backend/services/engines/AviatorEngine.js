const { getIO } = require('../socket');

class AviatorEngine {
    constructor() {
        this.phase = 'WAITING'; // WAITING, FLYING, CRASHED
        this.multiplier = 1.00;
        this.crashPoint = 2.00;
        this.timer = 10; // 10s wait time
        this.history = [1.50, 2.80, 1.05, 12.40, 1.15];
        this.interval = null;
        this.startTime = null;
    }

    start() {
        console.log('✈️ Aviator Engine Started...');
        this.resetGame();
        this.interval = setInterval(() => {
            this.tick();
        }, 100); // 100ms tick for smooth multiplier
    }

    resetGame() {
        this.phase = 'WAITING';
        this.timer = 10;
        this.multiplier = 1.00;
        this.crashPoint = this.generateCrashPoint();
    }

    generateCrashPoint() {
        const r = Math.random();
        const edge = 0.05; // 5% house edge
        if (r < edge) return 1.00;
        return (0.95 / (1 - r)).toFixed(2);
    }

    tick() {
        const io = getIO();

        if (this.phase === 'WAITING') {
            this.timer -= 0.1;
            if (this.timer <= 0) {
                this.phase = 'FLYING';
                this.startTime = Date.now();
            }
        } 
        else if (this.phase === 'FLYING') {
            const elapsed = (Date.now() - this.startTime) / 1000;
            this.multiplier = 1.00 + Math.pow(elapsed / 2.5, 2.5);

            if (this.multiplier >= this.crashPoint) {
                this.multiplier = parseFloat(this.crashPoint);
                this.phase = 'CRASHED';
                this.history.unshift(this.multiplier);
                this.history = this.history.slice(0, 20);
                
                // Broadcast Result
                io.to('aviator').emit('game-result', {
                    crashPoint: this.multiplier
                });

                setTimeout(() => {
                    this.resetGame();
                }, 4000); // 4s crashed display
            }
        }

        // Broadcast State
        io.to('aviator').emit('game-state', {
            phase: this.phase,
            multiplier: this.multiplier,
            timer: Math.max(0, this.timer).toFixed(1),
            history: this.history.slice(0, 15)
        });
    }

    getState() {
        return {
            phase: this.phase,
            multiplier: this.multiplier,
            timer: Math.max(0, this.timer).toFixed(1),
            history: this.history.slice(0, 15)
        };
    }
}

module.exports = new AviatorEngine();
