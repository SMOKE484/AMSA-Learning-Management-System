import api from './apiService';

export const notesService = {
  getMyNotes: async () => {
    try {
      const response = await api.get('/tutors/notes');
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch notes';
    }
  },

  deleteNote: async (noteId) => {
    try {
      const response = await api.delete(`/tutors/notes/${noteId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to delete note';
    }
  },

  updateNote: async (noteId, data) => {
    try {
      const response = await api.put(`/tutors/notes/${noteId}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to update note';
    }
  },
};
