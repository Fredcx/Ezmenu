import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Outlet, useParams } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, Armchair, LogOut, Menu, Bell, CreditCard, Package, ChefHat, TrendingDown, TrendingUp, Globe, Users, Calendar, Settings, Store } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const notifiedIdsRef = useRef<Set<string>>(new Set());
    const { slug } = useParams();

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                if (location.pathname.startsWith('/superadmin')) {
                    navigate('/superadmin/login');
                } else {
                    navigate('/admin');
                }
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role, establishment_id')
                .eq('id', session.user.id)
                .single();

            const role = profile?.role || 'client';
            setUserRole(role);

            // Access Control Logic
            const isOnSuperAdminPath = location.pathname.startsWith('/superadmin');

            if (isOnSuperAdminPath) {
                if (role !== 'super_admin') {
                    toast.error("Acesso negado. Portal exclusivo para Super Admin.");
                    navigate('/superadmin/login');
                    return;
                }
            } else if (slug) {
                // If on a restaurant path, check if user has access to THIS restaurant
                const { data: est } = await supabase
                    .from('establishments')
                    .select('id')
                    .eq('slug', slug)
                    .single();

                if (est && profile?.establishment_id !== est.id && role !== 'super_admin') {
                    toast.error("Você não tem permissão para gerenciar este restaurante.");
                    // Redirect to their own admin if possible
                    if (profile?.establishment_id) {
                        const { data: myEst } = await supabase
                            .from('establishments')
                            .select('slug')
                            .eq('id', profile.establishment_id)
                            .single();
                        if (myEst) navigate(`/${myEst.slug}/admin`);
                        else navigate('/admin');
                    } else {
                        navigate('/admin');
                    }
                }
            } else if (location.pathname.includes('/admin') && !slug && role !== 'super_admin') {
                // Generic /admin access without slug
                navigate('/admin');
            }
        };
        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) {
                navigate('/admin');
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const { data, error } = await supabase
                    .from('service_requests')
                    .select('*')
                    .eq('status', 'pending');

                if (error) throw error;

                data?.forEach((req: any) => {
                    if (!notifiedIdsRef.current.has(req.id)) {
                        notifiedIdsRef.current.add(req.id);

                        // Only try to navigate to kitchen if slug is available
                        const targetPath = slug ? `/${slug}/admin/kitchen` : null;

                        toast.custom((t) => (
                            <div className="bg-card/95 backdrop-blur-xl border border-red-500/30 rounded-2xl p-4 shadow-2xl flex items-center gap-4 min-w-[320px] animate-in slide-in-from-right-10 cursor-pointer hover:border-red-500 transition-colors"
                                onClick={() => targetPath && navigate(targetPath)}>
                                <div className={`p-3 rounded-full ${req.type === 'machine' ? 'bg-orange-100' : 'bg-red-100'} shadow-inner`}>
                                    {req.type === 'machine' ? <CreditCard className={`w-6 h-6 ${req.type === 'machine' ? 'text-orange-600' : 'text-red-600'}`} /> : <Bell className="w-6 h-6 text-red-600 animate-wiggle" />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-foreground text-base">Mesa {req.table_id}</h4>
                                    <p className="text-sm text-muted-foreground font-medium">{req.type === 'machine' ? 'Solicitou Maquininha' : 'Chamou Garçom'}</p>
                                </div>
                            </div>
                        ), { duration: 8000, position: 'bottom-right' });
                    }
                });
            } catch (e) {
                console.error("Error checking notifications", e);
            }
        };

        fetchRequests();
        const channel = supabase.channel('service_notifs')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'service_requests' }, () => fetchRequests())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [navigate, slug]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/admin');
        toast.success('Sessão encerrada');
    };

    const isSuperAdmin = userRole === 'super_admin' && location.pathname.startsWith('/superadmin');

    const platformItems = [
        { label: 'Visão Geral', icon: LayoutDashboard, path: '/superadmin' },
        { label: 'Parceiros', icon: Store, path: '/superadmin/establishments' },
        { label: 'Clientes', icon: Users, path: '/superadmin/customers' },
    ];

    const restaurantItems = slug ? [
        { label: 'Dashboard', icon: LayoutDashboard, path: `/${slug}/admin` },
        { label: 'Discovery', icon: Globe, path: `/${slug}/admin/discovery` },
        { label: 'Fila de Espera', icon: Users, path: `/${slug}/admin/queue` },
        { label: 'Reservas', icon: Calendar, path: `/${slug}/admin/reservations` },
        { label: 'Mesas', icon: Armchair, path: `/${slug}/admin/tables` },
        { label: 'Cozinha', icon: UtensilsCrossed, path: `/${slug}/admin/kitchen` },
        { label: 'Estoque', icon: Package, path: `/${slug}/admin/inventory` },
        { label: 'Ficha Técnica', icon: ChefHat, path: `/${slug}/admin/recipes` },
        { label: 'Cardápio', icon: Menu, path: `/${slug}/admin/menu` },
        { label: 'Rel. Consumo', icon: TrendingDown, path: `/${slug}/admin/consumption` },
        { label: 'Configurações', icon: Settings, path: `/${slug}/admin/settings` },
    ] : [];

    const navItems = isSuperAdmin ? platformItems : restaurantItems;

    return (
        <div className="flex h-screen bg-secondary/10">
            {/* Sidebar Desktop */}
            <aside className="hidden md:flex w-72 flex-col bg-white border-r border-border/40 h-full shadow-premium relative z-50">
                <div className="p-8 border-b border-border/20">
                    <h1 className="text-2xl font-black text-primary flex flex-col uppercase tracking-tighter italic leading-none">
                        Ez Menu
                        <span className="text-foreground text-[9px] font-black uppercase tracking-[0.3em] mt-1 opacity-40 not-italic">
                            Executive Suite
                        </span>
                    </h1>
                </div>

                <nav className="flex-1 p-6 space-y-1.5 overflow-y-auto no-scrollbar">
                    {navItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3.5 px-5 py-3.5 rounded-2xl transition-premium group ${location.pathname === item.path
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <item.icon className={`w-5 h-5 transition-transform duration-500 group-hover:scale-110 ${location.pathname === item.path ? 'text-white' : 'text-primary/70'}`} />
                            <span className="font-black text-[13px] uppercase tracking-tight">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-6 border-t border-border/20">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3.5 px-5 py-4 rounded-2xl text-red-500 hover:bg-red-50 transition-premium group font-black text-[13px] uppercase tracking-tight active:scale-95"
                    >
                        <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span>Encerrar Sessão</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Mobile Header */}
                <div className="md:hidden flex items-center justify-between p-4 glass-morphism border-b border-border/40 sticky top-0 z-40">
                    <h1 className="font-bold">Ez Menu Admin</h1>
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                        <Menu className="w-6 h-6" />
                    </button>
                </div>

                {/* Mobile Menu Overlay */}
                {isMobileMenuOpen && (
                    <div className="absolute inset-0 z-50 glass border-b border-border/40 p-4 animate-in slide-in-from-top-10">
                        <div className="flex justify-end mb-4">
                            <button onClick={() => setIsMobileMenuOpen(false)}>
                                <span className="text-xl font-bold">✕</span>
                            </button>
                        </div>
                        <nav className="space-y-2">
                            {navItems.map((item) => (
                                <button
                                    key={item.path}
                                    onClick={() => {
                                        navigate(item.path);
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl text-lg ${location.pathname === item.path
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-secondary/50'
                                        }`}
                                >
                                    <item.icon className="w-6 h-6" />
                                    <span>{item.label}</span>
                                </button>
                            ))}
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-4 rounded-xl text-lg text-red-500 bg-red-50 mt-8"
                            >
                                <LogOut className="w-6 h-6" />
                                <span>Sair</span>
                            </button>
                        </nav>
                    </div>
                )}

                <div className="flex-1 overflow-auto p-4 md:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
