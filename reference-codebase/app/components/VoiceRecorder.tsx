'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, Square, X } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void
  onCancel: () => void
}

export default function VoiceRecorder({ onRecordingComplete, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const { toast } = useToast()
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    // Cleanup function to stop recording if component unmounts while recording
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop()
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [isRecording, audioUrl])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      startTimeRef.current = Date.now()

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' })
        setAudioBlob(audioBlob)
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error accessing microphone:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not access microphone. Please check your browser permissions."
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleSend = () => {
    if (audioBlob && startTimeRef.current) {
      const duration = (Date.now() - startTimeRef.current) / 1000
      onRecordingComplete(audioBlob, duration)
      // Clean up
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
      setAudioBlob(null)
      setAudioUrl(null)
    }
  }

  const handleCancel = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioBlob(null)
    setAudioUrl(null)
    onCancel()
  }

  return (
    <div className="flex flex-col gap-2 p-4 bg-muted rounded-md">
      <div className="flex items-center gap-2">
        {!isRecording && !audioUrl && (
          <Button
            onClick={startRecording}
            variant="outline"
            size="icon"
            className="w-10 h-10"
          >
            <Mic className="h-4 w-4" />
          </Button>
        )}
        {isRecording && (
          <Button
            onClick={stopRecording}
            variant="destructive"
            size="icon"
            className="w-10 h-10"
          >
            <Square className="h-4 w-4" />
          </Button>
        )}
        {audioUrl && (
          <audio controls src={audioUrl} className="max-w-[200px]" />
        )}
        <Button
          onClick={handleCancel}
          variant="ghost"
          size="icon"
          className="w-8 h-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {audioUrl && (
        <Button onClick={handleSend} className="w-full">
          Send Voice Message
        </Button>
      )}
    </div>
  )
} 