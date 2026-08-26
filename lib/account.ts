import { supabase } from './supabase';

export async function updateEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email });
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

/** Deletes the signed-in user's account and all their data. Irreversible. */
export async function deleteOwnAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_own_account');
  if (error) throw error;
}
