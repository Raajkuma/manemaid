-- Local development seed data (runs on `supabase db reset`).
-- Matches the sample data in the Figma prototype (src/App.tsx).

-- Agency users: anyone signing in with these phones becomes agency staff.
-- 919999900099 has the local test OTP 123456 (see supabase/config.toml).
insert into public.admin_phones (phone, role, full_name) values
  ('919999900099', 'admin', 'ManeMaid Admin');

insert into public.service_categories (code, name, description, sort_order) values
  ('home_care',    'Home care',    'Daily cleaning, dusting, mopping and laundry', 1),
  ('cooking',      'Cooking',      'Home-style meals prepared to your family''s taste', 2),
  ('child_care',   'Child care',   'Trained nannies for infants and young children', 3),
  ('elder_care',   'Elder care',   'Companionship and daily assistance for seniors', 4),
  ('housekeeping', 'Housekeeping', 'Deep cleaning and full home upkeep', 5),
  ('live_in',      'Live-in help', 'Full-time help who stays with your family', 6);

insert into public.service_zones (pincode, area_name, city) values
  ('560038', 'Indiranagar', 'Bengaluru'),
  ('560034', 'Koramangala', 'Bengaluru'),
  ('560102', 'HSR Layout',  'Bengaluru'),
  ('560066', 'Whitefield',  'Bengaluru'),
  ('560041', 'Jayanagar',   'Bengaluru');

insert into public.staff
  (code, full_name, phone, categories, skills, languages, experience_years, zone_pincode,
   bio, verification_status, verified_at, status, rating)
values
  ('ST-0184', 'Sunita Sharma', '919800000184', '{home_care,housekeeping}',
   '{cleaning,laundry,ironing}', '{Hindi,Kannada}', 8, '560038',
   'Reliable and detail-oriented, with eight years of experience in family homes.',
   'verified', now() - interval '60 days', 'available', 4.9),
  ('ST-0217', 'Meena Kumari', '919800000217', '{cooking}',
   '{north_indian,south_indian,tiffin}', '{Hindi,Tamil}', 6, '560034',
   'Cooks fresh North and South Indian meals; comfortable with dietary requirements.',
   'verified', now() - interval '45 days', 'available', 4.8),
  ('ST-0096', 'Asha Devi', '919800000096', '{child_care}',
   '{infant_care,first_aid,homework_help}', '{Hindi,English}', 10, '560102',
   'Experienced nanny with first-aid training.',
   'verified', now() - interval '90 days', 'available', 4.9),
  ('ST-0241', 'Lakshmi Rao', '919800000241', '{housekeeping,home_care}',
   '{deep_cleaning,organising}', '{Kannada,Telugu}', 3, '560066',
   'New to the agency; verification in progress.',
   'in_progress', null, 'available', null),
  ('ST-0159', 'Farida Begum', '919800000159', '{elder_care,home_care}',
   '{mobility_support,medication_reminders,companionship}', '{Urdu,Hindi,Kannada}', 12, '560041',
   'Patient and caring; experienced with seniors who need daily support.',
   'verified', now() - interval '30 days', 'available', 4.7);

-- Quotation scope templates (moved here from the v2 migration: they need the categories above).
insert into public.scope_templates (title, body, category_code, sort_order) values
  ('Daily home cleaning',
   'Sweeping and mopping all rooms, dusting furniture, cleaning kitchen counters and sink, washing utensils and taking out the trash.',
   'home_care', 1),
  ('Cooking – breakfast & lunch',
   'Preparing breakfast and lunch for the household as per the family''s menu, chopping and prep, and cleaning the kitchen after cooking.',
   'cooking', 2),
  ('Nanny – day care',
   'Feeding, bathing and dressing the child, play and nap routine, keeping the child''s room tidy and sharing daily updates with parents.',
   'child_care', 3),
  ('Elder care – daytime',
   'Companionship, help with mobility and bathing, medication reminders, simple meals and light housekeeping of the room.',
   'elder_care', 4),
  ('Deep cleaning',
   'Full home deep clean: bathrooms, kitchen degreasing, windows, fans and fixtures, cupboards and balconies.',
   'housekeeping', 5),
  ('Live-in help',
   'Full-time live-in help: daily cleaning, cooking assistance, laundry and household support. Weekly off as agreed.',
   'live_in', 6);
