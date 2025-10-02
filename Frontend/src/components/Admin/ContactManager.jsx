import React, { useState, useEffect, useCallback } from 'react';
import { contactService, contactHelpers } from '../../services/contactService';

// Icons (you can replace these with your preferred icon library)
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

const PhoneIcon = () => (
  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
  </svg>
);

const EmailIcon = () => (
  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ViewIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const ContactManager = () => {
  // State management
  const [contactsData, setContactsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState(null);

  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartyType, setSelectedPartyType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Selection for bulk operations
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // UI states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [selectedContactForDetails, setSelectedContactForDetails] = useState(null);
  const [expandedContacts, setExpandedContacts] = useState({});
  const [expandedIndividualContacts, setExpandedIndividualContacts] = useState(new Set());

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  // Test contact creation
  const createTestContact = async () => {
    try {
      setLoading(true);
      const testContact = {
        name: `Test Contact ${Date.now()}`,
        phone: `99${Date.now().toString().slice(-8)}`,
        email: `test${Date.now()}@example.com`,
        company: 'Test Company',
        partyType: 'customer',
        status: 'active',
        notes: 'Created via admin panel test button'
      };

      console.log('🧪 Creating test contact:', testContact);
      const result = await contactService.createContact(testContact);
      console.log('✅ Test contact creation result:', result);

      if (result.success) {
        showToast(`Test contact "${testContact.name}" created successfully!`, 'success');
        fetchContactsData(); // Refresh the data
      } else {
        showToast('Failed to create test contact', 'error');
      }
    } catch (error) {
      console.error('❌ Test contact creation failed:', error);
      showToast('Failed to create test contact: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch contacts data
  const fetchContactsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery || undefined,
        partyType: selectedPartyType || undefined,
        status: selectedStatus || undefined,
        addedBy: selectedUser || undefined
      };

      console.log('🔍 Fetching contacts with params:', params);
      console.log('🔍 API Base URL:', contactService);

      const [contactsResponse, statsResponse] = await Promise.all([
        contactService.getContactsByCompany(params),
        contactService.getContactStatistics()
      ]);

      console.log('📥 Contacts Response:', contactsResponse);
      console.log('📊 Statistics Response:', statsResponse);

      if (contactsResponse.success) {
        setContactsData(contactsResponse.data);
      } else {
        // Set empty data instead of throwing error for empty results
        setContactsData({ contactsGrouped: [], pagination: null });
        console.warn('No contacts found or API returned unsuccessfully:', contactsResponse.message);
      }

      if (statsResponse.success) {
        setStatistics(statsResponse.data);
      } else {
        // Set default statistics
        setStatistics({ totalStats: [{ totalContacts: 0, activeContacts: 0, thisMonth: 0, thisWeek: 0 }] });
        console.warn('No statistics found or API returned unsuccessfully:', statsResponse.message);
      }

    } catch (err) {
      console.error('Error fetching contacts:', err);
      
      // Instead of showing error, show empty state for better UX
      setContactsData({ contactsGrouped: [], pagination: null });
      setStatistics({ totalStats: [{ totalContacts: 0, activeContacts: 0, thisMonth: 0, thisWeek: 0 }] });
      
      // Still show toast but don't block the UI
      showToast('Unable to load contacts. Showing empty state.', 'warning');
      
      // Only set error for actual network/auth issues
      if (err.response?.status === 401) {
        setError('Authentication required. Please log in again.');
      } else if (err.code === 'NETWORK_ERROR') {
        setError('Network connection failed. Please check your connection.');
      }
      // For other errors, just log and show empty state
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery, selectedPartyType, selectedStatus, selectedUser]);

  // Initial load
  useEffect(() => {
    fetchContactsData();
  }, [fetchContactsData]);

  // Toast notification system
  const showToast = (message, type = 'info') => {
    const id = Date.now();
    const toast = { id, message, type };
    setToasts(prev => [...prev, toast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    switch (filterType) {
      case 'partyType':
        setSelectedPartyType(value);
        break;
      case 'status':
        setSelectedStatus(value);
        break;
      case 'user':
        setSelectedUser(value);
        break;
      default:
        break;
    }
    setCurrentPage(1);
  };

  // Handle contact selection
  const handleContactSelect = (contactId, isSelected) => {
    if (isSelected) {
      setSelectedContacts(prev => [...prev, contactId]);
    } else {
      setSelectedContacts(prev => prev.filter(id => id !== contactId));
      setSelectAll(false);
    }
  };

  // Handle select all
  const handleSelectAll = (isSelected) => {
    setSelectAll(isSelected);
    if (isSelected) {
      const allContactIds = contactsData?.contactsGrouped?.flatMap(group => 
        group.contacts.map(contact => contact._id)
      ) || [];
      setSelectedContacts(allContactIds);
    } else {
      setSelectedContacts([]);
    }
  };

  // Handle single contact delete
  const handleDeleteContact = async (contact) => {
    setContactToDelete(contact);
    setShowDeleteModal(true);
  };

  // Handle view contact details
  const handleViewContactDetails = (contact) => {
    setSelectedContactForDetails(contact);
    setShowContactDetails(true);
  };

  // Handle expand/collapse user groups
  const toggleUserExpansion = (userId) => {
    setExpandedContacts(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Handle expand/collapse contact
  const handleToggleContactExpansion = (contactId) => {
    setExpandedIndividualContacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!contactToDelete) return;

    try {
      setIsDeleting(true);
      
      const response = await contactService.deleteContact(contactToDelete._id);
      
      if (response.success) {
        showToast(`Contact "${contactToDelete.name}" deleted successfully`, 'success');
        fetchContactsData(); // Refresh data
        setSelectedContacts(prev => prev.filter(id => id !== contactToDelete._id));
      } else {
        throw new Error(response.message || 'Failed to delete contact');
      }
    } catch (err) {
      console.error('Error deleting contact:', err);
      showToast(err.message || 'Failed to delete contact', 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setContactToDelete(null);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedContacts.length === 0) {
      showToast('Please select contacts to delete', 'warning');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedContacts.length} selected contacts?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      
      const response = await contactService.bulkDeleteContacts(selectedContacts);
      
      if (response.success) {
        showToast(`${response.deletedCount} contacts deleted successfully`, 'success');
        fetchContactsData(); // Refresh data
        setSelectedContacts([]);
        setSelectAll(false);
      } else {
        throw new Error(response.message || 'Failed to delete contacts');
      }
    } catch (err) {
      console.error('Error bulk deleting contacts:', err);
      showToast(err.message || 'Failed to delete contacts', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle export
  const handleExport = () => {
    // For now, we'll create a simple CSV export
    if (!contactsData?.contactsGrouped) {
      showToast('No data to export', 'warning');
      return;
    }

    const allContacts = contactsData.contactsGrouped.flatMap(group => group.contacts);
    const csvHeaders = [
      'Name', 'Phone', 'Email', 'Company', 'Shop Name', 'Party Type', 
      'Priority', 'Status', 'Added By', 'Added Date'
    ];
    
    const csvRows = allContacts.map(contact => [
      contact.name || '',
      contact.phone || '',
      contact.email || '',
      contact.company || '',
      contact.shopName || '',
      contact.partyType || '',
      contact.priority || '',
      contact.status || '',
      contact.addedByName || '',
      new Date(contact.createdAt).toLocaleDateString()
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contacts_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    showToast('Contacts exported successfully', 'success');
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Get unique users for filter dropdown
  const getUniqueUsers = () => {
    if (!contactsData?.contactsGrouped) return [];
    return contactsData.contactsGrouped.map(group => ({
      id: group._id.userId,
      name: group._id.userName
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
        {/* Loading Header */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10 bg-[radial-gradient(circle_at_25%_25%,white_2px,transparent_2px)] bg-[length:40px_40px] opacity-20"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="py-12">
              <div className="text-center">
                <h1 className="text-4xl font-extrabold text-white tracking-tight">
                  Contact Manager
                  <span className="block text-lg font-normal text-indigo-100 mt-2">
                    Loading your contact data...
                  </span>
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Loading Animation */}
        <div className="flex items-center justify-center py-32">
          <div className="text-center max-w-md mx-auto">
            {/* Animated Loading Rings */}
            <div className="relative w-32 h-32 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-200 opacity-20"></div>
              <div className="absolute inset-2 rounded-full border-4 border-purple-300 opacity-40 animate-spin" style={{animationDuration: '2s'}}></div>
              <div className="absolute inset-4 rounded-full border-4 border-pink-400 opacity-60 animate-spin" style={{animationDuration: '1.5s', animationDirection: 'reverse'}}></div>
              <div className="absolute inset-6 rounded-full border-4 border-indigo-500 animate-spin" style={{animationDuration: '1s'}}></div>
              
              {/* Center Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl animate-pulse">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Loading Contact Data</h3>
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              Fetching contacts and organizing them by users...
            </p>
            
            {/* Loading Steps */}
            <div className="space-y-3 text-left">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-gray-600">Connecting to database</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                <span className="text-gray-600">Fetching contact records</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                <span className="text-gray-600">Organizing by users</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
                <span className="text-gray-600">Preparing interface</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-red-50/30 to-orange-50/30">
        {/* Error Header */}
        <div className="bg-gradient-to-br from-red-500 via-red-600 to-orange-600 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10 bg-[radial-gradient(circle_at_25%_25%,white_2px,transparent_2px)] bg-[length:40px_40px] opacity-20"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="py-12">
              <div className="text-center">
                <h1 className="text-4xl font-extrabold text-white tracking-tight">
                  Contact Manager
                  <span className="block text-lg font-normal text-red-100 mt-2">
                    Unable to load contact data
                  </span>
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Error Content */}
        <div className="flex items-center justify-center py-32">
          <div className="text-center max-w-md mx-auto">
            {/* Error Icon */}
            <div className="w-32 h-32 bg-gradient-to-br from-red-100 via-red-200 to-orange-200 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center text-white">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Connection Error</h3>
            <div className="bg-white/80 backdrop-blur rounded-2xl p-6 border border-red-200/50 mb-6">
              <p className="text-red-800 font-semibold mb-2">Error Details:</p>
              <p className="text-red-700 text-sm bg-red-50 rounded-lg p-3 border border-red-200">{error}</p>
            </div>
            
            <button 
              onClick={fetchContactsData}
              className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-2xl hover:from-red-700 hover:to-orange-700 hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl"
            >
              <svg className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry Loading
            </button>
            
            <div className="mt-8 text-sm text-gray-600">
              <p>If the problem persists, please check:</p>
              <ul className="mt-2 space-y-1 text-xs text-gray-500">
                <li>• Network connection</li>
                <li>• Backend server status</li>
                <li>• API endpoint availability</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Enhanced CSS Styles */}
      <style jsx>{`
        .admin-content {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, 
            #f8fafc 0%, 
            #f1f5f9 25%,
            #e2e8f0 50%,
            #f8fafc 75%,
            #f1f5f9 100%);
          background-size: 400% 400%;
          animation: gradientShift 20s ease infinite;
          position: relative;
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .admin-content::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.1) 0%, transparent 50%),
                      radial-gradient(circle at 40% 40%, rgba(120, 219, 226, 0.1) 0%, transparent 50%);
          pointer-events: none;
          z-index: 0;
        }
        .contact-card {
          backdrop-filter: blur(15px);
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 20px 40px 0 rgba(31, 38, 135, 0.15),
                      0 8px 20px 0 rgba(31, 38, 135, 0.1);
          position: relative;
          z-index: 1;
        }
        .user-header {
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.95) 0%, 
            rgba(248, 250, 252, 0.95) 100%);
          backdrop-filter: blur(20px);
          border-bottom: 2px solid rgba(148, 163, 184, 0.2);
        }
        .stats-card {
          backdrop-filter: blur(15px);
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 15px 30px 0 rgba(31, 38, 135, 0.12);
        }
        .contact-item {
          backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .contact-item:hover {
          background: rgba(255, 255, 255, 0.95);
          border-color: rgba(99, 102, 241, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 20px 40px 0 rgba(31, 38, 135, 0.2);
        }
      `}</style>
      
      <div className="admin-content min-h-screen">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 shadow-2xl relative overflow-hidden">
          {/* Enhanced Background pattern */}
          <div className="absolute inset-0 bg-black/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,white_3px,transparent_3px)] bg-[length:50px_50px] opacity-25"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,white_1px,transparent_1px)] bg-[length:25px_25px] opacity-15"></div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex justify-between items-center py-16">
              <div className="space-y-4">
                <h1 className="text-6xl font-black text-white tracking-tight drop-shadow-lg">
                  📋 Contact Manager
                  <span className="block text-2xl font-semibold text-indigo-100 mt-4 tracking-normal drop-shadow-md">
                    🚀 Centralized contact management dashboard
                  </span>
                </h1>
              <div className="flex items-center space-x-4 text-indigo-100">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/10 backdrop-blur border border-white/20">
                  📱 QuickAdd Integration
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/10 backdrop-blur border border-white/20">
                  👥 Multi-User Support
                </span>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={createTestContact}
                disabled={loading}
                className="group inline-flex items-center px-6 py-3.5 bg-green-600/80 backdrop-blur-md border border-green-400/30 rounded-2xl text-sm font-semibold text-white hover:bg-green-700/90 hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl disabled:opacity-50"
              >
                <span className="w-4 h-4 mr-2">🧪</span>
                <span className="group-hover:scale-105 transition-transform duration-200">Add Test Contact</span>
              </button>
              <button
                onClick={handleExport}
                className="group inline-flex items-center px-6 py-3.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-sm font-semibold text-white hover:bg-white/20 hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl"
              >
                <DownloadIcon />
                <span className="ml-2">Export CSV</span>
              </button>
              {selectedContacts.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="inline-flex items-center px-6 py-3 bg-red-500/90 backdrop-blur border border-red-400/30 rounded-xl text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50 transition-all duration-200 shadow-lg"
                >
                  <TrashIcon />
                  <span className="ml-2">Delete ({selectedContacts.length})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="group bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 rounded-3xl shadow-lg hover:shadow-xl p-6 border border-blue-200/50 hover:border-blue-300 transition-all duration-300 hover:scale-105 relative overflow-hidden">
              {/* Decorative element */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -translate-y-4 translate-x-4"></div>
              <div className="flex items-center relative">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <UserIcon />
                  </div>
                </div>
                <div className="ml-5">
                  <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Total Contacts</p>
                  <p className="text-4xl font-extrabold text-blue-900 mt-1 tabular-nums">
                    {statistics.totalStats?.[0]?.totalContacts || 0}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">All registered</p>
                </div>
              </div>
            </div>
            
            <div className="group bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-200 rounded-3xl shadow-lg hover:shadow-xl p-6 border border-emerald-200/50 hover:border-emerald-300 transition-all duration-300 hover:scale-105 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full -translate-y-4 translate-x-4"></div>
              <div className="flex items-center relative">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <div className="w-7 h-7 bg-white rounded-full shadow-inner animate-pulse"></div>
                  </div>
                </div>
                <div className="ml-5">
                  <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Active Contacts</p>
                  <p className="text-4xl font-extrabold text-emerald-900 mt-1 tabular-nums">
                    {statistics.totalStats?.[0]?.activeContacts || 0}
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">Currently active</p>
                </div>
              </div>
            </div>
            
            <div className="group bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200 rounded-3xl shadow-lg hover:shadow-xl p-6 border border-purple-200/50 hover:border-purple-300 transition-all duration-300 hover:scale-105 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -translate-y-4 translate-x-4"></div>
              <div className="flex items-center relative">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <CalendarIcon />
                  </div>
                </div>
                <div className="ml-5">
                  <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide">This Month</p>
                  <p className="text-4xl font-extrabold text-purple-900 mt-1 tabular-nums">
                    {statistics.totalStats?.[0]?.thisMonth || 0}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">Recent additions</p>
                </div>
              </div>
            </div>
            
            <div className="group bg-gradient-to-br from-amber-50 via-amber-100 to-orange-200 rounded-3xl shadow-lg hover:shadow-xl p-6 border border-amber-200/50 hover:border-amber-300 transition-all duration-300 hover:scale-105 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full -translate-y-4 translate-x-4"></div>
              <div className="flex items-center relative">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <div className="w-7 h-7 bg-white rounded-full shadow-inner relative">
                      <div className="absolute inset-1 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full"></div>
                    </div>
                  </div>
                </div>
                <div className="ml-5">
                  <p className="text-sm font-semibold text-amber-700 uppercase tracking-wide">This Week</p>
                  <p className="text-4xl font-extrabold text-amber-900 mt-1 tabular-nums">
                    {statistics.totalStats?.[0]?.thisWeek || 0}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">Latest entries</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Party Type Filter */}
            <select
              value={selectedPartyType}
              onChange={(e) => handleFilterChange('partyType', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Party Types</option>
              <option value="customer">Customer</option>
              <option value="supplier">Supplier</option>
              <option value="vendor">Vendor</option>
              <option value="partner">Partner</option>
              <option value="other">Other</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blocked">Blocked</option>
              <option value="pending">Pending</option>
            </select>

            {/* User Filter */}
            <select
              value={selectedUser}
              onChange={(e) => handleFilterChange('user', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Users</option>
              {getUniqueUsers().map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Enhanced Contacts List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {contactsData?.contactsGrouped?.length > 0 ? (
          <div className="space-y-10">
            {contactsData.contactsGrouped.map((userGroup, userIndex) => {
              // Handle different data structures robustly
              const userId = userGroup._id?.userId || userGroup._id || userGroup.userId || `user-${userIndex}`;
              const userName = userGroup._id?.userName || userGroup.userName || userGroup.addedByName || userGroup.name || 'Unknown User';
              const totalContacts = userGroup.totalContacts || userGroup.contacts?.length || 0;
              const lastAdded = userGroup.lastAdded || (userGroup.contacts && userGroup.contacts.length > 0 ? userGroup.contacts[0].createdAt : null);
              const contacts = userGroup.contacts || [];
              
              console.log('🔍 Processing user group:', { userId, userName, totalContacts, contacts: contacts.length });
              
              return (
                <div key={userId} className="contact-card rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-500 group">
                  {/* Enhanced User Header */}
                  <div className="user-header px-10 py-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-6">
                        <div className="relative">
                          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300 relative overflow-hidden">
                            {/* Enhanced Shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000"></div>
                            <span className="text-white font-black text-3xl relative z-10 drop-shadow-lg">
                              {userName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-3 border-white shadow-lg flex items-center justify-center animate-pulse">
                            <span className="text-white text-sm font-bold">✓</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <h3 className="text-4xl font-black text-gray-900 tracking-tight flex items-center">
                            👤 <span className="ml-2">{userName}</span>
                          </h3>
                          <div className="flex items-center space-x-6">
                            <span className="inline-flex items-center px-5 py-3 rounded-2xl text-lg font-bold bg-gradient-to-r from-blue-100 to-blue-200 text-blue-900 border-2 border-blue-300/50 shadow-md">
                              <span className="w-4 h-4 bg-blue-500 rounded-full mr-3 animate-pulse"></span>
                              📞 {totalContacts} contact{totalContacts !== 1 ? 's' : ''}
                            </span>
                            {lastAdded && (
                              <span className="inline-flex items-center px-5 py-3 rounded-2xl text-lg font-semibold bg-gradient-to-r from-emerald-100 to-green-200 text-emerald-900 border-2 border-emerald-300/50 shadow-md">
                                <span className="w-4 h-4 bg-emerald-500 rounded-full mr-3"></span>
                                🕒 Last: {formatDate(lastAdded)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={userGroup.contacts.every(contact => 
                            selectedContacts.includes(contact._id)
                          )}
                          onChange={(e) => {
                            const contactIds = userGroup.contacts.map(c => c._id);
                            if (e.target.checked) {
                              setSelectedContacts(prev => [...new Set([...prev, ...contactIds])]);
                            } else {
                              setSelectedContacts(prev => prev.filter(id => !contactIds.includes(id)));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <label className="text-sm text-gray-600 font-medium">Select All</label>
                      </div>
                      <button
                        onClick={() => toggleUserExpansion(userGroup._id.userId)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-all duration-200"
                        title={expandedContacts[userGroup._id.userId] ? "Collapse contacts" : "Expand contacts"}
                      >
                        {expandedContacts[userGroup._id.userId] ? <ChevronUpIcon /> : <ChevronDownIcon />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Contacts - Show only when expanded */}
                {expandedContacts[userGroup._id.userId] && (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {userGroup.contacts.map((contact) => (
                        <div
                          key={contact._id}
                          className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200 hover:border-blue-300 bg-gradient-to-br from-white to-gray-50"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start space-x-3 flex-1">
                              <input
                                type="checkbox"
                                checked={selectedContacts.includes(contact._id)}
                                onChange={(e) => handleContactSelect(contact._id, e.target.checked)}
                                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-lg font-semibold text-gray-900 mb-2 truncate">
                                  {contact.name}
                                </h4>
                                <div className="space-y-2">
                                  {contact.phone && (
                                    <p className="text-sm text-gray-600 flex items-center">
                                      <PhoneIcon />
                                      <span className="ml-2 font-medium">Phone:</span>
                                      <span className="ml-1">{contactHelpers.formatPhoneNumber(contact.phone)}</span>
                                    </p>
                                  )}
                                  {contact.email && (
                                    <p className="text-sm text-gray-600 flex items-center">
                                      <EmailIcon />
                                      <span className="ml-2 font-medium">Email:</span>
                                      <span className="ml-1 truncate">{contact.email}</span>
                                    </p>
                                  )}
                                  {contact.company && (
                                    <p className="text-sm text-gray-600 flex items-center">
                                      <span className="w-4 h-4 bg-gray-400 rounded-full mr-2"></span>
                                      <span className="font-medium">Company:</span>
                                      <span className="ml-1 truncate">{contact.company}</span>
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-2 ml-3">
                              <div className="flex space-x-1">
                                {contact.partyType && (
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${contactHelpers.getPartyTypeColor(contact.partyType)}`}>
                                    {contact.partyType}
                                  </span>
                                )}
                                {contact.status && (
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${contactHelpers.getStatusColor(contact.status)}`}>
                                    {contact.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="border-t border-gray-100 pt-3 mt-3">
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-gray-500">
                                <span className="flex items-center">
                                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-1"></span>
                                  Added: {formatDate(contact.createdAt)}
                                </span>
                              </div>
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => handleViewContactDetails(contact)}
                                  className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                  title="View contact details"
                                >
                                  <ViewIcon />
                                </button>
                                <button
                                  className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-200"
                                  title="Edit contact"
                                >
                                  <EditIcon />
                                </button>
                                <button
                                  onClick={() => handleDeleteContact(contact)}
                                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                                  title="Delete contact"
                                >
                                  <TrashIcon />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
            })} 
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <UserIcon />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No contacts found</h3>
            <p className="text-gray-500 max-w-md mx-auto text-lg">
              {searchQuery || selectedPartyType || selectedStatus || selectedUser
                ? 'Try adjusting your search or filter criteria to find the contacts you\'re looking for.'
                : 'Contacts added by users through QuickAdd will appear here. Once users start adding contacts, you\'ll be able to manage them all in one place.'
              }
            </p>
            {(searchQuery || selectedPartyType || selectedStatus || selectedUser) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedPartyType('');
                  setSelectedStatus('');
                  setSelectedUser('');
                }}
                className="mt-6 inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {contactsData?.pagination && contactsData.pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, contactsData.pagination.totalPages))}
                disabled={currentPage === contactsData.pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, contactsData.pagination.totalUsers)}
                  </span> of{' '}
                  <span className="font-medium">{contactsData.pagination.totalUsers}</span> users
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {[...Array(Math.min(5, contactsData.pagination.totalPages))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, contactsData.pagination.totalPages))}
                    disabled={currentPage === contactsData.pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contact Details Modal */}
      {showContactDetails && selectedContactForDetails && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border max-w-2xl shadow-2xl rounded-2xl bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Contact Details</h3>
              <button
                onClick={() => setShowContactDetails(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Contact Header */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-xl">
                      {contactHelpers?.getContactInitials ? 
                        contactHelpers.getContactInitials(selectedContactForDetails) : 
                        selectedContactForDetails.name.charAt(0).toUpperCase()
                      }
                    </span>
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-gray-900">{selectedContactForDetails.name}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      {selectedContactForDetails.partyType && (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          contactHelpers?.getPartyTypeColor ? 
                            contactHelpers.getPartyTypeColor(selectedContactForDetails.partyType) : 
                            'bg-blue-100 text-blue-800'
                        }`}>
                          {selectedContactForDetails.partyType}
                        </span>
                      )}
                      {selectedContactForDetails.status && (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          contactHelpers?.getStatusColor ? 
                            contactHelpers.getStatusColor(selectedContactForDetails.status) : 
                            'bg-green-100 text-green-800'
                        }`}>
                          {selectedContactForDetails.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Phone Numbers */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <PhoneIcon />
                    <span className="ml-2">Phone Numbers</span>
                  </h5>
                  {selectedContactForDetails.phoneNumbers && selectedContactForDetails.phoneNumbers.length > 0 ? (
                    <div className="space-y-3">
                      {selectedContactForDetails.phoneNumbers.map((phone, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-900 font-medium">
                            {contactHelpers?.formatPhoneNumber ? 
                              contactHelpers.formatPhoneNumber(phone) : 
                              phone
                            }
                          </span>
                          <button
                            onClick={() => window.open(`tel:${phone}`, '_self')}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Call
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : selectedContactForDetails.phone ? (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-900 font-medium">
                        {contactHelpers?.formatPhoneNumber ? 
                          contactHelpers.formatPhoneNumber(selectedContactForDetails.phone) : 
                          selectedContactForDetails.phone
                        }
                      </span>
                      <button
                        onClick={() => window.open(`tel:${selectedContactForDetails.phone}`, '_self')}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Call
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No phone numbers available</p>
                  )}
                </div>

                {/* Email */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <EmailIcon />
                    <span className="ml-2">Email</span>
                  </h5>
                  {selectedContactForDetails.email ? (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-900 font-medium">{selectedContactForDetails.email}</span>
                      <button
                        onClick={() => window.open(`mailto:${selectedContactForDetails.email}`, '_self')}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Email
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No email available</p>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h5 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedContactForDetails.company && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Company</span>
                      <p className="text-gray-900 mt-1">{selectedContactForDetails.company}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium text-gray-500">Added On</span>
                    <p className="text-gray-900 mt-1">{formatDate(selectedContactForDetails.createdAt)}</p>
                  </div>
                  {selectedContactForDetails.updatedAt && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Last Updated</span>
                      <p className="text-gray-900 mt-1">{formatDate(selectedContactForDetails.updatedAt)}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium text-gray-500">Contact ID</span>
                    <p className="text-gray-900 mt-1 font-mono text-sm">{selectedContactForDetails._id}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowContactDetails(false)}
                className="px-6 py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
              <button
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Contact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && contactToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <TrashIcon />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Delete Contact</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete <strong>{contactToDelete.name}</strong>? 
                  This action cannot be undone.
                </p>
              </div>
              <div className="items-center px-4 py-3 flex space-x-3 justify-center">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-md shadow-lg text-white max-w-sm ${
              toast.type === 'success' ? 'bg-green-500' :
              toast.type === 'error' ? 'bg-red-500' :
              toast.type === 'warning' ? 'bg-yellow-500' :
              'bg-blue-500'
            }`}
          >
            <p className="text-sm">{toast.message}</p>
          </div>
        ))}
      </div>
    </div>
    </>
  );
};

export default ContactManager;