import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DotLoading, Toast } from 'antd-mobile';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { useLayout } from '../../context/LayoutContext';
import {
  getUserProfile, getMyStats, getWorksList, getUserFollowers, getUserFollowing,
  followUser, unfollowUser, getMyLikes,
  type UserProfile, type UserListItem, type WorkItem,
} from '../../services/api';
import { BackgroundPicker } from './BackgroundPicker';
import { getBackgroundStyle } from './presets';
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

/** followers/following list modal */
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
          <button type="button" className="profile-modal-close" onClick={onClose}>&#x2715;</button>
        </div>
        <ul className="profile-modal-list">
          {users.length === 0 && (
            <li className="profile-modal-empty">&mdash;</li>
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

export function ProfilePage() {
  const { userId: userIdParam } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, uploadBackground, removeBackground, setBackground } = useAuth();
  const { openProfileDialog } = useLayout();
  const { t } = useI18n();
  const p = t.seedance.profile;
  const worksT = t.seedance.works;

  // target user id: use param if present, otherwise use self
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

  const [showBgPicker, setShowBgPicker] = useState(false);

  const load = useCallback(async () => {
    if (!targetId) return;
    setLoadingProfile(true);
    try {
      if (isMe && user) {
        // own profile: use me/stats for statistics, fill profile fields manually
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
          background: user.background ?? null,
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
    if (authLoading) return; // wait for token verification before loading
    if (!targetId) {
      if (!authLoading) navigate('/login', { replace: true });
      return;
    }
    load();
  }, [authLoading, targetId, load]);

  // sync user changes to profile display when on own profile page
  useEffect(() => {
    if (isMe && profile && user) {
      setProfile(prev => prev ? {
        ...prev,
        avatar: user.avatar ?? null,
        bio: user.bio ?? null,
        location: user.location ?? null,
        website: user.website ?? null,
        background: user.background ?? null,
      } : null);
    }
  }, [isMe, user?.avatar, user?.bio, user?.location, user?.website, user?.background]);

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

  const handleSelectPreset = async (key: string) => {
    try {
      await setBackground(`preset:${key}`);
      setShowBgPicker(false);
      Toast.show({ content: p.backgroundUpdated });
      setProfile(prev => prev ? { ...prev, background: `preset:${key}` } : null);
    } catch (e) { Toast.show({ icon: 'fail', content: (e as Error).message }); }
  };

  const handleUploadBackground = async (file: File) => {
    try {
      await uploadBackground(file);
      setShowBgPicker(false);
      Toast.show({ content: p.backgroundUpdated });
    } catch (e) { Toast.show({ icon: 'fail', content: (e as Error).message }); }
  };

  const handleResetBackground = async () => {
    try {
      await removeBackground();
      setShowBgPicker(false);
      Toast.show({ content: p.backgroundReset });
      setProfile(prev => prev ? { ...prev, background: null } : null);
    } catch (e) { Toast.show({ icon: 'fail', content: (e as Error).message }); }
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

  // wait for auth loading
  if (authLoading) {
    return (
      <div className="profile-page profile-loading">
        <DotLoading color="primary" />
      </div>
    );
  }

  // /profile (no param) but not logged in
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
      {/* modals */}
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

      {showBgPicker && (
        <BackgroundPicker
          currentBackground={profile.background ?? null}
          onSelectPreset={handleSelectPreset}
          onUpload={handleUploadBackground}
          onReset={handleResetBackground}
          onClose={() => setShowBgPicker(false)}
        />
      )}

      <div className="profile-banner" style={getBackgroundStyle(profile.background)}>
        {isMe && (
          <button type="button" className="profile-banner-edit" onClick={() => setShowBgPicker(true)}>
            {p.changeBackground}
          </button>
        )}
      </div>

      <div className="profile-hero">
        <div className="profile-hero-top">
          <div className="profile-avatar profile-avatar--banner">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="profile-avatar-img" />
            ) : (
              <span className="profile-avatar-letter">{avatarLetter}</span>
            )}
          </div>
          <div className="profile-hero-actions">
            <h1 className="profile-name">{displayName(profile.name)}</h1>
            {isMe ? (
              <button type="button" className="profile-edit-btn" onClick={openProfileDialog}>
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
