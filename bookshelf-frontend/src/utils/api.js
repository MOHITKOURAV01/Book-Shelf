import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Example base URL
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    // Attach future authentication tokens here if available
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    let normalizedError = {
      status: 500,
      message: 'Something went wrong. Please try again later.',
      code: 'UNKNOWN_ERROR',
      original: error
    };

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { status, data } = error.response;
      normalizedError.status = status;

      switch (status) {
        case 401:
          normalizedError.message = data?.message || 'Unauthorized access. Please login again.';
          normalizedError.code = 'UNAUTHORIZED';
          // e.g., redirect to login or trigger logout logic
          break;
        case 403:
          normalizedError.message = data?.message || 'Forbidden access. You do not have permission.';
          normalizedError.code = 'FORBIDDEN';
          break;
        case 404:
          normalizedError.message = data?.message || 'Resource not found.';
          normalizedError.code = 'NOT_FOUND';
          break;
        case 500:
          normalizedError.message = data?.message || 'Internal server error. Our team has been notified.';
          normalizedError.code = 'SERVER_ERROR';
          break;
        default:
          normalizedError.message = data?.message || 'An unexpected error occurred.';
          normalizedError.code = 'HTTP_ERROR';
      }
    } else if (error.request) {
      // The request was made but no response was received
      normalizedError.status = 0;
      normalizedError.message = 'Network error. Please check your internet connection.';
      normalizedError.code = 'NETWORK_ERROR';
    } else {
      // Something happened in setting up the request that triggered an Error
      normalizedError.message = error.message;
      normalizedError.code = 'SETUP_ERROR';
    }

    // Return the normalized error instead of raw Axios error
    return Promise.reject(normalizedError);
  }
);

export default api;
