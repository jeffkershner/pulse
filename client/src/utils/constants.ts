export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

export const INDEX_SYMBOLS = ['DIA', 'SPY', 'QQQ', 'IWM'] as const;

export const EXCHANGE_SYMBOLS = {
  NYSE: ['JPM', 'GS', 'V', 'JNJ', 'WMT'],
  NASDAQ: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META'],
  'S&P 500': ['TSLA', 'NVDA', 'BRK.B', 'UNH', 'XOM'],
} as const;

export const ALL_STOCK_SYMBOLS = [
  ...EXCHANGE_SYMBOLS.NYSE,
  ...EXCHANGE_SYMBOLS.NASDAQ,
  ...EXCHANGE_SYMBOLS['S&P 500'],
] as const;

export const ALL_DASHBOARD_SYMBOLS = [
  ...INDEX_SYMBOLS,
  ...ALL_STOCK_SYMBOLS,
] as const;

export const COMPANY_NAMES: Record<string, string> = {
  AAPL: 'Apple Inc.',
  MSFT: 'Microsoft Corp.',
  GOOGL: 'Alphabet Inc.',
  AMZN: 'Amazon.com Inc.',
  META: 'Meta Platforms',
  TSLA: 'Tesla Inc.',
  NVDA: 'NVIDIA Corp.',
  JPM: 'JPMorgan Chase',
  GS: 'Goldman Sachs',
  V: 'Visa Inc.',
  JNJ: 'Johnson & Johnson',
  WMT: 'Walmart Inc.',
  'BRK.B': 'Berkshire Hathaway',
  UNH: 'UnitedHealth Group',
  XOM: 'Exxon Mobil Corp.',
};

export const SYMBOL_EXCHANGE: Record<string, string> = {
  JPM: 'NYSE', GS: 'NYSE', V: 'NYSE', JNJ: 'NYSE', WMT: 'NYSE',
  AAPL: 'NASDAQ', MSFT: 'NASDAQ', GOOGL: 'NASDAQ', AMZN: 'NASDAQ', META: 'NASDAQ',
  TSLA: 'S&P 500', NVDA: 'S&P 500', 'BRK.B': 'S&P 500', UNH: 'S&P 500', XOM: 'S&P 500',
};
