import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
const env = fs.readFileSync(envPath, 'utf8').split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) acc[key.trim()] = value.trim();
  return acc;
}, {});

const supabaseUrl = env['VITE_SUPABASE_URL'] || 'http://127.0.0.1:54321';
const supabaseKey = env['VITE_SUPABASE_KEY']; 

async function run() {
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };

  const tables = ['tasks', 'lists', 'events', 'calendars'];
  for (const table of tables) {
    const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, { headers });
    const data = await res.json();
    console.log(`Table ${table} has ${data.length} rows`);
    if (data.length > 0) {
      console.log(`Sample row from ${table}:`, data[0]);
    }
  }
}

run();
