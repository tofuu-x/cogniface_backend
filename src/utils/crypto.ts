import crypto from "node:crypto";


export const generateTemporaryPassword = (): string => {
  return crypto.randomBytes(12).toString("base64url");
};


//For ID GENERATION
export const generateRandomNumber = (min: number, max: number): number => {
  return crypto.randomInt(min, max);
};

//Hash Token
export const hashToken = (
  token : string
) : string => {
   return crypto.createHash("sha256").update(token).digest("hex");
}


//FOR PASSWORD TOKEN
export const generatePasswordToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");

  const tokenHash = hashToken(rawToken); 

  return {
    rawToken,
    tokenHash
  }
}

