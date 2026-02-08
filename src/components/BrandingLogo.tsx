import React from 'react';
import { supabase } from '@/lib/supabase';

interface BrandingLogoProps {
    variant?: 'light' | 'dark';
    className?: string;
    showText?: boolean;
    layout?: 'vertical' | 'horizontal';
}

export const BrandingLogo: React.FC<BrandingLogoProps> = ({
    variant = 'dark',
    className = "",
    showText = true,
    layout = 'vertical'
}) => {
    const filename = variant === 'dark' ? '1.png' : '2.png';
    const localFallback = variant === 'dark' ? '/images/1.png' : '/images/2.png';

    // Get Supabase URL
    const supabaseUrl = supabase.storage.from('branding').getPublicUrl(filename).data.publicUrl;

    const [imgSrc, setImgSrc] = React.useState(supabaseUrl);
    const textColor = variant === 'dark' ? 'text-foreground' : 'text-white';

    const content = (
        <>
            <div className={`rounded-xl bg-transparent flex items-center justify-center relative overflow-hidden ${layout === 'horizontal' ? 'w-10 h-10' : 'w-full h-full'}`}>
                <img
                    src={imgSrc}
                    alt="EZ Menu Logo"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                        if (imgSrc !== localFallback) {
                            setImgSrc(localFallback);
                        } else {
                            e.currentTarget.style.display = 'none';
                        }
                    }}
                />
            </div>
            {showText && (
                <div className={`flex flex-col ${layout === 'horizontal' ? 'items-start' : 'items-center'}`}>
                    <span className={`${layout === 'horizontal' ? 'text-lg' : 'text-2xl'} font-black uppercase tracking-tighter italic leading-none ${textColor}`}>
                        Ez Menu
                    </span>
                    <span className={`${variant === 'dark' ? 'text-foreground/40' : 'text-white/40'} text-[8px] font-black uppercase tracking-[0.3em] mt-0.5 not-italic`}>
                        Executive Suite
                    </span>
                </div>
            )}
        </>
    );

    return (
        <div className={`flex ${layout === 'horizontal' ? 'flex-row items-center gap-4' : 'flex-col items-center gap-3'} ${className}`}>
            {content}
        </div>
    );
};
