import type {
  Request,
  Response,
} from "express";

import {
  createClassService,
  getClassService,
  getAllClassesService,
  getMyCurrentClassesService,
  getMyClassHistoryService,
  getAvailableClassesService,
  updateClassService,
  deleteClassService,
} from "./class.service.js";

import type {
  CreateClassRequest,
  UpdateClassRequest,
} from "./class.types.js";


export const createClass = async (
  req: Request<
    {},
    {},
    CreateClassRequest
  >,
  res: Response
) => {
  const classRecord =
    await createClassService(
      req.body
    );

  return res.status(201).json({
    success: true,
    message:
      "Class created successfully",
    class: classRecord,
  });
};


export const getClass = async (
  req: Request<{
    id: string;
  }>,
  res: Response
) => {
  const classRecord =
    await getClassService(
      req.params.id
    );

  return res.status(200).json({
    success: true,
    class: classRecord,
  });
};


export const getAllClasses = async (
  _req: Request,
  res: Response
) => {
  const classes =
    await getAllClassesService();

  return res.status(200).json({
    success: true,
    count: classes.length,
    classes,
  });
};


export const getMyCurrentClasses = async (
  req: Request,
  res: Response
) => {
  if (!req.user) {
    throw new Error(
      "Authenticated user missing"
    );
  }

  const classes =
    await getMyCurrentClassesService(
      req.user.userId
    );

  return res.status(200).json({
    success: true,
    count: classes.length,
    classes,
  });
};


export const getMyClassHistory = async (
  req: Request,
  res: Response
) => {
  if (!req.user) {
    throw new Error(
      "Authenticated user missing"
    );
  }

  const classes =
    await getMyClassHistoryService(
      req.user.userId
    );

  return res.status(200).json({
    success: true,
    count: classes.length,
    classes,
  });
};


export const getAvailableClasses = async (
  _req: Request,
  res: Response
) => {
  const classes =
    await getAvailableClassesService();

  return res.status(200).json({
    success: true,
    count: classes.length,
    classes,
  });
};


export const updateClass = async (
  req: Request<
    { id: string },
    {},
    UpdateClassRequest
  >,
  res: Response
) => {
  const classRecord =
    await updateClassService(
      req.params.id,
      req.body
    );

  return res.status(200).json({
    success: true,
    message:
      "Class updated successfully",
    class: classRecord,
  });
};


export const deleteClass = async (
  req: Request<{
    id: string;
  }>,
  res: Response
) => {
  const classRecord =
    await deleteClassService(
      req.params.id
    );

  return res.status(200).json({
    success: true,
    message:
      "Class deleted successfully",
    class: classRecord,
  });
};