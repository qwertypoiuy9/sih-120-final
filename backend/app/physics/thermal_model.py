"""
DIGITAL TWIN DEMONSTRATION MODEL
Thermal Model based on Bober-Lantz framework for CSS operations
This is a demonstration model for prototype purposes
"""

import math

try:
    import numpy as np
except ImportError:
    import math
    class np:
        @staticmethod
        def exp(x):
            if isinstance(x, list):
                return [math.exp(val) for val in x]
            return math.exp(x)
        @staticmethod
        def linspace(start, stop, num):
            return [start + (stop - start) * i / (num - 1) for i in range(num)]
        @staticmethod
        def pi():
            return math.pi

from typing import Dict, Tuple
from datetime import datetime, timedelta

class ThermalModel:
    """
    Simulates reservoir heating and cooling during CSS operations
    Based on Bober-Lantz thermal model framework
    """

    def __init__(self, reservoir_params: Dict):
        self.reservoir_temperature = reservoir_params.get('initial_temperature', 45.0)  # °C
        self.steam_temperature = reservoir_params.get('steam_temperature', 250.0)  # °C
        self.porosity = reservoir_params.get('porosity', 0.25)
        self.reservoir_thickness = reservoir_params.get('reservoir_thickness', 10.0)  # m
        self.rock_density = reservoir_params.get('rock_density', 2200.0)  # kg/m³
        self.water_density = reservoir_params.get('water_density', 1000.0)  # kg/m³
        self.steam_enthalpy = reservoir_params.get('steam_enthalpy', 2.2e6)  # J/kg
        self.permeability = reservoir_params.get('permeability', 500.0)  # mD
        self.thermal_conductivity = reservoir_params.get('thermal_conductivity', 2.0)  # W/(m·K)
        self.heat_capacity = reservoir_params.get('heat_capacity', 2000.0)  # J/(kg·K)
        self.thermal_radius = reservoir_params.get('thermal_radius', 10.0)  # m
        self.thermal_decline_rate = reservoir_params.get('thermal_decline_rate', 0.1)  # 1/day

        self.current_temperature = self.reservoir_temperature
        self.time_since_injection = 0.0  # days

    def calculate_temperature_profile(self, radius: np.ndarray, time: float) -> np.ndarray:
        """
        Calculate temperature as function of radius and time
        Uses simplified thermal diffusion equation
        """
        thermal_diffusivity = self.thermal_conductivity / (self.porosity * self.heat_capacity * 1000)
        
        # Simplified thermal front propagation
        thermal_front = np.sqrt(4 * thermal_diffusivity * time * 86400)  # Convert days to seconds
        
        temperature_profile = self.reservoir_temperature + \
                            (self.steam_temperature - self.reservoir_temperature) * \
                            np.exp(-np.pi * radius**2 / (4 * thermal_diffusivity * time * 86400 + 1e-6))
        
        return temperature_profile

    def simulate_injection(self, duration: float, injection_rate: float,
                           target_temperature: float = None) -> Dict:
        """
        Simulate steam injection phase
        duration: days
        injection_rate: tons/day
        """
        heating_efficiency = 0.85
        injected_mass_kg = max(0.0, injection_rate) * max(0.0, duration) * 1000.0
        heated_volume_m3 = math.pi * self.thermal_radius**2 * self.reservoir_thickness
        volumetric_heat_capacity = (
            (1.0 - self.porosity) * self.rock_density * self.heat_capacity
            + self.porosity * self.water_density * 4180.0
        )
        heat_capacity_j_per_c = max(heated_volume_m3 * volumetric_heat_capacity, 1.0)
        injected_energy_j = injected_mass_kg * self.steam_enthalpy * heating_efficiency
        temperature_increase = injected_energy_j / heat_capacity_j_per_c

        maximum_temperature = min(
            self.steam_temperature * 0.9,
            target_temperature if target_temperature is not None else self.steam_temperature * 0.9,
        )
        previous_temperature = self.current_temperature
        self.current_temperature = min(
            maximum_temperature,
            max(self.reservoir_temperature, previous_temperature + temperature_increase),
        )
        self.thermal_radius = self.thermal_radius * (1 + 0.1 * duration)
        self.time_since_injection = 0.0
        
        return {
            'temperature': self.current_temperature,
            'thermal_radius': self.thermal_radius,
            'temperature_increase': temperature_increase
        }

    def simulate_soak(self, duration: float) -> Dict:
        """
        Simulate soak phase - heat redistribution
        duration: days
        """
        # Temperature equalizes during soak
        duration = max(0.0, duration)
        cooling_factor = np.exp(-self.thermal_decline_rate * duration)
        temperature_drop = (self.current_temperature - self.reservoir_temperature) * (1 - cooling_factor)
        
        self.current_temperature -= temperature_drop
        self.time_since_injection += duration
        
        return {
            'temperature': self.current_temperature,
            'temperature_drop': temperature_drop,
            'time_since_injection': self.time_since_injection
        }

    def simulate_production(self, duration: float, production_rate: float) -> Dict:
        """
        Simulate production phase - thermal decline
        duration: days
        production_rate: m3/day
        """
        # Thermal decline during production
        duration = max(0.0, duration)
        cooling_rate = self.thermal_decline_rate * (1 + max(production_rate, 0.0) / 100.0)
        remaining_heat = (self.current_temperature - self.reservoir_temperature) * np.exp(-cooling_rate * duration)
        new_temperature = self.reservoir_temperature + remaining_heat
        temperature_drop = self.current_temperature - new_temperature

        self.current_temperature = max(self.reservoir_temperature, new_temperature)
        self.time_since_injection += duration
        
        return {
            'temperature': self.current_temperature,
            'temperature_drop': temperature_drop,
            'time_since_injection': self.time_since_injection
        }

    def predict_temperature(self, time_horizon: float) -> Dict:
        """
        Predict future temperature
        time_horizon: days
        """
        predicted_temp = self.reservoir_temperature + \
                        (self.current_temperature - self.reservoir_temperature) * \
                        np.exp(-self.thermal_decline_rate * time_horizon)
        
        return {
            'predicted_temperature': predicted_temp,
            'time_horizon': time_horizon,
            'confidence': 0.85  # Demo confidence value
        }

    def get_thermal_state(self) -> Dict:
        """
        Get current thermal state
        """
        return {
            'current_temperature': self.current_temperature,
            'reservoir_temperature': self.reservoir_temperature,
            'thermal_radius': self.thermal_radius,
            'time_since_injection': self.time_since_injection,
            'thermal_decline_rate': self.thermal_decline_rate,
            'model_type': 'DIGITAL TWIN DEMONSTRATION MODEL'
        }
