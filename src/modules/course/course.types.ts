export interface CreateCourseRequest {
  courseCode: string;
  courseName: string;
  description?: string;
  creditPoints: number;
  majorCodes: string[];
  prerequisiteCodes?: string[];
}

export interface UpdateCourseRequest {
  courseName?: string;
  description?: string;
  creditPoints?: number;
  majorCodes?: string[];
  prerequisiteCodes?: string[];
}