import crypto from "node:crypto";


export const generateTemporaryPassword = (): string => {
  return crypto.randomBytes(12).toString("base64url");
};


//For ID GENERATION
export const generateRandomNumber = (min: number, max: number): number => {
  return crypto.randomInt(min, max);
};


//FOR PASSWORD TOKEN
const generatePasswordToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  return {
    rawToken,
    tokenHash
  }
}

