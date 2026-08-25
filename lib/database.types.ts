// Hand-written to match supabase/migrations/20260825034028_initial_schema.sql.
// Once a real Supabase project exists and is linked, regenerate this file with
// `npx supabase gen types typescript --linked > lib/database.types.ts` and treat
// that as the source of truth going forward.

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          email: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          email: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string;
          email?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'users_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      daily_activity: {
        Row: {
          id: number;
          user_id: string;
          activity_date: string;
          steps: number | null;
          distance_miles: number;
          source: string;
          synced_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          activity_date: string;
          steps?: number | null;
          distance_miles: number;
          source: string;
          synced_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          activity_date?: string;
          steps?: number | null;
          distance_miles?: number;
          source?: string;
          synced_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'daily_activity_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      trails: {
        Row: {
          id: number;
          name: string;
          total_distance_miles: number;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          total_distance_miles: number;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          total_distance_miles?: number;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      trail_points: {
        Row: {
          id: number;
          trail_id: number;
          sequence: number;
          latitude: number;
          longitude: number;
          cumulative_distance_miles: number;
          label: string | null;
        };
        Insert: {
          id?: number;
          trail_id: number;
          sequence: number;
          latitude: number;
          longitude: number;
          cumulative_distance_miles: number;
          label?: string | null;
        };
        Update: {
          id?: number;
          trail_id?: number;
          sequence?: number;
          latitude?: number;
          longitude?: number;
          cumulative_distance_miles?: number;
          label?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'trail_points_trail_id_fkey';
            columns: ['trail_id'];
            isOneToOne: false;
            referencedRelation: 'trails';
            referencedColumns: ['id'];
          },
        ];
      };
      challenges: {
        Row: {
          id: number;
          trail_id: number;
          name: string;
          created_by: string;
          start_date: string;
          end_date: string | null;
          is_public: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          trail_id: number;
          name: string;
          created_by: string;
          start_date: string;
          end_date?: string | null;
          is_public?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          trail_id?: number;
          name?: string;
          created_by?: string;
          start_date?: string;
          end_date?: string | null;
          is_public?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'challenges_trail_id_fkey';
            columns: ['trail_id'];
            isOneToOne: false;
            referencedRelation: 'trails';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'challenges_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      challenge_participants: {
        Row: {
          challenge_id: number;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          challenge_id: number;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          challenge_id?: number;
          user_id?: string;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'challenge_participants_challenge_id_fkey';
            columns: ['challenge_id'];
            isOneToOne: false;
            referencedRelation: 'challenges';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'challenge_participants_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      challenge_progress: {
        Row: {
          challenge_id: number;
          user_id: string;
          cumulative_miles: number;
          current_trail_point_id: number | null;
          last_computed_at: string;
        };
        Insert: {
          challenge_id: number;
          user_id: string;
          cumulative_miles?: number;
          current_trail_point_id?: number | null;
          last_computed_at?: string;
        };
        Update: {
          challenge_id?: number;
          user_id?: string;
          cumulative_miles?: number;
          current_trail_point_id?: number | null;
          last_computed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'challenge_progress_challenge_id_fkey';
            columns: ['challenge_id'];
            isOneToOne: false;
            referencedRelation: 'challenges';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'challenge_progress_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'challenge_progress_current_trail_point_id_fkey';
            columns: ['current_trail_point_id'];
            isOneToOne: false;
            referencedRelation: 'trail_points';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
