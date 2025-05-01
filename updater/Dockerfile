FROM node:20-alpine

WORKDIR /app

# Install Docker CLI
RUN apk add --no-cache docker-cli docker-compose

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Expose the server port
EXPOSE 3000

# Start the server
CMD ["node", "dist/index.js"]
