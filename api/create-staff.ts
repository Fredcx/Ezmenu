import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, password, full_name, establishment_id } = req.body;

        if (!email || !password || !establishment_id) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error("Supabase credentials not configured in API");
        }

        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 1. Create the User via Admin API using pure gotrue methods
        // This is 100% safe and bypasses schema mismatch manual insert errors
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: full_name || 'Staff' }
        });

        // 2. Handle if user exists
        let userId = userData?.user?.id;
        if (createError) {
            if (createError.message.includes("registered") || createError.status === 422) {
                // Discover existing user ID
                const { data: users } = await supabaseAdmin.auth.admin.listUsers();
                const existing = users?.users.find(u => u.email === email);
                if (existing) {
                    userId = existing.id;
                    // Force update password
                    await supabaseAdmin.auth.admin.updateUserById(userId, {
                        password: password,
                        user_metadata: { full_name: full_name || 'Staff' },
                        email_confirm: true
                    });
                } else {
                    throw createError;
                }
            } else {
                throw createError;
            }
        }

        if (!userId) throw new Error("Could not create or retrieve staff member");

        // 3. Upsert Profile
        const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
            id: userId,
            email,
            full_name: full_name,
            role: 'waiter',
            establishment_id
        });

        if (profileError) throw profileError;

        return res.status(200).json({ success: true, user_id: userId });

    } catch (error: any) {
        console.error("Create Staff Error:", error);
        return res.status(500).json({ error: error.message || "Erro inesperado" });
    }
}
