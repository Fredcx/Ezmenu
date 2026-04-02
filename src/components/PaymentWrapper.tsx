import { PaymentScreen } from '@/components/PaymentScreen';
import { useOrder } from '@/contexts/OrderContext';
import { useMemo, useState, useEffect } from 'react';

export function PaymentWrapper({ onBack }: { onBack: () => void }) {
    const { sentOrders } = useOrder();
    const [stickyTotal, setStickyTotal] = useState(0);

    const grandTotal = useMemo(() => {
        const sentTotal = sentOrders.reduce((sum, item) => sum + (item.isRodizio ? 0 : item.price * item.quantity), 0);
        return sentTotal;
    }, [sentOrders]);

    // Keep the total "sticky" if it drops to 0 during payment
    useEffect(() => {
        if (grandTotal > 0) {
            setStickyTotal(grandTotal);
        }
    }, [grandTotal]);

    return <PaymentScreen onBack={onBack} total={stickyTotal || grandTotal} />;
}
