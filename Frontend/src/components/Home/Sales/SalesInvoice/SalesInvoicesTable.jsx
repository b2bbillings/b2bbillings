import React, { useState, useCallback, useMemo } from 'react';
import { Button, Table, Badge, Dropdown, InputGroup, Form, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSearch,
    faFileExcel,
    faPrint,
    faSort,
    faEllipsisV,
    faEye,
    faEdit,
    faTrash,
    faShare,
    faArrowUp,
    faArrowDown,
    faExchangeAlt,
    faFileInvoice,
    faDownload,
    faPlus,
    faCheckCircle,
    faExclamationTriangle,
    faBan,
    faClock
} from '@fortawesome/free-solid-svg-icons';

function SalesInvoicesTable({
    transactions = [],
    onViewTransaction,
    onEditTransaction,
    onDeleteTransaction,
    onPrintTransaction,
    onShareTransaction,
    onConvertTransaction,
    onDownloadTransaction,
    onCreateNew,
    mode = 'invoices',
    documentType = 'invoice',
    companyId,
    currentUser,
    addToast,
    labels,
    isQuotationsMode
}) {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState('');
    const [sortDirection, setSortDirection] = useState('asc');

    const isQuotationMode = useMemo(() => {
        return isQuotationsMode || mode === 'quotations' || documentType === 'quotation';
    }, [isQuotationsMode, mode, documentType]);

    const customStyles = {
        tableResponsive: {
            maxHeight: '70vh',
            overflowY: 'auto'
        },
        stickyTop: {
            position: 'sticky',
            top: 0,
            zIndex: 1020
        }
    };

    // ✅ ENHANCED: Helper function to determine transaction status and available actions
    const getTransactionStatus = useCallback((transaction) => {
        const status = (transaction.status || '').toLowerCase();
        const quotationStatus = (transaction.quotationStatus || '').toLowerCase();
        const balance = parseFloat(transaction.balance || 0);
        const amount = parseFloat(transaction.amount || 0);
        
        const effectiveStatus = status || quotationStatus || 'unknown';
        
        const isCompleted = effectiveStatus === 'completed';
        const isCancelled = ['cancelled', 'canceled', 'deleted', 'void'].includes(effectiveStatus);
        const isDraft = effectiveStatus === 'draft';
        const isPending = effectiveStatus === 'pending';
        const isApproved = effectiveStatus === 'approved';
        const isConverted = effectiveStatus === 'converted' || transaction.convertedToInvoice;
        
        const isPaid = balance === 0 && amount > 0;
        const isPartiallyPaid = balance > 0 && balance < amount;
        const isOverdue = false; // You can implement overdue logic based on due date
        
        return {
            status: effectiveStatus,
            isCompleted,
            isCancelled,
            isDraft,
            isPending,
            isApproved,
            isConverted,
            isPaid,
            isPartiallyPaid,
            isOverdue,
            
            // Action permissions
            canView: true,
            canEdit: !isCancelled && !isConverted,
            canDelete: !isCancelled && !isConverted,
            canPrint: !isCancelled,
            canShare: !isCancelled,
            canDownload: !isCancelled,
            canConvert: isQuotationMode && !isCancelled && !isConverted && (isApproved || isCompleted),
            
            // Warning flags
            shouldWarnOnDelete: isPaid && isCompleted,
            shouldWarnOnEdit: isPaid && isCompleted,
            deleteWarning: isPaid && isCompleted ? 'Fully Paid' : null
        };
    }, [isQuotationMode]);

    // ✅ ENHANCED: Status badge component
    const getStatusBadge = useCallback((transaction) => {
        const statusInfo = getTransactionStatus(transaction);
        let variant = 'secondary';
        let text = statusInfo.status;
        let icon = null;
        
        if (statusInfo.isCancelled) {
            variant = 'danger';
            text = 'Cancelled';
            icon = faBan;
        } else if (statusInfo.isConverted) {
            variant = 'info';
            text = 'Converted';
            icon = faExchangeAlt;
        } else if (statusInfo.isPaid) {
            variant = 'success';
            text = 'Paid';
            icon = faCheckCircle;
        } else if (statusInfo.isPartiallyPaid) {
            variant = 'warning';
            text = 'Partial';
            icon = faExclamationTriangle;
        } else if (statusInfo.isCompleted) {
            variant = 'success';
            text = 'Completed';
            icon = faCheckCircle;
        } else if (statusInfo.isApproved) {
            variant = 'success';
            text = 'Approved';
            icon = faCheckCircle;
        } else if (statusInfo.isPending) {
            variant = 'warning';
            text = 'Pending';
            icon = faClock;
        } else if (statusInfo.isDraft) {
            variant = 'secondary';
            text = 'Draft';
            icon = faEdit;
        }
        
        return (
            <Badge 
                bg={variant} 
                className="d-flex align-items-center gap-1"
                style={{ fontSize: '0.75rem', minWidth: '70px', justifyContent: 'center' }}
            >
                {icon && <FontAwesomeIcon icon={icon} style={{ fontSize: '0.7rem' }} />}
                {text.charAt(0).toUpperCase() + text.slice(1)}
            </Badge>
        );
    }, [getTransactionStatus]);

    const getTitle = () => {
        return isQuotationMode ? 'Quotations Management' : 'Sales Invoices Management';
    };

    const getSearchPlaceholder = () => {
        return isQuotationMode ? 'Search quotations by party, number, type...' : 'Search invoices by party, number, type...';
    };

    const filteredTransactions = transactions.filter(transaction =>
        transaction.partyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.invoiceNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.quotationNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.transaction?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.paymentType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.employeeName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatCurrency = (amount) => {
        if (!amount && amount !== 0) return '₹0';
        const numAmount = parseFloat(amount);

        if (numAmount >= 10000000) {
            return `₹${(numAmount / 10000000).toFixed(1)}Cr`;
        } else if (numAmount >= 100000) {
            return `₹${(numAmount / 100000).toFixed(1)}L`;
        } else if (numAmount >= 1000) {
            return `₹${(numAmount / 1000).toFixed(1)}K`;
        }
        return `₹${Math.round(numAmount)}`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
        });
    };

    const getTransactionIcon = (type) => {
        switch (type?.toLowerCase()) {
            case 'sale': return '💰';
            case 'gst invoice': return '📋';
            case 'purchase': return '🛒';
            case 'return': return '↩️';
            case 'payment': return '💳';
            case 'quotation': return '📝';
            default: return '📄';
        }
    };

    const getPaymentTypeVariant = (paymentType) => {
        switch (paymentType?.toLowerCase()) {
            case 'cash': return 'success';
            case 'credit': return 'warning';
            case 'online': return 'info';
            case 'cheque': return 'secondary';
            default: return 'light';
        }
    };

    const getTransactionVariant = (transaction) => {
        switch (transaction?.toLowerCase()) {
            case 'sale': return 'success';
            case 'gst invoice': return 'primary';
            case 'purchase': return 'info';
            case 'return': return 'danger';
            case 'payment': return 'warning';
            case 'quotation': return 'info';
            default: return 'light';
        }
    };

    const calculateDisplayAmounts = (transaction) => {
        const baseAmount = parseFloat(transaction.amount || 0);
        const cgst = parseFloat(transaction.cgst || 0);
        const sgst = parseFloat(transaction.sgst || 0);
        const totalTax = cgst + sgst;
        const displayBalance = parseFloat(transaction.balance || 0);

        return {
            amount: baseAmount,
            balance: displayBalance,
            cgst: cgst,
            sgst: sgst,
            totalTax: totalTax,
            baseAmount: baseAmount - totalTax
        };
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (field) => {
        if (sortField !== field) {
            return <FontAwesomeIcon icon={faSort} className="ms-1 text-muted" size="xs" />;
        }
        return (
            <FontAwesomeIcon
                icon={sortDirection === 'asc' ? faArrowUp : faArrowDown}
                className={`ms-1 ${isQuotationMode ? 'text-info' : 'text-primary'}`}
                size="xs"
            />
        );
    };

    // Handle view transaction
    const handleViewTransaction = (transaction) => {
        if (onViewTransaction) {
            onViewTransaction(transaction);
        }
    };

    // Handle edit transaction
    const handleEditTransaction = (transaction) => {
        const statusInfo = getTransactionStatus(transaction);
        
        if (!statusInfo.canEdit) {
            const reason = statusInfo.isCancelled ? 'cancelled' : 
                         statusInfo.isConverted ? 'already converted' : 'not editable';
            addToast?.(`Cannot edit ${reason} ${isQuotationMode ? 'quotation' : 'invoice'}`, 'warning');
            return;
        }

        if (statusInfo.shouldWarnOnEdit) {
            const confirmed = window.confirm(
                `⚠️ WARNING: This ${isQuotationMode ? 'quotation' : 'invoice'} is fully paid.\n\n` +
                `Editing it may create accounting discrepancies.\n\n` +
                `Do you want to continue?`
            );
            if (!confirmed) return;
        }

        if (onEditTransaction) {
            onEditTransaction(transaction);
        } else {
            const transactionId = transaction.id || transaction._id;
            const basePath = isQuotationMode ? 'quotations' : 'sales';
            const editPath = `/companies/${companyId}/${basePath}/edit/${transactionId}`;
            navigate(editPath, { replace: false });
        }
    };

    // Handle create new transaction
    const handleCreateNew = () => {
        if (onCreateNew) {
            onCreateNew();
        } else {
            const basePath = isQuotationMode ? 'quotations' : 'sales';
            const createPath = `/companies/${companyId}/${basePath}/add`;
            navigate(createPath);
        }
    };

    // ✅ ENHANCED: Handle delete with comprehensive validation
    const handleDeleteTransaction = async (transaction) => {
        const documentName = isQuotationMode ? 'quotation' : 'invoice';
        const transactionId = transaction.id || transaction._id;
        const documentNumber = transaction.invoiceNo || transaction.quotationNumber || 'this transaction';
        const statusInfo = getTransactionStatus(transaction);

        console.log('🗑️ Delete attempt for transaction:', transactionId, 'Status:', statusInfo);

        // ✅ Pre-validation: Check if transaction can be deleted
        if (!statusInfo.canDelete) {
            let reason = 'unknown reason';
            if (statusInfo.isCancelled) {
                reason = 'it has already been cancelled';
            } else if (statusInfo.isConverted) {
                reason = 'it has been converted to an invoice';
            }
            
            addToast?.(`Cannot delete this ${documentName} because ${reason}.`, 'warning');
            return;
        }

        // ✅ Special warning for fully paid transactions
        if (statusInfo.shouldWarnOnDelete) {
            const confirmForce = window.confirm(
                `⚠️ CRITICAL WARNING: This ${documentName} is completed and fully paid!\n\n` +
                `Deleting it will:\n` +
                `• Create accounting discrepancies\n` +
                `• Affect your financial reports\n` +
                `• Require manual reconciliation\n` +
                `• May violate audit requirements\n\n` +
                `RECOMMENDATION: Create a return/credit note instead.\n\n` +
                `Are you absolutely sure you want to DELETE this paid ${documentName}?`
            );
            
            if (!confirmForce) {
                addToast?.(`Deletion cancelled. Consider creating a return/credit note instead.`, 'info');
                return;
            }
        }

        // ✅ Enhanced confirmation dialog
        const confirmDelete = window.confirm(
            `Are you sure you want to delete ${documentName} ${documentNumber}?\n\n` +
            `Current Status: ${statusInfo.status.toUpperCase()}\n` +
            `Amount: ₹${(transaction.amount || 0).toLocaleString()}\n` +
            `Balance: ₹${(transaction.balance || 0).toLocaleString()}\n` +
            `${statusInfo.shouldWarnOnDelete ? '⚠️ FULLY PAID TRANSACTION\n' : ''}` +
            `\nThis will:\n` +
            `• Cancel the ${documentName}\n` +
            `• Restore stock quantities\n` +
            `• Mark payments as refunded if applicable\n` +
            `${statusInfo.shouldWarnOnDelete ? '• Create accounting discrepancies\n' : ''}` +
            `\nThis action cannot be undone.`
        );

        if (confirmDelete) {
            try {
                console.log('🗑️ Proceeding with deletion:', transactionId);

                if (onDeleteTransaction) {
                    // Show loading state
                    addToast?.(`Deleting ${documentName}...`, 'info');
                    
                    // Call parent delete handler
                    const result = await onDeleteTransaction(transaction);
                    
                    if (result && result.success !== false) {
                        // Success message will be shown by parent component
                        console.log('✅ Delete successful:', result);
                    } else {
                        throw new Error(result?.error || result?.message || 'Delete operation failed');
                    }
                } else {
                    addToast?.('Delete functionality not implemented', 'warning');
                }
            } catch (error) {
                console.error('❌ Error deleting transaction:', error);
                
                // ✅ Enhanced error handling
                let errorMessage = `Failed to delete ${documentName}`;
                
                if (error.message?.includes('already cancelled') || error.message?.includes('already canceled')) {
                    errorMessage = `This ${documentName} has already been cancelled.`;
                } else if (error.message?.includes('completed and fully paid')) {
                    errorMessage = `Cannot delete completed and fully paid ${documentName}s. Please create a return/refund instead.`;
                } else if (error.message?.includes('not found')) {
                    errorMessage = `${documentName.charAt(0).toUpperCase() + documentName.slice(1)} not found. It may have already been deleted.`;
                } else if (error.message?.includes('has payments')) {
                    errorMessage = `Cannot delete ${documentName} with recorded payments. Please refund payments first.`;
                } else if (error.message?.includes('converted')) {
                    errorMessage = `Cannot delete ${documentName} that has been converted to an invoice.`;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                addToast?.(errorMessage, 'error');
            }
        }
    };

    // Handle convert with validation
    const handleConvertTransaction = (transaction) => {
        const statusInfo = getTransactionStatus(transaction);
        
        if (!statusInfo.canConvert) {
            let reason = 'unknown reason';
            if (statusInfo.isCancelled) {
                reason = 'it is cancelled';
            } else if (statusInfo.isConverted) {
                reason = 'it has already been converted';
            } else if (!isQuotationMode) {
                reason = 'it is not a quotation';
            }
            
            addToast?.(`Cannot convert this quotation because ${reason}.`, 'warning');
            return;
        }

        const documentNumber = transaction.quotationNumber || transaction.invoiceNo;
        if (window.confirm(`Convert quotation ${documentNumber} to an invoice?\n\nThis will create a new sales invoice and mark the quotation as converted.`)) {
            if (onConvertTransaction) {
                onConvertTransaction(transaction);
            } else {
                addToast?.('Convert functionality not implemented', 'warning');
            }
        }
    };

    // ✅ ENHANCED: Render action buttons with status-based visibility
    const renderActionButtons = useCallback((transaction) => {
        const statusInfo = getTransactionStatus(transaction);
        
        return (
            <div className="d-flex gap-1 justify-content-center align-items-center">
                {/* Edit Button - Hide if cannot edit */}
                {statusInfo.canEdit && (
                    <Button
                        variant={statusInfo.shouldWarnOnEdit ? "outline-warning" : "outline-warning"}
                        size="sm"
                        title={statusInfo.shouldWarnOnEdit ? "Edit (Paid - Use Caution)" : "Edit"}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleEditTransaction(transaction);
                        }}
                        style={{ 
                            minWidth: '32px', 
                            height: '32px',
                            opacity: statusInfo.shouldWarnOnEdit ? 0.8 : 1
                        }}
                    >
                        <FontAwesomeIcon icon={faEdit} size="xs" />
                        {statusInfo.shouldWarnOnEdit && (
                            <small className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning">
                                !
                            </small>
                        )}
                    </Button>
                )}

                {/* Convert Button - Only for quotations that can be converted */}
                {statusInfo.canConvert && (
                    <Button
                        variant="outline-success"
                        size="sm"
                        title="Convert to Invoice"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleConvertTransaction(transaction);
                        }}
                        className="me-1"
                        style={{ minWidth: '32px', height: '32px' }}
                    >
                        <FontAwesomeIcon icon={faExchangeAlt} size="xs" />
                    </Button>
                )}

                {/* Print Button - Hide if cancelled */}
                {statusInfo.canPrint && (
                    <Button
                        variant="outline-primary"
                        size="sm"
                        title="Print"
                        onClick={(e) => {
                            e.stopPropagation();
                            onPrintTransaction && onPrintTransaction(transaction);
                        }}
                        style={{ minWidth: '32px', height: '32px' }}
                    >
                        <FontAwesomeIcon icon={faPrint} size="xs" />
                    </Button>
                )}

                {/* Dropdown Menu */}
                <Dropdown align="end">
                    <Dropdown.Toggle
                        variant="outline-secondary"
                        size="sm"
                        title="More Actions"
                        style={{
                            minWidth: '32px',
                            height: '32px',
                            border: '1px solid #6c757d',
                            background: 'white',
                            opacity: statusInfo.isCancelled ? 0.6 : 1
                        }}
                        className="d-flex align-items-center justify-content-center"
                        id={`dropdown-${transaction.id || transaction._id}`}
                    >
                        <FontAwesomeIcon icon={faEllipsisV} size="xs" />
                    </Dropdown.Toggle>

                    <Dropdown.Menu
                        style={{
                            minWidth: '200px',
                            zIndex: 1050,
                            boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
                            border: '1px solid rgba(0,0,0,.15)'
                        }}
                    >
                        {/* View Details - Always available */}
                        <Dropdown.Item
                            onClick={(e) => {
                                e.stopPropagation();
                                handleViewTransaction(transaction);
                            }}
                            className="d-flex align-items-center py-2"
                        >
                            <FontAwesomeIcon icon={faEye} className="me-2 text-primary" />
                            <span>View Details</span>
                        </Dropdown.Item>

                        {/* Status indicator */}
                        <Dropdown.Item disabled className="d-flex align-items-center py-1">
                            <small className="text-muted">Status: </small>
                            <div className="ms-2">
                                {getStatusBadge(transaction)}
                            </div>
                        </Dropdown.Item>

                        {/* Divider if more actions available */}
                        {(statusInfo.canEdit || statusInfo.canConvert || statusInfo.canDownload || statusInfo.canShare || statusInfo.canDelete) && (
                            <Dropdown.Divider />
                        )}

                        {/* Convert Action - Only for convertible quotations */}
                        {statusInfo.canConvert && (
                            <Dropdown.Item
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleConvertTransaction(transaction);
                                }}
                                className="d-flex align-items-center py-2 text-success"
                            >
                                <FontAwesomeIcon icon={faExchangeAlt} className="me-2" />
                                <span>Convert to Invoice</span>
                            </Dropdown.Item>
                        )}

                        {/* Download Action */}
                        {statusInfo.canDownload && onDownloadTransaction && (
                            <Dropdown.Item
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDownloadTransaction(transaction);
                                }}
                                className="d-flex align-items-center py-2"
                            >
                                <FontAwesomeIcon icon={faDownload} className="me-2 text-info" />
                                <span>Download</span>
                            </Dropdown.Item>
                        )}

                        {/* Share Action */}
                        {statusInfo.canShare && onShareTransaction && (
                            <Dropdown.Item
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onShareTransaction(transaction);
                                }}
                                className="d-flex align-items-center py-2"
                            >
                                <FontAwesomeIcon icon={faShare} className="me-2 text-info" />
                                <span>Share</span>
                            </Dropdown.Item>
                        )}

                        {/* Delete Action - Only if can delete */}
                        {statusInfo.canDelete && (
                            <>
                                <Dropdown.Divider />
                                <Dropdown.Item
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteTransaction(transaction);
                                    }}
                                    className="d-flex align-items-center py-2 text-danger"
                                    style={{
                                        opacity: statusInfo.shouldWarnOnDelete ? 0.8 : 1
                                    }}
                                >
                                    <FontAwesomeIcon icon={faTrash} className="me-2" />
                                    <div>
                                        <span>Delete {isQuotationMode ? 'Quotation' : 'Invoice'}</span>
                                        {statusInfo.deleteWarning && (
                                            <small className="d-block text-warning" style={{ fontSize: '0.75rem' }}>
                                                ⚠️ {statusInfo.deleteWarning}
                                            </small>
                                        )}
                                    </div>
                                </Dropdown.Item>
                            </>
                        )}

                        {/* Show message for cancelled/non-editable transactions */}
                        {statusInfo.isCancelled && (
                            <>
                                <Dropdown.Divider />
                                <Dropdown.Item disabled className="text-muted text-center">
                                    <small>
                                        <FontAwesomeIcon icon={faBan} className="me-1" />
                                        Transaction Cancelled
                                    </small>
                                </Dropdown.Item>
                            </>
                        )}

                        {statusInfo.isConverted && !statusInfo.isCancelled && (
                            <>
                                <Dropdown.Divider />
                                <Dropdown.Item disabled className="text-muted text-center">
                                    <small>
                                        <FontAwesomeIcon icon={faExchangeAlt} className="me-1" />
                                        Already Converted
                                    </small>
                                </Dropdown.Item>
                            </>
                        )}
                    </Dropdown.Menu>
                </Dropdown>
            </div>
        );
    }, [getTransactionStatus, getStatusBadge, handleEditTransaction, handleConvertTransaction, handleDeleteTransaction, isQuotationMode, onPrintTransaction, onDownloadTransaction, onShareTransaction]);

    return (
        <Card className="border-0 shadow-sm">
            <Card.Header
                className={`${isQuotationMode ? 'bg-info' : 'bg-primary'} text-white border-0`}
                style={{ padding: '20px 25px' }}
            >
                <div className="row align-items-center">
                    <div className="col-md-6">
                        <div className="d-flex align-items-center">
                            <FontAwesomeIcon
                                icon={isQuotationMode ? faFileInvoice : faFileExcel}
                                className="me-3"
                                size="lg"
                            />
                            <div>
                                <h5 className="mb-1 fw-bold">{getTitle()}</h5>
                                <small className="opacity-75">
                                    📊 {filteredTransactions.length} records found
                                    {searchQuery && ` matching "${searchQuery}"`}
                                </small>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="row g-2">
                            <div className="col-md-6">
                                <InputGroup size="sm">
                                    <InputGroup.Text className="bg-white bg-opacity-25 border-white border-opacity-25 text-white">
                                        <FontAwesomeIcon icon={faSearch} />
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder={getSearchPlaceholder()}
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="border-white border-opacity-25 bg-white bg-opacity-25 text-white placeholder-white-50"
                                        style={{
                                            color: 'white',
                                            '::placeholder': {
                                                color: 'rgba(255, 255, 255, 0.7)'
                                            }
                                        }}
                                    />
                                </InputGroup>
                            </div>
                            <div className="col-md-6">
                                <div className="d-flex gap-1">
                                    <Button
                                        variant="outline-light"
                                        size="sm"
                                        title={`Create New ${isQuotationMode ? 'Quotation' : 'Invoice'}`}
                                        className="d-flex align-items-center"
                                        onClick={handleCreateNew}
                                    >
                                        <FontAwesomeIcon icon={faPlus} className="me-1" />
                                        <span className="d-none d-md-inline">New</span>
                                    </Button>
                                    <Button
                                        variant="outline-light"
                                        size="sm"
                                        title="Export to Excel"
                                        className="d-flex align-items-center"
                                    >
                                        <FontAwesomeIcon icon={faFileExcel} />
                                    </Button>
                                    <Button
                                        variant="outline-light"
                                        size="sm"
                                        title="Print All"
                                        className="d-flex align-items-center"
                                    >
                                        <FontAwesomeIcon icon={faPrint} />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Card.Header>

            <Card.Body className="p-0">
                <div
                    className="table-responsive"
                    style={customStyles.tableResponsive}
                >
                    <Table className="mb-0 table-hover table-sm">
                        <thead
                            className="table-light"
                            style={customStyles.stickyTop}
                        >
                            <tr>
                                <th
                                    className={`border-0 ${isQuotationMode ? 'text-info' : 'text-primary'} fw-semibold`}
                                    role="button"
                                    onClick={() => handleSort('date')}
                                    style={{ cursor: 'pointer', padding: '12px 8px' }}
                                >
                                    <div className="d-flex align-items-center">
                                        <small>Date</small>
                                        {getSortIcon('date')}
                                    </div>
                                </th>
                                <th
                                    className={`border-0 ${isQuotationMode ? 'text-info' : 'text-primary'} fw-semibold`}
                                    role="button"
                                    onClick={() => handleSort('invoiceNo')}
                                    style={{ cursor: 'pointer', padding: '12px 8px' }}
                                >
                                    <div className="d-flex align-items-center">
                                        <small>{isQuotationMode ? 'Quote #' : 'Invoice #'}</small>
                                        {getSortIcon('invoiceNo')}
                                    </div>
                                </th>
                                <th
                                    className={`border-0 ${isQuotationMode ? 'text-info' : 'text-primary'} fw-semibold`}
                                    role="button"
                                    onClick={() => handleSort('partyName')}
                                    style={{ cursor: 'pointer', padding: '12px 8px' }}
                                >
                                    <div className="d-flex align-items-center">
                                        <small>Customer</small>
                                        {getSortIcon('partyName')}
                                    </div>
                                </th>
                                <th
                                    className={`border-0 ${isQuotationMode ? 'text-info' : 'text-primary'} fw-semibold`}
                                    role="button"
                                    onClick={() => handleSort('transaction')}
                                    style={{ cursor: 'pointer', padding: '12px 8px' }}
                                >
                                    <div className="d-flex align-items-center">
                                        <small>Type</small>
                                        {getSortIcon('transaction')}
                                    </div>
                                </th>
                                <th
                                    className={`border-0 ${isQuotationMode ? 'text-info' : 'text-primary'} fw-semibold`}
                                    style={{ padding: '12px 8px' }}
                                >
                                    <small>Status</small>
                                </th>
                                <th
                                    className={`border-0 ${isQuotationMode ? 'text-info' : 'text-primary'} fw-semibold`}
                                    role="button"
                                    onClick={() => handleSort('paymentType')}
                                    style={{ cursor: 'pointer', padding: '12px 8px' }}
                                >
                                    <div className="d-flex align-items-center">
                                        <small>Payment</small>
                                        {getSortIcon('paymentType')}
                                    </div>
                                </th>
                                <th
                                    className={`border-0 ${isQuotationMode ? 'text-info' : 'text-primary'} fw-semibold text-center`}
                                    role="button"
                                    onClick={() => handleSort('cgst')}
                                    style={{ cursor: 'pointer', padding: '12px 8px' }}
                                >
                                    <div className="d-flex align-items-center justify-content-center">
                                        <small>CGST</small>
                                        {getSortIcon('cgst')}
                                    </div>
                                </th>
                                <th
                                    className={`border-0 ${isQuotationMode ? 'text-info' : 'text-primary'} fw-semibold text-center`}
                                    role="button"
                                    onClick={() => handleSort('sgst')}
                                    style={{ cursor: 'pointer', padding: '12px 8px' }}
                                >
                                    <div className="d-flex align-items-center justify-content-center">
                                        <small>SGST</small>
                                        {getSortIcon('sgst')}
                                    </div>
                                </th>
                                <th
                                    className={`border-0 ${isQuotationMode ? 'text-info' : 'text-primary'} fw-semibold text-end`}
                                    role="button"
                                    onClick={() => handleSort('amount')}
                                    style={{ cursor: 'pointer', padding: '12px 8px' }}
                                >
                                    <div className="d-flex align-items-center justify-content-end">
                                        <small>Amount</small>
                                        {getSortIcon('amount')}
                                    </div>
                                </th>
                                <th
                                    className={`border-0 ${isQuotationMode ? 'text-info' : 'text-primary'} fw-semibold text-end`}
                                    role="button"
                                    onClick={() => handleSort('balance')}
                                    style={{ cursor: 'pointer', padding: '12px 8px' }}
                                >
                                    <div className="d-flex align-items-center justify-content-end">
                                        <small>Balance</small>
                                        {getSortIcon('balance')}
                                    </div>
                                </th>
                                <th className={`border-0 ${isQuotationMode ? 'text-info' : 'text-primary'} fw-semibold text-center`}
                                    style={{ padding: '12px 8px' }}>
                                    <small>Actions</small>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="text-center text-muted py-5 border-0">
                                        <div className="d-flex flex-column align-items-center">
                                            <div className="mb-3" style={{ fontSize: '4rem', opacity: '0.3' }}>
                                                {isQuotationMode ? '📝' : '📊'}
                                            </div>
                                            <h6 className="fw-semibold mb-2 text-secondary">
                                                {searchQuery
                                                    ? `No ${isQuotationMode ? 'quotations' : 'invoices'} match your search`
                                                    : `No ${isQuotationMode ? 'quotations' : 'invoices'} found`
                                                }
                                            </h6>
                                            <p className="text-muted mb-3">
                                                {searchQuery
                                                    ? 'Try adjusting your search terms or clear filters'
                                                    : `Create your first ${isQuotationMode ? 'quotation' : 'sales invoice'} to get started`
                                                }
                                            </p>
                                            <div className="d-flex gap-2">
                                                {searchQuery && (
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        onClick={() => setSearchQuery('')}
                                                    >
                                                        Clear Search
                                                    </Button>
                                                )}
                                                {!searchQuery && (
                                                    <Button
                                                        variant={isQuotationMode ? "info" : "primary"}
                                                        size="sm"
                                                        onClick={handleCreateNew}
                                                        className="d-flex align-items-center"
                                                    >
                                                        <FontAwesomeIcon icon={faPlus} className="me-2" />
                                                        Create {isQuotationMode ? 'Quotation' : 'Invoice'}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((transaction, index) => {
                                    const calculatedAmounts = calculateDisplayAmounts(transaction);
                                    const statusInfo = getTransactionStatus(transaction);

                                    return (
                                        <tr
                                            key={transaction.id || transaction._id || index}
                                            className={`align-middle ${statusInfo.isCancelled ? 'table-secondary' : ''}`}
                                            style={{
                                                transition: 'all 0.2s ease',
                                                cursor: 'pointer',
                                                opacity: statusInfo.isCancelled ? 0.7 : 1
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!statusInfo.isCancelled) {
                                                    e.currentTarget.style.backgroundColor = 'rgba(0, 123, 255, 0.05)';
                                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = statusInfo.isCancelled ? 'rgba(108, 117, 125, 0.2)' : 'transparent';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                            }}
                                            onClick={() => handleViewTransaction(transaction)}
                                        >
                                            {/* Date */}
                                            <td className="border-0" style={{ padding: '12px 8px' }}>
                                                <div className="d-flex align-items-center">
                                                    <div>
                                                        <div className="text-dark fw-medium">
                                                            <small>{formatDate(transaction.date)}</small>
                                                        </div>
                                                        {transaction.dueDate && (
                                                            <small className="text-muted d-block">
                                                                Due: {formatDate(transaction.dueDate)}
                                                            </small>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Invoice/Quote Number */}
                                            <td className="border-0" style={{ padding: '12px 8px' }}>
                                                <Badge
                                                    bg={statusInfo.isCancelled ? 'secondary' : (isQuotationMode ? 'info' : 'primary')}
                                                    className="fw-bold px-2 py-1"
                                                    style={{ 
                                                        fontSize: '0.75rem',
                                                        textDecoration: statusInfo.isCancelled ? 'line-through' : 'none'
                                                    }}
                                                >
                                                    {transaction.invoiceNo || transaction.quotationNumber}
                                                </Badge>
                                            </td>

                                            {/* Party Name with Conversion Status */}
                                            <td className="border-0" style={{ padding: '12px 8px' }}>
                                                <div>
                                                    <div className="fw-medium text-dark" title={transaction.partyName}>
                                                        <small>
                                                            {transaction.partyName?.length > 15
                                                                ? `${transaction.partyName.substring(0, 15)}...`
                                                                : transaction.partyName}
                                                        </small>
                                                    </div>
                                                    {transaction.partyPhone && (
                                                        <small className="text-muted d-block">
                                                            📞 {transaction.partyPhone.substring(0, 10)}
                                                        </small>
                                                    )}

                                                    {isQuotationMode && transaction.convertedToInvoice && (
                                                        <div className="mt-1">
                                                            <Badge
                                                                bg="success"
                                                                className="d-flex align-items-center w-fit-content"
                                                                style={{ fontSize: '0.65rem', width: 'fit-content' }}
                                                            >
                                                                <FontAwesomeIcon icon={faFileInvoice} className="me-1" size="xs" />
                                                                ✅ Converted
                                                            </Badge>
                                                            {transaction.invoiceNumber && (
                                                                <small className="text-success d-block fw-medium" style={{ fontSize: '0.7rem' }}>
                                                                    → INV: {transaction.invoiceNumber}
                                                                </small>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Transaction Type */}
                                            <td className="border-0" style={{ padding: '12px 8px' }}>
                                                <div className="d-flex align-items-center">
                                                    <span className="me-2" style={{ fontSize: '1.1rem' }}>
                                                        {getTransactionIcon(transaction.transaction)}
                                                    </span>
                                                    <Badge
                                                        bg={getTransactionVariant(transaction.transaction)}
                                                        className="text-capitalize"
                                                        style={{ fontSize: '0.7rem' }}
                                                    >
                                                        {transaction.transaction === 'gst invoice' ? 'GST' : transaction.transaction}
                                                    </Badge>
                                                </div>
                                            </td>

                                            {/* ✅ NEW: Status Column */}
                                            <td className="border-0 text-center" style={{ padding: '12px 8px' }}>
                                                {getStatusBadge(transaction)}
                                            </td>

                                            {/* Payment Type */}
                                            <td className="border-0" style={{ padding: '12px 8px' }}>
                                                <Badge
                                                    bg={getPaymentTypeVariant(transaction.paymentType)}
                                                    className="px-2 py-1"
                                                    style={{ fontSize: '0.7rem' }}
                                                >
                                                    {transaction.paymentType}
                                                </Badge>
                                            </td>

                                            {/* CGST */}
                                            <td className="border-0 text-center" style={{ padding: '12px 8px' }}>
                                                <div>
                                                    <div className="fw-semibold text-info">
                                                        <small>{formatCurrency(calculatedAmounts.cgst)}</small>
                                                    </div>
                                                    {transaction.cgstPercent && calculatedAmounts.cgst > 0 && (
                                                        <small className="text-muted">
                                                            ({transaction.cgstPercent}%)
                                                        </small>
                                                    )}
                                                </div>
                                            </td>

                                            {/* SGST */}
                                            <td className="border-0 text-center" style={{ padding: '12px 8px' }}>
                                                <div>
                                                    <div className="fw-semibold text-warning">
                                                        <small>{formatCurrency(calculatedAmounts.sgst)}</small>
                                                    </div>
                                                    {transaction.sgstPercent && calculatedAmounts.sgst > 0 && (
                                                        <small className="text-muted">
                                                            ({transaction.sgstPercent}%)
                                                        </small>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Total Amount */}
                                            <td className="border-0 text-end" style={{ padding: '12px 8px' }}>
                                                <div>
                                                    <div className={`fw-bold ${statusInfo.isCancelled ? 'text-muted' : 'text-success'}`}>
                                                        <small>{formatCurrency(calculatedAmounts.amount)}</small>
                                                    </div>
                                                    {calculatedAmounts.totalTax > 0 && (
                                                        <small className="text-muted">
                                                            +₹{Math.round(calculatedAmounts.totalTax)} tax
                                                        </small>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Balance */}
                                            <td className="border-0 text-end" style={{ padding: '12px 8px' }}>
                                                <div>
                                                    <div className={`fw-bold ${statusInfo.isCancelled ? 'text-muted' : 
                                                        calculatedAmounts.balance > 0 ? 'text-danger' : 
                                                        calculatedAmounts.balance < 0 ? 'text-success' : 'text-muted'}`}>
                                                        <small>{formatCurrency(Math.abs(calculatedAmounts.balance))}</small>
                                                    </div>
                                                    <small className={`${statusInfo.isCancelled ? 'text-muted' :
                                                        calculatedAmounts.balance > 0 ? 'text-danger' : 
                                                        calculatedAmounts.balance < 0 ? 'text-success' : 'text-muted'}`}>
                                                        {statusInfo.isCancelled ? '❌ Cancelled' :
                                                         calculatedAmounts.balance > 0 ? '⚠️ Due' : 
                                                         calculatedAmounts.balance < 0 ? '✅ Advance' : '✅ Paid'}
                                                    </small>
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td
                                                className="border-0 text-center position-relative"
                                                style={{ padding: '12px 8px' }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {renderActionButtons(transaction)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </Table>
                </div>

                {filteredTransactions.length > 0 && (
                    <Card.Footer className="bg-light border-0" style={{ padding: '15px 25px' }}>
                        <div className="row align-items-center">
                            <div className="col-md-6">
                                <small className="text-muted">
                                    📋 Showing <strong>{filteredTransactions.length}</strong> of <strong>{transactions.length}</strong> records
                                    {searchQuery && (
                                        <span className="ms-2">
                                            | 🔍 Filtered by: <strong>"{searchQuery}"</strong>
                                        </span>
                                    )}
                                </small>
                            </div>
                            <div className="col-md-6">
                                <div className="d-flex justify-content-end gap-2">
                                    <Button variant="outline-primary" size="sm" disabled>
                                        Previous
                                    </Button>
                                    <Button variant="outline-primary" size="sm" disabled>
                                        Next
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card.Footer>
                )}
            </Card.Body>
        </Card>
    );
}

export default SalesInvoicesTable;