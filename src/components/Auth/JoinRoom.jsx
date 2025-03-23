import React from 'react';
import '../../styles/Auth/JoinRoom.css';

export const JoinRoom = ({ username, setUsername, roomId, setRoomId, joinRoom }) => {
  return (
    <div className="join-container">
      <div className="join-form">
        <div className="join-logo">
          <h1>Kodek</h1>
          <span className="join-tagline">Collaborative Code Editor</span>
        </div>
        
        <h2>Join Collaboration Session</h2>
        
        <div className="input-group">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        
        <div className="input-group">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <input
            type="text"
            placeholder="Enter room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
        </div>
        
        <button 
          onClick={joinRoom} 
          disabled={!username || !roomId}
          className="join-button"
        >
          <span>Join Room</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"></path>
            <path d="m12 5 7 7-7 7"></path>
          </svg>
        </button>
        
        <div className="join-footer">
          <span>Start coding together in seconds</span>
        </div>
      </div>
    </div>
  );
}; 