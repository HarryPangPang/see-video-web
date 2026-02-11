import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: number;
  email: string;
  username: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithCode: (email: string, code: string) => Promise<void>;
  register: (email: string, password: string, code: string, username?: string) => Promise<void>;
  logout: () => void;
  sendVerificationCode: (email: string, type?: 'register' | 'login') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_BASE;

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
        throw new Error(response.data.message || '发送验证码失败');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || '发送验证码失败';
      throw new Error(message);
    }
  };

  // 注册
  const register = async (email: string, password: string, code: string, username?: string) => {
    try {
      const response = await axios.post(`${API_BASE}/api/auth/register`, {
        email,
        password,
        code,
        username,
      });

      if (response.data.success) {
        const { token: newToken, user: newUser } = response.data.data;
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('auth_token', newToken);
        localStorage.setItem('auth_user', JSON.stringify(newUser));
      } else {
        throw new Error(response.data.message || '注册失败');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || '注册失败';
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
        throw new Error(response.data.message || '登录失败');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || '登录失败';
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
        throw new Error(response.data.message || '登录失败');
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

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        loginWithCode,
        register,
        logout,
        sendVerificationCode,
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
