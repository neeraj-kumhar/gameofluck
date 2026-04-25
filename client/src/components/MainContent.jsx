import React from 'react';
import './MainContent.css';

const MainContent = ({ navigate }) => {
  const groups = [
    {
      title: "LIVE GAMES",
      games: [
        { title: "Color Prediction", live: true, img: "/color_game_thumbnail.png", icon: "🎨", route: 'color-prediction' },
        { title: "Aviator", live: true, img: "/aviator_game_icon.png", route: 'aviator' },
        { title: "Marble Race", live: true, img: "/marble_race_banner.png", route: 'marble-race' },
        { title: "IPL Prediction", live: true, img: "/ipl_prediction_banner.png", route: 'cricket' }
      ]
    },
    {
      title: "ORIGINALS",
      games: [
        { title: "Mines", live: false, img: "/mines_game_icon.png", route: 'mines' },
        { title: "Chicken", live: false, img: "/chicken_game_thumbnail.png", route: 'chicken' },
        { title: "Marble Drop", live: false, img: "/marble_drop_banner.png", route: 'marble-drop' }
      ]
    }
  ];

  return (
    <main className="main-area">

      {groups.map((group, gIdx) => (
        <React.Fragment key={gIdx}>
          <div className="section-title" style={{marginTop: gIdx === 0 ? '20px' : '40px'}}>
            <h3>{group.title}</h3>
            <button className="view-all">View All {'>'}</button>
          </div>

          <div className="game-grid">
            {group.games.map((game, i) => (
              <div 
                key={i} 
                className="game-card animate-fade-in" 
                style={{ animationDelay: `${i * 0.1}s` }}
                onClick={() => navigate(game.route)}
              >
                <div className="game-img-wrapper">
                  {game.img ? (
                    <img src={game.img} alt={game.title} className="game-img" />
                  ) : (
                    <div style={{width: '100%', height: '100%', position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(45deg, #1A1A2E, #162447)', fontSize: '64px'}}>
                      {game.icon}
                    </div>
                  )}
                  {game.live && <span className="live-badge">LIVE</span>}
                </div>
                <div className="game-info">
                  <h4>{game.title}</h4>
                </div>
              </div>
            ))}
          </div>
        </React.Fragment>
      ))}
      
      <div className="section-title" style={{marginTop: '40px'}}>
        <h3>Top Sports Events</h3>
        <button className="view-all">View All {'>'}</button>
      </div>

      <div className="sports-banner">
        <div className="sports-match">
          <div className="team">
            <span>🔴 Team Alpha</span>
            <span>1.85</span>
          </div>
          <div className="team">
            <span>DRAW</span>
            <span>3.50</span>
          </div>
          <div className="team">
            <span>🔵 Team Beta</span>
            <span>2.10</span>
          </div>
        </div>
      </div>

      <footer className="footer">
        <p>© 2024 Game of Luck. All rights reserved. 18+</p>
        <div className="footer-links">
          <a href="#">Terms & Conditions</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Responsible Gaming</a>
        </div>
      </footer>
    </main>
  );
};

export default MainContent;
