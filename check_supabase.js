const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local manually
const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
        if (line.trim().startsWith('#') || !line.includes('=')) continue;
        const parts = line.split('=');
        const key = parts[0].trim();
        let val = parts.slice(1).join('=').trim();
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1);
        }
        process.env[key] = val;
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing environment variables!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    console.log("Checking Supabase connection...");
    
    // 1. Fetch channels
    const { data: channels, error: chError } = await supabase.from('channels').select('*');
    if (chError) {
        console.error("Error fetching channels:", chError);
    } else {
        console.log("Channels:", JSON.stringify(channels, null, 2));
    }

    // 2. Fetch dedications
    const { data: dedications, error: dError } = await supabase.from('dedications').select('*').limit(5);
    if (dError) {
        console.error("Error fetching dedications:", dError);
    } else {
        console.log("Dedications (limit 5):", JSON.stringify(dedications, null, 2));
    }

    // 3. Count in fcm_tokens
    const { count, error: fError } = await supabase.from('fcm_tokens').select('*', { count: 'exact', head: true });
    if (fError) {
        console.error("Error counting fcm_tokens:", fError);
    } else {
        console.log("FCM tokens count:", count);
    }
}

run();
