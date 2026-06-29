import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  produtosRef,
  estoqueMovimentacoesRef,
  handleFirestoreError,
  OperationType
} from '../firebase';
import { 
  query, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import { Product, StockMovement, Variation } from '../types';
import { toNum } from '../lib/utils';
import { ProductService } from '../services/productService';

export const useProducts = (isSignedIn: boolean = false, initialLimit: number = 100) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [productsLimit, setProductsLimit] = useState(initialLimit);
  const [stockLimit, setStockLimit] = useState(50);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    const qProd = query(produtosRef, orderBy('name', 'asc'), limit(productsLimit));
    const unsubProd = onSnapshot(qProd, (snap) => {
      setProducts(snap.docs.map(d => {
        const data = d.data() as any;
        const variations = data.variations || data.variacoes || data.options || [];
        const normalizedVariations = variations.map((v: any) => ({
          ...v,
          id: v.id || Math.random().toString(36).substr(2, 9),
          cor: v.cor || v.color || 'Única',
          tamanho: v.tamanho || v.size || 'Único',
          estoque: toNum(v.estoque || v.stock || 0)
        }));
        
        const totalStock = variations.length > 0 
          ? normalizedVariations.reduce((sum: number, v: any) => sum + v.estoque, 0)
          : toNum(data.stock);

        return { 
          id: d.id, 
          ...data,
          variations: normalizedVariations,
          has_variations: data.has_variations === true || variations.length > 0,
          stock: totalStock
        } as Product;
      }));
      setLoading(false);
    }, err => handleFirestoreError(err, OperationType.LIST, 'produtos'));

    return () => unsubProd();
  }, [isSignedIn, productsLimit]);

  useEffect(() => {
    if (!isSignedIn) return;

    const qStock = query(estoqueMovimentacoesRef, orderBy('date', 'desc'), limit(stockLimit));
    const unsubStock = onSnapshot(qStock, (snap) => {
      setStockMovements(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as StockMovement)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'estoque_movimentacoes'));

    return () => unsubStock();
  }, [isSignedIn, stockLimit]);

  const categories = useMemo(() => 
    Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort()
  , [products]);

  const loadMoreProducts = useCallback(() => {
    setProductsLimit(prev => Math.min(prev + 50, 2000));
  }, []);

  const loadMoreStock = useCallback(() => {
    setStockLimit(prev => Math.min(prev + 50, 500));
  }, []);

  return {
    products,
    stockMovements,
    categories,
    loading,
    loadMoreProducts,
    loadMoreStock,
    saveProduct: ProductService.saveProduct,
    uploadImages: ProductService.uploadImages,
    adjustStock: ProductService.adjustStock,
    registerSpecialStockMovement: ProductService.registerSpecialStockMovement,
    toggleFeatured: ProductService.toggleFeatured
  };
};
