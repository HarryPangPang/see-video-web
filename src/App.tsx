import React, { useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { MainLayout } from './layout/MainLayout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';
import { parseIdTokenFromHash } from './utils/googleAuth';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { Generate } from './pages/generate/Generate';
import { Inspire } from './pages/inspire/Inspire';
import { Assets } from './pages/assets/Assets';
import { Canvas } from './pages/canvas/Canvas';
import { PaymentSuccess } from './pages/payment/PaymentSuccess';
import { PaymentCancel } from './pages/payment/PaymentCancel';
import { PrivacyPolicy } from './pages/legal/PrivacyPolicy';
import { TermsOfService } from './pages/legal/TermsOfService';
import { Plaza } from './pages/plaza/Plaza';
import { WorkDetail } from './pages/works/WorkDetail';
import { UploadVideo } from './pages/upload/UploadVideo';
import 'antd-mobile/es/global';
import './index.scss';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

/** 处理 Google 重定向登录回调：URL hash 中带 id_token 时登录并跳转首页 */
function GoogleRedirectCallback({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const [handling, setHandling] = useState(false);
  const handledRef = useRef(false);

  useEffect(() => {
    const idToken = parseIdTokenFromHash();
    if (!idToken || handledRef.current) return;
    handledRef.current = true;
    setHandling(true);
    loginWithGoogle(idToken)
      .then(() => navigate('/', { replace: true }))
      .catch(() => navigate('/', { replace: true }))
      .finally(() => setHandling(false));
  }, []);

  if (handling) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontSize: 14, color: '#666' }}>
        登录中…
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <I18nProvider>
      <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <GoogleRedirectCallback>
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/inspire"
          element={
            <MainLayout>
              <Generate />
            </MainLayout>
          }
        />
        <Route path="/" element={<MainLayout><Plaza /></MainLayout>} />
        <Route
          path="/canvas"
          element={
            <MainLayout>
              <Canvas />
            </MainLayout>
          }
        />
        <Route
          path="/assets"
          element={
            <MainLayout>
              <Assets />
            </MainLayout>
          }
        />
        <Route path="/plaza" element={<MainLayout><Plaza /></MainLayout>} />
        <Route path="/works/:id" element={<MainLayout><WorkDetail /></MainLayout>} />
        <Route path="/upload" element={<MainLayout><UploadVideo /></MainLayout>} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/cancel" element={<PaymentCancel />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </GoogleRedirectCallback>
      </AuthProvider>
      </GoogleOAuthProvider>
    </I18nProvider>
  );
}
