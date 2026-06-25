# Single-stage Dockerfile for Game Services
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/
COPY server.py ./
COPY config/ ./config/

# Copy pre-built frontend
COPY dist/ ./dist/
COPY runtime-config.js ./

# Copy local uploads folder (for default game images)
COPY uploads/ ./uploads/

# Copy database (will be overridden by volume in production)
COPY database.db ./database.db

# Create directories
RUN mkdir -p /app/uploads/slips

EXPOSE 3000

CMD ["python", "server.py"]
