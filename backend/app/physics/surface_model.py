"""
DIGITAL TWIN DEMONSTRATION MODEL
Surface Model for pumpjack and VFD operations
This is a demonstration model for prototype purposes
"""

try:
    import numpy as np
except ImportError:
    import math
    class np:
        @staticmethod
        def pi():
            return math.pi

from typing import Dict

class SurfaceModel:
    """
    Simulates surface pumpjack and VFD operations
    """

    def __init__(self, surface_params: Dict):
        self.motor_power = surface_params.get('motor_power', 50.0)  # kW
        self.motor_efficiency = surface_params.get('motor_efficiency', 0.90)
        self.gearbox_ratio = surface_params.get('gearbox_ratio', 30.0)
        self.vfd_efficiency = surface_params.get('vfd_efficiency', 0.95)
        
        self.current_frequency = 50.0  # Hz
        self.target_frequency = 50.0  # Hz
        self.current_spm = 5.0
        self.target_spm = 5.0
        self.motor_speed = 1500.0  # RPM
        self.power_consumption = 0.0  # kW
        self.pump_efficiency = 0.85

    def calculate_spm_from_frequency(self, frequency: float) -> float:
        """
        Calculate SPM from VFD frequency
        """
        base_spm = 5.0  # SPM at 50 Hz
        return base_spm * (frequency / 50.0)

    def calculate_frequency_from_spm(self, spm: float) -> float:
        """
        Calculate required VFD frequency for target SPM
        """
        base_spm = 5.0  # SPM at 50 Hz
        return 50.0 * (spm / base_spm)

    def calculate_power_consumption(self, rod_load: float, spm: float,
                                     production_rate: float) -> float:
        """
        Estimate shaft power from rod work per cycle and fluid production.

        rod_load is in kN, stroke length in metres, and SPM in strokes/minute,
        giving kW for the mechanical rod-work term.
        """
        rod_power = abs(rod_load) * 2.5 * max(spm, 0.0) / 60.0
        production_power = max(production_rate, 0.0) * 0.5
        efficiency = max(self.motor_efficiency * self.vfd_efficiency, 1e-6)
        return max(0.0, (rod_power + production_power) / efficiency)

    def calculate_pump_efficiency(self, rod_load: float, vibration: float, 
                                  rod_float_risk: float) -> float:
        """
        Calculate pump efficiency based on operating conditions
        """
        base_efficiency = 0.85
        
        # Reduce efficiency based on load imbalance
        load_factor = min(1.0, abs(rod_load - 30.0) / 30.0)
        efficiency_reduction = 0.1 * load_factor
        
        # Reduce efficiency based on vibration
        vibration_factor = min(1.0, vibration / 5.0)
        efficiency_reduction += 0.15 * vibration_factor
        
        # Reduce efficiency based on rod float risk
        efficiency_reduction += 0.2 * rod_float_risk
        
        return max(0.5, base_efficiency - efficiency_reduction)

    def calculate_surface_vibration(self, rod_load_variance: float, 
                                    rod_float_risk: float, spm: float) -> float:
        """
        Calculate surface vibration based on operating conditions
        """
        base_vibration = 0.5  # mm/s
        
        # Vibration increases with load variance
        vibration = base_vibration + rod_load_variance * 0.1
        
        # Vibration increases with rod float risk
        vibration += rod_float_risk * 2.0
        
        # Vibration increases with SPM
        vibration *= (spm / 5.0)
        
        return vibration

    def update_vfd(self, target_spm: float) -> Dict:
        """
        Update VFD settings for target SPM
        """
        self.target_spm = target_spm
        self.target_frequency = self.calculate_frequency_from_spm(target_spm)
        
        # Simulate gradual frequency change
        frequency_change_rate = 5.0  # Hz per second
        change_magnitude = abs(self.target_frequency - self.current_frequency)
        steps = int(change_magnitude / frequency_change_rate)
        
        if steps > 0:
            step_size = (self.target_frequency - self.current_frequency) / steps
            self.current_frequency += step_size
            self.current_spm = self.calculate_spm_from_frequency(self.current_frequency)
        else:
            self.current_frequency = self.target_frequency
            self.current_spm = self.target_spm
        
        return {
            'current_frequency': self.current_frequency,
            'target_frequency': self.target_frequency,
            'current_spm': self.current_spm,
            'target_spm': self.target_spm,
            'motor_speed': self.current_frequency * 30.0  # RPM for 2-pole motor
        }

    def get_surface_state(self, rod_load: float, production_rate: float, 
                         rod_load_variance: float, rod_float_risk: float) -> Dict:
        """
        Get complete surface state
        """
        self.power_consumption = self.calculate_power_consumption(
            rod_load, self.current_spm, production_rate
        )
        surface_vibration = self.calculate_surface_vibration(
            rod_load_variance, rod_float_risk, self.current_spm
        )
        self.pump_efficiency = self.calculate_pump_efficiency(
            rod_load, surface_vibration, rod_float_risk
        )
        
        return {
            'vfd_frequency': self.current_frequency,
            'target_frequency': self.target_frequency,
            'spm': self.current_spm,
            'target_spm': self.target_spm,
            'motor_speed': self.current_frequency * 30.0,
            'power_consumption': self.power_consumption,
            'pump_efficiency': self.pump_efficiency,
            'surface_vibration': surface_vibration,
            'motor_efficiency': self.motor_efficiency,
            'vfd_efficiency': self.vfd_efficiency,
            'model_type': 'DIGITAL TWIN DEMONSTRATION MODEL'
        }
