import { useState, useEffect, useCallback } from 'react';
import { useAuthStore, authFetch } from '../stores/useAuthStore';

interface ClassItem {
  id: number;
  name: string;
  teacher_name?: string;
  invite_code?: string;
  member_count?: number;
}

interface Member {
  id: number;
  username: string;
  displayName: string;
}

interface Task {
  id: number;
  title: string;
  description: string;
  topic: string;
  due_date: string;
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '16px 20px',
  marginBottom: 12,
  cursor: 'pointer',
};

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '8px 12px',
  color: 'var(--text)',
  fontSize: 14,
  flex: 1,
};

const btnStyle: React.CSSProperties = {
  background: 'var(--primary)',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '8px 18px',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
};

export default function ClassPage() {
  const user = useAuthStore(s => s.user);
  const isTeacher = user?.role === 'teacher';

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchClasses = useCallback(async () => {
    try {
      const res = await authFetch('/api/classes');
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setClasses(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  if (loading) return <div style={{ padding: 32, color: 'var(--text-dim)' }}>加载中...</div>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ color: 'var(--text-bright)', marginBottom: 24 }}>班级管理</h1>
      {error && <p style={{ color: '#e55' }}>{error}</p>}
      {isTeacher ? <TeacherView classes={classes} reload={fetchClasses} /> : <StudentView classes={classes} reload={fetchClasses} />}
    </div>
  );
}

/* ───── Student View ───── */

function StudentView({ classes, reload }: { classes: ClassItem[]; reload: () => void }) {
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');

  async function handleJoin() {
    if (!code.trim()) return;
    setMsg('');
    try {
      const res = await authFetch('/api/classes/join', {
        method: 'POST',
        body: JSON.stringify({ invite_code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '加入失败');
      setMsg('已成功加入班级');
      setCode('');
      reload();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  return (
    <>
      <div style={{ ...cardStyle, display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ color: 'var(--text-bright)', fontWeight: 600, whiteSpace: 'nowrap' }}>加入班级</span>
        <input
          style={inputStyle}
          placeholder="输入邀请码"
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
        />
        <button style={btnStyle} onClick={handleJoin}>加入</button>
      </div>
      {msg && <p style={{ color: 'var(--accent)', marginBottom: 12, fontSize: 14 }}>{msg}</p>}

      <h2 style={{ color: 'var(--text-bright)', fontSize: 18, margin: '20px 0 12px' }}>已加入的班级</h2>
      {classes.length === 0 && <p style={{ color: 'var(--text-dim)' }}>暂无班级，请通过邀请码加入。</p>}
      {classes.map(c => (
        <div key={c.id} style={cardStyle}>
          <div style={{ color: 'var(--text-bright)', fontWeight: 600, fontSize: 16 }}>{c.name}</div>
          <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>教师: {c.teacher_name}</div>
        </div>
      ))}
    </>
  );
}

/* ───── Teacher View ───── */

function TeacherView({ classes, reload }: { classes: ClassItem[]; reload: () => void }) {
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    setMsg('');
    try {
      const res = await authFetch('/api/classes', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '创建失败');
      setMsg('班级已创建');
      setName('');
      reload();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  return (
    <>
      <div style={{ ...cardStyle, display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ color: 'var(--text-bright)', fontWeight: 600, whiteSpace: 'nowrap' }}>创建班级</span>
        <input
          style={inputStyle}
          placeholder="班级名称"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />
        <button style={btnStyle} onClick={handleCreate}>创建</button>
      </div>
      {msg && <p style={{ color: 'var(--accent)', marginBottom: 12, fontSize: 14 }}>{msg}</p>}

      <h2 style={{ color: 'var(--text-bright)', fontSize: 18, margin: '20px 0 12px' }}>我的班级</h2>
      {classes.length === 0 && <p style={{ color: 'var(--text-dim)' }}>暂无班级，请创建一个。</p>}
      {classes.map(c => (
        <TeacherClassCard
          key={c.id}
          cls={c}
          expanded={expandedId === c.id}
          onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
        />
      ))}
    </>
  );
}

function TeacherClassCard({ cls, expanded, onToggle }: { cls: ClassItem; expanded: boolean; onToggle: () => void }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Task form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taskMsg, setTaskMsg] = useState('');

  useEffect(() => {
    if (expanded && !loaded) {
      Promise.all([
        authFetch(`/api/classes/${cls.id}`).then(r => r.json()),
        authFetch(`/api/tasks/class/${cls.id}`).then(r => r.json()),
      ]).then(([classData, taskData]) => {
        setMembers(classData.members || []);
        setTasks(Array.isArray(taskData) ? taskData : []);
        setLoaded(true);
      });
    }
  }, [expanded, loaded, cls.id]);

  function copyCode() {
    if (cls.invite_code) {
      navigator.clipboard.writeText(cls.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  async function handlePublishTask() {
    if (!title.trim() || !topic.trim()) return;
    setTaskMsg('');
    try {
      const res = await authFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ class_id: cls.id, title, description, topic, due_date: dueDate || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '发布失败');
      setTaskMsg('任务已发布');
      setTitle(''); setDescription(''); setTopic(''); setDueDate('');
      // refresh tasks
      const taskRes = await authFetch(`/api/tasks/class/${cls.id}`);
      setTasks(await taskRes.json());
    } catch (e: any) {
      setTaskMsg(e.message);
    }
  }

  return (
    <div style={{ ...cardStyle, cursor: 'default' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={onToggle}>
        <div>
          <span style={{ color: 'var(--text-bright)', fontWeight: 600, fontSize: 16 }}>{cls.name}</span>
          <span style={{ color: 'var(--text-dim)', fontSize: 13, marginLeft: 12 }}>{cls.member_count ?? 0} 名成员</span>
        </div>
        <span style={{ color: 'var(--text-dim)', fontSize: 18 }}>{expanded ? '▾' : '▸'}</span>
      </div>

      {/* Invite code row */}
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>邀请码:</span>
        <code style={{
          background: 'var(--primary)',
          color: '#fff',
          padding: '2px 10px',
          borderRadius: 4,
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: 1,
          cursor: 'pointer',
        }} onClick={copyCode} title="点击复制">
          {cls.invite_code}
        </code>
        {copied && <span style={{ color: 'var(--accent)', fontSize: 12 }}>已复制</span>}
      </div>

      {expanded && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          {/* Members */}
          <h4 style={{ color: 'var(--text-bright)', margin: '0 0 8px' }}>成员列表</h4>
          {members.length === 0 ? (
            <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>暂无成员</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {members.map(m => (
                <span key={m.id} style={{
                  background: 'var(--border)',
                  color: 'var(--text)',
                  padding: '4px 12px',
                  borderRadius: 14,
                  fontSize: 13,
                }}>
                  {m.displayName || m.username}
                </span>
              ))}
            </div>
          )}

          {/* Tasks */}
          <h4 style={{ color: 'var(--text-bright)', margin: '12px 0 8px' }}>练习任务</h4>
          {tasks.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>暂无任务</p>}
          {tasks.map(t => (
            <div key={t.id} style={{
              background: 'var(--border)',
              borderRadius: 6,
              padding: '10px 14px',
              marginBottom: 8,
              fontSize: 13,
            }}>
              <div style={{ color: 'var(--text-bright)', fontWeight: 600 }}>{t.title}</div>
              {t.description && <div style={{ color: 'var(--text-dim)', marginTop: 4 }}>{t.description}</div>}
              <div style={{ color: 'var(--text-dim)', marginTop: 4 }}>
                辩题: {t.topic}{t.due_date ? ` · 截止: ${t.due_date}` : ''}
              </div>
            </div>
          ))}

          {/* Publish task form */}
          <h4 style={{ color: 'var(--text-bright)', margin: '16px 0 8px' }}>发布任务</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input style={inputStyle} placeholder="任务标题" value={title} onChange={e => setTitle(e.target.value)} />
            <input style={inputStyle} placeholder="任务描述" value={description} onChange={e => setDescription(e.target.value)} />
            <input style={inputStyle} placeholder="辩题" value={topic} onChange={e => setTopic(e.target.value)} />
            <input style={{ ...inputStyle, flex: 'none' }} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            <button style={{ ...btnStyle, alignSelf: 'flex-start' }} onClick={handlePublishTask}>发布任务</button>
          </div>
          {taskMsg && <p style={{ color: 'var(--accent)', fontSize: 13, marginTop: 6 }}>{taskMsg}</p>}
        </div>
      )}
    </div>
  );
}
