import React, { useState, useEffect } from 'react';
import { http, createConfig, WagmiProvider, useAccount, useConnect, useDisconnect, useReadContract, useWriteContract, useWatchContractEvent, usePublicClient } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { formatEther, parseEther } from 'viem';

const contractABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_SUPPLY",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalMinted",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "transfer",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "burn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "to", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "TokensMinted",
    "type": "event"
  }
];

const contractAddress = '0x921ae595754734eB0e3a232db5593D8B7334157C';

const config = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http()
  }
});

const queryClient = new QueryClient();

// Анимированный фон с частицами
const ParticleBackground = () => {
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    style: {
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 5}s`,
      animationDuration: `${3 + Math.random() * 4}s`,
      width: `${2 + Math.random() * 4}px`,
      height: `${2 + Math.random() * 4}px`
    }
  }));

  return (
    <div className="particles">
      {particles.map((p) => (
        <div key={p.id} className="particle" style={p.style} />
      ))}
    </div>
  );
};

// Спinner компонент
const Spinner = () => (
  <div className="spinner">
    <div className="spinner-ring"></div>
  </div>
);

// Toast уведомление
const Toast = ({ type, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-icon">{type === 'success' ? '🎉' : '💥'}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose}>×</button>
    </div>
  );
};

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <MainApp />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

function MainApp() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContract } = useWriteContract();
  const publicClient = usePublicClient();
  
  const [mintAddress, setMintAddress] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [transferAddress, setTransferAddress] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [burnAmount, setBurnAmount] = useState('');
  const [events, setEvents] = useState([]);
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  const { data: maxSupply } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'MAX_SUPPLY'
  });

  const { data: totalMinted, refetch: refetchTotalMinted } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'totalMinted'
  });

  const { data: userBalance, refetch: refetchBalance } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!address }
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: contractABI,
    eventName: 'TokensMinted',
    onLogs(logs) {
      logs.forEach(log => {
        const newEvent = {
          txHash: log.transactionHash,
          to: log.args.to,
          amount: formatEther(log.args.amount),
          timestamp: Date.now()
        };
        setEvents(prev => [newEvent, ...prev].slice(0, 10));
      });
      refetchTotalMinted();
      refetchBalance();
    }
  });

  useEffect(() => {
    if (isConnected) {
      loadInitialEvents();
    }
  }, [isConnected]);

  const loadInitialEvents = async () => {
    if (!publicClient) return;
    try {
      const logs = await publicClient.getLogs({
        address: contractAddress,
        event: {
          type: 'event',
          name: 'TokensMinted',
          inputs: [
            { type: 'address', name: 'to', indexed: true },
            { type: 'uint256', name: 'amount', indexed: false }
          ]
        },
        fromBlock: 0n,
        toBlock: 'latest'
      });
      const formattedEvents = logs.map(log => ({
        txHash: log.transactionHash,
        to: log.args.to,
        amount: formatEther(log.args.amount),
        timestamp: Date.now()
      }));
      setEvents(formattedEvents.slice(0, 10));
    } catch (err) {
      console.error('Error loading events:', err);
    }
  };

  const handleConnect = async () => {
    try {
      await connect({ connector: injected() });
      showToast('success', 'Wallet connected successfully!');
    } catch (err) {
      showToast('error', 'Failed to connect wallet');
    }
  };

  const handleMint = async () => {
    if (!mintAddress || !mintAmount) {
      showToast('error', 'Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      const tx = await writeContract({
        address: contractAddress,
        abi: contractABI,
        functionName: 'mint',
        args: [mintAddress, parseEther(mintAmount)]
      });
      showToast('success', `Successfully minted ${mintAmount} BST!`);
      setMintAddress('');
      setMintAmount('');
      await refetchTotalMinted();
      await refetchBalance();
    } catch (err) {
      showToast('error', err.message || 'Error minting tokens');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferAddress || !transferAmount) {
      showToast('error', 'Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      const tx = await writeContract({
        address: contractAddress,
        abi: contractABI,
        functionName: 'transfer',
        args: [transferAddress, parseEther(transferAmount)]
      });
      showToast('success', `Successfully transferred ${transferAmount} BST!`);
      setTransferAddress('');
      setTransferAmount('');
      await refetchBalance();
    } catch (err) {
      showToast('error', err.message || 'Error transferring tokens');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBurn = async () => {
    if (!burnAmount) {
      showToast('error', 'Please enter amount to burn');
      return;
    }
    setIsLoading(true);
    try {
      const tx = await writeContract({
        address: contractAddress,
        abi: contractABI,
        functionName: 'burn',
        args: [parseEther(burnAmount)]
      });
      showToast('success', `Successfully burned ${burnAmount} BST!`);
      setBurnAmount('');
      await refetchBalance();
      await refetchTotalMinted();
    } catch (err) {
      showToast('error', err.message || 'Error burning tokens');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const progressPercent = maxSupply && totalMinted 
    ? (Number(formatEther(totalMinted)) / Number(formatEther(maxSupply))) * 100 
    : 0;

  const timeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="app-container">
      <ParticleBackground />
      
      {toast && (
        <Toast 
          type={toast.type} 
          message={toast.message} 
          onClose={() => setToast(null)} 
        />
      )}

      <nav className="navbar">
        <div className="nav-content">
          <div className="nav-brand">
            <div className="logo-icon">🚀</div>
            <div className="logo-text">
              <span className="logo-title">Booster</span>
              <span className="logo-subtitle">Token Protocol</span>
            </div>
          </div>
          
          <div className="nav-actions">
            {!isConnected ? (
              <button className="connect-btn" onClick={handleConnect}>
                <span className="btn-icon">⚡</span>
                Connect Wallet
              </button>
            ) : (
              <div className="wallet-badge">
                <div className="wallet-status"></div>
                <span className="wallet-address">{formatAddress(address)}</span>
                <div className="wallet-balance">
                  {userBalance !== undefined ? (
                    `${Number(formatEther(userBalance)).toFixed(2)} BST`
                  ) : (
                    <Spinner />
                  )}
                </div>
                <button className="disconnect-btn" onClick={() => disconnect()}>
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="main-content">
        {!isConnected ? (
          <div className="welcome-screen">
            <div className="welcome-card">
              <div className="welcome-icon">🌌</div>
              <h1 className="welcome-title">Welcome to Booster Protocol</h1>
              <p className="welcome-text">
                Connect your wallet to start managing your BST tokens, execute transfers, 
                and explore the full power of decentralized finance.
              </p>
              <div className="feature-grid">
                <div className="feature-item">
                  <span className="feature-emoji">🔨</span>
                  <span>Mint</span>
                </div>
                <div className="feature-item">
                  <span className="feature-emoji">💸</span>
                  <span>Transfer</span>
                </div>
                <div className="feature-item">
                  <span className="feature-emoji">🔥</span>
                  <span>Burn</span>
                </div>
                <div className="feature-item">
                  <span className="feature-emoji">📊</span>
                  <span>Track</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="dashboard-layout">
            <div className="tab-navigation">
              <button 
                className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <span className="tab-icon">📊</span>
                Dashboard
              </button>
              <button 
                className={`tab-btn ${activeTab === 'actions' ? 'active' : ''}`}
                onClick={() => setActiveTab('actions')}
              >
                <span className="tab-icon">⚡</span>
                Actions
              </button>
              <button 
                className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                <span className="tab-icon">📜</span>
                History
              </button>
            </div>

            {activeTab === 'dashboard' && (
              <div className="dashboard-grid">
                <div className="dashboard-card glass-card">
                  <div className="card-header">
                    <h3>Supply Progress</h3>
                    <span className="badge badge-purple">Live</span>
                  </div>
                  <div className="card-body">
                    <div className="supply-stats">
                      <div className="stat-row">
                        <span className="stat-label">Minted</span>
                        <span className="stat-value">
                          {totalMinted ? Number(formatEther(totalMinted)).toLocaleString() : <Spinner />}
                        </span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">Max Supply</span>
                        <span className="stat-value">
                          {maxSupply ? Number(formatEther(maxSupply)).toLocaleString() : <Spinner />}
                        </span>
                      </div>
                    </div>
                    <div className="progress-container">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${Math.min(progressPercent, 100)}%` }}
                        />
                      </div>
                      <span className="progress-label">{progressPercent.toFixed(2)}% Minted</span>
                    </div>
                  </div>
                </div>

                <div className="dashboard-card glass-card">
                  <div className="card-header">
                    <h3>Your Balance</h3>
                    <span className="badge badge-green">Active</span>
                  </div>
                  <div className="card-body">
                    <div className="balance-display">
                      <div className="balance-amount">
                        {userBalance !== undefined ? (
                          Number(formatEther(userBalance)).toFixed(2)
                        ) : (
                          <Spinner />
                        )}
                      </div>
                      <div className="balance-currency">BST</div>
                    </div>
                    <div className="balance-details">
                      <div className="detail-item">
                        <span>Share of Supply</span>
                        <span>
                          {userBalance && maxSupply
                            ? `${((Number(formatEther(userBalance)) / Number(formatEther(maxSupply))) * 100).toFixed(4)}%`
                            : '...'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dashboard-card glass-card">
                  <div className="card-header">
                    <h3>Network Info</h3>
                    <span className="badge badge-blue">Sepolia</span>
                  </div>
                  <div className="card-body">
                    <div className="network-stats">
                      <div className="network-stat">
                        <div className="stat-icon">⛓️</div>
                        <div className="stat-info">
                          <span className="stat-label">Chain</span>
                          <span className="stat-value">Sepolia Testnet</span>
                        </div>
                      </div>
                      <div className="network-stat">
                        <div className="stat-icon">📝</div>
                        <div className="stat-info">
                          <span className="stat-label">Contract</span>
                          <span className="stat-value">{formatAddress(contractAddress)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'actions' && (
              <div className="actions-grid">
                <div className="action-card glass-card">
                  <div className="action-icon">🔨</div>
                  <h3 className="action-title">Mint Tokens</h3>
                  <p className="action-desc">Create new BST tokens (Authority only)</p>
                  <div className="input-group">
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="Recipient Address (0x...)" 
                      value={mintAddress}
                      onChange={(e) => setMintAddress(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <input 
                      type="number" 
                      className="glass-input" 
                      placeholder="Amount in BST" 
                      value={mintAmount}
                      onChange={(e) => setMintAmount(e.target.value)}
                    />
                  </div>
                  <button 
                    className="action-btn mint-btn" 
                    onClick={handleMint}
                    disabled={isLoading}
                  >
                    {isLoading ? <Spinner /> : 'Mint Tokens'}
                  </button>
                </div>

                <div className="action-card glass-card">
                  <div className="action-icon">💸</div>
                  <h3 className="action-title">Transfer Tokens</h3>
                  <p className="action-desc">Send BST tokens to another address</p>
                  <div className="input-group">
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="Recipient Address (0x...)" 
                      value={transferAddress}
                      onChange={(e) => setTransferAddress(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <input 
                      type="number" 
                      className="glass-input" 
                      placeholder="Amount in BST" 
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                    />
                  </div>
                  <button 
                    className="action-btn transfer-btn" 
                    onClick={handleTransfer}
                    disabled={isLoading}
                  >
                    {isLoading ? <Spinner /> : 'Transfer'}
                  </button>
                </div>

                <div className="action-card glass-card">
                  <div className="action-icon">🔥</div>
                  <h3 className="action-title">Burn Tokens</h3>
                  <p className="action-desc">Permanently destroy BST tokens</p>
                  <div className="input-group">
                    <input 
                      type="number" 
                      className="glass-input" 
                      placeholder="Amount to burn" 
                      value={burnAmount}
                      onChange={(e) => setBurnAmount(e.target.value)}
                    />
                  </div>
                  <button 
                    className="action-btn burn-btn" 
                    onClick={handleBurn}
                    disabled={isLoading}
                  >
                    {isLoading ? <Spinner /> : 'Burn Tokens'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="history-section glass-card">
                <div className="card-header">
                  <h3>Mint History</h3>
                  <span className="badge badge-purple">{events.length} Events</span>
                </div>
                {events.length > 0 ? (
                  <div className="events-list">
                    {events.map((event, index) => (
                      <div key={index} className="event-item">
                        <div className="event-icon">✨</div>
                        <div className="event-details">
                          <div className="event-main">
                            <span className="event-amount">
                              {Number(event.amount).toLocaleString()} BST
                            </span>
                            <span className="event-arrow">→</span>
                            <span className="event-address">{formatAddress(event.to)}</span>
                          </div>
                          <div className="event-meta">
                            <a 
                              href={`https://sepolia.etherscan.io/tx/${event.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="event-tx"
                            >
                              {formatAddress(event.txHash)}
                            </a>
                            <span className="event-time">{timeAgo(event.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <p>No mint events yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;