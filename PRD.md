# Agency-Mediated Domestic Help Platform — Product Requirements Document

**Version:** 2.1  
**Status:** Revised product specification for MVP planning  
**Primary launch market:** India (launch city and state to be confirmed)  
**Platforms:** Customer mobile app (iOS and Android) + Agency Admin/Operations web portal  
**Staff app:** Out of scope for MVP; staff are managed centrally by agency personnel  
**Business model:** Managed domestic-help agency platform, not an open gig marketplace

---

## 1. Executive Summary

Build a trusted, agency-mediated platform through which customers can discover and request domestic-help services, receive quotations, approve assigned workers, manage recurring services, confirm attendance, raise issues and request replacements.

Agency teams use a web portal to manage enquiries, customers, staff profiles, verification records, availability, assignments, attendance, service continuity, complaints, payments and operational reporting.

The MVP is for **one small agency only**. It will have one centralized agency admin portal, with access for **one or two named agency users**. The product does not need multi-tenant SaaS, multiple agency accounts or branch-management features for the initial implementation. Keep the architecture straightforward and avoid building scale-oriented complexity before the agency needs it.

### Product vision

Make arranging and managing reliable domestic help predictable, transparent and safe for both households and agencies.

### Core value propositions

- **Customers:** Trust, clear pricing, visibility, continuity of service and responsive support.
- **Agency owner / coordinator:** A simple centralized workspace for faster matching, fewer missed shifts, structured payments and clear operational visibility.
- **Workers:** Accurate assignments, fair and traceable attendance records, clear work expectations and a documented grievance channel.

---

## 2. Business Model and Scope

### 2.1 Operating model

This is a managed service model:

1. Customers submit a service enquiry or booking request.
2. The agency reviews requirements and confirms serviceability.
3. The agency proposes a suitable worker or shortlist.
4. The customer reviews the profile and approves or requests another option.
5. The agency confirms the assignment and commercial terms.
6. The customer and agency track service status and attendance.
7. The agency handles leave, backup, replacement, complaints and renewals.

Workers do not need an app in the MVP. Coordinators can record confirmations received by phone, SMS or WhatsApp. The system must identify the source of each attendance record and must not represent a manual update as customer-verified attendance.

### 2.2 User groups

- Customer / household member
- Agency Admin / Owner (primary portal user)
- Agency Coordinator (optional second portal user)
- Customer / household member

The agency may have only one portal account initially. A second named account can be added when needed.

### 2.3 In scope for MVP

- Customer mobile app
- Agency web portal
- Single-agency data model and centralized administration
- Customer onboarding and saved addresses
- Service enquiry and booking lifecycle
- Staff roster and verification status
- Staff availability and assignment
- Customer approval of assigned staff
- Booking status notifications
- Attendance recording and exception handling
- Backup and replacement requests
- Basic complaints and support tickets
- Configurable quotations, invoices and payment status
- Audit trail and operational dashboard
- Secure staff document storage

### 2.4 Explicitly out of scope for MVP

- Multi-agency / multi-tenant SaaS support
- Multiple branch administration
- Complex configurable role and permission management
- Dedicated worker mobile app
- Open marketplace / worker self-registration
- Automated worker payouts or payroll
- Complex route optimization
- AI-based autonomous worker assignment
- Cross-border operations
- Full accounting / tax filing system
- Automated biometric attendance
- In-app video calling

These can be considered in later phases after validating operational demand.

---

## 3. Target Market, Positioning and Validation

### 3.1 Target customers

- Urban households requiring recurring part-time or full-time help
- Families requiring cooks, nannies or elder-care assistance
- Working professionals needing dependable household support
- Gated communities and residential associations
- Domestic-help agencies seeking to digitize operations

### 3.2 Service categories

Initial service catalogue (confirm for launch city):

- House cleaning / maid
- Cooking
- Babysitting / nanny
- Elder-care assistance
- Live-in domestic help
- Hourly or short-duration help

Do not imply that all categories have the same screening, training, insurance or regulatory requirements. Elder care and childcare may require additional qualification and safeguarding processes.

### 3.3 Competitor positioning

