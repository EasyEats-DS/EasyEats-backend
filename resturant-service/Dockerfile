FROM node:18
WORKDIR /app
COPY package*.json package-lock.json ./
RUN npm install
COPY src/ ./src
EXPOSE 5004
CMD ["npm", "run", "dev"]