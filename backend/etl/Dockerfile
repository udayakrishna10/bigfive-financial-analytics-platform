# Base image
FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for caching
COPY requirements.txt .

# Install system dependencies and Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl wget git \
    && pip install --no-cache-dir -r requirements.txt \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy ETL scripts
COPY . .

# Environment variables defaults (can be overridden)
ENV LOG_LEVEL=INFO
ENV GCP_PROJECT=faang-stock-analytics
ENV DATASET=faang_dataset

# Default entrypoint: ETL script will be passed at runtime
ENTRYPOINT ["python"]