import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './ColorPrediction.css';

const socket = io('https://gameofluck-r491.vercel.app');

const playSFX = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    if (type === 'TICK') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'WIN') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'LOSS') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.4);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'BET') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch (e) {}
};

const ColorPrediction = ({ balance, setBalance, gameConfig, navigate }) => {
  const [timeLeft, setTimeLeft] = useState(30);
  const [currentRound, setCurrentRound] = useState('');
  const [phase, setPhase] = useState('BETTING'); // BETTING, RESULT
  const [myBets, setMyBets] = useState([]);
  const [baseAmount, setBaseAmount] = useState(10);
  const [multiplier, setMultiplier] = useState(1);
  const [activeTab, setActiveTab] = useState('history');
  const [showWinPopup, setShowWinPopup] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    socket.emit('join-game', 'color-prediction');

    socket.on('game-state', (state) => {
      setPhase(state.phase);
      setTimeLeft(state.timer);
      setHistory(state.history);
      setCurrentRound(state.history[0]?.period || '000000');
      if (state.phase === 'BETTING') {
        setShowWinPopup(false);
      }
    });

    socket.on('game-result', (result) => {
      setHistory(prev => [result, ...prev].slice(0, 30));
    });

    return () => {
      socket.off('game-state');
      socket.off('game-result');
    };
  }, []);

  const placeBet = (type, value) => {
    if (phase !== 'BETTING') return;
    const amount = baseAmount * multiplier;
    if (balance < amount) return alert('Insufficient Balance');

    playSFX('BET');
    setBalance(prev => prev - amount);
    setMyBets(prev => [...prev, { type, value, amount, id: Date.now() }]);
  };

  const currentBetTotal = baseAmount * multiplier;

  return (
    <div className="color-pred-container">
      {/* Header Area */}
      <div className="cp-header">
        <div className="header-tabs">
          <div className="tab-btn active">Win Go 1min</div>
          <div className="tab-btn">Win Go 3min</div>
        </div>
        <div className="game-timer-box">
          <span className="timer-label">Time remaining</span>
          <div className="timer-value">00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</div>
          <div className="period-id">{currentRound}</div>
        </div>
      </div>

      <button className="how-to-play" style={{background: 'rgba(0,0,0,0.2)', border: '1px solid #4facfe', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', alignSelf: 'flex-start'}}>How to play</button>

      <div className="cp-main-grid">
        <div className="cp-betting-side">
          {/* Primary Color Options */}
          <div className={`color-options-row ${phase !== 'BETTING' ? 'disabled' : ''}`}>
            <button className="cp-btn-large bg-green" onClick={() => placeBet('color', 'green')}>Green</button>
            <button className="cp-btn-large bg-violet" onClick={() => placeBet('color', 'violet')}>Violet</button>
            <button className="cp-btn-large bg-red" onClick={() => placeBet('color', 'red')}>Red</button>
          </div>

          {/* Number Grid */}
          <div className={`num-bg cp-card ${phase !== 'BETTING' ? 'disabled' : ''}`}>
            <div className="number-grid">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                <div key={n} className={`num-circle num-${n}`} onClick={() => placeBet('number', n.toString())}>
                  {n}
                </div>
              ))}
            </div>
          </div>

          {/* Controls & Size */}
          <div className={`controls-section cp-card ${phase !== 'BETTING' ? 'disabled' : ''}`}>
            <div className="multiplier-row">
              <button className="mult-btn" onClick={() => setMultiplier(1)}>Random</button>
              {[1, 5, 10, 20, 50, 100].map(m => (
                <button key={m} className={`mult-btn ${multiplier === m ? 'active' : ''}`} onClick={() => setMultiplier(m)}>
                  X{m}
                </button>
              ))}
            </div>
            
            <div className="size-options">
              <button className="size-btn bg-big" onClick={() => placeBet('size', 'big')}>Big</button>
              <button className="size-btn bg-small" onClick={() => placeBet('size', 'small')}>Small</button>
            </div>
          </div>
        </div>

        <div className="cp-history-side">
          {/* Tabs & History */}
          <div className="history-section cp-card">
            <div className="history-tabs-nav">
              <div className={`hist-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Game history</div>
              <div className={`hist-tab ${activeTab === 'chart' ? 'active' : ''}`} onClick={() => setActiveTab('chart')}>Chart</div>
              <div className={`hist-tab ${activeTab === 'myBets' ? 'active' : ''}`} onClick={() => setActiveTab('myBets')}>My history</div>
            </div>

            {activeTab === 'history' && (
              <div className="table-responsive">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Number</th>
                      <th>Big Small</th>
                      <th>Color</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i}>
                        <td>{h.period || h.round}</td>
                        <td style={{color: (h.color && h.color[0] === 'red') ? 'var(--cp-red)' : 'var(--cp-green)', fontWeight: 'bold'}}>
                          {h.number !== undefined ? h.number : h.num}
                        </td>
                        <td>
                          {h.size ? (h.size === 'big' ? 'Big' : 'Small') : (h.number >= 5 ? 'Big' : 'Small')}
                        </td>
                        <td>
                          {Array.isArray(h.color) ? h.color.map((c, ci) => (
                            <span key={ci} className="dot" style={{backgroundColor: `var(--cp-${c})`, marginLeft: '3px'}}></span>
                          )) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {activeTab === 'myBets' && (
              <div className="my-bets-list" style={{padding: '10px', fontSize: '13px'}}>
                {myBets.length === 0 ? "No active bets" : myBets.map(b => (
                  <div key={b.id} style={{padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                    {b.type.toUpperCase()}: {b.value.toUpperCase()} - ₹{b.amount}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Balance Bar (Responsive) */}
      <div className="cp-balance-bar">
         <div style={{display: 'flex', flexDirection: 'column'}}>
            <span style={{fontSize: '10px', color: '#94a3b8'}}>Wallet Balance</span>
            <span style={{fontSize: '16px', fontWeight: 'bold'}}>₹ {balance.toFixed(2)}</span>
         </div>
         <button 
            className="btn-primary btn" 
            style={{borderRadius: '4px', padding: '0 25px'}}
            onClick={() => navigate && navigate('recharge')}
          >
            RECHARGE
          </button>

      </div>

      {/* Win Popup */}
      {showWinPopup && (
        <div className="win-overlay" onClick={() => setShowWinPopup(false)}>
           <div className="win-popup-card" onClick={e => e.stopPropagation()}>
              <div className="win-rocket">🚀</div>
              <div className="win-title">Congratulations</div>
              <div style={{fontSize: '14px', marginBottom: '20px'}}>Lottery Result: <span className={`bg-${history[0]?.color[0]}`} style={{padding: '2px 8px', borderRadius: '4px'}}>{history[0]?.color[0].toUpperCase()}</span> {history[0]?.num}</div>
              <div className="win-amount-box">
                <div style={{fontSize: '12px', color: '#64748b'}}>Bonus</div>
                <div className="win-val">₹{winAmount.toFixed(2)}</div>
                <div style={{fontSize: '10px', marginTop: '10px', color: '#94a3b8'}}>Period: 1 minute {history[0]?.round}</div>
              </div>
              <div className="auto-close">3 seconds auto close</div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ColorPrediction;
