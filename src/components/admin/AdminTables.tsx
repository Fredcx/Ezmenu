import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer, X, Fish, Armchair, Plus, Save, RotateCcw, ZoomIn, ZoomOut, Trash2, GripHorizontal, Move, Edit, Clock, UtensilsCrossed, Receipt, ChefHat, Users, FileText, ChevronRight, User, QrCode, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface TableData {
    id: string;
    shape: 'round' | 'square' | 'rect' | 'long' | 'text' | 'divider_v' | 'divider_h';
    top: string;
    left: string;
    w: string;
    h: string;
    seats: number;
    status: 'free' | 'occupied' | 'waiting_payment' | 'ordered' | 'eating' | 'cleaning';
    last_activity_at: string | null;
    is_label?: boolean;
    label_name?: string;
    occupants?: any[];
}

const DEFAULT_TABLES: TableData[] = [
    { id: 'B1', shape: 'rect', top: '10%', left: '10%', w: '85px', h: '55px', seats: 4, status: 'free', last_activity_at: null },
    { id: 'B2', shape: 'square', top: '10%', left: '40%', w: '60px', h: '60px', seats: 2, status: 'free', last_activity_at: null },
    { id: 'B3', shape: 'rect', top: '10%', left: '70%', w: '100px', h: '55px', seats: 6, status: 'free', last_activity_at: null },
    { id: 'B5', shape: 'rect', top: '70%', left: '10%', w: '85px', h: '55px', seats: 4, status: 'free', last_activity_at: null },
    { id: 'B6', shape: 'long', top: '70%', left: '60%', w: '140px', h: '55px', seats: 8, status: 'free', last_activity_at: null },
];

