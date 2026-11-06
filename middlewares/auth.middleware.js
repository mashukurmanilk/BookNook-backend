import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access: Bearer token is required",
    });
  }

  const token = authHeader.split(" ")[1];
  const secret = process.env.JWT_SECRET || process.env.BETTER_AUTH_SECRET;

  if (!secret) {
    console.error("JWT_SECRET or BETTER_AUTH_SECRET is not configured");
    return res.status(500).json({
      success: false,
      message: "Server configuration error: Authentication secret is missing",
    });
  }

  try {
    const decoded = jwt.verify(token, secret);

    req.user = {
      id: decoded.id || decoded.sub || decoded._id,
      email: decoded.email,
      name: decoded.name || decoded.userName || decoded.email,
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
