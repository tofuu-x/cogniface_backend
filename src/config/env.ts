import 'dotenv/config'

//Helper function to throw Error if env is missing or return the env variable if successful

const required = (key : string) : string => {
  const value = process.env[key];
  if (!value){
    throw new Error(`Missing Environment Variable ${key}`);
  }
  return value;
}

const nonNegativeInteger = (key: string, defaultValue: number) => {
  const value = Number(process.env[key] ?? defaultValue);

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${key} must be a non-negative integer`);
  }

  return value;
};

const attendanceTimeZone =
  process.env.ATTENDANCE_TIME_ZONE ?? "Australia/Sydney";

try {
  new Intl.DateTimeFormat("en-AU", {
    timeZone: attendanceTimeZone,
  }).format();
} catch {
  throw new Error("ATTENDANCE_TIME_ZONE must be a valid IANA time zone");
}

const env = {
  port : required("PORT"),
  database_url : required("DEV_DATABASE_URL"),
  node_env : required("NODE_ENV"),
  client_origin : process.env.CLIENT_ORIGIN,
  salt_rounds : (() => {
    const value = Number(required("SALT_ROUNDS"));

    if (!Number.isInteger(value) || value < 4) {
      throw new Error("SALT_ROUNDS must be an integer bcrypt cost value");
    }

    return value;
  })(),
  jwt_secret : required("JWT_SECRET"),
  attendance_time_zone: attendanceTimeZone,
  attendance_start_early_minutes: nonNegativeInteger(
    "ATTENDANCE_START_EARLY_MINUTES",
    15
  ),
  attendance_end_grace_minutes: nonNegativeInteger(
    "ATTENDANCE_END_GRACE_MINUTES",
    15
  ),
}

export default env;
