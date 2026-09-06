import React from 'react';
import { CheckCircle2, Info } from 'lucide-react';

interface BalanceCardProps {
  balance: number;
  isCodRevoked: boolean;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({ balance, isCodRevoked }) => {
  return (
    <div className="balance-card">
      <div className="balance-content">
        <span className="bc-label">Current Balance</span>
        <h1 className={`bc-amount ${balance < 0 ? 'negative' : ''}`}>
          ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h1>
        
        {isCodRevoked ? (
          <div className="cod-badge revoked">
            <Info size={14} /> COD Revoked
            <div className="cod-tooltip">
              Due to a recently missed or rejected delivery, you must use prepaid balance for future orders.
            </div>
          </div>
        ) : (
          <div className="cod-badge eligible">
            <CheckCircle2 size={14} /> COD Eligible
          </div>
        )}
      </div>
    </div>
  );
};