The initial PRD identifies Urban Company, Snabbit, Pronto, BookMyBai, Broomers, Homeaglow, Handy, Justlife and SweepSouth as reference competitors.

Treat competitor gaps in the original document as hypotheses, not proven facts. Before launch, conduct a city-specific competitor review covering:
- Service categories and engagement types
- Price structure and minimum commitment
- Worker verification claims
- Replacement policy and actual SLA
- Customer support channels
- Availability and service-area coverage
- Cancellation and refund rules
- Customer reviews and recurring-service experience

### 3.4 Differentiation

Position around:
- Agency-managed and verified worker network
- Customer-approved staff assignment
- Reliable recurring-service continuity
- Transparent quotation and replacement policy
- Traceable attendance and issue resolution
- Agency operational visibility

---

## 4. Customer Mobile App Requirements

### 4.1 Registration and authentication

- Phone-number registration with OTP.
- Secure session management and logout from all devices.
- Basic profile: name, email (optional), preferred language.
- Consent and privacy notices at relevant collection points.
- Account deletion / closure request workflow, subject to lawful retention obligations.
- Rate limiting, OTP expiry and resend limits.

### 4.2 Address management

- Add, edit, delete and select saved addresses.
- Map pin and address text.
- Apartment / building / flat number.
- Landmark, access instructions and gated-community entry notes.
- Serviceability check by PIN code / defined service zone.
- Customer can set a default address.
- Restrict access to address details to authorized agency users handling the booking.

### 4.3 Service request builder

Capture:
- Service category
- Engagement type: hourly, daily, part-time, full-time, monthly or live-in
- Required start date
- Preferred days and time window
- Expected duration / hours per day
- Number of household members, where relevant
- House size / rooms, where relevant
- Required skills and duties
- Language preference
- Experience preference
- Special instructions
- Address
- Trial requirement
- Preferred worker gender, only where lawful and operationally justified
- Accessibility or care-related requirements where relevant and handled sensitively

Show only fields relevant to the selected service category.

### 4.4 Enquiry, quotation and booking

- Submit an enquiry without being forced to pay immediately.
- Display enquiry reference number and status.
- Agency can send a quotation with service scope, schedule, price, fees, deposit, taxes if applicable, cancellation terms and validity date.
- Customer can accept, reject or request clarification.
- Customer can request a trial where supported.
- Customer explicitly approves the worker before assignment is finalized.
- Show booking summary and agreed terms.
- Maintain a record of customer acceptance and timestamp.

### 4.5 Booking status tracker

Recommended lifecycle:

`Draft → Enquiry Submitted → Under Review → Awaiting Quotation → Quotation Sent → Awaiting Customer Approval → Staff Matching → Staff Proposed → Awaiting Customer Approval → Confirmed → Scheduled → Active → Paused / Issue Raised → Completed`

Alternative terminal or exception states:
- Rejected
- Cancelled by customer
- Cancelled by agency
- Expired
- Unable to Serve
- Replacement Pending

Do not allow arbitrary status changes. Define valid transitions, permitted roles, required reasons and notification behavior.

### 4.6 Assigned staff profile

Show only information needed for customer trust and decision-making:
- Name and profile photo
- Relevant experience
- Skills and service category
- Languages
- Agency verification status and verification date (not raw identity documents)
- Relevant training / certifications, if validated
- Agency support contact

Do not expose personal phone numbers, home addresses, identity numbers or document images by default. Use controlled / masked communication where possible.

### 4.7 Attendance and service confirmation

- Customer OTP or in-app arrival confirmation.
- Separate start and end attendance events where applicable.
- OTP expiry, retry limit and resend control.
- Optional coordinator-entered attendance.
- Optional IVR / WhatsApp check-in in a later phase.
- Record source: customer OTP, customer action, coordinator, IVR or integration.
- Record timestamp and actor for every event.
- Late / missed check-in alerts.
- Dispute flow when customer and agency records differ.
- Attendance correction requires a reason and audit entry.

A customer arrival button should not be treated as equivalent to verified start and end attendance unless the process actually captures both.

### 4.8 Leave, backup and replacement

Customer can:
- Report planned leave
- Report same-day absence / no-show
- Request temporary backup
- Request permanent replacement
- Provide reason and optional details
- View ticket status and expected response time

