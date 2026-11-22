import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';

import { ConsoleLayout } from './components/ConsoleLayout';
import { Loading } from './components/ui';
import { useSession } from './lib/session';
import { Account } from './pages/agency/Account';
import { AgencySettings } from './pages/agency/AgencySettings';
import { BookingDetail } from './pages/agency/BookingDetail';
import { GreetingEditor } from './pages/agency/GreetingEditor';
import { Greetings } from './pages/agency/Greetings';
import { Inbox } from './pages/agency/Inbox';
import { AgencyOverview } from './pages/agency/Overview';
import { OfferEditor } from './pages/agency/OfferEditor';
import { Offers } from './pages/agency/Offers';
import { ProposeStaff } from './pages/agency/ProposeStaff';
import { Queue } from './pages/agency/Queue';
import { SendQuote } from './pages/agency/SendQuote';
import { Staff } from './pages/agency/Staff';
import { StaffForm } from './pages/agency/StaffForm';
import { StaffProfile } from './pages/agency/StaffProfile';
import { Support } from './pages/agency/Support';
import { Templates } from './pages/agency/Templates';
import { Ticket } from './pages/agency/Ticket';
import { ActivityLog } from './pages/dev/ActivityLog';
import { AppErrors } from './pages/dev/AppErrors';
import { Configuration } from './pages/dev/Configuration';
import { Legal } from './pages/dev/Legal';
import { ServicesAreas } from './pages/dev/ServicesAreas';
import { SignIns } from './pages/dev/SignIns';
import { StaffAccess } from './pages/dev/StaffAccess';
import { SupabasePage } from './pages/dev/SupabasePage';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';

function RequireStaff({ developer, children }: { developer?: boolean; children: ReactNode }) {
  const { session, loading, isStaff, isDeveloper } = useSession();
  const loc = useLocation();
  if (loading) return <Loading label="Checking your access…" />;
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (!isStaff) return <Navigate to="/login" replace />;
  if (developer && !isDeveloper) return <Navigate to="/agency" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireStaff>
            <ConsoleLayout />
          </RequireStaff>
        }
      >
        <Route path="/agency" element={<AgencyOverview />} />
        <Route path="/agency/offers" element={<Offers />} />
        <Route path="/agency/offers/new" element={<OfferEditor />} />
        <Route path="/agency/offers/:id" element={<OfferEditor />} />
        <Route path="/agency/queue" element={<Queue />} />
        <Route path="/agency/bookings/:id" element={<BookingDetail />} />
        <Route path="/agency/bookings/:id/quote" element={<SendQuote />} />
        <Route path="/agency/bookings/:id/propose" element={<ProposeStaff />} />
        <Route path="/agency/staff" element={<Staff />} />
        <Route path="/agency/staff/new" element={<StaffForm />} />
        <Route path="/agency/staff/:id" element={<StaffProfile />} />
        <Route path="/agency/staff/:id/edit" element={<StaffForm />} />
        <Route path="/agency/support" element={<Support />} />
        <Route path="/agency/support/:id" element={<Ticket />} />
        <Route path="/agency/inbox" element={<Inbox />} />
        <Route path="/agency/greetings" element={<Greetings />} />
        <Route path="/agency/greetings/new" element={<GreetingEditor />} />
        <Route path="/agency/greetings/:id" element={<GreetingEditor />} />
        <Route path="/agency/templates" element={<Templates />} />
        <Route path="/agency/settings" element={<AgencySettings />} />
        <Route path="/agency/account" element={<Account />} />
        <Route path="/dev" element={<Navigate to="/dev/activity" replace />} />
        <Route path="/dev/activity" element={<RequireStaff developer><ActivityLog /></RequireStaff>} />
        <Route path="/dev/sign-ins" element={<RequireStaff developer><SignIns /></RequireStaff>} />
        <Route path="/dev/errors" element={<RequireStaff developer><AppErrors /></RequireStaff>} />
        <Route path="/dev/config" element={<RequireStaff developer><Configuration /></RequireStaff>} />
        <Route path="/dev/services" element={<RequireStaff developer><ServicesAreas /></RequireStaff>} />
        <Route path="/dev/access" element={<RequireStaff developer><StaffAccess /></RequireStaff>} />
        <Route path="/dev/legal" element={<RequireStaff developer><Legal /></RequireStaff>} />
        <Route path="/dev/supabase" element={<RequireStaff developer><SupabasePage /></RequireStaff>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
