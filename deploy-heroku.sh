#!/bin/bash

set -e

APP_NAME="ray-project-x"

echo "🔐 Logging in to Heroku Container Registry..."
heroku container:login

echo "🐳 Building Docker image for Heroku..."
docker build -t registry.heroku.com/$APP_NAME/web .

echo "📦 Pushing image to Heroku Container Registry..."
docker push registry.heroku.com/$APP_NAME/web

echo "🚀 Releasing image to Heroku app..."
heroku container:release web --app $APP_NAME

echo "🌍 Opening deployed app in browser..."
heroku open --app $APP_NAME
