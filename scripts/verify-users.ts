import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifyUsers() {
  // Check auth users
  const { data: authUsers, error: authError } = await supabaseAdmin
    .from('auth.users')
    .select('*')
  
  if (authError) {
    console.error('Error fetching auth users:', authError)
    return
  }
  
  console.log('Auth Users:', authUsers)

  // Check public users
  const { data: publicUsers, error: publicError } = await supabaseAdmin
    .from('users')
    .select('*')
  
  if (publicError) {
    console.error('Error fetching public users:', publicError)
    return
  }
  
  console.log('Public Users:', publicUsers)

  // Try to sign in with a test user
  const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email: 'john@example.com',
    password: 'asdf'
  })

  if (signInError) {
    console.error('Test sign in failed:', signInError)
  } else {
    console.log('Test sign in successful:', signInData)
  }
}

verifyUsers() 