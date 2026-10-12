import React from 'react';
import { AppState, ToolType } from '../types/scriblio';

interface ToolbarProps {
  appState: AppState;
  activeTool: string;
  isToolLocked: boolean;
  onToolChange: (tool: string) => void;
  onToggleToolLock: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const ToolIcons: Record<string, React.ReactNode> = {
  selection: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l7 18 3-7 7-3L3 3z" />
    </svg>
  ),
  rectangle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
    </svg>
  ),
  ellipse: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),
  diamond: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12,2 22,12 12,22 2,12" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="19" x2="19" y2="5" />
      <polyline points="9 5 19 5 19 15" />
    </svg>
  ),
  line: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="20" x2="20" y2="4" />
    </svg>
  ),
  freedraw: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  ),
  text: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="12" y1="4" x2="12" y2="20" />
      <line x1="8" y1="20" x2="16" y2="20" />
    </svg>
  ),
  image: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  eraser: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13.5L13.5 18 5 9.5 9.5 5 18 13.5z" />
      <path d="M14 18.5H21" />
    </svg>
  )
};

export function Toolbar({ activeTool, onToolChange }: ToolbarProps) {
  const tools = [
    { type: 'selection' as ToolType, label: 'Selection', shortcut: 'V' },
    { type: 'rectangle' as ToolType, label: 'Rectangle', shortcut: 'R' },
    { type: 'ellipse' as ToolType, label: 'Ellipse', shortcut: 'O' },
    { type: 'diamond' as ToolType, label: 'Diamond', shortcut: 'D' },
    { type: 'arrow' as ToolType, label: 'Arrow', shortcut: 'A' },
    { type: 'line' as ToolType, label: 'Line', shortcut: 'L' },
    { type: 'freedraw' as ToolType, label: 'Draw', shortcut: 'P' },
    { type: 'text' as ToolType, label: 'Text', shortcut: 'T' },
    { type: 'image' as ToolType, label: 'Image', shortcut: 'I' },
    { type: 'eraser' as ToolType, label: 'Eraser', shortcut: 'E' }
  ];

  return (
    <nav className="toolbar" aria-label="Drawing tools">
      <div className="toolbar-pills">
        {tools.map((tool) => {
          const isActive = activeTool === tool.type;
          return (
            <button
              key={tool.type}
              type="button"
              className={`tool-btn ${isActive ? 'active' : ''}`}
              onClick={() => onToolChange(tool.type)}
              title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
              aria-label={tool.label}
              aria-pressed={isActive}
            >
              <span className="tool-icon">{ToolIcons[tool.type]}</span>
              {tool.shortcut && (
                <span className="tool-shortcut-badge">{tool.shortcut}</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

