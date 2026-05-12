import type { DebateMessage } from '../../lib/types';
import './ChatBubble.css';

interface Props {
  message: DebateMessage;
}

export default function ChatBubble({ message }: Props) {
  const roleClass = message.role === 'user' ? 'chat-user'
    : message.role === 'system' ? 'chat-system'
    : message.role === 'judge' ? 'chat-judge'
    : 'chat-ai';

  return (
    <div className={`chat-bubble-wrap ${roleClass} animate-fade`}>
      {message.role !== 'system' && (
        <span className="chat-sender">{message.speaker}</span>
      )}
      <div className="chat-bubble-content">
        {message.content}
      </div>
    </div>
  );
}
