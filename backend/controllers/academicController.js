import { PREDEFINED_SUBJECTS, PREDEFINED_GRADES } from "../config/academicConfig.js";

export const getAcademicConfig = async (req, res) => {
  try {
    res.json({
      subjects: PREDEFINED_SUBJECTS,
      grades: PREDEFINED_GRADES,
      subjectCount: PREDEFINED_SUBJECTS.length,
      gradeCount: PREDEFINED_GRADES.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSubjects = async (req, res) => {
  try {
    res.json({ 
      subjects: PREDEFINED_SUBJECTS,
      count: PREDEFINED_SUBJECTS.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getGrades = async (req, res) => {
  try {
    res.json({ 
      grades: PREDEFINED_GRADES,
      count: PREDEFINED_GRADES.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};