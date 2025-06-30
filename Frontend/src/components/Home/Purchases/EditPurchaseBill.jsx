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
  mode = "purchases",
  documentType = "purchase",
  purchaseOrderService,
  companyId: propCompanyId,
}) {
  const {companyId: paramCompanyId, id: purchaseId} = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const companyId = propCompanyId || paramCompanyId;

  const [loading, setLoading] = useState(true);
  const [purchase, setPurchase] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

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

  const existingTransaction =
    location.state?.purchase || location.state?.transaction;
  const returnPath = location.state?.returnPath;

  const defaultAddToast = useCallback((message, type = "info") => {
    if (type === "error") {
      alert(`Error: ${message}`);
    }
  }, []);

  const effectiveAddToast = addToast || defaultAddToast;

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

  useEffect(() => {
    if (purchaseId && companyId) {
      loadPurchaseData();
      loadInventoryItems();
    }
  }, [purchaseId, companyId, isPurchaseOrdersMode]);

  const loadPurchaseData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (existingTransaction) {
        const isAlreadyTransformed = existingTransaction.isEditing === true;

        if (isAlreadyTransformed) {
          setPurchase(existingTransaction);
        } else {
          const transformedData = await transformPurchaseForEditing(
            existingTransaction
          );
          setPurchase(transformedData);
        }

        setLoading(false);
        return;
      }

      const purchaseData = await fetchPurchaseData();
      if (!purchaseData) {
        throw new Error("Purchase transaction not found");
      }

      const enhancedPurchaseData = await enhancePurchaseWithTransactionData(
        purchaseData
      );

      const transformedData = await transformPurchaseForEditing(
        enhancedPurchaseData
      );

      setPurchase(transformedData);
    } catch (err) {
      setError(err.message || "Failed to load purchase data");
      effectiveAddToast(
        `Error loading ${labels.documentName.toLowerCase()}: ${err.message}`,
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseData = async () => {
    try {
      let purchaseResponse;

      if (isPurchaseOrdersMode && purchaseOrderService) {
        purchaseResponse = await purchaseOrderService.getPurchaseOrder(
          purchaseId
        );
      } else {
        try {
          purchaseResponse =
            await purchaseService.getPurchaseWithTransactionData(purchaseId);
        } catch (enhancedError) {
          try {
            purchaseResponse = await purchaseService.getPurchaseForEdit(
              purchaseId
            );
          } catch (editError) {
            purchaseResponse = await purchaseService.getPurchaseById(
              purchaseId
            );
          }
        }
      }

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
      throw error;
    }
  };

  const enhancePurchaseWithTransactionData = async (purchaseData) => {
    try {
      const searchStrategies = [
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

      for (const strategy of searchStrategies) {
        try {
          const queryParams = new URLSearchParams();
          Object.entries(strategy.params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              queryParams.append(key, String(value));
            }
          });

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

              const targetAmount =
                purchaseData.amount || purchaseData.finalTotal || 0;
              const purchaseNumber = purchaseData.purchaseNumber || "";

              let match = transactions.find(
                (t) =>
                  Math.abs((t.amount || 0) - targetAmount) < 1 &&
                  t.bankAccountId &&
                  (t.paymentMethod === "bank_transfer" ||
                    t.paymentMethod === "bank")
              );

              if (!match) {
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
                break;
              }
            }
          }
        } catch (strategyError) {
          continue;
        }
      }

      if (!bestTransaction) {
        try {
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
              bestTransaction = potentialMatches[0];
            }
          }
        } catch (fallbackError) {
          // Silent fail
        }
      }

      if (bestTransaction) {
        return mergeTransactionWithPurchase(purchaseData, bestTransaction);
      } else {
        return await handleBankPaymentWithoutTransaction(purchaseData);
      }
    } catch (transactionError) {
      return purchaseData;
    }
  };

  const mergeTransactionWithPurchase = (purchaseData, transactionData) => {
    return {
      ...purchaseData,

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

      paymentMethod: transactionService.normalizePaymentMethodForFrontend(
        transactionData.paymentMethod ||
          transactionData.method ||
          purchaseData.paymentMethod ||
          purchaseData.payment?.method ||
          "cash"
      ),

      paymentReceived:
        transactionData.amount || purchaseData.paymentReceived || 0,
      paidAmount: transactionData.amount || purchaseData.paidAmount || 0,

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

      paymentTransactionId: transactionData._id || transactionData.id,
      transactionDate:
        transactionData.transactionDate || transactionData.createdAt,
      transactionStatus: transactionData.status,
      transactionType: transactionData.transactionType,
      transactionDescription: transactionData.description,

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

  const handleBankPaymentWithoutTransaction = async (purchaseData) => {
    const frontendPaymentMethod =
      transactionService.normalizePaymentMethodForFrontend(
        purchaseData.paymentMethod || purchaseData.payment?.method || "cash"
      );

    if (frontendPaymentMethod === "bank" && !purchaseData.bankAccountId) {
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
        // Silent fail
      }
    }

    return purchaseData;
  };

  const transformPurchaseForEditing = async (purchaseData) => {
    if (purchaseData.isEditing === true) {
      return purchaseData;
    }

    const transformedData = {
      ...purchaseData,

      id: purchaseData._id || purchaseData.id,
      _id: purchaseData._id || purchaseData.id,

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

      paymentReceived:
        purchaseData.paymentReceived || purchaseData.paidAmount || 0,
      paidAmount: purchaseData.paidAmount || purchaseData.paymentReceived || 0,

      paymentMethod: transactionService.normalizePaymentMethodForFrontend(
        purchaseData.paymentMethod || purchaseData.payment?.method || "cash"
      ),

      bankAccountId: purchaseData.bankAccountId,
      bankAccountName: purchaseData.bankAccountName,
      bankName: purchaseData.bankName,
      accountNumber: purchaseData.accountNumber,

      dueDate: purchaseData.dueDate || purchaseData.payment?.dueDate || null,
      creditDays:
        purchaseData.creditDays || purchaseData.payment?.creditDays || 0,

      chequeNumber: purchaseData.chequeNumber,
      chequeDate: purchaseData.chequeDate,
      upiTransactionId: purchaseData.upiTransactionId,
      bankTransactionId: purchaseData.bankTransactionId,

      paymentTransactionId: purchaseData.paymentTransactionId,
      transactionDate: purchaseData.transactionDate,
      transactionStatus: purchaseData.transactionStatus,

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

      notes: purchaseData.notes || purchaseData.description || "",
      termsAndConditions:
        purchaseData.termsAndConditions || purchaseData.terms || "",
      status: purchaseData.status || purchaseData.purchaseStatus || "completed",

      gstEnabled: Boolean(purchaseData.gstEnabled),
      purchaseType:
        purchaseData.purchaseType ||
        (purchaseData.gstEnabled ? "gst" : "non-gst"),
      globalTaxMode:
        purchaseData.globalTaxMode || purchaseData.taxMode || "without-tax",
      priceIncludesTax: Boolean(purchaseData.priceIncludesTax),

      roundOff: purchaseData.roundOff || 0,
      roundOffEnabled: Boolean(purchaseData.roundOffEnabled),

      employeeName:
        purchaseData.employeeName || purchaseData.createdByName || "",
      employeeId: purchaseData.employeeId || purchaseData.createdBy || "",

      isEditing: true,
      originalId: purchaseData._id || purchaseData.id,
      createdAt: purchaseData.createdAt,
      updatedAt: purchaseData.updatedAt,
    };

    return transformedData;
  };

  const loadInventoryItems = async () => {
    try {
      if (itemService?.getItems) {
        const response = await itemService.getItems(companyId);
        if (response.success && response.data) {
          setInventoryItems(response.data.items || response.data);
        }
      }
    } catch (err) {
      setInventoryItems([]);
    }
  };

  const handleSave = async (updatedData) => {
    try {
      setSaving(true);

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

        paymentMethod: backendMethod,
        paymentType: backendMethod,
        method: backendMethod,

        bankAccountId: updatedData.bankAccountId || null,
        bankAccountName: updatedData.bankAccountName || "",
        bankName: updatedData.bankName || "",
        accountNumber: updatedData.accountNumber || "",

        createdAt: purchase.createdAt,
        createdBy: purchase.createdBy,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.name || currentUser?.email || "System",
      };

      let response;
      if (isPurchaseOrdersMode && purchaseOrderService) {
        response = await purchaseOrderService.updatePurchaseOrder(
          purchaseId,
          saveData
        );
      } else {
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
          response = await purchaseService.updatePurchase(purchaseId, saveData);
        }
      }

      if (response?.success || response?.data || response?._id) {
        const docType = isPurchaseOrdersMode
          ? "Purchase Order"
          : "Purchase Bill";
        const responseData = response.data || response;

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
      effectiveAddToast(
        `Error updating ${labels.documentName.toLowerCase()}: ${error.message}`,
        "error"
      );
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = useCallback(() => {
    const listPath = returnPath || `/companies/${companyId}/${labels.listPath}`;
    navigate(listPath);
  }, [returnPath, companyId, labels.listPath, navigate]);

  const handleExit = useCallback(() => {
    handleCancel();
  }, [handleCancel]);

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
      effectiveAddToast("Failed to add item", "error");
      throw error;
    }
  };

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

  return (
    <PurchaseForm
      editMode={true}
      existingTransaction={purchase}
      transactionId={purchaseId}
      onSave={handleSave}
      onCancel={handleCancel}
      onExit={handleExit}
      inventoryItems={inventoryItems}
      onAddItem={handleAddItem}
      mode={isPurchaseOrdersMode ? "purchase-orders" : "purchases"}
      documentType={isPurchaseOrdersMode ? "purchase-order" : "purchase"}
      formType={isPurchaseOrdersMode ? "purchase-order" : "purchase"}
      orderType={isPurchaseOrdersMode ? "purchase-order" : undefined}
      purchaseOrderService={purchaseOrderService}
      companyId={companyId}
      currentUser={currentUser}
      currentCompany={currentCompany}
      addToast={effectiveAddToast}
      isOnline={isOnline}
      pageTitle={`Edit ${labels.documentName}`}
      saving={saving}
      show={true}
      onHide={handleCancel}
      initialData={purchase}
      defaultValues={purchase}
      editingData={purchase}
      isPageMode={true}
      showHeader={true}
      enableAutoSave={false}
      validateOnMount={true}
    />
  );
}

export default EditPurchaseBill;
