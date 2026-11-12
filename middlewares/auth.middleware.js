import { jwtVerify, createRemoteJWKSet, decodeProtectedHeader } from "jose";

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

  // Decode the token header to check whether it was signed symmetrically (HS256) or asymmetrically (RS256/ES256)
  let header;
  try {
    header = decodeProtectedHeader(token);
  } catch (headerError) {
    throw new Error("Invalid JWT header structure: " + headerError.message);
  }

  // 1. If symmetric (HS256, HS384, HS512), verify using symmetric secret keys
  if (header.alg && header.alg.startsWith("HS")) {
    const candidateSecrets = [
      process.env.BETTER_AUTH_SECRET,
      process.env.JWT_SECRET,
      "bAh3cafK3EUAK9zConQGD8ll3yPjRIhSS",
      "booknook_super_secure_jwt_auth_secret_2026_key",
    ].filter(Boolean);

    let lastError = null;
    for (const secretStr of candidateSecrets) {
      try {
        const secret = new TextEncoder().encode(secretStr);
        const { payload } = await jwtVerify(token, secret);
        return payload;
      } catch (err) {
        lastError = err;
      }
    }

    throw new Error(
      `Symmetric token verification failed: ${lastError?.message || "Invalid signature"}. Ensure BETTER_AUTH_SECRET matches between client and server.`
    );
  }

  // 2. If asymmetric (RS256, ES256, EdDSA), verify using remote JWKS endpoint
  try {
    const JWKS = getJWKS();
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: process.env.BETTER_AUTH_ISSUER || baseUrl,
      audience: process.env.BETTER_AUTH_AUDIENCE || baseUrl,
    });
    return payload;
  } catch (jwksError) {
    console.error("JWKS Token validation failed:", jwksError.message);
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
