# 🚀 Booster Token

Full-stack dApp — ERC-20 token with hard emission cap and role-based access control.

## 🔗 Smart Contract (Sepolia Testnet)

- **Address:** `0x921ae595754734eB0e3a232db5593D8B7334157C`
- **Etherscan:** [View verified code](https://sepolia.etherscan.io/address/0x921ae595754734eB0e3a232db5593D8B7334157C)

### Features

- Mint with absolute supply cap via `totalMinted`
- Burn
- Transfer
- Gasless approvals (ERC20Permit)
- Role-based access (AccessManaged)

### Stack

Solidity • OpenZeppelin v5 

## 🖥️ Frontend

React dApp with wallet connection and real-time on-chain event tracking.

### Stack

React • Wagmi v2 • Viem • TanStack Query

### Features

- Connect / Disconnect wallet
- Dashboard with supply progress bar
- Mint (authority only) / Transfer / Burn
- Live transaction history with Etherscan links
- Toast notifications

## 🏗️ Quick Start

```bash
# Frontend
cd frontend
npm install
npm run dev

# Smart Contract
cd contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
