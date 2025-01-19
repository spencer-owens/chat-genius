'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabase } from '../auth'
import { useUser } from '../hooks/useUser'
import { Button } from '@/components/ui/button'
import { themes, Theme } from '../config/themes'
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Input } from '@/components/ui/input'
import { toast } from 'react-hot-toast'
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { User } from '@supabase/supabase-js'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const THEME_STORAGE_KEY = 'slack-clone-theme'

interface ExtendedUser extends User {
  display_name?: string | null;
  native_language?: string | null;
}

interface Language {
  id: string;
  language: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<ExtendedUser | null>(null)
  const { user: currentUser } = useUser()
  const [selectedTheme, setSelectedTheme] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(THEME_STORAGE_KEY) || 'slate'
    }
    return 'slate'
  })
  const [displayName, setDisplayName] = useState<string>('')
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [languages, setLanguages] = useState<Language[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState<string>('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const tourStep = parseInt(searchParams.get('tourStep') || '0')

  useEffect(() => {
    fetchUser()
    fetchLanguages()
  }, [])

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, selectedTheme)
  }, [selectedTheme])

  const fetchLanguages = async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('top_languages')
      .select('*')
      .order('language')
    
    if (error) {
      console.error('Error fetching languages:', error)
      return
    }
    
    setLanguages(data)
  }

  const fetchUser = async () => {
    try {
      if (!currentUser) return;

      const supabase = getSupabase()
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single()

      if (userError) throw userError

      const extendedUser: ExtendedUser = {
        ...currentUser,
        display_name: userData.display_name,
        native_language: userData.native_language
      }

      setUser(extendedUser)
      setDisplayName(userData.display_name || '')
      setSelectedLanguage(userData.native_language || '')
      
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('profile_pic_url')
          .eq('id', currentUser.id)
          .maybeSingle()
        
        setProfilePicUrl(data?.profile_pic_url || null)
      } catch (error) {
        // Silently handle the error - profile pic not found is an expected case
        setProfilePicUrl(null)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      toast.error('Failed to load user data')
    }
  }

  const handleProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentUser = user
    if (!currentUser?.id) return

    try {
      if (!e.target.files || !e.target.files[0]) return;

      const file = e.target.files[0]
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file')
        return
      }

      setUploading(true)
      const supabase = getSupabase()
      
      // Upload the file
      const fileExt = file.name.split('.').pop()
      const filePath = `${currentUser.id}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('profile-pics')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get the public URL using the newer method
      const {
        data: { publicUrl },
      } = supabase.storage
        .from('profile-pics')
        .getPublicUrl(filePath)

      // Update the profile with the public URL
      const { error: updateError } = await supabase
        .from('user_profiles')
        .upsert({
          id: currentUser.id,
          profile_pic_url: publicUrl
        })

      if (updateError) throw updateError

      setProfilePicUrl(publicUrl)
      toast.success('Profile picture updated successfully!')
    } catch (error) {
      console.error('Error uploading profile picture:', error)
      toast.error('Failed to update profile picture')
    } finally {
      setUploading(false)
    }
  }

  const handleLogout = async () => {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleThemeChange = (themeId: string) => {
    setSelectedTheme(themeId)
    setTimeout(() => {
      window.location.reload()
    }, 100)
  }

  const handleDisplayNameChange = async (e: React.FormEvent) => {
    e.preventDefault()
    const currentUser = user
    if (!currentUser?.id) return

    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('users')
        .update({ display_name: displayName })
        .eq('id', currentUser.id)

      if (error) throw error

      await fetchUser()
      toast.success('Display name updated successfully!')
    } catch (error) {
      console.error('Error updating display name:', error)
      toast.error('Failed to update display name')
    }
  }

  const handleLanguageChange = async (value: string) => {
    if (!user?.id) return
    
    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('users')
        .update({ native_language: value })
        .eq('id', user.id)

      if (error) throw error

      setSelectedLanguage(value)
      toast.success('Language preference updated successfully!')
    } catch (error) {
      console.error('Error updating language:', error)
      toast.error('Failed to update language preference')
    }
  }

  if (!user) return <div>Loading...</div>

  const initials = ((user.display_name || user.email) || '')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
      
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Profile Picture</h2>
        <div className="flex items-center gap-4 mb-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profilePicUrl || undefined} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <Input
              type="file"
              accept="image/*"
              onChange={handleProfilePicUpload}
              disabled={uploading}
              className="mb-2"
            />
            <p className="text-sm text-gray-500">
              Recommended: Square image, at least 400x400 pixels
            </p>
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-2">User Information</h2>
        <form onSubmit={handleDisplayNameChange}>
          <div className="mb-4">
            <Label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
              Display Name
            </Label>
            <div className="flex gap-2">
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={user?.display_name || "Enter display name"}
                className={`${
                  tourStep === 4 ? 'ring-4 ring-offset-2 ring-blue-500 ring-offset-background animate-slow-pulse' : ''
                } transition-all duration-300`}
              />
              <Button type="submit" size="sm">
                Update Name
              </Button>
            </div>
          </div>
          <div className="mb-4">
            <Label htmlFor="language">Preferred Language</Label>
            <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
              <SelectTrigger 
                className={`w-full ${
                  tourStep === 4 ? 'ring-4 ring-offset-2 ring-blue-500 ring-offset-background animate-slow-pulse' : ''
                } transition-all duration-300`}
              >
                <SelectValue placeholder={languages.find(lang => lang.id === user?.native_language)?.language || "Select a language"} />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.id} value={lang.id}>
                    {lang.language}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </form>
        <p className="text-gray-600 dark:text-gray-300 mt-4">
          Email: {user.email}
        </p>
      </Card>

      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Sidebar Theme</h2>
        <RadioGroup
          value={selectedTheme}
          onValueChange={handleThemeChange}
          className="grid grid-cols-2 gap-4 md:grid-cols-3"
        >
          {themes.map((theme) => (
            <div key={theme.id} className="relative">
              <RadioGroupItem
                value={theme.id}
                id={theme.id}
                className="peer sr-only"
              />
              <Label
                htmlFor={theme.id}
                className={`
                  flex flex-col items-center justify-center rounded-lg border-2 border-muted
                  p-4 hover:bg-accent hover:text-accent-foreground
                  peer-data-[state=checked]:border-primary peer-data-[state=checked]:scale-105
                  peer-data-[state=checked]:shadow-lg peer-data-[state=checked]:border-4
                  ${theme.colors.background} ${theme.colors.foreground}
                  cursor-pointer transition-all
                `}
              >
                <span className="mt-2">{theme.name}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </Card>

      <Button onClick={handleLogout} variant="destructive">
        Logout
      </Button>
    </div>
  )
}

