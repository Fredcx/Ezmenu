
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // 1. Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 2. Parse payload safely
        const text = await req.text()
        if (!text) throw new Error("Request body is empty")

        let body;
        try {
            body = JSON.parse(text)
        } catch (e) {
            throw new Error("Invalid JSON body")
        }

        const { email, password, establishment_id, name } = body

        // 3. Validation
        if (!email || !password || !establishment_id) {
            return new Response(JSON.stringify({
                success: false,
                error: "Missing required fields (email, password, establishment_id)",
                received: body
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200 // Return 200 so frontend can read the body
            })
        }

        // 4.1 Check Permissions (Must be Super Admin)
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error("Missing Authorization header")
        }

        const supabaseUser = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
        if (userError || !user) throw new Error("Unauthorized: Invalid Token")

        // Check role
        const { data: profile } = await supabaseUser
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        // Fallback for hardcoded super admins if needed, but RLS should handle it.
        // We enforce it here to be 100% sure.
        if (profile?.role !== 'super_admin') {
            const userEmail = user.email || ''
            if (!['admin@ezmenu.com', 'estille@gmail.com', 'superadmin@ezmenu.com.br'].includes(userEmail)) {
                throw new Error("Forbidden: Not a Super Admin")
            }
        }

        // 4. Setup Admin Client
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 5. Create User (using Admin Client)
        let userData = { user: null };

        const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: { full_name: name || 'Admin' }
        })

        if (createError) {
            // EDGE CASE: User already exists in Auth but maybe not in Profiles
            if (createError.message.includes("already been registered") || createError.status === 422) {
                console.log("User already exists, fetching details...")
                const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
                const existingUser = users?.users.find(u => u.email === email);

                if (existingUser) {
                    userData.user = existingUser;
                } else {
                    throw new Error("User reports existing but cannot be found in list.")
                }
            } else {
                throw createError;
            }
        } else {
            userData = createdUser;
        }

        if (!userData.user) throw new Error("Failed to create or retrieve user")

        // 6. Create Profile / Link to Establishment
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userData.user.id,
                email: email,
                full_name: name || 'Admin',
                establishment_id: establishment_id,
                role: 'establishment_admin'
            })

        if (profileError) {
            throw profileError
        }

        // 7. Success Response
        return new Response(JSON.stringify({
            success: true,
            user: { id: userData.user.id, email }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        // 8. Error Response
        return new Response(JSON.stringify({
            success: false,
            error: error.message || "Unknown error",
            stack: error.stack
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200, // Return 200 so frontend can read the error details
        })
    }
})
