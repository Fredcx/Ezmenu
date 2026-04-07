import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Outlet, useParams } from 'react-router-dom';
import {
    LayoutDashboard, UtensilsCrossed, Armchair, LogOut, Menu,
    Bell, CreditCard, Package, ChefHat, Globe,
    Users, Store, ChevronDown,
    BarChart3, Tag, Layers, Megaphone, Settings2, History
} from 'lucide-react';
import { BrandingLogo } from '@/components/BrandingLogo';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface NavItem {
    label: string;
    icon: React.ElementType;
    path: string;
}

interface NavGroup {
    label: string;
    groupIcon: React.ElementType;
    items: NavItem[];
    defaultOpen?: boolean;
}

export const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    const [restaurantName, setRestaurantName] = useState<string>('');
    const notifiedIdsRef = useRef<Set<string>>(new Set());
    const { slug } = useParams();

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                if (location.pathname.startsWith('/superadmin')) navigate('/superadmin/login');
                else navigate('/admin');
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role, establishment_id')
                .eq('id', session.user.id)
                .single();

            const role = profile?.role || 'customer';
            setUserRole(role);

            if (slug) {
                const { data: est } = await supabase
                    .from('establishments')
                    .select('id, name')
                    .eq('slug', slug)
                    .single();

                if (est) {
                    setRestaurantName(est.name);
                    if (profile?.establishment_id !== est.id && role !== 'super_admin') {
                        toast.error("Você não tem permissão para gerenciar este restaurante.");
                        if (profile?.establishment_id) {
                            const { data: myEst } = await supabase.from('establishments').select('slug').eq('id', profile.establishment_id).single();
                            if (myEst) navigate(`/${myEst.slug}/admin`);
                            else navigate('/admin');
                        } else navigate('/admin');
                    }
                }
                if (role === 'waiter') navigate(`/${slug}/equipe`);
            }

            const isOnSuperAdminPath = location.pathname.startsWith('/superadmin');
            if (isOnSuperAdminPath && role !== 'super_admin') {
                toast.error("Acesso negado.");
                navigate('/superadmin/login');
            }
        };
        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) navigate('/admin');
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    // Auto-open the group containing the current route
    useEffect(() => {
        if (!slug) return;
        const groups = buildNavGroups(slug);
        const newOpen: Record<string, boolean> = {};
        groups.forEach(group => {
            const isActive = group.items.some(item =>
                location.pathname === item.path || location.pathname.startsWith(item.path + '/')
            );
            if (isActive) newOpen[group.label] = true;
        });
        setOpenGroups(prev => ({ ...prev, ...newOpen }));
    }, [location.pathname, slug]);

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const { data, error } = await supabase.from('service_requests').select('*').eq('status', 'pending');
                if (error) throw error;
                data?.forEach((req: any) => {
                    if (!notifiedIdsRef.current.has(req.id)) {
                        notifiedIdsRef.current.add(req.id);
                        const targetPath = slug ? `/${slug}/admin/kitchen` : null;
                        toast.custom((t) => (
                            <div
                                className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-2xl flex items-center gap-4 min-w-[320px] animate-in slide-in-from-right-10 cursor-pointer hover:border-zinc-300 transition-colors relative"
                                onClick={() => targetPath && navigate(targetPath)}
                            >
                                <button onClick={(e) => { e.stopPropagation(); toast.dismiss(t); }} className="absolute top-2 right-2 p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">✕</button>
                                <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 shadow-inner">
                                    {req.type === 'machine' ? <CreditCard className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-zinc-900 text-base">Mesa {req.table_id}</h4>
                                    <p className="text-sm text-zinc-500 font-medium">{req.type === 'machine' ? 'Solicitou Maquininha' : 'Chamou Garçom'}</p>
                                </div>
                            </div>
                        ), { duration: 8000, position: 'bottom-right' });
                    }
                });
            } catch (e) { console.error("Error checking notifications", e); }
        };
        fetchRequests();
        const channel = supabase.channel('service_notifs')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'service_requests' }, () => fetchRequests())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [navigate, slug]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/admin');
        toast.success('Sessão encerrada');
    };

    const toggleGroup = (label: string) => setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));

    const isSuperAdmin = userRole === 'super_admin' && location.pathname.startsWith('/superadmin');

    const platformItems: NavItem[] = [
        { label: 'Visão Geral', icon: LayoutDashboard, path: '/superadmin' },
        { label: 'Parceiros', icon: Store, path: '/superadmin/establishments' },
        { label: 'Clientes', icon: Users, path: '/superadmin/customers' },
    ];

    const buildNavGroups = (s: string): NavGroup[] => [
        {
            label: 'Visão Geral',
            groupIcon: LayoutDashboard,
            defaultOpen: true,
            items: [{ label: 'Dashboard', icon: LayoutDashboard, path: `/${s}/admin` }]
        },
        {
            label: 'Operação',
            groupIcon: UtensilsCrossed,
            defaultOpen: true,
            items: [
                { label: 'Mesas', icon: Armchair, path: `/${s}/admin/tables` },
                { label: 'KDS', icon: ChefHat, path: `/${s}/admin/kitchen` },
            ]
        },
        {
            label: 'Catálogo & Estoque',
            groupIcon: Layers,
            items: [
                { label: 'Cardápio', icon: Tag, path: `/${s}/admin/menu` },
                { label: 'Estoque', icon: Package, path: `/${s}/admin/inventory` },
                { label: 'Ficha Técnica', icon: ChefHat, path: `/${s}/admin/recipes` },
            ]
        },
        {
            label: 'Atração & Marketing',
            groupIcon: Megaphone,
            items: [
                { label: 'Discovery', icon: Globe, path: `/${s}/admin/discovery` },
            ]
        },
        {
            label: 'Inteligência & Gestão',
            groupIcon: Settings2,
            items: [
                { label: 'Equipe', icon: Users, path: `/${s}/admin/staff` },
                { label: 'Histórico', icon: History, path: `/${s}/admin/history` },
                { label: 'Relatórios', icon: BarChart3, path: `/${s}/admin/reports` },
            ]
        },
    ];

    const navGroups = slug ? buildNavGroups(slug) : [];

    const isItemActive = (path: string) =>
        location.pathname === path || (path !== `/${slug}/admin` && location.pathname.startsWith(path));

    const NavItemButton = ({ item, onNavigate }: { item: NavItem; onNavigate: (p: string) => void }) => {
        const active = isItemActive(item.path);
        return (
            <button
                onClick={() => onNavigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${active
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
            >
                <div className={`w-6 h-6 flex items-center justify-center rounded-lg shrink-0 transition-colors ${active ? 'bg-white/20' : 'bg-zinc-100 group-hover:bg-zinc-200'}`}>
                    <item.icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-700'}`} />
                </div>
                <span className={`text-[13px] font-semibold tracking-tight ${active ? 'text-white' : ''}`}>{item.label}</span>
            </button>
        );
    };

    const renderNavGroups = (groups: NavGroup[], onNavigate: (path: string) => void) => (
        <div className="space-y-1">
            {groups.map((group) => {
                const isGroupOpen = openGroups[group.label] ?? group.defaultOpen ?? false;

                return (
                    <div key={group.label}>
                        {/* Group Header — always shown for all groups */}
                        <button
                            onClick={() => toggleGroup(group.label)}
                            className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl transition-colors hover:bg-red-50/60"
                        >
                            <div className="flex items-center gap-1.5">
                                <group.groupIcon className="w-3 h-3 shrink-0 text-[#ED1B2E]" />
                                <span className="text-[9.5px] font-bold uppercase tracking-widest text-[#ED1B2E] whitespace-nowrap">{group.label}</span>
                            </div>
                            <ChevronDown className={`w-3 h-3 transition-transform duration-300 text-[#ED1B2E]/60 ${isGroupOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Group Items */}
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isGroupOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="space-y-0.5 pl-2 pb-1 pt-0.5">
                                {group.items.map(item => (
                                    <NavItemButton key={item.path} item={item} onNavigate={onNavigate} />
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    const renderFlatNav = (items: NavItem[], onNavigate: (path: string) => void) => (
        <div className="space-y-0.5">
            {items.map(item => <NavItemButton key={item.path} item={item} onNavigate={onNavigate} />)}
        </div>
    );

    const SidebarContent = ({ onNavigate }: { onNavigate: (p: string) => void }) => (
        <div className="flex flex-col h-full">
            {/* App-Icon Style Header */}
            <div className="px-4 py-5 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                    {/* App icon: white bg + dark brand logo */}
                    <div className="w-10 h-10 rounded-[10px] bg-white border border-zinc-200 flex items-center justify-center shadow-sm shrink-0">
                        <BrandingLogo variant="dark" className="w-7 h-7 object-contain" showText={false} skipCustomization={true} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-none mb-0.5">Painel Admin</p>
                        <p className="font-bold text-[14px] text-zinc-900 leading-tight truncate max-w-[130px]">
                            {restaurantName || (slug ? slug.replace(/-/g, ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Super Admin')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 overflow-y-auto no-scrollbar">
                {isSuperAdmin
                    ? renderFlatNav(platformItems, onNavigate)
                    : renderNavGroups(navGroups, onNavigate)
                }
            </nav>

            {/* Logout */}
            <div className="px-3 py-4 border-t border-zinc-100">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 group"
                >
                    <div className="w-6 h-6 flex items-center justify-center rounded-lg bg-zinc-100 group-hover:bg-red-100 transition-colors shrink-0">
                        <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                    </div>
                    <span className="text-[13px] font-semibold">Encerrar Sessão</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="admin-layout flex h-screen bg-zinc-50">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-56 flex-col bg-white border-r border-zinc-100 h-full z-50 shadow-sm">
                <SidebarContent onNavigate={(p) => navigate(p)} />
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Mobile Top Bar */}
                <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-zinc-100 sticky top-0 z-40">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-[8px] bg-zinc-900 flex items-center justify-center shadow-sm">
                            <BrandingLogo variant="light" className="w-5 h-5" showText={false} skipCustomization={true} />
                        </div>
                        <span className="font-bold text-sm text-zinc-900 truncate max-w-[160px]">{restaurantName || 'Ez Menu'}</span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 rounded-xl hover:bg-zinc-100 transition-colors">
                        <Menu className="w-5 h-5 text-zinc-600" />
                    </button>
                </div>

                {/* Mobile Overlay */}
                <div className={`fixed inset-0 z-50 transition-opacity duration-300 md:hidden ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                    <div className={`absolute left-0 top-0 bottom-0 w-[240px] bg-white shadow-2xl transition-transform duration-300 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                        <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-100">
                            <span className="font-bold text-sm text-zinc-900">Menu</span>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-500">✕</button>
                        </div>
                        <div className="h-[calc(100%-52px)] overflow-y-auto">
                            <SidebarContent onNavigate={(p) => { navigate(p); setIsMobileMenuOpen(false); }} />
                        </div>
                    </div>
                </div>

                {/* Page Area */}
                <div className="flex-1 overflow-auto p-5 md:p-7">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
