export interface LoginRequest {
  email : string,
  password : string,
  role : "SUPER_ADMIN" | "ADMIN" | "LECTURER" | "STUDENT" 
}

export interface LoginResponse {
  token : string,
  userId : string,
  firstName : string,
  email : string,
  role : string
}