const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createBucket() {
    console.log("Attempting to create public bucket 'media'...");
    const { data, error } = await supabase.storage.createBucket('media', {
        public: true
    });

    if (error) {
        console.error("Failed to create bucket programmatically:", error);
        console.log("\nIf this failed due to RLS/permissions, please go to your Supabase Dashboard, select 'Storage' in the left menu, and click 'New bucket' to create a public bucket named 'media'.");
    } else {
        console.log("Bucket 'media' created successfully!", data);
    }
}

createBucket();
