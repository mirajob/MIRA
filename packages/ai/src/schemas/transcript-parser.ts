import type { Confidence } from "@mira/types";

export interface TranscriptParserInput {
  pdfText: string;
  declaredUniversity?: string;
  declaredDegreeProgram?: string;
}

export interface TranscriptParserOutput {
  student_name_detected: string | null;
  university_detected: string | null;
  degree_program_detected: string | null;
  courses: Array<{
    course_name: string;
    course_code: string | null;
    credits: number | null;
    grade: string | null;
    grade_numeric: number | null;
    academic_year: string | null;
    semester: string | null;
    confidence: Confidence;
  }>;
  weighted_average: number | null;
  total_credits: number | null;
  warnings: string[];
  overall_confidence: Confidence;
}
