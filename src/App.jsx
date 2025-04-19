import { useEffect, useState } from 'react';

import './styles/common/variables.css';
import './styles/common/buttons.css';
import './styles/App.css';

import { RemoteCursors, useMouseProps } from '@/components/ui/remote-cursors';

import { JoinRoom } from './components/Auth/JoinRoom';
import { CodeEditor } from './components/Editor/CodeEditor';
import { OutputPanel } from './components/Editor/OutputPanel';
import { Header } from './components/Layout/Header';
import { useCollaboration } from './context/collabration';
import { useCodeExecution } from './hooks/useCodeExecution';
import { useEditor } from './hooks/useEditor';
import { LANGUAGE_OPTIONS } from './utils/constants';

/**
 * Main application component
 */
function App() {
  const [language, setLanguage] = useState('javascript');

  // Initialize collaboration features
  const {
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
  } = useCollaboration();

  // Initialize editor with default code for selected language
  const {
    code,
    isFullScreen,
    isOutputVisible,
    handleEditorDidMount,
    handleCodeChange,
    toggleFullScreen,
    toggleOutput,
  } = useEditor({
    initialCode: LANGUAGE_OPTIONS[language].defaultCode,
  });

  const mouseMoveProps = useMouseProps();

  // Initialize code execution
  const { output, isLoading, runCode, clearOutput } = useCodeExecution();

  // Listen for code requests from new users
  useEffect(() => {
    const handleCodeRequest = (event) => {
      const { requesterId } = event.detail;
      if (requesterId && code) {
        // Use custom event to notify the collaboration hook
        const shareEvent = new CustomEvent('shareCode', {
          detail: { code, requesterId },
        });
        window.dispatchEvent(shareEvent);
      }
    };

    window.addEventListener('codeRequest', handleCodeRequest);
    return () => window.removeEventListener('codeRequest', handleCodeRequest);
  }, [code]);

  // Update code when language changes
  useEffect(() => {
    handleCodeChange(LANGUAGE_OPTIONS[language].defaultCode);
  }, [language]);

  /**
   * Execute current code
   */
  const executeCode = () => {
    runCode(code, LANGUAGE_OPTIONS[language].id);
  };

  // Render join room form if not connected
  if (!joinedRoom || !selfInfo) {
    return (
      <JoinRoom
        username={username}
        setUsername={setUsername}
        roomId={roomId}
        setRoomId={setRoomId}
        joinRoom={joinRoom}
        connectionError={connectionError}
        usernameError={usernameError}
        isConnected={isConnected}
      />
    );
  }

  // Render main editor view
  return (
    <div className="app-container">
      <Header
        language={language}
        setLanguage={setLanguage}
        languageOptions={LANGUAGE_OPTIONS}
        roomId={roomId}
        username={selfInfo.username}
        activeUsers={activeUsers}
      />

      <main className="main-content">
        <div className="editor-container">
          <RemoteCursors>
            <CodeEditor
              language={language}
              code={code}
              handleEditorDidMount={handleEditorDidMount}
              isFullScreen={isFullScreen}
              toggleFullScreen={toggleFullScreen}
              toggleOutput={toggleOutput}
              runCode={executeCode}
              isLoading={isLoading}
              {...mouseMoveProps}
            />
            <OutputPanel
              isFullScreen={isFullScreen}
              isOutputVisible={isOutputVisible}
              output={output}
              clearOutput={clearOutput}
            />
          </RemoteCursors>
        </div>
      </main>
    </div>
  );
}

export default App;
