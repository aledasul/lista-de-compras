// Lógica da Aplicação com Firebase Firestore
document.addEventListener('DOMContentLoaded', () => {
    const productInput = document.getElementById('productInput');
    const addBtn = document.getElementById('addBtn');
    const shoppingList = document.getElementById('shoppingList');

    // Referência para a coleção da lista de compras
    const listRef = db.collection('shoppingList');

    // Listener em tempo real para a lista de compras
    listRef.orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            shoppingList.innerHTML = ''; // Limpa a lista para renderizar novamente
            snapshot.forEach((doc) => {
                const item = doc.data();
                renderItem(doc.id, item.name, item.price, item.market);
            });
        });

    // Função para adicionar item (Busca no Firestore e Salva na Lista)
    async function addItem() {
        const productName = productInput.value.trim();
        if (!productName) return;

        try {
            // Busca o produto no Firestore (Coleção 'products')
            const productSnapshot = await db.collection('products')
                .where('name', '==', productName.charAt(0).toUpperCase() + productName.slice(1).toLowerCase())
                .get();

            if (!productSnapshot.empty) {
                const product = productSnapshot.docs[0].data();
                
                // Encontra o melhor preço (menor valor)
                const bestOffer = product.prices.reduce((prev, curr) => 
                    (prev.price < curr.price) ? prev : curr
                );

                // No Firestore, o nome do mercado pode estar salvado diretamente no preço ou ser buscado
                // Para este exemplo, assumiremos que temos o marketName no objeto price
                
                // Salva o item na coleção 'shoppingList' do Firestore
                await listRef.add({
                    name: product.name,
                    price: bestOffer.price,
                    market: bestOffer.marketName, // Assumindo que o mock do Firestore terá o nome
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            } else {
                alert(`Produto "${productName}" não encontrado no banco de dados Firestore.`);
            }
        } catch (error) {
            console.error("Erro ao adicionar item:", error);
            alert("Erro ao conectar com o Firebase. Verifique sua conexão e regras de acesso.");
        }

        productInput.value = '';
        productInput.focus();
    }

    function renderItem(id, name, price, market) {
        const li = document.createElement('li');
        li.className = 'item';
        
        li.innerHTML = `
            <div class="item-info">
                <span class="item-name">${name}</span>
                <span class="best-price">R$ ${price.toFixed(2).replace('.', ',')}</span>
                <span class="market-name">📍 ${market}</span>
            </div>
            <div class="status-badge" onclick="deleteItem('${id}')" style="cursor:pointer">Remover</div>
        `;

        shoppingList.appendChild(li); // ListRef já está ordenado por createdAt desc
    }

    // Função global para remover item (chamada pelo onclick no HTML gerado)
    window.deleteItem = async (id) => {
        try {
            await listRef.doc(id).delete();
        } catch (error) {
            console.error("Erro ao remover item:", error);
        }
    };

    // Eventos
    addBtn.addEventListener('click', addItem);

    productInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addItem();
        }
    });
});
