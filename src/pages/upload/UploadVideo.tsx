import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Toast } from 'antd-mobile';
import { publishWorkUpload } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LoginDialog } from '../../components/LoginDialog';
import './UploadVideo.scss';

export function UploadVideo() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginVisible, setLoginVisible] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.type.startsWith('video/')) {
      setFile(f);
    } else if (f) {
      Toast.show({ content: 'Please select a video file', icon: 'fail' });
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      setLoginVisible(true);
      return;
    }
    if (!title.trim()) {
      Toast.show({ content: 'Please enter a title', icon: 'fail' });
      return;
    }
    if (!file) {
      Toast.show({ content: 'Please select a video file', icon: 'fail' });
      return;
    }
    setLoading(true);
    try {
      const res = await publishWorkUpload(file, title.trim());
      Toast.show({ content: 'Published to Plaza!', icon: 'success' });
      navigate(res.data?.id ? `/works/${res.data.id}` : '/plaza');
    } catch (e) {
      Toast.show({ content: (e as Error).message, icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-video-page">
      <LoginDialog visible={loginVisible} onClose={() => setLoginVisible(false)} />
      <div className="upload-video-header">
        <h1>Upload Video</h1>
        <p>Add a video with a title to publish it to the Plaza.</p>
      </div>
      <div className="upload-video-form">
        <label>
          <span>Title *</span>
          <Input
            placeholder="Enter title for your work"
            value={title}
            onChange={setTitle}
            maxLength={100}
          />
        </label>
        <label>
          <span>Video file *</span>
          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="upload-video-file"
          />
          {file && <p className="upload-video-filename">{file.name}</p>}
        </label>
        <Button
          block
          color="primary"
          size="large"
          loading={loading}
          disabled={!title.trim() || !file}
          onClick={handleSubmit}
        >
          Publish to Plaza
        </Button>
      </div>
    </div>
  );
}
