# The Galactic Observer — production container
# Single-stage build, optimized for "I can read and understand this in 30 seconds."
# (Mirrors the trialcat Dockerfile — a known-good road.)

FROM python:3.12-slim

WORKDIR /app

# - PYTHONDONTWRITEBYTECODE: no .pyc clutter
# - PYTHONUNBUFFERED: logs flush immediately (critical for Docker/Fly log visibility)
# - PIP_NO_CACHE_DIR: smaller image
# - PYTHONPATH: so `app.main:app` resolves from the backend package
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app/backend

# curl for Fly.io health checks and debugging. No build tools yet — pure-Python deps.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Requirements first so Docker layer caching helps us: code edits don't reinstall pip deps.
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --upgrade pip && pip install -r /app/backend/requirements.txt

# The app: backend code, frontend templates/static, and the content archive.
COPY backend /app/backend
COPY frontend /app/frontend
COPY content /app/content

EXPOSE 8000

# Healthcheck — /health is cheap (no I/O) so this is safe every 30s.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run uvicorn from the backend dir so imports resolve. 0.0.0.0 to be reachable.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "/app/backend"]
