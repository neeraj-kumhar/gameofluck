import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './Aviator.css';

const socket = io('http://localhost:5000');

const playSFX = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    if (type === 'FLYING') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(50, now);
      osc.frequency.linearRampToValueAtTime(150, now + 1.5);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 2.0);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 2.0);
    }
    else if (type === 'CASHOUT') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1600, now);
      osc.frequency.exponentialRampToValueAtTime(2400, now + 0.1);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    }
    else if (type === 'CRASH') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.6);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.5, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.8);
    }
    else if (type === 'BET') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch(e) { }
};

const Aviator = ({ balance, setBalance, navigate }) => {
  const [phase, setPhase] = useState('WAITING'); 
  const [multiplier, setMultiplier] = useState(1.00);
  const [betAmount, setBetAmount] = useState(100);
  const [hasBet, setHasBet] = useState(false);
  const [autoCashout, setAutoCashout] = useState(2.00);
  const [winAmount, setWinAmount] = useState(null);
  
  const [history, setHistory] = useState([1.23, 2.45, 1.00, 5.67, 1.15, 3.20, 1.88, 14.50, 1.02, 3.40]);
  const [liveBets, setLiveBets] = useState([]);
  const [waitTime, setWaitTime] = useState(10.0);

  const historyRef = useRef(null);
  const hasBetRef = useRef(hasBet);
  const autoCashoutRef = useRef(autoCashout);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollLeft = 0;
    }
  }, [history]);

  useEffect(() => {
    socket.emit('join-game', 'aviator');

    socket.on('game-state', (state) => {
      setPhase(state.phase);
      setMultiplier(state.multiplier);
      setWaitTime(parseFloat(state.timer));
      setHistory(state.history);

      if (state.phase === 'FLYING') {
         // Auto-cashout logic
         if (hasBetRef.current && state.multiplier >= autoCashoutRef.current) {
            handleCashOutDirect(state.multiplier);
         }
      }

      if (state.phase === 'WAITING') {
        setWinAmount(null);
      }
    });

    socket.on('game-result', (result) => {
      setPhase('CRASHED');
      setMultiplier(result.crashPoint);
      setHasBet(false);
      hasBetRef.current = false;
    });

    return () => {
      socket.off('game-state');
      socket.off('game-result');
    };
  }, []);

  useEffect(() => { 
    hasBetRef.current = hasBet; 
    autoCashoutRef.current = autoCashout;
  }, [hasBet, autoCashout]);

  // Separate effect for simulated bots during flight
  useEffect(() => {
    if (phase !== 'FLYING') return;

    setLiveBets(bets => {
      let updated = false;
      const newBets = bets.map(b => {
        if (!b.cashedOutAt && multiplier >= b.targetCrash) {
          updated = true;
          return { ...b, cashedOutAt: multiplier };
        }
        return b;
      });
      return updated ? newBets.sort((a,b) => (b.cashedOutAt ? 1 : 0) - (a.cashedOutAt ? 1 : 0)) : bets;
    });
  }, [multiplier, phase]);

  const handleBet = () => {
    const amount = parseFloat(betAmount || 0);
    if (phase === 'WAITING' && !hasBet) {
      if (balance >= amount && amount > 0) {
        playSFX('BET');
        setBalance(prev => prev - amount);
        setHasBet(true);
      } else {
        alert("Insufficient balance or invalid bet!");
      }
    }
  };

  const handleCashOut = () => {
    if (phase === 'FLYING' && hasBet) {
       handleCashOutDirect(multiplier);
    }
  };

  // Dedicated direct-ref cashout function block allowing animation loop calls safely
  const handleCashOutDirect = (cashOutMult) => {
    playSFX('CASHOUT');
    setBalance(prev => prev + (betAmount * cashOutMult));
    setWinAmount(betAmount * cashOutMult);
    setHasBet(false);
    hasBetRef.current = false; // ensure the ref immediately drops avoiding multi-hits
  };

  const getMultiplierColor = (mult) => {
    if (mult < 1.5) return '#ff2a2a'; 
    if (mult < 2.5) return '#b485ff';
    if (mult < 10) return '#23c773';
    return '#ffc107';
  };

  return (
    <div className="aviator-container animate-fade-in">
      <div className="aviator-header">
        <div className="aviator-history" ref={historyRef}>
          {history.map((h, i) => (
            <span key={i} className="history-pill" style={{ color: getMultiplierColor(h) }}>
              {h.toFixed(2)}x
            </span>
          ))}
        </div>
        <div className="aviator-balance" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>₹ {balance.toFixed(2)}</span>
          <button 
             className="btn-primary" 
             style={{ padding: '0 8px', fontSize: '18px', borderRadius: '4px', cursor: 'pointer', border: 'none', background: 'var(--primary)', color: '#000', fontWeight: 'bold' }}
             onClick={() => navigate && navigate('recharge')}
          >
            +
          </button>
        </div>
      </div>

      <div className="aviator-layout">
        <div className="aviator-live-bets">
          <div className="live-bets-header">
            <h3>ALL BETS</h3>
            <h3>{liveBets.length}</h3>
          </div>
          <div className="bets-list">
            {hasBet && (
               <div className="bet-row winner" style={{ border: '1px solid var(--primary)', background: 'rgba(1, 250, 254, 0.1)' }}>
                  <span className="bet-user">You</span>
                  <span className="bet-amount">₹{betAmount}</span>
                  <span className="bet-mult" style={{ color: winAmount ? '#23c773' : 'var(--text-muted)' }}>
                    {winAmount ? `${(winAmount/betAmount).toFixed(2)}x` : '-'}
                  </span>
               </div>
            )}
            {liveBets.map((b) => (
              <div key={b.id} className={`bet-row ${b.cashedOutAt ? 'winner' : ''}`}>
                <span className="bet-user">{b.name}</span>
                <span className="bet-amount">₹{b.bet}</span>
                <span className="bet-mult" style={{ color: b.cashedOutAt ? '#23c773' : 'var(--text-muted)' }}>
                  {b.cashedOutAt ? `${b.cashedOutAt.toFixed(2)}x` : '-'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="aviator-main">
          <div className={`game-screen ${phase === 'CRASHED' ? 'crashed' : ''}`}>
            {phase === 'WAITING' && (
              <div className="waiting-spinner">
                <span className="moving-prop">✈️</span>
                <h2 style={{color: '#ff2a2a', letterSpacing: '2px', fontSize: '20px', margin: '0'}}>WAITING FOR NEXT ROUND</h2>
                <div className="progress-bar-container">
                   <div className="progress-fill" style={{ width: `${(waitTime / 5) * 100}%`}}></div>
                </div>
              </div>
            )}
            
            {(phase === 'FLYING' || phase === 'CRASHED') && (
               <>
                {phase === 'FLYING' && (
                  <div className="flying-multiplier" style={{ color: getMultiplierColor(multiplier) }}>
                    {multiplier.toFixed(2)}x
                  </div>
                )}
                
                {phase === 'CRASHED' && (
                  <div className="crashed-message">
                    <h2>FLEW AWAY!</h2>
                    <h1>{multiplier.toFixed(2)}x</h1>
                  </div>
                )}

                <div className="plane-container">
                   <svg width="100%" height="100%" viewBox="0 0 1000 500" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0 }}>
                     <path 
                       d={`M 0 500 Q ${Math.min((multiplier - 1) * 150, 450)} 500 ${Math.min((multiplier - 1) * 300, 900)} ${500 - Math.min((multiplier - 1) * 120, 400)} L ${Math.min((multiplier - 1) * 300, 900)} 500 L 0 500 Z`}
                       fill="rgba(220, 53, 69, 0.2)" 
                       style={{ opacity: phase === 'CRASHED' ? 0 : 1, transition: phase === 'CRASHED' ? 'opacity 0.2s' : 'none' }}
                     />
                     <path 
                       d={`M 0 500 Q ${Math.min((multiplier - 1) * 150, 450)} 500 ${Math.min((multiplier - 1) * 300, 900)} ${500 - Math.min((multiplier - 1) * 120, 400)}`}
                       fill="none"
                       stroke="#dc3545" 
                       strokeWidth="6"
                       style={{ filter: 'drop-shadow(0 0 5px #dc3545)', opacity: phase === 'CRASHED' ? 0.3 : 1 }}
                     />
                   </svg>
                   
                   <svg width="80" height="80" viewBox="0 0 24 24" fill="#dc3545" className="plane-svg" 
                        style={{ 
                          position: 'absolute',
                          left: `calc(${Math.min((multiplier - 1) * 30, 90)}% - 40px)`,
                          bottom: `calc(${Math.min((multiplier - 1) * 24, 80)}% - 40px)`,
                          transform: phase === 'FLYING' ? `rotate(30deg)` : `translateY(40px) rotate(120deg)`,
                          opacity: phase === 'CRASHED' ? 0 : 1,
                          filter: 'drop-shadow(0 0 10px rgba(220,53,69,0.8))',
                          transition: phase === 'CRASHED' ? 'transform 0.5s ease-in, opacity 0.5s ease-in' : 'none'
                        }}>
                     <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                   </svg>
                </div>
               </>
            )}
          </div>

          <div className="controls-panel">
            <div className="bet-control-card">
              <div className="bet-inputs">
                <div className="input-block">
                  <label>Bet Amount</label>
                  <div className="controls-stepper">
                    <button className="stepper-btn" onClick={() => setBetAmount(Math.max(10, parseFloat(betAmount || 0) - 10))}>-</button>
                    <input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} disabled={hasBet} />
                    <button className="stepper-btn" onClick={() => setBetAmount(parseFloat(betAmount || 0) + 10)}>+</button>
                  </div>
                </div>
                <div className="input-block">
                   <label>Auto Cash Out</label>
                   <div className="controls-stepper">
                     <button className="stepper-btn" onClick={() => setAutoCashout(Math.max(1.01, parseFloat(autoCashout || 0) - 0.1).toFixed(2))}>-</button>
                     <input type="number" step="0.1" value={autoCashout} onChange={(e) => setAutoCashout(e.target.value)} />
                     <button className="stepper-btn" onClick={() => setAutoCashout((parseFloat(autoCashout || 0) + 0.1).toFixed(2))}>+</button>
                   </div>
                </div>
              </div>

              <div className="action-btn-area">
                {phase === 'WAITING' ? (
                  <button 
                    className={`big-toggle-btn ${hasBet ? 'btn-cancel' : 'btn-place'}`}
                    onClick={() => hasBet ? setHasBet(false) : handleBet()}
                  >
                    {hasBet ? (
                      <>CANCEL<span className="btn-subtext">Waiting next round</span></>
                    ) : (
                      <>BET<span className="btn-subtext">₹ {parseFloat(betAmount || 0).toFixed(2)}</span></>
                    )}
                  </button>
                ) : phase === 'FLYING' ? (
                  <button 
                    className={`big-toggle-btn ${hasBet ? 'btn-cashout' : 'btn-disabled'}`}
                    disabled={!hasBet}
                    onClick={() => handleCashOut()}
                  >
                    {hasBet ? (
                      <>CASH OUT<span className="btn-subtext">₹ {(betAmount * multiplier).toFixed(2)}</span></>
                    ) : (
                      <>WAITING...</>
                    )}
                  </button>
                ) : (
                  <button className="big-toggle-btn btn-disabled" disabled>
                    CRASHED
                  </button>
                )}
              </div>
            </div>
            
            {winAmount && <div className="win-toast">+ ₹{winAmount.toFixed(2)}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Aviator;
