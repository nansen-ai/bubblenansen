/**
 * Nansen API Service
 * Documentation: https://docs.nansen.ai/api/token-god-mode/holders
 */

import axios, { AxiosError } from 'axios';

// Use Vite proxy in development to avoid CORS issues
// In production, you'd use a backend server or serverless function
const API_BASE_URL = '/api/nansen';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'apiKey': import.meta.env.VITE_NANSEN_API_KEY,
  },
});

// Supported chains
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

// API Response Types
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

export interface NansenApiError {
  message: string;
  status: number;
}

/**
 * Get top holders for a token
 * Cost: 5 credits per call
 */
export async function getTopHolders(
  chain: SupportedChain,
  tokenAddress: string,
  options: {
    page?: number;
    perPage?: number;
    labelType?: 'all_holders' | 'smart_money' | 'whale' | 'exchange' | 'public_figure';
    aggregateByEntity?: boolean;
  } = {}
): Promise<NansenHoldersResponse> {
  const {
    page = 1,
    perPage = 100,
    labelType = 'all_holders',
    aggregateByEntity = false,
  } = options;

  console.log(`[Nansen API] Fetching holders for ${tokenAddress} on ${chain}`);

  try {
    const response = await api.post<NansenHoldersResponse>('/api/v1/tgm/holders', {
      chain,
      token_address: tokenAddress,
      label_type: labelType,
      aggregate_by_entity: aggregateByEntity,
      pagination: {
        page,
        per_page: perPage,
      },
      order_by: [
        { field: 'token_amount', direction: 'DESC' }
      ],
    });

    console.log(`[Nansen API] Received ${response.data.data.length} holders`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('[Nansen API] Error fetching holders:', axiosError.response?.data || axiosError.message);
    throw {
      message: axiosError.response?.data?.message || axiosError.message || 'Failed to fetch holders',
      status: axiosError.response?.status || 500,
    } as NansenApiError;
  }
}

/**
 * Get token flows over a date range
 * Cost: 5 credits per call
 */
export async function getTokenFlows(
  chain: SupportedChain,
  tokenAddress: string,
  options: {
    fromDate: string; // ISO 8601 format: YYYY-MM-DD
    toDate: string;
    label?: 'top_100_holders' | 'whale' | 'smart_money' | 'exchange' | 'public_figure';
    page?: number;
    perPage?: number;
  }
): Promise<NansenFlowsResponse> {
  const {
    fromDate,
    toDate,
    label = 'top_100_holders',
    page = 1,
    perPage = 100,
  } = options;

  console.log(`[Nansen API] Fetching flows for ${tokenAddress} on ${chain} from ${fromDate} to ${toDate}`);

  try {
    const response = await api.post<NansenFlowsResponse>('/api/v1/tgm/flows', {
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
      order_by: [
        { field: 'date', direction: 'DESC' }
      ],
    });

    console.log(`[Nansen API] Received ${response.data.data.length} flow records`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('[Nansen API] Error fetching flows:', axiosError.response?.data || axiosError.message);
    throw {
      message: axiosError.response?.data?.message || axiosError.message || 'Failed to fetch flows',
      status: axiosError.response?.status || 500,
    } as NansenApiError;
  }
}

// Counterparties types
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
 * Get counterparties for an address
 * Cost: 5 credits per call
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
  } = {}
): Promise<NansenCounterpartiesResponse> {
  // Default to last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const {
    fromDate = thirtyDaysAgo.toISOString().split('T')[0],
    toDate = now.toISOString().split('T')[0],
    page = 1,
    perPage = 20,
    groupBy = 'wallet',
  } = options;

  console.log(`[Nansen API] Fetching counterparties for ${address} on ${chain}`);

  try {
    const response = await api.post<NansenCounterpartiesResponse>('/api/v1/profiler/address/counterparties', {
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
      order_by: [
        { field: 'total_volume_usd', direction: 'DESC' }
      ],
    });

    console.log(`[Nansen API] Received ${response.data.data.length} counterparties`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('[Nansen API] Error fetching counterparties:', axiosError.response?.data || axiosError.message);
    throw {
      message: axiosError.response?.data?.message || axiosError.message || 'Failed to fetch counterparties',
      status: axiosError.response?.status || 500,
    } as NansenApiError;
  }
}

/**
 * Validate if a string is a valid contract address
 */
export function isValidAddress(address: string, chain: SupportedChain): boolean {
  if (chain === 'solana') {
    // Solana addresses are base58, typically 32-44 characters
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }
  // EVM addresses are 42 characters starting with 0x
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
