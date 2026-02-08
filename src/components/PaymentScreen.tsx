import { ArrowLeft, CreditCard, Smartphone, Terminal, Bell, Users, UserPlus, X, Check, Wallet, SmartphoneNfc, Receipt, Fish, Utensils, ChevronRight, Copy, QrCode, Loader2 } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useOrder } from '@/contexts/OrderContext';
import { supabase } from '@/lib/supabase';

interface PaymentScreenProps {
    onBack: () => void;
    total: number;
}

export function PaymentScreen({ onBack, total }: PaymentScreenProps) {
    const { sentOrders, cart } = useOrder();
    const [step, setStep] = useState<'receipt' | 'payment'>('receipt');
    const [showWaiterModal, setShowWaiterModal] = useState(false);
    const [requestType, setRequestType] = useState<'waiter' | 'machine'>('waiter');

    // Pix Specific State
    const [paymentStep, setPaymentStep] = useState<'selection' | 'pix_form' | 'pix_qr'>('selection');
    const [email, setEmail] = useState('');
    const [cpf, setCpf] = useState('');
    const [isLoadingPix, setIsLoadingPix] = useState(false);
    const [pixData, setPixData] = useState<{ text: string, url: string, expiration: string } | null>(null);

    // Merge cart (un-sent) and sentOrders to show full bill simulation
    const allItems = useMemo(() => [...sentOrders, ...cart], [sentOrders, cart]);

    const allPaid = useMemo(() => {
        if (sentOrders.length === 0) return false;
        return sentOrders.every(order => order.status === 'completed');
    }, [sentOrders]);

    useEffect(() => {
        if (allPaid && paymentStep === 'pix_qr') {
            toast.success("Pagamento confirmado com sucesso!");
        }
    }, [allPaid, paymentStep]);

    const handleGeneratePix = async () => {
        if (!email || !cpf) {
            toast.error("Por favor, preencha E-mail e CPF para gerar o Pix.");
            setPaymentStep('pix_form');
            return;
        }

        setIsLoadingPix(true);
        try {
            const userName = localStorage.getItem('ez_menu_user_name') || 'Cliente';
            const userPhone = localStorage.getItem('ez_menu_user_phone') || '11999999999';

            // Invoke Edge Function
            const { data, error } = await supabase.functions.invoke('process-payment', {
                body: {
                    order_id: `TABLE-${localStorage.getItem('ez_menu_table_name') || 'MESA'}-${Date.now()}`,
                    amount: total,
                    payment_method: 'pix',
                    customer: {
                        name: userName,
                        phone: userPhone,
                        email: email,
                        document: cpf.replace(/\D/g, '')
                    }
                }
            });

            if (error) throw error;
            if (data.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));

            setPixData({
                text: data.pix_qr_code,
                url: data.pix_qr_code_url,
                expiration: data.pix_expiration_date
            });
            setPaymentStep('pix_qr');
            toast.success("Pix gerado com sucesso!");
        } catch (error: any) {
            console.error("Erro ao gerar Pix:", error);
            toast.error("Erro ao gerar Pix. Verifique se o CPF é válido.");
        } finally {
            setIsLoadingPix(false);
        }
    };

    const receiptDetails = useMemo(() => {
        const payables: any[] = [];
        const included: any[] = [];

        // Helper to group items by ID
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
        const rawIncluded = allItems.filter(i => i.isRodizio && i.category !== 'system');

        return {
            payables: groupItems(rawPayables),
            included: groupItems(rawIncluded)
        };
    }, [allItems]);

    const handleCallWaiter = async () => {
        try {
            const myName = 'Cliente'; // In a real app, get from session/auth
            const tableId = localStorage.getItem('ez_menu_table_name') || 'MESA';

            const { error } = await supabase.from('service_requests').insert({
                type: requestType,
                status: 'pending',
                table_id: tableId,
                user_name: myName
            });

            if (error) throw error;

            toast.success(requestType === 'machine' ? 'Solicitação de maquininha enviada!' : 'Garçom chamado com sucesso! Aguarde um momento.', {
                position: 'top-center',
                duration: 3000,
            });
            setShowWaiterModal(false);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao chamar serviço");
        }
    };

    const handleBack = () => {
        if (paymentStep === 'pix_qr') {
            setPaymentStep('selection');
            setPixData(null);
        } else if (paymentStep === 'pix_form') {
            setPaymentStep('selection');
        } else if (step === 'payment') {
            setStep('receipt');
        } else {
            onBack();
        }
    };

    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                    backgroundSize: '24px 24px'
                }}>
            </div>

            {/* Header */}
            <div className="flex items-center p-6 z-10 border-b border-border/40 bg-background/80 backdrop-blur-md">
                <button onClick={handleBack} className="p-3 -ml-3 hover:bg-secondary/50 rounded-full transition-colors active:scale-95">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="ml-2">
                    <h1 className="text-xl font-bold tracking-tight">
                        {step === 'receipt' ? 'Extrato da Conta' : 'Pagamento'}
                    </h1>
                    {step === 'payment' && (
                        <span className="text-xs text-muted-foreground font-medium">
                            Total: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    )}
                </div>
            </div>

            {/* STEP 1: RECEIPT VIEW */}
            {step === 'receipt' && (
                <>
                    <div className="flex-1 px-6 py-6 pb-48 overflow-y-auto z-10 scrollbar-hide">
                        <div className="bg-card rounded-3xl shadow-sm border border-border/50 overflow-hidden relative mb-6">
                            {/* Visual "Tear" effect top */}
                            <div className="h-2 bg-gradient-to-r from-transparent via-border/20 to-transparent opacity-50" />

                            <div className="p-6 space-y-6">
                                {/* Bill Items */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs border-b border-border/50 pb-3">
                                        <Receipt className="w-4 h-4" />
                                        Detalhes do Consumo
                                    </div>

                                    {receiptDetails.payables.length > 0 ? (
                                        <div className="space-y-3">
                                            {receiptDetails.payables.map((item: any) => (
                                                <div key={item.id} className="flex justify-between items-start text-sm group">
                                                    <div className="flex gap-3">
                                                        <span className="font-bold text-muted-foreground w-6 text-right tabular-nums">{item.quantity}x</span>
                                                        <span className="font-medium text-foreground group-hover:text-primary transition-colors">{item.name}</span>
                                                    </div>
                                                    <span className="font-bold text-foreground tabular-nums">
                                                        R$ {item.totalPrice.toFixed(2)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic pl-2 border-l-2 border-muted">Nenhum item cobrado.</p>
                                    )}
                                </div>

                                {/* Included Items (Rodizio) */}
                                {receiptDetails.included.length > 0 && (
                                    <div className="space-y-4 pt-2">
                                        <div className="flex items-center gap-2 text-muted-foreground/70 font-bold uppercase tracking-widest text-xs border-b border-border/30 pb-2">
                                            <Fish className="w-4 h-4" />
                                            Incluso no Rodízio
                                        </div>
                                        <div className="space-y-2 pl-2 border-l-2 border-border/30">
                                            {receiptDetails.included.map((item: any) => (
                                                <div key={item.id} className="flex justify-between items-start text-xs text-muted-foreground">
                                                    <div className="flex gap-3">
                                                        <span className="font-medium w-6 text-right tabular-nums">{item.quantity}x</span>
                                                        <span>{item.name}</span>
                                                    </div>
                                                    <span className="font-medium text-muted-foreground/50 uppercase text-[9px] tracking-wider border border-border/50 px-1.5 rounded-md">
                                                        Incluso
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Divider with cut effect */}
                                <div className="relative h-px bg-border/50 my-4">
                                    <div className="absolute left-0 -top-1.5 w-3 h-3 bg-background rounded-full border border-border/50" />
                                    <div className="absolute right-0 -top-1.5 w-3 h-3 bg-background rounded-full border border-border/50" />
                                </div>

                                {/* Total Section - Redesigned */}
                                <div className="space-y-1 pt-2">
                                    <div className="flex justify-between items-center text-primary">
                                        <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Total a Pagar</span>
                                        <div className="flex items-center gap-1">
                                            <span className="text-xl font-bold">R$</span>
                                            <span className="text-4xl font-extrabold tracking-tight tabular-nums">
                                                {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Pagar - Lifted to clear BtmNav */}
                    <div className="absolute bottom-[80px] left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent z-20">
                        <button
                            onClick={() => setStep('payment')}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-primary/25"
                        >
                            Prosseguir para Pagamento
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </>
            )}

            {/* STEP 2: PAYMENT METHODS */}
            {step === 'payment' && (
                <>
                    <div className="flex-1 px-6 py-6 pb-48 overflow-y-auto z-10 scrollbar-hide animate-in slide-in-from-right duration-300">
                        <div className="space-y-6">

                            <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm flex flex-col items-center justify-center text-center space-y-2">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Valor Final</span>
                                <div className="flex items-center gap-1 text-primary">
                                    <span className="text-xl font-bold">R$</span>
                                    <span className="text-4xl font-extrabold tracking-tight tabular-nums">
                                        {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-bold text-lg px-1 flex items-center gap-2">
                                    <Wallet className="w-5 h-5 text-primary" />
                                    {paymentStep === 'selection' ? 'Escolha a forma de pagamento' :
                                        paymentStep === 'pix_form' ? 'Dados para o Pix' : 'Pague com Pix'}
                                </h3>

                                <div className="grid grid-cols-1 gap-3">
                                    {paymentStep === 'selection' && (
                                        <>
                                            {/* Pix */}
                                            <button
                                                onClick={() => setPaymentStep('pix_form')}
                                                className="group flex items-center gap-4 p-4 rounded-2xl bg-white border border-border shadow-sm active:scale-[0.98] transition-all hover:border-emerald-500/50 hover:shadow-emerald-500/10"
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                                                    <img src="/pix-icon.png" alt="Pix" className="w-7 h-7 object-contain" />
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <h4 className="font-bold text-foreground group-hover:text-emerald-700 transition-colors">Pix</h4>
                                                    <p className="text-xs text-muted-foreground">Aprovação imediata</p>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-muted-foreground opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                            </button>

                                            {/* Card Machine */}
                                            <button
                                                onClick={() => {
                                                    setRequestType('machine');
                                                    setShowWaiterModal(true);
                                                }}
                                                className="group flex items-center gap-4 p-4 rounded-2xl bg-white border border-border shadow-sm active:scale-[0.98] transition-all hover:border-primary/50 hover:shadow-primary/10"
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                                                    <CreditCard className="w-6 h-6 text-primary" />
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">Cartão (Maquininha)</h4>
                                                    <p className="text-xs text-muted-foreground">Chamar garçom</p>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-muted-foreground opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                            </button>

                                            <div className="grid grid-cols-2 gap-3 mt-2">
                                                {/* Apple Pay */}
                                                <button className="group bg-card hover:bg-black hover:text-white border border-border shadow-sm rounded-2xl p-4 transition-all duration-300 active:scale-[0.98] flex flex-col items-center justify-center gap-2">
                                                    <div className="w-10 h-10 rounded-full bg-secondary group-hover:bg-white/20 flex items-center justify-center transition-colors">
                                                        <SmartphoneNfc className="w-5 h-5" />
                                                    </div>
                                                    <span className="font-bold text-sm">Apple Pay</span>
                                                </button>

                                                {/* Google Pay */}
                                                <button className="group bg-card hover:bg-black hover:text-white border border-border shadow-sm rounded-2xl p-4 transition-all duration-300 active:scale-[0.98] flex flex-col items-center justify-center gap-2">
                                                    <div className="w-10 h-10 rounded-full bg-secondary group-hover:bg-white/20 flex items-center justify-center transition-colors">
                                                        <Wallet className="w-5 h-5" />
                                                    </div>
                                                    <span className="font-bold text-sm">Google Pay</span>
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {paymentStep === 'pix_form' && (
                                        <div className="space-y-4 p-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">E-mail para recibo</label>
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={e => setEmail(e.target.value)}
                                                    placeholder="seu@email.com"
                                                    className="w-full h-14 rounded-2xl bg-white border border-border px-4 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">CPF (Obrigatório para Pix)</label>
                                                <input
                                                    type="tel"
                                                    value={cpf}
                                                    onChange={e => {
                                                        const v = e.target.value.replace(/\D/g, '').substring(0, 11);
                                                        setCpf(v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4"));
                                                    }}
                                                    placeholder="000.000.000-00"
                                                    className="w-full h-14 rounded-2xl bg-white border border-border px-4 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                                />
                                            </div>
                                            <button
                                                onClick={handleGeneratePix}
                                                disabled={isLoadingPix}
                                                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold h-14 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 mt-4"
                                            >
                                                {isLoadingPix ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <>Gerar Código Pix <ChevronRight className="w-5 h-5" /></>
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    {paymentStep === 'pix_qr' && pixData && (
                                        <div className="space-y-6 flex flex-col items-center animate-in zoom-in-95 duration-300">
                                            {allPaid ? (
                                                <div className="flex flex-col items-center space-y-4 py-8 animate-in zoom-in duration-500">
                                                    <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                                        <Check className="w-12 h-12 text-emerald-600" />
                                                    </div>
                                                    <div className="text-center space-y-2">
                                                        <h4 className="text-2xl font-bold text-emerald-700">Pagamento Confirmado</h4>
                                                        <p className="text-muted-foreground">Seu pedido já foi liberado na cozinha.</p>
                                                    </div>
                                                    <button
                                                        onClick={onBack}
                                                        className="mt-6 bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-emerald-600 transition-all active:scale-95"
                                                    >
                                                        Voltar ao Início
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="bg-white p-4 rounded-[2rem] shadow-xl border border-emerald-100 ring-8 ring-emerald-50">
                                                        <img src={pixData.url} alt="QR Code Pix" className="w-48 h-48" />
                                                    </div>

                                                    <div className="w-full space-y-3">
                                                        <div className="text-center">
                                                            <p className="text-sm font-medium text-muted-foreground">Ou use o Copia e Cola:</p>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(pixData.text);
                                                                toast.success("Código copiado!");
                                                            }}
                                                            className="w-full bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between group hover:bg-emerald-100 transition-colors"
                                                        >
                                                            <span className="text-xs font-mono truncate mr-4">{pixData.text}</span>
                                                            <Copy className="w-4 h-4 shrink-0" />
                                                        </button>

                                                        <div className="flex items-center gap-2 justify-center text-[10px] text-muted-foreground uppercase tracking-widest bg-muted/30 py-2 rounded-full px-4">
                                                            <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
                                                            Aguardando confirmação...
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sticky Call Waiter Button - Lifted to clear BtmNav */}
                    <div className="absolute bottom-[80px] left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent z-20">
                        <button
                            onClick={() => {
                                setRequestType('waiter');
                                setShowWaiterModal(true);
                            }}
                            className="w-full bg-secondary/80 hover:bg-secondary text-secondary-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 border border-border/50 backdrop-blur-sm"
                        >
                            <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center shadow-sm">
                                <Bell className="w-4 h-4 text-primary" />
                            </div>
                            Chamar Garçom (Ajuda)
                        </button>
                    </div>
                </>
            )}

            {/* Waiter Modal Overlay */}
            {showWaiterModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-in fade-in duration-300">
                    <div className="bg-background w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-300 border border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-orange-500 to-primary" />

                        <div className="text-center space-y-6">
                            <div className="w-20 h-20 bg-gradient-to-tr from-primary/20 to-orange-500/20 rounded-full flex items-center justify-center mx-auto ring-4 ring-background shadow-inner">
                                <Bell className="w-8 h-8 text-primary" />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold tracking-tight">Chamar Garçom?</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    {requestType === 'machine'
                                        ? <>Um atendente levará a <strong>maquininha</strong> até a mesa <strong>{localStorage.getItem('ez_menu_table_name') || 'Sua Mesa'}</strong>.</>
                                        : <>Um atendente irá até a mesa <strong>{localStorage.getItem('ez_menu_table_name') || 'Sua Mesa'}</strong> para lhe auxiliar.</>
                                    }
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <button
                                    onClick={handleCallWaiter}
                                    className="w-full bg-primary text-primary-foreground font-bold text-lg py-4 rounded-2xl hover:brightness-110 shadow-lg shadow-primary/25 transition-all active:scale-95"
                                >
                                    Confirmar
                                </button>
                                <button
                                    onClick={() => setShowWaiterModal(false)}
                                    className="w-full bg-secondary/80 text-secondary-foreground font-semibold py-4 rounded-2xl hover:bg-secondary transition-colors"
                                >
                                    Agora não
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
