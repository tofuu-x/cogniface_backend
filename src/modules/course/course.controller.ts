import type {
  Request,
  Response,
} from "express";

import {
  createCourseService,
  getCourseService,
  getAllCoursesService,
  updateCourseService,
  deleteCourseService,
  archiveCourseService,
} from "./course.service.js";

import type {
  CreateCourseRequest,
  UpdateCourseRequest,
} from "./course.types.js";


export const createCourse = async (
  req: Request<
    {},
    {},
    CreateCourseRequest
  >,
  res: Response
) => {
  const course =
    await createCourseService(
      req.body
    );

  return res.status(201).json({
    success: true,
    message:
      "Course created successfully",
    course,
  });
};

export const getCourse = async (
  req: Request<{
    courseCode: string;
  }>,
  res: Response
) => {
  const course =
    await getCourseService(
      req.params.courseCode
    );

  return res.status(200).json({
    success: true,
    course,
  });
};

export const getAllCourses = async (
  _req: Request,
  res: Response
) => {
  const courses =
    await getAllCoursesService();

  return res.status(200).json({
    success: true,
    count: courses.length,
    courses,
  });
};

export const updateCourse = async (
  req: Request<
    { courseCode: string },
    {},
    UpdateCourseRequest
  >,
  res: Response
) => {
  const course =
    await updateCourseService(
      req.params.courseCode,
      req.body
    );

  return res.status(200).json({
    success: true,
    message:
      "Course updated successfully",
    course,
  });
};

export const deleteCourse = async (
  req: Request<{
    courseCode: string;
  }>,
  res: Response
) => {
  const course =
    await deleteCourseService(
      req.params.courseCode
    );

  return res.status(200).json({
    success: true,
    message:
      "Course deleted successfully",
    course,
  });
};

export const archiveCourse = async (
  req: Request<{
    courseCode: string;
  }>,
  res: Response
) => {
  const course =
    await archiveCourseService(
      req.params.courseCode
    );

  return res.status(200).json({
    success: true,
    message:
      "Course archived successfully",
    course,
  });
};
