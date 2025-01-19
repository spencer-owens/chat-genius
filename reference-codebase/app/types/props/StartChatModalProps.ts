export interface StartChatModalProps {
  isOpen: boolean
  onClose: () => void
  preselectedUserId?: string
  customHeader?: string
  showStartChatAnimation?: boolean
} 