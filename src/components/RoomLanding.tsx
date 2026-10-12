import React, { useState } from 'react'
import { generateRoomId } from '../utils/room'

interface RoomLandingProps {
  defaultName: string
  onEnter: (roomId: string, name: string) => void
}

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

const PenIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18" />
    <path d="M2 2l7.586 7.586" />
    <circle cx="11" cy="11" r="2" />
  </svg>
)

export const RoomLanding: React.FC<RoomLandingProps> = ({ defaultName, onEnter }) => {
  const [name, setName] = useState(defaultName)
  const [joinCode, setJoinCode] = useState('')

  const handleCreate = () => onEnter(generateRoomId(), name)

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    onEnter(joinCode, name)
  }

  return (
    <main className="room-landing" id="landing-root">
      {/* Decorative gradient glow orbs */}
      <div className="room-landing-ambient" aria-hidden="true">
        <div className="ambient-orb orb-1" />
        <div className="ambient-orb orb-2" />
        <div className="ambient-grid" />
      </div>

      <div className="room-landing-card">
        {/* Top brand header */}
        <header className="room-landing-head">
          <div className="landing-brand-badge">
            <div className="landing-brand-icon">
              <PenIcon />
            </div>
            <div className="landing-brand-text">
              <h1 className="landing-title">
                Scriblio
              </h1>
              <span className="landing-pill">COLLABORATIVE CANVAS</span>
            </div>
          </div>

          <p className="room-landing-tagline">
            Next-generation whiteboard with real-time WebRTC sync and AI-assisted diagramming.
          </p>

          <div className="landing-feature-chips" aria-hidden="true">
            <span className="feature-chip">⚡ WebRTC P2P</span>
            <span className="feature-chip">🔄 Real-time CRDT</span>
            <span className="feature-chip">✨ AI Diagrams</span>
          </div>
        </header>

        {/* User profile identifier field */}
        <div className="room-field">
          <label htmlFor="user-display-name" className="room-field-label">
            Your display name
          </label>
          <div className="room-input-wrap">
            <span className="room-input-icon">👤</span>
            <input
              id="user-display-name"
              className="room-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex, Maya"
              maxLength={32}
              aria-label="Your display name"
            />
          </div>
        </div>

        {/* Action cards: Create or Join */}
        <div className="room-actions">
          <section className="room-action-card room-create-card">
            <div className="room-action-info">
              <h3>Create a new board</h3>
              <p>Instant workspace with a unique shareable room link.</p>
            </div>
            <button
              id="create-room-btn"
              type="button"
              className="room-btn room-btn-primary"
              onClick={handleCreate}
            >
              <span className="room-btn-icon"><PlusIcon /></span>
              <span>New Canvas</span>
            </button>
          </section>

          <div className="room-divider" aria-hidden="true">
            <span>OR JOIN EXISTING</span>
          </div>

          <form className="room-action-card room-join-card" onSubmit={handleJoin}>
            <div className="room-action-info">
              <h3>Join with code</h3>
              <p>Enter the 6-character room code shared by your teammate.</p>
            </div>
            <div className="room-join-row">
              <input
                id="join-room-code-input"
                className="room-input room-code-input"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                spellCheck={false}
                autoCapitalize="characters"
                autoCorrect="off"
                maxLength={16}
                aria-label="Room code"
              />
              <button 
                id="join-room-btn"
                type="submit" 
                className="room-btn room-btn-secondary" 
                disabled={!joinCode.trim()}
              >
                <span>Join</span>
                <span className="room-btn-icon"><ArrowIcon /></span>
              </button>
            </div>
          </form>
        </div>

        <footer className="room-landing-foot">
          <span className="security-badge">🔒 End-to-end peer encrypted &amp; local CRDT storage</span>
        </footer>
      </div>
    </main>
  )
}

