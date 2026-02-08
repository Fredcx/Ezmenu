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
        isRoundLimitReached
    } = useOrder();

    const [note, setNote] = useState('');
    const [isAnimating, setIsAnimating] = useState(false);

    if (!item) return null;

    const targetId = isAlacarte ? `${item.id}-alacarte` : item.id;

    const quantity = cart
        .filter(i => i.id === targetId && i.addedBy === currentClientId)
        .reduce((acc, curr) => acc + curr.quantity, 0);

    const isBlocked = item.isRodizio && !isAlacarte && isRoundLimitReached && quantity === 0;

    const handleAdd = (customNote?: string) => {
        if (isBlocked) return;

        setIsAnimating(true);
        addToCart(item, currentClientId, isAlacarte, customNote || note);
        toast.success(`${item.name} adicionado!`, {
            duration: 1500,
            position: 'top-center'
        });
        setTimeout(() => setIsAnimating(false), 300);
        setNote('');
    };

    const handleRemove = () => {
        const itemInCart = cart.find(i => i.id === targetId && i.addedBy === currentClientId);
        if (itemInCart) {
            updateQuantity(targetId, currentClientId, itemInCart.quantity - 1);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-card border-border">
                {/* Close Button Overlay */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 z-50 p-2 bg-black/20 hover:bg-black/40 backdrop-blur-sm rounded-full text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

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
                        {(!item.isRodizio || isAlacarte) && (
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
                        onClick={() => {
                            if (quantity === 0) handleAdd();
                            onClose();
                        }}
                        disabled={isBlocked}
                        className={`flex-1 h-12 text-lg font-bold shadow-lg shadow-primary/20 ${quantity > 0 ? 'bg-secondary text-foreground hover:bg-secondary/80' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
                    >
                        {quantity > 0 ? 'Concluir' : 'Adicionar ao Pedido'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
