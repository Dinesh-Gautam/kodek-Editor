import { useCallback, useEffect, useState } from 'react';

import { SmoothCursor } from '@/components/ui/smooth-cursor';
import { useCollaboration } from '@/context/collabration';

export function RemoteCursors({ children }) {
  const { userMousePointers } = useCollaboration();

  useEffect(() => {
    for (const [userId, pointer] of Object.entries(userMousePointers)) {
      const event = new CustomEvent('remote-mouse-move-' + userId, {
        detail: pointer,
      });
      window.dispatchEvent(event);
    }
  }, [userMousePointers]);

  return (
    <>
      {children}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
        }}
      >
        {Object.entries(userMousePointers).map(([userId, pointer]) => {
          return (
            <SmoothCursor
              userId={userId}
              pointer={pointer}
              key={userId}
            />
          );
        })}
      </div>
    </>
  );
}

export function useMouseProps() {
  const {
    userMousePointers,
    setUserMousePointers,
    socket,
    selfInfo,
    isConnected,
    isMouseInsideEditor,
    setIsMouseInsideEditor,
    roomId,
    joinedRoom,
  } = useCollaboration();

  const [isEditorFocused, setIsEditorFocused] = useState(false);

  const handleUserLeft = ({ userId }) => {
    setUserMousePointers((prev) => {
      const { [userId]: _, ...rest } = prev;
      return rest;
    });
  };

  // Mouse movement handler
  const handleMouseUpdate = ({
    userId,
    username,
    coordinates,
    color,
    visible,
  }) => {
    if (selfInfo && userId === selfInfo.id) {
      return;
    }

    setUserMousePointers((prev) => ({
      ...prev,
      [userId]: { username, coordinates, color, visible },
    }));
  };

  const handleEditorLoadEvent = useCallback(
    (editor) => {
      console.log(selfInfo, userMousePointers);

      const editorInstance = editor.detail.editorInstance;
      editorInstance.onDidFocusEditorText(() => {
        socket.emit('mouse-move', {
          roomId,
          visible: false,
        });
        setIsEditorFocused(true);
      });
      editorInstance.onDidBlurEditorText(() => setIsEditorFocused(false));
    },
    [selfInfo, userMousePointers],
  );

  useEffect(() => {
    socket.on('mouse-update', handleMouseUpdate);
    socket.on('userLeft', handleUserLeft);

    window.addEventListener('editor-loaded', handleEditorLoadEvent);

    return () => {
      socket.off('userLeft', handleUserLeft);
      socket.off('mouse-update', handleMouseUpdate);

      window.removeEventListener('editor-loaded', handleEditorLoadEvent);
    };
  }, [handleEditorLoadEvent]);

  const updateMouseCoordinates = (coordinates) => {
    if (joinedRoom && roomId && isConnected) {
      socket.emit('mouse-move', {
        roomId,
        coordinates,
        visible: !isEditorFocused,
      });
    }
  };

  function handleMouseMove(e) {
    if (!isMouseInsideEditor) return;

    updateMouseCoordinates({
      x: e.clientX,
      y: e.clientY,
    });
  }

  return {
    onMouseEnter: () => setIsMouseInsideEditor(true),
    onMouseLeave: (e) => {
      setIsMouseInsideEditor(false);
      // Emit invisible state when mouse leaves editor
      if (joinedRoom && roomId && isConnected) {
        socket.emit('mouse-move', {
          roomId,
          coordinates: {
            x: e.clientX,
            y: e.clientY,
          },
          visible: false,
        });
      }
    },

    onMouseMove: handleMouseMove,
  };
}
