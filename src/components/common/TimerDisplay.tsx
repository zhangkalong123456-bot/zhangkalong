import './TimerDisplay.css';

interface Props {
  seconds: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function TimerDisplay({ seconds, size = 'lg' }: Props) {
  const min = Math.floor(Math.abs(seconds) / 60);
  const sec = Math.abs(seconds) % 60;
  const prefix = seconds < 0 ? '-' : '';
  const display = `${prefix}${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

  let colorClass = 'timer-green';
  if (seconds <= 0) colorClass = 'timer-red';
  else if (seconds <= 30) colorClass = 'timer-yellow';

  return (
    <div className={`timer-display timer-${size} ${colorClass}`}>
      {display}
    </div>
  );
}
