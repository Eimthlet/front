import React, { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import './AdminDashboard.css';
import SeasonManager from './SeasonManager';

// Remove any leftover fragments

interface NonAdminUser {
  id: string;
  username: string;
  email: string;
  average_score: number;
  total_games: number;
  highest_score: number;
  lowest_score: number;
}

interface InsightsStats {
  averageScore: number;
  mostPlayedGame: string;
  leastPlayedGame: string;
  insights: Array<{
    id: string;
    username: string;
    insight: string;
    average_score: number;
    total_games: number;
  }>;
  totalUsers: number;
  nonAdminUsers: NonAdminUser[];
}

interface ApiResponse<T> {
  data: T;
  error?: string;
}

interface DashboardResponse {
  total_users: number;
  active_users: number;
  avg_score: number;
  highest_score: number;
  lowest_score: number;
}

interface DashboardStatsResponse {
  seasons: number;
  questions: number;
  active_quizzes: number;
}

interface ApiError {
  response?: {
    status: number;
    data: {
      error?: string;
      details?: string;
    };
  };
  message: string;
}

interface ErrorState {
  message: string;
  isError: boolean;
  details?: string;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<InsightsStats | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStatsResponse | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [activeSection, setActiveSection] = useState<'insights' | 'overview' | 'users' | 'seasons'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch insights stats
        const insightsRes = await apiClient.get<ApiResponse<DashboardResponse>>('/api/admin/insights-stats');
        if (insightsRes.data.error) {
          throw new Error(insightsRes.data.error);
        }
        setStats({
          averageScore: insightsRes.data.data.avg_score,
          mostPlayedGame: '',
          leastPlayedGame: '',
          insights: [],
          totalUsers: insightsRes.data.data.total_users,
          nonAdminUsers: []
        });

        // Fetch dashboard stats
        const dashRes = await apiClient.get<ApiResponse<DashboardStatsResponse>>('/api/admin/dashboard-stats');
        if (dashRes.data.error) {
          throw new Error(dashRes.data.error);
        }
        setDashboardStats(dashRes.data.data);
      } catch (err: any) {
        setError({
          message: err.message || 'Failed to load dashboard data',
          isError: true
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="admin-dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Admin Dashboard</h1>
        </div>

        {isLoading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading dashboard...</p>
          </div>
        ) : error ? (
          <div className="error-message">
            <h3>Error Loading Dashboard</h3>
            <p>{error.message}</p>
            {error.details && <p className="error-details">{error.details}</p>}
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        ) : !stats || !dashboardStats ? (
          <div className="no-data-message">
            <p>No dashboard data available</p>
          </div>
        ) : (
          <div className="dashboard-content">
            <div className="stats-overview">
              <h2>Overview</h2>
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Total Users</h3>
                  <p>{stats.totalUsers}</p>
                </div>
                <div className="stat-card">
                  <h3>Average Score</h3>
                  <p>{stats.averageScore}%</p>
                </div>
                <div className="stat-card">
                  <h3>Most Played Game</h3>
                  <p>{stats.mostPlayedGame}</p>
                </div>
              </div>
            </div>

            <div className="top-players">
              <h2>Top Players</h2>
              <div className="players-list">
                {/* Add top players data here */}
              </div>
            </div>

            <div className="recent-activity">
              <h2>Recent Activity</h2>
              <div className="activity-list">
                {/* Add recent activity data here */}
              </div>
            </div>

            <div className="user-insights">
              <h2>User Insights</h2>
              <div className="insights-list">
                {/* Add user insights data here */}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
