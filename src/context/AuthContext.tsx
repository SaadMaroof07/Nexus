import React, { createContext, useState, useContext, useEffect } from 'react';
import { User, UserRole, AuthContextType } from '../types';
import toast from 'react-hot-toast';
import api, { mapDjangoUser } from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'business_nexus_user';
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  // ---------- LOGIN ----------
  const login = async (email: string, password: string, role: UserRole): Promise<void> => {
    setIsLoading(true);
    try {
      // Step 1: JWT token lo
      const tokenRes = await api.post('/token/', { email, password });
      const { access, refresh } = tokenRes.data;

      localStorage.setItem(ACCESS_TOKEN_KEY, access);
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh);

      // Step 2: Apna profile fetch karo (token use ho ke)
      const profileRes = await api.get('/users/me/');
      const foundUser = mapDjangoUser(profileRes.data);

      // Role match check (Investor ne Entrepreneur wala button dabaya to allow na karo)
      if (foundUser.role !== role) {
        throw new Error('Selected role does not match this account');
      }

      setUser(foundUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(foundUser));
      toast.success('Successfully logged in!');
    } catch (error: any) {
      const message =
        error.response?.data?.detail || error.message || 'Invalid credentials or user not found';
      toast.error(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- REGISTER ----------
  const register = async (name: string, email: string, password: string, role: UserRole): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await api.post('/users/register/', {
        username: name,
        email,
        password,
        role,
      });

      const { access, refresh, user: djangoUser } = res.data;

      localStorage.setItem(ACCESS_TOKEN_KEY, access);
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh);

      const newUser = mapDjangoUser(djangoUser);
      setUser(newUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
      toast.success('Account created successfully!');
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.email?.[0] ||
        'Registration failed';
      toast.error(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- FORGOT / RESET PASSWORD (abhi ke liye mock rehne do) ----------
  const forgotPassword = async (email: string): Promise<void> => {
    // TODO: Backend endpoint Week 3 mein banega (Nodemailer/email OTP)
    toast.success('Password reset instructions sent to your email');
  };

  const resetPassword = async (token: string, newPassword: string): Promise<void> => {
    // TODO: Backend endpoint Week 3 mein banega
    toast.success('Password reset successfully');
  };

  // ---------- LOGOUT ----------
  const logout = (): void => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    toast.success('Logged out successfully');
  };

  // ---------- UPDATE PROFILE ----------
  const updateProfile = async (userId: string, updates: Partial<User>): Promise<void> => {
    try {
      // Frontend field names -> Django field names
      const payload: any = {};
      if (updates.name) payload.username = updates.name;
      if (updates.bio !== undefined) payload.bio = updates.bio;

      const res = await api.patch('/users/me/', payload);
      const updatedUser = mapDjangoUser(res.data);

      setUser(updatedUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      toast.success('Profile updated successfully');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Profile update failed';
      toast.error(message);
      throw new Error(message);
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    isAuthenticated: !!user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};