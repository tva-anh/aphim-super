/**
 * lib/supabase.js
 * Supabase client - dùng cho mọi thao tác DB phía server
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl  = process.env.SUPABASE_URL;
const supabaseAnon = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnon) {
    console.error('❌ [Supabase] Thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY trong .env');
    process.exit(1);
}

// Client thường — dùng cho public queries (không bypass RLS)
const supabase = createClient(supabaseUrl, supabaseAnon);

// Admin client — bypass RLS, CHỈ dùng server-side
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

module.exports = { supabase, supabaseAdmin };
