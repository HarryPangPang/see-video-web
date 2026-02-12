import React, { useState, useEffect } from 'react';
import { getCreditsBalance } from '../services/api';
import { RechargeDialog } from './RechargeDialog';
import './Credits.scss';

export const Credits: React.FC = () => {
  const [credits, setCredits] = useState<number>(0);
  const [rechargeDialogVisible, setRechargeDialogVisible] = useState(false);

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
    // 每30秒刷新一次积分
    const interval = setInterval(fetchCredits, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRechargeClose = () => {
    setRechargeDialogVisible(false);
    // 关闭对话框后刷新积分
    fetchCredits();
  };

  return (
    <>
      <RechargeDialog
        visible={rechargeDialogVisible}
        onClose={handleRechargeClose}
        currentCredits={credits}
      />

      <div className="credits-display">
        <div className="credits-balance">
          <span className="credits-icon">💎</span>
          <span className="credits-amount">{credits}</span>
          <span className="credits-label">积分</span>
        </div>
        <button
          type="button"
          className="credits-recharge-btn"
          onClick={() => setRechargeDialogVisible(true)}
        >
          充值
        </button>
      </div>
    </>
  );
};
