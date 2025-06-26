import React, {useState, useEffect, useMemo, useCallback} from "react";
import {Container, Row, Col} from "react-bootstrap";
import {useParams, useNavigate, useLocation} from "react-router-dom";

import SalesInvoicesHeader from "./SalesInvoice/SalesInvoicesHeader";
import SalesInvoicesPageTitle from "./SalesInvoice/SalesInvoicesPageTitle";
import SalesInvoicesFilter from "./SalesInvoice/SalesInvoicesFilter";
import SalesInvoicesSummary from "./SalesInvoice/SalesInvoicesSummary";
import SalesInvoicesTable from "./SalesInvoice/SalesInvoicesTable";
import SalesForm from "./SalesInvoice/SalesForm";
import UniversalViewModal from "../../Common/UniversalViewModal";

import defaultSalesService from "../../../services/salesService";
import saleOrderService from "../../../services/saleOrderService";
import itemService from "../../../services/itemService";
import "./SalesInvoices.css";

// ✅ Simple debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

function SalesInvoices({
  companyId: propCompanyId,
  currentCompany,
  currentUser,
  view = "invoices",
  mode = "invoices",
  pageTitle = "Sales Invoices",
  documentType = "invoice",
  onNavigate,
  isOnline = true,
  addToast,
  salesService: propSalesService,
  saleOrderService: propSaleOrderService,
}) {
  const {companyId: paramCompanyId} = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const companyId = propCompanyId || paramCompanyId;

  // ✅ Use passed services with proper fallbacks
  const salesService = propSalesService || defaultSalesService;
  const orderService = propSaleOrderService || saleOrderService;

  // ✅ Core state
  const [currentView, setCurrentView] = useState("list");
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Filter state
  const [dateRange, setDateRange] = useState("This Month");
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [endDate, setEndDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  );
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ Modal state
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // ✅ Determine mode
  const isQuotationsMode = useMemo(() => {
    const modes = [view, mode, documentType];
    return modes.some(
      (m) =>
        m === "quotations" ||
        m === "quotation" ||
        m === "quote" ||
        m === "quotes"
    );
  }, [view, mode, documentType]);

  // ✅ Labels configuration
  const labels = useMemo(() => {
    return isQuotationsMode
      ? {
          documentName: "Quotation",
          documentNamePlural: "Quotations",
          documentAction: "Create Quotation",
          editAction: "Edit Quotation",
          backToList: "Back to Quotations",
          createNew: "Create New Quotation",
          pageTitle: "Quotations Management",
          formTitle: "Add Sales Quotation",
          savingText: "Saving quotation...",
          savedText: "Quotation saved successfully!",
          deletingText: "Deleting quotation...",
          deletedText: "Quotation deleted successfully!",
        }
      : {
          documentName: "Invoice",
          documentNamePlural: "Invoices",
          documentAction: "Create Invoice",
          editAction: "Edit Invoice",
          backToList: "Back to Invoices",
          createNew: "Create New Sale Invoice",
          pageTitle: "Sales Invoices Management",
          formTitle: "Add Sales Invoice",
          savingText: "Saving invoice...",
          savedText: "Invoice saved successfully!",
          deletingText: "Deleting invoice...",
          deletedText: "Invoice deleted successfully!",
        };
  }, [isQuotationsMode]);

  // ✅ Date range options
  const dateRangeOptions = useMemo(
    () => [
      "Today",
      "Yesterday",
      "This Week",
      "This Month",
      "Last Month",
      "This Quarter",
      "This Year",
      "Custom Range",
    ],
    []
  );

  // ✅ Enhanced transaction normalization for consistent payment data (Updated)
  const normalizeTransactionData = useCallback(
    (item, index) => {
      console.log("🔄 SalesInvoices normalizing transaction data:", item);

      // ✅ FIXED: Enhanced payment method normalization function
      const normalizePaymentMethod = (method) => {
        if (!method) return "cash";

        const methodStr = method.toString().toLowerCase();

        const methodMappings = {
          // Bank transfer variations - ✅ FIXED: Consistent mapping
          bank_transfer: "bank",
          banktransfer: "bank",
          "bank transfer": "bank",
          bank: "bank",
          neft: "bank",
          rtgs: "bank",
          imps: "bank",

          // Card variations
          card: "card",
          credit_card: "card",
          debit_card: "card",
          creditcard: "card",
          debitcard: "card",

          // UPI variations
          upi: "upi",
          upi_payment: "upi",
          upipayment: "upi",
          paytm: "upi",
          gpay: "upi",
          phonepe: "upi",

          // Cash variations
          cash: "cash",
          cash_payment: "cash",
          cashpayment: "cash",

          // Credit variations
          credit: "credit",
          credit_sale: "credit",
          creditsale: "credit",

          // Partial variations
          partial: "partial",
          partial_payment: "partial",
          partialpayment: "partial",
        };

        return methodMappings[methodStr] || "cash";
      };

      // ✅ Calculate payment amounts properly
      const totalAmount = parseFloat(
        item.totals?.finalTotal ||
          item.amount ||
          item.total ||
          item.grandTotal ||
          0
      );
      const balanceAmount = parseFloat(
        item.payment?.pendingAmount || item.balanceAmount || item.balance || 0
      );
      const paidAmount = totalAmount - balanceAmount;

      // ✅ Enhanced payment status calculation
      const paymentStatus =
        balanceAmount <= 0 ? "paid" : paidAmount > 0 ? "partial" : "pending";

      console.log("💰 SalesInvoices payment calculation for transaction:", {
        totalAmount,
        balanceAmount,
        paidAmount,
        paymentStatus,
        originalData: {
          amount: item.amount,
          balance: item.balance,
          payment: item.payment,
        },
      });

      // ✅ Enhanced customer data extraction
      const customerData = {
        id: item.customer?.id || item.customer?._id || item.customerId,
        name:
          item.customer?.name ||
          item.customerName ||
          item.partyName ||
          "Walk-in Customer",
        mobile:
          item.customer?.mobile || item.customerMobile || item.partyPhone || "",
        email:
          item.customer?.email || item.customerEmail || item.partyEmail || "",
        address:
          item.customer?.address ||
          item.customerAddress ||
          item.partyAddress ||
          "",
        gstNumber: item.customer?.gstNumber || item.customerGstNumber || "",
      };

      // ✅ Enhanced payment method extraction and normalization
      const rawPaymentMethod =
        item.payment?.method ||
        item.paymentType ||
        item.paymentMethod ||
        "cash";

      const normalizedPaymentMethod = normalizePaymentMethod(rawPaymentMethod);

      console.log("💳 SalesInvoices payment method normalization:", {
        rawPaymentMethod,
        normalizedPaymentMethod,
      });

      // ✅ Enhanced payment data structure with normalized method
      const paymentData = {
        method: normalizedPaymentMethod,
        paymentType: normalizedPaymentMethod,
        paidAmount: paidAmount,
        amount: paidAmount,
        pendingAmount: balanceAmount,
        balanceAmount: balanceAmount,
        totalAmount: totalAmount,
        paymentDate:
          item.payment?.paymentDate ||
          item.paymentDate ||
          item.invoiceDate ||
          item.date,
        dueDate: item.payment?.dueDate || item.dueDate,
        creditDays: item.payment?.creditDays || item.creditDays || 0,
        notes: item.payment?.notes || item.paymentNotes || "",
        reference: item.payment?.reference || item.paymentReference || "",
        status: paymentStatus,
      };

      // ✅ Comprehensive normalized transaction with consistent payment method
      const normalizedTransaction = {
        // ✅ Basic identification
        id:
          item._id || item.id || `${isQuotationsMode ? "quo" : "inv"}-${index}`,
        _id: item._id || item.id,

        // ✅ Document numbers with all possible mappings
        invoiceNo:
          item.invoiceNumber ||
          item.invoiceNo ||
          item.orderNo ||
          item.quotationNumber,
        quotationNumber: item.quotationNumber || item.orderNo || item.invoiceNo,
        invoiceNumber:
          item.invoiceNumber || item.invoiceNo || item.quotationNumber,

        // ✅ Customer information (flattened for table display)
        partyName: customerData.name,
        partyPhone: customerData.mobile,
        partyEmail: customerData.email,
        partyAddress: customerData.address,
        customerId: customerData.id,
        customerName: customerData.name,
        customerMobile: customerData.mobile,
        customerEmail: customerData.email,
        customerAddress: customerData.address,
        customerGstNumber: customerData.gstNumber,

        // ✅ Enhanced customer object for forms
        customer: {
          id: customerData.id,
          _id: customerData.id,
          name: customerData.name,
          mobile: customerData.mobile,
          email: customerData.email,
          address: customerData.address,
          gstNumber: customerData.gstNumber,
        },

        // ✅ Financial data with proper calculations
        amount: totalAmount,
        total: totalAmount,
        grandTotal: totalAmount,
        balance: balanceAmount,
        balanceAmount: balanceAmount,

        // ✅ Enhanced payment information with normalized method
        payment: paymentData,
        paymentData: paymentData,
        paymentType: normalizedPaymentMethod, // ✅ Use normalized method
        paymentMethod: normalizedPaymentMethod, // ✅ Use normalized method
        method: normalizedPaymentMethod, // ✅ Use normalized method
        paymentReceived: paymentData.paidAmount,
        paidAmount: paymentData.paidAmount,
        pendingAmount: paymentData.pendingAmount,
        paymentDate: paymentData.paymentDate,
        paymentNotes: paymentData.notes,
        paymentReference: paymentData.reference,
        paymentStatus: paymentData.status,
        creditDays: paymentData.creditDays,
        dueDate: paymentData.dueDate,

        // ✅ Date handling with multiple fallbacks
        date:
          item.invoiceDate ||
          item.quotationDate ||
          item.orderDate ||
          item.date ||
          item.createdAt,
        invoiceDate:
          item.invoiceDate || item.quotationDate || item.date || item.createdAt,
        quotationDate:
          item.quotationDate || item.invoiceDate || item.date || item.createdAt,

        // ✅ Transaction classification
        transaction: isQuotationsMode
          ? "Quotation"
          : item.gstEnabled
          ? "GST Invoice"
          : "Sale",
        documentType: isQuotationsMode ? "quotation" : "invoice",

        // ✅ Status information
        status: item.status || (isQuotationsMode ? "draft" : "completed"),
        quotationStatus: item.status || item.quotationStatus,

        // ✅ Configuration
        gstEnabled: item.gstEnabled !== undefined ? item.gstEnabled : true,
        invoiceType:
          item.invoiceType || (item.gstEnabled !== false ? "gst" : "non-gst"),
        taxMode: item.taxMode || "without-tax",
        priceIncludesTax: Boolean(item.priceIncludesTax),

        // ✅ Quotation specific fields
        convertedToInvoice: item.convertedToInvoice || false,
        invoiceId: item.invoiceId,
        quotationValidity: item.quotationValidity,
        quotationExpiryDate: item.quotationExpiryDate,

        // ✅ Items with enhanced structure
        items: (item.items || []).map((lineItem, itemIndex) => ({
          ...lineItem,
          id: lineItem.id || lineItem._id || `item-${itemIndex}`,
          itemRef: lineItem.itemRef || lineItem.productId,
          itemName: lineItem.itemName || lineItem.productName || lineItem.name,
          itemCode: lineItem.itemCode || lineItem.productCode || lineItem.code,
          hsnCode: lineItem.hsnCode || lineItem.hsnNumber || "0000",
          quantity: parseFloat(lineItem.quantity || lineItem.qty || 1),
          pricePerUnit: parseFloat(
            lineItem.pricePerUnit || lineItem.price || lineItem.rate || 0
          ),
          taxRate: parseFloat(lineItem.taxRate || lineItem.gstRate || 18),
          unit: lineItem.unit || "PCS",
        })),

        // ✅ Enhanced totals object
        totals: item.totals || {
          subtotal: item.subtotal || totalAmount,
          finalTotal: totalAmount,
          totalAmount: totalAmount,
          totalTax: (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0),
          cgst: item.cgst || 0,
          sgst: item.sgst || 0,
          igst: item.igst || 0,
          discount: item.discount || item.discountAmount || 0,
        },

        // ✅ Additional fields
        notes: item.notes || item.description || "",
        terms: item.terms || item.termsAndConditions || "",
        termsAndConditions: item.termsAndConditions || item.terms || "",

        // ✅ System fields
        companyId: item.companyId || companyId,
        employeeName: item.employeeName,
        employeeId: item.employeeId,
        createdBy: item.createdBy,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,

        // ✅ Original data for reference
        originalSale: item,
      };

      console.log("✅ SalesInvoices normalized transaction:", {
        id: normalizedTransaction.id,
        amount: normalizedTransaction.amount,
        paidAmount: normalizedTransaction.paidAmount,
        pendingAmount: normalizedTransaction.pendingAmount,
        paymentStatus: normalizedTransaction.paymentStatus,
        paymentMethod: normalizedTransaction.paymentMethod,
        normalizedPaymentMethod,
      });

      return normalizedTransaction;
    },
    [isQuotationsMode, companyId]
  );

  // ✅ Filtered transactions with enhanced search
  const filteredTransactions = useMemo(() => {
    if (!debouncedSearchTerm) return transactions;

    const searchLower = debouncedSearchTerm.toLowerCase();
    return transactions.filter(
      (transaction) =>
        (transaction.partyName || "").toLowerCase().includes(searchLower) ||
        (transaction.invoiceNo || "").toLowerCase().includes(searchLower) ||
        (transaction.quotationNumber || "")
          .toLowerCase()
          .includes(searchLower) ||
        (transaction.partyPhone || "").includes(searchLower) ||
        (transaction.customerId || "").toLowerCase().includes(searchLower) ||
        (transaction.paymentStatus || "").toLowerCase().includes(searchLower)
    );
  }, [transactions, debouncedSearchTerm]);

  // ✅ Enhanced summary calculation with proper payment data
  const summary = useMemo(() => {
    const totalAmount = filteredTransactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0
    );
    const totalReceived = filteredTransactions.reduce(
      (sum, t) => sum + (t.paidAmount || (t.amount || 0) - (t.balance || 0)),
      0
    );
    const totalBalance = filteredTransactions.reduce(
      (sum, t) => sum + (t.balance || t.pendingAmount || 0),
      0
    );

    const today = new Date().toDateString();
    const todaysAmount = filteredTransactions
      .filter((t) => new Date(t.date).toDateString() === today)
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    if (isQuotationsMode) {
      const approvedQuotations = filteredTransactions.filter(
        (t) => t.status === "approved" || t.quotationStatus === "approved"
      ).length;

      const pendingQuotations = filteredTransactions.filter(
        (t) =>
          t.status === "pending" ||
          t.quotationStatus === "pending" ||
          t.quotationStatus === "draft"
      ).length;

      const convertedQuotations = filteredTransactions.filter(
        (t) => t.convertedToInvoice === true
      ).length;

      const conversionRate =
        filteredTransactions.length > 0
          ? (convertedQuotations / filteredTransactions.length) * 100
          : 0;

      return {
        totalAmount,
        received: totalReceived,
        balance: totalBalance,
        todaysAmount,
        totalDocuments: filteredTransactions.length,
        avgValue:
          filteredTransactions.length > 0
            ? totalAmount / filteredTransactions.length
            : 0,
        approvedDocuments: approvedQuotations,
        pendingDocuments: pendingQuotations,
        convertedQuotations,
        conversionRate,
      };
    } else {
      const paidInvoices = filteredTransactions.filter(
        (t) => (t.balance || t.pendingAmount || 0) === 0
      ).length;
      const pendingInvoices = filteredTransactions.filter(
        (t) => (t.balance || t.pendingAmount || 0) > 0
      ).length;
      const partiallyPaidInvoices = filteredTransactions.filter(
        (t) =>
          (t.paidAmount || 0) > 0 && (t.balance || t.pendingAmount || 0) > 0
      ).length;

      return {
        totalSalesAmount: totalAmount,
        received: totalReceived,
        balance: totalBalance,
        todaysSales: todaysAmount,
        totalInvoices: filteredTransactions.length,
        avgSaleValue:
          filteredTransactions.length > 0
            ? totalAmount / filteredTransactions.length
            : 0,
        paidInvoices,
        pendingInvoices,
        partiallyPaidInvoices,
      };
    }
  }, [filteredTransactions, isQuotationsMode]);

  // ✅ Load data on mount and filter changes
  useEffect(() => {
    if (companyId) {
      loadTransactionsData();
      loadInventoryItems();
    }
  }, [companyId, startDate, endDate, isQuotationsMode]);

  // ✅ Check for edit mode from URL
  useEffect(() => {
    const pathParts = location.pathname.split("/");
    const isEditRoute = pathParts.includes("edit");
    const transactionId = pathParts[pathParts.length - 1];

    if (isEditRoute && transactionId && location.state?.transaction) {
      console.log(
        "📝 Setting edit mode from navigation state:",
        location.state.transaction
      );
      const normalizedTransaction = normalizeTransactionData(
        location.state.transaction,
        0
      );
      setEditingTransaction(normalizedTransaction);
      setCurrentView("edit");
    }
  }, [location, normalizeTransactionData]);

  // ✅ Enhanced load transactions data
  const loadTransactionsData = async () => {
    try {
      setLoading(true);

      const filters = {
        dateFrom: startDate.toISOString().split("T")[0],
        dateTo: endDate.toISOString().split("T")[0],
      };

      console.log("🔄 Loading transactions with filters:", filters);

      let response;

      if (isQuotationsMode) {
        if (orderService?.getQuotations) {
          response = await orderService.getQuotations(companyId, filters);
        } else if (orderService?.getSalesOrders) {
          response = await orderService.getSalesOrders(companyId, {
            ...filters,
            orderType: "quotation",
          });
        } else {
          throw new Error("Quotations service not available");
        }
      } else {
        if (salesService?.getInvoices) {
          response = await salesService.getInvoices(companyId, filters);
        } else if (salesService?.getSales) {
          response = await salesService.getSales(companyId, filters);
        } else {
          throw new Error("Sales service not available");
        }
      }

      if (response?.success && response.data) {
        // ✅ Transform data for consistent structure with enhanced normalization
        const dataArray = Array.isArray(response.data)
          ? response.data
          : response.data.invoices ||
            response.data.quotations ||
            response.data.salesOrders ||
            [];

        console.log(
          "📥 Raw transaction data received:",
          dataArray.length,
          "items"
        );

        const transformedTransactions = dataArray.map((item, index) =>
          normalizeTransactionData(item, index)
        );

        console.log(
          "✅ Transformed transactions:",
          transformedTransactions.length,
          "items"
        );
        setTransactions(transformedTransactions);
      } else {
        console.log("⚠️ No data received from API");
        setTransactions([]);
      }
    } catch (error) {
      console.error("❌ Error loading transactions:", error);
      setTransactions([]);
      if (!error.message.includes("fetch")) {
        addToast?.(
          `Failed to load ${isQuotationsMode ? "quotations" : "sales"} data: ${
            error.message
          }`,
          "error"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Load inventory items
  const loadInventoryItems = async () => {
    try {
      if (itemService?.getItems) {
        const response = await itemService.getItems(companyId);
        if (response.success && response.data?.items) {
          setInventoryItems(response.data.items);
        }
      }
    } catch (error) {
      console.warn("⚠️ Could not load inventory items:", error);
      // Silent fail for inventory items
      setInventoryItems([]);
    }
  };

  // ✅ Create new transaction
  const handleCreateNew = useCallback(() => {
    const basePath = isQuotationsMode ? "quotations" : "sales";
    navigate(`/companies/${companyId}/${basePath}/add`);
  }, [companyId, isQuotationsMode, navigate]);

  // ✅ Enhanced edit transaction with proper data passing
  const handleEditTransaction = useCallback(
    (transaction) => {
      console.log("📝 Editing transaction:", transaction);
      const transactionId = transaction.id || transaction._id;
      const basePath = isQuotationsMode ? "quotations" : "sales";

      // ✅ Ensure transaction is properly normalized before passing
      const normalizedTransaction = normalizeTransactionData(transaction, 0);

      navigate(`/companies/${companyId}/${basePath}/edit/${transactionId}`, {
        state: {
          transaction: normalizedTransaction,
          editMode: true,
          returnPath: location.pathname,
        },
      });
    },
    [
      companyId,
      isQuotationsMode,
      navigate,
      location.pathname,
      normalizeTransactionData,
    ]
  );

  // ✅ Enhanced edit save with better data handling
  const handleEditSave = useCallback(
    async (updatedData) => {
      try {
        console.log("💾 Saving edited transaction:", {
          editingTransaction,
          updatedData,
        });

        let result;
        const transactionId = editingTransaction.id || editingTransaction._id;

        // ✅ Enhanced save data preparation
        const saveData = {
          ...updatedData,
          _id: transactionId,
          id: transactionId,
          companyId: companyId,
          documentType: isQuotationsMode ? "quotation" : "invoice",

          // ✅ Ensure payment data is properly structured
          payment: updatedData.paymentData ||
            updatedData.payment || {
              method: updatedData.paymentMethod || "cash",
              paidAmount: updatedData.paidAmount || 0,
              pendingAmount: updatedData.pendingAmount || 0,
              status: updatedData.paymentStatus || "pending",
            },

          // ✅ Preserve original creation data
          createdAt: editingTransaction.createdAt,
          createdBy: editingTransaction.createdBy,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser?.name || currentUser?.email || "System",
        };

        if (isQuotationsMode) {
          if (orderService?.updateSalesOrder) {
            result = await orderService.updateSalesOrder(
              transactionId,
              saveData
            );
          } else {
            throw new Error("Update quotation service not available");
          }
        } else {
          if (salesService?.updateInvoice) {
            result = await salesService.updateInvoice(transactionId, saveData);
          } else {
            throw new Error("Update invoice service not available");
          }
        }

        if (result?.success) {
          // ✅ Update local state with normalized data
          const updatedTransaction = normalizeTransactionData(
            result.data || saveData,
            0
          );

          setTransactions((prev) =>
            prev.map((t) =>
              t.id === transactionId || t._id === transactionId
                ? updatedTransaction
                : t
            )
          );

          // ✅ Enhanced success message with payment info
          const paymentInfo =
            updatedData.paidAmount > 0
              ? ` | Paid: ₹${updatedData.paidAmount.toLocaleString("en-IN")}`
              : updatedData.pendingAmount > 0
              ? ` | Pending: ₹${updatedData.pendingAmount.toLocaleString(
                  "en-IN"
                )}`
              : "";

          addToast?.(
            `${labels.savedText} Amount: ₹${(
              updatedData.totals?.finalTotal ||
              updatedData.amount ||
              0
            ).toLocaleString("en-IN")}${paymentInfo}`,
            "success"
          );

          setCurrentView("list");
          setEditingTransaction(null);

          return {success: true, data: result.data};
        } else {
          throw new Error(result?.message || "Update failed");
        }
      } catch (error) {
        console.error("❌ Error saving transaction:", error);
        addToast?.(
          `Error updating ${labels.documentName.toLowerCase()}: ${
            error.message
          }`,
          "error"
        );
        throw error;
      }
    },
    [
      editingTransaction,
      isQuotationsMode,
      labels,
      addToast,
      salesService,
      orderService,
      companyId,
      currentUser,
      normalizeTransactionData,
    ]
  );

  // ✅ View transaction
  const handleViewTransaction = useCallback((transaction) => {
    console.log("👁️ Viewing transaction:", transaction);
    setSelectedTransaction(transaction);
    setShowViewModal(true);
  }, []);

  // ✅ Enhanced delete transaction
  const handleDeleteTransaction = useCallback(
    async (transaction) => {
      const transactionId = transaction.id || transaction._id;
      const documentNumber =
        transaction.quotationNumber || transaction.invoiceNo;
      const documentName = isQuotationsMode ? "quotation" : "invoice";

      const confirmDelete = window.confirm(
        `Are you sure you want to delete ${documentName} ${documentNumber}?\n\nThis action cannot be undone.`
      );

      if (!confirmDelete) return;

      try {
        setLoading(true);
        addToast?.(labels.deletingText, "info");

        let result;
        if (isQuotationsMode) {
          if (orderService?.deleteSalesOrder) {
            result = await orderService.deleteSalesOrder(transactionId);
          } else {
            throw new Error("Delete quotation service not available");
          }
        } else {
          if (salesService?.deleteInvoice) {
            result = await salesService.deleteInvoice(transactionId);
          } else {
            throw new Error("Delete invoice service not available");
          }
        }

        if (result?.success) {
          setTransactions((prev) =>
            prev.filter((t) => (t.id || t._id) !== transactionId)
          );
          addToast?.(labels.deletedText, "success");
        } else {
          throw new Error(result?.message || "Delete operation failed");
        }
      } catch (error) {
        console.error("❌ Error deleting transaction:", error);
        addToast?.(
          `Failed to delete ${labels.documentName.toLowerCase()}: ${
            error.message
          }`,
          "error"
        );
      } finally {
        setLoading(false);
      }
    },
    [isQuotationsMode, labels, addToast, salesService, orderService]
  );

  // ✅ Enhanced convert quotation to invoice
  const handleConvertTransaction = useCallback(
    async (transaction) => {
      const documentNumber =
        transaction.quotationNumber || transaction.invoiceNo;
      const confirmMessage = `Convert quotation ${documentNumber} to Sales Invoice?\n\nThis will create a new invoice and mark the quotation as converted.`;

      if (!window.confirm(confirmMessage)) return;

      try {
        setLoading(true);
        addToast?.("Converting to invoice...", "info");

        const conversionData = {
          userId: currentUser?.id || "current-user-id",
          companyId: companyId,
          originalOrderType: "quotation",
          convertedFrom: "quotation_table",
        };

        if (orderService?.convertToInvoice) {
          const response = await orderService.convertToInvoice(
            transaction.id,
            conversionData
          );

          if (response.success) {
            // ✅ Update with proper normalization
            const updatedTransaction = {
              ...transaction,
              convertedToInvoice: true,
              status: "converted",
              quotationStatus: "converted",
              invoiceId:
                response.data.invoice?._id || response.data.invoice?.id,
              invoiceNumber:
                response.data.invoice?.invoiceNumber ||
                response.data.invoice?.invoiceNo,
            };

            setTransactions((prev) =>
              prev.map((t) =>
                t.id === transaction.id
                  ? normalizeTransactionData(updatedTransaction, 0)
                  : t
              )
            );

            addToast?.("Quotation converted successfully!", "success");
          } else {
            throw new Error(response.error || "Failed to convert quotation");
          }
        } else {
          throw new Error("Convert to invoice service not available");
        }
      } catch (error) {
        console.error("❌ Error converting quotation:", error);
        addToast?.(`Error converting quotation: ${error.message}`, "error");
      } finally {
        setLoading(false);
      }
    },
    [companyId, currentUser, addToast, orderService, normalizeTransactionData]
  );

  // ✅ Add new inventory item
  const handleAddItem = useCallback(
    async (productData) => {
      try {
        if (itemService?.createItem) {
          const response = await itemService.createItem(companyId, productData);

          if (response.success) {
            setInventoryItems((prev) => [...prev, response.data]);
            addToast?.(
              `Item "${productData.name}" added successfully`,
              "success"
            );
            return {success: true, data: response.data};
          } else {
            throw new Error(response.message || "Failed to add item");
          }
        } else {
          throw new Error("Item service not available");
        }
      } catch (error) {
        console.error("❌ Error adding inventory item:", error);
        addToast?.("Error adding item to inventory", "error");
        return {success: false, error: error.message};
      }
    },
    [companyId, addToast]
  );

  // ✅ Handle filter changes
  const handleDateRangeChange = useCallback((range) => {
    setDateRange(range);
  }, []);

  const handleStartDateChange = useCallback((e) => {
    const newDate = new Date(e.target.value);
    setStartDate(newDate);
    setDateRange("Custom Range");
  }, []);

  const handleEndDateChange = useCallback((e) => {
    const newDate = new Date(e.target.value);
    setEndDate(newDate);
    setDateRange("Custom Range");
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  // ✅ Handle back to list
  const handleBackToList = useCallback(() => {
    setCurrentView("list");
    setEditingTransaction(null);
  }, []);

  // ✅ Modal handlers
  const handleModalEdit = useCallback(
    (transaction) => {
      setShowViewModal(false);
      handleEditTransaction(transaction);
    },
    [handleEditTransaction]
  );

  const handleModalConvert = useCallback(
    (transaction) => {
      setShowViewModal(false);
      handleConvertTransaction(transaction);
    },
    [handleConvertTransaction]
  );

  // ✅ Print and share handlers
  const handlePrintTransaction = useCallback(
    (transaction) => {
      addToast?.(`Printing ${labels.documentName.toLowerCase()}...`, "info");
    },
    [labels, addToast]
  );

  const handleShareTransaction = useCallback(
    (transaction) => {
      const documentNumber =
        transaction.quotationNumber || transaction.invoiceNo;
      const paymentInfo =
        transaction.paidAmount > 0
          ? ` | Paid: ₹${transaction.paidAmount.toLocaleString("en-IN")}`
          : transaction.pendingAmount > 0
          ? ` | Pending: ₹${transaction.pendingAmount.toLocaleString("en-IN")}`
          : "";

      const shareText = `${labels.documentName} ${documentNumber}\nCustomer: ${
        transaction.partyName
      }\nAmount: ₹${(transaction.amount || 0).toLocaleString(
        "en-IN"
      )}${paymentInfo}`;

      if (navigator.share) {
        navigator
          .share({
            title: `${labels.documentName} ${documentNumber}`,
            text: shareText,
          })
          .catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard
          .writeText(shareText)
          .then(() => {
            addToast?.(
              `${labels.documentName} details copied to clipboard!`,
              "success"
            );
          })
          .catch(() => {});
      }
    },
    [labels, addToast]
  );

  // ✅ Export handlers
  const handleExcelExport = useCallback(() => {
    addToast?.(
      `Excel export for ${labels.documentNamePlural.toLowerCase()} coming soon!`,
      "info"
    );
  }, [labels, addToast]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ✅ Colors for theming
  const colors = useMemo(() => {
    return isQuotationsMode
      ? {
          primary: "#0ea5e9",
          primaryRgb: "14, 165, 233",
          secondary: "#38bdf8",
          gradient: "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)",
        }
      : {
          primary: "#6366f1",
          primaryRgb: "99, 102, 241",
          secondary: "#8b5cf6",
          gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
        };
  }, [isQuotationsMode]);

  const containerStyles = {
    backgroundColor: "#f8f9fa",
    minHeight: "100vh",
    "--primary-color": colors.primary,
    "--primary-rgb": colors.primaryRgb,
    "--secondary-color": colors.secondary,
    "--primary-gradient": colors.gradient,
  };

  // ✅ Render edit form if in edit mode
  if (currentView === "edit" && editingTransaction) {
    console.log("🚀 Rendering edit form with transaction:", editingTransaction);

    return (
      <SalesForm
        // ✅ Edit mode configuration
        editMode={true}
        existingTransaction={editingTransaction}
        initialData={editingTransaction}
        editingData={editingTransaction}
        defaultValues={editingTransaction}
        transactionId={editingTransaction.id || editingTransaction._id}
        // ✅ Callbacks
        onSave={handleEditSave}
        onCancel={handleBackToList}
        onExit={handleBackToList}
        // ✅ Data
        inventoryItems={inventoryItems}
        onAddItem={handleAddItem}
        // ✅ Configuration
        mode={isQuotationsMode ? "quotations" : "invoices"}
        documentType={isQuotationsMode ? "quotation" : "invoice"}
        formType={isQuotationsMode ? "quotation" : "sales"}
        orderType={isQuotationsMode ? "quotation" : "sales_order"}
        // ✅ Context
        companyId={companyId}
        currentUser={currentUser}
        currentCompany={currentCompany}
        addToast={addToast}
        isOnline={isOnline}
      />
    );
  }

  // ✅ Main list view
  return (
    <>
      <div
        className="sales-invoices-wrapper"
        style={containerStyles}
        data-mode={isQuotationsMode ? "quotations" : "invoices"}
      >
        <SalesInvoicesHeader
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          onAddSale={handleCreateNew}
          companyId={companyId}
          mode={isQuotationsMode ? "quotations" : "invoices"}
          documentType={isQuotationsMode ? "quotation" : "invoice"}
          pageTitle={labels.pageTitle}
        />

        <SalesInvoicesPageTitle
          onAddSale={handleCreateNew}
          invoiceCount={transactions.length}
          companyId={companyId}
          mode={isQuotationsMode ? "quotations" : "invoices"}
          documentType={isQuotationsMode ? "quotation" : "invoice"}
          title={pageTitle || labels.documentNamePlural}
          subtitle={
            isQuotationsMode
              ? "Create and manage quotations"
              : "Manage your sales transactions"
          }
        />

        <SalesInvoicesFilter
          dateRange={dateRange}
          startDate={startDate}
          endDate={endDate}
          dateRangeOptions={dateRangeOptions}
          onDateRangeChange={handleDateRangeChange}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
          onExcelExport={handleExcelExport}
          onPrint={handlePrint}
          resultCount={filteredTransactions.length}
          mode={isQuotationsMode ? "quotations" : "invoices"}
          documentType={isQuotationsMode ? "quotation" : "invoice"}
          pageTitle={pageTitle || labels.documentNamePlural}
        />

        <Container fluid className="px-4 py-3">
          <Row className="g-3">
            <Col xl={2} lg={3} md={3} sm={12}>
              <SalesInvoicesSummary
                summary={summary}
                loading={loading}
                dateRange={dateRange}
                mode={isQuotationsMode ? "quotations" : "invoices"}
                documentType={isQuotationsMode ? "quotation" : "invoice"}
                isQuotationsMode={isQuotationsMode}
              />
            </Col>

            <Col xl={10} lg={9} md={9} sm={12}>
              <SalesInvoicesTable
                transactions={filteredTransactions}
                onCreateNew={handleCreateNew}
                onViewTransaction={handleViewTransaction}
                onEditTransaction={handleEditTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onPrintTransaction={handlePrintTransaction}
                onShareTransaction={handleShareTransaction}
                onConvertTransaction={handleConvertTransaction}
                loading={loading}
                companyId={companyId}
                currentUser={currentUser}
                searchTerm={debouncedSearchTerm}
                mode={isQuotationsMode ? "quotations" : "invoices"}
                documentType={isQuotationsMode ? "quotation" : "invoice"}
                isQuotationsMode={isQuotationsMode}
                labels={labels}
                addToast={addToast}
                inventoryItems={inventoryItems}
                onAddItem={handleAddItem}
              />
            </Col>
          </Row>
        </Container>
      </div>

      {/* ✅ Enhanced View Modal with payment data */}
      <UniversalViewModal
        show={showViewModal}
        onHide={() => setShowViewModal(false)}
        transaction={selectedTransaction}
        documentType={isQuotationsMode ? "quotation" : "invoice"}
        onEdit={handleModalEdit}
        onPrint={handlePrintTransaction}
        onShare={handleShareTransaction}
        onConvert={handleModalConvert}
      />
    </>
  );
}

export default SalesInvoices;
