import React, { useState, useEffect, useRef, useMemo } from 'react';
import io from 'socket.io-client';
import './MarbleRace.css';

const socket = io('https://gameofluck-r491.vercel.app');

const MARBLES = [
  { id: 1, name: 'Red Rocket', short: 'RED', color: '#ef4444', multiplier: 6.0 },
  { id: 2, name: 'Blue Blizzard', short: 'BLU', color: '#3b82f6', multiplier: 6.0 },
  { id: 3, name: 'Neon Green', short: 'GRN', color: '#22c55e', multiplier: 6.0 },
  { id: 4, name: 'Gold Rush', short: 'GLD', color: '#eab308', multiplier: 6.0 },
  { id: 5, name: 'Purple Rain', short: 'PUR', color: '#a855f7', multiplier: 6.0 },
  { id: 6, name: 'Cyan Cyclone', short: 'CYN', color: '#06b6d4', multiplier: 6.0 },
  { id: 7, name: 'Pink Panther', short: 'PNK', color: '#ec4899', multiplier: 6.0 },
  { id: 8, name: 'Orange Orbit', short: 'ORG', color: '#f97316', multiplier: 6.0 },
];

const SOUND_URLS = {
  TICK: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  START: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  WIN: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
  CLICK: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  RACE: 'https://assets.mixkit.co/active_storage/sfx/144/144-preview.mp3'
};

