import { useEffect, useState } from 'react'
import { Download, FileIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import useStore from '@/store'

interface FileAttachmentProps {
  fileId: string
}

export function FileAttachment({ fileId }: FileAttachmentProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const { messagesByChannel } = useStore()
  const supabase = createClient()

  // Find the file metadata from messages
  const file = Object.values(messagesByChannel)
    .flat()
    .find(msg => msg.file?.id === fileId)?.file

  if (!file) {
    return null
  }

  const { name, type, size, url } = file
  const isPDF = type === 'application/pdf'
  const fileSize = size < 1024 * 1024 
    ? `${Math.round(size / 1024)} KB`
    : `${Math.round(size / (1024 * 1024))} MB`

  useEffect(() => {
    if (!isPDF) return
    
    let isMounted = true
    setIsPreviewLoading(true)

    const loadPdfThumbnail = async () => {
      try {
        const response = await fetch(url)
        const blob = await response.blob()
        const pdfjs = await import('pdfjs-dist')
        
        // Configure worker
        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

        const pdf = await pdfjs.getDocument(URL.createObjectURL(blob)).promise
        const page = await pdf.getPage(1)
        const viewport = page.getViewport({ scale: 1.5 })

        // Create canvas
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.height = viewport.height
        canvas.width = viewport.width

        if (!context) {
          throw new Error('Could not get canvas context')
        }

        // Render PDF page to canvas
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise

        if (isMounted) {
          setPreviewUrl(canvas.toDataURL())
          setIsPreviewLoading(false)
        }
      } catch (error) {
        console.error('Error generating PDF thumbnail:', error)
        toast.error('Failed to generate PDF preview')
      } finally {
        if (isMounted) {
          setIsPreviewLoading(false)
        }
      }
    }

    loadPdfThumbnail()
    return () => { isMounted = false }
  }, [url, isPDF])

  return (
    <div className="space-y-2">
      {/* Preview Section - Only rendered if preview is available */}
      {previewUrl && !isPreviewLoading && (
        <a
          href={url}
          download={name}
          target="_blank"
          rel="noopener noreferrer"
          className="block max-w-sm overflow-hidden rounded-md border border-gray-700"
        >
          <img 
            src={previewUrl} 
            alt={`${name} preview`}
            className={`w-full h-auto max-h-48 object-contain ${isPDF ? 'bg-white' : ''}`}
          />
        </a>
      )}

      {/* File Info Section - Always Rendered */}
      <div className="flex items-center space-x-2 p-2 bg-gray-700/50 rounded-md max-w-sm">
        <div className="flex-shrink-0">
          <FileIcon className="h-8 w-8 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {name}
          </p>
          <p className="text-xs text-gray-400">
            {fileSize}
          </p>
        </div>
        <a
          href={url}
          download={name}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-gray-600"
        >
          <Download className="h-4 w-4" />
        </a>
      </div>
    </div>
  )
} 