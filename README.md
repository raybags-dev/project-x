# Project X - Reviewer Application

## Overview

Project X is a Node.js application designed for web scraping and reviewing purposes. It integrates various services, such as MongoDB, Redis, AWS, axios and cherrio among others, to perform tasks related to web data extraction and review management.

## Features

- **Web Scraping**: Uses Puppeteer, axios and Cheerio to scrape data from  OTAs websites, use mongoose model achitecture with custom schemas to build review objects, stores them in mongodb and aws s3 storage, and impliments redis for caching.
- **Authentication and Authorization**: User authentication and profile-based access to review data.
- **Data Storage**: Connects to MongoDB for storing and retrieving review data.
- **Proxy Handling**: Supports proxy usage for web requests.
- **Logging**: Utilizes Winston for logging application events.
- **Testing**: Includes Mocha and Chai for unit and integration testing.
- **Environment Configuration**: Managed through environment variables for flexibility.

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)
- Docker (optional for containerization)

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/raybags-dev/project-x.git
   cd project-x


2. **Install dependencies**:
   ```bash
    npm install
    
3. **Create a .env file in the root directory and add your environment variables**:
   ```bash
      PROXY_ENDPOINT='http://your-proxy-endpoint'
      MONGO_URI='mongodb://your-mongo-uri'
      REDIS_HOST='localhost'
      REDIS_PORT=6379
   ```

4. **Run the application in different modes:**:
    In production
   ```bash
       npm run dev
   ```
   In production
   ```bash
       npm start
   ```
   Testing
   ```bash
       npm test
   ```
 ## Docker
 To build and run the application in a Docker container:

1. Build the Docker image:
    ```bash
         docker build -t project-x .
    ```
2. Run the Docker container:
    ```bash
        docker run -p 3001:3001 --env-file .env project-x
    ```

## Security Overview

### Authentication and Authorization

**Project X** employs a robust authentication and authorization framework to ensure secure access to resources. Here's an overview of the key security mechanisms:

#### JWT Authentication

- **Token Generation**: We use JSON Web Tokens (JWT) for user authentication. Tokens are generated upon successful login and include user details such as email, user ID, and roles.
- **Token Expiration**: Tokens have a set expiration time (e.g., 1 minute). This limits the window of exposure in case a token is compromised.
- **Token Verification**: Tokens are verified on each request using a secret key stored in environment variables. This ensures that the token has not been tampered with.

#### User Authentication

- **Login Process**: Users authenticate by providing their email and password. A valid login generates a JWT token, which is sent in the `Authorization` header for subsequent requests.
- **Password Reset**: Users can reset their passwords using a verification token. The token must match the one stored in the database to proceed with resetting the password.
- **State Managament**: All user and profile-related state metrics are securely stored in the database. Time-based authorization tokens are also cached on the client side to facilitate quick login and seamless access to the application.

- **User-Centric Privacy**: Each user has full control and ownership over the data they create and manage through their account. Your personal data and any content you generate are private and accessible only by you and you can decide to delete it at any time through the UI.

- **Secure Authentication**: Users authenticate via secure tokens, which are managed and validated to ensure that only authorized individuals can access their accounts. These tokens are time-based and expire to enhance security.

- **Granular Access Control**: Authorization is enforced at a granular level, allowing users to control who can access their data and manage their profiles. Access to user-specific data is strictly controlled based on user roles and permissions.

- **Data Isolation**: Each user's data is isolated from others, ensuring that no one else can access or modify your information without permission.

- **Token-Based Authorization**: Time-based authorization tokens are stored securely on the client side, facilitating quick login and ensuring smooth access while maintaining a high level of security.

- **Subscription-Based Access**: Access to all features and data is controlled through a subscription model - a trial period can allow you to run test data collection for only agoda.com and google.com for only 10 pages worth of data. This ensures that users have access to the resources and functionalities according to their subscription level.

#### User Management and Data Integrity

- **Profile Management**: Users can create, update, and delete an account. When you delete your account, the account, along with all associated profiles and reviews are removed permanently.


### License:
- This project is licensed under the MIT License.

- **Contact**:
For any inquiries, please reachout to be directly at:  `baguma.github@gmail.com`.