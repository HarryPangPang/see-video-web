import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DotLoading, Toast, Button, TextArea } from 'antd-mobile';
import { getWorkDetail, likeWork, unlikeWork, addWorkComment, type WorkDetail as WorkDetailType } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LoginDialog } from '../../components/LoginDialog';
import './WorkDetail.scss';

export function WorkDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [work, setWork] = useState<WorkDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loginVisible, setLoginVisible] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      const res = await getWorkDetail(id);
      if (res.data) setWork(res.data);
    } catch (e) {
      Toast.show({ content: (e as Error).message, icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const fullUrl = (url: string) => (url?.startsWith('http') ? url : `${window.location.origin}${url || ''}`);

  const handleLike = async () => {
    if (!user) {
      setLoginVisible(true);
      return;
    }
    if (!work) return;
    try {
      if (work.liked) {
        const res = await unlikeWork(work.id);
        if (res.data) setWork((w) => w ? { ...w, liked: false, like_count: res.data!.like_count } : null);
      } else {
        const res = await likeWork(work.id);
        if (res.data) setWork((w) => w ? { ...w, liked: true, like_count: res.data!.like_count } : null);
      }
    } catch (e) {
      Toast.show({ content: (e as Error).message, icon: 'fail' });
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      setLoginVisible(true);
      return;
    }
    if (!work || !commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await addWorkComment(work.id, commentText.trim());
      if (res.data) {
        setWork((w) => w ? { ...w, comments: [...w.comments, res.data!] } : null);
        setCommentText('');
        Toast.show({ content: 'Comment added', icon: 'success' });
      }
    } catch (e) {
      Toast.show({ content: (e as Error).message, icon: 'fail' });
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading || !id) {
    return (
      <div className="work-detail-page work-detail-loading">
        <DotLoading color="primary" />
        <p>Loading...</p>
      </div>
    );
  }
  if (!work) {
    return (
      <div className="work-detail-page work-detail-empty">
        <p>Work not found.</p>
        <Button onClick={() => navigate('/plaza')}>Back to Plaza</Button>
      </div>
    );
  }

  return (
    <div className="work-detail-page">
      <LoginDialog visible={loginVisible} onClose={() => setLoginVisible(false)} />
      <div className="work-detail-back">
        <button type="button" onClick={() => navigate('/plaza')}>
          ← Back to Plaza
        </button>
      </div>
      <div className="work-detail-main">
        <div className="work-detail-media">
          <video
            src={fullUrl(work.video_url)}
            controls
            playsInline
            poster={work.cover_url ? fullUrl(work.cover_url) : undefined}
            className="work-detail-video"
          />
        </div>
        <div className="work-detail-info">
          <h1 className="work-detail-title">{work.title}</h1>
          <div className="work-detail-author">
            <span className="wd-avatar">{work.author?.[0]?.toUpperCase() ?? '?'}</span>
            <span className="wd-author-name">{work.author}</span>
          </div>
          {(work.prompt != null && work.prompt !== '') ? (
            <div className="work-detail-prompt">
              <span className="label">Generated prompt</span>
              <p>{work.prompt}</p>
            </div>
          ) : null}
          <div className="work-detail-actions">
            <button
              type="button"
              className={`work-detail-like ${work.liked ? 'liked' : ''}`}
              onClick={handleLike}
            >
              ♥ {work.like_count ?? 0}
            </button>
          </div>
          <div className="work-detail-comments">
            <h3>Comments ({work.comments.length})</h3>
            {user ? (
              <div className="work-detail-comment-form">
                <TextArea
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={setCommentText}
                  rows={2}
                  maxLength={500}
                />
                <Button
                  color="primary"
                  size="small"
                  loading={submittingComment}
                  disabled={!commentText.trim()}
                  onClick={handleSubmitComment}
                >
                  Post
                </Button>
              </div>
            ) : (
              <p className="work-detail-login-hint">Log in to comment.</p>
            )}
            <ul className="work-detail-comment-list">
              {work.comments.map((c) => (
                <li key={c.id}>
                  <strong>{c.author}</strong>
                  <span className="work-detail-comment-time">
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                  <p>{c.content}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
