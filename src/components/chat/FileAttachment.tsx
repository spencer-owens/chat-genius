import { FileIcon, Download } from 'lucide-react'

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
  const fileSize = formatFileSize(size)

  return (
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
  )
} 