# 🦓 ZebraPoint

Platforma wsparcia dla opiekunów osób z rzadkimi chorobami.

## Quick Start

### Backend
```bash
conda create -n zebrapoint python=3.12
conda activate zebrapoint
pip install -r backend/requirements.txt
# Z katalogu głównego projektu:
./run-backend.sh
# Lub z katalogu backend:
cd backend && uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Docker
```bash
docker-compose up --build
```

## Tech Stack

- **Backend:** FastAPI, SQLAlchemy, PostgreSQL (Supabase), JWT
- **Frontend:** React, Vite, TailwindCSS, Zustand
- **Database:** Supabase (PostgreSQL + pgvector)

## Documentation

Szczegółowy plan Sprint 1: `docs/ZebraPoint_Sprint1_Szczegoly.md`
