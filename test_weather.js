async function test() {
  const url = 'http://127.0.0.1:54321/functions/v1/weather-proxy';
  const key = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({ lat: '40.7128', lon: '-74.0060' })
  });
  
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text);
}

test();
