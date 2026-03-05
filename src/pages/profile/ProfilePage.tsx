import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DotLoading, Toast } from 'antd-mobile';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { Input, TextArea } from 'antd-mobile';
import {
  getUserProfile, getMyStats, getWorksList, getUserFollowers, getUserFollowing,
  followUser, unfollowUser, getMyLikes,
  type UserProfile, type UserListItem, type WorkItem,
} from '../../services/api';
import './ProfilePage.scss';

const fullUrl = (url: string) =>
  url?.startsWith('http') ? url : `${window.location.origin}${url || ''}`;

const displayName = (name: string | null | undefined) => {
  if (!name) return '?';
  return name.includes('@') ? name.split('@')[0] : name;
};

function ProfileCardMedia({ videoUrl, coverUrl }: {
  videoUrl: string;
  coverUrl?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wantPlayRef = useRef(false);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      wantPlayRef.current = true;
      const video = videoRef.current;
      if (!video) return;
      if (!video.src) video.src = fullUrl(videoUrl);
      video.play().catch(() => {});
    }, 200);
  };

  const handleMouseLeave = () => {
    wantPlayRef.current = false;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setPlaying(false);
    const video = videoRef.current;
    if (video) { video.pause(); video.currentTime = 0; }
  };

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <div className="profile-card-media" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div
        className="profile-card-img"
        style={{
          backgroundImage: coverUrl ? `url(${fullUrl(coverUrl)})` : undefined,
          opacity: playing ? 0 : 1,
        }}
      />
      <video
        ref={videoRef}
        muted
        playsInline
        loop
        preload="none"
        className="profile-card-video"
        style={{ opacity: playing ? 1 : 0 }}
        onPlaying={() => { if (wantPlayRef.current) setPlaying(true); }}
      />
    </div>
  );
}

