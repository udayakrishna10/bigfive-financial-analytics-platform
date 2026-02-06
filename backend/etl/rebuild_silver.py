#!/usr/bin/env python3
"""
Rebuild Silver table with new indicator columns.
This script will:
1. Drop the existing Silver table
2. Recreate it with the new schema
3. Reprocess all data from Bronze
"""
import os
import sys
import logging
from datetime import datetime, timezone
from google.cloud import bigquery

# Configuration
PROJECT_ID = os.getenv("GCP_PROJECT", "faang-stock-analytics")
DATASET = os.getenv("GCP_DATASET", "faang_dataset")
SILVER_TABLE = os.getenv("SILVER_TABLE", "silver")

silver_ref = f"{PROJECT_ID}.{DATASET}.{SILVER_TABLE}"

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
    logger.info("Starting Silver table rebuild...")
    start_time = datetime.now(timezone.utc)
    
    # Step 1: Drop existing Silver table
    logger.info(f"Dropping existing Silver table: {silver_ref}")
    try:
        client.delete_table(silver_ref, not_found_ok=True)
        logger.info("Silver table dropped successfully")
    except Exception as e:
        logger.error(f"Failed to drop Silver table: {e}")
        sys.exit(1)
    
    # Step 2: Run Silver ETL (which will recreate the table and process all data)
    logger.info("Running Silver ETL to rebuild with new schema...")
    import silver_etl
    silver_etl.main()
    
    duration = (datetime.now(timezone.utc) - start_time).total_seconds()
    logger.info(f"Silver table rebuild completed in {duration:.2f}s")

if __name__ == "__main__":
    main()
