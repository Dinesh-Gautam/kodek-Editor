import { useCallback, useMemo, useState } from 'react';

import SplashCursor from '../../../reactbits/splashcursor';

import '../../styles/Auth/JoinRoom.css';

export const JoinRoom = ({
  username,
  setUsername,
  roomId,
  setRoomId,
  joinRoom,
  connectionError,
  usernameError,
}) => {
  const [isTyping, setIsTyping] = useState(false);

  // Memoize the splash cursor configuration
  const splashConfig = useMemo(
    () => ({
      SIM_RESOLUTION: 32,
      DYE_RESOLUTION: 256,
      CAPTURE_RESOLUTION: 128,
      PRESSURE_ITERATIONS: 6,
      PERFORMANCE_MODE: true,
      DENSITY_DISSIPATION: isTyping ? 15.0 : 6.0,
      VELOCITY_DISSIPATION: isTyping ? 12.0 : 4.0,
      SPLAT_FORCE: isTyping ? 800 : 3000,
      SPLAT_RADIUS: 0.1,
      COLOR_UPDATE_SPEED: 2,
      CURL: 1,
    }),
    [isTyping],
  );

  // Debounce typing state changes
  const handleInputFocus = useCallback(() => {
    setIsTyping(true);
  }, []);

  const handleInputBlur = useCallback(() => {
    setIsTyping(false);
  }, []);

  return (
    <div className="join-container">
      <SplashCursor {...splashConfig} />
      <div className="join-form">
        <div className="join-logo">
          <h1>Kodek</h1>
          <span className="join-tagline">Collaborative Code Editor</span>
        </div>

        <h2>Join Collaboration Session</h2>

        <div className="input-group">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle
              cx="12"
              cy="7"
              r="4"
            ></circle>
          </svg>
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            className={usernameError ? 'error' : ''}
          />
        </div>

        <div className="input-group">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect
              x="3"
              y="11"
              width="18"
              height="11"
              rx="2"
              ry="2"
            ></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <input
            type="text"
            placeholder="Enter room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
        </div>

        <button
          onClick={joinRoom}
          disabled={!username || !roomId}
          className="join-button"
        >
          <span>Join Room</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14"></path>
            <path d="m12 5 7 7-7 7"></path>
          </svg>
        </button>

        {usernameError && (
          <div className="error-message">
            Username is already taken. Please choose a different username.
          </div>
        )}

        {connectionError && !usernameError && (
          <div className="error-message">{connectionError}</div>
        )}

        <div className="join-footer">
          <span>Start coding together in seconds</span>
        </div>
      </div>
    </div>
  );
};
