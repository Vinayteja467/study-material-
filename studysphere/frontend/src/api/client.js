import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const client = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach access token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Catch 401 and refresh tokens
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url === '/api/auth/refresh/') {
        // If the refresh token request itself fails, boot user
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return client(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        isRefreshing = false;
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${baseURL}/api/auth/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = res.data;
        localStorage.setItem('access_token', access);

        client.defaults.headers.common.Authorization = `Bearer ${access}`;
        originalRequest.headers.Authorization = `Bearer ${access}`;

        processQueue(null, access);
        isRefreshing = false;

        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Typed API Modules
export const authAPI = {
  register: (payload) => {
    // payload can be FormData if profile_picture is added
    const isFormData = payload instanceof FormData;
    return client.post('/api/auth/register/', payload, {
      headers: {
        'Content-Type': isFormData ? 'multipart/form-data' : 'application/json',
      },
    });
  },
  login: (credentials) => client.post('/api/auth/login/', credentials),
  me: () => client.get('/api/auth/me/'),
  getStudents: () => client.get('/api/auth/students/'),
};

export const materialsAPI = {
  list: () => client.get('/api/materials/'),
  retrieve: (id) => client.get(`/api/materials/${id}/`),
  create: (formData) =>
    client.post('/api/materials/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  destroy: (id) => client.delete(`/api/materials/${id}/`),
};

export const chatAPI = {
  ask: (pdfId, question) =>
    client.post('/api/ask/', { pdf_id: pdfId, question }),
};

export const analyticsAPI = {
  getTeacherStats: () => client.get('/api/analytics/teacher/'),
  getStudentDashboard: () => client.get('/api/student/dashboard/'),
  getTeacherDashboard: () => client.get('/api/auth/analytics/dashboard/'),
  getStudentAnalytics: () => client.get('/api/auth/analytics/student/'),
};

export const mcqAPI = {
  generate: (pdfId, topic, count) => client.post('/api/auth/generate/mcq/', { pdf_id: pdfId, topic, count }),
  save: (payload) => client.post('/api/auth/generate/mcq/save/', payload),
  history: () => client.get('/api/auth/generate/mcq/history/'),
  generateFlashcards: (pdfId, topic, count) => client.post('/api/auth/generate/flashcards/', { pdf_id: pdfId, topic, count }),
};

export const attendanceAPI = {
  mark: (payload) => client.post('/api/auth/attendance/mark/', payload),
  summary: (studentId) => client.get(`/api/auth/attendance/summary/${studentId}/`),
  classFeed: (subjectId) => client.get(`/api/auth/attendance/class/${subjectId}/`),
  edit: (id, payload) => client.put(`/api/auth/attendance/edit/${id}/`, payload),
};

export const adminAPI = {
  getUsers: () => client.get('/api/auth/admin/users/'),
  createUser: (payload) => client.post('/api/auth/admin/users/', payload),
  updateUser: (id, payload) => client.put(`/api/auth/admin/users/${id}/`, payload),
  deleteUser: (id) => client.delete(`/api/auth/admin/users/${id}/`),
  getStats: () => client.get('/api/auth/admin/stats/'),
  getMaterials: () => client.get('/api/auth/admin/materials/'),
  deleteMaterial: (id) => client.delete(`/api/auth/admin/materials/${id}/`),
  announce: (payload) => client.post('/api/auth/admin/announce/', payload),
  getAnnouncements: () => client.get('/api/auth/announcements/'),
};

export const testAPI = {
  create: (payload) => client.post('/api/auth/tests/create/', payload),
  list: () => client.get('/api/auth/tests/'),
  retrieve: (id) => client.get(`/api/auth/tests/${id}/`),
  attempt: (id, payload) => client.post(`/api/auth/tests/${id}/attempt/`, payload),
  results: () => client.get('/api/auth/tests/results/'),
};

export const subjectAPI = {
  list: () => client.get('/api/auth/subjects/'),
  create: (payload) => client.post('/api/auth/subjects/', payload),
};

export default client;


