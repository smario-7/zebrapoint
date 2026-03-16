FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc libpq-dev libgomp1 curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# CPU-only torch — bez CUDA
RUN pip install --no-cache-dir \
    torch==2.5.1 --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "1"]
