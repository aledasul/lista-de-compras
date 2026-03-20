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
    const usersRef = db.collection('users');

    // MOCK USER: Em um app real, isso viria do Firebase Auth
    const CURRENT_USER_ID = 'user_demo_123';
    let userScore = 100;

    // Elementos de Contribuição
    const toggleContrib = document.getElementById('toggleContrib');
    const contribDrawer = document.getElementById('contribDrawer');
    const contribProduct = document.getElementById('contribProduct');
    const contribMarket = document.getElementById('contribMarket');
    const contribPrice = document.getElementById('contribPrice');
    const saveContribBtn = document.getElementById('saveContribBtn');

    // Inicialização de Pontuação e Selects
    async function initContribution() {
        const userDoc = await usersRef.doc(CURRENT_USER_ID).get();
        if (!userDoc.exists) {
            await usersRef.doc(CURRENT_USER_ID).set({ score: 100, name: 'Seya' });
        } else {
            userScore = userDoc.data().score;
        }
        renderUserScore();

        // Popula os selects do formulário de contribuição
        const [prodSnap, markSnap] = await Promise.all([productsRef.get(), marketsRef.get()]);
        contribProduct.innerHTML = prodSnap.docs.map(doc => `<option value="${doc.id}">${doc.data().name}</option>`).join('');
        contribMarket.innerHTML = markSnap.docs.map(doc => `<option value="${doc.id}">${doc.data().name}</option>`).join('');
    }
    initContribution();

    function renderUserScore() {
        let badge = document.getElementById('userScoreBadge');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'userScoreBadge';
            badge.className = 'user-score-badge';
            document.body.appendChild(badge);
        }
        badge.innerHTML = `⭐ Reputação: <span class="score-value">${userScore} pts</span>`;
    }

    // Toggle do formulário
    toggleContrib.addEventListener('click', () => contribDrawer.classList.toggle('hidden'));

    // Salvar Contribuição
    saveContribBtn.addEventListener('click', async () => {
        const pId = contribProduct.value;
        const mId = contribMarket.value;
        const price = parseFloat(contribPrice.value);

        if (!price || price <= 0) return alert("Insira um preço válido!");

        try {
            await pricesRef.add({
                productId: pId,
                marketId: mId,
                price: price,
                userId: CURRENT_USER_ID,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert("Obrigado! Sua contribuição está sendo analisada.");
            contribPrice.value = '';
            contribDrawer.classList.add('hidden');
            
            // Simula processamento e ganho de score (no real seria via Cloud Function)
            userScore += 10;
            await usersRef.doc(CURRENT_USER_ID).update({ score: userScore });
            renderUserScore();

        } catch (e) { console.error(e); }
    });

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

    // Função para adicionar item
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
        } catch (error) { console.error("Erro ao adicionar:", error); }
        productInput.value = '';
        productInput.focus();
    }

    // O CO RA ÇÃO: Cálculo do Ranking com FILTRO DE OUTLIERS
    async function updateRanking(shoppingItems) {
        if (shoppingItems.length === 0) {
            rankingList.innerHTML = '<p class="ranking-info">Adicione itens para ver o ranking.</p>';
            return;
        }

        const productIds = shoppingItems.map(item => item.productId);
        
        try {
            const marketsSnapshot = await marketsRef.get();
            const markets = {};
            marketsSnapshot.forEach(doc => {
                markets[doc.id] = { name: doc.data().name, total: 0, missingItems: 0 };
            });

            const pricesSnapshot = await pricesRef
                .where('productId', 'in', productIds.slice(0, 10))
                .get();

            // Lógica de Inteligência: Agrupar por produto e mercado antes de processar
            const rawData = {}; // { mId: { pId: [prices] } }
            pricesSnapshot.forEach(doc => {
                const p = doc.data();
                if (!rawData[p.marketId]) rawData[p.marketId] = {};
                if (!rawData[p.marketId][p.productId]) rawData[p.marketId][p.productId] = [];
                rawData[p.marketId][p.productId].push(p.price);
            });

            // Processa com Filtro de Outliers (IQR Simples ou Margem)
            const validatedPrices = {}; // { mId: { pId: validatedPrice } }
            for (const mId in rawData) {
                validatedPrices[mId] = {};
                for (const pId in rawData[mId]) {
                    const prices = rawData[mId][pId];
                    if (prices.length === 0) continue;

                    // Inteligência: Remove valores absurdos (Outliers)
                    // Para este protótipo, usaremos: Mediana como valor oficial se > 1 contribuinte
                    prices.sort((a, b) => a - b);
                    const median = prices[Math.floor(prices.length / 2)];
                    
                    // Só aceitamos preços que não desviem mais de 50% da mediana
                    const filtered = prices.filter(p => Math.abs(p - median) < (median * 0.5));
                    
                    if (filtered.length > 0) {
                        const avg = filtered.reduce((a, b) => a + b, 0) / filtered.length;
                        validatedPrices[mId][pId] = avg;
                    }
                }
            }

            const rankingData = Object.keys(markets).map(mId => {
                let total = 0;
                let missingCount = 0;
                productIds.forEach(pId => {
                    const price = validatedPrices[mId] ? validatedPrices[mId][pId] : null;
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
                    missingCount 
                };
            });

            rankingData.sort((a, b) => a.total - b.total);
            renderRanking(rankingData);

        } catch (error) { console.error("Erro no ranking:", error); }
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

    window.deleteItem = async (id) => { await listRef.doc(id).delete(); };
    addBtn.addEventListener('click', addItem);
    productInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addItem(); });
});
