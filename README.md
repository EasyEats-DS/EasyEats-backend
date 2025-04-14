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

EasyEats Server is a robust, scalable backend solution for modern food delivery platforms, built with microservices architecture using Node.js and Express.js. The platform seamlessly connects customers, restaurants, and delivery personnel through a high-performance system designed for reliability and real-time operations.

Key aspects:
- 🚀 Microservices-based architecture for independent scaling
- 🔒 Secure authentication with JWT and role-based access control
- 📱 Supports web and mobile interfaces
- 📊 Real-time order tracking and notifications
- 💳 Multiple payment gateway integrations


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
git clone https://github.com/EasyEats-DS/EasyEats-backend.git

# Navigate into the project folders and Install dependencies
cd EasyEats-backend

cd api-gateway
npm install

cd order-service
npm install

cd user-service
npm install
```

## Running the Project

### open Docker Desktop app and make suer it running  in the background and go to the root directory:
```bash
docker compose build
docker compose up
```

### Open the Each Service Directory and run this following command to start the service

### Development Mode

```bash
npm start
```

## License

This project is licensed under the MIT License.
