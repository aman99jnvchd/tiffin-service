import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, IndianRupee } from 'lucide-react';
import { rechargeWallet } from '../../api/axios';
import { useToastStore } from '../../store/useToastStore';

interface RechargeSectionProps {
  onRefresh: () => void;
}

const AMOUNTS = [500, 1000, 2000];

export const RechargeSection: React.FC<RechargeSectionProps> = ({ onRefresh }) => {
  const showToast = useToastStore(s => s.showToast);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleChipClick = (amount: number) => {
    setCustomAmount(amount.toString());
  };

  const handleRecharge = async () => {
    const amt = parseFloat(customAmount);
    if (isNaN(amt) || amt <= 0) {
      return showToast("Please enter a valid amount", "error");
    }
    
    setLoading(true);
    try {
      await rechargeWallet(amt);
      showToast(`Successfully added ₹${amt} to your wallet!`, "success");
      setCustomAmount('');
      onRefresh();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to recharge", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="recharge-section">
      <div className="rs-chips">
        {AMOUNTS.map(amt => (
          <div key={amt} className="rs-chip" onClick={() => handleChipClick(amt)}>
            + ₹{amt}
          </div>
        ))}
      </div>

      <div className="rs-input-wrapper">
        <IndianRupee className="rs-input-prefix" size={20} />
        <input 
          type="number" 
          className="rs-input" 
          placeholder="Enter custom amount" 
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
          min="1"
        />
      </div>

      <div className="trust-banner">
        <Sparkles size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
        <strong>Pro Tip:</strong> Pay from your wallet and get an automatic 5% Trust Discount on all daily meals!
      </div>

      <motion.button 
        className="rs-submit" 
        onClick={handleRecharge}
        disabled={loading || !customAmount}
        whileTap={{ scale: 0.98 }}
      >
        {loading ? 'Adding Funds...' : 'Add Funds to Wallet'}
      </motion.button>
    </div>
  );
};
