# Use Node.js LTS version as base image
FROM node:18

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src/ ./src

# Expose port
EXPOSE 5005

# Start the application
CMD ["npm", "run", "dev"]