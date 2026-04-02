import { ArrowLeft, CreditCard, Smartphone, Bell, Receipt, Check, Wallet, ChevronRight, Copy, Loader2, Download, Share2, Users, History, Info, X, Terminal, SplitSquareHorizontal, CheckSquare, Square, Minus, Plus } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { useOrder } from '@/contexts/OrderContext';
import { supabase } from '@/lib/supabase';

interface PaymentScreenProps {
    onBack: () => void;
    total: number;
    forceShowReceipt?: boolean;
}

export type PaymentViewState = 'extrato' | 'payment_methods' | 'split_details' | 'receipt' | 'split_options' | 'split_by_products' | 'split_equally';

export function PaymentScreen({ onBack, total: rawSubtotal, forceShowReceipt = false }: PaymentScreenProps) {
    const subtotal = rawSubtotal;
    const serviceFeeAmount = subtotal * 0.10;
    const total = subtotal + serviceFeeAmount;

    const { sentOrders, callService, establishmentId, fetchSentOrders, resetTableOrders, clearTableSession } = useOrder();
    const [view, setView] = useState<PaymentViewState>('extrato');
    const [showWaiterModal, setShowWaiterModal] = useState(false);
    const [requestType, setRequestType] = useState<'waiter' | 'machine'>('waiter');

    // Persistence Check
    const [hasPaidInSession, setHasPaidInSession] = useState(!!localStorage.getItem('ez_menu_paid_amount'));

    // Pix & Card Step Management
    const [paymentStep, setPaymentStep] = useState<'selection' | 'pix_form' | 'pix_qr' | 'card_form'>('selection');
    const [email, setEmail] = useState('');
    const [cpf, setCpf] = useState('');
    const [isLoadingPix, setIsLoadingPix] = useState(false);
    const [pixData, setPixData] = useState<{ encodedImage: string, copyPaste: string, payment_id?: string } | null>(null);
    const [showReceipt, setShowReceipt] = useState(forceShowReceipt);
    
    // Card Specific State
    const [cardData, setCardData] = useState({
        number: '',
        holder: '',
        expiry: '',
        cvv: ''
    });
    const [isLoadingCard, setIsLoadingCard] = useState(false);

    // Split Bill State
    const [isSplitMode, setIsSplitMode] = useState(false);
    const [partialAmount, setPartialAmount] = useState<string>('5,00');
    const [totalPaidByOthers, setTotalPaidByOthers] = useState(0);
    const [payments, setPayments] = useState<any[]>([]);
    const [isFullyPaid, setIsFullyPaid] = useState(false);
    const [myLastPaidAmount, setMyLastPaidAmount] = useState<number | null>(null);
    const [receiptView, setReceiptView] = useState<'individual' | 'summary'>('individual');
    const [closingCountdown, setClosingCountdown] = useState<number | null>(null);

    const [isConfirmed, setIsConfirmed] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const receiptRef = useRef<HTMLDivElement>(null);

    // New Split States
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [splitPeopleCount, setSplitPeopleCount] = useState<number>(2);
    const [showSplitDrawer, setShowSplitDrawer] = useState(false);

    // Only use sentOrders for the actual bill
    const allItems = useMemo(() => [...sentOrders], [sentOrders]);

    const receiptDetails = useMemo(() => {
        const groupItems = (items: any[]) => {
            const grouped: Record<string, any> = {};
            items.forEach(item => {
                const key = item.id;
                if (!grouped[key]) {
                    grouped[key] = { ...item, quantity: 0, totalPrice: 0 };
                }
                grouped[key].quantity += item.quantity;
                const itemPrice = item.isRodizio ? 0 : item.price;
                grouped[key].totalPrice += (itemPrice * item.quantity);
            });
            return Object.values(grouped);
        };

        const rawPayables = allItems.filter(i => !i.isRodizio || i.category === 'system');
        
        return {
            payables: groupItems(rawPayables)
        };
    }, [allItems]);

    // Dynamic Balance calculation
    const remainingBalance = Math.max(0, total - totalPaidByOthers);

    // Split By Products Logic
    const unrolledItems = useMemo(() => {
        const result: typeof receiptDetails.payables = [];
        receiptDetails.payables.forEach(group => {
            for (let i = 0; i < group.quantity; i++) {
                result.push({
                    ...group,
                    uniqueId: `${group.id}_${i}`,
                    quantity: 1,
                    totalPrice: group.price
                });
            }
        });
        return result;
    }, [receiptDetails.payables]);

    const selectedTotal = useMemo(() => {
        const rawTotal = unrolledItems
            .filter(i => selectedProductIds.includes(i.uniqueId))
            .reduce((sum, i) => sum + i.totalPrice, 0);
        return rawTotal * 1.10;
    }, [selectedProductIds, unrolledItems]);

    const toggleProduct = (uniqueId: string) => {
        if (selectedProductIds.includes(uniqueId)) {
            setSelectedProductIds(prev => prev.filter(id => id !== uniqueId));
        } else {
            setSelectedProductIds(prev => [...prev, uniqueId]);
        }
    };

    const handleConfirmProducts = () => {
        if (selectedTotal <= 0) {
            toast.error("Selecione pelo menos um item para pagar.");
            return;
        }
        if (selectedTotal > remainingBalance) {
           toast.error("O valor selecionado ultrapassa o saldo restante da mesa.");
           return; 
        }
        setPartialAmount(selectedTotal.toFixed(2).replace('.', ','));
        setIsSplitMode(true);
        setView('payment_methods');
    };

    // Split Equally Logic
    const calculatedAmount = remainingBalance / splitPeopleCount;

    const handleConfirmSplit = () => {
        if (calculatedAmount <= 0) return;
        setPartialAmount(calculatedAmount.toFixed(2).replace('.', ','));
        setIsSplitMode(true);
        setView('payment_methods');
    };

    // 1. Inital Load & Persistence
    useEffect(() => {
        if (hasPaidInSession && !forceShowReceipt) {
            setView('extrato');
        }
    }, [hasPaidInSession, forceShowReceipt]);

    // 2. Real-time synchronization
    useEffect(() => {
        const tableId = localStorage.getItem('ez_menu_table_name');
        if (!tableId || !establishmentId) return;

        const fetchPayments = async () => {
            const { data } = await supabase
                .from('payments')
                .select('*')
                .eq('establishment_id', establishmentId)
                .ilike('external_reference', `TABLE-${tableId}-%`)
                .in('status', ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH']);

            if (data) {
                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                const sessionPayments = data.filter(p => p.created_at > twentyFourHoursAgo);
                
                setPayments(sessionPayments);
                const paidTotal = sessionPayments.reduce((sum, p) => sum + Number(p.amount), 0);
                setTotalPaidByOthers(paidTotal);
                
                if (paidTotal >= total && total > 0) {
                    setIsFullyPaid(true);
                }
            }
        };

        fetchPayments();

        const channel = supabase
            .channel(`table_payments_${tableId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'payments',
                filter: `establishment_id=eq.${establishmentId}`
            }, (payload) => {
                const p = payload.new as any;
                if (p.external_reference?.startsWith(`TABLE-${tableId}-`)) {
                    fetchPayments();
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [establishmentId, total]);

    // 3. Status Check for the Client's own Pix
    useEffect(() => {
        const asaasId = pixData?.payment_id;
        if (!asaasId || isConfirmed) return;

        const statusChannel = supabase
            .channel(`my_payment_${asaasId}`)
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'payments', 
                filter: `asaas_id=eq.${asaasId}` 
            }, (payload) => {
                const status = payload.new.status;
                if (status === 'RECEIVED' || status === 'CONFIRMED' || status === 'RECEIVED_IN_CASH') {
                    handleConfirmedPayment(Number(payload.new.amount));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(statusChannel); };
    }, [pixData?.payment_id, isConfirmed]);

    const handleConfirmedPayment = (amount: number) => {
        setIsConfirmed(true);
        setMyLastPaidAmount(amount);
        const currentPaid = parseFloat(localStorage.getItem('ez_menu_paid_amount') || '0');
        localStorage.setItem('ez_menu_paid_amount', (currentPaid + amount).toString());
        setHasPaidInSession(true);
        toast.success("Pagamento confirmado!");
        
        setTimeout(() => {
            setShowReceipt(true);
        }, 1500);
    };

    // Grace Period Countdown
    useEffect(() => {
        if (isFullyPaid && showReceipt) {
            setClosingCountdown(120);
            const timer = setInterval(() => {
                setClosingCountdown(prev => {
                    if (prev === null || prev <= 1) {
                        clearInterval(timer);
                        const tableName = localStorage.getItem('ez_menu_table_name');
                        if (tableName) {
                            resetTableOrders(tableName);
                            clearTableSession();
                        }
                        onBack();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [isFullyPaid, showReceipt]);

    // Shared Functions
    const handleGeneratePix = async (amountInput?: string) => {
        const paymentAmount = amountInput 
            ? Number(amountInput.replace(',', '.')) 
            : (isSplitMode ? Number(partialAmount.replace(',', '.')) : remainingBalance);

        if (!email || !cpf) {
            toast.error("Preencha E-mail e CPF para o Pix.");
            setPaymentStep('pix_form');
            return;
        }

        if (paymentAmount < 5) {
            toast.error("O valor mínimo para Pix é R$ 5,00.");
            return;
        }

        setIsLoadingPix(true);
        try {
            const userName = localStorage.getItem('ez_menu_client_name') || 'Cliente';
            const userPhone = localStorage.getItem('ez_menu_client_phone') || '11999999999';

            const response = await fetch('/api/asaas-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: `TABLE-${localStorage.getItem('ez_menu_table_name') || 'MESA'}-${Date.now()}`,
                    establishment_id: establishmentId,
                    amount: paymentAmount,
                    customer: { name: userName, phone: userPhone, email: email, cpfCnpj: cpf.replace(/\D/g, '') }
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            setPixData({ payment_id: data.payment_id, encodedImage: `data:image/png;base64,${data.pix_qr_code}`, copyPaste: data.pix_copy_paste });
            setPaymentStep('pix_qr');
            toast.success("Pix gerado!");
        } catch (error: any) {
            toast.error("Erro ao gerar Pix.");
        } finally {
            setIsLoadingPix(false);
        }
    };

    const handleGenerateCardPayment = async () => {
        const paymentAmount = isSplitMode ? Number(partialAmount.replace(',', '.')) : remainingBalance;

        if (!cardData.number || !cardData.holder || !cardData.expiry || !cardData.cvv || !email || !cpf) {
            toast.error("Preencha todos os campos do cartão, e-mail e CPF.");
            return;
        }

        setIsLoadingCard(true);
        try {
            const response = await fetch('/api/asaas-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: `TABLE-${localStorage.getItem('ez_menu_table_name') || 'MESA'}-${Date.now()}`,
                    establishment_id: establishmentId,
                    amount: paymentAmount,
                    method: 'CREDIT_CARD',
                    customer: {
                        name: localStorage.getItem('ez_menu_client_name') || 'Cliente',
                        email: email,
                        cpfCnpj: cpf.replace(/\D/g, '')
                    },
                    creditCard: {
                        holderName: cardData.holder,
                        number: cardData.number.replace(/\s/g, ''),
                        expiryMonth: cardData.expiry.split('/')[0],
                        expiryYear: '20' + cardData.expiry.split('/')[1],
                        cvv: cardData.cvv
                    }
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro no cartão');

            handleConfirmedPayment(paymentAmount);
            toast.success("Pagamento aprovado!");
        } catch (error: any) {
            toast.error(error.message || "Erro no cartão.");
        } finally {
            setIsLoadingCard(false);
        }
    };

    const handleCallWaiterAction = async () => {
        await callService(requestType);
        toast.success(requestType === 'machine' ? "Maquininha solicitada!" : "Aguardando garçom...");
        setShowWaiterModal(false);
    };

    const handleBack = () => {
        if (showSplitDrawer) { setShowSplitDrawer(false); return; }
        if (paymentStep === 'pix_qr') { setPaymentStep('selection'); setPixData(null); }
        else if (paymentStep === 'pix_form' || paymentStep === 'card_form') setPaymentStep('selection');
        else if (view === 'payment_methods' || view === 'split_details') setView('extrato');
        else if (view === 'split_by_products' || view === 'split_equally') { setView('extrato'); setShowSplitDrawer(true); }
        else onBack();
    };

    // --- Sub-Views ---

    const renderExtratoView = () => (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right duration-300 relative">
            <div className="flex-1 px-4 py-6 md:p-6 space-y-6 overflow-y-auto pb-[100px]">
                <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-border/40 relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-8">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">Detalhes do Consumo</span>
                    </div>
                    <div className="space-y-6">
                        {receiptDetails.payables.map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center group">
                                <div className="flex gap-3 items-baseline">
                                    <span className="text-sm font-black text-slate-400">{item.quantity}x</span>
                                    <span className="text-sm font-bold text-slate-700">{item.name}</span>
                                </div>
                                <span className="font-black text-sm text-slate-900">R$ {item.totalPrice.toFixed(2)}</span>
                            </div>
                        ))}
                        <div className="pt-6 border-t border-slate-100 space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-bold text-slate-500">Subtotal</span>
                                <span className="font-bold text-slate-700">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-bold text-slate-500">Taxa de Serviço</span>
                                <span className="font-bold text-slate-700">R$ {serviceFeeAmount.toFixed(2).replace('.', ',')}</span>
                            </div>
                            <div className="flex justify-between items-end pt-4 border-t border-slate-100 mt-2">
                                <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Sua Conta</span>
                                <div className="flex items-baseline gap-1 text-slate-900"><span className="font-black text-sm">R$</span><span className="text-3xl font-black tracking-tighter">{total.toFixed(2).replace('.', ',')}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
                {hasPaidInSession && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex gap-3 text-xs text-emerald-600 font-bold shadow-sm">
                        <Check className="w-4 h-4 shrink-0" /> Seu pagamento confirmado! Faltam R$ {remainingBalance.toFixed(2)} na mesa.
                    </div>
                )}
            </div>
                
            {remainingBalance > 0 ? (
                <div className="absolute bottom-6 left-0 right-0 px-4 md:px-6 z-30 pointer-events-none">
                    <div className="flex items-center gap-3 shadow-2xl shadow-black/5 rounded-2xl pointer-events-auto">
                        <button 
                            onClick={() => { setIsSplitMode(false); setView('payment_methods'); }}
                            className="flex-1 bg-primary text-white h-[60px] rounded-2xl shadow-xl shadow-primary/20 flex flex-col items-center justify-center active:scale-95 transition-all outline-none"
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-90 leading-tight">Pagar Tudo</span>
                            <span className="text-[13px] font-black leading-tight">R$ {remainingBalance.toFixed(2).replace('.', ',')}</span>
                        </button>
                        <button 
                            onClick={() => setShowSplitDrawer(true)}
                            className="flex-1 bg-white border border-slate-200 text-slate-800 h-[60px] rounded-2xl flex flex-col items-center justify-center active:scale-95 shadow-sm transition-all focus:ring-2 ring-primary/20 outline-none"
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 leading-tight mb-0.5">Dividir Conta</span>
                            <SplitSquareHorizontal className="w-4 h-4 text-primary" />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="absolute bottom-6 left-0 right-0 px-4 md:px-6 z-30">
                    <button onClick={onBack} className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 shadow-lg">Conta Liquidada. Sair</button>
                </div>
            )}
        </div>
    );

    const renderSplitOptionsModal = () => (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowSplitDrawer(false)}>
             <div className="bg-white rounded-t-[2.5rem] w-full max-w-md mx-auto overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-300 pb-8" onClick={e => e.stopPropagation()}>
                <div className="relative p-6 px-8 flex items-center justify-between">
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Dividir a conta</h2>
                    <button onClick={() => setShowSplitDrawer(false)} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <div className="px-8 space-y-6">
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">Você pode pagar a sua parte selecionando uma das opções abaixo</p>
                    <div className="space-y-3">
                        <button onClick={() => { setShowSplitDrawer(false); setView('split_by_products'); }} className="w-full bg-white px-6 py-5 rounded-full border border-slate-200 flex items-center justify-between hover:border-primary/40 focus:ring-2 ring-primary/20 transition-all font-bold text-slate-800 shadow-sm active:scale-95 group">
                            Pague por produtos
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
                        </button>
                        <button onClick={() => { setShowSplitDrawer(false); setView('split_equally'); }} className="w-full bg-white px-6 py-5 rounded-full border border-slate-200 flex items-center justify-between hover:border-primary/40 focus:ring-2 ring-primary/20 transition-all font-bold text-slate-800 shadow-sm active:scale-95 group">
                            Dividir a conta igualmente
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
                        </button>
                        <button onClick={() => { setShowSplitDrawer(false); setView('split_details'); }} className="w-full bg-white px-6 py-5 rounded-full border border-slate-200 flex items-center justify-between hover:border-primary/40 focus:ring-2 ring-primary/20 transition-all font-bold text-slate-800 shadow-sm active:scale-95 group">
                            Pagar um valor específico
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderSplitByProductsView = () => (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right duration-300">
                <div className="flex-1 p-6 space-y-6 overflow-y-auto pb-[130px]">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">O que você consumiu?</span>
                    </div>
                    <div className="space-y-3">
                        {unrolledItems.map((item) => {
                            const isSelected = selectedProductIds.includes(item.uniqueId);
                            return (
                                <button key={item.uniqueId} onClick={() => toggleProduct(item.uniqueId)} className={`w-full flex justify-between items-center p-4 rounded-2xl border transition-all ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-white hover:border-slate-300'}`}>
                                    <div className="flex items-center gap-3">
                                        {isSelected ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5 text-slate-300" />}
                                        <span className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-slate-700'}`}>{item.name}</span>
                                    </div>
                                    <span className={`font-black text-sm ${isSelected ? 'text-primary' : 'text-slate-900'}`}>R$ {item.totalPrice.toFixed(2)}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="sticky bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent z-20 max-w-md mx-auto">
                     <button 
                        onClick={handleConfirmProducts}
                        disabled={selectedTotal <= 0}
                        className="w-full bg-primary disabled:bg-slate-300 disabled:opacity-50 text-white font-black py-4 rounded-[1.5rem] shadow-xl flex items-center justify-between px-6 active:scale-95 transition-all mb-4"
                     >
                        <span>Confirmar Seleção</span>
                        <span>R$ {selectedTotal.toFixed(2)}</span>
                     </button>
                </div>
            </div>
    );

    const renderSplitEquallyView = () => (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right duration-300 pt-10">
                 <div className="flex-1 p-6 space-y-8 overflow-y-auto flex flex-col items-center">
                    <div className="text-center space-y-2 mb-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor pendente da mesa</span>
                        <div className="flex justify-center items-baseline gap-1"><span className="text-slate-800 font-black text-xl">R$</span><span className="text-4xl font-black text-slate-800 tracking-tighter">{remainingBalance.toFixed(2).replace('.', ',')}</span></div>
                    </div>

                    <div className="w-full bg-white rounded-[2rem] p-8 shadow-lg shadow-black/5 border border-border text-center space-y-8">
                         <div className="space-y-3">
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Dividir entre quantas pessoas?</span>
                            <div className="flex items-center justify-center gap-6">
                                <button 
                                    onClick={() => setSplitPeopleCount(Math.max(2, splitPeopleCount - 1))}
                                    className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all text-slate-600"
                                >
                                    <Minus className="w-6 h-6" />
                                </button>
                                <span className="text-5xl font-black text-slate-900 w-16 text-center">{splitPeopleCount}</span>
                                <button 
                                    onClick={() => setSplitPeopleCount(splitPeopleCount + 1)}
                                    className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all text-slate-600"
                                >
                                    <Plus className="w-6 h-6" />
                                </button>
                            </div>
                         </div>

                         <div className="pt-8 border-t border-dashed border-slate-100">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sua parte será:</span>
                            <div className="flex justify-center items-baseline gap-1 mt-2 text-primary">
                                <span className="font-black text-2xl">R$</span>
                                <span className="text-5xl font-black tracking-tighter">{calculatedAmount.toFixed(2).replace('.', ',')}</span>
                            </div>
                         </div>
                    </div>
                </div>
                <div className="sticky bottom-0 left-0 right-0 p-6 bg-white z-20 max-w-md mx-auto">
                     <button 
                        onClick={handleConfirmSplit}
                        className="w-full bg-primary text-white font-black py-4 rounded-[1.5rem] shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-primary/20 mb-4"
                     >
                        Confirmar R$ {calculatedAmount.toFixed(2)}
                        <ChevronRight className="w-5 h-5" />
                     </button>
                </div>
            </div>
    );

    const renderSplitSpecificValueView = () => (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right duration-300">
                <div className="flex-1 p-6 space-y-8 pt-10">
                    <div className="text-center space-y-2 mb-8">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor pendente da mesa</span>
                        <p className="font-bold text-slate-800 text-2xl">R$ {remainingBalance.toFixed(2)}</p>
                    </div>

                    <div className="bg-white rounded-[2rem] p-6 border border-border/60 shadow-lg shadow-black/5 space-y-6">
                        <div className="flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-primary" />
                            <span className="text-sm font-black text-slate-800">Quanto você quer pagar?</span>
                        </div>
                        <div className="space-y-4">
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                                <input 
                                    type="text" 
                                    value={partialAmount} 
                                    onChange={e => setPartialAmount(e.target.value)} 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-5 pl-12 pr-4 font-black text-3xl outline-none focus:bg-white focus:ring-2 ring-primary/20 transition-all shadow-inner" 
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="sticky bottom-0 left-0 right-0 p-6 bg-white z-20 max-w-md mx-auto">
                     <button 
                        onClick={() => {
                            const val = Number(partialAmount.replace(',', '.'));
                            if (val > remainingBalance) {
                                toast.error("O valor digitado é maior que o saldo restante da mesa.");
                                return;
                            }
                            if (val <= 0) {
                                toast.error("Digite um valor válido.");
                                return;
                            }
                            setIsSplitMode(true);
                            setView('payment_methods');
                        }}
                        className="w-full bg-primary text-white font-black py-4 rounded-[1.5rem] shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-primary/20 mb-4"
                     >
                        Continuar para Pagamento
                        <ChevronRight className="w-5 h-5" />
                     </button>
                </div>
            </div>
    );

    const renderPaymentMethodsView = () => {
        const displayAmount = isSplitMode ? Number(partialAmount.replace(',', '.')) : remainingBalance;

        return (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right duration-300">
                <div className="flex-1 p-6 space-y-6 overflow-y-auto pb-64">
                    <div className="bg-primary text-primary-foreground rounded-3xl p-8 shadow-xl shadow-primary/20 text-center space-y-2 relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-90">Total a Pagar</span>
                        <div className="flex justify-center items-baseline gap-1 relative z-10"><span className="text-primary-foreground/80 font-black text-lg">R$</span><span className="text-5xl font-black tracking-tighter">{displayAmount.toFixed(2).replace('.', ',')}</span></div>
                    </div>

                    {paymentStep === 'selection' && (
                        <div className="space-y-4">
                            <button onClick={() => setPaymentStep('pix_form')} className="w-full bg-white p-5 rounded-3xl border border-border/60 flex items-center gap-4 hover:border-primary/30 group transition-all shadow-sm">
                                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><Smartphone className="w-6 h-6 text-emerald-500" /></div>
                                <div className="flex-1 text-left"><h3 className="font-bold text-slate-800">Pix</h3><p className="text-xs text-muted-foreground">Aprovação imediata</p></div>
                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button onClick={() => setPaymentStep('card_form')} className="w-full bg-white p-5 rounded-3xl border border-border/60 flex items-center gap-4 hover:border-primary/30 group transition-all shadow-sm">
                                <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><CreditCard className="w-6 h-6 text-primary" /></div>
                                <div className="flex-1 text-left"><h3 className="font-bold text-slate-800">Cartão de Crédito</h3><p className="text-xs text-muted-foreground">Pagar agora pelo site</p></div>
                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button onClick={() => { setRequestType('machine'); setShowWaiterModal(true); }} className="w-full bg-slate-50 p-5 rounded-3xl border border-dashed border-border flex items-center gap-4 group transition-all">
                                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center"><Terminal className="w-6 h-6 text-slate-400" /></div>
                                <div className="flex-1 text-left"><h3 className="font-bold text-slate-500">Pedir Maquininha</h3><p className="text-xs text-muted-foreground">Pagar com o garçom</p></div>
                                <ChevronRight className="w-5 h-5 text-slate-300" />
                            </button>
                        </div>
                    )}

                    {(paymentStep === 'pix_form' || paymentStep === 'card_form') && (
                        <div className="space-y-4 p-2 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">E-mail e CPF (Para o banco)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" className="w-full h-12 rounded-xl bg-white border border-border px-4 text-xs font-bold outline-none" />
                                    <input type="tel" value={cpf} onChange={e => {
                                        const v = e.target.value.replace(/\D/g, '').substring(0, 11);
                                        setCpf(v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4"));
                                    }} placeholder="CPF" className="w-full h-12 rounded-xl bg-white border border-border px-4 text-xs font-bold outline-none" />
                                </div>
                            </div>

                            {paymentStep === 'card_form' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Número do Cartão</label>
                                        <input type="tel" value={cardData.number} onChange={e => setCardData({...cardData, number: e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ')})} placeholder="0000 0000 0000 0000" className="w-full h-14 rounded-2xl bg-white border border-border px-4 font-bold outline-none text-lg tracking-widest" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Nome no Cartão</label>
                                        <input type="text" value={cardData.holder} onChange={e => setCardData({...cardData, holder: e.target.value.toUpperCase()})} placeholder="COMO ESTÁ NO CARTÃO" className="w-full h-14 rounded-2xl bg-white border border-border px-4 font-bold outline-none uppercase" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Validade</label>
                                            <input type="tel" value={cardData.expiry} onChange={e => { let v = e.target.value.replace(/\D/g, ''); if (v.length > 2) v = v.substring(0,2) + '/' + v.substring(2,4); setCardData({...cardData, expiry: v}); }} placeholder="MM/AA" className="w-full h-14 rounded-2xl bg-white border border-border px-4 font-bold outline-none text-center" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">CVV</label>
                                            <input type="tel" value={cardData.cvv} onChange={e => setCardData({...cardData, cvv: e.target.value.replace(/\D/g, '').substring(0,3)})} placeholder="000" className="w-full h-14 rounded-2xl bg-white border border-border px-4 font-bold outline-none text-center" />
                                        </div>
                                    </div>
                                </>
                            )}

                            <button onClick={() => paymentStep === 'pix_form' ? handleGeneratePix() : handleGenerateCardPayment()} disabled={isLoadingPix || isLoadingCard} className="w-full bg-slate-900 text-white font-black h-16 rounded-[2rem] shadow-xl shadow-black/20 flex items-center justify-center gap-2 mt-4 active:scale-95 transition-all">
                                {isLoadingPix || isLoadingCard ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Finalizar Agora <ChevronRight className="w-5 h-5" /></>}
                            </button>
                        </div>
                    )}
                    {paymentStep === 'pix_qr' && pixData && (
                        <div className="space-y-6 flex flex-col items-center animate-in zoom-in-95 duration-300 pt-4">
                            <div className="bg-white p-4 rounded-[2rem] shadow-xl border border-primary/10"><img src={pixData.encodedImage} alt="QR Code Pix" className="w-56 h-56" /></div>
                            <div className="w-full space-y-3">
                                <button onClick={() => { navigator.clipboard.writeText(pixData.copyPaste || ''); toast.success("Código copiado!"); }} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between group active:scale-95 transition-all"><span className="text-xs font-mono truncate mr-4 text-slate-700">{pixData.copyPaste}</span><Copy className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-primary transition-colors" /></button>
                                <div className="flex items-center gap-2 justify-center text-[10px] text-muted-foreground uppercase tracking-widest py-2"><Loader2 className="w-3 h-3 animate-spin text-primary" /> Aguardando banco...</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Sub-Views mapping
    const titleMap: Record<PaymentViewState, string> = {
        extrato: 'Extrato da Conta',
        split_options: 'Dividir Conta',
        split_by_products: 'Seu Consumo',
        split_equally: 'Dividir Igual',
        payment_methods: 'Pagamento',
        split_details: 'Valor Específico', // Old split UI repurposed
        receipt: 'Recibo'
    };

    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden text-slate-900 font-sans md:max-w-md md:mx-auto md:shadow-2xl md:border-x border-border/40">
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
            {!showReceipt && (
                <div className="flex items-center p-4 bg-card/80 backdrop-blur-md sticky top-0 z-20 border-b border-border/50">
                    <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-secondary/80 transition-colors text-foreground">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h2 className="flex-1 text-center font-bold text-lg tracking-tight mr-8">{titleMap[view]}</h2>
                </div>
            )}
            {!showReceipt && view === 'extrato' && renderExtratoView()}
            {!showReceipt && view === 'split_by_products' && renderSplitByProductsView()}
            {!showReceipt && view === 'split_equally' && renderSplitEquallyView()}
            {!showReceipt && view === 'split_details' && renderSplitSpecificValueView()}
            {!showReceipt && view === 'payment_methods' && renderPaymentMethodsView()}
            {!showReceipt && showSplitDrawer && renderSplitOptionsModal()}
            
            {showReceipt && (
                <div className="fixed inset-0 z-[60] bg-background overflow-y-auto animate-in slide-in-from-bottom duration-500 scrollbar-hide flex flex-col items-center">
                    <div className="min-h-full px-6 py-12 pb-24 flex flex-col items-center w-full max-w-sm">
                        {isFullyPaid && (<div className="w-full flex p-1 bg-slate-100 rounded-2xl mb-6 border border-border/50"><button onClick={() => setReceiptView('individual')} className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all ${receiptView === 'individual' ? 'bg-white shadow-sm text-primary' : 'text-slate-400'}`}><span className="text-[8px] font-black uppercase tracking-widest">Meu Recibo</span><span className="text-xs font-bold">R$ {(myLastPaidAmount || total).toFixed(2)}</span></button><button onClick={() => setReceiptView('summary')} className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all ${receiptView === 'summary' ? 'bg-white shadow-sm text-primary' : 'text-slate-400'}`}><span className="text-[8px] font-black uppercase tracking-widest">Resumo Mesa</span><span className="text-xs font-bold">R$ {total.toFixed(2)}</span></button></div>)}
                        <div ref={receiptRef} className="w-full bg-white rounded-t-[2.5rem] shadow-2xl border-x border-t border-border/50 overflow-hidden">
                            <div className="bg-primary pt-12 pb-10 px-8 text-center text-white relative"><div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" /><div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center border border-white/30 shadow-lg mx-auto mb-4"><Check className="w-8 h-8 text-white" /></div><h2 className="text-xl font-black uppercase tracking-tight leading-tight">{receiptView === 'individual' ? 'Pagamento Confirmado' : 'Mesa Liquidada'}</h2><p className="text-white/60 text-[8px] font-bold uppercase tracking-[0.2em] mt-1">{verificationCode || 'EZ-MOCK-ID'}</p></div>
                            <div className="p-8 space-y-8 bg-white"><div className="grid grid-cols-2 gap-6 pb-6 border-b border-dashed border-slate-100"><div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Mesa</span><p className="font-black text-slate-800">{localStorage.getItem('ez_menu_table_name') || 'M1'}</p></div><div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Data</span><p className="font-black text-slate-800">{new Date().toLocaleDateString('pt-BR')}</p></div></div>
                                {(receiptView === 'summary' || !isSplitMode) && (<div className="space-y-4"><div className="flex items-center gap-2"><span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Detalhamento</span></div><div className="space-y-3">{receiptDetails.payables.map((item: any) => (<div key={item.id} className="flex justify-between items-start text-xs"><span className="text-slate-700 font-bold">{item.quantity}x {item.name}</span><span className="font-black text-slate-900">R$ {item.totalPrice.toFixed(2)}</span></div>))}</div></div>)}
                                <div className="space-y-2 pt-4 border-t border-slate-100"><div className="flex justify-between text-xs font-black text-slate-400"><span>TOTAL MESA:</span><span>R$ {total.toFixed(2)}</span></div><div className="flex justify-between text-xs font-black text-primary"><span>{receiptView === 'individual' ? 'PAGO POR VOCÊ:' : 'TOTAL PAGO:'}</span><span className="text-sm font-black">R$ {receiptView === 'individual' ? (myLastPaidAmount || total).toFixed(2) : total.toFixed(2)}</span></div>{receiptView === 'individual' && remainingBalance > 0 && <div className="flex justify-between text-xs font-black text-slate-300 pt-1"><span>PENDENTE MESA:</span><span>R$ {remainingBalance.toFixed(2)}</span></div>}</div>
                            </div><div className="flex w-[120%] -ml-[10%] bg-white pb-2">{[...Array(24)].map((_, i) => (<div key={i} className="w-6 h-3 bg-slate-50 shrink-0" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />))}</div>
                        </div>
                        <div className="w-full grid grid-cols-2 gap-3 mt-8"><button onClick={async () => { if (!receiptRef.current) return; const canvas = await html2canvas(receiptRef.current, { // @ts-ignore
                                     scale: 2 }); const link = document.createElement('a'); link.href = canvas.toDataURL("image/png"); link.download = `comprovante.png`; link.click(); }} className="bg-white border border-slate-200 font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest active:scale-95"><Download className="w-4 h-4 text-primary" /> PDF</button><button onClick={() => { if (navigator.share) navigator.share({ title: 'EzMenu', text: 'Meu comprovante', url: window.location.href }); }} className="bg-white border border-slate-200 font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest active:scale-95"><Share2 className="w-4 h-4 text-primary" /> Share</button></div>
                        <div className="w-full mt-6 space-y-3">{remainingBalance > 0 ? (<button onClick={() => { setShowReceipt(false); setView('extrato'); setPixData(null); setIsConfirmed(false); }} className="w-full bg-slate-100 text-slate-500 font-black py-5 rounded-[2rem] uppercase tracking-widest text-xs active:scale-95">Voltar (Falta R$ {remainingBalance.toFixed(2)})</button>) : (<div className="space-y-4"><button onClick={async () => { const tableName = localStorage.getItem('ez_menu_table_name'); if (tableName) { await resetTableOrders(tableName); clearTableSession(); } onBack(); }} className="w-full bg-primary text-white font-black py-5 rounded-[2rem] shadow-xl shadow-primary/20 uppercase tracking-widest text-sm active:scale-95">Finalizar Acesso</button>{closingCountdown !== null && (<p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Expirando em {Math.floor(closingCountdown / 60)}:{(closingCountdown % 60).toString().padStart(2, '0')}</p>)}</div>)}</div>
                    </div>
                </div>
            )}
            {showWaiterModal && (<div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm" onClick={() => setShowWaiterModal(false)}><div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl z-10 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}><div className="bg-primary p-8 text-center text-white relative"><button className="absolute top-4 right-4 text-white/50" onClick={() => setShowWaiterModal(false)}><X className="w-6 h-6" /></button><div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/30">{requestType === 'machine' ? <CreditCard className="w-10 h-10" /> : <Bell className="w-10 h-10" />}</div><h3 className="text-xl font-black uppercase tracking-tight">Confirmar Chamado?</h3></div><div className="p-8 space-y-6"><p className="text-center text-slate-600 font-bold text-sm tracking-tight">{requestType === 'machine' ? 'Solicitar maquininha de cartão na mesa?' : 'Notificar garçom para atendimento agora?'}</p><button onClick={handleCallWaiterAction} className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg shadow-primary/25 active:scale-95 text-lg uppercase tracking-tight">SIM, SOLICITAR</button></div></div></div>)}
        </div>
    );
}
