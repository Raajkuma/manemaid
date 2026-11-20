import { useMemo, useState, type ReactNode } from "react";

type IconName =
  | "grid"
  | "inbox"
  | "calendar"
  | "users"
  | "clock"
  | "home"
  | "help"
  | "wallet"
  | "chart"
  | "settings"
  | "search"
  | "bell"
  | "chevron"
  | "arrow"
  | "plus"
  | "check"
  | "alert"
  | "more"
  | "filter"
  | "download"
  | "phone"
  | "map"
  | "shield"
  | "star"
  | "briefcase"
  | "menu"
  | "x"
  | "spark"
  | "cook"
  | "baby"
  | "heart"
  | "logout";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    inbox: (
      <>
        <path d="M4 4h16v15H4z" />
        <path d="M4 14h5l2 3h2l2-3h5" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v11h14V10M9 21v-7h6v7" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.6 9a2.5 2.5 0 1 1 3.3 2.37c-.9.35-.9 1.13-.9 1.63M12 17h.01" />
      </>
    ),
    wallet: (
      <>
        <path d="M3 6h16a2 2 0 0 1 2 2v11H3z" />
        <path d="M3 6V4h14v2M16 13h5" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.08 14H3v-4h.08A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63h.01A1.7 1.7 0 0 0 10 3.08V3h4v.08A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9v.01A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    arrow: <path d="m5 12 14 0m-6-6 6 6-6 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4 4L19 6" />,
    alert: (
      <>
        <path d="M12 3 2.5 20h19z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
    filter: <path d="M4 6h16M7 12h10M10 18h4" />,
    download: (
      <>
        <path d="M12 3v12m-4-4 4 4 4-4" />
        <path d="M5 20h14" />
      </>
    ),
    phone: (
      <>
        <rect x="6" y="2" width="12" height="20" rx="3" />
        <path d="M10 18h4" />
      </>
    ),
    map: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 4 6v5c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" />,
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M9 7V4h6v3M3 12h18" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    x: <path d="m6 6 12 12M18 6 6 18" />,
    spark: (
      <>
        <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2z" />
        <path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7z" />
      </>
    ),
    cook: (
      <>
        <path d="M6 11a4 4 0 0 1 2-7 4 4 0 0 1 8 0 4 4 0 0 1 2 7v9H6z" />
        <path d="M6 15h12" />
      </>
    ),
    baby: (
      <>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 5c-2-3 2-4 3-2M9 13h.01M15 13h.01M9 17c2 1 4 1 6 0" />
      </>
    ),
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M14 3h7v18h-7" />
      </>
    ),
  };
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

const nav = [
  ["Overview", "grid"],
  ["Enquiries", "inbox"],
  ["Bookings", "calendar"],
  ["Staff", "users"],
  ["Attendance", "clock"],
  ["Customers", "home"],
  ["Support", "help"],
  ["Payments", "wallet"],
  ["Reports", "chart"],
  ["Settings", "settings"],
] as const;

const customerNav = [
  ["Home", "home"],
  ["Services", "grid"],
  ["Bookings", "calendar"],
  ["Support", "help"],
  ["Profile", "users"],
] as const;

const staff = [
  {
    name: "Sunita Sharma",
    id: "ST-0184",
    role: "Home care",
    status: "Assigned",
    zone: "Indiranagar",
    rating: "4.9",
    avatar: "SS",
    color: "lilac",
  },
  {
    name: "Meena Kumari",
    id: "ST-0217",
    role: "Cooking",
    status: "Available",
    zone: "Koramangala",
    rating: "4.8",
    avatar: "MK",
    color: "peach",
  },
  {
    name: "Asha Devi",
    id: "ST-0096",
    role: "Child care",
    status: "Assigned",
    zone: "HSR Layout",
    rating: "4.9",
    avatar: "AD",
    color: "mint",
  },
  {
    name: "Lakshmi Rao",
    id: "ST-0241",
    role: "Housekeeping",
    status: "Verification",
    zone: "Whitefield",
    rating: "New",
    avatar: "LR",
    color: "blue",
  },
  {
    name: "Farida Begum",
    id: "ST-0159",
    role: "Elder care",
    status: "Available",
    zone: "Jayanagar",
    rating: "4.7",
    avatar: "FB",
    color: "rose",
  },
];

const bookings = [
  {
    id: "BK-2048",
    customer: "Riya Malhotra",
    service: "Home care",
    staff: "Sunita Sharma",
    schedule: "Today, 9:00 AM",
    status: "Active",
    price: "₹8,500",
  },
  {
    id: "BK-2047",
    customer: "Arjun Mehta",
    service: "Cooking",
    staff: "Meena Kumari",
    schedule: "Today, 11:30 AM",
    status: "Confirmed",
    price: "₹6,200",
  },
  {
    id: "BK-2046",
    customer: "Neha & Vikram",
    service: "Child care",
    staff: "Asha Devi",
    schedule: "Tomorrow, 8:00 AM",
    status: "Awaiting approval",
    price: "₹12,500",
  },
  {
    id: "BK-2045",
    customer: "Priya Kapoor",
    service: "Housekeeping",
    staff: "Matching in progress",
    schedule: "18 Jun, 10:00 AM",
    status: "Staff matching",
    price: "₹7,200",
  },
  {
    id: "BK-2044",
    customer: "Anand Iyer",
    service: "Elder care",
    staff: "Farida Begum",
    schedule: "19 Jun, 7:00 AM",
    status: "Quotation sent",
    price: "₹15,000",
  },
];

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="logo">
      <div className="logo-mark">
        <span />
        <span />
        <span />
      </div>
      {!compact && (
        <div>
          <strong>Saath</strong>
          <small>HOME SERVICES</small>
        </div>
      )}
    </div>
  );
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function Avatar({
  text,
  color = "lilac",
  size = "md",
}: {
  text: string;
  color?: string;
  size?: string;
}) {
  return <span className={`avatar ${color} ${size}`}>{text}</span>;
}

