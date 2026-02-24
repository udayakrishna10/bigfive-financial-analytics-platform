import os
import time
from google.cloud.pubsublite.cloudpubsub import SubscriberClient
from google.cloud.pubsublite.types import SubscriptionPath, CloudRegion, FlowControlSettings
from dotenv import load_dotenv

load_dotenv()

PROJECT_ID = os.getenv("GCP_PROJECT")
LOCATION = os.getenv("GCP_LOCATION", "us-central1")
SUBSCRIPTION_ID = os.getenv("PUBSUB_LITE_SUBSCRIPTION")

print(f"Testing Subscription: {SUBSCRIPTION_ID} in {LOCATION}")

def callback(message):
    print(f"RECEIVED MESSAGE: {message.data.decode('utf-8')}")
    message.ack()

location_obj = CloudRegion(LOCATION)
subscription_path = SubscriptionPath(project=PROJECT_ID, location=location_obj, name=SUBSCRIPTION_ID)

flow_control = FlowControlSettings(
    messages_outstanding=100,
    bytes_outstanding=1 * 1024 * 1024,
)

with SubscriberClient() as subscriber:
    print(f"Subscribing to {subscription_path}...")
    subscriber.subscribe(
        subscription_path, 
        callback=callback,
        per_partition_flow_control_settings=flow_control
    )
    print("Listening for 30 seconds...")
    time.sleep(30)
