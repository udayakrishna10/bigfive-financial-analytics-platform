FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if needed (e.g. for pandas/numpy compilation)
# RUN apt-get update && apt-get install -y --no-install-recommends gcc python3-dev && rm -rf /var/lib/apt/lists/*

COPY app/requirements.txt requirements-app.txt
COPY etl/requirements.txt requirements-etl.txt

RUN pip install --no-cache-dir -r requirements-app.txt && \
    pip install --no-cache-dir -r requirements-etl.txt

# Copy application code
COPY app/ ./
COPY etl/ ./etl/

EXPOSE 8080

# Default to running the API (Cloud Run Service)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
