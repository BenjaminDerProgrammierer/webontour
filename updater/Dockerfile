# Updater node.js application Dockerfile
FROM node:lts-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Start the application
CMD ["npm", "start"]
