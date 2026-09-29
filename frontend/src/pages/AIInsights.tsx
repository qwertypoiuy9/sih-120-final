import { useDigitalTwinStore } from '../store/digitalTwinStore';
import { useState } from 'react';
import { Brain, ArrowRight, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

export default function AIInsights() {
  const { ai, telemetry, reservoir } = useDigitalTwinStore();
  const [showPhysicsEvidence, setShowPhysicsEvidence] = useState(false);

  const conditionColor = (c: string) =>
    c === 'normal' ? 'text-green' : c === 'increasing_viscosity' ? 'text-amber' : 'text-critical';
  const riskColor = (v: number, hi: number, mid: number) =>
    v > hi ? 'text-critical font-bold' : v > mid ? 'text-amber font-bold' : 'text-green font-bold';

  const ConditionIcon = ai.condition === 'normal' ? CheckCircle
    : ai.condition === 'increasing_viscosity' ? TrendingUp : AlertTriangle;

  return (
    <div className="p-6 h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-900 mb-1">AI Analysis & Recommendation</h2>
        <p className="text-muted text-sm">Rule-based analysis of the simulated well state; not a trained PINN or field-control system.</p>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-150px)]">
        <div className="col-span-8 space-y-4 overflow-y-auto">

          {/* Condition KPI row */}
          <div className="glass-panel rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Brain className="w-5 h-5 text-cyan" />
                Current Condition
              </h3>
              <div className={`flex items-center gap-2 ${conditionColor(ai.condition)}`}>
                <ConditionIcon className="w-5 h-5" />
                <span className="text-lg font-bold">{ai.condition.toUpperCase().replace(/_/g,' ')}</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Confidence',          value: `${(ai.confidence*100).toFixed(0)}%`,        cls: 'text-stone-900' },
                { label: 'Rod Float Risk',       value: `${(ai.rod_float_probability*100).toFixed(0)}%`, cls: riskColor(ai.rod_float_probability, 0.7, 0.5) },
                { label: 'Impact Loading Risk',  value: `${(ai.impact_loading_risk*100).toFixed(0)}%`,   cls: riskColor(ai.impact_loading_risk, 0.6, 0.4)    },
                { label: 'Failure Risk',         value: ai.physics_evidence.failure_risk.toUpperCase(),
                  cls: ai.physics_evidence.failure_risk==='high' ? 'text-critical font-bold' : ai.physics_evidence.failure_risk==='moderate' ? 'text-amber font-bold' : 'text-green font-bold' },
              ].map(({ label, value, cls }) => (
                <div key={label} className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted mb-1">{label}</p>
                  <p className={`text-xl font-bold font-mono ${cls}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendation */}
          <div className="glass-panel rounded-xl p-5">
            <h3 className="text-base font-bold text-stone-900 mb-4">AI Recommendation</h3>
            <div className="grid grid-cols-2 gap-6 mb-5">
              <div className="space-y-3">
                {[
                  { label: 'Current SPM', value: `${telemetry.spm.toFixed(1)}`,          cls: 'text-stone-900 font-bold' },
                  { label: 'Current VFD', value: `${telemetry.vfd_frequency.toFixed(1)} Hz`, cls: 'text-stone-900 font-bold' },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-muted">{label}</span>
                    <span className={`text-base font-mono ${cls}`}>{value}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Recommended SPM', value: `${ai.recommended_spm.toFixed(1)}` },
                  { label: 'Recommended VFD', value: `${ai.recommended_vfd_frequency.toFixed(1)} Hz` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-muted">{label}</span>
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-green" />
                      <span className="text-base font-mono font-bold text-green">{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowPhysicsEvidence(!showPhysicsEvidence)}
              className="w-full py-3 px-4 bg-[#8b5a2b] hover:bg-[#7a4f26] border border-[#7a4f26] rounded-xl text-white font-bold shadow-sm transition-colors"
            >
              {showPhysicsEvidence ? 'Hide Physics Evidence' : 'Show Physics Evidence'}
            </button>

            {showPhysicsEvidence && (
              <div className="mt-4 p-5 bg-stone-50 border border-stone-200 rounded-xl">
                <h4 className="text-sm font-bold text-stone-900 mb-4 uppercase tracking-wide">Physics Evidence Chain</h4>
                <div className="space-y-3">
                  {[
                    { n:1, text: `Reservoir temperature: ${ai.physics_evidence.temperature.toFixed(1)}°C`, sub: ai.physics_evidence.temperature < 45 ? 'Temperature declined below optimal range' : 'Temperature within normal range' },
                    { n:2, text: `Predicted oil viscosity: ${ai.physics_evidence.viscosity.toFixed(0)} cP`, sub: ai.physics_evidence.viscosity > 1500 ? 'Viscosity increased significantly' : 'Viscosity at normal level' },
                    { n:3, text: `Fluid resistance: ${ai.physics_evidence.fluid_resistance.toFixed(2)}`,     sub: ai.physics_evidence.fluid_resistance > 1.5 ? 'Fluid resistance elevated' : 'Fluid resistance normal' },
                    { n:4, text: `Rod dynamics: ${ai.physics_evidence.rod_dynamics}`,                        sub: ai.physics_evidence.rod_dynamics === 'elevated_stress' ? 'Rod string experiencing elevated stress' : 'Rod dynamics normal' },
                    { n:5, text: `Rod float probability: ${(ai.physics_evidence.rod_float*100).toFixed(0)}%`, sub: ai.physics_evidence.rod_float > 0.5 ? 'Rod float risk elevated' : 'Rod float risk low' },
                    { n:6, text: `Impact loading risk: ${(ai.physics_evidence.impact_load*100).toFixed(0)}%`, sub: ai.physics_evidence.impact_load > 0.5 ? 'Impact loading risk elevated' : 'Impact loading risk low' },
                  ].map(({ n, text, sub }) => (
                    <div key={n}>
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-cyan/10 border border-cyan/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-cyan">{n}</span>
                        </div>
                        <div>
                          <p className="text-sm text-stone-800">{text}</p>
                          <p className="text-xs text-muted mt-0.5">{sub}</p>
                        </div>
                      </div>
                      {n < 6 && <div className="ml-3.5 pl-3.5 border-l-2 border-stone-200 h-2 mt-1" />}
                    </div>
                  ))}
                  {/* Final recommendation */}
                  <div className="flex items-start gap-3 mt-1">
                    <div className="w-7 h-7 rounded-full bg-green/10 border border-green/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-green" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-green">
                        RECOMMENDATION: {ai.recommended_spm < telemetry.spm ? 'Reduce' : ai.recommended_spm > telemetry.spm ? 'Increase' : 'Maintain'} SPM at {ai.recommended_spm.toFixed(1)}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        Suggested from current temperature, viscosity, and simulated dynamometer risk indicators. Review before applying.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="col-span-4 space-y-4 overflow-y-auto">
          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-sm font-bold text-stone-900 mb-3 uppercase tracking-wide">AI Model Information</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Model Type', value: ai.model_type || 'DEMO CLASSIFIER' },
                { label: 'Method', value: 'Threshold rules + dynamometer classifier' },
                { label: 'Confidence', value: `${(ai.confidence * 100).toFixed(0)}%` },
                { label: 'Training Loss', value: 'Not available' },
                { label: 'Data Source', value: 'Digital-twin simulation' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-muted">{label}</span>
                  <span className="max-w-[65%] text-right text-xs font-bold font-mono text-stone-900">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-sm font-bold text-stone-900 mb-3 uppercase tracking-wide">Reasoning Summary</h3>
            <div className="space-y-2">
              {ai.reasoning.map((r, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-stone-600">{r}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-sm font-bold text-stone-900 mb-3 uppercase tracking-wide">Key Metrics</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Temperature',       value: `${reservoir.current_temperature.toFixed(1)}°C`          },
                { label: 'Viscosity',         value: `${ai.physics_evidence.viscosity.toFixed(0)} cP`         },
                { label: 'Fluid Resistance',  value: `${ai.physics_evidence.fluid_resistance.toFixed(2)}`     },
                { label: 'Rod Float Risk',    value: `${(ai.rod_float_probability*100).toFixed(0)}%`          },
                { label: 'Impact Load Risk',  value: `${(ai.impact_loading_risk*100).toFixed(0)}%`            },
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
