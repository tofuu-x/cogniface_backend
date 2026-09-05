import type { ChangePasswordRequest, LoginRequest, LoginResponse } from "./auth.types.js"
import prisma from "../../db/prisma.client.js";
import { AppError } from "../../utils/appError.js";
import { AccountStatus } from "../../generated/prisma/enums.js";
import { comparePassword, generateJWT, hashPassword } from "../../utils/auth.js";
import type { AuthenticatedUser } from "../../types/express.js";

export const loginUser = async (data : LoginRequest) : Promise<LoginResponse> => {

  let user : any;

  //Check if the user exists and their status == Active
  if (data.role == "ADMIN" || data.role == "SUPER_ADMIN"){
    user = await prisma.admin.findUnique({where : {email : data.email}});
  } else if (data.role == "STUDENT"){
    user = await prisma.student.findUnique({where : {email : data.email}});
  } else {
    user = await prisma.lecturer.findUnique({where : {email : data.email}})
  }

  
  if (!user){
    throw new AppError("The email or password is Incorrect",401);
  }

// For Admin/Super Admin, trust the role stored in the database.
  // For Student/Lecturer, the selected table determines the role.
  const role =
    data.role === "ADMIN" || data.role === "SUPER_ADMIN"
      ? user.role
      : data.role;

  const passwordMatches = await comparePassword(data.password, user.password);

  if (!passwordMatches){
    throw new AppError("The email or password is Incorrect",401);
  }


  //Check Account is active
  if (user.accountStatus !== AccountStatus.ACTIVE ){
    throw new AppError("Account not active. Contact Admin",403)
  }

  const token = generateJWT(
    user.id,
    role,
    user.authVersion,
    role === "STUDENT"
      ? { studentId: user.studentId }
      : role === "LECTURER"
        ? { lecturerId: user.lecturerId }
        : undefined
  );
  
  return ({
    token,
    userId: user.id,
    ...(role === "STUDENT" && { studentId: user.studentId }),
    ...(role === "LECTURER" && { lecturerId: user.lecturerId }),
    firstName : user.firstName,
    email : user.email,
    role
  })

}

export const changePassword = async (
  authenticatedUser: AuthenticatedUser,
  data: ChangePasswordRequest
): Promise<void> => {
  let user: { password: string } | null;

  switch (authenticatedUser.role) {
    case "ADMIN":
    case "SUPER_ADMIN":
      user = await prisma.admin.findUnique({
        where: { id: authenticatedUser.userId },
        select: { password: true },
      });
      break;
    case "LECTURER":
      user = await prisma.lecturer.findUnique({
        where: { id: authenticatedUser.userId },
        select: { password: true },
      });
      break;
    case "STUDENT":
      user = await prisma.student.findUnique({
        where: { id: authenticatedUser.userId },
        select: { password: true },
      });
      break;
  }

  if (!user) {
    throw new AppError("Authenticated user not found", 404);
  }

  const oldPasswordMatches = await comparePassword(
    data.oldPassword,
    user.password
  );

  if (!oldPasswordMatches) {
    throw new AppError("Old password is incorrect", 401);
  }

  const hashedPassword = await hashPassword(data.newPassword);

  switch (authenticatedUser.role) {
    case "ADMIN":
    case "SUPER_ADMIN":
      await prisma.admin.update({
        where: { id: authenticatedUser.userId },
        data: { password: hashedPassword },
      });
      break;
    case "LECTURER":
      await prisma.lecturer.update({
        where: { id: authenticatedUser.userId },
        data: { password: hashedPassword },
      });
      break;
    case "STUDENT":
      await prisma.student.update({
        where: { id: authenticatedUser.userId },
        data: { password: hashedPassword },
      });
      break;
  }
};
