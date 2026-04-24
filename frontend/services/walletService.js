import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from './apiClient';


const getAuthHeaders = async () => {
  const accessToken = await AsyncStorage.getItem('accessToken');
  if (!accessToken) {
    const error = new Error('Not authenticated. Please login first.');
    error.code = 'AUTH_REQUIRED';
    throw error;
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  };
};

const isAuthRequiredError = (error) => {
  const code = String(error?.code || '').trim().toUpperCase();
  if (code === 'AUTH_REQUIRED') {
    return true;
  }

  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('not authenticated') ||
    message.includes('unauthorized') ||
    message.includes('401')
  );
};

const handleResponse = async (response) => {
  const data = await response.json();
  if (response.ok && data.success) {
    return data.data;
  }
  throw new Error(data.error?.message || `Server error: ${response.status}`);
};


export const authService = {

  
  async registerWithoutWallet(userData) {
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: userData.firstName,
          lastName: userData.lastName,
          userName: userData.userName,
          email: userData.email,
          password: userData.password,
        }),
      });

      return await handleResponse(response);
    } catch (err) {
      console.error('Error registering without wallet:', err);
      throw err;
    }
  },

  
  async loginWithEmail(email, password) {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return await handleResponse(response);
    } catch (err) {
      console.error('Error logging in with email:', err);
      throw err;
    }
  },

  async verifyEmail(code) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/auth/verify-email`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ code }),
      });
      return await handleResponse(response);
    } catch (err) {
      console.error('Error verifying email:', err);
      throw err;
    }
  },

  async resendVerificationEmail() {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/auth/resend-verification`, {
        method: 'POST',
        headers,
      });
      return await handleResponse(response);
    } catch (err) {
      console.error('Error resending verification email:', err);
      throw err;
    }
  },

  async requestPasswordReset(email) {
    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return await handleResponse(response);
    } catch (err) {
      console.error('Error requesting password reset:', err);
      throw err;
    }
  },

  async resetPassword({ email, code, newPassword }) {
    try {
      const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });
      return await handleResponse(response);
    } catch (err) {
      console.error('Error resetting password:', err);
      throw err;
    }
  },

  async getCurrentUserProfile() {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/users/me`, {
        method: 'GET',
        headers,
      });
      return await handleResponse(response);
    } catch (err) {
      if (!isAuthRequiredError(err)) {
        console.error('Error fetching current user profile:', err);
      }
      throw err;
    }
  },

  async updateCurrentUserProfile(profilePayload = {}) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/users/me/profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(profilePayload),
      });
      return await handleResponse(response);
    } catch (err) {
      console.error('Error updating current user profile:', err);
      throw err;
    }
  },
};


export const walletService = {

  
  async isWalletRegistered(address) {
    try {
      const response = await fetch(
        `${API_BASE}/auth/wallet/check?address=${encodeURIComponent(address)}`
      );
      const data = await response.json();
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      return Boolean(data?.data?.isRegistered);
    } catch (error) {
      console.error('Error checking wallet registration:', error);
      throw error;
    }
  },

  
  async getWalletNonce(address) {
    try {
      const response = await fetch(
        `${API_BASE}/auth/wallet/nonce?address=${encodeURIComponent(address)}`
      );
      return await handleResponse(response);
    } catch (error) {
      console.error('Error getting nonce:', error);
      throw error;
    }
  },

  
  async loginWithWallet(walletAddress, signature, message) {
    try {
      const response = await fetch(`${API_BASE}/auth/wallet/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, signature, message }),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error logging in with wallet:', error);
      throw error;
    }
  },

  
  async registerWithWallet(walletAddress, signature, message, formData = {}) {
    try {
      const response = await fetch(`${API_BASE}/auth/wallet/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName || '',
          lastName: formData.lastName || '',
          userName: formData.userName || '',
          walletAddress,
          signature,
          message,
        }),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error registering with wallet:', error);
      throw error;
    }
  },

  async connectWalletToCurrentUser(walletAddress, signature, message) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/users/me/wallet`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ walletAddress, signature, message }),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error connecting wallet to current user:', error);
      throw error;
    }
  },

  async disconnectWalletFromCurrentUser() {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/users/me/wallet`, {
        method: 'DELETE',
        headers,
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error disconnecting wallet from current user:', error);
      throw error;
    }
  },

  
  async getUserWallets(userId) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_BASE}/wallets?userId=${encodeURIComponent(userId)}`,
        { headers }
      );
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching wallets:', error);
      throw error;
    }
  },

  
  async getWalletByAddress(address) {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      const response = await fetch(
        `${API_BASE}/wallets/${encodeURIComponent(address)}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
          },
        }
      );
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching wallet:', error);
      throw error;
    }
  },

  
  async addWallet(address, name = 'My Wallet') {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/wallets`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ address, name }),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error adding wallet:', error);
      throw error;
    }
  },

  
  async getAvailableWallets(forceRefresh = false) {
    try {

      if (!forceRefresh) {
        const cached = await AsyncStorage.getItem('availableWallets');
        if (cached) return JSON.parse(cached);
      }

      const accessToken = await AsyncStorage.getItem('accessToken');
      if (!accessToken) return [];

      const response = await fetch(`${API_BASE}/wallets/available`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) return [];

      const data = await response.json();
      if (data.success && data.data) {
        await AsyncStorage.setItem('availableWallets', JSON.stringify(data.data));
        return data.data;
      }
      return [];
    } catch (error) {
      console.error('Error getting available wallets:', error);
      return [];
    }
  },

  
  async clearWalletCache() {
    await AsyncStorage.removeItem('availableWallets');
  },
};