import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface MenuItem {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  isRodizio: boolean;
  image: string;
  category: string;
  subcategory?: string;
  allergens?: string[];
  tags?: string[];
  station?: 'sushi' | 'kitchen' | 'bar';
}

export interface OrderItem extends MenuItem {
  quantity: number;
  addedBy: string; // Client identifier
  status: 'pending' | 'sent' | 'preparing' | 'ready' | 'completed' | 'paid';
  observation?: string;
}

export interface TableSession {
  tableId: string;
  tableName: string;
  clients: number;
  turnStartTime: Date;
  roundLimit: number;
  currentRoundItems: number;
  roundNumber: number;
}

interface OrderContextType {
  session: TableSession | null;
  setSession: (session: TableSession) => void;
  cart: OrderItem[];
  addToCart: (item: MenuItem, clientId: string, isAlacarte?: boolean, observation?: string) => void;
  removeFromCart: (itemId: string, clientId: string) => void;
  updateQuantity: (itemId: string, clientId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  roundItemsCount: number;
  isRoundLimitReached: boolean;
  currentClientId: string;
  setCurrentClientId: (id: string) => void;
  favorites: MenuItem[];
  addToFavorites: (item: MenuItem) => void;
  removeFromFavorites: (itemId: string) => void;
  sentOrders: OrderItem[];
  sendOrder: () => void;
  recentOrders: MenuItem[];
  clearRecentOrders: () => void;
  addDirectlyToSentOrders: (items: OrderItem[]) => void;
  resetTableOrders: (tableId: string) => void;
  establishmentId: string | null;
  restaurantType: 'sushi' | 'steakhouse' | 'general';
  settings: any | null;
  clearTableSession: () => void;
  callService: (type: 'waiter' | 'machine') => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

const defaultFavorites: MenuItem[] = [
  {
    id: 'fav1',
    code: '005',
    name: 'Tacos Salmon',
    description: 'Delicioso taco com salmão fresco',
    price: 0,
    isRodizio: true,
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=300&h=200&fit=crop',
    category: 'Sashimi',
  }
];

export function OrderProvider({ children }: { children: ReactNode }) {
  const [establishmentId, setEstablishmentId] = useState<string | null>(null);
  const [restaurantType, setRestaurantType] = useState<'sushi' | 'steakhouse' | 'general'>('sushi');
  const [settings, setSettings] = useState<any | null>(null);
  const [session, setSession] = useState<TableSession | null>(null);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [sentOrders, setSentOrders] = useState<OrderItem[]>([]);
  const [currentClientId, setCurrentClientId] = useState<string>(() =>
    localStorage.getItem('ez_menu_client_name') || 'client-1'
  );
  const [favorites, setFavorites] = useState<MenuItem[]>(defaultFavorites);
  const [recentOrders, setRecentOrders] = useState<MenuItem[]>([]);

  // 1. Detect Establishment from Slug
  useEffect(() => {
    const loadEstablishment = async () => {
      const parts = window.location.pathname.split('/');
      const slug = parts[1];
      if (!slug || slug === 'admin' || slug === 'superadmin') return;

      const { data: establishment } = await supabase
        .from('establishments')
        .select('*')
        .eq('slug', slug)
        .single();

      if (establishment) {
        setEstablishmentId(establishment.id);
        setRestaurantType(establishment.restaurant_type || 'sushi');
        setSettings(establishment);
        localStorage.setItem('ez_menu_establishment_id', establishment.id);

        // 2. Initialize Session if table param exists
        const params = new URLSearchParams(window.location.search);
        const tableId = params.get('mesa') || params.get('table') || localStorage.getItem('ez_menu_table_name');
        if (tableId) {
          setSession({
            tableId: tableId,
            tableName: tableId,
            clients: 1,
            turnStartTime: new Date(),
            roundLimit: 10,
            currentRoundItems: 0,
            roundNumber: 1
          });
        }
      }
    };
    loadEstablishment();
  }, []);

  const roundLimit = session?.roundLimit || 10;
  const roundItemsCount = cart.reduce((sum, item) =>
    item.isRodizio && item.category !== 'system' ? sum + item.quantity : sum, 0
  );
  const isRoundLimitReached = roundItemsCount >= roundLimit;

  const totalItems = cart.reduce((sum, item) =>
    item.category !== 'system' ? sum + item.quantity : sum, 0
  );

  const totalPrice = cart.reduce((sum, item) =>
    sum + (item.price * item.quantity), 0
  );

  const addToCart = useCallback((item: MenuItem, clientId: string, isAlacarte?: boolean, observation?: string) => {
    const effectiveId = isAlacarte ? `${item.id}-alacarte` : item.id;
    const effectiveIsRodizio = isAlacarte ? false : item.isRodizio;

    if (effectiveIsRodizio && isRoundLimitReached) return;

    setCart(prev => {
      const existingIndex = prev.findIndex(
        i => i.id === effectiveId && i.addedBy === clientId && i.observation === observation
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], quantity: updated[existingIndex].quantity + 1 };
        return updated;
      }

      return [...prev, {
        ...item,
        id: effectiveId,
        isRodizio: effectiveIsRodizio,
        quantity: 1,
        addedBy: clientId,
        status: 'pending',
        observation: observation || undefined
      }];
    });
  }, [isRoundLimitReached]);

