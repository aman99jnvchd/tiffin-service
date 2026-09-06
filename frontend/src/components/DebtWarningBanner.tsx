import React, { useEffect, useState } from 'react';
import { getCustomerWallet } from '../api/axios';
import { AlertOctagon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DebtWarningBanner = () => {
  const [debt, setDebt] = useState<number>(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Check wallet balance
    const fetchWallet = async () => {
      try {
        const res = await getCustomerWallet();
        if (res.data.data.balance < 0) {
          setDebt(Math.abs(res.data.data.balance));
        }
      } catch (err) {
        // user might not be logged in or other error
      }
    };
    
    // Check if token exists in localStorage (quick auth check)
    const storeStr = localStorage.getItem('auth-storage');
    if (storeStr) {
      try {
        const state = JSON.parse(storeStr).state;
        if (state && state.token) {
          fetchWallet();
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  if (debt <= 0) return null;

  return (
    <div style={{
      background: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.4)',
      padding: '12px 16px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      margin: '0 24px 16px 24px',
      gap: '12px',
      boxShadow: 'inset 0 0 10px rgba(239, 68, 68, 0.05)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <AlertOctagon size={20} color="#ef4444" />
        <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.9rem', lineHeight: 1.4 }}>
          Your deliveries are paused. Please clear your pending due of <strong>₹{debt}</strong> to resume.
        </span>
      </div>
      <button
        onClick={() => navigate('/wallet')}
        style={{
          background: '#ef4444',
          color: 'white',
          border: 'none',
          padding: '6px 14px',
          borderRadius: '8px',
          fontSize: '0.85rem',
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 10px rgba(239, 68, 68, 0.2)'
        }}
      >
        Pay Now
      </button>
    </div>
  );
};
