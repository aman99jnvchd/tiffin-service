import React from 'react';
import { ArrowDownLeft, ArrowUpRight, ReceiptText } from 'lucide-react';

interface TransactionLedgerProps {
  transactions: any[];
}

export const TransactionLedger: React.FC<TransactionLedgerProps> = ({ transactions }) => {
  if (transactions.length === 0) {
    return (
      <div className="ledger-section">
        <h3 className="ledger-header">Recent Transactions</h3>
        <div className="empty-ledger">
          <ReceiptText size={32} style={{ opacity: 0.5, marginBottom: '12px' }} />
          <div>No transactions yet</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ledger-section">
      <h3 className="ledger-header">Recent Transactions</h3>
      
      <div className="ledger-list">
        {transactions.map((txn: any) => {
          const isCredit = txn.transaction_type === 'credit';
          const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;
          
          return (
            <div key={txn.id} className="ledger-item">
              <div className={`li-icon ${isCredit ? 'credit' : 'debit'}`}>
                <Icon size={20} />
              </div>
              
              <div className="li-details">
                <span className="li-title">{txn.description || (isCredit ? 'Added Funds' : 'Paid for Order')}</span>
                <span className="li-date">
                  {new Date(txn.created_at).toLocaleString('en-US', { 
                    month: 'short', day: 'numeric', year: 'numeric', 
                    hour: 'numeric', minute: '2-digit' 
                  })}
                </span>
              </div>
              
              <div className={`li-amount ${isCredit ? 'credit' : 'debit'}`}>
                {isCredit ? '+' : '-'}₹{Number(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
