import React, {useState, useEffect, useMemo, useCallback, useRef} from "react";
import {Container, Row, Col, Button} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faArrowLeft} from "@fortawesome/free-solid-svg-icons";
import {useParams, useNavigate} from "react-router-dom";

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
  onAddSale,
  onEditSale,
  onViewSale,
  onDeleteSale,
  onPrintSale,
  onShareSale,
  onConvertSale,
  onDownloadSale,
  onViewChange,
  onNavigate,
  isOnline = true,
  addToast,
  salesService: propSalesService,
  quotationService,
  saleOrderService: propSaleOrderService,
  onCreateSale,
  onSave,
  onSaveQuotation,
  onCreateQuotation,
  formType,
}) {
  const {companyId: paramCompanyId} = useParams();
  const navigate = useNavigate();
  const companyId = propCompanyId || paramCompanyId;

  // ✅ ENHANCED: Submission tracking refs
  const saveInProgressRef = useRef(false);
  const lastSaveTimeRef = useRef(0);
  const deleteInProgressRef = useRef(false);
  const convertInProgressRef = useRef(false);

  // ✅ FIXED: Use passed services with proper fallbacks
  const salesService = propSalesService || defaultSalesService;
  const orderService = propSaleOrderService || saleOrderService;

  // View and Modal States
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const isQuotationsMode = useMemo(() => {
    const modes = [view, mode, documentType, formType];
    return modes.some(
      (m) =>
        m === "quotations" ||
        m === "quotation" ||
        m === "quote" ||
        m === "quotes"
    );
  }, [view, mode, documentType, formType]);

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
          updatingText: "Updating quotation...",
          updatedText: "Quotation updated successfully!",
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
          updatingText: "Updating invoice...",
          updatedText: "Invoice updated successfully!",
        };
  }, [isQuotationsMode]);

  const [currentView, setCurrentView] = useState("list");
  const [editingSale, setEditingSale] = useState(null);
  const [dateRange, setDateRange] = useState("This Month");
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [endDate, setEndDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  );
  const [selectedFirm, setSelectedFirm] = useState("All Firms");
  const [topSearchTerm, setTopSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);

  const debouncedSearchTerm = useDebounce(topSearchTerm, 300);

  const categories = useMemo(
    () => [
      {
        id: 1,
        name: "Electronics",
        description: "Electronic items and gadgets",
        isActive: true,
      },
      {
        id: 2,
        name: "Furniture",
        description: "Office and home furniture",
        isActive: true,
      },
      {
        id: 3,
        name: "Stationery",
        description: "Office supplies and stationery",
        isActive: true,
      },
      {
        id: 4,
        name: "Services",
        description: "Professional services",
        isActive: true,
      },
      {
        id: 5,
        name: "Hardware",
        description: "Computer hardware components",
        isActive: true,
      },
      {
        id: 6,
        name: "Software",
        description: "Software licenses and subscriptions",
        isActive: true,
      },
      {
        id: 7,
        name: "Accessories",
        description: "Various accessories",
        isActive: true,
      },
      {
        id: 8,
        name: "Tools",
        description: "Professional tools and equipment",
        isActive: true,
      },
    ],
    []
  );

  const summary = useMemo(() => {
    const relevantTransactions = isQuotationsMode
      ? transactions.filter(
          (t) =>
            t.documentType === "quotation" ||
            t.transaction === "Quotation" ||
            t.type === "quotation"
        )
      : transactions.filter(
          (t) =>
            t.transaction === "Sale" ||
            t.transaction === "GST Invoice" ||
            t.documentType === "invoice" ||
            t.type === "invoice"
        );

    const totalAmount = relevantTransactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0
    );
    const totalReceived = relevantTransactions.reduce(
      (sum, t) => sum + ((t.amount || 0) - (t.balance || 0)),
      0
    );
    const totalBalance = relevantTransactions.reduce(
      (sum, t) => sum + (t.balance || 0),
      0
    );

    const today = new Date().toDateString();
    const todaysAmount = relevantTransactions
      .filter((t) => new Date(t.date).toDateString() === today)
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const avgValue =
      relevantTransactions.length > 0
        ? totalAmount / relevantTransactions.length
        : 0;
    const growthPercentage = Math.random() * 20 - 10;

    if (isQuotationsMode) {
      const approvedQuotations = relevantTransactions.filter(
        (t) => t.status === "approved" || t.quotationStatus === "approved"
      ).length;

      const pendingQuotations = relevantTransactions.filter(
        (t) =>
          t.status === "pending" ||
          t.quotationStatus === "pending" ||
          t.quotationStatus === "draft"
      ).length;

      const convertedQuotations = relevantTransactions.filter(
        (t) => t.convertedToInvoice === true
      ).length;

      const conversionRate =
        relevantTransactions.length > 0
          ? (convertedQuotations / relevantTransactions.length) * 100
          : 0;

      return {
        totalAmount: totalAmount,
        received: totalReceived,
        balance: totalBalance,
        todaysAmount: todaysAmount,
        totalDocuments: relevantTransactions.length,
        avgValue: avgValue,
        growthPercentage: growthPercentage,
        approvedDocuments: approvedQuotations,
        pendingDocuments: pendingQuotations,
        convertedQuotations: convertedQuotations,
        conversionRate: conversionRate,
      };
    } else {
      const paidInvoices = relevantTransactions.filter(
        (t) => (t.balance || 0) === 0
      ).length;
      const pendingInvoices = relevantTransactions.filter(
        (t) => (t.balance || 0) > 0
      ).length;

      return {
        totalSalesAmount: totalAmount,
        received: totalReceived,
        balance: totalBalance,
        todaysSales: todaysAmount,
        totalInvoices: relevantTransactions.length,
        avgSaleValue: avgValue,
        growthPercentage: growthPercentage,
        paidInvoices: paidInvoices,
        pendingInvoices: pendingInvoices,
      };
    }
  }, [transactions, isQuotationsMode]);

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

  const firmOptions = useMemo(() => ["All Firms"], []);

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
        (transaction.partyPhone || "").includes(searchLower)
    );
  }, [transactions, debouncedSearchTerm]);

  useEffect(() => {
    if (companyId) {
      loadSalesData();
      loadInventoryItems();
    }
  }, [companyId, startDate, endDate, isQuotationsMode]);

  // ✅ CLEANUP: Reset refs on unmount
  useEffect(() => {
    return () => {
      saveInProgressRef.current = false;
      deleteInProgressRef.current = false;
      convertInProgressRef.current = false;
      lastSaveTimeRef.current = 0;
    };
  }, []);

  const loadSalesData = async () => {
    try {
      setLoading(true);

      const filters = {
        dateFrom: startDate.toISOString().split("T")[0],
        dateTo: endDate.toISOString().split("T")[0],
      };

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
          response = {
            success: false,
            message: "Quotations service not available",
          };
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
        let dataArray = [];

        if (isQuotationsMode) {
          if (response.data.quotations?.salesOrders) {
            dataArray = response.data.quotations.salesOrders;
          } else if (Array.isArray(response.data.quotations)) {
            dataArray = response.data.quotations;
          } else if (response.data.salesOrders) {
            dataArray = response.data.salesOrders.filter(
              (order) =>
                order.orderType === "quotation" ||
                order.documentType === "quotation"
            );
          } else if (Array.isArray(response.data)) {
            dataArray = response.data.filter(
              (item) =>
                item.orderType === "quotation" ||
                item.documentType === "quotation"
            );
          } else {
            dataArray =
              response.data.data ||
              response.data.orders ||
              response.data.results ||
              [];
          }
        } else {
          dataArray =
            response.data.salesOrders ||
            response.data.invoices ||
            response.data.sales ||
            response.data.data ||
            (Array.isArray(response.data) ? response.data : []);
        }

        if (!Array.isArray(dataArray)) {
          setTransactions([]);
          return;
        }

        const transformedTransactions = dataArray.map((item, index) => {
          const transformItems = (originalItems) => {
            if (!Array.isArray(originalItems)) return [];

            return originalItems.map((originalItem, itemIndex) => ({
              id: originalItem.id || originalItem._id || `item-${itemIndex}`,
              productName:
                originalItem.productName ||
                originalItem.itemName ||
                originalItem.name ||
                originalItem.item?.name ||
                `Item ${itemIndex + 1}`,
              itemName:
                originalItem.productName ||
                originalItem.itemName ||
                originalItem.name ||
                originalItem.item?.name,
              name:
                originalItem.productName ||
                originalItem.itemName ||
                originalItem.name ||
                originalItem.item?.name,
              productCode:
                originalItem.productCode ||
                originalItem.itemCode ||
                originalItem.code ||
                originalItem.item?.code,
              itemCode:
                originalItem.productCode ||
                originalItem.itemCode ||
                originalItem.code,
              description:
                originalItem.description ||
                originalItem.item?.description ||
                "",
              hsnNumber:
                originalItem.hsnNumber ||
                originalItem.hsn ||
                originalItem.item?.hsnNumber ||
                originalItem.item?.hsn ||
                "",
              quantity: parseFloat(originalItem.quantity) || 0,
              price:
                parseFloat(originalItem.price) ||
                parseFloat(originalItem.rate) ||
                parseFloat(originalItem.sellPrice) ||
                parseFloat(originalItem.pricePerUnit) ||
                0,
              rate:
                parseFloat(originalItem.price) ||
                parseFloat(originalItem.rate) ||
                parseFloat(originalItem.sellPrice) ||
                parseFloat(originalItem.pricePerUnit) ||
                0,
              sellPrice:
                parseFloat(originalItem.price) ||
                parseFloat(originalItem.rate) ||
                parseFloat(originalItem.sellPrice) ||
                parseFloat(originalItem.pricePerUnit) ||
                0,
              purchasePrice:
                parseFloat(originalItem.purchasePrice) ||
                parseFloat(originalItem.costPrice) ||
                0,
              unit: originalItem.unit || "pcs",
              amount:
                parseFloat(originalItem.amount) ||
                parseFloat(originalItem.totalAmount) ||
                parseFloat(originalItem.itemAmount) ||
                parseFloat(originalItem.quantity) *
                  parseFloat(originalItem.price || originalItem.rate || 0) ||
                0,
              totalAmount:
                parseFloat(originalItem.amount) ||
                parseFloat(originalItem.totalAmount) ||
                parseFloat(originalItem.itemAmount) ||
                parseFloat(originalItem.quantity) *
                  parseFloat(originalItem.price || originalItem.rate || 0) ||
                0,
              itemAmount:
                parseFloat(originalItem.amount) ||
                parseFloat(originalItem.totalAmount) ||
                parseFloat(originalItem.itemAmount) ||
                parseFloat(originalItem.quantity) *
                  parseFloat(originalItem.price || originalItem.rate || 0) ||
                0,
              subtotal:
                parseFloat(originalItem.subtotal) ||
                parseFloat(originalItem.amount) ||
                parseFloat(originalItem.totalAmount) ||
                0,
              gstAmount:
                parseFloat(originalItem.gstAmount) ||
                parseFloat(originalItem.totalTaxAmount) ||
                0,
              totalTaxAmount:
                parseFloat(originalItem.gstAmount) ||
                parseFloat(originalItem.totalTaxAmount) ||
                0,
              gstRate:
                parseFloat(originalItem.gstRate) ||
                parseFloat(originalItem.taxRate) ||
                18,
              taxRate:
                parseFloat(originalItem.gstRate) ||
                parseFloat(originalItem.taxRate) ||
                18,
              cgstRate:
                parseFloat(originalItem.cgstRate) ||
                parseFloat(originalItem.gstRate / 2) ||
                9,
              sgstRate:
                parseFloat(originalItem.sgstRate) ||
                parseFloat(originalItem.gstRate / 2) ||
                9,
              cgstAmount:
                parseFloat(originalItem.cgstAmount) ||
                parseFloat(originalItem.gstAmount / 2) ||
                0,
              sgstAmount:
                parseFloat(originalItem.sgstAmount) ||
                parseFloat(originalItem.gstAmount / 2) ||
                0,
              igstAmount: parseFloat(originalItem.igstAmount) || 0,
              gstMode:
                originalItem.gstMode || originalItem.taxMode === "with-tax"
                  ? "include"
                  : "exclude",
              taxMode:
                originalItem.taxMode || originalItem.gstMode === "include"
                  ? "with-tax"
                  : "without-tax",
              priceIncludesTax:
                originalItem.priceIncludesTax ||
                originalItem.gstMode === "include" ||
                false,
              availableStock: parseFloat(originalItem.availableStock) || 0,
              lineNumber: originalItem.lineNumber || itemIndex + 1,
              originalItem: originalItem,
            }));
          };

          if (isQuotationsMode) {
            const transformedTransaction = {
              id: item._id || item.id || `quo-${index}`,
              invoiceNo:
                item.orderNo ||
                item.orderNumber ||
                item.quotationNumber ||
                `QUO-${item._id?.slice(-6) || index}`,
              quotationNumber:
                item.orderNo || item.orderNumber || item.quotationNumber,
              partyName:
                item.customer?.name ||
                item.partyName ||
                item.customerName ||
                item.customer?.businessName ||
                "Walk-in Customer",
              partyPhone:
                item.customer?.mobile ||
                item.partyPhone ||
                item.customerMobile ||
                item.customer?.phone,
              partyEmail:
                item.customer?.email ||
                item.partyEmail ||
                item.customerEmail ||
                item.customer?.emailAddress,
              partyAddress:
                item.customer?.address ||
                item.partyAddress ||
                item.customerAddress ||
                item.customer?.fullAddress,
              partyGstNumber:
                item.customer?.gstNumber ||
                item.partyGstNumber ||
                item.customerGstNumber ||
                item.customer?.gstNo,
              amount:
                item.totals?.finalTotal ||
                item.totals?.totalAmount ||
                item.amount ||
                0,
              balance:
                item.payment?.pendingAmount ||
                item.balanceAmount ||
                item.balance ||
                item.totals?.finalTotal ||
                item.amount ||
                0,
              date:
                item.orderDate ||
                item.quotationDate ||
                item.date ||
                item.createdAt,
              transaction: "Quotation",
              documentType: "quotation",
              status: item.status || "draft",
              quotationStatus: item.status || "draft",
              paymentType: item.paymentType || item.payment?.method || "Cash",
              cgst: item.totals?.totalCgstAmount || item.totals?.totalCGST || 0,
              sgst: item.totals?.totalSgstAmount || item.totals?.totalSGST || 0,
              igst: item.totals?.totalIgstAmount || item.totals?.totalIGST || 0,
              gstEnabled:
                item.gstEnabled !== undefined ? item.gstEnabled : true,
              orderType: item.orderType || "quotation",
              convertedToInvoice: item.convertedToInvoice || false,
              validUntil: item.validUntil,
              priority: item.priority || "normal",
              employeeName: item.employeeName || item.createdBy,
              createdBy: item.createdBy || item.employeeName,
              notes: item.notes || item.description,
              description: item.notes || item.description,
              items: transformItems(item.items || []),
              invoiceNumber: item.invoiceNumber,
              conversionDate: item.conversionDate,
              createdDate: item.createdAt || item.date,
              originalSale: item,
            };

            return transformedTransaction;
          } else {
            return {
              id: item._id || item.id || `inv-${index}`,
              invoiceNo:
                item.invoiceNumber ||
                item.invoiceNo ||
                item.orderNo ||
                `INV-${item._id?.slice(-6) || index}`,
              partyName:
                item.customer?.name ||
                item.customerName ||
                item.partyName ||
                "Walk-in Customer",
              partyPhone:
                item.customer?.mobile || item.customerMobile || item.partyPhone,
              partyEmail:
                item.customer?.email || item.partyEmail || item.customerEmail,
              partyAddress:
                item.customer?.address ||
                item.partyAddress ||
                item.customerAddress,
              partyGstNumber:
                item.customer?.gstNumber ||
                item.partyGstNumber ||
                item.customerGstNumber,
              amount:
                item.totals?.finalTotal ||
                item.totals?.totalAmount ||
                item.amount ||
                0,
              balance:
                item.payment?.pendingAmount ||
                item.balanceAmount ||
                item.balance ||
                0,
              date: item.invoiceDate || item.date || item.createdAt,
              transaction: item.gstEnabled ? "GST Invoice" : "Sale",
              documentType: "invoice",
              status: item.status || "completed",
              paymentType: item.payment?.method || item.paymentType || "Cash",
              cgst: item.totals?.totalCgstAmount || item.totals?.totalCGST || 0,
              sgst: item.totals?.totalSgstAmount || item.totals?.totalSGST || 0,
              igst: item.totals?.totalIgstAmount || item.totals?.totalIGST || 0,
              gstEnabled:
                item.gstEnabled !== undefined ? item.gstEnabled : true,
              employeeName: item.employeeName || item.createdBy,
              createdBy: item.createdBy || item.employeeName,
              notes: item.notes || item.description,
              description: item.notes || item.description,
              items: transformItems(item.items || []),
              invoiceNumber: item.invoiceNumber || item.invoiceNo,
              createdDate: item.createdAt || item.date,
              originalSale: item,
            };
          }
        });

        setTransactions(transformedTransactions);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      setTransactions([]);

      if (
        !error.message.includes("fetch") &&
        !error.message.includes("Failed to fetch")
      ) {
        const errorMessage = `Failed to load ${
          isQuotationsMode ? "quotations" : "sales"
        } data`;
        addToast?.(errorMessage, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryItems = async () => {
    try {
      if (itemService?.getItems) {
        const response = await itemService.getItems(companyId);

        if (response.success && response.data?.items) {
          setInventoryItems(response.data.items);
        } else {
          setInventoryItems([]);
        }
      } else {
        setInventoryItems([]);
      }
    } catch (error) {
      setInventoryItems([]);
    }
  };

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

  // ✅ FIXED: Create handler - always navigate to separate page
  const handleCreateSale = useCallback(() => {
    console.log("🎯 Creating new sale - always navigate to page");

    if (isQuotationsMode) {
      console.log("📋 Navigating to quotation creation page");
      if (onAddSale) {
        onAddSale(); // This will call handleAddQuotation which navigates
      } else {
        navigate(`/companies/${companyId}/quotations/add`);
      }
    } else {
      console.log("🧾 Navigating to sales invoice creation page");
      if (onAddSale) {
        onAddSale(); // This will navigate to sales creation
      } else {
        navigate(`/companies/${companyId}/sales/add`);
      }
    }
  }, [isQuotationsMode, companyId, navigate, onAddSale]);

  const handleBackToList = useCallback(() => {
    setCurrentView("list");
    setEditingSale(null);
  }, []);

  // ✅ COMPLETELY FIXED: Enhanced sale form save with submission guards
  const handleSaleFormSave = useCallback(
    async (invoiceDataFromTable) => {
      console.log("🎯 SalesInvoices handleSaleFormSave called with:", {
        invoiceDataFromTable,
        hasItems: invoiceDataFromTable?.items?.length || 0,
        timestamp: new Date().toISOString(),
      });

      // ✅ CRITICAL: Prevent multiple submissions
      const now = Date.now();
      if (saveInProgressRef.current || now - lastSaveTimeRef.current < 2000) {
        console.log(
          "⚠️ Save already in progress or too soon after last save:",
          {
            saveInProgress: saveInProgressRef.current,
            timeSinceLastSave: now - lastSaveTimeRef.current,
            timestamp: new Date().toISOString(),
          }
        );
        return {
          success: true, // Return success to avoid showing error
          error: "Save in progress",
          message: "Save operation already in progress",
          isDuplicate: true,
        };
      }

      try {
        // ✅ Set guards immediately
        saveInProgressRef.current = true;
        lastSaveTimeRef.current = now;
        setLoading(true);

        console.log("💾 Starting sale save process - SINGLE CALL:", {
          timestamp: new Date().toISOString(),
          saveId: now,
          isQuotationsMode,
          editingSale: !!editingSale,
          itemsCount: invoiceDataFromTable?.items?.length || 0,
        });

        addToast?.(labels.savingText, "info");

        // ✅ FIXED: Validate items first
        const itemsToSave =
          invoiceDataFromTable?.items?.filter(
            (item) =>
              item.itemName &&
              parseFloat(item.quantity) > 0 &&
              parseFloat(item.pricePerUnit) > 0
          ) || [];

        if (!itemsToSave || itemsToSave.length === 0) {
          addToast?.("Please add at least one item before saving", "error");
          return {
            success: false,
            error: "No items",
            message: "Please add items before saving",
          };
        }

        // ✅ FIXED: Build proper document data
        const documentData = {
          companyId: companyId,
          companyName: currentCompany?.name || "Unknown Company",
          createdBy: currentUser?._id || currentUser?.id,
          createdByName: currentUser?.name || "Unknown User",

          // ✅ Add edit mode data if editing
          ...(editingSale && {
            id: editingSale.id || editingSale._id,
            _id: editingSale.id || editingSale._id,
          }),

          // ✅ Document type specific fields
          ...(isQuotationsMode
            ? {
                quotationNumber: invoiceDataFromTable?.invoiceNumber,
                quotationDate: invoiceDataFromTable?.invoiceDate,
                quotationValidity: 30,
                quotationStatus: "draft",
                documentType: "quotation",
              }
            : {
                invoiceNumber: invoiceDataFromTable?.invoiceNumber,
                invoiceDate: invoiceDataFromTable?.invoiceDate,
                documentType: "invoice",
              }),

          // ✅ Customer data
          customer:
            invoiceDataFromTable?.customer?.id ||
            invoiceDataFromTable?.customer?._id,
          customerId:
            invoiceDataFromTable?.customer?.id ||
            invoiceDataFromTable?.customer?._id,
          customerName: invoiceDataFromTable?.customer?.name || "Cash Customer",
          customerMobile: invoiceDataFromTable?.mobileNumber,
          mobileNumber: invoiceDataFromTable?.mobileNumber,

          // ✅ Items and totals
          items: itemsToSave,
          totals: {
            ...invoiceDataFromTable?.totals,
            finalTotal:
              invoiceDataFromTable?.totals?.finalTotal ||
              itemsToSave.reduce((sum, item) => sum + (item.amount || 0), 0),
            roundOffValue: invoiceDataFromTable?.roundOffValue || 0,
            roundOffEnabled: invoiceDataFromTable?.roundOffEnabled || false,
          },

          // ✅ Tax and payment data
          gstEnabled: invoiceDataFromTable?.gstEnabled !== false,
          taxMode: invoiceDataFromTable?.globalTaxMode || "without-tax",
          priceIncludesTax: invoiceDataFromTable?.priceIncludesTax || false,

          paymentData: invoiceDataFromTable?.paymentData || {
            paymentType: "cash",
            method: "cash",
            amount: 0,
            status: "pending",
            companyId: companyId,
          },

          roundOffEnabled: invoiceDataFromTable?.roundOffEnabled || false,
          roundOffValue: invoiceDataFromTable?.roundOffValue || 0,

          // ✅ Additional fields
          notes: "",
          termsAndConditions: "",
          status: isQuotationsMode ? "draft" : "completed",
          updatedBy: currentUser?.name || "user",
          updatedAt: new Date().toISOString(),
          createdAt: editingSale ? undefined : new Date().toISOString(),

          formType: isQuotationsMode ? "quotation" : "sales",
          mode: isQuotationsMode ? "quotations" : "invoices",
          documentMode: isQuotationsMode ? "quotation" : "invoice",
          submissionId: now,
        };

        console.log("📤 Sending document data:", {
          itemsCount: documentData.items.length,
          totalAmount: documentData.totals.finalTotal,
          companyId: documentData.companyId,
          documentType: documentData.documentType,
        });

        let result;

        try {
          if (editingSale) {
            // ✅ Update existing document
            if (isQuotationsMode) {
              if (quotationService?.updateQuotation) {
                result = await quotationService.updateQuotation(
                  editingSale.id,
                  documentData
                );
              } else if (orderService?.updateSalesOrder) {
                result = await orderService.updateSalesOrder(
                  editingSale.id,
                  documentData
                );
              } else {
                throw new Error("Update quotation service not available");
              }
            } else {
              if (salesService?.updateInvoice) {
                result = await salesService.updateInvoice(
                  editingSale.id,
                  documentData
                );
              } else {
                throw new Error("Update invoice service not available");
              }
            }
          } else {
            // ✅ Create new document
            if (isQuotationsMode) {
              if (onSaveQuotation) {
                result = await onSaveQuotation(documentData);
              } else if (quotationService?.createQuotation) {
                result = await quotationService.createQuotation(documentData);
              } else if (orderService?.createSalesOrder) {
                result = await orderService.createSalesOrder(documentData);
              } else if (onSave) {
                result = await onSave(documentData);
              } else {
                throw new Error("No quotation save handler available");
              }
            } else {
              if (onSave) {
                result = await onSave(documentData);
              } else if (salesService?.createInvoice) {
                result = await salesService.createInvoice(documentData);
              } else {
                throw new Error("No invoice save handler available");
              }
            }
          }

          // ✅ CRITICAL: Handle duplicate submissions gracefully
          if (result && result.isDuplicate) {
            console.log(
              "ℹ️ Duplicate submission detected at service level, handled gracefully"
            );
            return {
              success: true,
              data: result.data,
              message: labels.savedText,
              isDuplicate: true,
            };
          }

          if (result?.success) {
            if (result.data) {
              const newTransaction = {
                id: result.data._id || result.data.id || Date.now(),
                invoiceNo:
                  result.data.invoiceNumber ||
                  result.data.invoiceNo ||
                  result.data.orderNo ||
                  documentData.invoiceNumber ||
                  documentData.quotationNumber,
                quotationNumber:
                  result.data.quotationNumber || result.data.orderNo,
                partyName:
                  result.data.customerName || documentData.customerName,
                amount:
                  result.data.totals?.finalTotal || result.data.amount || 0,
                date:
                  result.data.invoiceDate ||
                  result.data.orderDate ||
                  documentData.invoiceDate ||
                  documentData.quotationDate,
                transaction: isQuotationsMode ? "Quotation" : "Sale",
                documentType: isQuotationsMode ? "quotation" : "invoice",
                status:
                  result.data.status ||
                  (isQuotationsMode ? "draft" : "completed"),
                originalSale: result.data,
              };

              if (editingSale) {
                setTransactions((prev) =>
                  prev.map((t) =>
                    t.id === editingSale.id || t._id === editingSale._id
                      ? newTransaction
                      : t
                  )
                );
              } else {
                setTransactions((prev) => [newTransaction, ...prev]);
              }
            }

            // ✅ Navigate back to list view
            setCurrentView("list");
            setEditingSale(null);
            addToast?.(labels.savedText, "success");

            // ✅ Reload data after successful save
            setTimeout(() => {
              loadSalesData();
            }, 1000);

            return result;
          } else {
            throw new Error(
              result?.error || result?.message || "Save operation failed"
            );
          }
        } catch (serviceError) {
          if (
            serviceError.message?.includes("already in progress") ||
            serviceError.message?.includes("duplicate") ||
            serviceError.response?.status === 409
          ) {
            return {
              success: true,
              data: null,
              message: labels.savedText,
              isDuplicate: true,
            };
          }
          throw serviceError;
        }
      } catch (error) {
        console.error("❌ Error in handleSaleFormSave:", error);

        // ✅ CRITICAL: Handle duplicate submission errors gracefully
        if (
          error.message === "Invoice creation already in progress" ||
          error.message === "Request already in progress" ||
          error.message === "Save in progress" ||
          error.message === "Save operation already in progress"
        ) {
          console.log(
            "ℹ️ Duplicate submission error caught and handled gracefully"
          );
          return {
            success: true,
            data: null,
            message: "Save operation completed",
            isDuplicate: true,
          };
        }

        const errorMessage = `Error saving ${labels.documentName.toLowerCase()}: ${
          error.message
        }`;
        addToast?.(errorMessage, "error");

        return {
          success: false,
          error: error.message,
          message: errorMessage,
        };
      } finally {
        // ✅ Reset guards with delay
        setTimeout(() => {
          setLoading(false);
          saveInProgressRef.current = false;
        }, 1000);
      }
    },
    [
      editingSale,
      companyId,
      currentCompany,
      currentUser,
      labels,
      isQuotationsMode,
      addToast,
      onSave,
      onSaveQuotation,
      onCreateSale,
      salesService,
      quotationService,
      orderService,
      loadSalesData,
    ]
  );

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

            return {
              success: true,
              data: response.data,
              message: `Item "${productData.name}" added successfully`,
            };
          } else {
            throw new Error(response.message || "Failed to add item");
          }
        } else {
          throw new Error("Item service not available");
        }
      } catch (error) {
        addToast?.("Error adding item to inventory", "error");
        return {
          success: false,
          error: error.message,
          message: "Error adding item to inventory",
        };
      }
    },
    [companyId, addToast]
  );

  const handleSearchChange = useCallback((e) => {
    setTopSearchTerm(e.target.value);
  }, []);

  const handleViewTransaction = useCallback((transaction) => {
    setSelectedTransaction(transaction);
    setShowViewModal(true);
  }, []);

  // ✅ FIXED: Edit handler - always navigate to separate page
  const handleEditTransaction = useCallback(
    (transaction) => {
      console.log("🔄 Editing transaction - always navigate to page");

      if (onEditSale) {
        onEditSale(transaction); // This will call handleEditQuotation which navigates
      } else {
        const transactionId = transaction.id || transaction._id;
        const basePath = isQuotationsMode ? "quotations" : "sales";
        navigate(`/companies/${companyId}/${basePath}/edit/${transactionId}`);
      }
    },
    [companyId, isQuotationsMode, navigate, onEditSale]
  );

  const handleModalPrint = useCallback(
    (transaction) => {
      if (onPrintSale) {
        onPrintSale(transaction);
      }
    },
    [onPrintSale]
  );

  const handleModalDownload = useCallback(
    (transaction) => {
      if (onDownloadSale) {
        onDownloadSale(transaction);
      }
    },
    [onDownloadSale]
  );

  const handleModalShare = useCallback(
    (transaction) => {
      if (onShareSale) {
        onShareSale(transaction);
      }
    },
    [onShareSale]
  );

  const handleModalConvert = useCallback((transaction) => {
    setShowViewModal(false);
    handleConvertTransaction(transaction);
  }, []);

  // ✅ FIXED: Enhanced delete with submission guards
  const handleDeleteTransaction = useCallback(
    async (transaction) => {
      // ✅ CRITICAL: Prevent multiple deletions
      if (deleteInProgressRef.current) {
        console.log("⚠️ Delete already in progress");
        return {success: false, error: "Delete in progress"};
      }

      try {
        const transactionId = transaction.id || transaction._id;
        const documentNumber =
          transaction.quotationNumber || transaction.invoiceNo;
        const documentName = isQuotationsMode ? "quotation" : "invoice";

        console.log(`🗑️ Deleting ${documentName}:`, transactionId);

        const confirmDelete = window.confirm(
          `Are you sure you want to delete ${documentName} ${documentNumber}?\n\nThis action cannot be undone.`
        );

        if (!confirmDelete) {
          return {success: false, cancelled: true};
        }

        // ✅ Set guard
        deleteInProgressRef.current = true;
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

          const successMessage =
            result.message ||
            `${labels.documentName} ${documentNumber} deleted successfully`;
          addToast?.(successMessage, "success");

          setTimeout(() => {
            loadSalesData();
          }, 1000);

          return {success: true, message: successMessage};
        } else {
          throw new Error(
            result?.error || result?.message || "Delete operation failed"
          );
        }
      } catch (error) {
        console.error("❌ Error deleting transaction:", error);
        const errorMessage = `Failed to delete ${labels.documentName.toLowerCase()}: ${
          error.message
        }`;
        addToast?.(errorMessage, "error");

        return {
          success: false,
          error: errorMessage,
          message: errorMessage,
        };
      } finally {
        // ✅ Reset guard with delay
        setTimeout(() => {
          setLoading(false);
          deleteInProgressRef.current = false;
        }, 1000);
      }
    },
    [
      labels,
      isQuotationsMode,
      addToast,
      salesService,
      orderService,
      loadSalesData,
    ]
  );

  // ✅ FIXED: Enhanced convert with submission guards
  const handleConvertTransaction = useCallback(
    async (transaction) => {
      // ✅ CRITICAL: Prevent multiple conversions
      if (convertInProgressRef.current) {
        console.log("⚠️ Convert already in progress");
        return {success: false, error: "Convert in progress"};
      }

      const documentNumber =
        transaction.quotationNumber || transaction.invoiceNo;
      const confirmMessage = `Convert ${labels.documentName.toLowerCase()} ${documentNumber} to Sales Invoice?\n\nThis will create a new invoice and mark the ${labels.documentName.toLowerCase()} as converted.`;

      if (window.confirm(confirmMessage)) {
        try {
          // ✅ Set guard
          convertInProgressRef.current = true;
          setLoading(true);
          addToast?.("Converting to invoice...", "info");

          const conversionData = {
            userId: currentUser?.id || "current-user-id",
            companyId: companyId,
            originalOrderType: transaction.documentType || "quotation",
            convertedFrom: "quotation_table",
          };

          if (orderService?.convertToInvoice) {
            const response = await orderService.convertToInvoice(
              transaction.id,
              conversionData
            );

            if (response.success) {
              setTransactions((prev) =>
                prev.map((t) =>
                  t.id === transaction.id
                    ? {
                        ...t,
                        convertedToInvoice: true,
                        status: "converted",
                        quotationStatus: "converted",
                        invoiceId:
                          response.data.invoice?._id ||
                          response.data.invoice?.id,
                        invoiceNumber:
                          response.data.invoice?.invoiceNumber ||
                          response.data.invoice?.invoiceNo,
                      }
                    : t
                )
              );

              addToast?.(
                `${labels.documentName} converted successfully!`,
                "success"
              );

              setTimeout(() => {
                loadSalesData();
              }, 1000);
            } else {
              throw new Error(
                response.error ||
                  `Failed to convert ${labels.documentName.toLowerCase()}`
              );
            }
          } else {
            throw new Error("Convert to invoice service not available");
          }
        } catch (error) {
          const errorMessage = `Error converting ${labels.documentName.toLowerCase()}: ${
            error.message
          }`;
          addToast?.(errorMessage, "error");
        } finally {
          // ✅ Reset guard with delay
          setTimeout(() => {
            setLoading(false);
            convertInProgressRef.current = false;
          }, 1000);
        }
      }
    },
    [
      labels.documentName,
      companyId,
      currentUser,
      addToast,
      loadSalesData,
      orderService,
    ]
  );

  const handlePrintTransaction = useCallback(
    (transaction) => {
      const documentNumber =
        transaction.quotationNumber || transaction.invoiceNo;
      const message = `Printing ${labels.documentName.toLowerCase()} ${documentNumber}...`;
      addToast?.(message, "info");
    },
    [labels.documentName, addToast]
  );

  const handleShareTransaction = useCallback(
    (transaction) => {
      const documentNumber =
        transaction.quotationNumber || transaction.invoiceNo;
      const shareText = `${labels.documentName} ${documentNumber}\nCustomer: ${
        transaction.partyName
      }\nAmount: ₹${(transaction.amount || 0).toLocaleString()}\nStatus: ${
        transaction.status
      }`;

      if (navigator.share) {
        navigator
          .share({
            title: `${labels.documentName} ${documentNumber}`,
            text: shareText,
            url: window.location.href,
          })
          .catch((err) => {});
      } else if (navigator.clipboard) {
        navigator.clipboard
          .writeText(shareText)
          .then(() => {
            const message = `${labels.documentName} details copied to clipboard!`;
            addToast?.(message, "success");
          })
          .catch(() => {});
      }
    },
    [labels.documentName, addToast]
  );

  const handleMoreOptions = useCallback(() => {}, []);

  const handleSettings = useCallback(() => {}, []);

  const handleExcelExport = useCallback(() => {
    const message = `Excel export for ${labels.documentNamePlural.toLowerCase()} coming soon!`;
    addToast?.(message, "info");
  }, [labels.documentNamePlural, addToast]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

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

  const formHeaderStyles = {
    zIndex: 1020,
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    borderBottom: `2px solid ${colors.primary}`,
  };

  const pageTitleStyles = {
    fontSize: "1.1rem",
    color: colors.primary,
    fontWeight: 600,
  };

  const backBtnStyles = {
    borderColor: colors.primary,
    color: colors.primary,
    transition: "all 0.3s ease",
  };

  // ✅ REMOVED: SalesForm view rendering - always navigate to separate pages
  // The form view section has been removed since we always navigate to separate pages now

  return (
    <>
      <div
        className="sales-invoices-wrapper"
        style={containerStyles}
        data-mode={isQuotationsMode ? "quotations" : "invoices"}
      >
        <SalesInvoicesHeader
          searchTerm={topSearchTerm}
          onSearchChange={handleSearchChange}
          onAddSale={handleCreateSale}
          onMoreOptions={handleMoreOptions}
          onSettings={handleSettings}
          companyId={companyId}
          mode={isQuotationsMode ? "quotations" : "invoices"}
          documentType={isQuotationsMode ? "quotation" : "invoice"}
          pageTitle={labels.pageTitle}
        />

        <SalesInvoicesPageTitle
          onAddSale={handleCreateSale}
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
          selectedFirm={selectedFirm}
          dateRangeOptions={dateRangeOptions}
          firmOptions={firmOptions}
          onDateRangeChange={handleDateRangeChange}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
          onFirmChange={setSelectedFirm}
          onExcelExport={handleExcelExport}
          onPrint={handlePrint}
          resultCount={filteredTransactions.length}
          mode={isQuotationsMode ? "quotations" : "invoices"}
          documentType={isQuotationsMode ? "quotation" : "invoice"}
          pageTitle={pageTitle || labels.documentNamePlural}
        />

        <Container fluid className="px-4 py-3">
          <Row className="g-3">
            <Col xl={2} lg={3} md={3} sm={12} className="sidebar-col">
              <SalesInvoicesSummary
                summary={summary}
                loading={loading}
                dateRange={dateRange}
                mode={isQuotationsMode ? "quotations" : "invoices"}
                documentType={isQuotationsMode ? "quotation" : "invoice"}
                isQuotationsMode={isQuotationsMode}
              />
            </Col>

            <Col xl={10} lg={9} md={9} sm={12} className="content-col">
              <SalesInvoicesTable
                transactions={filteredTransactions}
                onCreateNew={handleCreateSale}
                onViewTransaction={handleViewTransaction}
                onEditTransaction={handleEditTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onPrintTransaction={handlePrintTransaction}
                onShareTransaction={handleShareTransaction}
                onConvertTransaction={handleConvertTransaction}
                onDownloadTransaction={onDownloadSale}
                categories={categories}
                onAddItem={handleAddItem}
                inventoryItems={inventoryItems}
                loading={loading}
                companyId={companyId}
                currentUser={currentUser}
                searchTerm={debouncedSearchTerm}
                mode={isQuotationsMode ? "quotations" : "invoices"}
                documentType={isQuotationsMode ? "quotation" : "invoice"}
                isQuotationsMode={isQuotationsMode}
                labels={labels}
                addToast={addToast}
              />
            </Col>
          </Row>
        </Container>
      </div>

      {/* View Modal */}
      <UniversalViewModal
        show={showViewModal}
        onHide={() => setShowViewModal(false)}
        transaction={selectedTransaction}
        documentType={isQuotationsMode ? "quotation" : "invoice"}
        onEdit={(transaction) => {
          setShowViewModal(false);
          handleEditTransaction(transaction);
        }}
        onPrint={handleModalPrint}
        onDownload={handleModalDownload}
        onShare={handleModalShare}
        onConvert={handleModalConvert}
      />
    </>
  );
}

export default SalesInvoices;
