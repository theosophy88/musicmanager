# ── Stage 1: Build React frontend ──────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ .
# Ensure Vite emits to /frontend/dist inside the build stage so the
# subsequent multi-stage COPY can find the folder reliably.
RUN DOCKER_BUILD=true npm run build -- --outDir /frontend/dist

# dist is written to /frontend/dist (vite default, overriding outDir to dist not ../backend/static)

# ── Stage 2: Python backend ────────────────────────────────────
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libmagic1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# Embed the compiled frontend
COPY --from=frontend-build /frontend/dist /app/static

RUN mkdir -p /data

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