Agency must:
- Set priority and target SLA
- Record reason and affected service date
- Assign backup / replacement
- Obtain customer approval for a new worker
- Track whether the original worker returns
- Record replacement history and resolution

### 4.9 Complaints and support

- Raise a ticket against a booking or worker assignment.
- Categories: punctuality, behavior, quality, absence, safety, payment, privacy, other.
- Priority and severity.
- Attach optional evidence with privacy warning and file limits.
- Ticket status, owner, comments and resolution.
- Escalation path and SLA.
- Customer can reopen within a configurable period.
- Safety-related complaints must have a priority escalation path and restricted access.

### 4.10 Notifications

Push notifications and in-app inbox for:
- Enquiry received
- Quotation ready
- Staff proposed / approved
- Booking confirmed
- Upcoming service reminder
- Attendance exception
- Leave / backup / replacement updates
- Payment due / successful / failed
- Invoice available
- Complaint update
- Renewal reminder

Provide notification preferences and avoid exposing sensitive details in lock-screen messages.

### 4.11 Customer history and feedback

- Booking and service history
- Invoices and payment receipts
- Replacement and complaint history
- Rate the service after an eligible period or completed booking
- Separate rating dimensions: punctuality, service quality, professionalism and overall experience
- Prevent duplicate or abusive reviews; allow agency response and moderation

---

## 5. Agency Admin and Operations Portal

### 5.1 Single-agency portal setup

- One agency profile and one centralized admin portal for the MVP.
- No tenant switching, agency self-onboarding or multi-agency data partitioning is required.
- No branch-management module is required. The agency can maintain service areas / PIN codes as operational coverage settings.
- Store the agency name, logo, contact details, service areas, currency, timezone, business hours and notification settings in one configuration area.
- Agency staff, customers, bookings, documents and reports belong to this single agency.
- Keep the data model and deployment simple; multi-agency SaaS support can be considered separately only if the business direction changes.

### 5.2 Admin user access (one or two users)

The portal is intended for one or two named users, not a large operations team.

| Account type | Typical permissions |
|---|---|
| Agency Admin / Owner | Full access to staff, customers, bookings, assignments, verification records, finance, reports and settings |
| Agency Coordinator (optional second user) | Day-to-day enquiries, bookings, staff availability, assignments, attendance, leave, replacements and support tickets; restricted access to sensitive settings and financial actions unless explicitly granted |

Requirements:
- Support one admin account at launch and the option to add one more named user.
- Use individual logins; do not share one username and password between users.
- Basic role-based permissions for Admin and Coordinator are sufficient. Do not build a complex permission designer.
- Require strong authentication and MFA for admin accounts where supported.
- Allow the Admin to deactivate the second account and revoke active sessions.
- Record actor, timestamp, entity, action and before/after values for sensitive changes in the audit log.
- Customer accounts remain separate from agency portal accounts.

### 5.3 Staff roster and profile management

Staff record:
- Internal staff ID
- Name and preferred display name
- Photo
- Contact details
- Emergency contact (restricted access)
- Address / service locality (restricted access)
- Skills and service categories
- Experience and references
- Languages
- Preferred work schedule
- Service zones / PIN codes
- Engagement preferences
- Training and qualifications
- Verification status
- Employment / agency relationship status
- Notes with access restrictions

Staff statuses:
`New → Verification Pending → Verified → Available → Assigned → On Leave / Unavailable → Inactive / Suspended`

Keep availability separate from verification and employment status.

### 5.4 Verification and document management

- Verification checklist by service category.
- Identity verification status and verification date.
- Address verification status.
- Background / police verification status, where legally available and appropriate.
- Reference check status.
- Qualification / training validation.
- Document type, issue date, expiry date and verification owner.
- Expiry alerts and re-verification workflow.
- Document access only to authorized roles.
- Download access logged.
- Private object storage; no public document URLs.
- Malware scanning and file type / size validation.
- Retention and secure deletion policy.
- Customer sees verification status, not underlying documents.

Never label a worker “police verified” unless the agency has actually completed and recorded the relevant process.

### 5.5 Availability calendar

