import type { JwtPayload } from "jsonwebtoken";

export interface AuthenticatedUser extends JwtPayload {
  userId: string;
  role: "SUPER_ADMIN" | "ADMIN" | "LECTURER" | "STUDENT";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
