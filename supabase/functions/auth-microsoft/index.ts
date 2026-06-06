import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient, getAuthUserId } from '../_shared/supabase-client.ts'
import { ok, badRequest, handleError, corsResponse } from '../_shared/response.ts'

const MS_CLIENT_ID = Deno.env.get('MS_GRAPH_CLIENT_ID') || ''
const MS_CLIENT_SECRET = Deno.env.get('MS_GRAPH_CLIENT_SECRET') || ''
const REDIRECT_URI = Deno.env.get('MS_REDIRECT_URI') || 'http://localhost:5173/settings'

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
          'Calendars.ReadWrite',
          'Tasks.ReadWrite',
          'User.Read',
          'offline_access'
        ].join(' ')
        
        const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${MS_CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&response_mode=query&scope=${scopes}`
        return ok({ url: authUrl })
      }
    } else if (req.method === 'POST') {
      const body = await req.json()
      const code = body.code

      if (!code) return badRequest('Missing authorization code')

      // Exchange code for tokens
      const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: MS_CLIENT_ID,
          client_secret: MS_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: REDIRECT_URI
        })
      })

      const tokens = await tokenResponse.json()
      if (!tokenResponse.ok) throw new Error(tokens.error_description || 'Failed to fetch tokens')

      // Get user info to get the MS Account ID
      const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
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
          provider: 'microsoft',
          provider_account_id: userInfo.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt,
          scopes: tokens.scope.split(' ')
        }, { onConflict: 'user_id, provider, provider_account_id' })

      if (error) throw error

      return ok({ success: true, email: userInfo.userPrincipalName || userInfo.mail })
    }

    return badRequest('Invalid method or action')
  } catch (err) {
    return handleError(err)
  }
})
