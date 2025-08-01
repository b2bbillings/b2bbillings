import {useState, useCallback, useMemo, useEffect} from "react";

/**
 * Custom hook for managing sales order data
 * Handles fetching, caching, filtering, and transformation of order data
 */
const useOrderData = ({
  companyId,
  propSalesOrders = [],
  propIsLoading = false,
  saleOrderService,
  sortBy = "date",
  sortOrder = "desc",
  filterStatus = "all",
  searchTerm = "",
  refreshTrigger,
  addToast,
  isQuotationsMode = false,
  activeOrderType = "all",
  enableCaching = true,
  cacheDuration = 30000, // 30 seconds
  autoRefresh = false,
  autoRefreshInterval = 60000, // 1 minute
}) => {
  // ✅ Core data state
  const [salesOrders, setSalesOrders] = useState(propSalesOrders);
  const [isLoading, setIsLoading] = useState(propIsLoading);
  const [fetchError, setFetchError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [cacheKey, setCacheKey] = useState(null);

  // ✅ Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingOperation, setProcessingOperation] = useState(null);

  // ✅ Statistics state
  const [orderStats, setOrderStats] = useState({
    total: 0,
    confirmed: 0,
    needsConfirmation: 0,
    cancelled: 0,
    totalValue: 0,
    averageOrderValue: 0,
  });

  // ✅ Generate cache key for current parameters
  const generateCacheKey = useCallback(() => {
    return `sales_orders_${companyId}_${sortBy}_${sortOrder}_${filterStatus}_${searchTerm}_${activeOrderType}`;
  }, [companyId, sortBy, sortOrder, filterStatus, searchTerm, activeOrderType]);

  // ✅ Get cached data
  const getCachedData = useCallback(
    (key) => {
      if (!enableCaching) return null;

      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const parsedCache = JSON.parse(cached);
          const now = Date.now();

          if (now - parsedCache.timestamp < cacheDuration) {
            return parsedCache.data;
          } else {
            // Remove expired cache
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.warn("Cache retrieval error:", error);
      }

      return null;
    },
    [enableCaching, cacheDuration]
  );

  // ✅ Set cached data
  const setCachedData = useCallback(
    (key, data) => {
      if (!enableCaching) return;

      try {
        const cacheData = {
          data: data,
          timestamp: Date.now(),
          key: key,
        };
        localStorage.setItem(key, JSON.stringify(cacheData));
      } catch (error) {
        console.warn("Cache storage error:", error);
      }
    },
    [enableCaching]
  );

  // ✅ Clear cache
  const clearCache = useCallback(
    (pattern = null) => {
      if (!enableCaching) return;

      try {
        if (pattern) {
          // Clear specific pattern
          const keys = Object.keys(localStorage);
          keys.forEach((key) => {
            if (key.includes(pattern)) {
              localStorage.removeItem(key);
            }
          });
        } else {
          // Clear all sales order caches
          const keys = Object.keys(localStorage);
          keys.forEach((key) => {
            if (key.startsWith("sales_orders_")) {
              localStorage.removeItem(key);
            }
          });
        }
      } catch (error) {
        console.warn("Cache clearing error:", error);
      }
    },
    [enableCaching]
  );

  // ✅ Enhanced data fetching with caching and error handling
  const fetchSalesOrders = useCallback(
    async (force = false, showLoading = true) => {
      const currentCacheKey = generateCacheKey();

      // Skip if data is fresh and not forced
      if (!force && lastFetchTime && Date.now() - lastFetchTime < 30000) {
        return {success: true, fromCache: false, skipped: true};
      }

      // Try cache first
      if (!force && enableCaching) {
        const cachedData = getCachedData(currentCacheKey);
        if (cachedData) {
          setSalesOrders(cachedData.orders || []);
          setOrderStats(cachedData.stats || {});
          setLastFetchTime(Date.now());
          setFetchError(null);
          return {success: true, fromCache: true, data: cachedData};
        }
      }

      try {
        if (showLoading) {
          setIsLoading(true);
        }
        setFetchError(null);
        setCacheKey(currentCacheKey);

        // Validate required parameters
        if (!companyId) {
          throw new Error("Company ID is required for fetching orders");
        }

        if (
          !saleOrderService ||
          typeof saleOrderService.getSalesOrders !== "function"
        ) {
          throw new Error("Sales order service is not available");
        }

        // Prepare fetch parameters
        const fetchParams = {
          includeCustomer: true,
          includeItems: true,
          includeStats: true,
          sortBy: sortBy || "date",
          sortOrder: sortOrder || "desc",
          status: filterStatus !== "all" ? filterStatus : undefined,
          search: searchTerm || undefined,
          page: 1,
          limit: 1000, // Get all orders for now
          orderType: isQuotationsMode ? "quotation" : "sales_order",
          documentType: isQuotationsMode ? "quotation" : "sales-order",
        };

        // Make the API call
        const response = await saleOrderService.getSalesOrders(
          companyId,
          fetchParams
        );

        if (response?.success && response?.data) {
          // ✅ Enhanced data extraction with comprehensive fallbacks
          let orders = [];
          let stats = {};

          // Extract orders from response
          if (Array.isArray(response.data)) {
            orders = response.data;
          } else if (response.data && typeof response.data === "object") {
            const possibleArrayKeys = [
              "salesOrders",
              "orders",
              "data",
              "sales_orders",
              "saleOrders",
              "transactions",
              "documents",
              "items",
              "results",
              "records",
              "quotations",
              "quotation",
              "salesOrder",
              "order",
              "list",
            ];

            for (const key of possibleArrayKeys) {
              if (response.data[key] && Array.isArray(response.data[key])) {
                orders = response.data[key];
                break;
              }
            }

            // Extract stats if available
            stats =
              response.data.stats ||
              response.data.statistics ||
              response.data.summary ||
              {};
          }

          // Process and validate orders
          const processedOrders = processOrdersData(orders);
          const calculatedStats = calculateOrderStats(processedOrders);
          const finalStats = {...calculatedStats, ...stats};

          // Update state
          setSalesOrders(processedOrders);
          setOrderStats(finalStats);
          setLastFetchTime(Date.now());
          setFetchError(null);

          // Cache the data
          if (enableCaching) {
            setCachedData(currentCacheKey, {
              orders: processedOrders,
              stats: finalStats,
              fetchTime: Date.now(),
            });
          }

          return {
            success: true,
            data: {orders: processedOrders, stats: finalStats},
            fromCache: false,
          };
        } else {
          throw new Error(
            response?.message ||
              "Failed to fetch sales orders - Invalid response"
          );
        }
      } catch (error) {
        const errorMessage = error.message || "Unknown error occurred";
        setFetchError(errorMessage);

        if (addToast) {
          addToast(`Failed to fetch sales orders: ${errorMessage}`, "error");
        }

        // Fallback to provided data
        if (propSalesOrders && propSalesOrders.length > 0) {
          const processedOrders = processOrdersData(propSalesOrders);
          const calculatedStats = calculateOrderStats(processedOrders);
          setSalesOrders(processedOrders);
          setOrderStats(calculatedStats);
        } else {
          setSalesOrders([]);
          setOrderStats({
            total: 0,
            confirmed: 0,
            needsConfirmation: 0,
            cancelled: 0,
            totalValue: 0,
            averageOrderValue: 0,
          });
        }

        return {success: false, error: errorMessage};
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [
      companyId,
      sortBy,
      sortOrder,
      filterStatus,
      searchTerm,
      isQuotationsMode,
      saleOrderService,
      propSalesOrders,
      addToast,
      lastFetchTime,
      enableCaching,
      generateCacheKey,
      getCachedData,
      setCachedData,
    ]
  );

  // ✅ Process raw orders data with validation and transformation
  const processOrdersData = useCallback((rawOrders) => {
    if (!Array.isArray(rawOrders)) {
      return [];
    }

    return rawOrders
      .filter((order) => order != null) // Remove null/undefined
      .map((order, index) => {
        try {
          // ✅ Enhanced order processing with fallbacks
          const processedOrder = {
            ...order,

            // ✅ Ensure required ID fields
            id: order._id || order.id || `order-${index}-${Date.now()}`,
            _id: order._id || order.id || `order-${index}-${Date.now()}`,

            // ✅ Normalize order number
            orderNumber:
              order.orderNumber ||
              order.salesOrderNumber ||
              order.orderNo ||
              order.billNumber ||
              order.quotationNumber ||
              `ORD-${index + 1}`,

            // ✅ Normalize dates
            orderDate:
              order.orderDate ||
              order.saleDate ||
              order.billDate ||
              order.date ||
              order.createdAt ||
              new Date().toISOString(),

            // ✅ Normalize customer information
            displayCustomerName:
              order.customerName ||
              order.customer?.name ||
              order.partyName ||
              "Unknown Customer",

            customerName:
              order.customerName ||
              order.customer?.name ||
              order.partyName ||
              "Unknown Customer",

            customerMobile:
              order.customerMobile ||
              order.customer?.mobile ||
              order.customer?.phone ||
              order.partyPhone ||
              order.mobileNumber ||
              "",

            customerEmail:
              order.customerEmail ||
              order.customer?.email ||
              order.partyEmail ||
              "",

            // ✅ Normalize amounts
            displayAmount: parseFloat(
              order.amount ||
                order.total ||
                order.totals?.finalTotal ||
                order.grandTotal ||
                order.orderValue ||
                0
            ),

            amount: parseFloat(
              order.amount ||
                order.total ||
                order.totals?.finalTotal ||
                order.grandTotal ||
                order.orderValue ||
                0
            ),

            // ✅ Normalize status
            displayStatus: order.status || "draft",
            status: order.status || "draft",

            // ✅ Normalize items
            items: Array.isArray(order.items) ? order.items : [],
            itemsCount: Array.isArray(order.items) ? order.items.length : 0,

            // ✅ Source tracking
            isAutoGenerated: Boolean(order.isAutoGenerated),
            generatedFrom: order.generatedFrom || order.sourceOrderType || null,
            sourceOrderId: order.sourceOrderId || null,
            sourceOrderNumber: order.sourceOrderNumber || null,
            sourceOrderType: order.sourceOrderType || null,
            sourceCompanyId: order.sourceCompanyId || null,

            // ✅ Confirmation tracking
            isConfirmed: Boolean(
              order.isConfirmed ||
                order.confirmedAt ||
                order.status === "confirmed"
            ),
            confirmedAt: order.confirmedAt || null,
            confirmedBy: order.confirmedBy || null,

            // ✅ Additional metadata
            priority: order.priority || "normal",
            notes: order.notes || order.description || "",
            expectedDeliveryDate:
              order.expectedDeliveryDate || order.deliveryDate || null,

            // ✅ Processing flags
            isProcessed: true,
            processedAt: new Date().toISOString(),

            // ✅ Keep original data for reference
            originalData: order,
          };

          return processedOrder;
        } catch (error) {
          console.warn(`Error processing order at index ${index}:`, error);
          // Return minimal order object on error
          return {
            id: `error-order-${index}`,
            _id: `error-order-${index}`,
            orderNumber: `ERROR-${index}`,
            orderDate: new Date().toISOString(),
            displayCustomerName: "Error Processing",
            customerName: "Error Processing",
            displayAmount: 0,
            amount: 0,
            displayStatus: "error",
            status: "error",
            items: [],
            itemsCount: 0,
            isAutoGenerated: false,
            isConfirmed: false,
            priority: "normal",
            notes: "Error processing this order",
            error: error.message,
            originalData: order,
          };
        }
      });
  }, []);

  // ✅ Calculate comprehensive order statistics
  const calculateOrderStats = useCallback((orders) => {
    if (!Array.isArray(orders) || orders.length === 0) {
      return {
        total: 0,
        confirmed: 0,
        needsConfirmation: 0,
        cancelled: 0,
        totalValue: 0,
        averageOrderValue: 0,
        byStatus: {},
        byType: {},
        byPriority: {},
      };
    }

    const stats = {
      total: orders.length,
      confirmed: 0,
      needsConfirmation: 0,
      cancelled: 0,
      totalValue: 0,
      averageOrderValue: 0,
      byStatus: {},
      byType: {},
      byPriority: {},
    };

    // Calculate detailed statistics
    orders.forEach((order) => {
      // Status counts
      const status = order.status || "unknown";
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      if (status === "cancelled" || status === "deleted") {
        stats.cancelled++;
      }

      // Confirmation tracking
      const needsConfirmation = Boolean(
        order.isAutoGenerated &&
          order.generatedFrom === "purchase_order" &&
          (order.status === "sent" || order.status === "draft") &&
          !order.confirmedAt &&
          !order.isConfirmed &&
          order.status !== "confirmed"
      );

      const isConfirmed = Boolean(
        order.isAutoGenerated &&
          order.generatedFrom === "purchase_order" &&
          (order.status === "confirmed" ||
            order.confirmedAt ||
            order.isConfirmed)
      );

      if (needsConfirmation) {
        stats.needsConfirmation++;
      }

      if (isConfirmed) {
        stats.confirmed++;
      }

      // Order type tracking
      const orderType = order.isAutoGenerated ? "auto" : "manual";
      stats.byType[orderType] = (stats.byType[orderType] || 0) + 1;

      // Priority tracking
      const priority = order.priority || "normal";
      stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;

      // Value calculations (exclude cancelled orders)
      if (status !== "cancelled" && status !== "deleted") {
        const orderValue = parseFloat(order.amount || 0);
        stats.totalValue += orderValue;
      }
    });

    // Calculate average
    const activeOrders = stats.total - stats.cancelled;
    stats.averageOrderValue =
      activeOrders > 0 ? stats.totalValue / activeOrders : 0;

    return stats;
  }, []);

  // ✅ Order categorization based on source
  const categorizeOrders = useMemo(() => {
    const all = Array.isArray(salesOrders) ? salesOrders : [];
    const selfCreated = [];
    const fromPurchaseOrders = [];
    const autoGenerated = [];

    all.forEach((order) => {
      if (!order) return;

      const isFromPurchaseOrder = Boolean(
        order.isAutoGenerated === true &&
          order.sourceOrderId &&
          order.sourceOrderType === "purchase_order"
      );

      if (isFromPurchaseOrder) {
        fromPurchaseOrders.push(order);
        if (order.isAutoGenerated === true) {
          autoGenerated.push(order);
        }
      } else {
        selfCreated.push(order);
      }
    });

    return {all, selfCreated, fromPurchaseOrders, autoGenerated};
  }, [salesOrders]);

  // ✅ Get filtered orders based on current filters
  const getFilteredOrders = useCallback(
    (customFilters = {}) => {
      const filters = {
        orderType: activeOrderType,
        searchTerm: searchTerm,
        status: filterStatus,
        sortBy: sortBy,
        sortOrder: sortOrder,
        ...customFilters,
      };

      let orders = [...(salesOrders || [])];

      // Apply order type filter
      switch (filters.orderType) {
        case "self":
          orders = categorizeOrders.selfCreated;
          break;
        case "fromPO":
          orders = categorizeOrders.fromPurchaseOrders;
          break;
        case "auto":
          orders = categorizeOrders.autoGenerated;
          break;
        default:
          orders = categorizeOrders.all;
      }

      // Apply search filter
      if (filters.searchTerm && filters.searchTerm.trim()) {
        const searchLower = filters.searchTerm.toLowerCase();
        orders = orders.filter(
          (order) =>
            (order.orderNumber || "").toLowerCase().includes(searchLower) ||
            (order.customerName || "").toLowerCase().includes(searchLower) ||
            (order.customerMobile || "").toLowerCase().includes(searchLower) ||
            (order.notes || "").toLowerCase().includes(searchLower)
        );
      }

      // Apply status filter
      if (filters.status && filters.status !== "all" && filters.status !== "") {
        orders = orders.filter((order) => order.status === filters.status);
      }

      // Apply sorting
      if (orders.length > 0) {
        orders.sort((a, b) => {
          let aVal, bVal;

          switch (filters.sortBy) {
            case "date":
              aVal = new Date(a.orderDate || a.date || a.createdAt || 0);
              bVal = new Date(b.orderDate || b.date || b.createdAt || 0);
              break;
            case "amount":
              aVal = parseFloat(a.amount || 0);
              bVal = parseFloat(b.amount || 0);
              break;
            case "customer":
              aVal = (a.customerName || "").toLowerCase();
              bVal = (b.customerName || "").toLowerCase();
              break;
            default:
              aVal = a.orderNumber || "";
              bVal = b.orderNumber || "";
          }

          if (filters.sortOrder === "desc") {
            return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
          } else {
            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          }
        });
      }

      return orders;
    },
    [
      salesOrders,
      categorizeOrders,
      activeOrderType,
      searchTerm,
      filterStatus,
      sortBy,
      sortOrder,
    ]
  );

  // ✅ Get filtered orders with memoization
  const filteredOrders = useMemo(() => {
    try {
      return getFilteredOrders();
    } catch (error) {
      console.error("Filter error:", error);
      return [];
    }
  }, [getFilteredOrders]);

  // ✅ Update single order in the list
  const updateOrder = useCallback(
    (orderId, updateData) => {
      setSalesOrders((prevOrders) => {
        return prevOrders.map((order) => {
          if ((order._id || order.id) === orderId) {
            const updatedOrder = {...order, ...updateData};
            return processOrdersData([updatedOrder])[0];
          }
          return order;
        });
      });

      // Clear cache to force refresh
      clearCache(`sales_orders_${companyId}`);
    },
    [processOrdersData, clearCache, companyId]
  );

  // ✅ Add new order to the list
  const addOrder = useCallback(
    (newOrder) => {
      const processedOrder = processOrdersData([newOrder])[0];
      setSalesOrders((prevOrders) => [processedOrder, ...prevOrders]);

      // Clear cache
      clearCache(`sales_orders_${companyId}`);
    },
    [processOrdersData, clearCache, companyId]
  );

  // ✅ Remove order from the list
  const removeOrder = useCallback(
    (orderId) => {
      setSalesOrders((prevOrders) => {
        return prevOrders.filter(
          (order) => (order._id || order.id) !== orderId
        );
      });

      // Clear cache
      clearCache(`sales_orders_${companyId}`);
    },
    [clearCache, companyId]
  );

  // ✅ Bulk update orders
  const bulkUpdateOrders = useCallback(
    (orderIds, updateData) => {
      setSalesOrders((prevOrders) => {
        return prevOrders.map((order) => {
          if (orderIds.includes(order._id || order.id)) {
            const updatedOrder = {...order, ...updateData};
            return processOrdersData([updatedOrder])[0];
          }
          return order;
        });
      });

      // Clear cache
      clearCache(`sales_orders_${companyId}`);
    },
    [processOrdersData, clearCache, companyId]
  );

  // ✅ Refresh data with optional parameters
  const refreshData = useCallback(
    async (options = {}) => {
      const {
        force = true,
        showLoading = true,
        clearCacheFirst = false,
      } = options;

      if (clearCacheFirst) {
        clearCache(`sales_orders_${companyId}`);
      }

      return await fetchSalesOrders(force, showLoading);
    },
    [fetchSalesOrders, clearCache, companyId]
  );

  // ✅ Effects for auto-refresh and initial fetch
  useEffect(() => {
    if (companyId) {
      fetchSalesOrders(true, true);
    }
  }, [companyId, refreshTrigger]);

  // ✅ Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && companyId) {
      const interval = setInterval(() => {
        fetchSalesOrders(false, false); // Silent refresh
      }, autoRefreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, autoRefreshInterval, companyId, fetchSalesOrders]);

  // ✅ Debounced filter changes effect
  useEffect(() => {
    if (companyId && lastFetchTime) {
      const delayedFetch = setTimeout(() => {
        fetchSalesOrders(false, false); // Silent refresh for filter changes
      }, 500);

      return () => clearTimeout(delayedFetch);
    }
  }, [
    searchTerm,
    filterStatus,
    sortBy,
    sortOrder,
    fetchSalesOrders,
    companyId,
    lastFetchTime,
  ]);

  // ✅ Return comprehensive hook interface
  return {
    // ✅ Data state
    salesOrders,
    filteredOrders,
    categorizeOrders,
    orderStats,

    // ✅ Loading state
    isLoading,
    isProcessing,
    processingOperation,
    fetchError,
    lastFetchTime,

    // ✅ Data management functions
    fetchSalesOrders,
    refreshData,
    updateOrder,
    addOrder,
    removeOrder,
    bulkUpdateOrders,

    // ✅ Filtering and processing
    getFilteredOrders,
    processOrdersData,
    calculateOrderStats,

    // ✅ Cache management
    clearCache,
    getCachedData,
    setCachedData,
    cacheKey,

    // ✅ Utility functions
    isEmpty: salesOrders.length === 0,
    hasData: salesOrders.length > 0,
    totalCount: salesOrders.length,
    filteredCount: filteredOrders.length,

    // ✅ Processing operations
    setIsProcessing,
    setProcessingOperation,

    // ✅ Manual state setters (for advanced use cases)
    setSalesOrders,
    setOrderStats,
    setFetchError,
  };
};

export default useOrderData;
