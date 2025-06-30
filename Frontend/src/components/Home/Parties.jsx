import React, {useState, useEffect} from "react";
import {
  Container,
  Row,
  Col,
  Button,
  Card,
  Alert,
  Spinner,
  Badge,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faPhone,
  faEnvelope,
  faMapMarkerAlt,
  faBuilding,
  faUser,
  faArrowUp,
  faArrowDown,
  faExclamationTriangle,
  faCheckCircle,
} from "@fortawesome/free-solid-svg-icons";
import {useParams, useNavigate} from "react-router-dom";
import "./Parties.css";

// ✅ Import components
import PartyHeader from "./Party/PartyHeader";
import PartySidebar from "./Party/PartySidebar";
import AddNewParty from "./Party/AddNewParty";
import PayIn from "./Party/PayIn";
import PayOut from "./Party/PayOut";
import TransactionTable from "./Party/TransactionTable";

// ✅ Import services
import partyService from "../../services/partyService";
import paymentService from "../../services/paymentService";
import purchaseService from "../../services/purchaseService";
import salesService from "../../services/salesService";

function Parties() {
  const {companyId} = useParams();
  const navigate = useNavigate();

  // ✅ State management
  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingParties, setIsLoadingParties] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ✅ Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [showPayIn, setShowPayIn] = useState(false);
  const [showPayOut, setShowPayOut] = useState(false);
  const [payInData, setPayInData] = useState(null);
  const [payOutData, setPayOutData] = useState(null);

  // ✅ Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [transactionSearchQuery, setTransactionSearchQuery] = useState("");
  const [partyTypeFilter, setPartyTypeFilter] = useState("all");

  // ✅ Enhanced sorting state with mapping
  const [sortConfig, setSortConfig] = useState({
    key: "currentBalance",
    direction: "desc",
  });

  // ✅ Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalParties, setTotalParties] = useState(0);
  const partiesPerPage = 20;

  // ✅ Transaction states
  const [transactions, setTransactions] = useState([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [transactionsPagination, setTransactionsPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
  });
  const [transactionRefreshTrigger, setTransactionRefreshTrigger] = useState(0);

  // ✅ Payment summary state
  const [paymentSummary, setPaymentSummary] = useState({
    totalPaymentsIn: 0,
    totalPaymentsOut: 0,
    netAmount: 0,
    totalTransactions: 0,
  });

  // ✅ Enhanced bank accounts state
  const [bankAccounts, setBankAccounts] = useState([]);
  const [isLoadingBankAccounts, setIsLoadingBankAccounts] = useState(false);

  // ✅ Company state
  const [currentCompany, setCurrentCompany] = useState({
    id: companyId,
    _id: companyId,
    name: "Your Company Name",
  });

  // ✅ Update company when companyId changes
  useEffect(() => {
    if (companyId) {
      setCurrentCompany((prev) => ({
        ...prev,
        id: companyId,
        _id: companyId,
      }));
    }
  }, [companyId]);

  // ✅ Sort key mapping helper function
  const mapSortKey = (frontendKey) => {
    const sortKeyMapping = {
      balance: "currentBalance",
      name: "name",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      partyType: "partyType",
      creditLimit: "creditLimit",
      gstType: "gstType",
    };
    return sortKeyMapping[frontendKey] || frontendKey;
  };

  // ✅ Enhanced bank accounts loading
  const loadBankAccounts = async () => {
    if (!companyId) return;

    try {
      setIsLoadingBankAccounts(true);
      let bankAccountsData = [];

      // Try multiple sources for bank accounts
      try {
        // First try payment service
        const paymentBankResponse = await paymentService.getBankAccounts?.(
          companyId
        );
        if (paymentBankResponse?.success && paymentBankResponse.data) {
          bankAccountsData = paymentBankResponse.data;
        }
      } catch (err) {
        console.warn(
          "Could not load bank accounts from payment service:",
          err.message
        );
      }

      // If no data from payment service, try purchase service
      if (bankAccountsData.length === 0) {
        try {
          const purchaseBankResponse = await purchaseService.getBankAccounts?.(
            companyId
          );
          if (purchaseBankResponse?.success && purchaseBankResponse.data) {
            bankAccountsData = purchaseBankResponse.data;
          }
        } catch (err) {
          console.warn(
            "Could not load bank accounts from purchase service:",
            err.message
          );
        }
      }

      // If still no data, try alternative methods
      if (bankAccountsData.length === 0) {
        try {
          // Try getting bank accounts from party service if available
          const partyBankResponse = await partyService.getBankAccounts?.(
            companyId
          );
          if (partyBankResponse?.success && partyBankResponse.data) {
            bankAccountsData = partyBankResponse.data;
          }
        } catch (err) {
          console.warn(
            "Could not load bank accounts from party service:",
            err.message
          );
        }
      }

      // Normalize bank account data
      const normalizedBankAccounts = bankAccountsData.map((account) => ({
        id: account._id || account.id,
        _id: account._id || account.id,
        bankName: account.bankName || account.name || "Unknown Bank",
        accountName:
          account.accountName || account.holderName || "Unknown Account",
        accountNumber: account.accountNumber || "",
        currentBalance: parseFloat(
          account.currentBalance || account.balance || 0
        ),
        balance: parseFloat(account.currentBalance || account.balance || 0),
        ifscCode: account.ifscCode || account.ifsc || "",
        branchName: account.branchName || account.branch || "",
        accountType: account.accountType || "current",
        isActive: account.isActive !== false,
      }));

      setBankAccounts(normalizedBankAccounts);
    } catch (error) {
      console.error("Error loading bank accounts:", error);
      setBankAccounts([]);
    } finally {
      setIsLoadingBankAccounts(false);
    }
  };

  // ✅ Currency formatter
  const formatCurrency = (amount) => {
    const numericAmount = parseFloat(amount) || 0;
    return numericAmount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // ✅ Normalize party data
  const normalizeParty = (party) => {
    return {
      id: party._id || party.id,
      _id: party._id || party.id,
      name: party.name || "",
      phone: party.phoneNumber || party.phone || "",
      phoneNumber: party.phoneNumber || party.phone || "",
      email: party.email || "",
      address:
        party.homeAddress?.addressLine ||
        party.homeAddressLine ||
        party.address ||
        "",
      partyType: party.partyType || "customer",
      balance:
        parseFloat(
          party.currentBalance || party.balance || party.openingBalance
        ) || 0,
      currentBalance:
        parseFloat(
          party.currentBalance || party.balance || party.openingBalance
        ) || 0,
      openingBalance: parseFloat(party.openingBalance) || 0,
      openingBalanceType: party.openingBalanceType || "debit",
      companyName: party.companyName || "",
      gstNumber: party.gstNumber || "",
      country: party.country || "INDIA",
      homeAddressLine:
        party.homeAddress?.addressLine || party.homeAddressLine || "",
      homePincode: party.homeAddress?.pincode || party.homePincode || "",
      homeState: party.homeAddress?.state || party.homeState || "",
      homeDistrict: party.homeAddress?.district || party.homeDistrict || "",
      homeTaluka: party.homeAddress?.taluka || party.homeTaluka || "",
      deliveryAddressLine:
        party.deliveryAddress?.addressLine || party.deliveryAddressLine || "",
      deliveryPincode:
        party.deliveryAddress?.pincode || party.deliveryPincode || "",
      deliveryState: party.deliveryAddress?.state || party.deliveryState || "",
      deliveryDistrict:
        party.deliveryAddress?.district || party.deliveryDistrict || "",
      deliveryTaluka:
        party.deliveryAddress?.taluka || party.deliveryTaluka || "",
      sameAsHomeAddress: party.sameAsHomeAddress || false,
      phoneNumbers: party.phoneNumbers || [],
      isActive: party.isActive !== false,
      createdAt: party.createdAt,
      updatedAt: party.updatedAt,
    };
  };

  // ✅ Get transaction type
  const getTransactionType = (paymentType, paymentMethod) => {
    if (paymentType === "payment_in") {
      return "Receipt Voucher";
    } else if (paymentType === "payment_out") {
      return "Payment Voucher";
    }
    return paymentMethod === "cash" ? "Cash Transaction" : "Bank Transaction";
  };

  // ✅ Toast notification handler
  const addToast = (message, type = "info") => {
    switch (type) {
      case "success":
        setSuccess(message);
        break;
      case "error":
        setError(message);
        break;
      case "warning":
        setError(message);
        break;
      default:
        break;
    }
  };

  // ✅ Enhanced transaction handlers
  const handleTransactionUpdated = async (updatedTransactionData) => {
    try {
      if (selectedParty && companyId) {
        await loadTransactions(selectedParty._id || selectedParty.id);
        await loadPaymentSummary(selectedParty._id || selectedParty.id);
        await loadBankAccounts();
      }

      setSuccess("Transaction updated successfully!");
      setTransactionRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      setError("Failed to refresh after transaction update: " + error.message);
    }
  };

  const handleTransactionDeleted = async (transaction, reason = "") => {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const result = await paymentService.deleteTransaction(
        transaction._id || transaction.id,
        reason || "Deleted by user"
      );

      if (result.success) {
        if (selectedParty) {
          await loadTransactions(selectedParty._id || selectedParty.id);
          await loadPaymentSummary(selectedParty._id || selectedParty.id);
          await loadParties({page: currentPage});
          await loadBankAccounts();
        }

        setSuccess(`Transaction deleted successfully: ${result.message}`);
        setTransactionRefreshTrigger((prev) => prev + 1);
      } else {
        throw new Error(result.message || "Failed to delete transaction");
      }
    } catch (error) {
      setError("Failed to delete transaction: " + error.message);
    }
  };

  // ✅ Load transactions with allocations
  const loadTransactions = async (partyId, options = {}) => {
    if (!partyId || !companyId) {
      setTransactions([]);
      return;
    }

    try {
      setIsLoadingTransactions(true);
      setError("");

      const searchValue = transactionSearchQuery || "";
      const searchString =
        typeof searchValue === "string" ? searchValue : String(searchValue);

      const filters = {
        partyId: partyId,
        page: options.page || 1,
        limit: 20,
        search: searchString.trim(),
        sortBy: options.sortBy || "paymentDate",
        sortOrder: options.sortOrder || "desc",
      };

      const response = await paymentService.getPartyPaymentHistory(
        companyId,
        partyId,
        filters
      );

      if (response.success) {
        const transformedTransactions = (
          response.data ||
          response.payments ||
          []
        ).map((payment) => ({
          id: payment._id || payment.id,
          _id: payment._id || payment.id,
          type: getTransactionType(
            payment.type || payment.paymentType,
            payment.paymentMethod
          ),
          number: payment.paymentNumber || payment.transactionId,
          date: new Date(payment.paymentDate).toLocaleDateString("en-GB"),
          total: payment.amount || payment.paymentAmount,
          amount: payment.amount || payment.paymentAmount,
          balance: payment.partyBalanceAfter || payment.balanceAfter,
          paymentMethod: payment.paymentMethod,
          reference: payment.reference,
          notes: payment.notes,
          status: payment.status,
          createdAt: payment.createdAt,
          paymentDate: payment.paymentDate,
          originalPayment: payment,
          invoiceAllocations: payment.invoiceAllocations || [],
          hasAllocations: (payment.invoiceAllocations || []).length > 0,
          allocatedAmount: (payment.invoiceAllocations || []).reduce(
            (sum, alloc) => sum + (alloc.allocatedAmount || 0),
            0
          ),
          remainingAmount: payment.remainingAmount || 0,
          bankAccountId:
            payment.bankAccountId ||
            payment.bankAccount?._id ||
            payment.bankAccount?.id,
          bankName:
            payment.bankName ||
            payment.bankAccount?.bankName ||
            payment.bankDetails?.bankName,
          bankAccountName:
            payment.bankAccountName ||
            payment.bankAccount?.accountName ||
            payment.bankDetails?.accountName,
          bankAccountNumber:
            payment.bankAccountNumber ||
            payment.bankAccount?.accountNumber ||
            payment.bankDetails?.accountNumber,
          bankBalance:
            payment.bankBalance || payment.bankAccount?.currentBalance || 0,
          bankAccount: payment.bankAccount,
          bankDetails: payment.bankDetails,
          employeeName: payment.employeeName || "",
          employeeId: payment.employeeId || "",
          partyName: payment.partyName || selectedParty?.name || "",
        }));

        const sortedTransactions = transformedTransactions.sort((a, b) => {
          const dateA = new Date(a.paymentDate);
          const dateB = new Date(b.paymentDate);
          return dateB - dateA;
        });

        setTransactions(sortedTransactions);

        if (response.pagination) {
          setTransactionsPagination({
            currentPage: response.pagination.currentPage || 1,
            totalPages: response.pagination.totalPages || 1,
            totalRecords:
              response.pagination.totalRecords || sortedTransactions.length,
          });
        }
      } else {
        throw new Error(response.message || "Failed to load transactions");
      }
    } catch (error) {
      setError("Failed to load transactions: " + error.message);
      setTransactions([]);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  // ✅ Load payment summary
  const loadPaymentSummary = async (partyId) => {
    if (!partyId || !companyId) return;

    try {
      const response = await paymentService.getPartyPaymentSummary(
        companyId,
        partyId
      );
      if (response.success) {
        setPaymentSummary(response.data);
      }
    } catch (error) {
      // Silent fail for summary loading
    }
  };

  // ✅ Enhanced load parties with proper sort key mapping
  const loadParties = async (options = {}) => {
    if (!companyId) {
      setError("Company ID is required. Please select a company.");
      setIsLoadingParties(false);
      return;
    }

    try {
      setIsLoadingParties(true);
      setError("");

      let searchValue = options.search;
      if (searchValue === undefined || searchValue === null) {
        searchValue = searchQuery || "";
      }

      const searchString = String(searchValue).trim();

      // ✅ Map frontend sort key to backend key
      const frontendSortKey = sortConfig.key || "createdAt";
      const backendSortKey = mapSortKey(frontendSortKey);

      const filters = {
        page: parseInt(options.page || currentPage, 10),
        limit: parseInt(partiesPerPage, 10),
        search: searchString,
        partyType:
          options.partyType ||
          (partyTypeFilter === "all" ? null : partyTypeFilter),
        sortBy: String(backendSortKey),
        sortOrder: String(sortConfig.direction || "desc"),
      };

      // Clean up undefined values
      Object.keys(filters).forEach((key) => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const response = await partyService.getParties(companyId, filters);

      if (response.success) {
        const normalizedParties = response.data.parties.map(normalizeParty);
        setParties(normalizedParties);

        if (response.data.pagination) {
          setTotalPages(response.data.pagination.total || 1);
          setTotalParties(
            response.data.pagination.totalItems || normalizedParties.length
          );
          setCurrentPage(response.data.pagination.current || 1);
        }

        if (normalizedParties.length > 0 && !selectedParty) {
          setSelectedParty(normalizedParties[0]);
          loadTransactions(normalizedParties[0]._id || normalizedParties[0].id);
          loadPaymentSummary(
            normalizedParties[0]._id || normalizedParties[0].id
          );
        }
      } else {
        throw new Error(response.message || "Failed to load parties");
      }
    } catch (error) {
      console.error("❌ Error loading parties:", error);
      setError("Failed to load parties: " + error.message);
    } finally {
      setIsLoadingParties(false);
    }
  };

  // ✅ Enhanced sorting handler with proper key mapping
  const handleSort = (frontendKey, backendKey) => {
    let direction = "asc";
    if (sortConfig.key === backendKey && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({key: backendKey, direction});
  };

  // ✅ Party selection handler
  const handlePartySelect = (party) => {
    const normalizedParty = normalizeParty(party);
    setSelectedParty(normalizedParty);

    if (companyId) {
      loadTransactions(normalizedParty._id || normalizedParty.id);
      loadPaymentSummary(normalizedParty._id || normalizedParty.id);
    }
  };

  // ✅ Delete party handler
  const handleDeleteParty = async (party) => {
    if (!window.confirm(`Are you sure you want to delete "${party.name}"?`)) {
      return;
    }

    if (!companyId) {
      setError("Company ID is required. Please select a company.");
      return;
    }

    try {
      setIsLoading(true);

      const response = await partyService.deleteParty(
        companyId,
        party.id || party._id
      );

      if (response.success) {
        setParties((prevParties) =>
          prevParties.filter((p) => p.id !== party.id && p._id !== party._id)
        );
        setTotalParties((prev) => prev - 1);

        if (
          selectedParty &&
          (selectedParty.id === party.id || selectedParty._id === party._id)
        ) {
          setSelectedParty(null);
          setTransactions([]);
          setPaymentSummary({
            totalPaymentsIn: 0,
            totalPaymentsOut: 0,
            netAmount: 0,
            totalTransactions: 0,
          });
        }

        setSuccess("Party deleted successfully!");
      } else {
        throw new Error(response.message || "Failed to delete party");
      }
    } catch (error) {
      setError("Failed to delete party: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Modal handlers
  const handleOpenModal = () => {
    setEditingParty(null);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingParty(null);
  };

  const handleEditParty = (party) => {
    setEditingParty(normalizeParty(party));
    setShowAddModal(true);
  };

  // ✅ Save party handler
  const handleSaveParty = async (
    partyData,
    isQuickAdd = false,
    isEdit = false
  ) => {
    try {
      const normalizedParty = normalizeParty(partyData);

      if (isEdit) {
        setParties((prevParties) =>
          prevParties.map((party) =>
            party.id === normalizedParty.id || party._id === normalizedParty._id
              ? normalizedParty
              : party
          )
        );

        if (
          selectedParty &&
          (selectedParty.id === normalizedParty.id ||
            selectedParty._id === normalizedParty._id)
        ) {
          setSelectedParty(normalizedParty);
        }

        setSuccess("Party updated successfully!");
      } else {
        setParties((prevParties) => [normalizedParty, ...prevParties]);
        setTotalParties((prev) => prev + 1);
        setSelectedParty(normalizedParty);

        if (isQuickAdd) {
          setSuccess("Quick customer added successfully!");
        } else {
          setSuccess("Party added successfully!");
        }
      }

      handleCloseModal();
    } catch (error) {
      setError("Error saving party: " + error.message);
    }
  };

  // ✅ Refresh parties handler
  const handleRefreshParties = () => {
    if (companyId) {
      setCurrentPage(1);
      loadParties({page: 1});
      loadBankAccounts();
    }
  };

  // ✅ Enhanced PayIn/PayOut handlers with duplicate support
  const handlePayIn = (duplicateData = null) => {
    if (selectedParty) {
      if (duplicateData) {
        setPayInData(duplicateData);
      }
      setShowPayIn(true);
    }
  };

  const handlePayOut = (duplicateData = null) => {
    if (selectedParty) {
      if (duplicateData) {
        setPayOutData(duplicateData);
      }
      setShowPayOut(true);
    }
  };

  // ✅ Enhanced payment recorded handler
  const handlePaymentRecorded = (paymentData, updatedParty) => {
    if (updatedParty) {
      const normalizedUpdatedParty = normalizeParty(updatedParty);

      setParties((prevParties) =>
        prevParties.map((party) =>
          party.id === normalizedUpdatedParty.id ||
          party._id === normalizedUpdatedParty._id
            ? normalizedUpdatedParty
            : party
        )
      );

      if (
        selectedParty &&
        (selectedParty.id === normalizedUpdatedParty.id ||
          selectedParty._id === normalizedUpdatedParty._id)
      ) {
        setSelectedParty(normalizedUpdatedParty);
      }
    }

    // Enhanced success message
    const paymentType = paymentData.type === "payment_in" ? "received" : "made";
    let successMessage = `✅ Payment of ₹${paymentData.amount?.toLocaleString()} ${paymentType} successfully!`;
    successMessage += `\n• Payment Number: ${paymentData.paymentNumber}`;

    // Bank transaction details
    if (paymentData.bankTransactionCreated && paymentData.bankTransaction) {
      successMessage += `\n\n🏦 Bank Transaction:`;
      successMessage += `\n• Transaction #: ${paymentData.bankTransaction.transactionNumber}`;
      successMessage += `\n• Bank: ${paymentData.bankTransaction.bankName}`;

      if (paymentData.type === "payment_in") {
        successMessage += `\n• Credit: +₹${paymentData.amount?.toLocaleString()}`;
      } else {
        successMessage += `\n• Debit: -₹${paymentData.amount?.toLocaleString()}`;
      }

      if (paymentData.bankTransaction.balance !== undefined) {
        successMessage += `\n• New Balance: ₹${paymentData.bankTransaction.balance?.toLocaleString()}`;
      }
    } else if (paymentData.paymentMethod === "cash") {
      successMessage += `\n\n💵 Cash Payment - No bank transaction created`;
    }

    // Allocation details
    if (paymentData.invoicesUpdated > 0) {
      successMessage += `\n\n📋 ${paymentData.invoicesUpdated} invoice(s) updated`;

      if (paymentData.allocations && paymentData.allocations.length > 0) {
        successMessage += `:\n${paymentData.allocations
          .map(
            (alloc) =>
              `• ${
                alloc.invoiceNumber
              }: ₹${alloc.allocatedAmount.toLocaleString()}`
          )
          .join("\n")}`;
      }

      if (paymentData.remainingAmount > 0) {
        successMessage += `\n\n💰 Remaining: ₹${paymentData.remainingAmount.toLocaleString()} credited to account`;
      }
    } else if (paymentData.paymentMethod !== "cash") {
      successMessage += `\n\n💰 Advance payment processed via bank`;
    }

    setSuccess(successMessage);
    setShowPayIn(false);
    setShowPayOut(false);
    setTransactionRefreshTrigger((prev) => prev + 1);

    // Refresh bank accounts to show updated balances
    loadBankAccounts();
  };

  // ✅ View payment allocations handler
  const handleViewPaymentAllocations = async (paymentId) => {
    try {
      const response = await paymentService.getPaymentAllocations(paymentId);

      if (response.success) {
        const allocations = response.data.allocations || [];
        if (allocations.length > 0) {
          let message = `💰 Payment Allocation Details:\n\n`;
          message += `Payment Number: ${response.data.payment.paymentNumber}\n`;
          message += `Total Amount: ₹${response.data.payment.amount.toLocaleString()}\n`;
          message += `Allocated: ₹${response.data.totalAllocatedAmount.toLocaleString()}\n`;
          message += `Remaining: ₹${response.data.remainingAmount.toLocaleString()}\n\n`;
          message += `📋 Invoices Updated:\n`;

          allocations.forEach((alloc) => {
            const invoiceNumber =
              alloc.invoiceDetails?.invoiceNumber || "Unknown";
            const allocatedAmount = alloc.allocatedAmount || 0;
            const currentPaid = alloc.invoiceDetails?.currentPaidAmount || 0;
            const currentPending =
              alloc.invoiceDetails?.currentPendingAmount || 0;

            message += `• ${invoiceNumber}: ₹${allocatedAmount.toLocaleString()}\n`;
            message += `  Status: ${
              alloc.invoiceDetails?.paymentStatus || "updated"
            }\n`;
            message += `  Paid: ₹${currentPaid.toLocaleString()}, Pending: ₹${currentPending.toLocaleString()}\n\n`;
          });

          alert(message);
        } else {
          alert("ℹ️ No invoice allocations found for this payment.");
        }
      }
    } catch (error) {
      setError("Failed to load payment allocation details");
    }
  };

  // ✅ Pagination handler
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    if (companyId) {
      loadParties({page: newPage});
    }
  };

  // ✅ ENHANCED: Connected handlers for Sales and Purchase Invoice buttons
  const handleAddSalesInvoice = async () => {
    try {
      if (!companyId) {
        setError("Company ID is required to create sales invoice");
        return;
      }

      // Check if we have a selected party
      if (selectedParty) {
        // Navigate to sales form with pre-selected customer
        const customerData = {
          id: selectedParty._id || selectedParty.id,
          _id: selectedParty._id || selectedParty.id,
          name: selectedParty.name,
          mobile: selectedParty.phone,
          phone: selectedParty.phone,
          email: selectedParty.email,
          address: selectedParty.address,
          gstNumber: selectedParty.gstNumber,
          partyType: selectedParty.partyType,
        };

        // Navigate with customer pre-filled
        navigate(`/company/${companyId}/sales/create`, {
          state: {
            preSelectedCustomer: customerData,
            from: "parties",
            returnTo: `/company/${companyId}/parties`,
          },
        });
      } else {
        // Navigate to sales form without pre-selection
        navigate(`/company/${companyId}/sales/create`, {
          state: {
            from: "parties",
            returnTo: `/company/${companyId}/parties`,
          },
        });
      }

      setSuccess("Redirecting to Sales Invoice form...");
    } catch (error) {
      setError("Failed to navigate to Sales Invoice: " + error.message);
    }
  };

  const handleAddPurchaseInvoice = async () => {
    try {
      if (!companyId) {
        setError("Company ID is required to create purchase invoice");
        return;
      }

      // Check if we have a selected party and it's a vendor/supplier
      if (
        selectedParty &&
        (selectedParty.partyType === "vendor" ||
          selectedParty.partyType === "supplier")
      ) {
        // Navigate to purchase form with pre-selected supplier
        const supplierData = {
          id: selectedParty._id || selectedParty.id,
          _id: selectedParty._id || selectedParty.id,
          name: selectedParty.name,
          mobile: selectedParty.phone,
          phone: selectedParty.phone,
          email: selectedParty.email,
          address: selectedParty.address,
          gstNumber: selectedParty.gstNumber,
          partyType: selectedParty.partyType,
        };

        // Navigate with supplier pre-filled
        navigate(`/company/${companyId}/purchases/create`, {
          state: {
            preSelectedSupplier: supplierData,
            from: "parties",
            returnTo: `/company/${companyId}/parties`,
          },
        });
      } else if (selectedParty && selectedParty.partyType === "customer") {
        // Show warning that customer is selected but purchase needs vendor
        setError(
          "Purchase invoices require vendors/suppliers. Please select a vendor or create a new purchase without pre-selection."
        );

        // Still navigate but without pre-selection
        setTimeout(() => {
          navigate(`/company/${companyId}/purchases/create`, {
            state: {
              from: "parties",
              returnTo: `/company/${companyId}/parties`,
              message: "Please select a vendor/supplier for the purchase",
            },
          });
        }, 2000);
      } else {
        // Navigate to purchase form without pre-selection
        navigate(`/company/${companyId}/purchases/create`, {
          state: {
            from: "parties",
            returnTo: `/company/${companyId}/parties`,
          },
        });
      }

      setSuccess("Redirecting to Purchase Invoice form...");
    } catch (error) {
      setError("Failed to navigate to Purchase Invoice: " + error.message);
    }
  };

  // ✅ Enhanced More Options handler
  const handleMoreOptions = () => {
    // Show a dropdown menu or modal with more options
    const moreOptionsMenu = [
      "Export Parties Data",
      "Import Parties",
      "Party Reports",
      "Backup Data",
      "Party Settings",
    ];

    // For now, just show an alert with options
    alert(
      `More Options:\n\n${moreOptionsMenu
        .map((option, index) => `${index + 1}. ${option}`)
        .join("\n")}\n\nThis feature is coming soon!`
    );
  };

  // ✅ Settings handler
  const handleSettings = () => {
    // Navigate to party settings or show settings modal
    if (companyId) {
      navigate(`/company/${companyId}/settings/parties`);
    } else {
      alert(
        "Party Settings:\n\n• Default Party Types\n• Custom Fields\n• Import/Export Settings\n• Auto-numbering\n\nThis feature is coming soon!"
      );
    }
  };

  // ✅ Export parties handler
  const handleExportParties = async () => {
    try {
      if (!companyId) {
        setError("Company ID is required for export");
        return;
      }

      setIsLoading(true);
      setSuccess("Preparing parties export...");

      // Call export service
      const response = await partyService.exportParties?.(companyId, {
        format: "csv",
        partyType: partyTypeFilter === "all" ? null : partyTypeFilter,
        includeTransactions: true,
        includeBalances: true,
      });

      if (response?.success) {
        setSuccess(
          "Parties exported successfully! Download should start automatically."
        );
      } else {
        // Fallback: Create CSV from current parties data
        const csvData = parties.map((party) => ({
          Name: party.name,
          Phone: party.phone,
          Email: party.email,
          Address: party.address,
          "Party Type": party.partyType,
          "Current Balance": party.currentBalance,
          "Company Name": party.companyName,
          "GST Number": party.gstNumber,
          "Created Date": new Date(party.createdAt).toLocaleDateString("en-IN"),
        }));

        // Convert to CSV string
        const csvString = [
          Object.keys(csvData[0]).join(","),
          ...csvData.map((row) => Object.values(row).join(",")),
        ].join("\n");

        // Download CSV
        const blob = new Blob([csvString], {type: "text/csv"});
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `parties_export_${
          new Date().toISOString().split("T")[0]
        }.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        setSuccess("Parties exported successfully!");
      }
    } catch (error) {
      setError("Failed to export parties: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Enhanced initial load effect with bank accounts
  useEffect(() => {
    if (companyId) {
      loadParties();
      loadBankAccounts();
    }
  }, [companyId]);

  // ✅ Search effect
  useEffect(() => {
    if (companyId) {
      const searchTimeout = setTimeout(() => {
        setCurrentPage(1);
        let searchValue = searchQuery;
        if (searchValue === undefined || searchValue === null) {
          searchValue = "";
        }
        const searchString = String(searchValue).trim();
        loadParties({
          search: searchString,
          page: 1,
        });
      }, 500);
      return () => clearTimeout(searchTimeout);
    }
  }, [searchQuery, companyId]);

  // ✅ Filter/sort effect
  useEffect(() => {
    if (companyId) {
      setCurrentPage(1);
      loadParties({
        page: 1,
        partyType: partyTypeFilter === "all" ? null : partyTypeFilter,
      });
    }
  }, [partyTypeFilter, sortConfig, companyId]);

  // ✅ Transaction search effect
  useEffect(() => {
    if (selectedParty && companyId && transactionSearchQuery !== undefined) {
      const searchTimeout = setTimeout(() => {
        loadTransactions(selectedParty._id || selectedParty.id, {page: 1});
      }, 500);
      return () => clearTimeout(searchTimeout);
    }
  }, [transactionSearchQuery, companyId]);

  // ✅ Transaction refresh effect
  useEffect(() => {
    if (selectedParty && companyId && transactionRefreshTrigger > 0) {
      loadTransactions(selectedParty._id || selectedParty.id);
      loadPaymentSummary(selectedParty._id || selectedParty.id);
      loadBankAccounts();
    }
  }, [transactionRefreshTrigger, companyId]);

  // ✅ Clear alerts effect
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // ✅ Early return if no company ID
  if (!companyId) {
    return (
      <div
        className="d-flex align-items-center justify-content-center min-vh-100"
        style={{
          background: "#f5f5f5",
        }}
      >
        <Card
          className="border-0 text-center shadow-lg"
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            borderRadius: "12px",
          }}
        >
          <Card.Body className="p-5">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
              style={{
                width: "80px",
                height: "80px",
                background: "#6f42c1",
                color: "white",
                boxShadow: "0 4px 20px rgba(111, 66, 193, 0.3)",
              }}
            >
              <FontAwesomeIcon icon={faExclamationTriangle} size="2x" />
            </div>
            <h5 className="mb-2" style={{fontSize: "16px", color: "#6f42c1"}}>
              Company Required
            </h5>
            <p className="text-muted mb-0" style={{fontSize: "14px"}}>
              Please select a company to view parties and transactions
            </p>
          </Card.Body>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-vh-100"
      style={{
        fontSize: "13px",
        background: "#f5f5f5", // ✅ Grey background
        margin: "-1rem",
        marginTop: "-2rem",
        padding: "0",
      }}
    >
      {/* ✅ Party Header */}
      <div style={{marginBottom: "0"}}>
        <PartyHeader
          companyId={companyId}
          activeType={partyTypeFilter}
          onTypeChange={setPartyTypeFilter}
          transactionSearchQuery={transactionSearchQuery}
          onTransactionSearchChange={setTransactionSearchQuery}
          totalParties={totalParties}
          onAddParty={handleOpenModal}
          onAddSale={handleAddSalesInvoice}
          onAddPurchase={handleAddPurchaseInvoice}
          onRefreshParties={handleRefreshParties}
          isLoadingParties={isLoadingParties}
          onMoreOptions={handleMoreOptions}
          onSettings={handleSettings}
          onExportParties={handleExportParties}
        />
      </div>

      {/* ✅ Alerts */}
      {error && (
        <Alert
          variant="danger"
          className="mx-3 mb-0"
          dismissible
          onClose={() => setError("")}
          style={{
            background: "#ffe6e6",
            border: "1px solid rgba(220, 53, 69, 0.2)",
            borderRadius: "8px",
          }}
        >
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          <div style={{whiteSpace: "pre-line"}}>{error}</div>
        </Alert>
      )}
      {success && (
        <Alert
          variant="success"
          className="mx-3 mb-0"
          dismissible
          onClose={() => setSuccess("")}
          style={{
            background: "#e6f7ff",
            border: "1px solid rgba(40, 167, 69, 0.2)",
            borderRadius: "8px",
          }}
        >
          <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
          <div style={{whiteSpace: "pre-line"}}>{success}</div>
        </Alert>
      )}

      {/* ✅ Bank Accounts Loading Alert */}
      {isLoadingBankAccounts && (
        <Alert
          variant="info"
          className="mx-3 mb-0"
          style={{
            background: "#e6f0ff",
            border: "1px solid rgba(0, 123, 255, 0.2)",
            borderRadius: "8px",
          }}
        >
          <Spinner
            animation="border"
            size="sm"
            className="me-2"
            style={{color: "#007bff"}}
          />
          Loading bank accounts...
        </Alert>
      )}

      {/* ✅ Main Content - No gaps, no padding */}
      <div className="w-100" style={{padding: "0", margin: "0"}}>
        <Row className="g-0 m-0" style={{height: "calc(100vh - 140px)"}}>
          {/* ✅ Parties List Sidebar - No gaps */}
          <Col xl={3} lg={4} md={5} className="h-100 p-0">
            <PartySidebar
              parties={parties}
              selectedParty={selectedParty}
              isLoadingParties={isLoadingParties}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortConfig={sortConfig}
              onSort={handleSort}
              onPartySelect={handlePartySelect}
              onEditParty={handleEditParty}
              onDeleteParty={handleDeleteParty}
              onAddParty={handleOpenModal}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              formatCurrency={formatCurrency}
              totalParties={totalParties}
            />
          </Col>

          {/* ✅ Party Details with Transactions - No gaps */}
          <Col xl={9} lg={8} md={7} className="h-100 p-0">
            {selectedParty ? (
              <div className="h-100 bg-white">
                {/* ✅ Party Header with Payment Summary - Increased height */}
                <div
                  className="border-bottom p-4"
                  style={{
                    background: "#ffffff",
                    borderColor: "#dee2e6",
                    minHeight: "120px", // Increased from implicit height
                  }}
                >
                  <Row className="align-items-center h-100">
                    <Col>
                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                        <div className="flex-grow-1">
                          <h5
                            className="mb-2 fw-bold d-flex align-items-center"
                            style={{fontSize: "16px", color: "#495057"}}
                          >
                            {selectedParty.name}
                            <Badge
                              style={{
                                fontSize: "11px",
                                background:
                                  selectedParty.partyType === "customer"
                                    ? "#28a745"
                                    : selectedParty.partyType === "vendor"
                                    ? "#fd7e14"
                                    : "#6f42c1",
                                border: "none",
                              }}
                              className="ms-2"
                            >
                              {selectedParty.partyType}
                            </Badge>
                            <Button
                              variant="link"
                              size="sm"
                              className="p-1 ms-2"
                              onClick={() => handleEditParty(selectedParty)}
                              title="Edit Party"
                              style={{color: "#6f42c1"}}
                            >
                              <FontAwesomeIcon icon={faEdit} size="sm" />
                            </Button>
                          </h5>

                          {/* ✅ Payment Summary */}
                          {paymentSummary.totalTransactions > 0 && (
                            <div className="mb-3">
                              <Row className="g-2">
                                <Col xs="auto">
                                  <Badge
                                    className="px-2 py-1"
                                    style={{
                                      fontSize: "10px",
                                      background: "#28a745",
                                      border: "none",
                                    }}
                                  >
                                    <FontAwesomeIcon
                                      icon={faArrowDown}
                                      className="me-1"
                                    />
                                    In: ₹
                                    {formatCurrency(
                                      paymentSummary.totalPaymentsIn
                                    )}
                                  </Badge>
                                </Col>
                                <Col xs="auto">
                                  <Badge
                                    className="px-2 py-1"
                                    style={{
                                      fontSize: "10px",
                                      background: "#dc3545",
                                      border: "none",
                                    }}
                                  >
                                    <FontAwesomeIcon
                                      icon={faArrowUp}
                                      className="me-1"
                                    />
                                    Out: ₹
                                    {formatCurrency(
                                      paymentSummary.totalPaymentsOut
                                    )}
                                  </Badge>
                                </Col>
                                <Col xs="auto">
                                  <Badge
                                    className="px-2 py-1"
                                    style={{
                                      fontSize: "10px",
                                      background:
                                        paymentSummary.netAmount >= 0
                                          ? "#6f42c1"
                                          : "#ffc107",
                                      border: "none",
                                    }}
                                  >
                                    Net: ₹
                                    {formatCurrency(
                                      Math.abs(paymentSummary.netAmount)
                                    )}
                                    {paymentSummary.netAmount < 0
                                      ? " (Owe)"
                                      : " (Credit)"}
                                  </Badge>
                                </Col>
                              </Row>
                            </div>
                          )}

                          {/* ✅ Contact Information */}
                          <div
                            className="text-muted mb-2"
                            style={{fontSize: "12px"}}
                          >
                            <FontAwesomeIcon
                              icon={faPhone}
                              className="me-1"
                              style={{color: "#6f42c1"}}
                            />
                            {selectedParty.phone}
                            {selectedParty.email && (
                              <>
                                <span className="mx-2">|</span>
                                <FontAwesomeIcon
                                  icon={faEnvelope}
                                  className="me-1"
                                  style={{color: "#6f42c1"}}
                                />
                                {selectedParty.email}
                              </>
                            )}
                            {selectedParty.address && (
                              <>
                                <span className="mx-2">|</span>
                                <FontAwesomeIcon
                                  icon={faMapMarkerAlt}
                                  className="me-1"
                                  style={{color: "#6f42c1"}}
                                />
                                {selectedParty.address}
                              </>
                            )}
                          </div>
                          {selectedParty.companyName && (
                            <div
                              className="text-muted"
                              style={{fontSize: "12px"}}
                            >
                              <FontAwesomeIcon
                                icon={faBuilding}
                                className="me-1"
                                style={{color: "#6f42c1"}}
                              />
                              {selectedParty.companyName}
                              {selectedParty.gstNumber && (
                                <span className="ms-2">
                                  GST: {selectedParty.gstNumber}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* ✅ Action Buttons */}
                        <div className="d-flex gap-2 flex-shrink-0 align-self-start">
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => handlePayIn()}
                            className="px-3"
                            style={{
                              fontSize: "12px",
                              color: "#28a745",
                              borderColor: "#28a745",
                            }}
                          >
                            <FontAwesomeIcon
                              icon={faArrowDown}
                              className="me-1"
                            />
                            Pay In
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handlePayOut()}
                            className="px-3"
                            style={{
                              fontSize: "12px",
                              color: "#dc3545",
                              borderColor: "#dc3545",
                            }}
                          >
                            <FontAwesomeIcon
                              icon={faArrowUp}
                              className="me-1"
                            />
                            Pay Out
                          </Button>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </div>

                {/* ✅ Transaction Table */}
                <div className="p-3 h-100 overflow-hidden">
                  <TransactionTable
                    selectedParty={selectedParty}
                    transactions={transactions}
                    isLoadingTransactions={isLoadingTransactions}
                    transactionsPagination={transactionsPagination}
                    transactionSearchQuery={transactionSearchQuery}
                    setTransactionSearchQuery={setTransactionSearchQuery}
                    onLoadTransactions={loadTransactions}
                    onPayIn={handlePayIn}
                    onPayOut={handlePayOut}
                    formatCurrency={formatCurrency}
                    refreshTrigger={transactionRefreshTrigger}
                    companyId={companyId}
                    onViewAllocations={handleViewPaymentAllocations}
                    showAllocationDetails={true}
                    paymentSummary={paymentSummary}
                    onTransactionUpdated={handleTransactionUpdated}
                    onTransactionDeleted={handleTransactionDeleted}
                    addToast={addToast}
                    bankAccounts={bankAccounts}
                    currentUser={currentCompany}
                    isLoadingBankAccounts={isLoadingBankAccounts}
                  />
                </div>
              </div>
            ) : (
              <div
                className="h-100 d-flex align-items-center justify-content-center"
                style={{
                  background: "#ffffff",
                }}
              >
                <Card
                  className="border-0 text-center shadow-lg"
                  style={{
                    background: "rgba(255, 255, 255, 0.95)",
                    borderRadius: "12px",
                  }}
                >
                  <Card.Body className="p-5">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                      style={{
                        width: "80px",
                        height: "80px",
                        background: "#6f42c1",
                        color: "white",
                        boxShadow: "0 4px 20px rgba(111, 66, 193, 0.3)",
                      }}
                    >
                      <FontAwesomeIcon icon={faUser} size="2x" />
                    </div>
                    <h5
                      className="mb-2"
                      style={{fontSize: "16px", color: "#6f42c1"}}
                    >
                      Select a party to get started
                    </h5>
                    <p className="text-muted mb-0" style={{fontSize: "14px"}}>
                      Choose a party from the list to view their details and
                      transaction history
                    </p>
                  </Card.Body>
                </Card>
              </div>
            )}
          </Col>
        </Row>
      </div>

      {/* ✅ Modals - All existing modals remain the same */}
      <AddNewParty
        show={showAddModal}
        onHide={handleCloseModal}
        editingParty={editingParty}
        onSaveParty={handleSaveParty}
        isQuickAdd={false}
        companyId={companyId}
      />

      <PayIn
        show={showPayIn}
        onHide={() => {
          setShowPayIn(false);
          setPayInData(null);
        }}
        party={selectedParty}
        onPaymentRecorded={handlePaymentRecorded}
        currentCompany={currentCompany}
        companyId={companyId}
        currentUser={currentCompany}
        duplicateData={payInData}
        bankAccounts={bankAccounts}
      />

      <PayOut
        show={showPayOut}
        onHide={() => {
          setShowPayOut(false);
          setPayOutData(null);
        }}
        party={selectedParty}
        onPaymentRecorded={handlePaymentRecorded}
        currentCompany={currentCompany}
        companyId={companyId}
        currentUser={currentCompany}
        duplicateData={payOutData}
        bankAccounts={bankAccounts}
      />

      {/* ✅ Loading Overlay */}
      {isLoading && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(5px)",
          }}
        >
          <Card
            className="border-0 shadow-lg"
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              borderRadius: "12px",
            }}
          >
            <Card.Body className="p-4 text-center">
              <Spinner
                animation="border"
                className="mb-3"
                style={{color: "#6f42c1"}}
              />
              <h6 className="mb-0" style={{color: "#6f42c1"}}>
                Processing...
              </h6>
            </Card.Body>
          </Card>
        </div>
      )}
    </div>
  );
}

export default Parties;
