import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function createUsers() {
  // First, let's clean up existing users
  console.log('Cleaning up existing users...')
  await supabaseAdmin.from('users').delete().neq('id', '0')
  
  const users = [
    { email: 'john@example.com', username: 'john_doe', profile_picture: 'https://avatars.githubusercontent.com/u/1', status: 'online' },
    { email: 'jane@example.com', username: 'jane_smith', profile_picture: 'https://avatars.githubusercontent.com/u/2', status: 'away' },
    { email: 'bob@example.com', username: 'bob_wilson', profile_picture: 'https://avatars.githubusercontent.com/u/3', status: 'offline' },
    { email: 'alice@example.com', username: 'alice_johnson', profile_picture: 'https://avatars.githubusercontent.com/u/4', status: 'busy' },
    { email: 'sam@example.com', username: 'sam_brown', profile_picture: 'https://avatars.githubusercontent.com/u/5', status: 'online' }
  ]

  for (const user of users) {
    try {
      // Create auth user with email confirmed
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: 'asdf',
        email_confirmed: true,
        user_metadata: {
          username: user.username
        }
      })

      if (authError) throw authError
      console.log(`Created auth user: ${user.email}`)

      // Explicitly confirm email using admin API
      const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
        authUser.user.id,
        { email_confirm: true }
      )

      if (confirmError) throw confirmError
      console.log(`Confirmed email for: ${user.email}`)

      // Create/update public user profile
      const { error: profileError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: authUser.user.id,
          username: user.username,
          email: user.email,
          profile_picture: user.profile_picture,
          status: user.status
        })

      if (profileError) throw profileError
      console.log(`Updated public profile for: ${user.email}`)

    } catch (error) {
      console.error(`Error processing user ${user.email}:`, error)
    }
  }

  console.log('All users created successfully!')
}

createUsers() 