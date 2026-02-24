import os
from google.cloud.pubsublite import AdminClient
from google.cloud.pubsublite.types import CloudRegion, CloudZone
from dotenv import load_dotenv

load_dotenv()
PROJECT_ID = os.getenv("GCP_PROJECT")

LOCATIONS = ["us-central1", "us-east1", "us-west1", "europe-west1"]

for loc in LOCATIONS:
    try:
        # Try as Region
        region = CloudRegion(loc)
        client = AdminClient(region)
        topics = client.list_topics(f"projects/{PROJECT_ID}/locations/{loc}")
        print(f"REGION {loc}: {[t.name for t in topics]}")
        
        # Try as Zone
        for zone_suffix in ["-a", "-b", "-c"]:
            zone_name = f"{loc}{zone_suffix}"
            zone = CloudZone.parse(zone_name)
            client = AdminClient(zone)
            topics = client.list_topics(f"projects/{PROJECT_ID}/locations/{zone_name}")
            print(f"ZONE {zone_name}: {[t.name for t in topics]}")
            
    except Exception as e:
        # print(f"Error checking {loc}: {e}")
        pass
