export type UserRole = "client" | "owner" | "admin";
export type PlanType = "free" | "premium" | "pro" | "enterprise";
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "accepted"
  | "rejected"
  | "completed"
  | "cancelled";
export type BusinessStatus = "pending_review" | "approved" | "rejected" | "suspended";
export type VerificationStatus = "none" | "pending" | "verified" | "rejected";
export type MediaType = "image" | "video";
export type ReportStatus = "open" | "reviewed" | "resolved";
export type AnalyticsEventType =
  | "view"
  | "whatsapp_click"
  | "call_click"
  | "lead"
  | "photo_view"
  | "booking_created";

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
          username: string | null;
          bio: string | null;
          cover_url: string | null;
          website: string | null;
          address: string | null;
          languages: string | null;
          skills: string | null;
          experience: string | null;
          facebook: string | null;
          instagram: string | null;
          tiktok: string | null;
          linkedin: string | null;
          whatsapp: string | null;
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
          username?: string | null;
          bio?: string | null;
          cover_url?: string | null;
          website?: string | null;
          address?: string | null;
          languages?: string | null;
          skills?: string | null;
          experience?: string | null;
          facebook?: string | null;
          instagram?: string | null;
          tiktok?: string | null;
          linkedin?: string | null;
          whatsapp?: string | null;
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
          username?: string | null;
          bio?: string | null;
          cover_url?: string | null;
          website?: string | null;
          address?: string | null;
          languages?: string | null;
          skills?: string | null;
          experience?: string | null;
          facebook?: string | null;
          instagram?: string | null;
          tiktok?: string | null;
          linkedin?: string | null;
          whatsapp?: string | null;
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
          parent_id: string | null;
          seo_title: string | null;
          seo_description: string | null;
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
          parent_id?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          name_ar: string;
          name_fr: string;
          name_en: string;
          created_at?: string;
        };
        Update: {
          slug?: string;
          icon?: string | null;
          image_url?: string | null;
          parent_id?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          name_ar?: string;
          name_fr?: string;
          name_en?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      cities: {
        Row: {
          id: string;
          slug: string;
          name_ar: string;
          name_fr: string;
          name_en: string;
          region: string | null;
          lat: number | null;
          lng: number | null;
          population: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name_ar: string;
          name_fr: string;
          name_en: string;
          region?: string | null;
          lat?: number | null;
          lng?: number | null;
          population?: number | null;
          created_at?: string;
        };
        Update: {
          slug?: string;
          name_ar?: string;
          name_fr?: string;
          name_en?: string;
          region?: string | null;
          lat?: number | null;
          lng?: number | null;
          population?: number | null;
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
          whatsapp_url: string | null;
          whatsapp_enabled: boolean;
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
          subcategory_id: string | null;
          email: string | null;
          website: string | null;
          facebook: string | null;
          instagram: string | null;
          tiktok: string | null;
          linkedin: string | null;
          languages: string | null;
          tags: string | null;
          keywords: string | null;
          service_area: string | null;
          google_maps_url: string | null;
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
          whatsapp_url?: string | null;
          whatsapp_enabled?: boolean;
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
          subcategory_id?: string | null;
          email?: string | null;
          website?: string | null;
          facebook?: string | null;
          instagram?: string | null;
          tiktok?: string | null;
          linkedin?: string | null;
          languages?: string | null;
          tags?: string | null;
          keywords?: string | null;
          service_area?: string | null;
          google_maps_url?: string | null;
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
          whatsapp_url?: string | null;
          whatsapp_enabled?: boolean;
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
          subcategory_id?: string | null;
          email?: string | null;
          website?: string | null;
          facebook?: string | null;
          instagram?: string | null;
          tiktok?: string | null;
          linkedin?: string | null;
          languages?: string | null;
          tags?: string | null;
          keywords?: string | null;
          service_area?: string | null;
          google_maps_url?: string | null;
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
          category_id: string | null;
          tags: string[];
          old_price: number | null;
          description: string | null;
          photo_url: string | null;
          duration_minutes: number | null;
          status: string;
          gallery: string[];
          featured: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
business_id: string;
            name: string;
            price?: number | null;
            category_id?: string | null;
            tags?: string[];
            old_price?: number | null;
            description?: string | null;
            photo_url?: string | null;
            duration_minutes?: number | null;
          status?: string;
          gallery?: string[];
          featured?: boolean;
          updated_at?: string;
        };
        Update: {
name?: string;
            price?: number | null;
            category_id?: string | null;
            tags?: string[];
            old_price?: number | null;
            description?: string | null;
            photo_url?: string | null;
            duration_minutes?: number | null;
          status?: string;
          gallery?: string[];
          featured?: boolean;
          updated_at?: string;
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
          notes: string | null;
          customer_id: string | null;
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
          notes?: string | null;
          customer_id?: string | null;
          created_at?: string;
        };
        Update: {
          service_id?: string | null;
          client_name?: string;
          client_phone?: string;
          booking_date?: string;
          booking_time?: string;
          status?: BookingStatus;
          notes?: string | null;
          customer_id?: string | null;
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
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_type: string;
          business_id: string | null;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_type: string;
          business_id?: string | null;
          user_id?: string | null;
          created_at?: string;
        };
        Update: {
          follower_id?: string;
          following_type?: string;
          business_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "follows_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follows_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follows_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      favorites: {
      Row: {
        id: string;
        user_id: string;
        business_id: string | null;
        service_id: string | null;
        product_id: string | null;
        item_type: string;
        created_at: string;
      };
      Insert: {
        id?: string;
        user_id: string;
        business_id?: string | null;
        service_id?: string | null;
        product_id?: string | null;
        item_type?: string;
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
        {
          foreignKeyName: "favorites_service_id_fkey";
          columns: ["service_id"];
          isOneToOne: false;
          referencedRelation: "services";
          referencedColumns: ["id"];
        },
        {
          foreignKeyName: "favorites_product_id_fkey";
          columns: ["product_id"];
          isOneToOne: false;
          referencedRelation: "products";
          referencedColumns: ["id"];
        },
      ];
    };
      products: {
        Row: {
          id: string;
          business_id: string;
          category_id: string | null;
          slug: string;
          name: string;
          description: string | null;
          price: number;
          compare_at_price: number | null;
          currency: string;
          stock: number;
          images: string[];
          status: string;
          featured: boolean;
          sku: string | null;
          tags: string[];
          views: number;
          seo_title: string | null;
          seo_description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          category_id?: string | null;
          slug: string;
          name: string;
          description?: string | null;
          price: number;
          compare_at_price?: number | null;
          currency?: string;
          stock?: number;
          images?: string[];
          status?: string;
          featured?: boolean;
          sku?: string | null;
          tags?: string[];
          views?: number;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          category_id?: string | null;
          slug?: string;
          name?: string;
          description?: string | null;
          price?: number;
          compare_at_price?: number | null;
          currency?: string;
          stock?: number;
          images?: string[];
          status?: string;
          featured?: boolean;
          sku?: string | null;
          tags?: string[];
          views?: number;
          seo_title?: string | null;
          seo_description?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      blocked_users: {
        Row: {
          user_id: string;
          blocked_user_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          blocked_user_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      conversation_members: {
        Row: {
          conversation_id: string;
          user_id: string;
          last_read_at: string;
          pinned_at: string | null;
          muted_until: string | null;
          archived_at: string | null;
          created_at: string;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
          last_read_at?: string;
          pinned_at?: string | null;
          muted_until?: string | null;
          archived_at?: string | null;
          created_at?: string;
        };
        Update: {
          last_read_at?: string;
          pinned_at?: string | null;
          muted_until?: string | null;
          archived_at?: string | null;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          type: string;
          business_id: string | null;
          title: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type?: string;
          business_id?: string | null;
          title?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          type?: string;
          business_id?: string | null;
          title?: string | null;
          created_by?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      message_attachments: {
        Row: {
          id: string;
          message_id: string | null;
          conversation_id: string;
          kind: string;
          url: string;
          name: string | null;
          size: number;
          mime: string | null;
          width: number | null;
          height: number | null;
          duration: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id?: string | null;
          conversation_id: string;
          kind: string;
          url: string;
          name?: string | null;
          size?: number;
          mime?: string | null;
          width?: number | null;
          height?: number | null;
          duration?: number | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      message_reads: {
        Row: {
          message_id: string;
          user_id: string;
          read_at: string;
        };
        Insert: {
          message_id: string;
          user_id: string;
          read_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      message_reactions: {
        Row: {
          message_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          message_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      message_reports: {
        Row: {
          id: string;
          message_id: string;
          reporter_id: string;
          reason: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          reporter_id: string;
          reason?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          type: string;
          body: string;
          attachment_url: string | null;
          reply_to: string | null;
          edited_at: string | null;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          type?: string;
          body?: string;
          attachment_url?: string | null;
          reply_to?: string | null;
          edited_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
        };
        Update: {
          body?: string;
          type?: string;
          attachment_url?: string | null;
          reply_to?: string | null;
          edited_at?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      typing_status: {
        Row: {
          conversation_id: string;
          user_id: string;
          is_typing: boolean;
          updated_at: string;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
          is_typing?: boolean;
          updated_at?: string;
        };
        Update: {
          is_typing?: boolean;
          updated_at?: string;
        };
        Relationships: [];
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
          license_url: string | null;
          tax_document_url: string | null;
          notes: string | null;
          reviewed_at: string | null;
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
          plan_key: string | null;
          interval: string;
          customer_email: string | null;
          provider: string | null;
          stripe_subscription_id: string | null;
          provider_subscription_id: string | null;
          auto_renew: boolean;
          next_billing_at: string | null;
          paused_at: string | null;
          cancel_at: string | null;
          cancelled_at: string | null;
          trial_end_at: string | null;
          lifetime: boolean;
          metadata: Record<string, unknown>;
          status: string | null;
          started_at: string;
          expires_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          plan: PlanType;
          plan_key?: string | null;
          interval?: string;
          customer_email?: string | null;
          provider?: string | null;
          stripe_subscription_id?: string | null;
          provider_subscription_id?: string | null;
          auto_renew?: boolean;
          next_billing_at?: string | null;
          paused_at?: string | null;
          cancel_at?: string | null;
          cancelled_at?: string | null;
          trial_end_at?: string | null;
          lifetime?: boolean;
          metadata?: Record<string, unknown>;
          status?: string | null;
          started_at?: string;
          expires_at?: string | null;
          updated_at?: string;
        };
        Update: {
          plan?: PlanType;
          plan_key?: string | null;
          interval?: string;
          customer_email?: string | null;
          provider?: string | null;
          stripe_subscription_id?: string | null;
          provider_subscription_id?: string | null;
          auto_renew?: boolean;
          next_billing_at?: string | null;
          paused_at?: string | null;
          cancel_at?: string | null;
          cancelled_at?: string | null;
          trial_end_at?: string | null;
          lifetime?: boolean;
          metadata?: Record<string, unknown>;
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
      subscription_history: {
        Row: {
          id: string;
          subscription_id: string;
          business_id: string;
          action: string;
          plan_from: string | null;
          plan_to: string | null;
          interval: string | null;
          period_start: string | null;
          period_end: string | null;
          amount_cents: number;
          currency: string;
          details: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          subscription_id: string | null;
          business_id: string;
          action: string;
          plan_from?: string | null;
          plan_to?: string | null;
          interval?: string | null;
          period_start?: string | null;
          period_end?: string | null;
          amount_cents?: number;
          currency?: string;
          details?: Record<string, unknown>;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      plans: {
        Row: {
          id: string;
          plan_key: string;
          interval: string;
          name: string;
          price_cents: number;
          currency: string;
          trial_days: number;
          sort_order: number;
          active: boolean;
          limits: Record<string, unknown>;
          features: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_key: string;
          interval: string;
          name: string;
          price_cents?: number;
          currency?: string;
          trial_days?: number;
          sort_order?: number;
          active?: boolean;
          limits?: Record<string, unknown>;
          features?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          plan_key?: string;
          interval?: string;
          name?: string;
          price_cents?: number;
          currency?: string;
          trial_days?: number;
          sort_order?: number;
          active?: boolean;
          limits?: Record<string, unknown>;
          features?: Record<string, unknown>;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          user_id: string | null;
          business_id: string | null;
          subscription_id: string | null;
          provider: string;
          provider_payment_id: string | null;
          gateway_ref: string | null;
          amount_cents: number;
          currency: string;
          status: string;
          payment_method: string | null;
          idempotency_key: string | null;
          failure_reason: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          business_id?: string | null;
          subscription_id?: string | null;
          provider: string;
          provider_payment_id?: string | null;
          gateway_ref?: string | null;
          amount_cents: number;
          currency?: string;
          status?: string;
          payment_method?: string | null;
          idempotency_key?: string | null;
          failure_reason?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          provider_payment_id?: string | null;
          gateway_ref?: string | null;
          status?: string;
          payment_method?: string | null;
          idempotency_key?: string | null;
          failure_reason?: string | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [];
      };
      payment_methods: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          provider_method_id: string | null;
          type: string;
          brand: string | null;
          last4: string | null;
          exp_month: number | null;
          exp_year: number | null;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: string;
          provider_method_id?: string | null;
          type?: string;
          brand?: string | null;
          last4?: string | null;
          exp_month?: number | null;
          exp_year?: number | null;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          provider_method_id?: string | null;
          brand?: string | null;
          last4?: string | null;
          exp_month?: number | null;
          exp_year?: number | null;
          is_default?: boolean;
        };
        Relationships: [];
      };
      payment_attempts: {
        Row: {
          id: string;
          payment_id: string;
          provider: string;
          attempt_no: number;
          status: string;
          response: Record<string, unknown> | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          provider: string;
          attempt_no?: number;
          status?: string;
          response?: Record<string, unknown> | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          number: string;
          business_id: string | null;
          user_id: string | null;
          subscription_id: string | null;
          payment_id: string | null;
          invoice_type: string;
          status: string;
          subtotal_cents: number;
          discount_cents: number;
          tax_cents: number;
          total_cents: number;
          currency: string;
          tax_rate: number;
          issued_at: string | null;
          due_date: string | null;
          paid_at: string | null;
          pdf_url: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          number: string;
          business_id?: string | null;
          user_id?: string | null;
          subscription_id?: string | null;
          payment_id?: string | null;
          invoice_type?: string;
          status?: string;
          subtotal_cents?: number;
          discount_cents?: number;
          tax_cents?: number;
          total_cents?: number;
          currency?: string;
          tax_rate?: number;
          issued_at?: string | null;
          due_date?: string | null;
          paid_at?: string | null;
          pdf_url?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          status?: string;
          paid_at?: string | null;
          pdf_url?: string | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [];
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          description: string;
          kind: string;
          quantity: number;
          unit_price_cents: number;
          amount_cents: number;
          tax_cents: number;
          sort_order: number;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          description: string;
          kind?: string;
          quantity?: number;
          unit_price_cents?: number;
          amount_cents?: number;
          tax_cents?: number;
          sort_order?: number;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      coupons: {
        Row: {
          id: string;
          code: string;
          type: string;
          value: number;
          amount_total_cents: number;
          period: string;
          active: boolean;
          starts_at: string | null;
          expires_at: string | null;
          max_usage: number | null;
          per_user_limit: number;
          applies_to: string;
          plans: Record<string, unknown>;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          type: string;
          value: number;
          amount_total_cents?: number;
          period?: string;
          active?: boolean;
          starts_at?: string | null;
          expires_at?: string | null;
          max_usage?: number | null;
          per_user_limit?: number;
          applies_to?: string;
          plans?: Record<string, unknown>;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          type?: string;
          value?: number;
          amount_total_cents?: number;
          period?: string;
          active?: boolean;
          starts_at?: string | null;
          expires_at?: string | null;
          max_usage?: number | null;
          per_user_limit?: number;
          applies_to?: string;
          plans?: Record<string, unknown>;
        };
        Relationships: [];
      };
      coupon_usage: {
        Row: {
          id: string;
          coupon_id: string;
          user_id: string;
          invoice_id: string | null;
          total_discount_cents: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          coupon_id: string;
          user_id: string;
          invoice_id?: string | null;
          total_discount_cents?: number;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          business_id: string | null;
          user_id: string;
          payment_id: string | null;
          refund_id: string | null;
          type: string;
          amount_cents: number;
          currency: string;
          status: string;
          reference: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          user_id: string;
          payment_id?: string | null;
          refund_id?: string | null;
          type?: string;
          amount_cents: number;
          currency?: string;
          status?: string;
          reference?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      refunds: {
        Row: {
          id: string;
          user_id: string;
          payment_id: string;
          provider_refund_id: string | null;
          amount_cents: number;
          currency: string;
          reason: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          payment_id: string;
          provider_refund_id?: string | null;
          amount_cents: number;
          currency?: string;
          reason?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          provider_refund_id?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      featured_businesses: {
        Row: {
          id: string;
          business_id: string;
          surface: string;
          starts_at: string;
          expires_at: string | null;
          priority: number;
          status: string;
          price_cents: number;
          currency: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          surface?: string;
          starts_at?: string;
          expires_at?: string | null;
          priority?: number;
          status?: string;
          price_cents?: number;
          currency?: string;
          created_at?: string;
        };
        Update: {
          expires_at?: string | null;
          priority?: number;
          status?: string;
        };
        Relationships: [];
      };
      featured_products: {
        Row: {
          id: string;
          business_id: string;
          product_id: string;
          starts_at: string;
          expires_at: string | null;
          priority: number;
          status: string;
          price_cents: number;
          currency: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          product_id: string;
          starts_at?: string;
          expires_at?: string | null;
          priority?: number;
          status?: string;
          price_cents?: number;
          currency?: string;
          created_at?: string;
        };
        Update: {
          expires_at?: string | null;
          priority?: number;
          status?: string;
        };
        Relationships: [];
      };
      featured_services: {
        Row: {
          id: string;
          business_id: string;
          service_id: string;
          starts_at: string;
          expires_at: string | null;
          priority: number;
          status: string;
          price_cents: number;
          currency: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          service_id: string;
          starts_at?: string;
          expires_at?: string | null;
          priority?: number;
          status?: string;
          price_cents?: number;
          currency?: string;
          created_at?: string;
        };
        Update: {
          expires_at?: string | null;
          priority?: number;
          status?: string;
        };
        Relationships: [];
      };
      analytics_events: {
        Row: {
          id: string;
          business_id: string;
          event_type: AnalyticsEventType;
          visitor_key: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          event_type: AnalyticsEventType;
          visitor_key?: string | null;
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
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          type: string;
          category: string;
          title: string;
          body: string;
          link: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          type?: string;
          category?: string;
          title: string;
          body?: string;
          link?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          type?: string;
          category?: string;
          title?: string;
          body?: string;
          link?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
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
    Functions: {
      notify_recipient: {
        Args: {
          p_recipient: string;
          p_type: string;
          p_title: string;
          p_body?: string;
          p_link?: string | null;
          p_category?: string;
        };
        Returns: undefined;
      };
      is_conversation_member: {
        Args: { cid: string };
        Returns: boolean;
      };
      is_owner_or_admin: {
        Args: { business_id: string };
        Returns: boolean;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      finalize_payment_ledger: {
        Args: {
          p_payment_id: string;
          p_user_id: string;
          p_business_id: string;
          p_currency: string;
          p_amount_cents: number;
          p_reference: string;
          p_invoice_id?: string | null;
          p_coupon_id?: string | null;
          p_discount_cents?: number;
        };
        Returns: string | null;
      };
      finalize_payment_refund: {
        Args: {
          p_payment_id: string;
          p_provider_refund_id?: string | null;
          p_reason?: string | null;
        };
        Returns: string | null;
      };
      coupon_global_usage: {
        Args: { p_coupon_id: string };
        Returns: number;
      };
    };
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
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type BusinessHour = Database["public"]["Tables"]["business_hours"]["Row"];
export type MediaItem = Database["public"]["Tables"]["media"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Favorite = Database["public"]["Tables"]["favorites"]["Row"];
export type Follow = Database["public"]["Tables"]["follows"]["Row"];
export type Report = Database["public"]["Tables"]["reports"]["Row"];
export type VerificationRequest =
  Database["public"]["Tables"]["verification_requests"]["Row"];
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type ConversationMember = Database["public"]["Tables"]["conversation_members"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type MessageAttachment = Database["public"]["Tables"]["message_attachments"]["Row"];
export type MessageRead = Database["public"]["Tables"]["message_reads"]["Row"];
export type MessageReaction = Database["public"]["Tables"]["message_reactions"]["Row"];
export type MessageReport = Database["public"]["Tables"]["message_reports"]["Row"];
export type BlockedUser = Database["public"]["Tables"]["blocked_users"]["Row"];
export type TypingStatus = Database["public"]["Tables"]["typing_status"]["Row"];
export type Plan = Database["public"]["Tables"]["plans"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type SubscriptionHistory = Database["public"]["Tables"]["subscription_history"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type PaymentMethod = Database["public"]["Tables"]["payment_methods"]["Row"];
export type PaymentAttempt = Database["public"]["Tables"]["payment_attempts"]["Row"];
export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type InvoiceItem = Database["public"]["Tables"]["invoice_items"]["Row"];
export type Coupon = Database["public"]["Tables"]["coupons"]["Row"];
export type CouponUsage = Database["public"]["Tables"]["coupon_usage"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type Refund = Database["public"]["Tables"]["refunds"]["Row"];
export type FeaturedBusiness = Database["public"]["Tables"]["featured_businesses"]["Row"];
export type FeaturedProduct = Database["public"]["Tables"]["featured_products"]["Row"];
export type FeaturedService = Database["public"]["Tables"]["featured_services"]["Row"];
