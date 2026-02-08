import { Monitor, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useOrder } from '@/contexts/OrderContext';
import { useState, useEffect } from 'react';

interface StatusBarProps {
  expanded?: boolean;
  onToggle?: () => void;
}

export function StatusBar({ expanded = false, onToggle }: StatusBarProps) {
  const { session, roundItemsCount } = useOrder();
  const [turnTime, setTurnTime] = useState('00:00');

  useEffect(() => {
    if (!session?.turnStartTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - session.turnStartTime.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTurnTime(
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.turnStartTime]);

  const roundLimit = session?.roundLimit || 24;
  const tableName = session?.tableName || localStorage.getItem('ez_menu_table_name') || 'Mesa';
  const clients = session?.clients || 3;

  return (
    <div
      className="bg-status-bar rounded-lg overflow-hidden cursor-pointer transition-all duration-200"
      onClick={onToggle}
    >
      {/* Compact View */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-foreground" />
          <span className="font-medium">{tableName}</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {/* Expanded View */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-white/10 pt-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Clientes</span>
            <div className="flex items-center gap-1 text-primary">
              <Users className="w-4 h-4" />
              <span className="font-semibold">{clients}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Pedido</span>
            <span className="font-semibold text-price">
              {roundItemsCount}/{roundLimit}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Turno</span>
            <span className="font-semibold text-price">{turnTime}</span>
          </div>
        </div>
      )}
    </div>
  );
}