- Weekly recurring availability.
- One-time exceptions, leave and holidays.
- Shift start / end and travel buffer.
- Availability by service zone.
- Conflict prevention for overlapping assignments.
- Coordinator override with reason and audit log.
- Assignment should reserve the worker's slot only after the defined confirmation step.

### 5.6 Staff matching and assignment

Filter / rank candidates by:
- Required skill
- Service category
- PIN code / service zone
- Travel distance (where location data is available and consented)
- Availability and shift fit
- Language
- Experience / qualifications
- Customer preferences
- Previous service performance
- Existing workload

The system may recommend candidates, but the coordinator makes the final assignment in MVP.

Assignment workflow:
1. Review service requirements.
2. View eligible staff and mismatch reasons.
3. Contact staff offline and confirm availability.
4. Propose staff to customer.
5. Obtain customer approval.
6. Confirm assignment and reserve availability.
7. Notify customer and relevant staff/coordinator.
8. Preserve assignment history for reassignment.

Prevent double booking with database-level transactional safeguards.

### 5.7 Operations dashboard and work queue

Dashboard widgets:
- New enquiries
- Awaiting quotation
- Awaiting customer approval
- Unassigned bookings
- Today's scheduled services
- Late / missing attendance
- Leave and backup requests
- Open complaints
- Pending payments
- Renewals due

Filters:
- Service category
- Date range
- Status
- Coordinator
- PIN code / zone
- Priority

Include saved views, pagination, bulk actions with confirmation and export permissions.

### 5.8 Attendance and exception management

- Daily attendance board.
- Expected start / end time.
- Check-in source and verification level.
- Late threshold configuration.
- Missing check-in alert.
- No-show classification.
- Coordinator correction with mandatory reason.
- Customer dispute handling.
- Attendance history per booking and worker.
- Reports for lateness, absence and disputed records.

### 5.9 Leave and replacement operations

- Staff leave request recorded by coordinator.
- Leave approval / rejection.
- Affected bookings automatically flagged.
- Backup assignment queue.
- Temporary versus permanent replacement.
- Customer approval and notification.
- SLA timers and escalation.
- Track unresolved coverage gaps.

### 5.10 Customer and CRM management

- Customer profile and contact preferences.
- Multiple household addresses.
- Enquiry and booking history.
- Service preferences.
- Communication log.
- Complaints and resolutions.
- Renewal and follow-up reminders.
- Customer status and consent history.
- Duplicate customer detection / merge with audit.

### 5.11 Support and complaint management

- Unified ticket inbox.
- Ticket category, severity, priority and SLA.
- Assignment to an owner / team.
- Internal notes separate from customer-visible messages.
- Escalation and resolution codes.
- Safety incident workflow with restricted visibility.
- Full audit trail.

### 5.12 Finance and commercial operations

- Quotation creation and revision.
- One-time, hourly, daily and recurring price models.
- Agency-defined service fees, deposits and discounts.
- Invoice generation and downloadable PDF.
- Payment status and gateway reference.
- Manual payment entry with proof / reference and audit.
- Refund request, approval and status.
- Cancellation fee and refund calculation.
- Outstanding balance and reminders.
- Reconciliation report.
- Exportable transaction history.

Do not treat a manually marked “paid” record as a verified gateway transaction.

### 5.13 Reporting

- Enquiries and conversion rate
- Bookings by service category and service area
- Active recurring customers
- Revenue and collections
- Outstanding receivables
- Refunds and discounts
- Staff utilization
- Assignment lead time
- Replacement rate
- No-show and late attendance rate
- Complaint volume and resolution time
- Customer retention and renewal rate
- Coordinator workload and performance

Reports must support date filters, consistent definitions and access-appropriate exports. Branch-level reporting is not required for the single-agency MVP.

---

## 6. Booking, Service and Commercial Rules

### 6.1 Booking lifecycle

Maintain a formal state machine. Each transition must define:
- Current state
- Allowed next state
- Authorized role
- Required fields / reason
- Customer notification
- Financial side effect, if any
- Audit event

### 6.2 Cancellation and rescheduling

