/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/common/Navbar';
import { BottomNav } from './components/common/BottomNav';
import { Footer } from './components/common/Footer';
import { HomePage } from './pages/public/HomePage';
import { EventsPage } from './pages/public/EventsPage';
import { EventDetailPage } from './pages/public/EventDetailPage';
import { CheckoutPage } from './pages/public/CheckoutPage';
import { MyTicketsPage } from './pages/public/MyTicketsPage';
import { MyVehiclesPage } from './pages/public/MyVehiclesPage';
import { ProfilePage } from './pages/public/ProfilePage';
import { NotificationsPage } from './pages/public/NotificationsPage';
import { LoginPage } from './pages/public/LoginPage';
import { AccessDeniedPage } from './pages/public/AccessDeniedPage';

// PX CONTROL (Admin)
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminCheckinPage } from './pages/admin/AdminCheckinPage';
import { AdminMercadoPagoPage } from './pages/admin/AdminMercadoPagoPage';
import { AdminEventsPage } from './pages/admin/AdminEventsPage';
import { AdminTicketsPage } from './pages/admin/AdminTicketsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminVehiclesPage } from './pages/admin/AdminVehiclesPage';
import { AdminAdminsPage } from './pages/admin/AdminAdminsPage';
import { AdminSupabasePage } from './pages/admin/AdminSupabasePage';
import { AdminBrandingPage } from './pages/admin/AdminBrandingPage';
import { AlertTriangle, RefreshCw } from 'lucide-react';

import { PxLogo } from './components/common/PxLogo';
import { useAuth } from './context/AuthContext';
import { api } from './services/api';
import { EventItem, Ticket, Vehicle, UserProfile, DashboardStats, NotificationItem } from './types';

