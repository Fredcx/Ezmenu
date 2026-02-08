import { PaymentScreen } from '@/components/PaymentScreen';
import { useOrder } from '@/contexts/OrderContext';
import { useMemo } from 'react';

export function PaymentWrapper({ onBack }: { onBack: () => void }) {
    const { cart, sentOrders } = useOrder();

    const grandTotal = useMemo(() => {
        const cartTotal = cart.reduce((sum, item) => sum + (item.isRodizio ? 0 : item.price * item.quantity), 0);
        const sentTotal = sentOrders.reduce((sum, item) => sum + (item.isRodizio ? 0 : item.price * item.quantity), 0);
        return cartTotal + sentTotal;
    }, [cart, sentOrders]);

    return <PaymentScreen onBack={onBack} total={grandTotal} />;
}
