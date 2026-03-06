import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { updateUserProfile as apiUpdateUserProfile, changePassword as apiChangePassword, uploadAvatar as apiUploadAvatar, removeAvatar as apiRemoveAvatar, uploadBackground as apiUploadBackground, removeBackground as apiRemoveBackground } from '../services/api';

interface User {
  id: number;
  email: string;
  username: string | null;
  avatar?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  background?: string | null;
  isGoogleUser?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string, inviteCode?: string) => Promise<void>;
  loginWithCode: (email: string, code: string) => Promise<void>;
  register: (email: string, password: string, code: string, username?: string, inviteCode?: string) => Promise<void>;
  logout: () => void;
  sendVerificationCode: (email: string, type?: 'register' | 'login') => Promise<void>;
  updateProfile: (params: { username: string; bio?: string; location?: string; website?: string }) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  removeAvatar: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  uploadBackground: (file: File) => Promise<void>;
  removeBackground: () => Promise<void>;
  setBackground: (value: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = _GLOBAL_VARS_.VITE_API_HOST;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 初始化时从 localStorage 恢复登录状态
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // 验证 token 是否有效
      validateToken(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // 验证 token
  const validateToken = async (token: string) => {
    try {
      const response = await axios.get(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setUser(response.data.data);
      } else {
        // Token 无效，清除状态
        logout();
      }
    } catch (error) {
      console.error('Token 验证失败:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  // 发送验证码
  const sendVerificationCode = async (email: string, type: 'register' | 'login' = 'register') => {
    try {
      const response = await axios.post(`${API_BASE}/api/auth/send-code`, {
        email,
        type,
      });
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to send verification code');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to send verification code';
      throw new Error(message);
    }
  };

  // 注册（inviteCode 为邀请码，用于绑定邀请人）
  const register = async (email: string, password: string, code: string, username?: string, inviteCode?: string) => {
    try {
      const body: Record<string, unknown> = { email, password, code, username };
      if (inviteCode && inviteCode.trim()) body.invite_code = inviteCode.trim();
      const response = await axios.post(`${API_BASE}/api/auth/register`, body);

      if (response.data.success) {
        const { token: newToken, user: newUser } = response.data.data;
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('auth_token', newToken);
        localStorage.setItem('auth_user', JSON.stringify(newUser));
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Registration failed';
      throw new Error(message);
    }
  };

  // 密码登录
  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_BASE}/api/auth/login`, {
        email,
        password,
      });

      if (response.data.success) {
        const { token: newToken, user: newUser } = response.data.data;
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('auth_token', newToken);
        localStorage.setItem('auth_user', JSON.stringify(newUser));
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || '登录失败';
      throw new Error(message);
    }
  };

  // Google 登录（新用户注册时可传 inviteCode 绑定邀请人）
  const loginWithGoogle = async (credential: string, inviteCode?: string) => {
    try {
      const body: Record<string, string> = { credential };
      if (inviteCode && inviteCode.trim()) body.invite_code = inviteCode.trim();
      const response = await axios.post(`${API_BASE}/api/auth/google`, body);
      if (response.data.success) {
        const { token: newToken, user: newUser } = response.data.data;
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('auth_token', newToken);
        localStorage.setItem('auth_user', JSON.stringify(newUser));
      } else {
        throw new Error(response.data.message || 'Google 登录失败');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Google 登录失败';
      throw new Error(message);
    }
  };

  // 验证码登录
  const loginWithCode = async (email: string, code: string) => {
    try {
      const response = await axios.post(`${API_BASE}/api/auth/login-with-code`, {
        email,
        code,
      });

      if (response.data.success) {
        const { token: newToken, user: newUser } = response.data.data;
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('auth_token', newToken);
        localStorage.setItem('auth_user', JSON.stringify(newUser));
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || '登录失败';
      throw new Error(message);
    }
  };

  // 登出
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  // 更新资料（昵称、简介、所在地、个人主页）
  const updateProfile = async (params: { username: string; bio?: string; location?: string; website?: string }) => {
    const res = await apiUpdateUserProfile(params);
    if (res.success && res.data) {
      const next = {
        id: res.data.id,
        email: res.data.email,
        username: res.data.username,
        avatar: res.data.avatar ?? undefined,
        bio: res.data.bio ?? undefined,
        location: res.data.location ?? undefined,
        website: res.data.website ?? undefined,
        background: res.data.background ?? undefined,
        isGoogleUser: res.data.isGoogleUser,
      };
      setUser(next);
      localStorage.setItem('auth_user', JSON.stringify(next));
    }
  };

  // 上传头像
  const uploadAvatar = async (file: File) => {
    const res = await apiUploadAvatar(file);
    if (res.success && res.data) {
      const next = {
        id: res.data.id,
        email: res.data.email,
        username: res.data.username,
        avatar: res.data.avatar ?? undefined,
        bio: res.data.bio ?? undefined,
        location: res.data.location ?? undefined,
        website: res.data.website ?? undefined,
        background: res.data.background ?? undefined,
        isGoogleUser: res.data.isGoogleUser,
      };
      setUser(next);
      localStorage.setItem('auth_user', JSON.stringify(next));
    }
  };

  // 恢复默认头像
  const removeAvatar = async () => {
    const res = await apiRemoveAvatar();
    if (res.success && res.data) {
      const next = {
        id: res.data.id,
        email: res.data.email,
        username: res.data.username,
        avatar: null,
        bio: res.data.bio ?? undefined,
        location: res.data.location ?? undefined,
        website: res.data.website ?? undefined,
        background: res.data.background ?? undefined,
        isGoogleUser: res.data.isGoogleUser,
      };
      setUser(next);
      localStorage.setItem('auth_user', JSON.stringify(next));
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await apiChangePassword(currentPassword, newPassword);
  };

  const uploadBackground = async (file: File) => {
    const res = await apiUploadBackground(file);
    if (res.success && res.data) {
      const next = {
        id: res.data.id,
        email: res.data.email,
        username: res.data.username,
        avatar: res.data.avatar ?? undefined,
        bio: res.data.bio ?? undefined,
        location: res.data.location ?? undefined,
        website: res.data.website ?? undefined,
        background: res.data.background ?? undefined,
        isGoogleUser: res.data.isGoogleUser,
      };
      setUser(next);
      localStorage.setItem('auth_user', JSON.stringify(next));
    }
  };

  const removeBackground = async () => {
    const res = await apiRemoveBackground();
    if (res.success && res.data) {
      const next = {
        id: res.data.id,
        email: res.data.email,
        username: res.data.username,
        avatar: res.data.avatar ?? undefined,
        bio: res.data.bio ?? undefined,
        location: res.data.location ?? undefined,
        website: res.data.website ?? undefined,
        background: null,
        isGoogleUser: res.data.isGoogleUser,
      };
      setUser(next);
      localStorage.setItem('auth_user', JSON.stringify(next));
    }
  };

  const setBackground = async (value: string | null) => {
    if (user) {
      await apiUpdateUserProfile({ username: user.username || '', background: value || '' });
      const next = { ...user, background: value };
      setUser(next);
      localStorage.setItem('auth_user', JSON.stringify(next));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        loginWithGoogle,
        loginWithCode,
        register,
        logout,
        sendVerificationCode,
        updateProfile,
        uploadAvatar,
        removeAvatar,
        changePassword,
        uploadBackground,
        removeBackground,
        setBackground,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
