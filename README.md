# AI Rainfall & Inundation Early Warning System

> **SIH 2024 Prototype** — AI/ML-Based Integrated Heavy Rainfall Early Warning
> and Inundation Prediction System using Satellite, Radar, Observational
> Weather, and NWP Model Data.

---

## Architecture Overview

```
.
├── backend/                  # Python FastAPI service
│   ├── app/
│   │   ├── api/              # Route handlers (one file per domain)
│   │   ├── services/         # Business logic, data loading, ML inference
│   │   ├── models/           # ML model definitions / wrappers
│   │   ├── schemas/          # Pydantic request & response schemas
│   │   └── utils/            # Shared helpers (config, coordinate utils)
│   ├── requirements.txt
│   └── .env.example
├── frontend/                 # React + Vite application
│   └── src/
│       ├── components/       # Reusable UI components
│       ├── pages/            # Page-level components (routed views)
│       ├── services/         # API client wrappers
│       ├── hooks/            # Custom React hooks
│       └── utils/            # Pure utility functions
├── data/
│   ├── rainfall/             # GPM IMERG NetCDF / HDF5 files
│   ├── dem/                  # SRTM GeoTIFF elevation tiles
│   └── observations/         # IMD / AWS station CSV files
└── models/                   # Saved ML model weights (.pkl, .h5, .pt)
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python | ≥ 3.10 |
| Node.js | ≥ 18 |
| npm | ≥ 9 |

---

## Quick Start

### 1. Clone the repository

```bash
git clone <repo-url>
cd "SIH prototype"
```

### 2. Backend setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy the example env file
copy .env.example .env        # Windows
# cp .env.example .env        # macOS / Linux

# Start the FastAPI dev server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: **http://localhost:8000**  
Interactive docs (Swagger UI): **http://localhost:8000/docs**

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The React app will be available at: **http://localhost:5173**

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Service health check |

### Example response — `GET /api/health`

```json
{
  "status": "ok",
  "service": "rainfall-flood-warning-system"
}
```

---

## Data Setup (Sprint 2+)

Place your pre-downloaded data files in the following directories before
running ML pipelines:

| Directory | Content |
|-----------|---------|
| `data/rainfall/` | GPM IMERG HDF5 / NetCDF files |
| `data/dem/` | SRTM GeoTIFF elevation tiles |
| `data/observations/` | IMD / AWS station CSV files |

---

## Sprint Roadmap

| Sprint | Goal |
|--------|------|
| **1 ✅** | Project skeleton, health API, frontend shell |
| 2 | GPM IMERG data ingestion + Leaflet map visualisation |
| 3 | SRTM DEM processing + slope / flow-direction computation |
| 4 | Random Forest / LSTM flood-risk model training |
| 5 | Real-time-like inference pipeline + alert cards |
| 6 | Polish, demo video, documentation |

---

## Team

SIH 2024 — Team FloodSense
