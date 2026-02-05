
import os
import logging
from google.cloud import bigquery

# Configuration
PROJECT_ID = os.environ.get("GCP_PROJECT", "faang-stock-analytics")
DATASET_ID = os.environ.get("GCP_DATASET", "faang_dataset")
TABLE_ID = os.environ.get("BRONZE_TABLE", "bronze")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = bigquery.Client(project=PROJECT_ID)
table_ref = f"{PROJECT_ID}.{DATASET_ID}.{TABLE_ID}"

def undo_feb4_injection():
    """Deletes rows with the specific timestamp injected by the seed script."""
    
    # The timestamp used in seed_feb4_real.py was "2026-02-04 21:00:00 UTC"
    query = f"""
        DELETE FROM `{table_ref}`
        WHERE timestamp = '2026-02-04 21:00:00 UTC'
    """
    
    try:
        query_job = client.query(query)
        query_job.result()  # Wait for job to complete
        logger.info(f"Successfully deleted Feb 4, 2026 data from {table_ref}")
        
    except Exception as e:
        logger.error(f"Failed to delete data: {e}")

if __name__ == "__main__":
    undo_feb4_injection()
