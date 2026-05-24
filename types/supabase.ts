export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          notify_days_before: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          notify_days_before?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          notify_days_before?: number;
          updated_at?: string;
        };
      };
      fridges: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string;
          created_at?: string;
        };
        Update: {
          name?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          icon: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          icon?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          icon?: string | null;
        };
      };
      zone_types: {
        Row: {
          id: string;
          name: string;
          position: number;
        };
        Insert: {
          id?: string;
          name: string;
          position?: number;
        };
        Update: {
          name?: string;
          position?: number;
        };
      };
      fridge_zones: {
        Row: {
          id: string;
          fridge_id: string;
          zone_type_id: string;
        };
        Insert: {
          id?: string;
          fridge_id: string;
          zone_type_id: string;
        };
        Update: {
          fridge_id?: string;
          zone_type_id?: string;
        };
      };
      measurement_units: {
        Row: {
          id: string;
          name: string;
          abbreviation: string;
        };
        Insert: {
          id?: string;
          name: string;
          abbreviation: string;
        };
        Update: {
          name?: string;
          abbreviation?: string;
        };
      };
      product_catalog: {
        Row: {
          id: string;
          name: string;
          category_id: string | null;
          zone_type_id: string | null;
          default_expiry_days: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category_id?: string | null;
          zone_type_id?: string | null;
          default_expiry_days?: number | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          category_id?: string | null;
          zone_type_id?: string | null;
          default_expiry_days?: number | null;
        };
      };
      storage_rules: {
        Row: {
          id: string;
          category_id: string | null;
          zone_type_id: string | null;
          rule_text: string;
          embedding: string | null;
          embedding_model_version: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id?: string | null;
          zone_type_id?: string | null;
          rule_text: string;
          embedding?: string | null;
          embedding_model_version?: string;
          created_at?: string;
        };
        Update: {
          category_id?: string | null;
          zone_type_id?: string | null;
          rule_text?: string;
          embedding?: string | null;
          embedding_model_version?: string;
        };
      };
      inventory_items: {
        Row: {
          id: string;
          user_id: string;
          fridge_id: string;
          name: string;
          category_id: string | null;
          zone_type_id: string | null;
          quantity: number;
          unit_id: string | null;
          expiry_date: string | null;
          added_at: string;
          updated_at: string;
          photo_url: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          fridge_id: string;
          name: string;
          category_id?: string | null;
          zone_type_id?: string | null;
          quantity?: number;
          unit_id?: string | null;
          expiry_date?: string | null;
          added_at?: string;
          updated_at?: string;
          photo_url?: string | null;
          notes?: string | null;
        };
        Update: {
          name?: string;
          category_id?: string | null;
          zone_type_id?: string | null;
          quantity?: number;
          unit_id?: string | null;
          expiry_date?: string | null;
          updated_at?: string;
          photo_url?: string | null;
          notes?: string | null;
        };
      };
      recipes: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          instructions: string;
          cooking_time_minutes: number | null;
          servings: number | null;
          embedding: string | null;
          embedding_model_version: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          instructions: string;
          cooking_time_minutes?: number | null;
          servings?: number | null;
          embedding?: string | null;
          embedding_model_version?: string;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          instructions?: string;
          cooking_time_minutes?: number | null;
          servings?: number | null;
          embedding?: string | null;
          embedding_model_version?: string;
        };
      };
      recipe_ingredients: {
        Row: {
          id: string;
          recipe_id: string;
          product_name: string;
          quantity: number | null;
          unit_id: string | null;
          is_optional: boolean;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          product_name: string;
          quantity?: number | null;
          unit_id?: string | null;
          is_optional?: boolean;
        };
        Update: {
          product_name?: string;
          quantity?: number | null;
          unit_id?: string | null;
          is_optional?: boolean;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      match_recipes: {
        Args: {
          query_embedding: string;
          match_count?: number;
        };
        Returns: {
          id: string;
          title: string;
          similarity: number;
        }[];
      };
      match_storage_rules: {
        Args: {
          query_embedding: string;
          match_count?: number;
        };
        Returns: {
          id: string;
          rule_text: string;
          zone_type_id: string;
          similarity: number;
        }[];
      };
    };
    Enums: Record<string, never>;
  };
}
