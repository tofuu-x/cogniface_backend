import app from "./express.js";
import env from "../config/env.js"
import { connectDB , disconnectDB } from "../db/connect.js";

await connectDB();

const server = app.listen(env.port, ()=>{
  console.log(`Express app is running on PORT ${env.port}`);
});


//Handle unhandled promise rejections (e.g, database connection errors)
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  server.close(async() =>{
    await disconnectDB();
    process.exit(1);
  });
});

//Handle uncaught exceptions
process.on("uncaughtException", async (err) =>{
  console.error("Uncaught Exception:", err);
  await disconnectDB();
  process.exit(1);
});

//Graceful shutdown
process.on("SIGTERM", async()=>{
  console.log("SIGTERM received, shutting down gracefully");
  server.close(async()=>{
    await disconnectDB();
    process.exit(0);
  });
});