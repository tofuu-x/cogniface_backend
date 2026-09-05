import { PasswordTokenUserType, PasswordTokenPurpose } from "../../generated/prisma/enums.js";

import prisma from "../../db/prisma.client.js";
import env from "../../config/env.js";
import {generatePasswordToken, hashToken} from "../../utils/crypto.js";

import { AppError } from "../../utils/appError.js";
import { sendPasswordResetEmail, sendWelcomeEmail } from "../../services/email.service.js";

interface IssuePasswordTokenInput {
  userId : string;
  userType: PasswordTokenUserType;
  purpose: PasswordTokenPurpose;
  requestedByAdminId? : string;
}

export const IssuePasswordToken = async({
  userId,
  userType,
  purpose,
  requestedByAdminId
}: IssuePasswordTokenInput) : Promise<string> => {
  const {rawToken, tokenHash} = generatePasswordToken();

  const ttlMinutes = purpose === "WELCOME_SETUP" ? env.welcomeTokenTtlMinutes : env.passwordResetTokenTtlMinutes;

  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  //Invalidate previous unused tokens

  await prisma.passwordToken.updateMany({
    where: {
      userId,
      userType,
      usedAt: null,
    },
    data : {
      usedAt : new Date(),
    }
  });

  await prisma.passwordToken.create({
    data: {
      tokenHash,
      userId,
      userType,
      purpose,
      expiresAt,
      requestedByAdminId,
    },
  });

  return rawToken;
};


export const validatePasswordToken = async(
  rawToken: string
) => {
  const tokenHash = hashToken(rawToken);

  //check if token is there
  const passwordToken = await prisma.passwordToken.findUnique({
    where: {
      tokenHash
    },
  });

  if (
      !passwordToken || 
      passwordToken.usedAt || 
      passwordToken.expiresAt <= new Date()
    ){
    throw new AppError("Invalid or expired password link", 400);
    }
  
  return passwordToken;
};

const findUserByEmail = async (email: string) => {
  const admin = await prisma.admin.findUnique({
    where: { email },
  });

  if (admin) {
    return {
      user: admin,
      userType: "ADMIN" as const,
    };
  }

  const lecturer = await prisma.lecturer.findUnique({
    where: { email },
  });

  if (lecturer) {
    return {
      user: lecturer,
      userType: "LECTURER" as const,
    };
  }

  const student = await prisma.student.findUnique({
    where: { email },
  });

  if (student) {
    return {
      user: student,
      userType: "STUDENT" as const,
    };
  }

  return null;
};

//By admin
const sendPasswordAccessEmail = async ({
  user,
  userType,
  requestedByAdminId
}: {
  user: {
    id : string;
    email : string;
    firstName : string;
    accountStatus : string;
  };
  userType : PasswordTokenUserType;
  requestedByAdminId? : string;
}) : Promise<void> => {

  if (user.accountStatus == "INACTIVE"){
    throw new AppError("This account is inactive",409);
  }

  const purpose: PasswordTokenPurpose =user.accountStatus == "PENDING_ACTIVATION" ? "WELCOME_SETUP" : "PASSWORD_RESET";

  const rawToken = await IssuePasswordToken({
    userId: user.id,
    userType,
    purpose,
    requestedByAdminId
  });

  if (purpose == "WELCOME_SETUP") {
    await sendWelcomeEmail(
      user.email,
      user.firstName,
      rawToken
    );

    return;
  }

  await sendPasswordResetEmail(
    user.email,
    user.firstName,
    rawToken
  )
}


export const forgotPasswordService = async (
  email: string,
): Promise <void> => {
  const result = await findUserByEmail(email);

  if (!result){
    return;
  }

  const {user,userType} = result;

  //If Inactive
  if (user.accountStatus === "INACTIVE"){
    return;
  }

  await sendPasswordAccessEmail(
    {user, userType});
}