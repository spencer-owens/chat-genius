interface ChannelMetadataProps {
  channel: {
    id: string
    name: string
    description?: string
    is_private: boolean
    memberships: Array<{ user_id: string }>
    last_message?: {
      content: string
      created_at: string
      sender: {
        username: string
      }
    }
  }
}

export function ChannelMetadata({ channel }: ChannelMetadataProps) {
  return (
    <div className="text-xs text-gray-400 mt-1">
      <div className="flex items-center space-x-2">
        <span>{channel.memberships.length} members</span>
        {channel.last_message && (
          <>
            <span>•</span>
            <span>
              Last message by {channel.last_message.sender.username}
            </span>
          </>
        )}
      </div>
      {channel.description && (
        <p className="mt-1 line-clamp-1">{channel.description}</p>
      )}
    </div>
  )
} 