import { create } from 'zustand';
import { DigitalTwinState, Telemetry, CSSState, ReservoirState, WellboreState, SRPState, DynamometerState, AIInsights, Alert, ScenarioType } from '../types';

interface DigitalTwinStore extends DigitalTwinState {
  setTelemetry: (telemetry: Telemetry) => void;
  setCSS: (css: CSSState) => void;
  setReservoir: (reservoir: ReservoirState) => void;
  setWellbore: (wellbore: WellboreState) => void;
  setSRP: (srp: SRPState) => void;
  setDynamometer: (dynamometer: DynamometerState) => void;
  setAI: (ai: AIInsights) => void;
  setAlerts: (alerts: Alert[]) => void;
  setScenario: (scenario: ScenarioType) => void;
  setConnected: (connected: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState: DigitalTwinState = {
  well: {
    id: 1,
    name: 'BW-07',
    field: 'Baghewala',
    location: 'Rajasthan, India',
    depth: 1500.0,
    reservoir_depth: 1350.0,
    api_gravity: 18.0,
    status: 'PRODUCING',
  },
  telemetry: {
    timestamp: new Date().toISOString(),
    temperature: 55.0,
    pressure: 300.0,
    flow_rate: 15.0,
    spm: 5.0,
    rod_load: 30.0,
    surface_vibration: 0.5,
    motor_load: 45.0,
    vfd_frequency: 50.0,
    pump_efficiency: 0.85,
    production_rate: 15.0,
    energy_consumption: 45.0,
    steam_injection_rate: 0,
  },
  css: {
    cycle_number: 1,
    phase: 'production',
    days_in_phase: 0,
    steam_injection_rate: 0,
    injection_pressure: 8,
    target_temperature: 180,
    production_cutoff: 5,
    steam_oil_ratio: 0,
    cycle_production: 0,
    status: 'production',
    current_temperature: 55,
    current_viscosity: 1000,
  },
  reservoir: {
    current_temperature: 55.0,
    reservoir_temperature: 45.0,
    thermal_radius: 10.0,
    time_since_injection: 0.0,
    thermal_decline_rate: 0.1,
    model_type: 'DIGITAL TWIN DEMONSTRATION MODEL',
  },
  wellbore: {
    depth: 1500.0,
    casing_depth: 1400.0,
    tubing_depth: 1450.0,
    pump_depth: 1300.0,
    perforation_depth: 1350.0,
    temperature_profile: [],
    pressure_profile: [],
    viscosity_profile: [],
    model_type: 'DIGITAL TWIN DEMONSTRATION MODEL',
  },
  srp: {
    spm: 5.0,
    stroke_length: 2.5,
    rod_load: 30.0,
    surface_vibration: 0.5,
    pump_efficiency: 0.85,
    downhole_pressure: 300.0,
    displacement: [],
    velocity: [],
    stress: [],
    status: 'operating',
  },
  dynamometer: {
    position: [],
    load: [],
    classification: {
      classification: 'normal',
      confidence: 0.85,
      rod_float_probability: 0.1,
      impact_loading_risk: 0.1,
      mechanical_stress: 'NORMAL',
      features: {},
      model_type: 'SIMULATED CLASSIFICATION',
    },
    operating_state: 'normal',
  },
  ai: {
    condition: 'normal',
    rod_float_probability: 0.1,
    impact_loading_risk: 0.1,
    recommended_spm: 5.0,
    recommended_vfd_frequency: 50.0,
    confidence: 0.85,
    reasoning: [],
    physics_evidence: {
      temperature: 55.0,
      viscosity: 1000.0,
      fluid_resistance: 1.0,
      rod_dynamics: 'normal',
      rod_float: 0.1,
      impact_load: 0.1,
      failure_risk: 'low',
    },
  },
  alerts: [],
  currentScenario: 'normal',
  isConnected: false,
  isStreaming: false,
  isLoading: true,
};

export const useDigitalTwinStore = create<DigitalTwinStore>((set) => ({
  ...initialState,

  setTelemetry: (telemetry) => set({ telemetry }),
  setCSS: (css) => set({ css }),
  setReservoir: (reservoir) => set({ reservoir }),
  setWellbore: (wellbore) => set({ wellbore }),
  setSRP: (srp) => set({ srp }),
  setDynamometer: (dynamometer) => set({ dynamometer }),
  setAI: (ai) => set({ ai }),
  setAlerts: (alerts) => set({ alerts }),
  setScenario: (scenario) => set({ currentScenario: scenario }),
  setConnected: (connected) => set({ isConnected: connected }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setLoading: (loading) => set({ isLoading: loading }),
  reset: () => set(initialState),
}));
