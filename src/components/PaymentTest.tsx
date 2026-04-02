import { useState, useEffect } from 'react';
import { PaymentScreen } from './PaymentScreen';
import { useOrder } from '@/contexts/OrderContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, PlusCircle, RotateCcw } from 'lucide-react';

export default function PaymentTest() {
    const { establishmentId } = useOrder();
    const [testTotal, setTestTotal] = useState(150.00);
    const [isSimulating, setIsSimulating] = useState(false);
    const [testTable, setTestTable] = useState(`TESTE-${Math.floor(Math.random() * 1000)}`);

    // Force local storage for table name to match PaymentScreen's expectations
    useEffect(() => {
        localStorage.setItem('ez_menu_table_name', testTable);
    }, [testTable]);

    const handleSimulatePayment = async () => {
        if (!establishmentId) return;
        setIsSimulating(true);
        try {
            const amount = 25.00;
            const { error } = await supabase
                .from('payments')
                .insert({
                    establishment_id: establishmentId,
                    amount: amount,
                    status: 'CONFIRMED',
                    external_reference: `TABLE-${testTable}-${Date.now()}`,
                    method: 'PIX',
                    pix_qr_code: 'TEST_QR',
                    pix_copy_paste: 'TEST_COPY_PASTE'
                });

            if (error) throw error;
            toast.success(`Simulado pagamento de R$ ${amount.toFixed(2)} por outra pessoa!`);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao simular pagamento.");
        } finally {
            setIsSimulating(false);
        }
    };

    const handleReset = () => {
        setTestTable(`TESTE-${Math.floor(Math.random() * 1000)}`);
        toast.info("Nova sessão de teste iniciada.");
    };

    return (
        <div className="relative h-screen bg-slate-50">
            {/* Control Panel Overlay */}
            <div className="absolute top-4 right-4 z-[100] flex flex-col gap-2 scale-90 origin-top-right">
                <div className="bg-white/90 backdrop-blur shadow-xl border border-primary/20 p-4 rounded-3xl space-y-3 max-w-[200px]">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-primary border-b border-primary/10 pb-2">Controle de Teste</h3>
                    
                    <div className="space-y-1">
                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">Mesa Atual</span>
                        <p className="text-xs font-mono font-bold truncate">#{testTable}</p>
                    </div>

                    <button 
                        onClick={handleSimulatePayment}
                        disabled={isSimulating}
                        className="w-full bg-primary hover:bg-primary/90 text-white text-[10px] font-black py-2 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isSimulating ? <Loader2 className="w-3 h-3 animate-spin"/> : <PlusCircle className="w-3 h-3" />}
                        SIMULAR + R$ 25
                    </button>

                    <button 
                        onClick={handleReset}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black py-2 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <RotateCcw className="w-3 h-3" />
                        REINICIAR
                    </button>
                    
                    <p className="text-[8px] text-muted-foreground italic leading-tight">
                        *O pagamento via Pix real funciona normalmente aqui.
                    </p>
                </div>
            </div>

            {/* The Actual Component we are testing */}
            <div className="h-full">
                <PaymentScreen 
                    onBack={() => toast("Ação Voltar disparada")}
                    total={testTotal}
                />
            </div>
        </div>
    );
}
