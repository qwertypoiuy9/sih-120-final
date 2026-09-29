/**
 * API service — all well-scoped endpoints now accept an optional `wellId`
 * parameter (defaults to 'well-14' for backwards compat) that is injected
 * into the URL path: /api/{wellId}/telemetry, etc.
 *
 * Auth token is read from localStorage (set by authStore) and attached as
 * the Authorization header on every request.
 */

import axios from 'axios';
import {
  CSSState, Telemetry, ReservoirState, Well, WellboreState,
  SRPState, DynamometerState, AIInsights, Alert, ScenarioType,
} from '../types';

// VITE_API_URL is injected by the Vercel Services binding at build time.
// Locally it reads from frontend/.env (http://localhost:8000).
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Bearer token from localStorage on every request
api.interceptors.request.use((config) => {
  try {
    const raw  = localStorage.getItem('dt-auth');
    const parsed = raw ? JSON.parse(raw) : null;
    const token  = parsed?.state?.user?.token;
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
  } catch { /* ignore parse errors */ }
  return config;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Convert a route wellId like "well-14" to the backend key "well-14". */
const w = (wellId = 'well-14') => wellId;

// ---------------------------------------------------------------------------
// Auth (no wellId needed)
// ---------------------------------------------------------------------------
const login = async (email: string, password: string) => {
  const response = await api.post('/api/auth/login', { email, password });
  return response.data;   // { token, user }
};

// ---------------------------------------------------------------------------
// Fleet (supervisor only, no wellId)
// ---------------------------------------------------------------------------
const getFleetWells = async () => {
  const response = await api.get('/api/fleet/wells');
  return response.data;
};

// ---------------------------------------------------------------------------
// Well-scoped endpoints (all accept wellId)
// ---------------------------------------------------------------------------
const getWell = async (wellId = 'well-14'): Promise<Well> => {
  const response = await api.get(`/api/wells/${w(wellId)}/well`);
  return response.data;
};

const getTelemetry = async (wellId = 'well-14'): Promise<Telemetry> => {
  const response = await api.get(`/api/wells/${w(wellId)}/telemetry`);
  return response.data;
};

const getReservoirState = async (wellId = 'well-14'): Promise<ReservoirState> => {
  const response = await api.get(`/api/wells/${w(wellId)}/reservoir/state`);
  return response.data;
};

const getWellboreState = async (wellId = 'well-14'): Promise<WellboreState> => {
  const response = await api.get(`/api/wells/${w(wellId)}/wellbore/state`);
  return response.data;
};

const getSRPState = async (wellId = 'well-14'): Promise<SRPState> => {
  const response = await api.get(`/api/wells/${w(wellId)}/srp/state`);
  return response.data;
};

const getCSSState = async (wellId = 'well-14'): Promise<CSSState> => {
  const response = await api.get(`/api/wells/${w(wellId)}/css/state`);
  return response.data;
};

const getAIInsights = async (wellId = 'well-14'): Promise<AIInsights> => {
  const response = await api.get(`/api/wells/${w(wellId)}/ai/insights`);
  return response.data;
};

const getDynamometer = async (wellId = 'well-14'): Promise<DynamometerState> => {
  const response = await api.get(`/api/wells/${w(wellId)}/dynamometer`);
  return response.data;
};

const runSimulation = async (parameters: { spm: number }, wellId = 'well-14') => {
  const response = await api.post(`/api/wells/${w(wellId)}/simulation/run`, parameters);
  return response.data;
};

const runOptimization = async (
  parameters: { objectives: { maximize_production: boolean; minimize_energy: boolean; minimize_rod_float_risk: boolean } },
  wellId = 'well-14',
) => {
  const response = await api.post(`/api/wells/${w(wellId)}/optimization/run`, parameters);
  return response.data;
};

const simulateVFD = async (parameters: { target_spm: number }, wellId = 'well-14'): Promise<{
  vfd_result: { current_spm: number; current_frequency: number; target_frequency: number; motor_speed: number };
  telemetry: Telemetry;
}> => {
  const response = await api.post(`/api/wells/${w(wellId)}/vfd/simulate`, parameters);
  return response.data;
};

export interface CSSCycleParameters {
  steam_volume: number;
  steam_injection_rate: number;
  injection_pressure: number;
  target_temperature: number;
  injection_duration: number;
  soak_duration: number;
  production_duration: number;
}

export interface CSSCycleResult {
  parameters: CSSCycleParameters;
  steam_oil_ratio: number;
  cycle_production: number;
  energy_per_barrel: number;
  production_rate: number;
  ending_temperature: number;
  ending_viscosity: number;
}

const simulateCSS = async (parameters: CSSCycleParameters, wellId = 'well-14') => {
  const response = await api.post<{ baseline: CSSCycleResult; simulated: CSSCycleResult }>(
    `/api/wells/${w(wellId)}/css/simulate`,
    parameters,
  );
  return response.data;
};

const optimizeCSS = async (parameters: CSSCycleParameters, wellId = 'well-14') => {
  const response = await api.post<{ baseline: CSSCycleResult; optimized: CSSCycleResult; candidates: CSSCycleResult[] }>(
    `/api/wells/${w(wellId)}/css/optimize`,
    parameters,
  );
  return response.data;
};

const setScenario = async (scenario: ScenarioType, wellId = 'well-14') => {
  const response = await api.post(`/api/wells/${w(wellId)}/scenario`, { scenario });
  return response.data;
};

const getAlerts = async (wellId = 'well-14'): Promise<Alert[]> => {
  const response = await api.get(`/api/wells/${w(wellId)}/alerts`);
  return response.data;
};

// ---------------------------------------------------------------------------
// Exported service object
// ---------------------------------------------------------------------------
export const apiService = {
  // auth
  login,
  // fleet
  getFleetWells,
  // well-scoped
  getWell,
  getTelemetry,
  getReservoirState,
  getWellboreState,
  getSRPState,
  getCSSState,
  getAIInsights,
  getDynamometer,
  runSimulation,
  runOptimization,
  simulateVFD,
  simulateCSS,
  optimizeCSS,
  setScenario,
  getAlerts,
};

export default apiService;
