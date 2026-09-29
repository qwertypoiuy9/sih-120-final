# Baghewala Digital Twin Prototype Guide

This guide explains what the website is for, how its pages work, and how they relate to the Baghewala heavy-oil problem statement.

## What the prototype does

Baghewala produces heavy crude oil of approximately 17–19° API from the Jodhpur Sandstone reservoir. High viscosity, low reservoir pressure and temperature, and cooling after steam injection can reduce oil mobility. CSS cycle design and sucker rod pump (SRP) operation are often considered separately, even though reservoir temperature and viscosity affect pumping load, energy use, production, and equipment risk.

The website demonstrates an integrated workflow for exploring those relationships. Its frontend requests per-well data from a FastAPI backend. The backend advances a simplified simulated well model, and the frontend displays the resulting values. The model’s main calculation chain is:

**Reservoir temperature → estimated oil viscosity → wellbore temperature and pressure profiles → rod dynamics and dynamometer card → surface power, vibration, and efficiency → estimated production flow.**

This is a prototype, not a live Oil India system. There is no connection to field sensors, SCADA, a production historian, or physical pumps and VFDs. The values come from demonstration models rather than the historical and operational field data listed in the SIH problem statement. The models are simplified and not field-calibrated; the insights and recommendations are not validated operating instructions.

## Login and supervisor workflow

**Login** demonstrates the entry point and directs a user to a supervisor or well-incharge view. Authentication and account handling are prototype-grade and do not provide production identity or access control.

**Supervisor Dashboard** is intended to show a fleet-wide summary, alerts, and user management. In the current prototype, the well cards, fleet values, alerts, and some changing figures are mock data. User management stores demo accounts in browser storage; it is not connected to a production identity service or user database.

## Well pages

| Page | Why it exists | What it does and its role |
|---|---|---|
| **Overview** (`/well/:wellId/overview`) | Provides a starting point for inspecting one simulated well. | Combines the well summary, illustrative 3D pumpjack/reservoir scenes, scenario presets, and recommendation summary. The geometry is a visualization, not an engineering-scale field model. Some status labels, including “PRODUCING” and “Steam Status: ACTIVE,” are hard-coded rather than derived from model phase. |
| **Live Data** | Makes changes in simulated telemetry easy to observe. | Charts timestamped temperature, pressure, flow, SPM, rod load, vibration, motor load, VFD frequency, and steam rate. WebSocket streaming is used when configured; REST polling is the fallback. “API online” means the demo API responded, not that physical sensors are connected. |
| **Reservoir** | Shows the simulated thermal condition and supports subsurface inspection. | Displays a stylized thermal-front visualization, temperature and thermal-radius values, and an interpolated depth inspector. Its displayed mobility is an inverse-viscosity index, not a permeability-adjusted reservoir mobility calculation. |
| **Wellbore** | Connects depth-dependent conditions with the pump and rod system. | Shows simplified well geometry and profiles for temperature, pressure, and viscosity, plus rod values. The depth selector interpolates values from the backend profiles. The 3D scene is illustrative. |
| **AI Insights** | Summarizes model-detected conditions and potential operating options. | Displays condition, classifier risk estimates, confidence, a suggested SPM/VFD frequency, and reasoning. It uses threshold logic and simulated dynamometer-classifier outputs; it is not a trained PINN or a field-validated AI. |
| **Simulation** | Allows a pump-speed what-if comparison without changing the current simulated well. | Compares baseline and alternative values such as load, vibration, rod-float risk, and energy. The backend runs the what-if on a model copy, so the result is not applied to the selected well. |
| **Pump Control** | Demonstrates the relationship between target pump speed and VFD frequency. | A simulation request updates the selected backend demo well’s SPM/VFD state, which can affect values shown on other pages. It does not send commands to a physical pump or VFD. |
| **CSS Control** | Demonstrates how CSS design variables can be compared. | Runs and compares modelled CSS cycles using inputs such as steam rate, injection duration, target temperature, soak time, and production duration. The what-if uses model copies and does not apply a cycle to the well. Injection pressure is accepted as an input but is not coupled into the thermal calculation. The page does not store real historical cycles. |
| **Optimization** | Compares simulated pump-speed candidates against selected objectives. | The backend scores candidate SPM settings for production, energy, and rod-float risk. It reports a candidate, but does not apply it. CSS cycle optimization is a separate what-if on the CSS page. |
| **Alerts** | Makes selected model conditions and demo notifications visible. | Backend alerts are generated from simulated values and thresholds; scenario changes can also create browser-local notifications. Clearing local notifications does not change model conditions. Alert history, delivery-channel toggles, and some filters are placeholders. The UI’s vibration threshold can differ from the backend alert threshold. |
| **History** | Is intended to present past cycles and trends. | Currently displays static sample cycles, KPIs, trends, and filters. There is no historical telemetry store behind it, so these are not actual well history or measurements. |
| **Reports** | Exports a snapshot that can be shared or used in a demonstration. | Fetches current well/model data and exports CSV or opens the browser print dialog for PDF. A selected date range is report metadata only; it does not trigger historical aggregation. Recent report entries are temporary UI state rather than a durable report archive. |
| **Settings** | Provides a place for configuration controls in the product concept. | Several settings are visual placeholders. Role selection does not enforce permissions, and notification, refresh, units, backup/database figures, and security indicators are not all connected to live configuration or verified infrastructure. |

