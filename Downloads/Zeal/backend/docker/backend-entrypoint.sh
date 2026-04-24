#!/bin/sh
set -e

CONTRACT_ENV_FILE_PATH="${CONTRACT_ENV_FILE:-/shared/contract.env}"

if [ -z "${CONTRACT_ADDRESS:-}" ] && [ -f "$CONTRACT_ENV_FILE_PATH" ]; then
  DEPLOYED_ADDRESS=$(awk -F= '/^CONTRACT_ADDRESS=/{print $2}' "$CONTRACT_ENV_FILE_PATH" | tr -d '[:space:]')
  if [ -n "$DEPLOYED_ADDRESS" ]; then
    export CONTRACT_ADDRESS="$DEPLOYED_ADDRESS"
    echo "Loaded CONTRACT_ADDRESS from deployment artifact: $CONTRACT_ADDRESS"
  fi
fi

if [ -z "${CONTRACT_ADDRESS:-}" ]; then
  echo "Warning: CONTRACT_ADDRESS is empty. Blockchain write calls will fail until contract is deployed."
fi

exec java -jar app.jar
