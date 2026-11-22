// ManeMaid Terms of Service and Privacy Policy shown in the app (Profile → Terms & privacy).
// DRAFT for the MVP: have a lawyer review this before public launch, and update the
// grievance contact once the agency's legal entity and officer are confirmed.

export const LEGAL_UPDATED = '20 November 2026';

export type LegalSection = { title: string; icon: string; body: string[] };

export const TERMS: LegalSection[] = [
  {
    title: 'About ManeMaid',
    icon: 'home',
    body: [
      'ManeMaid is an agency-managed home help service. You request a service in the app, the agency reviews it, sends you a quotation and proposes a verified staff member. Nothing is confirmed until you approve both the quotation and the staff member.',
      'Staff are recruited, verified and managed by the agency. ManeMaid is not an open marketplace and staff cannot sign up on their own.',
    ],
  },
  {
    title: 'Your account',
    icon: 'person',
    body: [
      'You sign in with your mobile number and a one-time code. You must be at least 18 years old and give accurate details, including your name and service address.',
      'Keep your phone secure. You are responsible for requests made from your account. Tell us immediately if you think someone else has used it.',
    ],
  },
  {
    title: 'Requests, quotations and bookings',
    icon: 'document-text',
    body: [
      'Submitting a request is free and does not commit you to anything.',
      'A quotation shows the scope of work, the monthly price, any tax and its validity date. Accepting it, and then approving the proposed staff member, confirms your booking on those terms.',
      'You can ask for changes to a quotation or request a different staff member before you approve. Every change is recorded with the reason given.',
    ],
  },
  {
    title: 'Payments',
    icon: 'wallet',
    body: [
      'You pay the agency the amount shown in your accepted quotation, by UPI or another method the agency accepts. After paying by UPI, submit the transaction reference in the app so the agency can verify it.',
      'Payments are made directly to the agency. The app does not hold your money or store card or bank details. Please do not pay staff directly for agency services.',
      'If a payment cannot be verified, the agency will tell you why in the app. Raise a Payment request in Support if anything looks wrong.',
    ],
  },
  {
    title: 'Cancellations and replacements',
    icon: 'swap-horizontal',
    body: [
      'You can cancel a booking in the app before or after it is confirmed. A reason is required. Notice periods or charges in your quotation terms apply.',
      'If your staff member is absent, late or not the right fit, raise a Support request. The agency will arrange a backup or replacement in line with your quotation terms.',
    ],
  },
  {
    title: 'Respect and safety',
    icon: 'shield-checkmark',
    body: [
      'Please treat staff with respect and provide a safe place to work, including reasonable breaks, access to drinking water and a toilet.',
      'Harassment, abuse or unsafe conditions for either customers or staff are not tolerated, and may lead to the booking being ended.',
      'In an emergency, call 112 first. Then raise a Safety request in the app, which is always handled as urgent.',
    ],
  },
  {
    title: 'Support',
    icon: 'headset',
    body: [
      'Anyone can raise a support request in the app. Safety requests are answered within 1 hour, requests from customers with a paid booking within 4 hours, and other requests within 24 hours.',
      'Customers with a confirmed payment also get the agency’s direct phone and WhatsApp line in the app.',
    ],
  },
  {
    title: 'Our responsibility',
    icon: 'information-circle',
    body: [
      'The agency verifies staff as described on their profile, and handles replacements and complaints. We do our best to keep the service reliable, but cannot guarantee it will always be uninterrupted.',
      'To the extent permitted by law, we are not responsible for indirect losses. Nothing in these terms limits your rights under the Consumer Protection Act, 2019, or other applicable law.',
    ],
  },
  {
    title: 'Changes to these terms',
    icon: 'create',
    body: [
      'We may update these terms. If a change is significant, we will tell you in the app before it takes effect. Continuing to use the app after that means you accept the updated terms.',
      'These terms are governed by the laws of India.',
    ],
  },
];

export const PRIVACY: LegalSection[] = [
  {
    title: 'What we collect',
    icon: 'folder-open',
    body: [
      'Account: your mobile number, name, an optional profile photo and an optional email address.',
      'Service: your addresses and access instructions, booking details (service, schedule, household size, language preference, special instructions), quotations, your approvals and the reasons you give.',
      'Payments: the amount, method and transaction reference you submit. We never collect card numbers, UPI PINs or bank passwords.',
      'Support: the requests and messages you send us.',
    ],
  },
  {
    title: 'How we use it',
    icon: 'construct',
    body: [
      'To check that we serve your area, prepare quotations, match and propose staff, schedule visits, verify payments, give you support and send booking updates.',
      'To keep an audit trail of booking changes, payments and support requests, so disputes can be resolved fairly.',
      'Offers by email: only if you switch on “Send me offers by email” in your profile. We record when you agreed, and you can switch it off at any time. (Draft wording — for legal review.)',
      'We do not sell your data and do not use it for third-party advertising.',
    ],
  },
  {
    title: 'Who can see it',
    icon: 'eye',
    body: [
      'Agency team: your details, so they can manage your bookings and support requests.',
      'Your assigned staff member: only what they need to do the job, such as your name, service address, access instructions and schedule.',
      'Other customers: nothing about you.',
      'Staff privacy works the same way. Customers see a staff member’s name, photo, experience, languages and verification status, never their personal phone number, home address or identity documents.',
      'Service providers who run the app for us (such as hosting and SMS delivery) process data only on our instructions.',
    ],
  },
  {
    title: 'How we protect it',
    icon: 'lock-closed',
    body: [
      'Data is sent over encrypted connections. Access rules in our database ensure each customer can only see their own bookings, addresses, payments and messages.',
      'Every booking, payment and support change is logged with who made it and when.',
    ],
  },
  {
    title: 'How long we keep it',
    icon: 'time',
    body: [
      'We keep your account and booking history while your account is active. After you close it, we delete or anonymise your data, except where we must keep records longer by law, for example for tax, accounting or dispute resolution.',
    ],
  },
  {
    title: 'Your rights',
    icon: 'hand-left',
    body: [
      'Under the Digital Personal Data Protection Act, 2023, you can ask to access, correct or delete your personal data, withdraw consent, and nominate someone to exercise these rights for you.',
      'You can update your name, photo and addresses in the app at any time. For anything else, raise a Privacy request in Support. We will respond within the time the law requires.',
    ],
  },
  {
    title: 'Children',
    icon: 'happy',
    body: [
      'The app is for adults. If you book child care, we only collect the details about your child that are needed to provide the service, such as age and care requirements, and only with your consent as a parent or guardian.',
    ],
  },
  {
    title: 'Contact and grievances',
    icon: 'mail',
    body: [
      'For privacy questions or complaints, raise a Privacy request in Support. Our grievance officer will respond and work to resolve it.',
      'If you are not satisfied, you can approach the Data Protection Board of India.',
    ],
  },
];
