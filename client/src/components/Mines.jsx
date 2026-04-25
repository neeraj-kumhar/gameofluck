import React, { useState, useEffect } from 'react';
import './Mines.css';

// Mathematical Combinatorics for Mines Multiplier
const factorialize = (num) => {
  if (num < 0) return -1;
  else if (num == 0) return 1;
  else {
    return (num * factorialize(num - 1));
  }
};

const calcMultiplier = (totalTiles, traps, hits, rtp) => {
  // Fair formula: Multiplier = (totalTiles C traps) / ((totalTiles - hits) C traps) * RTP_Margin
  // Simplified logic avoiding heavy combinations for client
  // M_n = M_n-1 * (Total - hits_prev) / (Total - hits_prev - traps) * edge

  if (hits === 0) return 1.00;

  let currentMult = 1.00;
  let remaining = totalTiles;
  const edge = rtp / 100.0;

  for (let i = 0; i < hits; i++) {
    currentMult *= (remaining / (remaining - traps));
    remaining--;
  }

  return (currentMult * edge).toFixed(2);
};

const MINES_GRID_SIZE = 25;

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
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    }
    else if (type === 'SAFE') {
      // Sparkle Ding
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(2400, now + 0.1);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    }
    else if (type === 'MINE') {
      // Explosion thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.4);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.5, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    }
    else if (type === 'CASHOUT') {
      // Success chord structure
      [400, 500, 600, 800].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + (i * 0.1));
        gain.gain.setValueAtTime(0, now + (i * 0.1));
        gain.gain.linearRampToValueAtTime(0.3, now + (i * 0.1) + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + (i * 0.1) + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + (i * 0.1));
        osc.stop(now + (i * 0.1) + 0.6);
      });
    }
  } catch (e) { console.warn("Audio skipped", e); }
};

