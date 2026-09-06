export type RegistrationImageResult = {
  index: number;
  accepted: boolean;
  reasons: string[];
};

export type FaceRegistrationInferenceResponse = {
  success: true;
  encryptedEmbedding: string;
  validImageCount: number;
  rejectedImageCount: number;
  details: RegistrationImageResult[];
};

export type RecognitionRosterStudent = {
  studentId: string;
  studentName: string;
  encryptedEmbedding: string;
};

export type FaceBox = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type RecognitionMatch = {
  studentId: string;
  studentName: string;
  distance: number;
  box: FaceBox;
};

export type FaceRecognitionInferenceResponse = {
  success: true;
  frame: { width: number; height: number };
  facesDetected: number;
  matches: RecognitionMatch[];
  processingTimeMs: number;
};