export function AdminTables() {
    const { slug } = useParams();
    const [establishmentId, setEstablishmentId] = useState<string | null>(null);

    // Data State
    const [participants, setParticipants] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);

    // Map State
    const [tables, setTables] = useState<TableData[]>([]);
    const [scale, setScale] = useState(1);

    // UI State
    const [isEditing, setIsEditing] = useState(false);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'orders'>('info');
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [showQrModal, setShowQrModal] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 1000); // 1s for "live" timer
        return () => clearInterval(interval);
    }, []);

    // Editing Specifics
    const mapRef = useRef<HTMLDivElement>(null);
    const qrRef = useRef<HTMLDivElement>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [editingTableId, setEditingTableId] = useState<TableData | null>(null); // For renaming dialog

    const fetchTableData = async () => {
        try {
            let currentEstId = establishmentId;

            // 0. Ensure establishmentId is available
            if (!currentEstId && slug) {
                const { data: est } = await supabase
                    .from('establishments')
                    .select('id')
                    .eq('slug', slug)
                    .single();
                if (est) {
                    currentEstId = est.id;
                    setEstablishmentId(est.id);
                }
            }

            if (!currentEstId) return;

            // 1. Fetch Tables
            const { data: tableData, error: tableError } = await supabase
                .from('restaurant_tables')
                .select('*')
                .eq('establishment_id', currentEstId);
            if (tableError) throw tableError;
            if (tableData) {
                setTables(tableData.map(t => ({
                    id: t.id,
                    shape: t.shape,
                    top: t.top_pos,
                    left: t.left_pos,
                    w: t.width,
                    h: t.height,
                    seats: t.seats,
                    status: t.status || 'free',
                    last_activity_at: t.last_activity_at,
                    is_label: t.is_label,
                    label_name: t.label_name,
                    occupants: t.occupants || []
                })));
            }

            // 2. Fetch Orders (to check occupation) - Only active orders
            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select('*, order_items(*, menu_items(*))')
                .eq('establishment_id', currentEstId)
                .not('status', 'in', '("cancelled", "archived", "completed")');
            if (ordersError) throw ordersError;
            setOrders(ordersData || []);

            // 3. (Optional) Fetch Participants if needed, for now mock
            setParticipants([]);
        } catch (error) {
            console.error("Error fetching table data from Supabase:", error);
        }
    };

    useEffect(() => {
        if (!establishmentId) {
            fetchTableData();
            return;
        }

        console.log("Setting up Realtime subscription for establishment:", establishmentId);
        fetchTableData();

        // Single channel for all changes to maintain sync
        const channel = supabase.channel(`establishment_sync_${establishmentId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'restaurant_tables',
                filter: `establishment_id=eq.${establishmentId}`
            }, (payload) => {
                console.log("Table update received:", payload);
                fetchTableData();
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `establishment_id=eq.${establishmentId}`
            }, (payload) => {
                console.log("Order update received:", payload);
                fetchTableData();
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'order_items'
            }, () => fetchTableData()) // Items don't have establishment_id directly usually, so we trigger refresh
            .subscribe((status) => {
                console.log("Realtime subscription status:", status);
                if (status === 'SUBSCRIBED') {
                    console.log("Successfully connected to realtime updates!");
                }
            });

        return () => {
            console.log("Cleaning up Realtime subscription");
            supabase.removeChannel(channel);
        };
    }, [establishmentId]);

    const saveLayout = async () => {
        try {
            const tablesToSave = tables.map(t => ({
                id: t.id,
                establishment_id: establishmentId,
                shape: t.shape,
                top_pos: t.top,
                left_pos: t.left,
                width: t.w,
                height: t.h,
                seats: t.seats,
                status: t.status,
                last_activity_at: t.last_activity_at,
                is_label: t.is_label,
                label_name: t.label_name,
                occupants: t.occupants
            }));

            const { error } = await supabase.from('restaurant_tables').upsert(tablesToSave);
            if (error) throw error;

            setIsEditing(false);
            toast.success("Layout do salão salvo com sucesso!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar layout");
        }
    };

    const cancelEdit = () => {
        fetchTableData();
        setIsEditing(false);
        toast.info("Edição cancelada.");
    };

    // ----- Drag Logic -----
    const handleMouseDown = (e: React.MouseEvent, table: TableData) => {
        if (!isEditing) {
            setSelectedTable(table.id);
            setActiveTab('info'); // Reset tab on open
            return;
        }

        e.preventDefault();
        setDraggingId(table.id);
        // Drag logic simplified for percentage based positions
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!draggingId || !isEditing || !mapRef.current) return;

        const mapRect = mapRef.current.getBoundingClientRect();
        const x = (e.clientX - mapRect.left) / scale;
        const y = (e.clientY - mapRect.top) / scale;
        const boundX = Math.max(0, Math.min(x, mapRect.width / scale));
        const boundY = Math.max(0, Math.min(y, mapRect.height / scale));
        const leftPercent = (boundX / (mapRect.width / scale)) * 100;
        const topPercent = (boundY / (mapRect.height / scale)) * 100;

        setTables(prev => prev.map(t => {
            if (t.id === draggingId) {
                return {
                    ...t,
                    left: `${leftPercent.toFixed(1)}%`,
                    top: `${topPercent.toFixed(1)}%`
                };
            }
            return t;
        }));
    };

    const handleMouseUp = () => {
        setDraggingId(null);
    };

    // ----- Tools -----
    const addTable = (shape: 'square' | 'round') => {
        const id = `M${tables.filter(t => !t.is_label).length + 1}`;
        const newTable: TableData = {
            id,
            shape,
            top: '40%',
            left: '40%',
            w: shape === 'round' ? '90px' : '60px',
            h: shape === 'round' ? '90px' : '60px',
            seats: 4,
            status: 'free',
            last_activity_at: null,
            is_label: false
        };
        setTables([...tables, newTable]);
    };

    const addLabel = () => {
        const labelId = `LABEL_${Date.now()}`;
        const newLabel: TableData = {
            id: labelId,
            shape: 'text',
            top: '45%',
            left: '45%',
            w: '150px',
            h: '40px',
            seats: 0,
            status: 'free',
            last_activity_at: null,
            is_label: true,
            label_name: 'Nova Área'
        };
        setTables([...tables, newLabel]);
    };

    const removeTable = async (id: string) => {
        try {
            const { error } = await supabase.from('restaurant_tables').delete().eq('id', id);
            if (error) throw error;
            setTables(tables.filter(t => t.id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    const addDivider = (orientation: 'h' | 'v') => {
        const id = `DIV_${Date.now()}`;
        const newDivider: TableData = {
            id,
            shape: orientation === 'h' ? 'divider_h' : 'divider_v',
            top: '40%',
            left: '40%',
            w: orientation === 'h' ? '200px' : '4px',
            h: orientation === 'h' ? '4px' : '200px',
            seats: 0,
            status: 'free',
            last_activity_at: null,
            is_label: true,
            label_name: ''
        };
        setTables([...tables, newDivider]);
    };

    const updateTableId = (oldId: string, newId: string) => {
        if (tables.some(t => t.id === newId && t.id !== oldId)) {
            toast.error("Já existe uma mesa com este ID!");
            return;
        }
        setTables(tables.map(t => t.id === oldId ? { ...t, id: newId } : t));
        setEditingTableId(null);
    };

    // ----- Helper for display -----
    const getTableMetrics = (tableId: string) => {
        const table = tables.find(t => t.id === tableId);
        if (!table || table.status === 'free') return null;

        const tableOrders = orders.filter(o => o.table_id === tableId && o.status !== 'cancelled' && o.status !== 'archived');

        // Base time: when they sat down (last_activity_at is updated when occupying)
        const satDownAt = table.last_activity_at ? new Date(table.last_activity_at).getTime() : currentTime;
        const durationMs = Math.max(0, currentTime - satDownAt);
        const occupiedMins = Math.floor(durationMs / 60000);

        // Inactivity time: since last order OR since they sat down if no orders
        const lastOrderAt = tableOrders.length > 0
            ? Math.max(...tableOrders.map(o => new Date(o.created_at).getTime()))
            : satDownAt;

        const inactiveMins = Math.floor(Math.max(0, currentTime - lastOrderAt) / 60000);

        return {
            occupiedSince: satDownAt,
            lastOrderAt,
            occupiedMins,
            inactiveMins,
            hasAlert: inactiveMins > 15,
            orderCount: tableOrders.length
        };
    };

    const getTableStatus = (tableId: string) => {
        const table = tables.find(t => t.id === tableId);
        if (!table || table.status === 'free') return 'free';

        const metrics = getTableMetrics(tableId);

        // Timeout logic: 40 minutes without any order
        if (metrics && metrics.orderCount === 0 && metrics.inactiveMins >= 40) {
            return 'timeout';
        }

        if (table.status === 'occupied') {
            if (metrics && metrics.orderCount > 0) {
                if (metrics.inactiveMins > 20) return 'eating';
                return 'ordered';
            }
            return 'occupied';
        }

        return table.status;
    };

    const releaseTable = async (tableId: string) => {
        if (!confirm(`Deseja realmente liberar a Mesa ${tableId}? Isso limpará o status de ocupação.`)) return;

        try {
            const { error } = await supabase
                .from('restaurant_tables')
                .update({
                    status: 'free',
                    last_activity_at: null,
                    occupants: []
                })
                .eq('id', tableId);

            if (error) throw error;

            toast.success(`Mesa ${tableId} liberada com sucesso!`);
            setSelectedTable(null);
            fetchTableData();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao liberar mesa");
        }
    };

    const getTableTotal = () => {
        const tableOrders = orders.filter(o => o.table_id === selectedTable && o.status !== 'archived');
        return tableOrders.reduce((acc, curr) => {
            if (curr.total_amount !== undefined && curr.total_amount !== null) {
                return acc + Number(curr.total_amount);
            }
            // Fallback: sum items
            const itemsTotal = (curr.order_items || []).reduce((sum: number, item: any) =>
                sum + (Number(item.price) * item.quantity), 0);
            return acc + itemsTotal;
        }, 0);
    };

    const getTableParticipants = () => {
        if (!selectedTable) return [];
        const table = tables.find(t => t.id === selectedTable);
        return table?.occupants || [];
    };

    const getServiceType = (tableId: string) => {
        // This is now "General" or "Mixed"
        const order = orders.find(o => o.table_id === tableId);
        return order?.type || 'rodizio';
    };

    const downloadQR = (tableId: string) => {
        if (!qrRef.current) return;
        const svg = qrRef.current.querySelector('svg');
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = 1024;
            canvas.height = 1024;
            if (ctx) {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 64, 64, 896, 896);
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 48px Inter, system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`MESA ${tableId}`, canvas.width / 2, canvas.height - 40);
                const pngFile = canvas.toDataURL('image/png');
                const downloadLink = document.createElement('a');
                downloadLink.download = `QR_Mesa_${tableId}.png`;
                downloadLink.href = pngFile;
                downloadLink.click();
                toast.success('QR Code baixado!');
            }
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    // Enhanced logic to include Order Metadata (Author, Timestamp, Status)
    const getLastOrders = (tableId: string) => {
        const tableOrders = orders.filter(o => o.table_id === tableId && o.status !== 'archived');
        const allItems: any[] = [];

        tableOrders.forEach((order: any) => {
            if (order.order_items) {
                const itemsWithMeta = order.order_items.map((oi: any) => ({
                    name: oi.menu_items?.name,
                    quantity: oi.quantity,
                    price: Number(oi.price),
                    isRodizio: oi.menu_items?.is_rodizio,
                    _orderAuthor: 'Cliente', // Could be joined if we had users
                    _orderTimestamp: new Date(order.created_at).getTime(),
                    _orderCompletedAt: order.completed_at ? new Date(order.completed_at).getTime() : undefined,
                    _orderStatus: order.status,
                    _isRecent: (Date.now() - new Date(order.created_at).getTime()) < 1000 * 60 * 10
                }));
                allItems.push(...itemsWithMeta);
            }
        });
        return allItems.reverse();
    };

    // Helper to format "X min" (Production Time or Running Time)
    const getProductionTime = (item: any) => {
        const start = item._orderTimestamp;
        const end = (item._orderStatus === 'completed' && item._orderCompletedAt)
            ? item._orderCompletedAt
            : currentTime; // Use the state-synced currentTime

        const diffSeconds = Math.floor((end - start) / 1000);
        const diffMins = Math.floor(diffSeconds / 60);

        if (diffMins < 1) return 'Agora';
        return `${diffMins} min`;
    };

    const formatDuration = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            seconds.toString().padStart(2, '0')
        ].join(':');
    };

    return (
        <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-500" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <Armchair className="w-8 h-8 text-primary" strokeWidth={2.5} />
                        Mapa do Salão
                    </h2>
                    <p className="text-muted-foreground mt-1 text-lg">Gerencie mesas e ocupação em tempo real.</p>
                </div>

                <div className="flex items-center gap-3">
                    {!isEditing ? (
                        <>
                            <div className="flex items-center gap-1 bg-card border border-border/60 rounded-xl p-1.5 shadow-sm">
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={() => setScale(Math.max(0.5, scale - 0.1))}>
                                    <ZoomOut className="h-4 w-4" />
                                </Button>
                                <span className="text-sm font-mono w-10 text-center font-medium opacity-70">{Math.round(scale * 100)}%</span>
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={() => setScale(Math.min(2, scale + 0.1))}>
                                    <ZoomIn className="h-4 w-4" />
                                </Button>
                            </div>
                            <Button
                                onClick={() => setIsEditing(true)}
                                className="gap-2 px-5 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
                            >
                                <Edit className="w-4 h-4" /> Editar Planta
                            </Button>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 bg-card p-1.5 rounded-xl border border-border/60 shadow-lg animate-in slide-in-from-right-4">
                            <Button size="sm" variant="ghost" onClick={() => addTable('square')} className="gap-2">
                                <Plus className="w-4 h-4" /> Quadrada
                            </Button>
                            <Button size="sm" variant="ghost" onClick={addLabel} className="gap-2">
                                <Plus className="w-4 h-4" /> Texto/Área
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => addDivider('v')} className="gap-2">
                                <GripHorizontal className="w-4 h-4 rotate-90" /> Divisor V
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => addDivider('h')} className="gap-2">
                                <GripHorizontal className="w-4 h-4" /> Divisor H
                            </Button>
                            <div className="w-px h-6 bg-border mx-1" />
                            <Button size="sm" variant="ghost" onClick={cancelEdit} className="text-muted-foreground hover:text-destructive gap-2">
                                <RotateCcw className="w-4 h-4" />
                            </Button>
                            <Button size="sm" onClick={saveLayout} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-md hover:shadow-lg">
                                <Save className="w-4 h-4" /> Salvar
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {isEditing && (
                <div className="bg-amber-50/50 border border-amber-200/60 text-amber-800 px-6 py-3 rounded-2xl text-sm flex items-center gap-3 shadow-sm backdrop-blur-sm">
                    <div className="p-1.5 bg-amber-100 rounded-lg">
                        <Move className="w-4 h-4" />
                    </div>
                    Editor Ativo: Arraste as mesas para posicionar. Clique duas vezes no ID para renomear.
                </div>
            )}

            <div
                ref={mapRef}
                className="flex-1 bg-card rounded-3xl border border-border/60 relative overflow-hidden shadow-xl shadow-black/5"
            >
                {/* Scrollable / Zoomable Container Area */}
                <div
                    className="absolute inset-0 origin-top-left transition-transform duration-200 ease-out"
                    style={{ transform: `scale(${scale})`, width: `${100 / scale}%`, height: `${100 / scale}%` }}
                >
                    {/* Grid Background for Floor Plan */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                        style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                    {/* Tables & Labels */}
                    {tables.map(table => {
                        const metrics = getTableMetrics(table.id);
                        const isOccupied = table.status !== 'free';

                        if (table.is_label) {
                            const isDivider = table.shape === 'divider_v' || table.shape === 'divider_h';
                            return (
                                <div
                                    key={table.id}
                                    onMouseDown={(e) => handleMouseDown(e, table)}
                                    onDoubleClick={() => isEditing && setEditingTableId(table)}
                                    className={`absolute flex items-center justify-center transition-all duration-300
                                        ${isEditing ? 'cursor-move ring-1 ring-black/10 hover:ring-2 hover:ring-primary/40 z-40' : 'pointer-events-none'}
                                        ${isDivider ? 'bg-foreground/10' : 'bg-white/50 px-4 py-2 rounded-lg'}`}
                                    style={{
                                        top: table.top,
                                        left: table.left,
                                        width: table.w,
                                        height: table.h,
                                        zIndex: draggingId === table.id ? 50 : 5
                                    }}
                                >
                                    {!isDivider && (
                                        <span className="text-xl font-black uppercase tracking-[0.2em] text-foreground/40 whitespace-nowrap">
                                            {table.label_name || 'Área'}
                                        </span>
                                    )}
                                    {isEditing && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeTable(table.id); }}
                                            className="absolute -top-2 -right-2 bg-zinc-900 text-white rounded-full p-1 border border-zinc-700 hover:bg-red-600 transition-all shadow-md"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <div
                                key={table.id}
                                onMouseDown={(e) => handleMouseDown(e, table)}
                                onClick={() => !isEditing && setSelectedTable(table.id)}
                                onDoubleClick={() => isEditing && setEditingTableId(table)}
                                className={`absolute flex flex-col items-center justify-center transition-all duration-300
                                    ${isEditing ? 'cursor-move hover:ring-2 hover:ring-black/20 hover:scale-105 z-40' : 'cursor-pointer hover:scale-105 hover:bg-black/5'}
                                    ${isOccupied
                                        ? getTableStatus(table.id) === 'ordered'
                                            ? 'bg-orange-500/10 border-2 border-orange-500/80 shadow-[0_0_15px_rgba(249,115,22,0.15)]'
                                            : getTableStatus(table.id) === 'eating'
                                                ? 'bg-blue-500/10 border-2 border-blue-500/80 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                                                : 'bg-red-500/10 border-2 border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                                        : 'bg-emerald-500/5 border-2 border-emerald-600/80 shadow-sm'}
                                    ${table.shape === 'round' ? 'rounded-full' : 'rounded-[2px]'}
                                    ${metrics?.hasAlert ? 'ring-4 ring-red-500/30 animate-pulse' : ''}
                                `}
                                style={{
                                    top: table.top,
                                    left: table.left,
                                    width: table.w,
                                    height: table.h,
                                    zIndex: draggingId === table.id ? 50 : 10
                                }}
                            >
                                <span className={`
                                    font-mono text-xs font-bold select-none pointer-events-none tracking-widest
                                    ${isOccupied
                                        ? getTableStatus(table.id) === 'ordered' ? 'text-orange-700'
                                            : getTableStatus(table.id) === 'eating' ? 'text-blue-700'
                                                : 'text-red-700'
                                        : 'text-emerald-700'}
                                `}>
                                    {table.id}
                                </span>

                                {isOccupied && metrics && (
                                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                        <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm ${metrics.hasAlert ? 'bg-red-600 text-white animate-bounce' : 'bg-white text-muted-foreground border border-border'}`}>
                                            <Clock className="w-2.5 h-2.5" />
                                            {formatDuration(Math.max(0, currentTime - (metrics.occupiedSince || currentTime)))}
                                        </div>
                                    </div>
                                )}

                                {isEditing && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeTable(table.id); }}
                                        className="absolute -top-3 -right-3 bg-zinc-900 text-white rounded-full p-1 border border-zinc-700 hover:bg-red-600 transition-all shadow-md"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Premium Table Details Modal */}
            <Dialog open={!!selectedTable} onOpenChange={() => setSelectedTable(null)}>
                <DialogContent className="max-w-3xl bg-white/70 backdrop-blur-2xl border border-white/40 shadow-2xl p-0 gap-0 overflow-hidden rounded-[2rem]">

                    {/* Header Section */}
                    <div className="glass-morphism border-b border-border/20 p-6 sm:p-8 flex items-center justify-between relative overflow-hidden">
                        {/* Status Badge */}
                        <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-3xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-sm z-20
                                ${getTableStatus(selectedTable || '') === 'ordered' ? 'bg-orange-500 text-white' :
                                getTableStatus(selectedTable || '') === 'eating' ? 'bg-blue-500 text-white' :
                                    getTableStatus(selectedTable || '') === 'occupied' ? 'bg-red-500 text-white' :
                                        getTableStatus(selectedTable || '') === 'waiting_payment' ? 'bg-amber-500 text-white' :
                                            getTableStatus(selectedTable || '') === 'timeout' ? 'bg-purple-600 text-white animate-pulse' :
                                                'bg-emerald-500 text-white'}`}>
                            {getTableStatus(selectedTable || '') === 'ordered' ? 'Pedido Feito' :
                                getTableStatus(selectedTable || '') === 'eating' ? 'Comendo' :
                                    getTableStatus(selectedTable || '') === 'occupied' ? 'Ocupada' :
                                        getTableStatus(selectedTable || '') === 'waiting_payment' ? 'Pagamento' :
                                            getTableStatus(selectedTable || '') === 'timeout' ? 'Inativa (40m+)' :
                                                'Livre'}
                        </div>

                        <div className="flex items-center gap-6 z-10">
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg border-2
                                ${getTableStatus(selectedTable || '') === 'occupied' ? 'bg-red-50 border-red-100 text-red-500' :
                                    getTableStatus(selectedTable || '') === 'waiting_payment' ? 'bg-orange-50 border-orange-100 text-orange-500' :
                                        getTableStatus(selectedTable || '') === 'timeout' ? 'bg-purple-50 border-purple-100 text-purple-600' :
                                            'bg-emerald-50 border-emerald-100 text-emerald-500'}`}>
                                <Armchair className="w-10 h-10" />
                            </div>
                            <div>
                                <DialogTitle className="text-3xl font-bold mb-1">Mesa {selectedTable}</DialogTitle>
                                <DialogDescription className="text-sm flex flex-col gap-1">
                                    {['occupied', 'ordered', 'eating', 'timeout', 'waiting_payment'].includes(getTableStatus(selectedTable || '')) ? (
                                        <>
                                            <div className="flex items-center gap-2 text-red-600 font-bold uppercase tracking-wider text-[10px]">
                                                <UtensilsCrossed className="w-3 h-3" />
                                                <span>Em atendimento: {formatDuration(currentTime - (getTableMetrics(selectedTable || '')?.occupiedSince || currentTime))}</span>
                                            </div>
                                            {getTableMetrics(selectedTable || '')?.hasAlert && (
                                                <div className="flex items-center gap-2 text-amber-600 font-bold uppercase tracking-wider text-[10px] animate-pulse">
                                                    <Clock className="w-3 h-3" />
                                                    <span>Inativa há: {formatDuration(currentTime - (getTableMetrics(selectedTable || '')?.lastOrderAt || currentTime))}</span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-emerald-600 font-bold uppercase tracking-wider text-[10px]">Disponível para clientes</span>
                                    )}
                                </DialogDescription>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 z-10 px-6 sm:px-8">
                            {getTableStatus(selectedTable || '') !== 'free' && (
                                <Button
                                    variant="outline"
                                    className="rounded-xl h-12 gap-2 border-red-200 text-red-600 hover:bg-red-50 transition-all shadow-sm"
                                    onClick={() => releaseTable(selectedTable!)}
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span>Liberar Mesa</span>
                                </Button>
                            )}
                        </div>
                    </div>

                    {getTableStatus(selectedTable || '') === 'occupied' ? (
                        <div className="flex flex-col h-[500px]">
                            {/* Tabs Navigation */}
                            <div className="flex items-center border-b border-border/40 px-8">
                                <button
                                    onClick={() => setActiveTab('info')}
                                    className={`px-6 py-4 text-sm font-bold tracking-wide uppercase border-b-2 transition-colors flex items-center gap-2
                                        ${activeTab === 'info'
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                                >
                                    <Users className="w-4 h-4" /> Ocupantes & Status
                                </button>
                                <button
                                    onClick={() => setActiveTab('orders')}
                                    className={`px-6 py-4 text-sm font-bold tracking-wide uppercase border-b-2 transition-colors flex items-center gap-2
                                        ${activeTab === 'orders'
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                                >
                                    <Clock className="w-4 h-4" /> Pedidos
                                </button>
                            </div>

                            <div className="flex-1 overflow-hidden bg-card relative">
                                {activeTab === 'info' && (
                                    <div className="p-8 h-full flex flex-col gap-6 overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        {/* Occupants List */}
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Integrantes da Mesa</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {getTableParticipants().length > 0 ? getTableParticipants().map((p, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/50">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-background">
                                                                {p.name.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <span className="font-semibold text-sm">{p.name}</span>
                                                        </div>
                                                        {p.type === 'rodizio' ? (
                                                            <div className="px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-[10px] font-extrabold uppercase tracking-wide border border-orange-100 flex items-center gap-1.5 shadow-sm">
                                                                <UtensilsCrossed className="w-3 h-3" /> Rodízio
                                                            </div>
                                                        ) : p.type === 'alacarte' ? (
                                                            <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-extrabold uppercase tracking-wide border border-blue-100 flex items-center gap-1.5 shadow-sm">
                                                                <Receipt className="w-3 h-3" /> À La Carte
                                                            </div>
                                                        ) : (
                                                            <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-extrabold uppercase tracking-wide border border-emerald-100 flex items-center gap-1.5 shadow-sm">
                                                                <User className="w-3 h-3" /> Na Mesa
                                                            </div>
                                                        )}
                                                    </div>
                                                )) : (
                                                    <p className="text-muted-foreground italic text-sm p-4">Nenhum ocupante registrado</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex-1"></div>

                                        {/* Total Summary Card */}
                                        <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm text-muted-foreground font-medium">Subtotal</span>
                                                <span className="text-sm font-mono text-muted-foreground">R$ {getTableTotal().toFixed(2)}</span>
                                            </div>
                                            <div className="w-full h-px bg-primary/10 my-3"></div>
                                            <div className="flex justify-between items-end">
                                                <span className="text-lg font-bold text-foreground">Total da Conta</span>
                                                <span className="text-4xl font-extrabold text-primary tracking-tighter">
                                                    R$ {getTableTotal().toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'orders' && (
                                    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                            {getLastOrders(selectedTable || '').length > 0 ? (
                                                <div className="space-y-3">
                                                    {getLastOrders(selectedTable || '').map((item: any, idx) => (
                                                        <div key={idx} className="group flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/40 hover:border-primary/20 hover:shadow-md transition-all duration-200 relative overflow-hidden">
                                                            {/* Quantity Badge */}
                                                            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center font-bold text-foreground shadow-inner z-10 shrink-0">
                                                                {item.quantity}x
                                                            </div>

                                                            <div className="flex-1 z-10 min-w-0">
                                                                <div className="flex justify-between items-start">
                                                                    <h5 className="font-bold text-foreground group-hover:text-primary transition-colors truncate">{item.name}</h5>

                                                                    {/* Price OR Timer */}
                                                                    {item.isRodizio ? (
                                                                        <span className={`flex items-center gap-1.5 font-bold text-xs px-2 py-1 rounded-lg border
                                                                            ${(item._orderStatus === 'completed')
                                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' // Done
                                                                                : 'bg-orange-50 text-orange-600 border-orange-100' // Running
                                                                            }`}>
                                                                            <Clock className="w-3 h-3" />
                                                                            {getProductionTime(item)}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="font-mono text-sm font-medium text-muted-foreground">
                                                                            R$ {(item.price * item.quantity).toFixed(2)}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-3 mt-1.5">
                                                                    {/* Type Badge */}
                                                                    {item.isRodizio ? (
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500 flex items-center gap-1 shrink-0">
                                                                            <UtensilsCrossed className="w-3 h-3" /> Rodízio
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1 shrink-0">
                                                                            <Receipt className="w-3 h-3" /> À La Carte
                                                                        </span>
                                                                    )}

                                                                    {/* Author Metadata */}
                                                                    <div className="h-3 w-px bg-border"></div>
                                                                    <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                                                        <User className="w-3 h-3" />
                                                                        {item._orderAuthor}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50 space-y-4">
                                                    <Receipt className="w-12 h-12" />
                                                    <p>Nenhum pedido realizado ainda.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-10 flex flex-col items-center justify-center space-y-8 bg-card animate-in fade-in duration-500">
                            <div className="text-center space-y-2 mb-4">
                                <h3 className="text-2xl font-extrabold text-foreground tracking-tight">QR Code da Mesa</h3>
                                <p className="text-muted-foreground font-medium">Escanear para abrir o cardápio</p>
                            </div>

                            {/* QR Code Container */}
                            <div
                                ref={qrRef}
                                className="bg-white p-6 rounded-[2.5rem] shadow-xl ring-8 ring-emerald-500/10 border border-emerald-500/20"
                            >
                                <QRCodeSVG
                                    value={`${window.location.origin}/${slug}?table=${selectedTable}`}
                                    size={220}
                                    level="H"
                                    includeMargin={false}
                                />
                            </div>

                            <div className="text-center">
                                <span className="text-4xl font-black text-emerald-600 tracking-tighter">
                                    Mesa {selectedTable}
                                </span>
                            </div>

                            <div className="flex gap-4 w-full max-w-sm">
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-2xl h-14 font-bold gap-3 border-border/60 hover:bg-secondary/50"
                                    onClick={() => window.print()}
                                >
                                    <Printer className="w-5 h-5" /> Imprimir
                                </Button>
                                <Button
                                    className="flex-1 rounded-2xl h-14 font-bold gap-3 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
                                    onClick={() => downloadQR(selectedTable || '')}
                                >
                                    <Download className="w-5 h-5" /> Baixar PNG
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Table ID OR Label Name Modal */}
            <Dialog open={!!editingTableId} onOpenChange={() => setEditingTableId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingTableId?.is_label ? 'Editar Texto' : 'Editar Mesa'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{editingTableId?.is_label ? 'Texto da Área' : 'Identificação da Mesa'}</Label>
                            <Input
                                defaultValue={editingTableId?.is_label ? editingTableId?.label_name : editingTableId?.id}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const val = e.currentTarget.value;
                                        if (editingTableId?.is_label) {
                                            setTables(tables.map(t => t.id === editingTableId.id ? { ...t, label_name: val } : t));
                                            setEditingTableId(null);
                                        } else {
                                            updateTableId(editingTableId!.id, val);
                                        }
                                    }
                                }}
                                id="table-id-input"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingTableId(null)}>Cancelar</Button>
                        <Button onClick={() => {
                            const val = (document.getElementById('table-id-input') as HTMLInputElement).value;
                            if (editingTableId?.is_label) {
                                setTables(tables.map(t => t.id === editingTableId.id ? { ...t, label_name: val } : t));
                                setEditingTableId(null);
                            } else {
                                updateTableId(editingTableId!.id, val);
                            }
                        }}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Table QR Modal Removed - Embedded above */}

            {/* Bottom Summary Bar */}
            {!isEditing && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-8 duration-700">
                    <div className="bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-full px-8 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-10">
                        <div className="flex items-center gap-3 border-r border-white/10 pr-10">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                <Armchair className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Livres</span>
                                <span className="text-xl font-black text-white leading-none tracking-tighter">
                                    {tables.filter(t => !t.is_label && t.status === 'free').length}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 border-r border-white/10 pr-10">
                            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                                <Users className="w-5 h-5 text-red-500" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Em Atendimento</span>
                                <span className="text-xl font-black text-white leading-none tracking-tighter">
                                    {tables.filter(t => !t.is_label && t.status !== 'free').length}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                                <UtensilsCrossed className="w-5 h-5 text-orange-500" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Pedidos Ativos</span>
                                <span className="text-xl font-black text-white leading-none tracking-tighter">
                                    {orders.length}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
