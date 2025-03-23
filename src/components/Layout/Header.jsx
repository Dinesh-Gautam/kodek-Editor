import React from 'react';
import { LanguageSelect } from '../Editor/LanguageSelect';
import '../../styles/Layout/Header.css';

export const Header = ({ language, setLanguage, languageOptions, roomId, username, activeUsers, userColors }) => {
  return (
    <header className="header">
      <div className="header-content">
        <h1 className="logo">Kodek</h1>
        <div className="room-info">
          <div className="room-badge">
            <span className="room-label">Room</span>
            <span className="room-id">{roomId}</span>
          </div>
          <div className="users-badge">
            <span className="users-label">Active</span>
            <div className="users-list">
              {activeUsers.map(user => (
                <span 
                  key={user.username} 
                  style={{ color: userColors[user.username] || '#10b981' }}
                >
                  {user.username}
                  {activeUsers.indexOf(user) < activeUsers.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
          </div>
          <div className="current-user-badge">
            <span className="current-user-label">You</span>
            <span className="current-user-name" style={{ color: userColors[username] || '#0078d4' }}>
              {username}
            </span>
          </div>
        </div>
        <LanguageSelect 
          language={language} 
          setLanguage={setLanguage} 
          languageOptions={languageOptions} 
        />
      </div>
    </header>
  );
}; 