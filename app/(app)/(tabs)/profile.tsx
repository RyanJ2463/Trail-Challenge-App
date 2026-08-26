import { useAuth } from '../../../lib/auth-context';
import { ProfileView } from '../../../components/ProfileView';

export default function ProfileTab() {
  const { session } = useAuth();
  const userId = session?.user.id;
  if (!userId) return null;
  return <ProfileView userId={userId} />;
}
