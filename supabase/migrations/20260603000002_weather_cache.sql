-- Migration for weather cache and api usage logs

-- Table to store cached weather data per location
CREATE TABLE IF NOT EXISTS public.weather_cache (
    location_key text PRIMARY KEY,
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

-- Table to track API usage
CREATE TABLE IF NOT EXISTS public.weather_api_usage (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS (though only edge functions will access these)
ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_api_usage ENABLE ROW LEVEL SECURITY;

-- Note: No policies needed because the edge function uses the service role key.
