'use server';

import { createAdminClient } from '@/lib/supabase';
import { logActivity } from '@/lib/adminData';

export async function deleteUserAction(userId: string, adminEmail: string) {
    const supabase = createAdminClient();

    try {
        // 1. Delete from auth.users (this will also delete from public.profiles if there's a cascade, 
        // but let's be safe and check our schema)
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);

        if (authError) {
            console.error('Error deleting auth user:', authError);
            return { success: false, error: authError.message };
        }

        // 2. Log the activity
        await logActivity(
            userId, // The target user's ID
            adminEmail, // Admin taking the action
            'account_deletion',
            `User account permanently deleted by admin`,
            { action: 'delete_account' }
        );

        return { success: true };
    } catch (err) {
        console.error('Failed to delete user:', err);
        return { success: false, error: 'Failed to delete user' };
    }
}

export async function updateUserPlanAction(userId: string, newPlan: 'free' | 'pro' | 'enterprise', adminEmail: string) {
    const supabase = createAdminClient();

    try {
        const { error } = await supabase
            .from('profiles')
            .update({ plan: newPlan })
            .eq('id', userId);

        if (error) {
            console.error('Error updating plan:', error);
            return { success: false, error: error.message };
        }

        // Log the activity
        await logActivity(
            userId,
            adminEmail,
            'subscription_change',
            `User plan updated to ${newPlan}`,
            { newPlan }
        );

        return { success: true };
    } catch (err) {
        return { success: false, error: 'Failed to update user plan' };
    }
}
