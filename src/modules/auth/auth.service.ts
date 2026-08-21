import type { LoginRequest, LoginResponse } from "./auth.types.js"
import prisma from "../../db/prisma.client.js";
import { AppError } from "../../utils/appError.js";

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

  //TODO : User not found
  if (!user){
    throw new AppError("The username or password is incorrect",401);
  }

  //TODO : User not active

  //TODO : CHECK IF LOGIN ATTEMPT > 5

  //TODO : VERIFY Password

  return ({
    token : "abc",
    userId : user.userId,
    firstName : user.firstName,
    email : user.email,
    role : user.role
  })

}