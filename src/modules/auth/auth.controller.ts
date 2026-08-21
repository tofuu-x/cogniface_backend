import type {Request, Response} from 'express';
import type { LoginRequest, LoginResponse } from './auth.types.js';
import { AppError } from '../../utils/appError.js';
import { loginUser } from './auth.service.js';


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


