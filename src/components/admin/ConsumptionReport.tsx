import { useState } from 'react';
import { useInventory } from '@/contexts/InventoryContext';
import { Button } from '@/components/ui/button';
import { TrendingDown, Download, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import html2canvas from 'html2canvas';

export function ConsumptionReport() {
    const { consumptionHistory, inventoryItems, simulateHistory } = useInventory();
    const [selectedDays, setSelectedDays] = useState(15);
    const [open, setOpen] = useState(false);

    // Filter and Group Data
    const getGroupedData = () => {
        const now = new Date();
        const cutoffDate = new Date();
        cutoffDate.setDate(now.getDate() - selectedDays);

        const filtered = consumptionHistory.filter(log => new Date(log.date) >= cutoffDate);

        // Group by Date "YYYY-MM-DD"
        const groupedByDate: Record<string, typeof filtered> = {};

        filtered.forEach(log => {
            const dateStr = new Date(log.date).toLocaleDateString('pt-BR');
            if (!groupedByDate[dateStr]) {
                groupedByDate[dateStr] = [];
            }
            groupedByDate[dateStr].push(log);
        });

        // For each date, aggregate by ingredient
        const result = Object.entries(groupedByDate).map(([date, logs]) => {
            const ingredientTotals: Record<string, number> = {};

            logs.forEach(log => {
                ingredientTotals[log.ingredientId] = (ingredientTotals[log.ingredientId] || 0) + log.amount;
            });

            // Create full date object for weekday display
            const dateObj = new Date(logs[0].date);
            const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
            const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

            return {
                dateDisplay: `${formattedDate} - ${weekday.charAt(0).toUpperCase() + weekday.slice(1)}`,
                timestamp: dateObj.getTime(),
                items: Object.entries(ingredientTotals).map(([ingId, amount]) => {
                    const ing = inventoryItems.find(i => i.id === ingId);
                    return {
                        name: ing?.name || 'Item Desconhecido',
                        amount,
                        unit: ing?.unit || ''
                    };
                })
            };
        });

        return result.sort((a, b) => b.timestamp - a.timestamp); // Newest first
    };

    // Calculate Overall Summary and Busiest Day
    const calculateAnalytics = (groupedData: ReturnType<typeof getGroupedData>) => {
        const summary: Record<string, number> = {};
        let busiestDay = { date: '', totalItems: 0 };

        groupedData.forEach(day => {
            // Track busiest day by volume of items
            if (day.items.length > busiestDay.totalItems) {
                busiestDay = { date: day.dateDisplay, totalItems: day.items.length };
            }

            // Aggregate totals
            day.items.forEach(item => {
                const key = `${item.name}|${item.unit}`;
                summary[key] = (summary[key] || 0) + item.amount;
            });
        });

        // Convert summary to array
        const summaryList = Object.entries(summary).map(([key, amount]) => {
            const [name, unit] = key.split('|');
            return { name, amount, unit };
        }).sort((a, b) => b.amount - a.amount);

        return { summaryList, busiestDay };
    };

    const reportData = getGroupedData();
    const { summaryList, busiestDay } = calculateAnalytics(reportData);

    const handleExport = async () => {
        const element = document.getElementById('consumption-report-content');
        if (!element) return;

        try {
            const canvas = await html2canvas(element, {
                scale: 2
            } as any);

            const link = document.createElement('a');
            link.download = `relatorio-consumo-${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Erro ao exportar:', err);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <TrendingDown className="w-4 h-4 text-orange-500" />
                    Relatório de Consumo
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="p-6 border-b pb-4 bg-background z-10">
                    <DialogTitle className="text-2xl font-bold flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                            <TrendingDown className="w-6 h-6 text-orange-500" />
                            Histórico de Consumo
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={inventoryItems.length > 0 ? () => simulateHistory() : undefined} className="text-muted-foreground hidden md:flex">
                                🎲 Simular
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2 hidden md:flex">
                                <Download className="w-4 h-4" />
                                Baixar PNG
                            </Button>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 bg-secondary/5">
                    <div className="space-y-6" id="consumption-report-content">
                        {/* Header for Export Capture */}
                        <div className="bg-background rounded-xl p-6 shadow-sm border border-border/50">
                            <div className="flex justify-between items-center mb-8">
                                <div className="space-y-1">
                                    <h3 className="font-bold text-xl text-foreground">Resumo do Período</h3>
                                    <p className="text-sm text-muted-foreground">Análise consolidada dos últimos {selectedDays} dias.</p>
                                </div>
                                <div className="flex gap-2 bg-secondary/30 p-1.5 rounded-lg">
                                    {[7, 15, 30].map(days => (
                                        <button
                                            key={days}
                                            onClick={() => setSelectedDays(days)}
                                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${selectedDays === days
                                                ? 'bg-primary text-primary-foreground shadow-sm'
                                                : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                                                }`}
                                        >
                                            Últimos {days} dias
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Analytics Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 dark:bg-orange-500/10 dark:border-orange-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="p-2 bg-orange-100 rounded-lg text-orange-600 dark:bg-orange-500/20">
                                            <TrendingDown className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-semibold text-orange-800 dark:text-orange-200 uppercase tracking-wide">Dia de Maior Consumo</span>
                                    </div>
                                    <h4 className="text-2xl font-black text-foreground mt-2">{busiestDay.date || '-'}</h4>
                                    <p className="text-sm text-muted-foreground mt-1">{busiestDay.totalItems} itens movimentados neste dia.</p>
                                </div>

                                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600 dark:bg-blue-500/20">
                                            <Calendar className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-semibold text-blue-800 dark:text-blue-200 uppercase tracking-wide">Total no Período</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {summaryList.slice(0, 3).map((item, idx) => (
                                            <span key={idx} className="inline-flex items-center px-2 py-1 rounded bg-background border text-xs font-bold">
                                                {item.name}: {item.amount.toLocaleString('pt-BR')}{item.unit}
                                            </span>
                                        ))}
                                        {summaryList.length > 3 && <span className="text-xs text-muted-foreground flex items-center">+{summaryList.length - 3} outros</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="relative border-l-2 border-primary/20 ml-4 space-y-10 pb-4 pt-2">
                                {reportData.length === 0 ? (
                                    <div className="pl-8 py-8 text-center text-muted-foreground italic bg-secondary/10 rounded-lg mx-4 border border-dashed border-border">
                                        Nenhum consumo registrado neste período.
                                    </div>
                                ) : (
                                    reportData.map((day, idx) => {
                                        const isBusiest = day.dateDisplay === busiestDay.date;
                                        return (
                                            <div key={idx} className="relative pl-8 animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                                                {/* Timeline Dot */}
                                                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 ring-4 ring-background z-10 ${isBusiest ? 'bg-orange-500 border-orange-600' : 'bg-background border-primary'}`} />

                                                <div className="mb-4 flex items-center gap-3">
                                                    <h3 className={`text-lg font-bold ${isBusiest ? 'text-orange-600' : 'text-foreground'}`}>
                                                        {day.dateDisplay}
                                                    </h3>
                                                    {isBusiest && (
                                                        <span className="text-[10px] font-bold text-white px-2 py-0.5 bg-orange-500 rounded-full animate-pulse">
                                                            MAIOR FLUXO
                                                        </span>
                                                    )}
                                                    {!isBusiest && (
                                                        <span className="text-[10px] font-medium text-muted-foreground px-2 py-0.5 bg-secondary rounded-full border border-border">
                                                            {day.items.length} itens
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {day.items.map((item, i) => (
                                                        <div key={i} className="flex justify-between items-center p-4 bg-background rounded-xl border border-transparent shadow-sm hover:shadow-md hover:border-primary/20 transition-all group">
                                                            <span className="font-medium text-sm text-foreground/90">{item.name}</span>
                                                            <span className="font-mono font-bold text-red-600 bg-red-50 text-xs px-2 py-1 rounded-md group-hover:bg-red-100 transition-colors">
                                                                -{item.amount.toLocaleString('pt-BR')} {item.unit}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Footer for Export */}
                        <div className="text-center text-xs text-muted-foreground pt-4 border-t border-dashed">
                            Relatório gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
