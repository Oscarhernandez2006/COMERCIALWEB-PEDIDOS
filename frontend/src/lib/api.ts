import axios from 'axios';

/**
 * Instancia central de Axios. El token JWT se inyecta automaticamente
 * y un interceptor redirige al login cuando expira la sesion.
 *
 * No fijamos un Content-Type por defecto: axios pone application/json
 * automáticamente para objetos y multipart/form-data (con boundary)
 * cuando el cuerpo es un FormData, como en la carga de inventario.
 */
export const api = axios.create({
  baseURL: '/api',
});

const TOKEN_KEY = 'comercial_token';
const COMPANY_KEY = 'comercial_company';

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setCompanyId(companyId: string | null) {
  if (companyId) localStorage.setItem(COMPANY_KEY, companyId);
  else localStorage.removeItem(COMPANY_KEY);
}

export function getCompanyId(): string | null {
  return localStorage.getItem(COMPANY_KEY);
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Aislamiento por compañía: si la petición no fijó una compañía explícita
  // (como hacen las pantallas de admin con su pestaña activa), se usa la
  // compañía activa guardada en localStorage.
  if (config.headers['X-Company-Id'] == null) {
    const companyId = getCompanyId();
    if (companyId) {
      config.headers['X-Company-Id'] = companyId;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      setToken(null);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
