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

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<InsightsStats | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [activeSection, setActiveSection] = useState<'insights' | 'overview' | 'users' | 'seasons'>('overview');

  const [isLoading, setIsLoading] = useState(true);

  
useEffect(() => {
  const fetchUserData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch users data from the working endpoint
      const response = await api.get('/admin/users');
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid user data format');
      }
      
      // Convert the users data to our stats format
      const users = response.data;
      const nonAdminUsers = users
        .filter((user: any) => user.role !== 'admin')
        .map((user: any) => ({
          id: user.id,
          username: user.username || 'User ' + user.id,
          email: user.email,
          average_score: user.score || 0,
          total_games: 1,
          highest_score: user.score || 0,
          lowest_score: user.score || 0,
        }));
      
      // Create a stats object with the available data
      const calculatedStats: InsightsStats = {
        averageScore: nonAdminUsers.reduce((sum, user) => sum + user.average_score, 0) / (nonAdminUsers.length || 1),
        mostPlayedGame: 'Car Quiz',
        leastPlayedGame: 'Car Quiz',
        insights: nonAdminUsers.map(user => ({
          id: user.id,
          username: user.username,
          insight: user.average_score > 70 ? 'Top Performer' : 'Regular Player',
          average_score: user.average_score,
          total_games: user.total_games
        })),
        totalUsers: nonAdminUsers.length,
        nonAdminUsers: nonAdminUsers
      };
      
      setStats(calculatedStats);
    } catch (err: unknown) {
      console.error('Dashboard data fetch error:', err);

      const apiError = err as ApiError;
      const errorMessage = apiError.response?.data?.error || 
        apiError.message || 
        'Failed to load dashboard data';

      setError({
        message: errorMessage,
        details: apiError.response?.data?.details
      });

      // Handle specific error scenarios
      if (apiError.response) {
        switch (apiError.response.status) {
          case 401:
            window.location.href = '/login';
            break;
          case 403:
            console.warn('Access forbidden');
            break;
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<DashboardResponse>('/admin/dashboard');
      setStats(response.data.data);
      setError(null);
    } catch (err: unknown) {
      console.error('Error fetching dashboard data:', err);
      const apiError = err as ApiError;
      setError({ message: apiError.response?.data?.error || apiError.message });
    } finally {
      setIsLoading(false);
    }
  };

  fetchUserData();
  fetchDashboardData();
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
        ) : !stats ? (
          <div className="no-data-message">
            <p>No dashboard data available</p>
          </div>
        ) : (
          <div className="dashboard-content">
            <div className="dashboard-sections">
              <button 
                className={activeSection === 'overview' ? 'active' : ''}
                onClick={() => setActiveSection('overview')}
              >
                Overview
              </button>
              <button 
                className={activeSection === 'insights' ? 'active' : ''}
                onClick={() => setActiveSection('insights')}
              >
                Player Insights
              </button>
              <button 
                className={activeSection === 'users' ? 'active' : ''}
                onClick={() => setActiveSection('users')}
              >
                Users
              </button>
              <button 
                className={activeSection === 'seasons' ? 'active' : ''}
                onClick={() => setActiveSection('seasons')}
              >
                Season Manager
              </button>
            </div>

            {activeSection === 'overview' && (
              <div className="dashboard-card overview">
                <h3>Game Statistics</h3>
                <div className="overview-stats">
                  <div className="stat-item">
                    <span className="stat-label">Average Score</span>
                    <span className="stat-value">{stats.averageScore}%</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Most Played Game</span>
                    <span className="stat-value">{stats.mostPlayedGame}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Least Played Game</span>
                    <span className="stat-value">{stats.leastPlayedGame}</span>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'insights' && (
              <div className="dashboard-card insights">
                <h3>Player Insights</h3>
                <div className="insights-list-container">
                  <ul className="insights-list">
                    {stats.insights.map((insight) => (
                      <li key={insight.id}>
                        <div className="player-details">
                          <span className="player-name">{insight.username}</span>
                          <span className="player-insight">{insight.insight}</span>
                        </div>
                        <div className="player-stats">
                          <span className="player-avg-score">Avg Score: {insight.average_score}</span>
                          <span className="player-total-games">Games: {insight.total_games}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeSection === 'users' && (
              <div className="dashboard-card users">
                <h3>User Management</h3>
                <div className="user-list">
                  {stats.nonAdminUsers.map(user => (
                    <div className="user-item" key={user.id}>
                      <div className="user-info">
                        <span className="username">{user.username}</span>
                        <span className="email">{user.email}</span>
                      </div>
                      <div className="user-stats">
                        <span className="stat">Avg Score: {user.average_score}%</span>
                        <span className="stat">Games: {user.total_games}</span>
                        <span className="stat">High: {user.highest_score}%</span>
                        <span className="stat">Low: {user.lowest_score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {activeSection === 'seasons' && (
              <div className="dashboard-card seasons">
                <SeasonManager />
              </div>
            )}  
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
