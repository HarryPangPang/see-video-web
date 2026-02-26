import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layout/MainLayout';
import { AuthProvider } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { Generate } from './pages/generate/Generate';
import { Inspire } from './pages/inspire/Inspire';
import { Assets } from './pages/assets/Assets';
import { Canvas } from './pages/canvas/Canvas';
import { PaymentSuccess } from './pages/payment/PaymentSuccess';
import { PaymentCancel } from './pages/payment/PaymentCancel';
import 'antd-mobile/es/global';
import './index.scss';

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
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
        <Route
          path="/"
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
        <Route
          path="/canvas"
          element={
            <MainLayout>
              <Inspire />
            </MainLayout>
          }
        />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/cancel" element={<PaymentCancel />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </I18nProvider>
  );
}
