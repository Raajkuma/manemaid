
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "admin_phones": {
                  Row: {
                    "full_name": string | null,"phone": string,"role": Database["public"]['Enums']["user_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "full_name"?: string | null,"phone": string,"role": Database["public"]['Enums']["user_role"]
                  }
                  Update: {
                    "full_name"?: string | null,"phone"?: string,"role"?: Database["public"]['Enums']["user_role"]
                  }
                  Relationships: [
                    
                  ]
                },"agency_settings": {
                  Row: {
                    "agency_name": string,"alternate_phone": string | null,"id": boolean,"support_email": string | null,"support_hours": string | null,"support_phone": string | null,"updated_at": string,"upi_id": string | null,"upi_payee_name": string | null,"whatsapp_phone": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "agency_name": string,"alternate_phone"?: string | null,"id"?: boolean,"support_email"?: string | null,"support_hours"?: string | null,"support_phone"?: string | null,"updated_at"?: string,"upi_id"?: string | null,"upi_payee_name"?: string | null,"whatsapp_phone"?: string | null
                  }
                  Update: {
                    "agency_name"?: string,"alternate_phone"?: string | null,"id"?: boolean,"support_email"?: string | null,"support_hours"?: string | null,"support_phone"?: string | null,"updated_at"?: string,"upi_id"?: string | null,"upi_payee_name"?: string | null,"whatsapp_phone"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"app_config": {
                  Row: {
                    "description": string | null,"is_public": boolean,"key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"is_public"?: boolean,"key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "description"?: string | null,"is_public"?: boolean,"key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "app_config_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"app_errors": {
                  Row: {
                    "app_version": string | null,"at": string,"id": number,"message": string,"platform": string | null,"route": string | null,"source": string,"stack": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "app_version"?: string | null,"at"?: string,"id"?: never,"message": string,"platform"?: string | null,"route"?: string | null,"source": string,"stack"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "app_version"?: string | null,"at"?: string,"id"?: never,"message"?: string,"platform"?: string | null,"route"?: string | null,"source"?: string,"stack"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"assignments": {
                  Row: {
                    "agency_note": string | null,"booking_id": string,"customer_note": string | null,"decided_at": string | null,"id": string,"proposed_at": string,"proposed_by": string | null,"staff_id": string,"status": Database["public"]['Enums']["assignment_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "agency_note"?: string | null,"booking_id": string,"customer_note"?: string | null,"decided_at"?: string | null,"id"?: string,"proposed_at"?: string,"proposed_by"?: string | null,"staff_id": string,"status"?: Database["public"]['Enums']["assignment_status"]
                  }
                  Update: {
                    "agency_note"?: string | null,"booking_id"?: string,"customer_note"?: string | null,"decided_at"?: string | null,"id"?: string,"proposed_at"?: string,"proposed_by"?: string | null,"staff_id"?: string,"status"?: Database["public"]['Enums']["assignment_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "assignments_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assignments_proposed_by_fkey"
      columns: ["proposed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assignments_staff_id_fkey"
      columns: ["staff_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"actor_role": Database["public"]['Enums']["user_role"] | null,"at": string,"changes": NonNullable<Json>,"id": number,"row_id": string | null,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"actor_role"?: Database["public"]['Enums']["user_role"] | null,"at"?: string,"changes"?: NonNullable<Json>,"id"?: never,"row_id"?: string | null,"table_name": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"actor_role"?: Database["public"]['Enums']["user_role"] | null,"at"?: string,"changes"?: NonNullable<Json>,"id"?: never,"row_id"?: string | null,"table_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"booking_events": {
                  Row: {
                    "actor_id": string | null,"actor_role": Database["public"]['Enums']["user_role"] | null,"booking_id": string,"created_at": string,"from_status": Database["public"]['Enums']["booking_status"] | null,"id": number,"kind": string,"reason": string | null,"to_status": Database["public"]['Enums']["booking_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"actor_role"?: Database["public"]['Enums']["user_role"] | null,"booking_id": string,"created_at"?: string,"from_status"?: Database["public"]['Enums']["booking_status"] | null,"id"?: never,"kind"?: string,"reason"?: string | null,"to_status": Database["public"]['Enums']["booking_status"]
                  }
                  Update: {
                    "actor_id"?: string | null,"actor_role"?: Database["public"]['Enums']["user_role"] | null,"booking_id"?: string,"created_at"?: string,"from_status"?: Database["public"]['Enums']["booking_status"] | null,"id"?: never,"kind"?: string,"reason"?: string | null,"to_status"?: Database["public"]['Enums']["booking_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "booking_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "booking_events_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"booking_transitions": {
                  Row: {
                    "actor": string,"from_status": Database["public"]['Enums']["booking_status"],"reason_required": boolean,"to_status": Database["public"]['Enums']["booking_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "actor": string,"from_status": Database["public"]['Enums']["booking_status"],"reason_required"?: boolean,"to_status": Database["public"]['Enums']["booking_status"]
                  }
                  Update: {
                    "actor"?: string,"from_status"?: Database["public"]['Enums']["booking_status"],"reason_required"?: boolean,"to_status"?: Database["public"]['Enums']["booking_status"]
                  }
                  Relationships: [
                    
                  ]
                },"bookings": {
                  Row: {
                    "address_id": string,"agreed_price": number | null,"assigned_staff_id": string | null,"category_code": string,"created_at": string,"customer_id": string,"days_of_week": (number)[],"engagement_type": Database["public"]['Enums']["engagement_type"],"hours_per_day": number | null,"household_size": number | null,"id": string,"language_prefs": (string)[],"offer_id": string | null,"offer_title": string | null,"paid_amount": number | null,"paid_at": string | null,"payment_method": string | null,"payment_reference": string | null,"payment_status": Database["public"]['Enums']["payment_status"],"reference": string,"rooms": number | null,"special_instructions": string | null,"start_date": string,"status": Database["public"]['Enums']["booking_status"],"status_reason": string | null,"time_end": string | null,"time_start": string | null,"trial_requested": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_id": string,"agreed_price"?: number | null,"assigned_staff_id"?: string | null,"category_code": string,"created_at"?: string,"customer_id": string,"days_of_week"?: (number)[],"engagement_type": Database["public"]['Enums']["engagement_type"],"hours_per_day"?: number | null,"household_size"?: number | null,"id"?: string,"language_prefs"?: (string)[],"offer_id"?: string | null,"offer_title"?: string | null,"paid_amount"?: number | null,"paid_at"?: string | null,"payment_method"?: string | null,"payment_reference"?: string | null,"payment_status"?: Database["public"]['Enums']["payment_status"],"reference"?: string,"rooms"?: number | null,"special_instructions"?: string | null,"start_date": string,"status"?: Database["public"]['Enums']["booking_status"],"status_reason"?: string | null,"time_end"?: string | null,"time_start"?: string | null,"trial_requested"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "address_id"?: string,"agreed_price"?: number | null,"assigned_staff_id"?: string | null,"category_code"?: string,"created_at"?: string,"customer_id"?: string,"days_of_week"?: (number)[],"engagement_type"?: Database["public"]['Enums']["engagement_type"],"hours_per_day"?: number | null,"household_size"?: number | null,"id"?: string,"language_prefs"?: (string)[],"offer_id"?: string | null,"offer_title"?: string | null,"paid_amount"?: number | null,"paid_at"?: string | null,"payment_method"?: string | null,"payment_reference"?: string | null,"payment_status"?: Database["public"]['Enums']["payment_status"],"reference"?: string,"rooms"?: number | null,"special_instructions"?: string | null,"start_date"?: string,"status"?: Database["public"]['Enums']["booking_status"],"status_reason"?: string | null,"time_end"?: string | null,"time_start"?: string | null,"trial_requested"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookings_address_id_fkey"
      columns: ["address_id"]
isOneToOne: false
      referencedRelation: "customer_addresses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_assigned_staff_id_fkey"
      columns: ["assigned_staff_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_category_code_fkey"
      columns: ["category_code"]
isOneToOne: false
      referencedRelation: "service_categories"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "bookings_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_offer_id_fkey"
      columns: ["offer_id"]
isOneToOne: false
      referencedRelation: "offers"
      referencedColumns: ["id"]
    }
                  ]
                },"customer_addresses": {
                  Row: {
                    "access_notes": string | null,"building": string | null,"city": string,"created_at": string,"customer_id": string,"flat_no": string | null,"id": string,"is_default": boolean,"label": string,"landmark": string | null,"latitude": number | null,"line1": string,"longitude": number | null,"pincode": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_notes"?: string | null,"building"?: string | null,"city": string,"created_at"?: string,"customer_id"?: string,"flat_no"?: string | null,"id"?: string,"is_default"?: boolean,"label"?: string,"landmark"?: string | null,"latitude"?: number | null,"line1": string,"longitude"?: number | null,"pincode": string,"updated_at"?: string
                  }
                  Update: {
                    "access_notes"?: string | null,"building"?: string | null,"city"?: string,"created_at"?: string,"customer_id"?: string,"flat_no"?: string | null,"id"?: string,"is_default"?: boolean,"label"?: string,"landmark"?: string | null,"latitude"?: number | null,"line1"?: string,"longitude"?: number | null,"pincode"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customer_addresses_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"greeting_deliveries": {
                  Row: {
                    "greeting_id": string,"seen_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "greeting_id": string,"seen_at"?: string,"user_id": string
                  }
                  Update: {
                    "greeting_id"?: string,"seen_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "greeting_deliveries_greeting_id_fkey"
      columns: ["greeting_id"]
isOneToOne: false
      referencedRelation: "greetings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "greeting_deliveries_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"greetings": {
                  Row: {
                    "active": boolean,"audience": string,"created_at": string,"created_by": string | null,"ends_on": string,"id": string,"image_path": string | null,"message": string,"push_to_inbox": boolean,"starts_on": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"audience"?: string,"created_at"?: string,"created_by"?: string | null,"ends_on": string,"id"?: string,"image_path"?: string | null,"message": string,"push_to_inbox"?: boolean,"starts_on": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"audience"?: string,"created_at"?: string,"created_by"?: string | null,"ends_on"?: string,"id"?: string,"image_path"?: string | null,"message"?: string,"push_to_inbox"?: boolean,"starts_on"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "greetings_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"legal_documents": {
                  Row: {
                    "body": string,"doc_type": string,"id": string,"published_at": string,"published_by": string | null,"title": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"doc_type": string,"id"?: string,"published_at"?: string,"published_by"?: string | null,"title": string,"version": number
                  }
                  Update: {
                    "body"?: string,"doc_type"?: string,"id"?: string,"published_at"?: string,"published_by"?: string | null,"title"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "legal_documents_published_by_fkey"
      columns: ["published_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string,"booking_id": string | null,"created_at": string,"id": string,"read_at": string | null,"ticket_id": string | null,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"booking_id"?: string | null,"created_at"?: string,"id"?: string,"read_at"?: string | null,"ticket_id"?: string | null,"title": string,"user_id": string
                  }
                  Update: {
                    "body"?: string,"booking_id"?: string | null,"created_at"?: string,"id"?: string,"read_at"?: string | null,"ticket_id"?: string | null,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_ticket_id_fkey"
      columns: ["ticket_id"]
isOneToOne: false
      referencedRelation: "support_tickets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"offers": {
                  Row: {
                    "active": boolean,"audience": string,"body": string,"category_code": string | null,"created_at": string,"created_by": string | null,"ends_at": string | null,"id": string,"image_path": string | null,"sort_order": number,"starts_at": string,"terms": string | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"audience"?: string,"body": string,"category_code"?: string | null,"created_at"?: string,"created_by"?: string | null,"ends_at"?: string | null,"id"?: string,"image_path"?: string | null,"sort_order"?: number,"starts_at"?: string,"terms"?: string | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"audience"?: string,"body"?: string,"category_code"?: string | null,"created_at"?: string,"created_by"?: string | null,"ends_at"?: string | null,"id"?: string,"image_path"?: string | null,"sort_order"?: number,"starts_at"?: string,"terms"?: string | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "offers_category_code_fkey"
      columns: ["category_code"]
isOneToOne: false
      referencedRelation: "service_categories"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "offers_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_path": string | null,"created_at": string,"email": string | null,"full_name": string | null,"id": string,"marketing_opt_in": boolean,"marketing_opt_in_at": string | null,"phone": string | null,"preferred_language": string,"role": Database["public"]['Enums']["user_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id": string,"marketing_opt_in"?: boolean,"marketing_opt_in_at"?: string | null,"phone"?: string | null,"preferred_language"?: string,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Update: {
                    "avatar_path"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id"?: string,"marketing_opt_in"?: boolean,"marketing_opt_in_at"?: string | null,"phone"?: string | null,"preferred_language"?: string,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"quotations": {
                  Row: {
                    "agency_fee": number,"booking_id": string,"created_at": string,"created_by": string | null,"customer_note": string | null,"deposit": number,"id": string,"monthly_price": number,"responded_at": string | null,"scope": string,"status": Database["public"]['Enums']["quotation_status"],"tax": number,"terms": string | null,"valid_until": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agency_fee"?: number,"booking_id": string,"created_at"?: string,"created_by"?: string | null,"customer_note"?: string | null,"deposit"?: number,"id"?: string,"monthly_price": number,"responded_at"?: string | null,"scope": string,"status"?: Database["public"]['Enums']["quotation_status"],"tax"?: number,"terms"?: string | null,"valid_until": string
                  }
                  Update: {
                    "agency_fee"?: number,"booking_id"?: string,"created_at"?: string,"created_by"?: string | null,"customer_note"?: string | null,"deposit"?: number,"id"?: string,"monthly_price"?: number,"responded_at"?: string | null,"scope"?: string,"status"?: Database["public"]['Enums']["quotation_status"],"tax"?: number,"terms"?: string | null,"valid_until"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quotations_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotations_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"scope_templates": {
                  Row: {
                    "active": boolean,"body": string,"category_code": string | null,"created_at": string,"id": string,"sort_order": number,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"body": string,"category_code"?: string | null,"created_at"?: string,"id"?: string,"sort_order"?: number,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"body"?: string,"category_code"?: string | null,"created_at"?: string,"id"?: string,"sort_order"?: number,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "scope_templates_category_code_fkey"
      columns: ["category_code"]
isOneToOne: false
      referencedRelation: "service_categories"
      referencedColumns: ["code"]
    }
                  ]
                },"service_categories": {
                  Row: {
                    "active": boolean,"code": string,"description": string | null,"name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"code": string,"description"?: string | null,"name": string,"sort_order"?: number
                  }
                  Update: {
                    "active"?: boolean,"code"?: string,"description"?: string | null,"name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"service_zones": {
                  Row: {
                    "active": boolean,"area_name": string,"city": string,"pincode": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"area_name": string,"city": string,"pincode": string
                  }
                  Update: {
                    "active"?: boolean,"area_name"?: string,"city"?: string,"pincode"?: string
                  }
                  Relationships: [
                    
                  ]
                },"staff": {
                  Row: {
                    "address": string | null,"alternate_phone": string | null,"bio": string | null,"categories": (string)[],"code": string,"created_at": string,"email": string | null,"emergency_contact_name": string | null,"emergency_contact_phone": string | null,"experience_years": number,"full_name": string,"id": string,"languages": (string)[],"phone": string | null,"photo_url": string | null,"preferred_contact": string,"rating": number | null,"skills": (string)[],"status": Database["public"]['Enums']["staff_status"],"updated_at": string,"verification_status": Database["public"]['Enums']["verification_status"],"verified_at": string | null,"whatsapp_phone": string | null,"zone_pincode": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"alternate_phone"?: string | null,"bio"?: string | null,"categories"?: (string)[],"code"?: string,"created_at"?: string,"email"?: string | null,"emergency_contact_name"?: string | null,"emergency_contact_phone"?: string | null,"experience_years"?: number,"full_name": string,"id"?: string,"languages"?: (string)[],"phone"?: string | null,"photo_url"?: string | null,"preferred_contact"?: string,"rating"?: number | null,"skills"?: (string)[],"status"?: Database["public"]['Enums']["staff_status"],"updated_at"?: string,"verification_status"?: Database["public"]['Enums']["verification_status"],"verified_at"?: string | null,"whatsapp_phone"?: string | null,"zone_pincode"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"alternate_phone"?: string | null,"bio"?: string | null,"categories"?: (string)[],"code"?: string,"created_at"?: string,"email"?: string | null,"emergency_contact_name"?: string | null,"emergency_contact_phone"?: string | null,"experience_years"?: number,"full_name"?: string,"id"?: string,"languages"?: (string)[],"phone"?: string | null,"photo_url"?: string | null,"preferred_contact"?: string,"rating"?: number | null,"skills"?: (string)[],"status"?: Database["public"]['Enums']["staff_status"],"updated_at"?: string,"verification_status"?: Database["public"]['Enums']["verification_status"],"verified_at"?: string | null,"whatsapp_phone"?: string | null,"zone_pincode"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "staff_zone_pincode_fkey"
      columns: ["zone_pincode"]
isOneToOne: false
      referencedRelation: "service_zones"
      referencedColumns: ["pincode"]
    }
                  ]
                },"support_tickets": {
                  Row: {
                    "booking_id": string | null,"category": string,"created_at": string,"customer_id": string,"id": string,"is_priority_customer": boolean,"last_message_at": string,"priority": Database["public"]['Enums']["ticket_priority"],"reference": string,"resolved_at": string | null,"status": Database["public"]['Enums']["ticket_status"],"subject": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id"?: string | null,"category": string,"created_at"?: string,"customer_id": string,"id"?: string,"is_priority_customer"?: boolean,"last_message_at"?: string,"priority"?: Database["public"]['Enums']["ticket_priority"],"reference"?: string,"resolved_at"?: string | null,"status"?: Database["public"]['Enums']["ticket_status"],"subject": string,"updated_at"?: string
                  }
                  Update: {
                    "booking_id"?: string | null,"category"?: string,"created_at"?: string,"customer_id"?: string,"id"?: string,"is_priority_customer"?: boolean,"last_message_at"?: string,"priority"?: Database["public"]['Enums']["ticket_priority"],"reference"?: string,"resolved_at"?: string | null,"status"?: Database["public"]['Enums']["ticket_status"],"subject"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "support_tickets_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "support_tickets_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"ticket_messages": {
                  Row: {
                    "author_id": string | null,"author_role": Database["public"]['Enums']["user_role"] | null,"body": string,"created_at": string,"id": number,"ticket_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"author_role"?: Database["public"]['Enums']["user_role"] | null,"body": string,"created_at"?: string,"id"?: never,"ticket_id": string
                  }
                  Update: {
                    "author_id"?: string | null,"author_role"?: Database["public"]['Enums']["user_role"] | null,"body"?: string,"created_at"?: string,"id"?: never,"ticket_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ticket_messages_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ticket_messages_ticket_id_fkey"
      columns: ["ticket_id"]
isOneToOne: false
      referencedRelation: "support_tickets"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "_clean_languages":
{ Args: { "p_langs": (string)[] }; Returns: (string)[]
                           },
"_greeting_for":
{ Args: { "p_greeting": Omit<Database["public"]['Tables']["greetings"]['Row'], Database["public"]['Tables']["greetings"]['ComputedFields']>,"p_user": string }; Returns: boolean
                           },
"_mask_phones":
{ Args: { "p": Json }; Returns: Json
                           },
"_notify_agency":
{ Args: { "p_body": string,"p_booking": string,"p_title": string }; Returns: undefined
                           },
"_notify_ticket":
{ Args: { "p_body": string,"p_ticket": Omit<Database["public"]['Tables']["support_tickets"]['Row'], Database["public"]['Tables']["support_tickets"]['ComputedFields']>,"p_title": string,"p_to_agency": boolean }; Returns: undefined
                           },
"_offer_eligible":
{ Args: { "p_category"?: string,"p_customer": string,"p_offer": Omit<Database["public"]['Tables']["offers"]['Row'], Database["public"]['Tables']["offers"]['ComputedFields']> }; Returns: boolean
                           },
"_payment_event":
{ Args: { "p_booking": Omit<Database["public"]['Tables']["bookings"]['Row'], Database["public"]['Tables']["bookings"]['ComputedFields']>,"p_reason": string }; Returns: undefined
                           },
"_require_agency":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"_schedules_overlap":
{ Args: { "a": Omit<Database["public"]['Tables']["bookings"]['Row'], Database["public"]['Tables']["bookings"]['ComputedFields']>,"b": Omit<Database["public"]['Tables']["bookings"]['Row'], Database["public"]['Tables']["bookings"]['ComputedFields']> }; Returns: boolean
                           },
"_staff_conflicts":
{ Args: { "p_booking": string,"p_staff": string }; Returns: {
              "address_id": string,
"agreed_price": number | null,
"assigned_staff_id": string | null,
"category_code": string,
"created_at": string,
"customer_id": string,
"days_of_week": (number)[],
"engagement_type": Database["public"]['Enums']["engagement_type"],
"hours_per_day": number | null,
"household_size": number | null,
"id": string,
"language_prefs": (string)[],
"offer_id": string | null,
"offer_title": string | null,
"paid_amount": number | null,
"paid_at": string | null,
"payment_method": string | null,
"payment_reference": string | null,
"payment_status": Database["public"]['Enums']["payment_status"],
"reference": string,
"rooms": number | null,
"special_instructions": string | null,
"start_date": string,
"status": Database["public"]['Enums']["booking_status"],
"status_reason": string | null,
"time_end": string | null,
"time_start": string | null,
"trial_requested": boolean,
"updated_at": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: false
        isSetofReturn: true
      } },
"_transition_booking":
{ Args: { "p_booking_id": string,"p_reason"?: string,"p_to": Database["public"]['Enums']["booking_status"] }; Returns: {
              "address_id": string,
"agreed_price": number | null,
"assigned_staff_id": string | null,
"category_code": string,
"created_at": string,
"customer_id": string,
"days_of_week": (number)[],
"engagement_type": Database["public"]['Enums']["engagement_type"],
"hours_per_day": number | null,
"household_size": number | null,
"id": string,
"language_prefs": (string)[],
"offer_id": string | null,
"offer_title": string | null,
"paid_amount": number | null,
"paid_at": string | null,
"payment_method": string | null,
"payment_reference": string | null,
"payment_status": Database["public"]['Enums']["payment_status"],
"reference": string,
"rooms": number | null,
"special_instructions": string | null,
"start_date": string,
"status": Database["public"]['Enums']["booking_status"],
"status_reason": string | null,
"time_end": string | null,
"time_start": string | null,
"trial_requested": boolean,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"booking_status_label":
{ Args: { "s": Database["public"]['Enums']["booking_status"] }; Returns: string
                           },
"check_serviceable":
{ Args: { "p_pincode": string }; Returns: boolean
                           },
"confirm_payment":
{ Args: { "p_amount"?: number,"p_booking_id": string,"p_method"?: string,"p_reference"?: string }; Returns: {
              "address_id": string,
"agreed_price": number | null,
"assigned_staff_id": string | null,
"category_code": string,
"created_at": string,
"customer_id": string,
"days_of_week": (number)[],
"engagement_type": Database["public"]['Enums']["engagement_type"],
"hours_per_day": number | null,
"household_size": number | null,
"id": string,
"language_prefs": (string)[],
"offer_id": string | null,
"offer_title": string | null,
"paid_amount": number | null,
"paid_at": string | null,
"payment_method": string | null,
"payment_reference": string | null,
"payment_status": Database["public"]['Enums']["payment_status"],
"reference": string,
"rooms": number | null,
"special_instructions": string | null,
"start_date": string,
"status": Database["public"]['Enums']["booking_status"],
"status_reason": string | null,
"time_end": string | null,
"time_start": string | null,
"trial_requested": boolean,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_support_ticket":
{ Args: { "p_booking_id"?: string,"p_category": string,"p_message": string,"p_subject": string }; Returns: {
              "booking_id": string | null,
"category": string,
"created_at": string,
"customer_id": string,
"id": string,
"is_priority_customer": boolean,
"last_message_at": string,
"priority": Database["public"]['Enums']["ticket_priority"],
"reference": string,
"resolved_at": string | null,
"status": Database["public"]['Enums']["ticket_status"],
"subject": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "support_tickets"
        isOneToOne: true
        isSetofReturn: false
      } },
"get_agency_support":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_booking_staff":
{ Args: { "p_booking_id": string }; Returns: {
              "agency_note": string,"assignment_id": string,"assignment_status": Database["public"]['Enums']["assignment_status"],"bio": string,"categories": (string)[],"experience_years": number,"full_name": string,"languages": (string)[],"photo_url": string,"proposed_at": string,"rating": number,"skills": (string)[],"staff_id": string,"verification_status": Database["public"]['Enums']["verification_status"],"verified_at": string
            }[]
                           },
"get_my_greetings":
{ Args: Record<PropertyKey, never>; Returns: {
              "active": boolean,
"audience": string,
"created_at": string,
"created_by": string | null,
"ends_on": string,
"id": string,
"image_path": string | null,
"message": string,
"push_to_inbox": boolean,
"starts_on": string,
"title": string,
"updated_at": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "greetings"
        isOneToOne: false
        isSetofReturn: true
      } },
"get_my_offers":
{ Args: Record<PropertyKey, never>; Returns: {
              "active": boolean,
"audience": string,
"body": string,
"category_code": string | null,
"created_at": string,
"created_by": string | null,
"ends_at": string | null,
"id": string,
"image_path": string | null,
"sort_order": number,
"starts_at": string,
"terms": string | null,
"title": string,
"updated_at": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "offers"
        isOneToOne: false
        isSetofReturn: true
      } },
"get_public_config":
{ Args: Record<PropertyKey, never>; Returns: {
              "key": string,"value": Json
            }[]
                           },
"get_signin_log":
{ Args: { "p_limit"?: number,"p_offset"?: number }; Returns: {
              "action": string,"at": string,"full_name": string,"phone": string,"role": Database["public"]['Enums']["user_role"],"user_id": string
            }[]
                           },
"india_today":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"is_agency":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_developer":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"list_staff_access":
{ Args: Record<PropertyKey, never>; Returns: {
              "full_name": string,"last_sign_in_at": string,"phone": string,"role": Database["public"]['Enums']["user_role"],"signed_up": boolean,"user_id": string
            }[]
                           },
"mark_greeting_seen":
{ Args: { "p_greeting_id": string }; Returns: undefined
                           },
"mark_notifications_read":
{ Args: { "p_ids"?: (string)[] }; Returns: undefined
                           },
"normalize_in_phone":
{ Args: { "p": string }; Returns: string
                           },
"normalize_phone":
{ Args: { "p": string }; Returns: string
                           },
"propose_staff":
{ Args: { "p_booking_id": string,"p_note"?: string,"p_staff_id": string }; Returns: {
              "agency_note": string | null,
"booking_id": string,
"customer_note": string | null,
"decided_at": string | null,
"id": string,
"proposed_at": string,
"proposed_by": string | null,
"staff_id": string,
"status": Database["public"]['Enums']["assignment_status"]
            }
                          SetofOptions: {
        from: "*"
        to: "assignments"
        isOneToOne: true
        isSetofReturn: false
      } },
"reject_payment":
{ Args: { "p_booking_id": string,"p_reason": string }; Returns: {
              "address_id": string,
"agreed_price": number | null,
"assigned_staff_id": string | null,
"category_code": string,
"created_at": string,
"customer_id": string,
"days_of_week": (number)[],
"engagement_type": Database["public"]['Enums']["engagement_type"],
"hours_per_day": number | null,
"household_size": number | null,
"id": string,
"language_prefs": (string)[],
"offer_id": string | null,
"offer_title": string | null,
"paid_amount": number | null,
"paid_at": string | null,
"payment_method": string | null,
"payment_reference": string | null,
"payment_status": Database["public"]['Enums']["payment_status"],
"reference": string,
"rooms": number | null,
"special_instructions": string | null,
"start_date": string,
"status": Database["public"]['Enums']["booking_status"],
"status_reason": string | null,
"time_end": string | null,
"time_start": string | null,
"trial_requested": boolean,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"remove_staff_access":
{ Args: { "p_phone": string }; Returns: undefined
                           },
"reply_to_ticket":
{ Args: { "p_message": string,"p_ticket_id": string }; Returns: {
              "author_id": string | null,
"author_role": Database["public"]['Enums']["user_role"] | null,
"body": string,
"created_at": string,
"id": number,
"ticket_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "ticket_messages"
        isOneToOne: true
        isSetofReturn: false
      } },
"report_error":
{ Args: { "p_app_version"?: string,"p_message": string,"p_platform"?: string,"p_route"?: string,"p_source": string,"p_stack"?: string }; Returns: undefined
                           },
"respond_quotation":
{ Args: { "p_accept": boolean,"p_note"?: string,"p_quotation_id": string }; Returns: {
              "address_id": string,
"agreed_price": number | null,
"assigned_staff_id": string | null,
"category_code": string,
"created_at": string,
"customer_id": string,
"days_of_week": (number)[],
"engagement_type": Database["public"]['Enums']["engagement_type"],
"hours_per_day": number | null,
"household_size": number | null,
"id": string,
"language_prefs": (string)[],
"offer_id": string | null,
"offer_title": string | null,
"paid_amount": number | null,
"paid_at": string | null,
"payment_method": string | null,
"payment_reference": string | null,
"payment_status": Database["public"]['Enums']["payment_status"],
"reference": string,
"rooms": number | null,
"special_instructions": string | null,
"start_date": string,
"status": Database["public"]['Enums']["booking_status"],
"status_reason": string | null,
"time_end": string | null,
"time_start": string | null,
"trial_requested": boolean,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"respond_staff_proposal":
{ Args: { "p_approve": boolean,"p_assignment_id": string,"p_note"?: string }; Returns: {
              "address_id": string,
"agreed_price": number | null,
"assigned_staff_id": string | null,
"category_code": string,
"created_at": string,
"customer_id": string,
"days_of_week": (number)[],
"engagement_type": Database["public"]['Enums']["engagement_type"],
"hours_per_day": number | null,
"household_size": number | null,
"id": string,
"language_prefs": (string)[],
"offer_id": string | null,
"offer_title": string | null,
"paid_amount": number | null,
"paid_at": string | null,
"payment_method": string | null,
"payment_reference": string | null,
"payment_status": Database["public"]['Enums']["payment_status"],
"reference": string,
"rooms": number | null,
"special_instructions": string | null,
"start_date": string,
"status": Database["public"]['Enums']["booking_status"],
"status_reason": string | null,
"time_end": string | null,
"time_start": string | null,
"trial_requested": boolean,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"send_quotation":
{ Args: { "p_agency_fee"?: number,"p_booking_id": string,"p_deposit"?: number,"p_monthly_price": number,"p_scope": string,"p_tax"?: number,"p_terms"?: string,"p_valid_until": string }; Returns: {
              "agency_fee": number,
"booking_id": string,
"created_at": string,
"created_by": string | null,
"customer_note": string | null,
"deposit": number,
"id": string,
"monthly_price": number,
"responded_at": string | null,
"scope": string,
"status": Database["public"]['Enums']["quotation_status"],
"tax": number,
"terms": string | null,
"valid_until": string
            }
                          SetofOptions: {
        from: "*"
        to: "quotations"
        isOneToOne: true
        isSetofReturn: false
      } },
"set_staff_access":
{ Args: { "p_full_name"?: string,"p_phone": string,"p_role": Database["public"]['Enums']["user_role"] }; Returns: undefined
                           },
"set_ticket_priority":
{ Args: { "p_priority": Database["public"]['Enums']["ticket_priority"],"p_ticket_id": string }; Returns: {
              "booking_id": string | null,
"category": string,
"created_at": string,
"customer_id": string,
"id": string,
"is_priority_customer": boolean,
"last_message_at": string,
"priority": Database["public"]['Enums']["ticket_priority"],
"reference": string,
"resolved_at": string | null,
"status": Database["public"]['Enums']["ticket_status"],
"subject": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "support_tickets"
        isOneToOne: true
        isSetofReturn: false
      } },
"set_ticket_status":
{ Args: { "p_note"?: string,"p_status": Database["public"]['Enums']["ticket_status"],"p_ticket_id": string }; Returns: {
              "booking_id": string | null,
"category": string,
"created_at": string,
"customer_id": string,
"id": string,
"is_priority_customer": boolean,
"last_message_at": string,
"priority": Database["public"]['Enums']["ticket_priority"],
"reference": string,
"resolved_at": string | null,
"status": Database["public"]['Enums']["ticket_status"],
"subject": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "support_tickets"
        isOneToOne: true
        isSetofReturn: false
      } },
"staff_candidates":
{ Args: { "p_booking_id": string }; Returns: {
              "code": string,"experience_years": number,"full_name": string,"has_conflict": boolean,"language_match": boolean,"languages": (string)[],"rating": number,"staff_id": string,"status": Database["public"]['Enums']["staff_status"],"verification_status": Database["public"]['Enums']["verification_status"],"zone_match": boolean,"zone_pincode": string
            }[]
                           },
"submit_enquiry":
{ Args: { "p_address_id": string,"p_category_code": string,"p_days_of_week": (number)[],"p_engagement_type": Database["public"]['Enums']["engagement_type"],"p_hours_per_day"?: number,"p_household_size"?: number,"p_language_prefs"?: (string)[],"p_offer_id"?: string,"p_rooms"?: number,"p_special_instructions"?: string,"p_start_date": string,"p_time_end"?: string,"p_time_start"?: string,"p_trial_requested"?: boolean }; Returns: {
              "address_id": string,
"agreed_price": number | null,
"assigned_staff_id": string | null,
"category_code": string,
"created_at": string,
"customer_id": string,
"days_of_week": (number)[],
"engagement_type": Database["public"]['Enums']["engagement_type"],
"hours_per_day": number | null,
"household_size": number | null,
"id": string,
"language_prefs": (string)[],
"offer_id": string | null,
"offer_title": string | null,
"paid_amount": number | null,
"paid_at": string | null,
"payment_method": string | null,
"payment_reference": string | null,
"payment_status": Database["public"]['Enums']["payment_status"],
"reference": string,
"rooms": number | null,
"special_instructions": string | null,
"start_date": string,
"status": Database["public"]['Enums']["booking_status"],
"status_reason": string | null,
"time_end": string | null,
"time_start": string | null,
"trial_requested": boolean,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"submit_payment":
{ Args: { "p_booking_id": string,"p_method": string,"p_reference": string }; Returns: {
              "address_id": string,
"agreed_price": number | null,
"assigned_staff_id": string | null,
"category_code": string,
"created_at": string,
"customer_id": string,
"days_of_week": (number)[],
"engagement_type": Database["public"]['Enums']["engagement_type"],
"hours_per_day": number | null,
"household_size": number | null,
"id": string,
"language_prefs": (string)[],
"offer_id": string | null,
"offer_title": string | null,
"paid_amount": number | null,
"paid_at": string | null,
"payment_method": string | null,
"payment_reference": string | null,
"payment_status": Database["public"]['Enums']["payment_status"],
"reference": string,
"rooms": number | null,
"special_instructions": string | null,
"start_date": string,
"status": Database["public"]['Enums']["booking_status"],
"status_reason": string | null,
"time_end": string | null,
"time_start": string | null,
"trial_requested": boolean,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"ticket_response_target":
{ Args: { "p": Database["public"]['Enums']["ticket_priority"] }; Returns: string
                           },
"update_booking_status":
{ Args: { "p_booking_id": string,"p_reason"?: string,"p_to": Database["public"]['Enums']["booking_status"] }; Returns: {
              "address_id": string,
"agreed_price": number | null,
"assigned_staff_id": string | null,
"category_code": string,
"created_at": string,
"customer_id": string,
"days_of_week": (number)[],
"engagement_type": Database["public"]['Enums']["engagement_type"],
"hours_per_day": number | null,
"household_size": number | null,
"id": string,
"language_prefs": (string)[],
"offer_id": string | null,
"offer_title": string | null,
"paid_amount": number | null,
"paid_at": string | null,
"payment_method": string | null,
"payment_reference": string | null,
"payment_status": Database["public"]['Enums']["payment_status"],
"reference": string,
"rooms": number | null,
"special_instructions": string | null,
"start_date": string,
"status": Database["public"]['Enums']["booking_status"],
"status_reason": string | null,
"time_end": string | null,
"time_start": string | null,
"trial_requested": boolean,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            "assignment_status": "proposed"|"approved"|"rejected"|"withdrawn"|"ended","booking_status": "enquiry_submitted"|"under_review"|"quotation_sent"|"staff_matching"|"staff_proposed"|"confirmed"|"active"|"completed"|"cancelled_by_customer"|"cancelled_by_agency"|"unable_to_serve","engagement_type": "hourly"|"daily"|"part_time"|"full_time"|"monthly"|"live_in","payment_status": "unpaid"|"pending_verification"|"paid","quotation_status": "sent"|"accepted"|"rejected"|"superseded","staff_status": "available"|"assigned"|"on_leave"|"inactive","ticket_priority": "normal"|"high"|"urgent","ticket_status": "open"|"in_progress"|"resolved"|"closed","user_role": "customer"|"coordinator"|"admin"|"developer","verification_status": "pending"|"in_progress"|"verified"|"rejected"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "assignment_status": ["proposed", "approved", "rejected", "withdrawn", "ended"],"booking_status": ["enquiry_submitted", "under_review", "quotation_sent", "staff_matching", "staff_proposed", "confirmed", "active", "completed", "cancelled_by_customer", "cancelled_by_agency", "unable_to_serve"],"engagement_type": ["hourly", "daily", "part_time", "full_time", "monthly", "live_in"],"payment_status": ["unpaid", "pending_verification", "paid"],"quotation_status": ["sent", "accepted", "rejected", "superseded"],"staff_status": ["available", "assigned", "on_leave", "inactive"],"ticket_priority": ["normal", "high", "urgent"],"ticket_status": ["open", "in_progress", "resolved", "closed"],"user_role": ["customer", "coordinator", "admin", "developer"],"verification_status": ["pending", "in_progress", "verified", "rejected"]
          }
        }
} as const
