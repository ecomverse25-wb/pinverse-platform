import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Supabase Admin Init Error: Missing Environment Variables', {
            url: !!supabaseUrl,
            key: !!serviceRoleKey
        })
        return null
    }

    try {
        return createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })
    } catch (error) {
        console.error('Supabase Admin Init Failed:', error)
        return null
    }
}
