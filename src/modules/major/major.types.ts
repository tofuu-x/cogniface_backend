import type { DegreeType, Department } from "../../generated/prisma/enums.js";

export interface CreateMajorRequest {
  majorCode : string;
  majorName : string;
  department : Department;
  degreeType : DegreeType;
}

export interface MajorResponse {
  id: string;
  majorCode: string;
  majorName: string;
  department : Department;
  degreeType: DegreeType;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateMajorRequest{
  majorName?: string;
  department?: Department;
  degreeType?: DegreeType;
}