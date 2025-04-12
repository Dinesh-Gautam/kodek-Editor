import React, { useEffect } from 'react';
import '../../styles/Editor/OutputPanel.css';

export const OutputPanel = ({ isFullScreen, isOutputVisible, output, clearOutput }) => {
  useEffect(() => {
    console.log("OutputPanel: isOutputVisible changed to:", isOutputVisible);
  }, [isOutputVisible]);
  
  // Use style display property instead of CSS classes for more direct control
  const panelStyle = {
    display: (!isOutputVisible || isFullScreen) ? 'none' : 'flex',
  };
  
  return (
    <div 
      className="panel" 
      style={panelStyle}
      data-visible={isOutputVisible}
      data-fullscreen={isFullScreen}
    >
      <div className="panel-header">
        <span>Output</span>
        <button className="button-secondary" onClick={clearOutput}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          </svg>
          <span>Clear</span>
        </button>
      </div>
      <div className="terminal" dangerouslySetInnerHTML={{ __html: output }}></div>
    </div>
  );
}; 