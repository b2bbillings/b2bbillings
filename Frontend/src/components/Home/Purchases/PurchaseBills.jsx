import React, {useState, useEffect, useCallback, useMemo} from "react";
import {Container, Row, Col, Alert, Button} from "react-bootstrap";
import {useParams} from "react-router-dom";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faArrowLeft} from "@fortawesome/free-solid-svg-icons";

// Import components
import PurchaseBillsHeader from "./PurchaseBill/PurchaseBillsHeader";
import PurchaseBillsFilter from "./PurchaseBill/PurchaseBillsFilter";
import PurchaseBillsSummary from "./PurchaseBill/PurchaseBillsSummary";
import PurchaseBillsTable from "./PurchaseBill/PurchaseBillsTable";
import PurchaseForm from "./PurchaseForm";

// Import services
import purchaseService from "../../../services/purchaseService";
import itemService from "../../../services/itemService";

// Import styles
import "./PurchaseBills.css";

// Debounce hook for optimizing search
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

function PurchaseBills({
  currentCompany,
  addToast,
  isOnline = true,
  companyId: propCompanyId,
}) {
  const {companyId: urlCompanyId} = useParams();

  // Resolve effective company ID from multiple sources
  const effectiveCompanyId = useMemo(() => {
    return (
      propCompanyId ||
      urlCompanyId ||
      currentCompany?.id ||
      currentCompany?._id ||
      localStorage.getItem("selectedCompanyId") ||
      sessionStorage.getItem("companyId") ||
      localStorage.getItem("companyId")
    );
  }, [propCompanyId, urlCompanyId, currentCompany]);

  // State management
  const [currentView, setCurrentView] = useState("list");
  const [editingPurchase, setEditingPurchase] = useState(null);
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

  // Debounced search term for better performance
  const debouncedSearchTerm = useDebounce(topSearchTerm, 300);

  // Data states
  const [purchases, setPurchases] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);

  // Categories for items
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

  // Enhanced summary calculation
  const summary = useMemo(() => {
    const totalAmount = purchases.reduce(
      (sum, p) =>
        sum + (parseFloat(p.amount) || parseFloat(p.totalAmount) || 0),
      0
    );
    const totalBalance = purchases.reduce(
      (sum, p) =>
        sum + (parseFloat(p.balance) || parseFloat(p.remainingAmount) || 0),
      0
    );
    const paidAmount = totalAmount - totalBalance;

    // Calculate today's purchases
    const today = new Date().toDateString();
    const todaysPurchases = purchases
      .filter((p) => {
        try {
          const purchaseDate = new Date(
            p.date || p.purchaseDate || p.createdAt
          ).toDateString();
          return purchaseDate === today;
        } catch {
          return false;
        }
      })
      .reduce(
        (sum, p) =>
          sum + (parseFloat(p.amount) || parseFloat(p.totalAmount) || 0),
        0
      );

    const avgPurchaseValue =
      purchases.length > 0 ? totalAmount / purchases.length : 0;
    const growthPercentage = Math.random() * 20 - 10; // Mock growth percentage

    return {
      totalPurchaseAmount: totalAmount,
      paidAmount: paidAmount,
      payableAmount: totalBalance,
      todaysPurchases: todaysPurchases,
      totalBills: purchases.length,
      avgPurchaseValue: avgPurchaseValue,
      growthPercentage: growthPercentage,
      paidBills: purchases.filter((p) => (parseFloat(p.balance) || 0) === 0)
        .length,
      pendingBills: purchases.filter((p) => (parseFloat(p.balance) || 0) > 0)
        .length,
      totalSuppliers: new Set(
        purchases
          .map((p) => p.supplierName || p.supplier?.name || p.partyName)
          .filter((name) => name)
      ).size,
    };
  }, [purchases]);

  // Options
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

  // Filtered purchases
  const filteredPurchases = useMemo(() => {
    if (!debouncedSearchTerm) return purchases;

    const searchLower = debouncedSearchTerm.toLowerCase();
    return purchases.filter(
      (purchase) =>
        (purchase.supplierName || purchase.partyName || "")
          .toLowerCase()
          .includes(searchLower) ||
        (purchase.purchaseNumber || purchase.billNo || "")
          .toLowerCase()
          .includes(searchLower) ||
        (purchase.supplierPhone || purchase.partyPhone || "").includes(
          searchLower
        )
    );
  }, [purchases, debouncedSearchTerm]);

  // Load purchases data
  const loadPurchasesData = useCallback(async () => {
    if (!effectiveCompanyId) {
      setPurchases([]);
      addToast?.(
        "No company selected. Please select a company first.",
        "warning"
      );
      return;
    }

    try {
      setLoading(true);

      const filters = {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      };

      const response = await purchaseService.getPurchases(
        effectiveCompanyId,
        filters
      );

      if (response?.success) {
        const rawData = response.data;
        let transformedPurchases = [];

        if (Array.isArray(rawData)) {
          transformedPurchases = rawData;
        } else if (rawData?.purchases && Array.isArray(rawData.purchases)) {
          transformedPurchases = rawData.purchases;
        } else if (rawData && typeof rawData === "object") {
          transformedPurchases = [rawData];
        }

        // Transform data if method exists
        if (
          purchaseService.transformPurchaseData &&
          transformedPurchases.length > 0
        ) {
          transformedPurchases = transformedPurchases.map((purchase) => {
            try {
              return purchaseService.transformPurchaseData(purchase);
            } catch (transformError) {
              return purchase;
            }
          });
        }

        setPurchases(transformedPurchases);
      } else {
        setPurchases([]);
        if (
          response?.message &&
          !response.message.includes("No purchases found")
        ) {
          addToast?.(
            "Failed to load purchases: " + response.message,
            "warning"
          );
        }
      }
    } catch (error) {
      setPurchases([]);

      let errorMessage = "Failed to load purchases data";
      if (error.message) {
        if (error.message.includes("Company ID is required")) {
          errorMessage =
            "Company not properly selected. Please refresh the page and select a company.";
        } else if (
          error.message.includes("401") ||
          error.message.includes("Authentication")
        ) {
          errorMessage = "Authentication failed. Please login again.";
        } else if (
          error.message.includes("403") ||
          error.message.includes("Access denied")
        ) {
          errorMessage =
            "Access denied. You may not have permission to view purchases.";
        } else if (error.message.includes("404")) {
          errorMessage = "Purchase service not found. Please contact support.";
        } else if (
          error.message.includes("Network") ||
          error.message.includes("fetch")
        ) {
          errorMessage =
            "Network error. Please check your internet connection.";
        } else {
          errorMessage = error.message;
        }
      }

      if (
        !error.message?.includes("fetch") &&
        !error.message?.includes("Network")
      ) {
        addToast?.(errorMessage, "error");
      }
    } finally {
      setLoading(false);
    }
  }, [effectiveCompanyId, startDate, endDate, addToast]);

  // Load inventory items
  const loadInventoryItems = useCallback(async () => {
    if (!effectiveCompanyId) {
      setInventoryItems([]);
      return;
    }

    try {
      const response = await itemService.getItems(effectiveCompanyId);

      if (response?.success && response.data) {
        const items = response.data.items || response.data || [];
        setInventoryItems(Array.isArray(items) ? items : []);
      } else {
        setInventoryItems([]);
      }
    } catch (error) {
      setInventoryItems([]);
    }
  }, [effectiveCompanyId]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    if (effectiveCompanyId) {
      const timer = setTimeout(() => {
        loadPurchasesData();
        loadInventoryItems();
      }, 100);

      return () => clearTimeout(timer);
    } else {
      setPurchases([]);
    }
  }, [
    effectiveCompanyId,
    startDate,
    endDate,
    loadPurchasesData,
    loadInventoryItems,
  ]);

  // Event handlers
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

  const handleCreatePurchase = useCallback(() => {
    setEditingPurchase(null);
    setCurrentView("purchase");
  }, []);

  const handleBackToList = useCallback(() => {
    setCurrentView("list");
    setEditingPurchase(null);
  }, []);

  // ✅ FIXED: Enhanced save handler to handle all response formats
  const handlePurchaseFormSave = useCallback(
    async (purchaseData) => {
      try {
        console.log("📋 PurchaseBills - Received save result:", purchaseData);

        // ✅ Handle different response formats from backend
        let savedPurchase = null;
        let hasSuccess = false;
        let hasTransaction = false;

        // Format 1: Standard success response
        if (purchaseData?.success && purchaseData?.data) {
          savedPurchase = purchaseData.data;
          hasSuccess = true;
        }
        // Format 2: Backend response with purchase/bill object (current case)
        else if (purchaseData?.purchase || purchaseData?.bill) {
          savedPurchase = purchaseData.purchase || purchaseData.bill;
          hasSuccess = true;

          // Check if transaction was created
          if (purchaseData.transaction || purchaseData.transactionId) {
            hasTransaction = true;
            savedPurchase.transaction = purchaseData.transaction;
            savedPurchase.transactionId = purchaseData.transactionId;
          }

          // Show warning if there was a transaction error
          if (purchaseData.transactionWarning) {
            addToast?.(purchaseData.transactionWarning, "warning");
          }
        }
        // Format 3: Direct purchase object
        else if (purchaseData?._id || purchaseData?.id) {
          savedPurchase = purchaseData;
          hasSuccess = true;
        }
        // Format 4: Check if it has typical purchase fields
        else if (purchaseData?.purchaseNumber || purchaseData?.billNo) {
          savedPurchase = purchaseData;
          hasSuccess = true;
        }

        if (hasSuccess && savedPurchase) {
          console.log("✅ Purchase save successful, updating UI...", {
            purchaseNumber:
              savedPurchase.purchaseNumber || savedPurchase.billNo,
            hasTransaction: hasTransaction,
            editMode: !!editingPurchase,
          });

          // Transform the purchase data for consistent UI display
          const transformedPurchase = purchaseService.transformPurchaseData
            ? purchaseService.transformPurchaseData(savedPurchase)
            : {
                ...savedPurchase,
                // Ensure required fields are present
                id: savedPurchase._id || savedPurchase.id,
                purchaseNumber:
                  savedPurchase.purchaseNumber || savedPurchase.billNo,
                amount:
                  savedPurchase.totals?.finalTotal ||
                  savedPurchase.total ||
                  savedPurchase.amount,
                supplierName:
                  savedPurchase.supplier?.name || savedPurchase.supplierName,
                date: savedPurchase.purchaseDate || savedPurchase.date,
                status: savedPurchase.status || "completed",
              };

          if (editingPurchase) {
            // Update existing purchase in list
            setPurchases((prev) =>
              prev.map((p) =>
                p.id === editingPurchase.id || p._id === editingPurchase._id
                  ? transformedPurchase
                  : p
              )
            );
            addToast?.(
              `Purchase ${
                transformedPurchase.purchaseNumber || transformedPurchase.billNo
              } updated successfully!${
                hasTransaction ? " (with transaction)" : ""
              }`,
              "success"
            );
          } else {
            // Add new purchase to list
            setPurchases((prev) => [transformedPurchase, ...prev]);
            addToast?.(
              `Purchase ${
                transformedPurchase.purchaseNumber || transformedPurchase.billNo
              } created successfully!${
                hasTransaction ? " (with transaction)" : ""
              }`,
              "success"
            );
          }

          // Navigate back to list
          setCurrentView("list");
          setEditingPurchase(null);

          // Return success format for any parent handlers
          return {
            success: true,
            data: savedPurchase,
            transaction: purchaseData.transaction,
            transactionId: purchaseData.transactionId,
          };
        } else {
          // ✅ Even if format is unexpected, don't treat as error if purchase seems successful
          console.warn(
            "Purchase save returned unexpected format:",
            purchaseData
          );

          // Check if this might still be a successful save with non-standard format
          if (purchaseData && typeof purchaseData === "object") {
            // Show any transaction warnings that might be present
            if (purchaseData.transactionWarning) {
              addToast?.(purchaseData.transactionWarning, "warning");
            }

            // Don't show error if the purchase might have been created
            if (
              purchaseData.purchaseNumber ||
              purchaseData.billNo ||
              purchaseData.purchase?.purchaseNumber ||
              purchaseData.bill?.purchaseNumber
            ) {
              console.log(
                "🟡 Purchase appears to have been created despite unexpected format"
              );

              // Reload the purchases list to get the latest data
              setTimeout(() => {
                loadPurchasesData();
              }, 1000);

              // Navigate back to list
              setCurrentView("list");
              setEditingPurchase(null);
            }
          }

          return purchaseData;
        }
      } catch (error) {
        console.error("PurchaseBills - Save handler error:", error);
        // Error handling is already done in PurchaseInvoiceFormSection
        throw error;
      }
    },
    [editingPurchase, addToast, loadPurchasesData]
  );

  const handleAddItem = useCallback(
    async (productData) => {
      try {
        const response = await itemService.createItem(
          effectiveCompanyId,
          productData
        );

        if (response.success) {
          setInventoryItems((prev) => [...prev, response.data]);
          return {
            success: true,
            data: response.data,
            message: `Item "${productData.name}" added successfully`,
          };
        } else {
          throw new Error(response.message || "Failed to add item");
        }
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: "Error adding item to inventory",
        };
      }
    },
    [effectiveCompanyId]
  );

  const handleSearchChange = useCallback((e) => {
    setTopSearchTerm(e.target.value);
  }, []);

  // Purchase transaction handlers
  const handleViewPurchase = useCallback(
    (purchase) => {
      addToast?.(
        `Viewing Purchase: ${
          purchase.purchaseNumber || purchase.billNo
        }\nSupplier: ${
          purchase.supplierName || purchase.partyName
        }\nAmount: ₹${(purchase.amount || 0).toLocaleString()}`,
        "info"
      );
    },
    [addToast]
  );

  const handleEditPurchase = useCallback((purchase) => {
    setEditingPurchase(purchase.originalPurchase || purchase);
    setCurrentView("purchase");
  }, []);

  const handleDeletePurchase = useCallback(
    async (purchase) => {
      if (
        window.confirm(
          `Are you sure you want to delete purchase ${
            purchase.purchaseNumber || purchase.billNo
          }?\n\nThis action cannot be undone.`
        )
      ) {
        try {
          setLoading(true);
          const response = await purchaseService.deletePurchase(
            effectiveCompanyId,
            purchase.id
          );

          if (response.success) {
            setPurchases((prev) => prev.filter((p) => p.id !== purchase.id));
            addToast?.(
              `Purchase ${
                purchase.purchaseNumber || purchase.billNo
              } deleted successfully`,
              "success"
            );
          } else {
            throw new Error(response.message || "Failed to delete purchase");
          }
        } catch (error) {
          addToast?.("Error deleting purchase: " + error.message, "error");
        } finally {
          setLoading(false);
        }
      }
    },
    [effectiveCompanyId, addToast]
  );

  const handlePrintPurchase = useCallback(
    (purchase) => {
      addToast?.(
        `Printing purchase ${purchase.purchaseNumber || purchase.billNo}...`,
        "info"
      );
    },
    [addToast]
  );

  const handleSharePurchase = useCallback(
    (purchase) => {
      const shareText = `Purchase ${
        purchase.purchaseNumber || purchase.billNo
      }\nSupplier: ${purchase.supplierName || purchase.partyName}\nAmount: ₹${(
        purchase.amount || 0
      ).toLocaleString()}\nStatus: ${purchase.status}`;

      if (navigator.share) {
        navigator
          .share({
            title: `Purchase ${purchase.purchaseNumber || purchase.billNo}`,
            text: shareText,
            url: window.location.href,
          })
          .catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard
          .writeText(shareText)
          .then(() => {
            addToast?.("Purchase details copied to clipboard!", "success");
          })
          .catch(() => {
            alert(`Purchase Details:\n${shareText}`);
          });
      } else {
        alert(`Purchase Details:\n${shareText}`);
      }
    },
    [addToast]
  );

  // Utility handlers
  const handleMoreOptions = useCallback(() => {
    // More options functionality
  }, []);

  const handleSettings = useCallback(() => {
    // Settings functionality
  }, []);

  const handleExcelExport = useCallback(() => {
    addToast?.("Excel export feature coming soon!", "info");
  }, [addToast]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Early returns for better UX
  if (!isOnline) {
    return (
      <div className="purchase-bills-wrapper">
        <Container fluid>
          <Alert variant="warning" className="text-center">
            <h5>📡 No Internet Connection</h5>
            <p>
              Purchase data requires an internet connection. Please check your
              network and try again.
            </p>
          </Alert>
        </Container>
      </div>
    );
  }

  if (!effectiveCompanyId) {
    return (
      <div className="purchase-bills-wrapper">
        <Container fluid>
          <Alert variant="warning" className="text-center">
            <h5>⚠️ No Company Selected</h5>
            <p>Please select a company to view purchase bills.</p>
          </Alert>
        </Container>
      </div>
    );
  }

  // Render Purchase Form View
  if (currentView === "purchase") {
    return (
      <div className="purchase-bills-wrapper">
        <div className="purchase-form-header">
          <Container fluid className="px-4">
            <Row className="align-items-center py-3">
              <Col>
                <Button
                  variant="outline-secondary"
                  onClick={handleBackToList}
                  className="me-3"
                  disabled={loading}
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                  Back to Purchase Bills
                </Button>
                <span className="page-title-text">
                  {editingPurchase
                    ? `Edit Purchase ${
                        editingPurchase.purchaseNumber || editingPurchase.billNo
                      }`
                    : "Create New Purchase"}
                </span>
              </Col>
            </Row>
          </Container>
        </div>

        {/* ✅ SIMPLIFIED: PurchaseForm handles all the business logic */}
        <PurchaseForm
          editMode={!!editingPurchase}
          existingTransaction={editingPurchase}
          transactionId={editingPurchase?.id}
          onSave={handlePurchaseFormSave} // Simple handler for UI updates only
          onCancel={handleBackToList}
          onExit={handleBackToList}
          companyId={effectiveCompanyId}
          currentUser={null} // Pass actual user if available
          currentCompany={currentCompany}
          inventoryItems={inventoryItems}
          categories={categories}
          onAddItem={handleAddItem}
          addToast={addToast}
          isOnline={true}
          mode="purchases"
          documentType="purchase"
          formType="purchase"
        />
      </div>
    );
  }

  // Main Purchase Bills View
  return (
    <div className="purchase-bills-wrapper">
      <PurchaseBillsHeader
        searchTerm={topSearchTerm}
        onSearchChange={handleSearchChange}
        onAddPurchase={handleCreatePurchase}
        onMoreOptions={handleMoreOptions}
        onSettings={handleSettings}
        companyId={effectiveCompanyId}
      />

      <div className="purchase-page-title">
        <Container fluid className="px-4">
          <Row className="align-items-center py-3">
            <Col>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <h4 className="mb-1 text-warning">
                    <i className="fas fa-shopping-cart me-2"></i>
                    Purchase Bills
                  </h4>
                  <p className="text-muted mb-0">
                    Manage your purchase transactions ({purchases.length} bills)
                  </p>
                </div>
                <Button
                  variant="warning"
                  onClick={handleCreatePurchase}
                  className="px-4"
                  disabled={loading}
                >
                  <i className="fas fa-plus me-2"></i>
                  Add Purchase
                </Button>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      <PurchaseBillsFilter
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
        resultCount={filteredPurchases.length}
      />

      <Container fluid className="px-4 py-3">
        <Row className="g-3">
          <Col xl={2} lg={3} md={3} sm={12} className="sidebar-col">
            <PurchaseBillsSummary
              summary={summary}
              loading={loading}
              dateRange={dateRange}
            />
          </Col>

          <Col xl={10} lg={9} md={9} sm={12} className="content-col">
            <PurchaseBillsTable
              purchases={filteredPurchases}
              onCreatePurchase={handleCreatePurchase}
              onViewPurchase={handleViewPurchase}
              onEditPurchase={handleEditPurchase}
              onDeletePurchase={handleDeletePurchase}
              onPrintPurchase={handlePrintPurchase}
              onSharePurchase={handleSharePurchase}
              categories={categories}
              onAddItem={handleAddItem}
              inventoryItems={inventoryItems}
              loading={loading}
              companyId={effectiveCompanyId}
              searchTerm={debouncedSearchTerm}
            />
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default PurchaseBills;
