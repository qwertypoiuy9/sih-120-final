import { useDigitalTwinStore } from '../store/digitalTwinStore';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { apiService, CSSCycleParameters, CSSCycleResult } from '../services/api';
import { Play, RotateCcw, Loader2, Sparkles } from 'lucide-react';

const DEFAULT_PARAMETERS: CSSCycleParameters = {
  steam_volume:        500,
  steam_injection_rate:100,
  injection_pressure:  8,
  target_temperature:  180,
  injection_duration:  5,
  soak_duration:       5,
  production_duration: 30,
};

export default function CSSControl() {
  const { telemetry, css } = useDigitalTwinStore();
  const addAlert = useNotificationStore((s) => s.addAlert);
  const user     = useAuthStore((s) => s.user);
  const params   = useParams<{ wellId?: string }>();
  const wellId   = params.wellId ?? user?.assignedWellId ?? 'well-14';

  const [params_, setParams] = useState<CSSCycleParameters>({ ...DEFAULT_PARAMETERS });
  const [result, setResult] = useState<{ baseline: CSSCycleResult; output: CSSCycleResult } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof CSSCycleParameters) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setParams((previous) => {
        const next = { ...previous, [key]: Number(e.target.value) };
        if (key === 'steam_injection_rate' || key === 'injection_duration') {
          next.steam_volume = next.steam_injection_rate * next.injection_duration;
        }
        return next;
      });

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimized,    setOptimized]    = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const phaseOrder = ['injection', 'soak', 'production'];
  const phaseProgress = (phase: string, duration: number) => {
    const currentIndex = phaseOrder.indexOf(css.phase);
    const phaseIndex = phaseOrder.indexOf(phase);
    if (phaseIndex < currentIndex) return 100;
    if (phaseIndex > currentIndex || currentIndex < 0) return 0;
    return Math.min(100, Math.max(0, css.days_in_phase / duration * 100));
  };

  const runSimulation = async () => {
    setIsSimulating(true);
    setError(null);
    setOptimized(false);
    try {
      const response = await apiService.simulateCSS(params_, wellId);
      setResult({ baseline: response.baseline, output: response.simulated });
    } catch (err) {
      console.error('CSS simulation failed:', err);
      setError('CSS simulation failed. Check the backend connection and parameter ranges.');
    } finally {
      setIsSimulating(false);
    }
  };

  const runOptimization = async () => {
    setIsOptimizing(true);
    setError(null);
    try {
      const response = await apiService.optimizeCSS(params_, wellId);
      setParams(response.optimized.parameters);
      setResult({ baseline: response.baseline, output: response.optimized });
      setOptimized(true);
      addAlert({
        wellId, type: 'info',
        message: `CSS what-if optimization completed. Simulated production ${response.optimized.cycle_production.toFixed(1)} m³/cycle at SOR ${response.optimized.steam_oil_ratio.toFixed(2)}.`,
        parameter: 'css_optimization',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('CSS optimization failed:', err);
      setError('CSS optimization failed. Check the backend connection and parameter ranges.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const resetToBaseline = () => {
    setParams({ ...DEFAULT_PARAMETERS });
    setOptimized(false);
    setResult(null);
    setError(null);
  };

  const inputCls = `w-full bg-white border border-stone-200 rounded-lg px-4 py-2
    text-stone-900 text-sm focus:outline-none focus:border-cyan/60
    focus:ring-1 focus:ring-cyan/20 transition-colors`;

  return (
    <div className="p-6 h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-900 mb-1">CSS Optimization</h2>
        <p className="text-muted text-sm">Cyclic Steam Stimulation control and optimization</p>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-150px)]">

        {/* ── Left column ─────────────────────────────────────────────── */}
        <div className="col-span-8 space-y-4 overflow-y-auto scrollbar-hide">

          {/* Cycle status */}
          <div className="glass-panel rounded-xl p-5">
            <h3 className="text-sm font-bold text-stone-900 mb-4 uppercase tracking-wide">Current Cycle Status</h3>
            <div className="grid grid-cols-3 gap-4 mb-5">
              {[
                { label: 'CURRENT PHASE', status: css.phase.toUpperCase(), statusColor: css.phase === 'injection' ? 'text-green' : css.phase === 'soak' ? 'text-amber' : 'text-cyan', note: css.cycle_number ? `Cycle ${css.cycle_number}` : 'Cycle history unavailable' },
                { label: 'DAYS IN PHASE', status: css.days_in_phase.toFixed(1), statusColor: 'text-stone-900', note: 'Digital-twin simulation' },
                { label: 'WELL STATUS', status: css.status.toUpperCase(), statusColor: 'text-cyan', note: 'Model state' },
              ].map(({ label, status, statusColor, note }) => (
                <div key={label} className="bg-stone-50 border border-stone-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted font-medium">{label}</span>
                    <span className={`text-xs font-bold ${statusColor}`}>● {status}</span>
                  </div>
                  <p className="text-sm text-stone-600">{note}</p>
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
              <p className="text-xs text-muted font-medium mb-4 uppercase tracking-wide">Cycle Timeline</p>
              <div className="space-y-3">
                {[
                  { label: 'INJECTION', phase: 'injection', duration: params_.injection_duration, color: 'bg-green', track: 'bg-green/20', display: `${params_.injection_duration} days (scenario)` },
                  { label: 'SOAK', phase: 'soak', duration: params_.soak_duration, color: 'bg-amber', track: 'bg-amber/20', display: `${params_.soak_duration} days (scenario)` },
                  { label: 'PRODUCTION', phase: 'production', duration: params_.production_duration, color: 'bg-cyan', track: 'bg-cyan/20', display: `${params_.production_duration} days (scenario)` },
                ].map(({ label, phase, duration, color, track, display }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-24 text-xs text-muted font-medium">{label}</div>
                    <div className={`flex-1 h-3 ${track} rounded-full relative overflow-hidden`}>
                      <div className={`absolute inset-y-0 left-0 ${color} rounded-full`} style={{ width: `${phaseProgress(phase, duration)}%` }} />
                    </div>
                    <div className="w-20 text-xs font-mono font-semibold text-stone-700 text-right">{display}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Parameters */}
          <div className="glass-panel rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wide">CSS Parameters</h3>
              {optimized && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-green bg-green/10 border border-green/30 rounded-full px-3 py-1">
                  <Sparkles className="w-3 h-3" /> MODEL OPTIMIZED
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted mb-1.5 block font-medium">Steam Volume (tons, derived)</label>
                <input type="number" value={params_.steam_volume.toFixed(1)} readOnly className={inputCls} />
              </div>
              {[
                { label: 'Injection Rate (t/d)', key: 'steam_injection_rate' },
                { label: 'Injection Pressure (MPa)', key: 'injection_pressure' },
                { label: 'Target Temperature (°C)', key: 'target_temperature' },
                { label: 'Injection Duration (days)', key: 'injection_duration' },
                { label: 'Soak Duration (days)', key: 'soak_duration' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-xs text-muted mb-1.5 block font-medium">{label}</label>
                  <input type="number" step="any" value={params_[key as keyof CSSCycleParameters]}
                    onChange={set(key as keyof CSSCycleParameters)} className={inputCls} />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-xs text-muted mb-1.5 block font-medium">Production Duration (days)</label>
                <input type="number" step="any" value={params_.production_duration}
                  onChange={set('production_duration')} className={inputCls} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={runSimulation} disabled={isOptimizing || isSimulating}
                className="flex-1 py-3 px-4 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl text-stone-700 font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {isSimulating ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Simulating…</span></> : <><Play className="w-4 h-4" /><span>SIMULATE</span></>}
              </button>
              <button onClick={runOptimization} disabled={isOptimizing || isSimulating}
                className="flex-1 py-3 px-4 bg-[#8b5a2b] hover:bg-[#7a4f26] border border-[#7a4f26] rounded-xl text-white font-bold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {isOptimizing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Optimizing…</span></>
                  : <><Play className="w-4 h-4" /><span>RUN OPTIMIZATION</span></>}
              </button>
              <button onClick={resetToBaseline} disabled={isOptimizing || isSimulating} title="Reset"
                className="py-3 px-4 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl text-stone-600 transition-colors disabled:opacity-60">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            {error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
            <p className="mt-3 text-xs text-muted">What-if digital-twin simulation only. No field equipment is controlled. Injection pressure is recorded as a scenario input but is not yet coupled into the thermal physics.</p>
          </div>
        </div>

        {/* ── Right column ─────────────────────────────────────────────── */}
        <div className="col-span-4 space-y-4">

          {/* KPIs */}
          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-sm font-bold text-stone-900 mb-4 uppercase tracking-wide">CSS Performance</h3>
            <div className="space-y-3">
              {[
                { label: 'Steam-Oil Ratio', value: result ? result.output.steam_oil_ratio.toFixed(2) : '--' },
                { label: 'Cycle Production', value: result ? `${result.output.cycle_production.toFixed(1)} m³` : '--' },
                { label: 'Energy per Barrel', value: result ? `${result.output.energy_per_barrel.toFixed(3)} GJ` : '--' },
                { label: 'Ending Temperature', value: result ? `${result.output.ending_temperature.toFixed(1)} °C` : '--' },
                { label: 'Ending Viscosity', value: result ? `${result.output.ending_viscosity.toFixed(0)} cP` : '--' },
              ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-muted">{label}</span>
                    <span className={`text-xs font-bold font-mono ${optimized ? 'text-green' : 'text-stone-900'}`}>{value}</span>
                  </div>
              ))}
            </div>
          </div>

          {/* Sync info */}
          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-sm font-bold text-stone-900 mb-3 uppercase tracking-wide">CSS + SRP Synchronization</h3>
            <div className="space-y-2 text-xs text-muted">
              <p>STEAM INJECTION → RESERVOIR HEATING → VISCOSITY REDUCTION → FLUID MOBILITY → SRP PERFORMANCE</p>
              <div className="h-px bg-stone-100" />
              <p>RESERVOIR COOLING → VISCOSITY INCREASE → ROD RESISTANCE → ROD FLOAT RISK → SRP OPTIMIZATION</p>
            </div>
          </div>

          {/* Current SPM */}
          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-sm font-bold text-stone-900 mb-3 uppercase tracking-wide">Current SPM</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Current</span>
                <span className="text-lg font-bold font-mono text-stone-900">{telemetry.spm.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">AI Target</span>
                <span className="text-lg font-bold font-mono text-green">—</span>
              </div>
              <div className="h-px bg-stone-100" />
              <p className="text-xs text-muted leading-relaxed">Recommendation is provided by AI Insights using the current simulated well state.</p>
            </div>
          </div>

          {/* Historical cycles */}
          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-sm font-bold text-stone-900 mb-3 uppercase tracking-wide">Historical Cycles</h3>
            <p className="text-xs text-muted">Historical cycle storage is not available in this digital-twin demo.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
