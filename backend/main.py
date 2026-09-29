"""
Baghewala Digital Twin — FastAPI backend
Well BW-07, Baghewala field, Rajasthan, India

Physics chain (called every update_state()):
  1. ThermalModel       → time-evolving reservoir temperature (exponential CSS decline)
  2. ViscosityModel     → Andrade temperature-dependent viscosity
  3. WellboreModel      → Darcy-Weisbach pressure profile + geothermal temp gradient
  4. RodDynamicsModel   → Gibbs 1D wave equation (displacement / load / stress)
  5. DynamometerModel   → surface card generation + feature-based classification
  6. SurfaceModel       → VFD power, pump efficiency, vibration
  7. Darcy flow rate    → Q = k*A*ΔP / (μ*L)   (steady-state Darcy's law)
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List
import asyncio
import copy
from datetime import datetime
import math

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False

    class np:
        @staticmethod
        def mean(data):
            lst = list(data)
            return sum(lst) / len(lst) if lst else 0.0

        @staticmethod
        def var(data):
            lst = list(data)
            if not lst:
                return 0.0
            m = sum(lst) / len(lst)
            return sum((x - m) ** 2 for x in lst) / len(lst)

        @staticmethod
        def exp(x):
            return math.exp(x)

        @staticmethod
        def sqrt(x):
            return math.sqrt(x)


try:
    from app.database import engine, get_db, Base
    from app.models import *
    DATABASE_AVAILABLE = True
except ImportError:
    try:
        from .database import engine, get_db, Base
        from .models import *
        DATABASE_AVAILABLE = True
    except ImportError:
        DATABASE_AVAILABLE = False
        print("Database not available - running in demo mode")

if not DATABASE_AVAILABLE:
    class Session:
        pass

try:
    from app.physics.thermal_model import ThermalModel
    from app.physics.viscosity_model import ViscosityModel
    from app.physics.wellbore_model import WellboreModel
    from app.physics.rod_dynamics import RodDynamicsModel
    from app.physics.dynamometer_model import DynamometerModel
    from app.physics.rod_float_detector import RodFloatDetector
    from app.physics.surface_model import SurfaceModel
except ImportError:
    from .physics.thermal_model import ThermalModel
    from .physics.viscosity_model import ViscosityModel
    from .physics.wellbore_model import WellboreModel
    from .physics.rod_dynamics import RodDynamicsModel
    from .physics.dynamometer_model import DynamometerModel
    from .physics.rod_float_detector import RodFloatDetector
    from .physics.surface_model import SurfaceModel

if DATABASE_AVAILABLE:
    Base.metadata.create_all(bind=engine)

app = FastAPI(title="Baghewala Digital Twin API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helper: safe list mean/var that works whether data is ndarray or list
# ---------------------------------------------------------------------------
def _mean(data) -> float:
    if NUMPY_AVAILABLE:
        import numpy
        return float(numpy.mean(data))
    lst = list(data)
    return sum(lst) / len(lst) if lst else 0.0


def _var(data) -> float:
    if NUMPY_AVAILABLE:
        import numpy
        return float(numpy.var(data))
    lst = list(data)
    if not lst:
        return 0.0
    m = _mean(lst)
    return sum((x - m) ** 2 for x in lst) / len(lst)


def _surface_rod_load(dt, dynamometer_state=None) -> float:
    """Estimate polished-rod load from the generated upstroke dynamometer card."""
    state = dynamometer_state or dt.dynamometer_state
    load = state.get("load", [])
    if load:
        return _mean(load[:max(1, len(load) // 2)])
    return _mean(dt.rod_dynamics_state.get("load_profile", []))


def _telemetry_payload(dt: "DigitalTwinState") -> Dict:
    pressure = _mean(dt.wellbore_state['pressure_profile'])
    steam_inj = 100.0 * max(0.0, 1.0 - dt.css_day / 5.0) if dt.css_day < 5.0 else 0.0
    return {
        "timestamp": dt.timestamp.isoformat(),
        "temperature": round(dt.thermal_state['current_temperature'], 2),
        "pressure": round(pressure, 2),
        "flow_rate": round(dt.flow_rate, 2),
        "spm": round(dt.current_spm, 2),
        "rod_load": round(_surface_rod_load(dt), 2),
        "surface_vibration": round(dt.surface_state['surface_vibration'], 3),
        "motor_load": round(dt.surface_state['power_consumption'], 2),
        "vfd_frequency": round(dt.surface_state['vfd_frequency'], 2),
        "pump_efficiency": round(dt.surface_state['pump_efficiency'], 3),
        "production_rate": round(dt.flow_rate, 2),
        "energy_consumption": round(dt.surface_state['power_consumption'], 2),
        "steam_injection_rate": round(steam_inj, 2),
    }


def _ai_insights_payload(dt: "DigitalTwinState") -> Dict:
    temperature = dt.thermal_state['current_temperature']
    viscosity = dt.viscosity_state['current_viscosity']
    classification = dt.dynamometer_state['classification']
    rod_float = classification['rod_float_probability']
    impact_risk = classification['impact_loading_risk']
    current_spm = dt.current_spm
    recommended_spm = current_spm
    reasoning = []

    if temperature < 45.0:
        recommended_spm = min(recommended_spm, 3.0)
        reasoning.append(f"Reservoir is near baseline at {temperature:.1f}°C; lower pump speed and review the next steam cycle.")
    elif temperature < 50.0:
        recommended_spm = min(recommended_spm, 4.0)
        reasoning.append(f"Reservoir is cooling at {temperature:.1f}°C; monitor viscosity and production.")

    if viscosity > 2000.0:
        recommended_spm = min(recommended_spm, 3.0)
        reasoning.append(f"Estimated viscosity is elevated at {viscosity:.0f} cP.")
    elif viscosity > 1000.0:
        recommended_spm = min(recommended_spm, 4.0)
        reasoning.append(f"Estimated viscosity is {viscosity:.0f} cP; monitor pump loading.")

    if rod_float >= 0.7:
        recommended_spm = min(recommended_spm, max(1.0, current_spm - 1.5))
        reasoning.append(f"Dynamometer card indicates high rod-float risk ({rod_float * 100:.0f}%).")
    elif rod_float >= 0.4:
        recommended_spm = min(recommended_spm, max(1.0, current_spm - 0.5))
        reasoning.append(f"Dynamometer card indicates elevated rod-float risk ({rod_float * 100:.0f}%).")

    if impact_risk >= 0.7:
        recommended_spm = min(recommended_spm, max(1.0, current_spm - 1.0))
        reasoning.append(f"Dynamometer card indicates high impact-loading risk ({impact_risk * 100:.0f}%).")
    elif impact_risk >= 0.4:
        recommended_spm = min(recommended_spm, max(1.0, current_spm - 0.5))
        reasoning.append(f"Dynamometer card indicates elevated impact-loading risk ({impact_risk * 100:.0f}%).")

    if not reasoning:
        reasoning.append("Temperature, viscosity, and simulated dynamometer-card indicators are within the configured demo thresholds.")

    if rod_float >= 0.7 or impact_risk >= 0.7:
        condition = "mechanical_risk"
    elif temperature < 50.0 or viscosity > 1000.0:
        condition = "increasing_viscosity"
    else:
        condition = "normal"

    highest_risk = max(rod_float, impact_risk)
    failure_risk = "high" if highest_risk >= 0.7 else "moderate" if highest_risk >= 0.4 else "low"
    return {
        "condition": condition,
        "rod_float_probability": rod_float,
        "impact_loading_risk": impact_risk,
        "recommended_spm": round(recommended_spm, 1),
        "recommended_vfd_frequency": round(dt.surface_model.calculate_frequency_from_spm(recommended_spm), 1),
        "confidence": classification['confidence'],
        "model_type": "RULE-BASED PHYSICS + DYNAMOMETER CLASSIFIER (DEMO)",
        "reasoning": reasoning,
        "physics_evidence": {
            "temperature": round(temperature, 2),
            "viscosity": round(viscosity, 1),
            "fluid_resistance": round(viscosity / 1000.0, 3),
            "rod_dynamics": classification['mechanical_stress'].lower(),
            "rod_float": rod_float,
            "impact_load": impact_risk,
            "failure_risk": failure_risk,
        },
    }


def _simulate_css_cycle(dt: "DigitalTwinState", parameters: Dict) -> Dict:
    """Run a CSS what-if on a private model copy; never mutate the live well."""
    candidate = copy.deepcopy(dt)
    steam_volume = float(parameters['steam_volume'])
    injection_rate = float(parameters['steam_injection_rate'])
    injection_pressure = float(parameters['injection_pressure'])
    target_temperature = float(parameters['target_temperature'])
    injection_duration = float(parameters['injection_duration'])
    soak_duration = float(parameters['soak_duration'])
    production_duration = float(parameters['production_duration'])

    candidate.thermal_model.simulate_injection(
        injection_duration,
        injection_rate,
        target_temperature,
    )
    candidate.thermal_model.simulate_soak(soak_duration)
    candidate.update_state(dt_seconds=0.0)
    production_rate = candidate.flow_rate
    cycle_production = production_rate * production_duration
    candidate.thermal_model.simulate_production(production_duration, production_rate)
    candidate.update_state(dt_seconds=0.0)

    barrels = max(cycle_production * 6.28981, 1e-6)
    energy_per_barrel = (
        candidate.surface_state['power_consumption']
        * production_duration * 24.0 * 0.0036 / barrels
    )
    return {
        "parameters": {
            "steam_volume": steam_volume,
            "steam_injection_rate": injection_rate,
            "injection_pressure": injection_pressure,
            "target_temperature": target_temperature,
            "injection_duration": injection_duration,
            "soak_duration": soak_duration,
            "production_duration": production_duration,
        },
        "steam_oil_ratio": round(steam_volume / max(cycle_production, 1e-6), 3),
        "cycle_production": round(cycle_production, 2),
        "energy_per_barrel": round(energy_per_barrel, 4),
        "production_rate": round(production_rate, 2),
        "ending_temperature": round(candidate.thermal_model.current_temperature, 2),
        "ending_viscosity": round(
            candidate.viscosity_model.calculate_viscosity(candidate.thermal_model.current_temperature),
            2,
        ),
    }


def _validated_css_parameters(parameters: Dict) -> Dict:
    limits = {
        "steam_volume": (1.0, 5000.0),
        "steam_injection_rate": (1.0, 1000.0),
        "injection_pressure": (0.1, 30.0),
        "target_temperature": (45.0, 225.0),
        "injection_duration": (0.1, 30.0),
        "soak_duration": (0.0, 30.0),
        "production_duration": (0.1, 365.0),
    }
    validated = {}
    for name, (minimum, maximum) in limits.items():
        try:
            value = float(parameters.get(name))
        except (TypeError, ValueError):
            raise HTTPException(status_code=422, detail=f"{name} must be a number")
        if not math.isfinite(value) or not minimum <= value <= maximum:
            raise HTTPException(
                status_code=422,
                detail=f"{name} must be between {minimum} and {maximum}",
            )
        validated[name] = value
    expected_steam_volume = validated["steam_injection_rate"] * validated["injection_duration"]
    if not math.isclose(
        validated["steam_volume"], expected_steam_volume, rel_tol=0.01, abs_tol=0.01
    ):
        raise HTTPException(
            status_code=422,
            detail="steam_volume must match steam_injection_rate × injection_duration",
        )
    return validated


# ---------------------------------------------------------------------------
# DigitalTwinState
# ---------------------------------------------------------------------------
class DigitalTwinState:
    """
    Central state object.  All physics models live here; update_state() advances
    the simulation one step forward in time.
    """

    def __init__(self):
        self.well = {
            "id": 1,
            "name": "BW-07",
            "field": "Baghewala",
            "location": "Rajasthan, India",
            "depth": 1500.0,
            "reservoir_depth": 1350.0,
            "api_gravity": 18.0,
            "status": "PRODUCING",
        }

        # ── Physics models ────────────────────────────────────────────
        self.thermal_model = ThermalModel({
            'initial_temperature': 45.0,
            'steam_temperature': 250.0,
            'porosity': 0.25,
            'permeability': 500.0,
            'thermal_conductivity': 2.0,
            'heat_capacity': 2000.0,
            'thermal_radius': 10.0,
            'thermal_decline_rate': 0.1,
        })
        # Start in mid-production state (20 days after injection)
        # T = 45 + (225 - 45)*exp(-0.1*20) = 45 + 180*0.135 ≈ 69°C → reasonable
        self.thermal_model.current_temperature = 55.0
        self.thermal_model.time_since_injection = 20.0
        self.css_day = 20.0

        self.viscosity_model = ViscosityModel({
            'base_viscosity': 1000.0,
            'reference_temperature': 20.0,
            'activation_energy': 15000.0,
            'rheology_model': 'power_law',
            'consistency_index': 500.0,
            'flow_behavior_index': 0.8,
        })

        self.wellbore_model = WellboreModel({
            'depth': 1500.0,
            'casing_depth': 1400.0,
            'tubing_depth': 1450.0,
            'pump_depth': 1300.0,
            'perforation_depth': 1350.0,
            'tubing_diameter': 0.076,
            'casing_diameter': 0.178,
            'rod_diameter': 0.025,
        })

        self.rod_dynamics_model = RodDynamicsModel({
            'rod_length': 1300.0,
            'rod_diameter': 0.025,
            'rod_density': 7850.0,
            'youngs_modulus': 2.1e11,
            'damping_coefficient': 0.5,
        })

        self.dynamometer_model = DynamometerModel({
            'stroke_length': 2.5,
            'max_load': 50.0,
            'min_load': 10.0,
            'spm': 5.0,
        })

        self.rod_float_detector = RodFloatDetector({
            'velocity_threshold': 0.5,
            'load_threshold': 15.0,
            'vibration_threshold': 2.0,
        })

        self.surface_model = SurfaceModel({
            'motor_power': 50.0,
            'motor_efficiency': 0.90,
            'gearbox_ratio': 30.0,
            'vfd_efficiency': 0.95,
        })

        # ── Operating state ───────────────────────────────────────────
        self.current_spm      = 5.0
        self.current_scenario = "normal"
        self.sim_time         = 0.0        # continuous simulation clock (seconds)
        self.css_day          = 20.0       # days since last steam injection
        self.timestamp        = datetime.utcnow()

        # Cached sub-states (populated by update_state)
        self.thermal_state    = {}
        self.viscosity_state  = {}
        self.wellbore_state   = {}
        self.rod_dynamics_state = {}
        self.dynamometer_state  = {}
        self.surface_state      = {}
        self.flow_rate          = 15.0     # m³/day

        self.update_state()

    # ------------------------------------------------------------------ #
    #  Darcy flow rate                                                     #
    # ------------------------------------------------------------------ #
    def _calculate_darcy_flow_rate(self, temperature: float) -> float:
        """
        Steady-state Darcy's law for radial flow into a vertical wellbore:

            Q = (2π k h ΔP) / (μ ln(r_e / r_w))

        where:
            k  = permeability (m²)       [500 mD = 500e-15 m²]
            h  = reservoir thickness (m) [10 m]
            ΔP = drawdown (Pa)           [reservoir BHP − wellhead P]
            μ  = oil viscosity (Pa·s)
            r_e = drainage radius (m)    [100 m]
            r_w = wellbore radius (m)    [0.089 m, i.e., 3.5 in casing]

        Returns flow rate in m³/day.
        """
        k   = 500.0e-15     # m²  (500 mD)
        h   = 10.0          # m   reservoir thickness
        r_e = 100.0         # m   drainage radius
        r_w = 0.089         # m   wellbore radius
        # Drawdown: difference between reservoir pressure and wellbore flowing pressure
        P_reservoir = 940.0 * 9.81 * 1350.0 / 1000.0   # kPa  (hydrostatic at 1350 m)
        P_wf        = _mean(self.wellbore_model.pressure_profile)  # kPa
        delta_P     = max(0.0, (P_reservoir - P_wf) * 1000.0)      # Pa

        viscosity = self.viscosity_model.calculate_viscosity(temperature)
        mu = max(viscosity, 1.0) * 1e-3   # Pa·s (convert from cP)

        ln_re_rw = math.log(r_e / r_w)

        Q_m3s = (2.0 * math.pi * k * h * delta_P) / (mu * ln_re_rw + 1e-12)
        Q_m3d = Q_m3s * 86400.0   # m³/day

        # Physical bounds: 0.5 to 60 m³/day for a heavy-oil ESP well
        return max(0.5, min(60.0, Q_m3d))

    # ------------------------------------------------------------------ #
    #  Thermal decline                                                     #
    # ------------------------------------------------------------------ #
    def _advance_thermal_decline(self, dt_seconds: float):
        """
        Advance the reservoir temperature one time step using exponential
        CSS thermal decline:

            T(t) = T_res + (T_0 - T_res) * exp(-λ * t)

        where λ = thermal_decline_rate (1/day), t in days.
        The model progresses continuously so graphs show real evolution.
        """
        dt_days = dt_seconds / 86400.0
        self.css_day += dt_days

        T_res = self.thermal_model.reservoir_temperature
        lam = self.thermal_model.thermal_decline_rate
        T_current = self.thermal_model.current_temperature

        T_new = T_res + (T_current - T_res) * math.exp(-lam * dt_days)
        self.thermal_model.current_temperature = max(T_res, T_new)
        self.thermal_model.time_since_injection = self.css_day

    # ------------------------------------------------------------------ #
    #  Main update chain                                                   #
    # ------------------------------------------------------------------ #
    def update_state(self, dt_seconds: float = 2.0):
        """
        Advance all physics models by dt_seconds and cache results.

        Chain:
          thermal → viscosity → wellbore (temp + pressure + viscosity)
          → rod dynamics (wave equation) → dynamometer → surface model
          → Darcy flow rate
        """
        self.sim_time += dt_seconds
        self._advance_thermal_decline(dt_seconds)

        # 1. Thermal
        thermal_state = self.thermal_model.get_thermal_state()
        T_current = thermal_state['current_temperature']

        # 2. Viscosity at reservoir temperature
        viscosity_state = self.viscosity_model.get_viscosity_state(T_current)
        mu_cP = viscosity_state['current_viscosity']

        # 3. Wellbore profiles
        self.wellbore_model.update_temperature_profile(T_current)
        # Pressure needs a flow rate estimate; use cached value first iteration
        self.wellbore_model.update_pressure_profile(self.flow_rate, mu_cP)
        self.wellbore_model.update_viscosity_profile(
            self.wellbore_model.temperature_profile,
            self.viscosity_model,
        )
        wellbore_state = self.wellbore_model.get_wellbore_state()

        # 4. Rod dynamics — advance one wave-equation time step per update
        surface_disp = self.rod_dynamics_model.calculate_surface_displacement(
            self.current_spm, 2.5, self.sim_time
        )
        surface_vel = self.rod_dynamics_model.calculate_surface_velocity(
            self.current_spm, 2.5, self.sim_time
        )
        # Fluid resistance from mean wellbore viscosity
        mean_visc = _mean(wellbore_state['viscosity_profile'])
        fluid_resistance = mean_visc * 1e-3 * 500.0   # simplified: mu * rod_area_factor
        self.rod_dynamics_model.solve_wave_equation(
            surface_disp, surface_vel, fluid_resistance
        )
        rod_dynamics_state = self.rod_dynamics_model.get_rod_dynamics_state()

        # 5. Dynamometer card
        dynamometer_state = self.dynamometer_model.get_dynamometer_state(
            self.current_scenario
        )

        # 6. Surface model
        self.surface_model.current_spm = self.current_spm
        self.surface_model.current_frequency = \
            self.surface_model.calculate_frequency_from_spm(self.current_spm)
        mean_rod_load   = _surface_rod_load(self, dynamometer_state)
        load_variance   = _var(dynamometer_state['load'])
        rod_float_prob  = dynamometer_state['classification']['rod_float_probability']
        surface_state   = self.surface_model.get_surface_state(
            mean_rod_load,
            self.flow_rate,
            load_variance,
            rod_float_prob,
        )

        # 7. Darcy flow rate (uses freshly computed pressure profile)
        self.flow_rate = self._calculate_darcy_flow_rate(T_current)

        # Cache
        self.thermal_state      = thermal_state
        self.viscosity_state    = viscosity_state
        self.wellbore_state     = wellbore_state
        self.rod_dynamics_state = rod_dynamics_state
        self.dynamometer_state  = dynamometer_state
        self.surface_state      = surface_state
        self.timestamp          = datetime.utcnow()

    # ------------------------------------------------------------------ #
    #  Scenario control                                                    #
    # ------------------------------------------------------------------ #
    def set_scenario(self, scenario: str):
        """
        Jump to a named scenario by resetting the CSS clock and temperature,
        then immediately running one update so all downstream states are consistent.
        """
        self.current_scenario = scenario
        configs = {
            "normal":         (55.0, 5.0,  0.0),
            "cooling":        (48.0, 5.0,  30.0),
            "high_viscosity": (42.0, 4.5,  60.0),
            "rod_float":      (40.0, 5.0,  80.0),
            "impact_loading": (45.0, 6.0,  20.0),
            "optimized":      (52.0, 3.5,  10.0),
        }
        T, spm, day = configs.get(scenario, (55.0, 5.0, 0.0))
        self.thermal_model.current_temperature = T
        self.css_day = day
        self.thermal_model.time_since_injection = day
        self.current_spm = spm
        self.update_state(dt_seconds=0.0)   # recalculate without advancing time


# Global singleton
digital_twin = DigitalTwinState()


# ---------------------------------------------------------------------------
# WebSocket connection manager
# ---------------------------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass


manager = ConnectionManager()


# ---------------------------------------------------------------------------
# REST endpoints
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    return {"message": "Baghewala Digital Twin API", "version": "2.0.0", "status": "online"}


@app.get("/api/well")
async def get_well():
    return digital_twin.well


@app.get("/api/telemetry")
async def get_telemetry():
    digital_twin.update_state(dt_seconds=2.0)
    return _telemetry_payload(digital_twin)


@app.get("/api/reservoir/state")
async def get_reservoir_state():
    return digital_twin.thermal_state


@app.get("/api/wellbore/state")
async def get_wellbore_state():
    return digital_twin.wellbore_state


@app.get("/api/srp/state")
async def get_srp_state():
    return {
        "spm":               round(digital_twin.current_spm, 2),
        "stroke_length":     2.5,
        "rod_load":          round(_surface_rod_load(digital_twin), 2),
        "surface_vibration": round(digital_twin.surface_state['surface_vibration'], 3),
        "pump_efficiency":   round(digital_twin.surface_state['pump_efficiency'], 3),
        "downhole_pressure": round(_mean(digital_twin.wellbore_state['pressure_profile']), 2),
        "displacement":      digital_twin.rod_dynamics_state['displacement_profile'],
        "velocity":          digital_twin.rod_dynamics_state['velocity_profile'],
        "status":            "operating",
    }


@app.get("/api/css/state")
async def get_css_state():
    day = digital_twin.css_day

    # Determine CSS phase from elapsed days
    if day < 5.0:
        phase  = "injection"
        inj_rate = 100.0 * (1.0 - day / 5.0)
    elif day < 10.0:
        phase    = "soak"
        inj_rate = 0.0
    else:
        phase    = "production"
        inj_rate = 0.0

    cycle_prod = digital_twin.flow_rate * max(0.0, day - 10.0)

    return {
        "cycle_number":       5,
        "phase":              phase,
        "days_in_phase":      round(day, 1),
        "injection_start":    "2024-01-15T00:00:00",
        "injection_end":      "2024-01-20T00:00:00",
        "soak_start":         "2024-01-20T00:00:00",
        "soak_end":           "2024-01-25T00:00:00",
        "production_start":   "2024-01-25T00:00:00",
        "production_end":     None,
        "steam_volume":       500.0,
        "steam_injection_rate": round(inj_rate, 2),
        "injection_pressure": 8.0,
        "target_temperature": 180.0,
        "production_cutoff":  5.0,
        "steam_oil_ratio":    3.5,
        "cycle_production":   round(cycle_prod, 1),
        "status":             phase,
        "current_temperature": round(digital_twin.thermal_state['current_temperature'], 2),
        "current_viscosity":   round(digital_twin.viscosity_state['current_viscosity'], 1),
    }


@app.get("/api/ai/insights")
async def get_ai_insights():
    return _ai_insights_payload(digital_twin)


@app.post("/api/simulation/run")
async def run_simulation(parameters: Dict):
    """
    What-if simulation: capture baseline, apply new SPM, compute simulated state,
    calculate real improvement metrics, then restore original state.
    """
    working = copy.deepcopy(digital_twin)
    original_spm = working.current_spm
    baseline_rod_load  = round(_surface_rod_load(working), 3)
    baseline_vibration = round(digital_twin.surface_state['surface_vibration'], 3)
    baseline_rod_float = digital_twin.dynamometer_state['classification']['rod_float_probability']
    baseline_impact    = digital_twin.dynamometer_state['classification']['impact_loading_risk']
    baseline_energy    = round(digital_twin.surface_state['power_consumption'], 3)
    baseline_flow      = round(digital_twin.flow_rate, 2)

    # ── Apply new SPM and re-run physics ──
    candidate_spm = max(1.0, min(8.0, float(parameters.get('spm', original_spm))))
    working.current_spm = candidate_spm
    working.surface_model.current_spm = candidate_spm
    working.surface_model.current_frequency = working.surface_model.calculate_frequency_from_spm(candidate_spm)
    for _ in range(5):
        working.update_state(dt_seconds=0.5)

    sim_rod_load  = round(_surface_rod_load(working), 3)
    sim_vibration = round(working.surface_state['surface_vibration'], 3)
    sim_rod_float = working.dynamometer_state['classification']['rod_float_probability']
    sim_impact    = working.dynamometer_state['classification']['impact_loading_risk']
    sim_energy    = round(working.surface_state['power_consumption'], 3)
    sim_flow      = round(working.flow_rate, 2)

    return {
        "baseline": {
            "spm":              round(original_spm, 2),
            "rod_load":         baseline_rod_load,
            "vibration":        baseline_vibration,
            "rod_float_risk":   round(baseline_rod_float, 3),
            "impact_loading_risk": round(baseline_impact, 3),
            "energy":           baseline_energy,
            "flow_rate":        baseline_flow,
        },
        "simulated": {
            "spm":              round(candidate_spm, 2),
            "rod_load":         sim_rod_load,
            "vibration":        sim_vibration,
            "rod_float_risk":   round(sim_rod_float, 3),
            "impact_loading_risk": round(sim_impact, 3),
            "energy":           sim_energy,
            "flow_rate":        sim_flow,
        },
        "improvement": {
            "rod_load_reduction":      round(baseline_rod_load  - sim_rod_load,  3),
            "vibration_reduction":     round(baseline_vibration - sim_vibration, 3),
            "rod_float_risk_reduction": round(baseline_rod_float - sim_rod_float, 3),
            "energy_savings":          round(baseline_energy    - sim_energy,    3),
            "flow_rate_change":        round(sim_flow           - baseline_flow,  3),
        },
    }


@app.post("/api/optimization/run")
async def run_optimization(parameters: Dict):
    """
    Multi-objective SPM sweep.  Evaluates SPM in [3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0]
    and selects the best according to weighted objectives.
    """
    objectives = parameters.get('objectives', {
        'maximize_production':     True,
        'minimize_energy':         True,
        'minimize_rod_float_risk': True,
    })

    original_spm = digital_twin.current_spm
    baseline = copy.deepcopy(digital_twin)
    scenarios_spm = [3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0]
    results = []

    for spm in scenarios_spm:
        candidate = copy.deepcopy(baseline)
        candidate.current_spm = spm
        candidate.surface_model.current_spm = spm
        candidate.surface_model.current_frequency = candidate.surface_model.calculate_frequency_from_spm(spm)
        for _ in range(3):
            candidate.update_state(dt_seconds=0.5)

        results.append({
            "spm":                spm,
            "production":         round(candidate.flow_rate, 2),
            "energy":             round(candidate.surface_state['power_consumption'], 2),
            "rod_float_risk":     candidate.dynamometer_state['classification']['rod_float_probability'],
            "impact_loading_risk":candidate.dynamometer_state['classification']['impact_loading_risk'],
            "vibration":          round(candidate.surface_state['surface_vibration'], 3),
        })

    # ── Multi-objective scoring (lower is better) ─────────────────────
    # Normalise each objective to [0, 1] then weight and sum
    max_prod   = max(r['production']    for r in results) or 1.0
    max_energy = max(r['energy']        for r in results) or 1.0
    max_risk   = max(r['rod_float_risk']for r in results) or 1.0

    def score(r):
        prod_score   = (1.0 - r['production']    / max_prod)   if objectives.get('maximize_production')     else 0.0
        energy_score = (r['energy']               / max_energy) if objectives.get('minimize_energy')         else 0.0
        risk_score   = (r['rod_float_risk']        / (max_risk + 1e-9)) if objectives.get('minimize_rod_float_risk') else 0.0
        return prod_score * 0.4 + energy_score * 0.35 + risk_score * 0.25

    best_scenario = min(results, key=score)
    current_state = min(results, key=lambda result: abs(result["spm"] - original_spm))

    return {
        "current_state":   current_state,
        "optimized_state": best_scenario,
        "all_scenarios":   results,
        "recommendation": {
            "spm": best_scenario['spm'],
            "vfd_frequency": round(
                baseline.surface_model.calculate_frequency_from_spm(best_scenario['spm']), 1),
            "expected_improvement": {
                "energy_savings": round(
                    (current_state['energy'] - best_scenario['energy'])
                    / (current_state['energy'] + 1e-9) * 100.0, 1),
                "rod_float_risk_reduction": round(
                    (current_state['rod_float_risk'] - best_scenario['rod_float_risk']) * 100.0, 1),
                "production_change": round(
                    (best_scenario['production'] - current_state['production'])
                    / (current_state['production'] + 1e-9) * 100.0, 1),
            },
        },
    }


@app.post("/api/vfd/simulate")
async def simulate_vfd(parameters: Dict):
    target_spm = float(parameters.get('target_spm', 3.5))
    result = digital_twin.surface_model.update_vfd(target_spm)
    digital_twin.current_spm = result['current_spm']
    digital_twin.update_state()

    return {
        "vfd_result": result,
        "telemetry": {
            "rod_load":          round(_mean(digital_twin.rod_dynamics_state['load_profile']), 2),
            "vibration":         round(digital_twin.surface_state['surface_vibration'], 3),
            "power_consumption": round(digital_twin.surface_state['power_consumption'], 2),
        },
    }


@app.post("/api/scenario")
async def set_scenario(parameters: Dict):
    scenario = parameters.get('scenario', 'normal')
    digital_twin.set_scenario(scenario)
    return {
        "scenario":  scenario,
        "state":     "applied",
        "timestamp": digital_twin.timestamp.isoformat(),
    }


@app.get("/api/alerts")
async def get_alerts():
    digital_twin.update_state()

    alerts = []
    rod_float_prob = digital_twin.dynamometer_state['classification']['rod_float_probability']
    impact_risk    = digital_twin.dynamometer_state['classification']['impact_loading_risk']
    temp           = digital_twin.thermal_state['current_temperature']
    pressure       = _mean(digital_twin.wellbore_state['pressure_profile'])
    vibration      = digital_twin.surface_state['surface_vibration']
    ts             = digital_twin.timestamp.isoformat()

    if rod_float_prob > 0.7:
        alerts.append({"severity": "CRITICAL", "parameter": "rod_float",
                        "value": rod_float_prob, "threshold": 0.7,
                        "prediction": "ROD FLOAT DETECTED",
                        "recommended_action": "REDUCE SPM IMMEDIATELY", "timestamp": ts})
    elif rod_float_prob > 0.5:
        alerts.append({"severity": "HIGH", "parameter": "rod_float",
                        "value": rod_float_prob, "threshold": 0.5,
                        "prediction": "ROD FLOAT PREDICTED",
                        "recommended_action": "Consider reducing SPM", "timestamp": ts})

    if impact_risk > 0.6:
        alerts.append({"severity": "HIGH", "parameter": "impact_loading",
                        "value": impact_risk, "threshold": 0.6,
                        "prediction": "IMPACT LOADING PREDICTED",
                        "recommended_action": "Reduce pump speed or check rod string",
                        "timestamp": ts})

    if temp < 45.0:
        alerts.append({"severity": "HIGH", "parameter": "temperature",
                        "value": temp, "threshold": 45.0,
                        "prediction": "VISCOSITY INCREASING",
                        "recommended_action": "Schedule steam injection or reduce pump speed",
                        "timestamp": ts})
    elif temp < 50.0:
        alerts.append({"severity": "MEDIUM", "parameter": "temperature",
                        "value": temp, "threshold": 50.0,
                        "prediction": "RESERVOIR COOLING",
                        "recommended_action": "Monitor temperature and viscosity",
                        "timestamp": ts})

    if vibration > 3.0:
        alerts.append({"severity": "HIGH", "parameter": "vibration",
                        "value": vibration, "threshold": 3.0,
                        "prediction": "HIGH SURFACE VIBRATION",
                        "recommended_action": "Check rod guides and pumpjack balance",
                        "timestamp": ts})

    return alerts


@app.get("/api/dynamometer")
async def get_dynamometer():
    return digital_twin.dynamometer_state


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------

async def _stream_well_telemetry(websocket: WebSocket, dt: "DigitalTwinState"):
    await manager.connect(websocket)
    try:
        while True:
            dt.update_state(dt_seconds=2.0)
            await websocket.send_json(_telemetry_payload(dt))
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
        raise


@app.websocket("/ws/digital-twin")
async def websocket_endpoint(websocket: WebSocket):
    await _stream_well_telemetry(websocket, digital_twin)


@app.websocket("/ws/digital-twin/{well_id}")
async def well_websocket_endpoint(websocket: WebSocket, well_id: str):
    try:
        dt = _get_well(well_id)
    except HTTPException:
        await websocket.close(code=1008, reason=f"Unknown well: {well_id}")
        return
    await _stream_well_telemetry(websocket, dt)


# ===========================================================================
# NEW ENDPOINTS — Authentication, Fleet, and well-scoped /api/{well_id}/...
# ===========================================================================
import random as _random

# ---------------------------------------------------------------------------
# Hardcoded users (prototype only — replace with real DB + bcrypt in prod)
# ---------------------------------------------------------------------------
USERS_DB = {
    "supervisor@oil.com": {
        "password":       "supervisor123",
        "name":           "Field Supervisor",
        "role":           "supervisor",
        "assignedWellId": "",
        "token":          "mock-jwt-supervisor-token",
    },
    "incharge14@oil.com": {
        "password":       "incharge123",
        "name":           "Well Incharge — BW-14",
        "role":           "incharge",
        "assignedWellId": "well-14",
        "token":          "mock-jwt-incharge-token",
    },
}

# ---------------------------------------------------------------------------
# Well registry — maps URL wellId → DigitalTwinState instance
# well-14 reuses the global `digital_twin`; others get their own instance.
# ---------------------------------------------------------------------------
WELL_META = {
    "well-12": {"id": 12, "name": "BW-12", "field": "Baghewala", "location": "Rajasthan, India",
                "depth": 1480.0, "reservoir_depth": 1330.0, "api_gravity": 19.5, "status": "PRODUCING"},
    "well-13": {"id": 13, "name": "BW-13", "field": "Baghewala", "location": "Rajasthan, India",
                "depth": 1510.0, "reservoir_depth": 1360.0, "api_gravity": 17.8, "status": "PRODUCING"},
    "well-14": {"id": 14, "name": "BW-14", "field": "Baghewala", "location": "Rajasthan, India",
                "depth": 1500.0, "reservoir_depth": 1350.0, "api_gravity": 18.0, "status": "PRODUCING"},
    "well-15": {"id": 15, "name": "BW-15", "field": "Baghewala", "location": "Rajasthan, India",
                "depth": 1495.0, "reservoir_depth": 1345.0, "api_gravity": 20.1, "status": "PRODUCING"},
    "well-16": {"id": 16, "name": "BW-16", "field": "Baghewala", "location": "Rajasthan, India",
                "depth": 1520.0, "reservoir_depth": 1370.0, "api_gravity": 17.2, "status": "PRODUCING"},
    "well-17": {"id": 17, "name": "BW-17", "field": "Baghewala", "location": "Rajasthan, India",
                "depth": 1465.0, "reservoir_depth": 1315.0, "api_gravity": 18.9, "status": "OFFLINE"},
}

# Lazy-loaded registry: only create a DigitalTwinState when first requested
_WELL_INSTANCES: Dict[str, "DigitalTwinState"] = {}

def _get_well(well_id: str) -> "DigitalTwinState":
    """Return the DigitalTwinState for the given well_id, creating it if needed."""
    if well_id == "well-14":
        return digital_twin          # reuse the existing global singleton
    if well_id not in _WELL_INSTANCES:
        if well_id not in WELL_META:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail=f"Well '{well_id}' not found")
        # Build instance without triggering the default __init__ update_state
        # by using set_scenario which sets temp+css_day then calls update_state(dt=0)
        dt = DigitalTwinState()
        dt.well = WELL_META[well_id]
        # Override temperature and CSS clock with realistic mid-production values
        seed_temp = {"well-12": 58.0, "well-13": 48.0, "well-15": 61.0,
                     "well-16": 46.0, "well-17": 38.0}.get(well_id, 55.0)
        seed_day  = {"well-12": 5.0,  "well-13": 30.0, "well-15": 3.0,
                     "well-16": 45.0, "well-17": 90.0}.get(well_id, 20.0)
        dt.thermal_model.current_temperature = seed_temp
        dt.css_day = seed_day
        dt.thermal_model.time_since_injection = seed_day
        dt.update_state(dt_seconds=0.0)
        _WELL_INSTANCES[well_id] = dt
    return _WELL_INSTANCES[well_id]


# ---------------------------------------------------------------------------
# /api/auth/login
# ---------------------------------------------------------------------------
@app.post("/api/auth/login")
async def auth_login(body: Dict):
    email    = str(body.get("email", "")).lower().strip()
    password = str(body.get("password", ""))
    record   = USERS_DB.get(email)
    if not record or record["password"] != password:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "token":          record["token"],
        "user": {
            "email":          email,
            "name":           record["name"],
            "role":           record["role"],
            "assignedWellId": record["assignedWellId"],
        },
    }


# ---------------------------------------------------------------------------
# /api/fleet/wells  (supervisor dashboard)
# ---------------------------------------------------------------------------
@app.get("/api/fleet/wells")
async def get_fleet_wells():
    """
    Returns high-level status for all wells in the fleet.
    For prototype wells without a live DigitalTwinState, uses WELL_META + mock values.
    """
    fleet = []
    for well_id, meta in WELL_META.items():
        if meta["status"] == "OFFLINE":
            fleet.append({
                "id":          well_id,
                "name":        meta["name"],
                "status":      "offline",
                "production":  0.0,
                "temperature": 38.0,
                "spm":         0.0,
                "energy":      0.0,
                "alerts":      1,
            })
            continue

        try:
            dt = _get_well(well_id)
            dt.update_state(dt_seconds=2.0)

            # Count simple threshold alerts
            rod_float = dt.dynamometer_state['classification']['rod_float_probability']
            temp      = dt.thermal_state['current_temperature']
            alert_count = int(rod_float > 0.7) + int(rod_float > 0.5) + int(temp < 45.0)

            if alert_count >= 2:
                status = "alert"
            elif alert_count == 1 or temp < 50.0:
                status = "warning"
            else:
                status = "optimal"

            fleet.append({
                "id":          well_id,
                "name":        meta["name"],
                "status":      status,
                "production":  round(dt.flow_rate, 1),
                "temperature": round(dt.thermal_state['current_temperature'], 1),
                "spm":         round(dt.current_spm, 1),
                "energy":      round(dt.surface_state.get('power_consumption', 0.0), 1),
                "alerts":      alert_count,
            })
        except Exception:
            fleet.append({
                "id":          well_id,
                "name":        meta["name"],
                "status":      "warning",
                "production":  15.0,
                "temperature": 50.0,
                "spm":         5.0,
                "energy":      45.0,
                "alerts":      0,
            })

    return fleet


# ---------------------------------------------------------------------------
# Helper to build all well-scoped responses (reuses logic from existing fns)
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Well-scoped endpoints: /api/{well_id}/<resource>
# ---------------------------------------------------------------------------
@app.get("/api/wells/{well_id}/well")
async def wid_get_well(well_id: str):
    dt = _get_well(well_id)
    return dt.well


@app.get("/api/wells/{well_id}/telemetry")
async def wid_get_telemetry(well_id: str):
    dt = _get_well(well_id)
    dt.update_state(dt_seconds=2.0)
    return _telemetry_payload(dt)


@app.get("/api/wells/{well_id}/reservoir/state")
async def wid_get_reservoir(well_id: str):
    dt = _get_well(well_id)
    return dt.thermal_state


@app.get("/api/wells/{well_id}/wellbore/state")
async def wid_get_wellbore(well_id: str):
    dt = _get_well(well_id)
    return dt.wellbore_state


@app.get("/api/wells/{well_id}/srp/state")
async def wid_get_srp(well_id: str):
    dt = _get_well(well_id)
    return {
        "spm":               round(dt.current_spm, 2),
        "stroke_length":     2.5,
        "rod_load":          round(_surface_rod_load(dt), 2),
        "surface_vibration": round(dt.surface_state['surface_vibration'], 3),
        "pump_efficiency":   round(dt.surface_state['pump_efficiency'], 3),
        "downhole_pressure": round(_mean(dt.wellbore_state['pressure_profile']), 2),
        "displacement":      dt.rod_dynamics_state['displacement_profile'],
        "velocity":          dt.rod_dynamics_state['velocity_profile'],
        "stress":            dt.rod_dynamics_state['stress_profile'],
        "status":            "operating",
    }


@app.get("/api/wells/{well_id}/css/state")
async def wid_get_css(well_id: str):
    dt = _get_well(well_id)
    day = dt.css_day
    if day < 5.0:
        phase, days_in_phase, inj_rate = "injection", day, 100.0 * (1.0 - day / 5.0)
    elif day < 10.0:
        phase, days_in_phase, inj_rate = "soak", day - 5.0, 0.0
    else:
        phase, days_in_phase, inj_rate = "production", day - 10.0, 0.0
    cycle_production = dt.flow_rate * max(0.0, days_in_phase) if phase == "production" else 0.0
    steam_volume = 500.0
    return {
        "cycle_number": None, "phase": phase, "days_in_phase": round(days_in_phase, 1),
        "steam_volume": steam_volume, "injection_duration": 5.0,
        "soak_duration": 5.0, "production_duration": 30.0,
        "steam_injection_rate": round(inj_rate, 2),
        "injection_pressure": 8.0, "target_temperature": 180.0,
        "production_cutoff": 5.0,
        "steam_oil_ratio": round(steam_volume / cycle_production, 3) if cycle_production > 0 else 0.0,
        "cycle_production": round(cycle_production, 1),
        "status": phase,
        "current_temperature": round(dt.thermal_state['current_temperature'], 2),
        "current_viscosity":   round(dt.viscosity_state['current_viscosity'], 1),
    }


@app.get("/api/wells/{well_id}/ai/insights")
async def wid_get_ai(well_id: str):
    dt = _get_well(well_id)
    return _ai_insights_payload(dt)


@app.get("/api/wells/{well_id}/dynamometer")
async def wid_get_dynamometer(well_id: str):
    dt = _get_well(well_id)
    return dt.dynamometer_state


@app.get("/api/wells/{well_id}/alerts")
async def wid_get_alerts(well_id: str):
    dt = _get_well(well_id)
    alerts = []
    rod_float = dt.dynamometer_state['classification']['rod_float_probability']
    impact    = dt.dynamometer_state['classification']['impact_loading_risk']
    temp      = dt.thermal_state['current_temperature']
    vibration = dt.surface_state['surface_vibration']
    ts        = dt.timestamp.isoformat()
    if rod_float > 0.7:
        alerts.append({"severity": "CRITICAL", "parameter": "rod_float", "value": rod_float,
                        "threshold": 0.7, "prediction": "ROD FLOAT DETECTED",
                        "recommended_action": "REDUCE SPM IMMEDIATELY", "timestamp": ts})
    elif rod_float > 0.5:
        alerts.append({"severity": "HIGH", "parameter": "rod_float", "value": rod_float,
                        "threshold": 0.5, "prediction": "ROD FLOAT PREDICTED",
                        "recommended_action": "Consider reducing SPM", "timestamp": ts})
    if impact > 0.6:
        alerts.append({"severity": "HIGH", "parameter": "impact_loading", "value": impact,
                        "threshold": 0.6, "prediction": "IMPACT LOADING PREDICTED",
                        "recommended_action": "Reduce pump speed", "timestamp": ts})
    if temp < 45.0:
        alerts.append({"severity": "HIGH", "parameter": "temperature", "value": temp,
                        "threshold": 45.0, "prediction": "VISCOSITY INCREASING",
                        "recommended_action": "Schedule steam injection", "timestamp": ts})
    elif temp < 50.0:
        alerts.append({"severity": "MEDIUM", "parameter": "temperature", "value": temp,
                        "threshold": 50.0, "prediction": "RESERVOIR COOLING",
                        "recommended_action": "Monitor temperature", "timestamp": ts})
    if vibration > 3.0:
        alerts.append({"severity": "HIGH", "parameter": "vibration", "value": vibration,
                        "threshold": 3.0, "prediction": "HIGH SURFACE VIBRATION",
                        "recommended_action": "Check rod guides", "timestamp": ts})
    return alerts


@app.post("/api/wells/{well_id}/simulation/run")
async def wid_run_simulation(well_id: str, parameters: Dict):
    dt = _get_well(well_id)
    working = copy.deepcopy(dt)
    orig_spm = working.current_spm
    b_load = round(_surface_rod_load(working), 3)
    b_vib  = round(dt.surface_state['surface_vibration'], 3)
    b_rf   = dt.dynamometer_state['classification']['rod_float_probability']
    b_imp  = dt.dynamometer_state['classification']['impact_loading_risk']
    b_eng  = round(dt.surface_state['power_consumption'], 3)
    b_flow = round(dt.flow_rate, 2)
    try:
        simulated_spm = float(parameters.get('spm', orig_spm))
    except (TypeError, ValueError):
        raise HTTPException(status_code=422, detail="spm must be a number")
    if not math.isfinite(simulated_spm) or not 1.0 <= simulated_spm <= 8.0:
        raise HTTPException(status_code=422, detail="spm must be between 1 and 8")
    working.current_spm = simulated_spm
    working.surface_model.current_spm = simulated_spm
    working.surface_model.current_frequency = working.surface_model.calculate_frequency_from_spm(simulated_spm)
    for _ in range(5):
        working.update_state(dt_seconds=0.5)
    s_load = round(_surface_rod_load(working), 3)
    s_vib  = round(working.surface_state['surface_vibration'], 3)
    s_rf   = working.dynamometer_state['classification']['rod_float_probability']
    s_imp  = working.dynamometer_state['classification']['impact_loading_risk']
    s_eng  = round(working.surface_state['power_consumption'], 3)
    s_flow = round(working.flow_rate, 2)
    return {
        "baseline":    {"spm": round(orig_spm,2), "rod_load": b_load, "vibration": b_vib,
                         "rod_float_risk": round(b_rf,3), "impact_loading_risk": round(b_imp,3),
                         "energy": b_eng, "flow_rate": b_flow},
        "simulated":   {"spm": round(simulated_spm,2), "rod_load": s_load,
                         "vibration": s_vib, "rod_float_risk": round(s_rf,3),
                         "impact_loading_risk": round(s_imp,3), "energy": s_eng, "flow_rate": s_flow},
        "improvement": {"rod_load_reduction": round(b_load-s_load,3),
                         "vibration_reduction": round(b_vib-s_vib,3),
                         "rod_float_risk_reduction": round(b_rf-s_rf,3),
                         "energy_savings": round(b_eng-s_eng,3),
                         "flow_rate_change": round(s_flow-b_flow,3)},
    }


@app.post("/api/wells/{well_id}/optimization/run")
async def wid_run_optimization(well_id: str, parameters: Dict):
    dt = _get_well(well_id)
    objectives = parameters.get('objectives', {'maximize_production': True, 'minimize_energy': True, 'minimize_rod_float_risk': True})
    orig_spm = dt.current_spm
    baseline = copy.deepcopy(dt)
    results = []
    for spm in [3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0]:
        candidate = copy.deepcopy(baseline)
        candidate.current_spm = spm
        candidate.surface_model.current_spm = spm
        candidate.surface_model.current_frequency = candidate.surface_model.calculate_frequency_from_spm(spm)
        for _ in range(3):
            candidate.update_state(dt_seconds=0.5)
        results.append({"spm": spm, "production": round(candidate.flow_rate,2),
                         "energy": round(candidate.surface_state['power_consumption'],2),
                         "rod_float_risk": candidate.dynamometer_state['classification']['rod_float_probability'],
                         "impact_loading_risk": candidate.dynamometer_state['classification']['impact_loading_risk'],
                         "vibration": round(candidate.surface_state['surface_vibration'],3)})
    max_prod = max(r['production'] for r in results) or 1.0
    max_eng  = max(r['energy'] for r in results) or 1.0
    max_risk = max(r['rod_float_risk'] for r in results) or 1.0
    def score(r):
        return ((1.0-r['production']/max_prod)*0.4 if objectives.get('maximize_production') else 0.0) + \
               ((r['energy']/max_eng)*0.35 if objectives.get('minimize_energy') else 0.0) + \
               ((r['rod_float_risk']/(max_risk+1e-9))*0.25 if objectives.get('minimize_rod_float_risk') else 0.0)
    best = min(results, key=score)
    cur  = min(results, key=lambda result: abs(result["spm"] - orig_spm))
    return {"current_state": cur, "optimized_state": best, "all_scenarios": results,
            "recommendation": {"spm": best['spm'],
                                "vfd_frequency": round(baseline.surface_model.calculate_frequency_from_spm(best['spm']),1),
                                "expected_improvement": {
                                    "energy_savings": round((cur['energy']-best['energy'])/(cur['energy']+1e-9)*100,1),
                                    "rod_float_risk_reduction": round((cur['rod_float_risk']-best['rod_float_risk'])*100,1),
                                    "production_change": round((best['production']-cur['production'])/(cur['production']+1e-9)*100,1)}}}


@app.post("/api/wells/{well_id}/css/simulate")
async def wid_simulate_css(well_id: str, parameters: Dict):
    dt = _get_well(well_id)
    request = _validated_css_parameters(parameters)
    baseline_parameters = {
        "steam_volume": 500.0,
        "steam_injection_rate": 100.0,
        "injection_pressure": 8.0,
        "target_temperature": 180.0,
        "injection_duration": 5.0,
        "soak_duration": 5.0,
        "production_duration": 30.0,
    }
    return {
        "baseline": _simulate_css_cycle(dt, baseline_parameters),
        "simulated": _simulate_css_cycle(dt, request),
    }


@app.post("/api/wells/{well_id}/css/optimize")
async def wid_optimize_css(well_id: str, parameters: Dict):
    dt = _get_well(well_id)
    request = _validated_css_parameters(parameters)
    candidates = []
    for rate_factor in (0.8, 1.0, 1.2):
        for duration_delta in (-1.0, 0.0, 1.0):
            candidate_parameters = dict(request)
            candidate_parameters["steam_injection_rate"] = min(
                1000.0, request["steam_injection_rate"] * rate_factor
            )
            candidate_parameters["injection_duration"] = max(
                0.1, min(30.0, request["injection_duration"] + duration_delta)
            )
            candidate_parameters["steam_volume"] = (
                candidate_parameters["steam_injection_rate"]
                * candidate_parameters["injection_duration"]
            )
            result = _simulate_css_cycle(dt, candidate_parameters)
            candidates.append(result)

    max_production = max(item["cycle_production"] for item in candidates) or 1.0
    max_energy = max(item["energy_per_barrel"] for item in candidates) or 1.0
    max_sor = max(item["steam_oil_ratio"] for item in candidates) or 1.0
    optimized = min(
        candidates,
        key=lambda item: (
            item["steam_oil_ratio"] / max_sor * 0.4
            + item["energy_per_barrel"] / max_energy * 0.3
            + (1.0 - item["cycle_production"] / max_production) * 0.3
        ),
    )
    return {
        "baseline": _simulate_css_cycle(dt, request),
        "optimized": optimized,
        "candidates": candidates,
    }


@app.post("/api/wells/{well_id}/vfd/simulate")
async def wid_simulate_vfd(well_id: str, parameters: Dict):
    dt     = _get_well(well_id)
    try:
        target_spm = float(parameters.get('target_spm', 3.5))
    except (TypeError, ValueError):
        raise HTTPException(status_code=422, detail="target_spm must be a number")
    if not math.isfinite(target_spm) or not 1.0 <= target_spm <= 8.0:
        raise HTTPException(status_code=422, detail="target_spm must be between 1 and 8")
    result = dt.surface_model.update_vfd(target_spm)
    dt.current_spm = result['current_spm']
    dt.update_state(dt_seconds=2.0)
    return {"vfd_result": result, "telemetry": _telemetry_payload(dt)}


@app.post("/api/wells/{well_id}/scenario")
async def wid_set_scenario(well_id: str, parameters: Dict):
    dt = _get_well(well_id)
    dt.set_scenario(parameters.get('scenario', 'normal'))
    return {"scenario": parameters.get('scenario'), "state": "applied", "timestamp": dt.timestamp.isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
