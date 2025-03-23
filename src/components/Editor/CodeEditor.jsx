import React from 'react';
import Editor from "@monaco-editor/react";
import '../../styles/Editor/CodeEditor.css';

export const CodeEditor = ({ 
  language, 
  code, 
  handleCodeChange, 
  handleEditorDidMount,
  isFullScreen,
  toggleFullScreen,
  runCode,
  isLoading 
}) => {
  return (
    <div className={`panel ${isFullScreen ? "fullscreen" : ""}`}>
      <div className="panel-header">
        <span>Kodek Editor</span>
        <button className="button-secondary" onClick={toggleFullScreen}>
          {isFullScreen ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
              </svg>
              <span>Exit Fullscreen</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
              </svg>
              <span>Fullscreen</span>
            </>
          )}
        </button>
        <button className="button" onClick={runCode} disabled={isLoading}>
          {isLoading ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
              </svg>
              <span>Running...</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              <span>Run Code</span>
            </>
          )}
        </button>
      </div>
      <div className="editor-wrapper">
        <Editor
          defaultLanguage={language}
          language={language}
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{
            fontSize: 14,
            fontFamily: "'Fira Code', 'Consolas', monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            roundedSelection: true,
            padding: { top: 16, bottom: 16 },
            cursorStyle: "line",
            cursorWidth: 2,
            cursorBlinking: "smooth",
            smoothScrolling: true,
            tabSize: 2,
            automaticLayout: true,
            wordWrap: "on",
            renderLineHighlight: "all",
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
              vertical: "visible",
              horizontal: "visible",
              verticalHasArrows: false,
              horizontalHasArrows: false,
              useShadows: false
            }
          }}
        />
      </div>
    </div>
  );
}; 