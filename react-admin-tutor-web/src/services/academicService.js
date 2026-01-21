import api from './apiService';

// Cache for academic data
let academicConfigCache = null;

export const academicService = {
  // Get all academic configuration (subjects + grades)
  async getAcademicConfig() {
    if (academicConfigCache) {
      return academicConfigCache;
    }

    try {
      const response = await api.get('/academic/config');
      academicConfigCache = response.data;
      return academicConfigCache;
    } catch (error) {
      console.error('Failed to fetch academic config:', error);
      // Fallback to predefined values if API fails
      return {
        subjects: [
          "Natural Sciences", "Mathematics", "Mathematical Literacy",
          "Physical Sciences", "Business Studies", "English", 
          "Agricultural Sciences", "Geography", "Life Sciences", "Accounting"
        ],
        grades: [8, 9, 10, 11, 12]
      };
    }
  },

  // Get only subjects
  async getSubjects() {
    const config = await this.getAcademicConfig();
    return config.subjects;
  },

  // Get only grades
  async getGrades() {
    const config = await this.getAcademicConfig();
    return config.grades;
  },

  // Clear cache (useful when you update subjects/grades)
  clearCache() {
    academicConfigCache = null;
  }
};