import { useState } from 'react';
import { useInventory, InventoryItem } from '@/contexts/InventoryContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

interface AddIngredientDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
}

export function AddIngredientDialog({ open, onOpenChange, trigger }: AddIngredientDialogProps) {
    const { addIngredient } = useInventory();
    const [isOpen, setIsOpen] = useState(false);

    // Internal state management if props not provided
    const show = open !== undefined ? open : isOpen;
    const setShow = onOpenChange || setIsOpen;

    const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
        name: '', category: '', unit: 'g', quantity: 0, minThreshold: 1000
    });

    const handleCreateIngredient = () => {
        if (!newItem.name || !newItem.category) {
            toast.error('Preencha nome e categoria!');
            return;
        }

        const id = newItem.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now().toString().slice(-4);
        addIngredient({
            id,
            name: newItem.name,
            category: newItem.category,
            unit: newItem.unit || 'g',
            quantity: Number(newItem.quantity) || 0,
            minThreshold: Number(newItem.minThreshold) || 500
        });

        setShow(false);
        setNewItem({ name: '', category: '', unit: 'g', quantity: 0, minThreshold: 1000 });
        toast.success("Insumo criado com sucesso!");
    };

    return (
        <Dialog open={show} onOpenChange={setShow}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Cadastrar Novo Insumo</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome do Insumo</Label>
                        <Input
                            placeholder="Ex: Salmão Premium, Arroz..."
                            value={newItem.name}
                            onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Categoria</Label>
                            <Input
                                placeholder="Peixes, Grãos, Latas..."
                                value={newItem.category}
                                onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unidade</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={newItem.unit}
                                onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                            >
                                <option value="g">Gramas (g)</option>
                                <option value="kg">Quilogramas (kg)</option>
                                <option value="ml">Mililitros (ml)</option>
                                <option value="l">Litros (l)</option>
                                <option value="un">Unidade (un)</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estoque Inicial</Label>
                            <Input
                                type="number"
                                value={newItem.quantity || ''}
                                onChange={e => setNewItem({ ...newItem, quantity: e.target.value === '' ? 0 : Number(e.target.value) })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estoque Mínimo (Alerta)</Label>
                            <Input
                                type="number"
                                value={newItem.minThreshold || ''}
                                onChange={e => setNewItem({ ...newItem, minThreshold: e.target.value === '' ? 0 : Number(e.target.value) })}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShow(false)}>Cancelar</Button>
                    <Button onClick={handleCreateIngredient}>Salvar Insumo</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
