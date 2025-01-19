import { Post } from '../post'

export interface PostItemProps {
  post: Post
  onPostUpdate: (post: Post) => void
  onThreadOpen: (post: Post) => void
} 