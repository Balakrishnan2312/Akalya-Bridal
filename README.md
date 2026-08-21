# Akalya's Bridal Studio — Full Stack Web Application

A production-ready luxury bridal studio and beauty parlour web application built with **Node.js, Express, MongoDB (Mongoose), JWT Authentication**, and a high-aesthetic responsive vanilla JavaScript frontend.

---

## ✨ Features

- **Luxury Studio Frontend**: Responsive landing page (`index.html`) featuring service showcases, high-definition gallery grid, customer testimonials, smooth scrolling (Lenis + GSAP + AOS), and interactive booking modal.
- **Backend Appointment Workflow**: Public booking system accepting appointment requests with validation for 10-digit Indian mobile numbers and future/today event dates.
- **Admin Dashboard**: Secure management interface (`dashboard.html`) for viewing, filtering, searching, updating, and deleting appointment requests.
- **Store & Booking Schedule Manager**: Configurable store operating hours and manual/automatic open & close schedule toggles.
- **MongoDB Gallery & Store Persistence**: Full database persistence for studio photos and store configuration with automatic seeders.
- **Secure File Uploads**: Protected image upload API using Multer with strict MIME type checking and 5 MB size limits.
- **JWT Authentication & bcrypt Password Hashing**: Environment-seeded administrator authentication with session expiration handling.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js (CommonJS)
- **Database**: MongoDB with Mongoose (MongoDB Atlas Compatible)
- **Auth & Security**: JWT (jsonwebtoken), bcryptjs, CORS, Dotenv
- **File Uploads**: Multer
- **Frontend**: HTML5, Vanilla JavaScript (ES6+), CSS3 (Tailwind Play CDN + Custom Glassmorphism & Gold Tokens)

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster URI or a local MongoDB instance running on `mongodb://127.0.0.1:27017`

### 2. Installation
Clone or navigate to the project directory and install dependencies:

```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory (refer to `.env.example`):

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/akalya_bridal?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=12h
ADMIN_NAME=Akalya Admin
ADMIN_EMAIL=admin@akalyasbridal.com
ADMIN_PASSWORD=YourStrongAdminPassword123!
CLIENT_URL=http://localhost:5000
```

> **Note**: Admin login credentials are strictly configured via environment variables (`ADMIN_EMAIL` and `ADMIN_PASSWORD`) and dynamically seeded on initial server launch. Never hardcode credentials in source code.

### 4. Running the Application
Start the Node.js Express server:

```bash
npm start
```

Open your browser and visit:
- **Client Web Application**: [http://localhost:5000](http://localhost:5000)
- **Admin Login Portal**: [http://localhost:5000/admin.html](http://localhost:5000/admin.html)
- **Admin Dashboard**: [http://localhost:5000/dashboard.html](http://localhost:5000/dashboard.html)

---

## 🍃 MongoDB Atlas Setup

1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Database Access**, create a database user with read/write permissions.
3. Under **Network Access**, add IP `0.0.0.0/0` (or your server's IP address).
4. Copy the connection string and paste it as `MONGODB_URI` in `.env`.

---

## 📡 API Endpoints Summary

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticate admin credentials and return JWT token |

### Bookings (`/api/bookings`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/bookings` | Public | Submit new appointment request |
| `GET` | `/api/bookings` | Admin | Get paginated bookings (`status`, `search`, `page`, `limit`) |
| `GET` | `/api/bookings/stats/summary` | Admin | Get booking counts (total, pending, confirmed, upcoming, etc.) |
| `GET` | `/api/bookings/:id` | Admin | Get single booking details |
| `PATCH` | `/api/bookings/:id` | Admin | Update status (`pending`, `confirmed`, `completed`, `cancelled`) or notes |
| `DELETE` | `/api/bookings/:id` | Admin | Delete booking request |

### Gallery (`/api/gallery`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/gallery` | Public | Fetch all studio gallery photos (alias `/images`) |
| `POST` | `/api/gallery` | Admin | Upload new photo with caption & category (alias `/upload`) |
| `PUT` | `/api/gallery/:id` | Admin | Edit photo category or title (alias `/image/:id`) |
| `DELETE` | `/api/gallery/:id` | Admin | Delete photo and remove uploaded file (alias `/image/:id`) |

### Store Settings (`/api/store`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/store/status` | Public | Get effective store & booking status (alias `/status`) |
| `POST` | `/api/store/toggle-store` | Admin | Toggle store open/closed state (alias `/toggle-store`) |
| `POST` | `/api/store/toggle-booking` | Admin | Toggle online booking availability (alias `/toggle-booking`) |
| `POST` | `/api/store/settings` | Admin | Save schedule hours and operating days (alias `/api/store-settings`) |

---

## 🌐 Cloud Deployment (Render / Railway)

### Deploying to Render
1. Push your repository to GitHub.
2. Create a new **Web Service** on Render connected to your repository.
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `npm start`
5. Under **Environment Variables**, set:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN`
   - `ADMIN_NAME`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `PORT=5000`

## ❓ Troubleshooting & Direct File Access

If you see **"Server not running / Status Offline"** or API errors:

1. **Start the Express Server**:
   ```powershell
   npm start
   ```
2. **Access via Server URL**:
   Open `http://localhost:5000/admin.html` in your web browser.

> ⚠️ **Note**: Double-clicking `admin.html` (opening via `file:///.../admin.html`) opens the file directly in your browser without launching the backend. Double-clicking `admin.html` is not the correct way to run backend features like login authentication, file uploads, and store management. Always start the Express server using `npm start` and navigate to `http://localhost:5000/admin.html`.

---

## 📄 License
All rights reserved © Akalya's Bridal Studio.
