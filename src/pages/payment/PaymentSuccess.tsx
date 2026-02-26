import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'antd-mobile';
import { useI18n } from '../../context/I18nContext';
import { MainLayout } from '../../layout/MainLayout';
import './PaymentResult.scss';

const DISCORD_INVITE_URL = 'https://discord.com/invite/94YKekdH';

export function PaymentSuccess() {
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
      <div className="payment-result-page payment-success">
        <div className="result-icon">✓</div>
        <h1 className="result-title">{p?.successTitle ?? 'Payment Successful'}</h1>
        <p className="result-desc">
          {p?.successDesc ??
            'Please go back to the previous page and refresh to check if your credits have been added. If they have not arrived, please contact us via Discord.'}
        </p>
        <a
          href={DISCORD_INVITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="result-link result-discord-link"
        >
          {p?.joinDiscord ?? 'Join Discord'}
        </a>
        <Button color="primary" onClick={goBack} className="result-btn">
          {p?.backToPage ?? p?.backToHome ?? 'Return to previous page'}
        </Button>
      </div>
    </MainLayout>
  );
}
