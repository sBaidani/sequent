import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient, getAuthUserId } from '../_shared/supabase-client.ts'
import { ok, badRequest, handleError, corsResponse } from '../_shared/response.ts'

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || ''
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') || ''
const REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI') || 'http://localhost:5173/settings' // Assuming settings page handles redirect

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    const supabase = createSupabaseClient(req)
    const userId = await getAuthUserId(supabase)
    const url = new URL(req.url)

    if (req.method === 'GET') {
      const action = url.searchParams.get('action')
      
      if (action === 'get_auth_url') {
        const scopes = [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/tasks',
          'https://www.googleapis.com/auth/userinfo.email'
        ].join(' ')
        
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scopes}&access_type=offline&prompt=consent`
        return ok({ url: authUrl })
      }
    } else if (req.method === 'POST') {
      const body = await req.json()
      const code = body.code

      if (!code) return badRequest('Missing authorization code')

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: REDIRECT_URI
        })
      })

      const tokens = await tokenResponse.json()
      if (!tokenResponse.ok) throw new Error(tokens.error_description || 'Failed to fetch tokens')

      // Get user info to get the Google Account ID
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      })
      const userInfo = await userInfoResponse.json()
      if (!userInfoResponse.ok) throw new Error('Failed to fetch user info')

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

      // Store in user_connections table
      const { error } = await supabase
        .from('user_connections')
        .upsert({
          user_id: userId,
          provider: 'google',
          provider_account_id: userInfo.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt,
          scopes: tokens.scope.split(' ')
        }, { onConflict: 'user_id, provider, provider_account_id' })

      if (error) throw error

      return ok({ success: true, email: userInfo.email })
    }

    return badRequest('Invalid method or action')
  } catch (err) {
    return handleError(err)
  }
})
