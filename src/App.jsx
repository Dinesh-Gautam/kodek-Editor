import { useCallback, useEffect, useRef, useState } from 'react';

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
    handleLanguageChange: propagateLanguageChange, // Get the handler
  } = useCollaboration();

  // Initialize editor with default code for selected language
  const {
    code,
    isFullScreen,
    isOutputVisible,
    handleEditorDidMount,
    handleCodeChange,
    editorInstance, // Need editor instance to check current code
    toggleFullScreen,
    toggleOutput,
  } = useEditor({
    initialCode: LANGUAGE_OPTIONS[language].defaultCode,
  });
  const currentCodeRef = useRef(code); // Ref to track current code for comparison

  const mouseMoveProps = useMouseProps();

  // Initialize code execution
  const { output, isLoading, runCode, clearOutput } = useCodeExecution();

  // Keep track of the current code in a ref
  useEffect(() => {
    currentCodeRef.current = code;
  }, [code]);

  // Handle local language changes and propagate
  const handleLocalLanguageChange = useCallback(
    (newLanguage) => {
      setLanguage(newLanguage);
      propagateLanguageChange(newLanguage); // Emit change to others

      // Also update local editor if code hasn't changed from default
      const currentDefaultCode = LANGUAGE_OPTIONS[language]?.defaultCode;
      if (editorInstance && currentCodeRef.current === currentDefaultCode) {
        handleCodeChange(LANGUAGE_OPTIONS[newLanguage].defaultCode);
      }
    },
    [language, editorInstance, handleCodeChange, propagateLanguageChange],
  );

  /**
   * Execute current code
   */
  const executeCode = () => {
    runCode(code, LANGUAGE_OPTIONS[language].id);
  };

  // Listen for remote language changes
  useEffect(() => {
    const handleRemoteLanguageUpdate = (event) => {
      const { language: newLanguage } = event.detail;
      console.log('Received remote language change:', newLanguage);

      // Check if the current code is the default for the current language
      const currentDefaultCode = LANGUAGE_OPTIONS[language]?.defaultCode;
      const editorCode = editorInstance?.getValue();

      setLanguage(newLanguage); // Update language state regardless

      // Only update the editor's code if it hasn't been modified by the user
      if (editorInstance && editorCode === currentDefaultCode) {
        console.log('Applying default code for new language:', newLanguage);
        handleCodeChange(LANGUAGE_OPTIONS[newLanguage].defaultCode);
      }
    };

    window.addEventListener('remoteLanguageChange', handleRemoteLanguageUpdate);
    return () =>
      window.removeEventListener(
        'remoteLanguageChange',
        handleRemoteLanguageUpdate,
      );
  }, [language, editorInstance, handleCodeChange]); // Add dependencies

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
        setLanguage={handleLocalLanguageChange} // Use the new handler
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
