import api from './apiService';

export const marksService = {
  // Admin: Get all marks with filters
  // filters: { grade, subject, sortBy, studentId }
  getAllMarks: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      
      const response = await api.get(`/admin/marks?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch marks';
    }
  },

  // Tutor: Get marks for their specific classes
  getTutorMarks: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await api.get(`/tutors/marks/view?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch your class marks';
    }
  },

  // Update a mark (Admin or Tutor)
  updateMark: async (markId, data, role = 'admin') => {
    try {
      const endpoint = role === 'tutor' 
        ? `/tutors/marks/${markId}` 
        : `/admin/marks/${markId}`;
      
      const response = await api.put(endpoint, data);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to update mark';
    }
  },

  // Delete a mark (Admin only)
  deleteMark: async (markId) => {
    try {
      const response = await api.delete(`/admin/marks/${markId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to delete mark';
    }
  }
};