export default function App() {
  const { user, profile, loading: authLoading, isAuthenticated, isAdmin, logout } = useAuth();

  // Navigation State
  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedEventSlug, setSelectedEventSlug] = useState<string>('encontro-px-custom');
  const [loginRedirectTarget, setLoginRedirectTarget] = useState<string>('home');
  const [loginCustomNotice, setLoginCustomNotice] = useState<string | undefined>(undefined);
  
  // Admin State
  const [adminSection, setAdminSection] = useState<string>('dashboard');
  const [selectedAdminEvent, setSelectedAdminEvent] = useState<string>('all');

  // Application Data State
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Initial Data Loading & Resilience States
  const [initialLoading, setInitialLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Carrega dados iniciais da aplicação de forma resiliente usando Promise.allSettled
  const loadData = async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const results = await Promise.allSettled([
        api.getEvents(),
        api.getTickets(),
        api.getVehicles(user?.id),
        api.getNotifications(),
        api.getDashboardStats(),
      ]);

      const [resEvts, resTkts, resVehs, resNotifs, resStats] = results;

      if (resEvts.status === 'fulfilled') {
        setEvents(Array.isArray(resEvts.value) ? resEvts.value : []);
      } else {
        console.error('[PX CUSTOM] Falha ao consultar eventos:', resEvts.reason);
      }

      if (resTkts.status === 'fulfilled') {
        setTickets(Array.isArray(resTkts.value) ? resTkts.value : []);
      } else {
        console.error('[PX CUSTOM] Falha ao consultar ingressos:', resTkts.reason);
      }

      if (resVehs.status === 'fulfilled') {
        setVehicles(Array.isArray(resVehs.value) ? resVehs.value : []);
      } else {
        console.error('[PX CUSTOM] Falha ao consultar veículos:', resVehs.reason);
      }

      if (resNotifs.status === 'fulfilled') {
        setNotifications(Array.isArray(resNotifs.value) ? resNotifs.value : []);
      } else {
        console.error('[PX CUSTOM] Falha ao consultar notificações:', resNotifs.reason);
      }

      if (resStats.status === 'fulfilled') {
        setStats(resStats.value || null);
        setStatsError(null);
      } else {
        console.error('[PX CUSTOM] Falha ao consultar métricas do dashboard:', resStats.reason);
        setStatsError(resStats.reason?.message || 'Falha ao buscar estatísticas');
      }
    } finally {
      setStatsLoading(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      setInitialLoading(false);
    }, 1500);

    loadData().finally(() => clearTimeout(safetyTimeout));

    return () => clearTimeout(safetyTimeout);
  }, [user?.id]);

  const handleReloadStats = async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const st = await api.getDashboardStats();
      setStats(st);
    } catch (err: any) {
      console.error('[PX CUSTOM] Erro ao recarregar métricas:', err);
      setStatsError(err?.message || 'Falha ao buscar estatísticas');
    } finally {
      setStatsLoading(false);
    }
  };

  // Navegação com proteção de rotas (RBAC & Auth Guard)
  const handleNavigate = (view: string) => {
    // Rotas protegidas que exigem autenticação
    const protectedUserRoutes = ['tickets', 'vehicles', 'profile', 'checkout'];
    
    if (protectedUserRoutes.includes(view) && !isAuthenticated) {
      setLoginRedirectTarget(view);
      const labels: Record<string, string> = {
        tickets: 'seus ingressos digitais',
        vehicles: 'seus veículos cadastrados',
        profile: 'seu perfil oficial',
        checkout: 'concluir sua compra de ingressos',
      };
      setLoginCustomNotice(`Faça login ou cadastre-se para acessar ${labels[view] || 'esta área'}.`);
      setCurrentView('login');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view === 'px-control') {
      if (!isAuthenticated) {
        setLoginRedirectTarget('px-control');
        setLoginCustomNotice('Acesso restrito: Faça login com sua conta administrativa para acessar o PX CONTROL.');
        setCurrentView('login');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      // Se autenticado, deixa avançar; a verificação de role tratará a renderização (403 se não admin)
    }

    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectEvent = (slug: string) => {
    setSelectedEventSlug(slug);
    setCurrentView('event-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBuyTickets = (slug: string) => {
    setSelectedEventSlug(slug);
    if (!isAuthenticated) {
      setLoginRedirectTarget('checkout');
      setLoginCustomNotice('Faça login ou crie sua conta para prosseguir com a compra segura de ingressos.');
      setCurrentView('login');
    } else {
      setCurrentView('checkout');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCheckoutSuccess = (newTicket: Ticket) => {
    setTickets((prev) => [newTicket, ...prev]);
    api.getDashboardStats().then((st) => setStats(st));
    api.getNotifications().then((notifs) => setNotifications(notifs));
    setCurrentView('tickets');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddVehicle = async (vehData: Partial<Vehicle>) => {
    const created = await api.addVehicle({
      ...vehData,
      userId: user?.id,
    });
    setVehicles((prev) => [...prev, created]);
  };

  const handleUpdateVehicle = async (id: string, vehData: Partial<Vehicle>) => {
    const updated = await api.updateVehicle(id, {
      ...vehData,
      userId: user?.id,
    });
    setVehicles((prev) => prev.map((v) => (v.id === id ? updated : v)));
  };

  const handleDeleteVehicle = async (id: string) => {
    try {
      await api.deleteVehicle(id);
      setVehicles((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      console.error('Erro ao excluir veículo:', err);
    }
  };

  const handleMarkAllNotifsRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleAddEvent = async (eventData: Partial<EventItem>) => {
    try {
      if (eventData.id) {
        const updated = await api.updateEvent(eventData.id, eventData);
        setEvents((prev) => prev.map((ev) => (ev.id === updated.id ? updated : ev)));
      } else {
        const created = await api.createEvent(eventData);
        setEvents((prev) => [created, ...prev]);
      }
    } catch (err) {
      console.error('[PX CONTROL] Erro ao persistir evento no Supabase:', err);
      throw err;
    }
  };

  const handleLoginSuccess = (redirectTarget?: string) => {
    const target = redirectTarget || loginRedirectTarget || 'home';
    setLoginRedirectTarget('home');
    setLoginCustomNotice(undefined);
    handleNavigate(target);
  };

  // Carregamento de Inicialização (Zero flash de dados incorretos)
  if (authLoading || initialLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="animate-pulse flex items-center justify-center">
            <PxLogo size="lg" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#FF1A2D] animate-ping" />
            <span className="text-xs uppercase font-mono tracking-widest text-gray-400">
              Carregando Ecossistema PX CUSTOM...
            </span>
          </div>
        </div>
      </div>
    );
  }

  const unreadNotifsCount = (notifications || []).filter((n) => !n.read).length;
  const currentEvent = (events || []).find((e) => e.slug === selectedEventSlug) || (events && events[0]) || undefined;

  // Objeto de perfil seguro para componentes que demandam UserProfile
  const activeProfile: UserProfile = profile || {
    id: user?.id || 'guest',
    name: 'Visitante',
    email: user?.email || '',
    phone: '',
    cpf: '',
    city: 'Manhuaçu',
    state: 'MG',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    role: 'USER',
    createdAt: new Date().toISOString(),
  };

  // ---------------------------------------------------------------------------
  // 1. PX CONTROL (ADMINISTRATION INTERFACE & RBAC GUARD)
  // ---------------------------------------------------------------------------
  if (currentView === 'px-control') {
    // Se não for admin ou super admin -> Tela 403 Acesso Negado
    if (!isAdmin) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col antialiased selection:bg-[#FF1A2D] selection:text-white pb-14 md:pb-0">
          <Navbar
            currentTab={currentView}
            onNavigate={handleNavigate}
            unreadCount={unreadNotifsCount}
          />
          <main className="flex-1">
            <AccessDeniedPage
              user={profile}
              onBackToHome={() => handleNavigate('home')}
              onNavigateProfile={() => handleNavigate('profile')}
              onLogout={async () => {
                await logout();
                handleNavigate('home');
              }}
            />
          </main>
          <Footer onNavigate={handleNavigate} />
          <BottomNav currentTab={currentView} onNavigate={handleNavigate} />
        </div>
      );
    }

    // Administrador autenticado -> Renderiza PX CONTROL
    return (
      <AdminLayout
        currentSection={adminSection}
        onNavigateSection={setAdminSection}
        onExitToPublic={() => handleNavigate('home')}
        selectedEvent={selectedAdminEvent}
        onSelectEvent={setSelectedAdminEvent}
      >
        {adminSection === 'dashboard' && (
          statsLoading && !stats ? (
            <div className="p-8 sm:p-12 rounded-2xl bg-[#0c0c0c] border border-[#1c1c1c] text-center space-y-4 animate-fadeIn">
              <div className="w-10 h-10 border-4 border-[#FF1A2D] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-300 font-bold uppercase font-heading text-sm">Carregando métricas do PX CONTROL...</p>
              <p className="text-xs text-gray-500">Consultando PostgreSQL e registros oficiais do Supabase</p>
            </div>
          ) : statsError && !stats ? (
            <div className="p-8 sm:p-12 rounded-2xl bg-[#0c0c0c] border border-red-900/40 text-center space-y-4 animate-fadeIn">
              <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-500/40 text-red-500 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white font-heading uppercase">Falha ao Carregar Métricas</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">{statsError}</p>
              <button
                onClick={handleReloadStats}
                className="px-5 py-2.5 bg-[#FF1A2D] hover:bg-[#d91425] text-white text-xs font-black uppercase rounded-xl font-heading transition-all shadow-lg shadow-[#FF1A2D]/20 cursor-pointer inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Tentar Recarregar Métricas</span>
              </button>
            </div>
          ) : stats ? (
            <AdminDashboard
              stats={stats}
              events={events}
              onNavigateSection={setAdminSection}
            />
          ) : (
            <div className="p-8 sm:p-12 rounded-2xl bg-[#0c0c0c] border border-[#1c1c1c] text-center space-y-4 animate-fadeIn">
              <p className="text-gray-400 text-sm">Nenhum registro de métrica encontrado no momento.</p>
              <button
                onClick={handleReloadStats}
                className="px-5 py-2.5 bg-[#141414] hover:bg-[#1f1f1f] border border-[#333] text-white text-xs font-bold uppercase rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Atualizar Dashboard</span>
              </button>
            </div>
          )
        )}

        {adminSection === 'events' && (
          <AdminEventsPage
            events={events}
            onAddEvent={handleAddEvent}
          />
        )}

        {adminSection === 'tickets' && (
          <AdminTicketsPage tickets={tickets} />
        )}

        {adminSection === 'checkin' && (
          <AdminCheckinPage />
        )}

        {adminSection === 'users' && (
          <AdminUsersPage />
        )}

        {adminSection === 'vehicles' && (
          <AdminVehiclesPage vehicles={vehicles} onUpdateVehicle={handleUpdateVehicle} />
        )}

        {adminSection === 'mercadopago' && (
          <AdminMercadoPagoPage />
        )}

        {adminSection === 'branding' && (
          <AdminBrandingPage />
        )}

        {adminSection === 'payments' && (
          <AdminMercadoPagoPage />
        )}

        {adminSection === 'notifications' && (
          <NotificationsPage
            notifications={notifications}
            onMarkAllAsRead={handleMarkAllNotifsRead}
            onNavigate={handleNavigate}
          />
        )}

        {adminSection === 'reports' && stats && (
          <AdminDashboard
            stats={stats}
            events={events}
            onNavigateSection={setAdminSection}
          />
        )}

        {adminSection === 'admins' && (
          <AdminAdminsPage />
        )}

        {adminSection === 'supabase' && (
          <AdminSupabasePage />
        )}
      </AdminLayout>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. ÁREA PÚBLICA / USUÁRIO
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-black text-white flex flex-col antialiased selection:bg-[#FF1A2D] selection:text-white pb-14 md:pb-0">
      
      {/* Top Header Navbar */}
      <Navbar
        currentTab={currentView}
        onNavigate={handleNavigate}
        unreadCount={unreadNotifsCount}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {/* TELA DE LOGIN / CADASTRO */}
        {currentView === 'login' && (
          <LoginPage
            redirectTo={loginRedirectTarget}
            onLoginSuccess={handleLoginSuccess}
            onCancel={() => handleNavigate('home')}
            customNotice={loginCustomNotice}
          />
        )}

        {currentView === 'home' && (
          <HomePage
            events={events}
            user={activeProfile}
            vehicles={vehicles}
            unreadNotifsCount={unreadNotifsCount}
            onSelectEvent={handleSelectEvent}
            onNavigate={handleNavigate}
            onAddVehicleClick={() => handleNavigate('vehicles')}
          />
        )}

        {currentView === 'events' && (
          <EventsPage
            events={events}
            onSelectEvent={handleSelectEvent}
          />
        )}

        {currentView === 'event-detail' && currentEvent && (
          <EventDetailPage
            event={currentEvent}
            onBack={() => handleNavigate('events')}
            onBuyTickets={handleBuyTickets}
          />
        )}

        {currentView === 'checkout' && currentEvent && (
          <CheckoutPage
            event={currentEvent}
            user={{
              name: activeProfile.name || '',
              email: activeProfile.email || '',
              phone: activeProfile.phone || '',
              cpf: activeProfile.cpf || '',
            }}
            onBack={() => handleNavigate('event-detail')}
            onSuccess={handleCheckoutSuccess}
          />
        )}

        {currentView === 'tickets' && (
          <MyTicketsPage
            tickets={tickets}
            onBrowseEvents={() => handleNavigate('events')}
          />
        )}

        {currentView === 'vehicles' && (
          <MyVehiclesPage
            vehicles={vehicles}
            onAddVehicle={handleAddVehicle}
            onUpdateVehicle={handleUpdateVehicle}
            onDeleteVehicle={handleDeleteVehicle}
          />
        )}

        {currentView === 'profile' && (
          <ProfilePage
            user={activeProfile}
            onUpdateUser={() => {}}
            onNavigate={handleNavigate}
            onLogout={async () => {
              await logout();
              handleNavigate('home');
            }}
          />
        )}

        {currentView === 'notifications' && (
          <NotificationsPage
            notifications={notifications}
            onMarkAllAsRead={handleMarkAllNotifsRead}
            onNavigate={handleNavigate}
          />
        )}
      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentView}
        onNavigate={handleNavigate}
      />

    </div>
  );
}
