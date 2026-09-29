import { useDigitalTwinStore } from '../store/digitalTwinStore';
import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { apiService } from '../services/api';
import { Zap, Play, RotateCcw } from 'lucide-react';
import PumpjackCanvas from '../components/PumpjackCanvas';

const spmToHz = (spm: number) => spm * 10;

export default function PumpControl() {
  const { wellId = 'well-14' } = useParams<{ wellId: string }>();
  const { telemetry, srp, setTelemetry } = useDigitalTwinStore();

  const [currentSpm, setCurrentSpm] = useState<number>(telemetry.spm ?? 5.0);
  const [targetSpm,  setTargetSpm]  = useState<number>(telemetry.spm ?? 5.0);
  const [vfdResult,  setVfdResult]  = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = useCallback(async () => {
    setIsSimulating(true); setError(null);
    try {
      const result = await apiService.simulateVFD({ target_spm: targetSpm }, wellId);
      setVfdResult(result);
      setCurrentSpm(result.telemetry.spm);
      setTelemetry(result.telemetry);
    } catch (err) {
      setError('Simulation failed — check backend connection.');
    } finally {
      setIsSimulating(false);
    }
  }, [targetSpm, wellId, telemetry, setTelemetry]);

  const handleReset = useCallback(() => { setTargetSpm(currentSpm); setVfdResult(null); setError(null); }, [currentSpm]);

  const displayCurrentHz = vfdResult?.vfd_result?.current_frequency ?? spmToHz(currentSpm);
  const displayTargetHz  = vfdResult?.vfd_result?.target_frequency  ?? spmToHz(targetSpm);

  return (
    <div className="p-6 h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-900 mb-1">Pump Control</h2>
        <p className="text-muted text-sm">Surface SRP and VFD control interface</p>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-150px)]">
        <div className="col-span-8 flex flex-col gap-4">
          {/* KPI row */}
          <div className="glass-panel rounded-xl p-5">
            <h3 className="text-sm font-bold text-stone-900 mb-4 uppercase tracking-wide">Pumpjack Status</h3>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'SPM',             value: currentSpm.toFixed(1)                               },
                { label: 'Stroke Length',   value: `${(srp.stroke_length ?? 2.5).toFixed(1)} m`        },
                { label: 'Motor Speed',     value: `${(displayCurrentHz * 30).toFixed(0)} RPM`         },
                { label: 'Pump Efficiency', value: `${((srp.pump_efficiency ?? 0.85)*100).toFixed(0)}%` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted mb-1">{label}</p>
                  <p className="text-2xl font-bold font-mono text-stone-900">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 3D canvas */}
          <div className="glass-panel rounded-xl overflow-hidden flex-1 min-h-0">
            <div className="px-5 pt-4 pb-1 flex items-center justify-between border-b border-stone-100">
              <h3 className="text-sm font-bold text-stone-900">Pumpjack Animation</h3>
              <span className="text-xs text-muted font-mono">
                SPM: {currentSpm.toFixed(1)} &nbsp;|&nbsp; VFD: {displayCurrentHz.toFixed(1)} Hz
              </span>
            </div>
            <div className="h-64">
              <PumpjackCanvas currentSpm={currentSpm} />
            </div>
          </div>

          {/* Telemetry row */}
          <div className="glass-panel rounded-xl p-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Rod Load',          value: `${(telemetry.rod_load ?? 0).toFixed(1)} kN`           },
                { label: 'Surface Vibration', value: `${(telemetry.surface_vibration ?? 0).toFixed(2)} mm/s` },
                { label: 'Production Rate',   value: `${(telemetry.production_rate ?? 0).toFixed(1)} m³/d`   },
              ].map(({ label, value }) => (
                <div key={label} className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted mb-1">{label}</p>
                  <p className="text-lg font-bold font-mono text-stone-900">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="col-span-4 space-y-4">
          <div className="glass-panel rounded-xl p-5">
            <h3 className="text-sm font-bold text-stone-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
              <Zap className="w-4 h-4 text-cyan" /> VFD Control
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Status</span>
                <span className="text-sm font-bold text-cyan">● SIMULATION</span>
              </div>
              {[
                { label: 'Current Frequency', value: `${displayCurrentHz.toFixed(1)}`, unit: 'Hz' },
                { label: 'Target Frequency',  value: `${displayTargetHz.toFixed(1)}`,  unit: 'Hz' },
              ].map(({ label, value, unit }) => (
                <div key={label} className="bg-stone-50 border border-stone-200 rounded-lg p-3">
                  <p className="text-xs text-muted mb-1">{label}</p>
                  <p className="text-2xl font-bold font-mono text-stone-900">
                    {value}<span className="text-sm font-normal text-muted ml-1">{unit}</span>
                  </p>
                </div>
              ))}
              <div className="h-px bg-stone-100" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Current SPM</span>
                <span className="text-xl font-bold font-mono text-stone-900">{currentSpm.toFixed(1)}</span>
              </div>
              <div>
                <label className="text-sm text-muted mb-2 block">Target SPM</label>
                <input type="range" min="1" max="8" step="0.5" value={targetSpm}
                  onChange={(e) => setTargetSpm(Number(e.target.value))}
                  className="w-full accent-[#8b5a2b]" />
                <div className="flex justify-between text-xs text-muted mt-1">
                  <span>1.0</span>
                  <span className="text-cyan font-bold">{targetSpm.toFixed(1)}</span>
                  <span>8.0</span>
                </div>
              </div>
              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}
              <div className="flex gap-3">
                <button onClick={handleSimulate} disabled={isSimulating}
                  className="flex-1 py-3 px-4 bg-[#8b5a2b] hover:bg-[#7a4f26] border border-[#7a4f26] rounded-xl text-white font-bold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  <Play className="w-4 h-4" />
                  {isSimulating ? 'SIMULATING…' : 'SIMULATE'}
                </button>
                <button onClick={handleReset} title="Reset"
                  className="py-3 px-4 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl text-stone-600 transition-colors">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-sm font-bold text-stone-900 mb-3 uppercase tracking-wide">Asymmetric Pumping</h3>
            <div className="space-y-2.5">
              {[
                { label: 'VFD response', value: 'Updated in model' },
                { label: 'Field output', value: 'Not connected' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-muted">{label}</span>
                  <span className="text-xs font-bold text-cyan">{value}</span>
                </div>
              ))}
              <div className="h-px bg-stone-100" />
              <p className="text-xs text-muted">This demo updates simulated VFD frequency and well telemetry only.</p>
              <p className="text-xs text-muted">It does not issue commands to physical pump equipment.</p>
            </div>
          </div>

          {vfdResult && (
            <div className="glass-panel rounded-xl p-4">
              <h3 className="text-sm font-bold text-stone-900 mb-3 uppercase tracking-wide">Simulation Result</h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Applied SPM', value: `${(vfdResult.vfd_result?.current_spm ?? currentSpm).toFixed(1)}`     },
                  { label: 'Rod Load',    value: `${(vfdResult.telemetry?.rod_load ?? 0).toFixed(1)} kN`               },
                  { label: 'Vibration', value: `${vfdResult.telemetry.surface_vibration.toFixed(2)} mm/s` },
                  { label: 'Power', value: `${vfdResult.telemetry.motor_load.toFixed(1)} kW` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-muted">{label}</span>
                    <span className="text-xs font-bold font-mono text-green">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
