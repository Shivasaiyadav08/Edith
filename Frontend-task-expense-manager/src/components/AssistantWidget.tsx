import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { Bot, GripHorizontal, RotateCcw, X } from 'lucide-react';
import { useWorkspace } from '../lib/workspace-context';
import AssistantPanel from './AssistantPanel';

export default function AssistantWidget() {
  const { assistant, openAssistant, closeAssistant } = useWorkspace();
  const [position, setPosition] = useState({
    x: Math.max(12, window.innerWidth - 82),
    y: Math.max(12, window.innerHeight - 86),
  });
  const drag = useRef({ x: 0, y: 0, startX: 0, startY: 0, moved: false });
  const movedByUser = useRef(false);
  function dock() {
    movedByUser.current = false;
    setPosition({ x: window.innerWidth - 82, y: window.innerHeight - 86 });
  }
  function start(event: PointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest('button') && event.currentTarget.tagName !== 'BUTTON')
      return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      startX: position.x,
      startY: position.y,
      moved: false,
    };
  }
  function move(event: PointerEvent<HTMLElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const dx = event.clientX - drag.current.x,
      dy = event.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.current.moved = true;
    if (drag.current.moved) {
      movedByUser.current = true;
      setPosition({
        x: Math.max(12, Math.min(window.innerWidth - 70, drag.current.startX + dx)),
        y: Math.max(12, Math.min(window.innerHeight - 70, drag.current.startY + dy)),
      });
    }
  }
  useEffect(() => {
    const resize = () =>
      setPosition((p) => ({
        x: Math.max(
          12,
          movedByUser.current ? Math.min(window.innerWidth - 70, p.x) : window.innerWidth - 82,
        ),
        y: Math.max(
          12,
          movedByUser.current ? Math.min(window.innerHeight - 70, p.y) : window.innerHeight - 86,
        ),
      }));
    resize();
    window.addEventListener('resize', resize);
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAssistant();
    };
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', escape);
    };
  }, [closeAssistant]);
  const panelLeft = Math.max(12, Math.min(window.innerWidth - 452, position.x - 370));
  const panelTop = Math.max(12, Math.min(window.innerHeight - 650, position.y - 575));
  return (
    <>
      {assistant && (
        <section
          className="edith-chat"
          role="dialog"
          aria-label="Ultron AI assistant"
          style={{ left: panelLeft, top: panelTop }}
        >
          <header className="edith-chat-header" onPointerDown={start} onPointerMove={move}>
            <span className="bot-avatar">
              <Bot size={22} />
            </span>
            <div>
              <strong>Ultron</strong>
              <small>Your workspace copilot</small>
            </div>
            <GripHorizontal size={17} className="drag-grip" />
            <button
              className="icon-button"
              aria-label="Dock assistant to bottom right"
              onClick={dock}
            >
              <RotateCcw size={14} />
            </button>
            <button className="icon-button" aria-label="Close assistant" onClick={closeAssistant}>
              <X size={17} />
            </button>
          </header>
          <div className="edith-chat-content">
            <AssistantPanel
              key={`${assistant.mode}:${assistant.prompt}`}
              initialMode={assistant.mode}
              initialPrompt={assistant.prompt}
            />
          </div>
        </section>
      )}
      <button
        className={`edith-launcher ${assistant ? 'is-open' : ''}`}
        style={{ left: position.x, top: position.y }}
        onPointerDown={start}
        onPointerMove={move}
        onClick={(e) => {
          if (e.detail === 0 || !drag.current.moved) {
            if (assistant) closeAssistant();
            else openAssistant();
          }
        }}
        aria-label={assistant ? 'Close Ultron assistant' : 'Ask Ultron — drag to move'}
        title="Ask Ultron · drag to move"
      >
        <span className="robot-face">
          <i />
          <i />
        </span>
        <span className="launcher-label">Ultron</span>
      </button>
    </>
  );
}
