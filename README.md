# BigFive: Scalable Financial Intelligence Platform
**Nov 2026 – Feb 2026**

## Project Summary
An end-to-end financial data engineering and AI solution providing real-time analytics and strategic sentiment for the "Big Tech" giants: Apple, Amazon, Meta, Netflix, and Google. The platform is designed for mathematical precision and cost-efficiency, processing daily market data and high-signal news to generate executive-level insights. Initially built on a heavy Kubernetes (GKE) stack, it was re-engineered into a Serverless, Low-Cost pipeline that automates the lifecycle from ingestion to historical archiving.

### Live @ https://bigfivebyuk.netlify.app


## Evolution of Architecture

The project evolved through two distinct architectural phases to achieve optimal cost-performance ratio.

| Feature | Phase 1: Enterprise Native (GKE) | Phase 2: Serverless Optimized (Cloud Run) |
| :--- | :--- | :--- |
| **Compute** | GKE Autopilot (Always-On) | Cloud Run Jobs (Scale-to-Zero) |
| **Orchestration** | Apache Airflow (Cloud Composer) | Native Cloud Scheduler |
| **Storage Strategy** | Monolithic BigQuery Storage | BigQuery + GCS "Intelligence Sink" |
| **Operational Cost** | High (~$100+/month idle fees) | Minimal (99% Reduction) |
| **Maintenance** | Cluster & Node Management | Zero-Ops (Managed Serverless) |
| **Best Use Case** | Continuous Streaming / High Traffic | Daily Post-Market Batch Processing |

## Architecture: The "Low-Cost" Serverless Evolution
The platform follows a decoupled, batch-oriented architecture optimized for the 6:00 PM EST post-market settlement:

*   **Orchestration**: Cloud Scheduler triggers the daily ingestion cycle post-market close.
*   **Compute**: Cloud Run Jobs execute containerized Docker logic, scaling to zero when not in use to eliminate idle costs.
*   **Data Warehouse**: Google BigQuery follows a Medallion-lite (Bronze → Silver → Gold) pattern for data governance.
*   **Intelligence Sink**: AI-generated market summaries are persisted as timestamped `.txt` files in GCS, creating a low-cost, immutable historical archive.
*   **Frontend**: A responsive React 18 + Vite dashboard hosted on Netlify.

## Why I Migrated to Serverless?
I shifted from GKE and Cloud Composer to a Serverless model to prove that enterprise-grade intelligence doesn't require high-overhead infrastructure.

*   **Significant Cost Reduction**: Removed the fixed monthly fees of GKE and Airflow, utilizing the GCP Serverless model.
*   **Operational Simplicity**: Eliminated node management and cluster maintenance.
*   **Optimized Storage**: By offloading unstructured AI text to GCS, the database remains lean and highly performant.

## Technical Stack

| Category | Tools & Technologies |
| :--- | :--- |
| **Cloud Infrastructure** | GCP, Cloud Run, Cloud Scheduler, Docker |
| **Data Platform** | Google BigQuery, Google Cloud Storage (GCS) |
| **Backend API** | Python, FastAPI, Pandas, NumPy |
| **AI & Intelligence** | OpenAI GPT-4o-mini, News Sentiment Engineering |
| **Quant Analysis** | RSI (14-day), SMA (20/50), Daily Returns |


## The ETL Pipeline: Post-Market Batch Processing
The platform’s engine is a fully automated, 3-stage pipeline executed daily via containerized Docker jobs.

### 1. Extraction (Ingestion Layer)
*   **Trigger**: Cloud Scheduler initiates the process at 6:00 PM EST once market settlement is finalized.
*   **Multi-Source Fetch**: Cloud Run Jobs pull market OHLCV data via yFinance and sentiment data from tier-1 sources like CNBC, Bloomberg, and WSJ.
*   **Bronze Storage**: Raw payloads land in BigQuery Bronze tables as immutable historical snapshots.

### 2. Transformation (Processing Layer)
*   **Data Cleaning**: Handles the "First-Day Paradox" by fixing null values in daily returns.
*   **Quant Logic**: Calculates RSI and SMA, enforcing 19 and 49-day null windows to ensure indicator accuracy.
*   **Sentiment Synthesis**: High-reputation news headers are processed by GPT-4o-mini, governed by a 50-request/day global rate limiter.

### 3. Loading (Presentation & Archival Layer)
*   **Business Logic (Gold)**: BigQuery SQL Views perform final aggregations and `LAG()` window functions for time-series continuity.
*   **Intelligence Sink**: Finalized AI summaries are exported as timestamped `.txt` files to GCS.
*   **API Delivery**: FastAPI serves the Gold layer and GCS summaries to the React frontend.


