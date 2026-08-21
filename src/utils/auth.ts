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
  return bcrypt.hash(password,env.salt_rounds);
};

//Generate JWT token
export const generateJWT = (
  userId: string,
  role: string
) : string => {
  return jwt.sign(
    {userId, role},
    env.jwt_secret,
    {expiresIn: "1d"}
  );
};

