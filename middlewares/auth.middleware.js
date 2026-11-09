import { jwtVerify, createRemoteJWKSet } from "jose";

const getAuthBaseUrl = () => {
  return (process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
};

// Cache the remote JWK Set client
let jwksClient;
let cachedBaseUrl;

const getJWKS = () => {
  const baseUrl = getAuthBaseUrl();
  if (!jwksClient || cachedBaseUrl !== baseUrl) {
    cachedBaseUrl = baseUrl;
    jwksClient = createRemoteJWKSet(new URL(`${baseUrl}/api/auth/jwks`));
  }
  return jwksClient;
};

export async function validateToken(token) {
  const baseUrl = getAuthBaseUrl();
  const secretKey = process.env.BETTER_AUTH_SECRET || process.env.JWT_SECRET;

  // 1. First attempt verification with remote JWKS
  try {
    const JWKS = getJWKS();
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: process.env.BETTER_AUTH_ISSUER || baseUrl,
      audience: process.env.BETTER_AUTH_AUDIENCE || baseUrl,
    });
    return payload;
  } catch (jwksError) {
    // 2. If JWKS failed, try symmetric secret if available
    if (secretKey) {
      try {
        const secret = new TextEncoder().encode(secretKey);
        const { payload } = await jwtVerify(token, secret);
        return payload;
      } catch (secretError) {
        // Fall back to original error
      }
    }
    console.error("Token validation failed:", jwksError.message);
    throw jwksError;
  }
}

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access: Bearer token is required",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = await validateToken(token);

    req.user = {
      id: payload.id || payload.sub || payload._id,
      email: payload.email,
      name: payload.name || payload.userName || payload.email,
    };

    if (!req.user.email) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access: Token payload does not contain an email",
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access: Invalid or expired token",
      error: error.message,
    });
  }
};

export default verifyToken;