## Shared interface features

- **Sidebar:** Navigates among well pages, displays the demo user, and provides logout. Its API status indicates frontend-to-demo-backend availability, not equipment or sensor connectivity.
- **Header:** Displays selected well/field context, API status, clock, language selection, notifications, and user information. Treat the data-mode label as simulation context.
- **Shared frontend state:** Zustand holds the selected well’s latest telemetry, reservoir, wellbore, SRP, CSS, AI, alerts, and connection state so pages can present a consistent snapshot.
- **Scenario selector:** Applies a preset to the backend’s simulated well—temperature, SPM, CSS elapsed-day value, and scenario classification—and recalculates dependent model outputs. It is an abrupt preset, not a gradual scenario run or real CSS cycle. The selected-button highlight is frontend state and may not restore correctly after reload.
- **Charts and 3D scenes:** Help communicate values and relationships. Animation and visual detail do not imply that instruments are connected.

## What the model calculations represent

- **Thermal model:** Estimates heat added during a simulated steam-injection phase and applies simplified soak/production cooling toward a reservoir baseline. The running well model advances temperature decline over time.
- **Viscosity model:** Uses a temperature-dependent relationship so warmer oil generally has lower estimated viscosity. This estimate feeds into the wellbore and production calculations.
- **Wellbore model:** Creates depth profiles for temperature, pressure, and viscosity using simplified thermal, hydrostatic, and flow effects.
- **Rod and dynamometer models:** Generate simulated rod behavior and a dynamometer card. A classifier derives rod-float and impact-loading risk estimates from those simulated outputs.
- **Surface model:** Estimates power, vibration, pump efficiency, motor/VFD values, and the relationship between SPM and VFD frequency.
- **Production estimate:** Uses a simplified Darcy-style flow calculation with model assumptions and bounds. It is a demonstration estimate, not a production forecast.

## How this prototype relates to the SIH problem

The SIH problem calls for integrated CSS and SRP optimization, thermal and production prediction, rod-float and impact-risk detection, and reduced steam and energy use. This prototype demonstrates **where and how those workflows could fit together**: inspect a simulated well, see how temperature and viscosity relate to pumping, review possible model risks, and compare CSS or SRP what-if cases.

The prototype does not establish that the expected field benefits have been achieved. Demonstrating those outcomes would require, at minimum, historical production and CSS-cycle records, injection parameters, VFD/SRP data, completion and reservoir properties, fluid measurements, and rod-failure/pump-unsetting history. Models would need calibration and independent validation against those data. Any real monitoring or control integration would also require approved interfaces, cybersecurity controls, and operator review.
