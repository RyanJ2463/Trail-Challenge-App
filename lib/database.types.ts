// Generated from the live project (utyzijecjdyiaskmrbsa) via:
//   npx supabase gen types typescript --linked > lib/database.types.ts
// Regenerate after every migration rather than hand-editing.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      challenge_invites: {
        Row: {
          challenge_id: number
          created_at: string
          invitee_id: string
          inviter_id: string
          status: string
        }
        Insert: {
          challenge_id: number
          created_at?: string
          invitee_id: string
          inviter_id: string
          status?: string
        }
        Update: {
          challenge_id?: number
          created_at?: string
          invitee_id?: string
          inviter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_invites_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_invites_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participants: {
        Row: {
          challenge_id: number
          joined_at: string
          user_id: string
        }
        Insert: {
          challenge_id: number
          joined_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: number
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_progress: {
        Row: {
          challenge_id: number
          cumulative_miles: number
          current_trail_point_id: number | null
          last_computed_at: string
          user_id: string
        }
        Insert: {
          challenge_id: number
          cumulative_miles?: number
          current_trail_point_id?: number | null
          last_computed_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: number
          cumulative_miles?: number
          current_trail_point_id?: number | null
          last_computed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_progress_current_trail_point_id_fkey"
            columns: ["current_trail_point_id"]
            isOneToOne: false
            referencedRelation: "trail_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          activity_type: string
          created_at: string
          created_by: string
          end_date: string | null
          id: number
          is_public: boolean
          name: string
          start_date: string
          trail_id: number | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          created_by: string
          end_date?: string | null
          id?: number
          is_public?: boolean
          name: string
          start_date: string
          trail_id?: number | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          created_by?: string
          end_date?: string | null
          id?: number
          is_public?: boolean
          name?: string
          start_date?: string
          trail_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "challenges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "trails"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_activity: {
        Row: {
          activity_date: string
          distance_miles: number
          id: number
          source: string
          steps: number | null
          synced_at: string
          user_id: string
        }
        Insert: {
          activity_date: string
          distance_miles: number
          id?: number
          source: string
          steps?: number | null
          synced_at?: string
          user_id: string
        }
        Update: {
          activity_date?: string
          distance_miles?: number
          id?: number
          source?: string
          steps?: number | null
          synced_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          requester_id: string
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          requester_id: string
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_points: {
        Row: {
          cumulative_distance_miles: number
          id: number
          label: string | null
          latitude: number
          longitude: number
          sequence: number
          trail_id: number
        }
        Insert: {
          cumulative_distance_miles: number
          id?: number
          label?: string | null
          latitude: number
          longitude: number
          sequence: number
          trail_id: number
        }
        Update: {
          cumulative_distance_miles?: number
          id?: number
          label?: string | null
          latitude?: number
          longitude?: number
          sequence?: number
          trail_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "trail_points_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "trails"
            referencedColumns: ["id"]
          },
        ]
      }
      trails: {
        Row: {
          created_at: string
          description: string | null
          id: number
          name: string
          total_distance_miles: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          name: string
          total_distance_miles: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          name?: string
          total_distance_miles?: number
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          email: string
          id: string
          profile_visibility: string
          show_lifetime_miles: boolean
          show_lifetime_steps: boolean
          show_monthly_stats: boolean
          show_records: boolean
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          email: string
          id: string
          profile_visibility?: string
          show_lifetime_miles?: boolean
          show_lifetime_steps?: boolean
          show_monthly_stats?: boolean
          show_records?: boolean
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          profile_visibility?: string
          show_lifetime_miles?: boolean
          show_lifetime_steps?: boolean
          show_monthly_stats?: boolean
          show_records?: boolean
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_challenge: {
        Args: { p_challenge_id: number; p_user_id: string }
        Returns: boolean
      }
      delete_own_account: { Args: never; Returns: undefined }
      friends_weekly_leaderboard: {
        Args: never
        Returns: {
          display_name: string
          total_miles: number
          user_id: string
          username: string
        }[]
      }
      get_profile: {
        Args: { p_user_id: string }
        Returns: {
          avatar_url: string
          best_day_date: string
          best_day_miles: number
          best_month: string
          best_month_miles: number
          best_week_miles: number
          best_week_start: string
          current_month_miles: number
          current_month_steps: number
          display_name: string
          is_owner: boolean
          lifetime_miles: number
          lifetime_steps: number
          profile_visibility: string
          show_lifetime_miles: boolean
          show_lifetime_steps: boolean
          show_monthly_stats: boolean
          show_records: boolean
          user_id: string
          username: string
        }[]
      }
      weekly_leaderboard: {
        Args: never
        Returns: {
          display_name: string
          total_miles: number
          user_id: string
          username: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
