import type { Request, Response } from "express";

export const createLecturer = (
  req : Request,
  res : Response
) => {
  return res.status(200).json({
    message : "Authorized",
    user: req.user
  })
}