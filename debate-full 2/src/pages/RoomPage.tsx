import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore, authFetch } from '../stores/useAuthStore';
import { debateFormats, getSideLabel, getDebaterLabel } from '../lib/debate-formats';
import { io, Socket } from 'socket.io-client';
import TimerDisplay from '../components/common/TimerDisplay';

interface Participant {
  userId: number;
  displayName: string;
  side?: string;
  position?: number;
  role?: string;
}

interface Speech {
  userId: number;
  displayName: string;
  content: string;
  stage: string;
  side: string;
  speaker: string;
  timestamp: number;
}

interface JudgeVerdict {
  judgeId: string;
  judgeName: string;
  scores: { pro: number; con: number };
  winner: 'pro' | 'con';
  reasoning: string;
  highlights: string[];
}

export default function RoomPage() {
  const { user } = useAuthStore();
  const location = useLocation();
  const prefill = (location.state as any) || {};

  const [view, setView] = useState<'lobby' | 'waiting' | 'debate' | 'result'>('lobby');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [topic, setTopic] = useState(prefill.prefillTopic || '');
  const [formatId, setFormatId] = useState(prefill.prefillFormat || 'standard');
  const [error, setError] = useState('');
  const [spectatorMode, setSpectatorMode] = useState(false);

  // Room state
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [mySide, setMySide] = useState<string>('');
  const [myPosition, setMyPosition] = useState<number>(0);
  const [speeches, setSpeeches] = useState<Speech[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [debateStarted, setDebateStarted] = useState(false);

  // Timer
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<number | null>(null);
  const timerStartRef = useRef<number>(0);

  // Judge
  const [judgeVerdicts, setJudgeVerdicts] = useState<JudgeVerdict[]>([]);
  const [judgeLoading, setJudgeLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');

  const socketRef = useRef<Socket | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  const format = debateFormats.find(f => f.id === (roomInfo?.formatId || roomInfo?.format_id || formatId)) || debateFormats[0];

  // Auto scroll
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [speeches]);

  // Timer tick
  useEffect(() => {
    if (timerRunning && timerSeconds > 0) {
      timerRef.current = window.setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning, timerSeconds]);

  const connectSocket = useCallback((code: string) => {
    if (socketRef.current) socketRef.current.disconnect();
    const s = io('/room', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = s;

    s.on('connect', () => {
      s.emit('join-room', { roomCode: code, userId: user!.id, displayName: user!.displayName });
    });

    s.on('participant-joined', (data: Participant) => {
      setParticipants(prev => {
        if (prev.some(p => p.userId === data.userId)) return prev;
        return [...prev, data];
      });
    });

    s.on('participant-left', (data: { userId: number }) => {
      setParticipants(prev => prev.filter(p => p.userId !== data.userId));
    });

    s.on('seat-updated', (data: Participant) => {
      setParticipants(prev => prev.map(p => p.userId === data.userId ? { ...p, side: data.side, position: data.position, role: data.role } : p));
    });

    s.on('debate-started', (data: { formatId: string; startTime: number }) => {
      setDebateStarted(true);
      setCurrentStageIndex(0);
      setSpeeches([]);
      setJudgeVerdicts([]);
      setAnalysisResult('');
      setView('debate');

      // Start timer from server timestamp
      if (data.startTime) {
        const elapsed = (Date.now() - data.startTime) / 1000;
        const firstStage = format.stages[0];
        const remaining = Math.max(0, firstStage.time - elapsed);
        setTimerSeconds(Math.floor(remaining));
        timerStartRef.current = data.startTime;
        setTimerRunning(true);
      }
    });

    s.on('new-speech', (data: Speech) => {
      setSpeeches(prev => [...prev, data]);
    });

    s.on('stage-advanced', (data: { stageIndex: number; stageTime: number }) => {
      setCurrentStageIndex(data.stageIndex);
      setTimerSeconds(data.stageTime);
      setTimerRunning(true);
      timerStartRef.current = Date.now();
    });

    s.on('timer-update', (data: { seconds: number; running: boolean }) => {
      setTimerSeconds(data.seconds);
      setTimerRunning(data.running);
    });

    s.on('debate-ended', (data: { reason?: string }) => {
      setDebateStarted(false);
      setTimerRunning(false);
      setView('result');
      // Auto-trigger judge analysis
      requestJudgeAnalysis();
    });

    s.on('judge-results', (data: { verdicts: JudgeVerdict[]; analysis: string }) => {
      setJudgeVerdicts(data.verdicts);
      setAnalysisResult(data.analysis);
      setJudgeLoading(false);
    });

    // Reconnection handling
    s.on('disconnect', () => { });
    s.on('reconnect', () => {
      s.emit('join-room', { roomCode: code, userId: user!.id, displayName: user!.displayName });
    });

    return s;
  }, [user]);

  // Cleanup
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  async function requestJudgeAnalysis() {
    if (speeches.length === 0) return;
    setJudgeLoading(true);
    try {
      const res = await fetch('/api/debate/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: roomInfo?.topic || topic,
          judgeType: 'logic',
          debateRecord: speeches.map(s => ({
            stage: s.stage,
            speaker: s.speaker,
            side: s.side,
            content: s.content,
          })),
        }),
      });
      const data = await res.json();
      if (data.content) {
        try {
          const verdict = JSON.parse(data.content);
          setJudgeVerdicts([{
            judgeId: 'logic',
            judgeName: '逻辑评委',
            scores: verdict.scores,
            winner: verdict.winner,
            reasoning: verdict.reasoning,
            highlights: verdict.highlights || [],
          }]);
        } catch {
          setAnalysisResult(data.content);
        }
      }
    } catch { }
    setJudgeLoading(false);
  }

  // Prefill from navigation state
  useEffect(() => {
    if (prefill.prefillTopic && !roomCode) {
      setTopic(prefill.prefillTopic);
      setFormatId(prefill.prefillFormat || 'standard');
    }
  }, []);

  async function handleCreate() {
    if (!topic.trim()) { setError('请输入辩题'); return; }
    setError('');
    try {
      const res = await authFetch('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ topic, formatId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRoomCode(data.roomCode);
      setRoomInfo({ id: data.id, topic, formatId, hostId: user!.id });
      setParticipants([{ userId: user!.id, displayName: user!.displayName }]);
      connectSocket(data.roomCode);
      setView('waiting');
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleJoin() {
    if (!joinCode.trim()) { setError('请输入房间号'); return; }
    setError('');
    try {
      const res = await authFetch('/api/rooms/join', {
        method: 'POST',
        body: JSON.stringify({ roomCode: joinCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const infoRes = await authFetch(`/api/rooms/code/${data.roomCode}`);
      const info = await infoRes.json();
      setRoomCode(data.roomCode);
      setRoomInfo(info);
      setParticipants(info.participants?.map((p: any) => ({
        userId: p.user_id,
        displayName: p.display_name,
        side: p.side,
        position: p.position,
        role: p.role,
      })) || []);
      connectSocket(data.roomCode);
      setView('waiting');
    } catch (e: any) {
      setError(e.message);
    }
  }

  function handleSelectSeat(side: string, position: number) {
    setMySide(side);
    setMyPosition(position);
    setSpectatorMode(false);
    socketRef.current?.emit('select-seat', { side, position, role: 'player' });
    authFetch(`/api/rooms/${roomInfo?.id}/seat`, {
      method: 'POST',
      body: JSON.stringify({ side, position }),
    });
  }

  function handleSpectate() {
    setMySide('');
    setMyPosition(0);
    setSpectatorMode(true);
    socketRef.current?.emit('select-seat', { side: 'spectator', position: 0, role: 'spectator' });
    authFetch(`/api/rooms/${roomInfo?.id}/seat`, {
      method: 'POST',
      body: JSON.stringify({ side: 'spectator', position: 0 }),
    });
  }

  function handleStartDebate() {
    const startTime = Date.now();
    socketRef.current?.emit('start-debate', { formatId: roomInfo?.formatId || formatId, startTime });
  }

  function handleSendSpeech() {
    const text = inputText.trim();
    if (!text) return;
    const stage = format.stages[currentStageIndex];
    socketRef.current?.emit('speech', {
      content: text,
      stage: stage?.name || `环节${currentStageIndex + 1}`,
      side: mySide,
      speaker: `${getSideLabel(mySide as any)}${getDebaterLabel(myPosition)}`,
    });
    setInputText('');
  }

  function handleAdvanceStage() {
    const nextIndex = currentStageIndex + 1;
    if (nextIndex >= format.stages.length) {
      socketRef.current?.emit('end-debate', { reason: 'finished' });
      return;
    }
    const nextStage = format.stages[nextIndex];
    socketRef.current?.emit('advance-stage', { stageIndex: nextIndex, stageTime: nextStage.time });
  }

  function handleEndDebate() {
    socketRef.current?.emit('end-debate', { reason: 'manual' });
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(roomCode);
    alert('房间号已复制到剪贴板');
  }

  // ===== Lobby View =====
  if (view === 'lobby') {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-bright)', marginBottom: 4 }}>在线对战</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: 24 }}>创建或加入房间，与同学进行线上辩论</p>

        {/* Create Room */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
          <h3 style={{ color: 'var(--text-bright)', marginBottom: 12 }}>创建房间</h3>
          <input
            placeholder="输入辩题"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', marginBottom: 8, boxSizing: 'border-box', fontFamily: 'var(--font)' }}
          />
          <select
            value={formatId}
            onChange={e => setFormatId(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', marginBottom: 12, fontFamily: 'var(--font)' }}
          >
            {debateFormats.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <button className="btn btn-accent" onClick={handleCreate} style={{ width: '100%' }}>创建房间</button>
        </div>

        {/* Join Room */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <h3 style={{ color: 'var(--text-bright)', marginBottom: 12 }}>加入房间</h3>
          <input
            placeholder="输入房间号"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', marginBottom: 12, boxSizing: 'border-box', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: 2 }}
          />
          <button className="btn btn-primary" onClick={handleJoin} style={{ width: '100%' }}>加入房间</button>
        </div>

        {error && <p style={{ color: 'var(--danger)', marginTop: 12, textAlign: 'center', fontSize: '0.85rem' }}>{error}</p>}
      </div>
    );
  }

  // ===== Waiting Room =====
  if (view === 'waiting') {
    const isHost = roomInfo?.hostId === user?.id || roomInfo?.host_id === user?.id;
    const allSeatsFilled = participants.filter(p => p.side && p.side !== 'spectator' && p.position).length >= 8;
    const proFilled = participants.filter(p => p.side === 'pro' && p.position).length >= 4;
    const conFilled = participants.filter(p => p.side === 'con' && p.position).length >= 4;

    return (
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-bright)', marginBottom: 4 }}>等待室</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: 8 }}>
          辩题：{roomInfo?.topic}
        </p>
        <div style={{ background: 'var(--primary-bg)', padding: '10px 16px', borderRadius: 'var(--radius-sm)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>房间号：</span>
          <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.2rem', letterSpacing: 2 }}>{roomCode}</span>
          <button className="btn btn-sm btn-ghost" onClick={handleCopyCode} style={{ marginLeft: 'auto' }}>复制</button>
        </div>

        {/* Seat Selection */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {/* Pro side */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <h3 style={{ color: 'var(--pro-color)', marginBottom: 12, fontSize: '1rem' }}>
              正方 {proFilled ? '✅' : `(${participants.filter(p => p.side === 'pro' && p.position).length}/4)`}
            </h3>
            {[1, 2, 3, 4].map(pos => {
              const seated = participants.find(p => p.side === 'pro' && p.position === pos);
              const isMe = mySide === 'pro' && myPosition === pos;
              return (
                <button
                  key={pos}
                  onClick={() => !seated || seated.userId === user!.id ? handleSelectSeat('pro', pos) : null}
                  style={{
                    display: 'block', width: '100%', padding: '8px 12px', marginBottom: 4,
                    background: isMe ? 'rgba(91,157,245,0.15)' : seated ? 'rgba(255,255,255,0.03)' : 'var(--bg)',
                    border: `1px solid ${isMe ? 'var(--pro-color)' : seated && seated.userId !== user!.id ? 'var(--border)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)', color: seated && seated.userId !== user!.id ? 'var(--text-dim)' : 'var(--text)',
                    cursor: seated && seated.userId !== user!.id ? 'default' : 'pointer',
                    fontFamily: 'var(--font)', textAlign: 'left',
                  }}
                >
                  {getDebaterLabel(pos)}{seated ? ` — ${seated.displayName}` : ' (空位)'}
                </button>
              );
            })}
          </div>

          {/* Con side */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <h3 style={{ color: 'var(--con-color)', marginBottom: 12, fontSize: '1rem' }}>
              反方 {conFilled ? '✅' : `(${participants.filter(p => p.side === 'con' && p.position).length}/4)`}
            </h3>
            {[1, 2, 3, 4].map(pos => {
              const seated = participants.find(p => p.side === 'con' && p.position === pos);
              const isMe = mySide === 'con' && myPosition === pos;
              return (
                <button
                  key={pos}
                  onClick={() => !seated || seated.userId === user!.id ? handleSelectSeat('con', pos) : null}
                  style={{
                    display: 'block', width: '100%', padding: '8px 12px', marginBottom: 4,
                    background: isMe ? 'rgba(245,121,91,0.15)' : seated ? 'rgba(255,255,255,0.03)' : 'var(--bg)',
                    border: `1px solid ${isMe ? 'var(--con-color)' : seated && seated.userId !== user!.id ? 'var(--border)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)', color: seated && seated.userId !== user!.id ? 'var(--text-dim)' : 'var(--text)',
                    cursor: seated && seated.userId !== user!.id ? 'default' : 'pointer',
                    fontFamily: 'var(--font)', textAlign: 'left',
                  }}
                >
                  {getDebaterLabel(pos)}{seated ? ` — ${seated.displayName}` : ' (空位)'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Spectator button */}
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <button className="btn btn-sm btn-ghost" onClick={handleSpectate}>
            {spectatorMode ? '👁 已切换为旁观模式' : '👁 切换为旁观模式'}
          </button>
        </div>

        {/* Participants */}
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ color: 'var(--text-bright)', fontSize: '0.95rem', marginBottom: 8 }}>
            在线参与者 ({participants.length})
          </h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {participants.map(p => (
              <span key={p.userId} style={{
                padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                background: p.role === 'spectator' ? 'var(--bg)' : 'var(--bg-card)',
                border: '1px solid var(--border)',
                fontSize: '0.85rem', color: 'var(--text)',
              }}>
                {p.displayName}
                {p.side && p.side !== 'spectator' ? ` (${getSideLabel(p.side as any)}${getDebaterLabel(p.position || 0)})` : ''}
                {p.role === 'spectator' ? ' 👁' : ''}
              </span>
            ))}
          </div>
        </div>

        {isHost && (
          <button
            className="btn btn-accent btn-lg"
            onClick={handleStartDebate}
            style={{ width: '100%' }}
            disabled={!allSeatsFilled}
          >
            {allSeatsFilled ? '开始辩论' : `开始辩论（需凑齐8人，当前已就位${participants.filter(p => p.side && p.side !== 'spectator' && p.position).length}人）`}
          </button>
        )}
        {isHost && !allSeatsFilled && (
          <p style={{ color: 'var(--text-dim)', fontSize: '0.78rem', textAlign: 'center', marginTop: 8 }}>
            分享房间号给其他7位队友，待所有人就位后即可开始
          </p>
        )}

        <button className="btn btn-ghost" onClick={() => { socketRef.current?.disconnect(); setView('lobby'); }} style={{ marginTop: 8, width: '100%' }}>
          离开房间
        </button>
      </div>
    );
  }

  // ===== Debate View =====
  if (view === 'debate') {
    const stage = format.stages[currentStageIndex];
    const speakerName = stage?.side === 'both'
      ? '双方交替发言'
      : `${getSideLabel(stage?.side as any)}${getDebaterLabel(stage?.debater)}`;

    return (
      <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
        {/* Stage banner with timer */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 12,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <span style={{ fontWeight: 700, color: 'var(--text-bright)', marginRight: 12 }}>
              {stage?.name || `环节 ${currentStageIndex + 1}`}
            </span>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{speakerName}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              环节 {currentStageIndex + 1} / {format.stages.length}
            </span>
            <TimerDisplay seconds={timerSeconds} size="sm" />
          </div>
        </div>

        {/* Speeches */}
        <div ref={chatRef} style={{
          flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12,
        }}>
          {speeches.map((s, i) => (
            <div key={i} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{
                  fontWeight: 600, fontSize: '0.9rem',
                  color: s.side === 'pro' ? 'var(--pro-color)' : s.side === 'con' ? 'var(--con-color)' : 'var(--text-dim)',
                }}>
                  {s.speaker} ({s.displayName})
                </span>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>{s.stage}</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{s.content}</p>
            </div>
          ))}
        </div>

        {/* Input */}
        {!spectatorMode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={stage?.side === 'both' ? '自由辩论 — Ctrl+Enter 发送' : `输入你的发言... (${speakerName})`}
              rows={3}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSendSpeech(); }}
              style={{
                width: '100%', padding: 12, background: 'var(--bg-card)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                color: 'var(--text)', fontFamily: 'var(--font)', resize: 'vertical', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', alignSelf: 'center', marginRight: 'auto' }}>
                Ctrl+Enter 发送
              </span>
              <button className="btn" onClick={handleAdvanceStage}>
                {currentStageIndex >= format.stages.length - 1 ? '结束比赛' : '下一环节'}
              </button>
              <button className="btn btn-primary" onClick={handleSendSpeech} disabled={!inputText.trim()}>
                发言
              </button>
              <button className="btn btn-ghost" onClick={handleEndDebate}>结束辩论</button>
            </div>
          </div>
        )}

        {spectatorMode && (
          <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            👁 旁观模式 — 只能观看，无法发言
          </div>
        )}
      </div>
    );
  }

  // ===== Result View =====
  const proSpeeches = speeches.filter(s => s.side === 'pro');
  const conSpeeches = speeches.filter(s => s.side === 'con');

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-bright)', marginBottom: 4 }}>比赛结束</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: 20 }}>辩题：{roomInfo?.topic || topic}</p>

      {/* Judge Verdicts */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: 20, marginBottom: 16,
      }}>
        <h3 style={{ color: 'var(--text-bright)', marginBottom: 16 }}>AI 评委判决</h3>
        {judgeLoading && (
          <div className="animate-pulse" style={{ textAlign: 'center', padding: 20, color: 'var(--text-dim)' }}>
            AI 评委正在评议中...
          </div>
        )}
        {judgeVerdicts.map((v, i) => (
          <div key={i} style={{
            borderTop: i > 0 ? '1px solid var(--border)' : 'none',
            paddingTop: i > 0 ? 12 : 0, marginBottom: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 700, color: 'var(--text-bright)' }}>{v.judgeName}</span>
              <span style={{
                padding: '2px 10px', borderRadius: 'var(--radius-sm)',
                background: v.winner === 'pro' ? 'rgba(91,157,245,0.15)' : 'rgba(245,121,91,0.15)',
                color: v.winner === 'pro' ? 'var(--pro-color)' : 'var(--con-color)',
                fontWeight: 600, fontSize: '0.85rem',
              }}>
                判{v.winner === 'pro' ? '正方' : '反方'}胜
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--pro-color)' }}>正方：{v.scores.pro}分</span>
              <span style={{ color: 'var(--con-color)' }}>反方：{v.scores.con}分</span>
            </div>
            <p style={{ color: 'var(--text)', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{v.reasoning}</p>
            {v.highlights?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {v.highlights.map((h, j) => (
                  <span key={j} style={{
                    display: 'inline-block', padding: '2px 8px', marginRight: 6, marginBottom: 4,
                    background: 'var(--primary-bg)', borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem', color: 'var(--primary)',
                  }}>{h}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        {!judgeLoading && judgeVerdicts.length === 0 && (
          <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: 20 }}>评委结果正在生成中...</p>
        )}
      </div>

      {/* Additional Analysis */}
      {analysisResult && !judgeVerdicts.length && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: 20, marginBottom: 16,
        }}>
          <h3 style={{ color: 'var(--text-bright)', marginBottom: 12 }}>评委分析</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: 'var(--text)', fontFamily: 'var(--font)' }}>
            {analysisResult}
          </pre>
        </div>
      )}

      {/* Speech stats */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: 20, marginBottom: 16,
      }}>
        <h3 style={{ color: 'var(--text-bright)', marginBottom: 12 }}>比赛数据</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <span style={{ color: 'var(--pro-color)', fontWeight: 600 }}>正方</span>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>发言次数：{proSpeeches.length}</p>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              总字数：{proSpeeches.reduce((sum, s) => sum + s.content.length, 0)}
            </p>
          </div>
          <div>
            <span style={{ color: 'var(--con-color)', fontWeight: 600 }}>反方</span>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>发言次数：{conSpeeches.length}</p>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              总字数：{conSpeeches.reduce((sum, s) => sum + s.content.length, 0)}
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" onClick={() => { setView('lobby'); setRoomCode(''); setDebateStarted(false); }}>
          返回大厅
        </button>
      </div>
    </div>
  );
}
