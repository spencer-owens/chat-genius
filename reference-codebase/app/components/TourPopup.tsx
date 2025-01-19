import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TourPopupProps } from '@/app/types/props/TourPopupProps'

export function TourPopup({ 
  title, 
  content, 
  onClose, 
  position = 'top-left',
  onNext,
  isLastStep = false,
  currentStep,
  totalSteps
}: TourPopupProps) {
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'center-right': 'top-1/2 right-4 -translate-y-1/2'
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50 bg-white rounded-lg shadow-lg p-4 max-w-sm border border-gray-200`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg text-black">{title}</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-gray-600 text-sm">{content}</p>
      <div className="mt-4 flex justify-between items-center">
        {currentStep && totalSteps && (
          <span className="text-xs text-gray-500">
            Step {currentStep} of {totalSteps}
          </span>
        )}
        <div className="flex gap-2 ml-auto">
          <Button size="sm" onClick={isLastStep ? onClose : onNext}>
            {isLastStep ? 'Got it' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  )
} 