Define policies for:
- Customer cancellation before assignment
- Customer cancellation after assignment
- Cancellation after service commencement
- Agency cancellation
- Worker unavailability
- Rescheduling and missed service
- Late cancellation fees
- Refund eligibility and processing time

Policies should be visible before customer acceptance and configurable by service / agency.

### 6.3 Trials

Where supported:
- Trial duration and price
- Trial booking status
- Trial feedback
- Conversion to recurring service
- Trial cancellation / refund rules

### 6.4 Recurring services

- Recurrence pattern and service calendar.
- Planned holidays and skipped visits.
- Pause / resume.
- Temporary worker substitution.
- Renewal date and reminders.
- Price change notification and customer acceptance.
- Contract / service-term history.
- Service end date and closure process.

### 6.5 Pricing model

Support configurable components:
- Base service price
- Duration / frequency
- Service category
- Location / zone
- Live-in or special schedule surcharge
- Trial fee
- Agency fee
- Discount
- Deposit
- Taxes, where applicable

Store the agreed price snapshot against each booking so future price changes do not rewrite historical invoices.

### 6.6 Payment architecture

Decide the payment model before implementation, even if gateway integration is phased.

Recommended payment entities:
- Payment intent / attempt
- Gateway transaction reference
- Payment method (tokenized reference only; never store raw card data)
- Amount and currency
- Status
- Refund
- Invoice
- Reconciliation record
- Subscription / mandate reference, if used

Support idempotent payment webhooks, duplicate-event protection, failed payment retries, refund tracking and reconciliation.

For India, recurring payment implementation must be reviewed against the RBI e-mandate framework and the selected payment provider's current requirements. Do not assume that a generic “subscription toggle” is sufficient.

---

## 7. Trust, Safety, Privacy and Compliance

This is a core product capability, not a later enhancement.

### 7.1 Customer and worker safety

- Verified agency identity and contact details.
- Documented staff verification process.
- Customer approval before final assignment.
- Controlled sharing of worker/customer contact information.
- Safety incident reporting and escalation.
- Complaint history and resolution tracking.
- Emergency support contact / instructions.
- Clear service scope and prohibited tasks.
- Worker grievance and incident reporting channel.
- No discriminatory or unsupported verification claims.

### 7.2 Privacy and personal data

Design for applicable Indian privacy obligations, including the Digital Personal Data Protection Act, 2023 and notified DPDP Rules, 2025. Obtain legal advice on commencement timelines, applicability and the agency/platform's respective roles.

Requirements:
- Clear privacy notice and purpose-specific consent where required.
- Collect only necessary data.
- Separate access to identity documents, contact data and operational notes.
- Data retention schedule by data type.
- Correction / access / erasure request workflow, as applicable.
- Consent withdrawal handling.
- Breach detection and incident response process.
- Vendor / processor agreements.
- Data export and deletion controls.
- Encryption in transit and at rest.
- Secure backups and restore testing.
- No sensitive information in push notification previews or application logs.

### 7.3 Children and care-related services

For nanny / childcare and elder-care categories:
- Additional service-specific onboarding and screening.
- Guardian / authorized contact details where relevant.
- Emergency contact and escalation process.
- Clear task boundaries and qualifications.
- Restricted access to sensitive care notes.
- Legal review of safeguarding obligations before enabling the category.

### 7.4 Legal and operational review

Domestic worker placement and agency requirements may vary by state / Union Territory. Before launch, obtain local legal review for the selected state and city covering:
- Agency registration / licensing requirements, if any
- Labour and wage obligations
- Worker engagement / employment classification
- Police verification process and lawful handling of records
- Childcare / elder-care service obligations
- Consumer protection, contracts and refunds
- GST / invoicing and applicable taxes
- Insurance and liability
- Data protection and retention

Do not assume a single national rule applies uniformly to all agency operations.

---

## 8. Notifications and Communication

Channels:
- Push notifications
- In-app notification inbox
- SMS
- WhatsApp Business API, subject to provider approval and template rules
- Email for invoices / formal communication

Requirements:
- Notification templates per event and language.
- User preferences and opt-out where applicable.
- Delivery status and failure tracking.
- Retry policy and dead-letter handling.
- Rate limits and duplicate suppression.
- Sensitive-data redaction.
- Agency alert escalation if a high-priority request remains unacknowledged.
- Notification history linked to booking / ticket.

