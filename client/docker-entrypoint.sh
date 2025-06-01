#!/bin/sh

# Set default port if not provided
export PORT=${PORT:-80}

# Replace environment variables in the nginx configuration
envsubst '${VITE_API_URL} ${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g 'daemon off;'
