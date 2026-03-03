import React, { useState, useEffect } from 'react';
import { Dialog, Input, Button, Toast } from 'antd-mobile';
import { publishWork } from '../services/api';

interface PublishDialogProps {
  visible: boolean;
  onClose: () => void;
  videoId: string;
  defaultTitle?: string;
  onSuccess?: () => void;
}

export function PublishDialog({ visible, onClose, videoId, defaultTitle = '', onSuccess }: PublishDialogProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [loading, setLoading] = useState(false);

  // When dialog opens, set default title to prompt
  useEffect(() => {
    if (visible) setTitle(defaultTitle);
  }, [visible, defaultTitle]);

  const handleSubmit = async () => {
    const t = title.trim();
    if (!t) {
      Toast.show({ content: 'Please enter a title', icon: 'fail' });
      return;
    }
    setLoading(true);
    try {
      await publishWork(videoId, t);
      Toast.show({ content: 'Published to Plaza!', icon: 'success' });
      onClose();
      setTitle('');
      onSuccess?.();
    } catch (e) {
      Toast.show({ content: (e as Error).message, icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title="Publish to Plaza"
      content={
        <div className="publish-dialog-content">
          <Input
            placeholder="Enter title for your work"
            value={title}
            onChange={setTitle}
            maxLength={100}
          />
          <div className="publish-dialog-actions">
            <Button fill="none" onClick={onClose}>Cancel</Button>
            <Button color="primary" loading={loading} onClick={handleSubmit}>Publish</Button>
          </div>
        </div>
      }
    />
  );
}
