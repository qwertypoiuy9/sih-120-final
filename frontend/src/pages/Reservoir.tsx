import { useDigitalTwinStore } from '../store/digitalTwinStore';
import { useState } from 'react';
import ReservoirVisualization from '../components/ReservoirVisualization';
import { interpolateProfile } from '../profile';

export default function Reservoir() {
  const { reservoir, wellbore } = useDigitalTwinStore();
  const [selectedDepth, setSelectedDepth] = useState(1350);
  const depth = Math.min(selectedDepth, wellbore.depth);
  const temperatureAtDepth = interpolateProfile(wellbore.temperature_profile, depth, wellbore.depth);
  const pressureAtDepth = interpolateProfile(wellbore.pressure_profile, depth, wellbore.depth);
  const viscosityAtDepth = interpolateProfile(wellbore.viscosity_profile, depth, wellbore.depth);

  return (
    <div className="p-6 h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-900 mb-1">Reservoir Digital Twin</h2>
        <p className="text-muted text-sm">Subsurface thermal and viscosity analysis</p>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-150px)]">
        {/* 3D canvas */}
        <div className="col-span-8">
          <div className="h-full glass-panel rounded-xl overflow-hidden">
            <ReservoirVisualization />
          </div>
        </div>

        {/* Right panels */}
        <div className="col-span-4 space-y-4 overflow-y-auto">

          {/* Temperature Scale */}
          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-sm font-bold text-stone-900 mb-3 uppercase tracking-wide">Temperature Scale</h3>
            <div className="space-y-2">
              {[
                { color: '#FF3B30', label: 'HOT (above 80°C)'   },
                { color: '#FF9900', label: 'WARM (60 to 80°C)'  },
                { color: '#d97706', label: 'MODERATE (50–60°C)' },
                { color: '#16a34a', label: 'COOL (45 to 50°C)'  },
                { color: '#0ea5e9', label: 'COLD (below 45°C)'  },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs text-muted">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reservoir Parameters */}
          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-sm font-bold text-stone-900 mb-3 uppercase tracking-wide">Reservoir Parameters</h3>
            <div className="space-y-3">
              {[
                { label: 'Initial Temperature',    value: `${reservoir.reservoir_temperature.toFixed(1)}°C`      },
                { label: 'Current Temperature',    value: `${reservoir.current_temperature.toFixed(1)}°C`        },
                { label: 'Thermal Radius',         value: `${reservoir.thermal_radius.toFixed(1)} m`             },
                { label: 'Time Since Injection',   value: `${reservoir.time_since_injection.toFixed(1)} days`    },
                { label: 'Thermal Decline Rate',   value: `${reservoir.thermal_decline_rate.toFixed(3)} /day`    },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-muted">{label}</span>
                  <span className="text-xs font-bold font-mono text-stone-900">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Viscosity Model */}
          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-sm font-bold text-stone-900 mb-3 uppercase tracking-wide">Viscosity Model</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Current Viscosity</span>
                <span className="text-xs font-bold font-mono text-stone-900">
                  {viscosityAtDepth === null ? '—' : viscosityAtDepth.toFixed(0)} cP
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Mobility</span>
                <span className="text-xs font-bold font-mono text-stone-900">
                  {viscosityAtDepth === null || viscosityAtDepth <= 0 ? '—' : (1 / viscosityAtDepth).toExponential(2)} 1/cP
                </span>
              </div>
              <div className="h-px bg-stone-100" />
              <p className="text-xs text-muted">Inverse-viscosity index only; permeability is not modeled.</p>
              <p className="text-xs text-muted">{wellbore.model_type}</p>
            </div>
          </div>

          {/* Depth Inspector */}
          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-sm font-bold text-stone-900 mb-3 uppercase tracking-wide">Depth Inspector</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted mb-2 block">Depth (m)</label>
                <input
                  type="range" min="0" max={wellbore.depth}
                  value={selectedDepth}
                  onChange={(e) => setSelectedDepth(Math.min(Number(e.target.value), wellbore.depth))}
                  className="w-full accent-[#8b5a2b]"
                />
                <div className="flex justify-between text-xs text-muted mt-1">
                  <span>0m</span>
                  <span className="font-bold font-mono text-cyan">{selectedDepth}m</span>
                  <span>{wellbore.depth.toFixed(0)}m</span>
                </div>
              </div>
              <div className="h-px bg-stone-100" />
              <div className="space-y-2">
                {[
                  { label: 'Temperature', value: temperatureAtDepth === null ? '—' : `${temperatureAtDepth.toFixed(1)} °C` },
                  { label: 'Pressure', value: pressureAtDepth === null ? '—' : `${pressureAtDepth.toFixed(1)} kPa` },
                  { label: 'Viscosity', value: viscosityAtDepth === null ? '—' : `${viscosityAtDepth.toFixed(0)} cP` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-muted">{label}</span>
                    <span className="text-xs font-bold font-mono text-stone-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
