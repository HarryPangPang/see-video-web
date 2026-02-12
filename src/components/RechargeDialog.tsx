import React, { useState } from 'react';
import { Dialog, Button, Toast } from 'antd-mobile';
import { createPayment } from '../services/api';
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

const rechargePlans: RechargePlan[] = [
  { id: 'plan_1', amount: 1, credits: 1, label: '按次使用', popular: true  },
  { id: 'plan_10', amount: 10, credits: 10, label: '标准套餐'},
  { id: 'plan_30', amount: 30, credits: 30, label: '专业套餐' },
  { id: 'plan_50', amount: 50, credits: 50, label: '企业套餐' },
];

export const RechargeDialog: React.FC<RechargeDialogProps> = ({ visible, onClose, currentCredits = 0 }) => {
  const [selectedPlan, setSelectedPlan] = useState<RechargePlan>(rechargePlans[1]);
  const [loading, setLoading] = useState(false);

  const handleRecharge = async () => {
    setLoading(true);
    try {
      const result = await createPayment(selectedPlan.amount, selectedPlan.credits);
      if (result.data?.checkoutUrl) {
        // 打开支付链接
        window.open(result.data.checkoutUrl, '_blank');
        Toast.show({ content: '已打开支付页面，完成支付后积分将自动到账', icon: 'success', duration: 3000 });
        // 可选：关闭对话框
        // onClose();
      }
    } catch (err) {
      Toast.show({ content: err instanceof Error ? err.message : '创建订单失败', icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title="充值积分"
      content={
        <div className="recharge-dialog-content">
          <div className="recharge-balance">
            <span className="balance-label">当前余额</span>
            <span className="balance-amount">
              <span className="balance-icon">💎</span>
              {currentCredits} 积分
            </span>
          </div>

          <div className="recharge-plans">
            {rechargePlans.map((plan) => (
              <div
                key={plan.id}
                className={`recharge-plan-card ${selectedPlan.id === plan.id ? 'selected' : ''} ${plan.popular ? 'popular' : ''}`}
                onClick={() => setSelectedPlan(plan)}
              >
                {plan.popular && <div className="plan-badge">推荐</div>}
                <div className="plan-credits">
                  <span className="plan-credits-amount">{plan.credits}</span>
                  <span className="plan-credits-label">积分</span>
                </div>
                <div className="plan-price">¥{plan.amount}</div>
                <div className="plan-label">{plan.label}</div>
              </div>
            ))}
          </div>

          <div className="recharge-tips">
            <p>💡 温馨提示：</p>
            <ul>
              <li>每次生成视频消耗 1 积分</li>
              <li>生成失败自动退还积分</li>
              <li>支付完成后积分即时到账</li>
            </ul>
          </div>
        </div>
      }
      actions={[
        {
          key: 'cancel',
          text: '取消',
          onClick: onClose,
        },
        {
          key: 'confirm',
          text: loading ? '处理中...' : `支付 ¥${selectedPlan.amount}`,
          primary: true,
          disabled: loading,
          onClick: handleRecharge,
        },
      ]}
    />
  );
};
