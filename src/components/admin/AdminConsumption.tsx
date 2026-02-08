import { useState } from 'react';
import { useInventory } from '@/contexts/InventoryContext';
import { Button } from '@/components/ui/button';
import { TrendingDown, Download, Calendar, Package, AlertTriangle } from 'lucide-react';
import html2canvas from 'html2canvas';

export function AdminConsumption() {
    const { consumptionHistory, inventoryItems, simulateHistory, updateItem } = useInventory();
    const [selectedDays, setSelectedDays] = useState(15);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [expandedAlerts, setExpandedAlerts] = useState<Record<string, boolean>>({});

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

            const items = Object.entries(ingredientTotals).map(([ingId, amount]) => {
                const ing = inventoryItems.find(i => i.id === ingId);
                const isOverAverage = ing?.dailyAverage ? amount > ing.dailyAverage : false;
                return {
                    id: ingId,
                    name: ing?.name || 'Item Desconhecido',
                    amount,
                    unit: ing?.unit || '',
                    dailyAverage: ing?.dailyAverage,
                    isOverAverage
                };
            });

            const alertsCount = items.filter(i => i.isOverAverage).length;

            return {
                dateDisplay: `${formattedDate} - ${weekday.charAt(0).toUpperCase() + weekday.slice(1)}`,
                timestamp: dateObj.getTime(),
                items,
                alertsCount
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
                scale: 2,
                backgroundColor: null // Transparent background
            } as any);

            const link = document.createElement('a');
            link.download = `relatorio-consumo-${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Erro ao exportar:', err);
        }
    };

    const toggleAlert = (dateKey: string) => {
        setExpandedAlerts(prev => ({
            ...prev,
            [dateKey]: !prev[dateKey]
        }));
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Relatório de Consumo
                    </h1>
                    <p className="text-muted-foreground mt-2 text-lg">
                        Acompanhe o fluxo de saída de insumos da cozinha com inteligência.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button
                        variant="secondary"
                        onClick={() => setIsSettingsOpen(true)}
                        className="bg-secondary/50 hover:bg-secondary text-secondary-foreground shadow-sm backdrop-blur-sm transition-all hover:scale-105"
                    >
                        ⚙️ Definir Média
                    </Button>
                    <Button variant="ghost" size="sm" onClick={inventoryItems.length > 0 ? () => simulateHistory() : undefined} className="text-muted-foreground hidden md:flex hover:text-foreground transition-colors">
                        🎲 Simular
                    </Button>
                    <Button variant="outline" onClick={handleExport} className="gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all shadow-sm hover:shadow-md">
                        <Download className="w-4 h-4" />
                        Baixar PNG
                    </Button>
                </div>
            </div>

            {/* Settings Dialog - Ultra Prime Blur */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-background/95 border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col m-4 animate-in zoom-in-95 duration-300 ring-1 ring-white/5">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-secondary/20 to-transparent">
                            <div>
                                <h2 className="text-2xl font-bold text-foreground">Definir Média Diária</h2>
                                <p className="text-sm text-muted-foreground mt-1">Configure os limites para alertas inteligentes.</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(false)} className="rounded-full hover:bg-white/10">✕</Button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {inventoryItems.map(item => (
                                    <div key={item.id} className="group flex items-center justify-between p-4 rounded-xl border border-border/40 bg-card/40 hover:bg-card/80 transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
                                        <div className="space-y-1">
                                            <p className="font-semibold text-base text-foreground group-hover:text-primary transition-colors">{item.name}</p>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary/50 text-[10px] font-medium text-muted-foreground border border-white/5 uppercase tracking-wider">
                                                {item.category}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 bg-background/50 p-1.5 rounded-lg border border-white/5 group-hover:border-primary/20 transition-colors">
                                            <input
                                                type="number"
                                                className="w-24 h-9 rounded-md bg-transparent px-3 text-sm text-right font-mono focus:outline-none focus:ring-0 placeholder:text-muted-foreground/30"
                                                placeholder="0"
                                                defaultValue={item.dailyAverage || ''}
                                                onBlur={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    if (!isNaN(val)) {
                                                        updateItem(item.id, { dailyAverage: val });
                                                    }
                                                }}
                                            />
                                            <div className="h-6 w-px bg-white/10"></div>
                                            <span className="text-xs font-bold text-muted-foreground w-8 text-center uppercase">{item.unit}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-6 border-t border-white/5 bg-secondary/5 flex justify-end">
                            <Button onClick={() => setIsSettingsOpen(false)} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                                Salvar Configurações
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-card/30 backdrop-blur-xl rounded-2xl border border-white/5 shadow-2xl overflow-hidden relative" id="consumption-report-content">
                {/* Decorative gradients */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none translate-y-1/2 -translate-x-1/2"></div>

                <div className="p-8 relative z-10">
                    {/* Header for Export Capture */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 bg-gradient-to-r from-secondary/30 to-background/30 p-6 rounded-2xl border border-white/5">
                        <div className="space-y-1">
                            <h3 className="font-bold text-2xl text-foreground">Resumo do Período</h3>
                            <p className="text-muted-foreground">Análise consolidada dos últimos <span className="font-bold text-primary">{selectedDays} dias</span>.</p>
                        </div>
                        <div className="flex gap-1 bg-background/50 p-1.5 rounded-xl border border-white/10 backdrop-blur-sm">
                            {[7, 15, 30].map(days => (
                                <button
                                    key={days}
                                    onClick={() => setSelectedDays(days)}
                                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${selectedDays === days
                                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                                        : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                                        }`}
                                >
                                    {days} dias
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Analytics Cards - Ultra Prime Refined */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                        {/* Busiest Day Card */}
                        <div className="group p-8 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 relative overflow-hidden backdrop-blur-xl">
                            {/* Inner Glow */}
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-700" />

                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl text-primary-foreground shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
                                        <TrendingDown className="w-5 h-5" />
                                    </div>
                                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em]">Pico de Movimento</span>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-4xl font-black text-white tracking-tight leading-none group-hover:text-primary transition-colors duration-300">
                                        {busiestDay.date || '-'}
                                    </h4>
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white/5 rounded-full px-4 py-1.5 border border-white/5 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                            <span className="text-sm font-medium text-white/80">Total movimentado:</span>
                                        </div>
                                        <span className="text-lg font-bold text-white bg-white/5 px-3 py-1 rounded-lg border border-white/5">
                                            {busiestDay.totalItems} itens
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Total Summary Card */}
                        <div className="group p-8 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 relative overflow-hidden backdrop-blur-xl">
                            {/* Inner Glow - Blue tinted for contrast but subtle */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-30 group-hover:opacity-70 transition-opacity duration-700" />

                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em]">Volume Consumido</span>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {(isExpanded ? summaryList : summaryList.slice(0, 5)).map((item, idx) => {
                                        // Smart Unit Conversion
                                        let displayAmount = item.amount;
                                        let displayUnit = item.unit;

                                        if (item.unit === 'g' && item.amount >= 1000) {
                                            displayAmount = item.amount / 1000;
                                            displayUnit = 'kg';
                                        }

                                        return (
                                            <div key={idx} className="flex flex-col p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-default min-w-[120px]">
                                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{item.name}</span>
                                                <span className="text-lg font-bold text-white tracking-tight">
                                                    {displayAmount.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                                                    <span className="text-xs font-normal text-white/40 ml-0.5">{displayUnit}</span>
                                                </span>
                                            </div>
                                        );
                                    })}
                                    {!isExpanded && summaryList.length > 5 && (
                                        <button
                                            onClick={() => setIsExpanded(true)}
                                            className="h-full px-4 rounded-xl bg-secondary/20 border border-white/5 text-xs font-bold text-primary hover:bg-secondary/40 hover:text-white transition-all duration-300 flex items-center justify-center min-w-[60px]"
                                        >
                                            +{summaryList.length - 5}
                                        </button>
                                    )}
                                    {isExpanded && summaryList.length > 5 && (
                                        <button
                                            onClick={() => setIsExpanded(false)}
                                            className="h-full px-4 rounded-xl bg-secondary/20 border border-white/5 text-xs font-bold text-primary hover:bg-secondary/40 hover:text-white transition-all duration-300 flex items-center justify-center min-w-[60px]"
                                        >
                                            Ver menos
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="relative border-l-2 border-primary/20 ml-6 space-y-16 pb-8">
                        {reportData.length === 0 ? (
                            <div className="pl-12 py-20 text-center">
                                <div className="inline-flex flex-col items-center justify-center p-8 rounded-2xl bg-secondary/10 border border-dashed border-white/10">
                                    <Package className="w-12 h-12 text-muted-foreground/30 mb-4" />
                                    <p className="text-muted-foreground text-lg">Nenhum consumo registrado neste período.</p>
                                    <p className="text-sm text-muted-foreground/50">Tente selecionar um intervalo maior.</p>
                                </div>
                            </div>
                        ) : (
                            reportData.map((day, idx) => {
                                const isBusiest = day.dateDisplay === busiestDay.date;
                                const hasAlerts = day.alertsCount > 0;
                                const isAlertsExpanded = expandedAlerts[day.dateDisplay];

                                return (
                                    <div key={idx} className="relative pl-12 animate-in slide-in-from-bottom-6 duration-700" style={{ animationDelay: `${idx * 100}ms` }}>
                                        {/* Timeline Dot */}
                                        <div className="absolute -left-[11px] top-2 w-5 h-5 rounded-full border-[3px] z-10 shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all duration-500 bg-background border-primary shadow-primary/30" />

                                        <div className="mb-6 flex flex-wrap items-center gap-4">
                                            <h3 className="text-2xl font-bold tracking-tight text-foreground">
                                                {day.dateDisplay}
                                            </h3>

                                            {/* Status Badges */}


                                            {hasAlerts ? (
                                                <button
                                                    onClick={() => toggleAlert(day.dateDisplay)}
                                                    className={`
                                                        flex items-center gap-2 text-[11px] font-bold px-4 py-1.5 rounded-full border transition-all duration-300 shadow-sm
                                                        ${isAlertsExpanded
                                                            ? 'bg-red-500 text-white border-red-600 shadow-red-500/30 hover:bg-red-600'
                                                            : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'}
                                                    `}
                                                >
                                                    <AlertTriangle className="w-3.5 h-3.5" />
                                                    {isAlertsExpanded ? 'Mostrar Todos' : `${day.alertsCount} Acima da Média`}
                                                </button>
                                            ) : (
                                                <span className="text-[11px] font-semibold text-muted-foreground/70 px-3 py-1 bg-secondary/50 rounded-full border border-white/5">
                                                    {day.items.length} itens movidos
                                                </span>
                                            )}
                                        </div>

                                        {/* Grid displaying items */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {(isAlertsExpanded ? day.items.filter(i => i.isOverAverage) : day.items).map((item, i) => (
                                                <div
                                                    key={i}
                                                    className={`
                                                        relative overflow-hidden flex justify-between items-center p-4 rounded-xl border transition-all duration-300 group
                                                        ${item.isOverAverage
                                                            ? 'bg-red-500/5 border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10'
                                                            : 'bg-secondary/20 border-white/5 hover:bg-secondary/40 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5'}
                                                    `}
                                                >
                                                    {/* Glow effect on hover */}
                                                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-r ${item.isOverAverage ? 'from-red-500/10' : 'from-primary/10'} to-transparent`} />

                                                    <div className="space-y-1 z-10">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`font-semibold text-sm ${item.isOverAverage ? 'text-red-400' : 'text-foreground/90'}`}>
                                                                {item.name}
                                                            </span>
                                                        </div>
                                                        {item.isOverAverage && (
                                                            <div className="flex items-center gap-1 text-[10px] text-red-500/80 font-medium">
                                                                <span>Meta: {item.dailyAverage}{item.unit}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col items-end gap-1 z-10">
                                                        <span className={`
                                                            font-mono font-bold text-sm px-2.5 py-1 rounded-lg transition-colors
                                                            ${item.isOverAverage ? 'bg-red-500/20 text-red-400' : 'bg-primary/10 text-primary group-hover:bg-primary/20'}
                                                        `}>
                                                            -{item.amount.toLocaleString('pt-BR')} <span className="text-[10px] uppercase ml-0.5">{item.unit}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer for Export */}
                    <div className="flex justify-between items-end pt-12 mt-4 border-t border-white/5">
                        <div className="text-xs text-muted-foreground/40 font-mono">
                            EZ MENU SYSTEM v2.4
                        </div>
                        <div className="text-right text-xs text-muted-foreground/60 italic">
                            Relatório gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
