// Lógica da Aplicação com Firebase Firestore (Ranking Multi-Mercado)
document.addEventListener('DOMContentLoaded', () => {
    const productInput = document.getElementById('productInput');
    const addBtn = document.getElementById('addBtn');
    const shoppingList = document.getElementById('shoppingList');
    const rankingList = document.getElementById('rankingList');

    const listRef = db.collection('shoppingList');
    const pricesRef = db.collection('prices');
    const marketsRef = db.collection('markets');
    const productsRef = db.collection('products');

    // Listener para a lista de compras
    listRef.orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            const items = [];
            shoppingList.innerHTML = '';
            snapshot.forEach((doc) => {
                const item = doc.data();
                items.push({ id: doc.id, ...item });
                renderItem(doc.id, item.name);
            });
            updateRanking(items);
        });

    // Função para adicionar item (Busca na coleção normalizada 'products')
    async function addItem() {
        const productName = productInput.value.trim();
        if (!productName) return;

        try {
            const productSnapshot = await productsRef
                .where('name', '==', productName.charAt(0).toUpperCase() + productName.slice(1).toLowerCase())
                .get();

            if (!productSnapshot.empty) {
                const productDoc = productSnapshot.docs[0];
                await listRef.add({
                    productId: productDoc.id,
                    name: productDoc.data().name,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                alert(`Produto "${productName}" não cadastrado no banco global.`);
            }
        } catch (error) {
            console.error("Erro ao adicionar:", error);
        }
        productInput.value = '';
        productInput.focus();
    }

    // O coração do App: Cálculo do Ranking
    async function updateRanking(shoppingItems) {
        if (shoppingItems.length === 0) {
            rankingList.innerHTML = '<p class="ranking-info">Adicione itens para ver o ranking.</p>';
            return;
        }

        const productIds = shoppingItems.map(item => item.productId);
        
        try {
            // 1. Busca todos os mercados
            const marketsSnapshot = await marketsRef.get();
            const markets = {};
            marketsSnapshot.forEach(doc => {
                markets[doc.id] = { name: doc.data().name, total: 0, missingItems: 0 };
            });

            // 2. Busca preços para os produtos da lista (otimizado com 'in')
            const pricesSnapshot = await pricesRef
                .where('productId', 'in', productIds.slice(0, 10)) // Firestore 'in' limita a 10 (ou 30 em versões novas)
                .get();

            // 3. Agrupamento e Soma
            const productPricesByMarket = {}; // { marketId: { productId: price } }
            pricesSnapshot.forEach(doc => {
                const p = doc.data();
                if (!productPricesByMarket[p.marketId]) productPricesByMarket[p.marketId] = {};
                productPricesByMarket[p.marketId][p.productId] = p.price;
            });

            // 4. Calcula total para cada mercado
            const rankingData = Object.keys(markets).map(mId => {
                let total = 0;
                let missingCount = 0;
                productIds.forEach(pId => {
                    const price = productPricesByMarket[mId] ? productPricesByMarket[mId][pId] : null;
                    if (price) {
                        total += price;
                    } else {
                        missingCount++;
                    }
                });
                return { 
                    id: mId, 
                    name: markets[mId].name, 
                    total, 
                    missingCount,
                    isComplete: missingCount === 0 
                };
            });

            // 5. Ordena por preço (Mais barato primeiro)
            rankingData.sort((a, b) => a.total - b.total);

            renderRanking(rankingData);

        } catch (error) {
            console.error("Erro no ranking:", error);
        }
    }

    function renderRanking(data) {
        rankingList.innerHTML = '';
        data.forEach((m, index) => {
            const card = document.createElement('div');
            card.className = 'ranking-card';
            const isCheapest = index === 0;
            
            card.innerHTML = `
                <div class="market-info">
                    <span class="m-name">${m.name}</span>
                    <span class="m-status">${m.missingCount > 0 ? `⚠️ Faltam ${m.missingCount} itens` : '✅ Completo'}</span>
                </div>
                <div class="m-total ${isCheapest ? 'cheapest' : ''}">
                    R$ ${m.total.toFixed(2).replace('.', ',')}
                    ${m.missingCount > 0 ? '<span class="warning-text">valor parcial</span>' : ''}
                </div>
            `;
            rankingList.appendChild(card);
        });
    }

    function renderItem(id, name) {
        const li = document.createElement('li');
        li.className = 'item';
        li.innerHTML = `
            <div class="item-info">
                <span class="item-name">${name}</span>
            </div>
            <div class="status-badge" onclick="deleteItem('${id}')" style="cursor:pointer">Remover</div>
        `;
        shoppingList.appendChild(li);
    }

    window.deleteItem = async (id) => {
        await listRef.doc(id).delete();
    };

    addBtn.addEventListener('click', addItem);
    productInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addItem(); });
});
