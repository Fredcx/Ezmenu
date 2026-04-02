import React, { useRef, useEffect, useState } from 'react';
import { categories as defaultCategories } from '@/data/menuData';

interface CategoryCarouselProps {
    selectedCategory: string;
    onSelectCategory: (categoryId: string) => void;
    categories?: typeof defaultCategories;
    vertical?: boolean;
}

export function CategoryCarousel({
    selectedCategory,
    onSelectCategory,
    categories = defaultCategories,
    vertical = false,
}: CategoryCarouselProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({ opacity: 0 });

    useEffect(() => {
        const activeElement = scrollRef.current?.querySelector(`[data-id="${selectedCategory}"]`) as HTMLElement;
        if (activeElement && scrollRef.current) {
            activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

            const isDesktop = window.innerWidth >= 768 && vertical;
            if (isDesktop) {
                setIndicatorStyle({
                    top: activeElement.offsetTop + 8,
                    height: activeElement.offsetHeight - 16,
                    left: 0,
                    width: '3.5px',
                    opacity: 1,
                    transition: 'all 0.5s cubic-bezier(0.23, 1, 0.32, 1)'
                });
            } else {
                setIndicatorStyle({
                    left: activeElement.offsetLeft + 12,
                    width: activeElement.offsetWidth - 24,
                    bottom: 0,
                    height: '3.5px',
                    opacity: 1,
                    transition: 'all 0.5s cubic-bezier(0.23, 1, 0.32, 1)'
                });
            }
        }
    }, [selectedCategory, vertical, categories]);

    return (
        <div className={`w-full bg-[#F3F4F6] backdrop-blur-xl ${vertical ? 'md:h-screen md:sticky md:top-0 md:bg-transparent md:backdrop-blur-none border-b md:border-b-0 border-white/5' : 'border-b border-white/5 sticky top-0'} z-30`}>
            <div
                ref={scrollRef}
                className={`flex ${vertical ? 'md:flex-col md:items-stretch md:mt-12' : 'items-center'} gap-3 p-4 overflow-x-auto md:overflow-y-auto no-scrollbar scroll-smooth relative`}
            >
                {/* Sliding Indicator with Arrow Tip */}
                <div 
                    className="absolute bg-primary rounded-full z-10 pointer-events-none" 
                    style={indicatorStyle}
                >
                    <div className={`absolute bg-primary rotate-45 w-2 h-2 -z-10
                        ${vertical 
                            ? 'md:right-[-4px] md:top-1/2 md:-translate-y-1/2 md:block hidden' 
                            : 'left-1/2 -translate-x-1/2 -top-[1px] block'
                        }`} 
                    />
                </div>

                {categories.map((category, index) => {
                    const isActive = selectedCategory === category.id;
                    return (
                        <button
                            key={category.id}
                            data-id={category.id}
                            data-active={isActive}
                            onClick={() => onSelectCategory(category.id)}
                            className={`
                                relative whitespace-nowrap px-4 py-3 text-[11px] font-black uppercase tracking-[0.15em]
                                transition-colors duration-300 active:opacity-75 shrink-0
                                animate-in fade-in slide-in-from-right-5
                                ${vertical ? 'md:text-left md:px-5 md:py-4 md:animate-none' : ''}
                                ${isActive ? 'text-primary z-10 drop-shadow-sm' : 'text-muted-foreground/50 hover:text-foreground/80'}
                            `}
                            style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                        >
                            {category.name}
                        </button>
                    );
                })}
                {/* Visual padding to ensure final items aren't cut off by scroll */}
                {!vertical && <div className="w-4 shrink-0" />}
                {vertical && <div className="h-20 shrink-0 md:block hidden" />}
            </div>
        </div>
    );
}
