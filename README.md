# Anonymous Feedback Board
## website Screen Shot
<img width="1869" height="909" alt="Screenshot 2026-07-29 113234" src="https://github.com/user-attachments/assets/9fb2243b-b228-46fe-92b9-48732649834d" />
<img width="1907" height="959" alt="image" src="https://github.com/user-attachments/assets/0f102b14-68b6-4a85-8d06-5d8147c393c3" />

## website link
https://anonymous-feedback-board-nu.vercel.app/

## website demo video link
https://drive.google.com/file/d/1FxmQprePJL0PFEPrrx8TMYO63moLWuH8/view?usp=sharing

A privacy-preserving feedback board built on the Midnight Network where users can submit anonymous feedback and only the original author can remove their own submission.

[![Generic badge](https://img.shields.io/badge/Compact%20Compiler-0.30.0-1abc9c.svg)](https://shields.io/)
[![Generic badge](https://img.shields.io/badge/TypeScript-5.9.3-blue.svg)](https://shields.io/)

## Contract Address

**⚠️ IMPORTANT: Deploy the contract before using this application**

The contract address placeholder must be replaced with your deployed contract address:

| Network | Contract Address |
|---------|------------------|
| Preview | `503cd030a1cd9f629fcb58400a28c539e77bbbcab5db06329d3129a094e0a854` |
| Preprod | `<YOUR_DEPLOYED_CONTRACT_ADDRESS>` |

After deployment, replace `<YOUR_DEPLOYED_CONTRACT_ADDRESS>` in all configuration files.

> Contract deployed on Preview network on 2026-08-04.

## Features

- **Anonymous Submissions**: Submit feedback without revealing your identity
- **Privacy-Preserving**: Uses zero-knowledge proofs to protect user privacy
- **Author-Only Removal**: Only the person who submitted feedback can remove it
- **Public Ledger State**: Track total submissions and current board state
- **Wallet Integration**: Seamless integration with Midnight Lace wallet
- **Web UI**: Clean, responsive React-based user interface
- **CLI Tool**: Command-line interface for advanced users

## What This Project Does

The Anonymous Feedback Board allows users to:
1. Submit anonymous feedback messages to a public board
2. View the current feedback message on the board
3. Remove their own feedback (proven via zero-knowledge proof)
4. Track the total number of submissions

All submissions are completely anonymous - the system only knows that a valid user submitted feedback, not who they are. When removing feedback, users prove they are the original author without revealing their identity.

## Privacy Model

### Public Information (On-Chain)
- **Board State**: Whether the board is currently VACANT or OCCUPIED
- **Feedback Message**: The actual feedback text (when board is occupied)
- **Total Submissions**: Cumulative count of all feedback ever submitted
- **Sequence Number**: Rotation counter for anonymous identity binding
- **Author Hash**: Hashed public key identifier (NOT the author's secret key)

### Private Information (Witness/Local Only)
- **Secret Key**: User's private key, never stored on-chain or revealed

### Privacy Guarantees
- Submitters prove authorship via zero-knowledge proofs without revealing their secret key
- Only a hashed public key (authorHash) is disclosed, unlinkable to wallet identity
- Only the original anonymous author can remove their own feedback
- No linkability between different submissions from the same user

## Tech Stack

- **Smart Contract**: Compact language (Midnight Network)
- **Frontend**: React 19, TypeScript, Material-UI, Vite
- **Backend/API**: TypeScript, RxJS
- **CLI**: TypeScript, Node.js
- **Wallet**: Midnight Lace Wallet Extension
- **Zero-Knowledge Proofs**: Midnight Protocol
- **Package Manager**: npm workspaces

## Folder Structure

```
Anonymous-Feedback-Board/
├── contract/                    # Smart contract in Compact language
│   └── src/
│       ├── feedback-board.compact  # Main contract source
│       ├── index.ts                # Contract exports
│       ├── witnesses.ts            # Private state & witnesses
│       └── managed/feedback-board/ # Generated contract code (after compilation)
├── api/                       # API layer for contract interaction
│   └── src/
│       ├── index.ts              # Main API implementation
│       ├── common-types.ts       # Shared types
│       └── utils/                # Utility functions
├── feedback-board-cli/        # Command-line interface
│   └── src/
│       ├── index.ts              # CLI implementation
│       ├── config.ts             # Configuration
│       └── launcher/             # Launch configurations
├── feedback-board-ui/         # Web browser interface
│   └── src/
│       ├── App.tsx               # Root component
│       ├── components/           # UI components
│       ├── contexts/             # React contexts
│       ├── hooks/                # Custom hooks
│       └── config/               # UI configuration
├── package.json               # Root package (workspaces)
├── README.md                  # This file
└── .envrc                     # Environment configuration
```

## Prerequisites

### 1. Node.js Version Check

You need Node.js v24.11.1 or higher:

```bash
node --version
```

Expected output: `v24.11.1` or higher. The repository includes an `.nvmrc` pinned to `24.11.1`.

If you get a lower version: [Install Node.js LTS](https://nodejs.org/).

### 2. Docker Installation

The [proof server](https://docs.midnight.network/develop/tutorial/using/proof-server) runs in Docker and is required for both CLI and UI to generate zero-knowledge proofs:

```bash
docker --version
```

Expected output: `Docker version X.X.X`.

If Docker is not found: [Install Docker Desktop](https://docs.docker.com/desktop/). Make sure Docker Desktop is running.

### 3. Compact Compiler

Install the Compact compiler toolchain:

```bash
# Follow the official Midnight documentation for installation
# https://docs.midnight.network/develop/tools/compact-compiler
```

Verify installation:

```bash
compact --version
```

### 4. Lace Wallet Extension (UI Only)

For the web interface, install the official Lace wallet extension:
- [Chrome Store](https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk)
- [Edge Store](https://microsoftedge.microsoft.com/addons/detail/lace/efeiemlfnahiidnjglmehaihacglceia)

(tested with version 1.36.0)

After installing, set up the Midnight wallet:
1. Create a **new wallet** — Midnight will appear as a network option
2. Set **Network** to **Preview**
3. Set **Proof server** to **Local (http://localhost:6300)** — this must point to your local proof server started via Docker
4. Click **Enter Wallet**
5. Fund your wallet with tNIGHT tokens from the [Preview Faucet](https://faucet.preview.midnight.network/)
6. Go to **Tokens** in the wallet, click **Generate tDUST**, and confirm the transaction — tDUST tokens are required to pay transaction fees on preview

## Installation

### Install Project Dependencies

This repository uses npm workspaces. Run installation once from the repository root:

```bash
npm install
```

### Pull the Proof Server Docker Image

```bash
docker pull midnightnetwork/proof-server
```

## Build

Build all packages:

```bash
npm run build
```

Or build individual packages:

```bash
# Build contract
cd contract
npm run build
cd ..

# Build API
cd api
npm run build
cd ..

# Build CLI
cd feedback-board-cli
npm run build
cd ..

# Build UI
cd feedback-board-ui
npm run build
cd ..
```

## Compile

Compile the Compact smart contract:

```bash
npm run compact
```

Or from the contract directory:

```bash
cd contract
npm run compact
```

Expected output:

```
> compact
> compact compile src/feedback-board.compact ./src/managed/feedback-board

Compiling 2 circuits:
  circuit "submitFeedback" (k=14, rows=XXXX)
  circuit "removeFeedback" (k=14, rows=XXXX)
```

**Note**: The Compact compiler must be installed for this step to succeed.

## Manual Deployment

**Deployment is intentionally skipped in this setup.**

To deploy the contract manually:

```bash
NODE_OPTIONS="--max-old-space-size=12288" npm run deploy -- --network preview
```

Or from the CLI directory:

```bash
cd feedback-board-cli
npm run preview-remote
```

## After Deployment

After you deploy the contract, the only remaining manual steps are:

1. **Deploy the Compact contract** (see Manual Deployment above)
2. **Copy the deployed contract address** from the deployment output
3. **Replace every occurrence of** `<YOUR_DEPLOYED_CONTRACT_ADDRESS>` with your actual contract address in:
   - `README.md`
   - `feedback-board-ui/.env.preprod`
   - `feedback-board-ui/.env.preview`
   - Any other configuration files

No additional coding should be required.

## Environment Variables

### UI Environment Variables

Create `.env` files in `feedback-board-ui/` based on the templates:

**.env.preprod**:
```env
VITE_NETWORK_ID=preprod
VITE_PROOF_SERVER_URL=http://localhost:6300
VITE_CONTRACT_ADDRESS=<YOUR_DEPLOYED_CONTRACT_ADDRESS>
```

**.env.preview**:
```env
VITE_NETWORK_ID=preview
VITE_PROOF_SERVER_URL=http://localhost:6300
VITE_CONTRACT_ADDRESS=503cd030a1cd9f629fcb58400a28c539e77bbbcab5db06329d3129a094e0a854
```

### CLI Configuration

The CLI uses configuration files in `feedback-board-cli/`:
- `proof-server-local.yml` - Local proof server configuration
- `proof-server.yml` - Remote proof server configuration

## Running the Application

### Option 1: CLI Interface

1. **Start the Proof Server**:
   ```bash
   cd feedback-board-cli
   docker compose -f proof-server-local.yml up -d
   ```

2. **Run the CLI**:
   ```bash
   # For preprod network
   npm run preprod-remote --workspace=feedback-board-cli

   # For preview network
   npm run preview-remote --workspace=feedback-board-cli
   ```

3. **Using the CLI**:
   - Choose option `1` to build a fresh wallet (or option `2` to restore from seed)
   - Fund your wallet using the [Preview Faucet](https://faucet.preview.midnight.network/)
   - Deploy or join a contract
   - Submit or remove feedback

### Option 2: Web UI Interface

1. **Start the Proof Server** (if not already running):
   ```bash
   cd feedback-board-cli
   docker compose -f proof-server-local.yml up -d
   ```

2. **Start the Development Server**:
   ```bash
   # For preprod network
   npm run dev

   # Or from UI directory
   cd feedback-board-ui
   npm run dev
   ```

3. **Open the UI**:
   - Navigate to `http://localhost:5173` (or the port shown in your terminal)
   - Connect your Lace wallet when prompted
   - Deploy or join a contract
   - Submit or remove feedback through the web interface

## Screenshots

_Add screenshots of the application UI here after deployment:_

1. Empty board state
2. Feedback submission form
3. Board with feedback posted
4. Wallet connection dialog
5. Transaction confirmation

## Initial Idea

_This section is a placeholder for the original project idea or inspiration. Fill this in with your project's origin story or requirements._

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `npm install` fails | Ensure you're using Node `v24.11.1` or newer. Clear npm cache with `npm cache clean --force` |
| Contract compilation fails | Ensure the Compact compiler is installed and run `npm run compact` from `contract/` |
| Network connection timeout | CLI requires internet connection. Check your network and retry |
| Token funding takes too long | Wait 1-2 minutes, funding is automatic. Check faucet status |
| "Application not authorized" error | Start proof server: `docker compose -f proof-server-local.yml up -d` |
| Lace wallet not detected | Install Lace wallet browser extension and refresh page. Ensure extension is enabled |
| Docker issues | Ensure Docker Desktop is running, check `docker --version` and `docker ps` |
| Port 6300 in use | Run `docker compose down` then restart services, or change the port in configuration |
| Dependencies won't install | Use Node.js LTS version. For older npm versions, you may need `--legacy-peer-deps` |
| Contract deployment fails | Verify wallet has sufficient balance (tNIGHT and tDUST) and network connection |
| Build fails with TypeScript errors | Run `npm run compact` first to generate contract types, then rebuild |
| "WebSocket is undefined" in UI | Ensure proof server is running and accessible at `http://localhost:6300` |

### Getting Help

- [Midnight Documentation](https://docs.midnight.network/)
- [Midnight Discord](https://discord.gg/midnight)
- [GitHub Issues](https://github.com/midnight-ntwrk/anonymous-feedback-board/issues)

## Notes

- CLI and UI can run simultaneously and share the same proof server
- Proof server (Docker) is required for both CLI and UI to generate zero-knowledge proofs
- Contract must be compiled before building CLI or UI
- Fund your wallet using the testnet faucet before deploying contracts
- Keep your wallet seed secure - never commit it to version control

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## Code of Conduct

This project adheres to the [Code of Conduct](CODE_OF_CONDUCT.md).



