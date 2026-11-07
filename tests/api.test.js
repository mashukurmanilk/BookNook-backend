import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import app from "../app.js";
import { connectToMongoDB } from "../config/db.js";
import Book from "../models/Book.model.js";
import Borrow from "../models/Borrow.model.js";

// Test users
const userA = {
  id: "user_a_123",
  email: "alice@example.com",
  name: "Alice Developer",
};

const userB = {
  id: "user_b_456",
  email: "bob@example.com",
  name: "Bob Reader",
};

let keyPair;
let publicJwk;
let tokenA;
let tokenB;
let server;
let baseUrl;

// Helper to make HTTP requests to the test server
async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const fetchOptions = {
    method: options.method || "GET",
    headers,
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

describe("BookNook Backend API Integration Tests with JWKS", () => {
  before(async () => {
    // 1. Generate an RSA keypair to mock Better Auth JWKS server
    keyPair = await generateKeyPair("RS256");
    const jwk = await exportJWK(keyPair.publicKey);
    publicJwk = {
      ...jwk,
      kid: "test-key-1",
      alg: "RS256",
      use: "sig",
    };

    // 2. Mount Better Auth JWKS endpoint for testing
    app.get("/api/auth/jwks", (req, res) => {
      res.json({ keys: [publicJwk] });
    });

    await connectToMongoDB();

    // Start HTTP server on dynamic port
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    process.env.BETTER_AUTH_URL = baseUrl;

    // Sign tokens matching Better Auth format
    tokenA = await new SignJWT(userA)
      .setProtectedHeader({ alg: "RS256", kid: "test-key-1" })
      .setIssuer(baseUrl)
      .setAudience(baseUrl)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(keyPair.privateKey);

    tokenB = await new SignJWT(userB)
      .setProtectedHeader({ alg: "RS256", kid: "test-key-1" })
      .setIssuer(baseUrl)
      .setAudience(baseUrl)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(keyPair.privateKey);
  });

  after(async () => {
    // Cleanup any test books created by alice or bob
    await Book.deleteMany({ userEmail: { $in: [userA.email, userB.email] } });
    await Borrow.deleteMany({ userEmail: { $in: [userA.email, userB.email] } });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test("1. GET / - Health Check", async () => {
    const res = await request("/");
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.message, "BookNook API is running smoothly");
  });

  test("2. GET /books - Public list of books", async () => {
    const res = await request("/books");
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.ok(Array.isArray(res.data.data));
  });

  test("3. POST /books - Unauthorized if no token provided", async () => {
    const res = await request("/books", {
      method: "POST",
      body: { title: "Test Book" },
    });
    assert.equal(res.status, 401);
    assert.equal(res.data.success, false);
  });

  let createdBookId;

  test("4. POST /books - Create book with valid JWKS-verified token", async () => {
    const newBook = {
      title: "Clean Architecture with JWKS",
      author: "Robert Martin",
      category: "Science",
      image: "https://i.ibb.co/example.jpg",
      description: "A comprehensive guide to software architecture.",
      totalCopies: 3,
    };

    const res = await request("/books", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: newBook,
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.success, true);
    assert.equal(res.data.data.title, newBook.title);
    assert.equal(res.data.data.totalCopies, 3);
    assert.equal(res.data.data.availableCopies, 3);
    assert.equal(res.data.data.userEmail, userA.email);

    createdBookId = res.data.data._id;
  });

  test("5. GET /books/:id - Fetch single book details", async () => {
    const res = await request(`/books/${createdBookId}`);
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.data._id, createdBookId);
  });

  test("6. PATCH /books/:id - Forbidden if not owner", async () => {
    const res = await request(`/books/${createdBookId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenB}` },
      body: { title: "Hacked Title" },
    });

    assert.equal(res.status, 403);
    assert.equal(res.data.success, false);
  });

  test("7. PATCH /books/:id - Owner can update book", async () => {
    const res = await request(`/books/${createdBookId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { title: "Clean Architecture (Updated with JWKS)" },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.data.title, "Clean Architecture (Updated with JWKS)");
  });

  let createdBorrowId;

  test("8. POST /borrows - User B borrows the book", async () => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const res = await request("/borrows", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenB}` },
      body: {
        bookId: createdBookId,
        returnDate: dueDate.toISOString(),
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.success, true);
    assert.equal(res.data.data.bookTitle, "Clean Architecture (Updated with JWKS)");

    createdBorrowId = res.data.data._id;

    // Verify copies decremented to 2
    const bookCheck = await request(`/books/${createdBookId}`);
    assert.equal(bookCheck.data.data.availableCopies, 2);
  });

  test("9. POST /borrows - Prevent double borrow for same user and book", async () => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const res = await request("/borrows", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenB}` },
      body: {
        bookId: createdBookId,
        returnDate: dueDate.toISOString(),
      },
    });

    assert.equal(res.status, 400);
    assert.equal(res.data.success, false);
    assert.equal(res.data.message, "You have already borrowed this book.");
  });

  test("10. GET /borrows - Retrieve user's borrowed books list", async () => {
    const res = await request("/borrows", {
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.count >= 1);
  });

  test("11. DELETE /books/:id - Block deletion while active borrow exists", async () => {
    const res = await request(`/books/${createdBookId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    assert.equal(res.status, 400);
    assert.equal(res.data.success, false);
    assert.match(res.data.message, /Cannot delete book while there are active borrow records/);
  });

  test("12. DELETE /borrows/:id - Return the book", async () => {
    const res = await request(`/borrows/${createdBorrowId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.message, "Book returned successfully.");

    // Verify copies incremented back to 3
    const bookCheck = await request(`/books/${createdBookId}`);
    assert.equal(bookCheck.data.data.availableCopies, 3);
  });

  test("13. DELETE /books/:id - Owner can delete book when no active borrows", async () => {
    const res = await request(`/books/${createdBookId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.message, "Book deleted successfully.");

    // Check 404 after delete
    const checkDeleted = await request(`/books/${createdBookId}`);
    assert.equal(checkDeleted.status, 404);
  });

  test("14. GET /unknown-endpoint - Centralized 404 Handler", async () => {
    const res = await request("/unknown-endpoint");
    assert.equal(res.status, 404);
    assert.equal(res.data.success, false);
  });
});
