#!/bin/bash

echo "Current NODE_ENV: $NODE_ENV"

if [ "$NODE_ENV" = "production" ] || [ -z "$NODE_ENV" ]; then
    echo "Running in production mode, decrypting files..."
    
    chmod +x ./scripts/decrypt.sh
    
    ./scripts/decrypt.sh
    
    if [ $? -ne 0 ]; then
        echo "Error running decryption script"
        exit 1
    fi
    
    echo "Decryption completed successfully"
fi

echo "Initiating..."
node index.js