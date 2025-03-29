#!/bin/bash

echo "Stopping and removing all containers..."
docker compose down --volumes --remove-orphans

echo "Removing all unused Docker resources..."
docker system prune -af --volumes

echo "Building and starting fresh containers..."
docker compose build --no-cache && docker compose up -d

echo "Cleanup and rebuild complete!"
echo "You can now access the application at http://localhost:3002"