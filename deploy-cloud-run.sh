set -e

PROJECT_ID="youtube-mp3-converter"
REGION="asia-northeast1"
APP_NAME="youtube-mp3-app"
SERVICE_ACCOUNT="${APP_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
GCS_BUCKET_NAME="youtube-mp3-converter-files"

if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud CLI is not installed. Please install it first."
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install it first."
    exit 1
fi

echo "Checking gcloud authentication..."
gcloud auth list --filter=status:ACTIVE --format="value(account)" || {
    echo "Please authenticate with gcloud first:"
    echo "gcloud auth login"
    exit 1
}

echo "Setting project to ${PROJECT_ID}..."
gcloud config set project ${PROJECT_ID}

echo "Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com \
                       run.googleapis.com \
                       storage.googleapis.com \
                       cloudscheduler.googleapis.com

echo "Creating GCS bucket if it doesn't exist..."
if ! gcloud storage buckets describe gs://${GCS_BUCKET_NAME} &> /dev/null; then
    gcloud storage buckets create gs://${GCS_BUCKET_NAME} \
        --location=${REGION} \
        --default-storage-class=STANDARD \
        --uniform-bucket-level-access
    echo "Created bucket gs://${GCS_BUCKET_NAME}"
else
    echo "Bucket gs://${GCS_BUCKET_NAME} already exists"
fi

echo "Creating service account if it doesn't exist..."
if ! gcloud iam service-accounts describe ${SERVICE_ACCOUNT} &> /dev/null; then
    gcloud iam service-accounts create ${APP_NAME} \
        --display-name="YouTube MP3 Converter App"
    echo "Created service account ${SERVICE_ACCOUNT}"
else
    echo "Service account ${SERVICE_ACCOUNT} already exists"
fi

echo "Granting permissions to the service account..."
gcloud storage buckets add-iam-policy-binding gs://${GCS_BUCKET_NAME} \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/storage.objectAdmin"

echo "Building and pushing Docker image..."
IMAGE_NAME="gcr.io/${PROJECT_ID}/${APP_NAME}:latest"
docker build -t ${IMAGE_NAME} .
docker push ${IMAGE_NAME}

echo "Deploying to Cloud Run..."
gcloud run deploy ${APP_NAME} \
    --image=${IMAGE_NAME} \
    --platform=managed \
    --region=${REGION} \
    --service-account=${SERVICE_ACCOUNT} \
    --memory=512Mi \
    --concurrency=80 \
    --set-env-vars="GCS_BUCKET_NAME=${GCS_BUCKET_NAME}" \
    --allow-unauthenticated

SERVICE_URL=$(gcloud run services describe ${APP_NAME} --region=${REGION} --format='value(status.url)')
echo "Deployment complete! Your application is available at: ${SERVICE_URL}"
