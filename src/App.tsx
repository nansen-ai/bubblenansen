import { useState, useCallback, useEffect, useMemo } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BubbleMap } from './components/BubbleMap'
import { GraphNode, GraphEdge } from './types'
import {
  getTopHolders,
  getCounterparties,
  NansenHolder,
  NansenCounterparty,
  SupportedChain,
  isValidAddress
} from './services/nansen'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatBalance(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)}B`
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(2)}K`
  return amount.toFixed(2)
}

function formatUSD(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(2)}B`
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(2)}K`
  return `$${amount.toFixed(2)}`
}

// Transform Nansen holder to our GraphNode format
function holderToGraphNode(holder: NansenHolder): GraphNode {
  return {
    id: holder.address,
    address: holder.address,
    balance: String(holder.token_amount),
    percentage: holder.ownership_percentage,
    valueUsd: holder.value_usd,
    label: holder.address_label ? {
      name: holder.address_label,
      type: inferLabelType(holder.address_label),
      tags: [],
    } : undefined,
    balanceChange24h: holder.balance_change_24h,
    balanceChange7d: holder.balance_change_7d,
    balanceChange30d: holder.balance_change_30d,
    isCounterparty: false,
  }
}

// Transform counterparty to GraphNode
function counterpartyToGraphNode(cp: NansenCounterparty): GraphNode {
  const label = cp.counterparty_address_label?.[0] || null
  return {
    id: cp.counterparty_address,
    address: cp.counterparty_address,
    balance: '0',
    percentage: 0,
    valueUsd: cp.total_volume_usd,
    label: label ? {
      name: label,
      type: inferLabelType(label),
      tags: [],
    } : undefined,
    isCounterparty: true,
    interactionCount: cp.interaction_count,
    volumeIn: cp.volume_in_usd,
    volumeOut: cp.volume_out_usd,
  }
}

// Infer label type from Nansen label string
function inferLabelType(label: string): 'exchange' | 'defi' | 'fund' | 'whale' | 'contract' | 'unknown' {
  const lowerLabel = label.toLowerCase()
  if (lowerLabel.includes('binance') || lowerLabel.includes('coinbase') || lowerLabel.includes('kraken') ||
      lowerLabel.includes('okx') || lowerLabel.includes('bybit') || lowerLabel.includes('exchange') ||
      lowerLabel.includes('kucoin') || lowerLabel.includes('huobi') || lowerLabel.includes('gate.io')) {
    return 'exchange'
  }
  if (lowerLabel.includes('aave') || lowerLabel.includes('uniswap') || lowerLabel.includes('compound') ||
      lowerLabel.includes('curve') || lowerLabel.includes('defi') || lowerLabel.includes('protocol') ||
      lowerLabel.includes('lido') || lowerLabel.includes('maker') || lowerLabel.includes('sushi')) {
    return 'defi'
  }
  if (lowerLabel.includes('fund') || lowerLabel.includes('capital') || lowerLabel.includes('ventures') ||
      lowerLabel.includes('trading') || lowerLabel.includes('jump') || lowerLabel.includes('alameda') ||
      lowerLabel.includes('wintermute') || lowerLabel.includes('genesis')) {
    return 'fund'
  }
  if (lowerLabel.includes('whale')) {
    return 'whale'
  }
  if (lowerLabel.includes('contract') || lowerLabel.includes('bridge') || lowerLabel.includes('treasury') ||
      lowerLabel.includes('multisig') || lowerLabel.includes('gnosis')) {
    return 'contract'
  }
  return 'unknown'
}

// Extended GraphNode with additional data
interface ExtendedHolder extends GraphNode {
  valueUsd?: number
  balanceChange24h?: number
  balanceChange7d?: number
  balanceChange30d?: number
  isCounterparty?: boolean
  interactionCount?: number
  volumeIn?: number
  volumeOut?: number
}

