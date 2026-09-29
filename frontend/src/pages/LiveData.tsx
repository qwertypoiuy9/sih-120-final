import { useDigitalTwinStore } from '../store/digitalTwinStore';
import { useState, useEffect } from 'react';
import RealTimeChart from '../components/RealTimeChart';

export default function LiveData() {
  const { telemetry, isConnected, isStreaming } = useDigitalTwinStore();
  const [chartData, setChartData] = useState<Array<Record<string, string | number>>>([]);

  useEffect(() => {
    if (!telemetry.timestamp) return;
    const point = {
      timestamp: telemetry.timestamp,
      temperature: telemetry.temperature,
      pressure: telemetry.pressure,
      flow_rate: telemetry.flow_rate,
      spm: telemetry.spm,
      rod_load: telemetry.rod_load,
      surface_vibration: telemetry.surface_vibration,
      motor_load: telemetry.motor_load,
      vfd_frequency: telemetry.vfd_frequency,
      steam_injection_rate: telemetry.steam_injection_rate,
    };
    setChartData((previous) => {
      if (previous[previous.length - 1]?.timestamp === point.timestamp) return previous;
      return [...previous.slice(-59), point];
    });
  }, [telemetry]);

  return (
    <div className="p-6 h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-900 mb-2">REAL-TIME TELEMETRY</h2>
        <p className="text-muted">Timestamped digital-twin simulation telemetry</p>
      </div>

      <div className="mb-4 flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green' : 'bg-critical'}`} />
          <span className="text-sm text-muted">
            DIGITAL TWIN API {isConnected ? '● ONLINE' : '● OFFLINE'}
            {isConnected && ` · ${isStreaming ? 'WEBSOCKET STREAM' : 'REST POLLING'}`}
          </span>
        </div>
        <div className="text-sm text-muted">Simulated telemetry; not connected to field sensors</div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <RealTimeChart title="Reservoir Temperature" data={chartData} dataKey="temperature"       unit="°C"   color="#0284c7" />
        <RealTimeChart title="Wellbore Pressure"     data={chartData} dataKey="pressure"           unit="kPa"  color="#16a34a" />
        <RealTimeChart title="Flow Rate (Darcy)"     data={chartData} dataKey="flow_rate"          unit="m³/d" color="#d97706" />
        <RealTimeChart title="SPM"                   data={chartData} dataKey="spm"                unit="spm"  color="#7c3aed" />
        <RealTimeChart title="Rod Load"              data={chartData} dataKey="rod_load"           unit="kN"   color="#dc2626" />
        <RealTimeChart title="Surface Vibration"     data={chartData} dataKey="surface_vibration"  unit="mm/s" color="#ea580c" />
        <RealTimeChart title="Motor Load"            data={chartData} dataKey="motor_load"         unit="kW"   color="#0891b2" />
        <RealTimeChart title="VFD Frequency"         data={chartData} dataKey="vfd_frequency"      unit="Hz"   color="#8b5a2b" />
        <RealTimeChart title="Steam Injection Rate"  data={chartData} dataKey="steam_injection_rate" unit="t/d" color="#be185d" />
      </div>
    </div>
  );
}
