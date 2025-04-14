#!/bin/bash

#  exits on error
set -e

# verbose
set -x

# ******************
# Load env variables from .env file
# ******************
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
    echo "Loaded environment variables from .env file"
else
    echo ".env file not found. Aborting..."
    exit 1
fi


# ******************
# Check for required env variables
# ******************

REQUIRED_VARS=("RESOURCE_GROUP" "LOCATION")
for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        echo "Error: $VAR is not set in .env file. Please set it and try again."
        exit 1
    fi
done

# ******************
# Check Azure CLI is logged in
# ******************
echo "Checking Azure CLI login status..."
az account show &> /dev/null
if [ $? -ne 0 ]; then
    echo "Error: Not logged into Azure CLI. Please run 'az login' first."
    exit 1
fi

# ******************
# Check if resource group exists
# ******************
echo "Checking if resource group $RESOURCE_GROUP exists..."
if ! az group show --name "$RESOURCE_GROUP" &> /dev/null; then
    echo "Resource group $RESOURCE_GROUP doesn't exist. Creating it..."
    az group create --name "$RESOURCE_GROUP" --location "$LOCATION" || {
        echo "Failed to create resource group $RESOURCE_GROUP. Aborting..."
        exit 1
    }
fi

# ******************
# Find or create Key Vault
# ******************
echo "Looking for existing Key Vault..."
EXISTING_KV=$(az keyvault list --query "[?starts_with(name, 'raybags-kv')].name" -o tsv | head -n 1)

if [ -n "$EXISTING_KV" ]; then
    KEY_VAULT="$EXISTING_KV"
    echo "Using existing Key Vault: $KEY_VAULT"
else
    TIMESTAMP=$(date +%s)
    KEY_VAULT="raybags-kv-${TIMESTAMP}"
    echo "Creating new Key Vault: $KEY_VAULT"
    
    az keyvault create \
    --name "$KEY_VAULT" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku standard || {
        echo "Failed to create Key Vault $KEY_VAULT. Check your permissions and try again."
        exit 1
    }
    
    echo "Key Vault $KEY_VAULT created successfully."
fi

# ******************
# List of environment variables to store
# ******************
ENV_VARS=(
    RESOURCE_GROUP
    LOCATION
    AZURE_STORAGE_ACCOUNT
    AZURE_STORAGE_CONTAINER
    AZURE_KEYVAULT
    AZURE_BLOB_SAS_SECRET
    AZURE_TENANT_ID
    AZURE_SUBSCRIPTION_ID
    AZURE_CLIENT_ID
    AZURE_CLIENT_SECRET
    AZURE_STORAGE_CONNECTION_STRING
    SKU
    KIND
)

# ******************
# Save secrets to Key Vault if not already existing
# ******************
echo "Saving environment variables to Key Vault..."
for VAR in "${ENV_VARS[@]}"; do
    SECRET_EXISTS=$(az keyvault secret list --vault-name "$KEY_VAULT" --query "[?name=='$VAR'] | length(@)" -o tsv)
    
    if [ "$SECRET_EXISTS" -eq 0 ]; then
        VAR_VALUE="${!VAR}"
        if [ -n "$VAR_VALUE" ]; then
            echo "Adding $VAR to Key Vault..."
            
            az keyvault secret set --vault-name "$KEY_VAULT" --name "$VAR" --value "$VAR_VALUE" > /dev/null || {
                echo "Failed to set secret $VAR in Key Vault $KEY_VAULT."
                continue
            }
            
            echo "$VAR saved successfully."
        else
            echo "Skipping $VAR because it is empty or not defined."
        fi
    else
        echo "Secret $VAR already exists. Skipping..."
    fi
done

# ******************
# Loading envs from Key Vault to current environment
# ******************
echo "Retrieving secrets from Key Vault..."
for VAR in "${ENV_VARS[@]}"; do
    VALUE=$(az keyvault secret show --vault-name "$KEY_VAULT" --name "$VAR" --query value -o tsv 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$VALUE" ]; then
        export $VAR="$VALUE"
        echo "Exported $VAR from Key Vault."
    else
        echo "Warning: Could not retrieve $VAR from Key Vault."
    fi
done

# ******************
# Display available varriables
# ******************
echo "Available secrets in Key Vault $KEY_VAULT:"
az keyvault secret list --vault-name "$KEY_VAULT" --query "[].{Name:name}" -o table

echo -e "\nScript completed successfully!"
echo -e "To use these variables in your current shell, run: source ./azure-vars.sh"
echo -e "Key Vault name: $KEY_VAULT"
