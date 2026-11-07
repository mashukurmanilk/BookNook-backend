# BookNook Backend API

A RESTful backend service for **BookNook** library management system, built with **Express.js**, **MongoDB & Mongoose**, and **JWT authentication** designed to integrate with Next.js (Better Auth).

---

## 🚀 Features

- **Book Management (CRUD)**: Add, browse, search, filter, update, and delete books.
- **Stock Tracking**: Atomic decrement on borrow and increment on return.
- **Borrowing Rules**: Prevents double-borrowing of the same book by the same user.
- **Integrity Protection**: Prevents deletion of books with active borrow records.
- **Role & Ownership Enforcement**: Only book creators can edit or delete their books.
- **JWT Authentication**: Protects private routes via `Bearer <token>` (`verifyToken` middleware).
- **DNS Fallback**: Reliable MongoDB Atlas SRV query resolution on Windows networks.
- **Automated Test Suite**: Built-in integration tests covering all routes and edge cases.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js (ES Modules, v20+)
- **Framework**: Express.js 5
- **Database**: MongoDB Atlas with Mongoose 9
- **Authentication**: Better Auth with JWKS verification via `jose`
- **Testing**: Node.js native test runner (`node:test`, `node:assert`)

---

## 📋 Environment Variables

Create a `.env` file in the project root:

```env
PORT=8000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/BookNook?retryWrites=true&w=majority
CLIENT_URL=http://localhost:3000
BETTER_AUTH_URL=http://localhost:3000
```

---

## 🏁 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
The server will start on `http://localhost:8000`.

### 3. Run Automated Tests
```bash
npm test
```

---

## 📡 API Endpoints

### Base URL: `http://localhost:8000`

### 1. Public & Utility Routes
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | API Health check & status |

### 2. Books (`/books`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/books` | No | Fetch all books. Query params: `limit`, `sort` (`newest`, `oldest`), `category`, `userEmail`, `search` |
| `GET` | `/books/:id` | No | Get single book details by ID |
| `POST` | `/books` | **Yes (Bearer JWT)** | Add a new book (auto assigns user & initializes stock) |
| `PATCH` | `/books/:id` | **Yes (Bearer JWT)** | Update book details (creator only) |
| `DELETE`| `/books/:id` | **Yes (Bearer JWT)** | Delete book (creator only, blocked if active borrows exist) |

### 3. Borrows (`/borrows`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/borrows` | **Yes (Bearer JWT)** | Borrow a book (atomic stock decrement, checks double-borrow) |
| `GET` | `/borrows` | **Yes (Bearer JWT)** | Get logged-in user's active borrowed books |
| `DELETE`| `/borrows/:id` | **Yes (Bearer JWT)** | Return a book (atomic stock increment & removes borrow record) |

---

## 🔒 Authentication Flow (Better Auth + JWKS)

1. Client signs in with Better Auth on the Next.js frontend (`http://localhost:3000`).
2. Requests sent to protected Express endpoints pass the bearer token:
   ```http
   Authorization: Bearer <better_auth_jwt_token>
   ```
3. Express's `verifyToken` middleware fetches the public JWKS from `BETTER_AUTH_URL/api/auth/jwks` using `jose.createRemoteJWKSet` and verifies the token's signature, issuer, and audience.
4. The decoded payload (`id`, `email`, `name`) is attached to `req.user`.
