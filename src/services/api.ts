import axios from 'axios';
import { User, UserRole, Entrepreneur, Investor } from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

const PUBLIC_ENDPOINTS = ['/token/', '/users/register/'];

api.interceptors.request.use((config) => {
  const isPublic = PUBLIC_ENDPOINTS.some((url) => config.url?.includes(url));
  if (!isPublic) {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Django data ko frontend ke User/Entrepreneur/Investor shape mein convert karta hai
export function mapDjangoUser(data: any): User | Entrepreneur | Investor {
  const base: User = {
    id: String(data.id),
    name: data.username,
    email: data.email,
    role: data.role as UserRole,
    avatarUrl: data.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.username)}&background=random`,
    bio: data.bio || '',
    location: data.location || '',
    isOnline: true,
    createdAt: data.date_joined,
  };

  if (data.role === 'entrepreneur') {
    return {
      ...base,
      role: 'entrepreneur',
      startupName: data.startup_name || '',
      pitchSummary: data.pitch_summary || '',
      fundingNeeded: data.funding_needed || '',
      industry: data.industry || '',
      location: data.location || '',
      foundedYear: data.founded_year || new Date().getFullYear(),
      teamSize: data.team_size || 1,
    } as Entrepreneur;
  }

  if (data.role === 'investor') {
    return {
      ...base,
      role: 'investor',
      investmentInterests: data.investment_interests || [],
      investmentStage: data.investment_stage || [],
      portfolioCompanies: data.portfolio_companies || [],
      totalInvestments: data.total_investments || 0,
      minimumInvestment: data.minimum_investment || '',
      maximumInvestment: data.maximum_investment || '',
    } as Investor;
  }

  return base;
}

export default api;