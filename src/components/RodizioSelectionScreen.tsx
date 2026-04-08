import { Smile, User, AlertCircle, Utensils, ChevronLeft } from 'lucide-react';
import { useOrder } from '@/contexts/OrderContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from './LanguageSelector';
import { toast } from 'sonner';

interface HomeScreenProps {
  onStartOrder: () => void;
  onBack?: () => void;
  hasTable?: boolean;
}

export function RodizioSelectionScreen({ onBack, hasTable = false }: HomeScreenProps) {
  const { session, settings, callService } = useOrder();
  const { t } = useLanguage();

  const rodizioPriceAdult = settings?.rodizio_price_adult || 129.99;
  const rodizioPriceChild = settings?.rodizio_price_child || 69.99;
  const tableName = session?.tableName || localStorage.getItem('ez_menu_table_name') || 'Mesa';

  const handleCallWaiter = async () => {
    try {
      await callService('waiter', 'Gostaria de ativar o Rodízio');
      toast.success('Solicitação enviada!', {
        description: 'Um garçom virá até sua mesa para liberar o Rodízio.',
        duration: 5000
      });
    } catch (e) {
      toast.error('Erro ao chamar garçom');
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
      <div className="flex-1 overflow-y-auto no-scrollbar pt-24 pb-40 px-6 z-10 flex flex-col items-center justify-center">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Utensils className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Liberação Obrigatória</h1>
          <p className="text-muted-foreground text-sm uppercase tracking-widest font-medium">
            Mesa {tableName}
          </p>
        </div>

        <div className="max-w-md mx-auto space-y-6 w-full">
          <div className="bg-card border-2 border-border rounded-[32px] p-8 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Utensils className="w-24 h-24" />
            </div>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wider mb-6">
                <AlertCircle className="w-4 h-4" /> Somente Garçons
              </div>
              
              <h2 className="text-xl font-bold mb-3 text-foreground">Como ativar o Rodízio?</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                Para sua segurança e controle de consumo, a ativação do pacote de rodízio é realizada exclusivamente por nossa equipe.
              </p>

              <div className="w-full space-y-3">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/50 border border-border/50">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-zinc-400" />
                    <span className="text-sm font-bold">Rodízio Adulto</span>
                  </div>
                  <span className="text-sm font-black text-emerald-600">R$ {rodizioPriceAdult.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/50 border border-border/50">
                  <div className="flex items-center gap-3">
                    <Smile className="w-5 h-5 text-zinc-400" />
                    <span className="text-sm font-bold">Rodízio Infantil</span>
                  </div>
                  <span className="text-sm font-black text-orange-600">R$ {rodizioPriceChild.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleCallWaiter}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-lg font-bold py-5 px-8 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <User className="w-6 h-6" />
            CHAMAR GARÇOM
          </button>
        </div>
      </div>
    </div>
  );
}
