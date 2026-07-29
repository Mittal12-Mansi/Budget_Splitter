import jwt from "jsonwebtoken";

const SECRET = process.env["JWT_SECRET"] ?? "budget-splitter-secret-key-2024";
const EXPIRES_IN = "7d";

export interface JwtPayload {
  userId: number;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, SECRET) as JwtPayload & jwt.JwtPayload;
  return { userId: decoded.userId, email: decoded.email };
}
