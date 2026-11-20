-- The v2 migration seeded placeholder support numbers and a UPI ID. Those could belong to
-- real people, so clear them: the agency must enter its own in Account -> Agency settings
-- before customers can pay by UPI or see support contacts.
update public.agency_settings
set upi_id = null,
    upi_payee_name = null,
    support_phone = null,
    whatsapp_phone = null,
    alternate_phone = null,
    support_email = null
where upi_id = 'manemaid@upi'
   or support_phone in ('918040001234')
   or alternate_phone in ('919900001234');
