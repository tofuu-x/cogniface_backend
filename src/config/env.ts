import 'dotenv/config'

//Helper function to throw Error if env is missing or return the env variable if successful

const required = (key : string) : string => {
  const value = process.env[key];
  if (!value){
    throw new Error(`Missing Environment Variable ${key}`);
  }
  return value;
}

const env = {
  port : required("PORT"),
  database_url : required("DEV_DATABASE_URL"),
  node_env : required("NODE_ENV"),
  salt_rounds : required("SALT_ROUNDS"),
  jwt_secret : required("JWT_SECRET")
}

export default env;
