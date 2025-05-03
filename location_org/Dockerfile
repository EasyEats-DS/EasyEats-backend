# Use Node.js LTS version as base image
FROM node:18

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all project files including .env
COPY . .

# Expose the application port from .env
EXPOSE 3001

# Start the application using development script
CMD ["npm", "run", "dev"]