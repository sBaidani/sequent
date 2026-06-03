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

  const listId = crypto.randomUUID();

  // Create list
  let response = await fetch(`${supabaseUrl}/functions/v1/lists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      id: listId,
      name: 'Test List distinct endpoint',
      color: '#6B5BDB',
    })
  });
  console.log('List creation response:', await response.json());

  // Create task
  response = await fetch(`${supabaseUrl}/functions/v1/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      title: 'Test Task distinct endpoint',
      listId: listId,
      priority: 'normal',
    })
  });
  console.log('Task creation response:', await response.json());

  // Fetch tasks
  response = await fetch(`${supabaseUrl}/functions/v1/tasks`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Tasks GET response:', await response.json());
}

run();
