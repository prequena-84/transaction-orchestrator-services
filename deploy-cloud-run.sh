#!/bin/bash
set -e

## Correr el codigo
## ./deploy-cloud-run.sh

# ============================================
# Script de Deployment a Google Cloud Run
# Con conexión privada a Cloud SQL
# ============================================

# Cargar variables de entorno desde .env
set -a
source .env
set +a

# Validar variables críticas
if [ -z "$DB_HOST" ]; then
    echo "❌ Error: DB_HOST no está definida en .env.production"
    exit 1
fi

if [ -z "$DB_PORT" ]; then
    echo "❌ Error: DB_PORT no está definida en .env.production"
    exit 1
fi

if [ -z "$DB_USER" ]; then
    echo "❌ Error: DB_USER no está definida en .env.production"
    exit 1
fi

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Error: DB_PASSWORD no está definida en .env.production"
    exit 1
fi

if [ -z "$DB_NAME" ]; then
    echo "❌ Error: DB_NAME no está definida en .env.production"
    exit 1
fi

if [ -z "$DB_SYNCHRONIZE" ]; then
    echo "❌ Error: DB_SYNCHRONIZE no está definida en .env.production"
    exit 1
fi

if [ -z "$DB_LOGGING" ]; then
    echo "❌ Error: DB_LOGGING no está definida en .env.production"
    exit 1
fi

if [ -z "$INTERNAL_API_KEY"]; then
    echo "❌ Error: INTERNAL_API_KEY no está definida en .env.production"
    exit 1
fi

# Variables de Google Cloud
PROJECT_ID="xxxxx"
REGION="us-central1"
REPO="xxxxx"
IMAGE="api-banking-backend"
TAG="latest"
SERVICE_NAME="api-banking-backend"
VPC_CONNECTOR_NAME="banking-connector"

# Construir la URL completa de la imagen en Artifact Registry
IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE}:${TAG}"

echo "🚀 Iniciando deployment a Google Cloud Run..."
echo "📦 Proyecto: $PROJECT_ID"
echo "🌎 Región: $REGION"
echo "🔧 Servicio: $SERVICE_NAME"
echo "🖼️  Imagen: $IMAGE_URL"
echo "🔌 VPC Connector: $VPC_CONNECTOR_NAME"
echo ""

# 1. Configurar proyecto
echo "1️⃣  Configurando proyecto de GCP..."
gcloud config set project $PROJECT_ID

# 2. Build de la imagen y push a Artifact Registry
echo "2️⃣  Construyendo imagen y subiendo a Artifact Registry..."
gcloud builds submit --tag $IMAGE_URL


# 3. Deploy a Cloud Run con VPC Connector (IP privada)
echo "3️⃣  Desplegando a Cloud Run con VPC Connector..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_URL \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --vpc-connector $VPC_CONNECTOR_NAME \
  --vpc-egress private-ranges-only \
  --set-env-vars "NODE_ENV=${NODE_ENV:-production}" \
  --set-env-vars "DB_HOST=${DB_HOST}" \
  --set-env-vars "DB_USER=${DB_USER}" \
  --set-env-vars "DB_PASSWORD=${DB_PASSWORD}" \
  --set-env-vars "DB_NAME=${DB_NAME}" \
  --set-env-vars "DB_SSL=${DB_SSL:-false}" \
  --set-env-vars "DB_SYNCHRONIZE=${DB_SYNCHRONIZE:-false}" \
  --set-env-vars "DB_LOGGING=${DB_LOGGING:-false}" \
  --set-env-vars "INTERNAL_API_KEY=${INTERNAL_API_KEY}" \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --min-instances 0

# 4. Asegurar acceso público (IAM)
echo "4️⃣  Configurando acceso público..."
gcloud run services add-iam-policy-binding $SERVICE_NAME \
  --region $REGION \
  --member="allUsers" \
  --role="roles/run.invoker" \
  --quiet

echo ""
echo "✅ Deployment completado!"
echo "🌐 URL del servicio:"
gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)'