Do not make WhatsApp or SMS the sole source of truth. The platform database remains authoritative.

---

## 9. Non-Functional Requirements

### 9.1 Security

- Secure admin authentication and role-based access for the one or two agency portal users.
- Strong password / OTP controls for portal users.
- MFA for privileged roles.
- Short-lived access tokens and secure refresh-token rotation.
- TLS for all network traffic.
- Encryption at rest for databases and object storage.
- Secrets stored in a secrets manager / environment-specific secret store.
- Input validation and output encoding.
- Rate limiting and abuse protection.
- Secure file upload validation and malware scanning.
- Audit logging for sensitive actions.
- Regular dependency and vulnerability scanning.
- Backup encryption and restore testing.

### 9.2 Reliability and performance

Initial targets to validate during pilot:
- 99.5% monthly service availability target for MVP, excluding planned maintenance.
- Common portal and app API responses: p95 under 500 ms for normal reads, excluding external providers.
- Booking submission should return a clear result and reference ID without waiting for all notification providers.
- Notification delivery is asynchronous and retried.
- Payment webhook processing is idempotent.
- No duplicate active assignments for the same worker and overlapping time.
- Defined backup, recovery point objective (RPO) and recovery time objective (RTO).

### 9.3 Accessibility and localization

- English plus launch-region language(s).
- Locale-aware dates, times, currency and number formats.
- Accessible color contrast, font scaling and screen-reader labels.
- Clear error messages and form validation.
- Low-bandwidth friendly screens and retry behavior.

### 9.4 Observability

- Centralized application logs with sensitive data redacted.
- Metrics for API latency, error rate, queue depth and notification failures.
- Error monitoring and alerting.
- Audit logs separate from debug logs.
- Admin health dashboard for integrations.
- Correlation ID across booking, payment and notification events.

---

## 10. Suggested Technical Architecture

### 10.1 Recommended stack

| Layer | Recommendation | Rationale |
|---|---|---|
| Customer app | Flutter or React Native | Shared iOS / Android codebase |
| Agency portal | Next.js + TypeScript | Admin workflows and responsive web UI |
| Backend | NestJS or FastAPI | Choose one primary backend; avoid splitting services prematurely |
| Database | PostgreSQL | Relational bookings, users, staff, payments and audit records |
| Geospatial | PostGIS | Service zones and distance-based matching when needed |
| Cache / jobs | Redis + background worker | Notifications, reminders, scheduled tasks |
| Object storage | S3-compatible private bucket | Staff documents and invoice files |
| Push | Firebase Cloud Messaging / APNs | Mobile push delivery |
| SMS / WhatsApp | Approved regional providers | OTP and operational notifications |
| Payments | Configurable payment gateway adapter | Avoid provider lock-in |
| Monitoring | OpenTelemetry-compatible logs / metrics / tracing | Production diagnostics |

### 10.2 Architecture principles

- Start with a modular monolith, not microservices.
- Modules: Identity, Agency Configuration, Customer, Staff, Verification, Catalogue, Booking, Assignment, Attendance, Support, Billing, Notification and Reporting.
- Versioned REST APIs.
- Background queue for notifications, reminders, exports and document processing.
- Transactional outbox pattern for reliable event publishing where needed.
- Idempotency keys for booking and payment operations.
- Database transactions and constraints for assignment conflicts.
- Enforce authorization for the Admin and optional Coordinator accounts at API and service layers; customers must only access their own records.
- API documentation and integration tests.

### 10.3 Core data entities

Minimum entities:
- AgencyProfile
- AdminUser
- Role / Permission (simple Admin and Coordinator roles)
- Customer
- CustomerAddress
- Staff
- StaffSkill
- StaffDocument
- VerificationCheck
- StaffAvailability
- ServiceCategory
- ServiceOffering
- ServiceZone
- Enquiry
- Quotation
- Booking
- BookingSchedule
- Assignment
- AttendanceEvent
- LeaveRecord
- ReplacementRequest
- SupportTicket
- Complaint
- Review
- Invoice
- Payment
- Refund
- Subscription / Mandate (if recurring payments are enabled)
- Notification
- AuditLog
- ConsentRecord

