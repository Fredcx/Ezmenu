import { ChefHat, Check, Clock, ShoppingCart } from 'lucide-react';
import { useOrder } from '@/contexts/OrderContext';
import { StatusBar } from './StatusBar';
import { useState } from 'react';

type TabType = 'cliente' | 'garcom' | 'taxa' | 'outros';

export function HistoryScreen() {
  const { sentOrders, session } = useOrder();
  const [activeTab, setActiveTab] = useState<TabType>('cliente');
  const [statusExpanded, setStatusExpanded] = useState(false);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'cliente', label: '1' },
    { id: 'garcom', label: 'GARÇOM' },
    { id: 'taxa', label: 'TAXA ADICIONAL' },
    { id: 'outros', label: 'OUTROS' },
  ];

  const rodizioItems = sentOrders.filter(item => item.isRodizio);
  const paidItems = sentOrders.filter(item => !item.isRodizio);

  const totalValue = sentOrders.reduce((sum, item) => 
    sum + (item.price * item.quantity), 0
  );

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.id ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2">
        <StatusBar 
          expanded={statusExpanded}
          onToggle={() => setStatusExpanded(!statusExpanded)}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'cliente' && (
          <>
            {/* Rodizio Items */}
            {rodizioItems.length > 0 && (
              <>
                <div className="text-sm text-muted-foreground">
                  Cliente | Rodada {session?.roundNumber || 1} | total: {rodizioItems.length} pratos
                </div>
                {rodizioItems.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="order-item">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <ShoppingCart className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium">{item.code} - {item.name}</h4>
                        {item.status === 'sent' || item.status === 'preparing' ? (
                          <ChefHat className="w-5 h-5 text-chef" />
                        ) : (
                          <Check className="w-5 h-5 text-success" />
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-price-rodizio font-semibold">R$ 0,00</span>
                        <span className="text-sm text-muted-foreground">x{item.quantity}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Paid Items */}
            {paidItems.length > 0 && (
              <>
                <div className="text-sm text-muted-foreground mt-4">
                  Itens pagos | total: {paidItems.length} pratos
                </div>
                {paidItems.map((item, index) => (
                  <div key={`paid-${item.id}-${index}`} className="order-item">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium">{item.code} - {item.name}</h4>
                        <ChefHat className="w-5 h-5 text-chef" />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-price font-semibold">
                          R$ {(item.price * item.quantity).toFixed(2)}
                        </span>
                        <span className="text-sm text-muted-foreground">x{item.quantity}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {sentOrders.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Nenhum pedido enviado ainda</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'garcom' && (
          <div className="text-sm text-muted-foreground">
            Garçom | total: 0 pratos
          </div>
        )}

        {activeTab === 'taxa' && (
          <>
            <div className="text-sm text-muted-foreground">
              Taxa adicional | total: {session?.clients || 3} pratos
            </div>
            <div className="order-item">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <ShoppingCart className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium">Cena adulto</h4>
                  <ChefHat className="w-5 h-5 text-chef" />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-price font-semibold">R$ 129,99</span>
                  <span className="text-sm text-muted-foreground">x2</span>
                </div>
              </div>
            </div>
            <div className="order-item">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <ShoppingCart className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium">Cena bambino</h4>
                  <ChefHat className="w-5 h-5 text-chef" />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-price font-semibold">R$ 69,99</span>
                  <span className="text-sm text-muted-foreground">x1</span>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'outros' && (
          <div className="text-sm text-muted-foreground">
            Outros dispositivos | total: 0 pratos
          </div>
        )}
      </div>

      {/* Total */}
      <div className="p-4 border-t border-border flex items-center justify-between">
        <span className="text-lg font-semibold">Total</span>
        <span className="text-2xl font-bold text-price">
          R$ {(totalValue + 329.97).toFixed(2)}
        </span>
      </div>
    </div>
  );
}
