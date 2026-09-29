import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, FileText, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useDigitalTwinStore } from '../store/digitalTwinStore';
import {
  AIInsights as AIInsightsState,
  Alert,
  CSSState,
  ReservoirState,
  SRPState,
  Telemetry,
  Well,
  WellboreState,
} from '../types';

const REPORT_TYPES = [
  'Complete Digital Twin Report',
  'Reservoir Analysis',
  'Wellbore Analysis',
  'SRP Performance',
  'CSS Performance',
  'AI Predictions',
  'Optimization Summary',
  'Alert Summary',
] as const;

const DATE_RANGES = ['Last 24 hours', 'Last 7 days', 'Last 30 days', 'Last 90 days', 'Last 365 days', 'Custom range'] as const;

type ReportType = typeof REPORT_TYPES[number];
type DateRange = typeof DATE_RANGES[number];

interface ReportRow {
  label: string;
  value: string;
}

interface ReportSection {
  title: string;
  rows: ReportRow[];
}

interface ReportData {
  well: Well;
  telemetry: Telemetry;
  reservoir: ReservoirState;
  wellbore: WellboreState;
  srp: SRPState;
  css: CSSState;
  ai: AIInsightsState;
  alerts: Alert[];
}

interface GeneratedReport {
  name: string;
  generatedAt: string;
  format: 'PDF' | 'CSV';
}

interface PrintableReportData {
  type: ReportType;
  period: { start: string; end: string };
  snapshotAt: string;
  sections: ReportSection[];
}

const templates: { name: string; type: ReportType; range: DateRange }[] = [
  { name: 'Daily Operations Report', type: 'Complete Digital Twin Report', range: 'Last 24 hours' },
  { name: 'Weekly Performance Summary', type: 'Complete Digital Twin Report', range: 'Last 7 days' },
  { name: 'Monthly CSS Analysis', type: 'CSS Performance', range: 'Last 30 days' },
  { name: 'Quarterly Optimization Review', type: 'Optimization Summary', range: 'Last 90 days' },
  { name: 'Annual Well Performance', type: 'Complete Digital Twin Report', range: 'Last 365 days' },
];

function formatNumber(value: number, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : 'N/A';
}