const Mines = ({ balance, setBalance, gameConfig }) => {
  const [phase, setPhase] = useState('IDLE'); // IDLE, PLAYING, CASHOUT, BUSTED
  const mineCount = gameConfig?.mines?.count || 3;
  const [betAmount, setBetAmount] = useState('100');

  const [grid, setGrid] = useState(Array(MINES_GRID_SIZE).fill({ status: 'HIDDEN', isMine: false }));
  const [openedCount, setOpenedCount] = useState(0);
  const [multiplier, setMultiplier] = useState(1.00);
  const [nextMultiplier, setNextMultiplier] = useState(1.00);

  const [history, setHistory] = useState([]);
  const [profit, setProfit] = useState(0);

  useEffect(() => {
    // Re-calc next multiplier hint when idle/playing changes
    const rtp = gameConfig?.mines?.rtp || 95;
    const nextM = calcMultiplier(MINES_GRID_SIZE, mineCount, openedCount + 1, rtp);
    setNextMultiplier(parseFloat(nextM));
  }, [mineCount, openedCount, gameConfig]);

  const startGame = () => {
    const bet = parseFloat(betAmount || 0);
    if (bet <= 0 || balance < bet) {
      alert("Invalid bet or insufficient balance!");
      return;
    }

    playSFX('START');
    setBalance(prev => prev - bet);
    setPhase('PLAYING');
    setOpenedCount(0);
    setMultiplier(1.00);
    setProfit(0);

    // Generate mines
    const positions = new Set();
    while (positions.size < mineCount) {
      positions.add(Math.floor(Math.random() * MINES_GRID_SIZE));
    }

    const newGrid = Array(MINES_GRID_SIZE).fill(null).map((_, i) => ({
      status: 'HIDDEN',
      isMine: positions.has(i)
    }));

    setGrid(newGrid);
  };

  const handleTileClick = (index) => {
    if (phase !== 'PLAYING') return;
    if (grid[index].status !== 'HIDDEN') return;

    let hitMine = grid[index].isMine;
    const mode = gameConfig?.mines?.mode || 'random';
    const newGrid = [...grid];

    // Apply Admin Control Algorithm
    if (mode === 'force_loss') {
      // Force a loss on the 2nd click
      if (openedCount >= 1 && !hitMine) {
        hitMine = true;
      }
    } else if (mode === 'force_win') {
      // Prevent hitting a mine unless absolutely forced
      if (hitMine && openedCount < MINES_GRID_SIZE - mineCount) {
        hitMine = false;
      }
    } else if (mode === 'house_edge') {
      // If next multiplier exceeds 2.0x, force a loss
      const rtp = gameConfig?.mines?.rtp || 95;
      const currentM = parseFloat(calcMultiplier(MINES_GRID_SIZE, mineCount, openedCount + 1, rtp));
      if (currentM >= 2.0 && !hitMine) {
        hitMine = true;
      }
    }

    // If we dynamically changed hitMine, update the grid state to reflect the swap
    if (hitMine && !grid[index].isMine) {
      // Find a hidden mine and make it safe
      const mineIndex = newGrid.findIndex((t, i) => t.isMine && t.status === 'HIDDEN' && i !== index);
      if (mineIndex !== -1) newGrid[mineIndex] = { ...newGrid[mineIndex], isMine: false };
      newGrid[index] = { ...newGrid[index], isMine: true };
    } else if (!hitMine && grid[index].isMine) {
      // Find a hidden safe spot and make it a mine
      const safeIndex = newGrid.findIndex((t, i) => !t.isMine && t.status === 'HIDDEN' && i !== index);
      if (safeIndex !== -1) newGrid[safeIndex] = { ...newGrid[safeIndex], isMine: true };
      newGrid[index] = { ...newGrid[index], isMine: false };
    }

    newGrid[index] = { ...newGrid[index], status: 'REVEALED' };
    setGrid(newGrid);

    if (hitMine) {
      // Game Over
      playSFX('MINE');
      setPhase('BUSTED');
      revealAll(newGrid);
      setHistory(h => [{ win: false, mult: 0, mines: mineCount }, ...h].slice(0, 15));
    } else {
      // Safe Hit
      playSFX('SAFE');
      const newOpenedCount = openedCount + 1;
      setOpenedCount(newOpenedCount);

      const rtp = gameConfig?.mines?.rtp || 95;
      const newMult = parseFloat(calcMultiplier(MINES_GRID_SIZE, mineCount, newOpenedCount, rtp));
      setMultiplier(newMult);

      if (newOpenedCount >= (MINES_GRID_SIZE - mineCount)) {
        // Auto cashout on perfect game
        cashOut(newMult);
      }
    }
  };

  const cashOut = (forceMult) => {
    if (phase !== 'PLAYING') return;
    const multToUse = forceMult || multiplier;
    const bet = parseFloat(betAmount || 0);
    const win = bet * multToUse;

    playSFX('CASHOUT');
    setPhase('CASHOUT');
    setBalance(prev => prev + win);
    setProfit(win - bet);

    revealAll(grid, true);
    setHistory(h => [{ win: true, mult: multToUse, mines: mineCount }, ...h].slice(0, 15));
  };

  const revealAll = (currentGrid, asFaded = false) => {
    const revealedGrid = currentGrid.map(tile => {
      if (tile.status === 'HIDDEN') {
        return { ...tile, status: asFaded ? 'FADED' : 'REVEALED' };
      }
      return tile;
    });
    setGrid(revealedGrid);
  };

  const multColor = phase === 'BUSTED' ? '#ff2a2a' : phase === 'CASHOUT' ? '#23c773' : '#fff';

  return (
    <div className="mines-container animate-fade-in">
      <div className="mines-header">
        <div className="mines-history">
          {history.map((h, i) => (
            <div key={i} className={`history-dot ${h.win ? 'win' : 'lose'}`} title={`${h.mines} Mines - ${h.mult}x`}>
              {h.mult > 0 ? `${h.mult.toFixed(2)}x` : '💣'}
            </div>
          ))}
        </div>
        <div className="global-balance">
          <span>₹ {balance.toFixed(2)}</span>
        </div>
      </div>

      <div className="mines-layout">

        {/* LEFT CONTROLS */}
        <div className="mines-controls">

          <div className="input-group">
            <label>Bet Amount</label>
            <div className="stepper">
              <button onClick={() => setBetAmount((Math.max(10, parseFloat(betAmount || 0) - 10)).toString())} disabled={phase === 'PLAYING'}>-</button>
              <input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} disabled={phase === 'PLAYING'} />
              <button onClick={() => setBetAmount((parseFloat(betAmount || 0) + 10).toString())} disabled={phase === 'PLAYING'}>+</button>
            </div>
          </div>

          <div className="action-area" style={{ marginTop: '0' }}>
            {phase === 'PLAYING' ? (
              <button className="btn-huge btn-cashout" onClick={() => cashOut(multiplier)}>
                CASH OUT
                <span>₹ {(parseFloat(betAmount || 0) * multiplier).toFixed(2)}</span>
              </button>
            ) : (
              <button className="btn-huge btn-bet" onClick={startGame}>
                {phase === 'IDLE' ? 'START GAME' : 'PLAY AGAIN'}
              </button>
            )}
          </div>

          <div className="multiplier-hints">
            <div className="hint-box">
              <span className="hint-label">Current</span>
              <span className="hint-value" style={{ color: multColor }}>{multiplier.toFixed(2)}x</span>
            </div>
            <div className="hint-box">
              <span className="hint-label">Next Hit</span>
              <span className="hint-value">{phase === 'PLAYING' ? nextMultiplier.toFixed(2) : '-'}x</span>
            </div>
          </div>

        </div>

        {/* RIGHT GRID */}
        <div className="mines-grid-area">
          {(phase === 'CASHOUT' || phase === 'BUSTED') && (
            <div className={`result-overlay ${phase}`}>
              <h3>{phase === 'CASHOUT' ? 'YOU WON!' : 'BUSTED!'}</h3>
              <h2>{phase === 'CASHOUT' ? `₹${(parseFloat(betAmount || 0) + profit).toFixed(2)}` : `0.00x`}</h2>
              {phase === 'CASHOUT' && <p style={{ margin: '5px 0 0', color: '#fff', fontWeight: 600 }}>Profit: + ₹{profit.toFixed(2)}</p>}
            </div>
          )}

          <div className={`mines-grid ${phase !== 'PLAYING' ? 'grid-locked' : ''}`}>
            {grid.map((tile, i) => (
              <div
                key={i}
                className={`mine-tile ${tile.status}`}
                onClick={() => handleTileClick(i)}
              >
                <div className="tile-inner">
                  <div className="tile-front"></div>
                  <div className="tile-back">
                    {tile.isMine ? <span className="icon-bomb">💣</span> : <span className="icon-gem">💎</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Mines;