const MarbleRace = ({ balance, setBalance, gameConfig, navigate }) => {
  const [phase, setPhase] = useState('BETTING');
  const [timer, setTimer] = useState(15);
  const [winner, setWinner] = useState(null);
  const [selectedMarble, setSelectedMarble] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [activeBets, setActiveBets] = useState([]);
  const [history, setHistory] = useState([]);
  const [commentary, setCommentary] = useState('Welcome to the Stadium! Waiting for bets...');
  const [leaderboard, setLeaderboard] = useState([]);
  const [isMuted, setIsMuted] = useState(false);

  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const winnerIdRef = useRef(null);
  const marbleStatesRef = useRef(MARBLES.map(m => ({ ...m, pos: 0, vel: 0, trail: [] })));
  const soundsRef = useRef({});

  // Initialize sounds
  useEffect(() => {
    soundsRef.current = {
      tick: new Audio(SOUND_URLS.TICK),
      start: new Audio(SOUND_URLS.START),
      win: new Audio(SOUND_URLS.WIN),
      click: new Audio(SOUND_URLS.CLICK),
      race: new Audio(SOUND_URLS.RACE)
    };
    soundsRef.current.race.loop = true;
    soundsRef.current.race.volume = 0.3;
  }, []);

  const playSound = (soundKey) => {
    if (isMuted || !soundsRef.current[soundKey]) return;
    const sound = soundsRef.current[soundKey];
    sound.currentTime = 0;
    sound.play().catch(e => console.log('Audio playback prevented', e));
  };

  const currentPhaseRef = useRef('BETTING');

  useEffect(() => {
    socket.emit('join-game', 'marble-race');

    const handleGameState = (state) => {
      const prevPhase = currentPhaseRef.current;
      currentPhaseRef.current = state.phase;
      
      setPhase(state.phase);
      setTimer(state.timer);
      setHistory(state.history);
      
      if (state.phase === 'RACING' && prevPhase !== 'RACING') {
        winnerIdRef.current = state.winnerId;
        startRaceAnimation();
      }

      if (state.phase === 'BETTING' && prevPhase !== 'BETTING') {
         resetGameUI();
      }
    };

    socket.on('game-state', handleGameState);

    return () => {
      socket.off('game-state', handleGameState);
    };
  }, []);

  // Sorting leaderboard based on positions
  useEffect(() => {
    if (phase === 'RACING') {
      const interval = setInterval(() => {
        const sorted = [...marbleStatesRef.current].sort((a, b) => b.pos - a.pos);
        setLeaderboard(sorted);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [phase]);

  const startRaceAnimation = () => {
    setCommentary('AND THEY ARE OFF!');
    playSound('start');
    if (!isMuted) soundsRef.current.race.play().catch(e => {});
    
    // Reset internal states
    marbleStatesRef.current = MARBLES.map(m => ({ ...m, pos: 0, vel: 0, trail: [] }));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const tick = () => {
      if (currentPhaseRef.current !== 'RACING') {
          cancelAnimationFrame(animationRef.current);
          return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawTrack(ctx, canvas.width, canvas.height);

      let finished = false;
      const states = marbleStatesRef.current;

      states.forEach((m, idx) => {
        const isWinner = m.id === winnerIdRef.current;
        
        // Rubber-banding algorithm
        const avgPos = states.reduce((sum, s) => sum + s.pos, 0) / states.length;
        const drift = (avgPos - m.pos) * 0.01;
        
        const baseSpeed = 0.2 + (Math.random() * 0.1);
        const bias = isWinner ? (m.pos > 70 ? 0.25 : 0.18) : 0.15;
        
        const accel = baseSpeed + bias + drift;
        m.vel = Math.min(accel, 0.6);
        m.pos += m.vel;

        if (m.pos >= 100) {
          m.pos = 100;
          finished = true;
        }

        // Trails
        m.trail.push({ x: m.pos, alpha: 1 });
        if (m.trail.length > 20) m.trail.shift();

        drawMarble(ctx, m, idx, canvas.width, canvas.height);
      });

      if (finished) {
        cancelAnimationFrame(animationRef.current);
        handleRaceFinish();
      } else {
        animationRef.current = requestAnimationFrame(tick);
      }
    };
    animationRef.current = requestAnimationFrame(tick);
  };

  const drawTrack = (ctx, w, h) => {
    // Finish Line
    ctx.strokeStyle = '#fff';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(w * 0.95, 0);
    ctx.lineTo(w * 0.95, h);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Lanes
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    const laneH = h / MARBLES.length;
    for (let i = 1; i < MARBLES.length; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * laneH);
      ctx.lineTo(w, i * laneH);
      ctx.stroke();
    }
  };

  const drawMarble = (ctx, m, idx, w, h) => {
    const laneH = h / MARBLES.length;
    const y = (idx * laneH) + (laneH / 2);
    const x = (m.pos / 100) * (w * 0.95);

    // Draw Trail
    m.trail.forEach((t, i) => {
      const tx = (t.x / 100) * (w * 0.95);
      const alpha = i / m.trail.length;
      ctx.fillStyle = m.color;
      ctx.globalAlpha = alpha * 0.3;
      ctx.beginPath();
      ctx.arc(tx, y, (laneH/3) * (i/m.trail.length), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Marble Shadow
    ctx.shadowBlur = 15;
    ctx.shadowColor = m.color;
    
    // Main Marble
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.arc(x, y, laneH / 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Gloss
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, laneH / 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
  };

  const handleRaceFinish = () => {
    const winId = winnerIdRef.current;
    if (soundsRef.current.race) soundsRef.current.race.pause();
    playSound('win');
    const winMarble = MARBLES.find(m => m.id === winId);
    setWinner(winMarble);
    setPhase('RESULT');
    setCommentary(`UNBELIEVABLE! ${winMarble.name.toUpperCase()} TAKES THE GOLD!`);
    
    setHistory(prev => [{ marble: winMarble, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 10));

    setActiveBets(prevBets => {
      const updated = prevBets.map(bet => {
        const won = bet.marbleId === winMarble.id;
        const payout = won ? bet.amount * winMarble.multiplier : 0;
        if (won) setBalance(b => b + payout);
        return { ...bet, status: won ? 'WON' : 'LOST', payout };
      });
      return updated;
    });
  };

  const resetGameUI = () => {
    setWinner(null);
    setActiveBets([]);
    setPhase('BETTING');
    setSelectedMarble(null);
    setLeaderboard([]);
    marbleStatesRef.current = MARBLES.map(m => ({ ...m, pos: 0, vel: 0, trail: [] }));
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const handlePlaceBet = () => {
    const amount = parseFloat(betAmount);
    if (!amount || amount <= 0 || amount > balance || !selectedMarble || phase !== 'BETTING') return;
    playSound('click');
    setBalance(prev => prev - amount);
    setActiveBets(prev => [...prev, { id: Date.now(), marbleId: selectedMarble.id, amount, status: 'PENDING' }]);
    setBetAmount('');
  };

  return (
    <div className="marble-race-container">
      {/* Stadium Commentary */}
      <div className="commentary-strip">
        <div className="ticker-icon">LIVE</div>
        <div className="commentary-text">{commentary}</div>
        <button 
          className={`mute-toggle ${isMuted ? 'muted' : ''}`}
          onClick={() => {
            setIsMuted(!isMuted);
            if (!isMuted) {
                // Pause any playing loops
                if (soundsRef.current.race) soundsRef.current.race.pause();
            } else if (phase === 'RACING') {
                if (soundsRef.current.race) soundsRef.current.race.play().catch(e => {});
            }
          }}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>

      <div className="race-arena">
        {/* Real-time Leaderboard */}
        <div className="live-leaderboard">
          <div className="lb-title">STADIUM STANDINGS</div>
          {leaderboard.length > 0 ? (
            leaderboard.map((m, i) => (
              <div key={m.id} className="lb-item">
                <span className="lb-rank">{i + 1}</span>
                <div className="lb-color" style={{ backgroundColor: m.color }}></div>
                <span className="lb-name">{m.short}</span>
              </div>
            ))
          ) : (
            MARBLES.map((m, i) => (
              <div key={m.id} className="lb-item">
                <span className="lb-rank">{i + 1}</span>
                <div className="lb-color" style={{ backgroundColor: m.color }}></div>
                <span className="lb-name">{m.short}</span>
              </div>
            ))
          )}
        </div>

        {/* Track Canvas */}
        <div className="track-canvas-wrapper">
          <canvas 
            ref={canvasRef} 
            width={800} 
            height={400} 
            className="race-canvas"
          />
          {phase === 'RESULT' && winner && (
            <div className="victory-card">
              <div className="confetti"></div>
              <span className="vic-label">WINNER</span>
              <h1 className="vic-name" style={{ color: winner.color }}>{winner.name}</h1>
              <div className="vic-shine"></div>
            </div>
          )}
          {phase === 'BETTING' && (
            <div className="countdown-overlay">
              <div className="cd-ring"></div>
              <span className="cd-value">{timer}s</span>
            </div>
          )}
        </div>
      </div>

      <div className="betting-panel-section">
        <div className="marble-picker">
          {MARBLES.map(m => (
            <div 
              key={m.id} 
              className={`marble-card ${selectedMarble?.id === m.id ? 'selected' : ''} ${phase !== 'BETTING' ? 'disabled' : ''}`}
              onClick={() => phase === 'BETTING' && setSelectedMarble(m)}
            >
              <div className="marble-swatch" style={{ backgroundColor: m.color, boxShadow: `0 0 10px ${m.color}` }}></div>
              <span className="card-title">{m.short}</span>
              <span className="card-mult">{m.multiplier}x</span>
            </div>
          ))}
        </div>

        <div className="controls-card">
          <div className="balance-badge">
             <span className="bb-label">WALLET</span>
             <span className="bb-val">₹{balance.toLocaleString()}</span>
          </div>

          <div className="bet-input-wrapper">
            <span className="bi-prefix">₹</span>
            <input 
              type="number" 
              className="bi-input" 
              placeholder="0.00"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              disabled={phase !== 'BETTING'}
            />
          </div>
          
          <button 
            className="race-place-btn" 
            onClick={handlePlaceBet}
            disabled={!selectedMarble || !betAmount || phase !== 'BETTING'}
          >
            {phase === 'BETTING' ? 'CONFIRM PREDICTION' : 'RACE LIVE'}
          </button>

          <div className="bets-scroll-list">
            {activeBets.map(bet => (
              <div key={bet.id} className="bet-row">
                <span>{MARBLES.find(m => m.id === bet.marbleId)?.short}</span>
                <span className={`bet-stat ${bet.status.toLowerCase()}`}>
                  ₹{bet.amount} {bet.status !== 'PENDING' && bet.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* History */}
      <div className="history-section-premium">
        <div className="hp-header">LAST 10 RESULTS</div>
        <div className="hp-list">
          {history.map((h, i) => (
            <div key={i} className="hp-chip" style={{ borderColor: h.marble.color }}>
              <div className="hpc-dot" style={{ backgroundColor: h.marble.color }}></div>
              <span>{h.marble.short}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarbleRace;
