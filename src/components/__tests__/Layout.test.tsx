import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

let storeState: any;

vi.mock('framer-motion', () => {
  const strip = (props: any) => {
    // Remove animation-related props so they don't become invalid DOM attributes.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { initial, animate, transition, exit, onClick, ...rest } = props;
    return rest;
  };

  const motion = {
    aside: (props: any) => React.createElement('aside', strip(props)),
    div: (props: any) => React.createElement('div', { ...strip(props), onClick: props.onClick }),
    span: (props: any) => React.createElement('span', strip(props)),
  };

  const AnimatePresence = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  return { motion, AnimatePresence };
});

vi.mock('lucide-react', () => {
  const icon = (name: string) => (props: any) => <svg data-icon={name} {...props} />;
  return {
    LayoutDashboard: icon('LayoutDashboard'),
    Users: icon('Users'),
    UserPlus: icon('UserPlus'),
    FileCheck: icon('FileCheck'),
    FileText: icon('FileText'),
    AlertCircle: icon('AlertCircle'),
    BookOpen: icon('BookOpen'),
    BarChart3: icon('BarChart3'),
    ShieldCheck: icon('ShieldCheck'),
    Settings: icon('Settings'),
    Menu: icon('Menu'),
    X: icon('X'),
    LogOut: icon('LogOut'),
    Bell: icon('Bell'),
    Search: icon('Search'),
    Camera: icon('Camera'),
    Home: icon('Home'),
    Clock: icon('Clock'),
    DollarSign: icon('DollarSign'),
    Users2: icon('Users2'),
    ClipboardList: icon('ClipboardList'),
    Sparkles: icon('Sparkles'),
  };
});

vi.mock('../Logo', () => ({
  Logo: (_props: any) => <div data-icon="Logo" />,
}));

vi.mock('../InstallButton', () => ({
  InstallButton: (_props: any) => <div data-icon="InstallButton" />,
}));

vi.mock('../../store', () => ({
  useStore: Object.assign(() => storeState, {
    getState: () => storeState,
  }),
}));

async function getLayout() {
  const mod = await import('../Layout');
  return mod.default as typeof import('../Layout').default;
}

function mockMatchMedia(isDesktop: boolean) {
  const mq: any = {
    matches: isDesktop,
    media: '(min-width: 1024px)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => {
      mq.media = query;
      return mq;
    },
  });
}