function buildSections(data: ReportData): ReportSection[] {
  const well: ReportSection = {
    title: 'Well Summary',
    rows: [
      { label: 'Well name', value: data.well.name },
      { label: 'Field', value: data.well.field },
      { label: 'Location', value: data.well.location },
      { label: 'Well depth', value: `${formatNumber(data.well.depth)} m` },
      { label: 'Reservoir depth', value: `${formatNumber(data.well.reservoir_depth)} m` },
      { label: 'Status', value: data.well.status },
    ],
  };

  const reservoir: ReportSection = {
    title: 'Reservoir Analysis',
    rows: [
      { label: 'Current temperature', value: `${formatNumber(data.reservoir.current_temperature)} °C` },
      { label: 'Reservoir temperature', value: `${formatNumber(data.reservoir.reservoir_temperature)} °C` },
      { label: 'Thermal radius', value: `${formatNumber(data.reservoir.thermal_radius)} m` },
      { label: 'Time since injection', value: `${formatNumber(data.reservoir.time_since_injection)} days` },
      { label: 'Thermal decline rate', value: formatNumber(data.reservoir.thermal_decline_rate, 3) },
      { label: 'Current viscosity', value: `${formatNumber(data.css.current_viscosity)} cP` },
    ],
  };

  const wellbore: ReportSection = {
    title: 'Wellbore Analysis',
    rows: [
      { label: 'Well depth', value: `${formatNumber(data.wellbore.depth)} m` },
      { label: 'Casing depth', value: `${formatNumber(data.wellbore.casing_depth)} m` },
      { label: 'Tubing depth', value: `${formatNumber(data.wellbore.tubing_depth)} m` },
      { label: 'Pump depth', value: `${formatNumber(data.wellbore.pump_depth)} m` },
      { label: 'Perforation depth', value: `${formatNumber(data.wellbore.perforation_depth)} m` },
      { label: 'Model', value: data.wellbore.model_type },
    ],
  };

  const srp: ReportSection = {
    title: 'SRP Performance',
    rows: [
      { label: 'Pump status', value: data.srp.status },
      { label: 'Speed', value: `${formatNumber(data.telemetry.spm)} SPM` },
      { label: 'Stroke length', value: `${formatNumber(data.srp.stroke_length)} m` },
      { label: 'Rod load', value: `${formatNumber(data.telemetry.rod_load)} kN` },
      { label: 'Pump efficiency', value: `${formatNumber(data.telemetry.pump_efficiency * 100)}%` },
      { label: 'Surface vibration', value: `${formatNumber(data.telemetry.surface_vibration)} mm/s` },
      { label: 'Downhole pressure', value: `${formatNumber(data.srp.downhole_pressure)} kPa` },
      { label: 'Motor load', value: `${formatNumber(data.telemetry.motor_load)}%` },
      { label: 'VFD frequency', value: `${formatNumber(data.telemetry.vfd_frequency)} Hz` },
    ],
  };

  const css: ReportSection = {
    title: 'CSS Performance',
    rows: [
      { label: 'Cycle', value: String(data.css.cycle_number) },
      { label: 'Phase', value: data.css.phase },
      { label: 'Days in phase', value: `${formatNumber(data.css.days_in_phase)} days` },
      { label: 'Steam injection rate', value: `${formatNumber(data.css.steam_injection_rate)} t/day` },
      { label: 'Injection pressure', value: `${formatNumber(data.css.injection_pressure)} MPa` },
      { label: 'Target temperature', value: `${formatNumber(data.css.target_temperature)} °C` },
      { label: 'Steam-oil ratio', value: formatNumber(data.css.steam_oil_ratio, 2) },
      { label: 'Cycle production', value: `${formatNumber(data.css.cycle_production)} m³` },
      { label: 'Current viscosity', value: `${formatNumber(data.css.current_viscosity)} cP` },
    ],
  };

  const ai: ReportSection = {
    title: 'AI Predictions',
    rows: [
      { label: 'Condition', value: data.ai.condition.replace(/_/g, ' ') },
      { label: 'Rod float risk', value: `${formatNumber(data.ai.rod_float_probability * 100)}%` },
      { label: 'Impact loading risk', value: `${formatNumber(data.ai.impact_loading_risk * 100)}%` },
      { label: 'Failure risk', value: data.ai.physics_evidence.failure_risk },
      { label: 'Recommended speed', value: `${formatNumber(data.ai.recommended_spm)} SPM` },
      { label: 'Recommended VFD frequency', value: `${formatNumber(data.ai.recommended_vfd_frequency)} Hz` },
      { label: 'Model confidence', value: `${formatNumber(data.ai.confidence * 100)}%` },
      { label: 'Reasoning', value: data.ai.reasoning.join('; ') || 'No recommendation details available' },
    ],
  };

  const optimization: ReportSection = {
    title: 'Optimization Summary',
    rows: [
      { label: 'Current steam-oil ratio', value: formatNumber(data.css.steam_oil_ratio, 2) },
      { label: 'Current cycle production', value: `${formatNumber(data.css.cycle_production)} m³` },
      { label: 'Recommended pump speed', value: `${formatNumber(data.ai.recommended_spm)} SPM` },
      { label: 'Recommended VFD frequency', value: `${formatNumber(data.ai.recommended_vfd_frequency)} Hz` },
      { label: 'AI condition', value: data.ai.condition.replace(/_/g, ' ') },
      { label: 'Recommendation reasoning', value: data.ai.reasoning.join('; ') || 'No recommendation details available' },
    ],
  };

  const alerts: ReportSection = {
    title: 'Alert Summary',
    rows: data.alerts.length
      ? data.alerts.flatMap((alert, index) => [
          { label: `Alert ${index + 1}`, value: `${alert.severity} — ${alert.parameter}` },
          { label: `Alert ${index + 1} value / threshold`, value: `${alert.value} / ${alert.threshold}` },
          { label: `Alert ${index + 1} prediction`, value: alert.prediction },
          { label: `Alert ${index + 1} recommended action`, value: alert.recommended_action },
          { label: `Alert ${index + 1} time`, value: new Date(alert.timestamp).toLocaleString() },
        ])
      : [{ label: 'Active alerts', value: 'No active alerts' }],
  };

  return [well, reservoir, wellbore, srp, css, ai, optimization, alerts];
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function makeFileName(name: string, format: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.${format}`;
}

function dateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getPeriod(range: DateRange, customFrom: string, customTo: string, now: Date) {
  if (range === 'Custom range') {
    if (!customFrom || !customTo || customFrom > customTo) {
      throw new Error('Choose a valid custom date range before exporting.');
    }
    return { start: customFrom, end: customTo };
  }

  const periodDays: Record<Exclude<DateRange, 'Custom range'>, number> = {
    'Last 24 hours': 1,
    'Last 7 days': 7,
    'Last 30 days': 30,
    'Last 90 days': 90,
    'Last 365 days': 365,
  };
  const start = new Date(now);
  if (range === 'Last 24 hours') {
    start.setTime(start.getTime() - 24 * 60 * 60 * 1000);
    return { start: start.toLocaleString(), end: now.toLocaleString() };
  }
  start.setDate(start.getDate() - periodDays[range]);
  return { start: dateString(start), end: dateString(now) };
}

function createCsv(
  type: ReportType,
  period: { start: string; end: string },
  snapshotAt: string,
  sections: ReportSection[],
) {
  const rows = [
    ['Report', type],
    ['Period start', period.start],
    ['Period end', period.end],
    ['Snapshot generated', snapshotAt],
    ['Data scope', 'Current digital twin snapshot; historical aggregation is not available'],
    [],
    ...sections.flatMap((section) => [
      [section.title],
      ['Metric', 'Value'],
      ...section.rows.map(({ label, value }) => [label, value]),
      [],
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map((cell) => csvCell(cell ?? '')).join(',')).join('\r\n')}`;
}

function PrintableReport({ report }: { report: PrintableReportData }) {
  return (
    <div className="report-print-document">
      <style>{`
        @media print {
          @page { margin: 18mm; }
          body * { visibility: hidden !important; }
          .report-print-document, .report-print-document * { visibility: visible !important; }
          .report-print-document {
            display: block !important; position: absolute !important; inset: 0 auto auto 0;
            width: 100%; color: #292524; background: #fff; font: 12px Arial, sans-serif;
          }
          .report-print-document header { border-bottom: 2px solid #8b5a2b; margin-bottom: 20px; padding-bottom: 12px; }
          .report-print-document h1 { margin: 0 0 8px; font-size: 22px; }
          .report-print-document h2 { border-bottom: 1px solid #d6d3d1; font-size: 15px; padding-bottom: 6px; }
          .report-print-document section { break-inside: avoid; margin: 20px 0; }
          .report-print-document table { border-collapse: collapse; width: 100%; }
          .report-print-document th, .report-print-document td { border-bottom: 1px solid #e7e5e4; padding: 7px 8px; text-align: left; vertical-align: top; }
          .report-print-document th { color: #57534e; font-weight: 600; width: 38%; }
          .report-print-document footer { border-top: 1px solid #d6d3d1; color: #78716c; font-size: 10px; margin-top: 24px; padding-top: 10px; }
        }
        @media screen { .report-print-document { display: none; } }
      `}</style>
      <header>
        <h1>{report.type}</h1>
        <div>Baghewala Digital Twin · {report.period.start} to {report.period.end}</div>
        <div>Snapshot generated: {report.snapshotAt}</div>
      </header>
      {report.sections.map(({ title, rows }) => (
        <section key={title}>
          <h2>{title}</h2>
          <table>
            <tbody>
              {rows.map(({ label, value }) => (
                <tr key={label}><th>{label}</th><td>{value}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <footer>DEMONSTRATION / SIMULATION DATA — Not for operational use. This is a current snapshot; historical data is not available in this demo.</footer>
    </div>
  );
}

export default function Reports() {
  const { wellId: routeWellId } = useParams<{ wellId: string }>();
  const user = useAuthStore((state) => state.user);
  const wellId = routeWellId ?? user?.assignedWellId ?? 'well-14';
  const { well, telemetry, reservoir, wellbore, srp, ai, isLoading } = useDigitalTwinStore();
  const [reportType, setReportType] = useState<ReportType>(REPORT_TYPES[0]);
  const [dateRange, setDateRange] = useState<DateRange>('Last 24 hours');
  const [customFrom, setCustomFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return dateString(date);
  });
  const [customTo, setCustomTo] = useState(() => dateString(new Date()));
  const [isExporting, setIsExporting] = useState(false);
  const [previewCss, setPreviewCss] = useState<CSSState | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [printReport, setPrintReport] = useState<PrintableReportData | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recentReports, setRecentReports] = useState<GeneratedReport[]>([]);

  useEffect(() => {
    let isActive = true;
    setPreviewCss(null);
    setPreviewError('');
    apiService.getCSSState(wellId)
      .then((css) => {
        if (isActive) setPreviewCss(css);
      })
      .catch((cause: unknown) => {
        console.error('Could not load CSS report preview:', cause);
        if (isActive) setPreviewError('Live CSS metrics could not be loaded.');
      });
    return () => {
      isActive = false;
    };
  }, [wellId]);

  useEffect(() => {
    if (!printReport) return undefined;
    const originalTitle = document.title;
    document.title = makeFileName(printReport.type, 'pdf').replace(/\.pdf$/, '');
    const printTimeout = window.setTimeout(() => window.print(), 100);
    const clearPrintReport = () => setPrintReport(null);
    window.addEventListener('afterprint', clearPrintReport);
    return () => {
      window.clearTimeout(printTimeout);
      window.removeEventListener('afterprint', clearPrintReport);
      document.title = originalTitle;
    };
  }, [printReport]);

  const exportReport = async (format: 'PDF' | 'CSV') => {
    setError('');
    setMessage('');

    let period: { start: string; end: string };
    try {
      period = getPeriod(dateRange, customFrom, customTo, new Date());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The selected date range is invalid.');
      return;
    }

    setIsExporting(true);
    try {
      const [latestWell, latestTelemetry, latestReservoir, latestWellbore, latestSrp, css, latestAi, alerts] =
        await Promise.all([
          apiService.getWell(wellId),
          apiService.getTelemetry(wellId),
          apiService.getReservoirState(wellId),
          apiService.getWellboreState(wellId),
          apiService.getSRPState(wellId),
          apiService.getCSSState(wellId),
          apiService.getAIInsights(wellId),
          apiService.getAlerts(wellId),
        ]);

      const snapshotAt = new Date().toLocaleString();
      const sections = buildSections({
        well: latestWell,
        telemetry: latestTelemetry,
        reservoir: latestReservoir,
        wellbore: latestWellbore,
        srp: latestSrp,
        css,
        ai: latestAi,
        alerts,
      }).filter((section) => reportType === 'Complete Digital Twin Report'
        || section.title === reportType);

      if (format === 'CSV') {
        const blob = new Blob([createCsv(reportType, period, snapshotAt, sections)], {
          type: 'text/csv;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = makeFileName(reportType, 'csv');
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      } else {
        setPrintReport({ type: reportType, period, snapshotAt, sections });
      }

      setRecentReports((reports) => [
        { name: reportType, generatedAt: new Date().toLocaleString(), format },
        ...reports,
      ].slice(0, 5));
      setMessage(format === 'PDF'
        ? 'Report opened in the print dialog. Choose “Save as PDF” to download it.'
        : 'CSV report downloaded.');
    } catch (cause) {
      console.error('Report generation failed:', cause);
      setError('Could not generate the report. Check that the backend is running and try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const previewSections = previewCss ? buildSections({
    well,
    telemetry,
    reservoir,
    wellbore,
    srp,
    css: previewCss,
    ai,
    alerts: [],
  }).filter((section) => reportType === 'Complete Digital Twin Report' || section.title === reportType) : [];

  const selectCls = 'w-full bg-white border border-stone-200 rounded-lg px-4 py-2 text-stone-900 text-sm focus:outline-none focus:border-cyan/60 transition-colors';

  return (
    <div className="p-6 h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-900 mb-1">Engineering Reports</h2>
        <p className="text-muted text-sm">Generate and export digital twin snapshot reports</p>
      </div>

      <div className="grid grid-cols-12 gap-6 min-h-[calc(100vh-150px)]">
        <div className="col-span-8 space-y-4">
          <div className="glass-panel rounded-xl p-5">
            <h3 className="text-sm font-bold text-stone-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
              <FileText className="w-4 h-4 text-cyan" /> Generate Report
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label htmlFor="report-type" className="text-xs text-muted mb-1.5 block font-medium">Report Type</label>
                <select id="report-type" className={selectCls} value={reportType} onChange={(event) => setReportType(event.target.value as ReportType)}>
                  {REPORT_TYPES.map((option) => <option key={option}>{option}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="report-range" className="text-xs text-muted mb-1.5 block font-medium">Report Period</label>
                <select id="report-range" className={selectCls} value={dateRange} onChange={(event) => setDateRange(event.target.value as DateRange)}>
                  {DATE_RANGES.map((option) => <option key={option}>{option}</option>)}
                </select>
              </div>
            </div>
            {dateRange === 'Custom range' && (
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label htmlFor="report-from" className="text-xs text-muted mb-1.5 block font-medium">From</label>
                  <input id="report-from" type="date" className={selectCls} value={customFrom} max={customTo} onChange={(event) => setCustomFrom(event.target.value)} />
                </div>
                <div>
                  <label htmlFor="report-to" className="text-xs text-muted mb-1.5 block font-medium">To</label>
                  <input id="report-to" type="date" className={selectCls} value={customTo} min={customFrom} onChange={(event) => setCustomTo(event.target.value)} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {(['PDF', 'CSV'] as const).map((format) => (
                <button
                  key={format}
                  type="button"
                  disabled={isExporting}
                  onClick={() => void exportReport(format)}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-[#8b5a2b] hover:bg-[#7a4f26] disabled:opacity-60 disabled:cursor-wait border border-[#7a4f26] rounded-xl text-white font-bold shadow-sm transition-colors"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {isExporting ? 'Generating…' : `Export ${format}`}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">
              Exports fetch a fresh snapshot from the backend. Historical aggregation is not available in this demo; the selected period is included as report metadata.
            </p>
            {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
            {message && <p role="status" className="mt-3 text-sm text-green">{message}</p>}
          </div>

          <div className="glass-panel rounded-xl p-5">
            <h3 className="text-sm font-bold text-stone-900 mb-4 uppercase tracking-wide">Report Preview</h3>
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-5">
              <div className="text-center border-b border-stone-200 pb-4 mb-4">
                <h2 className="text-lg font-bold text-stone-900">{reportType}</h2>
                <p className="text-sm text-muted mt-1">{well.name} | {well.field}, {well.location}</p>
                <p className="text-xs text-muted mt-1">Current snapshot {isLoading ? '(connecting…)' : `as of ${new Date(telemetry.timestamp).toLocaleString()}`}</p>
              </div>
              {previewSections.length ? (
                <div className="grid grid-cols-2 gap-4">
                  {previewSections.map(({ title, rows }) => (
                    <div key={title}>
                      <h4 className="text-xs font-bold text-stone-900 mb-2 uppercase tracking-wide">{title}</h4>
                      <div className="space-y-1">
                        {rows.map(({ label, value }) => (
                          <div key={label} className="flex justify-between gap-3 text-xs">
                            <span className="text-muted">{label}:</span>
                            <span className="font-bold font-mono text-stone-900 text-right">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted text-center py-8">
                  {previewError || 'Loading live report metrics…'}
                </p>
              )}
              <div className="border-t border-stone-200 mt-4 pt-4 text-center">
                <p className="text-xs text-muted">DEMONSTRATION / SIMULATION DATA — Not for operational use</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-4 space-y-4">
          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-sm font-bold text-stone-900 mb-3 uppercase tracking-wide">Recent Reports</h3>
            {recentReports.length ? (
              <div className="space-y-2">
                {recentReports.map((report, index) => (
                  <div key={`${report.generatedAt}-${index}`} className="flex items-center justify-between gap-2 text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-lg">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="w-3 h-3 shrink-0 text-cyan" />
                      <span className="truncate text-stone-800 font-medium">{report.name}</span>
                    </div>
                    <div className="shrink-0 flex items-center gap-2 text-muted">
                      <span>{report.generatedAt}</span>
                      <span className="font-bold text-stone-500">{report.format}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-muted">Reports you generate in this session will appear here.</p>}
          </div>

          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-sm font-bold text-stone-900 mb-3 uppercase tracking-wide">Report Templates</h3>
            <div className="space-y-2">
              {templates.map((template) => (
                <button
                  key={template.name}
                  type="button"
                  onClick={() => {
                    setReportType(template.type);
                    setDateRange(template.range);
                    setError('');
                    setMessage('');
                  }}
                  className="w-full py-2 px-3 bg-stone-50 hover:bg-cyan/5 border border-stone-200 rounded-lg text-stone-700 text-sm text-left transition-colors hover:text-cyan hover:border-cyan/30"
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-sm font-bold text-stone-900 mb-2 uppercase tracking-wide">Scheduled Reports</h3>
            <p className="text-xs text-muted">Report scheduling is not available in this demo. Use a template to generate a report on demand.</p>
          </div>
        </div>
      </div>
      {printReport && <PrintableReport report={printReport} />}
    </div>
  );
}
