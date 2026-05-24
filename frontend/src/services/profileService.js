/**
 * profileService.js
 * Frontend Service for interacting with Backend Profile APIs
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Helper to get authorization headers
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || 
                localStorage.getItem('accessToken') || 
                localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const profileService = {
  /**
   * Fetch currently logged in user profile details
   * GET /api/auth/me
   */
  async getMe() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch current user profile');
      }
      return data; // Returns standard backend structure
    } catch (error) {
      console.warn('API Error in getMe, returning mock fallback:', error.message);
      throw error;
    }
  },

  /**
   * Update user profile details
   * PUT /api/users/profile
   */
  async updateProfile(profileData) {
    try {
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          full_name: profileData.fullname || profileData.full_name,
          phone: profileData.phone
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile details');
      }
      return data;
    } catch (error) {
      console.warn('API Error in updateProfile:', error.message);
      throw error;
    }
  },

  /**
   * Change account password
   * PUT /api/users/change-password
   */
  async changePassword(passwordData) {
    try {
      const response = await fetch(`${API_BASE_URL}/users/change-password`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          current_password: passwordData.current || passwordData.current_password,
          new_password: passwordData.new || passwordData.new_password
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to change password');
      }
      return data;
    } catch (error) {
      console.warn('API Error in changePassword:', error.message);
      throw error;
    }
  },

  /**
   * Get audit/activity logs
   * GET /api/users/activity-logs
   */
  async getActivityLogs(page = 1, limit = 20) {
    try {
      const response = await fetch(`${API_BASE_URL}/users/activity-logs?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch activity logs');
      }
      return data;
    } catch (error) {
      console.warn('API Error in getActivityLogs:', error.message);
      throw error;
    }
  }
};

export default profileService;
