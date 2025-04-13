# EasyEats Server

<p align="center">
    <a href="https://nodejs.org/" target="blank">
        <img src="https://nodejs.org/static/images/logo.svg" width="120" alt="Node.js Logo" style="margin-right: 40px;" />
    </a>
    <a href="https://www.docker.com/" target="blank">
        <img src="https://en.vetores.org/d/docker.svg" width="120" alt="Docker Logo" style="margin-right: 40px;" />
    </a>
    <a href="https://kubernetes.io/" target="blank">
        <img src="https://vetores.org/d/kubernetes.svg" width="120" alt="Kubernetes Logo" style="margin-right: 40px;" />
    </a>
    <a href="https://kafka.apache.org/" target="blank">
        <img src="https://www.bettercloud.com/mx-careers/apache_kafka_wordtype-svg" width="120" alt="Kafka Logo" />
    </a>
</p>


<p align="center">
    A microservices-based backend for a food delivery platform, built with Node.js and Express.js.
</p>

<p align="center">
    <a href="https://www.npmjs.com/" target="_blank"><img src="https://img.shields.io/npm/v/express.svg" alt="NPM Version" /></a>
    <a href="https://circleci.com/gh/MealWhirl/MealWhirl-server" target="_blank"><img src="https://img.shields.io/circleci/build/github/MealWhirl/MealWhirl-server/master" alt="Build Status" /></a>
</p>

## Description

MealWhirl-server is a backend application designed to power a food delivery platform. It leverages a microservices architecture to ensure scalability, performance, and maintainability. The platform supports customer, restaurant, and delivery personnel roles, providing features such as real-time order tracking, secure payments, and notifications.

## Features

- **Web/Mobile Interface**: User-friendly interface for browsing restaurants, managing carts, and placing orders.
- **Restaurant Management**: Menu management, order availability, and incoming order handling.
- **Order Management**: Order placement, modification, and real-time tracking.
- **Delivery Management**: Automated driver assignment and real-time delivery tracking using Mapbox.
- **Payment Integration**: Secure payment gateways (PayPal, PayHere, Dialog Genie, FriMi).
- **Notifications**: SMS and email notifications using Nodemailer and Notify.js.
- **Authentication**: Role-based access control with JWT.

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Intercommunication**: Apache Kafka
- **Containerization**: Docker
- **Orchestration**: Kubernetes
- **Real-time Communication**: WebSockets
- **Mapping**: Mapbox
- **Payment Gateway**: PayPal (sandbox)

## Prerequisites

- Node.js (v16+ recommended)
- Docker and Kubernetes
- MongoDB

## Installation

```bash
# Clone the repository
git clone https://github.com/MealWhirl/MealWhirl-server.git

# Navigate into the project folder
cd MealWhirl-server

# Install dependencies
npm install
```

## Running the Project

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

## Environment Variables

Create a `.env` file and define the following variables:

```
PORT=5000
MONGO_URI=your_mongo_url
JWT_SECRET=your_secret_key
NODE_ENV=development
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_SECRET=your_paypal_secret
MAPBOX_API_KEY=your_mapbox_api_key
KAFKA_BROKER=your_kafka_broker
EMAIL_SERVICE=your_email_service
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
```

## API Documentation

The API is divided into the following services:

### Authentication

| Method | Endpoint                  | Description               |
| ------ | ------------------------- | ------------------------- |


### Restaurant Management

| Method | Endpoint                  | Description                     |
| ------ | ------------------------- | ------------------------------- |


## Testing

### Unit Tests

```bash
npm test
```

### Performance Tests

```bash
artillery run performance-test.yml
```

## Contributors

- [Your Name](https://github.com/your-profile)

## License

This project is licensed under the MIT License.
