import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from 'antd-mobile';
import { createPayment, getCreditsBalance } from '../../services/api';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { LoginDialog } from '../../components/LoginDialog';
import './CreditPacks.scss';

const DISCORD_INVITE_URL = 'https://discord.com/invite/94YKekdH';

interface RechargePlan {
  id: string;
  amount: number;
  credits: number;
  label: string;
  popular?: boolean;
}

function getPayButtonText(
  r: { processing?: string; payAmount?: string },
  loading: boolean,
  amount: number
): string {
  if (loading && r.processing) return r.processing;
  const template = r.payAmount ?? 'Pay $%s';
  return template.replace('%s', String(amount));
}

export const CreditPacks: React.FC = () => {
  const navigate = useNavigate();
  const { t, $l } = useI18n();
  const { user } = useAuth();
  const r = t.seedance.recharge;
  const c = t.common;

  const rechargePlans: RechargePlan[] = [
    { id: 'plan_1', amount: 1, credits: 1, label: r.planPayPerUse, popular: true },
    { id: 'plan_10', amount: 10, credits: 10, label: r.planStandard },
    { id: 'plan_30', amount: 30, credits: 30, label: r.planStandard },
    { id: 'plan_50', amount: 50, credits: 50, label: r.planProfessional },
  ];

  const [credits, setCredits] = useState<number>(0);
  const [selectedPlan, setSelectedPlan] = useState<RechargePlan | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginDialogVisible, setLoginDialogVisible] = useState(false);

  useEffect(() => {
    getCreditsBalance()
      .then((res) => {
        if (res.data?.credits !== undefined) setCredits(res.data.credits);
      })
      .catch(() => {});
  }, []);

  const handlePlanClick = (plan: RechargePlan) => {
    if (!user) {
      setLoginDialogVisible(true);
      return;
    }
    setSelectedPlan(plan);
    setConfirmVisible(true);
  };

  const handleConfirmPay = async () => {
    if (!selectedPlan) return;
    setLoading(true);
    try {
      const result = await createPayment(selectedPlan.amount, selectedPlan.credits);
      if (result.data?.checkoutUrl) {
        window.open(result.data.checkoutUrl, '_blank');
        Toast.show({ content: $l('seedance.toast.paymentOpened'), icon: 'success', duration: 3000 });
        setConfirmVisible(false);
      }
    } catch (err) {
      Toast.show({ content: err instanceof Error ? err.message : $l('seedance.toast.createOrderFailed'), icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="credit-packs-page">
      {/* Header */}
      <div className="cp-header">
        <button type="button" className="cp-back-btn" onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="cp-header-title">
          <span className="cp-header-icon">💎</span>
          <h1 className="cp-title">Credits</h1>
        </div>
      </div>

      {/* Balance card */}
      <div className="cp-balance-card">
        <span className="cp-balance-label">{r.currentBalance}</span>
        <div className="cp-balance-value">
          <span className="cp-balance-gem">💎</span>
          <span className="cp-balance-num">{credits}</span>
          <span className="cp-balance-unit">{c.credits}</span>
        </div>
      </div>

      {/* Plans grid */}
      <div className="cp-plans-grid">
        {rechargePlans.map((plan) => (
          <button
            key={plan.id}
            type="button"
            className={`cp-plan-card ${plan.popular ? 'cp-plan-card--popular' : ''}`}
            onClick={() => handlePlanClick(plan)}
          >
            {plan.popular && <span className="cp-plan-badge">{r.recommended}</span>}
            <div className="cp-plan-credits">
              <span className="cp-plan-credits-num">{plan.credits}</span>
              <span className="cp-plan-credits-label">{c.credits}</span>
            </div>
            <div className="cp-plan-divider" />
            <div className="cp-plan-price">${plan.amount}</div>
            <div className="cp-plan-label">{plan.label}</div>
            <div className="cp-plan-cta">Buy now</div>
          </button>
        ))}
      </div>

      {/* Info section */}
      <div className="cp-info">
        <p className="cp-info-tip">
          <span className="cp-info-icon">🔒</span>
          {r.stripePoweredBy}
        </p>
        <p className="cp-info-tip">{r.tipShort}</p>
        <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" className="cp-discord-link">
          {r.needHelp ?? 'Need help? Join our Discord'}
        </a>
      </div>

      <LoginDialog
        visible={loginDialogVisible}
        onClose={() => setLoginDialogVisible(false)}
      />

      {/* Confirm purchase overlay */}
      {confirmVisible && selectedPlan && (
        <div className="cp-confirm-overlay" onClick={() => !loading && setConfirmVisible(false)}>
          <div className="cp-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="cp-confirm-icon">💎</div>
            <h2 className="cp-confirm-title">Confirm Purchase</h2>

            <div className="cp-confirm-plan-summary">
              <div className="cp-confirm-plan-credits">
                <span className="cp-confirm-plan-num">{selectedPlan.credits}</span>
                <span className="cp-confirm-plan-unit">{c.credits}</span>
              </div>
              <div className="cp-confirm-plan-price">${selectedPlan.amount}</div>
              <div className="cp-confirm-plan-label">{selectedPlan.label}</div>
            </div>

            <div className="cp-confirm-actions">
              <button
                type="button"
                className="cp-confirm-btn cp-confirm-btn--cancel"
                onClick={() => setConfirmVisible(false)}
                disabled={loading}
              >
                {c.cancel}
              </button>
              <button
                type="button"
                className="cp-confirm-btn cp-confirm-btn--pay"
                onClick={handleConfirmPay}
                disabled={loading}
              >
                {getPayButtonText(r, loading, selectedPlan.amount)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
