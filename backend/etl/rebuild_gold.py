#!/usr/bin/env python3
"""
Rebuild Gold table with new indicator columns.
This script will:
1. Drop the existing Gold table
2. Recreate it with the new schema
3. Reprocess all data from Silver
"""
import os
import sys
import logging
from datetime import datetime, timezone
from google.cloud import bigquery

# Configuration
PROJECT_ID = os.getenv("GCP_PROJECT", "faang-stock-analytics")
DATASET = os.getenv("DATASET", "faang_dataset")
GOLD_TABLE = os.getenv("GOLD_TABLE", "gold")

gold_ref = f"{PROJECT_ID}.{DATASET}.{GOLD_TABLE}"

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# BigQuery client
client = bigquery.Client(project=PROJECT_ID)

def main():
    logger.info("Starting Gold table rebuild...")
    start_time = datetime.now(timezone.utc)
    
    # Step 1: Drop existing Gold table
    logger.info(f"Dropping existing Gold table: {gold_ref}")
    try:
        client.delete_table(gold_ref, not_found_ok=True)
        logger.info("Gold table dropped successfully")
    except Exception as e:
        logger.error(f"Failed to drop Gold table: {e}")
        sys.exit(1)
    
    # Step 2: Run Gold ETL (which will recreate the table and process all data)
    logger.info("Running Gold ETL to rebuild with new schema...")
    import gold_etl
    gold_etl.run_gold_etl()
    
    duration = (datetime.now(timezone.utc) - start_time).total_seconds()
    logger.info(f"Gold table rebuild completed in {duration:.2f}s")

if __name__ == "__main__":
    main()
