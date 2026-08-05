// src/screens/admin/ManageStaffScreen.tsx
// Restricted "attendance staff" accounts — can only log into the Tap
// Attendance screen (enforced by App.tsx's role-conditional tab navigator).
import React from 'react';
import { AccountManagerScreen } from './AccountManagerScreen';
import { adminService } from '../../services/admin';

const ManageStaffScreen = () => (
  <AccountManagerScreen
    title="Staff"
    subtitleLabel="attendance staff accounts"
    getAccounts={async () => { const r = await adminService.getStaff(); return { accounts: r.staff }; }}
    createAccount={adminService.createStaff}
    updateAccount={adminService.updateStaff}
  />
);

export default ManageStaffScreen;