Use immutable event/history records for important financial and operational changes.

---

## 11. MVP Delivery Plan

The original six-week plan is aggressive for a customer mobile app, an agency portal, payments, attendance and operational workflows. A six-week pilot may be possible only with a tightly reduced scope, one agency, one launch area, one or two portal users, manual payment reconciliation and limited integrations.

### Phase 0 — Product decisions and validation (Week 1)

- Confirm launch city, state and service zones.
- Interview 3–5 agencies and 10–15 customers.
- Validate service categories, pricing and replacement expectations.
- Confirm agency legal / compliance requirements with counsel.
- Define booking states, cancellation rules and attendance method.
- Confirm the primary Admin and optional Coordinator account permissions.
- Approve wireframes and acceptance criteria.

### Phase 1 — Foundation (Weeks 2–3)

- Backend project and database.
- Authentication and role-based access.
- Single-agency configuration and Admin / Coordinator account setup.
- Staff roster and verification workflow.
- Service catalogue and service zones.
- Private document storage.
- Audit logging.

### Phase 2 — Booking and agency operations (Weeks 4–5)

- Customer onboarding and addresses.
- Enquiry and booking forms.
- Quotation workflow.
- Staff availability calendar.
- Staff matching filters and manual assignment.
- Customer approval of proposed worker.
- Booking state machine.
- Agency operations dashboard.

### Phase 3 — Service execution (Weeks 6–7)

- Push and in-app notifications.
- Attendance workflow and exception handling.
- Leave and replacement requests.
- Basic complaints and support tickets.
- Customer booking history.
- Operational reports.

### Phase 4 — Commercial readiness and pilot (Weeks 8–9)

- Invoice generation.
- Payment gateway sandbox and payment status.
- Refund workflow.
- Cancellation / rescheduling rules.
- Security and permission testing.
- Device testing on iOS and Android.
- Backup / restore test.
- Pilot with one agency and limited service area.
- Fix pilot issues before public launch.

### MVP scope cut if six weeks is mandatory

For a strict six-week prototype, defer:
- Advanced admin roles and a complex permission editor
- Automated recurring payments
- Advanced analytics
- WhatsApp integration
- Advanced matching score
- Full refund automation
- Nanny / elder-care categories until safeguarding requirements are ready

Do not defer basic admin authentication and authorization, secure document storage, audit logs or clear booking / cancellation rules.

---

## 12. Acceptance Criteria

### Customer

- Customer can register, add an address and submit a service enquiry.
- Customer can view quotation details and accept / reject.
- Customer can review and approve a proposed worker.
- Customer sees accurate booking status and notification history.
- Customer can confirm attendance or raise a discrepancy.
- Customer can request backup / replacement and track the ticket.
- Customer can raise a complaint and see its resolution.
- Customer can view booking history and invoices.

### Agency

- Authorized staff can create and manage worker records.
- Verification status and document expiry are visible to permitted roles.
- Coordinator can filter eligible workers and avoid overlapping assignments.
- Customer approval is captured before assignment confirmation.
- Attendance source and correction history are recorded.
- Leave / replacement cases have owners, priority and SLA.
- Finance users can record payments, refunds and invoices with audit history.
- Reports and exports are available only to authorized agency portal users.

### Platform

- Only the one or two active, authorized agency accounts can access the admin portal.
- Unauthorized roles cannot view restricted documents or financial data.
- Duplicate requests / webhook events do not create duplicate financial or booking actions.
- Critical status changes are auditable.
- Failed notification providers do not lose the underlying booking event.
- Backup restoration is tested before production launch.

---

## 13. Product Metrics and Success Criteria

Establish baseline values during the pilot. Suggested metrics:

| Metric | Definition |
|---|---|
| Enquiry response time | Time from enquiry submission to first agency response |
| Assignment lead time | Time from accepted quotation to confirmed staff assignment |
| Enquiry-to-booking conversion | Confirmed bookings / qualified enquiries |
| Fill rate | Requests successfully assigned / eligible requests |
| Replacement rate | Bookings requiring replacement / confirmed bookings |
| No-show rate | Scheduled shifts with confirmed no-show / scheduled shifts |
| Attendance completion | Shifts with required attendance events / scheduled shifts |
| Complaint resolution time | Time from ticket creation to resolution |
| Customer retention | Customers continuing into the next service period |
| Collection rate | Amount collected / amount due |
| Staff utilization | Assigned working hours / declared available hours |

