import { useEffect, useRef } from 'react';
import { useDebateStore } from '../stores/useDebateStore';
import { authFetch } from '../stores/useAuthStore';
import DebateSetup from '../components/debate/DebateSetup';
import DebateArena from '../components/debate/DebateArena';
import AnalysisDashboard from '../components/analysis/AnalysisDashboard';

export default function DebatePage() {
  const session = useDebateStore(s => s.session);
  const verdicts = useDebateStore(s => s.verdicts);
  const reset = useDebateStore(s => s.reset);
  const setSavedRecordId = useDebateStore(s => s.setSavedRecordId);
  const savedRef = useRef(false);

  // Auto-save when debate finishes
  useEffect(() => {
    if (session?.status === 'finished' && !savedRef.current) {
      savedRef.current = true;
      authFetch('/api/records', {
        method: 'POST',
        body: JSON.stringify({
          topic: session.topic,
          formatName: session.format.name || session.format.id,
          userSide: session.userSide,
          mode: session.mode,
          record: session.record,
          messages: session.messages,
          verdicts: verdicts.length > 0 ? verdicts : null,
        }),
      }).then(res => res.json())
        .then(data => {
          if (data.id) setSavedRecordId(data.id);
        })
        .catch(() => {});
    }
  }, [session?.status, verdicts, setSavedRecordId]);

  // Reset saved flag when session changes
  useEffect(() => {
    if (!session) savedRef.current = false;
  }, [session]);

  if (!session) {
    return <DebateSetup />;
  }

  if (session.status === 'finished') {
    return (
      <div>
        <button className="btn btn-ghost" onClick={reset} style={{ marginBottom: 16 }}>
          ← 返回设置
        </button>
        <AnalysisDashboard />
      </div>
    );
  }

  return (
    <div>
      <button className="btn btn-ghost" onClick={reset} style={{ position: 'absolute', top: 24, right: 32, zIndex: 10 }}>
        退出辩论
      </button>
      <DebateArena />
    </div>
  );
}
