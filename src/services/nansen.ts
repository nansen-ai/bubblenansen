/**
 * Nansen API service.
 * Documentation: https://docs.nansen.ai/api/token-god-mode/holders
 */

const API_BASE_URL = '/api/nansen';

/**
 * A typed error returned when the Nansen API request fails.
 */
export class NansenApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'NansenApiError';
  }
}

async function request<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  let response: Response;
  let payload: unknown = null;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    payload = await response.json().catch(() => null);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Network request failed';
    throw new NansenApiError(message, 0);
  }

  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.message === 'string'
        ? payload.message
        : `Nansen API request failed with status ${response.status}`;
    throw new NansenApiError(message, response.status);
  }

  return payload as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// Supported chains.
export const SUPPORTED_CHAINS = [
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'base',
  'bnb',
  'avalanche',
  'solana',
] as const;

export type SupportedChain = typeof SUPPORTED_CHAINS[number];

// API response types.
export interface NansenHolder {
  address: string;
  address_label: string | null;
  token_amount: number;
  total_outflow: number;
  total_inflow: number;
  balance_change_24h: number;
  balance_change_7d: number;
  balance_change_30d: number;
  ownership_percentage: number;
  value_usd: number;
}

export interface NansenHoldersResponse {
  data: NansenHolder[];
  pagination: {
    page: number;
    per_page: number;
    is_last_page: boolean;
  };
}

export interface NansenFlow {
  date: string;
  price_usd: number;
  token_amount: number;
  value_usd: number;
  holders_count: number;
  total_inflows_count: number;
  total_outflows_count: number;
}

export interface NansenFlowsResponse {
  data: NansenFlow[];
  pagination: {
    page: number;
    per_page: number;
    is_last_page: boolean;
  };
}

export interface NansenCounterparty {
  counterparty_address: string;
  counterparty_address_label: string[] | null;
  interaction_count: number;
  total_volume_usd: number;
  volume_in_usd: number;
  volume_out_usd: number;
  tokens_info: {
    token_address: string;
    token_symbol: string;
    token_name: string;
    num_transfer: string;
  }[];
}

export interface NansenCounterpartiesResponse {
  data: NansenCounterparty[];
  pagination: {
    page: number;
    per_page: number;
    is_last_page: boolean;
  };
}

/**
 * Get the top holders for a token.
 * Cost: 5 credits per call.
 */
export async function getTopHolders(
  chain: SupportedChain,
  tokenAddress: string,
  options: {
    page?: number;
    perPage?: number;
    labelType?: 'all_holders' | 'smart_money' | 'whale' | 'exchange' | 'public_figure';
    aggregateByEntity?: boolean;
  } = {},
): Promise<NansenHoldersResponse> {
  const {
    page = 1,
    perPage = 100,
    labelType = 'all_holders',
    aggregateByEntity = false,
  } = options;

  return request<NansenHoldersResponse>('/api/v1/tgm/holders', {
    chain,
    token_address: tokenAddress,
    label_type: labelType,
    aggregate_by_entity: aggregateByEntity,
    pagination: {
      page,
      per_page: perPage,
    },
    order_by: [{ field: 'token_amount', direction: 'DESC' }],
  });
}

/**
 * Get token flows over a date range.
 * Cost: 5 credits per call.
 */
export async function getTokenFlows(
  chain: SupportedChain,
  tokenAddress: string,
  options: {
    fromDate: string;
    toDate: string;
    label?: 'top_100_holders' | 'whale' | 'smart_money' | 'exchange' | 'public_figure';
    page?: number;
    perPage?: number;
  },
): Promise<NansenFlowsResponse> {
  const {
    fromDate,
    toDate,
    label = 'top_100_holders',
    page = 1,
    perPage = 100,
  } = options;

  return request<NansenFlowsResponse>('/api/v1/tgm/flows', {
    chain,
    token_address: tokenAddress,
    date: {
      from: fromDate,
      to: toDate,
    },
    label,
    pagination: {
      page,
      per_page: perPage,
    },
    order_by: [{ field: 'date', direction: 'DESC' }],
  });
}

/**
 * Get counterparties for an address.
 * Cost: 5 credits per call.
 */
export async function getCounterparties(
  chain: SupportedChain,
  address: string,
  options: {
    fromDate?: string;
    toDate?: string;
    page?: number;
    perPage?: number;
    groupBy?: 'wallet' | 'entity';
  } = {},
): Promise<NansenCounterpartiesResponse> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const {
    fromDate = thirtyDaysAgo.toISOString().split('T')[0],
    toDate = now.toISOString().split('T')[0],
    page = 1,
    perPage = 20,
    groupBy = 'wallet',
  } = options;

  return request<NansenCounterpartiesResponse>('/api/v1/profiler/address/counterparties', {
    chain,
    address,
    date: {
      from: `${fromDate}T00:00:00Z`,
      to: `${toDate}T23:59:59Z`,
    },
    group_by: groupBy,
    source_input: 'Combined',
    pagination: {
      page,
      per_page: perPage,
    },
    order_by: [{ field: 'total_volume_usd', direction: 'DESC' }],
  });
}

/**
 * Validate a contract or wallet address for the selected chain.
 */
export function isValidAddress(address: string, chain: SupportedChain): boolean {
  if (chain === 'solana') {
    // Solana addresses are base58 and typically contain 32 to 44 characters.
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }

  // EVM addresses contain 40 hexadecimal characters after the 0x prefix.
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
