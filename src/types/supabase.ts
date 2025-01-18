export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      channels: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_private: boolean
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_private?: boolean
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_private?: boolean
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string | null
          file_id: string | null
          id: string
          receiver_id: string
          sender_id: string
          thread_id: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          file_id?: string | null
          id?: string
          receiver_id: string
          sender_id: string
          thread_id?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          file_id?: string | null
          id?: string
          receiver_id?: string
          sender_id?: string
          thread_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "file_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_last_read: {
        Row: {
          id: string
          last_read_at: string
          other_user_id: string
          user_id: string
        }
        Insert: {
          id?: string
          last_read_at?: string
          other_user_id: string
          user_id: string
        }
        Update: {
          id?: string
          last_read_at?: string
          other_user_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_last_read_other_user_id_fkey"
            columns: ["other_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_last_read_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      file_metadata: {
        Row: {
          bucket: string
          channel_id: string | null
          created_at: string | null
          dm_receiver_id: string | null
          id: string
          message_id: string | null
          name: string
          path: string
          size: number
          type: string
          user_id: string
        }
        Insert: {
          bucket: string
          channel_id?: string | null
          created_at?: string | null
          dm_receiver_id?: string | null
          id?: string
          message_id?: string | null
          name: string
          path: string
          size: number
          type: string
          user_id: string
        }
        Update: {
          bucket?: string
          channel_id?: string | null
          created_at?: string | null
          dm_receiver_id?: string | null
          id?: string
          message_id?: string | null
          name?: string
          path?: string
          size?: number
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_metadata_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          channel_id: string | null
          created_at: string | null
          id: string
          message_id: string | null
          name: string
          uploaded_by: string
          url: string
        }
        Insert: {
          channel_id?: string | null
          created_at?: string | null
          id?: string
          message_id?: string | null
          name: string
          uploaded_by: string
          url: string
        }
        Update: {
          channel_id?: string | null
          created_at?: string | null
          id?: string
          message_id?: string | null
          name?: string
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      last_read: {
        Row: {
          channel_id: string
          id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "last_read_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "last_read_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          channel_id: string
          id: string
          is_admin: boolean
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          is_admin?: boolean
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          is_admin?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          channel_id: string | null
          content: string
          created_at: string | null
          file_id: string | null
          id: string
          reply_count: number | null
          sender_id: string
          thread_id: string | null
          updated_at: string | null
        }
        Insert: {
          channel_id?: string | null
          content: string
          created_at?: string | null
          file_id?: string | null
          id?: string
          reply_count?: number | null
          sender_id: string
          thread_id?: string | null
          updated_at?: string | null
        }
        Update: {
          channel_id?: string | null
          content?: string
          created_at?: string | null
          file_id?: string | null
          id?: string
          reply_count?: number | null
          sender_id?: string
          thread_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "file_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          created_at: string | null
          emoji: Database["public"]["Enums"]["reaction_emoji"]
          id: string
          message_id: string
          message_type: Database["public"]["Enums"]["message_type"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: Database["public"]["Enums"]["reaction_emoji"]
          id?: string
          message_id: string
          message_type?: Database["public"]["Enums"]["message_type"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: Database["public"]["Enums"]["reaction_emoji"]
          id?: string
          message_id?: string
          message_type?: Database["public"]["Enums"]["message_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_status: {
        Row: {
          channel_id: string | null
          id: string
          last_typed_at: string | null
          user_id: string | null
        }
        Insert: {
          channel_id?: string | null
          id?: string
          last_typed_at?: string | null
          user_id?: string | null
        }
        Update: {
          channel_id?: string | null
          id?: string
          last_typed_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "typing_status_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_verified: boolean | null
          profile_picture: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_verified?: boolean | null
          profile_picture?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_verified?: boolean | null
          profile_picture?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      message_type: "channel" | "direct"
      reaction_emoji: "👍" | "❤️" | "😄" | "🎉" | "🤔" | "👀"
      user_status: "online" | "offline" | "away" | "busy"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
