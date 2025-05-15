import { useState, useRef, useEffect } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import './App.css'

// Types for card and play area
interface MTGCard {
  id: string
  name: string
  imageUrl: string
  oracle_text?: string // Add oracle_text for ability detection
  power?: string // Add power for creatures
  toughness?: string // Add toughness for creatures
}

const CARD_TYPE = 'MTG_CARD'

// Utility to generate a random table name
function randomTableName() {
  const adjectives = ["Mighty", "Ancient", "Swift", "Cunning", "Arcane", "Wild", "Sacred", "Shadow", "Radiant", "Feral"]
  const nouns = ["Forest", "Dragon", "Knight", "Wizard", "Temple", "Phoenix", "Druid", "Goblin", "Angel", "Demon"]
  return (
    adjectives[Math.floor(Math.random() * adjectives.length)] +
    " " +
    nouns[Math.floor(Math.random() * nouns.length)]
  )
}

function DraggableCard({ card, fromArea, idx, onCardClick, tapped, isAttacking, isBlocking, blockedTarget, onUntap, onZoom }: {
  card: MTGCard
  fromArea: number
  idx: number
  onCardClick?: (areaIdx: number, cardIdx: number) => void
  tapped?: boolean
  isAttacking?: boolean
  isBlocking?: boolean
  blockedTarget?: { opponentArea: number, opponentIdx: number }
  onUntap?: (areaIdx: number, cardIdx: number) => void
  onZoom?: (card: MTGCard) => void
}) {
  const ref = useRef<HTMLImageElement>(null)
  const [hovered, setHovered] = useState(false)
  const [{ isDragging }, drag] = useDrag(() => ({
    type: CARD_TYPE,
    item: { card, fromArea, idx },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }))
  drag(ref)
  // Click: if tapped, untap; else open overlay
  const handleClick = () => {
    if (isBlocking && onUntap) onUntap(fromArea, idx)
    else if (tapped && onUntap) onUntap(fromArea, idx)
    else if (onCardClick) onCardClick(fromArea, idx)
  }
  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-blocking={isBlocking ? 'true' : undefined}
      data-blockedtarget={blockedTarget ? JSON.stringify(blockedTarget) : undefined}
    >
      <img
        ref={ref}
        src={card.imageUrl}
        alt={card.name}
        className="table-card"
        style={{
          opacity: isDragging ? 0.5 : 1,
          cursor: 'grab',
          transition: 'transform 0.2s',
          transform: tapped ? 'rotate(90deg)' : 'none',
          boxShadow: isAttacking ? '0 0 0 3px #d9534f' : isBlocking ? '0 0 0 3px #0275d8' : undefined
        }}
        onClick={handleClick}
      />
      {/* Zoom/inspect button on hover */}
      {hovered && (
        <button
          style={{
            position: 'absolute',
            bottom: '6px',
            right: '6px',
            zIndex: 3,
            background: 'linear-gradient(135deg, #4f8cff 60%, #1e3c72 100%)',
            border: 'none',
            borderRadius: '50%',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px #0003',
            cursor: 'pointer',
            transition: 'background 0.18s',
            outline: 'none',
            padding: 0,
          }}
          onClick={e => { e.stopPropagation(); onZoom && onZoom(card) }}
          title="Inspect card"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="9" cy="9" r="7" stroke="#fff" strokeWidth="2" fill="none" />
            <line x1="14.2" y1="14.2" x2="18" y2="18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}
      {/* Draw red arrow if attacking */}
      {isAttacking && (
        <svg style={{ position: 'absolute', top: '50%', left: '100%', width: '120px', height: '0', pointerEvents: 'none', zIndex: 2 }}>
          <line x1="0" y1="0" x2="120" y2="0" stroke="#d9534f" strokeWidth="4" markerEnd="url(#arrowhead)" />
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#d9534f" />
            </marker>
          </defs>
        </svg>
      )}
      {/* Draw blue line if blocking */}
      {isBlocking && blockedTarget && (
        <svg style={{ position: 'absolute', top: '50%', left: '100%', width: '120px', height: '0', pointerEvents: 'none', zIndex: 2 }}>
          <line x1="0" y1="0" x2="120" y2="0" stroke="#0275d8" strokeWidth="4" markerEnd="url(#arrowheadb)" />
          <defs>
            <marker id="arrowheadb" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#0275d8" />
            </marker>
          </defs>
        </svg>
      )}
    </div>
  )
}

function PlayerArea({ areaIdx, cards, onDropCard, onCardClick, tappedCards, attackingCards, blockingMap, onUntap, onZoom, health, onHealthChange, removeCardFromArea }: {
  areaIdx: number
  cards: MTGCard[]
  onDropCard: (card: MTGCard, from: number, to: number) => void
  onCardClick?: (areaIdx: number, cardIdx: number) => void
  tappedCards?: boolean[]
  attackingCards?: boolean[]
  blockingMap?: Record<string, { opponentArea: number, opponentIdx: number }>
  onUntap?: (areaIdx: number, cardIdx: number) => void
  onZoom?: (card: MTGCard) => void
  health: number
  onHealthChange: (newHealth: number) => void
  removeCardFromArea: (areaIdx: number, cardIdx: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [, drop] = useDrop(() => ({
    accept: CARD_TYPE,
    drop: (item: { card: MTGCard; fromArea: number; idx: number }) => {
      if (item.fromArea !== areaIdx) {
        onDropCard(item.card, item.fromArea, areaIdx)
      }
    },
  }), [cards])
  drop(ref)
  return (
    <div className="player-area" ref={ref}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.7em' }}>
        Player {areaIdx + 1}
        <input
          type="number"
          min={0}
          max={999}
          value={health}
          onChange={e => onHealthChange(Number(e.target.value))}
          style={{ width: '3.5em', fontSize: '1.1em', marginLeft: '0.2em', border: '1px solid #bbb', borderRadius: '6px', padding: '0.1em 0.3em', textAlign: 'center' }}
        />
      </h2>
      <div className="card-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.7em', minHeight: 120 }}>
        {cards.map((card, i) => (
          <div key={card.id + i} style={{ display: 'inline-block', position: 'relative', marginRight: '0.5em', marginBottom: '0.5em', verticalAlign: 'top' }}>
            <DraggableCard
              card={card}
              fromArea={areaIdx}
              idx={i}
              onCardClick={onCardClick}
              tapped={tappedCards ? tappedCards[i] : false}
              isAttacking={attackingCards ? attackingCards[i] : false}
              isBlocking={!!blockingMap && !!blockingMap[areaIdx + ':' + i]}
              blockedTarget={blockingMap && blockingMap[areaIdx + ':' + i]}
              onUntap={onUntap}
              onZoom={onZoom}
            />
            <button
              style={{ position: 'absolute', top: 2, right: 2, zIndex: 10, background: '#fff', border: '1px solid #d9534f', color: '#d9534f', borderRadius: '50%', width: 22, height: 22, fontSize: '1em', cursor: 'pointer', padding: 0, lineHeight: 1 }}
              title="Remove card"
              onClick={() => removeCardFromArea(areaIdx, i)}
            >×</button>
          </div>
        ))}
      </div>
    </div>
  )
}

interface SavedTable {
  id: string
  name: string
  data: {
    playerAreas: MTGCard[][]
    playerHealth: [number, number]
    tapped: [boolean[], boolean[]]
    attacking: [boolean[], boolean[]]
    blocking: Record<string, { opponentArea: number, opponentIdx: number }>
  }
}

function SavedTablesPanel({
  getCurrentState,
  restoreTable,
  savedTables,
  setSavedTables
}: {
  getCurrentState: () => SavedTable['data'] | null,
  restoreTable: (data: SavedTable['data']) => void,
  savedTables: SavedTable[],
  setSavedTables: React.Dispatch<React.SetStateAction<SavedTable[]>>
}) {
  const [saveName, setSaveName] = useState('')

  const saveCurrentTable = () => {
    if (!saveName.trim()) return
    const state = getCurrentState()
    if (!state) return
    const newTable: SavedTable = {
      id: Date.now().toString(),
      name: saveName.trim(),
      data: state
    }
    const updated = [...savedTables, newTable]
    setSavedTables(updated)
    localStorage.setItem('mtg-saved-tables', JSON.stringify(updated))
    setSaveName('')
  }
  const handleRestore = (table: SavedTable) => {
    restoreTable(table.data)
  }
  const handleDelete = (id: string) => {
    const updated = savedTables.filter(t => t.id !== id)
    setSavedTables(updated)
    localStorage.setItem('mtg-saved-tables', JSON.stringify(updated))
  }
  return (
    <>
      <div style={{ marginBottom: '1em', display: 'flex', gap: 6 }}>
        <input
          type="text"
          value={saveName}
          onChange={e => setSaveName(e.target.value)}
          placeholder="Table name..."
          style={{ width: '70%', fontSize: '1em', borderRadius: 6, border: '1px solid #bbb', padding: '0.3em 0.7em', marginBottom: 0, display: 'inline-block' }}
        />
        <button onClick={saveCurrentTable} style={{ width: '28%', background: '#0275d8', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5em 0', fontSize: '1em', cursor: 'pointer' }}>Save</button>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '30vh', overflowY: 'auto' }}>
        {savedTables.length === 0 && <li style={{ color: '#888', fontSize: '0.98em' }}>No saved tables.</li>}
        {savedTables.map(table => (
          <li key={table.id} style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => handleRestore(table)} style={{ flex: 1, background: '#fff', border: '1px solid #0275d8', color: '#0275d8', borderRadius: 6, padding: '0.3em 0.7em', fontSize: '1em', cursor: 'pointer', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{table.name}</button>
            <button onClick={() => handleDelete(table.id)} style={{ background: 'none', border: 'none', color: '#d9534f', fontSize: '1.2em', cursor: 'pointer', marginLeft: 2 }} title="Delete">&times;</button>
          </li>
        ))}
      </ul>
    </>
  )
}

// Editor for power/toughness in overlay
function PowerToughnessEditor({ cardId, card, cardStats, setCardStats }: {
  cardId: string,
  card: any,
  cardStats: Record<string, { power: number, toughness: number }>,
  setCardStats: React.Dispatch<React.SetStateAction<Record<string, { power: number, toughness: number }>>>
}) {
  // Always treat Scryfall power/toughness as string, convert to number if possible
  const scryfallPower = card.power !== undefined && card.power !== null && card.power !== '' && !isNaN(Number(card.power)) ? Number(card.power) : undefined
  const scryfallToughness = card.toughness !== undefined && card.toughness !== null && card.toughness !== '' && !isNaN(Number(card.toughness)) ? Number(card.toughness) : undefined
  const statsPower = cardStats[cardId]?.power
  const statsToughness = cardStats[cardId]?.toughness
  // Show if either stats or scryfall values are valid numbers
  const isCreature = (typeof statsPower === 'number' && typeof statsToughness === 'number' && !isNaN(statsPower) && !isNaN(statsToughness)) ||
    (typeof scryfallPower === 'number' && typeof scryfallToughness === 'number' && !isNaN(scryfallPower) && !isNaN(scryfallToughness))
  const [editPower, setEditPower] = useState<number>(statsPower ?? scryfallPower ?? 0)
  const [editToughness, setEditToughness] = useState<number>(statsToughness ?? scryfallToughness ?? 0)
  useEffect(() => {
    setEditPower(statsPower ?? scryfallPower ?? 0)
    setEditToughness(statsToughness ?? scryfallToughness ?? 0)
  }, [cardId, statsPower, statsToughness, scryfallPower, scryfallToughness])
  if (!isCreature) return null
  return (
    <div style={{ marginBottom: '1em', display: 'flex', alignItems: 'center', gap: '1em' }}>
      <label style={{ fontWeight: 500 }}>Power/Toughness:</label>
      <input
        type="number"
        value={editPower}
        onChange={e => {
          const val = Number(e.target.value)
          setEditPower(isNaN(val) ? 0 : val)
          if (!isNaN(val) && typeof editToughness === 'number') setCardStats(s => ({ ...s, [cardId]: { power: val, toughness: editToughness } }))
        }}
        onBlur={e => {
          const val = Number(e.target.value)
          if (!isNaN(val) && typeof editToughness === 'number') setCardStats(s => ({ ...s, [cardId]: { power: val, toughness: editToughness } }))
        }}
        style={{ width: '3em', fontSize: '1.1em', border: '1px solid #bbb', borderRadius: 6, padding: '0.1em 0.3em', textAlign: 'center' }}
      />
      <span style={{ fontWeight: 600, fontSize: '1.2em' }}>/</span>
      <input
        type="number"
        value={editToughness}
        onChange={e => {
          const val = Number(e.target.value)
          setEditToughness(isNaN(val) ? 0 : val)
          if (!isNaN(val) && typeof editPower === 'number') setCardStats(s => ({ ...s, [cardId]: { power: editPower, toughness: val } }))
        }}
        onBlur={e => {
          const val = Number(e.target.value)
          if (!isNaN(val) && typeof editPower === 'number') setCardStats(s => ({ ...s, [cardId]: { power: editPower, toughness: val } }))
        }}
        style={{ width: '3em', fontSize: '1.1em', border: '1px solid #bbb', borderRadius: 6, padding: '0.1em 0.3em', textAlign: 'center' }}
      />
    </div>
  )
}

// Helper function to generate a match summary for AI
const generateMatchSummary = (
  playerHealth: [number, number],
  playerAreas: MTGCard[][],
  attacking: [boolean[], boolean[]],
  tapped: [boolean[], boolean[]],
  blocking: Record<string, { opponentArea: number, opponentIdx: number }>,
  cardStats?: Record<string, { power: number, toughness: number }>
): string => {
  const healthSummary = `Player 1: ${playerHealth[0]} life, Player 2: ${playerHealth[1]} life.`
  const areaSummary = [0, 1].map(areaIdx => {
    const cards = playerAreas[areaIdx]
    if (!cards.length) return `Player ${areaIdx + 1} has no cards on the battlefield.`
    return `Player ${areaIdx + 1} controls: ` + cards.map((card, i) => {
      let state: string[] = []
      if (attacking[areaIdx]?.[i]) {
        state.push('attacking')
      } else if (tapped[areaIdx]?.[i] && card.oracle_text) {
        state.push('activated ability')
      } else if (tapped[areaIdx]?.[i] && !card.oracle_text) {
        state.push('tapped')
      }
      if (blocking[areaIdx + ':' + i]) {
        const blocked = blocking[areaIdx + ':' + i]
        const oppCard = playerAreas[blocked.opponentArea][blocked.opponentIdx]
        state.push(`blocking ${oppCard?.name}`)
      }
      // Show stats if available
      let stats = ''
      if (cardStats && cardStats[card.id] && typeof cardStats[card.id].power === 'number' && typeof cardStats[card.id].toughness === 'number') {
        stats = ` ${cardStats[card.id].power}/${cardStats[card.id].toughness}`
      } else if (
        card.power !== undefined && card.power !== null && card.power !== '' && !isNaN(Number(card.power)) &&
        card.toughness !== undefined && card.toughness !== null && card.toughness !== '' && !isNaN(Number(card.toughness))
      ) {
        stats = ` ${Number(card.power)}/${Number(card.toughness)}`
      }
      return `${card.name}${stats}${state.length ? ' [' + state.join(', ') + ']' : ''}`
    }).join(', ')
  }).join(' ')

  // Card summary: list all cards on battlefield with their abilities
  const allCards = playerAreas.flat();
  const cardSummary = allCards.length
    ? '\n\nCard Abilities in Play:\n' + allCards.map(card => {
        let abilities = card.oracle_text ? card.oracle_text.replace(/\n/g, ' ') : '(No abilities)';
        return `- ${card.name}: ${abilities}`;
      }).join('\n')
    : '';

  return `${healthSummary}\n${areaSummary}${cardSummary}`
}

function App() {
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<MTGCard[]>([])
  const [playerAreas, setPlayerAreas] = useState<MTGCard[][]>([[], []])
  const [playerHealth, setPlayerHealth] = useState<[number, number]>(() => {
    const saved = localStorage.getItem('mtg-health')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length === 2) return [parsed[0], parsed[1]]
      } catch { }
    }
    return [40, 40]
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(true)
  const [notification, setNotification] = useState('')
  const [tapped, setTapped] = useState<[boolean[], boolean[]]>([[], []])
  const [attacking, setAttacking] = useState<[boolean[], boolean[]]>([[], []])
  const [blocking, setBlocking] = useState<Record<string, { opponentArea: number, opponentIdx: number }>>({})
  const [overlay, setOverlay] = useState<{ areaIdx: number, cardIdx: number, card: MTGCard } | null>(null)
  const [zoomCard, setZoomCard] = useState<MTGCard | null>(null)
  const [savedTables, setSavedTables] = useState<SavedTable[]>(() => {
    const raw = localStorage.getItem('mtg-saved-tables')
    if (raw) {
      try { return JSON.parse(raw) } catch {}
    }
    return []
  })
  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false)
  const cacheRef = useRef<{ [key: string]: MTGCard[] }>({})
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [cardStats, setCardStats] = useState<Record<string, { power: number, toughness: number }>>({})

  // Remove a card from a player's area by index
  const removeCardFromArea = (areaIdx: number, cardIdx: number) => {
    setPlayerAreas(areas => {
      const newAreas = [...areas]
      newAreas[areaIdx] = newAreas[areaIdx].filter((_, i) => i !== cardIdx)
      return newAreas
    })
    setTapped(t => {
      const newT = [...t]
      newT[areaIdx] = (newT[areaIdx] || []).filter((_, i) => i !== cardIdx)
      return newT as [boolean[], boolean[]]
    })
    setAttacking(a => {
      const newA = [...a]
      newA[areaIdx] = (newA[areaIdx] || []).filter((_, i) => i !== cardIdx)
      return newA as [boolean[], boolean[]]
    })
    setBlocking(b => {
      const newB = { ...b }
      Object.keys(newB).forEach(key => {
        if (key === areaIdx + ':' + cardIdx) delete newB[key]
        if (newB[key]?.opponentArea === areaIdx && newB[key]?.opponentIdx === cardIdx) delete newB[key]
      })
      return newB
    })
    setCardStats(stats => {
      // Optionally remove stats for this card id
      // (if you want to keep stats for tokens, comment this out)
      // const newStats = { ...stats }
      // delete newStats[playerAreas[areaIdx][cardIdx]?.id]
      // return newStats
      return stats
    })
  }

  // Add card to player area
  const addCardToArea = (card: MTGCard, areaIdx: number) => {
    setPlayerAreas((areas) => {
      const newAreas = [...areas]
      newAreas[areaIdx] = [...newAreas[areaIdx], card]
      return newAreas
    })
    setTapped(t => {
      const newT = [...t]
      newT[areaIdx] = [...(newT[areaIdx] || []), false]
      return newT as [boolean[], boolean[]]
    })
    setAttacking(a => {
      const newA = [...a]
      newA[areaIdx] = [...(newA[areaIdx] || []), false]
      return newA as [boolean[], boolean[]]
    })
    setBlocking(b => {
      // Remove any blocking entries for this new card (shouldn't be any, but for safety)
      const newB = { ...b }
      Object.keys(newB).forEach(key => {
        if (key === areaIdx + ':' + ((playerAreas[areaIdx]?.length ?? 0))) delete newB[key]
      })
      return newB
    })
    let power = card.power !== undefined ? Number(card.power) : undefined
    let toughness = card.toughness !== undefined ? Number(card.toughness) : undefined
    if (typeof power === 'number' && typeof toughness === 'number' && !isNaN(power) && !isNaN(toughness)) {
      setCardStats(s => ({ ...s, [card.id]: { power, toughness } }))
    }
  }

  // Load table from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('mtg-table')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length === 2) {
          setPlayerAreas(parsed)
        }
      } catch { }
    }
    const savedHealth = localStorage.getItem('mtg-health')
    if (savedHealth) {
      try {
        const parsed = JSON.parse(savedHealth)
        if (Array.isArray(parsed) && parsed.length === 2) setPlayerHealth([parsed[0], parsed[1]])
      } catch { }
    }
    // Restore tapped, attacking, and blocking states
    const savedTapped = localStorage.getItem('mtg-tapped')
    if (savedTapped) {
      try {
        const parsed = JSON.parse(savedTapped)
        if (
          Array.isArray(parsed) &&
          parsed.length === 2 &&
          Array.isArray(parsed[0]) &&
          Array.isArray(parsed[1])
        ) {
          setTapped([parsed[0].map(Boolean), parsed[1].map(Boolean)])
        }
      } catch { }
    }
    const savedAttacking = localStorage.getItem('mtg-attacking')
    if (savedAttacking) {
      try {
        const parsed = JSON.parse(savedAttacking)
        if (
          Array.isArray(parsed) &&
          parsed.length === 2 &&
          Array.isArray(parsed[0]) &&
          Array.isArray(parsed[1])
        ) {
          setAttacking([parsed[0].map(Boolean), parsed[1].map(Boolean)])
        }
      } catch { }
    }
    const savedBlocking = localStorage.getItem('mtg-blocking')
    if (savedBlocking) {
      try {
        const parsed = JSON.parse(savedBlocking)
        if (parsed && typeof parsed === 'object') {
          setBlocking(parsed)
        }
      } catch { }
    }
  }, [])

  // Save health to localStorage when changed
  useEffect(() => {
    localStorage.setItem('mtg-health', JSON.stringify(playerHealth))
  }, [playerHealth])

  // Save table to localStorage when button is clicked
  const saveTable = () => {
    // Get current state
    const currentState = {
      playerAreas,
      playerHealth,
      tapped,
      attacking,
      blocking
    }
    // Serialize state for comparison
    const stateString = JSON.stringify(currentState)
    // Check if an identical table already exists
    const alreadySaved = savedTables.some(t => JSON.stringify(t.data) === stateString)
    if (alreadySaved) {
      setNotification('Table already saved!')
      setTimeout(() => setNotification(''), 1500)
      return
    }
    // Generate a random name
    const name = randomTableName()
    const newTable: SavedTable = {
      id: Date.now().toString(),
      name,
      data: currentState
    }
    const updated = [...savedTables, newTable]
    setSavedTables(updated)
    localStorage.setItem('mtg-saved-tables', JSON.stringify(updated))
    setNotification(`Saved as "${name}"`)
    setTimeout(() => setNotification(''), 1500)
  }

  // Live search Scryfall API as user types, with caching
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([])
      return
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    setIsLoading(true)
    searchTimeout.current = setTimeout(async () => {
      if (!isAdvancedSearch) {
        // Default: autocomplete + named fetch
        const res = await fetch(
          `https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(search)}`
        )
        const data = await res.json()
        const names: string[] = data.data?.slice(0, 6) || []
        const cards: MTGCard[] = []
        for (const name of names) {
          if (cacheRef.current[name]) {
            cards.push(...cacheRef.current[name])
            continue
          }
          const cardRes = await fetch(
            `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`
          )
          const cardData = await cardRes.json()
          const cardObj = {
            id: cardData.id,
            name: cardData.name,
            imageUrl: cardData.image_uris?.normal || cardData.card_faces?.[0]?.image_uris?.normal || '',
            oracle_text: cardData.oracle_text || cardData.card_faces?.[0]?.oracle_text || '',
            power: cardData.power ?? cardData.card_faces?.[0]?.power,
            toughness: cardData.toughness ?? cardData.card_faces?.[0]?.toughness
          }
          cacheRef.current[name] = [cardObj]
          cards.push(cardObj)
        }
        cacheRef.current[search] = cards
        setSearchResults(cards)
        setIsLoading(false)
      } else {
        // Advanced search: use /search endpoint, always include_multilingual
        let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(search)}&include_multilingual=true`
        const res = await fetch(url)
        const data = await res.json()
        const cards: MTGCard[] = (data.data || []).map((cardData: any) => ({
          id: cardData.id,
          name: cardData.name,
          imageUrl: cardData.image_uris?.normal || cardData.card_faces?.[0]?.image_uris?.normal || '',
          oracle_text: cardData.oracle_text || cardData.card_faces?.[0]?.oracle_text || '',
          power: cardData.power ?? cardData.card_faces?.[0]?.power,
          toughness: cardData.toughness ?? cardData.card_faces?.[0]?.toughness
        }))
        setSearchResults(cards)
        setIsLoading(false)
      }
    }, 350)
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [search, isAdvancedSearch])

  // Move card between areas
  const moveCard = (card: MTGCard, from: number, to: number) => {
    setPlayerAreas((areas) => {
      const newAreas = [...areas]
      // Remove from old area (first match)
      const idx = newAreas[from].findIndex((c) => c.id === card.id)
      if (idx !== -1) newAreas[from].splice(idx, 1)
      // Add to new area
      newAreas[to] = [...newAreas[to], card]
      return newAreas
    })
    setTapped(t => {
      const newT = [...t]
      if (from !== to) {
        // Remove from old area
        newT[from] = [...(newT[from] || [])]
        newT[from].splice(newT[from].findIndex((_, i) => i === 0), 1)
        // Add to new area
        newT[to] = [...(newT[to] || []), false]
      }
      return newT as [boolean[], boolean[]]
    })
    setAttacking(a => {
      const newA = [...a]
      if (from !== to) {
        newA[from] = [...(newA[from] || [])]
        newA[from].splice(newA[from].findIndex((_, i) => i === 0), 1)
        newA[to] = [...(newA[to] || []), false]
      }
      return newA as [boolean[], boolean[]]
    })
  }

  // Clear table
  const clearTable = () => {
    setPlayerAreas([[], []])
    setTapped([[], []])
    setAttacking([[], []])
    setBlocking({})
    setPlayerHealth([40, 40])
    localStorage.removeItem('mtg-table')
    localStorage.removeItem('mtg-health')
  }

  // Card click handler
  const handleCardClick = (areaIdx: number, cardIdx: number) => {
    const card = playerAreas[areaIdx][cardIdx]
    setOverlay({ areaIdx, cardIdx, card })
  }

  // Untap handler
  const handleUntap = (areaIdx: number, cardIdx: number) => {
    setTapped(t => {
      const newT = [...t]
      newT[areaIdx] = [...(newT[areaIdx] || [])]
      newT[areaIdx][cardIdx] = false
      return newT as [boolean[], boolean[]]
    })
    setAttacking(a => {
      const newA = [...a]
      newA[areaIdx] = [...(newA[areaIdx] || [])]
      newA[areaIdx][cardIdx] = false
      return newA as [boolean[], boolean[]]
    })
    // Use a functional update to get the latest attacking state after setAttacking
    setBlocking(prevB => {
      let newB = { ...prevB }
      Object.entries(newB).forEach(([blockerKey, blocked]) => {
        const { opponentArea, opponentIdx } = blocked
        // If the card that was just untapped is the one being blocked, or if its attacking state is now false, remove the block
        if ((opponentArea === areaIdx && opponentIdx === cardIdx) || !attacking[opponentArea]?.[opponentIdx]) {
          delete newB[blockerKey]
        }
      })
      // Also remove block for this card if it is a blocker
      delete newB[areaIdx + ':' + cardIdx]
      return newB
    })
  }

  // Only allow attack if the other player has no attacking cards
  const canAttack = (areaIdx: number) => !attacking[1 - areaIdx]?.some(Boolean)

  // Overlay action handler
  const handleOverlayAction = (action: 'attack' | 'activate') => {
    if (!overlay) return
    const { areaIdx, cardIdx, card } = overlay
    if ((action === 'attack' && canAttack(areaIdx)) || action === 'activate' || !card.oracle_text) {
      if (action === 'attack' || !card.oracle_text) {
        setTapped(t => {
          const newT = [...t]
          newT[areaIdx] = [...(newT[areaIdx] || [])]
          newT[areaIdx][cardIdx] = true
          return newT as [boolean[], boolean[]]
        })
        setAttacking(a => {
          const newA = [...a]
          newA[areaIdx] = [...(newA[areaIdx] || [])]
          newA[areaIdx][cardIdx] = true
          return newA as [boolean[], boolean[]]
        })
      } else if (action === 'activate') {
        setTapped(t => {
          const newT = [...t]
          newT[areaIdx] = [...(newT[areaIdx] || [])]
          newT[areaIdx][cardIdx] = true
          return newT as [boolean[], boolean[]]
        })
        setAttacking(a => {
          const newA = [...a]
          newA[areaIdx] = [...(newA[areaIdx] || [])]
          newA[areaIdx][cardIdx] = false
          return newA as [boolean[], boolean[]]
        })
      }
      setOverlay(null)
    }
  }

  // BlockSelect component
  function BlockSelect() {
    // Find opponent's attacking cards
    const opponentArea = 1 - overlay!.areaIdx
    const opponentAttacking = playerAreas[opponentArea].map((c, i) => attacking[opponentArea]?.[i] ? { card: c, idx: i } : null).filter((x): x is { card: MTGCard, idx: number } => !!x)
    const [selected, setSelected] = useState(opponentAttacking[0]?.idx ?? null)
    return (
      <div style={{ marginBottom: '1em' }}>
        <label style={{ marginRight: '0.5em' }}>Block:</label>
        <select value={selected ?? ''} onChange={e => setSelected(Number(e.target.value))} style={{ fontSize: '1em', padding: '0.2em 0.7em', borderRadius: '6px', marginRight: '1em' }}>
          {opponentAttacking.map(({ card, idx }) => (
            <option key={card.id} value={idx}>{card.name}</option>
          ))}
        </select>
        <button style={{ background: '#0275d8', color: '#fff', padding: '0.5em 1.2em', border: 'none', borderRadius: '6px', fontSize: '1em', cursor: 'pointer' }} disabled={selected == null} onClick={() => {
          if (selected != null) {
            setBlocking(prev => ({ ...prev, [overlay!.areaIdx + ':' + overlay!.cardIdx]: { opponentArea, opponentIdx: selected } }))
            setOverlay(null)
          }
        }}>Confirm Block</button>
      </div>
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="mtg-app" style={{ maxWidth: '1800px', margin: '0 auto', padding: '0 2vw' }}>
        {notification && (
          <div style={{
            position: 'fixed',
            top: '2em',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#5cb85c',
            color: '#fff',
            padding: '0.8em 2em',
            borderRadius: '8px',
            fontSize: '1.1em',
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            transition: 'opacity 0.3s',
            opacity: notification ? 1 : 0
          }}>
            {notification}
          </div>
        )}
        {zoomCard && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setZoomCard(null)}>
            <img src={zoomCard.imageUrl} alt={zoomCard.name} style={{ maxHeight: '80vh', maxWidth: '90vw', borderRadius: '12px', boxShadow: '0 4px 32px #000a' }} onClick={e => e.stopPropagation()} />
          </div>
        )}
        {overlay && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.25)',
            zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }} onClick={() => setOverlay(null)}>
            <div style={{ background: '#fff', padding: '2em', borderRadius: '12px', boxShadow: '0 2px 16px rgba(0,0,0,0.2)', minWidth: '320px', position: 'relative', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
              <h3>{overlay.card.name}</h3>
              {overlay.card.imageUrl && (
                <img src={overlay.card.imageUrl} alt={overlay.card.name} style={{ display: 'block', margin: '0 auto 1em auto', maxHeight: '420px', maxWidth: '300px', borderRadius: '10px', boxShadow: '0 4px 18px #0003' }} />
              )}
              {/* Editable Power/Toughness Section */}
              <PowerToughnessEditor cardId={overlay.card.id} card={overlay.card} cardStats={cardStats} setCardStats={setCardStats} />
              {overlay.card.oracle_text ? (
                <>
                  <div style={{ marginBottom: '1em', color: '#444' }}>{overlay.card.oracle_text}</div>
                  {canAttack(overlay.areaIdx) ? (
                    <>
                      <button style={{ marginRight: '1em', background: '#0275d8', color: '#fff', padding: '0.5em 1.2em', border: 'none', borderRadius: '6px', fontSize: '1em', cursor: 'pointer' }} onClick={() => handleOverlayAction('attack')}>Attack</button>
                      <button style={{ background: '#5cb85c', color: '#fff', padding: '0.5em 1.2em', border: 'none', borderRadius: '6px', fontSize: '1em', cursor: 'pointer' }} onClick={() => handleOverlayAction('activate')}>Activate Ability</button>
                    </>
                  ) : (
                    <BlockSelect />
                  )}
                </>
              ) : (
                canAttack(overlay.areaIdx) ? (
                  <button style={{ background: '#d9534f', color: '#fff', padding: '0.5em 1.2em', border: 'none', borderRadius: '6px', fontSize: '1em', cursor: 'pointer' }} onClick={() => handleOverlayAction('attack')}>Attack</button>
                ) : (
                  <BlockSelect />
                )
              )}
              <button style={{ position: 'absolute', top: '0.5em', right: '0.5em', background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer', color: '#888' }} onClick={() => setOverlay(null)}>&times;</button>
            </div>
          </div>
        )}
        <h1>MTG Virtual Table</h1>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1em', marginBottom: '1em' }}>
          <button onClick={clearTable} style={{ background: '#d9534f', color: '#fff', padding: '0.5em 1.2em', border: 'none', borderRadius: '6px', fontSize: '1.1em', cursor: 'pointer' }}>Clear Table</button>
          <button onClick={saveTable} style={{ background: '#0275d8', color: '#fff', padding: '0.5em 1.2em', border: 'none', borderRadius: '6px', fontSize: '1.1em', cursor: 'pointer' }}>Save Table</button>
        </div>
        <form className="search-bar" onSubmit={e => e.preventDefault()}>
          <input
            type="text"
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setShowResults(true)
            }}
            placeholder="Search for Magic cards..."
            autoComplete="off"
          />
          <button
            type="button"
            style={{ marginLeft: '0.7em', background: isAdvancedSearch ? '#0275d8' : '#eee', color: isAdvancedSearch ? '#fff' : '#333', border: 'none', borderRadius: 6, padding: '0.4em 1em', fontSize: '1em', cursor: 'pointer' }}
            onClick={() => setIsAdvancedSearch(a => !a)}
            title="Toggle advanced search mode"
          >{isAdvancedSearch ? 'Advanced Search ON' : 'Advanced Search'}</button>
          {isLoading && <span style={{ color: '#aaa', marginLeft: '1em' }}>Loading...</span>}
          {showResults && searchResults.length > 0 && (
            <button type="button" onClick={() => setShowResults(false)} style={{ marginLeft: '1em', background: '#d9534f' }}>Close Search</button>
          )}
        </form>
        {showResults && (
          <div className="search-results">
            {searchResults.map(card => (
              <div key={card.id} className="card-result">
                {card.imageUrl && <img src={card.imageUrl} alt={card.name} />}
                <div>{card.name}</div>
                <button onClick={() => { addCardToArea(card, 0); setShowResults(false); }}>Add to Player 1</button>
                <button onClick={() => { addCardToArea(card, 1); setShowResults(false); }}>Add to Player 2</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: '1.5em', flexWrap: 'wrap' }}>
          {/* Left panel: Saved Tables only */}
          <div style={{ minWidth: 220, maxWidth: 260, background: '#f4f6fa', borderRadius: 10, boxShadow: '0 2px 8px #0001', padding: '1.2em 1em', marginRight: '1em', alignSelf: 'flex-start' }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.7em', fontWeight: 600, fontSize: '1.1em', color: '#333' }}>Saved Tables</h3>
            <SavedTablesPanel
              getCurrentState={() => ({
                playerAreas,
                playerHealth,
                tapped,
                attacking,
                blocking
              })}
              restoreTable={(data) => {
                setPlayerAreas(data.playerAreas)
                setPlayerHealth(data.playerHealth)
                setTapped(data.tapped)
                setAttacking(data.attacking)
                setBlocking(data.blocking)
              }}
              savedTables={savedTables}
              setSavedTables={setSavedTables}
            />
          </div>
          {/* Main play area and right panel */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '300px', maxWidth: '1100px', flex: 1 }}>
            <div className="virtual-table" style={{ minWidth: '300px', maxWidth: '1100px', margin: '0 auto' }}>
              <PlayerArea areaIdx={0} cards={playerAreas[0]} onDropCard={moveCard} onCardClick={handleCardClick} tappedCards={tapped[0]} attackingCards={attacking[0]} blockingMap={blocking} onUntap={handleUntap} onZoom={setZoomCard} health={playerHealth[0]} onHealthChange={h => setPlayerHealth([h, playerHealth[1]])} removeCardFromArea={removeCardFromArea} />
              <PlayerArea areaIdx={1} cards={playerAreas[1]} onDropCard={moveCard} onCardClick={handleCardClick} tappedCards={tapped[1]} attackingCards={attacking[1]} blockingMap={blocking} onUntap={handleUntap} onZoom={setZoomCard} health={playerHealth[1]} onHealthChange={h => setPlayerHealth([playerHealth[0], h])} removeCardFromArea={removeCardFromArea} />
            </div>
            {/* Card States and Summary on the right */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5em', marginTop: '1.5em' }}>
              <div style={{ background: '#f8f9fa', borderRadius: '10px', boxShadow: '0 2px 8px #0001', padding: '1.2em', marginTop: '0' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.7em', fontWeight: 600, fontSize: '1.15em', color: '#333' }}>Card States</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {[0, 1].flatMap(areaIdx =>
                    playerAreas[areaIdx].map((card, i) => {
                      // Show stats if available
                      let stats = ''
                      if (cardStats && cardStats[card.id] && typeof cardStats[card.id].power === 'number' && typeof cardStats[card.id].toughness === 'number') {
                        stats = ` ${cardStats[card.id].power}/${cardStats[card.id].toughness}`
                      } else if (
                        card.power !== undefined && card.power !== null && card.power !== '' && !isNaN(Number(card.power)) &&
                        card.toughness !== undefined && card.toughness !== null && card.toughness !== '' && !isNaN(Number(card.toughness))
                      ) {
                        stats = ` ${Number(card.power)}/${Number(card.toughness)}`
                      }
                      if (blocking[areaIdx + ':' + i]) {
                        const blocked = blocking[areaIdx + ':' + i]
                        const oppCard = playerAreas[blocked.opponentArea][blocked.opponentIdx]
                        return <li key={card.id + ':block'} style={{ marginBottom: '0.5em' }}>
                          <span style={{ fontWeight: 500 }}>Player {areaIdx + 1}:</span> <span style={{ color: '#0275d8' }}>{card.name}{stats}</span> <span style={{ color: '#0275d8', fontWeight: 500 }}>[Blocking {oppCard?.name}]</span>
                        </li>
                      }
                      if (attacking[areaIdx]?.[i]) {
                        return <li key={card.id + ':atk'} style={{ marginBottom: '0.5em' }}>
                          <span style={{ fontWeight: 500 }}>Player {areaIdx + 1}:</span> <span style={{ color: '#d9534f' }}>{card.name}{stats}</span> <span style={{ color: '#d9534f', fontWeight: 500 }}>[Attacking]</span>
                        </li>
                      }
                      if (tapped[areaIdx]?.[i] && card.oracle_text) {
                        return <li key={card.id + ':act'} style={{ marginBottom: '0.5em' }}>
                          <span style={{ fontWeight: 500 }}>Player {areaIdx + 1}:</span> <span style={{ color: '#0275d8' }}>{card.name}{stats}</span> <span style={{ color: '#0275d8', fontWeight: 500 }}>[Activated Ability]</span>
                        </li>
                      }
                      if (tapped[areaIdx]?.[i] && !card.oracle_text) {
                        return <li key={card.id + ':tap'} style={{ marginBottom: '0.5em' }}>
                          <span style={{ fontWeight: 500 }}>Player {areaIdx + 1}:</span> <span style={{ color: '#888' }}>{card.name}{stats}</span> <span style={{ color: '#888', fontWeight: 500 }}>[Tapped]</span>
                        </li>
                      }
                      return null
                    })
                  )}
                  {[0, 1].every(areaIdx => playerAreas[areaIdx].every((_, i) => !blocking[areaIdx + ':' + i] && !attacking[areaIdx]?.[i] && !(tapped[areaIdx]?.[i] && playerAreas[areaIdx][i].oracle_text))) && (
                    <li style={{ color: '#888' }}>No cards are currently attacking or have activated abilities.</li>
                  )}
                </ul>
              </div>
              {/* Match Summary Section for AI Rule Resolution */}
              <div className="summary-section">
                <label htmlFor="match-summary">Match Summary (for AI rule questions):</label>
                <div style={{ width: '100%', maxWidth: 900, position: 'relative' }}>
                  <textarea
                    id="match-summary"
                    className="summary-textarea"
                    value={generateMatchSummary(playerHealth, playerAreas, attacking, tapped, blocking, cardStats)}
                    readOnly
                    placeholder="Summarize the current match state, actions, or rule question here to feed to an AI."
                    style={{ paddingRight: '3em' }}
                  />
                  <button
                    type="button"
                    style={{
                      position: 'absolute',
                      top: 14,
                      right: 14,
                      background: 'rgba(100,108,255,0.92)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      minWidth: 0,
                      minHeight: 0,
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25em',
                      boxShadow: '0 2px 8px #0002',
                      cursor: 'pointer',
                      zIndex: 2,
                      transition: 'background 0.18s',
                    }}
                    onClick={() => {
                      const textarea = document.getElementById('match-summary') as HTMLTextAreaElement
                      if (textarea) {
                        textarea.select()
                        document.execCommand('copy')
                      }
                    }}
                    title="Copy summary to clipboard"
                    aria-label="Copy summary to clipboard"
                  >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="6" y="6" width="9" height="9" rx="2" fill="white" fillOpacity="0.7"/>
                      <rect x="3" y="3" width="9" height="9" rx="2" stroke="white" strokeWidth="1.5" fill="none"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* AI Assistant Links Section */}
      <footer style={{
        width: '100%',
        background: '#23272f',
        borderTop: '1px solid #222',
        marginTop: '2.5em',
        padding: '1.2em 0 1.2em 0',
        textAlign: 'center',
        fontSize: '1.08em',
        color: '#eee',
        letterSpacing: '0.01em',
        zIndex: 10
      }}>
        <span style={{ fontWeight: 500, marginRight: 8 }}>AI Assistants:</span>
        <a href="https://chat.openai.com/" target="_blank" rel="noopener noreferrer" style={{ margin: '0 0.7em', color: '#7ecbff', textDecoration: 'none', fontWeight: 600 }}>ChatGPT</a>
        <a href="https://copilot.microsoft.com/" target="_blank" rel="noopener noreferrer" style={{ margin: '0 0.7em', color: '#5ec3ff', textDecoration: 'none', fontWeight: 600 }}>MS Copilot</a>
        <a href="https://github.com/features/copilot" target="_blank" rel="noopener noreferrer" style={{ margin: '0 0.7em', color: '#e6e6e6', textDecoration: 'none', fontWeight: 600 }}>GitHub Copilot</a>
        <a href="https://grok.x.ai/" target="_blank" rel="noopener noreferrer" style={{ margin: '0 0.7em', color: '#ff8b8b', textDecoration: 'none', fontWeight: 600 }}>Grok</a>
        <a href="https://gemini.google.com/" target="_blank" rel="noopener noreferrer" style={{ margin: '0 0.7em', color: '#a6c8ff', textDecoration: 'none', fontWeight: 600 }}>Google Gemini</a>
        <a href="https://claude.ai/" target="_blank" rel="noopener noreferrer" style={{ margin: '0 0.7em', color: '#e0c6ff', textDecoration: 'none', fontWeight: 600 }}>Claude</a>
        <a href="https://www.perplexity.ai/" target="_blank" rel="noopener noreferrer" style={{ margin: '0 0.7em', color: '#fff', textDecoration: 'none', fontWeight: 600 }}>Perplexity</a>
      </footer>
    </DndProvider>
  )
}

export default App
