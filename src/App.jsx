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
    handleLanguageChange: propagateLanguageChange,
    shareInitialState,
    initialStateRef,
  } = useCollaboration();

  // Initialize editor hook
  const {
    code,
    isFullScreen,
    isOutputVisible,
    handleEditorDidMount,
    handleCodeChange, // Use this to set initial code
    editorInstance,
    toggleFullScreen,
    toggleOutput,
  } = useEditor({
    initialCode: LANGUAGE_OPTIONS[language].defaultCode,
  });

  const currentCodeRef = useRef(code); // Ref to track current code for comparison

  const mouseMoveProps = useMouseProps();

  // Initialize code execution
  const {
    output,
    setOutput, // Corrected setter name
    isLoading,
    runCode,
    clearOutput,
  } = useCodeExecution();

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
  }, [language, editorInstance, handleCodeChange]);

  // Effect for Host: Listen for requests to share initial state
  useEffect(() => {
    if (!selfInfo || !editorInstance) return; // Only run if joined and editor ready

    const handleRequestInitialState = (event) => {
      const { requesterId } = event.detail;
      console.log(`Host received request to share state with ${requesterId}`);

      const currentCode = editorInstance.getValue();
      const currentLanguage = language; // Get current language state
      const currentOutput = output; // Get current output state

      shareInitialState({
        requesterId,
        code: currentCode,
        language: currentLanguage,
        output: currentOutput,
      });
    };

    window.addEventListener('requestInitialState', handleRequestInitialState);
    return () =>
      window.removeEventListener(
        'requestInitialState',
        handleRequestInitialState,
      );
  }, [selfInfo, editorInstance, language, output, shareInitialState]);

  // Effect for New User: Apply initial state when received
  useEffect(() => {
    const applyInitialState = () => {
      if (initialStateRef.current && editorInstance) {
        const {
          code: initialCode,
          language: initialLanguage,
          output: initialOutput,
        } = initialStateRef.current;

        console.log('Applying initial state:', {
          initialCode: initialCode ? '[code present]' : '[no code]',
          initialLanguage,
          initialOutput: initialOutput ? '[output present]' : '[no output]',
        });

        // Apply code
        if (initialCode !== null && initialCode !== undefined) {
          handleCodeChange(initialCode); // Update local state and editor
        }

        // Apply language
        if (initialLanguage) {
          setLanguage(initialLanguage); // Update local language state
        }

        // Apply output
        if (initialOutput !== null && initialOutput !== undefined) {
          setOutput(initialOutput); // Update local output state
        }

        initialStateRef.current = null; // Clear the ref after applying
      }
    };

    // Apply immediately if state is already available (e.g., race condition)
    applyInitialState();

    // Also listen for the event in case state arrives after initial render
    window.addEventListener('initialStateReceived', applyInitialState);
    return () =>
      window.removeEventListener('initialStateReceived', applyInitialState);
  }, [editorInstance, initialStateRef, handleCodeChange, setOutput]); // Add dependencies

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
