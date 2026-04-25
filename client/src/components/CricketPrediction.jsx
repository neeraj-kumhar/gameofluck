import React, { useState, useEffect, useRef } from 'react';
import './CricketPrediction.css';

const CricketPrediction = ({ balance, setBalance, gameConfig, navigate }) => {
  // Game Configuration from Admin or Defaults
  const config = gameConfig?.cricket || {
    rtp: 95,
    bettingWindow: 10,
    playingWindow: 3,
    resultWindow: 4,
    multipliers: {
      dot: 1.8,
      '1/2/3': 2.5,
      four: 4.5,
      six: 9.0,
      wicket: 12.0
    }
  };

  // Match State
  const [match, setMatch] = useState({
    teams: {
      batting: { name: 'Mumbai Indians', short: 'MI', logo: '🌀', score: 142, wickets: 4 },
      bowling: { name: 'Chennai Super Kings', short: 'CSK', logo: '🦁' }
    },
    overs: 16.4,
    batsman: { name: 'R. Sharma', runs: 45, balls: 32 },
    bowler: { name: 'R. Jadeja', overs: 3.4, wick: 2, runs: 28 },
    lastBalls: ['1', '4', '0', 'W', '6', '1']
  });

  // Game Loop State
  const [phase, setPhase] = useState('BETTING'); // BETTING, PLAYING, RESULT
  const [timer, setTimer] = useState(config.bettingWindow);
  const [lastResult, setLastResult] = useState(null);
  const [showEvent, setShowEvent] = useState(false);
  
  // Betting State
  const [selectedOption, setSelectedOption] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [activeBets, setActiveBets] = useState([]);
  const [history, setHistory] = useState([]);

  const timerRef = useRef(null);

  // Simulation Logic
  const getSimulatedResult = () => {
    // Basic probability-based simulation influenced by RTP
    const rand = Math.random() * 100;
    const rtpFactor = (config.rtp / 100);
    
    // Weighted outcomes (example)
    if (rand < 30 * rtpFactor) return { type: 'dot', label: '0', val: 0 };
    if (rand < 65 * rtpFactor) return { type: '1/2/3', label: '1', val: 1 };
    if (rand < 80 * rtpFactor) return { type: 'four', label: '4', val: 4 };
    if (rand < 90 * rtpFactor) return { type: 'six', label: '6', val: 6 };
    return { type: 'wicket', label: 'W', val: 0 };
  };

  useEffect(() => {
    startCycle();
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const startCycle = () => {
    clearInterval(timerRef.current);
    
    if (phase === 'BETTING') {
      setTimer(config.bettingWindow);
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            setPhase('PLAYING');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (phase === 'PLAYING') {
      setTimer(config.playingWindow);
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            processResult();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (phase === 'RESULT') {
      setTimer(config.resultWindow);
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            setPhase('BETTING');
            setShowEvent(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const processResult = () => {
    const result = getSimulatedResult();
    setLastResult(result);
    setPhase('RESULT');
    setShowEvent(true);

    // Update Match Stats
    setMatch(prev => {
      const isWicket = result.type === 'wicket';
      const currentWickets = prev.teams.batting.wickets;
      
      // Stop simulation if all out (10 wickets)
      if (currentWickets >= 10) return prev;

      const newScore = prev.teams.batting.score + result.val;
      let newWickets = currentWickets;
      if (isWicket && currentWickets < 10) {
        newWickets += 1;
      }
      
      // Update balls/overs logic
      let ballNum = Math.round((prev.overs % 1) * 10);
      let overNum = Math.floor(prev.overs);
      
      ballNum += 1;
      if (ballNum >= 6) {
        overNum += 1;
        ballNum = 0;
      }
      const nextOvers = parseFloat(`${overNum}.${ballNum}`);

      return {
        ...prev,
        teams: {
          ...prev.teams,
          batting: { ...prev.teams.batting, score: newScore, wickets: newWickets }
        },
        overs: nextOvers,
        lastBalls: [result.label, ...prev.lastBalls.slice(0, 5)],
        batsman: { 
          ...prev.batsman, 
          runs: prev.batsman.runs + result.val,
          balls: prev.batsman.balls + 1 
        }
      };
    });

    // Process Payouts
    setActiveBets(prevBets => {
      const processed = prevBets.map(bet => {
        const won = bet.option === result.type;
        const payout = won ? bet.amount * config.multipliers[bet.option] : 0;
        if (won) {
          setBalance(b => b + payout);
        }
        return { ...bet, status: won ? 'WON' : 'LOST', payout };
      });
      
      // Add to history
      setHistory(h => [...processed, ...h].slice(0, 10));
      return [];
    });
  };

  const handlePlaceBet = () => {
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0 || amount > balance || !selectedOption || phase !== 'BETTING') return;

    const newBet = {
      id: Date.now(),
      option: selectedOption,
      amount: amount,
      status: 'PENDING'
    };

    setBalance(prev => prev - amount);
    setActiveBets(prev => [...prev, newBet]);
    setBetAmount('');
  };

  const options = [
    { id: 'dot', name: 'Dot Ball', mult: config.multipliers.dot },
    { id: '1/2/3', name: '1/2/3 Runs', mult: config.multipliers['1/2/3'] },
    { id: 'four', name: 'Boundary 4', mult: config.multipliers.four },
    { id: 'six', name: 'Maximum 6', mult: config.multipliers.six },
    { id: 'wicket', name: 'Wicket', mult: config.multipliers.wicket },
  ];

  return (
    <div className="cricket-prediction-container">
      {/* Stadium Header */}
      <div className="stadium-header">
        <div className="match-info-main">
          <div className="team-display">
            <div className="team-logo active">{match.teams.batting.logo}</div>
            <div className="team-name">{match.teams.batting.short}</div>
          </div>
          
          <div className="score-display">
            <div className="vs-badge">LIVE MATCH</div>
            <div className="main-score">
              {match.teams.batting.score} / {match.teams.batting.wickets}
            </div>
            <div className="overs-counter">Overs: {match.overs}</div>
          </div>

          <div className="team-display">
            <div className="team-logo">{match.teams.bowling.logo}</div>
            <div className="team-name">{match.teams.bowling.short}</div>
          </div>
        </div>

        <div className="match-stats-strip">
          <div className="stat-item">
            <span className="stat-label">Batsman:</span>
            <span className="stat-value">{match.batsman.name} ({match.batsman.runs}*)</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Bowler:</span>
            <span className="stat-value">{match.bowler.name} ({match.bowler.wick}-{match.bowler.runs})</span>
          </div>
        </div>
      </div>

      {/* Game Phase Banner */}
      <div className="game-phase-banner">
        {phase === 'BETTING' && <span className="phase-text">Predictions Closing in: <span className="timer-ring">{timer}s</span></span>}
        {phase === 'PLAYING' && <span className="phase-text" style={{color: '#fff'}}>🏏 Bowler is running in...</span>}
        {phase === 'RESULT' && <span className="phase-text" style={{color: '#4ade80'}}>Ball Delivered!</span>}
      </div>

      {/* Main Content Grid */}
      <div className="prediction-grid">
        {/* Prediction Panel */}
        <div className="panel-card main-prediction-panel">
          <div className="panel-title">🎯 Next Ball Outcome</div>
          <div className="prediction-options">
            {options.map(opt => (
              <div 
                key={opt.id}
                className={`prediction-btn ${selectedOption === opt.id ? 'active' : ''} ${phase !== 'BETTING' ? 'disabled' : ''}`}
                onClick={() => phase === 'BETTING' && setSelectedOption(opt.id)}
              >
                <span className="option-name">{opt.name}</span>
                <span className="option-multiplier">{opt.mult}x</span>
              </div>
            ))}
          </div>

          <div className="betting-panel">
            <div className="input-row">
              <div className="bet-input-wrapper">
                <input 
                  type="number" 
                  placeholder="Enter Amount" 
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  disabled={phase !== 'BETTING'}
                />
              </div>
              <button 
                className="place-bet-btn"
                disabled={!selectedOption || !betAmount || phase !== 'BETTING'}
                onClick={handlePlaceBet}
              >
                PLACE PREDICTION
              </button>
            </div>
            
            {activeBets.length > 0 && (
              <div className="active-bets-list">
                {activeBets.map(bet => (
                  <div key={bet.id} className="active-bet-item">
                    <span>{options.find(o => o.id === bet.option)?.name}</span>
                    <span>₹&nbsp;{bet.amount.toLocaleString('en-IN')} @ {options.find(o => o.id === bet.option)?.mult}x</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Player & Stats Panel */}
        <div className="panel-card">
          <div className="player-info-strip">
            <div className="balance-box">
              <span className="balance-label">WALLET BALANCE</span>
              <span className="balance-value" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="currency-symbol">₹</span>
                <span className="amount-val">{balance.toLocaleString('en-IN')}</span>
                <button 
                   className="btn-primary" 
                   style={{ padding: '0 8px', fontSize: '12px', borderRadius: '4px', cursor: 'pointer', border: 'none', background: 'var(--primary)', color: '#000', fontWeight: 'bold' }}
                   onClick={() => navigate && navigate('recharge')}
                >
                  RECHARGE
                </button>
              </span>
            </div>
            <div className="balance-box" style={{textAlign: 'right'}}>
              <span className="balance-label">LAST BALL</span>
              <div className="ball-circle" style={{marginLeft: 'auto'}}>{match.lastBalls[0]}</div>
            </div>
          </div>

          <div className="history-section">
            <div className="panel-title" style={{marginTop: '20px', fontSize: '15px'}}>Ball History</div>
            <div className="ball-history-stream">
              {match.lastBalls.map((b, i) => (
                <div key={i} className={`ball-circle ${b === '4' ? 'four' : b === '6' ? 'six' : b === 'W' ? 'wicket' : b === '0' ? 'dot' : ''}`}>
                  {b}
                </div>
              ))}
            </div>
          </div>

          {history.length > 0 && (
            <div className="history-section">
              <div className="panel-title" style={{marginTop: '20px', fontSize: '15px'}}>Your Recent Predictions</div>
              <div className="active-bets-list">
                {history.map(item => (
                  <div key={item.id} className="active-bet-item">
                    <span>{options.find(o => o.id === item.option)?.name} (₹&nbsp;{item.amount})</span>
                    <span className={item.status === 'WON' ? 'bet-win' : 'bet-loss'}>
                      {item.status === 'WON' ? `+₹\u00A0${item.payout.toFixed(2)}` : 'LOST'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Event Announcer Overlay */}
      {showEvent && (
        <div className="event-overlay-backdrop">
          <div className="event-announcer">
            <div className={`event-card-premium ${lastResult?.type}`}>
              <div className="event-glow"></div>
              <p className="event-subtitle">BALL OUTCOME</p>
              <h1 className="event-title-premium">
                {lastResult?.type === 'dot' && '0 (DOT)'}
                {lastResult?.type === '1/2/3' && `${lastResult.label} RUN`}
                {lastResult?.type === 'four' && 'FOUR! 🏏'}
                {lastResult?.type === 'six' && 'SIXER!!! 🚀'}
                {lastResult?.type === 'wicket' && 'WICKET! ☝️'}
              </h1>
              <div className="event-footer">MATCH CONTINUES</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CricketPrediction;
