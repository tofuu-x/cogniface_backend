import type {Request, Response} from 'express';
import type { ChangePasswordRequest, LoginRequest } from './auth.types.js';
import { AppError } from '../../utils/appError.js';
import { changePassword, loginUser } from './auth.service.js';


//Login Controller
export const login = async(req : Request , res : Response) => {
  //Get the request body
  const body : LoginRequest = req.body;

  //validate  request body
  if (!body.role || !body.email || !body.password) {
    throw new AppError("Username and password are required",400);
  }

  //Pass it to the service layer
  const result = await loginUser(body);

  res.status(200).json({
    sucess : true,
    message : "Login successful",
    data : result
  })

}

export const changeAuthenticatedUserPassword = async (
  req: Request<{}, {}, ChangePasswordRequest>,
  res: Response
) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (
    typeof oldPassword !== "string" ||
    typeof newPassword !== "string" ||
    typeof confirmPassword !== "string" ||
    !oldPassword ||
    !newPassword ||
    !confirmPassword
  ) {
    throw new AppError(
      "Old password, new password, and password confirmation are required",
      400
    );
  }

  if (newPassword.length < 8) {
    throw new AppError("New password must be at least 8 characters long", 400);
  }

  if (newPassword !== confirmPassword) {
    throw new AppError("New password and confirmation do not match", 400);
  }

  if (oldPassword === newPassword) {
    throw new AppError("New password must be different from old password", 400);
  }

  await changePassword(req.user, {
    oldPassword,
    newPassword,
    confirmPassword,
  });

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
};

