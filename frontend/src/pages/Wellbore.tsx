import { useDigitalTwinStore } from '../store/digitalTwinStore';
import { useState, useMemo } from 'react';
import Wellbore3D from '../components/Wellbore3D';
import { interpolateProfile } from '../profile';

const SURFACE_DEPTH_M = 0;

function zoneLabel(d: number, casingDepth: number, pumpDepth: number, perforationDepth: number, totalDepth: number): { label: string; color: string } {
  if (d < 50) return { label: 'SURFACE / WELLHEAD', color: '#0ea5e9' };
  if (Math.abs(d - perforationDepth) <= 50) return { label: 'PERFORATIONS', color: '#dc2626' };
  if (d < casingDepth) return { label: 'CASING ZONE', color: '#16a34a' };
  if (d < pumpDepth) return { label: 'TUBING ZONE', color: '#d97706' };
  if (d <= totalDepth) return { label: 'PRODUCTION ZONE', color: '#d97706' };
  return { label: 'BELOW TD', color: '#78716c' };
}

export default function Wellbore() {
  const { wellbore, telemetry, srp } = useDigitalTwinStore();
  const [selectedDepth, setSelectedDepth] = useState(1300);
  const depth = Math.min(selectedDepth, wellbore.depth);
  const rodDepth = Math.min(depth, wellbore.pump_depth);
  const props = useMemo(
    () => ({
      temperature: interpolateProfile(wellbore.temperature_profile, depth, wellbore.depth),
      pressure: interpolateProfile(wellbore.pressure_profile, depth, wellbore.depth),
      viscosity: interpolateProfile(wellbore.viscosity_profile, depth, wellbore.depth),
      rodVelocity: interpolateProfile(srp.velocity, rodDepth, wellbore.pump_depth),
      rodDisplace: interpolateProfile(srp.displacement, rodDepth, wellbore.pump_depth),
      stress: interpolateProfile(srp.stress ?? [], rodDepth, wellbore.pump_depth),
    }),
    [depth, rodDepth, wellbore, srp],
  );
  const zone = zoneLabel(depth, wellbore.casing_depth, wellbore.pump_depth, wellbore.perforation_depth, wellbore.depth);
  const format = (value: number | null, digits = 2) => value === null ? '—' : value.toFixed(digits);

  return (
    <div className="p-6 h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-900 mb-1">Wellbore Digital Twin</h2>
        <p className="text-muted text-sm">Interactive wellbore mechanics and fluid dynamics</p>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-150px)]">
        <div className="col-span-8">
          <div className="h-full glass-panel rounded-xl overflow-hidden">
            <Wellbore3D selectedDepth={selectedDepth} />
          </div>
        </div>

        <div className="col-span-4 space-y-4 overflow-y-auto">
          {/* Wellbore Parameters */}
          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-sm font-bold text-stone-900 mb-3 uppercase tracking-wide">Wellbore Parameters</h3>
            <div className="space-y-3">
              {[
                { label: 'Total Depth',       value: `${wellbore.depth.toFixed(0)} m`             },
                { label: 'Casing Depth',      value: `${wellbore.casing_depth.toFixed(0)} m`      },
                { label: 'Tubing Depth',      value: `${wellbore.tubing_depth.toFixed(0)} m`      },
                { label: 'Pump Depth',        value: `${wellbore.pump_depth.toFixed(0)} m`        },
                { label: 'Perforation Depth', value: `${wellbore.perforation_depth.toFixed(0)} m` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-muted">{label}</span>
                  <span className="text-xs font-bold font-mono text-stone-900">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Depth Inspector */}
          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-sm font-bold text-stone-900 mb-3 uppercase tracking-wide">Depth Inspector</h3>
            <div className="mb-4">
              <label className="text-xs text-muted mb-2 block">Depth (m)</label>
              <input
                type="range" min={SURFACE_DEPTH_M} max={wellbore.depth} step={10}
                value={selectedDepth}
                onChange={(e) => setSelectedDepth(Math.min(Number(e.target.value), wellbore.depth))}
                className="w-full accent-[#8b5a2b]"
              />
              <div className="flex justify-between text-xs text-muted mt-1">
                <span>0m</span>
                <span className="font-bold font-mono text-cyan">{depth}m</span>
                <span>{wellbore.depth.toFixed(0)}m</span>
              </div>
            </div>
            {/* Zone badge */}
            <div className="flex items-center justify-center rounded-lg py-1.5 mb-3 border"
              style={{ backgroundColor: zone.color + '18', borderColor: zone.color + '50' }}>
              <span className="text-xs font-bold" style={{ color: zone.color }}>{zone.label}</span>
            </div>
            <div className="h-px bg-stone-100 mb-3" />
            <div className="space-y-2.5">
              {[
                { label: 'Temperature', value: props.temperature === null ? '—' : `${format(props.temperature, 1)} °C`, color: props.temperature !== null && props.temperature > 60 ? '#dc2626' : props.temperature !== null && props.temperature > 50 ? '#d97706' : '#0ea5e9' },
                { label: 'Pressure', value: props.pressure === null ? '—' : `${format(props.pressure / 1000, 3)} MPa`, color: '#8b5a2b' },
                { label: 'Viscosity', value: props.viscosity === null ? '—' : `${Math.round(props.viscosity).toLocaleString()} cP`, color: props.viscosity !== null && props.viscosity > 2000 ? '#dc2626' : props.viscosity !== null && props.viscosity > 1000 ? '#d97706' : '#16a34a' },
                { label: 'Rod Velocity', value: `${format(props.rodVelocity)} m/s`, color: '#8b5a2b' },
                { label: 'Rod Displacement', value: `${format(props.rodDisplace)} m`, color: '#8b5a2b' },
                { label: 'Mech. Stress', value: props.stress === null ? '—' : `${format(props.stress / 1_000_000, 3)} MPa`, color: props.stress !== null && Math.abs(props.stress) > 50_000_000 ? '#dc2626' : props.stress !== null && Math.abs(props.stress) > 35_000_000 ? '#d97706' : '#16a34a' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-muted">{label}</span>
                  <span className="text-xs font-bold font-mono" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rod String Status */}
          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-sm font-bold text-stone-900 mb-3 uppercase tracking-wide">Rod String Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Status</span>
                <span className={`text-xs font-bold ${srp.status === 'operating' ? 'text-green' : 'text-amber'}`}>● {srp.status.toUpperCase()}</span>
              </div>
              {[
                { label: 'Surface Load',      value: `${telemetry.rod_load.toFixed(1)} kN`           },
                { label: 'Surface Vibration', value: `${telemetry.surface_vibration.toFixed(2)} mm/s` },
                { label: 'SPM',               value: `${telemetry.spm.toFixed(1)}`                    },
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
  );
}
