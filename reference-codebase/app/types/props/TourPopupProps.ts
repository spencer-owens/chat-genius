export interface TourPopupProps {
  title: string
  content: string
  onClose: () => void
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'center-right'
  onNext?: () => void
  isLastStep?: boolean
  currentStep?: number
  totalSteps?: number
} 