import { useState, useCallback } from 'react';

export const useUI = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<string>('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isQuickSaleModalOpen, setIsQuickSaleModalOpen] = useState(false);
  const [quickSaleTab, setQuickSaleTab] = useState<'products' | 'cart'>('products');

  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
  }, []);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'info') => {
    setConfirmConfig({ title, message, onConfirm, type });
  }, []);

  return {
    activeTab,
    setActiveTab,
    isSidebarOpen,
    setIsSidebarOpen,
    notifications,
    setNotifications,
    showNotification,
    confirmConfig,
    setConfirmConfig,
    showConfirm,
    isModalOpen,
    setIsModalOpen,
    modalType,
    setModalType,
    editingItem,
    setEditingItem,
    isQuickSaleModalOpen,
    setIsQuickSaleModalOpen,
    quickSaleTab,
    setQuickSaleTab
  };
};
