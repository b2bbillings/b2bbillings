import React, {useState, useEffect} from "react";
import {
  Modal,
  Form,
  Button,
  Row,
  Col,
  Alert,
  Spinner,
  Card,
  Badge,
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faMoneyBillWave,
  faExclamationTriangle,
  faInfoCircle,
  faCheckCircle,
  faSave,
  faPlus,
  faFileInvoice,
  faCalendar,
  faRupeeSign,
  faReceipt,
  faRefresh,
  faUniversity,
} from "@fortawesome/free-solid-svg-icons";

import paymentService from "../../../services/paymentService";
import bankAccountService from "../../../services/bankAccountService";
import authService from "../../../services/authService";

function PayIn({
  show,
  onHide,
  party,
  onPaymentRecorded,
  currentCompany,
  companyId,
  currentUser,
  // ✅ NEW: Props for DayBook integration
  initialSale, // The sale/invoice data from DayBook
  source, // Source indicator (e.g., "daybook")
}) {
  const [formData, setFormData] = useState({
    customerName: "",
    date: new Date().toISOString().split("T")[0],
    clearingDate: "",
    employeeName: "",
    totalOutstanding: 0,
    amountReceived: "",
    paymentType: "advance",
    selectedSaleOrder: "",
    paymentMethod: "cash",
    selectedBank: "",
    bankDetails: "",
    additionalNotes: "",
    reference: "",
    invoiceAllocations: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [availableBanks, setAvailableBanks] = useState([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoicePanel, setShowInvoicePanel] = useState(false);
  const [selectedBankDetails, setSelectedBankDetails] = useState(null);
  // ✅ NEW: Track if this is from DayBook with pre-selected invoice
  const [isDayBookContext, setIsDayBookContext] = useState(false);

  const paymentMethods = [
    {value: "cash", label: "Cash"},
    {value: "bank_transfer", label: "Bank Transfer"},
    {value: "cheque", label: "Cheque"},
    {value: "upi", label: "UPI"},
    {value: "card", label: "Card"},
  ];

  // ✅ ENHANCED: Helper function to get pending amount from sale
  const getPendingAmount = (sale) => {
    if (!sale) return 0;
    const totalAmount = parseFloat(
      sale.totals?.finalTotal ||
        sale.totalAmount ||
        sale.amount ||
        sale.total ||
        sale.grandTotal ||
        0
    );
    const paidAmount = parseFloat(
      sale.payment?.paidAmount || sale.paidAmount || 0
    );
    return Math.max(0, totalAmount - paidAmount);
  };

  // ✅ ENHANCED: Helper function to get sale number
  const getSaleNumber = (sale) => {
    if (!sale) return "Unknown";
    return (
      sale.saleNumber ||
      sale.orderNumber ||
      sale.invoiceNumber ||
      sale.number ||
      `SA-${sale._id?.slice(-6) || "XXXXXX"}`
    );
  };

  // ✅ ENHANCED: Helper function to normalize sale data for invoice selection
  const normalizeSaleForInvoice = (sale) => {
    if (!sale) return null;

    const totalAmount = parseFloat(
      sale.totals?.finalTotal ||
        sale.totalAmount ||
        sale.amount ||
        sale.total ||
        sale.grandTotal ||
        0
    );
    const paidAmount = parseFloat(
      sale.payment?.paidAmount || sale.paidAmount || 0
    );

    return {
      _id: sale._id || sale.id,
      id: sale._id || sale.id,
      orderNumber: getSaleNumber(sale),
      saleNumber: getSaleNumber(sale),
      invoiceNumber: getSaleNumber(sale),
      orderDate:
        sale.saleDate || sale.orderDate || sale.invoiceDate || sale.date,
      saleDate:
        sale.saleDate || sale.orderDate || sale.invoiceDate || sale.date,
      invoiceDate:
        sale.saleDate || sale.orderDate || sale.invoiceDate || sale.date,
      totalAmount: totalAmount,
      amount: totalAmount,
      finalTotal: totalAmount,
      dueAmount: totalAmount - paidAmount,
      paidAmount: paidAmount,
      paymentStatus:
        sale.paymentStatus || (paidAmount > 0 ? "partial" : "pending"),
      // ✅ Additional fields for compatibility
      customer: sale.customer || {},
      customerId: sale.customer?._id || sale.customer?.id || sale.customerId,
      status: sale.status || "pending",
      pendingAmount: totalAmount - paidAmount,
      // ✅ Keep original data for reference
      _originalSale: sale,
    };
  };

  // ✅ FIXED: Enhanced loadPendingInvoices with better DayBook handling
  const loadPendingInvoices = async (forceRefresh = false) => {
    if (!party || !companyId) return;

    try {
      setIsLoadingInvoices(true);

      // ✅ FIRST: If DayBook context, immediately set the selected invoice
      if (isDayBookContext && initialSale) {
        const normalizedSale = normalizeSaleForInvoice(initialSale);
        if (normalizedSale && getPendingAmount(initialSale) > 0) {
          setSelectedInvoice(normalizedSale);

          // Update form data immediately
          const pendingAmount = getPendingAmount(initialSale);
          setFormData((prev) => ({
            ...prev,
            selectedSaleOrder: normalizedSale._id || normalizedSale.id,
            paymentType: "pending",
            amountReceived: pendingAmount.toFixed(2),
          }));
        }
      }

      // ✅ THEN: Load additional invoices from API
      const response = await paymentService.getPendingInvoicesForPayment(
        companyId,
        party._id || party.id
      );

      if (response.success) {
        const invoices =
          response.data.invoices ||
          response.data.salesOrders ||
          response.data.orders ||
          [];

        const invoicesWithDue = invoices.filter((invoice) => {
          const dueAmount = parseFloat(invoice.dueAmount || 0);
          const totalAmount = parseFloat(
            invoice.totalAmount || invoice.amount || invoice.finalTotal || 0
          );
          return dueAmount > 0 && totalAmount > 0;
        });

        // ✅ ENHANCED: Always include DayBook invoice at the top
        let finalInvoices = [...invoicesWithDue];

        if (isDayBookContext && initialSale) {
          const normalizedInitialSale = normalizeSaleForInvoice(initialSale);

          if (normalizedInitialSale && getPendingAmount(initialSale) > 0) {
            // Check if this invoice is already in the list
            const existingInvoice = finalInvoices.find(
              (inv) =>
                (inv._id || inv.id) ===
                (normalizedInitialSale._id || normalizedInitialSale.id)
            );

            if (!existingInvoice) {
              // Add the initial sale to the beginning of the list
              finalInvoices = [normalizedInitialSale, ...finalInvoices];
            }
          }
        }

        setPendingInvoices(finalInvoices);

        // ✅ Handle existing selected invoice updates (only for non-DayBook context)
        if (!isDayBookContext && selectedInvoice && finalInvoices.length > 0) {
          const updatedSelectedInvoice = finalInvoices.find(
            (inv) =>
              (inv._id || inv.id) ===
              (selectedInvoice._id || selectedInvoice.id)
          );

          if (updatedSelectedInvoice) {
            setSelectedInvoice(updatedSelectedInvoice);
            const newDueAmount = parseFloat(
              updatedSelectedInvoice.dueAmount || 0
            );
            if (newDueAmount > 0) {
              setFormData((prev) => ({
                ...prev,
                amountReceived: newDueAmount.toFixed(2),
              }));
            }
          } else {
            setSelectedInvoice(null);
            setFormData((prev) => ({
              ...prev,
              selectedSaleOrder: "",
              amountReceived: "",
            }));
          }
        }
      } else {
        // ✅ Even if API fails, keep DayBook invoice if available
        if (isDayBookContext && initialSale) {
          const normalizedSale = normalizeSaleForInvoice(initialSale);
          if (normalizedSale) {
            setPendingInvoices([normalizedSale]);
          }
        } else {
          setPendingInvoices([]);
        }
      }
    } catch (error) {
      // ✅ Fallback: Keep DayBook invoice even on error
      if (isDayBookContext && initialSale) {
        const normalizedSale = normalizeSaleForInvoice(initialSale);
        if (normalizedSale) {
          setPendingInvoices([normalizedSale]);
        }
      } else {
        setPendingInvoices([]);
      }

      if (!forceRefresh) {
        setError("Failed to load pending invoices");
      }
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const refreshInvoiceData = async () => {
    if (formData.paymentType === "pending" && party && companyId) {
      await loadPendingInvoices(true);
    }
  };

  const loadAvailableBanks = async () => {
    if (!companyId) return;

    try {
      setIsLoadingBanks(true);
      const response = await bankAccountService.getBankAccounts(companyId, {
        active: "true",
        limit: 100,
      });

      if (response.success) {
        const banks =
          response.banks || response.data?.banks || response.data || [];
        setAvailableBanks(banks);
      } else {
        setAvailableBanks([]);
      }
    } catch (error) {
      setAvailableBanks([]);
    } finally {
      setIsLoadingBanks(false);
    }
  };

  const autoFillEmployeeData = () => {
    try {
      const user = currentUser || authService.getCurrentUser();
      if (user) {
        const employeeName =
          user.fullName ||
          user.name ||
          user.username ||
          user.displayName ||
          (user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : "") ||
          user.email?.split("@")[0] ||
          "";

        setFormData((prev) => ({
          ...prev,
          employeeName: employeeName.trim(),
        }));
      }
    } catch (error) {
      // Silent error handling
    }
  };

  // ✅ COMPLETELY REWRITTEN: Main initialization effect with immediate DayBook selection
  useEffect(() => {
    if (show && party) {
      // ✅ Determine DayBook context FIRST
      const isFromDayBook = source === "daybook" && initialSale;
      setIsDayBookContext(isFromDayBook);

      // ✅ Calculate initial values
      const initialPaymentType = isFromDayBook ? "pending" : "advance";
      const initialShowInvoicePanel = isFromDayBook;

      let initialAmount = "";
      let preSelectedInvoice = null;
      let preSelectedSaleId = "";

      if (isFromDayBook && initialSale) {
        const pendingAmount = getPendingAmount(initialSale);
        if (pendingAmount > 0) {
          initialAmount = pendingAmount.toFixed(2);
          preSelectedInvoice = normalizeSaleForInvoice(initialSale);
          preSelectedSaleId = initialSale._id || initialSale.id;
        }
      }

      // ✅ Set ALL state immediately and synchronously
      setFormData({
        customerName: party.name,
        date: new Date().toISOString().split("T")[0],
        clearingDate: "",
        employeeName: "",
        totalOutstanding: Math.abs(party.currentBalance || party.balance || 0),
        amountReceived: initialAmount,
        paymentType: initialPaymentType,
        selectedSaleOrder: preSelectedSaleId,
        paymentMethod: "cash",
        selectedBank: "",
        bankDetails: "",
        additionalNotes: isFromDayBook
          ? `Payment for ${getSaleNumber(initialSale)}`
          : "",
        reference: "",
        invoiceAllocations: [],
      });

      // ✅ Set selected invoice IMMEDIATELY if from DayBook
      if (preSelectedInvoice) {
        setSelectedInvoice(preSelectedInvoice);
      } else {
        setSelectedInvoice(null);
      }

      // ✅ Reset other states
      setError("");
      setSuccess("");
      setPendingInvoices([]);
      setAvailableBanks([]);
      setShowInvoicePanel(initialShowInvoicePanel);
      setSelectedBankDetails(null);

      // ✅ Auto-fill employee data
      setTimeout(() => {
        autoFillEmployeeData();
      }, 100);

      // ✅ Load additional data
      setTimeout(() => {
        if (isFromDayBook) {
          // For DayBook, load invoices after selection is already set
          if (companyId) {
            loadPendingInvoices();
          }
        } else {
          // Normal flow - focus on amount input
          const amountInput = document.querySelector('[name="amountReceived"]');
          if (amountInput) amountInput.focus();
        }
      }, 300);
    }
  }, [show, party, companyId, currentUser, initialSale, source]);

  useEffect(() => {
    if (show && formData.paymentMethod === "bank_transfer" && companyId) {
      loadAvailableBanks();
    } else {
      setAvailableBanks([]);
      setSelectedBankDetails(null);
      setFormData((prev) => ({...prev, selectedBank: "", bankDetails: ""}));
    }
  }, [formData.paymentMethod, show, companyId]);

  const handleChange = (e) => {
    const {name, value} = e.target;
    setFormData((prev) => ({...prev, [name]: value}));
    if (error) setError("");
  };

  const handleBankSelect = (e) => {
    const bankId = e.target.value;
    setFormData((prev) => ({...prev, selectedBank: bankId}));

    if (bankId) {
      const selectedBank = availableBanks.find(
        (bank) => (bank._id || bank.id) === bankId
      );
      setSelectedBankDetails(selectedBank);
    } else {
      setSelectedBankDetails(null);
    }
  };

  const handleInvoiceSelection = (invoice) => {
    setSelectedInvoice(invoice);
    setFormData((prev) => ({
      ...prev,
      selectedSaleOrder: invoice._id || invoice.id,
      paymentType: "pending",
    }));

    const dueAmount = parseFloat(invoice.dueAmount || 0);
    if (dueAmount > 0) {
      setFormData((prev) => ({
        ...prev,
        amountReceived: dueAmount.toFixed(2),
      }));
    }
  };

  // ✅ ENHANCED: Handle payment type change with DayBook protection
  const handlePaymentTypeChange = (e) => {
    const paymentType = e.target.value;

    // ✅ Prevent changing payment type in DayBook context
    if (isDayBookContext) {
      return;
    }

    setFormData((prev) => ({...prev, paymentType}));

    if (paymentType === "advance") {
      setSelectedInvoice(null);
      setFormData((prev) => ({
        ...prev,
        selectedSaleOrder: "",
        amountReceived: "",
        invoiceAllocations: [],
      }));
      setShowInvoicePanel(false);
      setPendingInvoices([]);
    } else if (paymentType === "pending") {
      setShowInvoicePanel(true);
      loadPendingInvoices();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      if (
        !formData.amountReceived ||
        parseFloat(formData.amountReceived) <= 0
      ) {
        setError("Please enter a valid amount");
        return;
      }

      if (formData.paymentType === "pending" && !formData.selectedSaleOrder) {
        setError("Please select an invoice");
        return;
      }

      if (!formData.employeeName.trim()) {
        setError("Employee name is required");
        return;
      }

      if (
        formData.paymentMethod === "bank_transfer" &&
        !formData.selectedBank
      ) {
        setError("Please select a bank account");
        return;
      }

      if (
        formData.paymentMethod !== "cash" &&
        formData.paymentMethod !== "bank_transfer" &&
        !formData.bankDetails.trim()
      ) {
        setError("Please enter payment details");
        return;
      }

      if (formData.paymentMethod === "cheque" && !formData.clearingDate) {
        setError("Clearing date is required for cheque payments");
        return;
      }

      const paymentData = {
        companyId: companyId,
        partyId: party._id || party.id,
        party: party._id || party.id,
        partyName: party.name,
        type: "in",
        amount: parseFloat(formData.amountReceived),
        paymentMethod: formData.paymentMethod,
        paymentDate: formData.date,
        clearingDate: formData.clearingDate || null,
        paymentType: formData.paymentType,
        reference: formData.reference,
        notes: formData.additionalNotes,
        employeeName: formData.employeeName,
        status: "completed",
        // ✅ NEW: Add source tracking
        source: source || "manual",
        isDayBookPayment: isDayBookContext,
        ...(formData.selectedBank && {
          bankAccountId: formData.selectedBank,
          bankAccount: formData.selectedBank,
        }),
        ...(formData.selectedSaleOrder && {
          saleOrderId: formData.selectedSaleOrder,
          invoiceId: formData.selectedSaleOrder,
        }),
      };

      if (formData.paymentType === "pending" && selectedInvoice) {
        const selectedInvoiceData = {
          _id: selectedInvoice._id || selectedInvoice.id,
          invoiceNumber:
            selectedInvoice.orderNumber || selectedInvoice.saleNumber,
          dueAmount: parseFloat(selectedInvoice.dueAmount || 0),
          selected: true,
          allocatedAmount: parseFloat(formData.amountReceived),
        };

        paymentData.selectedInvoices = [selectedInvoiceData];
        paymentData.invoiceAllocations = [
          {
            invoiceId: selectedInvoiceData._id,
            invoiceNumber: selectedInvoiceData.invoiceNumber,
            allocatedAmount: selectedInvoiceData.allocatedAmount,
          },
        ];
      }

      const response = await paymentService.createPaymentIn(paymentData);

      if (response.success) {
        const {details, data} = response;

        // ✅ ENHANCED: Success message with DayBook context
        let successMsg = `✅ Payment of ₹${parseFloat(
          formData.amountReceived
        ).toLocaleString()} recorded successfully!`;
        successMsg += `\n• Payment Number: ${data.paymentNumber}`;

        if (isDayBookContext && initialSale) {
          successMsg += `\n• Invoice: ${getSaleNumber(initialSale)}`;
        }

        if (data.bankTransaction) {
          successMsg += `\n\n🏦 Bank Transaction Created:`;
          successMsg += `\n• Transaction #: ${data.bankTransaction.transactionNumber}`;
          successMsg += `\n• Bank: ${data.bankTransaction.bankName}`;
          successMsg += `\n• Amount: +₹${parseFloat(
            formData.amountReceived
          ).toLocaleString()} (Credit)`;
          successMsg += `\n• New Balance: ₹${
            data.bankTransaction.balance?.toLocaleString() || "N/A"
          }`;
          if (formData.reference) {
            successMsg += `\n• Reference: ${formData.reference}`;
          }
        } else if (formData.paymentMethod === "cash") {
          successMsg += `\n\n💵 Cash Payment - No bank transaction needed`;
        }

        if (details && details.invoicesUpdated > 0) {
          successMsg += `\n\n📋 Invoice Allocations:`;
          details.invoiceList?.forEach((allocation) => {
            successMsg += `\n• ${
              allocation.invoiceNumber
            }: ₹${allocation.allocatedAmount.toLocaleString()} (${
              allocation.paymentStatus
            })`;
          });

          if (details.remainingAmount > 0) {
            successMsg += `\n\n💰 Advance Amount: ₹${details.remainingAmount.toLocaleString()}`;
          }
        } else if (formData.paymentType === "advance") {
          successMsg += `\n\n💰 Advance payment credited to customer account`;
        }

        if (data && data.partyBalance !== undefined) {
          const balanceStatus = data.partyBalance >= 0 ? "Credit" : "Debit";
          successMsg += `\n\n📊 Customer Balance: ₹${Math.abs(
            data.partyBalance
          ).toLocaleString()} ${balanceStatus}`;
        }

        setSuccess(successMsg);

        // ✅ Refresh DayBook data if applicable
        if (
          isDayBookContext &&
          typeof window !== "undefined" &&
          window.refreshDayBookData
        ) {
          setTimeout(() => {
            window.refreshDayBookData();
          }, 1000);
        }

        setTimeout(async () => {
          await refreshInvoiceData();
        }, 500);

        // ✅ Reset form but keep employee name
        setFormData({
          customerName: party.name,
          date: new Date().toISOString().split("T")[0],
          clearingDate: "",
          employeeName: formData.employeeName,
          totalOutstanding: Math.abs(
            party.currentBalance || party.balance || 0
          ),
          amountReceived: "",
          paymentType: "advance",
          selectedSaleOrder: "",
          paymentMethod: "cash",
          selectedBank: "",
          bankDetails: "",
          additionalNotes: "",
          reference: "",
          invoiceAllocations: [],
        });

        setSelectedInvoice(null);
        setPendingInvoices([]);
        setShowInvoicePanel(false);
        setSelectedBankDetails(null);
        setIsDayBookContext(false); // Reset DayBook context after successful payment

        if (onPaymentRecorded) {
          onPaymentRecorded({
            ...data,
            type: "payment_in",
            partyId: party._id || party.id,
            partyName: party.name,
            allocations: details?.invoiceList || [],
            invoicesUpdated: details?.invoicesUpdated || 0,
            remainingAmount: details?.remainingAmount || 0,
            bankTransactionCreated: !!data.bankTransaction,
            bankTransaction: data.bankTransaction,
            bankAccount: data.bankAccount,
            paymentMethod: formData.paymentMethod,
            // ✅ NEW: Include DayBook context in callback
            source: source || "manual",
            isDayBookPayment: isDayBookContext,
            initialSale: initialSale,
          });
        }

        setTimeout(() => {
          onHide();
        }, 3000);
      } else {
        setError(response.message || "Failed to record payment");
      }
    } catch (error) {
      setError(error.message || "Failed to record payment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ ENHANCED: Reset with DayBook context awareness
  const resetForm = () => {
    const resetPaymentType = isDayBookContext ? "pending" : "advance";
    const resetAmount =
      isDayBookContext && initialSale
        ? getPendingAmount(initialSale).toFixed(2)
        : "";
    const resetNotes =
      isDayBookContext && initialSale
        ? `Payment for ${getSaleNumber(initialSale)}`
        : "";

    setFormData((prev) => ({
      ...prev,
      amountReceived: resetAmount,
      selectedSaleOrder:
        isDayBookContext && initialSale
          ? initialSale._id || initialSale.id
          : "",
      bankDetails: "",
      additionalNotes: resetNotes,
      reference: "",
      clearingDate: "",
      paymentType: resetPaymentType,
      invoiceAllocations: [],
    }));

    // ✅ FIXED: Keep DayBook selection if applicable
    if (isDayBookContext && initialSale) {
      const normalizedSale = normalizeSaleForInvoice(initialSale);
      setSelectedInvoice(normalizedSale);
      setShowInvoicePanel(true);
    } else {
      setSelectedInvoice(null);
      setShowInvoicePanel(false);
      setPendingInvoices([]);
    }

    setSelectedBankDetails(null);
    setError("");
    setSuccess("");
  };

  const handleRefreshInvoices = () => {
    if (formData.paymentType === "pending") {
      loadPendingInvoices(true);
    }
  };

  if (!party) return null;

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size={showInvoicePanel ? "xl" : "lg"}
      backdrop="static"
      className="payment-modal"
    >
      <Modal.Header
        closeButton
        style={{backgroundColor: "#6f42c1", color: "white"}}
      >
        <Modal.Title className="fw-bold">
          <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
          Payment In - {party.name}
          {/* ✅ NEW: Show DayBook indicator */}
          {isDayBookContext && (
            <Badge bg="light" text="dark" className="ms-2 small">
              From DayBook
            </Badge>
          )}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-0">
        <div className="d-flex" style={{minHeight: "500px"}}>
          <div
            className="p-4 bg-white"
            style={{
              flex: showInvoicePanel ? "0 0 55%" : "1",
              borderRight: showInvoicePanel ? "1px solid #dee2e6" : "none",
            }}
          >
            {error && (
              <Alert variant="danger" className="mb-3">
                <FontAwesomeIcon
                  icon={faExclamationTriangle}
                  className="me-2"
                />
                {error}
              </Alert>
            )}
            {success && (
              <Alert variant="success" className="mb-3">
                <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                <div style={{whiteSpace: "pre-line"}}>{success}</div>
              </Alert>
            )}

            {/* ✅ NEW: DayBook context indicator */}
            {isDayBookContext && initialSale && (
              <Alert variant="info" className="mb-3">
                <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                <strong>DayBook Payment:</strong> Pre-selected invoice{" "}
                {getSaleNumber(initialSale)}
                with pending amount ₹
                {getPendingAmount(initialSale).toLocaleString("en-IN")}
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-bold text-secondary small">
                      Customer Name
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="customerName"
                      value={formData.customerName}
                      className="bg-light"
                      readOnly
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-bold text-secondary small">
                      Date <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-bold text-secondary small">
                      Employee Name <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="employeeName"
                      value={formData.employeeName}
                      onChange={handleChange}
                      placeholder="Enter employee name"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-bold text-warning small">
                      Outstanding Balance
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={`₹ ${formData.totalOutstanding.toLocaleString(
                        "en-IN"
                      )}`}
                      className="bg-light fw-bold text-danger"
                      readOnly
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-bold text-success small">
                      Amount Received <span className="text-danger">*</span>
                      {/* ✅ NEW: Show if amount is auto-filled from DayBook */}
                      {isDayBookContext && initialSale && (
                        <Badge bg="success" className="ms-2 small">
                          Auto-filled
                        </Badge>
                      )}
                    </Form.Label>
                    <Form.Control
                      type="number"
                      name="amountReceived"
                      value={formData.amountReceived}
                      onChange={handleChange}
                      className="fw-bold"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-bold text-info small">
                      Payment Type <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Select
                      name="paymentType"
                      value={formData.paymentType}
                      onChange={handlePaymentTypeChange}
                      required
                      // ✅ NEW: Disable payment type change if from DayBook
                      disabled={isDayBookContext}
                    >
                      <option value="advance">Advance Payment</option>
                      <option value="pending">Against Invoice</option>
                    </Form.Select>
                    <Form.Text className="text-muted">
                      <small>
                        {formData.paymentType === "advance"
                          ? "Payment will be auto-allocated to pending invoices"
                          : "Payment against a specific invoice"}
                        {isDayBookContext && (
                          <span className="text-info">
                            {" "}
                            (Auto-selected from DayBook)
                          </span>
                        )}
                      </small>
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              {formData.paymentType === "pending" && (
                <Row className="mb-3">
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label className="fw-bold text-warning small">
                        Selected Invoice <span className="text-danger">*</span>
                        {/* ✅ NEW: Show auto-selection indicator */}
                        {isDayBookContext && selectedInvoice && (
                          <Badge bg="success" className="ms-2 small">
                            Auto-selected from DayBook
                          </Badge>
                        )}
                      </Form.Label>
                      {selectedInvoice ? (
                        <Card className="border-success">
                          <Card.Body className="p-3">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <h6
                                  className="mb-1 fw-bold"
                                  style={{color: "#6f42c1"}}
                                >
                                  <FontAwesomeIcon
                                    icon={faReceipt}
                                    className="me-2"
                                  />
                                  {selectedInvoice.orderNumber ||
                                    selectedInvoice.saleNumber}
                                  {/* ✅ NEW: Show DayBook badge on selected invoice */}
                                  {isDayBookContext && (
                                    <Badge bg="info" className="ms-2 small">
                                      DayBook
                                    </Badge>
                                  )}
                                </h6>
                                <small className="text-muted">
                                  Due: ₹
                                  {parseFloat(
                                    selectedInvoice.dueAmount || 0
                                  ).toLocaleString("en-IN")}
                                </small>
                              </div>
                              <Badge bg="success">
                                <FontAwesomeIcon
                                  icon={faCheckCircle}
                                  className="me-1"
                                />
                                Selected
                              </Badge>
                            </div>
                          </Card.Body>
                        </Card>
                      ) : (
                        <Card className="border-warning">
                          <Card.Body className="p-3 text-center">
                            <FontAwesomeIcon
                              icon={faInfoCircle}
                              className="me-2 text-warning"
                            />
                            <small className="text-muted">
                              {isDayBookContext
                                ? "Loading DayBook invoice selection..."
                                : "Please select an invoice from the right panel"}
                            </small>
                          </Card.Body>
                        </Card>
                      )}
                    </Form.Group>
                  </Col>
                </Row>
              )}

              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label
                      className="fw-bold small"
                      style={{color: "#6f42c1"}}
                    >
                      Payment Method <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Select
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={handleChange}
                      required
                    >
                      {paymentMethods.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  {formData.paymentMethod === "bank_transfer" && (
                    <Form.Group>
                      <Form.Label className="fw-bold text-success small">
                        Bank Account <span className="text-danger">*</span>
                        <small className="text-info ms-2">
                          <FontAwesomeIcon
                            icon={faUniversity}
                            className="me-1"
                          />
                          Will create bank transaction
                        </small>
                      </Form.Label>
                      {isLoadingBanks ? (
                        <div className="text-center p-2 bg-light border rounded">
                          <Spinner size="sm" />
                        </div>
                      ) : availableBanks.length > 0 ? (
                        <Form.Select
                          name="selectedBank"
                          value={formData.selectedBank}
                          onChange={handleBankSelect}
                          required
                        >
                          <option value="">Choose bank</option>
                          {availableBanks.map((bank) => (
                            <option
                              key={bank._id || bank.id}
                              value={bank._id || bank.id}
                            >
                              {bank.accountName} - {bank.bankName}
                            </option>
                          ))}
                        </Form.Select>
                      ) : (
                        <Form.Control
                          type="text"
                          value="No banks available"
                          className="bg-light"
                          readOnly
                        />
                      )}
                      {selectedBankDetails && (
                        <Form.Text className="text-muted">
                          <small>
                            <FontAwesomeIcon
                              icon={faUniversity}
                              className="me-1"
                            />
                            {selectedBankDetails.bankName} -{" "}
                            {selectedBankDetails.accountNumber}
                          </small>
                        </Form.Text>
                      )}
                    </Form.Group>
                  )}

                  {formData.paymentMethod !== "cash" &&
                    formData.paymentMethod !== "bank_transfer" && (
                      <Form.Group>
                        <Form.Label className="fw-bold text-warning small">
                          {formData.paymentMethod === "cheque" &&
                            "Cheque Number"}
                          {formData.paymentMethod === "upi" &&
                            "UPI Transaction ID"}
                          {formData.paymentMethod === "card" &&
                            "Card Reference"}
                          <span className="text-danger"> *</span>
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="bankDetails"
                          value={formData.bankDetails}
                          onChange={handleChange}
                          placeholder="Enter details"
                          required
                        />
                      </Form.Group>
                    )}
                </Col>
              </Row>

              {formData.paymentMethod === "cheque" && (
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-bold text-warning small">
                        Clearing Date <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="date"
                        name="clearingDate"
                        value={formData.clearingDate}
                        onChange={handleChange}
                        required
                      />
                      <Form.Text className="text-muted">
                        <small>Expected date when cheque will clear</small>
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
              )}

              {formData.paymentMethod === "bank_transfer" &&
                formData.selectedBank && (
                  <Row className="mb-3">
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label className="fw-bold text-info small">
                          Transaction Reference (Optional)
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="reference"
                          value={formData.reference}
                          onChange={handleChange}
                          placeholder="UTR Number / Transaction ID"
                        />
                        <Form.Text className="text-muted">
                          <small>
                            This reference will be included in the bank
                            transaction
                          </small>
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                )}

              <Row className="mb-4">
                <Col md={12}>
                  <Form.Group>
                    <Form.Label className="fw-bold text-secondary small">
                      Additional Notes
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      name="additionalNotes"
                      value={formData.additionalNotes}
                      onChange={handleChange}
                      style={{resize: "none"}}
                      placeholder="Enter any additional notes..."
                    />
                  </Form.Group>
                </Col>
              </Row>

              {formData.paymentMethod !== "cash" &&
                formData.selectedBank &&
                selectedBankDetails && (
                  <Row className="mb-3">
                    <Col md={12}>
                      <Card className="border-info bg-light">
                        <Card.Body className="p-3">
                          <h6 className="text-info mb-2">
                            <FontAwesomeIcon
                              icon={faUniversity}
                              className="me-2"
                            />
                            Bank Transaction Summary
                          </h6>
                          <div className="small">
                            <div>
                              <strong>Bank:</strong>{" "}
                              {selectedBankDetails.bankName}
                            </div>
                            <div>
                              <strong>Account:</strong>{" "}
                              {selectedBankDetails.accountName}
                            </div>
                            <div>
                              <strong>Transaction Type:</strong> Credit (+)
                            </div>
                            <div>
                              <strong>Amount:</strong> ₹
                              {formData.amountReceived
                                ? parseFloat(
                                    formData.amountReceived
                                  ).toLocaleString("en-IN")
                                : "0.00"}
                            </div>
                            <div>
                              <strong>Description:</strong> Payment received
                              from {party.name}
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                )}

              <Row>
                <Col className="text-center">
                  <Button
                    type="button"
                    onClick={resetForm}
                    disabled={isSubmitting}
                    variant="outline-warning"
                    className="me-3"
                    style={{minWidth: "120px"}}
                  >
                    <FontAwesomeIcon icon={faPlus} className="me-2" />
                    Reset
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      backgroundColor: "#6f42c1",
                      borderColor: "#6f42c1",
                      minWidth: "120px",
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faSave} className="me-2" />
                        Save Payment
                      </>
                    )}
                  </Button>
                </Col>
              </Row>
            </Form>
          </div>

          {showInvoicePanel && (
            <div
              className="bg-light border-start"
              style={{
                flex: "0 0 45%",
                maxHeight: "600px",
                overflowY: "auto",
              }}
            >
              <div
                className="p-3 text-white d-flex justify-content-between align-items-center"
                style={{backgroundColor: "#6f42c1"}}
              >
                <h6 className="mb-0 d-flex align-items-center">
                  <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                  Pending Invoices
                  {pendingInvoices.length > 0 && (
                    <Badge bg="light" text="dark" className="ms-2">
                      {pendingInvoices.length}
                    </Badge>
                  )}
                  {/* ✅ NEW: Show DayBook indicator in panel header */}
                  {isDayBookContext && (
                    <Badge bg="success" className="ms-2 small">
                      DayBook Auto-Selected
                    </Badge>
                  )}
                </h6>
                <Button
                  variant="light"
                  size="sm"
                  onClick={handleRefreshInvoices}
                  disabled={isLoadingInvoices}
                  title="Refresh invoice list"
                >
                  <FontAwesomeIcon
                    icon={faRefresh}
                    className={isLoadingInvoices ? "fa-spin" : ""}
                  />
                </Button>
              </div>

              <div className="p-3">
                {isLoadingInvoices ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" style={{color: "#6f42c1"}} />
                    <p className="mt-3 text-muted">Loading invoices...</p>
                  </div>
                ) : pendingInvoices.length > 0 ? (
                  <div>
                    {pendingInvoices.map((invoice, index) => {
                      const dueAmount = parseFloat(invoice.dueAmount || 0);
                      const isSelected =
                        selectedInvoice &&
                        (selectedInvoice._id || selectedInvoice.id) ===
                          (invoice._id || invoice.id);
                      // ✅ NEW: Check if this is the DayBook pre-selected invoice
                      const isDayBookInvoice =
                        isDayBookContext &&
                        initialSale &&
                        (invoice._id || invoice.id) ===
                          (initialSale._id || initialSale.id);

                      return (
                        <Card
                          key={invoice._id || invoice.id || index}
                          className={`mb-2 ${
                            isSelected ? "border-3" : "border-light"
                          }`}
                          style={{
                            cursor: "pointer",
                            borderColor: isSelected ? "#6f42c1" : undefined,
                            // ✅ NEW: Highlight DayBook invoice
                            backgroundColor: isDayBookInvoice
                              ? "#f8f9fa"
                              : undefined,
                          }}
                          onClick={() => handleInvoiceSelection(invoice)}
                        >
                          <Card.Body className="p-3">
                            <div className="d-flex justify-content-between align-items-start">
                              <div className="flex-grow-1">
                                <h6 className="mb-1 fw-bold">
                                  {invoice.orderNumber ||
                                    invoice.saleNumber ||
                                    invoice.invoiceNumber ||
                                    `INV-${index + 1}`}
                                  {isSelected && (
                                    <Badge bg="success" className="ms-2 small">
                                      Selected
                                    </Badge>
                                  )}
                                  {/* ✅ NEW: Show DayBook badge */}
                                  {isDayBookInvoice && (
                                    <Badge bg="info" className="ms-2 small">
                                      DayBook
                                    </Badge>
                                  )}
                                </h6>
                                <div className="small text-muted mb-2">
                                  <FontAwesomeIcon
                                    icon={faCalendar}
                                    className="me-1"
                                  />
                                  {invoice.orderDate || invoice.invoiceDate
                                    ? new Date(
                                        invoice.orderDate || invoice.invoiceDate
                                      ).toLocaleDateString("en-IN")
                                    : "N/A"}
                                </div>
                                <div className="fw-bold text-danger">
                                  <FontAwesomeIcon
                                    icon={faRupeeSign}
                                    className="me-1"
                                  />
                                  Due: ₹{dueAmount.toLocaleString("en-IN")}
                                </div>
                                <div className="mt-1">
                                  <Badge
                                    bg={
                                      invoice.paymentStatus === "paid"
                                        ? "success"
                                        : invoice.paymentStatus === "partial"
                                        ? "warning"
                                        : "danger"
                                    }
                                    className="small"
                                  >
                                    {invoice.paymentStatus || "pending"}
                                  </Badge>
                                </div>
                              </div>
                              <Button
                                variant={
                                  isSelected ? "success" : "outline-primary"
                                }
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInvoiceSelection(invoice);
                                }}
                                style={
                                  !isSelected
                                    ? {
                                        borderColor: "#6f42c1",
                                        color: "#6f42c1",
                                      }
                                    : undefined
                                }
                              >
                                {isSelected ? (
                                  <>
                                    <FontAwesomeIcon
                                      icon={faCheckCircle}
                                      className="me-1"
                                    />
                                    Selected
                                  </>
                                ) : (
                                  "Select"
                                )}
                              </Button>
                            </div>
                          </Card.Body>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      className="fs-1 text-muted mb-3"
                    />
                    <h6 className="text-muted">No Pending Invoices</h6>
                    <p className="text-muted small">
                      All invoices are fully paid.
                      <br />
                      You can make an advance payment instead.
                    </p>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          paymentType: "advance",
                        }));
                        setShowInvoicePanel(false);
                        setIsDayBookContext(false); // ✅ NEW: Reset DayBook context
                      }}
                      style={{
                        borderColor: "#6f42c1",
                        color: "#6f42c1",
                      }}
                    >
                      Switch to Advance Payment
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal.Body>
    </Modal>
  );
}

export default PayIn;
