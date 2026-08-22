import type { LoginRequest, LoginResponse } from "./auth.types.js"
import prisma from "../../db/prisma.client.js";
import { AppError } from "../../utils/appError.js";
import { AccountStatus } from "../../generated/prisma/enums.js";
import { comparePassword, generateJWT } from "../../utils/auth.js";

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

  const token = generateJWT(user.id, role);
  
  return ({
    token,
    userId: user.id,
    firstName : user.firstName,
    email : user.email,
    role: user.role
  })

}