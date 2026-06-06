import { PREDEFINED_GRADES } from "../config/academicConfig.js";
import Subject from "../models/subject.js";

export const getAcademicConfig = async (req, res) => {
  try {
    const subjectDocs = await Subject.find({ isActive: true }).sort({ name: 1 }).select('name -_id');
    const subjects = subjectDocs.map(s => s.name);
    res.json({
      subjects,
      grades: PREDEFINED_GRADES,
      subjectCount: subjects.length,
      gradeCount: PREDEFINED_GRADES.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSubjects = async (req, res) => {
  try {
    const subjectDocs = await Subject.find({ isActive: true }).sort({ name: 1 }).select('name -_id');
    const subjects = subjectDocs.map(s => s.name);
    res.json({ subjects, count: subjects.length });
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