function Sidebar({
  active,
  setActive,
  open,
  close,
}: {
  active: string;
  setActive: (x: string) => void;
  open: boolean;
  close: () => void;
}) {
  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="sidebar-top">
        <Logo />
        <button className="icon-btn sidebar-close" onClick={close}>
          <Icon name="x" />
        </button>
      </div>
      <div className="agency-card">
        <div className="agency-icon">AH</div>
        <div>
          <strong>Aarna Home Care</strong>
          <span>Agency workspace</span>
        </div>
        <Icon name="chevron" size={16} />
      </div>
      <nav>
        {nav.map(([label, icon]) => (
          <button
            key={label}
            className={active === label ? "active" : ""}
            onClick={() => {
              setActive(label);
              close();
            }}
          >
            <Icon name={icon} />
            <span>{label}</span>
            {label === "Enquiries" && <i>8</i>}
            {label === "Support" && <i className="warm">3</i>}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="help-card">
          <Icon name="help" />
          <div>
            <strong>Need a hand?</strong>
            <span>Visit the help centre</span>
          </div>
        </div>
        <div className="profile">
          <Avatar text="AM" color="blue" />
          <div>
            <strong>Ananya Menon</strong>
            <span>Agency admin</span>
          </div>
          <button className="icon-btn">
            <Icon name="more" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function Header({
  title,
  onMenu,
  mode,
  setMode,
}: {
  title: string;
  onMenu: () => void;
  mode: string;
  setMode: (x: "admin" | "customer") => void;
}) {
  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" onClick={onMenu}>
        <Icon name="menu" />
      </button>
      <div className="title-wrap">
        <h1>{title}</h1>
        <span className="desktop-sub">Tuesday, 17 June</span>
      </div>
      <div className="top-actions">
        <div className="mode-switch">
          <button className={mode === "admin" ? "selected" : ""} onClick={() => setMode("admin")}>
            Agency
          </button>
          <button
            className={mode === "customer" ? "selected" : ""}
            onClick={() => setMode("customer")}
          >
            Customer app
          </button>
        </div>
        <button className="search-button">
          <Icon name="search" />
          <span>Search anything</span>
          <kbd>⌘ K</kbd>
        </button>
        <button className="icon-btn bell">
          <Icon name="bell" />
          <i />
        </button>
        <button className="top-avatar">AM</button>
      </div>
    </header>
  );
}

function MetricCard({
  label,
  value,
  meta,
  icon,
  tone,
}: {
  label: string;
  value: string;
  meta: string;
  icon: IconName;
  tone: string;
}) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${tone}`}>
        <Icon name={icon} />
      </div>
      <div className="metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{meta}</small>
      </div>
      <button className="icon-btn">
        <Icon name="more" />
      </button>
    </div>
  );
}

function PageTitle({
  eyebrow,
  title,
  copy,
  action,
  onAction,
}: {
  eyebrow?: string;
  title: string;
  copy?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {copy && <p>{copy}</p>}
      </div>
      {action && (
        <button className="primary-btn" onClick={onAction}>
          <Icon name="plus" />
          {action}
        </button>
      )}
    </div>
  );
}

function Overview({ go }: { go: (x: string) => void }) {
  return (
    <div className="page">
      <PageTitle
        eyebrow="Operations overview"
        title="Good morning, Ananya"
        copy="Here’s what needs your attention across the agency today."
        action="New enquiry"
      />
      <div className="metrics-grid">
        <MetricCard
          label="New enquiries"
          value="18"
          meta="+4 since yesterday"
          icon="inbox"
          tone="purple"
        />
        <MetricCard
          label="Today's services"
          value="32"
          meta="29 fully staffed"
          icon="calendar"
          tone="green"
        />
        <MetricCard
          label="Open exceptions"
          value="5"
          meta="2 need urgent action"
          icon="alert"
          tone="orange"
        />
        <MetricCard
          label="Pending payments"
          value="₹42.8k"
          meta="Across 12 invoices"
          icon="wallet"
          tone="blue"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel attention-panel">
          <div className="panel-head">
            <div>
              <h3>Needs your attention</h3>
              <p>Priority items from today’s work queue</p>
            </div>
            <button className="text-btn" onClick={() => go("Bookings")}>
              View all <Icon name="arrow" size={16} />
            </button>
          </div>
          <div className="attention-list">
            <div className="attention-item">
              <div className="priority urgent">
                <Icon name="alert" />
              </div>
              <div>
                <strong>Replacement needed for BK-2032</strong>
                <span>Worker reported unwell · Service starts in 2h</span>
              </div>
              <Badge tone="danger">Urgent</Badge>
              <button className="small-btn">Find backup</button>
            </div>
            <div className="attention-item">
              <div className="priority warning">
                <Icon name="clock" />
              </div>
              <div>
                <strong>Missing check-in · Sunita Sharma</strong>
                <span>Expected at 8:30 AM · 24 min late</span>
              </div>
              <Badge tone="warning">Late</Badge>
              <button className="small-btn">Review</button>
            </div>
            <div className="attention-item">
              <div className="priority info">
                <Icon name="users" />
              </div>
              <div>
                <strong>3 staff profiles awaiting verification</strong>
                <span>Documents uploaded and ready to review</span>
              </div>
              <Badge tone="info">Review</Badge>
              <button className="small-btn" onClick={() => go("Staff")}>
                Open roster
              </button>
            </div>
            <div className="attention-item">
              <div className="priority soft">
                <Icon name="check" />
              </div>
              <div>
                <strong>Customer approval received</strong>
                <span>Neha approved Asha for booking BK-2046</span>
              </div>
              <Badge tone="success">Complete</Badge>
              <button className="small-btn">Confirm</button>
            </div>
          </div>
        </section>
        <section className="panel schedule-panel">
          <div className="panel-head">
            <div>
              <h3>Today’s schedule</h3>
              <p>Tuesday, 17 June</p>
            </div>
            <button className="icon-btn">
              <Icon name="more" />
            </button>
          </div>
          <div className="schedule-summary">
            <div>
              <strong>32</strong>
              <span>Scheduled</span>
            </div>
            <div>
              <strong>21</strong>
              <span>Checked in</span>
            </div>
            <div>
              <strong>2</strong>
              <span>Exceptions</span>
            </div>
          </div>
          <div className="timeline">
            <div className="time-row">
              <time>8:30</time>
              <span className="time-dot green" />
              <div>
                <strong>Sunita · Home care</strong>
                <span>Riya Malhotra, Indiranagar</span>
              </div>
              <Badge tone="warning">Late</Badge>
            </div>
            <div className="time-row">
              <time>9:00</time>
              <span className="time-dot green" />
              <div>
                <strong>Meena · Cooking</strong>
                <span>Arjun Mehta, Koramangala</span>
              </div>
              <Badge tone="success">Started</Badge>
            </div>
            <div className="time-row">
              <time>10:30</time>
              <span className="time-dot purple" />
              <div>
                <strong>Asha · Child care</strong>
                <span>Neha & Vikram, HSR Layout</span>
              </div>
              <Badge>Upcoming</Badge>
            </div>
          </div>
          <button className="wide-link" onClick={() => go("Attendance")}>
            Open attendance board <Icon name="arrow" size={16} />
          </button>
        </section>
        <section className="panel activity-panel">
          <div className="panel-head">
            <div>
              <h3>Recent activity</h3>
              <p>Latest updates from your team</p>
            </div>
            <button className="text-btn">View audit log</button>
          </div>
          <div className="activity-row">
            <Avatar text="RS" color="peach" />
            <div>
              <strong>
                Rohan sent quotation <b>QT-1084</b>
              </strong>
              <span>To Anand Iyer · 12 minutes ago</span>
            </div>
            <span className="activity-icon">
              <Icon name="wallet" />
            </span>
          </div>
          <div className="activity-row">
            <Avatar text="AM" color="blue" />
            <div>
              <strong>
                You assigned <b>Farida Begum</b>
              </strong>
              <span>Booking BK-2044 · 28 minutes ago</span>
            </div>
            <span className="activity-icon">
              <Icon name="users" />
            </span>
          </div>
          <div className="activity-row">
            <Avatar text="NK" color="mint" />
            <div>
              <strong>Neha approved proposed staff</strong>
              <span>Booking BK-2046 · 42 minutes ago</span>
            </div>
            <span className="activity-icon">
              <Icon name="check" />
            </span>
          </div>
        </section>
        <section className="panel fill-panel">
          <div className="panel-head">
            <div>
              <h3>Service fill rate</h3>
              <p>Last 6 months</p>
            </div>
            <Badge tone="success">+6.2%</Badge>
          </div>
          <div className="chart">
            <div className="chart-labels">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
            </div>
            <div className="bars">
              {[62, 68, 74, 72, 82, 90].map((h, i) => (
                <div className="bar-col" key={i}>
                  <div className="bar" style={{ height: `${h}%` }} />
                  <span>{["Jan", "Feb", "Mar", "Apr", "May", "Jun"][i]}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Toolbar({ placeholder = "Search by name, ID or service..." }: { placeholder?: string }) {
  return (
    <div className="toolbar">
      <div className="field-search">
        <Icon name="search" />
        <input placeholder={placeholder} />
      </div>
      <button className="secondary-btn">
        <Icon name="filter" /> Filters <span>2</span>
      </button>
      <button className="secondary-btn">
        <Icon name="download" /> Export
      </button>
    </div>
  );
}

function BookingsPage() {
  const [tab, setTab] = useState("All bookings");
  const [selected, setSelected] = useState<(typeof bookings)[number] | null>(null);
  return (
    <div className="page">
      <PageTitle
        eyebrow="Service operations"
        title="Bookings"
        copy="Manage schedules, assignments and active household services."
        action="Create booking"
      />
      <div className="tab-row">
        {["All bookings", "Awaiting action", "Active", "Upcoming", "Completed"].map((x) => (
          <button key={x} className={tab === x ? "active" : ""} onClick={() => setTab(x)}>
            {x}
            {x === "Awaiting action" && <i>6</i>}
          </button>
        ))}
      </div>
      <Toolbar />
      <section className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Booking</th>
                <th>Customer</th>
                <th>Assigned staff</th>
                <th>Schedule</th>
                <th>Status</th>
                <th>Value</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {bookings.map((b, i) => (
                <tr key={b.id} onClick={() => setSelected(b)}>
                  <td>
                    <strong>{b.id}</strong>
                    <span>{b.service}</span>
                  </td>
                  <td>
                    <div className="person-cell">
                      <Avatar
                        text={b.customer
                          .split(" ")
                          .map((x) => x[0])
                          .slice(0, 2)
                          .join("")}
                        color={["lilac", "peach", "mint", "blue", "rose"][i]}
                      />
                      <div>
                        <strong>{b.customer}</strong>
                        <span>
                          {
                            ["Indiranagar", "Koramangala", "HSR Layout", "Whitefield", "Jayanagar"][
                              i
                            ]
                          }
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong>{b.staff}</strong>
                  </td>
                  <td>
                    <strong>{b.schedule}</strong>
                    <span>Recurring monthly</span>
                  </td>
                  <td>
                    <Badge
                      tone={
                        b.status === "Active"
                          ? "success"
                          : b.status.includes("Awaiting")
                            ? "warning"
                            : b.status.includes("matching")
                              ? "info"
                              : "neutral"
                      }
                    >
                      {b.status}
                    </Badge>
                  </td>
                  <td>
                    <strong>{b.price}</strong>
                    <span>/ month</span>
                  </td>
                  <td>
                    <button className="icon-btn">
                      <Icon name="more" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span>Showing 1–5 of 84 bookings</span>
          <div>
            <button>Previous</button>
            <button className="active">1</button>
            <button>2</button>
            <button>3</button>
            <button>Next</button>
          </div>
        </div>
      </section>
      {selected && (
        <div className="drawer-backdrop" onClick={() => setSelected(null)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <button className="icon-btn drawer-close" onClick={() => setSelected(null)}>
              <Icon name="x" />
            </button>
            <span className="eyebrow">Booking details</span>
            <h2>{selected.id}</h2>
            <Badge tone="success">{selected.status}</Badge>
            <div className="drawer-section">
              <h3>Service summary</h3>
              <div className="detail-row">
                <span>Customer</span>
                <strong>{selected.customer}</strong>
              </div>
              <div className="detail-row">
                <span>Service</span>
                <strong>{selected.service}</strong>
              </div>
              <div className="detail-row">
                <span>Schedule</span>
                <strong>{selected.schedule}</strong>
              </div>
              <div className="detail-row">
                <span>Monthly value</span>
                <strong>{selected.price}</strong>
              </div>
            </div>
            <div className="drawer-section">
              <h3>Assigned professional</h3>
              <div className="profile-card">
                <Avatar
                  text={selected.staff
                    .split(" ")
                    .map((x) => x[0])
                    .slice(0, 2)
                    .join("")}
                  color="mint"
                  size="lg"
                />
                <div>
                  <strong>{selected.staff}</strong>
                  <span>Agency verified</span>
                </div>
                <Icon name="shield" />
              </div>
            </div>
            <button className="primary-btn full">View full booking</button>
          </aside>
        </div>
      )}
    </div>
  );
}

function StaffPage() {
  const [tab, setTab] = useState("All staff");
  return (
    <div className="page">
      <PageTitle
        eyebrow="People & availability"
        title="Staff roster"
        copy="Manage worker profiles, availability and verification status."
        action="Add staff member"
      />
      <div className="staff-stats">
        <div>
          <strong>48</strong>
          <span>Total staff</span>
        </div>
        <div>
          <strong>31</strong>
          <span>Currently assigned</span>
        </div>
        <div>
          <strong>12</strong>
          <span>Available today</span>
        </div>
        <div>
          <strong>5</strong>
          <span>Action required</span>
        </div>
      </div>
      <div className="tab-row">
        {["All staff", "Available", "Assigned", "Verification", "On leave"].map((x) => (
          <button className={tab === x ? "active" : ""} onClick={() => setTab(x)} key={x}>
            {x}
          </button>
        ))}
      </div>
      <Toolbar placeholder="Search staff by name, ID, skill or zone..." />
      <div className="staff-grid">
        {staff.map((s) => (
          <article className="staff-card" key={s.id}>
            <div className="staff-card-top">
              <Avatar text={s.avatar} color={s.color} size="xl" />
              <button className="icon-btn">
                <Icon name="more" />
              </button>
            </div>
            <h3>{s.name}</h3>
            <span className="staff-id">
              {s.id} · {s.role}
            </span>
            <div className="staff-badges">
              <Badge
                tone={
                  s.status === "Available"
                    ? "success"
                    : s.status === "Verification"
                      ? "warning"
                      : "info"
                }
              >
                {s.status}
              </Badge>
              <Badge tone="success">
                <Icon name="shield" size={13} /> Verified
              </Badge>
            </div>
            <div className="staff-info">
              <span>
                <Icon name="map" size={16} />
                {s.zone}
              </span>
              <span>
                <Icon name="star" size={16} />
                {s.rating} rating
              </span>
            </div>
            <div className="availability">
              <div>
                <span>Availability this week</span>
                <strong>{s.status === "Available" ? "Open" : "24 hrs"}</strong>
              </div>
              <div className="days">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <i className={i < 5 && s.status !== "Verification" ? "on" : ""} key={i}>
                    {d}
                  </i>
                ))}
              </div>
            </div>
            <button className="secondary-btn full">
              View profile <Icon name="arrow" size={16} />
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function GenericListPage({ type }: { type: string }) {
  const config: Record<
    string,
    {
      eyebrow: string;
      title: string;
      copy: string;
      action: string;
      cols: string[];
      rows: string[][];
    }
  > = {
    Enquiries: {
      eyebrow: "Sales pipeline",
      title: "Enquiries",
      copy: "Review new household requests and prepare quotations.",
      action: "New enquiry",
      cols: ["Reference", "Customer", "Service request", "Received", "Status"],
      rows: [
        ["EN-1092", "Kavya S.", "Part-time cooking", "8 min ago", "New"],
        ["EN-1091", "Dev Patel", "Daily housekeeping", "32 min ago", "Under review"],
        ["EN-1090", "Maya Rao", "Elder-care assistance", "1 hr ago", "Quotation due"],
        ["EN-1089", "Siddharth K.", "Live-in help", "Yesterday", "Contacted"],
      ],
    },
    Attendance: {
      eyebrow: "Daily operations",
      title: "Attendance board",
      copy: "Monitor arrivals, departures and service exceptions in real time.",
      action: "Record attendance",
      cols: ["Staff member", "Booking", "Expected", "Check-in", "Source", "Status"],
      rows: [
        ["Sunita Sharma", "BK-2048", "8:30 AM", "8:54 AM", "Customer OTP", "Late"],
        ["Meena Kumari", "BK-2047", "9:00 AM", "8:58 AM", "Customer OTP", "On time"],
        ["Asha Devi", "BK-2046", "10:30 AM", "—", "—", "Upcoming"],
        ["Farida Begum", "BK-2044", "11:00 AM", "—", "—", "Missing"],
      ],
    },
    Customers: {
      eyebrow: "Household CRM",
      title: "Customers",
      copy: "View customer profiles, service history and preferences.",
      action: "Add customer",
      cols: ["Customer", "Contact", "Location", "Services", "Since", "Status"],
      rows: [
        ["Riya Malhotra", "riya.m@example.com", "Indiranagar", "Home care", "Jan 2025", "Active"],
        ["Arjun Mehta", "arjun.m@example.com", "Koramangala", "Cooking", "Feb 2025", "Active"],
        [
          "Neha & Vikram",
          "neha.v@example.com",
          "HSR Layout",
          "Child care",
          "Apr 2025",
          "Onboarding",
        ],
        ["Priya Kapoor", "priya.k@example.com", "Whitefield", "Housekeeping", "May 2025", "Active"],
      ],
    },
    Support: {
      eyebrow: "Customer care",
      title: "Support & issues",
      copy: "Resolve requests, complaints and service continuity cases.",
      action: "Create ticket",
      cols: ["Ticket", "Customer", "Category", "Owner", "SLA", "Status"],
      rows: [
        ["TK-0328", "Riya Malhotra", "Late arrival", "Rohan S.", "42 min", "Open"],
        ["TK-0327", "Anand Iyer", "Replacement", "Ananya M.", "1h 20m", "Urgent"],
        ["TK-0326", "Priya Kapoor", "Service quality", "Rohan S.", "4h 10m", "In progress"],
        ["TK-0325", "Dev Patel", "Invoice query", "Ananya M.", "Tomorrow", "Waiting"],
      ],
    },
    Payments: {
      eyebrow: "Finance",
      title: "Payments & invoices",
      copy: "Track collections, outstanding invoices and payment records.",
      action: "Create invoice",
      cols: ["Invoice", "Customer", "Booking", "Issued", "Amount", "Status"],
      rows: [
        ["INV-1058", "Riya Malhotra", "BK-2048", "16 Jun 2025", "₹8,500", "Paid"],
        ["INV-1057", "Arjun Mehta", "BK-2047", "15 Jun 2025", "₹6,200", "Pending"],
        ["INV-1056", "Neha & Vikram", "BK-2046", "14 Jun 2025", "₹12,500", "Overdue"],
        ["INV-1055", "Anand Iyer", "BK-2044", "12 Jun 2025", "₹15,000", "Paid"],
      ],
    },
  };
  const c = config[type];
  return (
    <div className="page">
      <PageTitle eyebrow={c.eyebrow} title={c.title} copy={c.copy} action={c.action} />
      <div className="mini-metrics">
        <div>
          <span>Total</span>
          <strong>{type === "Payments" ? "₹1.84L" : "48"}</strong>
          <small>This month</small>
        </div>
        <div>
          <span>Needs action</span>
          <strong>{type === "Attendance" ? "4" : "8"}</strong>
          <small>Priority queue</small>
        </div>
        <div>
          <span>Completion rate</span>
          <strong>92%</strong>
          <small>+4.2% this month</small>
        </div>
      </div>
      <Toolbar />
      <section className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {c.cols.map((x) => (
                  <th key={x}>{x}</th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {c.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((x, j) => (
                    <td key={j}>
                      {j === 0 ? (
                        <strong>{x}</strong>
                      ) : j === row.length - 1 ? (
                        <Badge
                          tone={
                            ["Paid", "Active", "On time"].includes(x)
                              ? "success"
                              : ["Urgent", "Overdue", "Late", "Missing"].includes(x)
                                ? "danger"
                                : ["Pending", "Quotation due", "Waiting"].includes(x)
                                  ? "warning"
                                  : "info"
                          }
                        >
                          {x}
                        </Badge>
                      ) : (
                        <span className="cell-main">{x}</span>
                      )}
                    </td>
                  ))}
                  <td>
                    <button className="icon-btn">
                      <Icon name="more" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ReportsPage() {
  return (
    <div className="page">
      <PageTitle
        eyebrow="Performance"
        title="Reports & insights"
        copy="Track agency growth, service quality and team performance."
      />
      <div className="report-filters">
        <button className="secondary-btn">
          <Icon name="calendar" /> 1 Jan – 17 Jun 2025
        </button>
        <button className="secondary-btn">
          <Icon name="filter" /> All service categories
        </button>
        <button className="secondary-btn">
          <Icon name="download" /> Export report
        </button>
      </div>
      <div className="metrics-grid">
        <MetricCard
          label="Total revenue"
          value="₹12.4L"
          meta="+18.4% vs previous period"
          icon="wallet"
          tone="green"
        />
        <MetricCard
          label="Conversion rate"
          value="68.2%"
          meta="+5.1% vs previous period"
          icon="chart"
          tone="purple"
        />
        <MetricCard
          label="Active households"
          value="184"
          meta="+22 this period"
          icon="home"
          tone="blue"
        />
        <MetricCard
          label="Service rating"
          value="4.82"
          meta="From 326 reviews"
          icon="star"
          tone="orange"
        />
      </div>
      <div className="reports-grid">
        <section className="panel big-chart">
          <div className="panel-head">
            <div>
              <h3>Revenue & collections</h3>
              <p>Monthly performance in ₹ lakhs</p>
            </div>
            <Badge tone="success">94% collected</Badge>
          </div>
          <div className="line-chart">
            <div className="line-grid" />
            <svg viewBox="0 0 700 240" preserveAspectRatio="none">
              <defs>
                <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6759d1" stopOpacity=".25" />
                  <stop offset="100%" stopColor="#6759d1" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 202 C90 190 95 165 175 172 S280 110 350 133 S440 82 520 92 S610 44 700 38 L700 240 L0 240Z"
                fill="url(#area)"
              />
              <path
                d="M0 202 C90 190 95 165 175 172 S280 110 350 133 S440 82 520 92 S610 44 700 38"
                fill="none"
                stroke="#6759d1"
                strokeWidth="4"
              />
            </svg>
            <div className="months">
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((x) => (
                <span key={x}>{x}</span>
              ))}
            </div>
          </div>
        </section>
        <section className="panel services-chart">
          <div className="panel-head">
            <div>
              <h3>Services mix</h3>
              <p>Active bookings by category</p>
            </div>
          </div>
          <div className="donut">
            <div className="donut-hole">
              <strong>184</strong>
              <span>Bookings</span>
            </div>
          </div>
          <div className="legend">
            {[
              ["Housekeeping", "38%", "purple"],
              ["Cooking", "26%", "green"],
              ["Child care", "18%", "orange"],
              ["Elder care", "12%", "blue"],
              ["Other", "6%", "grey"],
            ].map((x) => (
              <div key={x[0]}>
                <i className={x[2]} />
                <span>{x[0]}</span>
                <strong>{x[1]}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function SettingsPage() {
  const [section, setSection] = useState("Agency profile");
  return (
    <div className="page">
      <PageTitle
        eyebrow="Workspace"
        title="Settings"
        copy="Manage agency details, team access and operating preferences."
      />
      <div className="settings-layout">
        <aside className="settings-nav">
          {[
            "Agency profile",
            "Service catalogue",
            "Coverage areas",
            "Team access",
            "Notifications",
            "Policies & terms",
            "Security",
          ].map((x) => (
            <button className={section === x ? "active" : ""} key={x} onClick={() => setSection(x)}>
              {x}
              <Icon name="chevron" size={15} />
            </button>
          ))}
        </aside>
        <section className="panel settings-form">
          <div className="settings-head">
            <h3>{section}</h3>
            <p>
              {section === "Agency profile"
                ? "Your business identity and customer-facing contact information."
                : `Configure your ${section.toLowerCase()} preferences.`}
            </p>
          </div>
          <div className="brand-upload">
            <div className="agency-icon large">AH</div>
            <div>
              <strong>Aarna Home Care</strong>
              <span>PNG, JPG or SVG · Max 2 MB</span>
              <button className="text-btn">Change logo</button>
            </div>
          </div>
          <div className="form-grid">
            <label>
              <span>Agency name</span>
              <input defaultValue="Aarna Home Care" />
            </label>
            <label>
              <span>Business email</span>
              <input defaultValue="hello@aarnahomecare.in" />
            </label>
            <label>
              <span>Support phone</span>
              <input defaultValue="+91 80 4567 8900" />
            </label>
            <label>
              <span>Primary city</span>
              <input defaultValue="Bengaluru, Karnataka" />
            </label>
            <label>
              <span>Currency</span>
              <select defaultValue="INR">
                <option>INR — Indian Rupee</option>
              </select>
            </label>
            <label>
              <span>Timezone</span>
              <select defaultValue="IST">
                <option>IST — Asia/Kolkata</option>
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button className="secondary-btn">Cancel</button>
            <button className="primary-btn">
              <Icon name="check" />
              Save changes
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function CustomerApp({
  page,
  setPage,
  setMode,
}: {
  page: string;
  setPage: (x: string) => void;
  setMode: (x: "admin" | "customer") => void;
}) {
  const services = [
    ["Home care", "spark", "lilac"],
    ["Cooking", "cook", "peach"],
    ["Child care", "baby", "mint"],
    ["Elder care", "heart", "blue"],
  ] as const;
  const [requestOpen, setRequestOpen] = useState(false);
  return (
    <div className="customer-shell">
      <header className="customer-header">
        <Logo />
        <nav>
          {customerNav.map(([label]) => (
            <button
              className={page === label ? "active" : ""}
              key={label}
              onClick={() => setPage(label)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="customer-actions">
          <button className="mode-pill" onClick={() => setMode("admin")}>
            <Icon name="briefcase" size={16} />
            Agency portal
          </button>
          <button className="icon-btn bell">
            <Icon name="bell" />
            <i />
          </button>
          <Avatar text="RM" color="lilac" />
        </div>
      </header>
      <main className="customer-main">
        {page === "Home" || page === "Services" ? (
          <>
            <section className="customer-hero">
              <div>
                <Badge tone="success">
                  <Icon name="shield" size={14} /> Agency managed & verified
                </Badge>
                <h1>
                  Reliable home help,
                  <br />
                  <em>thoughtfully matched.</em>
                </h1>
                <p>
                  Tell us what your home needs. We’ll find a trusted professional, and you approve
                  the match before service begins.
                </p>
                <div className="hero-actions">
                  <button className="primary-btn large" onClick={() => setRequestOpen(true)}>
                    Find home help <Icon name="arrow" />
                  </button>
                  <button className="play-btn">
                    <span>▶</span>How Saath works
                  </button>
                </div>
                <div className="trust-row">
                  <div>
                    <strong>4.9</strong>
                    <span>Average rating</span>
                  </div>
                  <div>
                    <strong>48</strong>
                    <span>Verified professionals</span>
                  </div>
                  <div>
                    <strong>&lt; 2 hrs</strong>
                    <span>Support response</span>
                  </div>
                </div>
              </div>
              <div className="hero-visual">
                <div className="visual-orb" />
                <div className="worker-illustration">
                  <div className="head" />
                  <div className="hair" />
                  <div className="body" />
                  <div className="apron" />
                  <span className="sparkle one">✦</span>
                  <span className="sparkle two">✦</span>
                </div>
                <div className="match-card">
                  <span className="match-check">
                    <Icon name="check" />
                  </span>
                  <div>
                    <strong>Your match is ready</strong>
                    <span>Verified by Aarna Home Care</span>
                  </div>
                </div>
                <div className="rating-card">
                  <Icon name="star" />
                  <div>
                    <strong>4.9 / 5</strong>
                    <span>326 happy homes</span>
                  </div>
                </div>
              </div>
            </section>
            <section className="services-section">
              <div className="section-intro">
                <span>Services for every home</span>
                <h2>How can we help today?</h2>
                <p>Flexible, recurring support from agency-verified professionals.</p>
              </div>
              <div className="service-grid">
                {services.map(([name, icon, tone]) => (
                  <article key={name} className={tone}>
                    <div className="service-icon">
                      <Icon name={icon} />
                    </div>
                    <h3>{name}</h3>
                    <p>
                      {name === "Cooking"
                        ? "Daily meals, prep and kitchen care"
                        : name === "Child care"
                          ? "Dependable support for your little ones"
                          : name === "Elder care"
                            ? "Compassionate day-to-day assistance"
                            : "Cleaning, laundry and daily upkeep"}
                    </p>
                    <button onClick={() => setRequestOpen(true)}>
                      Explore service <Icon name="arrow" size={16} />
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : (
          <CustomerSubPage page={page} />
        )}
      </main>
      {requestOpen && (
        <div className="modal-backdrop" onClick={() => setRequestOpen(false)}>
          <div className="request-modal" onClick={(e) => e.stopPropagation()}>
            <button className="icon-btn modal-close" onClick={() => setRequestOpen(false)}>
              <Icon name="x" />
            </button>
            <span className="eyebrow">Service enquiry</span>
            <h2>What kind of help do you need?</h2>
            <p>Share a few details and our care team will contact you with suitable options.</p>
            <div className="request-services">
              {services.map(([name, icon]) => (
                <button key={name}>
                  <Icon name={icon} />
                  <span>{name}</span>
                  <i>
                    <Icon name="check" size={14} />
                  </i>
                </button>
              ))}
            </div>
            <label className="modal-field">
              <span>Service address</span>
              <div>
                <Icon name="map" />
                <input placeholder="Enter area or PIN code" />
              </div>
            </label>
            <label className="modal-field">
              <span>Preferred start date</span>
              <div>
                <Icon name="calendar" />
                <input type="date" />
              </div>
            </label>
            <button className="primary-btn full large" onClick={() => setRequestOpen(false)}>
              Continue to schedule <Icon name="arrow" />
            </button>
            <small>There’s no payment required to submit an enquiry.</small>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomerSubPage({ page }: { page: string }) {
  if (page === "Bookings")
    return (
      <div className="customer-page">
        <PageTitle
          eyebrow="My services"
          title="Bookings"
          copy="Track upcoming visits and manage ongoing services."
        />
        <div className="customer-booking">
          <div className="booking-date">
            <strong>18</strong>
            <span>JUN</span>
          </div>
          <div>
            <Badge tone="success">Confirmed</Badge>
            <h3>Daily home care</h3>
            <p>Tomorrow · 9:00 AM – 1:00 PM</p>
          </div>
          <div className="assigned-mini">
            <Avatar text="SS" color="lilac" size="lg" />
            <div>
              <span>Your professional</span>
              <strong>Sunita Sharma</strong>
              <small>
                <Icon name="shield" size={13} /> Agency verified
              </small>
            </div>
          </div>
          <button className="secondary-btn">
            View details <Icon name="chevron" size={16} />
          </button>
        </div>
      </div>
    );
  if (page === "Support")
    return (
      <div className="customer-page">
        <PageTitle
          eyebrow="We’re here for you"
          title="Support centre"
          copy="Get fast help with your booking or service."
        />
        <div className="support-options">
          <article>
            <Icon name="help" />
            <h3>Service issue</h3>
            <p>Report an absence, delay or quality concern.</p>
            <button>
              Raise an issue <Icon name="arrow" />
            </button>
          </article>
          <article>
            <Icon name="users" />
            <h3>Request a replacement</h3>
            <p>Ask for temporary backup or a new match.</p>
            <button>
              Start request <Icon name="arrow" />
            </button>
          </article>
          <article>
            <Icon name="phone" />
            <h3>Talk to our team</h3>
            <p>Available daily from 8 AM to 8 PM.</p>
            <button>
              Call support <Icon name="arrow" />
            </button>
          </article>
        </div>
      </div>
    );
  return (
    <div className="customer-page">
      <PageTitle
        eyebrow="Your account"
        title="Profile & preferences"
        copy="Manage your household details, addresses and notifications."
      />
      <section className="panel profile-settings">
        <div className="profile-hero">
          <Avatar text="RM" color="lilac" size="xl" />
          <div>
            <h3>Riya Malhotra</h3>
            <p>Member since January 2025</p>
          </div>
          <button className="secondary-btn">Edit profile</button>
        </div>
        {[
          "Personal information",
          "Saved addresses",
          "Notification preferences",
          "Privacy & security",
          "Payment methods",
        ].map((x) => (
          <button className="profile-link" key={x}>
            <span>{x}</span>
            <Icon name="chevron" />
          </button>
        ))}
      </section>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState<"admin" | "customer">("admin");
  const [active, setActive] = useState("Overview");
  const [customerPage, setCustomerPage] = useState("Home");
  const [menuOpen, setMenuOpen] = useState(false);
  const content = useMemo(() => {
    if (active === "Overview") return <Overview go={setActive} />;
    if (active === "Bookings") return <BookingsPage />;
    if (active === "Staff") return <StaffPage />;
    if (["Enquiries", "Attendance", "Customers", "Support", "Payments"].includes(active))
      return <GenericListPage type={active} />;
    if (active === "Reports") return <ReportsPage />;
    return <SettingsPage />;
  }, [active]);
  if (mode === "customer")
    return <CustomerApp page={customerPage} setPage={setCustomerPage} setMode={setMode} />;
  return (
    <div className="app-shell">
      <Sidebar
        active={active}
        setActive={setActive}
        open={menuOpen}
        close={() => setMenuOpen(false)}
      />
      {menuOpen && <div className="sidebar-scrim" onClick={() => setMenuOpen(false)} />}
      <div className="main-column">
        <Header title={active} onMenu={() => setMenuOpen(true)} mode={mode} setMode={setMode} />
        <main>{content}</main>
      </div>
    </div>
  );
}
