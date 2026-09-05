import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import env from "../config/env.js";

//Compare Passwords
export const comparePassword = async (
  plainPassword : string,
  hashedPassword: string
) : Promise<boolean> => {
  return await bcrypt.compare(plainPassword,hashedPassword);
};

//Hash Passowrd
export const hashPassword = async(
  password: string
): Promise<string> => {
  return await bcrypt.hash(password, env.salt_rounds);
};

//Generate JWT token
export const generateJWT = (
  userId: string,
  role: "SUPER_ADMIN" | "ADMIN" | "LECTURER" | "STUDENT",
  authVersion: number,
  publicIdentity?: {
    studentId?: string;
    lecturerId?: string;
  }
) : string => {
  return jwt.sign(
    {
      userId,
      role,
      authVersion,

      ...(publicIdentity?.studentId && {
        studentId: publicIdentity.studentId,
      }),
      ...(publicIdentity?.lecturerId && {
        lecturerId: publicIdentity.lecturerId,
      }),
    },
    env.jwt_secret,
    {expiresIn: "1d"}
  );
};
