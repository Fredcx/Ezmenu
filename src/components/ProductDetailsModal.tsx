import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MenuItem, useOrder } from '@/contexts/OrderContext';
import { Minus, Plus, ChefHat, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { Textarea } from "@/components/ui/textarea";

interface ProductDetailsModalProps {
    item: MenuItem | null;
    isOpen: boolean;
    onClose: () => void;
    isAlacarte?: boolean;
}

export function ProductDetailsModal({ item, isOpen, onClose, isAlacarte = false }: ProductDetailsModalProps) {
    const {
        cart,
        addToCart,
        updateQuantity,
        currentClientId,
        isRoundLimitReached,
        isTableOccupiedByMe
    } = useOrder();

    const [note, setNote] = useState('');
    const [isAnimating, setIsAnimating] = useState(false);

    if (!item) return null;

    const targetId = isAlacarte ? `${item.id}-alacarte` : item.id;

    const quantity = cart
        .filter(i => i.id === targetId && i.addedBy === currentClientId)
        .reduce((acc, curr) => acc + curr.quantity, 0);

    const displayAsRodizio = !isAlacarte && item.isRodizio;
    const isBlocked = displayAsRodizio && isRoundLimitReached && quantity === 0;

    const [showUpsell, setShowUpsell] = useState(false);

    // Dynamic upsell item picking logic based on user's selected category
    // In a real app we would use cross-sell DB data. For MVP, we suggest a drink or dessert.
    const getUpsellSuggestion = () => {
        if (!item) return null;
        if (item.category === 'bebidas' || item.category === 'vinhos' || item.category === 'drinks') {
            return {
                id: 'upsell-sobremesa-temp', name: 'Mochi Gelado de Morango',
                price: 18.90, image: 'https://images.unsplash.com/photo-1563805042-7684c8a9e9ce?w=300&h=200&fit=crop',
                category: 'sobremesa', isRodizio: false, description: 'Doce japonês recheado com sorvete de morango.', code: 'upsell1'
            } as MenuItem;
        } else {
            return {
                id: 'upsell-bebida-temp', name: 'Refrigerante Laranja 350ml',
                price: 8.00, image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=300&h=200&fit=crop',
                category: 'bebidas', isRodizio: false, description: 'Bebida bem gelada para acompanhar.', code: 'upsell2'
            } as MenuItem;
        }
    };
    const upsellItem = getUpsellSuggestion();

    const handleAdd = (customNote?: string) => {
        if (isTableOccupiedByMe === false && item.category !== 'system') {
            toast.error('Ocupe a mesa na tela inicial para fazer pedidos!', {
                description: 'Você está no modo visualização.',
                duration: 4000
            });
            return;
        }

        if (isBlocked) return;

        setIsAnimating(true);
        const added = addToCart(item, currentClientId, isAlacarte, customNote || note);
        if (added) {
            toast.success(`${item.name} adicionado!`, {
                duration: 1500,
                position: 'top-center'
            });
            setNote('');
        }
        setTimeout(() => setIsAnimating(false), 300);
    };

    const handleConfirmUpsell = () => {
        // Add original item
        handleAdd();
        // Add upsell item
        if (upsellItem) {
            addToCart(upsellItem, currentClientId, true, '[Upsell]');
            toast.success(`${upsellItem.name} adicionado!`);
        }
        setShowUpsell(false);
        onClose();
    };

    const handleDeclineUpsell = () => {
        handleAdd();
        setShowUpsell(false);
        onClose();
    };

    const handleRemove = () => {
        const itemInCart = cart.find(i => i.id === targetId && i.addedBy === currentClientId);
        if (itemInCart) {
            updateQuantity(targetId, currentClientId, itemInCart.quantity - 1);
        }
    };

    const handleAddOrUpsell = () => {
        if (quantity > 0) {
           onClose();
           return;
        }
        // Only trigger upsell logic if it's alacarte or if we're not repeating
        if (isAlacarte && !showUpsell && upsellItem) {
           setShowUpsell(true);
        } else {
           handleAdd();
           onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                setShowUpsell(false);
                onClose();
            }
        }}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-card border-border">
                {/* Close Button Overlay */}
                <button
                    onClick={() => { setShowUpsell(false); onClose(); }}
                    className="absolute right-4 top-4 z-50 p-2 bg-black/20 hover:bg-black/40 backdrop-blur-sm rounded-full text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {!showUpsell ? (
                <>
                {/* Hero Image */}
                <div className="relative h-64 w-full bg-secondary shrink-0">
                    <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent opacity-80" />

                    <div className="absolute bottom-0 left-0 right-0 p-6">
                        <h2 className="text-3xl font-bold text-foreground leading-tight shadow-black/50 drop-shadow-sm">
                            {item.name}
                        </h2>
                        {!displayAsRodizio && (
                            <p className="text-xl font-bold text-primary mt-1">
                                R$ {item.price.toFixed(2)}
                            </p>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 pb-6 space-y-6 max-h-[60vh] overflow-y-auto">
                    {/* Description */}
                    <div className="space-y-4">
                        <p className="text-muted-foreground leading-relaxed text-lg">
                            {item.description}
                        </p>
                    </div>

                    {/* Observations */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2 text-foreground">
                            <ChefHat className="w-4 h-4 text-primary" />
                            Alguma observação ou restrição?
                        </label>
                        <Textarea
                            placeholder="Ex: Intolerante à lactose, sem cream cheese..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="resize-none bg-secondary/30 border-border"
                            rows={3}
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-secondary/30 border-t border-border flex items-center justify-between gap-4">
                    {quantity > 0 ? (
                        <div className="flex items-center bg-background rounded-xl border border-border shadow-sm overflow-hidden h-12 flex-1 max-w-[140px]">
                            <button
                                onClick={handleRemove}
                                className="w-12 h-full flex items-center justify-center text-primary hover:bg-secondary transition-colors"
                            >
                                <Minus className="w-5 h-5" />
                            </button>
                            <span className="flex-1 text-center font-bold text-lg">{quantity}</span>
                            <button
                                onClick={() => handleAdd()}
                                disabled={isBlocked}
                                className="w-12 h-full flex items-center justify-center bg-primary text-primary-foreground hover:brightness-110 transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <div />
                    )}

                    <Button
                        onClick={handleAddOrUpsell}
                        disabled={isBlocked}
                        className={`flex-1 h-12 text-lg font-bold shadow-lg shadow-primary/20 ${quantity > 0 ? 'bg-secondary text-foreground hover:bg-secondary/80' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
                    >
                        {quantity > 0 ? 'Concluir' : 'Adicionar ao Pedido'}
                    </Button>
                </div>
                </>
                ) : (
                /* UPSELL SCREEN */
                <div className="flex flex-col h-[500px] animate-in slide-in-from-right-4 duration-300">
                     <div className="flex-1 overflow-y-auto pb-6">
                        <div className="relative h-48 w-full shrink-0">
                            <img src={upsellItem?.image} alt={upsellItem?.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                        </div>
                        <div className="px-6 text-center -mt-6 relative z-10 space-y-4">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest">
                                <AlertCircle className="w-3.5 h-3.5" /> Recomendações
                            </div>
                            <h2 className="text-2xl font-black text-foreground leading-tight">
                                Que tal acompanhar com <span className="text-primary">{upsellItem?.name}</span>?
                            </h2>
                            <p className="text-muted-foreground text-sm font-medium">
                                Apenas R$ {upsellItem?.price.toFixed(2)}
                            </p>
                        </div>
                     </div>
                     <div className="p-4 border-t border-border bg-secondary/30 flex gap-3">
                         <Button onClick={handleDeclineUpsell} variant="outline" className="flex-1 h-12 font-bold text-muted-foreground border-border break-words whitespace-normal text-xs leading-tight">
                             Não, obrigado
                         </Button>
                         <Button onClick={handleConfirmUpsell} className="flex-1 h-12 font-black bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 break-words whitespace-normal text-xs leading-tight">
                             Adicionar
                         </Button>
                     </div>
                </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
