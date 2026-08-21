import express from "express";
import prisma from "../db/prisma.client.js";


const app = express();

app.use(express.json());



app.get("/",async (req,res)=> {
  let admin = await prisma.admin.findMany();
  res.send(admin)
})

export default app;
