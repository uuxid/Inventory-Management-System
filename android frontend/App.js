import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  token: 'inventory-mobile-token',
  user: 'inventory-mobile-user',
  baseUrl: 'inventory-mobile-base-url',
};

const DEFAULT_BASE_URL = 'http://192.168.1.11:8080';

const formatMoney = (value) => {
  const number = Number(value ?? 0);
  return number.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function App() {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [movementSummary, setMovementSummary] = useState(null);
  const [screen, setScreen] = useState('dashboard');
  const [products, setProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [inventoryMovements, setInventoryMovements] = useState([]);
  const [inventorySelectedProduct, setInventorySelectedProduct] = useState(null);
  const [aiAlerts, setAiAlerts] = useState([]);
  const [aiForecast, setAiForecast] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [productSaving, setProductSaving] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    description: '',
    imageUrl: '',
    categoryId: '',
    supplierId: '',
    unitPrice: '',
    costPrice: '',
    quantityOnHand: '0',
    reorderLevel: '0',
    reorderQuantity: '1',
    valuationMethod: 'FIFO',
    location: '',
  });
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [orderSaving, setOrderSaving] = useState(false);
  const [orderForm, setOrderForm] = useState({
    supplierId: '',
    expectedDate: '',
    notes: '',
    items: [{ productId: '', quantity: '1', unitCost: '' }],
  });
  const [inventoryModalVisible, setInventoryModalVisible] = useState(false);
  const [inventorySaving, setInventorySaving] = useState(false);
  const [inventoryForm, setInventoryForm] = useState({
    productId: '',
    movementType: 'IN',
    quantity: '1',
    unitCost: '',
    referenceNo: '',
    notes: '',
  });
  const [barcodeModalVisible, setBarcodeModalVisible] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const [barcodeData, setBarcodeData] = useState(null);
  const [aiMessage, setAiMessage] = useState('');
  const [aiReply, setAiReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const savedBaseUrl = await AsyncStorage.getItem(STORAGE_KEYS.baseUrl);
        const savedToken = await AsyncStorage.getItem(STORAGE_KEYS.token);
        const savedUser = await AsyncStorage.getItem(STORAGE_KEYS.user);

        if (!active) return;

        if (savedBaseUrl) {
          setBaseUrl(savedBaseUrl);
        }

        if (savedToken) {
          setToken(savedToken);
        }

        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }

        if (savedToken) {
          await loadFeatureData('dashboard', savedToken, savedBaseUrl || DEFAULT_BASE_URL);
        }
      } catch (bootstrapError) {
        if (active) {
          setError(bootstrapError.message || 'Failed to restore session');
        }
      } finally {
        if (active) {
          setBooting(false);
        }
      }
    };

    bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const normalizeBaseUrl = (value) => value.trim().replace(/\/+$/, '');

  const request = async (path, options = {}, customBaseUrl = baseUrl, authToken = token) => {
    const response = await fetch(`${normalizeBaseUrl(customBaseUrl)}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(options.headers || {}),
      },
    });

    const raw = await response.text();
    const payload = raw ? JSON.parse(raw) : null;

    if (!response.ok) {
      throw new Error(payload?.message || payload?.error || `Request failed (${response.status})`);
    }

    return payload;
  };

  const saveSession = async (nextToken, nextUser, nextBaseUrl) => {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.token, nextToken],
      [STORAGE_KEYS.user, JSON.stringify(nextUser)],
      [STORAGE_KEYS.baseUrl, normalizeBaseUrl(nextBaseUrl)],
    ]);
  };

  const clearSession = async () => {
    await AsyncStorage.multiRemove([STORAGE_KEYS.token, STORAGE_KEYS.user]);
  };

  const loadFeatureData = async (screenKey = 'dashboard', authToken = token, customBaseUrl = baseUrl) => {
    setLoading(true);
    setError('');

    try {
      if (screenKey === 'products') {
        const [productResult, lowStockResult, supplierResult] = await Promise.all([
          request('/api/products', { method: 'GET' }, customBaseUrl, authToken),
          request('/api/products/low-stock', { method: 'GET' }, customBaseUrl, authToken),
          request('/api/suppliers', { method: 'GET' }, customBaseUrl, authToken).catch(() => []),
        ]);
        setProducts(Array.isArray(productResult) ? productResult : []);
        setLowStockProducts(Array.isArray(lowStockResult) ? lowStockResult : []);
        setSuppliers(Array.isArray(supplierResult) ? supplierResult : []);
      } else if (screenKey === 'inventory') {
        const [productResult, lowStockResult] = await Promise.all([
          request('/api/products', { method: 'GET' }, customBaseUrl, authToken),
          request('/api/products/low-stock', { method: 'GET' }, customBaseUrl, authToken),
        ]);
        const nextProducts = Array.isArray(productResult) ? productResult : [];
        setProducts(nextProducts);
        setLowStockProducts(Array.isArray(lowStockResult) ? lowStockResult : []);
        if (!inventorySelectedProduct && nextProducts.length > 0) {
          setInventorySelectedProduct(nextProducts[0]);
        }
      } else if (screenKey === 'orders') {
        const [orderResult, supplierResult, productResult] = await Promise.all([
          request('/api/orders', { method: 'GET' }, customBaseUrl, authToken),
          request('/api/suppliers', { method: 'GET' }, customBaseUrl, authToken),
          request('/api/products', { method: 'GET' }, customBaseUrl, authToken),
        ]);
        setOrders(Array.isArray(orderResult) ? orderResult : []);
        setSuppliers(Array.isArray(supplierResult) ? supplierResult : []);
        setProducts(Array.isArray(productResult) ? productResult : []);
      } else if (screenKey === 'suppliers') {
        const supplierResult = await request('/api/suppliers', { method: 'GET' }, customBaseUrl, authToken);
        setSuppliers(Array.isArray(supplierResult) ? supplierResult : []);
      } else if (screenKey === 'users') {
        const userResult = await request('/api/auth/users', { method: 'GET' }, customBaseUrl, authToken);
        setUsers(Array.isArray(userResult) ? userResult : []);
      } else if (screenKey === 'audit') {
        const auditResult = await request('/api/audit/recent?days=7', { method: 'GET' }, customBaseUrl, authToken);
        setAuditLogs(Array.isArray(auditResult) ? auditResult : []);
      } else if (screenKey === 'reports') {
        const [dashboardResult, lowStockResult, orderResult] = await Promise.all([
          request('/api/inventory/dashboard', { method: 'GET' }, customBaseUrl, authToken),
          request('/api/products/low-stock', { method: 'GET' }, customBaseUrl, authToken),
          request('/api/orders', { method: 'GET' }, customBaseUrl, authToken),
        ]);

        setDashboard(dashboardResult);
        setLowStockProducts(Array.isArray(lowStockResult) ? lowStockResult : []);
        setOrders(Array.isArray(orderResult) ? orderResult : []);
      } else if (screenKey === 'ai') {
        const [alertResult, forecastResult] = await Promise.all([
          request('/api/ai/alerts', { method: 'GET' }, customBaseUrl, authToken),
          request('/api/ai/forecast', { method: 'GET' }, customBaseUrl, authToken),
        ]);

        setAiAlerts(Array.isArray(alertResult) ? alertResult : []);
        setAiForecast(forecastResult?.forecast || '');
      } else {
        const [dashboardResult, movementResult] = await Promise.all([
          request('/api/inventory/dashboard', { method: 'GET' }, customBaseUrl, authToken),
          request('/api/inventory/dashboard/received-vs-sold?days=7', { method: 'GET' }, customBaseUrl, authToken),
        ]);

        setDashboard(dashboardResult);
        setMovementSummary(movementResult);
      }
    } catch (fetchError) {
      setError(fetchError.message || 'Unable to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async (authToken = token, customBaseUrl = baseUrl) => {
    await loadFeatureData(user?.role === 'ROLE_EMPLOYEE' ? 'products' : 'dashboard', authToken, customBaseUrl);
  };

  const handleLogin = async () => {
    const nextBaseUrl = normalizeBaseUrl(baseUrl);

    if (!nextBaseUrl) {
      Alert.alert('Backend URL required', 'Enter the Spring Boot backend URL first.');
      return;
    }

    if (!username || !password) {
      Alert.alert('Missing credentials', 'Enter username and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await request(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        },
        nextBaseUrl,
        ''
      );

      const nextToken = response.token;
      const nextUser = {
        username: response.username,
        fullName: response.fullName,
        role: response.role,
      };

      const nextScreen = nextUser.role === 'ROLE_EMPLOYEE' ? 'products' : 'dashboard';

      setToken(nextToken);
      setUser(nextUser);
      await saveSession(nextToken, nextUser, nextBaseUrl);
      setScreen(nextScreen);
      await loadFeatureData(nextScreen, nextToken, nextBaseUrl);
    } catch (loginError) {
      if (loginError.message === 'Network request failed') {
        setError('Network request failed. Check that the backend URL is reachable from your phone, the PC and phone are on the same Wi-Fi, and Windows Firewall allows port 8080. For this machine, try http://192.168.1.11:8080.');
      } else {
        setError(loginError.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!token) {
      return;
    }

    await loadFeatureData(screen, token, baseUrl);
  };

  const openScreen = async (nextScreen) => {
    if (user?.role === 'ROLE_EMPLOYEE' && nextScreen !== 'products') {
      return;
    }

    setScreen(nextScreen);

    if (token) {
      await loadFeatureData(nextScreen, token, baseUrl);
    }
  };

  const openBarcodeLookup = async (product) => {
    try {
      const result = await request(`/api/products/${product.id}/barcode`, { method: 'GET' }, baseUrl, token);
      setBarcodeProduct(product);
      setBarcodeData(result);
      setBarcodeModalVisible(true);
    } catch (barcodeError) {
      setError(barcodeError.message || 'Unable to load barcode');
    }
  };

  const closeBarcodeLookup = () => {
    setBarcodeModalVisible(false);
    setBarcodeProduct(null);
    setBarcodeData(null);
  };

  const handleOrderAction = async (orderId, action) => {
    try {
      await request(`/api/orders/${orderId}/${action}`, { method: 'PATCH' }, baseUrl, token);
      await loadFeatureData('orders', token, baseUrl);
    } catch (orderError) {
      setError(orderError.message || 'Unable to update order');
    }
  };

  const handleSendAiMessage = async () => {
    const message = aiMessage.trim();

    if (!message) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await request('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message }),
      }, baseUrl, token);

      setAiReply(result?.response || 'No response returned');
      setAiMessage('');
    } catch (aiError) {
      setError(aiError.message || 'Unable to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAlertRead = async (alertId) => {
    try {
      await request(`/api/ai/alerts/${alertId}/read`, { method: 'PATCH' }, baseUrl, token);
      await loadFeatureData('ai', token, baseUrl);
    } catch (alertError) {
      setError(alertError.message || 'Unable to update alert');
    }
  };

  const canManage = user?.role !== 'ROLE_EMPLOYEE';

  const openProductModal = () => {
    setProductForm({
      name: '',
      sku: '',
      barcode: '',
      description: '',
      imageUrl: '',
      categoryId: '',
      supplierId: '',
      unitPrice: '',
      costPrice: '',
      quantityOnHand: '0',
      reorderLevel: '0',
      reorderQuantity: '1',
      valuationMethod: 'FIFO',
      location: '',
    });
    setProductModalVisible(true);
  };

  const handleCreateProduct = async () => {
    setProductSaving(true);
    setError('');

    try {
      await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          ...productForm,
          categoryId: productForm.categoryId ? Number(productForm.categoryId) : null,
          supplierId: productForm.supplierId ? Number(productForm.supplierId) : null,
          unitPrice: productForm.unitPrice ? Number(productForm.unitPrice) : 0,
          costPrice: productForm.costPrice ? Number(productForm.costPrice) : 0,
          quantityOnHand: productForm.quantityOnHand ? Number(productForm.quantityOnHand) : 0,
          reorderLevel: productForm.reorderLevel ? Number(productForm.reorderLevel) : 0,
          reorderQuantity: productForm.reorderQuantity ? Number(productForm.reorderQuantity) : 1,
        }),
      }, baseUrl, token);

      setProductModalVisible(false);
      await loadFeatureData('products', token, baseUrl);
    } catch (productError) {
      setError(productError.message || 'Unable to create product');
    } finally {
      setProductSaving(false);
    }
  };

  const addOrderItem = () => {
    setOrderForm((current) => ({
      ...current,
      items: [...current.items, { productId: '', quantity: '1', unitCost: '' }],
    }));
  };

  const updateOrderItem = (index, key, value) => {
    setOrderForm((current) => {
      const items = [...current.items];
      items[index] = { ...items[index], [key]: value };
      return { ...current, items };
    });
  };

  const openOrderModal = () => {
    setOrderForm({
      supplierId: '',
      expectedDate: '',
      notes: '',
      items: [{ productId: '', quantity: '1', unitCost: '' }],
    });
    setOrderModalVisible(true);
  };

  const handleCreateOrder = async () => {
    setOrderSaving(true);
    setError('');

    try {
      await request('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          supplierId: Number(orderForm.supplierId),
          expectedDate: orderForm.expectedDate || null,
          notes: orderForm.notes,
          items: orderForm.items.map((item) => ({
            productId: Number(item.productId),
            quantity: Number(item.quantity),
            unitCost: Number(item.unitCost),
          })),
        }),
      }, baseUrl, token);

      setOrderModalVisible(false);
      await loadFeatureData('orders', token, baseUrl);
    } catch (orderError) {
      setError(orderError.message || 'Unable to create order');
    } finally {
      setOrderSaving(false);
    }
  };

  const openInventoryProduct = async (product) => {
    setInventorySelectedProduct(product);
    setInventoryForm((current) => ({
      ...current,
      productId: String(product.id),
    }));

    try {
      const movementResult = await request(`/api/inventory/products/${product.id}/movements`, { method: 'GET' }, baseUrl, token);
      setInventoryMovements(Array.isArray(movementResult) ? movementResult : []);
    } catch (movementError) {
      setInventoryMovements([]);
      setError(movementError.message || 'Unable to load stock movements');
    }
  };

  const openInventoryModal = (movementType = 'IN', product = null) => {
    const selectedProduct = product || inventorySelectedProduct || products[0] || null;

    if (!selectedProduct) {
      Alert.alert('Select a product', 'Load products first and choose one to adjust stock.');
      return;
    }

    setInventorySelectedProduct(selectedProduct);
    setInventoryForm({
      productId: String(selectedProduct.id),
      movementType,
      quantity: '1',
      unitCost: selectedProduct.unitPrice ? String(selectedProduct.unitPrice) : '',
      referenceNo: '',
      notes: '',
    });
    setInventoryModalVisible(true);
  };

  const handleInventorySubmit = async () => {
    setInventorySaving(true);
    setError('');

    try {
      await request(`/api/inventory/products/${inventoryForm.productId}/adjust`, {
        method: 'POST',
        body: JSON.stringify({
          movementType: inventoryForm.movementType,
          quantity: Number(inventoryForm.quantity),
          unitCost: inventoryForm.unitCost ? Number(inventoryForm.unitCost) : 0,
          referenceNo: inventoryForm.referenceNo,
          notes: inventoryForm.notes,
        }),
      }, baseUrl, token);

      setInventoryModalVisible(false);
      await loadFeatureData('inventory', token, baseUrl);
      if (inventorySelectedProduct) {
        await openInventoryProduct(inventorySelectedProduct);
      }
    } catch (inventoryError) {
      setError(inventoryError.message || 'Unable to adjust stock');
    } finally {
      setInventorySaving(false);
    }
  };

  const handleSaveBaseUrl = async () => {
    const nextBaseUrl = normalizeBaseUrl(baseUrl);

    if (!nextBaseUrl) {
      Alert.alert('Backend URL required', 'Enter a valid backend URL such as http://192.168.1.20:8080');
      return;
    }

    await AsyncStorage.setItem(STORAGE_KEYS.baseUrl, nextBaseUrl);
    setBaseUrl(nextBaseUrl);
    Alert.alert('Saved', 'Backend URL updated. If needed, log in again.');
  };

  const handleLogout = async () => {
    setLoading(true);

    try {
      if (token) {
        await request('/api/auth/logout', { method: 'POST' }, baseUrl, token).catch(() => null);
      }
    } finally {
      await clearSession();
      setToken('');
      setUser(null);
      setDashboard(null);
      setMovementSummary(null);
      setProducts([]);
      setLowStockProducts([]);
      setOrders([]);
      setSuppliers([]);
      setUsers([]);
      setAuditLogs([]);
      setInventoryMovements([]);
      setInventorySelectedProduct(null);
      setAiAlerts([]);
      setAiForecast('');
      setProductSearch('');
      setProductModalVisible(false);
      setProductSaving(false);
      setProductForm({
        name: '',
        sku: '',
        barcode: '',
        description: '',
        imageUrl: '',
        categoryId: '',
        supplierId: '',
        unitPrice: '',
        costPrice: '',
        quantityOnHand: '0',
        reorderLevel: '0',
        reorderQuantity: '1',
        valuationMethod: 'FIFO',
        location: '',
      });
      setOrderModalVisible(false);
      setOrderSaving(false);
      setOrderForm({
        supplierId: '',
        expectedDate: '',
        notes: '',
        items: [{ productId: '', quantity: '1', unitCost: '' }],
      });
      setInventoryModalVisible(false);
      setInventorySaving(false);
      setInventoryForm({
        productId: '',
        movementType: 'IN',
        quantity: '1',
        unitCost: '',
        referenceNo: '',
        notes: '',
      });
      setBarcodeModalVisible(false);
      setBarcodeProduct(null);
      setBarcodeData(null);
      setAiMessage('');
      setAiReply('');
      setScreen('dashboard');
      setLoading(false);
    }
  };

  const renderScreenContent = () => {
    const canManage = user?.role !== 'ROLE_EMPLOYEE';

    if (screen === 'products') {
      const filteredProducts = products.filter((product) => {
        const query = productSearch.toLowerCase();
        return (
          product.name?.toLowerCase().includes(query) ||
          product.sku?.toLowerCase().includes(query) ||
          product.barcode?.toLowerCase().includes(query)
        );
      });

      return (
        <View style={styles.panel}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <Text style={styles.sectionTitle}>Products</Text>
            {canManage && (
              <TouchableOpacity style={styles.inlineButton} onPress={openProductModal}>
                <Text style={styles.inlineButtonText}>+ Add Product</Text>
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            value={productSearch}
            onChangeText={setProductSearch}
            placeholder="Search by name, SKU or barcode"
            placeholderTextColor="#6d7f98"
            style={styles.input}
          />
          {filteredProducts.map((product) => (
            <View key={product.id} style={styles.listCard}>
              <Text style={styles.listTitle}>{product.name}</Text>
              <Text style={styles.listMeta}>SKU: {product.sku}</Text>
              <Text style={styles.listMeta}>Supplier: {product.supplierName || '—'}</Text>
              <Text style={styles.listMeta}>Qty: {product.quantityOnHand} / {product.reorderLevel}</Text>
              <Text style={styles.listMeta}>Price: $ {formatMoney(product.unitPrice)}</Text>
              <Text style={[styles.badge, product.isLowStock ? styles.badgeWarning : styles.badgeSuccess]}>
                {product.isLowStock ? 'Low stock' : 'In stock'}
              </Text>
              <View style={styles.rowGap}>
                <TouchableOpacity style={styles.inlineButton} onPress={() => openBarcodeLookup(product)}>
                  <Text style={styles.inlineButtonText}>View barcode</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {filteredProducts.length === 0 && <Text style={styles.emptyText}>No products found</Text>}

          {lowStockProducts.length > 0 && (
            <View style={styles.subPanel}>
              <Text style={styles.subTitle}>Low stock alerts</Text>
              {lowStockProducts.slice(0, 5).map((product) => (
                <Text key={product.id} style={styles.panelText}>
                  {product.name} - current {product.quantityOnHand}, reorder {product.reorderQuantity}
                </Text>
              ))}
            </View>
          )}
        </View>
      );
    }

    if (screen === 'inventory') {
      const filteredProducts = products.filter((product) => {
        const query = productSearch.toLowerCase();
        return (
          product.name?.toLowerCase().includes(query) ||
          product.sku?.toLowerCase().includes(query) ||
          product.barcode?.toLowerCase().includes(query)
        );
      });

      return (
        <View style={styles.section}>
          <View style={styles.panel}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <Text style={styles.sectionTitle}>Inventory</Text>
              <View style={styles.rowGap}>
                <TouchableOpacity style={styles.inlineButton} onPress={() => openInventoryModal('IN')}>
                  <Text style={styles.inlineButtonText}>Stock In</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.inlineButton, styles.inlineDangerButton]} onPress={() => openInventoryModal('OUT')}>
                  <Text style={styles.inlineButtonText}>Stock Out</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TextInput
              value={productSearch}
              onChangeText={setProductSearch}
              placeholder="Search products to adjust stock"
              placeholderTextColor="#6d7f98"
              style={styles.input}
            />
            {filteredProducts.map((product) => (
              <View key={product.id} style={styles.listCard}>
                <Text style={styles.listTitle}>{product.name}</Text>
                <Text style={styles.listMeta}>SKU: {product.sku}</Text>
                <Text style={styles.listMeta}>Available: {product.quantityOnHand}</Text>
                <Text style={styles.listMeta}>Reorder level: {product.reorderLevel}</Text>
                <View style={styles.rowGap}>
                  <TouchableOpacity style={styles.inlineButton} onPress={() => openInventoryProduct(product)}>
                    <Text style={styles.inlineButtonText}>Movements</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.inlineButton} onPress={() => openInventoryModal('IN', product)}>
                    <Text style={styles.inlineButtonText}>In</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.inlineButton, styles.inlineDangerButton]} onPress={() => openInventoryModal('OUT', product)}>
                    <Text style={styles.inlineButtonText}>Out</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {filteredProducts.length === 0 && <Text style={styles.emptyText}>No products found</Text>}
          </View>

          {inventorySelectedProduct && (
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Recent movements</Text>
              <Text style={styles.panelText}>{inventorySelectedProduct.name}</Text>
              {inventoryMovements.map((movement) => (
                <View key={movement.id} style={styles.listCard}>
                  <Text style={styles.listTitle}>{movement.movementType}</Text>
                  <Text style={styles.listMeta}>Qty: {movement.quantity}</Text>
                  <Text style={styles.listMeta}>By: {movement.createdByUsername || '—'}</Text>
                  <Text style={styles.listMeta}>Date: {movement.createdAt ? new Date(movement.createdAt).toLocaleString() : '—'}</Text>
                </View>
              ))}
              {inventoryMovements.length === 0 && <Text style={styles.emptyText}>No movements yet</Text>}
            </View>
          )}
        </View>
      );
    }

    if (screen === 'orders') {
      return (
        <View style={styles.panel}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <Text style={styles.sectionTitle}>Buy orders</Text>
            {canManage && (
              <TouchableOpacity style={styles.inlineButton} onPress={openOrderModal}>
                <Text style={styles.inlineButtonText}>+ New Order</Text>
              </TouchableOpacity>
            )}
          </View>
          {orders.map((order) => (
            <View key={order.id} style={styles.listCard}>
              <Text style={styles.listTitle}>{order.orderNo}</Text>
              <Text style={styles.listMeta}>Supplier: {order.supplierName}</Text>
              <Text style={styles.listMeta}>Created by: {order.createdByUsername}</Text>
              <Text style={styles.listMeta}>Total: $ {formatMoney(order.totalAmount)}</Text>
              <Text style={styles.listMeta}>Status: {order.status}</Text>
              <View style={styles.rowGap}>
                {order.status === 'PENDING' && (
                  <TouchableOpacity style={styles.inlineButton} onPress={() => handleOrderAction(order.id, 'approve')}>
                    <Text style={styles.inlineButtonText}>Approve</Text>
                  </TouchableOpacity>
                )}
                {order.status === 'APPROVED' && (
                  <TouchableOpacity style={styles.inlineButton} onPress={() => handleOrderAction(order.id, 'receive')}>
                    <Text style={styles.inlineButtonText}>Receive</Text>
                  </TouchableOpacity>
                )}
                {['PENDING', 'DRAFT'].includes(order.status) && (
                  <TouchableOpacity style={[styles.inlineButton, styles.inlineDangerButton]} onPress={() => handleOrderAction(order.id, 'cancel')}>
                    <Text style={styles.inlineButtonText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
          {orders.length === 0 && <Text style={styles.emptyText}>No orders available</Text>}
        </View>
      );
    }

    if (screen === 'suppliers') {
      return (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Suppliers</Text>
          {suppliers.map((supplier) => (
            <View key={supplier.id} style={styles.listCard}>
              <Text style={styles.listTitle}>{supplier.name}</Text>
              <Text style={styles.listMeta}>Contact: {supplier.contactPerson || '—'}</Text>
              <Text style={styles.listMeta}>Phone: {supplier.phone || '—'}</Text>
              <Text style={styles.listMeta}>Email: {supplier.email || '—'}</Text>
              <Text style={styles.listMeta}>Lead time: {supplier.leadTimeDays ?? '—'} days</Text>
            </View>
          ))}
          {suppliers.length === 0 && <Text style={styles.emptyText}>No suppliers available</Text>}
        </View>
      );
    }

    if (screen === 'users') {
      return (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Users</Text>
          {users.map((account) => (
            <View key={account.id} style={styles.listCard}>
              <Text style={styles.listTitle}>{account.fullName || account.username}</Text>
              <Text style={styles.listMeta}>Username: {account.username}</Text>
              <Text style={styles.listMeta}>Email: {account.email || '—'}</Text>
              <Text style={styles.listMeta}>Role: {account.role}</Text>
            </View>
          ))}
          {users.length === 0 && <Text style={styles.emptyText}>No users found</Text>}
        </View>
      );
    }

    if (screen === 'audit') {
      return (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Recent audit logs</Text>
          {auditLogs.map((log) => (
            <View key={log.id} style={styles.listCard}>
              <Text style={styles.listTitle}>{log.action}</Text>
              <Text style={styles.listMeta}>User: {log.username || '—'}</Text>
              <Text style={styles.listMeta}>Entity: {log.entityType || '—'} #{log.entityId ?? '—'}</Text>
              <Text style={styles.listMeta}>Time: {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}</Text>
            </View>
          ))}
          {auditLogs.length === 0 && <Text style={styles.emptyText}>No audit logs available</Text>}
        </View>
      );
    }

    if (screen === 'reports') {
      const orderStatuses = ['DRAFT', 'PENDING', 'APPROVED', 'ORDERED', 'RECEIVED', 'CANCELLED']
        .map((status) => ({
          status,
          count: orders.filter((order) => order.status === status).length,
        }))
        .filter((entry) => entry.count > 0);

      return (
        <View style={styles.section}>
          <View style={styles.statsGrid}>
            <StatCard label="Total Products" value={dashboard?.totalProducts ?? '—'} />
            <StatCard label="Low Stock" value={dashboard?.lowStockCount ?? '—'} />
            <StatCard label="Orders" value={orders.length || '—'} />
          </View>
          <View style={styles.statsGrid}>
            <StatCard label="Inventory Value" value={dashboard ? `$${formatMoney(dashboard.totalInventoryValue)}` : '—'} wide />
            <StatCard label="Profit Margin" value={dashboard ? `${dashboard.profitMarginPercent}%` : '—'} wide />
          </View>
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Orders by status</Text>
            {orderStatuses.map((entry) => (
              <Text key={entry.status} style={styles.panelText}>
                {entry.status}: {entry.count}
              </Text>
            ))}
          </View>
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Low stock items</Text>
            {lowStockProducts.slice(0, 8).map((product) => (
              <Text key={product.id} style={styles.panelText}>
                {product.name} - {product.quantityOnHand} on hand, min {product.reorderLevel}
              </Text>
            ))}
          </View>
        </View>
      );
    }

    if (screen === 'ai') {
      return (
        <View style={styles.section}>
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>AI forecast</Text>
            <Text style={styles.panelText}>{aiForecast || 'No forecast loaded yet.'}</Text>
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Inventory alerts</Text>
            {aiAlerts.map((alert) => (
              <View key={alert.id} style={styles.listCard}>
                <Text style={styles.listTitle}>{alert.title || alert.alertType || 'Alert'}</Text>
                <Text style={styles.listMeta}>{alert.message}</Text>
                <Text style={styles.listMeta}>Severity: {alert.severity || '—'}</Text>
                {!alert.isRead && (
                  <TouchableOpacity style={styles.inlineButton} onPress={() => handleMarkAlertRead(alert.id)}>
                    <Text style={styles.inlineButtonText}>Mark read</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {aiAlerts.length === 0 && <Text style={styles.emptyText}>No AI alerts available</Text>}
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>AI assistant</Text>
            <TextInput
              value={aiMessage}
              onChangeText={setAiMessage}
              placeholder="Ask about stock, reorder needs, or sales"
              placeholderTextColor="#6d7f98"
              style={styles.input}
              multiline
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleSendAiMessage} activeOpacity={0.86}>
              {loading ? <ActivityIndicator color="#07111f" /> : <Text style={styles.primaryButtonText}>Send</Text>}
            </TouchableOpacity>
            {!!aiReply && <Text style={styles.panelText}>{aiReply}</Text>}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <View style={styles.statsGrid}>
          <StatCard label="Products" value={dashboard?.totalProducts ?? '—'} />
          <StatCard label="Active" value={dashboard?.activeProducts ?? '—'} />
          <StatCard label="Low stock" value={dashboard?.lowStockCount ?? '—'} />
        </View>

        <View style={styles.statsGrid}>
          <StatCard label="Inventory value" value={dashboard ? `$${formatMoney(dashboard.totalInventoryValue)}` : '—'} wide />
          <StatCard label="Profit margin" value={dashboard ? `${dashboard.profitMarginPercent}%` : '—'} wide />
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Stock movement summary</Text>
          <Text style={styles.panelText}>Received: {movementSummary?.received ?? '—'}</Text>
          <Text style={styles.panelText}>Sold: {movementSummary?.sold ?? '—'}</Text>
          <Text style={styles.panelText}>Returns: {movementSummary?.returns ?? '—'}</Text>
          <Text style={styles.panelText}>Transfers: {movementSummary?.transfers ?? '—'}</Text>
          <Text style={styles.panelText}>Period: {movementSummary?.period ?? '—'}</Text>
        </View>
      </View>
    );
  };

  if (booting) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.bootText}>Restoring session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.kicker}>Android frontend</Text>
          <Text style={styles.title}>Inventory mobile app</Text>
          <Text style={styles.subtitle}>
            Connect this app to your Spring Boot backend by entering the PC's LAN address. For this machine, the backend URL is http://192.168.1.11:8080.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backend URL</Text>
          <TextInput
            value={baseUrl}
            onChangeText={setBaseUrl}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="http://192.168.1.11:8080"
            placeholderTextColor="#6d7f98"
            style={styles.input}
          />
          <TouchableOpacity style={styles.secondaryButton} onPress={handleSaveBaseUrl} activeOpacity={0.86}>
            <Text style={styles.secondaryButtonText}>Save backend URL</Text>
          </TouchableOpacity>
        </View>

        {!token ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sign in</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Username"
              placeholderTextColor="#6d7f98"
              style={styles.input}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Password"
              placeholderTextColor="#6d7f98"
              style={styles.input}
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} activeOpacity={0.86}>
              {loading ? <ActivityIndicator color="#07111f" /> : <Text style={styles.primaryButtonText}>Log in</Text>}
            </TouchableOpacity>
            <Text style={styles.helperText}>Demo credentials: admin / Admin@123</Text>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.profileCard}>
              <Text style={styles.sectionTitle}>Welcome back</Text>
              <Text style={styles.profileText}>{user?.fullName || user?.username || 'Signed in user'}</Text>
              <Text style={styles.profileMeta}>{user?.role || 'ROLE'}</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.screenNav}>
              {((user?.role === 'ROLE_EMPLOYEE')
                ? [['products', 'Products']]
                : [
                    ['dashboard', 'Overview'],
                    ['products', 'Products'],
                    ['inventory', 'Inventory'],
                    ['orders', 'Orders'],
                    ['suppliers', 'Suppliers'],
                    ['reports', 'Reports'],
                    ['users', 'Users'],
                    ['audit', 'Audit'],
                    ['ai', 'AI'],
                  ]).map(([value, label]) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.screenPill, screen === value && styles.screenPillActive]}
                  onPress={() => openScreen(value)}
                  activeOpacity={0.86}
                >
                  <Text style={[styles.screenPillText, screen === value && styles.screenPillTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionButton} onPress={handleRefresh} activeOpacity={0.86}>
                <Text style={styles.actionText}>{loading ? 'Refreshing...' : 'Refresh data'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.logoutButton]} onPress={handleLogout} activeOpacity={0.86}>
                <Text style={styles.actionText}>Log out</Text>
              </TouchableOpacity>
            </View>

            {renderScreenContent()}
          </View>
        )}

        {!!error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Backend error</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Modal visible={productModalVisible} transparent animationType="fade" onRequestClose={() => setProductModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Add Product</Text>
              {[
                ['Name*', 'name'],
                ['SKU*', 'sku'],
                ['Barcode', 'barcode'],
                ['Description', 'description'],
                ['Image URL', 'imageUrl'],
                ['Location', 'location'],
                ['Unit Price', 'unitPrice'],
                ['Cost Price', 'costPrice'],
                ['Quantity on Hand', 'quantityOnHand'],
                ['Reorder Level', 'reorderLevel'],
                ['Reorder Qty', 'reorderQuantity'],
              ].map(([label, key]) => (
                <View key={key} style={styles.modalField}>
                  <Text style={styles.modalFieldLabel}>{label}</Text>
                  <TextInput
                    value={productForm[key]}
                    onChangeText={(value) => setProductForm((current) => ({ ...current, [key]: value }))}
                    placeholder={label}
                    placeholderTextColor="#6d7f98"
                    style={styles.input}
                  />
                </View>
              ))}
              <View style={styles.rowGap}>
                <TouchableOpacity style={styles.primaryButton} onPress={handleCreateProduct} activeOpacity={0.86}>
                  {productSaving ? <ActivityIndicator color="#07111f" /> : <Text style={styles.primaryButtonText}>Save</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setProductModalVisible(false)} activeOpacity={0.86}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={orderModalVisible} transparent animationType="fade" onRequestClose={() => setOrderModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Buy Order</Text>
              <View style={styles.modalField}>
                <Text style={styles.modalFieldLabel}>Supplier*</Text>
                <View style={styles.pickerBox}>
                  <TextInput
                    value={orderForm.supplierId}
                    onChangeText={(value) => setOrderForm((current) => ({ ...current, supplierId: value }))}
                    placeholder="Supplier ID"
                    placeholderTextColor="#6d7f98"
                    style={styles.input}
                  />
                </View>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalFieldLabel}>Expected date</Text>
                <TextInput
                  value={orderForm.expectedDate}
                  onChangeText={(value) => setOrderForm((current) => ({ ...current, expectedDate: value }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#6d7f98"
                  style={styles.input}
                />
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalFieldLabel}>Notes</Text>
                <TextInput
                  value={orderForm.notes}
                  onChangeText={(value) => setOrderForm((current) => ({ ...current, notes: value }))}
                  placeholder="Optional notes"
                  placeholderTextColor="#6d7f98"
                  style={styles.input}
                  multiline
                />
              </View>
              {orderForm.items.map((item, index) => (
                <View key={index} style={styles.listCard}>
                  <Text style={styles.modalFieldLabel}>Item {index + 1}</Text>
                  <TextInput
                    value={item.productId}
                    onChangeText={(value) => updateOrderItem(index, 'productId', value)}
                    placeholder="Product ID"
                    placeholderTextColor="#6d7f98"
                    style={styles.input}
                  />
                  <TextInput
                    value={item.quantity}
                    onChangeText={(value) => updateOrderItem(index, 'quantity', value)}
                    placeholder="Quantity"
                    placeholderTextColor="#6d7f98"
                    style={styles.input}
                  />
                  <TextInput
                    value={item.unitCost}
                    onChangeText={(value) => updateOrderItem(index, 'unitCost', value)}
                    placeholder="Unit cost"
                    placeholderTextColor="#6d7f98"
                    style={styles.input}
                  />
                </View>
              ))}
              <TouchableOpacity style={styles.inlineButton} onPress={addOrderItem} activeOpacity={0.86}>
                <Text style={styles.inlineButtonText}>+ Add item</Text>
              </TouchableOpacity>
              <View style={styles.rowGap}>
                <TouchableOpacity style={styles.primaryButton} onPress={handleCreateOrder} activeOpacity={0.86}>
                  {orderSaving ? <ActivityIndicator color="#07111f" /> : <Text style={styles.primaryButtonText}>Create</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setOrderModalVisible(false)} activeOpacity={0.86}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={inventoryModalVisible} transparent animationType="fade" onRequestClose={() => setInventoryModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Adjust Stock</Text>
              <View style={styles.modalField}>
                <Text style={styles.modalFieldLabel}>Product</Text>
                <TextInput
                  value={inventoryForm.productId}
                  onChangeText={(value) => setInventoryForm((current) => ({ ...current, productId: value }))}
                  placeholder="Product ID"
                  placeholderTextColor="#6d7f98"
                  style={styles.input}
                />
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalFieldLabel}>Type</Text>
                <TextInput
                  value={inventoryForm.movementType}
                  onChangeText={(value) => setInventoryForm((current) => ({ ...current, movementType: value.toUpperCase() }))}
                  placeholder="IN or OUT"
                  placeholderTextColor="#6d7f98"
                  style={styles.input}
                />
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalFieldLabel}>Quantity</Text>
                <TextInput
                  value={inventoryForm.quantity}
                  onChangeText={(value) => setInventoryForm((current) => ({ ...current, quantity: value }))}
                  keyboardType="numeric"
                  placeholder="Quantity"
                  placeholderTextColor="#6d7f98"
                  style={styles.input}
                />
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalFieldLabel}>Unit cost</Text>
                <TextInput
                  value={inventoryForm.unitCost}
                  onChangeText={(value) => setInventoryForm((current) => ({ ...current, unitCost: value }))}
                  keyboardType="numeric"
                  placeholder="Optional unit cost"
                  placeholderTextColor="#6d7f98"
                  style={styles.input}
                />
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalFieldLabel}>Reference</Text>
                <TextInput
                  value={inventoryForm.referenceNo}
                  onChangeText={(value) => setInventoryForm((current) => ({ ...current, referenceNo: value }))}
                  placeholder="Reference number"
                  placeholderTextColor="#6d7f98"
                  style={styles.input}
                />
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalFieldLabel}>Notes</Text>
                <TextInput
                  value={inventoryForm.notes}
                  onChangeText={(value) => setInventoryForm((current) => ({ ...current, notes: value }))}
                  placeholder="Stock in/out note"
                  placeholderTextColor="#6d7f98"
                  style={styles.input}
                  multiline
                />
              </View>
              <View style={styles.rowGap}>
                <TouchableOpacity style={styles.primaryButton} onPress={handleInventorySubmit} activeOpacity={0.86}>
                  {inventorySaving ? <ActivityIndicator color="#07111f" /> : <Text style={styles.primaryButtonText}>Apply</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setInventoryModalVisible(false)} activeOpacity={0.86}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={barcodeModalVisible} transparent animationType="fade" onRequestClose={closeBarcodeLookup}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{barcodeProduct?.name || 'Product barcode'}</Text>
              <Text style={styles.modalMeta}>SKU: {barcodeProduct?.sku || '—'}</Text>
              <Text style={styles.modalMeta}>Barcode: {barcodeProduct?.barcode || '—'}</Text>

              {!!barcodeData?.barcode && (
                <View style={styles.modalImageBlock}>
                  <Text style={styles.modalSectionTitle}>Barcode</Text>
                  <Image
                    source={{ uri: `data:image/png;base64,${barcodeData.barcode}` }}
                    style={styles.modalImage}
                  />
                </View>
              )}

              {!!barcodeData?.qrCode && (
                <View style={styles.modalImageBlock}>
                  <Text style={styles.modalSectionTitle}>QR Code</Text>
                  <Image
                    source={{ uri: `data:image/png;base64,${barcodeData.qrCode}` }}
                    style={styles.modalImage}
                  />
                </View>
              )}

              <TouchableOpacity style={styles.primaryButton} onPress={closeBarcodeLookup} activeOpacity={0.86}>
                <Text style={styles.primaryButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, wide }) {
  return (
    <View style={[styles.statCard, wide && styles.statCardWide]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const colors = {
  background: '#07111f',
  card: '#0e1c31',
  cardAlt: '#12233d',
  text: '#eff6ff',
  muted: '#8ea2bf',
  accent: '#66d9e8',
  accentSoft: 'rgba(102, 217, 232, 0.14)',
  danger: '#ff8fa3',
  dangerSoft: 'rgba(255, 143, 163, 0.12)',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: 20,
    gap: 18,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  bootText: {
    color: colors.muted,
    marginTop: 14,
    fontSize: 15,
  },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  kicker: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    marginBottom: 12,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  input: {
    backgroundColor: colors.cardAlt,
    color: colors.text,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#07111f',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(102, 217, 232, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  helperText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  screenNav: {
    gap: 10,
    paddingVertical: 2,
  },
  screenPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginRight: 10,
  },
  screenPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  screenPillText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  screenPillTextActive: {
    color: '#07111f',
  },
  actionButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(102, 217, 232, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    backgroundColor: colors.dangerSoft,
    borderColor: 'rgba(255, 143, 163, 0.28)',
  },
  actionText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardAlt,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statCardWide: {
    minHeight: 88,
  },
  statValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 6,
  },
  profileText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  profileMeta: {
    color: colors.muted,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  panel: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  panelText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  subPanel: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  subTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  listCard: {
    backgroundColor: colors.cardAlt,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 4,
  },
  listTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  listMeta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '800',
  },
  badgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    color: '#6ee7b7',
  },
  badgeWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    color: '#fbbf24',
  },
  rowGap: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  inlineButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(102, 217, 232, 0.35)',
  },
  inlineDangerButton: {
    backgroundColor: colors.dangerSoft,
    borderColor: 'rgba(255, 143, 163, 0.28)',
  },
  inlineButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  modalField: {
    gap: 8,
  },
  modalFieldLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  pickerBox: {
    borderRadius: 16,
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 2,
  },
  modalMeta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  modalImageBlock: {
    gap: 8,
  },
  modalSectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  modalImage: {
    width: '100%',
    height: 160,
    resizeMode: 'contain',
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  errorCard: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 143, 163, 0.35)',
    gap: 6,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '800',
  },
  errorText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
