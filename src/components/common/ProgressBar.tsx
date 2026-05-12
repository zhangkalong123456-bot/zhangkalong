interface Props {
  current: number;
  total: number;
  label?: string;
}

export default function ProgressBar({ current, total, label }: Props) {
  const pct = total > 0 ? (current / total) * 100 : 0;

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 4 }}>
          {label}
        </div>
      )}
      <div style={{
        width: '100%', height: 6, background: 'var(--bg-input)',
        borderRadius: 3, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: 'var(--primary)',
          borderRadius: 3, transition: 'width 0.3s',
        }} />
      </div>
    </div>
  );
}
