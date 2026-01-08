export interface Chain {
  id: string;
  name: string;
  nativeSymbol: string;
}

export interface TokenMetadata {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
}

export interface Holder {
  address: string;
  balance: string;
  percentage: number;
  label?: WalletLabel;
}

export interface WalletLabel {
  name: string;
  type: 'exchange' | 'defi' | 'fund' | 'whale' | 'contract' | 'unknown';
  tags: string[];
}

export interface Transfer {
  from: string;
  to: string;
  amount: string;
  timestamp: number;
  txHash: string;
}

export interface GraphNode {
  id: string;
  address: string;
  balance: string;
  percentage: number;
  label?: WalletLabel;
  valueUsd?: number;
  balanceChange24h?: number;
  balanceChange7d?: number;
  balanceChange30d?: number;
  // Counterparty-specific fields
  isCounterparty?: boolean;
  interactionCount?: number;
  volumeIn?: number;
  volumeOut?: number;
  // D3 force simulation fields
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  weight: number;
  transfers: number;
}

export interface Cluster {
  id: string;
  name: string;
  nodes: string[];
  totalBalance: string;
  percentage: number;
}
