interface FooterProps {
  viewTransform: { x: number; y: number; zoom: number };
  selectedCount: number;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const UndoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
  </svg>
);

const RedoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 7v6h-6" />
    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
  </svg>
);

export function Footer({ 
  viewTransform, 
  selectedCount, 
  onUndo, 
  onRedo, 
  canUndo, 
  canRedo 
}: FooterProps) {
  const zoomPercent = Math.round(viewTransform.zoom * 100);

  return (
    <footer className="footer-dock" aria-label="Canvas controls">
      {/* Undo & Redo group */}
      <div className="footer-group">
        <button 
          type="button"
          className="footer-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z / ⌘Z)"
          aria-label="Undo"
        >
          <span className="footer-icon"><UndoIcon /></span>
          <span className="footer-label">Undo</span>
        </button>
        <button 
          type="button"
          className="footer-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y / ⌘Y)"
          aria-label="Redo"
        >
          <span className="footer-icon"><RedoIcon /></span>
          <span className="footer-label">Redo</span>
        </button>
      </div>

      <div className="footer-divider" />

      {/* Zoom and pan stats */}
      <div className="footer-group footer-stats">
        <span className="footer-stat-chip" title="Current zoom level">
          <svg className="footer-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {zoomPercent}%
        </span>

        {selectedCount > 0 && (
          <span className="footer-selection-chip">
            {selectedCount} selected
          </span>
        )}
      </div>
    </footer>
  );
}

