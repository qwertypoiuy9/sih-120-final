import { useDigitalTwinStore } from '../store/digitalTwinStore';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiService } from '../services/api';
import { Settings, Play, TrendingUp, TrendingDown } from 'lucide-react';

export default function Optimization() {
  const { telemetry, css } = useDigitalTwinStore();
  const { wellId = 'well-14' } = useParams<{ wellId: string }>();
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runOptimization = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const result = await apiService.runOptimization({
        objectives: { maximize_production: true, minimize_energy: true, minimize_rod_float_risk: true },
      }, wellId);
      setOptimizationResult(result);
    } catch (e) {
      console.error('Optimization failed:', e);
      setError('Optimization failed. Check the backend connection.');
    }
    finally { setIsRunning(false); }
  };

  return (
    <div className="p-6 h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-900 mb-1">Optimization Center</h2>
        <p className="text-muted text-sm">Model-based SRP speed sweep with production, energy, and rod-float objectives</p>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-150px)]">
        <div className="col-span-8 space-y-4">
          <div className="glass-panel rounded-xl p-5">
            <h3 className="text-sm font-bold text-stone-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
              <Settings className="w-4 h-4 text-cyan" /> Optimization Objectives
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green/5 border border-green/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-green" />
                  <span className="text-sm font-bold text-green">MAXIMIZE</span>
                </div>
                <div className="space-y-2">
                  {['Oil Production'].map((l) => (
                    <div key={l} className="flex items-center justify-between">
                      <span className="text-xs text-muted">{l}</span>
                      <span className="text-xs text-green font-bold">●</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="w-4 h-4 text-critical" />
                  <span className="text-sm font-bold text-critical">MINIMIZE</span>
                </div>
                <div className="space-y-2">
                  {['Energy', 'Rod Float Risk'].map((l) => (
                    <div key={l} className="flex items-center justify-between">
                      <span className="text-xs text-muted">{l}</span>
                      <span className="text-xs text-critical font-bold">●</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={runOptimization} disabled={isRunning}
              className="w-full mt-5 py-3 px-4 bg-[#8b5a2b] hover:bg-[#7a4f26] border border-[#7a4f26] rounded-xl text-white font-bold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              <Play className="w-4 h-4" />
              {isRunning ? 'RUNNING OPTIMIZATION…' : 'RUN OPTIMIZATION'}
            </button>
            {error && <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <p className="mt-3 text-xs text-muted">Evaluates SRP speed scenarios on model copies; it does not apply the recommendation or control equipment. CSS cycle optimization is on the CSS page.</p>
          </div>

          {optimizationResult && (
            <div className="glass-panel rounded-xl p-5">
              <h3 className="text-sm font-bold text-stone-900 mb-4 uppercase tracking-wide">Optimization Results</h3>
              <div className="grid grid-cols-2 gap-4 mb-5">
                {[
                  { title: 'CURRENT STATE',   data: optimizationResult.current_state,   cls: 'text-stone-900' },
                  { title: 'OPTIMIZED STATE', data: optimizationResult.optimized_state, cls: 'text-green'     },
                ].map(({ title, data, cls }) => (
                  <div key={title} className="bg-stone-50 border border-stone-200 rounded-xl p-4">
                    <p className="text-xs text-muted font-bold mb-3 uppercase tracking-wide">{title}</p>
                    <div className="space-y-2">
                      {[
                        { label: 'SPM',             value: data.spm.toFixed(1)                         },
                        { label: 'Production',       value: `${data.production.toFixed(1)} m³/d`        },
                        { label: 'Energy',           value: `${data.energy.toFixed(1)} kW`              },
                        { label: 'Rod Float Risk',   value: `${(data.rod_float_risk*100).toFixed(0)}%`  },
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
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Energy Savings', value: `${optimizationResult.recommendation.expected_improvement.energy_savings >= 0 ? '+' : ''}${optimizationResult.recommendation.expected_improvement.energy_savings.toFixed(1)}%`, cls: optimizationResult.recommendation.expected_improvement.energy_savings >= 0 ? 'text-green' : 'text-amber' },
                    { label: 'Rod Float Reduction', value: `${optimizationResult.recommendation.expected_improvement.rod_float_risk_reduction >= 0 ? '+' : ''}${optimizationResult.recommendation.expected_improvement.rod_float_risk_reduction.toFixed(1)}%`, cls: optimizationResult.recommendation.expected_improvement.rod_float_risk_reduction >= 0 ? 'text-green' : 'text-amber' },
                    { label: 'Production Change',    value: `${optimizationResult.recommendation.expected_improvement.production_change >= 0 ? '+' : ''}${optimizationResult.recommendation.expected_improvement.production_change.toFixed(1)}%`,
                      cls: optimizationResult.recommendation.expected_improvement.production_change >= 0 ? 'text-green' : 'text-amber' },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className="text-center">
                      <p className="text-xs text-muted mb-1">{label}</p>
                      <p className={`text-lg font-bold font-mono ${cls}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="col-span-4 space-y-4">
          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-sm font-bold text-stone-900 mb-3 uppercase tracking-wide">Optimization Scope</h3>
            <div className="space-y-2.5">
              {[
                { label: 'CSS Optimization', value: 'Separate CSS page', cls: 'text-stone-600' },
                { label: 'SRP Optimization', value: optimizationResult ? 'Scenarios evaluated' : 'Ready to run', cls: 'text-cyan' },
              ].map(({ label, value, cls }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-muted">{label}</span>
                  <span className={`text-xs font-bold ${cls}`}>{value}</span>
                </div>
              ))}
              <div className="h-px bg-stone-100" />
              <p className="text-xs text-muted">SRP speed candidates are scored against the selected production, energy, and rod-float objectives. CSS timing is evaluated separately.</p>
            </div>
          </div>

          {optimizationResult && (
            <div className="glass-panel rounded-xl p-4">
              <h3 className="text-sm font-bold text-stone-900 mb-3 uppercase tracking-wide">Recommended Parameters</h3>
              <div className="space-y-2.5">
                {[
                  { label: 'SPM',           value: `${optimizationResult.recommendation.spm.toFixed(1)}`         },
                  { label: 'VFD Frequency', value: `${optimizationResult.recommendation.vfd_frequency.toFixed(1)} Hz` },
                  { label: 'Stroke Profile',value: 'Not evaluated by this model'                                  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-muted">{label}</span>
                    <span className="text-xs font-bold font-mono text-green">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-sm font-bold text-stone-900 mb-3 uppercase tracking-wide">Key Performance Indicators</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Production Rate', value: `${telemetry.production_rate.toFixed(1)} m³/d` },
                { label: 'CSS Steam-Oil Ratio', value: `${css.steam_oil_ratio.toFixed(2)}` },
                { label: 'Steam Injection', value: `${css.steam_injection_rate.toFixed(1)} t/d` },
                { label: 'Pump Efficiency', value: `${(telemetry.pump_efficiency*100).toFixed(0)}%` },
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
