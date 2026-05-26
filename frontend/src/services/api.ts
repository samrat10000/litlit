const getApiUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Check if we are running in production (e.g. Render)
    // If the domain is litit-frontend.onrender.com, change it to litit-backend.onrender.com
    if (!hostname.includes('localhost') && !hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      if (hostname.includes('onrender.com')) {
        return `https://${hostname.replace('litit-frontend', 'litit-backend')}/api`;
      }
      return `${window.location.protocol}//${hostname}/api`;
    }

    // Local development: connect to port 5001 on the same host (handles localhost or LAN IP)
    return `${window.location.protocol}//${hostname}:5000/api`;
  }
  return 'http://localhost:5000/api';
};

const API_URL = getApiUrl();

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
};
