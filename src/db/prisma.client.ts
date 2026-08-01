import {PrismaPg} from "@prisma/adapter-pg";
import {PrismaClient} from "../generated/prisma/client.js";
import env from "../config/env.js";

const connectionString = env.database_url;

const adapter = new PrismaPg({connectionString});
const prisma = new PrismaClient({
  adapter,
  log : 
    env.node_env === "development"
      ? ["query", "error" , "warn"]
      : ["error"]
});

export default prisma;