import { createContext, useContext, useEffect, useRef, useState } from 'react';

import io from 'socket.io-client';

import { SOCKET_CONFIG } from '../utils/constants';

/**
 * @typedef {Object} UserInfo
 * @property {string} id - User socket ID
 * @property {string} username - User's display name
 * @property {string} color - User's assigned color
 */

/**
 * @typedef {Object} CursorPosition
 * @property {number} lineNumber - Line number in editor
 * @property {number} column - Column in editor
 */

/**
 * @typedef {Object} CursorData
 * @property {string} username - User's display name
 * @property {CursorPosition} position - Cursor position
 * @property {string} color - Cursor color
 * @property {boolean} visible - Whether cursor is visible
 */

/**
 * @typedef {Object} CollaborationContextValue
 * @property {boolean} isConnected - Whether socket is connected
 * @property {boolean} joinedRoom - Whether user has joined a room
 * @property {string} roomId - Current room ID
 * @property {string} username - User's display name
 * @property {function} setUsername - Set username state
 * @property {function} setRoomId - Set room ID state
 * @property {function} joinRoom - Join a room
 * @property {string|null} connectionError - Connection error message
 * @property {boolean} usernameError - Whether username is invalid
 * @property {UserInfo[]} activeUsers - List of active users
 * @property {UserInfo|null} selfInfo - Current user info
 * @property {Object.<string, CursorData>} userCursors - Map of user cursor data
 * @property {Object.<string, Object>} userMousePointers - Map of user mouse pointer data
 * @property {function} setUserMousePointers - Set user mouse pointer state
 * @property {function} handleCodeChange - Handle code changes
 * @property {function} handleCursorMove - Handle cursor movement
 * @property {function} handleEditorBlur - Handle editor blur
 * @property {function} handleLanguageChange - Handle language changes
 * @property {function} handleCodeOutput - Handle code output sharing
 */

const socket = io(SOCKET_CONFIG.serverUrl, SOCKET_CONFIG.options);

// Create context with default values
const CollaborationContext = createContext({});