## Key Metrics & Business Impact

| Metric | Value |
| :--- | :--- |
| **Operational Cost** | Minimal / Month (Serverless Optimized) |
| **Update Frequency** | Daily @ 6:00 PM EST |
| **Data Accuracy** | 100% (Enforced 19/49-Day Warm-up) |
| **API Limit** | Global Cap of 50 Requests/Day |


## Data Engineering & Technical Challenges

### Challenge 1: Infrastructure Overkill & Cost Optimization
*   **Problem**: Initial GKE/Composer architecture carried high "idle fees" for a process that only runs once daily.
*   **Solution**: Migrated the stack to Cloud Run Jobs and Docker.
*   **Impact**: Reduced fixed operational costs to minimal levels.

### Challenge 2: The "Silver-to-Gold" Null Propagation
*   **Problem**: Daily Returns were null across layers because daily batches lacked the previous day's price for comparison.
*   **Solution**: Implemented Cross-Batch Lag Logic in BigQuery using `LAG() OVER(...)` window functions.
*   **Impact**: Fixed broken time-series charts, ensuring accurate percentage-change visualization.

### Challenge 3: Quant Indicator Accuracy & "Warm-up" Periods
*   **Problem**: RSI and SMA produce skewed values if calculated from Day 1 without enough historical context.
*   **Solution**: Implemented Strict Null Enforcement. Forced the first 19 records (20-SMA) and 49 records (50-SMA) to NULL.
*   **Impact**: 100% mathematical integrity; signals are only visualized once the algorithm has sufficient data.

### Challenge 4: Financial News Signal-to-Noise Ratio
*   **Problem**: General news feeds were cluttered with irrelevant gossip and clickbait.
*   **Solution**: Engineered a Reputation-Based Filter focusing on tier-1 sources like CNBC, Bloomberg, and WSJ.
*   **Impact**: Significantly higher fidelity in AI summaries by processing only professional reporting.

### Challenge 5: Efficient Persistence of Unstructured Data
*   **Problem**: Storing long-form AI text in relational databases is cost-inefficient for large archives.
*   **Solution**: Developed an "Intelligence Sink" pushing daily summaries as `.txt` files to GCS.
*   **Impact**: Created a high-durability, low-cost archive of historical market sentiment.

### Challenge 6: Post-Market Data Settlement
*   **Problem**: Ingesting data too early (4:00 PM) led to inconsistent values due to after-hours settlement.
*   **Solution**: Hard-coded the orchestration trigger to 6:00 PM EST.
*   **Impact**: Guaranteed 100% accuracy for post-market reporting and technical indicator calculations.

### Challenge 7: Generative AI Cost Governance
*   **Problem**: Unrestricted access to OpenAI API risked unexpected billing spikes.
*   **Solution**: Implemented a Global Rate Limiter strictly capping model calls at 50 requests per day.
*   **Impact**: Guaranteed cost predictability while maintaining overhead for daily batch processing.

## Skills & Tools

*   **Infrastructure**: GCP (Cloud Run, BigQuery, GCS, Secret Manager), Docker
*   **ETL**: Python, Pandas, Cloud Run Jobs, Window Functions (SQL)

## Screenshots
![Dashboard](/Images/dashboard.png)
![Data Architecture](/Images/data_architecture.png)
![News Sentiment](/Images/news_sentiment.png)


## AI Insights By OpenAI GPT-4o-mini

* [AI Insights By GPT-4o-mini](docs/AI_Insights_By_GPT-4o-mini.pdf)


## Deployment & Operations

The entire backend and data pipeline is fully automated and can be deployed with a single command.

### One-Click Deployment
To deploy the API, build the Docker containers, and schedule the ETL jobs:

```bash
./backend/deploy.sh
```

### Automation Architecture
*   **Infrastructure-as-Code**: `deploy.sh` handles Artifact Registry creation, Cloud Run Service updates, and Cloud Scheduler configuration.
*   **Unified Docker Image**: A single optimized Python 3.11 image (`backend/Dockerfile`) powers both the live API and the batch ETL jobs.
*   **Scheduled Jobs**:
    *   **Bronze Ingestion**: Runs daily at 4:15 PM ET via Cloud Scheduler.
    *   **Silver Transformation**: Runs daily at 4:30 PM ET.
    *   **Gold Aggregation**: Runs daily at 4:45 PM ET.

## **Udaya Krishna Karanam**  

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Profile-blue?style=flat&logo=linkedin)](https://www.linkedin.com/in/udayakrishnakaranam10)
[![Email](https://img.shields.io/badge/Email-Contact-red?style=flat&logo=gmail)](mailto:ukrishn10@gmail.com)
