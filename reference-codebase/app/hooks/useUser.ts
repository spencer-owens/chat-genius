import { create } from 'zustand'
import { getSupabase } from '../auth'

interface UserState {
  user: any | null
  loading: boolean
  error: Error | null
  fetchUser: () => Promise<void>
}

export const useUser = create<UserState>((set) => ({
  user: null,
  loading: true,
  error: null,
  fetchUser: async () => {
    try {
      const supabase = getSupabase()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) throw error
      
      if (user) {
        // Fetch additional user data from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, display_name, native_language')
          .eq('id', user.id)
          .single()
          
        if (userError) throw userError
        
        set({ user: { ...user, ...userData }, loading: false, error: null })
      } else {
        set({ user: null, loading: false, error: null })
      }
    } catch (error) {
      set({ error, loading: false })
    }
  }
})) 