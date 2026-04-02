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
  station?: 'sushi' | 'kitchen' | 'bar' | 'none';
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
  addToCart: (item: MenuItem, clientId: string, isAlacarte?: boolean, observation?: string) => boolean;
  removeFromCart: (itemId: string, clientId: string) => void;
  updateQuantity: (itemId: string, clientId: string, quantity: number) => void;
  updateItemObservation: (itemId: string, clientId: string, observation: string) => void;
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
  resetTableOrders: (tableId: string) => Promise<void>;
  establishmentId: string | null;
  restaurantType: 'sushi' | 'steakhouse' | 'general';
  settings: any | null;
  clearTableSession: () => void;
  callService: (type: 'waiter' | 'machine') => Promise<void>;
  hasActiveRodizio: boolean;
  isRodizioOrdered: boolean;
  isTableOccupiedByMe: boolean;
  occupyTable: (partySize?: number) => Promise<boolean>;
  activateRodizio: (adults: number, children: number) => Promise<boolean>;
  tableStatus: 'free' | 'occupied' | 'waiting_payment' | 'loading';
  fetchSentOrders: () => Promise<void>;
  occupants: any[];
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
  const [tableStatus, setTableStatus] = useState<'free' | 'occupied' | 'waiting_payment' | 'loading'>('loading');
  const [occupants, setOccupants] = useState<any[]>([]);
  const [currentClientId, setCurrentClientId] = useState<string>(() =>
    localStorage.getItem('ez_menu_client_name') || 'client-1'
  );
  const [favorites, setFavorites] = useState<MenuItem[]>(defaultFavorites);
  const [recentOrders, setRecentOrders] = useState<MenuItem[]>([]);

  // Poll for identity changes to keep currentClientId in sync
  useEffect(() => {
    const handleStorageChange = () => {
      const name = localStorage.getItem('ez_menu_client_name') || 'client-1';
      if (name !== currentClientId) {
        console.log("Identity changed from", currentClientId, "to", name, ". Migrating cart...");
        setCurrentClientId(name);
        
        // Migrate cart items to new identity
        setCart(prev => prev.map(item => ({
          ...item,
          addedBy: name
        })));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    // Also poll because 'storage' event only fires between windows
    const interval = setInterval(handleStorageChange, 1000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [currentClientId]);

  // 1. Basic UI/State Callbacks
  const clearCart = useCallback(() => setCart([]), []);
  const clearRecentOrders = useCallback(() => setRecentOrders([]), []);

  // Recovery effect for turnStartTime
  useEffect(() => {
    const currentTableName = localStorage.getItem('ez_menu_table_name');
    if (tableStatus === 'occupied' && currentTableName) {
        const storedStart = localStorage.getItem(`ez_menu_turn_start_${currentTableName}`);
        if (storedStart && !session?.turnStartTime) {
            setSession(prev => prev ? { 
                ...prev, 
                turnStartTime: new Date(storedStart) 
            } : {
                tableId: currentTableName,
                tableName: currentTableName,
                clients: occupants.length || 1,
                turnStartTime: new Date(storedStart),
                roundLimit: 24,
                currentRoundItems: 0,
                roundNumber: 1
            });
        }
    }
  }, [tableStatus, session?.turnStartTime, occupants.length]);
  
  const fetchSentOrders = useCallback(async () => {
    if (!establishmentId) return;
    try {
      const currentTableId = session?.tableName || localStorage.getItem('ez_menu_table_name');
      if (!currentTableId) return;

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id, status,
          order_items (
            id,
            menu_items (id, code, name, description, image_url, station, is_rodizio),
            quantity, status, observation, price
          )
        `)
        .eq('table_id', currentTableId)
        .eq('establishment_id', establishmentId)
        .not('status', 'in', '(archived,cancelled)');

      if (ordersError) throw ordersError;

      const flattenedItems: OrderItem[] = [];
      ordersData?.forEach((order: any) => {
        order.order_items?.forEach((item: any) => {
          const menuItem = item.menu_items;
          let finalStatus: OrderItem['status'] = item.status;
          if (order.status === 'completed' || order.status === 'paid' || order.status === 'archived' || item.status === 'ready') finalStatus = 'completed';

          flattenedItems.push({
            id: menuItem.id,
            code: menuItem.code,
            name: menuItem.name,
            description: menuItem.description || '',
            price: Number(item.price),
            isRodizio: Number(item.price) === 0 ? menuItem.is_rodizio : false,
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

  const occupyTable = useCallback(async (partySize?: number) => {
    const tableName = session?.tableName || localStorage.getItem('ez_menu_table_name');
    if (!tableName || !establishmentId) {
      toast.error('Mesa ou estabelecimento não identificado.');
      return false;
    }

    try {
      const userEmail = localStorage.getItem('ez_menu_client_email') || '';
      const userName = localStorage.getItem('ez_menu_client_name') || 'Cliente';

      const { data: latestTable } = await supabase
        .from('restaurant_tables')
        .select('occupants, status')
        .eq('id', tableName)
        .eq('establishment_id', establishmentId)
        .single();

      const existingOccupants = latestTable?.occupants || [];
      const alreadyJoined = existingOccupants.some((occ: any) => occ.email === userEmail);

      if (alreadyJoined) {
        setTableStatus('occupied');
        setOccupants(existingOccupants);
        return true;
      }

      const newOccupant = {
        name: userName,
        email: userEmail,
        type: 'none', 
        joined_at: new Date().toISOString()
      };

      const updatedOccupants = [...existingOccupants, newOccupant];
      const { error } = await supabase
        .from('restaurant_tables')
        .update({
          status: 'occupied',
          last_activity_at: new Date().toISOString(),
          occupants: updatedOccupants
        })
        .eq('id', tableName)
        .eq('establishment_id', establishmentId);

      if (error) throw error;

      // Set turnStartTime locally and persist it
      const startTime = new Date();
      localStorage.setItem(`ez_menu_turn_start_${tableName}`, startTime.toISOString());
      localStorage.removeItem('ez_menu_last_service_call');
      
      setSession(prev => prev ? { ...prev, turnStartTime: startTime } : { 
        tableId: tableName, 
        tableName: tableName, 
        clients: updatedOccupants.length, 
        turnStartTime: startTime,
        roundLimit: 24,
        currentRoundItems: 0,
        roundNumber: 1
      });

      setTableStatus('occupied');
      setOccupants(updatedOccupants);
      return true;
    } catch (e) {
      console.error('Error occupying table:', e);
      toast.error('Erro ao ocupar mesa. Tente novamente.');
      return false;
    }
  }, [session, establishmentId]);

  // Derived indicators
  const userEmail = localStorage.getItem('ez_menu_client_email') || '';
  const userName = localStorage.getItem('ez_menu_client_name') || 'Cliente';

  const isTableOccupiedByMe = tableStatus === 'occupied' && occupants.some(o => 
    (o.email === userEmail && userEmail !== '') || 
    (o.name === userName && o.email === userEmail)
  );
  const hasActiveRodizio = cart.some(i => i.code.startsWith('SYS01') || i.code.startsWith('SYS02')) || 
                           sentOrders.some(i => i.code.startsWith('SYS01') || i.code.startsWith('SYS02'));

  const roundLimit = session?.roundLimit || 10;
  const roundItemsCount = cart.reduce((sum, item) =>
    item.isRodizio && item.category !== 'system' && !item.code.startsWith('SYS') ? sum + item.quantity : sum, 0
  );
  const isRoundLimitReached = roundItemsCount >= roundLimit;

  // Added missing constant
  const isRodizioOrdered = sentOrders.some(item =>
    item.price === 0 && item.category !== 'system' && !item.code.startsWith('SYS')
  );

  const totalItems = cart.reduce((sum, item) =>
    item.category !== 'system' && !item.code.startsWith('SYS') ? sum + item.quantity : sum, 0
  );

  const totalPrice = cart.reduce((sum, item) => {
    const price = item.isRodizio ? 0 : item.price;
    return sum + (price * item.quantity);
  }, 0);

  // 2. Ordering and Cart functions
  const activateRodizio = useCallback(async (adults: number, children: number) => {
    if (!establishmentId) return false;
    const currentTableId = session?.tableName || localStorage.getItem('ez_menu_table_name');
    if (!currentTableId) return false;

    try {
      if (!isTableOccupiedByMe) {
        const success = await occupyTable(adults + children);
        if (!success) return false;
      }

      // --- SELF-HEALING / DATA INTEGRITY STEP ---
      // Fetch the real database IDs for the system items (using startsWith pattern to be robust)
      let { data: dbItems, error: dbError } = await supabase
        .from('menu_items')
        .select('id, code, price')
        .ilike('code', 'SYS%')
        .eq('establishment_id', establishmentId);

      if (dbError) throw dbError;

      // Filter to get exactly our two system items for this establishment
      const suffix = establishmentId.slice(0, 5);
      const adultCode = `SYS01-${suffix}`;
      const childCode = `SYS02-${suffix}`;

      // If items are missing, we attempt to create them with unique names and codes
      if (!dbItems || !dbItems.find(i => i.code === adultCode) || !dbItems.find(i => i.code === childCode)) {
        console.log("System items missing or using legacy naming. Initiating self-healing with unique keys...");
        
        // 1. Find or Create unique "Sistema" Category for this establishment
        const systemCategoryName = `Sistema (${suffix})`;
        let { data: systemCat, error: catError } = await supabase
          .from('categories')
          .select('id')
          .eq('name', systemCategoryName)
          .eq('establishment_id', establishmentId)
          .maybeSingle();
        
        if (catError) throw catError;

        let systemCatId = systemCat?.id;
        if (!systemCatId) {
          const { data: newCat, error: createCatError } = await supabase
            .from('categories')
            .insert({
              name: systemCategoryName,
              icon: 'Settings',
              type: 'rodizio',
              establishment_id: establishmentId
            })
            .select('id')
            .single();
          
          if (createCatError) {
             console.error("Critical error creating system category:", createCatError);
             throw createCatError;
          }
          systemCatId = newCat.id;
        }

        // 2. Create missing items with unique codes
        const existingCodes = dbItems?.map(i => i.code) || [];
        const itemsToCreate = [];

        if (!existingCodes.includes(adultCode)) {
          itemsToCreate.push({
            code: adultCode,
            name: 'Rodízio Adulto',
            description: 'Acesso completo ao rodízio premium.',
            price: 129.99,
            category_id: systemCatId,
            image_url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=300&h=200&fit=crop',
            is_rodizio: false,
            station: 'none',
            establishment_id: establishmentId
          });
        }

        if (!existingCodes.includes(childCode)) {
          itemsToCreate.push({
            code: childCode,
            name: 'Rodízio Infantil',
            description: 'Acesso completo para crianças até 10 anos.',
            price: 69.99,
            category_id: systemCatId,
            image_url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=300&h=200&fit=crop',
            is_rodizio: false,
            station: 'none',
            establishment_id: establishmentId
          });
        }

        if (itemsToCreate.length > 0) {
          const { error: insertError } = await supabase.from('menu_items').insert(itemsToCreate);
          if (insertError) {
            console.error("Critical error creating system items:", insertError);
            throw insertError;
          }

          // Re-fetch items to get IDs
          const { data: refetchedItems, error: reError } = await supabase
            .from('menu_items')
            .select('id, code, price')
            .ilike('code', 'SYS%')
            .eq('establishment_id', establishmentId);
          
          if (reError) throw reError;
          dbItems = refetchedItems;
        }
      }

      const sys01Item = dbItems?.find(i => i.code === adultCode || i.code === 'SYS01');
      const sys02Item = dbItems?.find(i => i.code === childCode || i.code === 'SYS02');
      if (!sys01Item && adults > 0) throw new Error("SYS01 not found");
      if (!sys02Item && children > 0) throw new Error("SYS02 not found");

      const { data: activeOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          table_id: currentTableId,
          status: 'pending',
          customer_name: localStorage.getItem('ez_menu_client_name') || 'Cliente',
          establishment_id: establishmentId
        })
        .select().single();

      if (orderError) throw orderError;

      // Calculate deltas relative to what's already in sentOrders for the table
      const currentAdults = sentOrders
        .filter(o => o.code.startsWith('SYS01'))
        .reduce((sum, i) => sum + i.quantity, 0);
      const currentChildren = sentOrders
        .filter(o => o.code.startsWith('SYS02'))
        .reduce((sum, i) => sum + i.quantity, 0);

      const diffAdults = adults - currentAdults;
      const diffChildren = children - currentChildren;

      const itemsToInsert = [];
      if (diffAdults > 0 && sys01Item) {
        itemsToInsert.push({ 
          order_id: activeOrder.id, 
          item_id: sys01Item.id, 
          quantity: diffAdults, 
          status: 'completed', 
          price: sys01Item.price || 129.99 
        });
      }
      if (diffChildren > 0 && sys02Item) {
        itemsToInsert.push({ 
          order_id: activeOrder.id, 
          item_id: sys02Item.id, 
          quantity: diffChildren, 
          status: 'completed', 
          price: sys02Item.price || 69.99 
        });
      }

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      fetchSentOrders();
      toast.success("Rodízio ativado com sucesso!");
      return true;
    } catch (e) {
      console.error("Failed to activate rodizio", e);
      toast.error("Erro ao ativar rodízio.");
      return false;
    }
  }, [establishmentId, session, isTableOccupiedByMe, occupyTable, fetchSentOrders]);

  const addToCart = useCallback((item: MenuItem, clientId: string, isAlacarte?: boolean, observation?: string): boolean => {
    const effectiveId = isAlacarte ? `${item.id}-alacarte` : item.id;
    const effectiveIsRodizio = isAlacarte ? false : (item.isRodizio && hasActiveRodizio);
    if (effectiveIsRodizio && isRoundLimitReached) return false;

    const tableIdFromURL = localStorage.getItem('ez_menu_table_name');
    if (tableIdFromURL && !isTableOccupiedByMe && item.category !== 'system') {
      toast.error('Ocupe a mesa na tela inicial para fazer pedidos!');
      return false;
    }

    setCart(prev => {
      const existingIndex = prev.findIndex(i => i.id === effectiveId && i.addedBy === clientId && i.observation === observation);
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
    return true;
  }, [isRoundLimitReached, hasActiveRodizio, isTableOccupiedByMe]);

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

  const updateItemObservation = useCallback((itemId: string, clientId: string, observation: string) => {
    setCart(prev => prev.map(item =>
      item.id === itemId && item.addedBy === clientId ? { ...item, observation } : item
    ));
  }, []);

  const sendOrder = useCallback(async () => {
    if (cart.length === 0) return;
    if (!establishmentId) return;

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
        price: item.isRodizio ? 0 : item.price,
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

  const addDirectlyToSentOrders = useCallback(async (items: OrderItem[]) => {
    if (!establishmentId) return;
    try {
      const currentTableId = session?.tableName || localStorage.getItem('ez_menu_table_name');
      const clientName = localStorage.getItem('ez_menu_client_name') || 'Cliente';

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          table_id: currentTableId,
          status: 'sent',
          customer_name: clientName,
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
        price: item.isRodizio ? 0 : item.price,
        establishment_id: establishmentId
      }));

      await supabase.from('order_items').insert(orderItemsToInsert);
      fetchSentOrders();
    } catch (e) {
      console.error("Failed to persist", e);
    }
  }, [session, establishmentId, fetchSentOrders]);

  // 3. Misc Functions
  const addToFavorites = useCallback((item: MenuItem) => {
    setFavorites(prev => prev.find(f => f.id === item.id) ? prev : [...prev, item]);
  }, []);

  const removeFromFavorites = useCallback((itemId: string) => {
    setFavorites(prev => prev.filter(f => f.id !== itemId));
  }, []);

  const clearTableSession = useCallback(() => {
    localStorage.removeItem('ez_menu_table_name');
    localStorage.removeItem('ez_menu_client_email');
    localStorage.removeItem('ez_menu_client_name');
    localStorage.removeItem('ez_menu_last_service_call');
    setSession(null);
    setCart([]);
    setSentOrders([]);
  }, []);

  const callService = useCallback(async (type: 'waiter' | 'machine') => {
    if (!establishmentId) return;
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

  const resetTableOrders = async (tableId: string) => {
    if (!establishmentId) return;
    try {
      setCart([]);
      setSentOrders([]);
      setRecentOrders([]);
      const { data: activeOrders, error: fetchError } = await supabase
        .from('orders')
        .select('id')
        .eq('table_id', tableId)
        .eq('establishment_id', establishmentId)
        .not('status', 'in', '(completed,paid,archived,cancelled)');

      if (fetchError) throw fetchError;
      if (activeOrders && activeOrders.length > 0) {
        const orderIds = activeOrders.map(o => o.id);
        const { error: updateError } = await supabase
          .from('orders')
          .update({ status: 'completed' })
          .in('id', orderIds);
        if (updateError) throw updateError;
        const { error: itemsError } = await supabase
          .from('order_items')
          .update({ status: 'ready' })
          .in('order_id', orderIds);
        if (itemsError) console.error('Error updating items:', itemsError);
      }
      
      const { error: serviceError } = await supabase
        .from('service_requests')
        .update({ status: 'archived' })
        .eq('table_id', tableId)
        .eq('establishment_id', establishmentId);
      if (serviceError) console.error('Error clearing service requests:', serviceError);

      await fetchSentOrders();
    } catch (err) {
      console.error("Error in resetTableOrders:", err);
    }
  };

  // 4. Effects
  useEffect(() => {
    const handleStorageChange = () => {
      const name = localStorage.getItem('ez_menu_client_name') || 'client-1';
      if (name !== currentClientId) {
        setCurrentClientId(name);
        setCart(prev => prev.map(item => ({ ...item, addedBy: name })));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 2000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [currentClientId]);

  useEffect(() => {
    const loadEstablishment = async () => {
      const slug = window.location.pathname.split('/')[1];
      if (!slug || ['admin', 'superadmin'].includes(slug)) return;

      const { data: establishment } = await supabase.from('establishments').select('*').eq('slug', slug).single();
      if (establishment) {
        setEstablishmentId(establishment.id);
        setRestaurantType(establishment.restaurant_type || 'sushi');
        setSettings(establishment);
        localStorage.setItem('ez_menu_establishment_id', establishment.id);

        const params = new URLSearchParams(window.location.search);
        const tableId = params.get('mesa') || params.get('table') || localStorage.getItem('ez_menu_table_name');
        if (tableId) {
          const tableParam = params.get('mesa') || params.get('table');
          if (tableParam) localStorage.setItem('ez_menu_table_name', tableParam);
          setSession({ tableId, tableName: tableId, clients: 1, turnStartTime: new Date(), roundLimit: 10, currentRoundItems: 0, roundNumber: 1 });
        }
      }
    };
    loadEstablishment();
  }, [window.location.search, window.location.pathname]);

  useEffect(() => {
    const tableName = session?.tableName || localStorage.getItem('ez_menu_table_name');
    if (!tableName) {
      setTableStatus('free');
      return;
    }

    const fetchStatus = async () => {
      try {
        let query = supabase.from('restaurant_tables').select('status, occupants').eq('id', tableName);
        if (establishmentId) query = query.eq('establishment_id', establishmentId);
        const { data, error } = await query.single();
        if (error) {
            console.error("Error fetching table status from db", error);
            setTableStatus('free');
            return;
        }
        if (data) { setTableStatus(data.status); setOccupants(data.occupants || []); }
      } catch (e) {
        console.error("Error fetching table status", e);
        setTableStatus('free');
      }
    };
    fetchStatus();

    const channel = supabase.channel(`order_context_table_${tableName}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'restaurant_tables', filter: `id=eq.${tableName}` }, (payload) => {
        setTableStatus(payload.new.status);
        setOccupants(payload.new.occupants || []);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.tableName, establishmentId]);

  useEffect(() => {
    if (tableStatus === 'free') { 
      // Delay clearing to allow transitions (e.g. Digital Receipt) to finish
      const timer = setTimeout(() => {
        setCart([]); 
        setSentOrders([]); 
        localStorage.removeItem('ez_menu_last_service_call');
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [tableStatus]);

  useEffect(() => {
    if (establishmentId) {
      fetchSentOrders();
      const channel = supabase.channel(`orders_${establishmentId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `establishment_id=eq.${establishmentId}` }, () => fetchSentOrders())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [fetchSentOrders, establishmentId]);

  return (
    <OrderContext.Provider value={{
      session, setSession, cart, addToCart, removeFromCart, updateQuantity, clearCart,
      totalItems, totalPrice, roundItemsCount, isRoundLimitReached,
      currentClientId, setCurrentClientId, favorites, addToFavorites, removeFromFavorites,
      sentOrders, sendOrder, recentOrders, clearRecentOrders, addDirectlyToSentOrders,
      updateItemObservation,
      establishmentId,
      restaurantType,
      settings,
      clearTableSession,
      callService,
      hasActiveRodizio,
      isRodizioOrdered,
      isTableOccupiedByMe,
      occupyTable,
      activateRodizio,
      resetTableOrders,
      fetchSentOrders,
      tableStatus,
      occupants
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
