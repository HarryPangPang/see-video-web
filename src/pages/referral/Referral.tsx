import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DotLoading, Toast } from 'antd-mobile';
import { getReferralMe, getReferralTeam, getReferralCommissions, type ReferralMeData, type ReferralCommissionItem, type ReferralTeamItem } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { LoginDialog } from '../../components/LoginDialog';
import { IconShare } from '../../components/Icons';
import './Referral.scss';

function fullUrl(url: string) {
  return url?.startsWith('http') ? url : `${window.location.origin}${url || ''}`;
}

export function Referral() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const r = t.seedance.referral;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReferralMeData | null>(null);
  const [commissions, setCommissions] = useState<ReferralCommissionItem[]>([]);
  const [commissionsTotal, setCommissionsTotal] = useState(0);
  const [teamLevel, setTeamLevel] = useState<1 | 2 | 3>(1);
  const [teamList, setTeamList] = useState<ReferralTeamItem[]>([]);
  const [teamTotal, setTeamTotal] = useState(0);
  const [loginDialogVisible, setLoginDialogVisible] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const loadStats = async () => {
    try {
      const res = await getReferralMe();
      if (res.success && res.data) setStats(res.data);
    } catch (e) {
      Toast.show({ icon: 'fail', content: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const loadCommissions = async () => {
    try {
      const res = await getReferralCommissions(20, 0);
      if (res.success && res.data) {
        setCommissions(res.data.list);
        setCommissionsTotal(res.data.total);
      }
    } catch {
      // ignore
    }
  };

  const loadTeam = async () => {
    try {
      const res = await getReferralTeam(teamLevel, 50, 0);
      if (res.success && res.data) {
        setTeamList(res.data.list);
        setTeamTotal(res.data.total);
      }
    } catch {
      setTeamList([]);
      setTeamTotal(0);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoginDialogVisible(true);
      setLoading(false);
      return;
    }
    loadStats();
  }, [user]);

  useEffect(() => {
    if (user && stats) {
      loadCommissions();
    }
  }, [user, stats]);

  useEffect(() => {
    if (user && stats) {
      loadTeam();
    }
  }, [user, stats, teamLevel]);

  const inviteLink = stats?.inviteCode
    ? `${window.location.origin}${window.location.pathname || '/'}#/register?invite=${encodeURIComponent(stats.inviteCode)}`
    : '';

  const copyInviteLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopySuccess(true);
      Toast.show({ icon: 'success', content: r.copyLinkCopied });
      setTimeout(() => setCopySuccess(false), 2000);
    }).catch(() => {
      Toast.show({ icon: 'fail', content: r.copyFailed });
    });
  };

  const copyInviteCode = () => {
    if (!stats?.inviteCode) return;
    navigator.clipboard.writeText(stats.inviteCode).then(() => {
      Toast.show({ icon: 'success', content: r.copyCodeCopied });
    }).catch(() => Toast.show({ icon: 'fail', content: r.copyFailed }));
  };

  if (!user) {
    return (
      <div className="referral-page">
        <LoginDialog visible={loginDialogVisible} onClose={() => { setLoginDialogVisible(false); navigate('/'); }} />
        <div className="referral-guest">
          <p>{r.loginToView}</p>
          <button type="button" className="referral-guest-btn" onClick={() => setLoginDialogVisible(true)}>{r.goLogin}</button>
        </div>
      </div>
    );
  }

  if (loading || !stats) {
    return (
      <div className="referral-page">
        <div className="referral-loading">
          <DotLoading color="#7c3aed" />
          <span>{r.loading}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="referral-page">
      <header className="referral-header">
        <h1 className="referral-title">
          <IconShare className="referral-title-icon" />
          {r.title}
        </h1>
        <p className="referral-desc">{r.desc}</p>
      </header>

      <section className="referral-card referral-invite">
        <h2>{r.myInvite}</h2>
        <div className="referral-invite-code">
          <span className="referral-invite-label">{r.inviteCode}</span>
          <code className="referral-invite-value">{stats.inviteCode}</code>
          <button type="button" className="referral-btn referral-btn-small" onClick={copyInviteCode}>{r.copy}</button>
        </div>
        <div className="referral-invite-url">
          <span className="referral-invite-label">{r.inviteLink}</span>
          <div className="referral-invite-url-row">
            <input type="text" readOnly value={inviteLink} className="referral-invite-input" />
            <button type="button" className={`referral-btn ${copySuccess ? 'referral-btn-success' : ''}`} onClick={copyInviteLink}>
              {copySuccess ? r.copied : r.copyLink}
            </button>
          </div>
        </div>
      </section>

      <section className="referral-card referral-stats">
        <h2>{r.teamOverview}</h2>
        <div className="referral-stats-grid">
          <div className="referral-stat">
            <span className="referral-stat-value">{stats.level1Count}</span>
            <span className="referral-stat-label">{r.level1}</span>
          </div>
          <div className="referral-stat">
            <span className="referral-stat-value">{stats.level2Count}</span>
            <span className="referral-stat-label">{r.level2}</span>
          </div>
          <div className="referral-stat">
            <span className="referral-stat-value">{stats.level3Count}</span>
            <span className="referral-stat-label">{r.level3}</span>
          </div>
          <div className="referral-stat referral-stat-highlight">
            <span className="referral-stat-value">{stats.totalCommissionEarned}</span>
            <span className="referral-stat-label">{r.totalCommission}</span>
          </div>
        </div>
      </section>

      <section className="referral-card referral-team">
        <h2>{r.teamList}</h2>
        <div className="referral-tabs">
          {([1, 2, 3] as const).map((l) => (
            <button
              key={l}
              type="button"
              className={`referral-tab ${teamLevel === l ? 'active' : ''}`}
              onClick={() => setTeamLevel(l)}
            >
              {r.levelN.replace('{n}', String(l))}
            </button>
          ))}
        </div>
        <div className="referral-team-list">
          {teamList.length === 0 ? (
            <p className="referral-empty">{r.noMembers.replace('{n}', String(teamLevel))}</p>
          ) : (
            <ul>
              {teamList.map((m) => (
                <li key={m.id} className="referral-team-item">
                  <div
                    className="referral-team-avatar"
                    style={m.avatar ? { backgroundImage: `url(${fullUrl(m.avatar)})` } : undefined}
                  >
                    {!m.avatar && (m.username?.[0]?.toUpperCase() || '?')}
                  </div>
                  <span className="referral-team-name">{m.username || `${r.user} ${m.id}`}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="referral-card referral-commissions">
        <h2>{r.commissions}</h2>
        {commissions.length === 0 ? (
          <p className="referral-empty">{r.noCommissions}</p>
        ) : (
          <ul className="referral-commission-list">
            {commissions.map((c) => (
              <li key={c.id} className="referral-commission-item">
                <span className="referral-commission-amount">+{c.amount}</span>
                <span className="referral-commission-desc">{c.description}</span>
                <span className="referral-commission-time">
                  {new Date(c.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="referral-rules">
        <h3>{r.rulesTitle}</h3>
        <ul>
          <li>{r.rule1}</li>
          <li>{r.rule2}</li>
          <li>{r.rule3}</li>
          <li>{r.rule4}</li>
        </ul>
      </section>
    </div>
  );
}
