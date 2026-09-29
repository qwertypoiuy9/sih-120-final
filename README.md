<div align="center">

# 🛢️ Baghewala Digital Twin

### AI-Powered Well Operations Platform for Heavy Oil Fields

**Smart India Hackathon 2026 · Problem Statement by Oil India Limited**

[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Three.js](https://img.shields.io/badge/Three.js-r159-000000?style=flat-square&logo=threedotjs&logoColor=white)](https://threejs.org)
[![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

---

*A real-time Physics-Informed Digital Twin for Cyclic Steam Stimulation (CSS) and Sucker Rod Pump (SRP) operations — with multilingual alert translation via Bhashini NMT.*

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Application Pages](#application-pages)
- [Role-Based Access Control](#role-based-access-control)
- [Local Setup](#local-setup)
- [Demo Scenarios](#demo-scenarios)
- [Project Structure](#project-structure)
- [Disclaimer](#disclaimer)

---

## Overview

### The Problem

Oil India Limited operates heavy oil wells at the Baghewala Field in Rajasthan using **Cyclic Steam Stimulation (CSS)** — a process where steam is injected underground to heat viscous crude oil and improve production. The field engineers who understand the reservoir physics are based in Duliajan, Assam, roughly 2,500 km from the frontline operators running the equipment.

When a critical fault such as **rod float** occurs — where the pump rod loses contact with fluid during a downstroke and risks catastrophic mechanical impact — the local operator receives a technical alert in English, a language they may not read fluently. The window to prevent equipment damage is measured in seconds, not minutes.

### The Solution

The Baghewala Digital Twin is a full-stack platform that bridges this gap with three integrated capabilities:

1. **Real-Time Physics Simulation** — A FastAPI backend running Physics-Informed Neural Networks (PINNs) models the entire well from reservoir to surface, predicting faults 30–90 seconds before they occur.

2. **Role-Stratified Command Interface** — A React/Three.js frontend gives the Field Supervisor a fleet-wide operational command view while giving the Well Incharge a site-specific 3D operational interface — each role seeing exactly what they need and nothing more.

3. **Bhashini NMT Translation** — Every AI-generated alert is translated in real time via the Government of India's Bhashini Neural Machine Translation API into the operator's native language (Hindi, Assamese, Telugu), eliminating the language barrier for frontline workers.

---

## Key Features

### 🧠 AI & Physics
- **Physics-Informed Neural Networks (PINNs)** — Loss function encodes the Gibbs Wave Equation (rod dynamics) and Bober-Lantz thermal model (CSS), making predictions physically constrained and reliable with limited historical data
- **Rod Float Early Warning** — Predicts the rod float probability 30–90 seconds ahead using SRP downstroke mechanics
- **CSS Cycle Optimisation** — Recommends optimal steam injection volume, timing, and target temperature using multi-objective optimization (maximize production, minimize SOR and energy)
- **Explainable AI** — Every recommendation ships with a traceable physics evidence chain (temperature → viscosity → fluid resistance → rod dynamics → risk)

### 🗺️ 3D Visualization
- **Animated Pumpjack** — Four-bar linkage kinematic simulation driven by live SPM telemetry, rendered in Three.js
- **Interactive Wellbore** — Cross-section showing casing, tubing, sucker rod, oil particles, and steam particles; a depth slider drives a glowing 3D marker from 0–2,000 m
- **Reservoir Cross-Section** — Animated thermal front dome and heat-wave rings that change colour with temperature, set against a translucent rock-layer backdrop

### 🌐 Bhashini NMT Integration
- Real-time alert translation into **Hindi, Assamese, and Telugu** via MeitY's Bhashini API
- Language preference is per-user and persists across sessions
- Sovereign Indian government infrastructure — no industrial data sent to foreign commercial APIs

### 🔐 Role-Based Access Control
- **Field Supervisor** — Fleet-wide dashboard, CRUD user management, macro-level optimization
- **Well Incharge** — Single-well Digital Twin, pump control, localized alerts
- JWT-based auth: role enforced at both the React Router layer and every FastAPI endpoint

### 📊 Real-Time Telemetry
- WebSocket stream from FastAPI → Zustand global store → live UI (2-second cadence)
- 9 simultaneous real-time charts: temperature, pressure, flow rate, SPM, rod load, vibration, motor load, VFD frequency, steam injection rate
- Slow-poll REST refresh every 8 seconds for reservoir and AI state

### 🚨 Industrial Alert System
- Severity tiers: CRITICAL · HIGH · MEDIUM · INFO
- In-app notification bell with unread badge and mark-all-read
- Per-role alert filtering (Supervisor sees all wells; Incharge sees only their own)

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **React** | 18.2 | UI framework |
| **TypeScript** | 5.0 | Type safety |
| **Tailwind CSS** | 3.3 | Styling (light industrial theme) |
| **Three.js** | r159 | 3D wellbore, reservoir, pumpjack |
| **@react-three/fiber** | 8.15 | React renderer for Three.js |
| **@react-three/drei** | 9.88 | Three.js helpers (OrbitControls, Bounds, Text) |
| **Zustand** | 4.4 | Global state management |
| **React Router** | 6.20 | Client-side routing (15 pages) |
| **Recharts** | 2.10 | Real-time telemetry charts |
| **i18next** | 23.x | Internationalisation (EN / HI / AS / TE) |
| **Lucide React** | 0.294 | Icon library |
| **Vite** | 5.0 | Build tool |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **FastAPI** | 0.104 | REST API + WebSocket server |
| **Python** | 3.8+ | Runtime |
| **PyTorch** | 2.1 | PINN model training and inference |
| **NumPy / SciPy** | 1.26 / 1.11 | Physics calculations |
| **scikit-learn** | 1.3 | ML utilities |
| **SQLAlchemy** | 2.0 | ORM |
| **PostgreSQL** | 13+ | Production database |
| **Uvicorn** | 0.24 | ASGI server |
| **Pydantic** | 2.5 | Schema validation |
| **python-jose** | 3.3 | JWT authentication |
| **httpx** | 0.25 | Bhashini API client |
| **Redis + Celery** | 5.0 / 5.3 | Async task queue for optimization jobs |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React + TypeScript + Vite                                   │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Supervisor  │  │ Well Incharge│  │   Login Page     │  │
│  │  Dashboard   │  │  Digital Twin│  │   (Bhashini UI)  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│         │                 │                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Zustand Store  ←──  WebSocket (2s)  ←──  REST API  │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP / WebSocket
┌──────────────────────────▼──────────────────────────────────┐
│                        BACKEND                               │
│  FastAPI + Uvicorn                                           │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐    │
│  │  Physics   │  │  PINN AI   │  │  Bhashini NMT      │    │
│  │  Models    │  │  Engine    │  │  Translation Layer │    │
│  │  CSS / SRP │  │  PINNs     │  │  Hindi/Assamese/   │    │
│  │  Thermal   │  │  Optimiser │  │  Telugu            │    │
│  └────────────┘  └────────────┘  └────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │         PostgreSQL · Redis · Celery                │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## Application Pages

| # | Page | Role | Description |
|---|---|---|---|
| — | **Supervisor Dashboard** | Supervisor | Fleet-wide well cards, KPI row, alert feed, user management |
| 1 | **Overview** | Incharge | Full 3D Digital Twin — pumpjack + wellbore + reservoir |
| 2 | **Live Data** | Incharge | 9 real-time telemetry charts |
| 3 | **Reservoir** | Incharge | Thermal front visualization, depth inspector |
| 4 | **Wellbore** | Incharge | Interactive 3D cross-section, depth slider (0–2,000 m) |
| 5 | **AI Insights** | Incharge | PINN analysis, physics evidence chain, recommendations |
| 6 | **Simulation** | Incharge | What-if scenario lab — compare current vs simulated |
| 7 | **Pump Control** | Incharge | Live pumpjack animation, VFD slider, simulate before apply |
| 8 | **CSS Control** | Incharge | Steam cycle timeline, parameter editor, optimization run |
| 9 | **Optimization** | Incharge | Multi-objective optimizer (production / energy / risk) |
| 10 | **Alerts** | Both | Full alert log, thresholds, history, notification config |
| 11 | **History** | Both | CSS cycle timeline, production and SOR trend analysis |
| 12 | **Reports** | Both | PDF/CSV report generation with preview |
| 13 | **Settings** | Both | Language preference, notifications, system status |

---

## Role-Based Access Control

```
/login
  │
  ├── supervisor@oil.com  ──→  /supervisor  (Fleet Dashboard)
  │                                │
  │                                ├── View all 6 wells
  │                                ├── Drill into any well
  │                                └── User Management (CRUD Incharges)
  │
  └── incharge14@oil.com  ──→  /well/well-14/*  (Single Well)
                                    │
                                    ├── Overview (3D Digital Twin)
                                    ├── Pump Control
                                    ├── Alerts (BW-14 only)
                                    └── Settings (language preference)
```

JWT tokens carry the `role` claim. The React `RequireRole` guard blocks frontend routes. FastAPI middleware validates the same token on every API request. A Well Incharge cannot access another well's data at the API layer even if they manipulate the URL.

---

## Local Setup

### Prerequisites

| Requirement | Minimum Version |
|---|---|
| Node.js | 18.x |
| Python | 3.8 |
| npm | 9.x |
| PostgreSQL | 13 *(optional — app runs in demo mode without it)* |

---

### 1. Clone the Repository

```bash
git clone https://github.com/im-yousuf/sih.git
cd sih
```

---

### 2. Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

**Option A — Full installation (requires PostgreSQL):**
```bash
pip install -r requirements.txt
```

**Option B — Demo mode (no database required, recommended for quick start):**
```bash
pip install -r requirements-demo.txt
```

**Configure environment variables:**
```bash
# Create backend/.env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/baghewala_digital_twin
```
> If you skip this, the backend auto-runs in demo mode with in-memory simulation.

**Start the backend:**
```bash
# From the backend/ directory
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend is live at → `http://localhost:8000`  
Interactive API docs → `http://localhost:8000/docs`

---

### 3. Frontend Setup

```bash
# From the repo root
cd frontend

# Install dependencies
npm install
```

**Configure environment variables:**
```bash
# Create frontend/.env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws/digital-twin
```

**Start the dev server:**
```bash
npm run dev
```

Frontend is live at → `http://localhost:5173`

---

### 4. Docker Deployment

This project also supports containerized deployment with Docker Compose.

```bash
# From the repo root
docker compose up --build
```

This starts:
- Backend API at `http://localhost:8000`
- Frontend at `http://localhost:5173`
- PostgreSQL at `localhost:5432`

Use the same demo credentials listed below after the containers start.

---

### 5. One-Click Start (Windows)

```bash
# From the repo root — starts both servers in separate terminals
start.bat
```

---

### 6. Demo Credentials

| Role | Email | Password |
|---|---|---|
| Field Supervisor | `supervisor@oil.com` | `supervisor123` |
| Well Incharge (BW-14) | `incharge14@oil.com` | `incharge123` |

---

## Demo Scenarios

The platform ships with 6 pre-configured operating scenarios accessible from the Scenario Selector panel on the Overview page.

| Scenario | Trigger Condition | What to Watch |
|---|---|---|
| **Normal Production** | Baseline optimal state | Green status, AI confidence > 90% |
| **Reservoir Cooling** | Temperature decline → viscosity rise | AI condition shifts to `increasing_viscosity` |
| **High Viscosity** | Viscosity > 2,000 cP | Amber alert, SPM reduction recommended |
| **Rod Float** ⚠️ | Downstroke fluid load insufficient | Red critical alert, rod float risk > 80%, Bhashini translation fires |
| **Impact Loading** ⚠️ | Gas void in pump barrel | Red critical alert, pump RPM critical warning |
| **Optimized Operation** | AI-recommended settings applied | All metrics green, PINN confidence peak |

---

## Project Structure

```
sih/
├── backend/
│   ├── app/
│   │   ├── database/          # SQLAlchemy engine & session
│   │   ├── models/            # ORM models (well, telemetry, alerts, CSS, SRP, AI)
│   │   └── physics/           # Physics simulation engines
│   │       ├── thermal_model.py       # Bober-Lantz CSS thermal model
│   │       ├── viscosity_model.py     # Temperature-dependent viscosity
│   │       ├── wellbore_model.py      # Heat transfer & fluid flow
│   │       ├── rod_dynamics.py        # Gibbs Wave Equation solver
│   │       ├── dynamometer_model.py   # Rod float & impact detection
│   │       ├── surface_model.py       # Pumpjack kinematics
│   │       └── rod_float_detector.py  # Real-time fault classifier
│   ├── main.py                # FastAPI app, routers, WebSocket hub
│   ├── requirements.txt       # Full dependencies
│   └── requirements-demo.txt  # Minimal demo dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/        # Shared UI components
│   │   │   ├── Header.tsx             # TopNav — 3-zone flex layout
│   │   │   ├── Sidebar.tsx            # Collapsible navigation rail
│   │   │   ├── DigitalTwin3D.tsx      # Full-scene Three.js canvas
│   │   │   ├── PumpjackModel.tsx      # Kinematic pumpjack geometry
│   │   │   ├── PumpjackLights.tsx     # Canonical lighting rig
│   │   │   ├── PumpjackCanvas.tsx     # Pump Control page canvas
│   │   │   ├── ReservoirVisualization.tsx  # Thermal front 3D scene
│   │   │   ├── Wellbore3D.tsx         # Wellbore cross-section canvas
│   │   │   ├── WellStatusPanel.tsx    # Live KPI panel
│   │   │   ├── AIRecommendationPanel.tsx  # PINN output panel
│   │   │   ├── RealTimeChart.tsx      # Recharts telemetry wrapper
│   │   │   └── ScenarioSelector.tsx   # Demo scenario buttons
│   │   ├── pages/             # Route-level page components (15 pages)
│   │   ├── store/             # Zustand stores
│   │   │   ├── digitalTwinStore.ts    # Master telemetry + AI state
│   │   │   ├── notificationStore.ts   # Alert queue + unread count
│   │   │   ├── authStore.ts           # User session + JWT
│   │   │   └── sidebarStore.ts        # Sidebar expand/collapse
│   │   ├── services/
│   │   │   ├── api.ts                 # Axios REST client
│   │   │   └── websocket.ts           # WebSocket manager
│   │   ├── locales/           # i18n translation files
│   │   │   ├── en/translation.json
│   │   │   ├── hi/translation.json    # Hindi
│   │   │   ├── as/translation.json    # Assamese
│   │   │   └── raj/translation.json   # Rajasthani
│   │   └── i18n.ts            # i18next configuration
│   ├── public/
│   │   └── oilfield-sunset.jpg        # Login page hero image
│   ├── tailwind.config.js     # Light-theme design tokens
│   ├── vite.config.ts
│   └── package.json
│
├── guide.md                   # Judge demo script & pitch guide
├── README.md                  # This file
├── INSTALLATION.md            # Extended installation notes
├── start.bat                  # Windows one-click launcher
└── .gitignore
```

---

## ⚠️ Disclaimer

This is a **demonstration prototype** built for the Smart India Hackathon.

- All telemetry values are **simulated** — no connection to real OIL field equipment
- No actual VFD commands or SCADA writes are performed
- Physics models use published equations but require **field calibration** against real historical data before operational use
- The Bhashini integration is demonstrated with the public API; production use would require an enterprise API key from MeitY

---

## Contributing

This repository is a hackathon prototype. A path to production would require:

- [ ] Field calibration of physics models against OIL historical data
- [ ] Integration with OIL's existing SCADA / PI Historian infrastructure
- [ ] Security hardening (HTTPS, rate limiting, secrets management)
- [ ] Enterprise Bhashini API key and SLA agreement with MeitY
- [ ] Regulatory review under Petroleum & Natural Gas Rules

---

## License

This project is submitted for educational and evaluation purposes under the Smart India Hackathon 2026. All rights reserved.

---

<div align="center">

**Built with 💖 for Smart India Hackathon 2026**

*Oil India Limited · Problem Statement · Baghewala Heavy Oil Field, Rajasthan*

</div>
