import {useState, useCallback, useRef} from "react";
import {useReactToPrint} from "react-to-print";

/**
 * Custom hook for managing print functionality including templates, formats, and bulk printing
 * Handles all print-related state and operations for better separation of concerns
 */
const usePrintHandler = ({
  // Core dependencies
  saleOrderService,
  addToast,
  isInQuotationsMode,

  // State setters
  setPrintModalShow,
  setSelectedOrderForPrint,
  setPrintData,
  setBulkPrintMode,
  setSelectedOrdersForBulkPrint,

  // Current state
  printModalShow,
  selectedOrderForPrint,
  printData,
  bulkPrintMode,
  selectedOrdersForBulkPrint,
}) => {
  // ✅ Print configuration state
  const [printLoading, setPrintLoading] = useState(false);
  const [printError, setPrintError] = useState(null);
  const [printTemplate, setPrintTemplate] = useState("standard");
  const [printFormat, setPrintFormat] = useState("a4");
  const [printOptions, setPrintOptions] = useState({
    includeHeader: true,
    includeFooter: true,
    includeNotes: true,
    includeTerms: true,
    includeSignature: true,
    watermark: false,
    copies: 1,
  });

  // ✅ Print history and tracking
  const [printHistory, setPrintHistory] = useState([]);
  const [lastPrintTime, setLastPrintTime] = useState(null);
  const [printQueue, setPrintQueue] = useState([]);
  const [printStats, setPrintStats] = useState({
    totalPrints: 0,
    successfulPrints: 0,
    failedPrints: 0,
  });

  // ✅ Component ref for printing
  const printComponentRef = useRef();

  // ✅ Template configurations
  const PRINT_TEMPLATES = {
    standard: {
      name: "Standard",
      description: "Standard sales order format with all details",
      features: ["Full details", "Company branding", "Terms & conditions"],
      icon: "faClipboardList",
    },
    customer: {
      name: "Customer Copy",
      description: "Customer-focused format with simplified layout",
      features: ["Customer details", "Items & pricing", "Delivery info"],
      icon: "faUser",
    },
    transporter: {
      name: "Transporter Copy",
      description: "Logistics-focused format for shipping",
      features: ["Shipping details", "Item weights", "Delivery address"],
      icon: "faTruck",
    },
    warehouse: {
      name: "Warehouse Copy",
      description: "Inventory-focused format for fulfillment",
      features: ["Item codes", "Quantities", "Storage locations"],
      icon: "faWarehouse",
    },
    accounts: {
      name: "Accounts Copy",
      description: "Finance-focused format with tax details",
      features: ["Tax breakdown", "Payment terms", "Financial summary"],
      icon: "faFileInvoice",
    },
    minimal: {
      name: "Minimal",
      description: "Compact format with essential details only",
      features: ["Basic info", "Items list", "Total amount"],
      icon: "faList",
    },
  };

  // ✅ Print formats configuration
  const PRINT_FORMATS = {
    a4: {name: "A4", width: "210mm", height: "297mm"},
    letter: {name: "Letter", width: "8.5in", height: "11in"},
    a5: {name: "A5", width: "148mm", height: "210mm"},
    thermal: {name: "Thermal (80mm)", width: "80mm", height: "auto"},
  };

  // ✅ Add to print history
  const addToPrintHistory = useCallback((entry) => {
    setPrintHistory((prev) => [
      {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...entry,
      },
      ...prev.slice(0, 49), // Keep last 50 entries
    ]);
  }, []);

  // ✅ Update print stats
  const updatePrintStats = useCallback((success) => {
    setPrintStats((prev) => ({
      totalPrints: prev.totalPrints + 1,
      successfulPrints: success
        ? prev.successfulPrints + 1
        : prev.successfulPrints,
      failedPrints: success ? prev.failedPrints : prev.failedPrints + 1,
    }));
  }, []);

  // ✅ Handle single order print
  const handlePrintOrder = useCallback(
    async (order, options = {}) => {
      if (!order) {
        addToast?.("No order selected for printing", "warning");
        return;
      }

      const orderId = order._id || order.id;

      try {
        setPrintLoading(true);
        setPrintError(null);
        setSelectedOrderForPrint(order);
        setBulkPrintMode(false);

        // Merge print options
        const finalOptions = {
          template: printTemplate,
          format: printFormat,
          ...printOptions,
          ...options,
        };

        // Fetch print data from service
        const response = await saleOrderService.getSalesOrderForPrint(orderId, {
          template: finalOptions.template,
          format: finalOptions.format,
          includeCustomerCopy: finalOptions.includeCustomerCopy,
          includeCompanyLogo: finalOptions.includeHeader,
          includeTerms: finalOptions.includeTerms,
          includeNotes: finalOptions.includeNotes,
          watermark: finalOptions.watermark,
        });

        if (response.success && response.data) {
          setPrintData(response.data);
          setPrintModalShow(true);

          // Add to print history
          addToPrintHistory({
            type: "single",
            orderId,
            orderNumber: order.orderNumber,
            template: finalOptions.template,
            format: finalOptions.format,
            status: "prepared",
          });

          addToast?.("Print data loaded successfully", "success");
        } else {
          throw new Error(response.message || "Failed to load print data");
        }
      } catch (error) {
        const errorMessage =
          error.message || "Failed to prepare order for printing";
        setPrintError(errorMessage);
        addToast?.(errorMessage, "error");

        // Add to print history as failed
        addToPrintHistory({
          type: "single",
          orderId,
          orderNumber: order.orderNumber,
          template: printTemplate,
          format: printFormat,
          status: "failed",
          error: errorMessage,
        });

        updatePrintStats(false);
      } finally {
        setPrintLoading(false);
      }
    },
    [
      saleOrderService,
      printTemplate,
      printFormat,
      printOptions,
      addToast,
      setPrintLoading,
      setPrintError,
      setSelectedOrderForPrint,
      setBulkPrintMode,
      setPrintData,
      setPrintModalShow,
      addToPrintHistory,
      updatePrintStats,
    ]
  );

  // ✅ Handle print preview
  const handlePrintPreview = useCallback(
    async (order, options = {}) => {
      if (!order) {
        addToast?.("No order selected for preview", "warning");
        return;
      }

      try {
        setPrintLoading(true);
        setPrintError(null);

        // Load preview data
        await handlePrintOrder(order, {...options, preview: true});
      } catch (error) {
        const errorMessage = error.message || "Failed to load print preview";
        setPrintError(errorMessage);
        addToast?.(errorMessage, "error");
      } finally {
        setPrintLoading(false);
      }
    },
    [handlePrintOrder, addToast, setPrintLoading, setPrintError]
  );

  // ✅ Handle bulk print
  const handleBulkPrint = useCallback(
    async (orders, options = {}) => {
      if (!orders || orders.length === 0) {
        addToast?.("No orders selected for bulk printing", "warning");
        return;
      }

      try {
        setPrintLoading(true);
        setPrintError(null);
        setBulkPrintMode(true);
        setSelectedOrdersForBulkPrint(orders);

        // Merge print options
        const finalOptions = {
          template: printTemplate,
          format: printFormat,
          ...printOptions,
          ...options,
        };

        // Fetch print data for all orders
        const printPromises = orders.map((order) =>
          saleOrderService.getSalesOrderForPrint(order._id || order.id, {
            template: finalOptions.template,
            format: finalOptions.format,
            includeCustomerCopy: finalOptions.includeCustomerCopy,
            includeCompanyLogo: finalOptions.includeHeader,
            includeTerms: finalOptions.includeTerms,
            includeNotes: finalOptions.includeNotes,
            watermark: finalOptions.watermark,
          })
        );

        const responses = await Promise.allSettled(printPromises);

        // Process responses
        const successfulOrders = [];
        const failedOrders = [];

        responses.forEach((response, index) => {
          const order = orders[index];
          if (response.status === "fulfilled" && response.value.success) {
            successfulOrders.push({
              order,
              data: response.value.data,
            });
          } else {
            failedOrders.push({
              order,
              error:
                response.reason?.message ||
                response.value?.message ||
                "Unknown error",
            });
          }
        });

        if (successfulOrders.length > 0) {
          setPrintData({
            orders: successfulOrders.map((item) => item.data),
            metadata: {
              template: finalOptions.template,
              format: finalOptions.format,
              totalOrders: orders.length,
              successfulOrders: successfulOrders.length,
              failedOrders: failedOrders.length,
            },
          });

          setPrintModalShow(true);

          // Add to print history
          addToPrintHistory({
            type: "bulk",
            orderIds: orders.map((o) => o._id || o.id),
            orderNumbers: orders.map((o) => o.orderNumber),
            template: finalOptions.template,
            format: finalOptions.format,
            totalOrders: orders.length,
            successfulOrders: successfulOrders.length,
            failedOrders: failedOrders.length,
            status: failedOrders.length > 0 ? "partial" : "prepared",
          });

          if (failedOrders.length > 0) {
            addToast?.(
              `Prepared ${successfulOrders.length} orders for printing. ${failedOrders.length} orders failed.`,
              "warning"
            );
          } else {
            addToast?.(
              `All ${successfulOrders.length} orders prepared for printing`,
              "success"
            );
          }
        } else {
          throw new Error("Failed to prepare any orders for printing");
        }
      } catch (error) {
        const errorMessage =
          error.message || "Failed to prepare orders for bulk printing";
        setPrintError(errorMessage);
        addToast?.(errorMessage, "error");

        // Add to print history as failed
        addToPrintHistory({
          type: "bulk",
          orderIds: orders.map((o) => o._id || o.id),
          orderNumbers: orders.map((o) => o.orderNumber),
          template: printTemplate,
          format: printFormat,
          totalOrders: orders.length,
          status: "failed",
          error: errorMessage,
        });

        updatePrintStats(false);
      } finally {
        setPrintLoading(false);
      }
    },
    [
      saleOrderService,
      printTemplate,
      printFormat,
      printOptions,
      addToast,
      setPrintLoading,
      setPrintError,
      setBulkPrintMode,
      setSelectedOrdersForBulkPrint,
      setPrintData,
      setPrintModalShow,
      addToPrintHistory,
      updatePrintStats,
    ]
  );

  // ✅ Handle PDF download
  const handleDownloadPDF = useCallback(
    async (order, options = {}) => {
      if (!order) {
        addToast?.("No order selected for download", "warning");
        return;
      }

      const orderId = order._id || order.id;

      try {
        setPrintLoading(true);
        setPrintError(null);

        // Merge download options
        const finalOptions = {
          template: printTemplate,
          format: "pdf",
          ...printOptions,
          ...options,
        };

        // Request PDF download
        const response = await saleOrderService.downloadSalesOrderPDF(
          orderId,
          finalOptions
        );

        if (response.success) {
          // Handle file download
          const blob = new Blob([response.data], {type: "application/pdf"});
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${isInQuotationsMode ? "Quotation" : "SalesOrder"}-${
            order.orderNumber || orderId
          }.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          // Add to print history
          addToPrintHistory({
            type: "download",
            orderId,
            orderNumber: order.orderNumber,
            template: finalOptions.template,
            format: "pdf",
            status: "downloaded",
          });

          updatePrintStats(true);
          addToast?.("PDF downloaded successfully", "success");
        } else {
          throw new Error(response.message || "Failed to download PDF");
        }
      } catch (error) {
        const errorMessage = error.message || "Failed to download PDF";
        setPrintError(errorMessage);
        addToast?.(errorMessage, "error");

        // Add to print history as failed
        addToPrintHistory({
          type: "download",
          orderId,
          orderNumber: order.orderNumber,
          template: printTemplate,
          format: "pdf",
          status: "failed",
          error: errorMessage,
        });

        updatePrintStats(false);
      } finally {
        setPrintLoading(false);
      }
    },
    [
      saleOrderService,
      printTemplate,
      printOptions,
      isInQuotationsMode,
      addToast,
      setPrintLoading,
      setPrintError,
      addToPrintHistory,
      updatePrintStats,
    ]
  );

  // ✅ React-to-print handler
  const handleComponentPrint = useReactToPrint({
    content: () => printComponentRef.current,
    documentTitle: selectedOrderForPrint
      ? `${isInQuotationsMode ? "Quotation" : "Sales Order"}-${
          selectedOrderForPrint.orderNumber
        }`
      : bulkPrintMode
      ? `Bulk-${isInQuotationsMode ? "Quotations" : "Sales-Orders"}-${
          new Date().toISOString().split("T")[0]
        }`
      : "Sales Order",
    onBeforePrint: () => {
      setPrintLoading(true);
    },
    onAfterPrint: () => {
      setPrintLoading(false);
      setLastPrintTime(Date.now());

      // Add to print history
      if (bulkPrintMode) {
        addToPrintHistory({
          type: "bulk-print",
          orderIds: selectedOrdersForBulkPrint.map((o) => o._id || o.id),
          orderNumbers: selectedOrdersForBulkPrint.map((o) => o.orderNumber),
          template: printTemplate,
          format: printFormat,
          totalOrders: selectedOrdersForBulkPrint.length,
          status: "printed",
        });
      } else if (selectedOrderForPrint) {
        addToPrintHistory({
          type: "print",
          orderId: selectedOrderForPrint._id || selectedOrderForPrint.id,
          orderNumber: selectedOrderForPrint.orderNumber,
          template: printTemplate,
          format: printFormat,
          status: "printed",
        });
      }

      updatePrintStats(true);

      // Close modal
      setPrintModalShow(false);
      setSelectedOrderForPrint(null);
      setPrintData(null);
      setBulkPrintMode(false);
      setSelectedOrdersForBulkPrint([]);
    },
    onPrintError: (errorLocation, error) => {
      setPrintLoading(false);
      const errorMessage = `Print failed: ${error.message || "Unknown error"}`;
      setPrintError(errorMessage);
      addToast?.(errorMessage, "error");
      updatePrintStats(false);
    },
  });

  // ✅ Close print modal
  const closePrintModal = useCallback(() => {
    setPrintModalShow(false);
    setSelectedOrderForPrint(null);
    setPrintData(null);
    setBulkPrintMode(false);
    setSelectedOrdersForBulkPrint([]);
    setPrintError(null);
  }, [
    setPrintModalShow,
    setSelectedOrderForPrint,
    setPrintData,
    setBulkPrintMode,
    setSelectedOrdersForBulkPrint,
    setPrintError,
  ]);

  // ✅ Clear print error
  const clearPrintError = useCallback(() => {
    setPrintError(null);
  }, []);

  // ✅ Update print template
  const updatePrintTemplate = useCallback((template) => {
    if (PRINT_TEMPLATES[template]) {
      setPrintTemplate(template);
    } else {
      console.warn(`Unknown print template: ${template}`);
    }
  }, []);

  // ✅ Update print format
  const updatePrintFormat = useCallback((format) => {
    if (PRINT_FORMATS[format]) {
      setPrintFormat(format);
    } else {
      console.warn(`Unknown print format: ${format}`);
    }
  }, []);

  // ✅ Update print options
  const updatePrintOptions = useCallback((newOptions) => {
    setPrintOptions((prev) => ({...prev, ...newOptions}));
  }, []);

  // ✅ Clear print history
  const clearPrintHistory = useCallback(() => {
    setPrintHistory([]);
  }, []);

  // ✅ Get print statistics
  const getPrintStatistics = useCallback(() => {
    const recent = printHistory.filter(
      (entry) =>
        Date.now() - new Date(entry.timestamp).getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    return {
      ...printStats,
      recentPrints: recent.length,
      lastPrintTime: lastPrintTime ? new Date(lastPrintTime) : null,
      favoriteTemplate: printTemplate,
      favoriteFormat: printFormat,
    };
  }, [printStats, printHistory, lastPrintTime, printTemplate, printFormat]);

  // ✅ Return hook interface
  return {
    // Print handlers
    handlePrintOrder,
    handlePrintPreview,
    handleBulkPrint,
    handleDownloadPDF,
    handleComponentPrint,

    // Modal management
    closePrintModal,

    // Configuration
    printTemplate,
    printFormat,
    printOptions,
    updatePrintTemplate,
    updatePrintFormat,
    updatePrintOptions,

    // Templates and formats
    PRINT_TEMPLATES,
    PRINT_FORMATS,

    // State
    printLoading,
    printError,
    clearPrintError,

    // Component ref
    printComponentRef,

    // History and stats
    printHistory,
    clearPrintHistory,
    printStats,
    getPrintStatistics,
    lastPrintTime,
  };
};

export default usePrintHandler;
