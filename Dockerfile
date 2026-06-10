# syntax=docker/dockerfile:1
# Stage 1: build the React frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: run the FastAPI backend (serves the built frontend too)
FROM python:3.12.11-slim
WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY start.sh ./start.sh
RUN chmod +x ./start.sh
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 8080
ENTRYPOINT ["/app/start.sh"]
