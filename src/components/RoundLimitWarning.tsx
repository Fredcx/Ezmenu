import { AlertTriangle } from 'lucide-react';
import { useOrder } from '@/contexts/OrderContext';

export function RoundLimitWarning() {
  const { isRoundLimitReached, roundItemsCount, session } = useOrder();
  
  if (!isRoundLimitReached) return null;

  const roundLimit = session?.roundLimit || 10;

  return (
    <div className="mx-4 p-3 bg-warning/20 border border-warning/40 rounded-xl flex items-center gap-3 animate-fade-in">
      <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-warning">Limite da rodada atingido!</p>
        <p className="text-xs text-muted-foreground">
          Você atingiu {roundItemsCount}/{roundLimit} itens. Envie o pedido atual para continuar.
        </p>
      </div>
    </div>
  );
}
