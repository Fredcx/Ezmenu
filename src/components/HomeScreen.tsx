
import { Fish, Smile, User } from 'lucide-react';
import { useOrder } from '@/contexts/OrderContext';
import { additionalCharges } from '@/data/menuData';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from './LanguageSelector';

interface HomeScreenProps {
  onStartOrder: () => void;
}

export function HomeScreen({ onStartOrder }: HomeScreenProps) {
  const { setSession, session } = useOrder();
  const { t } = useLanguage();
  const [adultsCount, setAdultsCount] = useState(2);
  const [childrenCount, setChildrenCount] = useState(1);

  // Default table "MESA B4" for display as per image
  const tableName = session?.tableName || localStorage.getItem('ez_menu_table_name') || 'Mesa';

  const handleConfirm = () => {
    setSession({
      tableId: tableName,
      tableName: tableName,
      clients: adultsCount + childrenCount,
      turnStartTime: new Date(),
      roundLimit: 24,
      currentRoundItems: 0,
      roundNumber: 1,
    });
    onStartOrder();
  };

  const total = adultsCount * additionalCharges[0].price + childrenCount * additionalCharges[1].price;

  return (
    <div className="h-full flex flex-col bg-[#1a1f2e] text-white">
      {/* Absolute Language Selector */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSelector />
      </div>

      {/* Header */}
      <div className="pt-8 pb-4 text-center">
        <h1 className="text-xl font-bold tracking-wider mb-8">ART OF SUSHI</h1>

        {/* Logo */}
        <div className="flex justify-center mb-8 relative">
          <div className="w-24 h-24 rounded-full border-2 border-[#5eead4] flex items-center justify-center relative shadow-[0_0_15px_rgba(94,234,212,0.3)] bg-[#1a1f2e]">
            <Fish className="w-12 h-12 text-white fill-white" />
            <div className="absolute -bottom-3 -right-6 bg-[#5eead4] text-[#1a1f2e] px-3 py-1 rounded-full text-xs font-bold shadow-lg">
              MESA {tableName}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content (Cards) */}
      <div className="flex-1 px-4 flex flex-col justify-center pb-4">
        <div className="grid grid-cols-2 gap-4">

          {/* Adult Card */}
          <div className="bg-[#2a3040] rounded-2xl p-4 flex flex-col shadow-lg border border-white/5">
            <h3 className="font-bold text-lg leading-tight mb-1">{t('menuCena').toUpperCase()}</h3>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-gray-400 text-sm font-medium">{t('adults')}</span>
              <User className="w-3 h-3 text-gray-400" />
            </div>

            <div className="text-[#facc15] font-bold text-xl mb-4">
              R$ {additionalCharges[0].price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>

            <div className="mt-auto flex items-center justify-between bg-[#1a1f2e] rounded-full border border-[#5eead4] p-1">
              <button
                onClick={() => setAdultsCount(Math.max(1, adultsCount - 1))}
                className="w-8 h-8 flex items-center justify-center text-white hover:text-[#5eead4] transition-colors font-medium text-lg"
              >
                -
              </button>
              <span className="font-bold text-lg w-6 text-center">{adultsCount}</span>
              <button
                onClick={() => setAdultsCount(adultsCount + 1)}
                className="w-8 h-8 flex items-center justify-center text-white hover:text-[#5eead4] transition-colors font-medium text-lg"
              >
                +
              </button>
            </div>
          </div>

          {/* Children Card */}
          <div className="bg-[#2a3040] rounded-2xl p-4 flex flex-col shadow-lg border border-white/5">
            <h3 className="font-bold text-lg leading-tight mb-1">{t('menuCena').toUpperCase()}</h3>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-gray-400 text-sm font-medium">{t('children')}</span>
              <Smile className="w-3 h-3 text-gray-400" />
            </div>

            <div className="text-[#facc15] font-bold text-xl mb-4">
              R$ {additionalCharges[1].price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>

            <div className="mt-auto flex items-center justify-between bg-[#1a1f2e] rounded-full border border-[#5eead4] p-1">
              <button
                onClick={() => setChildrenCount(Math.max(0, childrenCount - 1))}
                className="w-8 h-8 flex items-center justify-center text-white hover:text-[#5eead4] transition-colors font-medium text-lg"
              >
                -
              </button>
              <span className="font-bold text-lg w-6 text-center">{childrenCount}</span>
              <button
                onClick={() => setChildrenCount(childrenCount + 1)}
                className="w-8 h-8 flex items-center justify-center text-white hover:text-[#5eead4] transition-colors font-medium text-lg"
              >
                +
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Footer Section (Total & Button) */}
      <div className="px-6 pb-6 pt-2">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-gray-400 text-sm mb-1">Total ({adultsCount + childrenCount} {t('totalPeople').split(' ')[1] || 'pessoas'})</div>
            <div className="text-[#facc15] text-3xl font-bold">
              R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <button
            onClick={handleConfirm}
            className="bg-[#5eead4] hover:bg-[#4cd6c0] text-[#1a1f2e] font-bold py-3 px-6 rounded-full shadow-lg shadow-[#5eead4]/20 transition-all active:scale-95"
          >
            {t('startOrder').toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
}
