#!/bin/bash
set -e
IMAGE_TAG=${IMAGE_TAG:-latest}
GHCR_OWNER=${GHCR_OWNER:-local}
NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-/api}
echo "Building Web Docker image..."
docker build \
  --build-arg NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
  -t ghcr.io/${GHCR_OWNER}/docusign-web:${IMAGE_TAG} \
  -f apps/web/Dockerfile apps/web
echo "Web image built: ghcr.io/${GHCR_OWNER}/docusign-web:${IMAGE_TAG}"
