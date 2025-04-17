import { LanguageSelect } from '../Editor/LanguageSelect';

import '../../styles/Layout/Header.css';

export const Header = ({
  language,
  setLanguage,
  languageOptions,
  roomId,
  username, // Current user's username
  activeUsers, // Array of { id, username, color }
  // userColors prop removed
}) => {
  // Find the current user's object to get their color
  const currentUser = activeUsers.find((user) => user.username === username);
  const currentUserColor = currentUser ? currentUser.color : '#0078d4'; // Default color if not found

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
              {activeUsers.map(
                (
                  user,
                  index, // Added index for comma logic
                ) => (
                  <span
                    key={user.id} // Use unique user.id as key
                    style={{ color: user.color || '#10b981' }} // Use user.color directly
                  >
                    {user.username}
                    {/* Use index to check if it's the last user */}
                    {index < activeUsers.length - 1 ? ', ' : ''}
                  </span>
                ),
              )}
            </div>
          </div>
          <div className="current-user-badge">
            <span className="current-user-label">You</span>
            <span
              className="current-user-name"
              style={{ color: currentUserColor }} // Use the found color
            >
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
