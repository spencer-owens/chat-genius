'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause } from 'lucide-react'
import { getSupabase } from '../auth'

interface VoiceMessageProps {
  fileName: string
  bucket: string
  path: string
  duration: number
}

export default function VoiceMessage({ bucket, path, duration: initialDuration }: VoiceMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(initialDuration || 0)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)

  useEffect(() => {
    const fetchSignedUrl = async () => {
      try {
        const supabase = getSupabase()
        const { data, error } = await supabase
          .storage
          .from(bucket)
          .createSignedUrl(path, 3600) // 1 hour expiry

        if (error) throw error
        if (data) {
          setSignedUrl(data.signedUrl)
        }
      } catch (error) {
        setIsLoading(false)
      }
    }

    fetchSignedUrl()
  }, [bucket, path])

  useEffect(() => {
    if (!signedUrl) return

    const audio = new Audio()
    audioRef.current = audio

    const handleLoadedMetadata = () => {
      setIsLoading(false)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    const handleError = (e: ErrorEvent) => {
      setIsLoading(false)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    audio.src = signedUrl

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.pause()
      audio.src = ''
    }
  }, [signedUrl, duration])

  const togglePlayPause = async () => {
    if (!audioRef.current) return

    try {
      if (isPlaying) {
        await audioRef.current.pause()
      } else {
        await audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    } catch (error) {
      // Error handled by error event listener
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progress = (currentTime / duration) * 100 || 0

  return (
    <div className="flex items-center gap-2 p-2 bg-muted rounded-md max-w-[300px]">
      <Button
        onClick={togglePlayPause}
        variant="ghost"
        size="icon"
        className="w-8 h-8"
        disabled={isLoading || !signedUrl}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
      <div className="flex-1">
        <div className="text-xs text-muted-foreground mb-1">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
        <div className="h-1 bg-secondary rounded-full">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
} 