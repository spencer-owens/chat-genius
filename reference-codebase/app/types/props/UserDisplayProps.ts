import type { User } from '../entities/User'

export interface UserDisplayProps {
  user: User
  showPresence?: boolean
  isOnline?: boolean
  className?: string
  sidebarColor?: string
} 