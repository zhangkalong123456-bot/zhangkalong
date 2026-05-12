import { useEffect, useRef, useState, useCallback } from 'react';
import { useDebateStore } from '../../stores/useDebateStore';
import { useAudioAlert } from '../../hooks/useAudioAlert';
import { getSideLabel, getDebaterLabel } from '../../lib/debate-formats';
import TimerDisplay from '../common/TimerDisplay';
import ProgressBar from '../common/ProgressBar';
import ChatBubble from '../common/ChatBubble';
import type { DebateMessage } from '../../lib/types';
import './DebateArena.css';

export default function DebateArena() {
  const store = useDebateStore();
  const { beepWarning, beepEnd } = useAudioAlert();
  const session = store.session!;
  const stage = session.format.stages[session.currentStageIndex];

  const [seconds, setSeconds] = useState(stage?.time || 0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [inputText, setInputText] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [stageFinished, setStageFinished] = useState(false); // true when current stage is done, waiting for user to click next

  const chatRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const stageInitRef = useRef(-1);
  const typewriterRef = useRef<number | null>(null);

  // Scroll chat to bottom
  const scrollToBottom = useCallback(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, []);

  // Timer tick — only counts down, never auto-advances
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = window.setInterval(() => {
        setSeconds(prev => {
          if (prev === 31) beepWarning();
          if (prev <= 1) {
            beepEnd();
            setTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning, beepWarning, beepEnd]);

  // Stage change handler
  useEffect(() => {
    if (!stage || stageInitRef.current === session.currentStageIndex) return;
    stageInitRef.current = session.currentStageIndex;

    // Clean up previous stage
    if (typewriterRef.current) { clearTimeout(typewriterRef.current); typewriterRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setSeconds(stage.time);
    setTimerRunning(false); // Don't start timer yet
    setStreamingText('');
    setStreamingId(null);
    setAiThinking(false);
    setStageFinished(false);

    // Add system message
    const speakerName = stage.side === 'both'
      ? '双方交替发言'
      : `${getSideLabel(stage.side)}${getDebaterLabel(stage.debater)} 发言`;

    store.addMessage({
      role: 'system',
      speaker: '',
      content: `── ${stage.name}：${speakerName} ──`,
      stageIndex: session.currentStageIndex,
    });

    // Determine if AI should speak
    const isAISide = stage.side !== session.userSide && stage.side !== 'both';
    let needsAI = false;

    if (isAISide) {
      needsAI = true;
      generateAISpeech('opponent');
    } else if (stage.side === session.userSide) {
      const player = session.players.find(
        p => p.side === stage.side && p.position === stage.debater
      );
      if (player?.type === 'ai-teammate') {
        needsAI = true;
        generateAISpeech('teammate');
      }
    }

    // Only start timer immediately for human turns (AI turns start timer after preparation)
    if (!needsAI) {
      setTimerRunning(true);
    }
  }, [session.currentStageIndex, stage]);

  // Scroll on new messages
  useEffect(() => { scrollToBottom(); }, [session.messages, streamingText, scrollToBottom]);

  async function generateAISpeech(role: 'opponent' | 'teammate') {
    store.setGenerating(true);
    const msgId = `stream-${Date.now()}`;
    setStreamingId(msgId);
    setStreamingText('');
    setAiThinking(true);

    const opponentSide = session.userSide === 'pro' ? 'con' : 'pro';
    const speakerSide = role === 'opponent' ? opponentSide : session.userSide;
    const speakerName = `${getSideLabel(speakerSide)}${getDebaterLabel(stage.debater)}`;
    const currentStageIndex = session.currentStageIndex;
    const currentStage = stage;

    // Build chat history for AI context
    const chatHistory = session.record.map(r => ({
      role: r.side === getSideLabel(session.userSide) || r.side === 'user' ? 'user' as const : 'assistant' as const,
      content: `[${r.speaker} - ${r.stage}]\n${r.content}`,
    }));

    const player = session.players.find(
      p => p.side === speakerSide && p.position === stage.debater
    );

    try {
      // Phase 1: Fetch the full text from SSE silently (user sees "AI 正在准备发言...")
      const res = await fetch('/api/debate/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: session.topic,
          side: getSideLabel(speakerSide),
          opponentSide: getSideLabel(speakerSide === 'pro' ? 'con' : 'pro'),
          stageName: currentStage.name,
          debaterPosition: currentStage.debater,
          stageType: currentStage.type,
          stageTime: currentStage.time,
          role,
          draftArguments: player?.draftArguments,
          chatHistory,
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) fullText += parsed.text;
              if (parsed.error) {
                fullText = `[错误: ${parsed.error}]`;
                break;
              }
            } catch { }
          }
        }
      }

      // Phase 2: Typewriter — pace to fill the stage time naturally
      setAiThinking(false);
      // Now start the timer — AI is ready to speak
      setSeconds(currentStage.time);
      setTimerRunning(true);

      // Calculate per-character delay to fill the stage time
      // Natural Chinese speech: ~3.5-4 chars/sec
      // Use stage time to calculate, clamped to reasonable bounds
      const targetDuration = currentStage.time * 1000 * 0.85; // use 85% of stage time
      let charDelay = fullText.length > 0 ? targetDuration / fullText.length : 100;
      charDelay = Math.max(60, Math.min(charDelay, 350)); // clamp: 60ms (fast) to 350ms (very slow)

      await new Promise<void>((resolve) => {
        let charIndex = 0;

        function tick() {
          charIndex++;
          if (charIndex <= fullText.length) {
            setStreamingText(fullText.slice(0, charIndex));
            typewriterRef.current = window.setTimeout(tick, charDelay);
          } else {
            typewriterRef.current = null;
            resolve();
          }
        }
        tick();
      });

      // Phase 3: Finalize — add to messages/record
      store.addMessage({
        role: role === 'opponent' ? 'ai-opponent' : 'ai-teammate',
        speaker: speakerName,
        content: fullText,
        stageIndex: currentStageIndex,
      });

      store.addRecord({
        side: getSideLabel(speakerSide),
        speaker: speakerName,
        stage: currentStage.name,
        content: fullText,
      });

      setStreamingId(null);
      setStreamingText('');
      store.setGenerating(false);

      // Mark stage as finished — wait for user to click "下一环节"
      if (currentStage.side !== 'both') {
        setTimerRunning(false);
        setStageFinished(true);
      }
    } catch (err: any) {
      setAiThinking(false);
      setStreamingText(`[错误: ${err.message}]`);
      store.setGenerating(false);
    }
  }

  function handleSubmit() {
    const text = inputText.trim();
    if (!text) return;

    const speakerName = `${getSideLabel(session.userSide)}${getDebaterLabel(stage.debater || 0)}`;

    store.addMessage({
      role: 'user',
      speaker: speakerName,
      content: text,
      stageIndex: session.currentStageIndex,
    });

    store.addRecord({
      side: getSideLabel(session.userSide),
      speaker: speakerName,
      stage: stage.name,
      content: text,
    });

    setInputText('');

    if (stage.side === 'both') {
      // Free debate: AI responds after user
      const opponentSide = session.userSide === 'pro' ? 'con' : 'pro';
      generateAISpeech('opponent');
    }
    // Non-free-debate: user decides when to advance via button
  }

  function handleNextStage() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (typewriterRef.current) { clearTimeout(typewriterRef.current); typewriterRef.current = null; }
    setTimerRunning(false);
    setAiThinking(false);
    setStreamingId(null);
    setStreamingText('');
    setStageFinished(false);
    store.setGenerating(false);
    store.advanceStage();
  }

  // Determine what to show
  const isUserTurn = store.isUserTurn();
  const isFreeDebate = stage?.side === 'both';
  const showInput = (isUserTurn || isFreeDebate) && !store.isGenerating;
  const isLastStage = session.currentStageIndex >= session.format.stages.length - 1;

  const speakerName = stage?.side === 'both' ? '双方交替'
    : `${getSideLabel(stage.side)}${getDebaterLabel(stage.debater)}`;

  return (
    <div className="debate-arena">
      {/* Header */}
      <div className="arena-header">
        <div className="arena-info">
          <span className="badge badge-pro" style={session.userSide === 'con' ? { background: 'rgba(245,121,91,0.15)', color: 'var(--con-color)', borderColor: 'rgba(245,121,91,0.3)' } : undefined}>
            你是{getSideLabel(session.userSide)}
          </span>
          <span className="arena-topic">{session.topic}</span>
        </div>
        <ProgressBar
          current={session.currentStageIndex}
          total={session.format.stages.length}
          label={`环节 ${session.currentStageIndex + 1} / ${session.format.stages.length}`}
        />
      </div>

      {/* Stage Banner */}
      <div className="stage-banner">
        <div className="stage-banner-info">
          <span className="stage-banner-name">{stage.name}</span>
          <span className="stage-banner-speaker">{speakerName}</span>
        </div>
        <TimerDisplay seconds={seconds} size="sm" />
      </div>

      {/* Chat */}
      <div className="arena-chat" ref={chatRef}>
        {session.messages.map(msg => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        {streamingId && streamingText && (
          <ChatBubble message={{
            id: streamingId,
            role: 'ai-opponent',
            speaker: speakerName,
            content: streamingText,
            stageIndex: session.currentStageIndex,
            timestamp: Date.now(),
          }} />
        )}
      </div>

      {/* Bottom controls */}
      <div className="arena-input">
        {/* AI thinking state */}
        {aiThinking && (
          <div className="generating-hint animate-pulse">AI 正在准备发言...</div>
        )}

        {/* AI speaking (typewriter running) */}
        {store.isGenerating && !aiThinking && !showInput && (
          <div className="generating-hint animate-pulse">AI 正在发言中...</div>
        )}

        {/* Stage finished — manual advance button */}
        {stageFinished && !store.isGenerating && (
          <button
            className="btn btn-primary btn-lg"
            onClick={handleNextStage}
            style={{ alignSelf: 'center', minWidth: 200 }}
          >
            {isLastStage ? '结束辩论，进入分析' : '下一环节'}
          </button>
        )}

        {/* User input area */}
        {showInput && !stageFinished && (
          <>
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={isFreeDebate ? '自由辩论 — 输入发言后 AI 会回应' : `请输入${speakerName}的发言...`}
              rows={3}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSubmit(); }}
            />
            <div className="input-actions">
              <span className="input-hint">Ctrl+Enter 发送</span>
              <button className="btn" onClick={() => { setStageFinished(true); setTimerRunning(false); }}>
                结束发言
              </button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={!inputText.trim()}>
                发言
              </button>
            </div>
          </>
        )}

        {/* Show advance button for user turn when they mark it done */}
        {showInput && stageFinished && (
          <button
            className="btn btn-primary btn-lg"
            onClick={handleNextStage}
            style={{ alignSelf: 'center', minWidth: 200 }}
          >
            {isLastStage ? '结束辩论，进入分析' : '下一环节'}
          </button>
        )}
      </div>
    </div>
  );
}
