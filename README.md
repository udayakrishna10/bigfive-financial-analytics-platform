# BigFive: Scalable Financial Intelligence Platform
**Nov 2025 – Feb 2026**

### Live @ https://bigfivebyuk.netlify.app

## Project Summary
An end-to-end data engineering and analytics platform providing real-time market intelligence for the "Big Five" tech giants. The project focuses on high-integrity data pipelines and cost-optimized cloud architecture, transitioning from a heavy Kubernetes (GKE) environment to a 98.5% cost-efficient Serverless stack.

### Key Engineering Impact

* **Architectural Migration**: Re-engineered a high-overhead GKE/Airflow stack into a Serverless "Scale-to-Zero" architecture using Google Cloud Run Jobs and Cloud Scheduler, achieving significant operational savings while automating daily 4:15 PM EST ingestion.
* **Data Integrity & Quant Logic**: Solved the technical indicator "warm-up" paradox by enforcing strict 19 and 49-day null windows for 20/50 SMA and RSI calculations, ensuring 100% mathematical accuracy for trend analysis.
* **Medallion Pipeline (BigQuery)**: Designed a 3-layer ETL flow (Bronze → Silver → Gold) utilizing SQL Window Functions (LAG) to resolve daily return null propagation across batch ingestions.
* **Intelligence Sink (GCS)**: Implemented a cost-effective archival strategy for unstructured data by decoupling AI-generated summaries into timestamped .txt files in Google Cloud Storage, keeping the BigQuery warehouse lean and performant.
* **Signal Processing**: Engineered an on-demand News API integration with a reputation-based filter to ingest high-signal financial reporting from tier-1 sources (CNBC, Bloomberg, WSJ), optimizing LLM (GPT-4o-mini) processing efficiency.
* **Governance**: Established a Global Rate Limiter and utilized GCP Secret Manager to ensure API security and strict budgetary control.


## Evolution of Architecture

The project evolved through two distinct architectural phases to achieve optimal cost-performance ratio.

| Feature | Phase 1: Enterprise Native (GKE) | Phase 2: Serverless Optimized | Phase 3: Global Intelligence |
| :--- | :--- | :--- | :--- |
| **Compute** | GKE Autopilot (Always-On) | Cloud Run Jobs (Scale-to-Zero) | Serverless + GenAI Analysis |
| **Orchestration** | Apache Airflow (Cloud Composer) | Native Cloud Scheduler | Real-time Cross-Market Sync |
| **Data Strategy** | Monolithic BigQuery Storage | BigQuery + GCS "Intelligence Sink" | Cross-Asset Global Integration |
| **Operational Cost** | High (~$70/month idle fees) | Scale-to-Zero Efficiency | Usage-Based Costing |
| **CI/CD Pipeline** | Manual / Cloud Build | GitHub Actions (Automated) | Pull Request & Verified Deploy |
| **Maintenance** | Cluster & Node Management | Zero-Ops (Managed Serverless) | Automated Data Quality Logic |
| **Best Use Case** | Continuous Streaming / High Traffic | Daily Post-Market Batch Processing | Automated Insights |


### Impact Metrics
*   **98.5% Cost Reduction**: From ~$70/mo (GKE) to ~$1/mo (Cloud Run).
*   **Zero-Ops Managed**: Fully automated, decoupled serverless architecture.

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

## Engineering Challenges

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
*   **Solution**: Hard-coded the orchestration trigger to 4:15 PM EST.
*   **Impact**: Guaranteed 100% accuracy for post-market reporting and technical indicator calculations.

### Challenge 7: Generative AI Cost Governance
*   **Problem**: Unrestricted access to OpenAI API risked unexpected billing spikes.
*   **Solution**: Implemented a Global Rate Limiter strictly capping model calls at 50 requests per day.
*   **Impact**: Guaranteed cost predictability while maintaining overhead for daily batch processing.

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
