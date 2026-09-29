export interface Well {
  id: number;
  name: string;
  field: string;
  location: string;
  depth: number;
  reservoir_depth: number;
  api_gravity: number;
  status: string;
}

export interface Telemetry {
  timestamp: string;
  temperature: number;
  pressure: number;
  flow_rate: number;
  spm: number;
  rod_load: number;
  surface_vibration: number;
  motor_load: number;
  vfd_frequency: number;
  pump_efficiency: number;
  production_rate: number;
  energy_consumption: number;
}

export interface ReservoirState {
  current_temperature: number;
  reservoir_temperature: number;
  thermal_radius: number;
  time_since_injection: number;
  thermal_decline_rate: number;
  model_type: string;
}

export interface CSSState {
  cycle_number: number;
  phase: string;
  days_in_phase: number;
  steam_injection_rate: number;
  injection_pressure: number;
  target_temperature: number;
  production_cutoff: number;
  steam_oil_ratio: number;
  cycle_production: number;
  status: string;
  current_temperature: number;
  current_viscosity: number;
}

export interface WellboreState {
  depth: number;
  casing_depth: number;
  tubing_depth: number;
  pump_depth: number;
  perforation_depth: number;
  temperature_profile: number[];
  pressure_profile: number[];
  viscosity_profile: number[];
  model_type: string;
}

export interface SRPState {
  spm: number;
  stroke_length: number;
  rod_load: number;
  surface_vibration: number;
  pump_efficiency: number;
  downhole_pressure: number;
  displacement: number[];
  velocity: number[];
  status: string;
}

export interface DynamometerState {
  position: number[];
  load: number[];
  classification: {
    classification: string;
    confidence: number;
    rod_float_probability: number;
    impact_loading_risk: number;
    mechanical_stress: string;
    features: any;
    model_type: string;
  };
  operating_state: string;
}

export interface AIInsights {
  condition: string;
  rod_float_probability: number;
  impact_loading_risk: number;
  recommended_spm: number;
  recommended_vfd_frequency: number;
  confidence: number;
  reasoning: string[];
  physics_evidence: {
    temperature: number;
    viscosity: number;
    fluid_resistance: number;
    rod_dynamics: string;
    rod_float: number;
    impact_load: number;
    failure_risk: string;
  };
}

export interface Alert {
  severity: string;
  parameter: string;
  value: number;
  threshold: number;
  prediction: string;
  recommended_action: string;
  timestamp: string;
}

export interface DigitalTwinState {
  well: Well;
  telemetry: Telemetry;
  reservoir: ReservoirState;
  wellbore: WellboreState;
  srp: SRPState;
  dynamometer: DynamometerState;
  ai: AIInsights;
  alerts: Alert[];
  currentScenario: string;
  isConnected: boolean;
  isLoading: boolean;
}

export type ScenarioType = 'normal' | 'cooling' | 'high_viscosity' | 'rod_float' | 'impact_loading' | 'optimized';
