import React, { useState } from 'react';
import { Dialog, Button, Toast } from 'antd-mobile';
import { createPayment } from '../services/api';
import { useI18n } from '../context/I18nContext';
import './RechargeDialog.scss';

const DISCORD_INVITE_URL = 'https://discord.com/invite/94YKekdH';

interface RechargeDialogProps {
  visible: boolean;
  onClose: () => void;
  currentCredits?: number;
}

interface RechargePlan {
  id: string;
  amount: number;
  credits: number;
  label: string;
  popular?: boolean;
}

function getPayButtonText(
  r: { processing?: string; payTest?: string; payAmount?: string },
  loading: boolean,
  amount: number
): string {
  if (loading && r.processing) return r.processing;
  if (amount === -1) return r.payTest ?? 'Test payment';
  const template = r.payAmount ?? 'Pay $%s';
  return template.replace('%s', String(amount));
}

export const RechargeDialog: React.FC<RechargeDialogProps> = ({ visible, onClose, currentCredits = 0 }) => {
  const { t, $l } = useI18n();
  const r = t.seedance.recharge;
  const c = t.common;

  const rechargePlans: RechargePlan[] = [
    { id: 'plan_test', amount: -1, credits: 1, label: r.planTest, popular: true },
    { id: 'plan_1', amount: 1, credits: 1, label: r.planPayPerUse, popular: false },
    { id: 'plan_10', amount: 10, credits: 10, label: r.planStandard },
    { id: 'plan_30', amount: 30, credits: 30, label: r.planStandard },
    { id: 'plan_50', amount: 50, credits: 50, label: r.planProfessional },
  ];

  const [selectedPlan, setSelectedPlan] = useState<RechargePlan>(rechargePlans[0]);
  const [loading, setLoading] = useState(false);

  const handleRecharge = async () => {
    setLoading(true);
    try {
      const result = await createPayment(selectedPlan.amount, selectedPlan.credits);
      if (result.data?.checkoutUrl) {
        window.open(result.data.checkoutUrl, '_blank');
        Toast.show({ content: $l('seedance.toast.paymentOpened'), icon: 'success', duration: 3000 });
      }
    } catch (err) {
      Toast.show({ content: err instanceof Error ? err.message : $l('seedance.toast.createOrderFailed'), icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount: number) => {
    if (amount === -1) return 'Free';
    return `$${amount}`;
  };

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={r.title}
      content={
        <div className="recharge-dialog-content">
          <div className="recharge-balance">
            <span className="balance-label">{r.currentBalance}</span>
            <span className="balance-amount">
              <span className="balance-icon">💎</span>
              {currentCredits} {c.credits}
            </span>
          </div>

          <div className="recharge-plans">
            {rechargePlans.map((plan) => (
              <div
                key={plan.id}
                className={`recharge-plan-card ${selectedPlan.id === plan.id ? 'selected' : ''} ${plan.popular ? 'popular' : ''}`}
                onClick={() => setSelectedPlan(plan)}
              >
                {plan.popular && <div className="plan-badge">{r.recommended}</div>}
                <div className="plan-credits">
                  <span className="plan-credits-amount">{plan.credits}</span>
                  <span className="plan-credits-label">{c.credits}</span>
                </div>
                <div className="plan-price">{formatPrice(plan.amount)}</div>
                <div className="plan-label">{plan.label}</div>
              </div>
            ))}
          </div>

          <div className="recharge-tips">
            <p className="recharge-tip-short">{r.tipShort}</p>
            {r.stripePoweredBy && (
              <p className="recharge-stripe-brand">🔒 {r.stripePoweredBy}</p>
            )}
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="recharge-discord-link"
            >
              {r.needHelp ?? 'Need help? Join our Discord'}
            </a>
          </div>
        </div>
      }
      actions={[
        [
          { key: 'cancel', text: c.cancel, onClick: onClose },
          {
            key: 'confirm',
            text: getPayButtonText(r, loading, selectedPlan.amount),
            primary: true,
            disabled: loading,
            onClick: handleRecharge,
          },
        ],
      ]}
    />
  );
};
