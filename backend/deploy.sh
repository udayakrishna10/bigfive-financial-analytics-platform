#!/bin/bash
set -e

# Configuration
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
REPO_NAME="faang-repo"
IMAGE_NAME="faang-backend"
SERVICE_NAME="faang-api"
IMAGE_URI="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$IMAGE_NAME:latest"

echo "Using Project DB: $PROJECT_ID"

# 1. Enable Services
echo "Enabling Services..."
gcloud services enable run.googleapis.com cloudscheduler.googleapis.com artifactregistry.googleapis.com

# 2. Create Artifact Registry if not exists
if ! gcloud artifacts repositories describe $REPO_NAME --location=$REGION; then
    gcloud artifacts repositories create $REPO_NAME --repository-format=docker --location=$REGION --description="Docker repository for FAANG app"
fi

# 3. Build and Push Image
echo "Building and Pushing Docker Image..."
# Build from 'backend' directory context (where Dockerfile is)
gcloud builds submit --tag $IMAGE_URI .

# 4. Deploy API Service
echo "Deploying API Service..."
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_URI \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars GCP_PROJECT=$PROJECT_ID,GCP_DATASET=faang_dataset \
    --memory 512Mi

# 5. Deploy ETL Jobs
echo "Deploying ETL Jobs..."

# Bronze ETL
gcloud run jobs deploy bronze-etl-job \
    --image $IMAGE_URI \
    --region $REGION \
    --command python \
    --args etl/bronze_etl.py \
    --set-env-vars GCP_PROJECT=$PROJECT_ID,GCP_DATASET=faang_dataset,BRONZE_TABLE=bronze \
    --max-retries 1 \
    --task-timeout 300s

# Silver ETL
gcloud run jobs deploy silver-etl-job \
    --image $IMAGE_URI \
    --region $REGION \
    --command python \
    --args etl/silver_etl.py \
    --set-env-vars GCP_PROJECT=$PROJECT_ID,GCP_DATASET=faang_dataset,BRONZE_TABLE=bronze,SILVER_TABLE=silver,LOG_LEVEL=INFO \
    --max-retries 1 \
    --task-timeout 300s

# Gold ETL
gcloud run jobs deploy gold-etl-job \
    --image $IMAGE_URI \
    --region $REGION \
    --command python \
    --args etl/gold_etl.py \
    --set-env-vars GCP_PROJECT=$PROJECT_ID,DATASET=faang_dataset,SILVER_TABLE=silver,GOLD_TABLE=gold \
    --max-retries 1 \
    --task-timeout 300s


# 6. Schedule Jobs (Cloud Scheduler)
# Schedule: Bronze (4:30 PM ET), Silver (4:45 PM ET), Gold (5:00 PM ET)
# Converted to Cron (UTC roughly or ET timezone)

echo "Creating/Updating Cloud Scheduler Jobs..."

# Bronze - 4:15 PM ET (Closing Bell + 15m)
gcloud scheduler jobs create http bronze-daily-trigger \
    --location $REGION \
    --item-type=run-job \
    --target-job-name=bronze-etl-job \
    --schedule="15 16 * * 1-5" \
    --time-zone="America/New_York" \
    --attempt-deadline=320s || \
    gcloud scheduler jobs update http bronze-daily-trigger \
    --location $REGION \
    --item-type=run-job \
    --target-job-name=bronze-etl-job \
    --schedule="15 16 * * 1-5" \
    --time-zone="America/New_York"

# Silver - 4:30 PM ET
gcloud scheduler jobs create http silver-daily-trigger \
    --location $REGION \
    --item-type=run-job \
    --target-job-name=silver-etl-job \
    --schedule="30 16 * * 1-5" \
    --time-zone="America/New_York" \
    --attempt-deadline=320s || \
    gcloud scheduler jobs update http silver-daily-trigger \
    --location $REGION \
    --item-type=run-job \
    --target-job-name=silver-etl-job \
    --schedule="30 16 * * 1-5" \
    --time-zone="America/New_York"

# Gold - 4:45 PM ET
gcloud scheduler jobs create http gold-daily-trigger \
    --location $REGION \
    --item-type=run-job \
    --target-job-name=gold-etl-job \
    --schedule="45 16 * * 1-5" \
    --time-zone="America/New_York" \
    --attempt-deadline=320s || \
    gcloud scheduler jobs update http gold-daily-trigger \
    --location $REGION \
    --item-type=run-job \
    --target-job-name=gold-etl-job \
    --schedule="45 16 * * 1-5" \
    --time-zone="America/New_York"

echo "Deployment Complete! 🚀"
