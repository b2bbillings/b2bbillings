import React, { useState, useEffect } from 'react';
import { Container } from 'react-bootstrap';
import PurchaseBillsHeader from './PurchaseBill/PurchaseBillsHeader';
import PurchaseBillsFilter from './PurchaseBill/PurchaseBillsFilter';
import PurchaseBillsSummary from './PurchaseBill/PurchaseBillsSummary';
import PurchaseBillsTable from './PurchaseBill/PurchaseBillsTable';
import './PurchaseBills.css';

function PurchaseBills() {
    // State management
    const [dateRange, setDateRange] = useState('This Month');
    const [startDate, setStartDate] = useState(new Date(2025, 5, 1));
    const [endDate, setEndDate] = useState(new Date(2025, 5, 30));
    const [selectedFirm, setSelectedFirm] = useState('ALL FIRMS');
    const [searchTerm, setSearchTerm] = useState('');
    const [transactions, setTransactions] = useState([
        {
            id: 1,
            date: '03/06/2025',
            invoiceNo: '',
            partyName: 'IT Solution',
            paymentType: 'Cash',
            amount: 122222,
            balanceDue: 0,
            status: 'Paid'
        }
    ]);

    // Summary data
    const [summary, setSummary] = useState({
        paid: 122222.00,
        unpaid: 0.00,
        total: 122222.00
    });

    // Static options
    const dateRangeOptions = [
        'Today',
        'Yesterday',
        'This Week',
        'This Month',
        'Last Month',
        'This Quarter',
        'This Year',
        'Custom Range'
    ];

    const firmOptions = [
        'ALL FIRMS',
        'Main Branch',
        'Secondary Branch',
        'IT Solution'
    ];

    // Handle date range change
    const handleDateRangeChange = (range) => {
        setDateRange(range);

        const today = new Date();
        let start, end;

        switch (range) {
            case 'Today':
                start = end = new Date();
                break;
            case 'Yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                start = end = yesterday;
                break;
            case 'This Week':
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                start = startOfWeek;
                end = new Date();
                break;
            case 'This Month':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'Last Month':
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                end = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            case 'This Quarter':
                const quarter = Math.floor(today.getMonth() / 3);
                start = new Date(today.getFullYear(), quarter * 3, 1);
                end = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
                break;
            case 'This Year':
                start = new Date(today.getFullYear(), 0, 1);
                end = new Date(today.getFullYear(), 11, 31);
                break;
            default:
                start = new Date(2025, 5, 1);
                end = new Date(2025, 5, 30);
        }

        setStartDate(start);
        setEndDate(end);
    };

    // Handle date input changes
    const handleStartDateChange = (e) => {
        const newDate = new Date(e.target.value);
        setStartDate(newDate);
        setDateRange('Custom Range');
    };

    const handleEndDateChange = (e) => {
        const newDate = new Date(e.target.value);
        setEndDate(newDate);
        setDateRange('Custom Range');
    };

    // Filter transactions based on search
    const filteredTransactions = transactions.filter(transaction =>
        transaction.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.invoiceNo && transaction.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Event handlers
    const handleUploadBill = () => {
        console.log('Upload Bill clicked');
    };

    const handleAddPurchase = () => {
        console.log('Add Purchase clicked');
    };

    const handleExcelExport = () => {
        console.log('Excel Export clicked');
    };

    const handlePrint = () => {
        window.print();
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleViewTransaction = (transaction) => {
        console.log('View transaction:', transaction);
    };

    const handleEditTransaction = (transaction) => {
        console.log('Edit transaction:', transaction);
    };

    const handleDeleteTransaction = (transaction) => {
        if (window.confirm('Are you sure you want to delete this transaction?')) {
            setTransactions(prev => prev.filter(t => t.id !== transaction.id));
        }
    };

    const handlePrintTransaction = (transaction) => {
        console.log('Print transaction:', transaction);
    };

    const handleShareTransaction = (transaction) => {
        console.log('Share transaction:', transaction);
    };

    return (
        <Container fluid className="purchase-bills-container p-4">
            <PurchaseBillsHeader
                onUploadBill={handleUploadBill}
                onAddPurchase={handleAddPurchase}
            />

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
            />

            <PurchaseBillsSummary summary={summary} />

            <PurchaseBillsTable
                transactions={filteredTransactions}
                searchTerm={searchTerm}
                onSearchChange={handleSearchChange}
                onViewTransaction={handleViewTransaction}
                onEditTransaction={handleEditTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onPrintTransaction={handlePrintTransaction}
                onShareTransaction={handleShareTransaction}
            />
        </Container>
    );
}

export default PurchaseBills;