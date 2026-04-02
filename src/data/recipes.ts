
// Map of Product ID -> Ingredient Requirements
export interface IngredientRequirement {
    ingredientId: string;
    amount: number; // in grams or units
}

export const RECIPES: Record<string, IngredientRequirement[]> = {
    // Entradas
    'e001': [ // Camarão Catupiry
        { ingredientId: 'camarao', amount: 80 },
        { ingredientId: 'catupiry', amount: 30 }
    ],
    'e002': [ // Ceviche de Peixe Branco
        { ingredientId: 'peixe_branco', amount: 100 },
        { ingredientId: 'limao', amount: 1 } // unit
    ],
    'e003': [ // Croqueta Salmão
        { ingredientId: 'salmao', amount: 60 },
        { ingredientId: 'arroz', amount: 20 }
    ],
    'e008': [ // Harumaki Salmão
        { ingredientId: 'salmao', amount: 50 },
        { ingredientId: 'massas', amount: 10 }
    ],
    'e009': [ // Harumaki Camarão
        { ingredientId: 'camarao', amount: 40 },
        { ingredientId: 'catupiry', amount: 10 }
    ],

    // Sashimi
    '001': [ // Sashimi Salmão (5 fatias)
        { ingredientId: 'salmao', amount: 100 } // ~20g per slice
    ],
    '002': [ // Sashimi Atum
        { ingredientId: 'atum', amount: 100 }
    ],
    '003': [ // Sashimi Mix
        { ingredientId: 'salmao', amount: 40 },
        { ingredientId: 'atum', amount: 40 },
        { ingredientId: 'peixe_branco', amount: 40 }
    ],

    // Nigiri
    '011': [ // Nigiri Salmão (2 units)
        { ingredientId: 'salmao', amount: 30 },
        { ingredientId: 'arroz', amount: 30 }
    ],
    '012': [ // Nigiri Camarão (2 units)
        { ingredientId: 'camarao', amount: 30 }, // 2 shrimps
        { ingredientId: 'arroz', amount: 30 }
    ],
    '013': [ // Nigiri Trufa
        { ingredientId: 'salmao', amount: 30 },
        { ingredientId: 'arroz', amount: 30 }
    ],

    // Tataki
    '021': [ // Tataki Atum
        { ingredientId: 'atum', amount: 120 }
    ],

    // Gunkan
    '031': [ // Gunkan Salmão
        { ingredientId: 'salmao', amount: 40 },
        { ingredientId: 'arroz', amount: 20 }
    ]
};

// Initial Inventory State (Seeding)
export const INITIAL_INVENTORY = [
    { id: 'salmao', name: 'Salmão Fresco', quantity: 5000, unit: 'g', minThreshold: 1000, category: 'Peixes' },
    { id: 'atum', name: 'Atum Fresco', quantity: 3000, unit: 'g', minThreshold: 800, category: 'Peixes' },
    { id: 'peixe_branco', name: 'Peixe Branco', quantity: 2000, unit: 'g', minThreshold: 500, category: 'Peixes' },
    { id: 'camarao', name: 'Camarão Rosa', quantity: 4000, unit: 'g', minThreshold: 1000, category: 'Peixes' },
    { id: 'arroz', name: 'Arroz Shari', quantity: 10000, unit: 'g', minThreshold: 2000, category: 'Grãos' },
    { id: 'cream_cheese', name: 'Cream Cheese', quantity: 2000, unit: 'g', minThreshold: 500, category: 'Laticínios' },
    { id: 'catupiry', name: 'Catupiry Original', quantity: 1500, unit: 'g', minThreshold: 300, category: 'Laticínios' },
    { id: 'limao', name: 'Limão Taiti', quantity: 50, unit: 'uni', minThreshold: 10, category: 'Hortifruti' },
    { id: 'massas', name: 'Massa Harumaki/Gyoza', quantity: 2000, unit: 'g', minThreshold: 500, category: 'Massas' },
];
