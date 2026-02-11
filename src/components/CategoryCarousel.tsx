import React, { useRef, useEffect } from 'react';
import { categories as defaultCategories } from '@/data/menuData';

interface CategoryCarouselProps {
    selectedCategory: string;
    onSelectCategory: (categoryId: string) => void;
    categories?: typeof defaultCategories;
}

export function CategoryCarousel({
    selectedCategory,
    onSelectCategory,
    categories = defaultCategories,
}: CategoryCarouselProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to keep active category visible
    useEffect(() => {
        const activeElement = scrollRef.current?.querySelector('[data-active="true"]');
        if (activeElement) {
            activeElement.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, [selectedCategory]);

    return (
        <div className="w-full bg-background/60 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30">
            <div
                ref={scrollRef}
                className="flex items-center gap-3 p-4 overflow-x-auto no-scrollbar scroll-smooth"
            >
                {categories.map((category, index) => {
                    const isActive = selectedCategory === category.id;
                    return (
                        <button
                            key={category.id}
                            data-active={isActive}
                            onClick={() => onSelectCategory(category.id)}
                            className={`
                                whitespace-nowrap px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em]
                                transition-all duration-500 active:scale-90 shrink-0 border
                                animate-in fade-in slide-in-from-right-4
                                ${isActive
                                    ? 'bg-gradient-to-br from-primary to-primary/80 text-white border-primary shadow-xl shadow-primary/25 scale-105 z-10'
                                    : 'bg-white/5 text-muted-foreground/60 border-white/5 hover:bg-white/10 hover:text-foreground hover:border-white/10'}
                            `}
                            style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                        >
                            {category.name}
                        </button>
                    );
                })}
                {/* Visual padding to ensure final items aren't cut off by scroll */}
                <div className="w-4 shrink-0" />
            </div>
        </div>
    );
}
