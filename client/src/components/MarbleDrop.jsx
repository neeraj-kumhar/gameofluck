import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import './MarbleDrop.css';

const DEFAULT_MULTIPLIERS = {
  low: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
  medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
  high: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29]
};

const SOUND_URLS = {
  DROP: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  BOUNCE: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  WIN: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
  LOSS: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'
};

const MarbleDrop = ({ balance, setBalance, gameConfig }) => {
  const config = useMemo(() => ({
    rtp: gameConfig?.marbleDrop?.rtp ?? 97,
    rows: gameConfig?.marbleDrop?.rows ?? 8,
    multipliers: gameConfig?.marbleDrop?.multipliers ?? DEFAULT_MULTIPLIERS
  }), [gameConfig]);

  const rows = Math.min(Math.max(config.rows || 8, 8), 16);
  
  const [arenaWidth, setArenaWidth] = useState(600);
  const [arenaHeight, setArenaHeight] = useState(650);
  const containerRef = useRef(null);
  
  // ADAPTIVE GEOMETRY: Scale sizes based on screen width
  const isSmallScreen = arenaWidth < 600;
  const HORIZONTAL_SPACING = Math.min(isSmallScreen ? 45 : 75, (arenaWidth * 0.9) / rows);
  const VERTICAL_SPACING = HORIZONTAL_SPACING * 0.95; 
  const BALL_SIZE = isSmallScreen ? 5 : (rows > 10 ? 6 : 9);

  const BALL_COLORS = ['#01fafe', '#A020F0', '#39FF14', '#FFAC1C', '#FF007F'];

  const [risk, setRisk] = useState('medium');
  const [betAmount, setBetAmount] = useState('10');
  const [history, setHistory] = useState([]);
  const [autoDrop, setAutoDrop] = useState(false);
  const [stats, setStats] = useState({ totalBet: 0, totalPayout: 0, drops: 0 });
  const [isMuted, setIsMuted] = useState(false);
  
  const canvasRef = useRef(null);
  const ballsRef = useRef([]);
  const pegHitsRef = useRef({}); // Tracks timestamp of last hit for each peg
  const requestRef = useRef();
  const autoDropIntervalRef = useRef();
  const soundsRef = useRef({});
  const effectsRef = useRef([]); // Floating point popups

  // Initialize sounds
  useEffect(() => {
    soundsRef.current = {
      drop: new Audio(SOUND_URLS.DROP),
      bounce: new Audio(SOUND_URLS.BOUNCE),
      win: new Audio(SOUND_URLS.WIN),
      loss: new Audio(SOUND_URLS.LOSS)
    };
  }, []);

  const playSound = (soundKey) => {
    if (isMuted || !soundsRef.current[soundKey]) return;
    const sound = soundsRef.current[soundKey].cloneNode(); // Clone to allow overlapping sounds
    sound.volume = soundKey === 'bounce' ? 0.4 : 0.8;
    sound.play().catch(e => console.log('Audio playback prevented', e));
  };

  // Resize Handling
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setArenaWidth(width);
      // On mobile, height is more flexible
      setArenaHeight(width < 768 ? Math.max(350, window.innerHeight * 0.4) : Math.max(500, height));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Procedural Multiplier Generator
  const generateMultipliers = (count, level) => {
    // Basic symmetric distribution
    // level: low (safe), medium (standard), high (volatile)
    const base = level === 'high' ? 2.0 : level === 'medium' ? 1.5 : 1.2;
    const centerIdx = count / 2;
    const mults = [];
    
    for (let i = 0; i <= count; i++) {
        const dist = Math.abs(i - centerIdx);
        let m;
        if (level === 'high') {
          m = Math.pow(1.8, dist) * 0.2;
        } else if (level === 'medium') {
          m = Math.pow(1.5, dist) * 0.4;
        } else {
          m = Math.pow(1.2, dist) * 0.7;
        }
        
        // Ensure center is low, edges are high
        if (dist === 0) m = level === 'high' ? 0.2 : level === 'medium' ? 0.4 : 0.6;
        
        mults.push(parseFloat(m.toFixed(1)));
    }
    return mults;
  };

  const currentMultipliers = useMemo(() => {
    // If config defines exact multipliers for this risk, use them
    if (config.multipliers[risk] && config.multipliers[risk].length === rows + 1) {
      return config.multipliers[risk];
    }
    // Else generate procedurally for this row count
    return generateMultipliers(rows, risk);
  }, [risk, rows, config.multipliers]);

  // Logic Helpers
  const precalculateBucket = (n, rtp) => {
    // Weighted binomial distribution based on RTP
    // Center buckets are higher probability, edges are lower but high reward
    // We adjust the 'p' (probability of right) to bias if needed, but usually 0.5 is fair.
    let rights = 0;
    for (let i = 0; i < n; i++) {
      if (Math.random() > 0.5) rights++;
    }
    return rights;
  };

  const generatePhysicsPath = (targetBucket, totalRows) => {
    const path = [];
    let currentBucket = 0;
    
    // We need to end up at targetBucket after totalRows decisions.
    // Each row we can go +0 or +1 in the bucket index.
    const decisions = new Array(totalRows).fill(0);
    let rightsAssigned = 0;
    while (rightsAssigned < targetBucket) {
      const idx = Math.floor(Math.random() * totalRows);
      if (decisions[idx] === 0) {
        decisions[idx] = 1;
        rightsAssigned++;
      }
    }

    return decisions; // 0 for Left, 1 for Right
  };

  const dropBall = useCallback(() => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0 || bet > balance) {
        setAutoDrop(false);
        return;
    }

    playSound('drop');
    setBalance(prev => prev - bet);
    setStats(prev => ({ ...prev, drops: prev.drops + 1 }));

    const targetBucket = precalculateBucket(rows, config.rtp);
    const path = generatePhysicsPath(targetBucket, rows);

    const newBall = {
      id: Date.now() + Math.random(),
      path,
      targetBucket,
      bet,
      risk,
      row: 0,
      x: 0, // Offset from center
      y: -20,
      vx: 0,
      vy: 2,
      lastSoundRow: -1,
      color: BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)],
      bouncing: false,
      finished: false,
      startTime: performance.now(),
    };

    ballsRef.current.push(newBall);
  }, [balance, betAmount, rows, config.rtp, risk]);

  // Auto Drop Effect
  useEffect(() => {
    if (autoDrop) {
      autoDropIntervalRef.current = setInterval(dropBall, 300);
    } else {
      clearInterval(autoDropIntervalRef.current);
    }
    return () => clearInterval(autoDropIntervalRef.current);
  }, [autoDrop, dropBall]);

  // Animation System
  const animate = useCallback((time) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    
    ctx.clearRect(0, 0, w, h);
    drawBoardFrame(ctx, w, h);
    drawPegs(ctx, w, h, rows, time);
    drawEffects(ctx);

    ballsRef.current = ballsRef.current.filter(ball => {
      if (ball.finished) return false;

      // Physics Simulation
      const elapsed = time - ball.startTime;
      const SEC_PER_ROW = 0.6;
      const currentRow = Math.floor(elapsed / (SEC_PER_ROW * 1000));
      const rowProgress = (elapsed % (SEC_PER_ROW * 1000)) / (SEC_PER_ROW * 1000);

      if (currentRow < rows) {
          // Horizontal path following
          let targetX = 0;
          for (let i = 0; i < currentRow; i++) {
              targetX += ball.path[i] === 1 ? (HORIZONTAL_SPACING/2) : -(HORIZONTAL_SPACING/2);
          }
          const nextMove = ball.path[currentRow] === 1 ? (HORIZONTAL_SPACING/2) : -(HORIZONTAL_SPACING/2);
          
          // Smooth bounce interpolation
          const peakY = -(VERTICAL_SPACING/3) * Math.sin(rowProgress * Math.PI);
          ball.x = targetX + nextMove * rowProgress;
          ball.y = currentRow * VERTICAL_SPACING + VERTICAL_SPACING * rowProgress + peakY;

          // Sound trigger for bounce
          if (rowProgress > 0.4 && ball.lastSoundRow !== currentRow) {
            playSound('bounce');
            ball.lastSoundRow = currentRow;
            
            // Register peg hit for visual pulse
            const pegXIndex = ball.path.slice(0, currentRow + 1).filter(d => d === 1).length;
            const pegKey = `${currentRow}-${pegXIndex}`;
            pegHitsRef.current[pegKey] = time;
          }
      } else {
          // Landing phase
          ball.y += 5;
          if (ball.y >= rows * VERTICAL_SPACING + 40) {
              ball.finished = true;
              handleBallFinish(ball);
              return false;
          }
      }

      drawBall(ctx, ball, w);
      return true;
    });

    requestRef.current = requestAnimationFrame(animate);
  }, [rows]);

  const handleBallFinish = (ball) => {
    const mult = currentMultipliers[ball.targetBucket] || 1;
    const payout = (ball.bet || 0) * mult;
    
    if (mult >= 1) playSound('win');
    else playSound('loss');

    // Spawn point bubble
    const w = canvasRef.current?.width || 600;
    const netProfit = payout - ball.bet;
    
    effectsRef.current.push({
      x: (w / 2) + ball.x,
      y: ball.y + 20,
      text: `${netProfit >= 0 ? '+' : '-'}₹${Math.abs(netProfit).toFixed(1)}`,
      subtext: `${mult.toFixed(1)}x`,
      color: netProfit >= 0 ? '#4ade80' : '#ef4444',
      opacity: 1,
      life: 60
    });

    setBalance(prev => prev + payout);
    setStats(prev => ({ 
      ...prev, 
      totalBet: (prev.totalBet || 0) + (ball.bet || 0),
      totalPayout: (prev.totalPayout || 0) + payout 
    }));
    setHistory(prev => [{ id: ball.id, bet: ball.bet, mult, payout, risk: ball.risk }, ...prev].slice(0, 10));
  };

  const drawBoardFrame = (ctx, w, h) => {
    const startY = 40;
    const endY = (rows - 1) * VERTICAL_SPACING + startY;
    const bottomStartX = w / 2 - ((rows - 1) * (HORIZONTAL_SPACING/2));
    const bottomEndX = w / 2 + ((rows - 1) * (HORIZONTAL_SPACING/2));

    ctx.strokeStyle = 'rgba(1, 250, 254, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2, startY - 20); // Top Peak
    ctx.lineTo(bottomEndX + 15, endY + 15); // Right Corner
    ctx.lineTo(bottomStartX - 15, endY + 15); // Left Corner
    ctx.closePath();
    ctx.stroke();

    // Chute lines for buckets
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(1, 250, 254, 0.05)';
    for (let i = 0; i <= rows; i++) {
        const x = w / 2 - (rows * (HORIZONTAL_SPACING/2)) + i * HORIZONTAL_SPACING;
        ctx.moveTo(x, endY + 15);
        ctx.lineTo(x, endY + 100);
    }
    ctx.stroke();
  };

  const drawPegs = (ctx, w, h, rowsCount, currentTime) => {
    for (let i = 0; i < rowsCount; i++) {
        const rowY = i * VERTICAL_SPACING + 40;
        const pegsInRow = i + 1;
        const startX = w / 2 - (i * (HORIZONTAL_SPACING/2));
        
        for (let j = 0; j < pegsInRow; j++) {
          const pegKey = `${i}-${j}`;
          const lastHit = pegHitsRef.current[pegKey] || 0;
          const timeSinceHit = currentTime - lastHit;
          const isPulsing = timeSinceHit < 200;
          
          ctx.fillStyle = isPulsing ? '#01fafe' : 'rgba(255, 255, 255, 0.2)';
          ctx.shadowBlur = isPulsing ? 15 : 5;
          ctx.shadowColor = isPulsing ? '#01fafe' : 'rgba(255, 255, 255, 0.2)';
          
          ctx.beginPath();
          ctx.arc(startX + j * HORIZONTAL_SPACING, rowY, isPulsing ? 4 : 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.shadowBlur = 0;
  };

  const drawEffects = (ctx) => {
    effectsRef.current = effectsRef.current.filter(eff => {
      eff.y -= 1;
      eff.life -= 1;
      eff.opacity = eff.life / 60;
      
      ctx.globalAlpha = eff.opacity;
      ctx.fillStyle = eff.color;
      ctx.font = '900 22px Outfit';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#000';
      ctx.save();
      ctx.translate(eff.x, eff.y);
      ctx.scale(1 + (1 - eff.opacity), 1 + (1 - eff.opacity));
      ctx.fillText(eff.text, 0, 0);
      ctx.font = '900 14px Outfit';
      ctx.fillText(eff.subtext, 0, 15);
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      
      return eff.life > 0;
    });
  };

  const drawBall = (ctx, ball, w) => {
    const x = w / 2 + ball.x;
    const y = ball.y + 20;

    // Trail
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 12);
    gradient.addColorStop(0, `${ball.color}cc`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();

    // Ball
    ctx.fillStyle = ball.color;
    ctx.shadowBlur = 12;
    ctx.shadowColor = ball.color;
    ctx.beginPath();
    ctx.arc(x, y, BALL_SIZE, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  return (
    <div className="marble-drop-wrapper" ref={containerRef}>
      <div className="drop-animated-bg"></div>
      
      {/* LEFT SIDEBAR: Controls & Stats */}
      <aside className="drop-betting-sidebar">
        <div className="sidebar-brand">
          <span className="brand-glow">CASINO</span> PRO
        </div>

        <div className="sidebar-stats-grid">
           <div className="s-stat-card">
              <span className="s-label">PROFIT</span>
              <span className={`s-value ${(stats.totalPayout - stats.totalBet) >= 0 ? 'win' : 'loss'}`}>
                  ₹{(stats.totalPayout - stats.totalBet).toFixed(0)}
              </span>
           </div>
           <div className="s-stat-card">
              <span className="s-label">DROPS</span>
              <span className="s-value">{stats.drops}</span>
           </div>
        </div>

        <div className="sidebar-controls-glass">
          <div className="control-group">
            <label>RISK STRATEGY</label>
            <div className="risk-tabs-modern">
              {['low', 'medium', 'high'].map(r => (
                <button 
                  key={r} 
                  className={`risk-btn ${risk === r ? 'active' : ''}`}
                  onClick={() => setRisk(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label>BET AMOUNT</label>
            <div className="modern-bet-input">
               <span className="currency">₹</span>
               <input 
                  type="number" 
                  value={betAmount} 
                  onChange={(e) => setBetAmount(e.target.value)}
               />
            </div>
          </div>

          <div className="action-stack">
            <button className="primary-drop-btn" onClick={dropBall} disabled={balance < parseFloat(betAmount)}>
                DROP BALL
            </button>
            <button className={`secondary-auto-btn ${autoDrop ? 'stop' : ''}`} onClick={() => setAutoDrop(!autoDrop)}>
                {autoDrop ? 'STOP AUTO' : 'AUTO DROP'}
            </button>
          </div>

          <div className="sidebar-footer">
             <div className="wallet-pill">
                <span className="p-label">BALANCE</span>
                <span className="p-value">₹{balance.toLocaleString()}</span>
             </div>
             <button className="sidebar-mute" onClick={() => setIsMuted(!isMuted)}>
                {isMuted ? '🔇' : '🔊'}
             </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT: Arena & History */}
      <main className="drop-arena-main">
        <div className="arena-header-ribbon">
           <div className="ribbon-label">RECENT MULTIPLIERS</div>
           <div className="ribbon-list">
              {history.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className={`ribbon-item ${item.mult >= 1 ? 'win' : ''}`}>
                  {item.mult}x
                </div>
              ))}
              {history.length === 0 && <span className="no-data-text">Wait for drop...</span>}
           </div>
        </div>

        <div className="plinko-arena-focus">
          <canvas 
            ref={canvasRef} 
            width={arenaWidth} 
            height={arenaHeight + 100} 
            className="plinko-canvas-modern"
          />

          <div 
            className="buckets-container-modern" 
            style={{ 
              width: '100%',
              maxWidth: `${(rows + 1) * HORIZONTAL_SPACING}px` 
            }}
          >
            {(currentMultipliers || []).map((m, i) => (
              <div 
                key={`bucket-${i}`} 
                className={`bucket-modern ${m >= 2 ? 'high' : m >= 1 ? 'mid' : 'low'}`}
                style={{
                  width: `${HORIZONTAL_SPACING - 6}px`,
                  flex: 'none'
                }}
              >
                <span className="b-mult">{m}x</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MarbleDrop;
