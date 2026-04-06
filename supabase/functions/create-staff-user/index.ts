
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { email, password, establishment_id, name } = await req.json()

        // 1. Authenticate caller (Must be Admin)
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error("Missing Authorization header")

        const supabaseUser = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
        if (authError || !user) throw new Error("Unauthorized: " + (authError?.message || 'No user'))

        // 2. Check Role & Permissions
        const { data: profile } = await supabaseUser
            .from('profiles')
            .select('role, establishment_id')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
            throw new Error("Forbidden: Only owners can create staff")
        }

        // 3. Ensure they create staff for THEIR restaurant
        if (profile.role === 'admin' && profile.establishment_id !== establishment_id) {
            throw new Error("Forbidden: You can only create staff for your own restaurant")
        }

        // 4. Create User via Admin API using SERVICE ROLE
        // Try multiple secret names for service role
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')

        if (!serviceRoleKey) throw new Error("Internal Server Error: Service role key missing")

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            serviceRoleKey
        )

        const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: name || 'Garçom' }
        })

        if (createError) throw createError

        // 5. Create Profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: createdUser.user.id,
                email: email,
                full_name: name || 'Garçom',
                establishment_id: establishment_id,
                role: 'waiter'
            })

        if (profileError) throw profileError

        return new Response(JSON.stringify({ success: true, user: createdUser.user }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error("Function Error:", error.message)
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    }
})
