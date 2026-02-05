#!/bin/bash
set -e

# Ensure we are executing from the script's directory
cd "$(dirname "$0")"

# Configuration
# prioritized env var (from CI) or fallback to gcloud config (local)
PROJECT_ID=${PROJECT_ID:-$(gcloud config get-value project)}
REGION="us-central1"
REPO_NAME="faang-repo"
IMAGE_NAME="faang-backend"
SERVICE_NAME="faang-api"
IMAGE_URI="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$IMAGE_NAME:latest"

echo "Using Project DB: $PROJECT_ID"

# 1. Enable Services
# echo "Enabling Services..."
# gcloud services enable run.googleapis.com cloudscheduler.googleapis.com artifactregistry.googleapis.com

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

echo "Creating/Updating Cloud Scheduler Jobs..."

# Function to create/update scheduler for Cloud Run Job
create_scheduler() {
    JOB_NAME=$1
    SCHEDULER_NAME=$2
    SCHEDULE=$3
    
    # URL for Cloud Run Job execution (REST API)
    # Note: Requires Cloud Run Admin or Invoker role for the service account
    URI="https://$REGION-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/$PROJECT_ID/jobs/$JOB_NAME:run"
    
    # Fetch Project Number to construct default Compute SA email
    PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
    SA_EMAIL="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
    
    echo "Using Service Account for Scheduler: $SA_EMAIL"

    echo "Scheduling $JOB_NAME via $SCHEDULER_NAME ($SCHEDULE)..."
    
    gcloud scheduler jobs create http $SCHEDULER_NAME \
        --location $REGION \
        --schedule="$SCHEDULE" \
        --time-zone="America/New_York" \
        --uri="$URI" \
        --http-method=POST \
        --oauth-service-account-email="$SA_EMAIL" \
        --attempt-deadline=320s \
        --quiet || \
    gcloud scheduler jobs update http $SCHEDULER_NAME \
        --location $REGION \
        --schedule="$SCHEDULE" \
        --time-zone="America/New_York" \
        --uri="$URI" \
        --http-method=POST \
        --oauth-service-account-email="$SA_EMAIL" \
        --attempt-deadline=320s \
        --quiet
}

# Bronze - 4:15 PM ET
create_scheduler "bronze-etl-job" "bronze-daily-trigger" "15 16 * * 1-5"

# Silver - 4:30 PM ET
create_scheduler "silver-etl-job" "silver-daily-trigger" "30 16 * * 1-5"

# Gold - 4:45 PM ET
create_scheduler "gold-etl-job" "gold-daily-trigger" "45 16 * * 1-5"

echo "Deployment Complete! 🚀"
