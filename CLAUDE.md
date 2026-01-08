# Claude Build Instructions for BubbleNansen

This document provides context for Claude to continue developing the BubbleNansen token holder visualization app.

## Project Overview

BubbleNansen visualizes token holder distributions and their counterparty connections using D3.js force-directed graphs. The MVP is complete and functional. See `SPEC.md` for full specification and `TASKS.md` for progress tracking.

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS (dark theme)
- **Visualization**: D3.js (d3-force, d3-selection, d3-zoom)
- **HTTP**: Axios + React Query (@tanstack/react-query)

## Environment Variables

Create a `.env` file with:

```
VITE_NANSEN_API_KEY=<your nansen api key>
```

## Current File Structure

```
src/
├── components/
│   └── BubbleMap.tsx       # D3 force-directed graph visualization
├── services/
│   └── nansen.ts           # Nansen API client with proxy setup
├── types/
│   └── index.ts            # TypeScript type definitions
├── App.tsx                 # Main application (all state management)
├── main.tsx                # Entry point
└── index.css               # Tailwind CSS styles
```

## Key Implementation Details

### Nansen API Service (`src/services/nansen.ts`)

Uses Vite proxy to avoid CORS issues:

```typescript
const API_BASE_URL = '/api/nansen';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'apiKey': import.meta.env.VITE_NANSEN_API_KEY,
  },
});
```

**Endpoints implemented:**
- `getTopHolders(chain, tokenAddress, options)` - Fetches top holders
- `getCounterparties(chain, address, options)` - Fetches address counterparties
- `isValidAddress(address, chain)` - Validates address format

### Vite Proxy Configuration (`vite.config.ts`)

```typescript
server: {
  proxy: {
    '/api/nansen': {
      target: 'https://api.nansen.ai',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/nansen/, ''),
    },
  },
},
```

### D3 BubbleMap Component (`src/components/BubbleMap.tsx`)

Key patterns used to prevent unnecessary re-renders:

```typescript
// Store callbacks in refs so they don't trigger re-renders
const onNodeClickRef = useRef(onNodeClick);
const onNodeHoverRef = useRef(onNodeHover);
const selectedNodeRef = useRef(selectedNode);

// Update refs when props change
onNodeClickRef.current = onNodeClick;
onNodeHoverRef.current = onNodeHover;
selectedNodeRef.current = selectedNode;

// Separate useEffect for selection styling (doesn't rebuild graph)
useEffect(() => {
  // Update stroke styling only
}, [selectedNode]);

// Main useEffect only rebuilds when nodes/edges change
useEffect(() => {
  // Full D3 graph rebuild
}, [nodes, edges]);
```

### App Component State (`src/App.tsx`)

Main state:
- `holders` - Top 20 token holders
- `counterpartyNodes` - Counterparties fetched on node click
- `edges` - Connections between holders and counterparties
- `expandedNodes` - Set of addresses that have been expanded
- `selectedNode` - Currently selected node
- `maxCounterparties` - Setting for max counterparties per holder
- `timeWindowDays` - Setting for counterparty time window

The `allNodes` array combines holders and counterparties using `useMemo` for stable references.

## Styling Guidelines

- Background: `bg-background` (#0a0a0f)
- Cards/panels: `bg-surface` (#13131a)
- Borders: `border-border` (#1e1e2e)
- Primary accent: `text-primary` (#6366f1)
- Cyan accent: `text-accent` (#22d3ee)
- Nansen green: `#00FFA7` (Explore button)

## Node Color Scheme

```typescript
function getNodeColor(node: GraphNode): string {
  if (node.isCounterparty) {
    // Darker variants for counterparties
  }
  switch (node.label?.type) {
    case 'exchange': return '#f59e0b'; // amber
    case 'defi': return '#3b82f6';     // blue
    case 'fund': return '#8b5cf6';     // violet
    case 'whale': return '#6366f1';    // indigo
    case 'contract': return '#06b6d4'; // cyan
    default: return '#4b5563';         // gray
  }
}
```

## Common Tasks

### Adding a new API endpoint

1. Add types to `src/types/index.ts`
2. Add function to `src/services/nansen.ts`
3. Use in `App.tsx` or create a custom hook

### Modifying the visualization

1. Edit `src/components/BubbleMap.tsx`
2. Force simulation parameters in the main useEffect
3. Node styling in the node.append() chain

### Adding UI elements

1. All UI is in `App.tsx`
2. Header section for inputs
3. Main area for BubbleMap
4. Sidebar for settings and holder list

## Known Patterns & Fixes

### Preventing graph re-render on hover
Use refs for callbacks passed to BubbleMap, not direct function references.

### Stable array references
Use `useMemo` for arrays passed to BubbleMap to prevent re-renders.

### API ordering
Use `token_amount` field for ordering holders, not `ownership_percentage`.

## Commands Reference

```bash
# Development
npm run dev

# Build
npm run build

# Preview production build
npm run preview

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

## Future Work

See `TASKS.md` for remaining phases:
- Phase 6: Clustering (group related wallets)
- Phase 7: Transaction Flow (history panel, animations)
- Phase 8: Polish (skeletons, keyboard shortcuts, mobile)