const CHAIN_OPTIONS: { id: SupportedChain; name: string }[] = [
  { id: 'ethereum', name: 'Ethereum' },
  { id: 'bnb', name: 'BNB Chain' },
  { id: 'polygon', name: 'Polygon' },
  { id: 'arbitrum', name: 'Arbitrum' },
  { id: 'optimism', name: 'Optimism' },
  { id: 'base', name: 'Base' },
  { id: 'avalanche', name: 'Avalanche' },
  { id: 'solana', name: 'Solana' },
]

function AppContent() {
  // Parse URL parameters on mount
  const getUrlParams = () => {
    const params = new URLSearchParams(window.location.search)
    return {
      token: params.get('token') || '',
      chain: (params.get('chain') as SupportedChain) || 'ethereum',
    }
  }

  const urlParams = getUrlParams()

  const [inputAddress, setInputAddress] = useState(urlParams.token)
  const [selectedChain, setSelectedChain] = useState<SupportedChain>(urlParams.chain)
  const [isExploring, setIsExploring] = useState(false)
  const [isLoadingCounterparties, setIsLoadingCounterparties] = useState(false)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [holders, setHolders] = useState<ExtendedHolder[]>([])
  const [counterpartyNodes, setCounterpartyNodes] = useState<ExtendedHolder[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [tokenInfo, setTokenInfo] = useState<{ address: string; chain: string } | null>(null)
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false)

  // Counterparty settings
  const [maxCounterparties, setMaxCounterparties] = useState(10)
  const [timeWindowDays, setTimeWindowDays] = useState(30)
  const [showSettings, setShowSettings] = useState(false)
  const [expandProgress, setExpandProgress] = useState<{ current: number; total: number } | null>(null)

  // Combine holders and counterparty nodes, memoized to prevent unnecessary re-renders
  const allNodes = useMemo(() => {
    return [...holders, ...counterpartyNodes.filter(cp =>
      !holders.some(h => h.address.toLowerCase() === cp.address.toLowerCase())
    )]
  }, [holders, counterpartyNodes])

  // Update URL when exploring
  const updateUrl = (token: string, chain: string) => {
    const url = new URL(window.location.href)
    if (token) {
      url.searchParams.set('token', token)
      url.searchParams.set('chain', chain)
    } else {
      url.searchParams.delete('token')
      url.searchParams.delete('chain')
    }
    window.history.pushState({}, '', url.toString())
  }

  const handleExplore = async (addressOverride?: string, chainOverride?: SupportedChain) => {
    const address = (addressOverride || inputAddress).trim()
    const chain = chainOverride || selectedChain

    if (!address) {
      setError('Please enter a token contract address')
      return
    }

    if (!isValidAddress(address, chain)) {
      setError(`Invalid ${chain === 'solana' ? 'Solana' : 'EVM'} address format`)
      return
    }

    setIsExploring(true)
    setError(null)
    setHolders([])
    setCounterpartyNodes([])
    setEdges([])
    setExpandedNodes(new Set())
    setSelectedNode(null)

    // Update URL
    updateUrl(address, chain)

    console.log('=== BubbleNansen API Call ===')
    console.log('Chain:', chain)
    console.log('Contract:', address)

    try {
      const response = await getTopHolders(chain, address, {
        perPage: 20, // Top 20 holders only
        labelType: 'all_holders',
      })

      console.log('API Response:', response)

      // Sort by token amount (descending) and take top 20
      const sortedHolders = response.data
        .map(holderToGraphNode)
        .sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance))
        .slice(0, 20) as ExtendedHolder[]

      setHolders(sortedHolders)
      setTokenInfo({ address, chain })

      console.log(`Loaded ${sortedHolders.length} holders (sorted by ownership)`)
      console.log('=== End API Call ===')
    } catch (err: any) {
      console.error('API Error:', err)
      setError(err.message || 'Failed to fetch token holders. Check your API key and try again.')
    } finally {
      setIsExploring(false)
    }
  }

  // Auto-load from URL params on mount
  useEffect(() => {
    if (!hasAutoLoaded && urlParams.token && isValidAddress(urlParams.token, urlParams.chain)) {
      setHasAutoLoaded(true)
      handleExplore(urlParams.token, urlParams.chain)
    }
  }, [hasAutoLoaded])

  const handleNodeClick = useCallback(async (node: GraphNode) => {
    const nodeAddress = node.id

    // Toggle selection
    if (selectedNode === nodeAddress) {
      setSelectedNode(null)
      return
    }

    setSelectedNode(nodeAddress)

    // If already expanded, don't fetch again
    if (expandedNodes.has(nodeAddress)) {
      return
    }

    // Fetch counterparties for this address
    setIsLoadingCounterparties(true)
    console.log(`=== Fetching counterparties for ${truncateAddress(nodeAddress)} ===`)

    try {
      // Calculate date range based on time window setting
      const now = new Date()
      const fromDate = new Date(now.getTime() - timeWindowDays * 24 * 60 * 60 * 1000)

      const response = await getCounterparties(selectedChain, nodeAddress, {
        perPage: maxCounterparties,
        fromDate: fromDate.toISOString().split('T')[0],
        toDate: now.toISOString().split('T')[0],
      })

      console.log('Counterparties response:', response)

      if (response.data.length > 0) {
        // Convert counterparties to nodes
        const newCounterpartyNodes = response.data
          .map(counterpartyToGraphNode)
          .filter(cp => cp.address.toLowerCase() !== nodeAddress.toLowerCase())

        // Create edges from selected node to each counterparty
        const newEdges: GraphEdge[] = response.data
          .filter(cp => cp.counterparty_address.toLowerCase() !== nodeAddress.toLowerCase())
          .map(cp => ({
            source: nodeAddress,
            target: cp.counterparty_address,
            weight: cp.total_volume_usd,
            transfers: cp.interaction_count,
          }))

        // Add new counterparty nodes (avoid duplicates)
        setCounterpartyNodes(prev => {
          const existingAddresses = new Set(prev.map(n => n.address.toLowerCase()))
          const newNodes = newCounterpartyNodes.filter(
            n => !existingAddresses.has(n.address.toLowerCase())
          )
          return [...prev, ...newNodes]
        })

        // Add new edges
        setEdges(prev => [...prev, ...newEdges])

        // Mark node as expanded
        setExpandedNodes(prev => new Set([...prev, nodeAddress]))

        console.log(`Added ${newCounterpartyNodes.length} counterparty nodes and ${newEdges.length} edges`)
      }
    } catch (err: any) {
      console.error('Counterparties API Error:', err)
      // Don't show error for counterparties - it's optional
    } finally {
      setIsLoadingCounterparties(false)
    }
  }, [selectedNode, selectedChain, expandedNodes, maxCounterparties, timeWindowDays])

  const selectedHolder = allNodes.find(h => h.address === selectedNode)

  // Expand all holders - fetch counterparties for each
  const handleExpandAll = async () => {
    const unexpandedHolders = holders.filter(h => !expandedNodes.has(h.address))

    if (unexpandedHolders.length === 0) {
      return
    }

    setIsLoadingCounterparties(true)
    setExpandProgress({ current: 0, total: unexpandedHolders.length })
    console.log(`=== Expanding all ${unexpandedHolders.length} holders ===`)

    const now = new Date()
    const fromDate = new Date(now.getTime() - timeWindowDays * 24 * 60 * 60 * 1000)

    let allNewCounterpartyNodes: ExtendedHolder[] = []
    let allNewEdges: GraphEdge[] = []
    const newExpandedNodes = new Set(expandedNodes)

    for (let i = 0; i < unexpandedHolders.length; i++) {
      const holder = unexpandedHolders[i]
      setExpandProgress({ current: i + 1, total: unexpandedHolders.length })

      try {
        console.log(`Fetching counterparties for ${truncateAddress(holder.address)} (${i + 1}/${unexpandedHolders.length})...`)

        const response = await getCounterparties(selectedChain, holder.address, {
          perPage: maxCounterparties,
          fromDate: fromDate.toISOString().split('T')[0],
          toDate: now.toISOString().split('T')[0],
        })

        if (response.data.length > 0) {
          const newNodes = response.data
            .map(counterpartyToGraphNode)
            .filter(cp => cp.address.toLowerCase() !== holder.address.toLowerCase())

          const newEdges: GraphEdge[] = response.data
            .filter(cp => cp.counterparty_address.toLowerCase() !== holder.address.toLowerCase())
            .map(cp => ({
              source: holder.address,
              target: cp.counterparty_address,
              weight: cp.total_volume_usd,
              transfers: cp.interaction_count,
            }))

          allNewCounterpartyNodes = [...allNewCounterpartyNodes, ...newNodes]
          allNewEdges = [...allNewEdges, ...newEdges]
        }

        newExpandedNodes.add(holder.address)
      } catch (err) {
        console.error(`Failed to fetch counterparties for ${holder.address}:`, err)
      }
    }

    // Deduplicate counterparty nodes
    const existingAddresses = new Set([
      ...holders.map(h => h.address.toLowerCase()),
      ...counterpartyNodes.map(n => n.address.toLowerCase())
    ])
    const uniqueNewNodes = allNewCounterpartyNodes.filter(
      n => !existingAddresses.has(n.address.toLowerCase())
    )

    setCounterpartyNodes(prev => [...prev, ...uniqueNewNodes])
    setEdges(prev => [...prev, ...allNewEdges])
    setExpandedNodes(newExpandedNodes)
    setIsLoadingCounterparties(false)
    setExpandProgress(null)

    console.log(`=== Expand all complete: ${uniqueNewNodes.length} new nodes, ${allNewEdges.length} new edges ===`)
  }

  return (
    <div className="h-screen flex flex-col bg-background text-slate-100">
      {/* Header */}
      <header className="h-16 border-b border-border flex items-center px-6 gap-6">
        <img src="https://cdn.app.nansen.ai/assets/static/images/logo.svg" alt="Nansen" className="h-8" />

        <div className="flex items-center gap-3 flex-1 max-w-2xl">
          <select
            value={selectedChain}
            onChange={(e) => setSelectedChain(e.target.value as SupportedChain)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          >
            {CHAIN_OPTIONS.map(chain => (
              <option key={chain.id} value={chain.id}>{chain.name}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder={`Enter token contract address ${selectedChain === 'solana' ? '' : '(0x...)'}`}
            value={inputAddress}
            onChange={(e) => setInputAddress(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleExplore()}
            className="flex-1 bg-surface border border-border rounded-lg px-4 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:border-primary font-mono"
          />

          <button
            onClick={() => handleExplore()}
            disabled={isExploring}
            className="disabled:opacity-50 text-black px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: '#00FFA7' }}
          >
            {isExploring ? 'Loading...' : 'Explore'}
          </button>
        </div>

        {tokenInfo && holders.length > 0 && (
          <div className="text-sm text-slate-400">
            <span className="text-white font-medium">{truncateAddress(tokenInfo.address)}</span>
            <span className="mx-2">|</span>
            <span>{holders.length} holders</span>
            {counterpartyNodes.length > 0 && (
              <span className="text-accent"> + {counterpartyNodes.length} connected</span>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Bubble Map Area */}
        <main className="flex-1 relative">
          {error && (
            <div className="absolute top-4 left-4 right-4 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg z-10">
              {error}
            </div>
          )}

          {isLoadingCounterparties && (
            <div className="absolute top-4 right-4 bg-surface border border-border px-4 py-2 rounded-lg z-10 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-slate-400">Loading counterparties...</span>
            </div>
          )}

          {holders.length === 0 && !isExploring ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-slate-500">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-surface border border-border flex items-center justify-center">
                  <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3" />
                    <circle cx="19" cy="6" r="2" />
                    <circle cx="5" cy="6" r="2" />
                    <circle cx="5" cy="18" r="2" />
                    <circle cx="19" cy="18" r="2" />
                    <line x1="12" y1="9" x2="12" y2="6" />
                    <line x1="9.5" y1="13.5" x2="6.5" y2="16" />
                    <line x1="14.5" y1="13.5" x2="17.5" y2="16" />
                  </svg>
                </div>
                <p className="text-lg font-medium mb-2">Enter a token address to explore</p>
                <p className="text-sm mb-4">Visualize top holders and their connections</p>
                <p className="text-xs text-slate-600 mb-2">
                  Click on any holder to reveal their counterparties
                </p>
                <p className="text-xs text-slate-600">
                  Example (USDC on Ethereum):<br/>
                  <code className="text-slate-500">0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48</code>
                </p>
              </div>
            </div>
          ) : isExploring ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400">Fetching token holders from Nansen...</p>
              </div>
            </div>
          ) : (
            <BubbleMap
              nodes={allNodes}
              edges={edges}
              selectedNode={selectedNode}
              onNodeClick={handleNodeClick}
              onNodeHover={setHoveredNode}
            />
          )}

          {/* Hover Tooltip */}
          {hoveredNode && (
            <div className="absolute top-4 left-4 bg-surface border border-border rounded-lg p-4 shadow-xl max-w-xs z-20">
              <div className="font-medium text-white mb-1">
                {hoveredNode.label?.name || truncateAddress(hoveredNode.address)}
              </div>
              <div className="text-sm text-slate-400 mb-2 font-mono">
                {truncateAddress(hoveredNode.address)}
              </div>

              {(hoveredNode as ExtendedHolder).isCounterparty ? (
                <div className="flex gap-4 text-sm">
                  <div>
                    <div className="text-slate-500">Interactions</div>
                    <div className="text-white">{(hoveredNode as ExtendedHolder).interactionCount}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Volume</div>
                    <div className="text-white">{formatUSD((hoveredNode as ExtendedHolder).valueUsd || 0)}</div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-4 text-sm">
                  <div>
                    <div className="text-slate-500">Balance</div>
                    <div className="text-white">{formatBalance(parseFloat(hoveredNode.balance))}</div>
                  </div>
                  {(hoveredNode as ExtendedHolder).valueUsd && (
                    <div>
                      <div className="text-slate-500">Value</div>
                      <div className="text-white">{formatUSD((hoveredNode as ExtendedHolder).valueUsd!)}</div>
                    </div>
                  )}
                </div>
              )}

              {hoveredNode.label && (
                <div className="mt-2 flex gap-1">
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded capitalize">
                    {hoveredNode.label.type}
                  </span>
                  {(hoveredNode as ExtendedHolder).isCounterparty && (
                    <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded">
                      counterparty
                    </span>
                  )}
                </div>
              )}

              {!expandedNodes.has(hoveredNode.address) && !(hoveredNode as ExtendedHolder).isCounterparty && (
                <div className="mt-2 text-xs text-slate-500">
                  Click to reveal counterparties
                </div>
              )}
            </div>
          )}
        </main>

        {/* Sidebar */}
        <aside className="w-80 border-l border-border bg-surface flex flex-col">
          {/* Settings Panel */}
          <div className="border-b border-border">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-background/30 transition-colors"
            >
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Settings
              </h2>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform ${showSettings ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showSettings && (
              <div className="px-4 pb-4 space-y-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Max Counterparties
                  </label>
                  <select
                    value={maxCounterparties}
                    onChange={(e) => setMaxCounterparties(Number(e.target.value))}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Time Window
                  </label>
                  <select
                    value={timeWindowDays}
                    onChange={(e) => setTimeWindowDays(Number(e.target.value))}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={14}>Last 14 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={60}>Last 60 days</option>
                    <option value={90}>Last 90 days</option>
                    <option value={180}>Last 180 days</option>
                    <option value={365}>Last year</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={handleExpandAll}
                    disabled={isLoadingCounterparties || holders.length === 0 || expandedNodes.size === holders.length}
                    className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium px-4 py-2 rounded text-sm transition-colors"
                  >
                    {expandProgress
                      ? `Expanding ${expandProgress.current}/${expandProgress.total}...`
                      : expandedNodes.size === holders.length
                        ? 'All Expanded'
                        : `Expand All (${holders.length - expandedNodes.size} remaining)`
                    }
                  </button>

                  {expandProgress && (
                    <div className="space-y-1">
                      <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-accent h-full transition-all duration-300 ease-out"
                          style={{ width: `${(expandProgress.current / expandProgress.total) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 text-center">
                        {Math.round((expandProgress.current / expandProgress.total) * 100)}% complete
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-600">
                  Settings apply to new counterparty lookups. Click a holder to fetch their counterparties, or use Expand All.
                </p>
              </div>
            )}
          </div>

          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Top Holders
            </h2>
          </div>

          {holders.length === 0 ? (
            <div className="p-4 text-slate-500 text-sm">
              No token selected
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {holders.map((holder, index) => (
                <button
                  key={holder.address}
                  onClick={() => handleNodeClick(holder)}
                  className={`w-full text-left px-4 py-3 border-b border-border hover:bg-background/50 transition-colors ${
                    holder.address === selectedNode ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 text-sm w-6">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate flex items-center gap-2">
                        {holder.label?.name || truncateAddress(holder.address)}
                        {expandedNodes.has(holder.address) && (
                          <span className="w-2 h-2 rounded-full bg-accent" title="Expanded"></span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {truncateAddress(holder.address)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatBalance(parseFloat(holder.balance))}</div>
                      {holder.valueUsd && (
                        <div className="text-xs text-slate-500">{formatUSD(holder.valueUsd)}</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Selected Holder Details */}
          {selectedHolder && (
            <div className="border-t border-border p-4 bg-background/50">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Selected
              </h3>
              <div className="text-white font-medium mb-1">
                {selectedHolder.label?.name || 'Unknown Wallet'}
              </div>
              <div className="text-xs text-slate-500 font-mono mb-3 break-all">
                {selectedHolder.address}
              </div>

              {(selectedHolder as ExtendedHolder).isCounterparty ? (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-slate-500">Interactions</div>
                    <div className="text-white font-medium">{(selectedHolder as ExtendedHolder).interactionCount}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Total Volume</div>
                    <div className="text-white font-medium">{formatUSD((selectedHolder as ExtendedHolder).valueUsd || 0)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Volume In</div>
                    <div className="text-green-400 font-medium">{formatUSD((selectedHolder as ExtendedHolder).volumeIn || 0)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Volume Out</div>
                    <div className="text-red-400 font-medium">{formatUSD((selectedHolder as ExtendedHolder).volumeOut || 0)}</div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-slate-500">Balance</div>
                    <div className="text-white font-medium">{formatBalance(parseFloat(selectedHolder.balance))}</div>
                  </div>
                  {selectedHolder.valueUsd && (
                    <div>
                      <div className="text-slate-500">Value USD</div>
                      <div className="text-white font-medium">{formatUSD(selectedHolder.valueUsd)}</div>
                    </div>
                  )}
                </div>
              )}

              {selectedHolder.label && (
                <div className="mt-3">
                  <div className="text-slate-500 text-sm mb-1">Type</div>
                  <div className="flex gap-1">
                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded capitalize">
                      {selectedHolder.label.type}
                    </span>
                    {(selectedHolder as ExtendedHolder).isCounterparty && (
                      <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded">
                        counterparty
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

export default App
