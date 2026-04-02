
import { Fish, Smile, User, ChevronLeft, Utensils, AlertCircle } from 'lucide-react';
import { useOrder } from '@/contexts/OrderContext';
import { useMenu } from '@/contexts/MenuContext';
import { additionalCharges } from '@/data/menuData';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from './LanguageSelector';

interface HomeScreenProps {
  onStartOrder: () => void;
  onBack?: () => void;
  hasTable?: boolean;
}

export function RodizioSelectionScreen({ onStartOrder, onBack, hasTable = false }: HomeScreenProps) {
  const { setSession, session, currentClientId, addToCart, cart, sentOrders, updateQuantity, settings, restaurantType, isRodizioOrdered, isTableOccupiedByMe, occupyTable, activateRodizio } = useOrder();
  const { items: menuItems } = useMenu();
  const { t } = useLanguage();

  // Determine initial counts from both cart (pending) and sentOrders (confirmed)
  // Support both legacy 'SYS01' and new 'SYS01-XXXX' patterns
  const initialAdults = (
    cart.find(c => c.code.startsWith('SYS01') && c.addedBy === currentClientId)?.quantity || 
    sentOrders.find(o => o.code.startsWith('SYS01'))?.quantity || 0
  );
  const initialChildren = (
    cart.find(c => c.code.startsWith('SYS02') && c.addedBy === currentClientId)?.quantity || 
    sentOrders.find(o => o.code.startsWith('SYS02'))?.quantity || 0
  );

  const [adultsCount, setAdultsCount] = useState(initialAdults);
  const [childrenCount, setChildrenCount] = useState(initialChildren);

  const isSteakhouse = restaurantType === 'steakhouse';
  const rodizioLabel = isSteakhouse ? 'Rodízio Adulto' : 'Rodízio Adulto'; // Keeping internal name but can change UI below
  const rodizioPriceAdult = settings?.rodizio_price_adult || 129.99;
  const rodizioPriceChild = settings?.rodizio_price_child || 69.99;

  const total = (adultsCount * rodizioPriceAdult) + (childrenCount * rodizioPriceChild);
  const tableName = session?.tableName || localStorage.getItem('ez_menu_table_name') || 'Mesa';

  const handleConfirm = async () => {
    // 1. Ensure table is occupied first
    if (!isTableOccupiedByMe) {
      const success = await occupyTable(adultsCount + childrenCount);
      if (!success) return; // occupyTable handles error toast
    }

    // 2. Set session properties
    setSession({
      tableId: tableName,
      tableName: tableName,
      clients: (session?.clients || 0) > 0 ? session!.clients : (adultsCount + childrenCount),
      turnStartTime: session?.turnStartTime || new Date(),
      roundLimit: restaurantType === 'sushi' ? 24 : 999, // High limit for Steakhouse
      currentRoundItems: session?.currentRoundItems || 0,
      roundNumber: session?.roundNumber || 1,
    });
    
    // 3. Activate Rodizio (directly to account)
    const success = await activateRodizio(adultsCount, childrenCount);
    if (success) {
      onStartOrder();
    }
  };

  return (
    <div className="h-full flex flex-col bg-background text-foreground relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}>
      </div>

      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-10 left-6 z-[60] w-12 h-12 flex items-center justify-center bg-background/80 backdrop-blur-md rounded-full border border-border shadow-md active:scale-95 transition-all hover:bg-background"
          aria-label="Voltar"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Absolute Language Selector */}
      <div className="absolute top-10 right-6 z-[60]">
        <LanguageSelector />
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar pt-24 pb-80 px-6 z-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-2">Quantas Pessoas?</h1>
          <p className="text-muted-foreground text-sm uppercase tracking-widest font-medium">
            Mesa {tableName}
          </p>
        </div>

        {isRodizioOrdered && (
          <div className="max-w-md mx-auto mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-amber-900">Bloqueio de Segurança Ativo</span>
              <p className="text-xs text-amber-700 leading-relaxed font-medium">
                Como já existem pedidos do rodízio em preparo ou entregues, a quantidade de pessoas não pode ser reduzida.
              </p>
            </div>
          </div>
        )}

        {!isRodizioOrdered && (
          <div className="max-w-md mx-auto mb-6 p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed font-medium">
              <span className="font-bold text-foreground">Importante:</span> A quantidade de pessoas não poderá ser reduzida após o primeiro pedido ser enviado.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 max-w-md mx-auto w-full">

          {/* Adult Card */}
          <div className={`relative overflow-hidden rounded-3xl bg-card border-2 ${adultsCount > 0 ? 'border-primary shadow-xl shadow-primary/10' : 'border-border shadow-sm'} transition-all duration-300`}>
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <User className="w-24 h-24" />
            </div>

            <div className="p-6 relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-full ${adultsCount > 0 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'} transition-colors`}>
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xl leading-none">Adultos</h3>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">Rodízio Completo</p>
                </div>
              </div>

              {hasTable && (
                <div className="flex items-center justify-between mt-6 bg-secondary/50 rounded-2xl p-2 border border-border/50 backdrop-blur-sm">
                  <button
                    onClick={() => setAdultsCount(Math.max(0, adultsCount - 1))}
                    disabled={isRodizioOrdered && adultsCount <= initialAdults}
                    className="w-12 h-12 flex items-center justify-center bg-background rounded-xl shadow-sm border border-border hover:border-primary/50 text-xl font-medium transition-all active:scale-95 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
                  >
                    -
                  </button>
                  <span className="font-bold text-3xl w-12 text-center">{adultsCount}</span>
                  <button
                    onClick={() => setAdultsCount(adultsCount + 1)}
                    disabled={isRodizioOrdered}
                    className="w-12 h-12 flex items-center justify-center bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/20 text-xl font-medium transition-all active:scale-95 hover:bg-primary/90 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
              )}

              <div className="mt-4 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 shadow-sm animate-in fade-in zoom-in duration-500">
                  <span className="text-lg font-black text-emerald-600">
                    R$ {rodizioPriceAdult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Children Card */}
          <div className={`relative overflow-hidden rounded-3xl bg-card border-2 ${childrenCount > 0 ? 'border-primary/50 shadow-lg' : 'border-border shadow-sm'} transition-all duration-300`}>
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Smile className="w-24 h-24" />
            </div>

            <div className="p-6 relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-full ${childrenCount > 0 ? 'bg-orange-500 text-white' : 'bg-secondary text-muted-foreground'} transition-colors`}>
                  <Smile className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xl leading-none">Crianças</h3>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">Até 10 anos</p>
                </div>
              </div>

              {hasTable && (
                <div className="flex items-center justify-between mt-6 bg-secondary/50 rounded-2xl p-2 border border-border/50 backdrop-blur-sm">
                  <button
                    onClick={() => setChildrenCount(Math.max(0, childrenCount - 1))}
                    disabled={isRodizioOrdered && childrenCount <= initialChildren}
                    className="w-12 h-12 flex items-center justify-center bg-background rounded-xl shadow-sm border border-border hover:border-primary/50 text-xl font-medium transition-all active:scale-95 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
                  >
                    -
                  </button>
                  <span className="font-bold text-3xl w-12 text-center">{childrenCount}</span>
                  <button
                    onClick={() => setChildrenCount(childrenCount + 1)}
                    disabled={isRodizioOrdered}
                    className="w-12 h-12 flex items-center justify-center bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-500/20 text-xl font-medium transition-all active:scale-95 hover:bg-orange-600 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
              )}

              <div className="mt-4 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 border border-orange-100 shadow-sm animate-in fade-in zoom-in duration-500 delay-100">
                  <span className="text-lg font-black text-orange-600">
                    R$ {rodizioPriceChild.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Fixed Footer Action - Elevated to avoid BottomNavigation overlap */}
      {hasTable && (
        <div className="fixed bottom-[80px] left-0 right-0 p-6 z-50 bg-gradient-to-t from-background via-background/95 to-transparent pt-12 pb-8 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              onClick={handleConfirm}
              disabled={adultsCount + childrenCount === 0}
              className="group w-full bg-primary hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-bold py-4 px-8 rounded-2xl shadow-xl shadow-primary/30 transition-all active:scale-95 flex items-center justify-between border border-white/10"
            >
              <span className="flex flex-col items-start leading-none">
                <span className="text-[10px] uppercase font-medium opacity-80 mb-1">Total Confirmado</span>
                <span>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </span>

              <div className="flex items-center gap-3 bg-white/20 px-4 py-2 rounded-xl backdrop-blur-md group-hover:bg-white/30 transition-colors">
                <span className="text-sm uppercase tracking-wider">
                  {isTableOccupiedByMe ? 'COMEÇAR' : 'OCUPAR & COMEÇAR'}
                </span>
                {isSteakhouse ? <Utensils className="w-5 h-5 fill-current" /> : <Fish className="w-5 h-5 fill-current" />}
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
