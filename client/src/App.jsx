import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Aviator from './components/Aviator';
import Mines from './components/Mines';
import Chicken from './components/Chicken';
import Admin from './components/Admin';
import MainContent from './components/MainContent';
import ColorPrediction from './components/ColorPrediction';
import CricketPrediction from './components/CricketPrediction';
import MarbleRace from './components/MarbleRace';
import MarbleDrop from './components/MarbleDrop';
import Login from './components/Login';
import Signup from './components/Signup';
import Profile from './components/Profile';
import Recharge from './components/Recharge';
const DEFAULT_MULTIPLIERS = {
  low: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
  medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
  high: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29]
};

const defaultGameConfig = {
  mode: 'random',
  minCrash: 1.01,
  maxCrash: 100.00,
  rtp: 95,
  adaptiveBalancing: false,
  transparencyMode: 'fair',
  probs: { low: 50, medium: 30, high: 20 },
  mines: {
    rtp: 95,
    count: 3
  },
  chicken: {
    rtp: 95
  },
  colorPrediction: {
    red: 45,
    green: 45,
    violet: 10,
    rtp: 95,
    timer: 30
  },
  cricket: {
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
  },
  marbleRace: {
    rtp: 95,
    bettingTime: 10,
    resultTime: 4,
    speedRandomness: 0.5
  },
  marbleDrop: {
    rtp: 97,
    rows: 8,
    multipliers: {
      low: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
      medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
      high: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29]
    }
  }
};

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [globalBalance, setGlobalBalance] = useState(10.00);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);

  // Synchronized balance update function
  const handleUpdateBalance = async (amountOrFn, type = 'bet') => {
    let diff = 0;
    
    if (!user) {
        setGlobalBalance(prev => {
           const next = typeof amountOrFn === 'function' ? amountOrFn(prev) : prev + amountOrFn;
           diff = next - prev;
           return next;
        });
        return;
    }

    // 1. Update UI instantly (Optimistic update)
    setUser(prev => {
        if (!prev) return prev;
        const next = typeof amountOrFn === 'function' ? amountOrFn(prev.balance) : prev.balance + amountOrFn;
        diff = next - prev.balance;
        setGlobalBalance(next);
        return { ...prev, balance: next };
    });

    // 2. Persist to Backend (Debounced slightly if needed, but here immediate)
    // We delay the API call slightly to ensure 'diff' is calculated from the functional update
    setTimeout(async () => {
        try {
            const token = localStorage.getItem('token');
            await fetch('https://gameofluck-r491.vercel.app/api/wallet/update-balance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    amount: diff, 
                    type: diff > 0 ? 'win' : 'bet', 
                    referenceId: 'GAME' + Date.now() 
                })
            });
        } catch (err) {
            console.error('Network error syncing balance', err);
        }
    }, 0);
  };
  
  useEffect(() => {
    const loadUser = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const res = await fetch('https://gameofluck-r491.vercel.app/api/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await res.json();
                if (data.success) {
                    setUser(data.user);
                } else {
                    localStorage.removeItem('token');
                }
            } catch (err) {
                console.error('Failed to load user', err);
            }
        }
    };
    loadUser();
  }, []);

  // Sync balance with user object
  useEffect(() => {
    if (user) {
        setGlobalBalance(user.balance);
    }
  }, [user]);
  
  const [gameConfig, setGameConfig] = useState(() => {
    const saved = localStorage.getItem('ultrawin_gameConfig');
    return saved ? JSON.parse(saved) : defaultGameConfig;
  });

  useEffect(() => {
    localStorage.setItem('ultrawin_gameConfig', JSON.stringify(gameConfig));
  }, [gameConfig]);

  // Game Access Guard: Redirect to login if trying to play while logged out
  useEffect(() => {
    const gameRoutes = [
      'aviator', 'mines', 'chicken', 'color-prediction', 
      'cricket', 'marble-race', 'marble-drop'
    ];
    
    if (gameRoutes.includes(currentPage) && !user && !localStorage.getItem('token')) {
      setCurrentPage('login');
    }
  }, [currentPage, user]);

  return (
    <div className="app-container">
      <Navbar navigate={setCurrentPage} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} user={user} />
      <div className="main-content">
        <Sidebar 
          navigate={(route) => { setCurrentPage(route); setIsSidebarOpen(false); }} 
          isOpen={isSidebarOpen} 
          closeSidebar={() => setIsSidebarOpen(false)} 
          activeRoute={currentPage}
          user={user}
        />
        
        {currentPage === 'home' && (
          <MainContent navigate={setCurrentPage} />
        )}
        {currentPage === 'aviator' && (
          <Aviator 
             navigate={setCurrentPage} 
             balance={user ? user.balance : globalBalance} 
             setBalance={(val) => {
                const diff = typeof val === 'function' ? val(user ? user.balance : globalBalance) - (user ? user.balance : globalBalance) : val - (user ? user.balance : globalBalance);
                handleUpdateBalance(diff, diff > 0 ? 'win' : 'bet');
             }} 
             gameConfig={gameConfig}
          />
        )}
        {currentPage === 'mines' && (
          <Mines 
             navigate={setCurrentPage} 
             balance={user ? user.balance : globalBalance} 
             setBalance={(val) => {
                const diff = typeof val === 'function' ? val(user ? user.balance : globalBalance) - (user ? user.balance : globalBalance) : val - (user ? user.balance : globalBalance);
                handleUpdateBalance(diff, diff > 0 ? 'win' : 'bet');
             }} 
             gameConfig={gameConfig}
          />
        )}
        {currentPage === 'chicken' && (
          <Chicken 
             navigate={setCurrentPage} 
             balance={user ? user.balance : globalBalance} 
             setBalance={(val) => handleUpdateBalance(val)} 
             gameConfig={gameConfig}
          />
        )}
        {currentPage === 'color-prediction' && (
          <ColorPrediction 
             balance={user ? user.balance : globalBalance} 
             setBalance={(val) => handleUpdateBalance(val)} 
             gameConfig={gameConfig}
             navigate={setCurrentPage}
          />
        )}
        {currentPage === 'cricket' && (
          <CricketPrediction 
             balance={user ? user.balance : globalBalance} 
             setBalance={(val) => handleUpdateBalance(val)} 
             gameConfig={gameConfig}
             navigate={setCurrentPage}
          />
        )}
        {currentPage === 'marble-race' && (
          <MarbleRace 
             balance={user ? user.balance : globalBalance} 
             setBalance={(val) => handleUpdateBalance(val)} 
             gameConfig={gameConfig}
          />
        )}
        {currentPage === 'marble-drop' && (
          <MarbleDrop 
             balance={user ? user.balance : globalBalance} 
             setBalance={(val) => handleUpdateBalance(val)} 
             gameConfig={gameConfig}
          />
        )}
        {currentPage === 'admin' && user && user.role === 'admin' && (
          <Admin 
             balance={user ? user.balance : globalBalance} 
             setBalance={(val) => {
                const b = user ? user.balance : globalBalance;
                const next = typeof val === 'function' ? val(b) : val;
                handleUpdateBalance(next - b, (next - b) > 0 ? 'win' : 'bet');
             }} 
             gameConfig={gameConfig}
             setGameConfig={setGameConfig}
          />
        )}
        {currentPage === 'login' && (
          <Login navigate={setCurrentPage} setUser={setUser} />
        )}
        {currentPage === 'signup' && (
          <Signup navigate={setCurrentPage} setUser={setUser} />
        )}
        {currentPage === 'profile' && (
          <Profile user={user} setUser={setUser} navigate={setCurrentPage} />
        )}
        {currentPage === 'recharge' && (
          <Recharge user={user} setUser={setUser} navigate={setCurrentPage} />
        )}
      </div>
    </div>
  );
}

export default App;
