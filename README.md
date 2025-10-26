# B2B Billings - Complete Business Management System

<div align="center">

![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**A comprehensive B2B billing, inventory, and business management platform**

[Features](#features) • [Tech Stack](#tech-stack) • [Installation](#installation) • [Usage](#usage) • [Documentation](#documentation)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage Guide](#usage-guide)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Security Features](#security-features)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

**B2B Billings** is a full-featured business management platform designed for B2B operations. It provides comprehensive tools for managing invoices, inventory, parties, payments, staff, tasks, and real-time business communications. Built with modern web technologies, it offers a scalable, secure, and user-friendly solution for businesses of all sizes.

### 🌟 Why Choose B2B Billings?

- **Complete Business Suite**: Manage everything from invoices to inventory in one place
- **Real-Time Collaboration**: Built-in chat system for company-to-company communication
- **GST Compliant**: Full support for GST invoicing and tax calculations
- **Multi-Company Support**: Manage multiple businesses from a single account
- **Staff Management**: Assign tasks, track performance, and manage team members
- **Bank Integration**: Multiple payment methods including UPI, Bank Transfers, Cash, and Cards
- **Advanced Analytics**: Comprehensive dashboards and reports
- **Mobile Responsive**: Works seamlessly on desktop, tablet, and mobile devices

---

## 🚀 Key Features

### 📊 Invoice Management
- **Sales Invoices** (with and without GST)
- **Purchase Invoices** (with and without GST)
- **Sales Orders & Purchase Orders**
- **Automatic Invoice Numbering**
- **PDF Generation & Email Delivery**
- **Tax Calculations** (CGST, SGST, IGST)
- **Discount Management** (percentage & fixed)
- **Multiple Payment Terms**
- **Invoice Templates**

### 👥 Party Management
- **Customer Management**
- **Vendor Management**
- **End Customer Tracking**
- **Credit & Debit Notes**
- **Payment History**
- **Outstanding Balance Tracking**
- **Party Analytics**
- **Communication History**

### 📦 Inventory Management
- **Product/Item Catalog**
- **Stock Tracking**
- **Low Stock Alerts**
- **Category Management**
- **Brand Management**
- **HSN Code Support**
- **Unit of Measurement**
- **Purchase Price & Sale Price**
- **GST Rate Configuration**

### 💰 Payment & Banking
- **Multiple Bank Accounts**
- **UPI Payment Integration**
- **Cash Management**
- **Payment In/Out**
- **Bank Transactions**
- **Account Balance Tracking**
- **Payment Method Tracking** (Cash, UPI, Bank Transfer, Card, Cheque)
- **Transaction History**
- **Bank Account Reconciliation**

### 💳 Transaction Management
- **Comprehensive Transaction Tracking**
- **Automated Cash Flow Management**
- **Multi-Currency Support**
- **Payment Reminders**
- **Transaction Categories**
- **Reference Number Tracking**
- **UPI Transaction ID Support**

### 💵 Expense & Income Tracking
- **Expense Management**
- **Indirect Income Tracking**
- **Expense Categories**
- **Income Categories**
- **Receipt Management**
- **Expense Reports**

### 👨‍💼 Staff Management
- **Employee Profiles**
- **Role-Based Access Control**
- **Document Management**
- **Performance Tracking**
- **Attendance Management**
- **Task Assignment**
- **Staff Analytics**

### ✅ Task Management
- **Task Creation & Assignment**
- **Due Date Tracking**
- **Priority Levels** (Low, Medium, High, Critical)
- **Task Types** (Sales Call, Delivery, Collection, etc.)
- **Reminders & Notifications** (Email, SMS, App, WhatsApp)
- **Task Status Tracking**
- **Recurring Tasks**
- **Task Analytics**

### 💬 Communication System
- **Real-Time Chat** (Socket.IO powered)
- **Company-to-Company Messaging**
- **Team Chat**
- **File Attachments**
- **Read Receipts**
- **Typing Indicators**
- **Message History**
- **Notification System**

### 🏢 Multi-Company Management
- **Multiple Company Profiles**
- **Company Switching**
- **Separate Data Isolation**
- **Company-specific Settings**
- **GST Configuration per Company**
- **Company Logo & Branding**

### 📈 Reports & Analytics
- **Dashboard Overview**
- **Sales Reports**
- **Purchase Reports**
- **Profit & Loss**
- **Outstanding Reports**
- **Inventory Reports**
- **Party-wise Reports**
- **Tax Reports (GST)**
- **Cash Flow Reports**
- **Staff Performance Reports**

### 🔔 Notification System
- **Real-Time Notifications**
- **In-App Notifications**
- **Email Notifications**
- **SMS Notifications**
- **Payment Reminders**
- **Low Stock Alerts**
- **Task Reminders**
- **New Message Alerts**

### 👤 User Management
- **User Registration & Login**
- **Profile Management**
- **Role-Based Permissions**
- **Admin Dashboard**
- **User Activity Tracking**
- **Session Management**
- **Password Reset**
- **Email Verification**

### 🎨 Modern UI/UX
- **Responsive Design**
- **Dark Mode Support**
- **Intuitive Navigation**
- **Toast Notifications**
- **Modal Dialogs**
- **Loading States**
- **Error Handling**
- **Form Validation**

### 📱 Advertisement Management
- **Create Advertisements**
- **Ad Analytics**
- **Impression Tracking**
- **Click-through Rates**
- **Ad Performance Reports**

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18.2.0
- **Build Tool**: Vite 6.3.5
- **Routing**: React Router DOM 6.23.1
- **State Management**: React Context API
- **UI Framework**: React Bootstrap 2.10.2
- **Styling**: Bootstrap 5.3.3 + Custom CSS
- **Icons**: Font Awesome 6.5.2
- **Charts**: Chart.js 4.5.0 + React-Chartjs-2 5.3.0
- **PDF Generation**: html2pdf.js 0.12.1
- **Printing**: React-to-Print 3.1.1
- **HTTP Client**: Axios 1.7.2
- **Date Handling**: date-fns 4.1.0
- **Real-Time Communication**: Socket.IO Client 4.8.1
- **Form Controls**: React Select 5.10.2
- **Image Processing**: React Image Crop 11.0.10
- **Notifications**: React Toastify 11.0.5

### Backend
- **Runtime**: Node.js (>=18.0.0)
- **Framework**: Express 4.18.2
- **Database**: MongoDB 7.8.7 (Mongoose ODM)
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **Password Hashing**: bcryptjs 3.0.2
- **Validation**: Express Validator 7.2.1
- **File Upload**: Multer 2.0.2
- **PDF Generation**: PDFKit 0.17.2
- **Real-Time Communication**: Socket.IO 4.8.1
- **Security**: Helmet 8.1.0
- **Rate Limiting**: Express Rate Limit 8.0.1
- **Compression**: compression 1.8.1
- **Logging**: Winston 3.17.0 + Morgan 1.10.1
- **Environment Variables**: dotenv 16.3.1
- **Data Validation**: validator 13.15.15
- **CORS**: cors 2.8.5

### Development Tools
- **Package Manager**: npm (>=8.0.0)
- **Dev Server**: Nodemon 3.0.1
- **Linting**: ESLint 9.25.0
- **Code Quality**: Prettier (via ESLint)

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │Dashboard │Invoices  │Inventory │Parties   │Reports   │  │
│  │          │          │          │          │          │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │        Services Layer (API, Auth, Socket)            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Express.js)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Middleware (Auth, Validation, CORS)        │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │Routes    │Controllers│Services  │Socket.IO │Utils     │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │               Models (Mongoose Schemas)               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ MongoDB Protocol
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      MongoDB Database                        │
│  ┌────────┬────────┬────────┬────────┬────────┬────────┐   │
│  │Users   │Companies│Invoices│Items   │Parties │Tasks  │   │
│  ├────────┼────────┼────────┼────────┼────────┼────────┤   │
│  │Banks   │Payments│Messages│Staff   │Bills   │Expenses│   │
│  └────────┴────────┴────────┴────────┴────────┴────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Installation

### Prerequisites

Ensure you have the following installed:

- **Node.js** (v18.0.0 or higher)
- **npm** (v8.0.0 or higher)
- **MongoDB** (v5.0 or higher)

### Clone the Repository

```bash
git clone https://github.com/b2bbillings/b2bbillings.git
cd b2bbillings
```

### Backend Setup

```bash
cd Backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Run database setup (if needed)
npm run setup-db

# Start development server
npm run dev

# OR start production server
npm start
```

### Frontend Setup

```bash
cd Frontend

# Install dependencies
npm install

# Create environment file (if needed)
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start development server
npm run dev

# OR build for production
npm run build
npm run preview
```

---

## ⚙️ Configuration

### Backend Environment Variables

Create a `.env` file in the `Backend` directory with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/b2bbillings

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
JWT_REFRESH_SECRET=your_refresh_token_secret_minimum_32_characters
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d
JWT_ISSUER=shop-manager-api
JWT_AUDIENCE=shop-manager-users

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# SMS Configuration (Optional)
SMS_API_KEY=your_sms_api_key
SMS_SENDER_ID=SHOPMS

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs
```

### Frontend Environment Variables

Create a `.env` file in the `Frontend` directory:

```env
# API Configuration
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000

# App Configuration
VITE_APP_NAME=B2B Billings
VITE_APP_VERSION=2.1.0

# Feature Flags
VITE_ENABLE_CHAT=true
VITE_ENABLE_NOTIFICATIONS=true
```

---

## 📖 Usage Guide

### Getting Started

1. **Create an Account**
   - Navigate to the registration page
   - Fill in your details (name, email, password, business info)
   - Verify your email (if enabled)

2. **Set Up Your Company**
   - Complete your company profile
   - Add logo and business details
   - Configure GST settings
   - Set up payment terms

3. **Add Your First Items**
   - Go to Inventory → Items
   - Click "Add Item"
   - Enter product details, pricing, and GST rate
   - Save item

4. **Add Parties (Customers/Vendors)**
   - Go to Parties → Customers or Vendors
   - Click "Add Party"
   - Fill in contact details
   - Save party

5. **Create Your First Invoice**
   - Go to Sales → Create Invoice
   - Select customer
   - Add items
   - Review totals
   - Save and print/email

### Common Workflows

#### Creating a Sales Invoice with GST

1. Navigate to **Sales → New Invoice (GST)**
2. Select customer from dropdown
3. Add invoice date and due date
4. Add line items:
   - Select product
   - Enter quantity
   - Verify rate and GST calculation
5. Add discount (if applicable)
6. Review totals (Subtotal, CGST, SGST, Total)
7. Click **Save Invoice**
8. Print or email to customer

#### Recording a Payment

1. Navigate to **Payments → Payment In** (for received) or **Payment Out** (for sent)
2. Select the party
3. Enter payment amount
4. Select payment method (Cash, UPI, Bank Transfer, etc.)
5. Add reference number (if applicable)
6. Select bank account (for non-cash payments)
7. Click **Record Payment**

#### Managing Bank Accounts

1. Navigate to **Banking → Bank Accounts**
2. Click **Add Bank Account**
3. Enter bank details:
   - Account name
   - Bank name
   - Account number
   - IFSC code
   - Opening balance
4. For UPI accounts, add UPI ID
5. Click **Save**

#### Assigning Tasks to Staff

1. Navigate to **Staff → Task Management**
2. Click **Assign New Task**
3. Select staff member
4. Choose task type
5. Enter customer/project name
6. Add description
7. Set due date and priority
8. Enable reminders (optional)
9. Click **Assign Task**

#### Using Real-Time Chat

1. Navigate to **Chat** from the main menu
2. Select a company to chat with
3. Type your message
4. Press Enter or click Send
5. View message status (Sent, Delivered, Read)
6. Receive real-time notifications for new messages

---

## 🔌 API Documentation

### Base URL

```
http://localhost:5000/api
```

### Authentication

All API requests (except registration and login) require authentication using JWT tokens.

**Header Format:**
```
Authorization: Bearer <your_jwt_token>
```

### Core Endpoints

#### Authentication
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user
- `POST /auth/refresh-token` - Refresh access token
- `GET /auth/verify-token` - Verify token validity

#### Users
- `GET /users` - Get all users (admin)
- `GET /users/:id` - Get user by ID
- `POST /users` - Create user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

#### Companies
- `GET /companies` - Get all companies
- `GET /companies/:id` - Get company by ID
- `POST /companies` - Create company
- `PUT /companies/:id` - Update company
- `DELETE /companies/:id` - Delete company

#### Items (Inventory)
- `GET /items` - Get all items
- `GET /items/:id` - Get item by ID
- `POST /items` - Create item
- `PUT /items/:id` - Update item
- `DELETE /items/:id` - Delete item
- `GET /items/low-stock` - Get low stock items

#### Parties
- `GET /parties` - Get all parties
- `GET /parties/:id` - Get party by ID
- `POST /parties` - Create party
- `PUT /parties/:id` - Update party
- `DELETE /parties/:id` - Delete party
- `GET /parties/customers` - Get customers only
- `GET /parties/vendors` - Get vendors only

#### Sales Invoices
- `GET /sales` - Get all sales invoices
- `GET /sales/:id` - Get invoice by ID
- `POST /sales` - Create sales invoice
- `PUT /sales/:id` - Update sales invoice
- `DELETE /sales/:id` - Delete sales invoice
- `GET /sales/:id/pdf` - Generate PDF
- `POST /sales/:id/email` - Email invoice

#### Purchase Invoices
- `GET /purchases` - Get all purchase invoices
- `GET /purchases/:id` - Get invoice by ID
- `POST /purchases` - Create purchase invoice
- `PUT /purchases/:id` - Update purchase invoice
- `DELETE /purchases/:id` - Delete purchase invoice

#### Payments
- `GET /payments` - Get all payments
- `GET /payments/:id` - Get payment by ID
- `POST /payments` - Record payment
- `PUT /payments/:id` - Update payment
- `DELETE /payments/:id` - Delete payment

#### Bank Accounts
- `GET /bank-accounts` - Get all bank accounts
- `GET /bank-accounts/:id` - Get account by ID
- `POST /bank-accounts` - Create account
- `PUT /bank-accounts/:id` - Update account
- `DELETE /bank-accounts/:id` - Delete account
- `GET /bank-accounts/:id/transactions` - Get account transactions
- `POST /bank-accounts/transfer` - Transfer between accounts

#### Transactions
- `GET /transactions` - Get all transactions
- `GET /transactions/:id` - Get transaction by ID
- `POST /transactions` - Create transaction
- `PUT /transactions/:id` - Update transaction
- `DELETE /transactions/:id` - Delete transaction

#### Staff
- `GET /staff` - Get all staff members
- `GET /staff/:id` - Get staff by ID
- `POST /staff` - Create staff member
- `PUT /staff/:id` - Update staff member
- `DELETE /staff/:id` - Delete staff member
- `GET /staff/statistics` - Get staff statistics

#### Tasks
- `GET /tasks` - Get all tasks
- `GET /tasks/:id` - Get task by ID
- `POST /tasks` - Create task
- `PUT /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task
- `PATCH /tasks/:id/status` - Update task status

#### Chat
- `GET /chat/conversations` - Get user conversations
- `GET /chat/:conversationId/messages` - Get messages
- `POST /chat/messages` - Send message
- `PUT /chat/messages/:id` - Update message
- `DELETE /chat/messages/:id` - Delete message
- `PATCH /chat/messages/:id/read` - Mark as read

#### Notifications
- `GET /notifications` - Get user notifications
- `GET /notifications/:id` - Get notification by ID
- `PATCH /notifications/:id/read` - Mark as read
- `PATCH /notifications/read-all` - Mark all as read
- `DELETE /notifications/:id` - Delete notification

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "errors": [ ... ]
}
```

---

## 🗄️ Database Schema

### Core Collections

#### Users
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique, indexed),
  password: String (hashed),
  phone: String,
  role: String (admin, user, manager, etc.),
  isActive: Boolean,
  emailVerified: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### Companies
```javascript
{
  _id: ObjectId,
  businessName: String,
  ownerName: String,
  email: String,
  phone: String,
  gstNumber: String,
  address: Object,
  logo: String,
  owner: ObjectId (ref: User),
  members: [Object],
  settings: Object,
  subscription: Object,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### Items
```javascript
{
  _id: ObjectId,
  companyId: ObjectId (ref: Company),
  name: String,
  code: String,
  description: String,
  category: ObjectId (ref: Category),
  brand: ObjectId (ref: Brand),
  unit: String,
  hsnCode: String,
  salePrice: Number,
  purchasePrice: Number,
  gstRate: Number,
  currentStock: Number,
  minStockLevel: Number,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### Parties
```javascript
{
  _id: ObjectId,
  companyId: ObjectId (ref: Company),
  name: String,
  company: String,
  phone: String,
  email: String,
  gstNumber: String,
  address: Object,
  partyType: String (customer, vendor, both),
  openingBalance: Number,
  currentBalance: Number,
  creditLimit: Number,
  paymentTerms: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### Sales/Purchase Invoices
```javascript
{
  _id: ObjectId,
  companyId: ObjectId (ref: Company),
  invoiceNumber: String (unique),
  invoiceDate: Date,
  dueDate: Date,
  party: ObjectId (ref: Party),
  items: [Object],
  subtotal: Number,
  totalDiscount: Number,
  taxableAmount: Number,
  totalCGST: Number,
  totalSGST: Number,
  totalIGST: Number,
  totalTax: Number,
  finalTotal: Number,
  paidAmount: Number,
  balanceAmount: Number,
  paymentStatus: String,
  notes: String,
  createdBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

#### Bank Accounts
```javascript
{
  _id: ObjectId,
  companyId: ObjectId (ref: Company),
  accountName: String,
  bankName: String,
  accountNumber: String,
  ifscCode: String,
  type: String (savings, current, upi, cash),
  upiId: String,
  currentBalance: Number,
  openingBalance: Number,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### Transactions
```javascript
{
  _id: ObjectId,
  companyId: ObjectId (ref: Company),
  bankAccountId: ObjectId (ref: BankAccount),
  transactionType: String,
  direction: String (in, out),
  amount: Number,
  paymentMethod: String,
  description: String,
  referenceNumber: String,
  partyId: ObjectId (ref: Party),
  transactionDate: Date,
  createdBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

#### Staff
```javascript
{
  _id: ObjectId,
  companyId: ObjectId (ref: Company),
  employeeId: String,
  name: String,
  email: String,
  phone: String,
  role: String,
  department: String,
  joiningDate: Date,
  salary: Number,
  isActive: Boolean,
  documents: [Object],
  performance: Object,
  assignedTasks: [Object],
  createdAt: Date,
  updatedAt: Date
}
```

#### Tasks
```javascript
{
  _id: ObjectId,
  companyId: ObjectId (ref: Company),
  taskId: String,
  assignedTo: ObjectId (ref: Staff),
  assignedBy: ObjectId (ref: Staff),
  taskType: String,
  title: String,
  description: String,
  customer: Object,
  dueDate: Date,
  priority: String,
  status: String,
  reminder: Object,
  tags: [String],
  createdAt: Date,
  updatedAt: Date
}
```

#### Messages (Chat)
```javascript
{
  _id: ObjectId,
  senderCompanyId: ObjectId (ref: Company),
  receiverCompanyId: ObjectId (ref: Company),
  senderId: ObjectId (ref: User),
  content: Object,
  messageType: String,
  platform: String,
  status: String (sent, delivered, read),
  readAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔒 Security Features

### Authentication & Authorization
- **JWT-based Authentication** with access and refresh tokens
- **Password Hashing** using bcrypt
- **Role-Based Access Control** (RBAC)
- **Session Management** with token expiration
- **Secure Cookie Storage** (HTTP-only, secure flags)

### API Security
- **Rate Limiting** (configurable per route)
- **CORS Protection** with whitelist
- **Helmet.js** for security headers
- **Input Validation** using express-validator
- **SQL Injection Prevention** (Mongoose parameterized queries)
- **XSS Protection** with sanitization
- **CSRF Protection**

### Data Security
- **Encrypted Passwords** (bcrypt with salt rounds)
- **Environment Variables** for sensitive data
- **Data Validation** at multiple levels
- **Audit Logging** for critical operations
- **Soft Delete** for data recovery

### Network Security
- **HTTPS Support** (production)
- **Secure WebSocket** connections (WSS)
- **IP Whitelisting** (optional)
- **Request Size Limiting**

---

## 🚀 Deployment

### Production Build

#### Frontend

```bash
cd Frontend
npm run build
```

The build output will be in the `dist` directory.

#### Backend

```bash
cd Backend
npm install --production
```

### Deployment Options

#### Option 1: Traditional Server (VPS/Dedicated)

1. **Set up server** (Ubuntu/CentOS recommended)
2. **Install Node.js and MongoDB**
3. **Clone repository**
4. **Configure environment variables**
5. **Build frontend**
6. **Set up process manager** (PM2 recommended):

```bash
# Install PM2
npm install -g pm2

# Start backend
cd Backend
pm2 start server.js --name b2b-backend

# Serve frontend with Nginx
```

6. **Configure Nginx** as reverse proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        root /path/to/Frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

#### Option 2: Cloud Platform (Render/Heroku/AWS)

**Backend (Render/Heroku):**
1. Connect your repository
2. Set environment variables
3. Configure build command: `npm install`
4. Configure start command: `npm start`
5. Deploy

**Frontend (Vercel/Netlify):**
1. Connect your repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables
5. Deploy

#### Option 3: Docker

```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

```dockerfile
# Frontend Dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Docker Compose:**

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    container_name: b2b-mongo
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password

  backend:
    build: ./Backend
    container_name: b2b-backend
    ports:
      - "5000:5000"
    environment:
      MONGODB_URI: mongodb://admin:password@mongodb:27017/b2bbillings?authSource=admin
      JWT_SECRET: your_secret_here
    depends_on:
      - mongodb

  frontend:
    build: ./Frontend
    container_name: b2b-frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mongo-data:
```

Run with:
```bash
docker-compose up -d
```

---

## 📚 Additional Documentation

### Project Structure

```
b2bbillings/
├── Backend/
│   ├── server.js                 # Main server file
│   ├── package.json              # Backend dependencies
│   ├── logs/                     # Application logs
│   ├── uploads/                  # Uploaded files
│   └── src/
│       ├── config/              # Configuration files
│       │   ├── jwt.js
│       │   └── logger.js
│       ├── controllers/         # Route controllers
│       │   ├── authController.js
│       │   ├── invoiceController.js
│       │   └── ...
│       ├── middleware/          # Custom middleware
│       │   ├── authMiddleware.js
│       │   └── validation.js
│       ├── models/              # Mongoose models
│       │   ├── User.js
│       │   ├── Company.js
│       │   └── ...
│       ├── routes/              # API routes
│       │   ├── authRoutes.js
│       │   └── ...
│       ├── services/            # Business logic
│       │   └── notificationService.js
│       ├── socket/              # Socket.IO handlers
│       │   ├── SocketManager.js
│       │   └── MessageHandler.js
│       └── utils/               # Utility functions
│
└── Frontend/
    ├── index.html               # HTML entry point
    ├── package.json             # Frontend dependencies
    ├── vite.config.js           # Vite configuration
    ├── public/                  # Static assets
    └── src/
        ├── App.jsx              # Main App component
        ├── main.jsx             # React entry point
        ├── App.css              # Global styles
        ├── assets/              # Images, fonts, etc.
        ├── components/          # React components
        │   ├── Admin/
        │   ├── Auth/
        │   ├── Chat/
        │   ├── Home/
        │   └── New_Dashboard/
        ├── context/             # React Context providers
        ├── hooks/               # Custom React hooks
        ├── Layout/              # Layout components
        ├── Pages/               # Page components
        ├── services/            # API service layer
        │   ├── api.js
        │   ├── authService.js
        │   └── ...
        ├── styles/              # Additional styles
        └── utils/               # Utility functions
```

### Environment Setup for Development

1. **MongoDB Setup:**
   ```bash
   # Install MongoDB
   # Ubuntu
   sudo apt-get install mongodb
   
   # macOS
   brew install mongodb-community
   
   # Windows
   # Download installer from mongodb.com
   
   # Start MongoDB
   sudo systemctl start mongod   # Linux
   brew services start mongodb-community   # macOS
   ```

2. **Node.js Setup:**
   ```bash
   # Using nvm (recommended)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   ```

3. **Development Workflow:**
   ```bash
   # Terminal 1 - Backend
   cd Backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd Frontend
   npm run dev
   
   # Terminal 3 - MongoDB (if not running as service)
   mongod
   ```

### Common Issues & Troubleshooting

**Issue: MongoDB Connection Error**
```
Solution: 
1. Ensure MongoDB is running: sudo systemctl status mongod
2. Check MONGODB_URI in .env file
3. Verify MongoDB authentication credentials
```

**Issue: Port Already in Use**
```
Solution:
# Find process using port
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Kill the process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

**Issue: CORS Errors**
```
Solution:
1. Check FRONTEND_URL in backend .env
2. Verify CORS configuration in server.js
3. Ensure frontend is running on expected port
```

**Issue: JWT Token Expired**
```
Solution:
1. Clear browser localStorage/sessionStorage
2. Log in again
3. Check JWT_EXPIRE value in .env
```

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Ways to Contribute

1. **Report Bugs**: Open an issue describing the bug
2. **Suggest Features**: Submit feature requests
3. **Submit Pull Requests**: Fix bugs or add features
4. **Improve Documentation**: Help us improve docs
5. **Write Tests**: Add test coverage

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Code Style Guidelines

- Use ESLint configuration provided
- Follow existing code patterns
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation as needed

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors & Contributors

- **Development Team** - *Initial work and ongoing development*
- **Community Contributors** - *Bug fixes, features, and improvements*

---

## 📞 Support

### Get Help

- **Documentation**: Check this README and inline code comments
- **Issues**: [GitHub Issues](https://github.com/b2bbillings/b2bbillings/issues)
- **Discussions**: [GitHub Discussions](https://github.com/b2bbillings/b2bbillings/discussions)

### Contact

- **Email**: support@b2bbillings.com
- **Website**: https://b2bbilling.com

---

## 🙏 Acknowledgments

- React Team for the amazing framework
- Express.js community
- MongoDB team
- Socket.IO developers
- All open-source contributors

---

## 📊 Project Status

- **Version**: 2.1.0
- **Status**: Active Development
- **Last Updated**: October 2025

---

## 🗺️ Roadmap

### Upcoming Features

- [ ] Mobile App (React Native)
- [ ] Advanced Reporting with AI insights
- [ ] Multi-language Support
- [ ] Barcode Scanner Integration
- [ ] E-commerce Integration
- [ ] Accounting Module
- [ ] HR & Payroll Management
- [ ] Project Management
- [ ] CRM Module
- [ ] API Marketplace

---

## ⚡ Performance Optimization

### Backend
- MongoDB indexing on frequently queried fields
- Redis caching for session management (planned)
- Connection pooling for database
- Compression middleware for API responses
- Lazy loading for large datasets

### Frontend
- Code splitting with React.lazy
- Image optimization
- Caching strategies
- Memoization with React.memo
- Virtual scrolling for large lists

---

## 🧪 Testing

### Backend Testing
```bash
cd Backend
npm test
```

### Frontend Testing
```bash
cd Frontend
npm test
```

### E2E Testing
```bash
npm run test:e2e
```

---

## 📈 Monitoring & Logging

### Application Logs
- **Location**: `Backend/logs/`
- **Format**: JSON with timestamps
- **Levels**: error, warn, info, debug
- **Rotation**: Daily with compression

### Performance Monitoring
- Request/response times
- Database query performance
- Error rates
- User activity tracking

---

## 🔧 Development Tools

### Recommended VS Code Extensions
- ESLint
- Prettier
- MongoDB for VS Code
- REST Client
- GitLens
- Thunder Client (API testing)

### Useful Commands

```bash
# Backend
npm run dev         # Start dev server with nodemon
npm run validate-env  # Validate environment variables
npm run test-db     # Test MongoDB connection

# Frontend
npm run dev         # Start Vite dev server
npm run build       # Production build
npm run preview     # Preview production build
npm run lint        # Run ESLint
```

---

<div align="center">

**Made with ❤️ by the B2B Billings Team**

⭐ Star us on GitHub — it helps!

[Back to Top](#b2b-billings---complete-business-management-system)

</div>
