import os
import sys
import logging
from datetime import datetime, timezone
import pandas as pd
import yfinance as yf
from google.cloud import bigquery

# ===========================
# CONFIGURATION
# ===========================
PROJECT_ID = os.environ.get("GCP_PROJECT", "faang-stock-analytics")
DATASET_ID = os.environ.get("GCP_DATASET", "faang_dataset")
TABLE_ID = "fundamentals"
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()

BIG_FIVE_SYMBOLS = ["AAPL", "AMZN", "META", "NFLX", "GOOGL"]

# ===========================
# LOGGER
# ===========================
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# ===========================
# BIGQUERY CLIENT
# ===========================
client = bigquery.Client(project=PROJECT_ID)
table_ref = f"{PROJECT_ID}.{DATASET_ID}.{TABLE_ID}"

def recreate_table():
    """Create or replace fundamentals table to maintain schema freshness."""
    schema = [
        bigquery.SchemaField("ticker", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("forwardPE", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("trailingPE", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("priceToBook", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("profitMargins", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("debtToEquity", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("beta", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("shortPercentOfFloat", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("returnOnEquity", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("operatingMargins", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("revenueGrowth", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("freeCashflow", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("enterpriseToEbitda", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("dividendYield", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("priceToSales", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("currentRatio", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("returnOnAssets", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("marketCap", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("trailingEps", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("forwardEps", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("trailingPegRatio", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("totalDebt", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("totalCash", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("heldPercentInstitutions", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("heldPercentInsiders", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("grossMargins", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("revenuePerShare", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("bookValue", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("shortRatio", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("impliedSharesOutstanding", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("totalRevenue", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("grossProfits", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("ebitda", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("operatingCashflow", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("earningsQuarterlyGrowth", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("enterpriseValue", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("payoutRatio", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("targetHighPrice", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("targetLowPrice", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("targetMeanPrice", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("recommendationMean", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("recommendationKey", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("numberOfAnalystOpinions", "INTEGER", mode="NULLABLE"),
        bigquery.SchemaField("overallRisk", "INTEGER", mode="NULLABLE"),
        bigquery.SchemaField("auditRisk", "INTEGER", mode="NULLABLE"),
        bigquery.SchemaField("boardRisk", "INTEGER", mode="NULLABLE"),
        bigquery.SchemaField("compensationRisk", "INTEGER", mode="NULLABLE"),
        bigquery.SchemaField("shareHolderRightsRisk", "INTEGER", mode="NULLABLE"),
        bigquery.SchemaField("fiftyTwoWeekLow", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("fiftyTwoWeekHigh", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("fiftyTwoWeekChange", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("allTimeHigh", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("allTimeLow", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("quickRatio", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("averageVolume", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("averageDailyVolume10Day", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("dividendRate", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("fiveYearAvgDividendYield", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("ebitdaMargins", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("sharesShort", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("sharesShortPriorMonth", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("fullTimeEmployees", "INTEGER", mode="NULLABLE"),
        bigquery.SchemaField("updated_at", "TIMESTAMP", mode="REQUIRED"),
    ]
    table = bigquery.Table(table_ref, schema=schema)
    try:
        client.delete_table(table_ref, not_found_ok=True)
        table = client.create_table(table)
        logger.info(f"Created table {table_ref}")
    except Exception as e:
        logger.error(f"Error creating table: {e}")

def run_etl():
    """Fetch live fundamentals and push to BigQuery."""
    logger.info("Starting Fundamentals ETL (with data integrity check)...")
    
    records = []
    
    for ticker in BIG_FIVE_SYMBOLS:
        try:
            logger.info(f"Fetching fundamentals for {ticker}...")
            company = yf.Ticker(ticker)
            info = company.info
            
            # Data Integrity Check: Overall Risk is a critical metric for our audit
            risk = info.get("overallRisk")
            if risk is None:
                logger.warning(f"Ticker {ticker} missing overallRisk. Using previous or N/A.")
            
            records.append({
                "ticker": ticker,
                "forwardPE": float(info.get("forwardPE")) if info.get("forwardPE") is not None else None,
                "trailingPE": float(info.get("trailingPE")) if info.get("trailingPE") is not None else None,
                "priceToBook": float(info.get("priceToBook")) if info.get("priceToBook") is not None else None,
                "profitMargins": float(info.get("profitMargins")) if info.get("profitMargins") is not None else None,
                "debtToEquity": float(info.get("debtToEquity")) if info.get("debtToEquity") is not None else None,
                "beta": float(info.get("beta")) if info.get("beta") is not None else None,
                "shortPercentOfFloat": float(info.get("shortPercentOfFloat")) if info.get("shortPercentOfFloat") is not None else None,
                "returnOnEquity": float(info.get("returnOnEquity")) if info.get("returnOnEquity") is not None else None,
                "operatingMargins": float(info.get("operatingMargins")) if info.get("operatingMargins") is not None else None,
                "revenueGrowth": float(info.get("revenueGrowth")) if info.get("revenueGrowth") is not None else None,
                "freeCashflow": float(info.get("freeCashflow")) if info.get("freeCashflow") is not None else None,
                "enterpriseToEbitda": float(info.get("enterpriseToEbitda")) if info.get("enterpriseToEbitda") is not None else None,
                "dividendYield": float(info.get("trailingAnnualDividendYield")) if info.get("trailingAnnualDividendYield") is not None else None,
                "priceToSales": float(info.get("priceToSalesTrailing12Months")) if info.get("priceToSalesTrailing12Months") is not None else None,
                "currentRatio": float(info.get("currentRatio")) if info.get("currentRatio") is not None else None,
                "returnOnAssets": float(info.get("returnOnAssets")) if info.get("returnOnAssets") is not None else None,
                "marketCap": float(info.get("marketCap")) if info.get("marketCap") is not None else None,
                "trailingEps": float(info.get("trailingEps")) if info.get("trailingEps") is not None else None,
                "forwardEps": float(info.get("forwardEps")) if info.get("forwardEps") is not None else None,
                "trailingPegRatio": float(info.get("trailingPegRatio")) if info.get("trailingPegRatio") is not None else None,
                "totalDebt": float(info.get("totalDebt")) if info.get("totalDebt") is not None else None,
                "totalCash": float(info.get("totalCash")) if info.get("totalCash") is not None else None,
                "heldPercentInstitutions": float(info.get("heldPercentInstitutions")) if info.get("heldPercentInstitutions") is not None else None,
                "heldPercentInsiders": float(info.get("heldPercentInsiders")) if info.get("heldPercentInsiders") is not None else None,
                "grossMargins": float(info.get("grossMargins")) if info.get("grossMargins") is not None else None,
                "revenuePerShare": float(info.get("revenuePerShare")) if info.get("revenuePerShare") is not None else None,
                "bookValue": float(info.get("bookValue")) if info.get("bookValue") is not None else None,
                "shortRatio": float(info.get("shortRatio")) if info.get("shortRatio") is not None else None,
                "impliedSharesOutstanding": float(info.get("impliedSharesOutstanding")) if info.get("impliedSharesOutstanding") is not None else None,
                "totalRevenue": float(info.get("totalRevenue")) if info.get("totalRevenue") is not None else None,
                "grossProfits": float(info.get("grossProfits")) if info.get("grossProfits") is not None else None,
                "ebitda": float(info.get("ebitda")) if info.get("ebitda") is not None else None,
                "operatingCashflow": float(info.get("operatingCashflow")) if info.get("operatingCashflow") is not None else None,
                "earningsQuarterlyGrowth": float(info.get("earningsQuarterlyGrowth")) if info.get("earningsQuarterlyGrowth") is not None else None,
                "enterpriseValue": float(info.get("enterpriseValue")) if info.get("enterpriseValue") is not None else None,
                "payoutRatio": float(info.get("payoutRatio")) if info.get("payoutRatio") is not None else None,
                "targetHighPrice": float(info.get("targetHighPrice")) if info.get("targetHighPrice") is not None else None,
                "targetLowPrice": float(info.get("targetLowPrice")) if info.get("targetLowPrice") is not None else None,
                "targetMeanPrice": float(info.get("targetMeanPrice")) if info.get("targetMeanPrice") is not None else None,
                "recommendationMean": float(info.get("recommendationMean")) if info.get("recommendationMean") is not None else None,
                "recommendationKey": info.get("recommendationKey"),
                "numberOfAnalystOpinions": int(info.get("numberOfAnalystOpinions")) if info.get("numberOfAnalystOpinions") is not None else None,
                "overallRisk": int(info.get("overallRisk")) if info.get("overallRisk") is not None else None,
                "auditRisk": int(info.get("auditRisk")) if info.get("auditRisk") is not None else None,
                "boardRisk": int(info.get("boardRisk")) if info.get("boardRisk") is not None else None,
                "compensationRisk": int(info.get("compensationRisk")) if info.get("compensationRisk") is not None else None,
                "shareHolderRightsRisk": int(info.get("shareHolderRightsRisk")) if info.get("shareHolderRightsRisk") is not None else None,
                "fiftyTwoWeekLow": float(info.get("fiftyTwoWeekLow")) if info.get("fiftyTwoWeekLow") is not None else None,
                "fiftyTwoWeekHigh": float(info.get("fiftyTwoWeekHigh")) if info.get("fiftyTwoWeekHigh") is not None else None,
                "fiftyTwoWeekChange": float(info.get("52WeekChange")) if info.get("52WeekChange") is not None else None,
                "allTimeHigh": float(info.get("allTimeHigh")) if info.get("allTimeHigh") is not None else None,
                "allTimeLow": float(info.get("allTimeLow")) if info.get("allTimeLow") is not None else None,
                "quickRatio": float(info.get("quickRatio")) if info.get("quickRatio") is not None else None,
                "averageVolume": float(info.get("averageVolume")) if info.get("averageVolume") is not None else None,
                "averageDailyVolume10Day": float(info.get("averageDailyVolume10Day")) if info.get("averageDailyVolume10Day") is not None else None,
                "dividendRate": float(info.get("dividendRate")) if info.get("dividendRate") is not None else None,
                "fiveYearAvgDividendYield": float(info.get("fiveYearAvgDividendYield")) if info.get("fiveYearAvgDividendYield") is not None else None,
                "ebitdaMargins": float(info.get("ebitdaMargins")) if info.get("ebitdaMargins") is not None else None,
                "sharesShort": float(info.get("sharesShort")) if info.get("sharesShort") is not None else None,
                "sharesShortPriorMonth": float(info.get("sharesShortPriorMonth")) if info.get("sharesShortPriorMonth") is not None else None,
                "fullTimeEmployees": int(info.get("fullTimeEmployees")) if info.get("fullTimeEmployees") is not None else None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
        except Exception as e:
            logger.error(f"Error fetching fundamentals for {ticker}: {e}")

    if not records:
        logger.warning("No fundamental records fetched. Exiting.")
        return

    # To satisfy auditing requirement, recreate table on every successful fetch
    recreate_table()
    
    df = pd.DataFrame(records)
    
    # Load to BQ
    job_config = bigquery.LoadJobConfig(
        write_disposition="WRITE_TRUNCATE",  # Overwrite table every time since it's just latest fundamentals
        source_format=bigquery.SourceFormat.PARQUET,
    )

    try:
        logger.info(f"Uploading {len(df)} records to {table_ref}...")
        job = client.load_table_from_dataframe(df, table_ref, job_config=job_config)
        job.result()  # Wait for job to complete
        logger.info(f"Fundamentals ETL completed successfully. Uploaded {job.output_rows} rows.")
    except Exception as e:
        logger.error(f"BigQuery upload failed: {e}")

if __name__ == "__main__":
    run_etl()
