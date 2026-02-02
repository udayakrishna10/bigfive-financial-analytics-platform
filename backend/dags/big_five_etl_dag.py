from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.cncf.kubernetes.operators.kubernetes_pod import KubernetesPodOperator
from datetime import datetime, timedelta
from kubernetes.client import models as k8s
from google.cloud import artifactregistry_v1
import subprocess
import logging

# ===========================
# LOGGING
# ===========================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ===========================
# CONFIG
# ===========================
PROJECT_ID = "big-five-analytics"
REGION = "us-central1"
REPO = "big-five-backend-repo"
IMAGE_NAME = "big-five-etl"
TAG_FILTER = "prod-*"

IMAGE_BASE = f"{REGION}-docker.pkg.dev/{PROJECT_ID}/{REPO}/{IMAGE_NAME}"

# ===========================
# RESOLVE LATEST IMAGE (XCom)
# ===========================

def resolve_latest_etl_image(**context):
    """
    Try Artifact Registry client first. If missing or fails, fallback to gcloud CLI.
    Returns full image URI with latest prod-* tag.
    """
    try:
        from google.cloud import artifactregistry_v1

        client = artifactregistry_v1.ArtifactRegistryClient()
        parent = "projects/big-five-analytics/locations/us-central1/repositories/big-five-backend-repo"

        request = artifactregistry_v1.ListDockerImagesRequest(parent=parent, order_by="update_time desc")
        images = client.list_docker_images(request=request)

        for img in images:
            for tag in img.tags:
                if tag.startswith("prod-"):
                    image = f"us-central1-docker.pkg.dev/big-five-analytics/big-five-backend-repo/big-five-etl:{tag}"
                    return image

        raise ValueError("No prod-* image found in Artifact Registry")

    except (ImportError, Exception) as e:
        # Fallback to gcloud CLI
        import logging
        logging.warning(f"ArtifactRegistry client failed ({e}), falling back to gcloud CLI")
        
        cmd = [
            "gcloud", "artifacts", "docker", "images", "list-tags",
            "us-central1-docker.pkg.dev/big-five-analytics/big-five-backend-repo/big-five-etl",
            "--filter=tags:prod-*",
            "--sort-by=~timestamp",
            "--format=value(tags[0])"
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        tag = result.stdout.strip().split("\n")[0]
        image = f"us-central1-docker.pkg.dev/big-five-analytics/big-five-backend-repo/big-five-etl:{tag}"
        return image

# ===========================
# DEFAULT DAG ARGS
# ===========================
default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}

# ===========================
# DAG
# ===========================
with DAG(
    dag_id="big_five_daily_etl",
    default_args=default_args,
    start_date=datetime(2026, 1, 1),
    schedule="0 23 * * *",  # 11 PM UTC
    catchup=False,
    tags=["big-five", "medallion", "prod"],
    doc_md="""
    ### BigFive Stock ETL Pipeline
    **Runtime image resolution + Kubernetes execution**

    **Stages**
    - Bronze: Raw ingestion
    - Silver: OHLCV + daily returns
    - Gold: Technical indicators

    Always runs the **latest prod ETL image** from Artifact Registry.
    """
) as dag:

    # -----------------------
    # Resolve latest image
    # -----------------------
    resolve_image = PythonOperator(
        task_id="resolve_latest_image",
        python_callable=resolve_latest_etl_image,
    )

    # -----------------------
    # Shared ENV + resources
    # -----------------------
    common_env_vars = {
        "GCP_PROJECT": PROJECT_ID,
        "GCP_DATASET": "big_five_dataset",
        "LOG_LEVEL": "INFO",
    }

    compute_resources = k8s.V1ResourceRequirements(
        requests={"cpu": "500m", "memory": "1Gi"},
        limits={"cpu": "1000m", "memory": "2Gi"},
    )

    # -----------------------
    # Task factory
    # -----------------------
    def create_etl_task(task_id, script_name):
        return KubernetesPodOperator(
            task_id=task_id,
            name=task_id.replace("_", "-"),
            namespace="composer-user-workloads",
            image="us-central1-docker.pkg.dev/big-five-analytics/big-five-backend-repo/big-five-etl:prod-v2",
            image_pull_policy="Always",
            cmds=["python", script_name],
            working_dir="/app",  # <-- ensure scripts run from the correct folder
            env_vars=common_env_vars,
            container_resources=compute_resources,
            get_logs=True,
            is_delete_operator_pod=True,
        )

    # -----------------------
    # ETL tasks
    # -----------------------
    bronze = create_etl_task("bronze_etl", "bronze_etl.py")
    silver = create_etl_task("silver_etl", "silver_etl.py")
    gold = create_etl_task("gold_etl", "gold_etl.py")

    # -----------------------
    # Dependencies
    # -----------------------
    resolve_image >> bronze >> silver >> gold
