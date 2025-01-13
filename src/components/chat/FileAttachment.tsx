import { FileIcon, Download } from 'lucide-react'
import { useState, useEffect } from 'react'
import * as pdfjs from 'pdfjs-dist'

// Initialize PDF.js worker with standard fonts
if (typeof window !== 'undefined') {
  const workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString()
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc
}

interface FileAttachmentProps {
  name: string
  type: string
  size: number
  url: string
}

export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}

export function FileAttachment({ name, type, size, url }: FileAttachmentProps) {
  const isImage = type.startsWith('image/')
  const isPDF = type === 'application/pdf'
  const fileSize = formatFileSize(size)
  const [previewUrl, setPreviewUrl] = useState<string | null>(isImage ? url : null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(isPDF)

  // Load PDF thumbnail
  useEffect(() => {
    if (!isPDF) return
    
    let isMounted = true
    setIsPreviewLoading(true)

    const loadPdfThumbnail = async () => {
      try {
        // Wait for worker to be ready
        await new Promise(resolve => {
          if (pdfjs.GlobalWorkerOptions.workerSrc) {
            resolve(true)
          } else {
            const checkWorker = setInterval(() => {
              if (pdfjs.GlobalWorkerOptions.workerSrc) {
                clearInterval(checkWorker)
                resolve(true)
              }
            }, 50)
          }
        })

        const response = await fetch(url)
        const arrayBuffer = await response.arrayBuffer()
        
        const loadingTask = pdfjs.getDocument({
          data: arrayBuffer,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/standard_fonts/'
        })
        const pdf = await loadingTask.promise
        const page = await pdf.getPage(1)
        
        const viewport = page.getViewport({ scale: 0.5 })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        
        if (!context || !isMounted) return
        
        canvas.height = viewport.height
        canvas.width = viewport.width
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise
        
        if (isMounted) {
          setPreviewUrl(canvas.toDataURL())
        }
      } catch (error) {
        console.error('Error generating PDF thumbnail:', error)
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