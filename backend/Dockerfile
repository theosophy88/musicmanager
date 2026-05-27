# ── Stage 1: Build React frontend ──────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /frontend

COPY ../frontend/package.json ../frontend/package-lock.json* ./
RUN npm ci

COPY ../frontend/ .

# Override outDir to emit to /frontend/dist (then we COPY it below)
RUN npm run build -- --outDir /frontend/dist

# ── Stage 2: Python backend ────────────────────────────────────
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libmagic1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Embed the built frontend
COPY --from=frontend-build /frontend/dist /app/static

RUN mkdir -p /data

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
