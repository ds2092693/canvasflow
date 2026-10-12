import { useRef, useState, useEffect } from 'react'
import { ScriblioCanvas, ScriblioCanvasRef } from './components/ScriblioCanvas'
import { Toolbar } from './components/Toolbar'
import { PropertiesPanel } from './components/PropertiesPanel'
import { Footer } from './components/Footer'
import { useScriblioState } from './hooks/useScriblioState'
import {
  CollaborationProvider,
  PresenceProvider,
  useCollaboration,
  useCanvasSync,
  useYjsHistory,
  generateUserId,
  generateUserColor,
} from './collaboration'
import { normalizeRoomId } from './utils/room'
import { RoomLanding } from './components/RoomLanding'
import { RoomBar } from './components/RoomBar'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AICommandPalette } from './components/AICommandPalette'
import './styles/scriblio.css'
import './styles/ai-modal.css'
import './styles/ai-command-palette.css'
import './styles/room.css'
import { AppState, ScriblioElement } from './types/scriblio'

const STORAGE_NAME_KEY = 'scriblio:user-name'

// Stable per-browser-session identity. The display name is chosen by the user.
const userId = generateUserId()
const userColor = generateUserColor()

function fallbackName(): string {
  return `User ${userId.slice(-4)}`
}

interface AppContentProps {
  roomId: string
  onLeaveRoom: () => void
}

