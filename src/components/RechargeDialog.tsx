import React, { useState } from 'react';
import { Dialog, Button, Toast } from 'antd-mobile';
import { createPayment } from '../services/api';
import { useI18n } from '../context/I18nContext';
import './RechargeDialog.scss';

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

export const RechargeDialog: React.FC<RechargeDialogProps> = ({ visible, onClose, currentCredits = 0 }) => {
  const { t, $l } = useI18n();
  const r = t.seedance.recharge;
  const c = t.common;

  const rechargePlans: RechargePlan[] = [
    { id: 'plan_test', amount: -1, credits: 1, label: r.planTest, popular: true  },
    { id: 'plan_1', amount: 1, credits: 1, label: r.planPayPerUse, popular: false  },
    { id: 'plan_10', amount: 10, credits: 10, label: r.planStandard},
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
        // 打开支付链接
        window.open(result.data.checkoutUrl, '_blank');
        Toast.show({ content: $l('seedance.toast.paymentOpened'), icon: 'success', duration: 3000 });
        // 可选：关闭对话框
        // onClose();
      }
    } catch (err) {
      Toast.show({ content: err instanceof Error ? err.message : $l('seedance.toast.createOrderFailed'), icon: 'fail' });
    } finally {
      setLoading(false);
    }
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
                <div className="plan-price">${plan.amount}</div>
                <div className="plan-label">{plan.label}</div>
              </div>
            ))}
          </div>

          <div className="recharge-tips">
            <p>{r.tips}</p>
            <ul>
              <li>{r.tip1}</li>
              <li>{r.tip2}</li>
              <li>{r.tip3}</li>
            </ul>
            {r.stripePoweredBy && (
              <p className="recharge-stripe-brand">🔒 {r.stripePoweredBy}</p>
            )}
          </div>
        </div>
      }
      actions={[
        {
          key: 'cancel',
          text: c.cancel,
          onClick: onClose,
        },
        {
          key: 'confirm',
          text: loading ? r.processing : r.pay.replace(/\$\{amount\}|\{amount\}/g, selectedPlan.amount === -1 ? '0' : selectedPlan.amount.toString()),
          primary: true,
          disabled: loading,
          onClick: handleRecharge,
        },
      ]}
    />
  );
};
