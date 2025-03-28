# Project X - Reviewer API

## Overview

Project X is a multi-platform Node/Express API server designed to extract guest feedback from any OTA. It offers full automation of data extraction, user account management, and CRUD operations for managing stored data. On a higher level, it does the following below:

### Key Components
-  **Extracts reviews, ratings, and metadata from multiple OTA sites.**
-  **Supports pagination handling to collect all available reviews**
-  **Uses dynamic headers, user-agents, and proxy rotation to avoid detection**
-  **Leverages Puppeteer Stealth Plugin to bypass anti-scraping mechanisms**
-  **Enriches and saves data to storages (mongoDB and AWS)**
  
### User Management & Authentication
-  **Facilitates user registration & account creation.**
-  **Supports login & password updates.**
-  **Uses secure authentication tokens (JWT) for user sessions.**
-  **Provides role-based access control for different operations.**
### Review Site Profile Management
-  **Allows users to create and manage profiles of businesses or individuals.**
-  **Supports automated profile generation based on scraped data.**
-  **Enables linking of multiple review site profiles under a single entity.**
### Review Data Automation
-  **Periodically fetches new reviews for stored profiles.**
-  **Detects changes & updates stored data dynamically.**
-  **Uses scheduled crawls to keep information up to date.**
### API & Database (Node.js + MongoDB)
-  **Provides RESTful API endpoints for accessing review data.**
-  **Supports CRUD operations for:**
   -  **USER_MODEL → Handles users & authentication.**
   -  **PROFILE_MODEL → Manages business/reviewer profiles.**
   -  **REVIEW_MODEL → Stores scraped reviews & metadata.**
   -  **Additional models as required (e.g., logs, audit records).**

-  **Uses Winston logging for debugging & error tracking.**
### Frontend UI & Control Panel (VanillaJS)
  - **V±anilla JS** 
### Automation & Deployment (Docker + Github CI/CD + Heroku)
- **Runs inside Docker containers for portability.**
- **Uses GitLab CI/CD for automated deployments & testing.**
- **Supports environment-specific configurations (dev/prod).**


## Key Features & Functionalities
- **Multi-OTA Support – Extracts data from different review platforms.**
- **Account & Profile Management – Users can register, log in, and update details, delete own accounts, customize scraping frequency, perform profile-based CRUD on their own resources**
- **Automated Review Crawling – Fetches and updates review data on schedule.**
- **CRUD Operations on All Models – Full flexibility to manage stored data.**
- **Scalability & Anti-Bot Measures – Uses proxies, user-agents, and stealth techniques.**
- **Real-Time Status & Logs – Tracks all operations with detailed logging.**


### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

### Installation

1. **Clone the repository**:

```bash
git clone https://github.com/raybags-dev/project-x.git
cd project-x
```

2. **Install dependencies**:
```bash
npm install
```
    
3. **Create a .env file in the root directory and add your environment variables**:
```bash
MONGO_URI='mongodb+xyz://your_endpoint.net:'
ACCESS_TOKEN=test_access123456789_token # I'll give you this.
AWS_ACCESS_KEY_ID=123456789qwe
AWS_SECRET_ACCESS_KEY=123456789qwe
AWS_BUCKET_NAME='your_storage_bucket'
AWS_REGION='central-eastern-5'
EMAIL_PROVIDER='your_email_provider'
```

1. **Run the application in different modes:**:
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

## Security Overview

### Content Security Policy (Helm)

My server enforces **Content Security Policy (CSP)** using a custom middleware to mitigate security risks like cross-site scripting (XSS) and data injection attacks. This middleware is applied globally to ensure consistent security across all responses. The CSP directives are set within a middleware function and included in the response headers for every request

### Authentication and Authorization

**Project X** employs a robust authentication and authorization framework to ensure secure access to resources. Here's an overview of the key security mechanisms:

#### JWT Authentication

- **Token Generation**: I use JSON Web Tokens (JWT) for user authentication. Tokens are generated upon successful login and include user details such as email, user ID, and roles.
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

- **Subscription-Based Access**: Access to all features and data is controlled through a subscription model - a trial period can allow you to run test data collection for only agoda.com and google.com for only 10 pages worth of data (test phase). This ensures that users have access to the resources and functionalities according to their subscription level.

#### User Management and Data Integrity

- **Profile Management**: Users can create, update, and delete an account. When you delete your account, the account, along with all associated profiles and reviews are removed permanently.


### License:
- This is a passion project and not intended for profit making, so feel free to pull the source-code and use it as you see fit.

- **Contact**:
For any inquiries, please reachout to be directly at:  `baguma.github@gmail.com`.


## Docker Setup

### 1. **Prerequisites**  
Docker and Docker Compose should be installed on your system.

### 2. **Clone Repository**
  ```bash
  git clone https://github.com/raybags-dev/project-x.git
  cd reviewer-x
  ```


### 3. **Create a .env File**
  ```bash
    cp .env.example .env
  ```
Edit the .env file to match your local environment.

### 4. **Build and Run with Docker Compose**
```bash
docker compose build --no-cache
docker compose up -d
```
### 5. **Access the Application**
```bash
  API: http://localhost:3002
  You can access the UI from the same endpoint. 
  # You can access the UI from the same endpoint
```
### 7. **Stopping the Containers**
```bash
  docker compose down -v
```