# Use the official Node.js image as the base image
FROM node:20-alpine

# Set environment variable to skip Puppeteer's Chromium download
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV CHROME_BIN=/usr/bin/chromium-browser

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (Puppeteer will now skip downloading Chromium)
RUN npm install

# Install Chromium and related deps
RUN apk update && apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ttf-freefont \
    dumb-init \
    udev \
    bash \
    curl

# Copy the rest of the application code
COPY . .

# Expose app port
EXPOSE 3001

# Start the app
CMD ["npm", "start"]



# # Use the official Node.js image as the base image
# FROM node:20

# # Set the working directory inside the container
# WORKDIR /app

# # Copy package.json and package-lock.json to the working directory
# COPY package*.json ./

# # Install dependencies
# RUN npm install

# # Copy the rest of the application code to the working directory
# COPY . .

# # Expose the port the app runs on
# EXPOSE 3001

# # Define the command to run the application
# CMD ["npm", "start"]