  const removeFromCart = useCallback((itemId: string, clientId: string) => {
    setCart(prev => prev.filter(item => !(item.id === itemId && item.addedBy === clientId)));
  }, []);

  const updateQuantity = useCallback((itemId: string, clientId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId, clientId);
      return;
    }
    setCart(prev => prev.map(item =>
      item.id === itemId && item.addedBy === clientId ? { ...item, quantity } : item
    ));
  }, [removeFromCart]);

  const clearCart = useCallback(() => setCart([]), []);

  const fetchSentOrders = useCallback(async () => {
    if (!establishmentId) return;
    try {
      const currentTableId = session?.tableName || localStorage.getItem('ez_menu_table_name');
      if (!currentTableId) return;

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          order_items (
            id,
            menu_items (
              id,
              code,
              name,
              description,
              image_url,
              station,
              is_rodizio
            ),
            quantity,
            status,
            observation,
            price
          )
        `)
        .eq('table_id', currentTableId)
        .eq('establishment_id', establishmentId)
        .neq('status', 'cancelled');

      if (ordersError) throw ordersError;

      const flattenedItems: OrderItem[] = [];
      ordersData?.forEach((order: any) => {
        order.order_items?.forEach((item: any) => {
          const menuItem = item.menu_items;
          let finalStatus: OrderItem['status'] = item.status;
          if (order.status === 'completed') finalStatus = 'completed';
          else if (order.status === 'paid') finalStatus = 'paid';
          else if (item.status === 'ready') finalStatus = 'completed';

          flattenedItems.push({
            id: menuItem.id,
            code: menuItem.code,
            name: menuItem.name,
            description: menuItem.description || '',
            price: Number(item.price),
            isRodizio: menuItem.is_rodizio,
            image: menuItem.image_url || '',
            category: '',
            station: menuItem.station,
            quantity: item.quantity,
            addedBy: 'server',
            status: finalStatus,
            observation: item.observation || undefined
          });
        });
      });

      setSentOrders(flattenedItems);
    } catch (e) {
      console.error("Error fetching sent orders", e);
    }
  }, [session, establishmentId]);

  useEffect(() => {
    if (establishmentId) {
      fetchSentOrders();
      const channel = supabase.channel(`orders_${establishmentId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `establishment_id=eq.${establishmentId}` }, () => fetchSentOrders())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [fetchSentOrders, establishmentId]);

  const sendOrder = useCallback(async () => {
    if (cart.length === 0) return;

    if (!establishmentId) {
      toast.error("Erro: Estabelecimento não identificado.");
      return;
    }

    try {
      const currentTableId = session?.tableName || localStorage.getItem('ez_menu_table_name');
      const clientName = localStorage.getItem('ez_menu_client_name') || 'Cliente';

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          table_id: currentTableId,
          status: 'pending',
          customer_name: clientName,
          establishment_id: establishmentId
        })
        .select().single();

      if (orderError) throw orderError;

      const orderItemsToInsert = cart.map(item => ({
        order_id: orderData.id,
        item_id: item.id.replace('-alacarte', ''),
        quantity: item.quantity,
        status: 'sent',
        observation: item.observation,
        price: item.isRodizio ? 0 : item.price, // Rodizio food items are R$ 0
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsToInsert);
      if (itemsError) throw itemsError;

      setCart([]);
      fetchSentOrders();
      toast.success("Pedido enviado com sucesso!");
    } catch (e) {
      console.error("Failed to send order", e);
      toast.error("Erro ao enviar pedido.");
    }
  }, [cart, session, establishmentId, fetchSentOrders]);

  const addToFavorites = useCallback((item: MenuItem) => {
    setFavorites(prev => prev.find(f => f.id === item.id) ? prev : [...prev, item]);
  }, []);

  const removeFromFavorites = useCallback((itemId: string) => {
    setFavorites(prev => prev.filter(f => f.id !== itemId));
  }, []);

  const clearRecentOrders = useCallback(() => setRecentOrders([]), []);

  const clearTableSession = useCallback(() => {
    setSession(null);
    localStorage.removeItem('ez_menu_table_name');
  }, []);

  const addDirectlyToSentOrders = useCallback(async (items: OrderItem[]) => {
    if (!establishmentId) {
      toast.error("Erro: Estabelecimento não identificado.");
      return;
    }
    try {
      const currentTableId = session?.tableName || localStorage.getItem('ez_menu_table_name');
      const clientName = localStorage.getItem('ez_menu_client_name') || 'Cliente';

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          table_id: currentTableId,
          status: 'sent',
          user_name: clientName,
          establishment_id: establishmentId
        })
        .select().single();

      if (orderError) throw orderError;

      const orderItemsToInsert = items.map(item => ({
        order_id: orderData.id,
        item_id: item.id.replace('-alacarte', ''),
        quantity: item.quantity,
        status: 'sent',
        observation: item.observation,
        price: item.price,
        establishment_id: establishmentId
      }));

      await supabase.from('order_items').insert(orderItemsToInsert);
      fetchSentOrders();
    } catch (e) {
      console.error("Failed to persist system items", e);
      toast.error("Erro ao processar rodízio.");
    }
  }, [session, establishmentId, fetchSentOrders]);

  const callService = useCallback(async (type: 'waiter' | 'machine') => {
    if (!establishmentId) {
      toast.error("Erro: Estabelecimento não identificado.");
      return;
    }

    try {
      const currentTableId = localStorage.getItem('ez_menu_table_name') || 'Mesa';
      const participants = JSON.parse(localStorage.getItem('ez_menu_table_participants') || '[]');
      const myName = participants.find((p: any) => p.isMe)?.name || localStorage.getItem('ez_menu_client_name') || 'Cliente';

      const { error } = await supabase.from('service_requests').insert({
        type,
        status: 'pending',
        table_id: currentTableId,
        user_name: myName,
        establishment_id: establishmentId
      });

      if (error) throw error;

      if (type === 'machine') {
        await supabase.from('restaurant_tables')
          .update({ status: 'waiting_payment' })
          .eq('id', currentTableId)
          .eq('establishment_id', establishmentId);
      }

      toast.success(type === 'machine' ? "Maquininha solicitada!" : "Garçom chamado!");
    } catch (error) {
      console.error("Error calling service:", error);
      toast.error("Erro ao solicitar serviço.");
    }
  }, [establishmentId]);

  return (
    <OrderContext.Provider value={{
      session, setSession, cart, addToCart, removeFromCart, updateQuantity, clearCart,
      totalItems, totalPrice, roundItemsCount, isRoundLimitReached,
      currentClientId, setCurrentClientId, favorites, addToFavorites, removeFromFavorites,
      sentOrders, sendOrder, recentOrders, clearRecentOrders, addDirectlyToSentOrders,
      establishmentId,
      restaurantType,
      settings,
      clearTableSession,
      callService,
      resetTableOrders: async (tableId: string) => {
        if (!establishmentId) return;
        await supabase.from('orders').update({ status: 'completed' })
          .eq('table_id', tableId).eq('establishment_id', establishmentId).neq('status', 'completed');
        fetchSentOrders();
      }
    }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (!context) throw new Error('useOrder must be used within OrderProvider');
  return context;
}
