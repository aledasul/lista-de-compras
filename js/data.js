// Banco de dados simulado (Mock Data)
const db = {
    supermarkets: [
        { id: 1, name: "Mercado do Bairro", lat: -23.5505, lng: -46.6333 }, // Centro
        { id: 2, name: "Super Oferta", lat: -23.5612, lng: -46.6558 },    // Av. Paulista
        { id: 3, name: "Preço Baixo", lat: -23.5489, lng: -46.6388 }     // Liberdade
    ],
    products: [
        {
            id: 1,
            name: "Arroz",
            prices: [
                { supermarketId: 1, price: 25.50 },
                { supermarketId: 2, price: 24.80 },
                { supermarketId: 3, price: 26.20 }
            ]
        },
        {
            id: 2,
            name: "Feijão",
            prices: [
                { supermarketId: 1, price: 8.20 },
                { supermarketId: 2, price: 9.90 },
                { supermarketId: 3, price: 7.50 }
            ]
        },
        {
            id: 3,
            name: "Macarrão",
            prices: [
                { supermarketId: 1, price: 4.50 },
                { supermarketId: 2, price: 4.20 },
                { supermarketId: 3, price: 4.80 }
            ]
        },
        {
            id: 4,
            name: "Leite",
            prices: [
                { supermarketId: 1, price: 5.50 },
                { supermarketId: 2, price: 5.90 },
                { supermarketId: 3, price: 5.30 }
            ]
        }
    ]
};
