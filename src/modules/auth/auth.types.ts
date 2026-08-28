export interface LoginRequest {
  email : string,
  password : string,
  role : "SUPER_ADMIN" | "ADMIN" | "LECTURER" | "STUDENT" 
}

export interface LoginResponse {
  token : string,
  userId : string,
  studentId? : string,
  lecturerId? : string,
  firstName : string,
  email : string,
  role : LoginRequest["role"]
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}
