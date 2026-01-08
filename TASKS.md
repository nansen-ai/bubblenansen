# Development Tasks

Track your progress through the BubbleNansen build.

## Phase 1: Foundation
- [x] Initialize Vite + React + TypeScript project
- [x] Install dependencies (D3, Axios, React Query, Tailwind)
- [x] Configure Tailwind with dark theme colors
- [x] Create base types in `src/types/index.ts`
- [x] Set up chain configuration
- [x] Create basic Layout component with dark theme

## Phase 2: API Integration
- [x] Review Nansen API documentation
- [x] Create Nansen API service (`src/services/nansen.ts`)
- [x] Implement `getTopHolders` endpoint
- [x] Implement `getCounterparties` endpoint
- [x] Set up Vite proxy to handle CORS
- [x] Add error handling for API calls

## Phase 3: Core UI
- [x] Build Header component with Nansen logo
- [x] Build ChainSelector dropdown
- [x] Build ContractInput with validation
- [x] Build Sidebar with settings panel
- [x] Build HolderList component
- [x] Add loading states
- [x] Add URL parameter support for token address

## Phase 4: Bubble Map
- [x] Create BubbleMap container component
- [x] Set up D3 SVG canvas
- [x] Implement zoom and pan
- [x] Create force simulation
- [x] Render nodes (bubbles) with size scaling
- [x] Add node coloring based on label type
- [x] Implement drag behavior
- [x] Add hover tooltips
- [x] Implement node selection
- [x] Add wallet name labels to nodes

## Phase 5: Connections & Counterparties
- [x] Fetch counterparty data on node click
- [x] Create edges from holder to counterparties
- [x] Render edges/links between nodes
- [x] Style edges (dashed cyan lines)
- [x] Add "Expand All" button with progress bar
- [x] Configurable settings (max counterparties, time window)

## Phase 6: Clustering
- [ ] Implement clustering algorithm (or use Nansen labels)
- [ ] Group related wallets visually
- [ ] Add cluster backgrounds (convex hulls)
- [ ] Create cluster labels
- [ ] Add expand/collapse for clusters

## Phase 7: Transaction Flow
- [ ] Create TransactionPanel component
- [ ] Show transaction history for selected wallet
- [ ] Add time filtering (24h, 7d, 30d)
- [ ] Visualize transaction flow on the graph
- [ ] Add animated flow indicators

## Phase 8: Polish
- [x] Loading states for counterparty fetching
- [x] Error handling display
- [ ] Add loading skeletons
- [ ] Add keyboard shortcuts
- [ ] Performance optimization for large graphs
- [ ] Mobile responsive design
- [ ] Final visual polish

## Completed Features Summary

### Core Functionality
- Multi-chain EVM support (Ethereum, Polygon, Arbitrum, Optimism, Base, BNB, Avalanche, Solana)
- Token holder visualization using D3.js force-directed graph
- Top 20 holders displayed as sized bubbles
- Counterparty connections revealed on node click
- Expand All functionality to fetch all counterparties at once

### UI/UX
- Dark theme with crypto aesthetic
- Nansen branding (logo + green accent color #00FFA7)
- Sidebar with holder list and settings panel
- Hover tooltips showing holder/counterparty details
- Progress bar for Expand All operation
- URL parameter support (?token=&chain=)

### Settings
- Max counterparties per holder (5-30)
- Time window for counterparty data (7 days - 1 year)

## Bugs Fixed
- [x] CORS issue - fixed with Vite proxy
- [x] Graph reloading on hover - fixed with useRef and useMemo
- [x] Explore button not working after token change - fixed onClick handler
- [x] Wrong top holders order - changed to sort by token_amount

## Notes
- API calls go through Vite proxy at `/api/nansen` to avoid CORS
- Nansen API key stored in `.env` as `VITE_NANSEN_API_KEY`
- Counterparties are visually distinguished with dashed cyan borders
- Node sizes based on sqrt scale for proper area representation
