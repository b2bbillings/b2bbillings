import {useState, useCallback} from "react";
import {useNavigate, useLocation} from "react-router-dom";

/**
 * Custom hook for managing order actions like view, edit, delete, print, etc.
 * Centralizes all action logic and state management for better maintainability.
 */
const useOrderActions = ({
  // Core dependencies
  companyId,
  currentUser,
  addToast,

  // Services
  saleOrderService,

  // State setters
  setSelectedOrder,
  setViewModalShow,
  setModalError,
  setModalLoading,
  setDeletingOrders,

  // Current state
  deletingOrders,
  viewModalShow,

  // Callbacks
  onRefresh,
  transformOrderForEdit,

  // Document type info
  isInQuotationsMode,
  getNavigationPaths,

  // External handlers (optional)
  onViewOrder,
  onEditOrder,
  onDeleteOrder,
  onDuplicateOrder,
  onPrintOrder,
  onShareOrder,
  onDownloadOrder,
  onConvertOrder,
  onConfirmOrder,
  onApproveOrder,
  onShipOrder,
  onDeliverOrder,
  onCompleteOrder,
  onCancelOrder,
  onGeneratePurchaseOrder,
  onViewTrackingChain,
  onViewSourceOrder,
  onViewGeneratedOrders,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Local state for action management
  const [actionLoading, setActionLoading] = useState(new Set());
  const [lastAction, setLastAction] = useState(null);
  const [actionErrors, setActionErrors] = useState({});

  // ✅ Helper to track action loading state
  const setActionLoadingState = useCallback((orderId, action, loading) => {
    setActionLoading((prev) => {
      const newSet = new Set(prev);
      const key = `${orderId}-${action}`;
      if (loading) {
        newSet.add(key);
      } else {
        newSet.delete(key);
      }
      return newSet;
    });
  }, []);

  // ✅ Helper to check if action is loading
  const isActionLoading = useCallback(
    (orderId, action) => {
      return actionLoading.has(`${orderId}-${action}`);
    },
    [actionLoading]
  );

  // ✅ Set action error
  const setActionError = useCallback((orderId, action, error) => {
    setActionErrors((prev) => ({
      ...prev,
      [`${orderId}-${action}`]: error,
    }));
  }, []);

  // ✅ Clear action error
  const clearActionError = useCallback((orderId, action) => {
    setActionErrors((prev) => {
      const newErrors = {...prev};
      delete newErrors[`${orderId}-${action}`];
      return newErrors;
    });
  }, []);

  // ✅ Get action error
  const getActionError = useCallback(
    (orderId, action) => {
      return actionErrors[`${orderId}-${action}`];
    },
    [actionErrors]
  );

  // ✅ View order action
  const handleViewOrder = useCallback(
    async (order) => {
      const orderId = order._id || order.id;

      try {
        setActionLoadingState(orderId, "view", true);
        setModalLoading(true);
        setModalError(null);
        clearActionError(orderId, "view");

        // Transform order for viewing
        const transformedOrder = transformOrderForEdit(order);
        setSelectedOrder(transformedOrder);
        setViewModalShow(true);

        // Track action
        setLastAction({action: "view", orderId, timestamp: Date.now()});

        // Call external handler if provided
        onViewOrder?.(order);
      } catch (error) {
        const errorMessage = error.message || "Failed to load order details";
        setModalError(errorMessage);
        setActionError(orderId, "view", errorMessage);
        addToast?.(errorMessage, "error");
      } finally {
        setActionLoadingState(orderId, "view", false);
        setModalLoading(false);
      }
    },
    [
      transformOrderForEdit,
      setSelectedOrder,
      setViewModalShow,
      setModalLoading,
      setModalError,
      addToast,
      onViewOrder,
      setActionLoadingState,
      clearActionError,
      setActionError,
    ]
  );

  // ✅ Edit order action
  const handleEditOrder = useCallback(
    async (order) => {
      const orderId = order._id || order.id;

      try {
        setActionLoadingState(orderId, "edit", true);
        clearActionError(orderId, "edit");

        // Check if order can be edited
        if (order.status === "cancelled" || order.status === "deleted") {
          throw new Error("Cannot edit cancelled or deleted order");
        }

        // Transform order for editing
        const editTransformed = transformOrderForEdit(order);
        const navigationPaths = getNavigationPaths();
        const editPath = `/companies/${companyId}/${navigationPaths.editPath}/${orderId}/edit`;

        // Navigate to edit page
        navigate(editPath, {
          state: {
            salesOrder: editTransformed,
            order: editTransformed,
            documentType: isInQuotationsMode ? "quotation" : "sales-order",
            returnPath: location.pathname,
            editMode: true,
            isEdit: true,
            originalOrder: order,
          },
        });

        // Close modal if open
        if (viewModalShow) {
          setViewModalShow(false);
          setSelectedOrder(null);
        }

        // Track action
        setLastAction({action: "edit", orderId, timestamp: Date.now()});

        // Call external handler if provided
        onEditOrder?.(order);
      } catch (error) {
        const errorMessage = error.message || "Failed to edit order";
        setActionError(orderId, "edit", errorMessage);
        addToast?.(errorMessage, "error");
      } finally {
        setActionLoadingState(orderId, "edit", false);
      }
    },
    [
      companyId,
      navigate,
      location.pathname,
      viewModalShow,
      setViewModalShow,
      setSelectedOrder,
      transformOrderForEdit,
      getNavigationPaths,
      isInQuotationsMode,
      addToast,
      onEditOrder,
      setActionLoadingState,
      clearActionError,
      setActionError,
    ]
  );

  // ✅ Delete order action
  const handleDeleteOrder = useCallback(
    async (order) => {
      const orderId = order._id || order.id;

      try {
        // Check if already deleting
        if (deletingOrders.has(orderId)) {
          return;
        }

        // Check if order can be deleted
        if (order.status === "cancelled") {
          addToast?.("Order is already cancelled", "warning");
          return;
        }

        setActionLoadingState(orderId, "delete", true);
        setDeletingOrders((prev) => new Set(prev).add(orderId));
        clearActionError(orderId, "delete");

        // Confirm deletion
        const confirmed = window.confirm(
          `Are you sure you want to delete sales order ${
            order.orderNumber || "this order"
          }?`
        );

        if (!confirmed) {
          return;
        }

        // Perform deletion
        const deleteResponse = await saleOrderService.deleteSalesOrder(
          orderId,
          {
            hard: order.status === "draft",
            reason: "Deleted by user",
          }
        );

        if (deleteResponse.success) {
          addToast?.(
            deleteResponse.message || "Sales order deleted successfully",
            "success"
          );

          // Close modal if open
          if (viewModalShow) {
            setViewModalShow(false);
            setSelectedOrder(null);
          }

          // Refresh data
          onRefresh?.(true);

          // Track action
          setLastAction({action: "delete", orderId, timestamp: Date.now()});

          // Call external handler if provided
          onDeleteOrder?.(order);
        } else {
          throw new Error(
            deleteResponse.message || "Failed to delete sales order"
          );
        }
      } catch (error) {
        const errorMessage = error.message || "Failed to delete order";
        setActionError(orderId, "delete", errorMessage);
        addToast?.(errorMessage, "error");
      } finally {
        setActionLoadingState(orderId, "delete", false);
        setDeletingOrders((prev) => {
          const newSet = new Set(prev);
          newSet.delete(orderId);
          return newSet;
        });
      }
    },
    [
      deletingOrders,
      setDeletingOrders,
      saleOrderService,
      addToast,
      viewModalShow,
      setViewModalShow,
      setSelectedOrder,
      onRefresh,
      onDeleteOrder,
      setActionLoadingState,
      clearActionError,
      setActionError,
    ]
  );

  // ✅ Duplicate order action
  const handleDuplicateOrder = useCallback(
    async (order) => {
      const orderId = order._id || order.id;

      try {
        setActionLoadingState(orderId, "duplicate", true);
        clearActionError(orderId, "duplicate");

        // Transform order for duplication
        const duplicateData = {
          ...transformOrderForEdit(order),
          orderNumber: undefined, // Will be auto-generated
          orderDate: new Date().toISOString().split("T")[0],
          status: "draft",
          id: undefined,
          _id: undefined,
          isDuplicate: true,
          originalOrderId: orderId,
          originalOrderNumber: order.orderNumber,
        };

        const navigationPaths = getNavigationPaths();
        const createPath = `/companies/${companyId}/${navigationPaths.createPath}`;

        // Navigate to create page with duplicate data
        navigate(createPath, {
          state: {
            salesOrder: duplicateData,
            order: duplicateData,
            documentType: isInQuotationsMode ? "quotation" : "sales-order",
            returnPath: location.pathname,
            isDuplicate: true,
            originalOrder: order,
          },
        });

        // Close modal if open
        if (viewModalShow) {
          setViewModalShow(false);
          setSelectedOrder(null);
        }

        // Track action
        setLastAction({action: "duplicate", orderId, timestamp: Date.now()});

        // Call external handler if provided
        onDuplicateOrder?.(order);
      } catch (error) {
        const errorMessage = error.message || "Failed to duplicate order";
        setActionError(orderId, "duplicate", errorMessage);
        addToast?.(errorMessage, "error");
      } finally {
        setActionLoadingState(orderId, "duplicate", false);
      }
    },
    [
      companyId,
      navigate,
      location.pathname,
      viewModalShow,
      setViewModalShow,
      setSelectedOrder,
      transformOrderForEdit,
      getNavigationPaths,
      isInQuotationsMode,
      addToast,
      onDuplicateOrder,
      setActionLoadingState,
      clearActionError,
      setActionError,
    ]
  );

  // ✅ Confirm order action
  const handleConfirmOrder = useCallback(
    async (order) => {
      const orderId = order._id || order.id;

      try {
        setActionLoadingState(orderId, "confirm", true);
        clearActionError(orderId, "confirm");

        // Check if order needs confirmation
        const needsConfirmation = Boolean(
          order.isAutoGenerated &&
            order.generatedFrom === "purchase_order" &&
            (order.status === "sent" || order.status === "draft") &&
            !order.confirmedAt &&
            !order.isConfirmed &&
            order.status !== "confirmed"
        );

        if (!needsConfirmation) {
          addToast?.("Order does not need confirmation", "info");
          return;
        }

        // Perform confirmation
        const confirmResponse = await saleOrderService.confirmSalesOrder(
          orderId,
          {
            confirmedBy:
              currentUser?.name || currentUser?.email || "Unknown User",
            confirmedAt: new Date().toISOString(),
            notes: "Order confirmed by user",
          }
        );

        if (confirmResponse.success) {
          addToast?.("Order confirmed successfully", "success");

          // Refresh data
          onRefresh?.(true);

          // Track action
          setLastAction({action: "confirm", orderId, timestamp: Date.now()});

          // Call external handler if provided
          onConfirmOrder?.(order);
        } else {
          throw new Error(confirmResponse.message || "Failed to confirm order");
        }
      } catch (error) {
        const errorMessage = error.message || "Failed to confirm order";
        setActionError(orderId, "confirm", errorMessage);
        addToast?.(errorMessage, "error");
      } finally {
        setActionLoadingState(orderId, "confirm", false);
      }
    },
    [
      saleOrderService,
      currentUser,
      addToast,
      onRefresh,
      onConfirmOrder,
      setActionLoadingState,
      clearActionError,
      setActionError,
    ]
  );

  // ✅ Status change actions
  const handleStatusChange = useCallback(
    async (order, newStatus, action) => {
      const orderId = order._id || order.id;

      try {
        setActionLoadingState(orderId, action, true);
        clearActionError(orderId, action);

        // Validate status transition
        const validTransitions = {
          draft: ["confirmed", "cancelled"],
          confirmed: ["approved", "cancelled"],
          approved: ["shipped", "cancelled"],
          shipped: ["delivered", "cancelled"],
          delivered: ["completed"],
          completed: [],
        };

        const currentStatus = order.status || "draft";
        if (!validTransitions[currentStatus]?.includes(newStatus)) {
          throw new Error(
            `Cannot change status from ${currentStatus} to ${newStatus}`
          );
        }

        // Perform status update
        const updateResponse = await saleOrderService.updateSalesOrderStatus(
          orderId,
          {
            status: newStatus,
            updatedBy:
              currentUser?.name || currentUser?.email || "Unknown User",
            updatedAt: new Date().toISOString(),
            reason: `Status changed to ${newStatus}`,
          }
        );

        if (updateResponse.success) {
          addToast?.(`Order ${action}ed successfully`, "success");

          // Refresh data
          onRefresh?.(true);

          // Track action
          setLastAction({action, orderId, newStatus, timestamp: Date.now()});

          // Call appropriate external handler
          switch (action) {
            case "approve":
              onApproveOrder?.(order);
              break;
            case "ship":
              onShipOrder?.(order);
              break;
            case "deliver":
              onDeliverOrder?.(order);
              break;
            case "complete":
              onCompleteOrder?.(order);
              break;
            case "cancel":
              onCancelOrder?.(order);
              break;
          }
        } else {
          throw new Error(
            updateResponse.message || `Failed to ${action} order`
          );
        }
      } catch (error) {
        const errorMessage = error.message || `Failed to ${action} order`;
        setActionError(orderId, action, errorMessage);
        addToast?.(errorMessage, "error");
      } finally {
        setActionLoadingState(orderId, action, false);
      }
    },
    [
      saleOrderService,
      currentUser,
      addToast,
      onRefresh,
      onApproveOrder,
      onShipOrder,
      onDeliverOrder,
      onCompleteOrder,
      onCancelOrder,
      setActionLoadingState,
      clearActionError,
      setActionError,
    ]
  );

  // ✅ Specific status handlers
  const handleApproveOrder = useCallback(
    (order) => {
      return handleStatusChange(order, "approved", "approve");
    },
    [handleStatusChange]
  );

  const handleShipOrder = useCallback(
    (order) => {
      return handleStatusChange(order, "shipped", "ship");
    },
    [handleStatusChange]
  );

  const handleDeliverOrder = useCallback(
    (order) => {
      return handleStatusChange(order, "delivered", "deliver");
    },
    [handleStatusChange]
  );

  const handleCompleteOrder = useCallback(
    (order) => {
      return handleStatusChange(order, "completed", "complete");
    },
    [handleStatusChange]
  );

  const handleCancelOrder = useCallback(
    (order) => {
      return handleStatusChange(order, "cancelled", "cancel");
    },
    [handleStatusChange]
  );

  // ✅ Generation and tracking actions (delegated to external handlers)
  const handleGeneratePurchaseOrder = useCallback(
    async (order) => {
      const orderId = order._id || order.id;

      try {
        setActionLoadingState(orderId, "generatePO", true);
        clearActionError(orderId, "generatePO");

        // Track action
        setLastAction({action: "generatePO", orderId, timestamp: Date.now()});

        // Delegate to external handler
        if (onGeneratePurchaseOrder) {
          await onGeneratePurchaseOrder(order);
        } else {
          addToast?.(
            "Generate Purchase Order functionality not available",
            "warning"
          );
        }
      } catch (error) {
        const errorMessage =
          error.message || "Failed to generate purchase order";
        setActionError(orderId, "generatePO", errorMessage);
        addToast?.(errorMessage, "error");
      } finally {
        setActionLoadingState(orderId, "generatePO", false);
      }
    },
    [
      onGeneratePurchaseOrder,
      addToast,
      setActionLoadingState,
      clearActionError,
      setActionError,
    ]
  );

  // ✅ Other delegated actions
  const handleViewTrackingChain = useCallback(
    (order) => {
      const orderId = order._id || order.id;
      setLastAction({
        action: "viewTrackingChain",
        orderId,
        timestamp: Date.now(),
      });
      onViewTrackingChain?.(order);
    },
    [onViewTrackingChain]
  );

  const handleViewSourceOrder = useCallback(
    (order) => {
      const orderId = order._id || order.id;
      setLastAction({
        action: "viewSourceOrder",
        orderId,
        timestamp: Date.now(),
      });
      onViewSourceOrder?.(order);
    },
    [onViewSourceOrder]
  );

  const handleViewGeneratedOrders = useCallback(
    (order) => {
      const orderId = order._id || order.id;
      setLastAction({
        action: "viewGeneratedOrders",
        orderId,
        timestamp: Date.now(),
      });
      onViewGeneratedOrders?.(order);
    },
    [onViewGeneratedOrders]
  );

  // ✅ Bulk actions
  const handleBulkConfirmOrders = useCallback(
    async (orders) => {
      try {
        const needsConfirmation = orders.filter(
          (order) =>
            order.isAutoGenerated &&
            order.generatedFrom === "purchase_order" &&
            (order.status === "sent" || order.status === "draft") &&
            !order.confirmedAt &&
            !order.isConfirmed &&
            order.status !== "confirmed"
        );

        if (needsConfirmation.length === 0) {
          addToast?.("No orders need confirmation", "info");
          return;
        }

        // Confirm each order
        const confirmPromises = needsConfirmation.map((order) =>
          handleConfirmOrder(order)
        );

        await Promise.allSettled(confirmPromises);

        addToast?.(
          `Bulk confirmation completed for ${needsConfirmation.length} orders`,
          "success"
        );
      } catch (error) {
        addToast?.("Bulk confirmation failed", "error");
      }
    },
    [handleConfirmOrder, addToast]
  );

  // ✅ Main action dispatcher
  const handleAction = useCallback(
    async (action, order, ...args) => {
      if (!order) return;

      const actionMap = {
        view: handleViewOrder,
        edit: handleEditOrder,
        delete: handleDeleteOrder,
        duplicate: handleDuplicateOrder,
        confirm: handleConfirmOrder,
        approve: handleApproveOrder,
        ship: handleShipOrder,
        deliver: handleDeliverOrder,
        complete: handleCompleteOrder,
        cancel: handleCancelOrder,
        generatePurchaseOrder: handleGeneratePurchaseOrder,
        viewTrackingChain: handleViewTrackingChain,
        viewSourceOrder: handleViewSourceOrder,
        viewGeneratedOrders: handleViewGeneratedOrders,

        // Delegated actions (handled by other hooks)
        print: onPrintOrder,
        share: onShareOrder,
        downloadPDF: onDownloadOrder,
        convert: onConvertOrder,
      };

      const handler = actionMap[action];
      if (handler) {
        return await handler(order, ...args);
      } else {
        console.warn(`Unknown action: ${action}`);
        addToast?.(`Unknown action: ${action}`, "warning");
      }
    },
    [
      handleViewOrder,
      handleEditOrder,
      handleDeleteOrder,
      handleDuplicateOrder,
      handleConfirmOrder,
      handleApproveOrder,
      handleShipOrder,
      handleDeliverOrder,
      handleCompleteOrder,
      handleCancelOrder,
      handleGeneratePurchaseOrder,
      handleViewTrackingChain,
      handleViewSourceOrder,
      handleViewGeneratedOrders,
      onPrintOrder,
      onShareOrder,
      onDownloadOrder,
      onConvertOrder,
      addToast,
    ]
  );

  // ✅ Return hook interface
  return {
    // Main action handler
    handleAction,

    // Individual action handlers
    handleViewOrder,
    handleEditOrder,
    handleDeleteOrder,
    handleDuplicateOrder,
    handleConfirmOrder,
    handleApproveOrder,
    handleShipOrder,
    handleDeliverOrder,
    handleCompleteOrder,
    handleCancelOrder,
    handleGeneratePurchaseOrder,
    handleViewTrackingChain,
    handleViewSourceOrder,
    handleViewGeneratedOrders,

    // Bulk actions
    handleBulkConfirmOrders,

    // Action state helpers
    isActionLoading,
    getActionError,
    clearActionError,

    // Action history
    lastAction,

    // Action state
    actionLoading,
    actionErrors,
  };
};

export default useOrderActions;
