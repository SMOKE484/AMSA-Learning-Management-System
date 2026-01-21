import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Layout & Route Components
import ProtectedRoute from './components/common/ProtectedRoute';

// Page Components
import Login from './pages/Login';
import NotFound from './pages/NotFound';

// Admin Pages
import AdminDashboard from './pages/Admin/AdminDashboard';
import ManageStudents from './pages/Admin/ManageStudents';
import ManageTutors from './pages/Admin/ManageTutors';
import ManageParents from './pages/Admin/ManageParents';
import ManageSchedules from './pages/Admin/ManageSchedules'; // NEW
import ClassAttendance from './pages/Admin/ClassAttendance'; // NEW
import SchoolConfig from './pages/Admin/SchoolConfig'; // NEW
import ManageMarks from './pages/Admin/ManageMarks';

// Tutor Pages
import TutorDashboard from './pages/Tutor/TutorDashboard';
import AssignedStudents from './pages/Tutor/AssignedStudents';
import UploadNotes from './pages/Tutor/UploadNotes';
import UploadMarks from './pages/Tutor/UploadMarks';
import TutorSchedules from './pages/Tutor/TutorSchedules'; // NEW
import TutorAttendance from './pages/Tutor/TutorAttendance'; // NEW
import TutorTimetable from './pages/Tutor/TutorTimetable'; // NEW

function App() {
  const { isAuthenticated, role } = useAuth();

  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<Login />} />
      
      {/* --- Admin Protected Routes --- */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/students" element={<ManageStudents />} />
        <Route path="/admin/tutors" element={<ManageTutors />} />
        <Route path="/admin/parents" element={<ManageParents />} />
        <Route path="/admin/marks" element={<ManageMarks />} />
        
        {/* Class Scheduling & Attendance Routes */}
        <Route path="/admin/schedules" element={<ManageSchedules />} />
        <Route path="/admin/attendance" element={<ClassAttendance />} />
        <Route path="/admin/school-config" element={<SchoolConfig />} />
      </Route>
      
      {/* Tutor Protected Routes*/}
      <Route element={<ProtectedRoute allowedRoles={['tutor']} />}>
        <Route path="/tutor/dashboard" element={<TutorDashboard />} />
        <Route path="/tutor/students" element={<AssignedStudents />} />
        <Route path="/tutor/notes" element={<UploadNotes />} />
        <Route path="/tutor/marks" element={<UploadMarks />} />
        
        {/*Tutor Scheduling & Attendance Routes */}
        <Route path="/tutor/schedules" element={<TutorSchedules />} />
        <Route path="/tutor/attendance" element={<TutorAttendance />} />
        <Route path="/tutor/timetable" element={<TutorTimetable />} />
      </Route>

      {/* --- Redirects --- */}
      <Route
        path="/"
        element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : role === 'admin' ? (
            <Navigate to="/admin/dashboard" replace />
          ) : (
            <Navigate to="/tutor/dashboard" replace />
          )
        }
      />

      {/* 404 Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;