/**
 * Provider component for collaboration features
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export function CollaborationProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [connectionError, setConnectionError] = useState(null);
  const [usernameError, setUsernameError] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [userCursors, setUserCursors] = useState({});
  const [selfInfo, setSelfInfo] = useState(null);

  const [isMouseInsideEditor, setIsMouseInsideEditor] = useState(false);
  const [userMousePointers, setUserMousePointers] = useState({});

  const initialCodeRef = useRef(null);

  /**
   * Join a collaboration room
   */
  const joinRoom = () => {
    if (!isConnected) {
      setConnectionError('Not connected to server');
      return;
    }

    if (!username || !roomId) {
      setConnectionError('Username and Room ID are required');
      return;
    }

    try {
      console.log(`Attempting to join room ${roomId} as ${username}`);
      setConnectionError(null);
      setUsernameError(false);
      socket.emit('joinRoom', { roomId, username });
    } catch (error) {
      console.error('Error joining room:', error);
      setConnectionError('Failed to join room');
      setJoinedRoom(false);
    }
  };

  /**
   * Handle when a user leaves the room
   * @param {Object} data - User data
   * @param {string} data.userId - User ID
   * @param {string} data.username - Username
   * @param {boolean} softRemoval - Whether to only remove visual elements
   */
  const handleUserLeft = ({ userId, username }, softRemoval = false) => {
    console.log(`User left: ${username} (${userId})`);

    if (!softRemoval) {
      setActiveUsers((prev) => prev.filter((user) => user.id !== userId));
      setUserCursors((prev) => {
        const { [userId]: removedUserCursor, ...rest } = prev;
        console.log('Removed user cursoer', removedUserCursor);
        return rest;
      });
      setUserMousePointers((prev) => {
        const { [userId]: removedPointer, ...rest } = prev;
        console.log('Removed user pointers ', removedPointer);
        return rest;
      });
    }

    const styleElement = document.getElementById(`cursor-style-${userId}`);
    if (styleElement) {
      styleElement.remove();
    }
  };

  /**
   * Handle code changes and propagate to other users
   * @param {string} newCode - New code content
   */
  const handleCodeChange = (eventData) => {
    if (joinedRoom && roomId && isConnected) {
      socket.emit('codeChange', {
        roomId,
        userId: selfInfo.id,
        data: eventData,
      });
    }
  };

  /**
   * Handle cursor movement and propagate to other users
   * @param {CursorPosition} position - New cursor position
   */
  const handleCursorMove = (position) => {
    if (joinedRoom && roomId && isConnected) {
      socket.emit('cursorMove', {
        roomId,
        visible: true,
        position,
      });
    }
  };

  /**
   * Handle editor blur event
   */
  const handleEditorBlur = () => {
    if (joinedRoom && roomId && isConnected) {
      socket.emit('cursorMove', {
        roomId,
        visible: false,
        position: { lineNumber: 0, column: 0 },
      });
    }
  };

  /**
   * Handle language change and propagate to other users
   * @param {string} language - New language selected
   */
  const handleLanguageChange = (language) => {
    if (!selfInfo) return; // Ensure selfInfo is available
    if (joinedRoom && roomId && isConnected) {
      socket.emit('languageChange', {
        roomId,
        userId: selfInfo.id, // Send userId to avoid self-update loop
        language,
      });
    }
  };

  /**
   * Handle code execution output and propagate to other users
   * @param {Object} outputData - Output data from code execution
   */
  const handleCodeOutput = (outputData) => {
    if (!selfInfo) return; // Ensure selfInfo is available
    if (joinedRoom && roomId && isConnected) {
      socket.emit('codeOutput', {
        roomId,
        userId: selfInfo.id,
        output: outputData,
      });
    }
  };

  useEffect(() => {
    if (!selfInfo) return;

    // Code change handler
    const handleRemoteCodeChange = ({ userId, initial, data }) => {
      if (userId === selfInfo.id) return;
      console.log('Received code change from server');

      if (initial) {
        console.log('recieved initial value');
        initialCodeRef.current = data.code;
        return;
      }

      const event = new CustomEvent('remoteCodeChange', {
        detail: data,
      });
      window.dispatchEvent(event);
    };

    // Language change handler
    const handleRemoteLanguageChange = ({ userId, language }) => {
      if (userId === selfInfo.id) return; // Ignore self-emitted events
      console.log(`Received language change from ${userId}: ${language}`);
      const event = new CustomEvent('remoteLanguageChange', {
        detail: { language },
      });
      window.dispatchEvent(event);
    };

    // Code output handler
    const handleRemoteCodeOutput = ({ userId, username, output }) => {
      // Destructure username
      if (userId === selfInfo.id) return; // Ignore self-emitted events
      console.log(`Received code output from ${username} (${userId})`);
      const event = new CustomEvent('remoteCodeOutput', {
        detail: { username, output }, // Pass username in detail
      });
      window.dispatchEvent(event);
    };

    socket.on('codeChange', handleRemoteCodeChange);
    socket.on('languageChange', handleRemoteLanguageChange);
    socket.on('codeOutput', handleRemoteCodeOutput);

    return () => {
      socket.off('codeChange', handleRemoteCodeChange);
      socket.off('languageChange', handleRemoteLanguageChange);
      socket.off('codeOutput', handleRemoteCodeOutput);
    };
  }, [selfInfo]);

  useEffect(() => {
    // Connection handlers
    const onConnect = () => {
      console.log('Connected to server', socket.id);
      setIsConnected(true);
      setConnectionError(null);
    };

    const onDisconnect = (reason) => {
      console.log('Disconnected from server:', reason);
      setIsConnected(false);
      setJoinedRoom(false);
      setActiveUsers([]);
      setUserCursors({});
      setSelfInfo(null);
      document
        .querySelectorAll('style[id^="cursor-style-"]')
        .forEach((el) => el.remove());
    };

    const onConnectError = (error) => {
      console.error('Connection error:', error);
      setConnectionError(`Failed to connect: ${error.message}`);
      setIsConnected(false);
      setJoinedRoom(false);
    };

    // Room join confirmation
    const onRoomJoined = ({ roomId: joinedRoomId, users, self }) => {
      console.log(`Successfully joined room ${joinedRoomId}`);
      setJoinedRoom(true);
      setRoomId(joinedRoomId);
      setActiveUsers(users);
      setSelfInfo(self);
      setConnectionError(null);
      setUsernameError(false);
    };

    // Error handling
    const onError = ({ message }) => {
      console.error('Server error:', message);
      setConnectionError(message);
      if (message.includes('Username is already taken')) {
        setUsernameError(true);
        setJoinedRoom(false);
        setSelfInfo(null);
      } else if (message.includes('join') || message.includes('room')) {
        setJoinedRoom(false);
        setSelfInfo(null);
      }
    };

    // User list handler
    const handleUserList = (users) => {
      setActiveUsers(users);
    };

    // Request code handler
    const handleRequestCode = ({ requesterId }) => {
      console.log('Request to share code received from server!', requesterId);
      // We need to expose this event to subscribers
      const event = new CustomEvent('codeRequest', { detail: { requesterId } });
      window.dispatchEvent(event);
    };

    // Listen for code requests from new users

    // Cursor update handler
    const handleCursorUpdate = ({
      userId,
      username,
      position,
      color,
      visible,
    }) => {
      if (selfInfo && userId === selfInfo.id) {
        return; // Don't process own cursor updates
      }

      setUserCursors((prev) => ({
        ...prev,
        [userId]: { username, position, color, visible },
      }));
    };

    // Set up event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('roomJoined', onRoomJoined);
    socket.on('error', onError);
    socket.on('userList', handleUserList);
    socket.on('requestCode', handleRequestCode);
    socket.on('cursorUpdate', handleCursorUpdate);
    socket.on('userLeft', handleUserLeft);

    function shareCodeHandler(e) {
      console.log('Sharing Code', e);
      socket.emit('shareCode', e.detail);
    }

    window.addEventListener('shareCode', shareCodeHandler);

    // Cleanup
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('roomJoined', onRoomJoined);
      socket.off('error', onError);
      socket.off('userList', handleUserList);
      socket.off('requestCode', handleRequestCode);
      socket.off('cursorUpdate', handleCursorUpdate);
      socket.off('userLeft', handleUserLeft);

      window.removeEventListener('shareCode', shareCodeHandler);

      document
        .querySelectorAll('style[id^="cursor-style-"]')
        .forEach((el) => el.remove());
    };
  }, [selfInfo]);

  const contextValue = {
    isConnected,
    joinedRoom,
    roomId,
    username,
    setUsername,
    setRoomId,
    joinRoom,
    connectionError,
    usernameError,
    activeUsers,
    selfInfo,
    userCursors,
    userMousePointers,
    setUserMousePointers,
    handleCodeChange,
    handleCursorMove,
    handleEditorBlur,
    handleLanguageChange,
    handleCodeOutput,
    isMouseInsideEditor,
    setIsMouseInsideEditor,
    initialCodeRef,
    socket,
  };

  return (
    <CollaborationContext.Provider value={contextValue}>
      {children}
    </CollaborationContext.Provider>
  );
}

/**
 * Hook to use collaboration context
 * @returns {CollaborationContextValue} Collaboration context value
 */
export const useCollaboration = () => useContext(CollaborationContext);
