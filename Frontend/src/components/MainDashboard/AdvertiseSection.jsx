import React, {useState, useEffect} from "react";
import {Card, Button, Badge, Modal, Form, Row, Col} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faAd,
  faExternalLinkAlt,
  faHeart,
  faShare,
  faBookmark,
  faEye,
  faPlay,
  faImage,
  faVideo,
  faFileAlt,
  faTimes,
  faChevronLeft,
  faChevronRight,
  faSearch,
  faFilter,
  faStar,
  faMapMarkerAlt,
  faClock,
  faUser,
  faLayerGroup,
  faBusinessTime,
  faCalculator,
  faChartLine,
  faCreditCard,
  faShieldAlt,
  faStore,
  faLaptopCode,
  faClipboard,
  faReceipt,
  faTruck,
  faUsers,
  faBoxes,
  faWarehouse,
  faFileInvoiceDollar,
  faMoneyBillWave,
  faChartBar,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";

// Enhanced CSS styles with better placeholders
const styles = `
/* Advertise Section Styles */
.advertise-section {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.ads-container {
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 1.5rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin-top: 1rem; /* ✅ Added margin-top to fix spacing */
}

/* Dashboard layout override */
.dashboard-layout .advertise-section .ads-container {
  margin-top: 0; /* ✅ No margin when in dashboard layout */
}

/* Single view layout */
.single-view .advertise-section .ads-container {
  margin-top: 1rem; /* ✅ Add margin when in single view */
}

/* Header */
.ads-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.ads-header h2 {
  color: #1e293b;
  font-size: 1.25rem;
  margin: 0;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ads-header .header-icon {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
}

/* Search and Filter */
.ads-controls {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  flex-shrink: 0;
  align-items: center;
}

.ads-search {
  flex: 1;
  min-width: 200px;
  max-width: 300px;
}

.ads-search .form-control {
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  background-color: #f8fafc;
}

.ads-search .form-control:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 0.15rem rgba(37, 99, 235, 0.15);
  background-color: white;
}

/* Compact Filter Buttons */
.filter-buttons-container {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-btn {
  border-radius: 20px;
  padding: 0.375rem 0.75rem;
  border: 1px solid #e2e8f0;
  background-color: white;
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.2s ease;
  white-space: nowrap;
  min-height: auto;
  line-height: 1.2;
}

.filter-btn:hover {
  background-color: #f1f5f9;
  color: #374151;
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

.filter-btn.active {
  background-color: #2563eb;
  color: white;
  border-color: #2563eb;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
}

.filter-btn:focus {
  outline: none;
  box-shadow: 0 0 0 0.15rem rgba(37, 99, 235, 0.25);
}

/* Filter count badge */
.filter-count {
  background: rgba(255, 255, 255, 0.3);
  color: inherit;
  padding: 0.1rem 0.3rem;
  border-radius: 10px;
  font-size: 0.7rem;
  margin-left: 0.25rem;
  font-weight: 600;
}

.filter-btn.active .filter-count {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.filter-btn:not(.active) .filter-count {
  background: #e2e8f0;
  color: #64748b;
}

/* Ads Container with Scrolling */
.ads-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.5rem;
  margin-right: -0.5rem;
  min-height: 0;
}

/* Ads using Bootstrap Grid */
.ads-wrapper {
  min-height: 100%;
}

/* Ad Card */
.ad-card {
  background-color: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  height: 100%;
  margin-bottom: 1rem;
}

.ad-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  border-color: #2563eb;
}

.ad-media {
  position: relative;
  height: 160px;
  overflow: hidden;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
}

/* ✅ NO EXTERNAL IMAGES - Only local placeholders */
.media-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 2.5rem;
  text-align: center;
  padding: 1rem;
  position: relative;
  overflow: hidden;
}

.media-placeholder::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: inherit;
  opacity: 0.1;
  background-size: 20px 20px;
  background-image: 
    linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%), 
    linear-gradient(-45deg, rgba(255,255,255,0.1) 25%, transparent 25%), 
    linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.1) 75%), 
    linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.1) 75%);
}

.media-placeholder .placeholder-icon {
  margin-bottom: 0.5rem;
  opacity: 0.9;
  z-index: 1;
  position: relative;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

.media-placeholder .placeholder-title {
  font-size: 0.8rem;
  font-weight: 600;
  margin-top: 0.5rem;
  color: rgba(255, 255, 255, 0.95);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  z-index: 1;
  position: relative;
  text-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

/* ✅ Enhanced gradient backgrounds for different categories */
.placeholder-sales {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.placeholder-finance {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.placeholder-inventory {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.placeholder-reports {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
}

.placeholder-business {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
}

.placeholder-featured {
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
}

.ad-type-badge {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  z-index: 2;
}

.ad-type-badge.video {
  background-color: #ef4444;
  color: white;
}

.ad-type-badge.image {
  background-color: #10b981;
  color: white;
}

.ad-type-badge.text {
  background-color: #f59e0b;
  color: white;
}

.ad-type-badge.carousel {
  background-color: #8b5cf6;
  color: white;
}

.ad-type-badge.featured {
  background-color: #06b6d4;
  color: white;
}

.ad-type-badge.action {
  background-color: #2563eb;
  color: white;
}

.ad-content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  height: calc(100% - 160px);
}

.ad-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.5rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ad-description {
  color: #64748b;
  font-size: 0.85rem;
  margin-bottom: 1rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex-grow: 1;
}

.ad-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  font-size: 0.75rem;
  color: #64748b;
}

.ad-location,
.ad-date {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.ad-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid #f1f5f9;
  margin-top: auto;
}

.ad-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  background: none;
  border: none;
  padding: 0.5rem;
  border-radius: 6px;
  color: #64748b;
  transition: all 0.3s ease;
  font-size: 0.85rem;
}

.action-btn:hover {
  background-color: #f1f5f9;
  color: #2563eb;
}

.action-btn.liked {
  color: #ef4444;
}

.action-btn.bookmarked {
  color: #f59e0b;
}

.ad-views {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: #64748b;
  font-size: 0.8rem;
}

.sponsor-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
  z-index: 2;
}

/* Featured Ad */
.featured-ad {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: white;
  border: none;
}

.featured-ad .ad-title {
  color: white;
  font-size: 1.1rem;
}

.featured-ad .ad-description {
  color: rgba(255, 255, 255, 0.9);
}

.featured-ad .ad-meta {
  color: rgba(255, 255, 255, 0.8);
}

.featured-ad .ad-views {
  color: rgba(255, 255, 255, 0.8);
}

/* Ad Modal */
.ad-modal .modal-content {
  border-radius: 12px;
  border: none;
}

.ad-modal .modal-header {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: white;
  border-radius: 12px 12px 0 0;
}

.ad-modal .modal-body {
  padding: 2rem;
}

.ad-modal .ad-media {
  height: 300px;
  margin-bottom: 1.5rem;
  border-radius: 8px;
}

/* No Ads State */
.no-ads {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
  color: #64748b;
}

.no-ads-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

/* Custom scrollbar for ads content */
.ads-content::-webkit-scrollbar {
  width: 6px;
}

.ads-content::-webkit-scrollbar-track {
  background-color: #f1f5f9;
  border-radius: 3px;
}

.ads-content::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 3px;
  transition: background-color 0.2s ease;
}

.ads-content::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}

/* Loading Animation */
.ad-card.loading {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .ads-controls {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
  }
  
  .ads-search {
    min-width: 100%;
    max-width: none;
  }
  
  .filter-buttons-container {
    justify-content: center;
    gap: 0.375rem;
  }
  
  .filter-btn {
    font-size: 0.75rem;
    padding: 0.3rem 0.6rem;
  }
  
  .filter-count {
    font-size: 0.65rem;
  }
  
  .ads-container {
    margin-top: 0.5rem; /* ✅ Reduced margin on mobile */
  }
}

@media (max-width: 576px) {
  .filter-buttons-container {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
  
  .filter-btn {
    justify-content: center;
    text-align: center;
  }
  
  .ads-header h2 {
    font-size: 1.1rem;
  }
  
  .ads-header .header-icon {
    width: 28px;
    height: 28px;
    font-size: 0.8rem;
  }
  
  .ads-container {
    padding: 1rem;
    margin-top: 0.25rem; /* ✅ Minimal margin on smallest screens */
  }
}

@media (max-width: 1200px) {
  .ad-media {
    height: 140px;
  }
  
  .ad-content {
    height: calc(100% - 140px);
    padding: 0.875rem;
  }
}

@media (max-width: 992px) {
  .ads-container {
    height: auto;
    max-height: 600px;
  }
  
  .ad-media {
    height: 120px;
  }
  
  .ad-content {
    height: calc(100% - 120px);
    padding: 0.75rem;
  }
}
`;

