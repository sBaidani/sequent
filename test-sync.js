import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const envPath = path.join(process.cwd(), '.env.local');
const env = fs.readFileSync(envPath, 'utf8').split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) acc[key.trim()] = value.trim();
  return acc;
}, {});

const supabaseUrl = env['VITE_SUPABASE_URL'] || 'http://127.0.0.1:54321';
const supabaseKey = env['VITE_SUPABASE_KEY']; 
const testUserEmail = 'test@example.com';
const testUserPassword = 'password123';

async function run() {
  let res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': supabaseKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUserEmail, password: testUserPassword })
  });

  const session = await res.json();
  const token = session.access_token;
  const functionUrl = `${supabaseUrl}/functions/v1/sync`;

  const listId = crypto.randomUUID();

  const mutations = [
    {
      table: 'lists',
      action: 'INSERT',
      payload: {
        id: listId,
        name: 'Test List',
        color: '#6B5BDB',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    },
    {
      table: 'tasks',
      action: 'INSERT',
      payload: {
        id: crypto.randomUUID(),
        title: 'Test Task with List',
        listId: listId,
        completed: false,
        priority: 'normal',
        scheduled_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }
  ];

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ mutations })
  });

  const json = await response.json();
  console.log('Response body:', JSON.stringify(json, null, 2));
}

run();
