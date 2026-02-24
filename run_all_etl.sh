#!/bin/bash
# ==============================================================================
# BigFive ETL Pipeline Automation
# This script runs all bronze, silver, and gold ETL tasks sequentially.
# Designed to be run daily via crontab to keep BigQuery data fresh.
# ==============================================================================

# Set working directory to the project root
PROJECT_ROOT="/Applications/BigFive"

echo "Starting BigFive Daily ETL Pipeline at $(date)"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
    echo "Environment variables loaded."
else
    echo "Warning: .env file not found at $PROJECT_ROOT/.env"
fi

# Activate virtual environment
if [ -f "$PROJECT_ROOT/.venv/bin/activate" ]; then
    source "$PROJECT_ROOT/.venv/bin/activate"
    echo "Virtual environment activated."
else
    echo "Warning: Virtual environment not found at $PROJECT_ROOT/.venv"
fi

# Run ETL Scripts sequentially
cd "$PROJECT_ROOT/backend/etl" || exit

echo "Running Bronze Stock ETL..."
python bronze_etl.py || echo "Bronze Stock ETL encountered an error."

echo "Running Bronze FRED Economics ETL..."
python bronze_fred_etl.py || echo "Bronze FRED ETL encountered an error."

echo "Running Bronze Crypto ETL..."
python bronze_crypto_etl.py || echo "Bronze Crypto ETL encountered an error."

echo "Running Silver Data Synthesis ETL..."
python silver_etl.py || echo "Silver ETL encountered an error."

echo "Running Gold Aggregations ETL..."
python gold_etl.py || echo "Gold ETL encountered an error."

echo "BigFive Daily ETL Pipeline completed at $(date)"
