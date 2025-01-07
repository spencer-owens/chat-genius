'use client'

// ... other imports

export default function ChannelPage({ params }: { params: { channelId: string } }) {
  const { messages, loading, sendMessage } = useMessages(params.channelId)
  
  const handleSendMessage = async (content: string) => {
    await sendMessage(content)
  }

  return (
    <Layout>
      {/* ... other JSX ... */}
      <MessageInput
        onSend={handleSendMessage}
        onFileUpload={() => {}}
      />
      {/* ... other JSX ... */}
    </Layout>
  )
} 