import { useEffect, useRef, useState } from 'react';

import { useCollaboration } from '../context/collabration';

/**
 * Custom hook for editor functionality and user cursors
 *
 * @param {Object} options
 * @param {string} options.initialCode - Initial code content
 * @returns {Object} Editor state and handlers
 */
export function useEditor({ initialCode }) {
  const [editorInstance, setEditorInstance] = useState(null);
  const [code, setCode] = useState(initialCode);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isOutputVisible, setIsOutputVisible] = useState(true);
  const monacoRef = useRef(null);
  const decorationsCollectionRef = useRef(null);

  const {
    userCursors,
    activeUsers,
    selfInfo,
    handleCodeChange: propagateCodeChange,
    handleCursorMove,
    handleEditorBlur,
  } = useCollaboration();

  const isRemoteUpdateRef = useRef(false);

  /**
   * Handle editor initialization
   * @param {Object} editor - Monaco editor instance
   * @param {Object} monaco - Monaco API
   */
  const handleEditorDidMount = (editor, monaco) => {
    setEditorInstance(editor);
    monacoRef.current = monaco;

    const event = new CustomEvent('editor-loaded', {
      detail: {
        editorInstance: editor,
        monaco,
      },
    });

    window.dispatchEvent(event);

    if (!decorationsCollectionRef.current) {
      decorationsCollectionRef.current = editor.createDecorationsCollection();
    }

    editor.onKeyDown(() => {
      isRemoteUpdateRef.current = false;
    });

    editor.onDidChangeModelContent((e) => {
      if (isRemoteUpdateRef.current) return;

      setCode(editor.getValue());
      propagateCodeChange(e);
    });

    // Set up cursor position tracking
    editor.onDidChangeCursorPosition((e) => {
      // Only send updates for user-initiated cursor changes (reason 0 or 3)
      if (e.reason === 0 || e.reason === 3) {
        handleCursorMove({
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        });
      }
    });

    editor.onDidBlurEditorWidget(() => {
      handleEditorBlur();
    });
  };

  const handleCodeChange = (newCode) => {
    // This function is now primarily used by App.jsx to set initial/remote code
    // It might still be useful for other local updates if needed.
    if (editorInstance && editorInstance.getValue() !== newCode) {
      // Avoid unnecessary updates if the code is already correct
      // Use executeEdits to better handle undo/redo stack if needed,
      // but setValue is simpler for initial state.
      isRemoteUpdateRef.current = true; // Prevent loop from editor's own change event
      editorInstance.setValue(newCode);
      isRemoteUpdateRef.current = false;
    }
    // Update local state if necessary (though App.jsx manages the source of truth now)
    setCode(newCode);
  };

  /**
   * Toggle full screen mode
   */
  const toggleFullScreen = () => setIsFullScreen((prev) => !prev);

  /**
   * Toggle output panel visibility
   */
  const toggleOutput = () => setIsOutputVisible((prev) => !prev);

  // Listen for remote code changes
  useEffect(() => {
    if (!editorInstance) return;

    const handleRemoteCodeChange = (event) => {
      const manaco = monacoRef.current;

      isRemoteUpdateRef.current = true;

      const changes = event.detail.changes;

      for (const change of changes) {
        console.log(
          change,
          new manaco.Range(
            change.range.endColumn + 1,
            change.range.endLineNumber + 1,
            change.range.startColumn,
            change.range.startLineNumber,
          ),
        );
        editorInstance.executeEdits('code-change', [
          {
            forceMoveMarkers: true,
            range: change.range,
            text: change.text,
          },
        ]);
      }
    };

    window.addEventListener('remoteCodeChange', handleRemoteCodeChange);

    return () => {
      window.removeEventListener('remoteCodeChange', handleRemoteCodeChange);
    };
  }, [editorInstance]);

  // Update cursor decorations when users change
  useEffect(() => {
    const updateRemoteCursors = () => {
      if (
        !editorInstance ||
        !decorationsCollectionRef.current ||
        !selfInfo ||
        !monacoRef.current
      ) {
        return;
      }

      const monaco = monacoRef.current;
      const decorations = [];
      const usersMap = new Map(activeUsers.map((u) => [u.id, u]));

      for (const [userId, cursorData] of Object.entries(userCursors)) {
        if (userId === selfInfo.id) continue; // Skip self

        const user = usersMap.get(userId);

        // Skip if user info or cursor data is missing
        if (!user || !cursorData || !cursorData.position) {
          continue;
        }

        const { color, username: remoteUsername } = user;
        const { visible, position } = cursorData;

        if (!visible) {
          continue;
        }

        decorations.push({
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column,
          ),
          options: {
            isWholeLine: position.column <= 1,
            stickiness:
              monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            className: `remote-cursor-user-${userId}`,
            hoverMessage: { value: remoteUsername },
          },
        });

        // Inject styles for this user's cursor
        const styleId = `cursor-style-${userId}`;
        let styleElement = document.getElementById(styleId);

        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = styleId;
          document.head.appendChild(styleElement);

          styleElement.innerHTML = `
             .remote-cursor-user-${userId} {
                position: relative;
              }
             .remote-cursor-user-${userId}::before {
                content: '';
                width: 2px;
                position: absolute;
                top: 0;
                left : 0;
                bottom: 0;
                height: 100%;
                z-index: 10;
                background-color: ${color};
             }
             .remote-cursor-user-${userId}::after {
               content: '${remoteUsername.replace(/'/g, "\\'")}';
               position: absolute;
               top: -1.2em;
               left : 0;
               background-color: ${color};
               color: white;
               padding: 2px 4px;
               line-height: 100%;
               font-size: 0.8em;
               border-radius: 3px 3px 3px 0;
               white-space: nowrap;
               z-index: 20;
               pointer-events: none;
             }
           `;
        }
      }

      try {
        decorationsCollectionRef.current.set(decorations);
      } catch (error) {
        console.error('Error setting decorations:', error);
      }
    };

    updateRemoteCursors();
  }, [userCursors, activeUsers, selfInfo, editorInstance]);

  // Cleanup decorations when component unmounts
  useEffect(() => {
    return () => {
      if (decorationsCollectionRef.current) {
        decorationsCollectionRef.current.clear();
      }

      document
        .querySelectorAll('style[id^="cursor-style-"]')
        .forEach((el) => el.remove());
    };
  }, []);

  return {
    code,
    isFullScreen,
    isOutputVisible,
    editorInstance,
    isRemoteUpdateRef,
    handleEditorDidMount,
    handleCodeChange,
    toggleFullScreen,
    toggleOutput,
  };
}
