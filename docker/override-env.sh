#!/bin/sh
set -e

# Ensure envsubst is available
if ! command -v envsubst >/dev/null 2>&1; then
  echo "envsubst not found" >&2
  exit 1
fi

# Replace placeholders in index.template.html into index.html
if [ -f /usr/share/nginx/html/index.template.html ]; then
  envsubst < /usr/share/nginx/html/index.template.html > /usr/share/nginx/html/index.html
fi


