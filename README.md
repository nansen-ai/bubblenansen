# BubbleNansen

A token holder visualization app that displays the top holders of any token and their counterparty connections using an interactive bubble map. Powered by the [Nansen API](https://app.nansen.ai/api).

## Features

- **Multi-chain support** - Ethereum, Polygon, Arbitrum, Optimism, Base, BNB Chain, Avalanche, Solana
- **Interactive bubble map** - D3.js force-directed graph with zoom, pan, and drag
- **Top holders visualization** - Bubble size proportional to token holdings
- **Counterparty connections** - Click any holder to reveal their counterparties
- **Wallet labels** - Color-coded by type (exchange, DeFi, fund, whale, contract)
- **Configurable settings** - Max counterparties, time window for data
- **Expand All** - Fetch counterparties for all holders with progress tracking
- **URL parameters** - Share links with `?token=0x...&chain=ethereum`

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- A [Nansen API key](https://app.nansen.ai/api) with Token God Mode access

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/nansen-ai/bubblenansen.git
cd bubblenansen
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example environment file and add your Nansen API key:

```bash
cp .env.example .env
```

Edit `.env` and add your API key:

```
VITE_NANSEN_API_KEY=your_nansen_api_key_here
```

### 4. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the next available port).

### 5. Try it out

Enter a token contract address and select a chain. For example:
- **USDC on Ethereum**: `0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`
- **USDT on Ethereum**: `0xdac17f958d2ee523a2206206994597c13d831ec7`

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## Tech Stack

- **React 18** + **TypeScript** - UI framework
- **Vite** - Build tool and dev server
- **D3.js** - Force-directed graph visualization
- **Tailwind CSS** - Styling
- **Axios** + **React Query** - Data fetching
- **Nansen API** - Token holder and counterparty data

## Project Structure

```
src/
├── components/
│   └── BubbleMap.tsx       # D3 force-directed graph
├── services/
│   └── nansen.ts           # Nansen API client
├── types/
│   └── index.ts            # TypeScript definitions
├── App.tsx                 # Main application
├── main.tsx                # Entry point
└── index.css               # Tailwind styles
```

## How It Works

1. Enter a token contract address and select a chain
2. The app fetches the top 20 holders from Nansen's Token God Mode API
3. Holders are displayed as bubbles sized by their token balance
4. Click any holder to fetch and display their counterparties (addresses they've interacted with)
5. Connections are drawn between holders and their counterparties
6. Use "Expand All" to fetch counterparties for all holders at once

## Configuration

The Settings panel in the sidebar allows you to configure:

- **Max Counterparties** (5-30) - Maximum counterparties to fetch per holder
- **Time Window** (7 days - 1 year) - Date range for counterparty data

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run linting: `npm run lint`
5. Commit your changes: `git commit -m "Add my feature"`
6. Push to the branch: `git push origin feature/my-feature`
7. Open a Pull Request

### Development Notes

- See `CLAUDE.md` for detailed implementation notes and patterns
- See `TASKS.md` for the development roadmap and completed features
- See `SPEC.md` for the full product specification

### Code Style

- Use TypeScript for all new code
- Follow existing patterns for D3 integration (see `BubbleMap.tsx`)
- Use Tailwind CSS for styling
- Keep components focused and single-purpose

## Troubleshooting

### CORS errors
The app uses a Vite proxy to avoid CORS issues. Make sure you're running via `npm run dev` and not opening the HTML file directly.

### API errors
- Verify your `VITE_NANSEN_API_KEY` is set correctly in `.env`
- Check that your API key has Token God Mode access
- Some tokens may not have data on certain chains

### Graph not rendering
- Check the browser console for errors
- Ensure the token has holders (try a well-known token like USDC first)

## License

Internal Nansen project.
