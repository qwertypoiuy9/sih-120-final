import { useDigitalTwinStore } from '../store/digitalTwinStore';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiService } from '../services/api';
import { FlaskConical, Play, RotateCcw } from 'lucide-react';

export default function Simulation() {
  const { telemetry } = useDigitalTwinStore();
  const { wellId = 'well-14' } = useParams<{ wellId: string }>();
  const [spm, setSpm] = useState(telemetry.spm);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const result = await apiService.runSimulation({ spm }, wellId);
      setSimulationResult(result);
    } catch (error) {
      console.error('Simulation error:', error);
      setError('Simulation failed. Check the backend connection and SPM range.');
    }
    finally { setIsRunning(false); }
  };

  const resetSimulation = () => { setSpm(telemetry.spm); setSimulationResult(null); setError(null); };

  return (
    <div className="p-6 h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-900 mb-1">Digital Twin What-If Simulation</h2>
        <p className="text-muted text-sm">Test different operating scenarios</p>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-150px)]">
        {/* Controls */}
        <div className="col-span-4 space-y-4">
          <div className="glass-panel rounded-xl p-5">
            <h3 className="text-sm font-bold text-stone-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
              <FlaskConical className="w-4 h-4 text-cyan" /> Simulation Parameters
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted mb-2 block">SPM (Strokes Per Minute)</label>
                <input type="range" min="1" max="8" step="0.5" value={spm}
                  onChange={(e) => setSpm(Number(e.target.value))}
                  className="w-full accent-[#8b5a2b]" />
                <div className="flex justify-between text-xs text-muted mt-1">
                  <span>1.0</span>
                  <span className="font-bold text-cyan">{spm.toFixed(1)}</span>
                  <span>8.0</span>
                </div>
              </div>
              <div className="h-px bg-stone-100" />
              {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <p className="text-xs text-muted">What-if model only. Running this scenario does not change the live simulated well or control equipment.</p>
              <div className="flex gap-3">
                <button onClick={runSimulation} disabled={isRunning}
                  className="flex-1 py-3 px-4 bg-[#8b5a2b] hover:bg-[#7a4f26] border border-[#7a4f26] rounded-xl text-white font-bold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  <Play className="w-4 h-4" />
                  {isRunning ? 'RUNNING…' : 'SIMULATE'}
                </button>
                <button onClick={resetSimulation}
                  className="py-3 px-4 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl text-stone-600 transition-colors">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-sm font-bold text-stone-900 mb-3 uppercase tracking-wide">Quick Scenarios</h3>
            <div className="space-y-2">
              {[
                { name: 'Normal Production', spm: 5.0 },
                { name: 'Reduced Speed',     spm: 3.5 },
                { name: 'Low Speed',         spm: 3.0 },
                { name: 'High Speed',        spm: 6.0 },
              ].map((s) => (
                <button key={s.name} onClick={() => setSpm(s.spm)}
                  className="w-full py-2 px-3 bg-stone-50 hover:bg-cyan/5 border border-stone-200 rounded-lg text-stone-700 text-sm transition-colors text-left hover:text-cyan hover:border-cyan/30">
                  {s.name} ({s.spm} SPM)
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="col-span-8">
          <div className="h-full glass-panel rounded-xl p-5">
            <h3 className="text-sm font-bold text-stone-900 mb-4 uppercase tracking-wide">Simulation Results</h3>

            {simulationResult ? (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { title: 'BASELINE',   data: simulationResult.baseline,  cls: 'text-stone-900' },
                    { title: 'SIMULATED',  data: simulationResult.simulated, cls: 'text-green'     },
                  ].map(({ title, data, cls }) => (
                    <div key={title} className="bg-stone-50 border border-stone-200 rounded-xl p-4">
                      <p className="text-xs text-muted font-bold mb-3 uppercase tracking-wide">{title}</p>
                      <div className="space-y-2">
                        {[
                          { label: 'SPM',            value: data.spm.toFixed(1)                     },
                          { label: 'Rod Load',        value: `${data.rod_load.toFixed(1)} kN`        },
                          { label: 'Vibration',       value: `${data.vibration.toFixed(2)} mm/s`     },
                          { label: 'Rod Float Risk',  value: `${(data.rod_float_risk*100).toFixed(0)}%` },
                          { label: 'Energy',          value: `${data.energy.toFixed(1)} kW`          },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between">
                            <span className="text-xs text-muted">{label}</span>
                            <span className={`text-sm font-bold font-mono ${cls}`}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-green/5 border border-green/20 rounded-xl p-4">
                  <p className="text-xs text-muted font-bold mb-3 uppercase tracking-wide">Expected Improvement</p>
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { label: 'Rod Load',       delta: simulationResult.improvement.rod_load_reduction,        unit: 'kN'   },
                      { label: 'Vibration',      delta: simulationResult.improvement.vibration_reduction,       unit: 'mm/s' },
                      { label: 'Rod Float Risk', delta: simulationResult.improvement.rod_float_risk_reduction*100, unit: '%'  },
                      { label: 'Energy',         delta: simulationResult.improvement.energy_savings,            unit: 'kW'   },
                    ].map(({ label, delta, unit }) => (
                      <div key={label} className="text-center">
                        <p className="text-xs text-muted mb-1">{label}</p>
                        <p className={`text-lg font-bold font-mono ${delta >= 0 ? 'text-green' : 'text-critical'}`}>
                          {delta >= 0 ? '-' : '+'}{Math.abs(delta).toFixed(delta >= 100 ? 0 : 2)} {unit}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <FlaskConical className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                  <p className="text-muted text-sm">Run a simulation to see results</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
