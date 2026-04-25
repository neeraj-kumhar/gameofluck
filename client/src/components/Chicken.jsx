import React, { useState } from 'react';
import './Chicken.css';

const MAX_STEPS = 10;
const BASE_MULTIPLIERS = [1.00, 1.15, 1.35, 1.65, 2.10, 2.80, 4.00, 6.50, 11.00, 20.00, 50.00];

const playSFX = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    if (type === 'START') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } 
    else if (type === 'STEP') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    }
    else if (type === 'CRASH') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    }
    else if (type === 'CASHOUT') {
      [500, 650, 800, 1000].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + (i * 0.1));
        gain.gain.setValueAtTime(0, now + (i * 0.1));
        gain.gain.linearRampToValueAtTime(0.3, now + (i * 0.1) + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + (i * 0.1) + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + (i * 0.1));
        osc.stop(now + (i * 0.1) + 0.5);
      });
    }
  } catch(e) { }
};

const Chicken = ({ navigate, balance, setBalance, gameConfig }) => {
  const [phase, setPhase] = useState('IDLE'); // IDLE, PLAYING, CASHOUT, CRASHED
  const [betAmount, setBetAmount] = useState(100);
  const [currentStep, setCurrentStep] = useState(0);
  const [history, setHistory] = useState([]);
  const [lastWinAmount, setLastWinAmount] = useState(0);
  
  const [tiles, setTiles] = useState(Array(MAX_STEPS).fill('UNVISITED'));

  const rtp = gameConfig?.chicken?.rtp || 95;

  const currentMultiplier = BASE_MULTIPLIERS[currentStep];

  const handleStart = () => {
    if (phase !== 'IDLE' && phase !== 'CASHOUT' && phase !== 'CRASHED') return;
    if (balance >= betAmount && betAmount >= 10) {
      playSFX('START');
      setBalance(b => b - betAmount);
      setTiles(Array(MAX_STEPS).fill('UNVISITED'));
      setCurrentStep(0);
      setPhase('PLAYING');
      setLastWinAmount(0);
    } else {
      alert("Insufficient Balance or Minimum bet is ₹10");
    }
  };

  const calculateOutcome = () => {
    const mode = gameConfig?.chicken?.mode || 'random';

    // Apply Admin Control Algorithm
    if (mode === 'force_loss') {
        // Force crash on the 2nd step (so they get a taste of 1.15x but lose if they get greedy)
        if (currentStep >= 1) return 'DANGER';
    } else if (mode === 'force_win') {
        // Never crash
        return 'SAFE';
    } else if (mode === 'house_edge') {
        // Force crash if the potential win multiplier on the next step exceeds 2.0x
        const nextMult = BASE_MULTIPLIERS[currentStep + 1];
        if (nextMult >= 2.0) return 'DANGER';
    }

    // Default Random logic
    const baseDanger = Math.max(0.01, (100 - rtp) / 100);
    const dangerProbability = baseDanger + (currentStep * 0.02); 
    return Math.random() > dangerProbability ? 'SAFE' : 'DANGER';
  };

  const handleNextStep = () => {
    if (phase !== 'PLAYING') return;
    
    const outcome = calculateOutcome();
    const newTiles = [...tiles];
    
    if (outcome === 'SAFE') {
      playSFX('STEP');
      newTiles[currentStep] = 'SAFE';
      setTiles(newTiles);
      
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      
      if (nextStep === MAX_STEPS) {
         handleCashOut(nextStep); // Win max automatically
      }
    } else {
      playSFX('CRASH');
      newTiles[currentStep] = 'DANGER';
      setTiles(newTiles);
      setPhase('CRASHED');
      updateHistory('CRASHED', 0, currentStep);
    }
  };

  const handleCashOut = (forcedStep = null) => {
    const stepToCash = forcedStep !== null ? forcedStep : currentStep;
    if (stepToCash === 0) return; // Cannot cashout at step 0
    
    const mult = BASE_MULTIPLIERS[stepToCash];
    const win = betAmount * mult;
    playSFX('CASHOUT');
    setBalance(b => b + win);
    setLastWinAmount(win);
    setPhase('CASHOUT');
    updateHistory('CASHOUT', mult, stepToCash);
  };

  const updateHistory = (resultPhase, multiplier, step) => {
    setHistory(prev => [{ id: Date.now(), result: resultPhase, mult: multiplier, step }, ...prev].slice(0, 12));
  };

  return (
    <div className="chicken-container animate-fade-in">
      <div className="chicken-header">
        <div className="chicken-history">
          {history.length === 0 && <span style={{color: 'var(--text-muted)'}}>No recent jumps</span>}
          {history.map((h) => (
            <span key={h.id} className={`history-dot ${h.result === 'CASHOUT' ? 'win' : 'lose'}`}>
              {h.result === 'CASHOUT' ? `${h.mult.toFixed(2)}x` : `0x`}
            </span>
          ))}
        </div>
        <div className="global-balance">
          <span>₹ {balance.toFixed(2)}</span>
        </div>
      </div>

      <div className="chicken-layout">
        {/* LEFT / TOP CONTROLS */}
        <div className="chicken-controls">
          <div className="input-group">
            <label>Bet Amount (₹)</label>
            <div className="stepper">
              <button onClick={() => { setBetAmount(Math.max(10, betAmount - 10)); setPhase('IDLE'); }} disabled={phase === 'PLAYING'}>-</button>
              <input 
                type="number" 
                value={betAmount} 
                onChange={(e) => { setBetAmount(Math.max(10, parseFloat(e.target.value) || 10)); setPhase('IDLE'); }}
                disabled={phase === 'PLAYING'}
              />
              <button onClick={() => { setBetAmount(betAmount + 10); setPhase('IDLE'); }} disabled={phase === 'PLAYING'}>+</button>
            </div>
          </div>

          <div className="multiplier-hints">
             <div className="hint-box">
                <span className="hint-label">Current Step</span>
                <span className="hint-value" style={{color: 'var(--primary)'}}>{currentStep} / {MAX_STEPS}</span>
             </div>
             <div className="hint-box">
                <span className="hint-label">Potential Win</span>
                 <span className="hint-value" style={{color: phase === 'PLAYING' ? '#23c773' : '#fff'}}>
                   ₹{(betAmount * (phase === 'PLAYING' ? BASE_MULTIPLIERS[currentStep] : 0)).toFixed(2)}
                 </span>
             </div>
          </div>

          <div className="action-area">
            {phase === 'PLAYING' ? (
              <div className="playing-actions">
                 <button 
                  className="btn-huge btn-cashout" 
                  onClick={() => handleCashOut()} 
                  disabled={currentStep === 0}
                  style={{ opacity: currentStep === 0 ? 0.5 : 1 }}
                >
                   CASH OUT
                   <span>{(betAmount * BASE_MULTIPLIERS[currentStep]).toFixed(2)} ₹</span>
                </button>
                <button className="btn-huge btn-jump" onClick={handleNextStep}>
                   TAKE STEP
                   <span>Next: {BASE_MULTIPLIERS[currentStep + 1]?.toFixed(2)}x</span>
                </button>
              </div>
            ) : (
              <button className="btn-huge btn-bet" onClick={handleStart}>
                {phase === 'IDLE' ? 'START GAME' : phase === 'CRASHED' ? 'TRY AGAIN' : 'PLAY AGAIN'}
                <span>₹ {betAmount.toFixed(2)}</span>
              </button>
            )}
          </div>
        </div>

        <div className="chicken-grid-area">
          {phase === 'CASHOUT' && (
            <div className="result-overlay CASHOUT">
               <h3>Safe!</h3>
               <h2>{lastWinAmount.toFixed(2)} ₹</h2>
            </div>
          )}
          {phase === 'CRASHED' && (
            <div className="result-overlay BUSTED">
               <h3>Fried!</h3>
               <h2>0.00 ₹</h2>
            </div>
          )}
          <div className="road-perspective-wrapper">
            <div className="chicken-path" style={{ '--step-offset': currentStep }}>
            {tiles.map((status, index) => {
              const isCurrent = phase === 'PLAYING' && index === currentStep;
              const isPast = index < currentStep;
               return (
                <div key={index} className={`path-tile ${status} ${isCurrent ? 'ACTIVE' : ''} ${isPast ? 'PAST' : ''}`}>
                   <div className="tile-multiplier">{BASE_MULTIPLIERS[index + 1].toFixed(2)}x</div>
                   <div className="tile-icon">
                     {status === 'UNVISITED' && isCurrent && <img src="/cartoon_chicken.png" className="icon-chicken pulse" alt="Chicken" />}
                     {status === 'UNVISITED' && !isCurrent && index > currentStep && <span className="paws">🐾</span>}
                     {status === 'SAFE' && <span>✅</span>}
                     {status === 'DANGER' && <span>🍗🔥</span>}
                     {index === currentStep - 1 && phase === 'CASHOUT' && <img src="/cartoon_chicken.png" className="icon-chicken-cashout" alt="Win Chicken" />}
                   </div>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chicken;
