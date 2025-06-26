import React, {useState, useEffect, useCallback, useMemo} from "react";
import {useParams, useNavigate, useLocation} from "react-router-dom";
import {Container, Alert, Spinner, Button} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faExclamationTriangle,
  faArrowLeft,
  faEdit,
} from "@fortawesome/free-solid-svg-icons";

import PurchaseForm from "./PurchaseForm";
import purchaseService from "../../../services/purchaseService";
import itemService from "../../../services/itemService";
import transactionService from "../../../services/transactionService";

function EditPurchaseBill({
  addToast,
  currentUser,
  currentCompany,
  isOnline = true,
  mode = "purchases", // "purchases" or "purchase-orders"
  documentType = "purchase", // "purchase" or "purchase-order"
  purchaseOrderService, // For purchase orders
  companyId: propCompanyId,
}) {
  const {companyId: paramCompanyId, id: purchaseId} = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const companyId = propCompanyId || paramCompanyId;

  // ✅ State management
  const [loading, setLoading] = useState(true);
  const [purchase, setPurchase] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // ✅ Determine document type from URL or location state
  const isPurchaseOrdersMode = useMemo(() => {
    const pathParts = location.pathname.split("/");
    return (
      pathParts.includes("purchase-orders") ||
      location.state?.documentType === "purchase-order" ||
      location.state?.mode === "purchase-orders" ||
      mode === "purchase-orders" ||
      documentType === "purchase-order"
    );
  }, [location, mode, documentType]);

  // Get existing transaction from navigation state
  const existingTransaction =
    location.state?.purchase || location.state?.transaction;
  const returnPath = location.state?.returnPath;

  // Default toast function
  const defaultAddToast = useCallback((message, type = "info") => {
    if (type === "error") {
      console.error("Error:", message);
      alert(`Error: ${message}`);
    } else {
      console.log(`${type.toUpperCase()}:`, message);
    }
  }, []);

  const effectiveAddToast = addToast || defaultAddToast;

  // Get document labels
  const getDocumentLabels = () => {
    return isPurchaseOrdersMode
      ? {
          documentName: "Purchase Order",
          documentNamePlural: "Purchase Orders",
          listPath: "purchase-orders",
        }
      : {
          documentName: "Purchase Bill",
          documentNamePlural: "Purchase Bills",
          listPath: "purchases",
        };
  };

  const labels = getDocumentLabels();

  // ✅ Load transaction data on mount
  useEffect(() => {
    if (purchaseId && companyId) {
      loadPurchaseData();
      loadInventoryItems();
    }
  }, [purchaseId, companyId, isPurchaseOrdersMode]);

  // ✅ ENHANCED: Load purchase data with improved transaction service integration
  const loadPurchaseData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔄 EditPurchaseBill loading data:", {
        purchaseId,
        companyId,
        isPurchaseOrdersMode,
      });

      // Try to use transaction from navigation state first
      if (existingTransaction) {
        console.log(
          "📥 EditPurchaseBill using transaction from navigation state:",
          existingTransaction
        );

        // ✅ Check if data is already transformed by the service
        const isAlreadyTransformed = existingTransaction.isEditing === true;

        if (isAlreadyTransformed) {
          console.log("✅ Data already transformed for editing by service");
          setPurchase(existingTransaction);
        } else {
          // Apply manual transformation if needed
          const transformedData = await transformPurchaseForEditing(
            existingTransaction
          );
          setPurchase(transformedData);
        }

        setLoading(false);
        return;
      }

      // ✅ STEP 1: Fetch purchase data
      const purchaseData = await fetchPurchaseData();
      if (!purchaseData) {
        throw new Error("Purchase transaction not found");
      }

      console.log("📥 EditPurchaseBill purchase data loaded:", purchaseData);

      // ✅ STEP 2: Enhanced transaction search using new service methods
      const enhancedPurchaseData = await enhancePurchaseWithTransactionData(
        purchaseData
      );

      // ✅ STEP 3: Transform data for editing
      const transformedData = await transformPurchaseForEditing(
        enhancedPurchaseData
      );

      console.log("✅ EditPurchaseBill final transformed data:", {
        purchaseNumber: transformedData.purchaseNumber,
        supplierName: transformedData.supplierName,
        itemsCount: transformedData.items?.length || 0,
        paymentMethod: transformedData.paymentMethod,
        bankAccountId: transformedData.bankAccountId,
        bankAccountName: transformedData.bankAccountName,
        paymentReceived: transformedData.paymentReceived,
        hasTransactionData: !!transformedData.paymentTransactionId,
      });

      setPurchase(transformedData);
    } catch (err) {
      console.error("❌ EditPurchaseBill error loading transaction:", err);
      setError(err.message || "Failed to load purchase data");
      effectiveAddToast(
        `Error loading ${labels.documentName.toLowerCase()}: ${err.message}`,
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // ✅ Helper: Fetch purchase data with multiple fallbacks
  const fetchPurchaseData = async () => {
    try {
      let purchaseResponse;

      if (isPurchaseOrdersMode && purchaseOrderService) {
        purchaseResponse = await purchaseOrderService.getPurchaseOrder(
          purchaseId
        );
      } else {
        // ✅ Try enhanced method first, fallback to regular methods
        try {
          purchaseResponse =
            await purchaseService.getPurchaseWithTransactionData(purchaseId);
        } catch (enhancedError) {
          console.warn(
            "⚠️ Enhanced method failed, trying getPurchaseForEdit..."
          );
          try {
            purchaseResponse = await purchaseService.getPurchaseForEdit(
              purchaseId
            );
          } catch (editError) {
            console.warn(
              "⚠️ getPurchaseForEdit failed, using getPurchaseById..."
            );
            purchaseResponse = await purchaseService.getPurchaseById(
              purchaseId
            );
          }
        }
      }

      // Handle purchase response
      if (purchaseResponse?.success && purchaseResponse.data) {
        return purchaseResponse.data;
      } else if (
        purchaseResponse &&
        (purchaseResponse.id || purchaseResponse._id)
      ) {
        return purchaseResponse;
      }

      return null;
    } catch (error) {
      console.error("❌ Error fetching purchase data:", error);
      throw error;
    }
  };

  // ✅ Enhanced: Use direct API calls with multiple search strategies for better results
  const enhancePurchaseWithTransactionData = async (purchaseData) => {
    try {
      console.log(
        "🔍 Searching for related transactions using enhanced direct API search..."
      );
      console.log("📥 Purchase data for transaction search:", {
        purchaseNumber: purchaseData.purchaseNumber,
        supplierId: purchaseData.supplierId || purchaseData.supplier?._id,
        supplierName: purchaseData.supplierName || purchaseData.supplier?.name,
        amount: purchaseData.amount || purchaseData.finalTotal,
        paymentMethod: purchaseData.paymentMethod,
        bankAccountId: purchaseData.bankAccountId,
      });

      // ✅ STRATEGY 1: Direct API search with multiple approaches
      const searchStrategies = [
        // Strategy 1: By purchase number in description
        {
          name: "Purchase number search",
          params: {
            search: purchaseData.purchaseNumber,
            transactionType: "payment_out",
            paymentMethod: "bank_transfer",
            limit: 10,
            sortBy: "transactionDate",
            sortOrder: "desc",
          },
        },
        // Strategy 2: By supplier ID and amount
        {
          name: "Supplier and amount search",
          params: {
            partyId: purchaseData.supplierId || purchaseData.supplier?._id,
            amount: purchaseData.amount || purchaseData.finalTotal,
            transactionType: "payment_out",
            paymentMethod: "bank_transfer",
            limit: 10,
          },
        },
        // Strategy 3: By amount and date range
        {
          name: "Amount and date search",
          params: {
            amount: purchaseData.amount || purchaseData.finalTotal,
            transactionType: "payment_out",
            paymentMethod: "bank_transfer",
            dateFrom: new Date(
              new Date(
                purchaseData.purchaseDate || purchaseData.createdAt
              ).getTime() -
                24 * 60 * 60 * 1000
            )
              .toISOString()
              .split("T")[0],
            dateTo: new Date(
              new Date(
                purchaseData.purchaseDate || purchaseData.createdAt
              ).getTime() +
                7 * 24 * 60 * 60 * 1000
            )
              .toISOString()
              .split("T")[0],
            limit: 20,
          },
        },
        // Strategy 4: Broad supplier search
        {
          name: "Broad supplier search",
          params: {
            partyId: purchaseData.supplierId || purchaseData.supplier?._id,
            transactionType: "payment_out",
            limit: 50,
          },
        },
      ];

      let bestTransaction = null;

      // ✅ Try each search strategy with direct API calls
      for (const strategy of searchStrategies) {
        try {
          console.log(`🔍 Trying ${strategy.name}...`, strategy.params);

          // Build query parameters
          const queryParams = new URLSearchParams();
          Object.entries(strategy.params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              queryParams.append(key, String(value));
            }
          });

          // Direct API call
          const apiUrl = `${
            import.meta.env.VITE_API_URL || "http://localhost:5000/api"
          }/companies/${companyId}/transactions?${queryParams}`;

          const response = await fetch(apiUrl, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "application/json",
              "x-company-id": companyId,
            },
          });

          if (response.ok) {
            const data = await response.json();

            if (data.success && data.data?.transactions?.length > 0) {
              const transactions = data.data.transactions;
              console.log(
                `✅ Found ${transactions.length} transactions using ${strategy.name}`
              );

              // ✅ Enhanced matching logic
              const targetAmount =
                purchaseData.amount || purchaseData.finalTotal || 0;
              const purchaseNumber = purchaseData.purchaseNumber || "";

              // Priority 1: Exact amount match with bank account
              let match = transactions.find(
                (t) =>
                  Math.abs((t.amount || 0) - targetAmount) < 1 &&
                  t.bankAccountId &&
                  (t.paymentMethod === "bank_transfer" ||
                    t.paymentMethod === "bank")
              );

              if (!match) {
                // Priority 2: Description match with bank account
                match = transactions.find((t) => {
                  const description = (t.description || "").toLowerCase();
                  const reference = (t.referenceNumber || "").toLowerCase();
                  const notes = (t.notes || "").toLowerCase();
                  const searchTerm = purchaseNumber.toLowerCase();

                  return (
                    t.bankAccountId &&
                    (t.paymentMethod === "bank_transfer" ||
                      t.paymentMethod === "bank") &&
                    (description.includes(searchTerm) ||
                      reference.includes(searchTerm) ||
                      notes.includes(searchTerm))
                  );
                });
              }

              if (!match) {
                // Priority 3: Any bank transaction with same supplier
                match = transactions.find(
                  (t) =>
                    t.bankAccountId &&
                    (t.paymentMethod === "bank_transfer" ||
                      t.paymentMethod === "bank") &&
                    t.partyId ===
                      (purchaseData.supplierId || purchaseData.supplier?._id)
                );
              }

              if (match) {
                bestTransaction = match;
                console.log(
                  `✅ Found matching transaction using ${strategy.name}:`,
                  {
                    transactionId: match._id || match.id,
                    bankAccountId: match.bankAccountId,
                    bankAccountName: match.bankAccountName,
                    amount: match.amount,
                    paymentMethod: match.paymentMethod,
                  }
                );
                break; // Exit search loop
              }
            }
          } else {
            console.warn(
              `⚠️ ${strategy.name} API call failed:`,
              response.status
            );
          }
        } catch (strategyError) {
          console.warn(`⚠️ ${strategy.name} failed:`, strategyError.message);
          continue;
        }
      }

      // ✅ STRATEGY 2: Fallback - Search all payment transactions manually
      if (!bestTransaction) {
        try {
          console.log("🔍 Fallback: Getting all payment transactions...");

          const allTransactionsUrl = `${
            import.meta.env.VITE_API_URL || "http://localhost:5000/api"
          }/companies/${companyId}/transactions?transactionType=payment_out&limit=100&sortBy=transactionDate&sortOrder=desc`;

          const response = await fetch(allTransactionsUrl, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "application/json",
              "x-company-id": companyId,
            },
          });

          if (response.ok) {
            const data = await response.json();
            const allTransactions = data.success
              ? data.data?.transactions || []
              : [];

            console.log(
              `📥 Retrieved ${allTransactions.length} payment transactions for manual search`
            );

            // Manual matching logic
            const targetAmount =
              purchaseData.amount || purchaseData.finalTotal || 0;

            const potentialMatches = allTransactions.filter(
              (t) =>
                t.bankAccountId &&
                (t.paymentMethod === "bank_transfer" ||
                  t.paymentMethod === "bank") &&
                Math.abs((t.amount || 0) - targetAmount) < 1
            );

            if (potentialMatches.length > 0) {
              bestTransaction = potentialMatches[0]; // Take the first match
              console.log("✅ Found transaction via manual search:", {
                transactionId: bestTransaction._id,
                bankAccountId: bestTransaction.bankAccountId,
                amount: bestTransaction.amount,
              });
            }
          }
        } catch (fallbackError) {
          console.warn("⚠️ Fallback search failed:", fallbackError.message);
        }
      }

      // ✅ If transaction found, merge with purchase data
      if (bestTransaction) {
        console.log("✅ Merging transaction data with purchase data...");
        return mergeTransactionWithPurchase(purchaseData, bestTransaction);
      } else {
        console.log(
          "❌ No related transactions found, checking for bank payment method..."
        );
        return await handleBankPaymentWithoutTransaction(purchaseData);
      }
    } catch (transactionError) {
      console.error("❌ Transaction search failed:", transactionError);
      return purchaseData; // Continue without transaction data
    }
  };

  // ✅ Helper: Merge transaction data with purchase data
  const mergeTransactionWithPurchase = (purchaseData, transactionData) => {
    return {
      ...purchaseData,

      // ✅ Bank account information from transaction
      bankAccountId:
        transactionData.bankAccountId || purchaseData.bankAccountId,
      bankAccountName:
        transactionData.bankAccountName ||
        transactionData.accountName ||
        purchaseData.bankAccountName,
      bankName: transactionData.bankName || purchaseData.bankName,
      accountNumber:
        transactionData.accountNumber ||
        transactionData.accountNo ||
        purchaseData.accountNumber,

      // ✅ Payment method from transaction (normalized for frontend)
      paymentMethod: transactionService.normalizePaymentMethodForFrontend(
        transactionData.paymentMethod ||
          transactionData.method ||
          purchaseData.paymentMethod ||
          purchaseData.payment?.method ||
          "cash"
      ),

      // ✅ Payment amount from transaction
      paymentReceived:
        transactionData.amount || purchaseData.paymentReceived || 0,
      paidAmount: transactionData.amount || purchaseData.paidAmount || 0,

      // ✅ Payment transaction details
      upiTransactionId:
        transactionData.upiTransactionId ||
        transactionData.upiId ||
        purchaseData.upiTransactionId,
      bankTransactionId:
        transactionData.bankTransactionId ||
        transactionData.transactionReference ||
        transactionData.reference ||
        transactionData.externalTransactionId ||
        purchaseData.bankTransactionId,
      chequeNumber:
        transactionData.chequeNumber ||
        transactionData.chequeNo ||
        purchaseData.chequeNumber,
      chequeDate: transactionData.chequeDate || purchaseData.chequeDate,

      // ✅ Transaction metadata
      paymentTransactionId: transactionData._id || transactionData.id,
      transactionDate:
        transactionData.transactionDate || transactionData.createdAt,
      transactionStatus: transactionData.status,
      transactionType: transactionData.transactionType,
      transactionDescription: transactionData.description,

      // ✅ Enhanced payment object with transaction data
      payment: {
        ...(purchaseData.payment || {}),
        method: transactionService.normalizePaymentMethodForFrontend(
          transactionData.paymentMethod ||
            transactionData.method ||
            purchaseData.payment?.method ||
            "cash"
        ),
        paymentMethod: transactionService.normalizePaymentMethodForFrontend(
          transactionData.paymentMethod ||
            transactionData.method ||
            purchaseData.payment?.paymentMethod ||
            "cash"
        ),
        bankAccountId:
          transactionData.bankAccountId || purchaseData.payment?.bankAccountId,
        bankAccountName:
          transactionData.bankAccountName ||
          transactionData.accountName ||
          purchaseData.payment?.bankAccountName,
        bankName: transactionData.bankName || purchaseData.payment?.bankName,
        accountNumber:
          transactionData.accountNumber ||
          transactionData.accountNo ||
          purchaseData.payment?.accountNumber,
        transactionId: transactionData._id || transactionData.id,
        transactionReference:
          transactionData.transactionReference ||
          transactionData.reference ||
          transactionData.description,
        paidAmount:
          transactionData.amount || purchaseData.payment?.paidAmount || 0,
        totalAmount:
          purchaseData.payment?.totalAmount ||
          purchaseData.totals?.finalTotal ||
          purchaseData.finalTotal ||
          0,
      },
    };
  };

  // ✅ Helper: Handle bank payment method without transaction data
  const handleBankPaymentWithoutTransaction = async (purchaseData) => {
    const frontendPaymentMethod =
      transactionService.normalizePaymentMethodForFrontend(
        purchaseData.paymentMethod || purchaseData.payment?.method || "cash"
      );

    if (frontendPaymentMethod === "bank" && !purchaseData.bankAccountId) {
      console.log(
        "🔍 Payment method is bank but no transaction found, fetching bank accounts..."
      );

      try {
        const bankAccountsResponse = await fetch(
          `${
            import.meta.env.VITE_API_URL || "http://localhost:5000/api"
          }/companies/${companyId}/bank-accounts`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "application/json",
              "x-company-id": companyId,
            },
          }
        );

        if (bankAccountsResponse.ok) {
          const bankAccountsData = await bankAccountsResponse.json();
          const bankAccounts = bankAccountsData.success
            ? bankAccountsData.data?.accounts || bankAccountsData.data || []
            : [];

          if (bankAccounts.length > 0) {
            const firstAccount =
              bankAccounts.find((acc) => acc.isActive !== false) ||
              bankAccounts[0];

            if (firstAccount) {
              return {
                ...purchaseData,
                bankAccountId: firstAccount._id || firstAccount.id,
                bankAccountName:
                  firstAccount.accountName || firstAccount.name || "Account",
                bankName: firstAccount.bankName || "Bank",
                accountNumber:
                  firstAccount.accountNumber || firstAccount.accountNo || "N/A",
              };
            }
          }
        }
      } catch (bankAccountError) {
        console.warn("⚠️ Could not fetch bank accounts:", bankAccountError);
      }
    }

    return purchaseData;
  };

  // ✅ Enhanced: Transform purchase data for editing with better structure
  const transformPurchaseForEditing = async (purchaseData) => {
    // ✅ Check if data is already transformed
    if (purchaseData.isEditing === true) {
      console.log("✅ Data already transformed for editing");
      return purchaseData;
    }

    console.log("🔄 Transforming purchase data for editing...");

    const transformedData = {
      ...purchaseData,

      // ✅ Basic purchase info
      id: purchaseData._id || purchaseData.id,
      _id: purchaseData._id || purchaseData.id,

      // ✅ Supplier information - handle various formats for form compatibility
      customer: purchaseData.supplier || {
        id:
          purchaseData.supplierId ||
          purchaseData.supplier?._id ||
          purchaseData.supplier?.id,
        _id:
          purchaseData.supplierId ||
          purchaseData.supplier?._id ||
          purchaseData.supplier?.id,
        name:
          purchaseData.supplierName ||
          purchaseData.supplier?.name ||
          purchaseData.partyName,
        mobile:
          purchaseData.supplierMobile ||
          purchaseData.supplier?.mobile ||
          purchaseData.supplier?.phone ||
          purchaseData.partyPhone,
        email:
          purchaseData.supplierEmail ||
          purchaseData.supplier?.email ||
          purchaseData.partyEmail,
        address:
          purchaseData.supplierAddress ||
          purchaseData.supplier?.address ||
          purchaseData.partyAddress,
        gstNumber:
          purchaseData.supplierGstNumber || purchaseData.supplier?.gstNumber,
      },

      // ✅ Also keep individual supplier fields for backward compatibility
      supplier: purchaseData.supplier,
      supplierId:
        purchaseData.supplierId ||
        purchaseData.supplier?._id ||
        purchaseData.supplier?.id,
      supplierName:
        purchaseData.supplierName ||
        purchaseData.supplier?.name ||
        purchaseData.partyName,
      supplierMobile:
        purchaseData.supplierMobile ||
        purchaseData.supplier?.mobile ||
        purchaseData.supplier?.phone,

      // ✅ Items - ensure proper format
      items: (purchaseData.items || []).map((item) => ({
        ...item,
        itemRef: item.itemRef || item.selectedProduct || item.id,
        itemName: item.itemName,
        quantity: item.quantity,
        pricePerUnit: item.pricePerUnit || item.rate,
        taxRate: item.taxRate || item.gstRate || 18,
        unit: item.unit || "PCS",
        hsnCode: item.hsnCode || item.hsnNumber || "0000",
      })),

      // ✅ Payment information enhanced with transaction data
      paymentReceived:
        purchaseData.paymentReceived || purchaseData.paidAmount || 0,
      paidAmount: purchaseData.paidAmount || purchaseData.paymentReceived || 0,

      // ✅ Payment method normalized for frontend
      paymentMethod: transactionService.normalizePaymentMethodForFrontend(
        purchaseData.paymentMethod || purchaseData.payment?.method || "cash"
      ),

      // ✅ Bank account info from transaction (already set above if available)
      bankAccountId: purchaseData.bankAccountId,
      bankAccountName: purchaseData.bankAccountName,
      bankName: purchaseData.bankName,
      accountNumber: purchaseData.accountNumber,

      // ✅ Payment dates and terms
      dueDate: purchaseData.dueDate || purchaseData.payment?.dueDate || null,
      creditDays:
        purchaseData.creditDays || purchaseData.payment?.creditDays || 0,

      // ✅ Payment transaction details from transaction
      chequeNumber: purchaseData.chequeNumber,
      chequeDate: purchaseData.chequeDate,
      upiTransactionId: purchaseData.upiTransactionId,
      bankTransactionId: purchaseData.bankTransactionId,

      // ✅ Transaction metadata
      paymentTransactionId: purchaseData.paymentTransactionId,
      transactionDate: purchaseData.transactionDate,
      transactionStatus: purchaseData.transactionStatus,

      // ✅ Totals
      totals: purchaseData.totals || {
        subtotal: purchaseData.subtotal || 0,
        totalDiscount: purchaseData.totalDiscount || 0,
        totalTax: purchaseData.totalTax || 0,
        finalTotal:
          purchaseData.finalTotal ||
          purchaseData.amount ||
          purchaseData.total ||
          purchaseData.grandTotal ||
          0,
      },

      // ✅ Additional fields
      notes: purchaseData.notes || purchaseData.description || "",
      termsAndConditions:
        purchaseData.termsAndConditions || purchaseData.terms || "",
      status: purchaseData.status || purchaseData.purchaseStatus || "completed",

      // ✅ GST and tax configuration
      gstEnabled: Boolean(purchaseData.gstEnabled),
      purchaseType:
        purchaseData.purchaseType ||
        (purchaseData.gstEnabled ? "gst" : "non-gst"),
      globalTaxMode:
        purchaseData.globalTaxMode || purchaseData.taxMode || "without-tax",
      priceIncludesTax: Boolean(purchaseData.priceIncludesTax),

      // ✅ Round off
      roundOff: purchaseData.roundOff || 0,
      roundOffEnabled: Boolean(purchaseData.roundOffEnabled),

      // ✅ Employee info
      employeeName:
        purchaseData.employeeName || purchaseData.createdByName || "",
      employeeId: purchaseData.employeeId || purchaseData.createdBy || "",

      // ✅ Metadata for form state
      isEditing: true,
      originalId: purchaseData._id || purchaseData.id,
      createdAt: purchaseData.createdAt,
      updatedAt: purchaseData.updatedAt,
    };

    return transformedData;
  };

  // ✅ Load inventory items
  const loadInventoryItems = async () => {
    try {
      if (itemService?.getItems) {
        const response = await itemService.getItems(companyId);
        if (response.success && response.data) {
          setInventoryItems(response.data.items || response.data);
        }
      }
    } catch (err) {
      console.warn("⚠️ EditPurchaseBill could not load inventory items:", err);
      setInventoryItems([]);
    }
  };

  // ✅ Enhanced save operation using the updated service methods
  const handleSave = async (updatedData) => {
    try {
      setSaving(true);

      console.log("💾 EditPurchaseBill saving updated transaction:", {
        purchaseId,
        isPurchaseOrdersMode,
        updatedData: updatedData,
      });

      // ✅ Enhanced save data preparation with backend normalized payment method
      const frontendMethod =
        updatedData.paymentMethod || updatedData.paymentType || "cash";
      const backendMethod =
        transactionService.normalizePaymentMethodForBackend(frontendMethod);

      const saveData = {
        ...updatedData,
        _id: purchaseId,
        id: purchaseId,
        companyId: companyId,
        documentType: isPurchaseOrdersMode ? "purchase-order" : "purchase",

        // ✅ Ensure payment data is properly structured with backend method
        payment: {
          ...(updatedData.paymentData || updatedData.payment || {}),
          method: backendMethod,
          paymentMethod: backendMethod,
          paymentType: backendMethod,
          type: backendMethod,
          paidAmount: updatedData.paidAmount || 0,
          pendingAmount: updatedData.pendingAmount || updatedData.balance || 0,
          status: updatedData.paymentStatus || "pending",
          paymentDate: updatedData.paymentDate,
          dueDate: updatedData.dueDate,
          creditDays: updatedData.creditDays || 0,
          notes: updatedData.paymentNotes || "",
          reference: updatedData.paymentReference || "",
          bankAccountId: updatedData.bankAccountId || null,
          bankAccountName: updatedData.bankAccountName || "",
          bankName: updatedData.bankName || "",
          accountNumber: updatedData.accountNumber || "",
        },

        // ✅ Set backend normalized payment method at top level for compatibility
        paymentMethod: backendMethod,
        paymentType: backendMethod,
        method: backendMethod,

        // ✅ Bank account information at top level
        bankAccountId: updatedData.bankAccountId || null,
        bankAccountName: updatedData.bankAccountName || "",
        bankName: updatedData.bankName || "",
        accountNumber: updatedData.accountNumber || "",

        // ✅ Preserve original creation data
        createdAt: purchase.createdAt,
        createdBy: purchase.createdBy,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.name || currentUser?.email || "System",
      };

      console.log("💾 EditPurchaseBill payment method mapping for save:", {
        frontendMethod: frontendMethod,
        backendMethod: backendMethod,
        paymentObject: saveData.payment,
        topLevelMethod: saveData.paymentMethod,
        bankAccountId: saveData.bankAccountId,
      });

      let response;
      if (isPurchaseOrdersMode && purchaseOrderService) {
        response = await purchaseOrderService.updatePurchaseOrder(
          purchaseId,
          saveData
        );
      } else {
        // ✅ Use the enhanced updatePurchase method with employee context
        const employeeContext = {
          id: currentUser?.id || currentUser?._id,
          name: currentUser?.name || currentUser?.email,
        };

        try {
          response = await purchaseService.updatePurchase(
            purchaseId,
            saveData,
            employeeContext
          );
        } catch (error) {
          // ✅ Fallback to regular updatePurchase if enhanced method doesn't exist
          console.warn(
            "⚠️ Enhanced updatePurchase not available, using regular method"
          );
          response = await purchaseService.updatePurchase(purchaseId, saveData);
        }
      }

      console.log("✅ EditPurchaseBill save response:", response);

      if (response?.success || response?.data || response?._id) {
        const docType = isPurchaseOrdersMode
          ? "Purchase Order"
          : "Purchase Bill";
        const responseData = response.data || response;

        // ✅ Enhanced success message with payment info
        const paymentInfo =
          updatedData.paidAmount > 0
            ? ` | Paid: ₹${updatedData.paidAmount.toLocaleString("en-IN")}`
            : updatedData.pendingAmount > 0
            ? ` | Pending: ₹${updatedData.pendingAmount.toLocaleString(
                "en-IN"
              )}`
            : "";

        effectiveAddToast(
          `${docType} updated successfully! Amount: ₹${(
            responseData.total ||
            responseData.grandTotal ||
            responseData.amount ||
            updatedData.totals?.finalTotal ||
            0
          ).toLocaleString("en-IN")}${paymentInfo}`,
          "success"
        );

        // Navigate back to list with a slight delay
        setTimeout(() => {
          const listPath =
            returnPath || `/companies/${companyId}/${labels.listPath}`;
          navigate(listPath, {
            state: {
              refreshData: true,
              updatedPurchase: responseData,
              message: `${docType} updated successfully`,
            },
          });
        }, 1500);

        return {
          success: true,
          data: responseData,
          message: `${docType} updated successfully`,
        };
      } else {
        throw new Error(
          response?.message ||
            `Failed to update ${labels.documentName.toLowerCase()}`
        );
      }
    } catch (error) {
      console.error("❌ EditPurchaseBill error updating purchase:", error);
      effectiveAddToast(
        `Error updating ${labels.documentName.toLowerCase()}: ${error.message}`,
        "error"
      );
      throw error;
    } finally {
      setSaving(false);
    }
  };

  // ✅ Handle cancel operation
  const handleCancel = useCallback(() => {
    const listPath = returnPath || `/companies/${companyId}/${labels.listPath}`;
    navigate(listPath);
  }, [returnPath, companyId, labels.listPath, navigate]);

  // ✅ Handle exit (same as cancel)
  const handleExit = useCallback(() => {
    handleCancel();
  }, [handleCancel]);

  // ✅ Handle add new inventory item
  const handleAddItem = async (itemData) => {
    try {
      if (itemService?.createItem) {
        const response = await itemService.createItem(companyId, itemData);
        if (response.success) {
          setInventoryItems((prev) => [...prev, response.data]);
          effectiveAddToast(
            `Item "${itemData.name}" added successfully`,
            "success"
          );
          return response;
        }
      }
    } catch (error) {
      console.error("❌ EditPurchaseBill error adding item:", error);
      effectiveAddToast("Failed to add item", "error");
      throw error;
    }
  };

  // ✅ Back button component
  const BackButton = () => (
    <div className="mb-4">
      <Button
        variant="outline-secondary"
        onClick={handleCancel}
        className="d-flex align-items-center"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
        Back to {labels.documentNamePlural}
      </Button>
    </div>
  );

  // ✅ Enhanced loading state with context
  if (loading) {
    return (
      <Container className="py-5 text-center">
        <BackButton />
        <Spinner animation="border" size="lg" className="mb-3" />
        <h5>Loading {labels.documentName}...</h5>
        <p className="text-muted">
          Please wait while we load the {labels.documentName.toLowerCase()} data
          and related transaction information.
        </p>
        {purchaseId && <small className="text-muted">ID: {purchaseId}</small>}
      </Container>
    );
  }

  // ✅ Enhanced error state with retry options
  if (error) {
    return (
      <Container className="py-5">
        <BackButton />
        <Alert variant="danger">
          <Alert.Heading>
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
            Error Loading {labels.documentName}
          </Alert.Heading>
          <p>{error}</p>
          {purchaseId && (
            <p className="mb-3">
              <strong>Transaction ID:</strong> {purchaseId}
            </p>
          )}
          <div className="d-flex gap-2">
            <Button variant="outline-danger" onClick={loadPurchaseData}>
              Try Again
            </Button>
            <Button variant="secondary" onClick={handleCancel}>
              Back to List
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  // ✅ Enhanced transaction not found state
  if (!purchase) {
    return (
      <Container className="py-5">
        <BackButton />
        <Alert variant="warning">
          <Alert.Heading>{labels.documentName} Not Found</Alert.Heading>
          <p>
            The requested {labels.documentName.toLowerCase()} could not be found
            or may have been deleted.
          </p>
          {purchaseId && (
            <p className="mb-3">
              <strong>Requested ID:</strong> {purchaseId}
            </p>
          )}
          <div className="d-flex gap-2">
            <Button variant="outline-warning" onClick={loadPurchaseData}>
              Retry Loading
            </Button>
            <Button variant="secondary" onClick={handleCancel}>
              Back to List
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  // ✅ Main edit form with enhanced props and debugging
  // Show debug info for transaction and payment mapping
  console.log("🚀 EditPurchaseBill rendering PurchaseForm with transaction:", {
    purchaseId,
    isPurchaseOrdersMode,
    paidAmount: purchase.paidAmount,
    totalAmount: purchase.amount,
    paymentStatus: purchase.paymentStatus,
    paymentMethod: purchase.paymentMethod,
    paymentType: purchase.paymentType,
    // Always use string id for bankAccountId if present (handle both _id and id)
    bankAccountId: purchase.bankAccountId
      ? typeof purchase.bankAccountId === "object"
        ? purchase.bankAccountId._id ||
          purchase.bankAccountId.id ||
          String(purchase.bankAccountId)
        : String(purchase.bankAccountId)
      : undefined,
    bankAccountName: purchase.bankAccountName,
    // Always use string id for paymentTransactionId if present (handle both _id and id)
    paymentTransactionId:
      (purchase.paymentTransactionId &&
        (purchase.paymentTransactionId._id ||
          purchase.paymentTransactionId.id ||
          purchase.paymentTransactionId)) ||
      undefined,
    hasTransactionData: !!purchase.paymentTransactionId,
  });

  return (
    <PurchaseForm
      // ✅ Edit mode configuration
      editMode={true}
      existingTransaction={purchase}
      transactionId={purchaseId}
      // ✅ Callbacks
      onSave={handleSave}
      onCancel={handleCancel}
      onExit={handleExit}
      // ✅ Data
      inventoryItems={inventoryItems}
      onAddItem={handleAddItem}
      // ✅ Configuration
      mode={isPurchaseOrdersMode ? "purchase-orders" : "purchases"}
      documentType={isPurchaseOrdersMode ? "purchase-order" : "purchase"}
      formType={isPurchaseOrdersMode ? "purchase-order" : "purchase"}
      orderType={isPurchaseOrdersMode ? "purchase-order" : undefined}
      purchaseOrderService={purchaseOrderService}
      // ✅ Context
      companyId={companyId}
      currentUser={currentUser}
      currentCompany={currentCompany}
      addToast={effectiveAddToast}
      isOnline={isOnline}
      // ✅ Enhanced props
      pageTitle={`Edit ${labels.documentName}`}
      saving={saving}
      show={true}
      onHide={handleCancel}
      // ✅ Enhanced data props for better handling
      initialData={purchase}
      defaultValues={purchase}
      editingData={purchase}
      // ✅ Additional configuration
      isPageMode={true}
      showHeader={true}
      enableAutoSave={false}
      validateOnMount={true}
    />
  );
}

export default EditPurchaseBill;
