import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// In-memory simple rate limit for the 3 req/sec per isolate
let lastRequestTimes: number[] = [];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { lat, lon, units = 'metric' } = await req.json()
    const apiKey = Deno.env.get('TOMORROW_API_KEY')
    
    if (!apiKey) {
      throw new Error('TOMORROW_API_KEY not set')
    }

    // Create Supabase client to check cache & DB rate limits
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check DB cache
    const locationKey = `${lat},${lon},${units}`
    const { data: cacheData, error: cacheError } = await supabase
      .from('weather_cache')
      .select('data, updated_at')
      .eq('location_key', locationKey)
      .single()

    if (cacheData) {
      const updatedAt = new Date(cacheData.updated_at).getTime()
      const now = Date.now()
      // If cache is less than 30 mins old, return it
      if (now - updatedAt < 30 * 60 * 1000) {
        return new Response(JSON.stringify(cacheData.data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }
    }

    // Rate Limiter Checks (Only if we actually need to hit the API)
    // 1. In-memory 3 req/s check
    const nowMs = Date.now();
    lastRequestTimes = lastRequestTimes.filter(time => nowMs - time < 1000);
    if (lastRequestTimes.length >= 3) {
      throw new Error('Rate limit exceeded (3/s)');
    }
    lastRequestTimes.push(nowMs);

    // 2. DB Hourly/Daily check
    // We check how many requests happened today and in the last hour
    const oneHourAgo = new Date(nowMs - 60 * 60 * 1000).toISOString()
    const startOfDay = new Date(new Date().setHours(0,0,0,0)).toISOString()

    const { count: hourlyCount } = await supabase
      .from('weather_api_usage')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneHourAgo)
      
    if (hourlyCount !== null && hourlyCount >= 25) {
      throw new Error('Rate limit exceeded (25/hr)');
    }

    const { count: dailyCount } = await supabase
      .from('weather_api_usage')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfDay)

    if (dailyCount !== null && dailyCount >= 500) {
      throw new Error('Rate limit exceeded (500/day)');
    }

    const reqUnits = String(units).toLowerCase()
    const apiUnits = reqUnits === 'fahrenheit' || reqUnits === 'imperial' ? 'imperial' : 'metric'

    // Fetch from Tomorrow.io
    const response = await fetch(`https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lon}&apikey=${apiKey}&units=${apiUnits}&timesteps=1h,1d`)
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`)
    }
    const data = await response.json()

    // Save to Cache (upsert)
    await supabase
      .from('weather_cache')
      .upsert({
        location_key: locationKey,
        data: data,
        updated_at: new Date().toISOString()
      })

    // Log API usage
    await supabase
      .from('weather_api_usage')
      .insert({})

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
