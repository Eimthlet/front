import React, { useState, useEffect } from 'react';
import api from '../utils/api';
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
  details?: string;
}

interface DashboardResponse {
  data: {
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
    nonAdminUsers: Array<{
      id: string;
      username: string;
      email: string;
      average_score: number;
      total_games: number;
      highest_score: number;
      lowest_score: number;
    }>;
  };
}

interface DashboardStatsResponse {
  totalUsers: number;
  topPlayers: Array<{
    username: string;
    highest_score: number;
    games_played: number;
  }>;
  recentActivity: Array<{
    username: string;
    score: number;
    created_at: string;
  }>;
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
        const insightsResponse = await api.get<DashboardResponse>('/api/admin/insights-stats');
        setStats(insightsResponse.data.data);

        // Fetch dashboard stats
        const dashboardResponse = await api.get<DashboardStatsResponse>('/api/admin/dashboard-stats');
        setDashboardStats(dashboardResponse.data);
      } catch (err: unknown) {
        console.error('Error fetching dashboard data:', err);
        const apiError = err as ApiError;
        setError({ 
          message: apiError.response?.data?.error || apiError.message,
          details: apiError.response?.data?.details
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
                  <p>{dashboardStats.totalUsers}</p>
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
                {dashboardStats.topPlayers.map((player, index) => (
                  <div key={index} className="player-card">
                    <h3>{player.username}</h3>
                    <p>Highest Score: {player.highest_score}</p>
                    <p>Games Played: {player.games_played}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="recent-activity">
              <h2>Recent Activity</h2>
              <div className="activity-list">
                {dashboardStats.recentActivity.map((activity, index) => (
                  <div key={index} className="activity-card">
                    <p>{activity.username} scored {activity.score}%</p>
                    <small>{new Date(activity.created_at).toLocaleString()}</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="user-insights">
              <h2>User Insights</h2>
              <div className="insights-list">
                {stats.insights.map((insight) => (
                  <div key={insight.id} className="insight-card">
                    <h3>{insight.username}</h3>
                    <p>{insight.insight}</p>
                    <p>Average Score: {insight.average_score}%</p>
                    <p>Total Games: {insight.total_games}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
