import { apiClient } from "./axios";
import { API_ENDPOINTS, STORAGE_KEYS } from "../constants/index.js";

export const authApi = {
  signup: async (formData) => {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.AUTH.SIGNUP,
        formData,
      );
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : error;
    }
  },

  // Add fetchProfile for refreshing user data
  fetchProfile: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.USERS.GET_PROFILE);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : error;
    }
  },
  updateProfile: async (data) => {
    try {
      const response = await apiClient.patch(
        API_ENDPOINTS.USERS.UPDATE_PROFILE,
        data,
      );
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : error;
    }
  },
  login: async (formData) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, formData);
      return response.data;
    } catch (error) {
      // Pass through retryAfter if present
      if (error.response && error.response.status === 429) {
        throw {
          message: error.response.data.message,
          retryAfter: error.response.data.retryAfter,
        };
      }
      throw error.response ? error.response.data : error;
    }
  },
  logout: async () => {
    try {
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT, {
        refreshToken,
      });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : error;
    }
  },
  verifyEmail: async (formData) => {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.AUTH.VERIFY_EMAIL,
        formData,
      );
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : error;
    }
  },
  resendVerification: async (email) => {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.AUTH.RESEND_VERIFICATION,
        { email },
      );
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : error;
    }
  },

  forgotPassword: async (email) => {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
        { email },
      );
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : error;
    }
  },
  resetPassword: async (formData) => {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.AUTH.RESET_PASSWORD,
        formData,
      );
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : error;
    }
  },
};
