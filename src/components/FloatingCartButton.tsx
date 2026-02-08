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

    if (!visible) return null;

    return (
        <button
            onClick={onClick}
            className="fixed bottom-24 right-4 z-50 bg-primary text-primary-foreground p-4 rounded-full shadow-lg hover:bg-primary/90 transition-all active:scale-95 animate-in fade-in zoom-in duration-300"
            aria-label="View Cart"
        >
            <div className="relative">
                <ShoppingCart className="w-6 h-6" />
                {totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 glass-card text-primary text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-primary/20">
                        {totalItems}
                    </span>
                )}
            </div>
        </button>
    );
}