function AdvertiseSection({
  currentUser,
  currentCompany,
  addToast,
  isOnline = true,
  onNavigate,
}) {
  const [ads, setAds] = useState([]);
  const [filteredAds, setFilteredAds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedAd, setSelectedAd] = useState(null);
  const [showAdModal, setShowAdModal] = useState(false);
  const [likedAds, setLikedAds] = useState(new Set());
  const [bookmarkedAds, setBookmarkedAds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // Inject styles into the document
  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);

    return () => {
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);

  // ✅ Business-focused mock ads data with NO external image dependencies
  const mockAds = [
    {
      id: 1,
      type: "featured",
      title: "Create Sales Invoice",
      description:
        "Quickly generate professional sales invoices with automatic calculations, GST compliance, and customer management.",
      category: "sales",
      featured: true,
      sponsor: "Quick Actions",
      location: "Dashboard",
      date: "Now",
      views: 1250,
      action: "createInvoice",
      icon: faFileInvoiceDollar,
    },
    {
      id: 2,
      type: "action",
      title: "Record Payment In",
      description:
        "Receive and record incoming payments from customers with automatic account balance updates.",
      category: "finance",
      sponsor: "Transactions",
      location: "Dashboard",
      date: "Now",
      views: 890,
      action: "paymentIn",
      icon: faMoneyBillWave,
    },
    {
      id: 3,
      type: "action",
      title: "Daily Transactions",
      description:
        "View and manage all your daily financial activities in one centralized dashboard.",
      category: "finance",
      sponsor: "Reports",
      location: "Dashboard",
      date: "Now",
      views: 2100,
      action: "dailySummary",
      icon: faChartLine,
    },
    {
      id: 4,
      type: "action",
      title: "Manage Products",
      description:
        "Add, edit, and organize your product inventory with stock tracking and pricing management.",
      category: "inventory",
      sponsor: "Inventory",
      location: "Dashboard",
      date: "Now",
      views: 567,
      action: "allProducts",
      icon: faBoxes,
    },
    {
      id: 5,
      type: "action",
      title: "Business Reports",
      description:
        "Generate comprehensive business reports with insights on sales, purchases, and profitability.",
      category: "reports",
      sponsor: "Analytics",
      location: "Dashboard",
      date: "Now",
      views: 1450,
      action: "reports",
      icon: faChartBar,
    },
    {
      id: 6,
      type: "action",
      title: "Expense Tracking",
      description:
        "Track and categorize business expenses with receipt management and approval workflows.",
      category: "finance",
      sponsor: "Finance",
      location: "Dashboard",
      date: "Now",
      views: 780,
      action: "expenses",
      icon: faCalculator,
    },
    {
      id: 7,
      type: "action",
      title: "Customer Management",
      description:
        "Manage customer relationships, contact information, and transaction history in one place.",
      category: "business",
      sponsor: "CRM",
      location: "Dashboard",
      date: "Now",
      views: 1890,
      action: "parties",
      icon: faUsers,
    },
    {
      id: 8,
      type: "action",
      title: "Purchase Orders",
      description:
        "Create and manage purchase orders with vendor tracking and approval workflows.",
      category: "inventory",
      sponsor: "Procurement",
      location: "Dashboard",
      date: "Now",
      views: 945,
      action: "purchaseOrders",
      icon: faTruck,
    },
    {
      id: 9,
      type: "action",
      title: "Stock Analysis",
      description:
        "Analyze inventory levels, identify slow-moving items, and optimize stock management.",
      category: "inventory",
      sponsor: "Analytics",
      location: "Dashboard",
      date: "Now",
      views: 654,
      action: "stockAnalysis",
      icon: faWarehouse,
    },
    {
      id: 10,
      type: "action",
      title: "Create Quotation",
      description:
        "Generate professional quotations and estimates for potential customers.",
      category: "sales",
      sponsor: "Sales",
      location: "Dashboard",
      date: "Now",
      views: 1123,
      action: "createQuotation",
      icon: faClipboard,
    },
  ];

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setAds(mockAds);
      setFilteredAds(mockAds);
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  // Filter and search functionality
  useEffect(() => {
    let filtered = ads;

    // Apply category filter
    if (selectedFilter !== "all") {
      filtered = filtered.filter((ad) => ad.category === selectedFilter);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (ad) =>
          ad.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ad.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ad.sponsor.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredAds(filtered);
  }, [ads, selectedFilter, searchQuery]);

  const handleAdClick = (ad) => {
    // ✅ Handle action clicks with proper navigation
    if (ad.action && onNavigate) {
      addToast?.(`Opening ${ad.title}...`, "info");
      onNavigate(ad.action);
    } else {
      setSelectedAd(ad);
      setShowAdModal(true);
    }

    // Increment view count
    setAds((prevAds) =>
      prevAds.map((a) => (a.id === ad.id ? {...a, views: a.views + 1} : a))
    );
  };

  const handleLike = (adId, e) => {
    e.stopPropagation();
    setLikedAds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(adId)) {
        newSet.delete(adId);
        addToast?.("Removed from favorites", "info");
      } else {
        newSet.add(adId);
        addToast?.("Added to favorites", "success");
      }
      return newSet;
    });
  };

  const handleBookmark = (adId, e) => {
    e.stopPropagation();
    setBookmarkedAds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(adId)) {
        newSet.delete(adId);
        addToast?.("Removed from quick access", "info");
      } else {
        newSet.add(adId);
        addToast?.("Added to quick access", "success");
      }
      return newSet;
    });
  };

  const handleShare = (ad, e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(
      `Check out: ${ad.title} - ${ad.description.substring(0, 100)}...`
    );
    addToast?.("Action details copied to clipboard", "success");
  };

  const filterOptions = [
    {key: "all", label: "All", count: ads.length},
    {
      key: "sales",
      label: "Sales",
      count: ads.filter((ad) => ad.category === "sales").length,
    },
    {
      key: "finance",
      label: "Finance",
      count: ads.filter((ad) => ad.category === "finance").length,
    },
    {
      key: "inventory",
      label: "Inventory",
      count: ads.filter((ad) => ad.category === "inventory").length,
    },
    {
      key: "reports",
      label: "Reports",
      count: ads.filter((ad) => ad.category === "reports").length,
    },
    {
      key: "business",
      label: "Business",
      count: ads.filter((ad) => ad.category === "business").length,
    },
  ];

  const getAdTypeIcon = (type) => {
    switch (type) {
      case "video":
        return faVideo;
      case "image":
        return faImage;
      case "carousel":
        return faLayerGroup;
      case "text":
        return faFileAlt;
      case "featured":
        return faStar;
      case "action":
        return faLaptopCode;
      default:
        return faAd;
    }
  };

  // ✅ Generate placeholder with icon and gradient background - NO external images
  const generatePlaceholder = (ad) => {
    const placeholderClass = `placeholder-${ad.category}`;

    return (
      <div className={`media-placeholder ${placeholderClass}`}>
        <div className="placeholder-icon">
          <FontAwesomeIcon icon={ad.icon || getAdTypeIcon(ad.type)} />
        </div>
        <div className="placeholder-title">{ad.type}</div>
      </div>
    );
  };

  return (
    <>
      <div className="advertise-section">
        <Card className="ads-container">
          {/* Header */}
          <div className="ads-header">
            <h2>
              <div className="header-icon">
                <FontAwesomeIcon icon={faLaptopCode} />
              </div>
              Quick Actions
            </h2>
            <Badge bg="primary" pill>
              {filteredAds.length} actions
            </Badge>
          </div>

          {/* Search and Filter Controls */}
          <div className="ads-controls">
            <div className="ads-search">
              <Form.Control
                type="text"
                placeholder="Search actions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="filter-buttons-container">
              {filterOptions.map((filter) => (
                <Button
                  key={filter.key}
                  className={`filter-btn ${
                    selectedFilter === filter.key ? "active" : ""
                  }`}
                  onClick={() => setSelectedFilter(filter.key)}
                  variant="outline-secondary"
                  size="sm"
                >
                  {filter.label}
                  <span className="filter-count">{filter.count}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Actions Content with Scrolling */}
          <div className="ads-content">
            <div className="ads-wrapper">
              {loading ? (
                <Row className="g-3">
                  {Array.from({length: 6}).map((_, index) => (
                    <Col key={index} xs={12} sm={6} lg={12} xl={6}>
                      <div className="ad-card loading">
                        <div className="ad-media">
                          <div className="media-placeholder placeholder-business">
                            <div className="placeholder-icon">
                              <FontAwesomeIcon icon={faLaptopCode} />
                            </div>
                            <div className="placeholder-title">Loading</div>
                          </div>
                        </div>
                        <div className="ad-content">
                          <div className="ad-title">Loading...</div>
                          <div className="ad-description">
                            Please wait while we load the quick actions...
                          </div>
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              ) : filteredAds.length > 0 ? (
                <Row className="g-3">
                  {filteredAds.map((ad) => (
                    <Col key={ad.id} xs={12} sm={6} lg={12} xl={6}>
                      <div
                        className={`ad-card ${
                          ad.featured ? "featured-ad" : ""
                        }`}
                        onClick={() => handleAdClick(ad)}
                      >
                        {ad.sponsor && (
                          <div className="sponsor-badge">{ad.sponsor}</div>
                        )}

                        <div className="ad-media">
                          {/* ✅ ONLY local placeholders - NO external images */}
                          {generatePlaceholder(ad)}

                          <div className={`ad-type-badge ${ad.type}`}>
                            <FontAwesomeIcon
                              icon={getAdTypeIcon(ad.type)}
                              className="me-1"
                            />
                            {ad.type}
                          </div>
                        </div>

                        <div className="ad-content">
                          <h3 className="ad-title">{ad.title}</h3>
                          <p className="ad-description">{ad.description}</p>

                          <div className="ad-meta">
                            <div className="ad-location">
                              <FontAwesomeIcon icon={faMapMarkerAlt} />
                              {ad.location}
                            </div>
                            <div className="ad-date">
                              <FontAwesomeIcon icon={faClock} />
                              {ad.date}
                            </div>
                          </div>

                          <div className="ad-stats">
                            <div className="ad-actions">
                              <button
                                className={`action-btn ${
                                  likedAds.has(ad.id) ? "liked" : ""
                                }`}
                                onClick={(e) => handleLike(ad.id, e)}
                                title="Add to Favorites"
                              >
                                <FontAwesomeIcon icon={faHeart} />
                              </button>
                              <button
                                className={`action-btn ${
                                  bookmarkedAds.has(ad.id) ? "bookmarked" : ""
                                }`}
                                onClick={(e) => handleBookmark(ad.id, e)}
                                title="Quick Access"
                              >
                                <FontAwesomeIcon icon={faBookmark} />
                              </button>
                              <button
                                className="action-btn"
                                onClick={(e) => handleShare(ad, e)}
                                title="Share"
                              >
                                <FontAwesomeIcon icon={faShare} />
                              </button>
                            </div>
                            <div className="ad-views">
                              <FontAwesomeIcon icon={faEye} />
                              {ad.views.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              ) : (
                <div className="no-ads">
                  <FontAwesomeIcon
                    icon={faLaptopCode}
                    className="no-ads-icon"
                  />
                  <h3>No actions found</h3>
                  <p>
                    Try adjusting your search criteria or check back later for
                    new actions.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Action Detail Modal */}
      <Modal
        show={showAdModal}
        onHide={() => setShowAdModal(false)}
        size="lg"
        className="ad-modal"
        centered
      >
        {selectedAd && (
          <>
            <Modal.Header closeButton>
              <Modal.Title>{selectedAd.title}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div className="ad-media">{generatePlaceholder(selectedAd)}</div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <Badge bg="primary">{selectedAd.sponsor}</Badge>
                <div className="d-flex gap-3 text-muted small">
                  <span>
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="me-1" />
                    {selectedAd.location}
                  </span>
                  <span>
                    <FontAwesomeIcon icon={faClock} className="me-1" />
                    {selectedAd.date}
                  </span>
                  <span>
                    <FontAwesomeIcon icon={faEye} className="me-1" />
                    {selectedAd.views.toLocaleString()} views
                  </span>
                </div>
              </div>
              <p>{selectedAd.description}</p>
              <div className="d-flex gap-2 mt-4">
                <Button
                  variant="primary"
                  onClick={() => {
                    if (selectedAd.action && onNavigate) {
                      addToast?.(`Opening ${selectedAd.title}...`, "info");
                      onNavigate(selectedAd.action);
                    } else {
                      addToast?.("Action not available", "warning");
                    }
                    setShowAdModal(false);
                  }}
                >
                  <FontAwesomeIcon icon={faExternalLinkAlt} className="me-2" />
                  Open Action
                </Button>
                <Button
                  variant="outline-secondary"
                  onClick={(e) => handleShare(selectedAd, e)}
                >
                  <FontAwesomeIcon icon={faShare} className="me-2" />
                  Share
                </Button>
              </div>
            </Modal.Body>
          </>
        )}
      </Modal>
    </>
  );
}

export default AdvertiseSection;
