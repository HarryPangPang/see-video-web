import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCreditsBalance } from '../services/api';
import { useI18n } from '../context/I18nContext';
import './Credits.scss';

export const Credits: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const c = t.common;
  const [credits, setCredits] = useState<number>(0);

  const fetchCredits = async () => {
    try {
      const result = await getCreditsBalance();
      if (result.data?.credits !== undefined) {
        setCredits(result.data.credits);
      }
    } catch (err) {
      console.error('Failed to fetch credits:', err);
    }
  };

  useEffect(() => {
    fetchCredits();
    const interval = setInterval(fetchCredits, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="credits-display">
      <div className="credits-balance">
        <span className="credits-icon">💎</span>
        <span className="credits-amount">{credits}</span>
        <span className="credits-label">{c.credits}</span>
      </div>
      <button
        type="button"
        className="credits-recharge-btn"
        onClick={() => navigate('/credit-packs')}
        title={c.recharge}
      >
        {'rechargeShort' in c && c.rechargeShort ? c.rechargeShort : c.recharge}
      </button>
    </div>
  );
};
