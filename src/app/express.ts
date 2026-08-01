import app from "./server.js";
import env from "../config/env.js"

const server = app.listen(env.port, ()=>{
  console.log(`Express app is running on PORT ${env.port}`);
});