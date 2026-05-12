import { useState, useEffect, useCallback, useRef } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { io, Socket } from 'socket.io-client';
import type { BinaryFiles } from '@excalidraw/excalidraw/types';

interface Props {
  roomId: string;
  userName: string;
  onElementsChange?: (count: number) => void;
}

export default function WhiteboardCanvas({ roomId, userName, onElementsChange }: Props) {
  const [initialData, setInitialData] = useState<{ elements: any[]; appState: any } | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    const socket = io('/workshop', { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('whiteboard:join', { roomId, userName });
    });

    socket.on('whiteboard:sync', (data: { elements: any[]; appState: any }) => {
      if (!isInitialized.current) {
        isInitialized.current = true;
        setInitialData({
          elements: data.elements || [],
          appState: data.appState || {},
        });
      }
    });

    socket.on('whiteboard:user-joined', (data: { userId: string; userName: string }) => {
      // Future: show collaborator notification
    });

    socket.on('whiteboard:user-left', (data: { userId: string }) => {
      // Future: update collaborator list
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, userName]);

  const handleChange = useCallback((els: readonly any[], state: any, _files: BinaryFiles) => {
    socketRef.current?.emit('whiteboard:update', {
      roomId,
      elements: els,
      appState: state,
    });
    onElementsChange?.(els.length);
  }, [roomId, onElementsChange]);

  const handlePointerUpdate = useCallback((payload: { pointer: { x: number; y: number; tool: string }; button: string }) => {
    socketRef.current?.emit('whiteboard:cursor', {
      roomId,
      position: payload.pointer,
    });
  }, [roomId]);

  if (!initialData) {
    return (
      <div style={{
        height: '500px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-dim)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
      }}>
        正在连接白板协作服务...
      </div>
    );
  }

  return (
    <div style={{ height: 'calc(100vh - 280px)', width: '100%', minHeight: 500 }}>
      <Excalidraw
        initialData={initialData}
        onChange={handleChange}
        onPointerUpdate={handlePointerUpdate}
        langCode="zh-CN"
        UIOptions={{
          canvasActions: {
            export: { saveFileToDisk: true },
            clearCanvas: true,
            loadScene: true,
            toggleTheme: true,
          },
        }}
      />
    </div>
  );
}
