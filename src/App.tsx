import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layout/MainLayout';
import { AuthProvider } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Generate } from './pages/generate/Generate';
import { Inspire } from './pages/inspire/Inspire';
import { Assets } from './pages/assets/Assets';
import { Canvas } from './pages/canvas/Canvas';
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
            <ProtectedRoute>
              <MainLayout>
                <Generate />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout>
              <Canvas />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assets"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Assets />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/canvas"
          element={
            <ProtectedRoute>
              <MainLayout>
              <Inspire />
               
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </I18nProvider>
  );
}
