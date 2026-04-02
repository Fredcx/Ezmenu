import { ShoppingCart } from 'lucide-react';
import { useOrder } from '@/contexts/OrderContext';

interface FloatingCartButtonProps {
    onClick: () => void;
    visible: boolean;
}

export function FloatingCartButton({ onClick, visible }: FloatingCartButtonProps) {
    const { cart } = useOrder();

    // Calculate total items (sum of quantities)
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

    if (!visible || totalItems === 0) return null;

    return (
        <div className="fixed bottom-[115px] left-0 right-0 z-40 px-4 animate-in slide-in-from-bottom-6 duration-500">
            <button
                onClick={onClick}
                className="w-full max-w-md mx-auto bg-primary text-primary-foreground py-3.5 px-5 rounded-2xl shadow-[0_10px_30px_rgba(237,27,46,0.3)] hover:bg-primary/95 transition-all active:scale-[0.98] flex items-center justify-between"
                aria-label="Ver Cesta"
            >
                <div className="flex items-center gap-3">
                    <span className="bg-white/20 text-white text-[11px] font-black w-7 h-7 flex items-center justify-center rounded-full shrink-0">
                        {totalItems}
                    </span>
                    <div className="flex flex-col items-start leading-[1.1]">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Clique para</span>
                        <span className="text-sm font-bold uppercase tracking-tight">Ver carrinho</span>
                    </div>
                </div>
                
                <span className="font-bold text-sm tracking-tight tabular-nums opacity-90 relative flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 opacity-80" />
                </span>
            </button>
        </div>
    );
}
