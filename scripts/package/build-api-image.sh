#!/bin/bash
set -e
IMAGE_TAG=${IMAGE_TAG:-latest}
GHCR_OWNER=${GHCR_OWNER:-local}
echo "Building API Docker image..."
docker build -t ghcr.io/${GHCR_OWNER}/docusign-api:${IMAGE_TAG} -f apps/api/Dockerfile apps/api
echo "API image built: ghcr.io/${GHCR_OWNER}/docusign-api:${IMAGE_TAG}"
