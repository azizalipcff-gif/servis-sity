export type UserRole = "client" | "owner" | "admin";
export type PlanType = "free" | "premium" | "pro";
export type BookingStatus = "pending" | "confirmed" | "cancelled";
export type BusinessStatus = "pending_review" | "approved" | "rejected" | "suspended";
export type VerificationStatus = "none" | "pending" | "verified" | "rejected";
export type MediaType = "image" | "video";
export type ReportStatus = "open" | "reviewed" | "resolved";
export type AnalyticsEventType =
  | "view"
  | "whatsapp_click"
  | "call_click"
  | "lead"
  | "photo_view";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string | null;
          phone: string | null;
          city: string | null;
          banned: boolean;
          suspended: boolean;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          full_name?: string | null;
          phone?: string | null;
          city?: string | null;
          banned?: boolean;
          suspended?: boolean;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          role?: UserRole;
          full_name?: string | null;
          phone?: string | null;
          city?: string | null;
          banned?: boolean;
          suspended?: boolean;
          avatar_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          slug: string;
          icon: string | null;
          image_url: string | null;
          name_ar: string;
          name_fr: string;
          name_en: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          icon?: string | null;
          image_url?: string | null;
          name_ar: string;
          name_fr: string;
          name_en: string;
          created_at?: string;
        };
        Update: {
          slug?: string;
          icon?: string | null;
          image_url?: string | null;
          name_ar?: string;
          name_fr?: string;
          name_en?: string;
        };
        Relationships: [];
      };
      cities: {
        Row: {
          id: string;
          slug: string;
          name_ar: string;
          name_fr: string;
          name_en: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name_ar: string;
          name_fr: string;
          name_en: string;
          created_at?: string;
        };
        Update: {
          slug?: string;
          name_ar?: string;
          name_fr?: string;
          name_en?: string;
        };
        Relationships: [];
      };
      businesses: {
        Row: {
          id: string;
          owner_id: string;
          category_id: string;
          city_id: string | null;
          slug: string;
          name: string;
          description: string | null;
          logo_url: string | null;
          cover_url: string | null;
          phone: string | null;
          whatsapp: string | null;
          address: string | null;
          city: string | null;
          lat: number | null;
          lng: number | null;
          plan: PlanType;
          status: BusinessStatus;
          status_note: string | null;
          verification_status: VerificationStatus;
          verified_at: string | null;
          verified: boolean;
          rating_avg: number;
          reviews_count: number;
          profile_completeness: number;
          last_updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          category_id: string;
          city_id?: string | null;
          slug: string;
          name: string;
          description?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          address?: string | null;
          city?: string | null;
          lat?: number | null;
          lng?: number | null;
          plan?: PlanType;
          status?: BusinessStatus;
          status_note?: string | null;
          verification_status?: VerificationStatus;
          verified_at?: string | null;
          verified?: boolean;
          rating_avg?: number;
          reviews_count?: number;
          profile_completeness?: number;
          last_updated_at?: string;
          created_at?: string;
        };
        Update: {
          owner_id?: string;
          category_id?: string;
          city_id?: string | null;
          slug?: string;
          name?: string;
          description?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          address?: string | null;
          city?: string | null;
          lat?: number | null;
          lng?: number | null;
          plan?: PlanType;
          status?: BusinessStatus;
          status_note?: string | null;
          verification_status?: VerificationStatus;
          verified_at?: string | null;
          verified?: boolean;
          rating_avg?: number;
          reviews_count?: number;
          profile_completeness?: number;
          last_updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "businesses_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "businesses_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "businesses_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          price: number | null;
          description: string | null;
          photo_url: string | null;
          duration_minutes: number | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          price?: number | null;
          description?: string | null;
          photo_url?: string | null;
          duration_minutes?: number | null;
        };
        Update: {
          name?: string;
          price?: number | null;
          description?: string | null;
          photo_url?: string | null;
          duration_minutes?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      business_hours: {
        Row: {
          id: string;
          business_id: string;
          day_of_week: number;
          open_time: string | null;
          close_time: string | null;
          is_closed: boolean;
        };
        Insert: {
          id?: string;
          business_id: string;
          day_of_week: number;
          open_time?: string | null;
          close_time?: string | null;
          is_closed?: boolean;
        };
        Update: {
          day_of_week?: number;
          open_time?: string | null;
          close_time?: string | null;
          is_closed?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "business_hours_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      media: {
        Row: {
          id: string;
          business_id: string;
          type: MediaType;
          url: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          business_id: string;
          type: MediaType;
          url: string;
          sort_order?: number;
        };
        Update: {
          type?: MediaType;
          url?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "media_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          rating: number;
          comment: string | null;
          reply: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          rating: number;
          comment?: string | null;
          reply?: string | null;
          created_at?: string;
        };
        Update: {
          rating?: number;
          comment?: string | null;
          reply?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          id: string;
          business_id: string;
          service_id: string | null;
          client_name: string;
          client_phone: string;
          booking_date: string;
          booking_time: string;
          status: BookingStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          service_id?: string | null;
          client_name: string;
          client_phone: string;
          booking_date: string;
          booking_time: string;
          status?: BookingStatus;
          created_at?: string;
        };
        Update: {
          service_id?: string | null;
          client_name?: string;
          client_phone?: string;
          booking_date?: string;
          booking_time?: string;
          status?: BookingStatus;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          business_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favorites_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          business_id: string;
          reason: string | null;
          status: ReportStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          business_id: string;
          reason?: string | null;
          status?: ReportStatus;
          created_at?: string;
        };
        Update: {
          status?: ReportStatus;
        };
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      verification_requests: {
        Row: {
          id: string;
          business_id: string;
          id_document_url: string | null;
          activity_document_url: string | null;
          status: VerificationStatus;
          admin_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          id_document_url?: string | null;
          activity_document_url?: string | null;
          status?: VerificationStatus;
          admin_note?: string | null;
          created_at?: string;
        };
        Update: {
          status?: VerificationStatus;
          admin_note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "verification_requests_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          business_id: string;
          plan: PlanType;
          stripe_subscription_id: string | null;
          status: string | null;
          started_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          plan: PlanType;
          stripe_subscription_id?: string | null;
          status?: string | null;
          started_at?: string;
          expires_at?: string | null;
        };
        Update: {
          plan?: PlanType;
          stripe_subscription_id?: string | null;
          status?: string | null;
          expires_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      analytics_events: {
        Row: {
          id: string;
          business_id: string;
          event_type: AnalyticsEventType;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          event_type: AnalyticsEventType;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "analytics_events_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string;
          action: string;
          target_type: string | null;
          target_id: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id: string;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string;
          action?: string;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      system_logs: {
        Row: {
          id: string;
          context: string | null;
          level: string;
          message: string;
          stack: string | null;
          meta: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          context?: string | null;
          level?: string;
          message?: string;
          stack?: string | null;
          meta?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          context?: string | null;
          level?: string;
          message?: string;
          stack?: string | null;
          meta?: Record<string, unknown> | null;
          created_at?: string;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: {
          key: string;
          hits: number;
          reset_at: string;
        };
        Insert: {
          key: string;
          hits?: number;
          reset_at?: string;
        };
        Update: {
          key?: string;
          hits?: number;
          reset_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      plan_type: PlanType;
      booking_status: BookingStatus;
      business_status: BusinessStatus;
      verification_status: VerificationStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Business = Database["public"]["Tables"]["businesses"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type City = Database["public"]["Tables"]["cities"]["Row"];
export type Service = Database["public"]["Tables"]["services"]["Row"];
export type BusinessHour = Database["public"]["Tables"]["business_hours"]["Row"];
export type MediaItem = Database["public"]["Tables"]["media"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Favorite = Database["public"]["Tables"]["favorites"]["Row"];
export type Report = Database["public"]["Tables"]["reports"]["Row"];
export type VerificationRequest =
  Database["public"]["Tables"]["verification_requests"]["Row"];
