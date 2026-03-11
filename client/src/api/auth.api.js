import { apiClient } from "./axios";
import { API_ENDPOINTS } from "../constants/index.js";

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
  login: async (formData) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, formData);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : error;
    }
  },
  logout: async () => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : error;
    }
  },
  verifyEmail: async (formData) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.VERIFY_EMAIL, formData);
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
  googleLogin: async (token) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.GOOGLE_LOGIN, {
        token,
      });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : error;
    }
  },
};