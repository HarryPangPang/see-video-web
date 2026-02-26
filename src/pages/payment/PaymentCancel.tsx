import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'antd-mobile';
import { useI18n } from '../../context/I18nContext';
import { MainLayout } from '../../layout/MainLayout';
import './PaymentResult.scss';

export function PaymentCancel() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const p = t.seedance?.payment;

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <MainLayout>
      <div className="payment-result-page payment-cancel">
        <div className="result-icon">✕</div>
        <h1 className="result-title">{p?.cancelTitle ?? 'Payment Cancelled'}</h1>
        <p className="result-desc">{p?.cancelDesc ?? 'Your payment was cancelled.'}</p>
        <Button color="primary" onClick={goBack} className="result-btn">
          {p?.backToPage ?? p?.backToHome ?? 'Return to previous page'}
        </Button>
      </div>
    </MainLayout>
  );
}
