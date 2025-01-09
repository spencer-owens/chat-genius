'use client'

import { Layout } from '@/components/layout/Layout'

export default function Home() {
  return (
    <Layout>
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Welcome to Chat Genius</h1>
          <p className="text-gray-400">Select a channel or start a direct message to begin chatting</p>
        </div>
      </div>
    </Layout>
  )
}