Set numerical targets only after the pilot establishes a credible baseline.

---

## 14. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Worker identity / background verification is incomplete | Formal verification checklist, expiry alerts and truthful status labels |
| Worker no-show disrupts household routine | Backup queue, SLA and replacement workflow |
| Agency does not update availability | Coordinator reminders, calendar review and assignment confirmation |
| Customer and coordinator dispute attendance | Record source, timestamps, correction reasons and dispute workflow |
| Staff is double-booked | Transactional assignment checks and schedule constraints |
| Customer / worker personal data is exposed | Least privilege, private storage, masking and audit logs |
| Payment status differs from gateway | Webhook verification, reconciliation and idempotency |
| Agency-specific processes vary | Configurable service, policy and workflow settings |
| Scope exceeds six-week timeline | Pilot scope cuts and phased release |
| Regulatory requirements differ by state | Launch-state legal review before onboarding workers |

---

## 15. Open Decisions Before Development

These are product decisions, not details to postpone until the end.

1. Which city and state will be the first launch market?
2. Which service categories are enabled on Day 1?
3. Confirm the agency name, the primary Admin account and whether a second Coordinator account is needed. Multi-agency SaaS support is not part of this MVP.
4. Who contracts with and collects payment from the customer: the agency or the platform?
5. Is the worker employed by the agency, engaged as a contractor or referred through the agency? Obtain legal advice.
6. Who is responsible for verification and what evidence supports each badge?
7. What are the replacement SLA and guarantee terms?
8. What is the attendance source of truth when customer and coordinator records conflict?
9. What are cancellation, refund, deposit and trial policies?
10. Which payment gateway and recurring-payment method will be used?
11. What worker information can customers see?
12. What are document retention and deletion periods?
13. Which languages and notification channels are required?
14. What support hours and emergency escalation process will operate?
15. What insurance / liability arrangements apply?

---

## 16. Team Reverification Checklist

- [ ] No staff app in MVP; agency manages staff centrally.
- [ ] Launch city, state and service zones confirmed.
- [ ] Day-1 service categories confirmed.
- [ ] Single-agency deployment confirmed.
- [ ] One primary Admin account and optional second Coordinator account confirmed.
- [ ] Simple Admin / Coordinator permissions approved.
- [ ] Staff verification checklist approved by legal / operations.
- [ ] Customer approval required before final assignment.
- [ ] Attendance source and dispute workflow confirmed.
- [ ] Booking lifecycle and state transitions approved.
- [ ] Cancellation, replacement and refund policies approved.
- [ ] Pricing and invoice model approved.
- [ ] Payment provider and recurring-payment requirements reviewed.
- [ ] Document storage, access, retention and deletion rules approved.
- [ ] Privacy notice, consent and data-rights workflows reviewed.
- [ ] Support SLAs and safety escalation process approved.
- [ ] MVP acceptance criteria and pilot success metrics agreed.

---

## 17. External References and Compliance Notes

These references are starting points for product and legal review, not legal advice:

- Government of India / PIB: [DPDP Rules, 2025 notification announcement](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2190014)
- Government of India Gazette: [Digital Personal Data Protection Rules, 2025](https://egazette.gov.in/WriteReadData/2025/267650.pdf)
- Reserve Bank of India: [Digital Payments — E-mandate Framework, 2026](https://www.rbi.org.in/scripts/FS_Notification.aspx?Id=13374)
- Ministry of Labour and Employment response in Parliament: [Regulation of Placement Agencies for Domestic Workers](https://www.sansad.in/getFile/annex/269/AU2168_S41wES.pdf?source=pqars)

The parliamentary response indicates that regulation of placement agencies is a matter for the respective States / Union Territories. Confirm the rules applicable to the actual launch state before operating.

---

**End of PRD — Version 2.1 (Single-Agency MVP)**
