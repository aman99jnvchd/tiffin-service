import React, { useState, useEffect } from 'react';
import { Wallet, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BalanceCard } from '../components/Wallet/BalanceCard';
import { RechargeSection } from '../components/Wallet/RechargeSection';
import { TransactionLedger } from '../components/Wallet/TransactionLedger';
import { getCustomerWallet } from '../api/axios';
import { useToastStore } from '../store/useToastStore';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { ProfileCircle } from '../components/ProfileCircle';
import '../styles/Wallet.css';
import '../styles/CheckoutPage.css';

export const WalletDashboard: React.FC = () => {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const showToast = useToastStore(s => s.showToast);

  const fetchWallet = async () => {
    try {
      const res = await getCustomerWallet();
      setWallet(res.data.data);
    } catch {
      showToast("Failed to load wallet data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  return (
    <div className="wallet-container">
      <div className="checkout-topbar">
        <button className="checkout-back-btn" onClick={() => navigate('/')}>
          <ChevronLeft size={20} />
        </button>
        <h2 className="checkout-page-title">Tiffini Wallet</h2>
        <ProfileCircle />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px 0' }}>
          <SkeletonLoader type="card" count={1} style={{ height: 120 }} />
          <SkeletonLoader type="list" count={3} />
        </div>
      ) : wallet ? (
        <>
          <div className="wallet-top-row">
            <BalanceCard 
              balance={wallet.balance} 
              isCodRevoked={wallet.is_cod_revoked} 
            />
            <RechargeSection onRefresh={fetchWallet} />
          </div>
          <TransactionLedger transactions={wallet.transactions || []} />
        </>
      ) : null}
    </div>
  );
};