/** 粉丝/关注列表弹窗 */
function UserListModal({
  title,
  users,
  onClose,
  onUserClick,
}: {
  title: string;
  users: UserListItem[];
  onClose: () => void;
  onUserClick: (id: number) => void;
}) {
  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-modal-header">
          <span className="profile-modal-title">{title}</span>
          <button type="button" className="profile-modal-close" onClick={onClose}>✕</button>
        </div>
        <ul className="profile-modal-list">
          {users.length === 0 && (
            <li className="profile-modal-empty">—</li>
          )}
          {users.map((u) => (
            <li key={u.id} className="profile-modal-item" onClick={() => onUserClick(u.id)}>
              <span className="profile-modal-avatar">{displayName(u.name)[0]?.toUpperCase()}</span>
              <span className="profile-modal-name">{displayName(u.name)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** 编辑资料内联弹窗（仅自己主页使用） */
function EditProfileModal({
  initialName,
  initialBio,
  initialLocation,
  initialWebsite,
  isGoogleUser,
  onSave,
  onClose,
  updateProfile,
  changePassword,
  formLabels,
}: {
  initialName: string;
  initialBio?: string | null;
  initialLocation?: string | null;
  initialWebsite?: string | null;
  isGoogleUser?: boolean;
  onSave: (updates: { name: string; bio?: string | null; location?: string | null; website?: string | null }) => void;
  onClose: () => void;
  updateProfile: (params: { username: string; bio?: string; location?: string; website?: string }) => Promise<void>;
  changePassword: (cur: string, next: string) => Promise<void>;
  formLabels: { bioLabel: string; bioPlaceholder: string; locationLabel: string; locationPlaceholder: string; websiteLabel: string; websitePlaceholder: string };
}) {
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio ?? '');
  const [location, setLocation] = useState(initialLocation ?? '');
  const [website, setWebsite] = useState(initialWebsite ?? '');
  const [saving, setSaving] = useState(false);
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateProfile({
        username: name.trim(),
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
        website: website.trim() || undefined,
      });
      onSave({
        name: name.trim(),
        bio: bio.trim() || null,
        location: location.trim() || null,
        website: website.trim() || null,
      });
    } catch (e) {
      Toast.show({ icon: 'fail', content: (e as Error).message });
    } finally { setSaving(false); }
  };

  const handlePwd = async () => {
    if (!newPwd || newPwd !== confirmPwd) { Toast.show({ icon: 'fail', content: 'Passwords do not match' }); return; }
    if (newPwd.length < 6) { Toast.show({ icon: 'fail', content: 'Password too short' }); return; }
    setPwdSaving(true);
    try {
      await changePassword(curPwd, newPwd);
      Toast.show({ icon: 'success', content: 'Password changed' });
      setCurPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e) {
      Toast.show({ icon: 'fail', content: (e as Error).message });
    } finally { setPwdSaving(false); }
  };

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal profile-modal--edit" onClick={(e) => e.stopPropagation()}>
        <div className="profile-modal-header">
          <span className="profile-modal-title">Edit Profile</span>
          <button type="button" className="profile-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="profile-edit-field">
          <label>Nickname</label>
          <Input value={name} onChange={setName} maxLength={50} className="profile-edit-input" />
        </div>
        <div className="profile-edit-field">
          <label>{formLabels.bioLabel}</label>
          <TextArea value={bio} onChange={setBio} placeholder={formLabels.bioPlaceholder} maxLength={500} rows={3} className="profile-edit-input" />
        </div>
        <div className="profile-edit-field">
          <label>{formLabels.locationLabel}</label>
          <Input value={location} onChange={setLocation} placeholder={formLabels.locationPlaceholder} maxLength={200} className="profile-edit-input" />
        </div>
        <div className="profile-edit-field">
          <label>{formLabels.websiteLabel}</label>
          <Input value={website} onChange={setWebsite} placeholder={formLabels.websitePlaceholder} maxLength={500} className="profile-edit-input" />
        </div>
        <button type="button" className="profile-edit-save-btn" disabled={saving} onClick={handleSave}>
          {saving ? '...' : 'Save'}
        </button>
        <div className="profile-edit-divider" />
        <div className="profile-edit-field">
          <label>Change Password</label>
          {isGoogleUser ? (
            <p className="profile-edit-hint">Google accounts cannot set a password here.</p>
          ) : (
            <>
              <Input type="password" value={curPwd} onChange={setCurPwd} placeholder="Current password" className="profile-edit-input" />
              <Input type="password" value={newPwd} onChange={setNewPwd} placeholder="New password" className="profile-edit-input" />
              <Input type="password" value={confirmPwd} onChange={setConfirmPwd} placeholder="Confirm new password" className="profile-edit-input" />
              <button type="button" className="profile-edit-pwd-btn" disabled={pwdSaving} onClick={handlePwd}>
                {pwdSaving ? '...' : 'Change Password'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { userId: userIdParam } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, updateProfile, changePassword } = useAuth();
  const { t } = useI18n();
  const p = t.seedance.profile;
  const worksT = t.seedance.works;

  // 目标用户 id：有 param 就用 param，否则用自己
  const targetId = userIdParam ? parseInt(userIdParam) : user?.id ?? null;
  const isMe = !userIdParam || (user != null && parseInt(userIdParam) === user.id);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [activeTab, setActiveTab] = useState<'works' | 'likes'>('works');
  const [likes, setLikes] = useState<WorkItem[]>([]);
  const [likesPage, setLikesPage] = useState(1);
  const [likesHasMore, setLikesHasMore] = useState(false);
  const [likesLoading, setLikesLoading] = useState(false);
  const [likesLoaded, setLikesLoaded] = useState(false);

  const [modal, setModal] = useState<'followers' | 'following' | 'edit' | null>(null);
  const [modalUsers, setModalUsers] = useState<UserListItem[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  const load = useCallback(async () => {
    if (!targetId) return;
    setLoadingProfile(true);
    try {
      if (isMe && user) {
        // 自己的主页：用 me/stats 接口获取统计，profile 字段手动填
        const [statsRes, worksRes] = await Promise.all([
          getMyStats(),
          getWorksList({ userId: user.id, sort: 'newest', limit: 50 }),
        ]);
        setProfile({
          id: user.id,
          name: user.username || user.email?.split('@')[0] || '',
          avatar: user.avatar ?? null,
          bio: user.bio ?? null,
          location: user.location ?? null,
          website: user.website ?? null,
          followers: statsRes.data!.followers,
          following: statsRes.data!.following,
          likes_received: statsRes.data!.likes_received,
          is_following: false,
        });
        setWorks(worksRes.data?.list ?? []);
      } else {
        const [profileRes, worksRes] = await Promise.all([
          getUserProfile(targetId),
          getWorksList({ userId: targetId, sort: 'newest', limit: 50 }),
        ]);
        setProfile(profileRes.data!);
        setWorks(worksRes.data?.list ?? []);
      }
    } catch (e) {
      Toast.show({ icon: 'fail', content: (e as Error).message });
    } finally {
      setLoadingProfile(false);
    }
  }, [targetId, isMe, user]);

  useEffect(() => {
    if (authLoading) return; // 等 token 验证完再加载
    if (!targetId) {
      if (!authLoading) navigate('/login', { replace: true });
      return;
    }
    load();
  }, [authLoading, targetId, load]);

  // 自己主页时，侧栏修改资料/头像后同步到 profile 显示
  useEffect(() => {
    if (isMe && profile && user) {
      setProfile(prev => prev ? {
        ...prev,
        avatar: user.avatar ?? null,
        bio: user.bio ?? null,
        location: user.location ?? null,
        website: user.website ?? null,
      } : null);
    }
  }, [isMe, user?.avatar, user?.bio, user?.location, user?.website]);

  const openFollowers = async () => {
    if (!targetId) return;
    setModalLoading(true);
    setModal('followers');
    try {
      const res = await getUserFollowers(targetId);
      setModalUsers(res.data ?? []);
    } catch { setModalUsers([]); }
    finally { setModalLoading(false); }
  };

  const openFollowing = async () => {
    if (!targetId) return;
    setModalLoading(true);
    setModal('following');
    try {
      const res = await getUserFollowing(targetId);
      setModalUsers(res.data ?? []);
    } catch { setModalUsers([]); }
    finally { setModalLoading(false); }
  };

  const handleFollow = async () => {
    if (!user) { navigate('/login'); return; }
    if (!profile) return;
    try {
      if (profile.is_following) {
        const res = await unfollowUser(profile.id);
        setProfile(prev => prev ? { ...prev, is_following: false, followers: res.data!.follower_count } : null);
      } else {
        const res = await followUser(profile.id);
        setProfile(prev => prev ? { ...prev, is_following: true, followers: res.data!.follower_count } : null);
      }
    } catch (e) { Toast.show({ icon: 'fail', content: (e as Error).message }); }
  };

  const handleUserClick = (id: number) => {
    setModal(null);
    navigate(`/profile/${id}`);
  };

  const loadLikes = useCallback(async (page: number) => {
    setLikesLoading(true);
    try {
      const res = await getMyLikes(page, 20);
      const incoming = res.data?.list ?? [];
      setLikes(prev => page === 1 ? incoming : [...prev, ...incoming]);
      setLikesHasMore(res.data?.hasMore ?? false);
      setLikesPage(page);
      setLikesLoaded(true);
    } catch (e) {
      Toast.show({ icon: 'fail', content: (e as Error).message });
    } finally {
      setLikesLoading(false);
    }
  }, []);

  const handleTabChange = (tab: 'works' | 'likes') => {
    setActiveTab(tab);
    if (tab === 'likes' && !likesLoaded) {
      loadLikes(1);
    }
  };

  const handleWorkClick = (workId: string) => navigate(`/works/${workId}`);

  // 等 auth loading
  if (authLoading) {
    return (
      <div className="profile-page profile-loading">
        <DotLoading color="primary" />
      </div>
    );
  }

  // /profile（无 param）但未登录
  if (!targetId) {
    navigate('/login', { replace: true });
    return null;
  }

  if (loadingProfile) {
    return (
      <div className="profile-page profile-loading">
        <DotLoading color="primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page profile-loading">
        <p>{p.notFound}</p>
        <button type="button" className="profile-back-btn" onClick={() => navigate(-1)}>{p.back}</button>
      </div>
    );
  }

  const avatarLetter = displayName(profile.name)[0]?.toUpperCase() ?? '?';
  const avatarUrl = profile.avatar ? fullUrl(profile.avatar) : null;

  return (
    <div className="profile-page">
      {/* 弹窗 */}
      {modal === 'followers' && (
        <UserListModal
          title={p.followersTitle}
          users={modalLoading ? [] : modalUsers}
          onClose={() => setModal(null)}
          onUserClick={handleUserClick}
        />
      )}
      {modal === 'following' && (
        <UserListModal
          title={p.followingTitle}
          users={modalLoading ? [] : modalUsers}
          onClose={() => setModal(null)}
          onUserClick={handleUserClick}
        />
      )}
      {modal === 'edit' && (
        <EditProfileModal
          initialName={profile.name}
          initialBio={profile.bio}
          initialLocation={profile.location}
          initialWebsite={profile.website}
          isGoogleUser={user?.isGoogleUser}
          onClose={() => setModal(null)}
          onSave={(updates) => { setProfile(prev => prev ? { ...prev, ...updates } : null); setModal(null); }}
          updateProfile={updateProfile}
          changePassword={changePassword}
          formLabels={{
            bioLabel: t.seedance.layout.bioLabel,
            bioPlaceholder: t.seedance.layout.bioPlaceholder,
            locationLabel: t.seedance.layout.locationLabel,
            locationPlaceholder: t.seedance.layout.locationPlaceholder,
            websiteLabel: t.seedance.layout.websiteLabel,
            websitePlaceholder: t.seedance.layout.websitePlaceholder,
          }}
        />
      )}

      <div className="profile-hero">
        <div className="profile-hero-top">
          <div className="profile-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="profile-avatar-img" />
            ) : (
              <span className="profile-avatar-letter">{avatarLetter}</span>
            )}
          </div>
          <h1 className="profile-name">{displayName(profile.name)}</h1>
          {isMe ? (
            <button type="button" className="profile-edit-btn" onClick={() => setModal('edit')}>
              {p.editProfile}
            </button>
          ) : (
            !authLoading && user && (
              <button
                type="button"
                className={`profile-follow-btn${profile.is_following ? ' profile-follow-btn--following' : ''}`}
                onClick={handleFollow}
              >
                {profile.is_following ? worksT.following : worksT.follow}
              </button>
            )
          )}
        </div>
        <div className="profile-stats">
          <button type="button" className="profile-stat" onClick={openFollowers}>
            <span className="profile-stat-num">{profile.followers}</span>
            <span className="profile-stat-label">{p.followers}</span>
          </button>
          <button type="button" className="profile-stat" onClick={openFollowing}>
            <span className="profile-stat-num">{profile.following}</span>
            <span className="profile-stat-label">{p.following}</span>
          </button>
          <div className="profile-stat profile-stat--plain">
            <span className="profile-stat-num">{profile.likes_received}</span>
            <span className="profile-stat-label">{p.likesReceived}</span>
          </div>
        </div>
        {(profile.bio || profile.location || profile.website) && (
          <div className="profile-meta">
            {profile.bio && <p className="profile-bio">{profile.bio}</p>}
            {(profile.location || profile.website) && (
              <div className="profile-links">
                {profile.location && <span className="profile-location">{profile.location}</span>}
                {profile.website && (
                  <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="profile-website">
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="profile-works-section">
        <div className="profile-tabs">
          <button
            type="button"
            className={`profile-tab${activeTab === 'works' ? ' profile-tab--active' : ''}`}
            onClick={() => handleTabChange('works')}
          >
            {p.tabWorks}
          </button>
          {isMe && (
            <button
              type="button"
              className={`profile-tab${activeTab === 'likes' ? ' profile-tab--active' : ''}`}
              onClick={() => handleTabChange('likes')}
            >
              {p.tabLikes}
            </button>
          )}
        </div>

        {activeTab === 'works' && (
          works.length === 0 ? (
            <p className="profile-works-empty">{p.noWorks}</p>
          ) : (
            <div className="profile-works-grid">
              {works.map((w) => (
                <button key={w.id} type="button" className="profile-work-card" onClick={() => handleWorkClick(w.id)}>
                  <div className="profile-card-cover">
                    <ProfileCardMedia videoUrl={w.video_url} coverUrl={w.cover_url ?? undefined} />
                    <div className="profile-card-overlay" />
                  </div>
                  <div className="profile-card-body">
                    <div className="profile-work-title">{w.title || '—'}</div>
                  </div>
                </button>
              ))}
            </div>
          )
        )}

        {activeTab === 'likes' && (
          likesLoading && likes.length === 0 ? (
            <div className="profile-works-empty"><DotLoading color="primary" /></div>
          ) : likes.length === 0 ? (
            <p className="profile-works-empty">{p.noLikes}</p>
          ) : (
            <>
              <div className="profile-works-grid">
                {likes.map((w) => (
                  <button key={w.id} type="button" className="profile-work-card" onClick={() => handleWorkClick(w.id)}>
                    <div className="profile-card-cover">
                      <ProfileCardMedia videoUrl={w.video_url} coverUrl={w.cover_url ?? undefined} />
                      <div className="profile-card-overlay" />
                    </div>
                    <div className="profile-card-body">
                      <div className="profile-work-title">{w.title || '—'}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="profile-load-more">
                {likesHasMore ? (
                  <button
                    type="button"
                    className="profile-load-more-btn"
                    disabled={likesLoading}
                    onClick={() => loadLikes(likesPage + 1)}
                  >
                    {likesLoading ? '...' : p.loadMore}
                  </button>
                ) : (
                  <span className="profile-no-more">{p.noMore}</span>
                )}
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}
