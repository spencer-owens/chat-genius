import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Volume2 } from 'lucide-react'
import { getSupabase } from '../auth'

interface TTSPlayerProps {
  contentType: 'post' | 'message' | 'post_thread_comment' | 'conversation_thread_comment'
  contentId: string
}

export default function TTSPlayer({ contentType, contentId }: TTSPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const fetchTTSUrl = async () => {
      try {
        const supabase = getSupabase()
        
        // First, get the TTS recording record
        const { data: ttsRecord, error: ttsError } = await supabase
          .from('tts_recordings')
          .select('storage_path, status')
          .eq(`${contentType}_id`, contentId)
          .single()

        if (ttsError || !ttsRecord || ttsRecord.status !== 'completed') {
          setIsLoading(false)
          return
        }

        // Then get a signed URL for the audio file
        const { data, error } = await supabase
          .storage
          .from('tts_recordings')
          .createSignedUrl(ttsRecord.storage_path, 3600) // 1 hour expiry

        if (error) throw error
        if (data) {
          setSignedUrl(data.signedUrl)
        }
      } catch (error) {
        setIsLoading(false)
      }
    }

    fetchTTSUrl()
  }, [contentType, contentId])

  useEffect(() => {
    if (!signedUrl) return

    const audio = new Audio()
    audioRef.current = audio

    const handleLoadedMetadata = () => {
      setIsLoading(false)
    }

    const handleEnded = () => {
      setIsPlaying(false)
    }

    const handleError = () => {
      setIsLoading(false)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    audio.src = signedUrl

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.pause()
      audio.src = ''
    }
  }, [signedUrl])

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

  if (isLoading || !signedUrl) return null

  return (
    <Button
      onClick={togglePlayPause}
      variant="ghost"
      size="icon"
      className="w-8 h-8 text-muted-foreground hover:text-foreground"
      title="Play TTS"
    >
      <Volume2 className="h-4 w-4" />
    </Button>
  )
} 