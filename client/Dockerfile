FROM node:lts-alpine

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
ENV PORT=8080
EXPOSE 8080

# Build the application at container build time to detect errors early
RUN npx vite build

# Run in production
CMD ["npm", "run", "serve"]
