import express from "express";
import dotenv from "dotenv";
import env from "../config/env";

dotenv.config();

const app = express();
const port = env.port;

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
