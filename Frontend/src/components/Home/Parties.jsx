import React, {useState, useEffect} from "react";
import {
  Container,
  Row,
  Col,
  Button,
  Card,
  Form,
  InputGroup,
  Badge,
  Dropdown,
  Alert,
  Spinner,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faEdit,
  faPhone,
  faEnvelope,
  faMapMarkerAlt,
  faBuilding,
  faUser,
  faEllipsisV,
  faArrowUp,
  faArrowDown,
  faFilter,
  faSort,
  faSortUp,
  faSortDown,
  faTrash,
  faExclamationTriangle,
  faCheckCircle,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import {useParams} from "react-router-dom";
import "./Parties.css";
import PartyHeader from "./Party/PartyHeader";
import AddNewParty from "./Party/AddNewParty";
import partyService from "../../services/partyService";
import paymentService from "../../services/paymentService";
import purchaseService from "../../services/purchaseService";
import PayIn from "./Party/PayIn";
import PayOut from "./Party/PayOut";
import TransactionTable from "./Party/TransactionTable";

function Parties() {
  const {companyId} = useParams();

  // State management
  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingParties, setIsLoadingParties] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [showPayIn, setShowPayIn] = useState(false);
  const [showPayOut, setShowPayOut] = useState(false);
  const [payInData, setPayInData] = useState(null);
  const [payOutData, setPayOutData] = useState(null);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [transactionSearchQuery, setTransactionSearchQuery] = useState("");
  const [partyTypeFilter, setPartyTypeFilter] = useState("all");

  // ✅ Enhanced sorting state with mapping
  const [sortConfig, setSortConfig] = useState({
    key: "currentBalance", // Use backend key directly
    direction: "desc",
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalParties, setTotalParties] = useState(0);
  const partiesPerPage = 20;

  // Transaction states
  const [transactions, setTransactions] = useState([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [transactionsPagination, setTransactionsPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
  });
  const [transactionRefreshTrigger, setTransactionRefreshTrigger] = useState(0);

  // Payment summary state
  const [paymentSummary, setPaymentSummary] = useState({
    totalPaymentsIn: 0,
    totalPaymentsOut: 0,
    netAmount: 0,
    totalTransactions: 0,
  });

  // ✅ Enhanced bank accounts state
  const [bankAccounts, setBankAccounts] = useState([]);
  const [isLoadingBankAccounts, setIsLoadingBankAccounts] = useState(false);

  // Company state
  const [currentCompany, setCurrentCompany] = useState({
    id: companyId,
    _id: companyId,
    name: "Your Company Name",
  });

  // Update company when companyId changes
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
      // Set empty array on error to prevent undefined issues
      setBankAccounts([]);
    } finally {
      setIsLoadingBankAccounts(false);
    }
  };

  // Currency formatter
  const formatCurrency = (amount) => {
    const numericAmount = parseFloat(amount) || 0;
    return numericAmount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Normalize party data
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

  // Get transaction type
  const getTransactionType = (paymentType, paymentMethod) => {
    if (paymentType === "payment_in") {
      return "Receipt Voucher";
    } else if (paymentType === "payment_out") {
      return "Payment Voucher";
    }
    return paymentMethod === "cash" ? "Cash Transaction" : "Bank Transaction";
  };

  // Toast notification handler
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

  // Enhanced transaction handlers
  const handleTransactionUpdated = async (updatedTransactionData) => {
    try {
      if (selectedParty && companyId) {
        await loadTransactions(selectedParty._id || selectedParty.id);
        await loadPaymentSummary(selectedParty._id || selectedParty.id);
        // Reload bank accounts to get updated balances
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
          // Reload bank accounts to get updated balances
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

  // Load transactions with allocations
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
          // ✅ Enhanced bank information extraction
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
          // Employee information
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

  // Load payment summary
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
        sortBy: String(backendSortKey), // Use mapped sort key
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

  // Search effect
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

  // Filter/sort effect
  useEffect(() => {
    if (companyId) {
      setCurrentPage(1);
      loadParties({
        page: 1,
        partyType: partyTypeFilter === "all" ? null : partyTypeFilter,
      });
    }
  }, [partyTypeFilter, sortConfig, companyId]);

  // Delete party handler
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

  // ✅ Enhanced initial load effect with bank accounts
  useEffect(() => {
    if (companyId) {
      loadParties();
      loadBankAccounts();
    }
  }, [companyId]);

  // Transaction search effect
  useEffect(() => {
    if (selectedParty && companyId && transactionSearchQuery !== undefined) {
      const searchTimeout = setTimeout(() => {
        loadTransactions(selectedParty._id || selectedParty.id, {page: 1});
      }, 500);
      return () => clearTimeout(searchTimeout);
    }
  }, [transactionSearchQuery, companyId]);

  // Transaction refresh effect
  useEffect(() => {
    if (selectedParty && companyId && transactionRefreshTrigger > 0) {
      loadTransactions(selectedParty._id || selectedParty.id);
      loadPaymentSummary(selectedParty._id || selectedParty.id);
      // Also refresh bank accounts to get updated balances
      loadBankAccounts();
    }
  }, [transactionRefreshTrigger, companyId]);

  // Clear alerts effect
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // ✅ Enhanced sorting handler with proper key mapping
  const handleSort = (frontendKey) => {
    let direction = "asc";

    // Map frontend key to backend key for comparison
    const backendKey = mapSortKey(frontendKey);

    if (sortConfig.key === backendKey && sortConfig.direction === "asc") {
      direction = "desc";
    }

    setSortConfig({key: backendKey, direction});
  };

  // Party selection handler
  const handlePartySelect = (party) => {
    const normalizedParty = normalizeParty(party);
    setSelectedParty(normalizedParty);

    if (companyId) {
      loadTransactions(normalizedParty._id || normalizedParty.id);
      loadPaymentSummary(normalizedParty._id || normalizedParty.id);
    }
  };

  // ✅ Enhanced sort icon helper with proper key mapping
  const getSortIcon = (frontendColumnKey) => {
    // Map frontend display key to backend sort key
    const backendKey = mapSortKey(frontendColumnKey);

    if (sortConfig.key !== backendKey) {
      return faSort;
    }
    return sortConfig.direction === "asc" ? faSortUp : faSortDown;
  };

  // Modal handlers
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

  // Save party handler
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

  // Refresh parties handler
  const handleRefreshParties = () => {
    if (companyId) {
      setCurrentPage(1);
      loadParties({page: 1});
      loadBankAccounts(); // Also refresh bank accounts
    }
  };

  // Enhanced PayIn/PayOut handlers with duplicate support
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

  // Enhanced payment recorded handler
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

  // View payment allocations handler
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

  // Pagination handler
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    if (companyId) {
      loadParties({page: newPage});
    }
  };

  // Placeholder handlers for PartyHeader
  const handleAddSale = () => {
    // TODO: Implement add sale functionality
  };

  const handleAddPurchase = () => {
    // TODO: Implement add purchase functionality
  };

  const handleMoreOptions = () => {
    // TODO: Implement more options
  };

  const handleSettings = () => {
    // TODO: Implement settings
  };

  const handleExportParties = () => {
    // TODO: Implement export functionality
  };

  // Early return if no company ID
  if (!companyId) {
    return (
      <div className="parties-layout bg-light min-vh-100 d-flex align-items-center justify-content-center">
        <Card className="border-0 bg-white text-center shadow-sm">
          <Card.Body className="p-4">
            <FontAwesomeIcon
              icon={faExclamationTriangle}
              size="2x"
              className="text-warning mb-3"
            />
            <h6 className="text-muted" style={{fontSize: "14px"}}>
              Company Required
            </h6>
            <p className="text-muted mb-0" style={{fontSize: "12px"}}>
              Please select a company to view parties and transactions
            </p>
          </Card.Body>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="parties-layout bg-light min-vh-100"
      style={{fontSize: "13px"}}
    >
      {/* Party Header */}
      <PartyHeader
        activeType={partyTypeFilter}
        onTypeChange={setPartyTypeFilter}
        transactionSearchQuery={transactionSearchQuery}
        onTransactionSearchChange={setTransactionSearchQuery}
        totalParties={totalParties}
        onAddParty={handleOpenModal}
        onAddSale={handleAddSale}
        onAddPurchase={handleAddPurchase}
        onRefreshParties={handleRefreshParties}
        isLoadingParties={isLoadingParties}
        onMoreOptions={handleMoreOptions}
        onSettings={handleSettings}
        onExportParties={handleExportParties}
      />

      {/* Alerts */}
      {error && (
        <Alert
          variant="danger"
          className="m-3 mb-0"
          dismissible
          onClose={() => setError("")}
        >
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          <div style={{whiteSpace: "pre-line"}}>{error}</div>
        </Alert>
      )}
      {success && (
        <Alert
          variant="success"
          className="m-3 mb-0"
          dismissible
          onClose={() => setSuccess("")}
        >
          <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
          <div style={{whiteSpace: "pre-line"}}>{success}</div>
        </Alert>
      )}

      {/* ✅ Bank Accounts Loading Alert */}
      {isLoadingBankAccounts && (
        <Alert variant="info" className="m-3 mb-0">
          <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
          Loading bank accounts...
        </Alert>
      )}

      {/* Main Content */}
      <Container fluid className="p-0">
        <Row className="g-0" style={{height: "calc(100vh - 160px)"}}>
          {/* Parties List Sidebar */}
          <Col xl={3} lg={4} md={5} className="bg-white border-end">
            <div className="h-100 d-flex flex-column">
              {/* Search */}
              <div className="p-2 border-bottom bg-light">
                <InputGroup size="sm">
                  <InputGroup.Text className="bg-white border-end-0 rounded-start-pill">
                    <FontAwesomeIcon
                      icon={faSearch}
                      className="text-muted"
                      size="sm"
                    />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search Party Name"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-start-0 rounded-end-pill"
                    style={{fontSize: "13px"}}
                  />
                </InputGroup>
              </div>

              {/* List Header */}
              <div className="bg-light border-bottom px-2 py-1">
                <Row className="align-items-center">
                  <Col>
                    <small
                      className="text-muted fw-bold text-uppercase d-flex align-items-center cursor-pointer"
                      style={{fontSize: "11px"}}
                      onClick={() => handleSort("name")}
                    >
                      <FontAwesomeIcon
                        icon={faFilter}
                        className="me-1"
                        size="xs"
                      />
                      Party Name
                      <FontAwesomeIcon
                        icon={getSortIcon("name")}
                        className="ms-auto"
                        size="xs"
                      />
                    </small>
                  </Col>
                  <Col xs="auto">
                    <small
                      className="text-muted fw-bold text-uppercase d-flex align-items-center cursor-pointer"
                      style={{fontSize: "11px"}}
                      onClick={() => handleSort("balance")}
                    >
                      Amount
                      <FontAwesomeIcon
                        icon={getSortIcon("balance")}
                        className="ms-1"
                        size="xs"
                      />
                    </small>
                  </Col>
                </Row>
              </div>

              {/* Parties List */}
              <div
                className="flex-grow-1 overflow-auto"
                style={{
                  maxHeight: "calc(100vh - 350px)",
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(0,0,0,0.3) transparent",
                }}
              >
                {isLoadingParties ? (
                  <div className="d-flex justify-content-center align-items-center py-5">
                    <div className="text-center">
                      <Spinner animation="border" size="sm" variant="primary" />
                      <div className="mt-2 text-muted small">
                        Loading parties...
                      </div>
                    </div>
                  </div>
                ) : parties.length === 0 ? (
                  <div className="d-flex flex-column justify-content-center align-items-center py-5 px-3">
                    <FontAwesomeIcon
                      icon={faUser}
                      size="2x"
                      className="text-muted mb-3"
                    />
                    <h6
                      className="text-muted text-center mb-2"
                      style={{fontSize: "14px"}}
                    >
                      {searchQuery ? "No parties found" : "No parties yet"}
                    </h6>
                    <p
                      className="text-muted text-center mb-3"
                      style={{fontSize: "12px"}}
                    >
                      {searchQuery
                        ? "Try adjusting your search terms"
                        : "Get started by adding your first party"}
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleOpenModal}
                      className="px-3"
                      style={{fontSize: "12px"}}
                    >
                      <FontAwesomeIcon icon={faPlus} className="me-1" />
                      Add Party
                    </Button>
                  </div>
                ) : (
                  <div className="list-group list-group-flush">
                    {parties.map((party) => {
                      const isSelected =
                        selectedParty &&
                        (selectedParty.id === party.id ||
                          selectedParty._id === party._id);
                      return (
                        <div
                          key={party.id || party._id}
                          className={`list-group-item list-group-item-action border-0 border-bottom px-3 py-2 ${
                            isSelected ? "bg-primary text-white" : "bg-white"
                          }`}
                          style={{
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            minHeight: "70px",
                          }}
                          onClick={() => handlePartySelect(party)}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.target.classList.add("bg-light");
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.target.classList.remove("bg-light");
                            }
                          }}
                        >
                          <Row className="align-items-center g-0">
                            <Col className="pe-2">
                              <div className="d-flex justify-content-between align-items-start mb-1">
                                <div className="flex-grow-1 me-2">
                                  <div
                                    className={`fw-semibold mb-1 ${
                                      isSelected ? "text-white" : "text-dark"
                                    }`}
                                    style={{
                                      fontSize: "13px",
                                      lineHeight: "1.2",
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {party.name}
                                    <Badge
                                      bg={
                                        party.partyType === "customer"
                                          ? "success"
                                          : party.partyType === "vendor"
                                          ? "warning"
                                          : "info"
                                      }
                                      className="ms-2"
                                      style={{fontSize: "9px"}}
                                    >
                                      {party.partyType}
                                    </Badge>
                                  </div>
                                  <div
                                    className={`small ${
                                      isSelected
                                        ? "text-white-50"
                                        : "text-muted"
                                    }`}
                                    style={{fontSize: "11px"}}
                                  >
                                    <FontAwesomeIcon
                                      icon={faPhone}
                                      className="me-1"
                                    />
                                    {party.phone}
                                  </div>
                                </div>

                                {/* Party Actions */}
                                <div onClick={(e) => e.stopPropagation()}>
                                  <Dropdown align="end">
                                    <Dropdown.Toggle
                                      variant="link"
                                      className="p-0 border-0 shadow-none text-decoration-none"
                                      style={{fontSize: "12px"}}
                                    >
                                      <FontAwesomeIcon
                                        icon={faEllipsisV}
                                        className={
                                          isSelected
                                            ? "text-white"
                                            : "text-muted"
                                        }
                                        size="sm"
                                      />
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu className="shadow-sm">
                                      <Dropdown.Item
                                        onClick={() => handleEditParty(party)}
                                        className="small"
                                        style={{fontSize: "12px"}}
                                      >
                                        <FontAwesomeIcon
                                          icon={faEdit}
                                          className="me-2 text-primary"
                                        />
                                        Edit Party
                                      </Dropdown.Item>
                                      <Dropdown.Divider />
                                      <Dropdown.Item
                                        onClick={() => handleDeleteParty(party)}
                                        className="text-danger small"
                                        style={{fontSize: "12px"}}
                                      >
                                        <FontAwesomeIcon
                                          icon={faTrash}
                                          className="me-2"
                                        />
                                        Delete Party
                                      </Dropdown.Item>
                                    </Dropdown.Menu>
                                  </Dropdown>
                                </div>
                              </div>

                              {/* Balance */}
                              <div className="mt-1">
                                <span
                                  className={`fw-bold small ${
                                    isSelected
                                      ? "text-white"
                                      : party.balance > 0
                                      ? "text-success"
                                      : party.balance < 0
                                      ? "text-danger"
                                      : "text-secondary"
                                  }`}
                                  style={{fontSize: "12px"}}
                                >
                                  ₹{formatCurrency(Math.abs(party.balance))}
                                  <small
                                    className={`ms-1 ${
                                      isSelected
                                        ? "text-white-50"
                                        : "text-muted"
                                    }`}
                                  >
                                    ({party.balance >= 0 ? "Credit" : "Debit"})
                                  </small>
                                </span>
                              </div>
                            </Col>
                          </Row>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-2 border-top bg-light">
                  <Row className="align-items-center g-2">
                    <Col>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => handlePageChange(currentPage - 1)}
                        style={{fontSize: "11px"}}
                      >
                        Previous
                      </Button>
                    </Col>
                    <Col xs="auto">
                      <small className="text-muted" style={{fontSize: "11px"}}>
                        Page {currentPage} of {totalPages}
                      </small>
                    </Col>
                    <Col xs="auto">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => handlePageChange(currentPage + 1)}
                        style={{fontSize: "11px"}}
                      >
                        Next
                      </Button>
                    </Col>
                  </Row>
                </div>
              )}

              {/* Contact Info */}
              <div className="p-2 border-top bg-light">
                <Card className="border-0 bg-success bg-opacity-10">
                  <Card.Body className="p-2 text-center">
                    <FontAwesomeIcon
                      icon={faPhone}
                      className="text-success mb-1"
                    />
                    <div
                      className="small text-muted"
                      style={{fontSize: "11px", lineHeight: "1.3"}}
                    >
                      Use contacts from your Phone or Gmail to{" "}
                      <strong className="text-dark">
                        quickly create parties.
                      </strong>
                    </div>
                  </Card.Body>
                </Card>
              </div>
            </div>
          </Col>

          {/* Party Details with Transactions */}
          <Col xl={9} lg={8} md={7}>
            {selectedParty ? (
              <div className="h-100 bg-white">
                {/* Party Header with Payment Summary */}
                <div className="border-bottom p-3 bg-light">
                  <Row className="align-items-center">
                    <Col>
                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <div className="flex-grow-1">
                          <h5
                            className="mb-1 fw-bold d-flex align-items-center"
                            style={{fontSize: "16px"}}
                          >
                            {selectedParty.name}
                            <Badge
                              bg={
                                selectedParty.partyType === "customer"
                                  ? "success"
                                  : selectedParty.partyType === "vendor"
                                  ? "warning"
                                  : "info"
                              }
                              className="ms-2"
                              style={{fontSize: "11px"}}
                            >
                              {selectedParty.partyType}
                            </Badge>
                            <Button
                              variant="link"
                              size="sm"
                              className="p-1 ms-2 text-primary"
                              onClick={() => handleEditParty(selectedParty)}
                              title="Edit Party"
                            >
                              <FontAwesomeIcon icon={faEdit} size="sm" />
                            </Button>
                          </h5>

                          {/* Payment Summary */}
                          {paymentSummary.totalTransactions > 0 && (
                            <div className="mb-2">
                              <Row className="g-2">
                                <Col xs="auto">
                                  <Badge
                                    bg="success"
                                    className="px-2 py-1"
                                    style={{fontSize: "10px"}}
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
                                    bg="danger"
                                    className="px-2 py-1"
                                    style={{fontSize: "10px"}}
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
                                    bg={
                                      paymentSummary.netAmount >= 0
                                        ? "primary"
                                        : "warning"
                                    }
                                    className="px-2 py-1"
                                    style={{fontSize: "10px"}}
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

                          <div
                            className="text-muted"
                            style={{fontSize: "12px"}}
                          >
                            <FontAwesomeIcon icon={faPhone} className="me-1" />
                            {selectedParty.phone}
                            {selectedParty.email && (
                              <>
                                <span className="mx-2">|</span>
                                <FontAwesomeIcon
                                  icon={faEnvelope}
                                  className="me-1"
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
                                />
                                {selectedParty.address}
                              </>
                            )}
                          </div>
                          {selectedParty.companyName && (
                            <div
                              className="text-muted mt-1"
                              style={{fontSize: "12px"}}
                            >
                              <FontAwesomeIcon
                                icon={faBuilding}
                                className="me-1"
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
                        <div className="d-flex gap-2 flex-shrink-0">
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => handlePayIn()}
                            className="px-3"
                            style={{fontSize: "12px"}}
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
                            style={{fontSize: "12px"}}
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

                {/* Transaction Table */}
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
                    // ✅ Enhanced props with proper bank accounts
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
              <div className="h-100 d-flex align-items-center justify-content-center bg-light">
                <Card className="border-0 bg-white text-center shadow-sm">
                  <Card.Body className="p-5">
                    <FontAwesomeIcon
                      icon={faUser}
                      size="3x"
                      className="text-muted mb-3"
                    />
                    <h5 className="text-muted mb-2" style={{fontSize: "16px"}}>
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
      </Container>

      {/* Modals */}
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

      {/* Loading Overlay */}
      {isLoading && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <Card className="border-0 shadow-lg">
            <Card.Body className="p-4 text-center">
              <Spinner animation="border" variant="primary" className="mb-3" />
              <h6 className="text-muted mb-0">Processing...</h6>
            </Card.Body>
          </Card>
        </div>
      )}
    </div>
  );
}

export default Parties;
