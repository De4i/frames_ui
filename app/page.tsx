'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wallet, 
  Key, 
  Send, 
  MessageSquare, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Clipboard,
  Info,
  ArrowRight,
  ShieldCheck,
  Zap,
  LayoutDashboard,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// --- Types & Schemas ---

const configSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  apiToken: z.string().min(1, 'API Token is required'),
});

type ConfigData = z.infer<typeof configSchema>;

interface WalletInfo {
  username: string;
  displayName: string;
  evm?: {
    address: string;
    walletId: string;
    privyWalletId: string;
    balances: any[];
  };
  solana?: {
    address: string;
    walletId: string;
    privyWalletId: string;
    balances: any[];
  };
}

interface Balance {
  asset: string;
  balance: string;
  chainId?: number;
}

interface TransactionResult {
  txHash: string;
  status?: string;
}

// --- Components ---

const Card = ({ children, title, icon: Icon, className = "" }: { children: React.ReactNode, title: string, icon: any, className?: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 ${className}`}
  >
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
        <Icon size={20} />
      </div>
      <h2 className="text-lg font-semibold text-slate-800 tracking-tight">{title}</h2>
    </div>
    {children}
  </motion.div>
);

const InputField = ({ label, id, type = "text", register, error, placeholder, autoComplete }: any) => (
  <div className="space-y-1.5 mb-4">
    <label htmlFor={id} className="text-sm font-medium text-slate-600 ml-1">{label}</label>
    <input
      id={id}
      type={type}
      {...register}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className={`w-full px-4 py-2.5 bg-slate-50 border ${error ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:ring-indigo-100'} rounded-xl focus:outline-none focus:ring-4 transition-all text-slate-700 placeholder:text-slate-400`}
    />
    {error && <p className="text-xs text-red-500 mt-1 ml-1">{error.message}</p>}
  </div>
);

const ActionButton = ({ onClick, loading, icon: Icon, label, variant = "primary", disabled = false }: any) => {
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200",
    secondary: "bg-slate-800 hover:bg-slate-900 text-white shadow-slate-200",
    outline: "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-600"
  };

  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-200 shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant as keyof typeof variants]}`}
    >
      {loading ? <RefreshCw size={18} className="animate-spin" /> : <Icon size={18} />}
      <span>{label}</span>
    </button>
  );
};

// --- Main Page ---

export default function FramesDashboard() {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [logs, setLogs] = useState<{ type: 'info' | 'success' | 'error', message: string, timestamp: string }[]>([]);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [lastFeedbackResponse, setLastFeedbackResponse] = useState<any>(null);
  const [lastTransferResponse, setLastTransferResponse] = useState<any>(null);
  const [lastSolTransferResponse, setLastSolTransferResponse] = useState<any>(null);
  const [lastSolTxHash, setLastSolTxHash] = useState<string | null>(null);



  const { register, handleSubmit, formState: { errors } } = useForm<ConfigData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      username: "",
      apiToken: ""
    }
  });

  const addLog = (type: 'info' | 'success' | 'error', message: string) => {
    setLogs(prev => [{ type, message, timestamp: new Date().toLocaleTimeString() }, ...prev].slice(0, 20));
  };

  const onSaveConfig = (data: ConfigData) => {
    setConfig(data);
    addLog('success', `Config saved for user: ${data.username}`);
  };

  const fetchWalletInfo = useCallback(async () => {
    if (!config) return;
    setLoading(prev => ({ ...prev, wallet: true }));
    try {
      const res = await fetch(`/api/proxy?path=wallets/${config.username}/balances`, {
        headers: { 'Authorization': `Bearer ${config.apiToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch wallet info');
      const data = await res.json();
      setWalletInfo(data);
      
      // Also update balances state if available
      const allBalances: Balance[] = [];
      if (data.evm?.balances) {
        data.evm.balances.forEach((b: any) => {
          allBalances.push({
            asset: b.asset,
            balance: b.displayValues?.native || b.rawValue,
            chainId: b.chain
          });
        });
      }
      if (data.solana?.balances) {
        data.solana.balances.forEach((b: any) => {
          allBalances.push({
            asset: b.asset,
            balance: b.displayValues?.native || b.rawValue,
            chainId: b.chain
          });
        });
      }
      setBalances(allBalances);
      
      addLog('success', `Wallet info & balances fetched for ${data.username}`);
    } catch (err: any) {
      addLog('error', err.message);
    } finally {
      setLoading(prev => ({ ...prev, wallet: false }));
    }
  }, [config]);

  const fetchBalances = useCallback(async () => {
    if (!config) return;
    setLoading(prev => ({ ...prev, balance: true }));
    try {
      const res = await fetch(`/api/proxy?path=wallets/${config.username}/balances`, {
        headers: { 'Authorization': `Bearer ${config.apiToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch balances');
      const data = await res.json();
      setBalances(data);
      addLog('success', `Balances updated: ${data.length} assets found`);
    } catch (err: any) {
      addLog('error', err.message);
    } finally {
      setLoading(prev => ({ ...prev, balance: false }));
    }
  }, [config]);

  useEffect(() => {
    if (config) {
      fetchWalletInfo();
    }
  }, [config, fetchWalletInfo]);

  const signMessage = async () => {
    if (!config) return;
    setLoading(prev => ({ ...prev, sign: true }));
    try {
      const res = await fetch(`/api/proxy?path=wallets/${config.username}/actions/sign-message`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${config.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chain: "ethereum",
          message: "hello from base sepolia test"
        })
      });
      if (!res.ok) throw new Error('Failed to sign message');
      const data = await res.json();
      addLog('success', `Message signed! Signature: ${data.signature?.slice(0, 20)}...`);
    } catch (err: any) {
      addLog('error', err.message);
    } finally {
      setLoading(prev => ({ ...prev, sign: false }));
    }
  };

  const [transferData, setTransferData] = useState({ to: '', amount: '' });
  const [transferSolData, setTransferSolData] = useState({ to: '', amount: '', chain: 'solana' });

  const transferEth = async () => {
    if (!config || !transferData.to || !transferData.amount) return;
    setLoading(prev => ({ ...prev, transfer: true }));
    setLastTxHash(null);
    setTxStatus(null);
    setLastTransferResponse(null);
    
    try {
      // Convert ETH to Wei (1 ETH = 10^18 Wei)
      const ethVal = parseFloat(transferData.amount);
      if (isNaN(ethVal) || ethVal <= 0) throw new Error("Invalid ETH amount");
      
      // Robust conversion to Wei string
      const weiAmount = (BigInt(Math.floor(ethVal * 1000000000)) * BigInt(1000000000)).toString();

      const res = await fetch(`/api/proxy?path=wallets/${config.username}/actions/transfer`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${config.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: transferData.to,
          amount: weiAmount,
          asset: "eth",
          chainId: 84532
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || data.details || 'Transfer failed');
      }
      
      setLastTransferResponse(data);
      setLastTxHash(data.txHash);
      addLog('success', `Transfer initiated! Hash: ${data.txHash}`);
    } catch (err: any) {
      addLog('error', `Transfer Error: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, transfer: false }));
    }
  };

  const requestFaucet = async () => {
    if (!config) return;
    setLoading(prev => ({ ...prev, faucet: true }));
    try {
      const res = await fetch(`/api/proxy?path=wallets/${config.username}/actions/faucet-sol`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${config.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Faucet request failed');
      }
      
      addLog('success', `Faucet request successful! 0.1 SOL sent. Hash: ${data.txHash}`);
    } catch (err: any) {
      addLog('error', `Faucet Error: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, faucet: false }));
    }
  };

  const transferSol = async () => {
    if (!config || !transferSolData.to || !transferSolData.amount) return;
    setLoading(prev => ({ ...prev, transferSol: true }));
    setLastSolTxHash(null);
    setLastSolTransferResponse(null);
    
    try {
      const solVal = parseFloat(transferSolData.amount);
      if (isNaN(solVal) || solVal <= 0) throw new Error("Invalid SOL amount");
      
      // Convert SOL to Lamports (1 SOL = 10^9 Lamports)
      const lamports = (BigInt(Math.round(solVal * 1000000000))).toString();

      const network = transferSolData.chain === 'solana-devnet' ? 'devnet' : 'mainnet';
      const payload = {
        to: transferSolData.to,
        amount: lamports,
        asset: "sol",
        network: network
      };
      
      console.log("SOL Transfer Payload:", payload);

      const res = await fetch(`/api/proxy?path=wallets/${config.username}/actions/transfer-solana`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${config.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) {
        setLastSolTransferResponse(data);
        const errorMsg = data.error || data.message || (typeof data === 'object' ? JSON.stringify(data) : 'SOL Transfer failed');
        throw new Error(errorMsg);
      }
      
      setLastSolTransferResponse(data);
      setLastSolTxHash(data.txHash);
      addLog('success', `SOL Transfer initiated! Hash: ${data.txHash}`);
    } catch (err: any) {
      addLog('error', `SOL Transfer Error: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, transferSol: false }));
    }
  };

  const checkStatus = async (hash: string) => {
    setLoading(prev => ({ ...prev, status: true }));
    try {
      const res = await fetch(`https://sepolia.basescan.org/api?module=transaction&action=gettxreceiptstatus&txhash=${hash}`);
      if (!res.ok) throw new Error('Failed to check status');
      const data = await res.json();
      setTxStatus(data.result?.status === "1" ? "Success" : "Pending/Failed");
      addLog('info', `Tx Status: ${data.result?.status === "1" ? "Confirmed" : "Not confirmed yet"}`);
    } catch (err: any) {
      addLog('error', err.message);
    } finally {
      setLoading(prev => ({ ...prev, status: false }));
    }
  };

  const sendFeedback = async (message: string) => {
    if (!config) return;
    setLoading(prev => ({ ...prev, feedback: true }));
    setLastFeedbackResponse(null);
    try {
      const res = await fetch(`/api/proxy?path=wallets/${config.username}/feedback`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${config.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          category: "feature",
          message,
          context: {
            environment: "ai studio build",
            user: config.username,
            tested_features: ["evm transfer", "base sepolia transaction", "wallet api", "developer testing"]
          }
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to send feedback');
      }
      
      setLastFeedbackResponse(data);
      addLog('success', `Feedback sent! ID: ${data.data?.id || 'N/A'}`);
      setFeedbackText(""); // Clear after success
    } catch (err: any) {
      addLog('error', `Feedback Error: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, feedback: false }));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addLog('info', 'Copied to clipboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Zap size={20} fill="currentColor" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Frames Agent</h1>
          </div>
          <div className="flex items-center gap-4">
            {config && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-full border border-indigo-100">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">{config.username}</span>
              </div>
            )}
            <div className="text-xs text-slate-400 font-medium">Base Sepolia</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Column 1: Config & Wallet Info */}
          <div className="lg:col-span-4 space-y-8">
            {/* 1. Configuration */}
            <Card title="Configuration" icon={Key}>
              <form onSubmit={handleSubmit(onSaveConfig)} className="space-y-4">
                <InputField 
                  label="Username" 
                  id="username" 
                  register={register('username')} 
                  error={errors.username}
                  placeholder=""
                  autoComplete="username"
                />
                <InputField 
                  label="API Token" 
                  id="apiToken" 
                  type="password"
                  register={register('apiToken')} 
                  error={errors.apiToken}
                  placeholder=""
                  autoComplete="current-password"
                />
                <ActionButton 
                  type="submit"
                  label={config ? "Update Config" : "Save Config"} 
                  icon={CheckCircle2} 
                  className="w-full"
                />
              </form>
              <p className="mt-4 text-[10px] text-slate-400 italic leading-tight">
                *Data is only stored in browser memory (not sent to any server other than Frames.ag API).
              </p>
            </Card>

            {/* 2. Wallet Info */}
            <Card title="Wallet Details" icon={Wallet}>
              {!config ? (
                <div className="text-center py-6 text-slate-400">
                  <Info size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Save config to see wallet details</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex gap-2">
                      <ActionButton 
                        onClick={fetchWalletInfo} 
                        loading={loading.wallet} 
                        label="Refresh" 
                        icon={RefreshCw} 
                        variant="outline"
                        className="flex-1"
                      />
                      <a 
                        href="https://frames.ag/activity" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all border border-slate-200"
                      >
                        <ExternalLink size={16} />
                        Explorer
                      </a>
                    </div>
                    {walletInfo && (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                        {walletInfo.evm && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">EVM Details</p>
                            <div className="space-y-2">
                              <div>
                                <p className="text-[9px] text-slate-400">Address</p>
                                <div className="flex items-center justify-between gap-2">
                                  <code className="text-xs font-mono text-indigo-600 break-all">{walletInfo.evm?.address}</code>
                                  <button onClick={() => walletInfo.evm && copyToClipboard(walletInfo.evm.address)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                                    <Clipboard size={14} />
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-[9px] text-slate-400">Wallet ID</p>
                                  <p className="text-[10px] font-mono text-slate-600 truncate">{walletInfo.evm?.walletId}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] text-slate-400">Privy ID</p>
                                  <p className="text-[10px] font-mono text-slate-600 truncate">{walletInfo.evm?.privyWalletId}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {walletInfo.solana && (
                          <div className="pt-3 border-t border-slate-200">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Solana Details</p>
                            <div className="space-y-2">
                              <div>
                                <p className="text-[9px] text-slate-400">Address</p>
                                <div className="flex items-center justify-between gap-2">
                                  <code className="text-xs font-mono text-indigo-600 break-all">{walletInfo.solana?.address}</code>
                                  <button onClick={() => walletInfo.solana && copyToClipboard(walletInfo.solana.address)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                                    <Clipboard size={14} />
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-[9px] text-slate-400">Wallet ID</p>
                                  <p className="text-[10px] font-mono text-slate-600 truncate">{walletInfo.solana?.walletId}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] text-slate-400">Privy ID</p>
                                  <p className="text-[10px] font-mono text-slate-600 truncate">{walletInfo.solana?.privyWalletId}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold text-slate-700">Balances</p>
                      <button onClick={fetchBalances} disabled={loading.balance} className="text-indigo-600 hover:text-indigo-700 text-xs font-medium flex items-center gap-1">
                        <RefreshCw size={12} className={loading.balance ? "animate-spin" : ""} />
                        Refresh
                      </button>
                    </div>
                    {balances.length > 0 ? (
                      <div className="space-y-2">
                        {balances.map((b, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                            <span className="text-xs font-bold text-slate-800 uppercase">{b.asset}</span>
                            <span className="text-sm font-mono font-semibold text-indigo-600">{b.balance}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic text-center py-2">No balances found</p>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Column 2: EVM Actions */}
          <div className="lg:col-span-4 space-y-8">
            <Card title="EVM Actions" icon={Activity}>
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-3">Message Signing</p>
                  <ActionButton 
                    onClick={signMessage} 
                    loading={loading.sign} 
                    disabled={!config}
                    label="Sign Hello Message" 
                    icon={ShieldCheck} 
                    variant="secondary"
                    className="w-full"
                  />
                </div>
                
                <div className="pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-slate-500">Transfer ETH (Base Sepolia)</p>
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Chain ID: 84532</span>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-slate-400 ml-1">Target Address</label>
                      <input 
                        id="targetWallet"
                        placeholder="0x..."
                        value={transferData.to}
                        onChange={(e) => setTransferData(prev => ({ ...prev, to: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-slate-400 ml-1">Amount (ETH)</label>
                      <div className="relative">
                        <input 
                          id="amountEth"
                          type="number"
                          step="0.0001"
                          placeholder="e.g. 0.001"
                          value={transferData.amount}
                          onChange={(e) => setTransferData(prev => ({ ...prev, amount: e.target.value }))}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all text-sm pr-12"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">ETH</span>
                      </div>
                    </div>
                    <ActionButton 
                      onClick={transferEth} 
                      loading={loading.transfer} 
                      disabled={!config || !transferData.to || !transferData.amount}
                      label="Send ETH" 
                      icon={Send} 
                      className="w-full"
                    />
                    
                    {lastTxHash && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase">Last Transaction</span>
                          <a 
                            href={`https://sepolia.basescan.org/tx/${lastTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            View on Basescan <ExternalLink size={10} />
                          </a>
                        </div>
                        <p className="text-[10px] font-mono text-indigo-400 break-all">{lastTxHash}</p>
                        <button 
                          onClick={() => checkStatus(lastTxHash)}
                          disabled={loading.status}
                          className="w-full py-1.5 bg-white border border-indigo-200 rounded-lg text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                        >
                          {loading.status ? <RefreshCw size={10} className="animate-spin" /> : <Activity size={10} />}
                          {txStatus ? `Status: ${txStatus}` : "Check Status"}
                        </button>
                        <a 
                          href={`https://frames.ag/u/${config?.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1 mt-2"
                        >
                          Check Activity on Frames.ag <ExternalLink size={10} />
                        </a>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Column 3: Solana Actions & Feedback */}
          <div className="lg:col-span-4 space-y-8">
            {/* Solana Transfer */}
            <Card title="Solana Actions" icon={Zap}>
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-500">Transfer SOL</p>
                  <select 
                    value={transferSolData.chain || "solana"}
                    onChange={(e) => setTransferSolData(prev => ({ ...prev, chain: e.target.value }))}
                    className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border-none focus:ring-0 cursor-pointer font-bold"
                  >
                    <option value="solana">Mainnet</option>
                    <option value="solana-devnet">Devnet</option>
                  </select>
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-slate-400 ml-1">Target Address</label>
                    <input 
                      id="targetSolWallet"
                      placeholder="Solana Address..."
                      value={transferSolData.to}
                      onChange={(e) => setTransferSolData(prev => ({ ...prev, to: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-slate-400 ml-1">Amount (SOL)</label>
                    <div className="relative">
                      <input 
                        id="amountSol"
                        type="number"
                        step="0.000000001"
                        placeholder="e.g. 0.1"
                        value={transferSolData.amount}
                        onChange={(e) => setTransferSolData(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all text-sm pr-12"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">SOL</span>
                    </div>
                  </div>
                  <ActionButton 
                    onClick={transferSol} 
                    loading={loading.transferSol} 
                    disabled={!config || !transferSolData.to || !transferSolData.amount}
                    label="Send SOL" 
                    icon={Send} 
                    className="w-full"
                  />

                  {transferSolData.chain === 'solana-devnet' && (
                    <button 
                      onClick={requestFaucet}
                      disabled={loading.faucet}
                      className="w-full py-2 px-4 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
                    >
                      {loading.faucet ? (
                        <div className="w-3 h-3 border-2 border-amber-700 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Zap size={14} />
                      )}
                      Request Devnet SOL
                    </button>
                  )}
                  
                  {lastSolTransferResponse && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-xl border space-y-2 ${lastSolTxHash ? 'bg-indigo-50 border-indigo-100' : 'bg-red-50 border-red-100'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase ${lastSolTxHash ? 'text-indigo-600' : 'text-red-600'}`}>
                          {lastSolTxHash ? 'Last SOL Transaction' : 'Transfer Error'}
                        </span>
                        {lastSolTxHash && (
                          <a 
                            href={`https://solscan.io/tx/${lastSolTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            View on Solscan <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                      {lastSolTxHash && (
                        <p className="text-[10px] font-mono text-indigo-400 break-all">{lastSolTxHash}</p>
                      )}
                      <a 
                        href={`https://frames.ag/u/${config?.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1 mt-2"
                      >
                        Check Activity on Frames.ag <ExternalLink size={10} />
                      </a>
                    </motion.div>
                  )}
                </div>
              </div>
            </Card>

            {/* Feedback */}
            <Card title="Feedback" icon={MessageSquare}>
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-500">Share Experience</p>
                </div>
                <textarea 
                  id="feedbackMsg"
                  rows={3}
                  placeholder="Share your experience..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all text-sm mb-3 resize-none"
                />
                <ActionButton 
                  onClick={() => {
                    if (feedbackText) sendFeedback(feedbackText);
                  }} 
                  loading={loading.feedback} 
                  disabled={!config || !feedbackText}
                  label="Send Feedback" 
                  icon={MessageSquare} 
                  variant="ghost"
                  className="w-full"
                />

                {lastFeedbackResponse && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 p-3 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">API Response</span>
                    </div>
                    <pre className="text-[10px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {JSON.stringify(lastFeedbackResponse, null, 2)}
                    </pre>
                  </motion.div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Row 2: Activity Logs */}
        <div className="mt-8">
          <Card title="Activity Logs" icon={LayoutDashboard}>
            <div className="bg-slate-900 rounded-xl overflow-hidden shadow-inner">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Console Output</span>
              </div>
              <div className="h-64 overflow-y-auto p-4 font-mono text-xs space-y-2 scrollbar-thin scrollbar-thumb-slate-700">
                {logs.length === 0 ? (
                  <p className="text-slate-600 italic">Waiting for activity...</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                      <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                      <span className={`
                        ${log.type === 'success' ? 'text-emerald-400' : ''}
                        ${log.type === 'error' ? 'text-red-400' : ''}
                        ${log.type === 'info' ? 'text-indigo-400' : ''}
                      `}>
                        {log.type === 'error' ? '✖' : log.type === 'success' ? '✔' : 'ℹ'} {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-12 border-t border-slate-200">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-slate-400">
            <Zap size={16} />
            <span className="text-sm font-medium">Powered by Frames.ag API</span>
          </div>
          <div className="flex items-center gap-8">
            <a href="https://frames.ag" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1.5">
              Documentation <ExternalLink size={14} />
            </a>
            <a href="https://sepolia.basescan.org" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1.5">
              BaseScan <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
