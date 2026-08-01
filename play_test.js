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
  const now = Date.now();
  console.log("Updating channel status to playing with current timestamp:", now);
  const { data, error } = await supabase.from('channels').update({
    status: 'playing',
    videoId: 'NAkQVL61BRI',
    title: 'Raga of Revenge (From "DC")',
    artist: 'Anirudh Ravichander',
    duration: 131,
    startedAt: now,
    mediaType: 'youtube'
  }).eq('id', 'main').select();
  
  if (error) {
    console.error("Error updating:", error);
  } else {
    console.log("Successfully updated:", data);
  }
}
run();