function AppContent({ roomId, onLeaveRoom }: AppContentProps) {
  const {
    elements,
    appState,
    updateAppState,
    clearCanvas,
    addElement,
    updateElement,
    deleteElements,
    setCanvasAppRef,
    setElementsFromCanvas,
    applyRemoteElements,
  } = useScriblioState()

  // Bridge the local canvas with the shared Yjs document for this room.
  const { documentManager } = useCollaboration()
  useCanvasSync(documentManager, elements, applyRemoteElements)

  // Undo/redo is backed by the shared document so it stays correct across
  // collaborators — it only ever reverts this user's own edits.
  const { undo, redo, canUndo, canRedo } = useYjsHistory(documentManager)

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      // Let inputs keep their native undo (e.g. the inline text editor).
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault()
        redo()
      }
    }
    document.addEventListener('keydown', handleKeyboard)
    return () => document.removeEventListener('keydown', handleKeyboard)
  }, [undo, redo])

  const canvasRef = useRef<ScriblioCanvasRef>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const handleToolChange = (tool: string) => {
    updateAppState({ activeTool: tool as any })
  }

  const handleToggleToolLock = () => {
    updateAppState({ isToolLocked: !appState.isToolLocked })
  }

  const handleClear = () => {
    clearCanvas()
    canvasRef.current?.clearCanvas()
  }

  const handleExport = () => {
    try {
      const jsonData = canvasRef.current?.exportToJSON()
      if (jsonData) {
        const dataBlob = new Blob([jsonData], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `scriblio-export-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    }
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const jsonData = e.target?.result as string
            const data = JSON.parse(jsonData)
            clearCanvas()
            canvasRef.current?.clearCanvas()
            if (data.elements && Array.isArray(data.elements)) {
              data.elements.forEach((element: any) => addElement(element))
            }
            if (data.appState) {
              updateAppState(data.appState)
            }
          } catch (error) {
            console.error('Failed to import:', error)
            alert('Failed to import file. Please check the file format.')
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const handleAddAIElements = (aiElements: Partial<ScriblioElement>[]) => {
    aiElements.forEach((element) => {
      addElement(element as ScriblioElement)
    })
  }

  const selectedElements = elements.filter(el =>
    appState.selectedElementIds.includes(el.id)
  )

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand-logo" aria-label="Scriblio">
            <div className="brand-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18" />
                <path d="M2 2l7.586 7.586" />
                <circle cx="11" cy="11" r="2" />
              </svg>
            </div>
            <span className="brand-name">
              Scriblio
              <span className="brand-badge">SYNC</span>
            </span>
          </div>
        </div>

        <div className="topbar-center">
          <Toolbar
            appState={appState}
            activeTool={appState.activeTool}
            isToolLocked={appState.isToolLocked}
            onToolChange={handleToolChange}
            onToggleToolLock={handleToggleToolLock}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
        </div>

        <div className="topbar-right">
          <button
            type="button"
            className={`topbar-action-btn ${appState.isToolLocked ? 'active' : ''}`}
            onClick={handleToggleToolLock}
            title={appState.isToolLocked ? "Tool is locked (click to unlock)" : "Lock selected tool"}
            aria-label="Toggle tool lock"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {appState.isToolLocked ? (
                <>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </>
              ) : (
                <>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                </>
              )}
            </svg>
          </button>

          <RoomBar roomId={roomId} onLeave={onLeaveRoom} />

          <button
            type="button"
            className={`topbar-menu-btn ${isPanelOpen ? 'active' : ''}`}
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            title="Canvas settings & properties"
            aria-label="Properties panel"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
            <span>Properties</span>
          </button>
        </div>
      </header>

      <div className="content">
        <div className="canvas-wrap">
          <ScriblioCanvas
            ref={canvasRef}
            elements={elements}
            appState={appState}
            onElementsChange={setElementsFromCanvas}
            onAppStateChange={updateAppState}
            onCanvasAppReady={setCanvasAppRef}
          />
        </div>
      </div>

      <Footer
        viewTransform={appState.viewTransform}
        selectedCount={appState.selectedElementIds.length}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      <PropertiesPanel
        selectedElements={selectedElements}
        appState={appState}
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onClear={handleClear}
        onExport={handleExport}
        onImport={handleImport}
        onDeleteElements={deleteElements}
        onUpdateElement={updateElement}
        onPropertyChange={(updates: Partial<AppState>) => updateAppState(updates)}
      />

      <AICommandPalette
        elements={elements}
        selectedElements={selectedElements}
        onAddElements={handleAddAIElements}
      />

      {isPanelOpen && (
        <div
          className="panel-overlay"
          onClick={() => setIsPanelOpen(false)}
        />
      )}
    </div>
  )
}

export default function App() {
  // Room id is read from the URL hash so shared links join directly.
  const [roomId, setRoomId] = useState<string | null>(() => {
    const fromHash = normalizeRoomId(window.location.hash.slice(1))
    return fromHash || null
  })

  const [userName, setUserName] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_NAME_KEY)?.trim() || fallbackName()
    } catch {
      return fallbackName()
    }
  })

  const enterRoom = (rawRoomId: string, rawName: string) => {
    const id = normalizeRoomId(rawRoomId)
    if (!id) return

    const name = rawName.trim() || fallbackName()
    try {
      localStorage.setItem(STORAGE_NAME_KEY, name)
    } catch {
      /* storage unavailable — ignore */
    }
    setUserName(name)
    window.location.hash = id
    setRoomId(id)
  }

  const leaveRoom = () => {
    try {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    } catch {
      window.location.hash = ''
    }
    setRoomId(null)
  }

  if (!roomId) {
    return <RoomLanding defaultName={userName} onEnter={enterRoom} />
  }

  const collaborationConfig = {
    roomId,
    userId,
    userName,
    redisWsUrl: import.meta.env.VITE_REDIS_WS_URL,
    websocketUrl: import.meta.env.VITE_WEBSOCKET_URL,
    signaling: import.meta.env.VITE_SIGNALING_URLS?.split(','),
  }

  const handleCollaborationError = (error: Error) => {
    console.error('Collaboration error:', error)
  }

  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
        }}>
          <div style={{
            maxWidth: '500px',
            padding: '2rem',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            textAlign: 'center',
          }}>
            <h1 style={{ color: '#f44336', marginBottom: '1rem' }}>
              ⚠️ Application Error
            </h1>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
              {error.message}
            </p>
            <button
              onClick={reset}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#646cff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      )}
    >
      <CollaborationProvider
        key={roomId}
        config={collaborationConfig}
        onError={handleCollaborationError}
      >
        <PresenceProvider userId={userId} userName={userName} userColor={userColor}>
          <AppContent roomId={roomId} onLeaveRoom={leaveRoom} />
        </PresenceProvider>
      </CollaborationProvider>
    </ErrorBoundary>
  )
}
