import React, { useState } from 'react';
import { OrderProvider } from '@/contexts/OrderContext';
import { LandingScreenV2 } from '@/components/LandingScreenV2';
import { MenuScreen } from '@/components/MenuScreen';
import { BottomNavigation, TabId } from '@/components/BottomNavigation';
import { useParams } from 'react-router-dom';

export default function DesignTest() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const { slug } = useParams();

  return (
    <div className="premium-v2 min-h-screen bg-background text-foreground relative overflow-hidden font-sans selection:bg-primary selection:text-white shadow-xl">
      {/* Light Premium Effects - Subtle Soft Shadows & Gradients */}
      <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[5%] right-[5%] w-[30%] h-[30%] bg-secondary/30 blur-[80px] rounded-full pointer-events-none" />
      
      <OrderProvider>
        <div className="h-screen flex flex-col relative z-10">
          <div className="flex-1 overflow-hidden relative">
             {activeTab === 'home' ? (
               <LandingScreenV2 
                onSelectOption={(option) => {
                  console.log('Selected option:', option);
                  setActiveTab('menu');
                }} 
                hasTable={true} 
               />
             ) : (
               <MenuScreen 
                initialMenu="menu" 
                onBackToLanding={() => setActiveTab('home')} 
                hasTable={true} 
                variant="premium"
               />
             )}
          </div>
          <BottomNavigation activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} hasTable={true} variant="floating" />
        </div>
      </OrderProvider>

      <style dangerouslySetInnerHTML={{ __html: `
        .premium-v2 .glass {
          background: rgba(255, 255, 255, 0.8) !important;
          backdrop-filter: blur(20px) !important;
          border-color: rgba(0, 0, 0, 0.05) !important;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.03) !important;
        }
        .premium-v2 .glass-card {
          background: rgba(255, 255, 255, 0.9) !important;
          backdrop-filter: blur(25px) !important;
          border-color: rgba(0, 0, 0, 0.04) !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05) !important;
        }
        .premium-v2 .bg-card {
          background-color: #ffffff !important;
          border-color: rgba(0, 0, 0, 0.06) !important;
          box-shadow: 0 2px 15px rgba(0, 0, 0, 0.02) !important;
        }
      `}} />
    </div>
  );
}
