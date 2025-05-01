FROM node:lts-alpine

# Install cURL (for health check)
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Environment
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Run in production
CMD ["npm", "start"]
