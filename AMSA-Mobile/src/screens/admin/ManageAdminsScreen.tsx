// src/screens/admin/ManageAdminsScreen.tsx
import React from 'react';
import { AccountManagerScreen } from './AccountManagerScreen';
import { adminService } from '../../services/admin';

const ManageAdminsScreen = () => (
  <AccountManagerScreen
    title="Admins"
    subtitleLabel="admin accounts"
    getAccounts={async () => { const r = await adminService.getAdmins(); return { accounts: r.admins }; }}
    createAccount={adminService.createAdmin}
    updateAccount={adminService.updateAdmin}
  />
);

export default ManageAdminsScreen;
