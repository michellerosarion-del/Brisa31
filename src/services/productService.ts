import { 
  db, 
  storage, 
  storageRef, 
  uploadBytes, 
  getDownloadURL, 
  produtosRef,
  estoqueMovimentacoesRef,
  OperationType,
  handleFirestoreError,
  handleStorageError
} from '../firebase';
import { 
  doc, 
  addDoc, 
  updateDoc, 
  runTransaction
} from 'firebase/firestore';
import { toNum } from '../lib/utils';
import { Product, Variation } from '../types';

export const ProductService = {
  async uploadImages(files: File[]) {
    const urls = [];
    const MAX_FILE_SIZE = 2 * 1024 * 1024;

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`O arquivo ${file.name} excede o limite de 2MB.`);
      }
      
      try {
        const fileRef = storageRef(storage, `produtos/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(fileRef, file);
        const url = await getDownloadURL(snapshot.ref);
        urls.push(url);
      } catch (err) {
        throw new Error(handleStorageError(err));
      }
    }
    return urls;
  },

  async saveProduct(data: any, editingItem: Product | null, user: any, tempVariations: Variation[], existingImages: string[], uploadedUrls: string[]) {
    const finalImages = [...existingImages, ...uploadedUrls];
    const totalStock = tempVariations.length > 0 
      ? tempVariations.reduce((sum, v) => sum + toNum(v.estoque), 0)
      : toNum(data.stock);

    const productData = {
      name: data.name,
      category: data.category,
      brand: data.brand,
      code: data.code,
      cost: toNum(data.cost),
      frete: toNum(data.frete),
      price: toNum(data.price),
      cash_price: toNum(data.cash_price) || toNum(data.price),
      promo_price: toNum(data.promo_price) || 0,
      stock: totalStock,
      min_stock: toNum(data.min_stock),
      cor: data.cor || 'Única',
      tamanho: data.tamanho || 'Único',
      status: data.status || 'ativo',
      variations: tempVariations,
      images: finalImages,
      updatedAt: new Date().toISOString()
    };

    if (editingItem) {
      const reason = (data.stock_adjustment_reason as string) || 'Ajuste manual de estoque';
      const movements = [];
      
      if (tempVariations.length === 0 && toNum(editingItem.stock) !== totalStock) {
        movements.push({
          product_id: editingItem.id,
          produto: data.name,
          marca: data.brand || '',
          cor: data.cor || 'Única',
          tamanho: data.tamanho || 'Único',
          quantidade_anterior: toNum(editingItem.stock),
          quantidade_nova: totalStock,
          quantidade: totalStock - toNum(editingItem.stock),
          tipo: 'ajuste',
          origem: 'manual',
          usuario: user?.name || 'Sistema',
          observacao: reason,
          date: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
      }
      
      if (tempVariations.length > 0) {
        for (const newVar of tempVariations) {
          const oldVar = editingItem.variations?.find((v: any) => v.id === newVar.id);
          if (oldVar && toNum(oldVar.estoque) !== toNum(newVar.estoque)) {
             movements.push({
              product_id: editingItem.id,
              variation_id: newVar.id,
              produto: data.name,
              marca: data.brand || '',
              cor: newVar.cor || '',
              tamanho: newVar.tamanho || '',
              quantidade_anterior: toNum(oldVar.estoque),
              quantidade_nova: toNum(newVar.estoque),
              quantidade: toNum(newVar.estoque) - toNum(oldVar.estoque),
              tipo: 'ajuste',
              origem: 'manual',
              usuario: user?.name || 'Sistema',
              observacao: `${reason} (${newVar.cor}/${newVar.tamanho})`,
              date: new Date().toISOString(),
              createdAt: new Date().toISOString()
            });
          } else if (!oldVar && editingItem.id) {
            movements.push({
              product_id: editingItem.id,
              variation_id: newVar.id,
              produto: data.name,
              marca: data.brand || '',
              cor: newVar.cor || '',
              tamanho: newVar.tamanho || '',
              quantidade_anterior: 0,
              quantidade_nova: toNum(newVar.estoque),
              quantidade: toNum(newVar.estoque),
              tipo: 'ajuste',
              origem: 'manual',
              usuario: user?.name || 'Sistema',
              observacao: `Nova variação adicionada: ${newVar.cor}/${newVar.tamanho}`,
              date: new Date().toISOString(),
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      if (movements.length > 0) {
        await Promise.all(movements.map(mov => addDoc(estoqueMovimentacoesRef, mov)));
      }

      return updateDoc(doc(db, 'produtos', editingItem.id), productData);
    } else {
      const docRef = await addDoc(produtosRef, { ...productData, createdAt: new Date().toISOString() });
      
      if (totalStock > 0) {
        await addDoc(estoqueMovimentacoesRef, {
          product_id: docRef.id,
          produto: data.name,
          marca: data.brand || '',
          cor: data.cor || 'Única',
          tamanho: data.tamanho || 'Único',
          quantidade_anterior: 0,
          quantidade_nova: totalStock,
          quantidade: totalStock,
          tipo: 'entrada',
          origem: 'estoque_inicial',
          usuario: user?.name || 'Sistema',
          observacao: 'Estoque inicial no cadastro',
          date: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
      }
      return docRef;
    }
  },

  async adjustStock(id: string, amount: number, user: any, variationId?: string) {
    return runTransaction(db, async (transaction) => {
      const prodRef = doc(db, 'produtos', id);
      const prodDoc = await transaction.get(prodRef);
      if (!prodDoc.exists()) return;

      const pData = prodDoc.data();
      const newTotalStock = toNum(pData.stock) + amount;
      transaction.update(prodRef, { stock: newTotalStock });

      let currentCor = pData.cor;
      let currentTamanho = pData.tamanho;
      
      if (variationId && pData.variations) {
        const updatedVars = pData.variations.map((v: any) => 
          v.id === variationId ? { ...v, estoque: toNum(v.estoque) + amount } : v
        );
        transaction.update(prodRef, { variations: updatedVars });
        
        const targetVar = updatedVars.find((v: any) => v.id === variationId);
        if (targetVar) {
          currentCor = targetVar.cor;
          currentTamanho = targetVar.tamanho;
        }
      }

      transaction.set(doc(estoqueMovimentacoesRef), {
        product_id: id,
        produto: pData.name,
        marca: pData.brand || '',
        cor: currentCor,
        tamanho: currentTamanho,
        quantidade: Math.abs(amount),
        tipo: amount > 0 ? 'entrada' : 'saída',
        origem: 'ajuste manual',
        usuario: user?.name || 'Sistema',
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        variation_id: variationId || null
      });
    });
  },

  async registerSpecialStockMovement(data: {
    productId: string;
    variationId?: string | null;
    type: 'avaria' | 'uso_interno' | 'ajuste_positivo' | 'ajuste_negativo';
    quantity: number;
    observation: string;
    user: any;
  }) {
    const { productId, variationId, type, quantity, observation, user } = data;

    if (quantity <= 0) {
      throw new Error('A quantidade deve ser maior que zero.');
    }

    const isReduction = type === 'avaria' || type === 'uso_interno' || type === 'ajuste_negativo';
    const amount = isReduction ? -quantity : quantity;

    return runTransaction(db, async (transaction) => {
      const prodRef = doc(db, 'produtos', productId);
      const prodDoc = await transaction.get(prodRef);
      if (!prodDoc.exists()) {
        throw new Error('Produto não encontrado.');
      }

      const pData = prodDoc.data();
      let currentCor = pData.cor || 'Única';
      let currentTamanho = pData.tamanho || 'Único';
      const updatedVars = pData.variations || [];

      if (variationId && updatedVars.length > 0) {
        const targetVarIndex = updatedVars.findIndex((v: any) => v.id === variationId);
        if (targetVarIndex === -1) {
          throw new Error('Variação não encontrada.');
        }

        const targetVar = updatedVars[targetVarIndex];
        currentCor = targetVar.cor;
        currentTamanho = targetVar.tamanho;

        const currentVarStock = toNum(targetVar.estoque);
        const newVarStock = currentVarStock + amount;

        if (newVarStock < 0) {
          throw new Error(`Saldo insuficiente na variação desejada. Saldo atual: ${currentVarStock} peça(s).`);
        }

        const newVariations = [...updatedVars];
        newVariations[targetVarIndex] = {
          ...targetVar,
          estoque: newVarStock
        };

        const newTotalStock = newVariations.reduce((sum: number, v: any) => sum + toNum(v.estoque), 0);

        transaction.update(prodRef, {
          variations: newVariations,
          stock: newTotalStock
        });
      } else {
        const currentStock = toNum(pData.stock);
        const newTotalStock = currentStock + amount;

        if (newTotalStock < 0) {
          throw new Error(`Saldo insuficiente no produto. Saldo atual: ${currentStock} peça(s).`);
        }

        transaction.update(prodRef, { stock: newTotalStock });
      }

      const movementRef = doc(estoqueMovimentacoesRef);
      transaction.set(movementRef, {
        productId,
        productName: pData.name,
        color: currentCor,
        size: currentTamanho,
        quantity,
        type,
        observation,
        userName: user?.name || 'Sistema',
        createdAt: new Date().toISOString(),

        product_id: productId,
        produto: pData.name,
        marca: pData.brand || '',
        cor: currentCor,
        tamanho: currentTamanho,
        quantidade: quantity,
        tipo: isReduction ? 'saída' : 'entrada',
        origem: type === 'avaria' ? 'avaria' : type === 'uso_interno' ? 'uso_interno' : type === 'ajuste_positivo' ? 'ajuste_positivo' : 'ajuste_negativo',
        usuario: user?.name || 'Sistema',
        date: new Date().toISOString(),
        variation_id: variationId || null
      });
    });
  },

  async toggleFeatured(product: Product) {
    return updateDoc(doc(db, 'produtos', product.id), { is_featured: !product.is_featured });
  }
};
