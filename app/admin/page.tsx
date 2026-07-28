import { redirect } from 'next/navigation';
import { getAdminUser, isOwnerUser } from '../api/admin/auth';
import { AdminDashboardClient } from './AdminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const { user, error } = await getAdminUser();

  if (error || !user || !isOwnerUser(user)) {
    redirect('/login');
  }

  return <AdminDashboardClient />;
}
