export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Record<string, unknown>
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          business_id: string
          created_at: string
          event_type: string
          id: string
          visitor_key: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          event_type: string
          id?: string
          visitor_key?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          event_type?: string
          id?: string
          visitor_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_users: {
        Row: {
          blocked_user_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          blocked_user_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          blocked_user_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_user_id_fkey"
            columns: ["blocked_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_date: string
          booking_time: string
          business_id: string
          client_name: string
          client_phone: string
          created_at: string
          customer_id: string | null
          id: string
          notes: string | null
          service_id: string | null
          status: Database["public"]["Enums"]["booking_status"]
        }
        Insert: {
          booking_date: string
          booking_time: string
          business_id: string
          client_name: string
          client_phone: string
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Update: {
          booking_date?: string
          booking_time?: string
          business_id?: string
          client_name?: string
          client_phone?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          business_id: string
          close_time: string | null
          day_of_week: number
          id: string
          is_closed: boolean
          open_time: string | null
        }
        Insert: {
          business_id: string
          close_time?: string | null
          day_of_week: number
          id?: string
          is_closed?: boolean
          open_time?: string | null
        }
        Update: {
          business_id?: string
          close_time?: string | null
          day_of_week?: number
          id?: string
          is_closed?: boolean
          open_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          category_id: string
          city: string | null
          city_id: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          ean: string | null
          email: string | null
          embedding: string | null
          facebook: string | null
          google_maps_url: string | null
          id: string
          instagram: string | null
          keywords: string | null
          languages: string | null
          last_updated_at: string
          lat: number | null
          linkedin: string | null
          lng: number | null
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          plan: Database["public"]["Enums"]["plan_type"]
          profile_completeness: number
          rating_avg: number
          reviews_count: number
          searchable_text: string | null
          service_area: string | null
          slug: string
          status: Database["public"]["Enums"]["business_status"]
          status_note: string | null
          subcategory_id: string | null
          tags: string | null
          tiktok: string | null
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified: boolean
          verified_at: string | null
          website: string | null
          whatsapp: string | null
          whatsapp_enabled: boolean
          whatsapp_url: string | null
        }
        Insert: {
          address?: string | null
          category_id: string
          city?: string | null
          city_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          ean?: string | null
          email?: string | null
          embedding?: string | null
          facebook?: string | null
          google_maps_url?: string | null
          id?: string
          instagram?: string | null
          keywords?: string | null
          languages?: string | null
          last_updated_at?: string
          lat?: number | null
          linkedin?: string | null
          lng?: number | null
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          plan?: Database["public"]["Enums"]["plan_type"]
          profile_completeness?: number
          rating_avg?: number
          reviews_count?: number
          searchable_text?: string | null
          service_area?: string | null
          slug: string
          status?: Database["public"]["Enums"]["business_status"]
          status_note?: string | null
          subcategory_id?: string | null
          tags?: string | null
          tiktok?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified?: boolean
          verified_at?: string | null
          website?: string | null
          whatsapp?: string | null
          whatsapp_enabled?: boolean
          whatsapp_url?: string | null
        }
        Update: {
          address?: string | null
          category_id?: string
          city?: string | null
          city_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          ean?: string | null
          email?: string | null
          embedding?: string | null
          facebook?: string | null
          google_maps_url?: string | null
          id?: string
          instagram?: string | null
          keywords?: string | null
          languages?: string | null
          last_updated_at?: string
          lat?: number | null
          linkedin?: string | null
          lng?: number | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          plan?: Database["public"]["Enums"]["plan_type"]
          profile_completeness?: number
          rating_avg?: number
          reviews_count?: number
          searchable_text?: string | null
          service_area?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["business_status"]
          status_note?: string | null
          subcategory_id?: string | null
          tags?: string | null
          tiktok?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified?: boolean
          verified_at?: string | null
          website?: string | null
          whatsapp?: string | null
          whatsapp_enabled?: boolean
          whatsapp_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          image_url: string | null
          name_ar: string
          name_en: string
          name_fr: string
          parent_id: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          name_ar: string
          name_en: string
          name_fr: string
          parent_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          name_ar?: string
          name_en?: string
          name_fr?: string
          parent_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          name_ar: string
          name_en: string
          name_fr: string
          population: number | null
          region: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name_ar: string
          name_en: string
          name_fr: string
          population?: number | null
          region?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name_ar?: string
          name_en?: string
          name_fr?: string
          population?: number | null
          region?: string | null
          slug?: string
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          archived_at: string | null
          conversation_id: string
          created_at: string
          last_read_at: string
          muted_until: string | null
          pinned_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          conversation_id: string
          created_at?: string
          last_read_at?: string
          muted_until?: string | null
          pinned_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          conversation_id?: string
          created_at?: string
          last_read_at?: string
          muted_until?: string | null
          pinned_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          business_id: string | null
          created_at: string
          created_by: string
          id: string
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          title?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usage: {
        Row: {
          coupon_id: string
          created_at: string
          id: string
          invoice_id: string | null
          total_discount_cents: number
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          total_discount_cents?: number
          user_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          total_discount_cents?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          amount_total_cents: number
          applies_to: string
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          max_usage: number | null
          per_user_limit: number
          period: string
          plans: Json
          starts_at: string | null
          type: string
          updated_at: string
          value: number
        }
        Insert: {
          active?: boolean
          amount_total_cents?: number
          applies_to?: string
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          max_usage?: number | null
          per_user_limit?: number
          period?: string
          plans?: Json
          starts_at?: string | null
          type: string
          updated_at?: string
          value: number
        }
        Update: {
          active?: boolean
          amount_total_cents?: number
          applies_to?: string
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          max_usage?: number | null
          per_user_limit?: number
          period?: string
          plans?: Json
          starts_at?: string | null
          type?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      favorites: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          item_type: string
          product_id: string | null
          service_id: string | null
          user_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id?: string
          item_type: string
          product_id?: string | null
          service_id?: string | null
          user_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          item_type?: string
          product_id?: string | null
          service_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_businesses: {
        Row: {
          business_id: string
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          price_cents: number
          priority: number
          starts_at: string
          status: string
          surface: string
        }
        Insert: {
          business_id: string
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          price_cents?: number
          priority?: number
          starts_at?: string
          status?: string
          surface?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          price_cents?: number
          priority?: number
          starts_at?: string
          status?: string
          surface?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_businesses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_products: {
        Row: {
          business_id: string
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          price_cents: number
          priority: number
          product_id: string
          starts_at: string
          status: string
        }
        Insert: {
          business_id: string
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          price_cents?: number
          priority?: number
          product_id: string
          starts_at?: string
          status?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          price_cents?: number
          priority?: number
          product_id?: string
          starts_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_services: {
        Row: {
          business_id: string
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          price_cents: number
          priority: number
          service_id: string
          starts_at: string
          status: string
        }
        Insert: {
          business_id: string
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          price_cents?: number
          priority?: number
          service_id: string
          starts_at?: string
          status?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          price_cents?: number
          priority?: number
          service_id?: string
          starts_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          business_id: string | null
          created_at: string
          follower_id: string
          following_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          follower_id: string
          following_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          follower_id?: string
          following_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follows_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount_cents: number
          description: string
          id: string
          invoice_id: string
          kind: string
          quantity: number
          sort_order: number
          tax_cents: number
          unit_price_cents: number
        }
        Insert: {
          amount_cents?: number
          description: string
          id?: string
          invoice_id: string
          kind?: string
          quantity?: number
          sort_order?: number
          tax_cents?: number
          unit_price_cents?: number
        }
        Update: {
          amount_cents?: number
          description?: string
          id?: string
          invoice_id?: string
          kind?: string
          quantity?: number
          sort_order?: number
          tax_cents?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          business_id: string
          created_at: string
          currency: string
          discount_cents: number
          due_date: string | null
          id: string
          invoice_type: string
          issued_at: string | null
          metadata: Json
          number: string
          paid_at: string | null
          payment_id: string | null
          pdf_url: string | null
          status: string
          subscription_id: string | null
          subtotal_cents: number
          tax_cents: number
          tax_rate: number
          total_cents: number
          user_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          currency?: string
          discount_cents?: number
          due_date?: string | null
          id?: string
          invoice_type?: string
          issued_at?: string | null
          metadata?: Json
          number: string
          paid_at?: string | null
          payment_id?: string | null
          pdf_url?: string | null
          status?: string
          subscription_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          tax_rate?: number
          total_cents?: number
          user_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          currency?: string
          discount_cents?: number
          due_date?: string | null
          id?: string
          invoice_type?: string
          issued_at?: string | null
          metadata?: Json
          number?: string
          paid_at?: string | null
          payment_id?: string | null
          pdf_url?: string | null
          status?: string
          subscription_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          tax_rate?: number
          total_cents?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          business_id: string
          id: string
          sort_order: number
          type: string
          url: string
        }
        Insert: {
          business_id: string
          id?: string
          sort_order?: number
          type: string
          url: string
        }
        Update: {
          business_id?: string
          id?: string
          sort_order?: number
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          conversation_id: string
          created_at: string
          duration: number | null
          height: number | null
          id: string
          kind: string
          message_id: string | null
          mime: string | null
          name: string | null
          size: number
          url: string
          width: number | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          duration?: number | null
          height?: number | null
          id?: string
          kind?: string
          message_id?: string | null
          mime?: string | null
          name?: string | null
          size?: number
          url: string
          width?: number | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          duration?: number | null
          height?: number | null
          id?: string
          kind?: string
          message_id?: string | null
          mime?: string | null
          name?: string | null
          size?: number
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reports: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reason: string | null
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reason?: string | null
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reason?: string | null
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_url: string | null
          body: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          reply_to: string | null
          sender_id: string
          type: string
        }
        Insert: {
          attachment_url?: string | null
          body?: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          reply_to?: string | null
          sender_id: string
          type?: string
        }
        Update: {
          attachment_url?: string | null
          body?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          reply_to?: string | null
          sender_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          recipient_id: string
          title: string
          type: string
        }
        Insert: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          recipient_id: string
          title: string
          type?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          recipient_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_attempts: {
        Row: {
          attempt_no: number
          created_at: string
          error_message: string | null
          id: string
          payment_id: string
          provider: string
          response: Json | null
          status: string
        }
        Insert: {
          attempt_no?: number
          created_at?: string
          error_message?: string | null
          id?: string
          payment_id: string
          provider: string
          response?: Json | null
          status?: string
        }
        Update: {
          attempt_no?: number
          created_at?: string
          error_message?: string | null
          id?: string
          payment_id?: string
          provider?: string
          response?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          brand: string | null
          created_at: string
          exp_month: number | null
          exp_year: number | null
          id: string
          is_default: boolean
          last4: string | null
          provider: string
          provider_method_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean
          last4?: string | null
          provider: string
          provider_method_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean
          last4?: string | null
          provider?: string
          provider_method_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          business_id: string | null
          created_at: string
          currency: string
          failure_reason: string | null
          gateway_ref: string | null
          id: string
          idempotency_key: string | null
          metadata: Json
          payment_method: string | null
          provider: string
          provider_payment_id: string | null
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          business_id?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          gateway_ref?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          payment_method?: string | null
          provider: string
          provider_payment_id?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          business_id?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          gateway_ref?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          payment_method?: string | null
          provider?: string
          provider_payment_id?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          features: Json
          id: string
          interval: string
          limits: Json
          name: string
          plan_key: string
          price_cents: number
          sort_order: number
          trial_days: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          interval: string
          limits?: Json
          name: string
          plan_key: string
          price_cents?: number
          sort_order?: number
          trial_days?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          interval?: string
          limits?: Json
          name?: string
          plan_key?: string
          price_cents?: number
          sort_order?: number
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          business_id: string
          category_id: string | null
          compare_at_price: number | null
          created_at: string
          currency: string
          description: string | null
          embedding: string | null
          featured: boolean
          id: string
          images: string[]
          name: string
          price: number
          searchable_text: string | null
          seo_description: string | null
          seo_title: string | null
          sku: string | null
          slug: string
          status: string
          status_note: string | null
          stock: number
          tags: string[]
          updated_at: string
          views: number
        }
        Insert: {
          business_id: string
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          embedding?: string | null
          featured?: boolean
          id?: string
          images?: string[]
          name: string
          price?: number
          searchable_text?: string | null
          seo_description?: string | null
          seo_title?: string | null
          sku?: string | null
          slug: string
          status?: string
          status_note?: string | null
          stock?: number
          tags?: string[]
          updated_at?: string
          views?: number
        }
        Update: {
          business_id?: string
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          embedding?: string | null
          featured?: boolean
          id?: string
          images?: string[]
          name?: string
          price?: number
          searchable_text?: string | null
          seo_description?: string | null
          seo_title?: string | null
          sku?: string | null
          slug?: string
          status?: string
          status_note?: string | null
          stock?: number
          tags?: string[]
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          banned: boolean
          bio: string | null
          city: string | null
          cover_url: string | null
          created_at: string
          experience: string | null
          facebook: string | null
          full_name: string | null
          id: string
          instagram: string | null
          languages: string | null
          linkedin: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          skills: string | null
          suspended: boolean
          tiktok: string | null
          username: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          banned?: boolean
          bio?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          experience?: string | null
          facebook?: string | null
          full_name?: string | null
          id: string
          instagram?: string | null
          languages?: string | null
          linkedin?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          skills?: string | null
          suspended?: boolean
          tiktok?: string | null
          username?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          banned?: boolean
          bio?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          experience?: string | null
          facebook?: string | null
          full_name?: string | null
          id?: string
          instagram?: string | null
          languages?: string | null
          linkedin?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          skills?: string | null
          suspended?: boolean
          tiktok?: string | null
          username?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          hits: number
          key: string
          reset_at: string
        }
        Insert: {
          hits?: number
          key: string
          reset_at?: string
        }
        Update: {
          hits?: number
          key?: string
          reset_at?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          payment_id: string
          provider_refund_id: string | null
          reason: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          payment_id: string
          provider_refund_id?: string | null
          reason?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          payment_id?: string
          provider_refund_id?: string | null
          reason?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          business_id: string
          created_at: string
          id: string
          reason: string | null
          reporter_id: string
          status: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id: string
          status?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          business_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          reply: string | null
          user_id: string
        }
        Insert: {
          business_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reply?: string | null
          user_id: string
        }
        Update: {
          business_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reply?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          business_id: string
          category_id: string | null
          description: string | null
          duration_minutes: number | null
          embedding: string | null
          featured: boolean
          gallery: string[]
          id: string
          name: string
          old_price: number | null
          photo_url: string | null
          price: number | null
          searchable_text: string | null
          status: string
          status_note: string | null
          tags: string[]
          updated_at: string
        }
        Insert: {
          business_id: string
          category_id?: string | null
          description?: string | null
          duration_minutes?: number | null
          embedding?: string | null
          featured?: boolean
          gallery?: string[]
          id?: string
          name: string
          old_price?: number | null
          photo_url?: string | null
          price?: number | null
          searchable_text?: string | null
          status?: string
          status_note?: string | null
          tags?: string[]
          updated_at?: string
        }
        Update: {
          business_id?: string
          category_id?: string | null
          description?: string | null
          duration_minutes?: number | null
          embedding?: string | null
          featured?: boolean
          gallery?: string[]
          id?: string
          name?: string
          old_price?: number | null
          photo_url?: string | null
          price?: number | null
          searchable_text?: string | null
          status?: string
          status_note?: string | null
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_history: {
        Row: {
          action: string
          amount_cents: number
          business_id: string
          created_at: string
          currency: string
          details: Json
          id: string
          interval: string | null
          period_end: string | null
          period_start: string | null
          plan_from: string | null
          plan_to: string | null
          subscription_id: string
        }
        Insert: {
          action: string
          amount_cents?: number
          business_id: string
          created_at?: string
          currency?: string
          details?: Json
          id?: string
          interval?: string | null
          period_end?: string | null
          period_start?: string | null
          plan_from?: string | null
          plan_to?: string | null
          subscription_id: string
        }
        Update: {
          action?: string
          amount_cents?: number
          business_id?: string
          created_at?: string
          currency?: string
          details?: Json
          id?: string
          interval?: string | null
          period_end?: string | null
          period_start?: string | null
          plan_from?: string | null
          plan_to?: string | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          auto_renew: boolean
          business_id: string
          cancel_at: string | null
          cancelled_at: string | null
          customer_email: string | null
          expires_at: string | null
          id: string
          interval: string
          lifetime: boolean
          metadata: Json
          next_billing_at: string | null
          paused_at: string | null
          plan: Database["public"]["Enums"]["plan_type"]
          plan_key: string | null
          provider: string | null
          provider_subscription_id: string | null
          started_at: string
          status: string | null
          stripe_subscription_id: string | null
          trial_end_at: string | null
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          business_id: string
          cancel_at?: string | null
          cancelled_at?: string | null
          customer_email?: string | null
          expires_at?: string | null
          id?: string
          interval?: string
          lifetime?: boolean
          metadata?: Json
          next_billing_at?: string | null
          paused_at?: string | null
          plan: Database["public"]["Enums"]["plan_type"]
          plan_key?: string | null
          provider?: string | null
          provider_subscription_id?: string | null
          started_at?: string
          status?: string | null
          stripe_subscription_id?: string | null
          trial_end_at?: string | null
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          business_id?: string
          cancel_at?: string | null
          cancelled_at?: string | null
          customer_email?: string | null
          expires_at?: string | null
          id?: string
          interval?: string
          lifetime?: boolean
          metadata?: Json
          next_billing_at?: string | null
          paused_at?: string | null
          plan?: Database["public"]["Enums"]["plan_type"]
          plan_key?: string | null
          provider?: string | null
          provider_subscription_id?: string | null
          started_at?: string
          status?: string | null
          stripe_subscription_id?: string | null
          trial_end_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          context: string | null
          created_at: string
          id: string
          level: string
          message: string
          meta: Json | null
          stack: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string
          id?: string
          level?: string
          message?: string
          meta?: Json | null
          stack?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string
          id?: string
          level?: string
          message?: string
          meta?: Json | null
          stack?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_cents: number
          business_id: string | null
          created_at: string
          currency: string
          id: string
          payment_id: string | null
          reference: string | null
          refund_id: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          business_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          payment_id?: string | null
          reference?: string | null
          refund_id?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          business_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          payment_id?: string | null
          reference?: string | null
          refund_id?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_status: {
        Row: {
          conversation_id: string
          is_typing: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          is_typing?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          is_typing?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_status_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_requests: {
        Row: {
          activity_document_url: string | null
          admin_note: string | null
          business_id: string
          created_at: string
          id: string
          id_document_url: string | null
          license_url: string | null
          notes: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["verification_status"]
          tax_document_url: string | null
        }
        Insert: {
          activity_document_url?: string | null
          admin_note?: string | null
          business_id: string
          created_at?: string
          id?: string
          id_document_url?: string | null
          license_url?: string | null
          notes?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          tax_document_url?: string | null
        }
        Update: {
          activity_document_url?: string | null
          admin_note?: string | null
          business_id?: string
          created_at?: string
          id?: string
          id_document_url?: string | null
          license_url?: string | null
          notes?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          tax_document_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      business_searchable: {
        Args: { b: Database["public"]["Tables"]["businesses"]["Row"] }
        Returns: string
      }
      count_followers: { Args: { bid: string }; Returns: number }
      coupon_global_usage: { Args: { p_coupon_id: string }; Returns: number }
      finalize_payment_ledger: {
        Args: {
          p_amount_cents: number
          p_business_id: string
          p_coupon_id?: string
          p_currency: string
          p_discount_cents?: number
          p_invoice_id?: string
          p_payment_id: string
          p_reference: string
          p_user_id: string
        }
        Returns: string
      }
      finalize_payment_refund: {
        Args: {
          p_payment_id: string
          p_provider_refund_id?: string
          p_reason?: string
        }
        Returns: string
      }
      hybrid_search: {
        Args: {
          p_category?: string
          p_city?: string
          p_embedding?: string
          p_limit?: number
          p_max_price?: number
          p_min_price?: number
          p_min_rating?: number
          p_open_now?: boolean
          p_premium?: boolean
          p_query?: string
          p_type?: string
          p_verified?: boolean
        }
        Returns: {
          id: string
          kind: string
          payload: Json
          score: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      admin_revoke_user_sessions: { Args: { p_user_id: string }; Returns: undefined }
      is_conversation_creator: { Args: { cid: string }; Returns: boolean }
      is_conversation_member: { Args: { cid: string }; Returns: boolean }
      is_owner_or_admin: { Args: { business_id: string }; Returns: boolean }
      messenger_latest_messages: {
        Args: never
        Returns: {
          attachment_url: string | null
          body: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          reply_to: string | null
          sender_id: string
          type: string
        }[]
        SetofOptions: {
          from: "*"
          to: "messages"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      messenger_mark_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      messenger_participants: {
        Args: { conversation_ids: string[] }
        Returns: {
          avatar_url: string
          city: string
          conversation_id: string
          full_name: string
          last_read_at: string
          user_id: string
          username: string
        }[]
      }
      messenger_unread_counts: {
        Args: never
        Returns: {
          conversation_id: string
          unread: number
        }[]
      }
      notify_recipient: {
        Args: {
          p_body?: string
          p_category?: string
          p_link?: string
          p_recipient: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      product_searchable: {
        Args: { p: Database["public"]["Tables"]["products"]["Row"] }
        Returns: string
      }
      service_searchable: {
        Args: { s: Database["public"]["Tables"]["services"]["Row"] }
        Returns: string
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      booking_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "accepted"
        | "rejected"
        | "completed"
      business_status: "pending_review" | "approved" | "rejected" | "suspended"
      plan_type: "free" | "premium" | "pro" | "enterprise"
      user_role: "client" | "owner" | "admin"
      verification_status: "none" | "pending" | "verified" | "rejected"
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
  public: {
    Enums: {
      booking_status: [
        "pending",
        "confirmed",
        "cancelled",
        "accepted",
        "rejected",
        "completed",
      ],
      business_status: ["pending_review", "approved", "rejected", "suspended"],
      plan_type: ["free", "premium", "pro", "enterprise"],
      user_role: ["client", "owner", "admin"],
      verification_status: ["none", "pending", "verified", "rejected"],
    },
  },
} as const


/* ===========================================================================
 * Named type aliases — retained for application compatibility.
 * Derived from the regenerated `Database` type (source of truth = live
 * Supabase schema) so column definitions stay accurate.
 * ======================================================================== */

export type Business = Database["public"]["Tables"]["businesses"]["Row"];
export type BusinessInsert = Database["public"]["Tables"]["businesses"]["Insert"];
export type BusinessUpdate = Database["public"]["Tables"]["businesses"]["Update"];
export type City = Database["public"]["Tables"]["cities"]["Row"];
export type CityInsert = Database["public"]["Tables"]["cities"]["Insert"];
export type CityUpdate = Database["public"]["Tables"]["cities"]["Update"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"];
export type CategoryUpdate = Database["public"]["Tables"]["categories"]["Update"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
export type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];
export type Service = Database["public"]["Tables"]["services"]["Row"];
export type ServiceInsert = Database["public"]["Tables"]["services"]["Insert"];
export type ServiceUpdate = Database["public"]["Tables"]["services"]["Update"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];
export type BookingUpdate = Database["public"]["Tables"]["bookings"]["Update"];
export type Report = Database["public"]["Tables"]["reports"]["Row"];
export type ReportInsert = Database["public"]["Tables"]["reports"]["Insert"];
export type ReportUpdate = Database["public"]["Tables"]["reports"]["Update"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type ReviewInsert = Database["public"]["Tables"]["reviews"]["Insert"];
export type ReviewUpdate = Database["public"]["Tables"]["reviews"]["Update"];
export type Plan = Database["public"]["Tables"]["plans"]["Row"];
export type PlanInsert = Database["public"]["Tables"]["plans"]["Insert"];
export type PlanUpdate = Database["public"]["Tables"]["plans"]["Update"];

export type PlanType = Database["public"]["Enums"]["plan_type"];
export type UserRole = Database["public"]["Enums"]["user_role"];
export type BusinessStatus = Database["public"]["Enums"]["business_status"];
export type BookingStatus = Database["public"]["Enums"]["booking_status"];
export type VerificationStatus = Database["public"]["Enums"]["verification_status"];

/* Custom (non-DB) unions retained from the previous types file. */
export type MediaType = "image" | "video";
export type ReportStatus = "open" | "reviewed" | "resolved";
export type AnalyticsEventType =
  | "view"
  | "whatsapp_click"
  | "call_click"
  | "lead"
  | "photo_view"
  | "booking_created";
