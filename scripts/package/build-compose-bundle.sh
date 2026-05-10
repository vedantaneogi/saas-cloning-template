#!/bin/bash
set -e
echo "Building all Docker images via compose..."
docker compose build
echo "All images built successfully!"
