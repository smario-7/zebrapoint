FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc libpq-dev libgomp1 curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-heavy.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements-heavy.txt

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

COPY . .

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "1"]