describe('Layout component', () => {
  afterEach(() => {
    cleanup();
  });

  it('mobile: toggles sidebar and closes it on navigation; shows unread badge', async () => {
    storeState = {
      tenant: { role: 'employee', name: 'Tenant', email: 't@example.com' },
      profile: { full_name: 'Profile Name' },
      notifications: [
        { id: 'n1', is_read: false },
        { id: 'n2', is_read: true },
        { id: 'n3', is_read: false },
      ],
      logout: vi.fn(),
    };
    mockMatchMedia(false);

    const Layout = await getLayout();
    const onNavigate = vi.fn();
    const onNotificationsToggle = vi.fn();
    const onSearchToggle = vi.fn();

    const { container, unmount } = render(
      <Layout
        currentPage={'customers' as any}
        onNavigate={onNavigate}
        onNotificationsToggle={onNotificationsToggle}
        onSearchToggle={onSearchToggle}
      >
        <div>Child</div>
      </Layout>,
    );

    // unreadCount > 0 renders badge
    expect(screen.getByText('2')).toBeDefined();

    fireEvent.click(screen.getByTitle('Global Search (Ctrl+K)'));
    expect(onSearchToggle).toHaveBeenCalled();

    const bellButton = container.querySelector('button.relative') as HTMLButtonElement | null;
    expect(bellButton).not.toBeNull();
    bellButton && fireEvent.click(bellButton);
    expect(onNotificationsToggle).toHaveBeenCalled();

    // Sidebar starts closed on mobile
    expect(container.querySelector('.fixed.inset-0')).toBeNull();

    // Open with mobile menu button (top-left)
    const menuIcon = container.querySelector('svg[data-icon="Menu"]') as SVGElement | null;
    const menuBtn = menuIcon?.closest('button') as HTMLButtonElement | null;
    expect(menuBtn).not.toBeNull();
    menuBtn && fireEvent.click(menuBtn);
    expect(container.querySelector('.fixed.inset-0')).toBeTruthy();

    // Click a visible nav item: employee role should show "Customers"
    const customersBtn = screen.getByRole('button', { name: /customers/i });
    fireEvent.click(customersBtn);
    expect(onNavigate).toHaveBeenCalledWith('customers');
    // Sidebar closes on navigation for mobile
    expect(container.querySelector('.fixed.inset-0')).toBeNull();

    unmount();
  }, 15000);

  it('desktop: stays pinned open on navigation and can be closed via overlay; no unread badge when count=0', async () => {
    storeState = {
      tenant: { role: 'owner', name: 'Owner Tenant', email: 'o@example.com' },
      profile: { full_name: 'Owner Profile' },
      notifications: [],
      logout: vi.fn(),
    };
    mockMatchMedia(true);

    const Layout = await getLayout();
    const onNavigate = vi.fn();
    const onNotificationsToggle = vi.fn();
    const onSearchToggle = vi.fn();

    const { container, unmount } = render(
      <Layout
        currentPage={'analytics' as any}
        onNavigate={onNavigate}
        onNotificationsToggle={onNotificationsToggle}
        onSearchToggle={onSearchToggle}
      >
        <div>Child</div>
      </Layout>,
    );

    // pinned open on desktop
    expect(container.querySelector('.fixed.inset-0')).toBeTruthy();
    expect(screen.queryByText('1')).toBeNull();

    const analyticsBtn = screen.getByRole('button', { name: /analytics/i });
    fireEvent.click(analyticsBtn);
    expect(onNavigate).toHaveBeenCalledWith('analytics');
    // still open because isDesktop === true
    expect(container.querySelector('.fixed.inset-0')).toBeTruthy();

    // Close via overlay click
    const overlay = container.querySelector('.fixed.inset-0') as HTMLElement;
    fireEvent.click(overlay);
    expect(container.querySelector('.fixed.inset-0')).toBeNull();

    // Logout button triggers store.getState().logout
    const logoutBtn = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(logoutBtn);
    expect(storeState.logout).toHaveBeenCalled();

    unmount();
  });

  it('shows employee-only quick action and supports Dashboard fallback when currentPage does not match', async () => {
    storeState = {
      tenant: { role: 'employee', name: 'Employee Tenant', email: 'e@example.com' },
      profile: {},
      notifications: [{ id: 'n1', is_read: false }],
      logout: vi.fn(),
    };
    mockMatchMedia(true);

    const Layout = await getLayout();
    const onNavigate = vi.fn();
    const onNotificationsToggle = vi.fn();
    const onSearchToggle = vi.fn();

    render(
      <Layout
        currentPage={'not-a-real-page' as any}
        onNavigate={onNavigate}
        onNotificationsToggle={onNotificationsToggle}
        onSearchToggle={onSearchToggle}
      >
        <div>Child</div>
      </Layout>,
    );

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeDefined();

    // Quick action camera button navigates to new-customer for employee tenant.
    const cameraSvg = document.querySelector('svg[data-icon="Camera"]');
    expect(cameraSvg).toBeTruthy();
    const cameraBtn = cameraSvg?.closest('button') as HTMLButtonElement | null;
    expect(cameraBtn).not.toBeNull();
    cameraBtn && fireEvent.click(cameraBtn);
    expect(onNavigate).toHaveBeenCalledWith('new-customer');
  });

  it('renders no sidebar nav buttons when tenant role matches none of the items', async () => {
    storeState = {
      tenant: { role: 'guest', name: 'Guest', email: 'g@example.com' },
      profile: {},
      notifications: [],
      logout: vi.fn(),
    };
    mockMatchMedia(false);

    const Layout = await getLayout();
    render(
      <Layout
        currentPage={'customers' as any}
        onNavigate={vi.fn()}
        onNotificationsToggle={vi.fn()}
        onSearchToggle={vi.fn()}
      >
        <div>Child</div>
      </Layout>,
    );

    // No nav buttons should exist, because all items get filtered out.
    expect(screen.queryByRole('button', { name: /customers/i })).toBeNull();
  });

  it('header: toggles sidebar using the top bar menu button', async () => {
    storeState = {
      tenant: { role: 'owner', name: 'Owner Tenant', email: 'o@example.com' },
      profile: { full_name: 'Owner Profile' },
      notifications: [],
      logout: vi.fn(),
    };
    mockMatchMedia(false);

    const Layout = await getLayout();
    const onNavigate = vi.fn();
    render(
      <Layout
        currentPage={'login' as any}
        onNavigate={onNavigate}
        onNotificationsToggle={vi.fn()}
        onSearchToggle={vi.fn()}
      >
        <div>Child</div>
      </Layout>,
    );

    const overlayBefore = document.querySelector('.fixed.inset-0');
    expect(overlayBefore).toBeNull();

    const menuButtons = Array.from(document.querySelectorAll('svg[data-icon="Menu"]')).map((svg) =>
      svg.closest('button'),
    );
    const topBarBtn = menuButtons.find(
      (b) => b && !String((b as HTMLElement).className).includes('fixed'),
    ) as HTMLButtonElement | undefined;
    expect(topBarBtn).toBeTruthy();
    topBarBtn && fireEvent.click(topBarBtn);

    expect(document.querySelector('.fixed.inset-0')).toBeTruthy();
  });
});

