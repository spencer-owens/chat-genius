import { Status } from './status'

interface BaseMessage {
  id: string
  content: string
  created_at: string
  thread_id?: string
  file?: {
    id: string
    url: string
    name: string
    type: string
    size: number
  }
}

export interface ChannelMessage extends BaseMessage {
  type: 'channel'
  channel_id: string
  sender: {
    id: string
    username: string
    status: Status
    profile_picture?: string
  }
  reactions: Array<{
    emoji: string
    user_id: string
  }>
  reply_count: number
}

export interface DirectMessage extends BaseMessage {
  type: 'dm'
  sender_id: string
  receiver_id: string
  sender: {
    username: string
    status: Status
    profile_picture?: string
  }
}

export type Message = ChannelMessage | DirectMessage 