/**
 * Mock data for development before Nansen API integration
 * Remove or disable once real API is connected
 */

import { Holder, TokenMetadata, Transfer, WalletLabel, GraphNode, GraphEdge } from '../types';

export const mockTokenMetadata: TokenMetadata = {
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  totalSupply: '26000000000000000',
};

export const mockLabels: Record<string, WalletLabel> = {
  '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503': {
    name: 'Binance',
    type: 'exchange',
    tags: ['CEX', 'Hot Wallet'],
  },
  '0x0a59649758aa4d66e25f08dd01271e891fe52199': {
    name: 'Circle',
    type: 'defi',
    tags: ['Issuer', 'Treasury'],
  },
  '0x5041ed759dd4afc3a72b8192c143f72f4724081a': {
    name: 'Jump Trading',
    type: 'fund',
    tags: ['Market Maker'],
  },
  '0x40ec5b33f54e0e8a33a975908c5ba1c14e5bbbdf': {
    name: 'Polygon Bridge',
    type: 'contract',
    tags: ['Bridge'],
  },
};

export const mockHolders: Holder[] = [
  {
    address: '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503',
    balance: '2500000000000000',
    percentage: 9.62,
    label: mockLabels['0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503'],
  },
  {
    address: '0x0a59649758aa4d66e25f08dd01271e891fe52199',
    balance: '1800000000000000',
    percentage: 6.92,
    label: mockLabels['0x0a59649758aa4d66e25f08dd01271e891fe52199'],
  },
  {
    address: '0x5041ed759dd4afc3a72b8192c143f72f4724081a',
    balance: '1200000000000000',
    percentage: 4.62,
    label: mockLabels['0x5041ed759dd4afc3a72b8192c143f72f4724081a'],
  },
  {
    address: '0x40ec5b33f54e0e8a33a975908c5ba1c14e5bbbdf',
    balance: '900000000000000',
    percentage: 3.46,
    label: mockLabels['0x40ec5b33f54e0e8a33a975908c5ba1c14e5bbbdf'],
  },
  // Generate more mock holders
  ...generateMockHolders(96),
];

function generateMockHolders(count: number): Holder[] {
  const holders: Holder[] = [];
  let remainingPercentage = 75; // Remaining after top 4

  for (let i = 0; i < count; i++) {
    const percentage = Math.max(0.1, (remainingPercentage / count) * (1 + Math.random()));
    remainingPercentage -= percentage;

    holders.push({
      address: `0x${generateRandomHex(40)}`,
      balance: String(Math.floor(percentage * 260000000000000)),
      percentage: Number(percentage.toFixed(2)),
    });
  }

  return holders;
}

function generateRandomHex(length: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export const mockTransfers: Transfer[] = [
  {
    from: '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503',
    to: '0x0a59649758aa4d66e25f08dd01271e891fe52199',
    amount: '50000000000000',
    timestamp: Date.now() - 86400000,
    txHash: '0x' + generateRandomHex(64),
  },
  {
    from: '0x0a59649758aa4d66e25f08dd01271e891fe52199',
    to: '0x5041ed759dd4afc3a72b8192c143f72f4724081a',
    amount: '25000000000000',
    timestamp: Date.now() - 172800000,
    txHash: '0x' + generateRandomHex(64),
  },
  {
    from: '0x5041ed759dd4afc3a72b8192c143f72f4724081a',
    to: '0x40ec5b33f54e0e8a33a975908c5ba1c14e5bbbdf',
    amount: '10000000000000',
    timestamp: Date.now() - 259200000,
    txHash: '0x' + generateRandomHex(64),
  },
];

// Convert holders to graph nodes
export function holdersToGraphNodes(holders: Holder[]): GraphNode[] {
  return holders.map((holder) => ({
    id: holder.address,
    address: holder.address,
    balance: holder.balance,
    percentage: holder.percentage,
    label: holder.label,
  }));
}

// Generate edges from transfers
export function transfersToGraphEdges(transfers: Transfer[]): GraphEdge[] {
  const edgeMap = new Map<string, GraphEdge>();

  transfers.forEach((transfer) => {
    const key = [transfer.from, transfer.to].sort().join('-');
    const existing = edgeMap.get(key);

    if (existing) {
      existing.weight += parseFloat(transfer.amount);
      existing.transfers += 1;
    } else {
      edgeMap.set(key, {
        source: transfer.from,
        target: transfer.to,
        weight: parseFloat(transfer.amount),
        transfers: 1,
      });
    }
  });

  return Array.from(edgeMap.values());
}

// Generate mock graph data
export const mockGraphNodes = holdersToGraphNodes(mockHolders);
export const mockGraphEdges = transfersToGraphEdges(mockTransfers);
