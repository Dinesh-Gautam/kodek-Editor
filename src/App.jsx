import React, { useState, useEffect } from "react";
import { Header } from "./components/Layout/Header";
import { CodeEditor } from "./components/Editor/CodeEditor";
import { OutputPanel } from "./components/Editor/OutputPanel";
import { JoinRoom } from "./components/Auth/JoinRoom";
import { compileCode } from "./api";
import io from "socket.io-client";
import "./styles/common/variables.css";
import "./styles/common/buttons.css";
import "./styles/App.css";

const socket = io('http://localhost:3001', {
  timeout: 10000,
  forceNew: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Track whether a code change is from a remote source to prevent echo
let isRemoteChange = false;

const languageOptions = {
  javascript: { id: 63, defaultCode: "// Write your JavaScript code here...\nconsole.log('Hello, World!');" },
  python: { id: 71, defaultCode: "# Write your Python code here...\nprint('Hello, World!')" },
  c: { id: 50, defaultCode: "/* Write your C code here... */\n#include <stdio.h>\nint main() {\n    printf(\"Hello, World!\\n\");\n    return 0;\n}" },
  cpp: { id: 54, defaultCode: "/* Write your C++ code here... */\n#include <iostream>\nusing namespace std;\nint main() {\n    cout << \"Hello, World!\" << endl;\n    return 0;\n}" },
  java: { id: 62, defaultCode: "/* Write your Java code here... */\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, World!\");\n    }\n}" }
};

const getUserColor = (username) => {
  const colors = [
    '#FF5252', // Red
    '#7C4DFF', // Purple
    '#00BFA5', // Teal
    '#FFD740', // Amber
    '#64DD17', // Light Green
    '#448AFF', // Blue
    '#FF6E40', // Deep Orange
    '#EC407A', // Pink
    '#26A69A', // Green
    '#AB47BC', // Purple
    '#5C6BC0', // Indigo
    '#FFA726', // Orange
  ];
  
  // Simple hash function to get a consistent color for the same username
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const App = () => {
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(languageOptions[language].defaultCode);
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [editorInstance, setEditorInstance] = useState(null);
  const [userColors, setUserColors] = useState({});
  const [userCursors, setUserCursors] = useState({});
  const [usernameError, setUsernameError] = useState(false);

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

      // Store username globally to identify self
      window.username = username;

      // Join new room
      socket.emit('joinRoom', { roomId, username });

      // Set manually to true to immediately render editor while waiting for confirmation
      setJoinedRoom(true);
      
      console.log("Joining room, redirecting to editor...");
    } catch (error) {
      console.error('Error joining room:', error);
      setConnectionError('Failed to join room');
    }
  };

  useEffect(() => {
    // Connection handlers
    socket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
      setJoinedRoom(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionError('Failed to connect to server');
      setIsConnected(false);
      setJoinedRoom(false);
    });

    // Room join confirmation
    socket.on('roomJoined', ({ roomId, users }) => {
      console.log(`Successfully joined room ${roomId}`);
      setJoinedRoom(true);
      setConnectionError(null);
    });

    // Error handling
    socket.on('error', ({ message }) => {
      console.error('Server error:', message);
      setConnectionError(message);
      
      // Handle username already taken error
      if (message.includes('Username is already taken')) {
        setUsernameError(true);
        setJoinedRoom(false);
      } else if (message.includes('join') || message.includes('room')) {
        setJoinedRoom(false);
      }
    });

    // Connection testing
    const pingInterval = setInterval(() => {
      if (isConnected) {
        socket.emit('ping', (response) => {
          if (!response) {
            console.warn('No ping response');
            setConnectionError('Connection unstable');
          } else {
            setConnectionError(null);
          }
        });
      }
    }, 30000);

    // Code change handler
    const handleRemoteCodeChange = (newCode) => {
      console.log('Received code change from server');
      isRemoteChange = true;
      setCode(newCode);
      isRemoteChange = false;
    };

    // User list handler
    const handleUserList = (users) => {
      const colors = {};
      users.forEach(user => {
        colors[user.username] = getUserColor(user.username);
      });
      setUserColors(colors);
      setActiveUsers(users);
    };

    // Request code handler
    const handleRequestCode = () => {
      if (code && roomId) {
        socket.emit('shareCurrentCode', { roomId, code });
      }
    };

    // Cursor update handler
    const handleCursorUpdate = ({ userId, username, position }) => {
      if (editorInstance && username !== window.username) {
        setUserCursors(prev => ({
          ...prev,
          [userId]: { username, position }
        }));
        
        const color = userColors[username] || '#FF5252';
        const decorationId = `cursor-${userId}`;
        const decorationsMap = editorInstance._decorationsMap || new Map();
        editorInstance._decorationsMap = decorationsMap;
        
        const prevDecorations = decorationsMap.get(decorationId) || [];
        
        const newDecorations = editorInstance.deltaDecorations(
          prevDecorations,
          [{
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column + 1
            },
            options: {
              className: `remote-cursor-line-${userId}`,
              hoverMessage: { value: username },
              stickiness: 1
            }
          }]
        );
        
        decorationsMap.set(decorationId, newDecorations);
        
        let style = document.getElementById(`cursor-style-${userId}`);
        if (!style) {
          style = document.createElement('style');
          style.id = `cursor-style-${userId}`;
          document.head.appendChild(style);
        }
        
        style.innerHTML = `
          .remote-cursor-line-${userId} {
            background-color: ${color};
            width: 2px !important;
            margin-left: -1px;
            position: relative;
          }
        `;
      }
    };

    // Set up event listeners
    socket.on('codeChange', handleRemoteCodeChange);
    socket.on('userList', handleUserList);
    socket.on('requestCode', handleRequestCode);
    socket.on('cursorUpdate', handleCursorUpdate);

    // Cleanup
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('roomJoined');
      socket.off('error');
      clearInterval(pingInterval);
      socket.off('codeChange', handleRemoteCodeChange);
      socket.off('userList', handleUserList);
      socket.off('requestCode', handleRequestCode);
      socket.off('cursorUpdate', handleCursorUpdate);
    };
  }, []);

  const handleEditorDidMount = (editor, monaco) => {
    setEditorInstance(editor);
    editor.focus();

    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      if (joinedRoom) {
        socket.emit('cursorMove', {
          roomId,
          position: {
            lineNumber: e.position.lineNumber,
            column: e.position.column
          }
        });
      }
    });
  };

  // Add a function to handle editor code changes
  const handleCodeChange = (newCode) => {
    if (!isRemoteChange) {
      setCode(newCode);
      
      // Only emit if we're in a room and this isn't a remote change
      if (joinedRoom) {
        socket.emit('codeChange', { roomId, code: newCode });
      }
    }
  };

  const runCode = async () => {
    setIsLoading(true);
    setOutput('');
    
    const timestamp = new Date().toLocaleTimeString();
    setOutput(`<span class="output-time">[${timestamp}]</span> <span class="output-info">Running ${language} code...</span>\n\n`);
    
    try {
      const result = await compileCode(code, languageOptions[language].id);
      
      const newTimestamp = new Date().toLocaleTimeString();
      
      if (result.status.id === 3) {
        // Accepted
        setOutput(prevOutput => 
          prevOutput + `<span class="output-time">[${newTimestamp}]</span> <span class="output-success">Execution successful!</span>\n\n${result.stdout || 'No output'}\n`
        );
      } else if (result.status.id === 6) {
        // Compilation error
        setOutput(prevOutput => 
          prevOutput + `<span class="output-time">[${newTimestamp}]</span> <span class="output-error">Compilation Error:</span>\n${result.compile_output}\n`
        );
      } else {
        // Runtime error or other issues
        const errorMessage = result.stderr || result.compile_output || result.message || 'Unknown error';
        setOutput(prevOutput => 
          prevOutput + `<span class="output-time">[${newTimestamp}]</span> <span class="output-error">Error (${result.status.description}):</span>\n${errorMessage}\n`
        );
      }
      
      // Emit to socket for collaborative editing
      if (joinedRoom) {
        socket.emit('codeOutput', { roomId, output: result });
      }
      
    } catch (error) {
      const newTimestamp = new Date().toLocaleTimeString();
      setOutput(prevOutput => 
        prevOutput + `<span class="output-time">[${newTimestamp}]</span> <span class="output-error">Error: ${error.message}</span>\n`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const clearOutput = () => {
    const timestamp = new Date().toLocaleTimeString();
    setOutput(`<span class="output-time">[${timestamp}]</span> <span class="output-info">Output cleared</span>\n`);
  };

  const toggleFullScreen = () => setIsFullScreen(!isFullScreen);

  if (!joinedRoom) {
    return (
      <JoinRoom
        username={username}
        setUsername={setUsername}
        roomId={roomId}
        setRoomId={setRoomId}
        joinRoom={joinRoom}
        connectionError={connectionError}
        usernameError={usernameError}
      />
    );
  }

  return (
    <div className="app-container">
      <Header
        language={language}
        setLanguage={setLanguage}
        languageOptions={languageOptions}
        roomId={roomId}
        username={username}
        activeUsers={activeUsers}
        userColors={userColors}
      />

      <main className="main-content">
        <div className="editor-container">
          <CodeEditor
            language={language}
            code={code}
            handleCodeChange={handleCodeChange}
            handleEditorDidMount={handleEditorDidMount}
            isFullScreen={isFullScreen}
            toggleFullScreen={toggleFullScreen}
            runCode={runCode}
            isLoading={isLoading}
          />

          <OutputPanel
            isFullScreen={isFullScreen}
            output={output}
            clearOutput={clearOutput}
          />
        </div>

        <div className="controls">
        </div>
      </main>
    </div>
  );
};

export default App;
