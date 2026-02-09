# BigFive: Scalable Financial Intelligence Platform
**Nov 2026 – Feb 2026**

## Project Summary
An end-to-end data engineering and analytics platform providing real-time market intelligence for the "Big Five" tech giants. The project focuses on high-integrity data pipelines and cost-optimized cloud architecture, transitioning from a heavy Kubernetes (GKE) environment to a 99% cost-efficient Serverless stack.

### Key Engineering Impact

* **Architectural Migration**: Re-engineered a high-overhead GKE/Airflow stack into a Serverless "Scale-to-Zero" architecture using Google Cloud Run Jobs and Cloud Scheduler, achieving significant operational savings while automating daily 4:15 PM EST ingestion.
* **Data Integrity & Quant Logic**: Solved the technical indicator "warm-up" paradox by enforcing strict 19 and 49-day null windows for 20/50 SMA and RSI calculations, ensuring 100% mathematical accuracy for trend analysis.
* **Medallion Pipeline (BigQuery)**: Designed a 3-layer ETL flow (Bronze → Silver → Gold) utilizing SQL Window Functions (LAG) to resolve daily return null propagation across batch ingestions.
* **Intelligence Sink (GCS)**: Implemented a cost-effective archival strategy for unstructured data by decoupling AI-generated summaries into timestamped .txt files in Google Cloud Storage, keeping the BigQuery warehouse lean and performant.
* **Signal Processing**: Engineered an on-demand News API integration with a reputation-based filter to ingest high-signal financial reporting from tier-1 sources (CNBC, Bloomberg, WSJ), optimizing LLM (GPT-4o-mini) processing efficiency.
* **Governance**: Established a Global Rate Limiter and utilized GCP Secret Manager to ensure API security and strict budgetary control.

### Live @ https://bigfivebyuk.netlify.app


## Evolution of Architecture

The project evolved through two distinct architectural phases to achieve optimal cost-performance ratio.

| Feature | Phase 1: Enterprise Native (GKE) | Phase 2: Serverless Optimized | Phase 3: Global Intelligence |
| :--- | :--- | :--- | :--- |
| **Compute** | GKE Autopilot (Always-On) | Cloud Run Jobs (Scale-to-Zero) | Serverless + GenAI Analysis (GPT-4) |
| **Orchestration** | Apache Airflow (Cloud Composer) | Native Cloud Scheduler | Real-time Tech & Crypto Sync |
| **Data Strategy** | Monolithic BigQuery Storage | BigQuery + GCS "Intelligence Sink" | Global FRED Macro Integration |
| **Operational Cost** | High (~$100+/month idle fees) | Minimal (99% Reduction) | Optimal ROI (Predictive Analytics) |
| **CI/CD Pipeline** | Manual / Cloud Build | GitHub Actions (Automated) | Pull Request & Verified Deploy |
| **Maintenance** | Cluster & Node Management | Zero-Ops (Managed Serverless) | Automated Data Quality Logic |
| **Best Use Case** | Continuous Streaming / High Traffic | Daily Post-Market Batch Processing | Technical Analysis & Macro Forecasts |

## Architecture: The "Low-Cost" Serverless Evolution
The platform follows a decoupled, batch-oriented architecture optimized for the 4:15 PM EST post-market settlement:

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
| **External APIs** | FRED (Macro Docs), CoinGecko (Crypto), NewsAPI, yFinance |
| **Quant Analysis** | RSI (14-day), EMA, MACD, Bollinger Bands |


## The ETL Pipeline: Post-Market Batch Processing
The platform’s engine is a fully automated, 3-stage pipeline executed daily via containerized Docker jobs.

### 1. Extraction (Ingestion Layer)
*   **Trigger**: Cloud Scheduler initiates the process at 4:15 PM EST once market settlement is finalized.
*   **Multi-Source Fetch**: Cloud Run Jobs pull market OHLCV via **yFinance**, live Crypto prices via **CoinGecko**, and Global Macro indicators (VIX, Yields) via **FRED API**.
*   **Sentiment Search**: **On-Demand API-driven** financial news headers are pulled from **NewsAPI.org**, refined by a strict "Institutional Reputation" filter.
*   **Bronze Storage**: Raw payloads land in BigQuery Bronze tables as immutable historical snapshots.

### 2. Transformation (Processing Layer)
*   **Data Cleaning**: Handles the "First-Day Paradox" by fixing null values in daily returns.
*   **Quant Logic**: Calculates RSI and SMA, enforcing 19 and 49-day null windows to ensure indicator accuracy.
*   **Sentiment Synthesis**: High-reputation news headers are processed by GPT-4o-mini, governed by a 50-request/day global rate limiter.

### 3. Loading (Presentation & Archival Layer)
*   **Business Logic (Gold)**: BigQuery SQL Views perform final aggregations and `LAG()` window functions for time-series continuity.
*   **Intelligence Sink**: Finalized AI summaries are exported as timestamped `.txt` files to GCS.
*   **API Delivery**: FastAPI serves the Gold layer and GCS summaries to the React frontend.



## Skills & Tools

*   **Infrastructure**: GCP (Cloud Run, BigQuery, GCS, Secret Manager), Docker
*   **ETL**: Python, Pandas, Cloud Run Jobs, Window Functions (SQL)

## CI/CD Pipeline

The platform uses **GitHub Actions** for automated deployment. On every push to main branch, the workflow triggers Cloud Build to create a Docker image, deploys it to Cloud Run with zero downtime, and automatically injects secrets from GitHub repository settings. The CI service account is configured with permissions to enable full deployment automation. The frontend auto-deploys via Netlify, and previous Cloud Run revisions are retained for one-click rollback if needed.


## Screenshots
![Dashboard Overview](/Images/dashboard_overview.png)
![Market Momentum & Analytics](/Images/market_momentum_analytics.png)
![Economic Data Dashboard](/Images/economic_dashboard.png)
![News Sentiment & AI Pulse](/Images/news_sentiment_pulse.png)
![Architecture Evolution](/Images/architecture_evolution.png)
![Data Architecture & Security](/Images/data_architecture_diagram.png)


## AI Insights By OpenAI GPT-4o-mini

* [AI Insights By GPT-4o-mini](docs/AI_Insights_By_GPT-4o-mini.pdf)


*   **Scheduled Jobs**:
    *   **Bronze Ingestion**: Runs daily at 4:15 PM ET via Cloud Scheduler.
    *   **Silver Transformation**: Runs daily at 4:30 PM ET.
    *   **Gold Aggregation**: Runs daily at 4:45 PM ET.
    *   **Crypto Ingestion**: Runs daily at 7:00 PM ET.
    *   **FRED Economic Data**: Runs weekly at 6:00 AM ET Monday.

## **Udaya Krishna Karanam**  

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Profile-blue?style=flat&logo=linkedin)](https://www.linkedin.com/in/udayakrishnakaranam10)
[![Email](https://img.shields.io/badge/Email-Contact-red?style=flat&logo=gmail)](mailto:ukrishn10@gmail.com)
