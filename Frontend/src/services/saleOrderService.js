import axios from "axios";
import apiConfig from "../config/api";

// Create axios instance with your API configuration
const apiClient = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // ✅ ADD: Company ID header if provided in params
    if (config.params?.companyId) {
      config.headers["x-company-id"] = config.params.companyId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      // ✅ ADD: Redirect to login if needed
      if (window.location.pathname !== "/login") {
        console.warn("🔒 Authentication expired, token removed");
      }
    }
    return Promise.reject(error);
  }
);

class SaleOrderService {
  // ==================== BASIC CRUD OPERATIONS ====================

  /**
   * ✅ 1. Generate fallback order number (needed by generateOrderNumber)
   */
  generateFallbackOrderNumber(
    companyId,
    orderType = "quotation",
    userId = null,
    currentCompany = null
  ) {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    const milliseconds = now.getMilliseconds().toString().padStart(3, "0");

    // ✅ IMPROVED: Better random number with crypto if available
    let randomNum;
    if (
      typeof window !== "undefined" &&
      window.crypto &&
      window.crypto.getRandomValues
    ) {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      randomNum = (array[0] % 90000) + 10000;
    } else {
      randomNum = Math.floor(10000 + Math.random() * 90000);
    }

    // ✅ IMPROVED: Better company prefix
    let companyPrefix = "QUO";
    if (currentCompany?.companyName) {
      companyPrefix = currentCompany.companyName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .substring(0, 3)
        .padEnd(3, "X");
    } else if (companyId) {
      companyPrefix = companyId
        .slice(-3)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "X");
    }

    // ✅ Better order type prefixes
    const typePrefixes = {
      quotation: "QUO",
      sales_order: "SO",
      proforma_invoice: "PI",
      invoice: "INV",
      estimate: "EST",
    };
    const typePrefix = typePrefixes[orderType] || "QUO";

    // ✅ Add user component
    const userComponent = userId ? userId.slice(-2).toUpperCase() : "SY";

    return `${companyPrefix}-${typePrefix}-${year}${month}${day}-${hours}${minutes}${seconds}${milliseconds}-${userComponent}${randomNum}`;
  }
  createUniqueOrderNumber(
    companyId,
    orderType,
    userId,
    currentCompany,
    attemptNumber = 0
  ) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const milliseconds = String(now.getMilliseconds()).padStart(3, "0");

    // ✅ Better random number generation
    let randomNum;
    if (
      typeof window !== "undefined" &&
      window.crypto &&
      window.crypto.getRandomValues
    ) {
      const array = new Uint32Array(2);
      window.crypto.getRandomValues(array);
      randomNum = (array[0] % 90000) + 10000;
    } else {
      randomNum = Math.floor(10000 + Math.random() * 90000);
    }

    // Add attempt number to ensure uniqueness
    const attemptSuffix = attemptNumber > 0 ? `-A${attemptNumber}` : "";

    // ✅ Better company prefix
    let companyPrefix = "QUO";
    if (currentCompany?.companyName) {
      companyPrefix = currentCompany.companyName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .substring(0, 3)
        .padEnd(3, "X");
    }

    // ✅ Order type prefixes
    const typePrefixes = {
      quotation: "QUO",
      sales_order: "SO",
      proforma_invoice: "PI",
      invoice: "INV",
    };
    const typePrefix = typePrefixes[orderType] || "QUO";

    // ✅ Create multiple format variations
    const timestamp = Date.now().toString();
    const formats = [
      `${typePrefix}-${year}${month}${day}-${hours}${minutes}${seconds}-${randomNum}${attemptSuffix}`,
      `${companyPrefix}-${typePrefix}-${year}${month}${day}-${milliseconds}${randomNum}${attemptSuffix}`,
      `${typePrefix}-${timestamp.slice(-8)}-${randomNum}${attemptSuffix}`,
      `${companyPrefix}-${year}${month}${day}${hours}${minutes}-${randomNum}${attemptSuffix}`,
      `${typePrefix}-${year}${month}${day}-${timestamp.slice(
        -6
      )}${randomNum}${attemptSuffix}`,
    ];

    // Pick format based on attempt number for variation
    const selectedFormat = formats[attemptNumber % formats.length];

    return selectedFormat;
  }

  /**
   * ✅ 2. Check if order number exists (needed by generateOrderNumber)
   */
  async checkOrderNumberExists(companyId, orderNumber) {
    try {
      const endpoints = [
        "/api/sales-orders/check-number",
        "/api/sales-orders/exists",
        `/api/sales-orders/number/${encodeURIComponent(orderNumber)}/exists`,
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await apiClient.get(endpoint, {
            params: {companyId, orderNumber},
            timeout: 5000,
          });
          return {
            success: true,
            exists: response.data?.exists || response.data?.found || false,
            data: response.data,
          };
        } catch (error) {
          continue;
        }
      }

      return {success: true, exists: false, data: null, fallback: true};
    } catch (error) {
      return {success: true, exists: false, data: null, error: error.message};
    }
  }

  /**
   * ✅ 3. Generate order number (uses above methods)
   */
  async generateOrderNumber(
    companyId,
    orderType = "quotation",
    userId = null,
    currentCompany = null
  ) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required for order number generation");
      }

      // ✅ STEP 1: Try server-side generation first
      const endpointsToTry = [
        "/api/sales-orders/generate-number",
        "/api/sales-orders/next-order-number",
        "/api/sales-orders/next-number",
      ];

      for (const endpoint of endpointsToTry) {
        try {
          const params = {companyId, orderType, type: orderType};
          const response = await apiClient.get(endpoint, {
            params,
            timeout: 10000,
          });

          if (response.data) {
            const serverNumber =
              response.data.nextOrderNumber ||
              response.data.orderNumber ||
              response.data.number ||
              response.data.quotationNumber ||
              response.data.data?.nextOrderNumber;

            if (serverNumber && serverNumber.trim()) {
              return {
                success: true,
                data: {nextOrderNumber: serverNumber.trim()},
                message: "Order number generated successfully",
                source: "server",
              };
            }
          }
        } catch (error) {
          console.warn(`Server endpoint ${endpoint} failed:`, error.message);
          continue;
        }
      }

      // ✅ STEP 2: Generate unique fallback number with retry logic
      let fallbackNumber;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        fallbackNumber = this.generateFallbackOrderNumber(
          companyId,
          orderType,
          userId,
          currentCompany
        );

        try {
          const existsCheck = await this.checkOrderNumberExists(
            companyId,
            fallbackNumber
          );
          if (!existsCheck.exists) {
            break;
          } else {
            console.warn(
              `Order number ${fallbackNumber} already exists, retrying...`
            );
          }
        } catch (checkError) {
          console.warn("Number existence check failed:", checkError.message);
          break;
        }

        attempts++;
        await new Promise((resolve) => setTimeout(resolve, attempts * 50));
      } while (attempts < maxAttempts);

      return {
        success: true,
        data: {nextOrderNumber: fallbackNumber},
        message: "Order number generated (fallback)",
        source: "fallback",
        attempts: attempts + 1,
      };
    } catch (error) {
      console.error("Order number generation failed:", error);

      // ✅ Emergency fallback
      const timestamp = Date.now();
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const emergencyNumber = `QUO-EMRG-${timestamp}-${randomSuffix}`;

      return {
        success: true,
        data: {nextOrderNumber: emergencyNumber},
        message: "Order number generated (emergency fallback)",
        source: "emergency",
        error: error.message,
      };
    }
  }

  async verifyOrderNumberUniqueness(companyId, orderNumber) {
    try {
      const checkEndpoints = [
        "/api/sales-orders/check-number",
        "/api/sales-orders/exists",
        `/api/sales-orders/verify-unique`,
      ];

      for (const endpoint of checkEndpoints) {
        try {
          const response = await apiClient.get(endpoint, {
            params: {companyId, orderNumber},
            timeout: 5000,
          });

          const exists = response.data?.exists || response.data?.found || false;
          return {
            isUnique: !exists,
            exists: exists,
            source: endpoint,
          };
        } catch (error) {
          continue;
        }
      }

      // If no endpoint works, assume it's unique
      return {isUnique: true, exists: false, source: "fallback"};
    } catch (error) {
      console.warn("⚠️ Could not verify uniqueness:", error.message);
      return {isUnique: true, exists: false, source: "error_fallback"};
    }
  }

  /**
   * ✅ 4. Get next order number (alias)
   */
  async getNextOrderNumber(companyId, orderType = "quotation", userId = null) {
    return this.generateOrderNumber(companyId, orderType, userId);
  }

  /**
   * ✅ 5. Validate order data
   */
  validateEnhancedOrderData(orderData) {
    const errors = [];

    if (!orderData.companyId) {
      errors.push("Company ID is required");
    }

    if (
      !orderData.customerName &&
      !orderData.customer &&
      !orderData.customerMobile
    ) {
      errors.push("Customer information is required (name, ID, or mobile)");
    }

    if (
      !orderData.items ||
      !Array.isArray(orderData.items) ||
      orderData.items.length === 0
    ) {
      errors.push("At least one item is required");
    }

    if (orderData.items) {
      orderData.items.forEach((item, index) => {
        if (!item.itemName && !item.productName) {
          errors.push(`Item ${index + 1}: Name is required`);
        }
        if (!item.quantity || item.quantity <= 0) {
          errors.push(`Item ${index + 1}: Valid quantity is required`);
        }
        if (
          (!item.pricePerUnit && !item.price) ||
          (item.pricePerUnit || item.price) < 0
        ) {
          errors.push(`Item ${index + 1}: Valid price is required`);
        }
      });
    }

    if (
      orderData.orderType &&
      !["quotation", "sales_order", "proforma_invoice"].includes(
        orderData.orderType
      )
    ) {
      errors.push("Invalid order type");
    }

    if (
      orderData.sourceOrderId &&
      !orderData.sourceOrderId.match(/^[a-fA-F0-9]{24}$/)
    ) {
      errors.push("Invalid source order ID format");
    }

    if (
      orderData.targetCompanyId &&
      !orderData.targetCompanyId.match(/^[a-fA-F0-9]{24}$/)
    ) {
      errors.push("Invalid target company ID format");
    }

    if (
      orderData.sourceCompanyId &&
      !orderData.sourceCompanyId.match(/^[a-fA-F0-9]{24}$/)
    ) {
      errors.push("Invalid source company ID format");
    }

    if (orderData.purchaseOrderId) {
      if (!orderData.purchaseOrderId.match(/^[a-fA-F0-9]{24}$/)) {
        errors.push("Invalid purchase order ID format");
      }
      if (orderData.validateBidirectionalSetup && !orderData.autoLinkCustomer) {
        errors.push(
          "Auto-link customer should be enabled when validating bidirectional setup"
        );
      }
    }

    if (
      orderData.sourceCompanyId &&
      orderData.companyId &&
      orderData.sourceCompanyId === orderData.companyId
    ) {
      errors.push("Source company cannot be the same as target company");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // ==================== 📝 BASIC CRUD OPERATIONS ====================

  /**
   * ✅ 6. Create sales order
   */
  async createSalesOrder(orderData) {
    try {
      if (!orderData.companyId) {
        throw new Error("Company ID is required");
      }

      const enhancedOrderData = {
        ...orderData,
        sourceOrderId: orderData.sourceOrderId || null,
        sourceOrderNumber: orderData.sourceOrderNumber || null,
        sourceOrderType: orderData.sourceOrderType || null,
        sourceCompanyId: orderData.sourceCompanyId || null,
        isAutoGenerated: orderData.isAutoGenerated || false,
        generatedFrom: orderData.generatedFrom || "manual",
        generatedBy: orderData.generatedBy || null,
        targetCompanyId: orderData.targetCompanyId || null,
        autoCreateCorrespondingPO: orderData.autoCreateCorrespondingPO || false,
        autoDetectSourceCompany: orderData.autoDetectSourceCompany ?? true,
        purchaseOrderId: orderData.purchaseOrderId || null,
        preserveItemDetails: orderData.preserveItemDetails ?? true,
        preservePricing: orderData.preservePricing ?? true,
        preserveTerms: orderData.preserveTerms ?? true,
        autoAcceptOrder: orderData.autoAcceptOrder || false,
        generationNotes: orderData.generationNotes || "",
        autoLinkCustomer: orderData.autoLinkCustomer ?? true,
        validateBidirectionalSetup:
          orderData.validateBidirectionalSetup ?? true,
        customerName: orderData.customerName || null,
        customerMobile: orderData.customerMobile || null,
        customer: orderData.customer || null,
        orderType: orderData.orderType || "quotation",
        gstEnabled: orderData.gstEnabled ?? true,
        gstType:
          orderData.gstType || (orderData.gstEnabled ? "gst" : "non-gst"),
        taxMode: orderData.taxMode || "without-tax",
        priceIncludesTax: orderData.priceIncludesTax || false,
        status: orderData.status || "draft",
        priority: orderData.priority || "normal",
        roundOffEnabled: orderData.roundOffEnabled || false,
        roundOff: orderData.roundOff || 0,
        createdBy: orderData.createdBy || orderData.employeeName || null,
        lastModifiedBy: orderData.lastModifiedBy || orderData.createdBy || null,
        employeeName: orderData.employeeName || null,
        employeeId: orderData.employeeId || null,
      };

      // Additional validation and processing...
      const validation = this.validateEnhancedOrderData(enhancedOrderData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
      }

      const response = await apiClient.post(
        "/api/sales-orders",
        enhancedOrderData
      );

      return {
        success: true,
        data: response.data,
        message: response.data.message || "Sales order created successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to create sales order",
        error: error.response?.data?.error || error.message,
      };
    }
  }

  /**
   * ✅ 7. Get sales orders
   */
  async getSalesOrders(companyId, options = {}) {
    try {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      const params = {
        companyId: companyId,
        populate: "customer",
        includeCustomer: true,
        includeItems: true,
        ...options,
      };

      Object.keys(params).forEach((key) => {
        if (
          params[key] === undefined ||
          params[key] === null ||
          params[key] === ""
        ) {
          delete params[key];
        }
      });

      const response = await apiClient.get("/api/sales-orders", {params});

      if (!response.data) {
        throw new Error("No data received from server");
      }

      let salesOrders = [];
      let responseData = response.data;

      // Handle multiple response structures
      if (responseData.success !== undefined) {
        if (responseData.success === false) {
          throw new Error(responseData.message || "API returned error");
        }
        if (responseData.data) {
          if (Array.isArray(responseData.data)) {
            salesOrders = responseData.data;
          } else if (responseData.data.salesOrders) {
            salesOrders = responseData.data.salesOrders;
          } else if (responseData.data.orders) {
            salesOrders = responseData.data.orders;
          }
        }
      } else if (Array.isArray(responseData)) {
        salesOrders = responseData;
      } else if (
        responseData.salesOrders &&
        Array.isArray(responseData.salesOrders)
      ) {
        salesOrders = responseData.salesOrders;
      }

      return {
        success: true,
        data: {
          salesOrders: salesOrders,
          orders: salesOrders,
          data: salesOrders,
          count: salesOrders.length,
          pagination: responseData.pagination || {},
          summary: responseData.summary || {},
        },
        message:
          responseData.message || `Found ${salesOrders.length} sales orders`,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch sales orders",
        data: {
          salesOrders: [],
          orders: [],
          data: [],
          count: 0,
        },
      };
    }
  }

  /**
   * ✅ 8. Get sales order by ID
   */
  async getSalesOrderById(orderId) {
    try {
      if (!orderId) {
        throw new Error("Order ID is required");
      }
      const response = await apiClient.get(`/api/sales-orders/${orderId}`);
      return {
        success: true,
        data: response.data,
        message: "Sales order fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch sales order",
      };
    }
  }

  /**
   * ✅ 9. Update sales order
   */
  async updateSalesOrder(orderId, orderData) {
    try {
      const response = await apiClient.put(
        `/api/sales-orders/${orderId}`,
        orderData
      );
      return {
        success: true,
        data: response.data,
        message: "Sales order updated successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to update sales order",
      };
    }
  }

  /**
   * ✅ 10. Delete sales order
   */
  async deleteSalesOrder(orderId) {
    try {
      const response = await apiClient.delete(`/api/sales-orders/${orderId}`);
      return {
        success: true,
        data: response.data,
        message: "Sales order cancelled successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to delete sales order",
      };
    }
  }

  /**
   * ✅ ENHANCED: Generate sales order from purchase order with comprehensive tracking
   */
  async generateFromPurchaseOrder(purchaseOrderId, conversionData = {}) {
    try {
      // ✅ STEP 1: Enhanced validation with better error messages
      if (!purchaseOrderId) {
        throw new Error("Purchase Order ID is required");
      }

      if (!purchaseOrderId.match(/^[a-fA-F0-9]{24}$/)) {
        throw new Error("Invalid Purchase Order ID format");
      }

      console.log(
        "🔄 ENHANCED: Starting PO → SO generation with comprehensive tracking:",
        {
          purchaseOrderId,
          conversionData: {
            targetCompanyId: conversionData.targetCompanyId,
            autoLinkCustomer: conversionData.autoLinkCustomer,
            preserveItemDetails: conversionData.preserveItemDetails,
            preservePricing: conversionData.preservePricing,
            preserveTerms: conversionData.preserveTerms,
            validateBidirectionalSetup:
              conversionData.validateBidirectionalSetup,
          },
        }
      );

      // ✅ STEP 2: Get purchase order with comprehensive population
      const poResponse = await apiClient.get(
        `/api/purchase-orders/${purchaseOrderId}?populate=supplier,companyId,supplier.linkedCompanyId`
      );

      if (!poResponse.data) {
        throw new Error("Failed to fetch purchase order data");
      }

      const poData = poResponse.data;
      const purchaseOrder =
        poData.data?.purchaseOrder ||
        poData.purchaseOrder ||
        poData.data ||
        poData;

      if (!purchaseOrder) {
        throw new Error("Purchase order not found");
      }

      console.log("✅ ENHANCED: Purchase order fetched with population:", {
        orderId: purchaseOrder._id,
        orderNumber: purchaseOrder.orderNumber,
        hasSupplier: !!purchaseOrder.supplier,
        supplierType: typeof purchaseOrder.supplier,
        supplierLinkedCompany: purchaseOrder.supplier?.linkedCompanyId,
        hasCompanyId: !!purchaseOrder.companyId,
        companyType: typeof purchaseOrder.companyId,
        alreadyGenerated: purchaseOrder.autoGeneratedSalesOrder,
      });

      // ✅ STEP 3: Enhanced pre-generation validation
      if (purchaseOrder.autoGeneratedSalesOrder) {
        throw new Error(
          `Sales order already generated from purchase order ${purchaseOrder.orderNumber}. ` +
            `Existing sales order: ${
              purchaseOrder.salesOrderNumber || "Unknown"
            } (ID: ${purchaseOrder.salesOrderRef || "Unknown"})`
        );
      }

      if (!purchaseOrder.supplier) {
        throw new Error("Purchase order has no supplier information");
      }

      // ✅ STEP 4: Enhanced supplier validation and company detection
      let supplierId;
      let supplierDetails;

      if (
        typeof purchaseOrder.supplier === "object" &&
        purchaseOrder.supplier._id
      ) {
        supplierId = purchaseOrder.supplier._id;
        supplierDetails = purchaseOrder.supplier;
      } else if (typeof purchaseOrder.supplier === "string") {
        supplierId = purchaseOrder.supplier;

        // Fetch supplier details if not populated
        try {
          const supplierResponse = await apiClient.get(
            `/api/parties/${supplierId}?populate=linkedCompanyId`
          );
          supplierDetails =
            supplierResponse.data?.data?.party ||
            supplierResponse.data?.party ||
            supplierResponse.data?.data ||
            supplierResponse.data;
        } catch (supplierError) {
          console.warn(
            "⚠️ Could not fetch supplier details:",
            supplierError.message
          );
          supplierDetails = null;
        }
      }

      if (!supplierDetails) {
        throw new Error(
          `Invalid supplier data in purchase order. Supplier field: ${JSON.stringify(
            purchaseOrder.supplier
          )}`
        );
      }

      console.log("🔍 ENHANCED: Supplier analysis:", {
        supplierId,
        supplierName: supplierDetails.name,
        hasLinkedCompany: !!supplierDetails.linkedCompanyId,
        linkedCompanyType: typeof supplierDetails.linkedCompanyId,
        linkedCompanyId:
          supplierDetails.linkedCompanyId?._id ||
          supplierDetails.linkedCompanyId,
        linkedCompanyName: supplierDetails.linkedCompanyId?.businessName,
        isLinkedSupplier: supplierDetails.isLinkedSupplier,
        enableBidirectionalOrders: supplierDetails.enableBidirectionalOrders,
      });

      // ✅ STEP 5: Enhanced target company detection with multiple methods
      let targetCompanyId = conversionData.targetCompanyId;
      let targetCompanyDetails = null;
      let detectionMethod = "manual";

      // Priority 1: Use supplier's linkedCompanyId
      if (!targetCompanyId && supplierDetails.linkedCompanyId) {
        if (
          typeof supplierDetails.linkedCompanyId === "object" &&
          supplierDetails.linkedCompanyId._id
        ) {
          targetCompanyId = supplierDetails.linkedCompanyId._id;
          targetCompanyDetails = supplierDetails.linkedCompanyId;
          detectionMethod = "supplier_linked_company";
        } else if (typeof supplierDetails.linkedCompanyId === "string") {
          targetCompanyId = supplierDetails.linkedCompanyId;
          detectionMethod = "supplier_linked_company";

          // Fetch company details
          try {
            const companyResponse = await apiClient.get(
              `/api/companies/${targetCompanyId}`
            );
            targetCompanyDetails =
              companyResponse.data?.data?.company ||
              companyResponse.data?.company ||
              companyResponse.data?.data ||
              companyResponse.data;
          } catch (companyError) {
            console.warn(
              "⚠️ Could not fetch target company details:",
              companyError.message
            );
          }
        }
      }

      // Priority 2: Auto-detect by supplier details
      if (!targetCompanyId) {
        detectionMethod = "supplier_details_matching";
        console.log(
          "🔍 ENHANCED: Attempting company detection by supplier details..."
        );

        try {
          const companiesResponse = await apiClient.get("/api/companies");
          const companiesData = companiesResponse.data;
          const companies =
            companiesData.data?.companies ||
            companiesData.companies ||
            companiesData.data ||
            [];

          const buyerCompanyId =
            purchaseOrder.companyId?._id || purchaseOrder.companyId;

          // Match by GST, phone, or email
          const matchingCompany = companies.find(
            (company) =>
              company._id.toString() !== buyerCompanyId.toString() &&
              ((supplierDetails.gstNumber &&
                company.gstin === supplierDetails.gstNumber) ||
                (supplierDetails.phoneNumber &&
                  company.phoneNumber === supplierDetails.phoneNumber) ||
                (supplierDetails.email &&
                  company.email === supplierDetails.email) ||
                (supplierDetails.name &&
                  company.businessName &&
                  company.businessName.toLowerCase() ===
                    supplierDetails.name.toLowerCase()))
          );

          if (matchingCompany) {
            targetCompanyId = matchingCompany._id;
            targetCompanyDetails = matchingCompany;
            console.log(
              "✅ ENHANCED: Found matching company by supplier details:",
              {
                companyId: matchingCompany._id,
                companyName: matchingCompany.businessName,
                matchedBy:
                  supplierDetails.gstNumber === matchingCompany.gstin
                    ? "GST"
                    : supplierDetails.phoneNumber ===
                      matchingCompany.phoneNumber
                    ? "Phone"
                    : supplierDetails.email === matchingCompany.email
                    ? "Email"
                    : "Name",
              }
            );
          }
        } catch (companiesError) {
          console.warn(
            "⚠️ ENHANCED: Company detection by supplier details failed:",
            companiesError.message
          );
        }
      }

      if (!targetCompanyId) {
        throw new Error(
          `🚨 ENHANCED ERROR: Cannot determine target company for sales order generation.\n\n` +
            `The supplier "${supplierDetails.name}" must have:\n` +
            `1. A linkedCompanyId pointing to their company, OR\n` +
            `2. Matching GST/phone/email with an existing company, OR\n` +
            `3. Manual targetCompanyId provided in conversion data.\n\n` +
            `Current supplier data:\n` +
            `- Name: ${supplierDetails.name}\n` +
            `- LinkedCompanyId: ${
              supplierDetails.linkedCompanyId || "None"
            }\n` +
            `- GST: ${supplierDetails.gstNumber || "None"}\n` +
            `- Phone: ${supplierDetails.phoneNumber || "None"}\n` +
            `- Email: ${supplierDetails.email || "None"}\n\n` +
            `Please link the supplier to a company first or provide targetCompanyId manually.`
        );
      }

      // ✅ STEP 6: Enhanced circular reference validation
      const buyerCompanyId =
        purchaseOrder.companyId?._id || purchaseOrder.companyId;

      if (targetCompanyId.toString() === buyerCompanyId.toString()) {
        throw new Error(
          `🚨 ENHANCED CIRCULAR REFERENCE ERROR:\n\n` +
            `The supplier's target company (${targetCompanyId}) cannot be the same as the buyer company (${buyerCompanyId}).\n\n` +
            `This would create a circular reference where a company would generate a sales order to sell to itself.\n\n` +
            `Current setup:\n` +
            `- Purchase Order: Created by Company ${buyerCompanyId}\n` +
            `- Supplier: ${supplierDetails.name}\n` +
            `- Supplier's Linked Company: ${targetCompanyId}\n` +
            `- Detection Method: ${detectionMethod}\n\n` +
            `Solution: The supplier should be linked to a DIFFERENT company that will create the sales order.\n` +
            `The flow should be: Company A creates PO → Supplier (linked to Company B) → Company B creates SO to sell back to Company A.`
        );
      }

      console.log("✅ ENHANCED: Target company validation passed:", {
        buyerCompanyId,
        targetCompanyId,
        targetCompanyName: targetCompanyDetails?.businessName || "Unknown",
        detectionMethod,
        supplierName: supplierDetails.name,
      });

      // ✅ STEP 7: Prepare enhanced request payload
      const enhancedPayload = {
        purchaseOrderId,

        // ✅ Enhanced targeting
        targetCompanyId,
        sourceCompanyId: buyerCompanyId,

        // ✅ Enhanced conversion options
        autoLinkCustomer: conversionData.autoLinkCustomer ?? true,
        validateBidirectionalSetup:
          conversionData.validateBidirectionalSetup ?? true,
        preserveItemDetails: conversionData.preserveItemDetails ?? true,
        preservePricing: conversionData.preservePricing ?? true,
        preserveTerms: conversionData.preserveTerms ?? true,
        autoAcceptOrder: conversionData.autoAcceptOrder ?? false,

        // ✅ Enhanced metadata
        generationNotes:
          conversionData.generationNotes ||
          `Auto-generated from PO ${purchaseOrder.orderNumber} via enhanced bidirectional flow (${detectionMethod})`,
        convertedBy: conversionData.convertedBy || null,

        // ✅ Enhanced tracking context
        enhancedTracking: {
          detectionMethod,
          supplierDetails: {
            id: supplierDetails._id,
            name: supplierDetails.name,
            linkedCompanyId: supplierDetails.linkedCompanyId,
          },
          targetCompanyDetails: {
            id: targetCompanyId,
            name: targetCompanyDetails?.businessName || "Unknown",
          },
          sourceCompanyDetails: {
            id: buyerCompanyId,
            name: purchaseOrder.companyId?.businessName || "Buyer Company",
          },
        },
      };

      console.log("📦 ENHANCED: Final request payload prepared:", {
        purchaseOrderId: enhancedPayload.purchaseOrderId,
        targetCompanyId: enhancedPayload.targetCompanyId,
        sourceCompanyId: enhancedPayload.sourceCompanyId,
        detectionMethod,
        preservationSettings: {
          items: enhancedPayload.preserveItemDetails,
          pricing: enhancedPayload.preservePricing,
          terms: enhancedPayload.preserveTerms,
        },
        autoSettings: {
          linkCustomer: enhancedPayload.autoLinkCustomer,
          validateSetup: enhancedPayload.validateBidirectionalSetup,
          autoAccept: enhancedPayload.autoAcceptOrder,
        },
      });

      // ✅ STEP 8: Make the enhanced API call
      const response = await apiClient.post(
        `/api/sales-orders/generate-from-purchase/${purchaseOrderId}`,
        enhancedPayload
      );

      console.log(
        "✅ ENHANCED: Sales order generation completed successfully:",
        {
          success: response.data.success,
          salesOrderId: response.data.data?.salesOrder?._id,
          salesOrderNumber: response.data.data?.salesOrder?.orderNumber,
          customerCreated: response.data.data?.customerCreated,
          customerLinked: response.data.data?.customerLinked,
          sourceCompanyTracking: response.data.data?.sourceCompanyTracking,
          bidirectionalTracking: response.data.data?.bidirectionalTracking,
        }
      );

      return {
        success: true,
        data: {
          salesOrder: response.data.data?.salesOrder,
          purchaseOrder: response.data.data?.purchaseOrder,
          customer: response.data.data?.customer,

          // ✅ Enhanced tracking information
          enhancedTracking: {
            detectionMethod,
            targetCompanyId,
            sourceCompanyId: buyerCompanyId,
            supplierDetails,
            targetCompanyDetails,
            customerCreated: response.data.data?.customerCreated,
            customerLinked: response.data.data?.customerLinked,
            preservationApplied: {
              items: enhancedPayload.preserveItemDetails,
              pricing: enhancedPayload.preservePricing,
              terms: enhancedPayload.preserveTerms,
            },
            validationResults: response.data.data?.bidirectionalTracking,
          },

          // ✅ Enhanced conversion summary
          conversionSummary: {
            originalPurchaseOrder: purchaseOrder.orderNumber,
            generatedSalesOrder: response.data.data?.salesOrder?.orderNumber,
            buyerCompany:
              purchaseOrder.companyId?.businessName || "Buyer Company",
            supplierCompany:
              targetCompanyDetails?.businessName || "Supplier Company",
            supplier: supplierDetails.name,
            detectionMethod,
            itemsConverted: response.data.data?.salesOrder?.items?.length || 0,
            totalAmount:
              response.data.data?.salesOrder?.totals?.finalTotal || 0,
            preservationStatus: {
              itemsPreserved: enhancedPayload.preserveItemDetails,
              pricingPreserved: enhancedPayload.preservePricing,
              termsPreserved: enhancedPayload.preserveTerms,
            },
          },
        },
        message:
          response.data.message ||
          "Sales order generated from purchase order successfully with enhanced tracking",
      };
    } catch (error) {
      console.error("❌ ENHANCED: PO → SO generation failed:", {
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status,
      });

      // ✅ Enhanced error categorization and messages
      let errorMessage = "Failed to generate sales order from purchase order";
      let errorCategory = "GENERAL_ERROR";

      if (
        error.message?.includes("same as the buyer company") ||
        error.message?.includes("CIRCULAR REFERENCE")
      ) {
        errorCategory = "CIRCULAR_REFERENCE";
        errorMessage = error.message; // Use the detailed circular reference error
      } else if (
        error.message?.includes("Cannot determine target company") ||
        error.message?.includes("ENHANCED ERROR")
      ) {
        errorCategory = "TARGET_COMPANY_DETECTION";
        errorMessage = error.message; // Use the detailed target company error
      } else if (error.message?.includes("already generated")) {
        errorCategory = "DUPLICATE_GENERATION";
        errorMessage = error.message; // Use the duplicate generation error
      } else if (
        error.message?.includes("no supplier") ||
        error.message?.includes("Invalid supplier")
      ) {
        errorCategory = "SUPPLIER_VALIDATION";
        errorMessage = error.message; // Use the supplier validation error
      } else if (error.message?.includes("Purchase Order ID is required")) {
        errorCategory = "MISSING_PURCHASE_ORDER_ID";
        errorMessage = "Purchase Order ID is required";
      } else if (error.message?.includes("Invalid Purchase Order ID format")) {
        errorCategory = "INVALID_PURCHASE_ORDER_ID";
        errorMessage = "Invalid Purchase Order ID format";
      } else if (error.message?.includes("Purchase order not found")) {
        errorCategory = "PURCHASE_ORDER_NOT_FOUND";
        errorMessage = "Purchase order not found";
      } else if (error.response?.status === 400) {
        errorCategory = "BAD_REQUEST";
        errorMessage =
          error.response.data?.message ||
          "Invalid purchase order for conversion";
      } else if (error.response?.status === 404) {
        errorCategory = "NOT_FOUND";
        errorMessage = "Purchase order not found";
      } else if (error.response?.status === 403) {
        errorCategory = "PERMISSION_DENIED";
        errorMessage =
          "Access denied. You may not have permission to generate sales orders.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage,
        errorCategory,
        error: {
          originalError: error.message,
          response: error.response?.data,
          status: error.response?.status,
          details: error.response?.data?.details,
        },
        data: null,
      };
    }
  }

  /**
   * ✅ NEW: Get sales (alias for getSalesOrders for backward compatibility with PayIn)
   */
  async getSales(companyId, filters = {}) {
    console.log("🔄 getSales called - redirecting to getSalesOrders");
    return this.getSalesOrders(companyId, filters);
  }

  /**
   * ✅ IMPROVED: Get pending sales orders for payment (specific for PayIn component)
   */
  async getPendingSalesForPayment(companyId, customerId, customerName = null) {
    try {
      console.log("💰 Loading pending sales for payment:", {
        companyId,
        customerId,
        customerName,
      });

      if (!companyId) {
        throw new Error("Company ID is required");
      }

      if (!customerId && !customerName) {
        throw new Error("Customer ID or name is required");
      }

      const filters = {
        customerId: customerId,
        customerName: customerName,
        status: "sent,confirmed,delivered,pending", // Orders that can receive payments
        orderType: "sales_order", // Only sales orders, not quotations
        limit: 100,
        page: 1,
        // Add date range to limit results (last 2 years)
        dateFrom: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        dateTo: new Date().toISOString().split("T")[0],
      };

      const response = await this.getSalesOrders(companyId, filters);

      if (response.success) {
        const allOrders =
          response.data.salesOrders ||
          response.data.orders ||
          response.data.data ||
          [];
        console.log("📋 Total orders fetched:", allOrders.length);

        // ✅ IMPROVED: Better customer matching
        const ordersWithPending = allOrders.filter((order) => {
          if (!order) return false;

          // Verify customer match (more flexible matching)
          const orderCustomerId =
            order.customerId || order.customer?._id || order.customer?.id;
          const orderCustomerName =
            order.customerName ||
            order.customer?.name ||
            order.customer?.businessName ||
            order.partyName;
          const orderCustomerPhone =
            order.customerPhone ||
            order.mobileNumber ||
            order.customer?.phone ||
            order.customer?.mobile;

          const partyId = customerId;
          const partyName = customerName;

          const isCustomerMatch =
            (orderCustomerId && orderCustomerId === partyId) ||
            (orderCustomerName &&
              orderCustomerName.toLowerCase() === partyName?.toLowerCase()) ||
            (orderCustomerPhone && orderCustomerPhone === partyName); // Phone match as fallback

          if (!isCustomerMatch) {
            console.log("❌ Customer mismatch for order:", order.orderNumber, {
              orderCustomerId,
              orderCustomerName,
              orderCustomerPhone,
              partyId,
              partyName,
            });
            return false;
          }

          // Check pending amount
          const totalAmount = parseFloat(
            order.totalAmount ||
              order.amount ||
              order.finalTotal ||
              order.grandTotal ||
              0
          );
          const paidAmount = parseFloat(
            order.paidAmount || order.amountPaid || order.receivedAmount || 0
          );
          const pendingAmount = totalAmount - paidAmount;

          console.log(
            `💸 Order ${order.orderNumber || order._id} payment status:`,
            {
              totalAmount,
              paidAmount,
              pendingAmount,
              hasPending: pendingAmount > 0.01,
            }
          );

          return pendingAmount > 0.01; // At least 1 paisa pending
        });

        console.log(
          "✅ Orders with pending amounts:",
          ordersWithPending.length
        );

        // Sort by order date (newest first)
        ordersWithPending.sort((a, b) => {
          const dateA = new Date(
            a.orderDate || a.saleDate || a.quotationDate || a.createdAt
          );
          const dateB = new Date(
            b.orderDate || b.saleDate || b.quotationDate || b.createdAt
          );
          return dateB - dateA;
        });

        const totalPending = ordersWithPending.reduce((sum, order) => {
          const total = parseFloat(
            order.totalAmount || order.amount || order.finalTotal || 0
          );
          const paid = parseFloat(order.paidAmount || order.amountPaid || 0);
          return sum + (total - paid);
        }, 0);

        return {
          success: true,
          data: {
            salesOrders: ordersWithPending,
            orders: ordersWithPending,
            data: ordersWithPending,
            count: ordersWithPending.length,
            totalPending: totalPending,
          },
          message: `Found ${ordersWithPending.length} pending sales orders`,
        };
      }

      return response;
    } catch (error) {
      console.error("❌ Error in getPendingSalesForPayment:", error);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch pending sales orders",
        data: {
          salesOrders: [],
          orders: [],
          data: [],
          count: 0,
          totalPending: 0,
        },
      };
    }
  }

  /**
   * ✅ NEW: Get customer's sales order summary for payment
   */
  async getCustomerOrderSummary(companyId, customerId, customerName = null) {
    try {
      const response = await this.getPendingSalesForPayment(
        companyId,
        customerId,
        customerName
      );

      if (response.success) {
        const orders = response.data.salesOrders || [];

        const summary = {
          totalOrders: orders.length,
          totalPendingAmount: response.data.totalPending || 0,
          oldestPendingOrder:
            orders.length > 0 ? orders[orders.length - 1] : null,
          newestOrder: orders.length > 0 ? orders[0] : null,
          ordersByStatus: {},
        };

        // Group by status
        orders.forEach((order) => {
          const status = order.status || "pending";
          if (!summary.ordersByStatus[status]) {
            summary.ordersByStatus[status] = 0;
          }
          summary.ordersByStatus[status]++;
        });

        return {
          success: true,
          data: summary,
          message: "Customer order summary fetched successfully",
        };
      }

      return response;
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to fetch customer order summary",
        data: null,
      };
    }
  }

  /**
   * Get sales order by ID with full details
   */
  async getSalesOrderById(orderId) {
    try {
      if (!orderId) {
        throw new Error("Order ID is required");
      }

      const response = await apiClient.get(`/api/sales-orders/${orderId}`);
      return {
        success: true,
        data: response.data,
        message: "Sales order fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch sales order",
      };
    }
  }

  /**
   * ✅ NEW: Get sales orders by source purchase order
   */
  async getSalesOrdersBySourcePurchaseOrder(purchaseOrderId, companyId = null) {
    try {
      if (!purchaseOrderId) {
        console.error("❌ Purchase Order ID is required but not provided");
        throw new Error("Purchase Order ID is required");
      }

      // ✅ FIX: Get company ID from multiple sources
      const resolvedCompanyId =
        companyId ||
        localStorage.getItem("currentCompanyId") ||
        localStorage.getItem("companyId");

      if (!resolvedCompanyId) {
        console.error("❌ Company ID is required but not provided");
        throw new Error("Company ID is required");
      }

      const params = {
        companyId: resolvedCompanyId, // ✅ ADD: Include company ID
        sourceOrderId: purchaseOrderId,
        sourceOrderType: "purchase_order",
        isAutoGenerated: true,
      };

      // ✅ Fix the timer issue
      const timerLabel = `API_REQUEST_DURATION_${Date.now()}`;
      console.time(timerLabel);

      const response = await apiClient.get("/api/sales-orders", {params});

      const rawData = response.data;
      let salesOrders = [];

      if (rawData.success && rawData.data) {
        salesOrders = rawData.data.salesOrders || rawData.data.orders || [];
      } else if (Array.isArray(rawData)) {
        salesOrders = rawData;
      }

      const result = {
        success: true,
        data: {
          salesOrders,
          count: salesOrders.length,
        },
        message: `Found ${salesOrders.length} sales orders from purchase order`,
      };

      return result;
    } catch (error) {
      console.error("❌ Error in getSalesOrdersBySourcePurchaseOrder:");

      // ✅ Enhanced error logging to see backend response
      if (error.response) {
        console.error("🔍 Backend Error Response:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
        });

        // Log the specific error message from backend
        if (error.response.data) {
          console.error("📋 Backend Error Details:", error.response.data);
        }
      }

      const errorResult = {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch sales orders by source purchase order",
        data: {
          salesOrders: [],
          count: 0,
        },
        error: {
          originalError: error.message,
          response: error.response?.data,
          status: error.response?.status,
        },
      };

      console.log("💥 Error result:", errorResult);
      return errorResult;
    }
  }

  // ==================== FILTERING AND SEARCH ====================

  /**
   * Get quotations
   */
  async getQuotations(companyId, filters = {}) {
    try {
      const params = new URLSearchParams({
        companyId,
        orderType: "quotation",
        page: filters.page || 1,
        limit: filters.limit || 50,
      });

      // Add date filters if provided
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);
      if (filters.status) params.append("status", filters.status);
      if (filters.search) params.append("search", filters.search);

      const response = await apiClient.get(
        `/api/sales-orders/quotations?${params.toString()}`
      );

      // Flatten the nested response structure
      const rawData = response.data.data || response.data;

      // Handle nested quotations structure
      let quotationsArray = [];

      if (rawData.quotations && rawData.quotations.salesOrders) {
        quotationsArray = rawData.quotations.salesOrders;
      } else if (rawData.salesOrders) {
        quotationsArray = rawData.salesOrders;
      } else if (rawData.quotations && Array.isArray(rawData.quotations)) {
        quotationsArray = rawData.quotations;
      } else if (Array.isArray(rawData)) {
        quotationsArray = rawData;
      }

      // Ensure we always return an array
      const finalArray = Array.isArray(quotationsArray) ? quotationsArray : [];

      return {
        success: true,
        data: {
          quotations: finalArray,
          salesOrders: finalArray,
          pagination:
            rawData.quotations?.pagination || rawData.pagination || {},
          summary: rawData.quotations?.summary || rawData.summary || {},
        },
        message: response.data.message || "Quotations fetched successfully",
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          success: true,
          data: {
            quotations: [],
            salesOrders: [],
          },
          message: "No quotations found",
        };
      }

      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch quotations",
        data: {
          quotations: [],
          salesOrders: [],
        },
      };
    }
  }

  async checkGenerationEligibility(orderId, orderType = "sales") {
    try {
      const order = await this.getSalesOrderById(orderId);

      if (!order.success) {
        throw new Error("Order not found");
      }

      const orderData = order.data.data || order.data;

      const eligibility = {
        canGenerate: true,
        reasons: [],
        warnings: [],
        orderStatus: orderData.status,
        alreadyGenerated: false,
      };

      // Check if already generated
      if (orderType === "purchase" && orderData.autoGeneratedPurchaseOrder) {
        eligibility.canGenerate = false;
        eligibility.alreadyGenerated = true;
        eligibility.reasons.push(
          "Purchase order already generated from this sales order"
        );
      }

      // Check order status
      if (["cancelled", "deleted", "expired"].includes(orderData.status)) {
        eligibility.canGenerate = false;
        eligibility.reasons.push(
          `Cannot generate from ${orderData.status} order`
        );
      }

      // Check customer linking (for PO generation)
      if (orderType === "purchase" && !orderData.customer?.linkedCompanyId) {
        eligibility.warnings.push(
          "Customer is not linked to a company - manual target company may be required"
        );
      }

      return {
        success: true,
        data: eligibility,
        message: eligibility.canGenerate
          ? "Order is eligible for generation"
          : "Order is not eligible for generation",
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to check generation eligibility",
        data: {
          canGenerate: false,
          reasons: [error.message],
          warnings: [],
        },
      };
    }
  }

  async validateBidirectionalSetup(companyId, customerId) {
    try {
      // Get customer details to check linking
      const customerResponse = await fetch(
        `${apiConfig.baseURL}/api/parties/${customerId}`,
        {
          headers: {
            Authorization: `Bearer ${
              localStorage.getItem("token") || localStorage.getItem("authToken")
            }`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!customerResponse.ok) {
        throw new Error("Failed to fetch customer details");
      }

      const customerData = await customerResponse.json();
      const customer =
        customerData.data?.party ||
        customerData.party ||
        customerData.data ||
        customerData;

      const validation = {
        isValid: true,
        warnings: [],
        errors: [],
        customer: {
          id: customer._id,
          name: customer.name,
          linkedCompanyId: customer.linkedCompanyId,
          isLinkedCustomer: customer.isLinkedCustomer,
          enableBidirectionalOrders: customer.enableBidirectionalOrders,
        },
      };

      // Check for bidirectional readiness
      if (!customer.linkedCompanyId) {
        validation.warnings.push("Customer does not have a linked company ID");
      }

      if (!customer.isLinkedCustomer) {
        validation.warnings.push("Customer is not marked as a linked customer");
      }

      if (!customer.enableBidirectionalOrders) {
        validation.errors.push(
          "Bidirectional orders are not enabled for this customer"
        );
        validation.isValid = false;
      }

      if (customer.linkedCompanyId?.toString() === companyId.toString()) {
        validation.errors.push(
          "Customer's linked company cannot be the same as source company"
        );
        validation.isValid = false;
      }

      return {
        success: true,
        data: validation,
        message: validation.isValid
          ? "Bidirectional setup is valid"
          : "Bidirectional setup has issues",
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to validate bidirectional setup",
        data: {
          isValid: false,
          errors: [error.message],
          warnings: [],
        },
      };
    }
  }
  /**
   * Get sales orders
   */
  async getOrders(companyId, filters = {}) {
    try {
      const params = {companyId, ...filters};
      const response = await apiClient.get("/api/sales-orders/orders", {
        params,
      });
      return {
        success: true,
        data: response.data,
        message: "Sales orders fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch sales orders",
      };
    }
  }

  /**
   * ✅ FIXED: Generate sales order from purchase order with proper company validation
   */
  async generateFromPurchaseOrder(purchaseOrderId, conversionData = {}) {
    try {
      // ✅ STEP 1: Enhanced validation with better error messages
      if (!purchaseOrderId) {
        throw new Error("Purchase Order ID is required");
      }

      if (!purchaseOrderId.match(/^[a-fA-F0-9]{24}$/)) {
        throw new Error("Invalid Purchase Order ID format");
      }

      console.log(
        "🔄 ENHANCED: Starting PO → SO generation with comprehensive tracking:",
        {
          purchaseOrderId,
          conversionData: {
            targetCompanyId: conversionData.targetCompanyId,
            autoLinkCustomer: conversionData.autoLinkCustomer,
            preserveItemDetails: conversionData.preserveItemDetails,
            preservePricing: conversionData.preservePricing,
            preserveTerms: conversionData.preserveTerms,
            validateBidirectionalSetup:
              conversionData.validateBidirectionalSetup,
          },
        }
      );

      // ✅ STEP 2: Get purchase order with comprehensive population
      const poResponse = await apiClient.get(
        `/api/purchase-orders/${purchaseOrderId}?populate=supplier,companyId,supplier.linkedCompanyId`
      );

      if (!poResponse.data) {
        throw new Error("Failed to fetch purchase order data");
      }

      const poData = poResponse.data;
      const purchaseOrder =
        poData.data?.purchaseOrder ||
        poData.purchaseOrder ||
        poData.data ||
        poData;

      if (!purchaseOrder) {
        throw new Error("Purchase order not found");
      }

      console.log("✅ ENHANCED: Purchase order fetched with population:", {
        orderId: purchaseOrder._id,
        orderNumber: purchaseOrder.orderNumber,
        hasSupplier: !!purchaseOrder.supplier,
        supplierType: typeof purchaseOrder.supplier,
        supplierLinkedCompany: purchaseOrder.supplier?.linkedCompanyId,
        hasCompanyId: !!purchaseOrder.companyId,
        companyType: typeof purchaseOrder.companyId,
        alreadyGenerated: purchaseOrder.autoGeneratedSalesOrder,
        targetCompanyId: purchaseOrder.targetCompanyId, // ✅ IMPORTANT: Check existing target
      });

      // ✅ STEP 3: Enhanced pre-generation validation
      if (purchaseOrder.autoGeneratedSalesOrder) {
        throw new Error(
          `Sales order already generated from purchase order ${purchaseOrder.orderNumber}. ` +
            `Existing sales order: ${
              purchaseOrder.salesOrderNumber || "Unknown"
            } (ID: ${purchaseOrder.salesOrderRef || "Unknown"})`
        );
      }

      if (!purchaseOrder.supplier) {
        throw new Error("Purchase order has no supplier information");
      }

      // ✅ STEP 4: Enhanced supplier validation and company detection
      let supplierId;
      let supplierDetails;

      if (
        typeof purchaseOrder.supplier === "object" &&
        purchaseOrder.supplier._id
      ) {
        supplierId = purchaseOrder.supplier._id;
        supplierDetails = purchaseOrder.supplier;
      } else if (typeof purchaseOrder.supplier === "string") {
        supplierId = purchaseOrder.supplier;

        // Fetch supplier details if not populated
        try {
          const supplierResponse = await apiClient.get(
            `/api/parties/${supplierId}?populate=linkedCompanyId`
          );
          supplierDetails =
            supplierResponse.data?.data?.party ||
            supplierResponse.data?.party ||
            supplierResponse.data?.data ||
            supplierResponse.data;
        } catch (supplierError) {
          console.warn(
            "⚠️ Could not fetch supplier details:",
            supplierError.message
          );
          supplierDetails = null;
        }
      }

      if (!supplierDetails) {
        throw new Error(
          `Invalid supplier data in purchase order. Supplier field: ${JSON.stringify(
            purchaseOrder.supplier
          )}`
        );
      }

      console.log("🔍 ENHANCED: Supplier analysis:", {
        supplierId,
        supplierName: supplierDetails.name,
        hasLinkedCompany: !!supplierDetails.linkedCompanyId,
        linkedCompanyType: typeof supplierDetails.linkedCompanyId,
        linkedCompanyId:
          supplierDetails.linkedCompanyId?._id ||
          supplierDetails.linkedCompanyId,
        linkedCompanyName: supplierDetails.linkedCompanyId?.businessName,
        isLinkedSupplier: supplierDetails.isLinkedSupplier,
        enableBidirectionalOrders: supplierDetails.enableBidirectionalOrders,
      });

      // ✅ STEP 5: FIXED - Enhanced target company detection with priority logic
      let targetCompanyId = null;
      let targetCompanyDetails = null;
      let detectionMethod = "manual";

      // ✅ PRIORITY 1: Use existing targetCompanyId from purchase order if available
      if (purchaseOrder.targetCompanyId) {
        targetCompanyId =
          purchaseOrder.targetCompanyId._id || purchaseOrder.targetCompanyId;
        detectionMethod = "existing_target_company_id";
        console.log(
          "🎯 Using existing targetCompanyId from purchase order:",
          targetCompanyId
        );

        // Fetch company details
        try {
          const companyResponse = await apiClient.get(
            `/api/companies/${targetCompanyId}`
          );
          targetCompanyDetails =
            companyResponse.data?.data?.company ||
            companyResponse.data?.company ||
            companyResponse.data?.data ||
            companyResponse.data;
        } catch (companyError) {
          console.warn(
            "⚠️ Could not fetch existing target company details:",
            companyError.message
          );
        }
      }

      // ✅ PRIORITY 2: Use manual targetCompanyId from conversionData
      if (!targetCompanyId && conversionData.targetCompanyId) {
        targetCompanyId = conversionData.targetCompanyId;
        detectionMethod = "manual_conversion_data";
        console.log(
          "🎯 Using manual targetCompanyId from conversion data:",
          targetCompanyId
        );
      }

      // ✅ PRIORITY 3: Use supplier's linkedCompanyId
      if (!targetCompanyId && supplierDetails.linkedCompanyId) {
        if (
          typeof supplierDetails.linkedCompanyId === "object" &&
          supplierDetails.linkedCompanyId._id
        ) {
          targetCompanyId = supplierDetails.linkedCompanyId._id;
          targetCompanyDetails = supplierDetails.linkedCompanyId;
          detectionMethod = "supplier_linked_company";
        } else if (typeof supplierDetails.linkedCompanyId === "string") {
          targetCompanyId = supplierDetails.linkedCompanyId;
          detectionMethod = "supplier_linked_company";

          // Fetch company details
          try {
            const companyResponse = await apiClient.get(
              `/api/companies/${targetCompanyId}`
            );
            targetCompanyDetails =
              companyResponse.data?.data?.company ||
              companyResponse.data?.company ||
              companyResponse.data?.data ||
              companyResponse.data;
          } catch (companyError) {
            console.warn(
              "⚠️ Could not fetch target company details:",
              companyError.message
            );
          }
        }
      }

      // ✅ PRIORITY 4: Auto-detect by supplier details (only if no other method worked)
      if (!targetCompanyId) {
        detectionMethod = "supplier_details_matching";
        console.log(
          "🔍 ENHANCED: Attempting company detection by supplier details..."
        );

        try {
          const companiesResponse = await apiClient.get("/api/companies");
          const companiesData = companiesResponse.data;
          const companies =
            companiesData.data?.companies ||
            companiesData.companies ||
            companiesData.data ||
            [];

          const buyerCompanyId =
            purchaseOrder.companyId?._id || purchaseOrder.companyId;

          // Match by GST, phone, or email
          const matchingCompany = companies.find(
            (company) =>
              company._id.toString() !== buyerCompanyId.toString() &&
              ((supplierDetails.gstNumber &&
                company.gstin === supplierDetails.gstNumber) ||
                (supplierDetails.phoneNumber &&
                  company.phoneNumber === supplierDetails.phoneNumber) ||
                (supplierDetails.email &&
                  company.email === supplierDetails.email) ||
                (supplierDetails.name &&
                  company.businessName &&
                  company.businessName.toLowerCase() ===
                    supplierDetails.name.toLowerCase()))
          );

          if (matchingCompany) {
            targetCompanyId = matchingCompany._id;
            targetCompanyDetails = matchingCompany;
            console.log(
              "✅ ENHANCED: Found matching company by supplier details:",
              {
                companyId: matchingCompany._id,
                companyName: matchingCompany.businessName,
                matchedBy:
                  supplierDetails.gstNumber === matchingCompany.gstin
                    ? "GST"
                    : supplierDetails.phoneNumber ===
                      matchingCompany.phoneNumber
                    ? "Phone"
                    : supplierDetails.email === matchingCompany.email
                    ? "Email"
                    : "Name",
              }
            );
          }
        } catch (companiesError) {
          console.warn(
            "⚠️ ENHANCED: Company detection by supplier details failed:",
            companiesError.message
          );
        }
      }

      if (!targetCompanyId) {
        throw new Error(
          `🚨 ENHANCED ERROR: Cannot determine target company for sales order generation.\n\n` +
            `The supplier "${supplierDetails.name}" must have:\n` +
            `1. A linkedCompanyId pointing to their company, OR\n` +
            `2. Matching GST/phone/email with an existing company, OR\n` +
            `3. Manual targetCompanyId provided in conversion data.\n\n` +
            `Current supplier data:\n` +
            `- Name: ${supplierDetails.name}\n` +
            `- LinkedCompanyId: ${
              supplierDetails.linkedCompanyId || "None"
            }\n` +
            `- GST: ${supplierDetails.gstNumber || "None"}\n` +
            `- Phone: ${supplierDetails.phoneNumber || "None"}\n` +
            `- Email: ${supplierDetails.email || "None"}\n\n` +
            `Please link the supplier to a company first or provide targetCompanyId manually.`
        );
      }

      // ✅ STEP 6: FIXED - Enhanced circular reference validation with proper string comparison
      const buyerCompanyId =
        purchaseOrder.companyId?._id || purchaseOrder.companyId;

      // ✅ CRITICAL FIX: Proper string comparison with trimming and type conversion
      const buyerCompanyIdString = buyerCompanyId
        ? buyerCompanyId.toString().trim()
        : "";
      const targetCompanyIdString = targetCompanyId
        ? targetCompanyId.toString().trim()
        : "";

      console.log("🔍 COMPANY VALIDATION DEBUG:", {
        buyerCompanyId: buyerCompanyIdString,
        targetCompanyId: targetCompanyIdString,
        buyerType: typeof buyerCompanyId,
        targetType: typeof targetCompanyId,
        areEqual: buyerCompanyIdString === targetCompanyIdString,
        buyerLength: buyerCompanyIdString.length,
        targetLength: targetCompanyIdString.length,
        originalBuyer: purchaseOrder.companyId,
        originalTarget: targetCompanyId,
        detectionMethod,
      });

      // ✅ FIXED: Only validate if both IDs exist and are the same
      if (
        buyerCompanyIdString &&
        targetCompanyIdString &&
        buyerCompanyIdString === targetCompanyIdString
      ) {
        throw new Error(
          `🚨 ENHANCED CIRCULAR REFERENCE ERROR:\n\n` +
            `The supplier's target company (${targetCompanyIdString}) cannot be the same as the buyer company (${buyerCompanyIdString}).\n\n` +
            `This would create a circular reference where a company would generate a sales order to sell to itself.\n\n` +
            `Current setup:\n` +
            `- Purchase Order: Created by Company ${buyerCompanyIdString}\n` +
            `- Supplier: ${supplierDetails.name}\n` +
            `- Supplier's Linked Company: ${targetCompanyIdString}\n` +
            `- Detection Method: ${detectionMethod}\n\n` +
            `Solution: The supplier should be linked to a DIFFERENT company that will create the sales order.\n` +
            `The flow should be: Company A creates PO → Supplier (linked to Company B) → Company B creates SO to sell back to Company A.`
        );
      }

      console.log("✅ ENHANCED: Target company validation passed:", {
        buyerCompanyId: buyerCompanyIdString,
        targetCompanyId: targetCompanyIdString,
        targetCompanyName: targetCompanyDetails?.businessName || "Unknown",
        detectionMethod,
        supplierName: supplierDetails.name,
        validationPassed: true,
      });

      // ✅ STEP 7: Prepare enhanced request payload
      const enhancedPayload = {
        purchaseOrderId,

        // ✅ Enhanced targeting
        targetCompanyId,
        sourceCompanyId: buyerCompanyId,

        // ✅ Enhanced conversion options
        autoLinkCustomer: conversionData.autoLinkCustomer ?? true,
        validateBidirectionalSetup:
          conversionData.validateBidirectionalSetup ?? true,
        preserveItemDetails: conversionData.preserveItemDetails ?? true,
        preservePricing: conversionData.preservePricing ?? true,
        preserveTerms: conversionData.preserveTerms ?? true,
        autoAcceptOrder: conversionData.autoAcceptOrder ?? false,

        // ✅ Enhanced metadata
        generationNotes:
          conversionData.generationNotes ||
          `Auto-generated from PO ${purchaseOrder.orderNumber} via enhanced bidirectional flow (${detectionMethod})`,
        convertedBy: conversionData.convertedBy || null,

        // ✅ Enhanced tracking context
        enhancedTracking: {
          detectionMethod,
          supplierDetails: {
            id: supplierDetails._id,
            name: supplierDetails.name,
            linkedCompanyId: supplierDetails.linkedCompanyId,
          },
          targetCompanyDetails: {
            id: targetCompanyId,
            name: targetCompanyDetails?.businessName || "Unknown",
          },
          sourceCompanyDetails: {
            id: buyerCompanyId,
            name: purchaseOrder.companyId?.businessName || "Buyer Company",
          },
        },
      };

      console.log("📦 ENHANCED: Final request payload prepared:", {
        purchaseOrderId: enhancedPayload.purchaseOrderId,
        targetCompanyId: enhancedPayload.targetCompanyId,
        sourceCompanyId: enhancedPayload.sourceCompanyId,
        detectionMethod,
        preservationSettings: {
          items: enhancedPayload.preserveItemDetails,
          pricing: enhancedPayload.preservePricing,
          terms: enhancedPayload.preserveTerms,
        },
        autoSettings: {
          linkCustomer: enhancedPayload.autoLinkCustomer,
          validateSetup: enhancedPayload.validateBidirectionalSetup,
          autoAccept: enhancedPayload.autoAcceptOrder,
        },
      });

      // ✅ STEP 8: Make the enhanced API call
      const response = await apiClient.post(
        `/api/sales-orders/generate-from-purchase/${purchaseOrderId}`,
        enhancedPayload
      );

      console.log(
        "✅ ENHANCED: Sales order generation completed successfully:",
        {
          success: response.data.success,
          salesOrderId: response.data.data?.salesOrder?._id,
          salesOrderNumber: response.data.data?.salesOrder?.orderNumber,
          customerCreated: response.data.data?.customerCreated,
          customerLinked: response.data.data?.customerLinked,
          sourceCompanyTracking: response.data.data?.sourceCompanyTracking,
          bidirectionalTracking: response.data.data?.bidirectionalTracking,
        }
      );

      return {
        success: true,
        data: {
          salesOrder: response.data.data?.salesOrder,
          purchaseOrder: response.data.data?.purchaseOrder,
          customer: response.data.data?.customer,

          // ✅ Enhanced tracking information
          enhancedTracking: {
            detectionMethod,
            targetCompanyId,
            sourceCompanyId: buyerCompanyId,
            supplierDetails,
            targetCompanyDetails,
            customerCreated: response.data.data?.customerCreated,
            customerLinked: response.data.data?.customerLinked,
            preservationApplied: {
              items: enhancedPayload.preserveItemDetails,
              pricing: enhancedPayload.preservePricing,
              terms: enhancedPayload.preserveTerms,
            },
            validationResults: response.data.data?.bidirectionalTracking,
          },

          // ✅ Enhanced conversion summary
          conversionSummary: {
            originalPurchaseOrder: purchaseOrder.orderNumber,
            generatedSalesOrder: response.data.data?.salesOrder?.orderNumber,
            buyerCompany:
              purchaseOrder.companyId?.businessName || "Buyer Company",
            supplierCompany:
              targetCompanyDetails?.businessName || "Supplier Company",
            supplier: supplierDetails.name,
            detectionMethod,
            itemsConverted: response.data.data?.salesOrder?.items?.length || 0,
            totalAmount:
              response.data.data?.salesOrder?.totals?.finalTotal || 0,
            preservationStatus: {
              itemsPreserved: enhancedPayload.preserveItemDetails,
              pricingPreserved: enhancedPayload.preservePricing,
              termsPreserved: enhancedPayload.preserveTerms,
            },
          },
        },
        message:
          response.data.message ||
          "Sales order generated from purchase order successfully with enhanced tracking",
      };
    } catch (error) {
      console.error("❌ ENHANCED: PO → SO generation failed:", {
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status,
      });

      // ✅ Enhanced error categorization and messages
      let errorMessage = "Failed to generate sales order from purchase order";
      let errorCategory = "GENERAL_ERROR";

      if (
        error.message?.includes("same as the buyer company") ||
        error.message?.includes("CIRCULAR REFERENCE")
      ) {
        errorCategory = "CIRCULAR_REFERENCE";
        errorMessage = error.message; // Use the detailed circular reference error
      } else if (
        error.message?.includes("Cannot determine target company") ||
        error.message?.includes("ENHANCED ERROR")
      ) {
        errorCategory = "TARGET_COMPANY_DETECTION";
        errorMessage = error.message; // Use the detailed target company error
      } else if (error.message?.includes("already generated")) {
        errorCategory = "DUPLICATE_GENERATION";
        errorMessage = error.message; // Use the duplicate generation error
      } else if (
        error.message?.includes("no supplier") ||
        error.message?.includes("Invalid supplier")
      ) {
        errorCategory = "SUPPLIER_VALIDATION";
        errorMessage = error.message; // Use the supplier validation error
      } else if (error.message?.includes("Purchase Order ID is required")) {
        errorCategory = "MISSING_PURCHASE_ORDER_ID";
        errorMessage = "Purchase Order ID is required";
      } else if (error.message?.includes("Invalid Purchase Order ID format")) {
        errorCategory = "INVALID_PURCHASE_ORDER_ID";
        errorMessage = "Invalid Purchase Order ID format";
      } else if (error.message?.includes("Purchase order not found")) {
        errorCategory = "PURCHASE_ORDER_NOT_FOUND";
        errorMessage = "Purchase order not found";
      } else if (error.response?.status === 400) {
        errorCategory = "BAD_REQUEST";
        errorMessage =
          error.response.data?.message ||
          "Invalid purchase order for conversion";
      } else if (error.response?.status === 404) {
        errorCategory = "NOT_FOUND";
        errorMessage = "Purchase order not found";
      } else if (error.response?.status === 403) {
        errorCategory = "PERMISSION_DENIED";
        errorMessage =
          "Access denied. You may not have permission to generate sales orders.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage,
        errorCategory,
        error: {
          originalError: error.message,
          response: error.response?.data,
          status: error.response?.status,
          details: error.response?.data?.details,
        },
        data: null,
      };
    }
  }

  /**
   * ✅ Generate purchase order from sales order
   */
  async generatePurchaseOrder(salesOrderId, conversionData = {}) {
    try {
      // ✅ STEP 1: Enhanced validation with better error messages
      if (!salesOrderId) {
        throw new Error("Sales Order ID is required");
      }

      if (!salesOrderId.match(/^[a-fA-F0-9]{24}$/)) {
        throw new Error("Invalid Sales Order ID format");
      }

      console.log(
        "🔄 ENHANCED: Starting SO → PO generation with comprehensive tracking:",
        {
          salesOrderId,
          conversionData: {
            targetCompanyId: conversionData.targetCompanyId,
            autoLinkSupplier: conversionData.autoLinkSupplier,
            preserveItemDetails: conversionData.preserveItemDetails,
            preservePricing: conversionData.preservePricing,
            preserveTerms: conversionData.preserveTerms,
            validateBidirectionalSetup:
              conversionData.validateBidirectionalSetup,
          },
        }
      );

      // ✅ STEP 2: Get sales order with comprehensive population
      const soResponse = await apiClient.get(
        `/api/sales-orders/${salesOrderId}?populate=customer,companyId,customer.linkedCompanyId`
      );

      if (!soResponse.data) {
        throw new Error("Failed to fetch sales order data");
      }

      const soData = soResponse.data;
      const salesOrder =
        soData.data?.salesOrder || soData.salesOrder || soData.data || soData;

      if (!salesOrder) {
        throw new Error("Sales order not found");
      }

      console.log("✅ ENHANCED: Sales order fetched with population:", {
        orderId: salesOrder._id,
        orderNumber: salesOrder.orderNumber,
        hasCustomer: !!salesOrder.customer,
        customerType: typeof salesOrder.customer,
        customerLinkedCompany: salesOrder.customer?.linkedCompanyId,
        hasCompanyId: !!salesOrder.companyId,
        companyType: typeof salesOrder.companyId,
        alreadyGenerated: salesOrder.autoGeneratedPurchaseOrder,
        // ✅ CRITICAL: Check for sourceCompanyId and targetCompanyId
        sourceCompanyId: salesOrder.sourceCompanyId,
        targetCompanyId: salesOrder.targetCompanyId,
        hasSourceCompany: !!salesOrder.sourceCompanyId,
        hasTargetCompany: !!salesOrder.targetCompanyId,
        isBidirectionalSO: !!salesOrder.sourceCompanyId,
      });

      // ✅ STEP 3: Enhanced pre-generation validation
      if (salesOrder.autoGeneratedPurchaseOrder) {
        throw new Error(
          `Purchase order already generated from sales order ${salesOrder.orderNumber}. ` +
            `Existing purchase order: ${
              salesOrder.purchaseOrderNumber || "Unknown"
            } (ID: ${salesOrder.purchaseOrderRef || "Unknown"})`
        );
      }

      if (!salesOrder.customer) {
        throw new Error("Sales order has no customer information");
      }

      // ✅ STEP 4: Enhanced customer validation and company detection
      let customerId;
      let customerDetails;

      if (typeof salesOrder.customer === "object" && salesOrder.customer._id) {
        customerId = salesOrder.customer._id;
        customerDetails = salesOrder.customer;
      } else if (typeof salesOrder.customer === "string") {
        customerId = salesOrder.customer;

        // Fetch customer details if not populated
        try {
          const customerResponse = await apiClient.get(
            `/api/parties/${customerId}?populate=linkedCompanyId`
          );
          customerDetails =
            customerResponse.data?.data?.party ||
            customerResponse.data?.party ||
            customerResponse.data?.data ||
            customerResponse.data;
        } catch (customerError) {
          console.warn(
            "⚠️ Could not fetch customer details:",
            customerError.message
          );
          customerDetails = null;
        }
      }

      if (!customerDetails) {
        throw new Error(
          `Invalid customer data in sales order. Customer field: ${JSON.stringify(
            salesOrder.customer
          )}`
        );
      }

      console.log("🔍 ENHANCED: Customer analysis:", {
        customerId,
        customerName: customerDetails.name,
        hasLinkedCompany: !!customerDetails.linkedCompanyId,
        linkedCompanyType: typeof customerDetails.linkedCompanyId,
        linkedCompanyId:
          customerDetails.linkedCompanyId?._id ||
          customerDetails.linkedCompanyId,
        linkedCompanyName: customerDetails.linkedCompanyId?.businessName,
        isLinkedCustomer: customerDetails.isLinkedCustomer,
        enableBidirectionalOrders: customerDetails.enableBidirectionalOrders,
      });

      // ✅ STEP 5: Enhanced target company detection with sourceCompanyId PRIORITY
      let targetCompanyId = null;
      let targetCompanyDetails = null;
      let detectionMethod = "manual";

      // ✅ PRIORITY 0: Use sourceCompanyId if this is a bidirectional SO (HIGHEST PRIORITY)
      if (salesOrder.sourceCompanyId) {
        targetCompanyId =
          salesOrder.sourceCompanyId._id || salesOrder.sourceCompanyId;
        detectionMethod = "bidirectional_source_company";
        console.log(
          "🎯 Using sourceCompanyId (bidirectional SO):",
          targetCompanyId
        );

        // Fetch company details
        try {
          const companyResponse = await apiClient.get(
            `/api/companies/${targetCompanyId}`
          );
          targetCompanyDetails =
            companyResponse.data?.data?.company ||
            companyResponse.data?.company ||
            companyResponse.data?.data ||
            companyResponse.data;

          console.log("✅ Source company details fetched:", {
            companyId: targetCompanyId,
            companyName: targetCompanyDetails?.businessName || "Unknown",
            detectionMethod: "bidirectional_source_company",
          });
        } catch (companyError) {
          console.warn(
            "⚠️ Could not fetch source company details:",
            companyError.message
          );
        }
      }

      // ✅ PRIORITY 1: Use existing targetCompanyId from sales order if available (only if no sourceCompanyId)
      else if (salesOrder.targetCompanyId) {
        targetCompanyId =
          salesOrder.targetCompanyId._id || salesOrder.targetCompanyId;
        detectionMethod = "existing_target_company_id";
        console.log(
          "🎯 Using existing targetCompanyId from sales order:",
          targetCompanyId
        );

        // Fetch company details
        try {
          const companyResponse = await apiClient.get(
            `/api/companies/${targetCompanyId}`
          );
          targetCompanyDetails =
            companyResponse.data?.data?.company ||
            companyResponse.data?.company ||
            companyResponse.data?.data ||
            companyResponse.data;
        } catch (companyError) {
          console.warn(
            "⚠️ Could not fetch existing target company details:",
            companyError.message
          );
        }
      }

      // ✅ PRIORITY 2: Use manual targetCompanyId from conversionData
      else if (conversionData.targetCompanyId) {
        targetCompanyId = conversionData.targetCompanyId;
        detectionMethod = "manual_conversion_data";
        console.log(
          "🎯 Using manual targetCompanyId from conversion data:",
          targetCompanyId
        );
      }

      // ✅ PRIORITY 3: Use customer's linkedCompanyId
      else if (customerDetails.linkedCompanyId) {
        if (
          typeof customerDetails.linkedCompanyId === "object" &&
          customerDetails.linkedCompanyId._id
        ) {
          targetCompanyId = customerDetails.linkedCompanyId._id;
          targetCompanyDetails = customerDetails.linkedCompanyId;
          detectionMethod = "customer_linked_company";
        } else if (typeof customerDetails.linkedCompanyId === "string") {
          targetCompanyId = customerDetails.linkedCompanyId;
          detectionMethod = "customer_linked_company";

          // Fetch company details
          try {
            const companyResponse = await apiClient.get(
              `/api/companies/${targetCompanyId}`
            );
            targetCompanyDetails =
              companyResponse.data?.data?.company ||
              companyResponse.data?.company ||
              companyResponse.data?.data ||
              companyResponse.data;
          } catch (companyError) {
            console.warn(
              "⚠️ Could not fetch target company details:",
              companyError.message
            );
          }
        }
      }

      // ✅ PRIORITY 4: Auto-detect by customer details (only if no other method worked)
      else {
        detectionMethod = "customer_details_matching";
        console.log(
          "🔍 ENHANCED: Attempting company detection by customer details..."
        );

        try {
          const companiesResponse = await apiClient.get("/api/companies");
          const companiesData = companiesResponse.data;
          const companies =
            companiesData.data?.companies ||
            companiesData.companies ||
            companiesData.data ||
            [];

          const sellerCompanyId =
            salesOrder.companyId?._id || salesOrder.companyId;

          // Match by GST, phone, or email
          const matchingCompany = companies.find(
            (company) =>
              company._id.toString() !== sellerCompanyId.toString() &&
              ((customerDetails.gstNumber &&
                company.gstin === customerDetails.gstNumber) ||
                (customerDetails.phoneNumber &&
                  company.phoneNumber === customerDetails.phoneNumber) ||
                (customerDetails.email &&
                  company.email === customerDetails.email) ||
                (customerDetails.name &&
                  company.businessName &&
                  company.businessName.toLowerCase() ===
                    customerDetails.name.toLowerCase()))
          );

          if (matchingCompany) {
            targetCompanyId = matchingCompany._id;
            targetCompanyDetails = matchingCompany;
            console.log(
              "✅ ENHANCED: Found matching company by customer details:",
              {
                companyId: matchingCompany._id,
                companyName: matchingCompany.businessName,
                matchedBy:
                  customerDetails.gstNumber === matchingCompany.gstin
                    ? "GST"
                    : customerDetails.phoneNumber ===
                      matchingCompany.phoneNumber
                    ? "Phone"
                    : customerDetails.email === matchingCompany.email
                    ? "Email"
                    : "Name",
              }
            );
          }
        } catch (companiesError) {
          console.warn(
            "⚠️ ENHANCED: Company detection by customer details failed:",
            companiesError.message
          );
        }
      }

      // ✅ Add logging to show what was detected
      console.log("✅ ENHANCED: Target company detection result:", {
        targetCompanyId,
        detectionMethod,
        sourceCompanyId: salesOrder.sourceCompanyId,
        hasSourceCompany: !!salesOrder.sourceCompanyId,
        targetCompanyName: targetCompanyDetails?.businessName || "Unknown",
        isBidirectionalSO: !!salesOrder.sourceCompanyId,
        flow: salesOrder.sourceCompanyId
          ? `Bidirectional SO: Company(${salesOrder.sourceCompanyId}) → SO in Company(${salesOrder.companyId}) → PO back to Company(${salesOrder.sourceCompanyId})`
          : "Regular SO flow",
      });

      if (!targetCompanyId) {
        throw new Error(
          `🚨 ENHANCED ERROR: Cannot determine target company for purchase order generation.\n\n` +
            `The customer "${customerDetails.name}" must have:\n` +
            `1. A linkedCompanyId pointing to their company, OR\n` +
            `2. Matching GST/phone/email with an existing company, OR\n` +
            `3. Manual targetCompanyId provided in conversion data.\n\n` +
            `Current customer data:\n` +
            `- Name: ${customerDetails.name}\n` +
            `- LinkedCompanyId: ${
              customerDetails.linkedCompanyId || "None"
            }\n` +
            `- GST: ${customerDetails.gstNumber || "None"}\n` +
            `- Phone: ${customerDetails.phoneNumber || "None"}\n` +
            `- Email: ${customerDetails.email || "None"}\n\n` +
            `Sales Order Context:\n` +
            `- Source Company ID: ${salesOrder.sourceCompanyId || "None"}\n` +
            `- Target Company ID: ${salesOrder.targetCompanyId || "None"}\n` +
            `- Is Bidirectional SO: ${!!salesOrder.sourceCompanyId}\n\n` +
            `Please link the customer to a company first or provide targetCompanyId manually.`
        );
      }

      // ✅ STEP 6: Enhanced circular reference validation with proper string comparison
      const sellerCompanyId = salesOrder.companyId?._id || salesOrder.companyId;

      // ✅ CRITICAL FIX: Proper string comparison with trimming and type conversion
      const sellerCompanyIdString = sellerCompanyId
        ? sellerCompanyId.toString().trim()
        : "";
      const targetCompanyIdString = targetCompanyId
        ? targetCompanyId.toString().trim()
        : "";

      console.log("🔍 COMPANY VALIDATION DEBUG:", {
        sellerCompanyId: sellerCompanyIdString,
        targetCompanyId: targetCompanyIdString,
        sellerType: typeof sellerCompanyId,
        targetType: typeof targetCompanyId,
        areEqual: sellerCompanyIdString === targetCompanyIdString,
        sellerLength: sellerCompanyIdString.length,
        targetLength: targetCompanyIdString.length,
        originalSeller: salesOrder.companyId,
        originalTarget: targetCompanyId,
        detectionMethod,
        isBidirectionalSO: !!salesOrder.sourceCompanyId,
        bidirectionalFlow: salesOrder.sourceCompanyId
          ? `Source(${salesOrder.sourceCompanyId}) → Seller(${sellerCompanyId}) → Target(${targetCompanyId})`
          : "Not bidirectional",
      });

      // ✅ ENHANCED: Only validate circular reference if not using sourceCompanyId for bidirectional flow
      if (
        sellerCompanyIdString &&
        targetCompanyIdString &&
        sellerCompanyIdString === targetCompanyIdString &&
        detectionMethod !== "bidirectional_source_company" // Allow sourceCompanyId to be same as seller for reverse flow
      ) {
        throw new Error(
          `🚨 ENHANCED CIRCULAR REFERENCE ERROR:\n\n` +
            `The customer's target company (${targetCompanyIdString}) cannot be the same as the seller company (${sellerCompanyIdString}).\n\n` +
            `This would create a circular reference where a company would generate a purchase order to buy from itself.\n\n` +
            `Current setup:\n` +
            `- Sales Order: Created by Company ${sellerCompanyIdString}\n` +
            `- Customer: ${customerDetails.name}\n` +
            `- Customer's Linked Company: ${targetCompanyIdString}\n` +
            `- Detection Method: ${detectionMethod}\n` +
            `- Is Bidirectional SO: ${!!salesOrder.sourceCompanyId}\n\n` +
            `Solution: The customer should be linked to a DIFFERENT company that will create the purchase order.\n` +
            `The flow should be: Company A creates SO → Customer (linked to Company B) → Company B creates PO to buy from Company A.`
        );
      }

      // ✅ SPECIAL CASE: For bidirectional SOs using sourceCompanyId, this is the correct reverse flow
      if (
        detectionMethod === "bidirectional_source_company" &&
        sellerCompanyIdString === targetCompanyIdString
      ) {
        console.log("✅ BIDIRECTIONAL REVERSE FLOW DETECTED:", {
          explanation:
            "This is a reverse bidirectional flow where the source company is creating a purchase order back to the seller",
          originalFlow: `Company ${salesOrder.sourceCompanyId} → created SO in Company ${sellerCompanyId}`,
          reverseFlow: `Company ${sellerCompanyId} → creating PO back to Company ${targetCompanyId}`,
          isValid: true,
          allowCircularForBidirectional: true,
        });
      }

      console.log("✅ ENHANCED: Target company validation passed:", {
        sellerCompanyId: sellerCompanyIdString,
        targetCompanyId: targetCompanyIdString,
        targetCompanyName: targetCompanyDetails?.businessName || "Unknown",
        detectionMethod,
        customerName: customerDetails.name,
        validationPassed: true,
        isBidirectionalFlow: detectionMethod === "bidirectional_source_company",
      });

      // ✅ STEP 7: Prepare enhanced request payload
      const enhancedPayload = {
        salesOrderId,

        // ✅ Enhanced targeting
        targetCompanyId,
        sourceCompanyId: sellerCompanyId,

        // ✅ Enhanced conversion options
        autoLinkSupplier: conversionData.autoLinkSupplier ?? true,
        validateBidirectionalSetup:
          conversionData.validateBidirectionalSetup ?? true,
        preserveItemDetails: conversionData.preserveItemDetails ?? true,
        preservePricing: conversionData.preservePricing ?? true,
        preserveTerms: conversionData.preserveTerms ?? true,
        autoAcceptOrder: conversionData.autoAcceptOrder ?? false,

        // ✅ Enhanced metadata
        generationNotes:
          conversionData.generationNotes ||
          `Auto-generated from SO ${salesOrder.orderNumber} via enhanced bidirectional flow (${detectionMethod})`,
        convertedBy:
          conversionData.convertedBy || localStorage.getItem("userId") || null,

        // ✅ Enhanced tracking context
        enhancedTracking: {
          detectionMethod,
          isBidirectionalSO: !!salesOrder.sourceCompanyId,
          originalSourceCompanyId: salesOrder.sourceCompanyId,
          customerDetails: {
            id: customerDetails._id,
            name: customerDetails.name,
            linkedCompanyId: customerDetails.linkedCompanyId,
          },
          targetCompanyDetails: {
            id: targetCompanyId,
            name: targetCompanyDetails?.businessName || "Unknown",
          },
          sourceCompanyDetails: {
            id: sellerCompanyId,
            name: salesOrder.companyId?.businessName || "Seller Company",
          },
          bidirectionalFlow: salesOrder.sourceCompanyId
            ? {
                originalSourceCompany: salesOrder.sourceCompanyId,
                salesOrderCompany: sellerCompanyId,
                purchaseOrderCompany: targetCompanyId,
                isReverseFlow:
                  detectionMethod === "bidirectional_source_company",
              }
            : null,
        },
      };

      console.log("📦 ENHANCED: Final request payload prepared:", {
        salesOrderId: enhancedPayload.salesOrderId,
        targetCompanyId: enhancedPayload.targetCompanyId,
        sourceCompanyId: enhancedPayload.sourceCompanyId,
        detectionMethod,
        isBidirectionalSO: !!salesOrder.sourceCompanyId,
        preservationSettings: {
          items: enhancedPayload.preserveItemDetails,
          pricing: enhancedPayload.preservePricing,
          terms: enhancedPayload.preserveTerms,
        },
        autoSettings: {
          linkSupplier: enhancedPayload.autoLinkSupplier,
          validateSetup: enhancedPayload.validateBidirectionalSetup,
          autoAccept: enhancedPayload.autoAcceptOrder,
        },
        bidirectionalContext:
          enhancedPayload.enhancedTracking.bidirectionalFlow,
      });

      // ✅ STEP 8: Make the enhanced API call with CORRECTED URL
      const response = await apiClient.post(
        `/api/sales-orders/${salesOrderId}/generate-purchase-order`, // ✅ FIXED: Correct URL pattern
        enhancedPayload
      );

      console.log(
        "✅ ENHANCED: Purchase order generation completed successfully:",
        {
          success: response.data.success,
          purchaseOrderId: response.data.data?.purchaseOrder?._id,
          purchaseOrderNumber: response.data.data?.purchaseOrder?.orderNumber,
          supplierCreated: response.data.data?.supplierCreated,
          supplierLinked: response.data.data?.supplierLinked,
          sourceCompanyTracking: response.data.data?.sourceCompanyTracking,
          bidirectionalTracking: response.data.data?.bidirectionalTracking,
          detectionMethod,
        }
      );

      return {
        success: true,
        data: {
          purchaseOrder: response.data.data?.purchaseOrder,
          salesOrder: response.data.data?.salesOrder,
          supplier: response.data.data?.supplier,

          // ✅ Enhanced tracking information
          enhancedTracking: {
            detectionMethod,
            targetCompanyId,
            sourceCompanyId: sellerCompanyId,
            customerDetails,
            targetCompanyDetails,
            supplierCreated: response.data.data?.supplierCreated,
            supplierLinked: response.data.data?.supplierLinked,
            preservationApplied: {
              items: enhancedPayload.preserveItemDetails,
              pricing: enhancedPayload.preservePricing,
              terms: enhancedPayload.preserveTerms,
            },
            validationResults: response.data.data?.bidirectionalTracking,
            isBidirectionalSO: !!salesOrder.sourceCompanyId,
            bidirectionalFlow:
              enhancedPayload.enhancedTracking.bidirectionalFlow,
          },

          // ✅ Enhanced conversion summary
          conversionSummary: {
            originalSalesOrder: salesOrder.orderNumber,
            generatedPurchaseOrder:
              response.data.data?.purchaseOrder?.orderNumber,
            sellerCompany:
              salesOrder.companyId?.businessName || "Seller Company",
            customerCompany:
              targetCompanyDetails?.businessName || "Customer Company",
            customer: customerDetails.name,
            detectionMethod,
            itemsConverted:
              response.data.data?.purchaseOrder?.items?.length || 0,
            totalAmount:
              response.data.data?.purchaseOrder?.totals?.finalTotal || 0,
            preservationStatus: {
              itemsPreserved: enhancedPayload.preserveItemDetails,
              pricingPreserved: enhancedPayload.preservePricing,
              termsPreserved: enhancedPayload.preserveTerms,
            },
            bidirectionalInfo: {
              isBidirectionalSO: !!salesOrder.sourceCompanyId,
              originalSourceCompany: salesOrder.sourceCompanyId,
              isReverseFlow: detectionMethod === "bidirectional_source_company",
              flowDescription: salesOrder.sourceCompanyId
                ? `Reverse flow: Company ${salesOrder.sourceCompanyId} → SO in ${sellerCompanyId} → PO back to ${targetCompanyId}`
                : "Standard flow: SO → PO generation",
            },
          },
        },
        message:
          response.data.message ||
          "Purchase order generated from sales order successfully with enhanced bidirectional tracking",
      };
    } catch (error) {
      console.error("❌ ENHANCED: SO → PO generation failed:", {
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status,
      });

      // ✅ Enhanced error categorization and messages
      let errorMessage = "Failed to generate purchase order from sales order";
      let errorCategory = "GENERAL_ERROR";

      if (
        error.message?.includes("same as the seller company") ||
        error.message?.includes("CIRCULAR REFERENCE")
      ) {
        errorCategory = "CIRCULAR_REFERENCE";
        errorMessage = error.message; // Use the detailed circular reference error
      } else if (
        error.message?.includes("Cannot determine target company") ||
        error.message?.includes("ENHANCED ERROR")
      ) {
        errorCategory = "TARGET_COMPANY_DETECTION";
        errorMessage = error.message; // Use the detailed target company error
      } else if (error.message?.includes("already generated")) {
        errorCategory = "DUPLICATE_GENERATION";
        errorMessage = error.message; // Use the duplicate generation error
      } else if (
        error.message?.includes("no customer") ||
        error.message?.includes("Invalid customer")
      ) {
        errorCategory = "CUSTOMER_VALIDATION";
        errorMessage = error.message; // Use the customer validation error
      } else if (error.message?.includes("Sales Order ID is required")) {
        errorCategory = "MISSING_SALES_ORDER_ID";
        errorMessage = "Sales Order ID is required";
      } else if (error.message?.includes("Invalid Sales Order ID format")) {
        errorCategory = "INVALID_SALES_ORDER_ID";
        errorMessage = "Invalid Sales Order ID format";
      } else if (error.message?.includes("Sales order not found")) {
        errorCategory = "SALES_ORDER_NOT_FOUND";
        errorMessage = "Sales order not found";
      } else if (error.response?.status === 400) {
        errorCategory = "BAD_REQUEST";
        errorMessage =
          error.response.data?.message || "Invalid sales order for conversion";
      } else if (error.response?.status === 404) {
        errorCategory = "NOT_FOUND";
        errorMessage = "Sales order not found";
      } else if (error.response?.status === 403) {
        errorCategory = "PERMISSION_DENIED";
        errorMessage =
          "Access denied. You may not have permission to generate purchase orders.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage,
        errorCategory,
        error: {
          originalError: error.message,
          response: error.response?.data,
          status: error.response?.status,
          details: error.response?.data?.details,
        },
        data: null,
      };
    }
  }
  /**
   * ✅ DEBUG: Test the purchase order generation endpoint
   */
  async debugGeneratePurchaseOrder(salesOrderId) {
    console.log("🔬 DEBUG: Testing purchase order generation endpoint...");

    try {
      // Test 1: Check if sales order exists
      const salesOrderResponse = await apiClient.get(
        `/api/sales-orders/${salesOrderId}`
      );
      console.log("✅ Sales order found:", {
        id: salesOrderResponse.data.data?.salesOrder?._id,
        orderNumber: salesOrderResponse.data.data?.salesOrder?.orderNumber,
        status: salesOrderResponse.data.data?.salesOrder?.status,
      });

      // Test 2: Simple ping to generation endpoint
      const pingResponse = await fetch(
        `${apiConfig.baseURL}/api/sales-orders/${salesOrderId}/generate-purchase-order`,
        {
          method: "OPTIONS", // OPTIONS request to test endpoint availability
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Endpoint ping result:", {
        status: pingResponse.status,
        statusText: pingResponse.statusText,
        ok: pingResponse.ok,
      });

      // Test 3: Minimal payload test
      const minimalPayload = {
        notes: "Debug test",
      };

      console.log("🔄 Testing with minimal payload...");
      const testResponse = await fetch(
        `${apiConfig.baseURL}/api/sales-orders/${salesOrderId}/generate-purchase-order`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(minimalPayload),
        }
      );

      const testResult = await testResponse.json();
      console.log("✅ Minimal test result:", {
        status: testResponse.status,
        success: testResult.success,
        message: testResult.message,
      });

      return {
        success: true,
        message: "Debug test completed - check console for details",
      };
    } catch (error) {
      console.error("❌ Debug test failed:", error);
      return {
        success: false,
        message: `Debug test failed: ${error.message}`,
      };
    }
  }
  /**
   * ✅ NEW: Bulk generate purchase orders from multiple sales orders
   */
  async bulkGeneratePurchaseOrders(salesOrderIds, conversionData = {}) {
    try {
      const response = await apiClient.post(
        "/api/sales-orders/bulk/generate-purchase-orders",
        {
          salesOrderIds,
          ...conversionData,
        }
      );
      return {
        success: true,
        data: response.data,
        message: "Purchase orders generated from sales orders successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to bulk generate purchase orders",
      };
    }
  }

  /**
   * ✅ NEW: Get sales orders that have generated purchase orders
   */
  async getSalesOrdersWithGeneratedPO(companyId, filters = {}) {
    try {
      const params = {companyId, ...filters};
      const response = await apiClient.get(
        "/api/sales-orders/with-generated-po",
        {params}
      );
      return {
        success: true,
        data: response.data,
        message:
          "Sales orders with generated purchase orders fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch sales orders with generated purchase orders",
      };
    }
  }

  /**
   * ✅ NEW: Get purchase order generation status for a sales order
   */
  async getPurchaseOrderGenerationStatus(companyId, salesOrderId) {
    try {
      const params = {companyId, salesOrderId};
      const response = await apiClient.get(
        "/api/sales-orders/generation-status",
        {params}
      );
      return {
        success: true,
        data: response.data,
        message: "Purchase order generation status fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch purchase order generation status",
      };
    }
  }

  /**
   * ✅ NEW: Get sales order source tracking information
   */
  async getSalesOrderSourceTracking(salesOrderId) {
    try {
      const response = await apiClient.get(
        `/api/sales-orders/source-tracking/${salesOrderId}`
      );
      return {
        success: true,
        data: response.data,
        message: "Sales order source tracking information fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch sales order source tracking information",
      };
    }
  }

  /**
   * ✅ NEW: Get auto-generated sales orders (from purchase orders)
   */
  async getAutoGeneratedSalesOrders(companyId, filters = {}) {
    try {
      const params = {companyId, ...filters};
      const response = await apiClient.get("/api/sales-orders/auto-generated", {
        params,
      });
      return {
        success: true,
        data: response.data,
        message: "Auto-generated sales orders fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch auto-generated sales orders",
      };
    }
  }

  /**
   * ✅ NEW: Get sales orders created from specific purchase order
   */
  async getSalesOrdersFromPurchaseOrder(purchaseOrderId) {
    try {
      const response = await apiClient.get(
        `/api/sales-orders/from-purchase-order/${purchaseOrderId}`
      );
      return {
        success: true,
        data: response.data,
        message: "Sales orders from purchase order fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch sales orders from purchase order",
      };
    }
  }

  /**
   * ✅ NEW: Get sales orders created from purchase orders
   */
  async getSalesOrdersFromPurchaseOrders(companyId, filters = {}) {
    try {
      const params = {companyId, ...filters};
      const response = await apiClient.get(
        "/api/sales-orders/from-purchase-orders",
        {params}
      );
      return {
        success: true,
        data: response.data,
        message: "Sales orders from purchase orders fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch sales orders from purchase orders",
      };
    }
  }

  /**
   * ✅ NEW: Get bidirectional sales analytics
   */
  async getBidirectionalSalesAnalytics(companyId, filters = {}) {
    try {
      const params = {companyId, ...filters};
      const response = await apiClient.get(
        "/api/sales-orders/analytics/bidirectional-sales",
        {params}
      );
      return {
        success: true,
        data: response.data,
        message: "Bidirectional sales analytics fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch bidirectional sales analytics",
      };
    }
  }

  // ==================== ✅ NEW TRACKING FUNCTIONS ====================

  /**
   * ✅ NEW: Get complete tracking chain for a sales order
   */
  async getTrackingChain(salesOrderId) {
    try {
      const response = await apiClient.get(
        `/api/sales-orders/${salesOrderId}/tracking-chain`
      );
      return {
        success: true,
        data: response.data,
        message: "Tracking chain retrieved successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to get tracking chain",
      };
    }
  }

  // ==================== ✅ NEW BULK OPERATIONS ====================

  /**
   * ✅ NEW: Bulk send multiple orders
   */
  async bulkSendOrders(orderIds, sendMethod = "email") {
    try {
      const response = await apiClient.patch("/api/sales-orders/bulk/send", {
        orderIds,
        sendMethod,
      });
      return {
        success: true,
        data: response.data,
        message: `${
          response.data.data?.modifiedCount || 0
        } orders sent successfully`,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to bulk send orders",
      };
    }
  }

  // ==================== ✅ NEW ENHANCED REPORTING ====================

  /**
   * ✅ NEW: Get customer performance analysis
   */
  async getCustomerPerformanceAnalysis(companyId, filters = {}) {
    try {
      const params = {companyId, ...filters};
      const response = await apiClient.get(
        "/api/sales-orders/reports/customer-performance",
        {params}
      );
      return {
        success: true,
        data: response.data,
        message: "Customer performance analysis fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch customer performance analysis",
      };
    }
  }

  /**
   * ✅ NEW: Get bidirectional integration summary report
   */
  async getBidirectionalSummaryReport(companyId, filters = {}) {
    try {
      const params = {companyId, ...filters};
      const response = await apiClient.get(
        "/api/sales-orders/reports/bidirectional-summary",
        {params}
      );
      return {
        success: true,
        data: response.data,
        message: "Bidirectional summary report fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch bidirectional summary report",
      };
    }
  }

  /**
   * ✅ NEW: Get summary report for date range
   */
  async getSummaryReport(companyId, filters = {}) {
    try {
      const params = {companyId, ...filters};
      const response = await apiClient.get(
        "/api/sales-orders/reports/summary",
        {
          params,
        }
      );
      return {
        success: true,
        data: response.data,
        message: "Summary report fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch summary report",
      };
    }
  }
  /**
   * Get orders by status
   */
  async getOrdersByStatus(companyId, status, filters = {}) {
    try {
      const params = {companyId, ...filters};
      const response = await apiClient.get(
        `/api/sales-orders/by-status/${status}`,
        {params}
      );
      return {
        success: true,
        data: response.data,
        message: `${status} orders fetched successfully`,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          `Failed to fetch ${status} orders`,
      };
    }
  }

  /**
   * Get draft orders
   */
  async getDraftOrders(companyId, filters = {}) {
    return this.getOrdersByStatus(companyId, "draft", filters);
  }

  /**
   * Get pending orders (draft + sent)
   */
  async getPendingOrders(companyId, filters = {}) {
    try {
      const params = {companyId, ...filters};
      const response = await apiClient.get("/api/sales-orders/pending", {
        params,
      });
      return {
        success: true,
        data: response.data,
        message: "Pending orders fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch pending orders",
      };
    }
  }

  /**
   * Get active orders
   */
  async getActiveOrders(companyId, filters = {}) {
    try {
      const params = {companyId, ...filters};
      const response = await apiClient.get("/api/sales-orders/active", {
        params,
      });
      return {
        success: true,
        data: response.data,
        message: "Active orders fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch active orders",
      };
    }
  }

  /**
   * ✅ FIXED: Get expired orders
   */
  async getExpiredOrders(companyId, filters = {}) {
    try {
      const params = {companyId, ...filters};
      // ✅ Use the correct dedicated endpoint
      const response = await apiClient.get("/api/sales-orders/expired", {
        params,
      });
      return {
        success: true,
        data: response.data,
        message: "Expired orders fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch expired orders",
      };
    }
  }

  /**
   * ✅ FIXED: Search orders
   */
  async searchOrders(companyId, searchTerm, filters = {}) {
    try {
      const params = {
        companyId,
        search: searchTerm, // ✅ Use 'search' instead of 'q'
        ...filters,
      };
      const response = await apiClient.get("/api/sales-orders/search", {
        params,
      });
      return {
        success: true,
        data: response.data,
        message: "Search completed successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message || error.message || "Search failed",
      };
    }
  }

  // ==================== STATUS MANAGEMENT ====================

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, status, reason = "") {
    try {
      const response = await apiClient.patch(
        `/api/sales-orders/${orderId}/status`,
        {
          status,
          reason,
        }
      );
      return {
        success: true,
        data: response.data,
        message: `Order status updated to ${status}`,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to update order status",
      };
    }
  }

  /**
   * Accept order
   */
  async acceptOrder(orderId, reason = "") {
    try {
      const response = await apiClient.patch(
        `/api/sales-orders/${orderId}/accept`,
        {reason}
      );
      return {
        success: true,
        data: response.data,
        message: "Order accepted successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to accept order",
      };
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId) {
    try {
      const response = await apiClient.patch(
        `/api/sales-orders/${orderId}/cancel`
      );
      return {
        success: true,
        data: response.data,
        message: "Order cancelled successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to cancel order",
      };
    }
  }

  /**
   * ✅ NEW: Mark order as sent
   */
  async sendOrder(orderId, reason = "") {
    try {
      const response = await apiClient.patch(
        `/api/sales-orders/${orderId}/send`,
        {reason}
      );
      return {
        success: true,
        data: response.data,
        message: "Order marked as sent successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to mark order as sent",
      };
    }
  }

  /**
   * ✅ NEW: Reject order
   */
  async rejectOrder(orderId, reason = "") {
    try {
      const response = await apiClient.patch(
        `/api/sales-orders/${orderId}/reject`,
        {reason}
      );
      return {
        success: true,
        data: response.data,
        message: "Order rejected successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to reject order",
      };
    }
  }

  /**
   * ✅ NEW: Mark order as expired
   */
  async expireOrder(orderId, reason = "") {
    try {
      const response = await apiClient.patch(
        `/api/sales-orders/${orderId}/expire`,
        {reason}
      );
      return {
        success: true,
        data: response.data,
        message: "Order marked as expired successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to mark order as expired",
      };
    }
  }

  // ==================== ORDER CONVERSION ====================

  /**
   * Convert sales order to invoice
   */
  async convertToInvoice(orderId, conversionData = {}) {
    try {
      const response = await apiClient.post(
        `/api/sales-orders/${orderId}/convert-to-invoice`,
        {
          ...conversionData,
          convertedAt: new Date().toISOString(),
          convertedBy: conversionData.userId || "system",
        }
      );

      return {
        success: true,
        data: {
          order: response.data.data?.order || response.data.order,
          invoice: response.data.data?.invoice || response.data.invoice,
          conversion:
            response.data.data?.conversion || response.data.conversion,
        },
        message:
          response.data.message ||
          "Sales order converted to invoice successfully",
      };
    } catch (error) {
      let errorMessage = "Failed to convert sales order to invoice";

      if (error.response?.status === 400) {
        errorMessage =
          error.response.data?.message || "Sales order cannot be converted";
      } else if (error.response?.status === 404) {
        errorMessage = "Sales order not found";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
        data: null,
      };
    }
  }

  // ==================== ✅ NEW: MISSING METHODS FROM ROUTES ====================

  /**
   * Get customer's pending documents for payment allocation
   */
  async getCustomerPendingDocuments(
    companyId,
    customerId,
    customerName = null
  ) {
    try {
      const params = {companyId};

      // Add customer identifier
      if (customerId) {
        params.customerId = customerId;
      }
      if (customerName) {
        params.customerName = customerName;
      }

      const response = await apiClient.get(
        `/api/sales-orders/customer/${customerId || "pending-documents"}`,
        {params}
      );

      return {
        success: true,
        data: response.data,
        message: "Customer pending documents fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch customer pending documents",
        data: {orders: [], invoices: []},
      };
    }
  }

  /**
   * Get expiring soon orders
   */
  async getExpiringSoonOrders(companyId, filters = {}) {
    try {
      const params = {companyId, ...filters};
      const response = await apiClient.get("/api/sales-orders/expiring-soon", {
        params,
      });
      return {
        success: true,
        data: response.data,
        message: "Expiring orders fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch expiring orders",
      };
    }
  }

  /**
   * Get converted orders
   */
  async getConvertedOrders(companyId, filters = {}) {
    try {
      const params = {companyId, ...filters};
      const response = await apiClient.get("/api/sales-orders/converted", {
        params,
      });
      return {
        success: true,
        data: response.data,
        message: "Converted orders fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch converted orders",
      };
    }
  }

  /**
   * Get orders pending payment
   */
  async getPendingOrdersForPayment(companyId, filters = {}) {
    try {
      const params = {companyId, ...filters};
      const response = await apiClient.get(
        "/api/sales-orders/pending-payment",
        {params}
      );
      return {
        success: true,
        data: response.data,
        message: "Orders pending payment fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch orders pending payment",
      };
    }
  }

  // ==================== PAYMENT METHODS ====================

  /**
   * Add payment to a sales order
   */
  async addPayment(orderId, paymentData) {
    try {
      const response = await apiClient.post(
        `/api/sales-orders/${orderId}/payment`,
        paymentData
      );
      return {
        success: true,
        data: response.data,
        message: "Payment added successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to add payment",
      };
    }
  }

  /**
   * Add advance payment to a sales order
   */
  async addAdvancePayment(orderId, paymentData) {
    try {
      const response = await apiClient.post(
        `/api/sales-orders/${orderId}/advance-payment`,
        {
          ...paymentData,
          isAdvancePayment: true,
        }
      );
      return {
        success: true,
        data: response.data,
        message: "Advance payment added successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to add advance payment",
      };
    }
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Bulk update status for multiple orders
   */
  async bulkUpdateStatus(orderIds, status, reason = "") {
    try {
      const response = await apiClient.patch("/api/sales-orders/bulk/status", {
        orderIds,
        status,
        reason,
      });
      return {
        success: true,
        data: response.data,
        message: `${
          response.data.data?.modifiedCount || 0
        } orders updated to ${status}`,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to bulk update status",
      };
    }
  }

  /**
   * Bulk convert multiple orders to invoices
   */
  async bulkConvertToInvoices(orderIds) {
    try {
      const response = await apiClient.post("/api/sales-orders/bulk/convert", {
        orderIds,
      });
      return {
        success: true,
        data: response.data,
        message: `${
          response.data.data?.successCount || 0
        } orders converted successfully`,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to bulk convert orders",
      };
    }
  }

  // ==================== BIDIRECTIONAL FUNCTIONALITY ====================

  /**
   * ✅ ENHANCED: Generate sales order from purchase order with sourceCompanyId priority
   */
  async generateFromPurchaseOrder(purchaseOrderId, conversionData = {}) {
    try {
      // ✅ STEP 1: Enhanced validation with better error messages
      if (!purchaseOrderId) {
        throw new Error("Purchase Order ID is required");
      }

      if (!purchaseOrderId.match(/^[a-fA-F0-9]{24}$/)) {
        throw new Error("Invalid Purchase Order ID format");
      }

      console.log(
        "🔄 ENHANCED: Starting PO → SO generation with sourceCompanyId priority:",
        {
          purchaseOrderId,
          conversionData: {
            targetCompanyId: conversionData.targetCompanyId,
            autoLinkCustomer: conversionData.autoLinkCustomer,
            preserveItemDetails: conversionData.preserveItemDetails,
            preservePricing: conversionData.preservePricing,
            preserveTerms: conversionData.preserveTerms,
            validateBidirectionalSetup:
              conversionData.validateBidirectionalSetup,
          },
        }
      );

      // ✅ STEP 2: Get purchase order with comprehensive population
      const poResponse = await apiClient.get(
        `/api/purchase-orders/${purchaseOrderId}?populate=supplier,companyId,supplier.linkedCompanyId`
      );

      if (!poResponse.data) {
        throw new Error("Failed to fetch purchase order data");
      }

      const poData = poResponse.data;
      const purchaseOrder =
        poData.data?.purchaseOrder ||
        poData.purchaseOrder ||
        poData.data ||
        poData;

      if (!purchaseOrder) {
        throw new Error("Purchase order not found");
      }

      console.log("✅ ENHANCED: Purchase order fetched with population:", {
        orderId: purchaseOrder._id,
        orderNumber: purchaseOrder.orderNumber,
        hasSupplier: !!purchaseOrder.supplier,
        supplierType: typeof purchaseOrder.supplier,
        supplierLinkedCompany: purchaseOrder.supplier?.linkedCompanyId,
        hasCompanyId: !!purchaseOrder.companyId,
        companyType: typeof purchaseOrder.companyId,
        alreadyGenerated: purchaseOrder.autoGeneratedSalesOrder,
        // ✅ CRITICAL: Check for sourceCompanyId and targetCompanyId
        sourceCompanyId: purchaseOrder.sourceCompanyId,
        targetCompanyId: purchaseOrder.targetCompanyId,
        hasSourceCompany: !!purchaseOrder.sourceCompanyId,
        hasTargetCompany: !!purchaseOrder.targetCompanyId,
        isBidirectionalPO: !!purchaseOrder.sourceCompanyId,
      });

      // ✅ STEP 3: Enhanced pre-generation validation
      if (purchaseOrder.autoGeneratedSalesOrder) {
        throw new Error(
          `Sales order already generated from purchase order ${purchaseOrder.orderNumber}. ` +
            `Existing sales order: ${
              purchaseOrder.salesOrderNumber || "Unknown"
            } (ID: ${purchaseOrder.salesOrderRef || "Unknown"})`
        );
      }

      if (!purchaseOrder.supplier) {
        throw new Error("Purchase order has no supplier information");
      }

      // ✅ STEP 4: Enhanced supplier validation and company detection
      let supplierId;
      let supplierDetails;

      if (
        typeof purchaseOrder.supplier === "object" &&
        purchaseOrder.supplier._id
      ) {
        supplierId = purchaseOrder.supplier._id;
        supplierDetails = purchaseOrder.supplier;
      } else if (typeof purchaseOrder.supplier === "string") {
        supplierId = purchaseOrder.supplier;

        // Fetch supplier details if not populated
        try {
          const supplierResponse = await apiClient.get(
            `/api/parties/${supplierId}?populate=linkedCompanyId`
          );
          supplierDetails =
            supplierResponse.data?.data?.party ||
            supplierResponse.data?.party ||
            supplierResponse.data?.data ||
            supplierResponse.data;
        } catch (supplierError) {
          console.warn(
            "⚠️ Could not fetch supplier details:",
            supplierError.message
          );
          supplierDetails = null;
        }
      }

      if (!supplierDetails) {
        throw new Error(
          `Invalid supplier data in purchase order. Supplier field: ${JSON.stringify(
            purchaseOrder.supplier
          )}`
        );
      }

      console.log("🔍 ENHANCED: Supplier analysis:", {
        supplierId,
        supplierName: supplierDetails.name,
        hasLinkedCompany: !!supplierDetails.linkedCompanyId,
        linkedCompanyType: typeof supplierDetails.linkedCompanyId,
        linkedCompanyId:
          supplierDetails.linkedCompanyId?._id ||
          supplierDetails.linkedCompanyId,
        linkedCompanyName: supplierDetails.linkedCompanyId?.businessName,
        isLinkedSupplier: supplierDetails.isLinkedSupplier,
        enableBidirectionalOrders: supplierDetails.enableBidirectionalOrders,
      });

      // ✅ STEP 5: *** UPDATED *** - Enhanced target company detection with sourceCompanyId PRIORITY
      let targetCompanyId = null;
      let targetCompanyDetails = null;
      let detectionMethod = "manual";

      // ✅ PRIORITY 0: Use sourceCompanyId if this is a bidirectional PO (HIGHEST PRIORITY)
      if (purchaseOrder.sourceCompanyId) {
        targetCompanyId =
          purchaseOrder.sourceCompanyId._id || purchaseOrder.sourceCompanyId;
        detectionMethod = "bidirectional_source_company";
        console.log(
          "🎯 Using sourceCompanyId (bidirectional PO):",
          targetCompanyId
        );

        // Fetch company details
        try {
          const companyResponse = await apiClient.get(
            `/api/companies/${targetCompanyId}`
          );
          targetCompanyDetails =
            companyResponse.data?.data?.company ||
            companyResponse.data?.company ||
            companyResponse.data?.data ||
            companyResponse.data;

          console.log("✅ Source company details fetched:", {
            companyId: targetCompanyId,
            companyName: targetCompanyDetails?.businessName || "Unknown",
            detectionMethod: "bidirectional_source_company",
          });
        } catch (companyError) {
          console.warn(
            "⚠️ Could not fetch source company details:",
            companyError.message
          );
        }
      }

      // ✅ PRIORITY 1: Use existing targetCompanyId from purchase order if available (only if no sourceCompanyId)
      else if (purchaseOrder.targetCompanyId) {
        targetCompanyId =
          purchaseOrder.targetCompanyId._id || purchaseOrder.targetCompanyId;
        detectionMethod = "existing_target_company_id";
        console.log(
          "🎯 Using existing targetCompanyId from purchase order:",
          targetCompanyId
        );

        // Fetch company details
        try {
          const companyResponse = await apiClient.get(
            `/api/companies/${targetCompanyId}`
          );
          targetCompanyDetails =
            companyResponse.data?.data?.company ||
            companyResponse.data?.company ||
            companyResponse.data?.data ||
            companyResponse.data;
        } catch (companyError) {
          console.warn(
            "⚠️ Could not fetch existing target company details:",
            companyError.message
          );
        }
      }

      // ✅ PRIORITY 2: Use manual targetCompanyId from conversionData
      else if (conversionData.targetCompanyId) {
        targetCompanyId = conversionData.targetCompanyId;
        detectionMethod = "manual_conversion_data";
        console.log(
          "🎯 Using manual targetCompanyId from conversion data:",
          targetCompanyId
        );
      }

      // ✅ PRIORITY 3: Use supplier's linkedCompanyId
      else if (supplierDetails.linkedCompanyId) {
        if (
          typeof supplierDetails.linkedCompanyId === "object" &&
          supplierDetails.linkedCompanyId._id
        ) {
          targetCompanyId = supplierDetails.linkedCompanyId._id;
          targetCompanyDetails = supplierDetails.linkedCompanyId;
          detectionMethod = "supplier_linked_company";
        } else if (typeof supplierDetails.linkedCompanyId === "string") {
          targetCompanyId = supplierDetails.linkedCompanyId;
          detectionMethod = "supplier_linked_company";

          // Fetch company details
          try {
            const companyResponse = await apiClient.get(
              `/api/companies/${targetCompanyId}`
            );
            targetCompanyDetails =
              companyResponse.data?.data?.company ||
              companyResponse.data?.company ||
              companyResponse.data?.data ||
              companyResponse.data;
          } catch (companyError) {
            console.warn(
              "⚠️ Could not fetch target company details:",
              companyError.message
            );
          }
        }
      }

      // ✅ PRIORITY 4: Auto-detect by supplier details (only if no other method worked)
      else {
        detectionMethod = "supplier_details_matching";
        console.log(
          "🔍 ENHANCED: Attempting company detection by supplier details..."
        );

        try {
          const companiesResponse = await apiClient.get("/api/companies");
          const companiesData = companiesResponse.data;
          const companies =
            companiesData.data?.companies ||
            companiesData.companies ||
            companiesData.data ||
            [];

          const buyerCompanyId =
            purchaseOrder.companyId?._id || purchaseOrder.companyId;

          // Match by GST, phone, or email
          const matchingCompany = companies.find(
            (company) =>
              company._id.toString() !== buyerCompanyId.toString() &&
              ((supplierDetails.gstNumber &&
                company.gstin === supplierDetails.gstNumber) ||
                (supplierDetails.phoneNumber &&
                  company.phoneNumber === supplierDetails.phoneNumber) ||
                (supplierDetails.email &&
                  company.email === supplierDetails.email) ||
                (supplierDetails.name &&
                  company.businessName &&
                  company.businessName.toLowerCase() ===
                    supplierDetails.name.toLowerCase()))
          );

          if (matchingCompany) {
            targetCompanyId = matchingCompany._id;
            targetCompanyDetails = matchingCompany;
            console.log(
              "✅ ENHANCED: Found matching company by supplier details:",
              {
                companyId: matchingCompany._id,
                companyName: matchingCompany.businessName,
                matchedBy:
                  supplierDetails.gstNumber === matchingCompany.gstin
                    ? "GST"
                    : supplierDetails.phoneNumber ===
                      matchingCompany.phoneNumber
                    ? "Phone"
                    : supplierDetails.email === matchingCompany.email
                    ? "Email"
                    : "Name",
              }
            );
          }
        } catch (companiesError) {
          console.warn(
            "⚠️ ENHANCED: Company detection by supplier details failed:",
            companiesError.message
          );
        }
      }

      // ✅ Add logging to show what was detected
      console.log("✅ ENHANCED: Target company detection result:", {
        targetCompanyId,
        detectionMethod,
        sourceCompanyId: purchaseOrder.sourceCompanyId,
        hasSourceCompany: !!purchaseOrder.sourceCompanyId,
        targetCompanyName: targetCompanyDetails?.businessName || "Unknown",
        isBidirectionalPO: !!purchaseOrder.sourceCompanyId,
        flow: purchaseOrder.sourceCompanyId
          ? `Bidirectional PO: Company(${purchaseOrder.sourceCompanyId}) → PO in Company(${purchaseOrder.companyId}) → SO back to Company(${purchaseOrder.sourceCompanyId})`
          : "Regular PO flow",
      });

      if (!targetCompanyId) {
        throw new Error(
          `🚨 ENHANCED ERROR: Cannot determine target company for sales order generation.\n\n` +
            `The supplier "${supplierDetails.name}" must have:\n` +
            `1. A linkedCompanyId pointing to their company, OR\n` +
            `2. Matching GST/phone/email with an existing company, OR\n` +
            `3. Manual targetCompanyId provided in conversion data.\n\n` +
            `Current supplier data:\n` +
            `- Name: ${supplierDetails.name}\n` +
            `- LinkedCompanyId: ${
              supplierDetails.linkedCompanyId || "None"
            }\n` +
            `- GST: ${supplierDetails.gstNumber || "None"}\n` +
            `- Phone: ${supplierDetails.phoneNumber || "None"}\n` +
            `- Email: ${supplierDetails.email || "None"}\n\n` +
            `Purchase Order Context:\n` +
            `- Source Company ID: ${
              purchaseOrder.sourceCompanyId || "None"
            }\n` +
            `- Target Company ID: ${
              purchaseOrder.targetCompanyId || "None"
            }\n` +
            `- Is Bidirectional PO: ${!!purchaseOrder.sourceCompanyId}\n\n` +
            `Please link the supplier to a company first or provide targetCompanyId manually.`
        );
      }

      // ✅ STEP 6: FIXED - Enhanced circular reference validation with proper string comparison
      const buyerCompanyId =
        purchaseOrder.companyId?._id || purchaseOrder.companyId;

      // ✅ CRITICAL FIX: Proper string comparison with trimming and type conversion
      const buyerCompanyIdString = buyerCompanyId
        ? buyerCompanyId.toString().trim()
        : "";
      const targetCompanyIdString = targetCompanyId
        ? targetCompanyId.toString().trim()
        : "";

      console.log("🔍 COMPANY VALIDATION DEBUG:", {
        buyerCompanyId: buyerCompanyIdString,
        targetCompanyId: targetCompanyIdString,
        buyerType: typeof buyerCompanyId,
        targetType: typeof targetCompanyId,
        areEqual: buyerCompanyIdString === targetCompanyIdString,
        buyerLength: buyerCompanyIdString.length,
        targetLength: targetCompanyIdString.length,
        originalBuyer: purchaseOrder.companyId,
        originalTarget: targetCompanyId,
        detectionMethod,
        isBidirectionalPO: !!purchaseOrder.sourceCompanyId,
        bidirectionalFlow: purchaseOrder.sourceCompanyId
          ? `Source(${purchaseOrder.sourceCompanyId}) → Buyer(${buyerCompanyId}) → Target(${targetCompanyId})`
          : "Not bidirectional",
      });

      // ✅ ENHANCED: Only validate circular reference if not using sourceCompanyId for bidirectional flow
      if (
        buyerCompanyIdString &&
        targetCompanyIdString &&
        buyerCompanyIdString === targetCompanyIdString &&
        detectionMethod !== "bidirectional_source_company" // Allow sourceCompanyId to be same as buyer for reverse flow
      ) {
        throw new Error(
          `🚨 ENHANCED CIRCULAR REFERENCE ERROR:\n\n` +
            `The supplier's target company (${targetCompanyIdString}) cannot be the same as the buyer company (${buyerCompanyIdString}).\n\n` +
            `This would create a circular reference where a company would generate a sales order to sell to itself.\n\n` +
            `Current setup:\n` +
            `- Purchase Order: Created by Company ${buyerCompanyIdString}\n` +
            `- Supplier: ${supplierDetails.name}\n` +
            `- Supplier's Linked Company: ${targetCompanyIdString}\n` +
            `- Detection Method: ${detectionMethod}\n` +
            `- Is Bidirectional PO: ${!!purchaseOrder.sourceCompanyId}\n\n` +
            `Solution: The supplier should be linked to a DIFFERENT company that will create the sales order.\n` +
            `The flow should be: Company A creates PO → Supplier (linked to Company B) → Company B creates SO to sell back to Company A.`
        );
      }

      // ✅ SPECIAL CASE: For bidirectional POs using sourceCompanyId, this is the correct reverse flow
      if (
        detectionMethod === "bidirectional_source_company" &&
        buyerCompanyIdString === targetCompanyIdString
      ) {
        console.log("✅ BIDIRECTIONAL REVERSE FLOW DETECTED:", {
          explanation:
            "This is a reverse bidirectional flow where the source company is creating a sales order back to the buyer",
          originalFlow: `Company ${purchaseOrder.sourceCompanyId} → created PO in Company ${buyerCompanyId}`,
          reverseFlow: `Company ${buyerCompanyId} → creating SO back to Company ${targetCompanyId}`,
          isValid: true,
          allowCircularForBidirectional: true,
        });
      }

      console.log("✅ ENHANCED: Target company validation passed:", {
        buyerCompanyId: buyerCompanyIdString,
        targetCompanyId: targetCompanyIdString,
        targetCompanyName: targetCompanyDetails?.businessName || "Unknown",
        detectionMethod,
        supplierName: supplierDetails.name,
        validationPassed: true,
        isBidirectionalFlow: detectionMethod === "bidirectional_source_company",
      });

      // ✅ STEP 7: Prepare enhanced request payload
      const enhancedPayload = {
        purchaseOrderId,

        // ✅ Enhanced targeting
        targetCompanyId,
        sourceCompanyId: buyerCompanyId,

        // ✅ Enhanced conversion options
        autoLinkCustomer: conversionData.autoLinkCustomer ?? true,
        validateBidirectionalSetup:
          conversionData.validateBidirectionalSetup ?? true,
        preserveItemDetails: conversionData.preserveItemDetails ?? true,
        preservePricing: conversionData.preservePricing ?? true,
        preserveTerms: conversionData.preserveTerms ?? true,
        autoAcceptOrder: conversionData.autoAcceptOrder ?? false,

        // ✅ Enhanced metadata
        generationNotes:
          conversionData.generationNotes ||
          `Auto-generated from PO ${purchaseOrder.orderNumber} via enhanced bidirectional flow (${detectionMethod})`,
        convertedBy: conversionData.convertedBy || null,

        // ✅ Enhanced tracking context
        enhancedTracking: {
          detectionMethod,
          isBidirectionalPO: !!purchaseOrder.sourceCompanyId,
          originalSourceCompanyId: purchaseOrder.sourceCompanyId,
          supplierDetails: {
            id: supplierDetails._id,
            name: supplierDetails.name,
            linkedCompanyId: supplierDetails.linkedCompanyId,
          },
          targetCompanyDetails: {
            id: targetCompanyId,
            name: targetCompanyDetails?.businessName || "Unknown",
          },
          sourceCompanyDetails: {
            id: buyerCompanyId,
            name: purchaseOrder.companyId?.businessName || "Buyer Company",
          },
          bidirectionalFlow: purchaseOrder.sourceCompanyId
            ? {
                originalSourceCompany: purchaseOrder.sourceCompanyId,
                purchaseOrderCompany: buyerCompanyId,
                salesOrderCompany: targetCompanyId,
                isReverseFlow:
                  detectionMethod === "bidirectional_source_company",
              }
            : null,
        },
      };

      console.log("📦 ENHANCED: Final request payload prepared:", {
        purchaseOrderId: enhancedPayload.purchaseOrderId,
        targetCompanyId: enhancedPayload.targetCompanyId,
        sourceCompanyId: enhancedPayload.sourceCompanyId,
        detectionMethod,
        isBidirectionalPO: !!purchaseOrder.sourceCompanyId,
        preservationSettings: {
          items: enhancedPayload.preserveItemDetails,
          pricing: enhancedPayload.preservePricing,
          terms: enhancedPayload.preserveTerms,
        },
        autoSettings: {
          linkCustomer: enhancedPayload.autoLinkCustomer,
          validateSetup: enhancedPayload.validateBidirectionalSetup,
          autoAccept: enhancedPayload.autoAcceptOrder,
        },
        bidirectionalContext:
          enhancedPayload.enhancedTracking.bidirectionalFlow,
      });

      // ✅ STEP 8: Make the enhanced API call
      const response = await apiClient.post(
        `/api/sales-orders/generate-from-purchase/${purchaseOrderId}`,
        enhancedPayload
      );

      console.log(
        "✅ ENHANCED: Sales order generation completed successfully:",
        {
          success: response.data.success,
          salesOrderId: response.data.data?.salesOrder?._id,
          salesOrderNumber: response.data.data?.salesOrder?.orderNumber,
          customerCreated: response.data.data?.customerCreated,
          customerLinked: response.data.data?.customerLinked,
          sourceCompanyTracking: response.data.data?.sourceCompanyTracking,
          bidirectionalTracking: response.data.data?.bidirectionalTracking,
          detectionMethod,
        }
      );

      return {
        success: true,
        data: {
          salesOrder: response.data.data?.salesOrder,
          purchaseOrder: response.data.data?.purchaseOrder,
          customer: response.data.data?.customer,

          // ✅ Enhanced tracking information
          enhancedTracking: {
            detectionMethod,
            targetCompanyId,
            sourceCompanyId: buyerCompanyId,
            supplierDetails,
            targetCompanyDetails,
            customerCreated: response.data.data?.customerCreated,
            customerLinked: response.data.data?.customerLinked,
            preservationApplied: {
              items: enhancedPayload.preserveItemDetails,
              pricing: enhancedPayload.preservePricing,
              terms: enhancedPayload.preserveTerms,
            },
            validationResults: response.data.data?.bidirectionalTracking,
            isBidirectionalPO: !!purchaseOrder.sourceCompanyId,
            bidirectionalFlow:
              enhancedPayload.enhancedTracking.bidirectionalFlow,
          },

          // ✅ Enhanced conversion summary
          conversionSummary: {
            originalPurchaseOrder: purchaseOrder.orderNumber,
            generatedSalesOrder: response.data.data?.salesOrder?.orderNumber,
            buyerCompany:
              purchaseOrder.companyId?.businessName || "Buyer Company",
            supplierCompany:
              targetCompanyDetails?.businessName || "Supplier Company",
            supplier: supplierDetails.name,
            detectionMethod,
            itemsConverted: response.data.data?.salesOrder?.items?.length || 0,
            totalAmount:
              response.data.data?.salesOrder?.totals?.finalTotal || 0,
            preservationStatus: {
              itemsPreserved: enhancedPayload.preserveItemDetails,
              pricingPreserved: enhancedPayload.preservePricing,
              termsPreserved: enhancedPayload.preserveTerms,
            },
            bidirectionalInfo: {
              isBidirectionalPO: !!purchaseOrder.sourceCompanyId,
              originalSourceCompany: purchaseOrder.sourceCompanyId,
              isReverseFlow: detectionMethod === "bidirectional_source_company",
              flowDescription: purchaseOrder.sourceCompanyId
                ? `Reverse flow: Company ${purchaseOrder.sourceCompanyId} → PO in ${buyerCompanyId} → SO back to ${targetCompanyId}`
                : "Standard flow: PO → SO generation",
            },
          },
        },
        message:
          response.data.message ||
          "Sales order generated from purchase order successfully with enhanced bidirectional tracking",
      };
    } catch (error) {
      console.error("❌ ENHANCED: PO → SO generation failed:", {
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status,
      });

      // ✅ Enhanced error categorization and messages
      let errorMessage = "Failed to generate sales order from purchase order";
      let errorCategory = "GENERAL_ERROR";

      if (
        error.message?.includes("same as the buyer company") ||
        error.message?.includes("CIRCULAR REFERENCE")
      ) {
        errorCategory = "CIRCULAR_REFERENCE";
        errorMessage = error.message; // Use the detailed circular reference error
      } else if (
        error.message?.includes("Cannot determine target company") ||
        error.message?.includes("ENHANCED ERROR")
      ) {
        errorCategory = "TARGET_COMPANY_DETECTION";
        errorMessage = error.message; // Use the detailed target company error
      } else if (error.message?.includes("already generated")) {
        errorCategory = "DUPLICATE_GENERATION";
        errorMessage = error.message; // Use the duplicate generation error
      } else if (
        error.message?.includes("no supplier") ||
        error.message?.includes("Invalid supplier")
      ) {
        errorCategory = "SUPPLIER_VALIDATION";
        errorMessage = error.message; // Use the supplier validation error
      } else if (error.message?.includes("Purchase Order ID is required")) {
        errorCategory = "MISSING_PURCHASE_ORDER_ID";
        errorMessage = "Purchase Order ID is required";
      } else if (error.message?.includes("Invalid Purchase Order ID format")) {
        errorCategory = "INVALID_PURCHASE_ORDER_ID";
        errorMessage = "Invalid Purchase Order ID format";
      } else if (error.message?.includes("Purchase order not found")) {
        errorCategory = "PURCHASE_ORDER_NOT_FOUND";
        errorMessage = "Purchase order not found";
      } else if (error.response?.status === 400) {
        errorCategory = "BAD_REQUEST";
        errorMessage =
          error.response.data?.message ||
          "Invalid purchase order for conversion";
      } else if (error.response?.status === 404) {
        errorCategory = "NOT_FOUND";
        errorMessage = "Purchase order not found";
      } else if (error.response?.status === 403) {
        errorCategory = "PERMISSION_DENIED";
        errorMessage =
          "Access denied. You may not have permission to generate sales orders.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage,
        errorCategory,
        error: {
          originalError: error.message,
          response: error.response?.data,
          status: error.response?.status,
          details: error.response?.data?.details,
        },
        data: null,
      };
    }
  }
  /**
   * Bulk generate sales orders from multiple purchase orders
   */
  async bulkGenerateFromPurchaseOrders(purchaseOrderIds, conversionData = {}) {
    try {
      const response = await apiClient.post(
        "/api/sales-orders/bulk/generate-from-purchase",
        {
          purchaseOrderIds,
          ...conversionData,
        }
      );
      return {
        success: true,
        data: response.data,
        message: "Sales orders generated from purchase orders successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to bulk generate sales orders",
      };
    }
  }

  /**
   * Get purchase orders that have generated sales orders
   */
  async getPurchaseOrdersWithSalesOrders(companyId, filters = {}) {
    try {
      const params = {companyId, ...filters};
      const response = await apiClient.get(
        "/api/sales-orders/purchase-orders-with-sales",
        {params}
      );
      return {
        success: true,
        data: response.data,
        message: "Purchase orders with sales orders fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch purchase orders with sales orders",
      };
    }
  }

  /**
   * Get bidirectional purchase analytics
   */
  async getBidirectionalPurchaseAnalytics(companyId, filters = {}) {
    try {
      const params = {companyId, ...filters};
      const response = await apiClient.get(
        "/api/sales-orders/analytics/bidirectional",
        {params}
      );
      return {
        success: true,
        data: response.data,
        message: "Bidirectional purchase analytics fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch bidirectional analytics",
      };
    }
  }

  /**
   * Get sales order generation status for a purchase order
   */
  // ✅ CORRECT - Should be:
  async getSalesOrderGenerationStatus(companyId, purchaseOrderId) {
    const params = {companyId, purchaseOrderId};
    const response = await apiClient.get(
      "/api/sales-orders/sales-generation-status",
      {params}
    );
    return {
      success: true,
      data: response.data,
      message: "Sales order generation status fetched successfully",
    };
  }
  /**
   * Get purchase order source tracking information
   */

  // ✅ CORRECT - Should be:
  async getPurchaseOrderSourceTracking(purchaseOrderId) {
    try {
      const response = await apiClient.get(
        `/api/sales-orders/purchase-order-tracking/${purchaseOrderId}`
      );
      return {
        success: true,
        data: response.data,
        message:
          "Purchase order source tracking information fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch purchase order source tracking information",
      };
    }
  }

  // ==================== ADDITIONAL REPORTING ====================

  /**
   * Get conversion rate analysis
   */
  async getConversionRateAnalysis(companyId, filters = {}) {
    try {
      const params = {companyId, ...filters};
      const response = await apiClient.get(
        "/api/sales-orders/reports/conversion-rate",
        {params}
      );
      return {
        success: true,
        data: response.data,
        message: "Conversion rate analysis fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch conversion rate analysis",
      };
    }
  }

  /**
   * Get aging report
   */
  async getAgingReport(companyId, filters = {}) {
    try {
      const params = {companyId, ...filters};
      const response = await apiClient.get("/api/sales-orders/reports/aging", {
        params,
      });
      return {
        success: true,
        data: response.data,
        message: "Aging report fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch aging report",
      };
    }
  }

  // ==================== EXPORT FUNCTIONS ====================

  /**
   * Export orders to CSV
   */
  async exportToCSV(companyId, filters = {}) {
    try {
      const params = {companyId, ...filters};
      const response = await apiClient.get("/api/sales-orders/export/csv", {
        params,
        responseType: "blob",
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `sales-orders-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return {
        success: true,
        message: "Export completed successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message || error.message || "Export failed",
      };
    }
  }

  // ==================== REPORTING AND ANALYTICS ====================

  /**
   * Get dashboard summary
   */
  async getDashboardSummary(companyId) {
    try {
      const params = {companyId};
      const response = await apiClient.get(
        "/api/sales-orders/reports/dashboard",
        {params}
      );
      return {
        success: true,
        data: response.data,
        message: "Dashboard summary fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch dashboard summary",
      };
    }
  }

  // ==================== ✅ DEBUG AND TESTING ====================

  /**
   * Test API connectivity and endpoints
   */
  async testConnection(companyId) {
    try {
      console.log("🔬 Testing API connection...");

      const endpoints = [
        "/api/health",
        "/api/sales-orders/test",
        `/api/companies/${companyId}/test`,
        "/api/sales-orders",
      ];

      const results = {};

      for (const endpoint of endpoints) {
        try {
          const response = await apiClient.get(endpoint, {
            params: {companyId},
            timeout: 5000,
          });
          results[endpoint] = {
            status: "success",
            statusCode: response.status,
            data: response.data,
          };
        } catch (error) {
          results[endpoint] = {
            status: "failed",
            statusCode: error.response?.status,
            error: error.message,
          };
        }
      }

      console.log("🔬 Connection test results:", results);
      return results;
    } catch (error) {
      console.error("❌ Connection test failed:", error);
      return {
        error: error.message,
        message: "Failed to test API connection",
      };
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Validate order data before submission
   */
  validateOrderData(orderData) {
    const errors = [];

    if (!orderData.companyId) {
      errors.push("Company ID is required");
    }

    if (!orderData.customerName && !orderData.customer) {
      errors.push("Customer name or ID is required");
    }

    if (
      !orderData.items ||
      !Array.isArray(orderData.items) ||
      orderData.items.length === 0
    ) {
      errors.push("At least one item is required");
    }

    if (orderData.items) {
      orderData.items.forEach((item, index) => {
        if (!item.itemName) {
          errors.push(`Item ${index + 1}: Name is required`);
        }
        if (!item.quantity || item.quantity <= 0) {
          errors.push(`Item ${index + 1}: Valid quantity is required`);
        }
        if (!item.pricePerUnit || item.pricePerUnit < 0) {
          errors.push(`Item ${index + 1}: Valid price is required`);
        }
      });
    }

    if (
      orderData.orderType &&
      !["quotation", "sales_order", "proforma_invoice"].includes(
        orderData.orderType
      )
    ) {
      errors.push("Invalid order type");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Format order data for API submission
   */
  formatOrderData(orderData) {
    return {
      ...orderData,
      orderType: orderData.orderType || "quotation",
      gstEnabled: orderData.gstEnabled ?? true,
      taxMode: orderData.taxMode || "without-tax",
      priceIncludesTax: orderData.priceIncludesTax ?? false,
      status: orderData.status || "draft",
      priority: orderData.priority || "normal",
      items:
        orderData.items?.map((item, index) => ({
          ...item,
          lineNumber: index + 1,
          taxRate: item.taxRate || 18,
          unit: item.unit || "PCS",
          discountPercent: item.discountPercent || 0,
          discountAmount: item.discountAmount || 0,
        })) || [],
    };
  }

  // ==================== ✅ PAYIN SPECIFIC HELPER METHODS ====================

  /**
   * ✅ Calculate pending amount for an order
   */
  calculatePendingAmount(order) {
    const totalAmount = parseFloat(
      order.totalAmount ||
        order.amount ||
        order.finalTotal ||
        order.grandTotal ||
        0
    );
    const paidAmount = parseFloat(
      order.paidAmount || order.amountPaid || order.receivedAmount || 0
    );
    return Math.max(0, totalAmount - paidAmount);
  }

  /**
   * ✅ Format order for PayIn dropdown display
   */
  formatOrderForPayment(order) {
    const totalAmount = parseFloat(
      order.totalAmount || order.amount || order.finalTotal || 0
    );
    const paidAmount = parseFloat(order.paidAmount || order.amountPaid || 0);
    const pendingAmount = totalAmount - paidAmount;
    const orderNumber =
      order.orderNumber ||
      order.saleNumber ||
      order.quotationNumber ||
      order._id;
    const orderDate =
      order.orderDate ||
      order.saleDate ||
      order.quotationDate ||
      order.createdAt;

    return {
      id: order._id || order.id,
      orderNumber,
      orderDate,
      totalAmount,
      paidAmount,
      pendingAmount,
      displayText: `#${orderNumber} - ₹${totalAmount.toLocaleString(
        "en-IN"
      )} (Pending: ₹${pendingAmount.toLocaleString("en-IN")}) - ${new Date(
        orderDate
      ).toLocaleDateString("en-IN")}`,
      order: order,
    };
  }

  /**
   * ✅ Get payment types for PayIn (only 2 options as requested)
   */
  getPaymentTypes() {
    return [
      {
        value: "advance",
        label: "Advance Payment",
        description: "Payment received in advance without specific order",
        icon: "faMoneyBillWave",
      },
      {
        value: "pending",
        label: "Order Payment",
        description: "Payment against a specific sales order",
        icon: "faFileInvoice",
      },
    ];
  }
}

// ✅ Export as singleton instance
export default new SaleOrderService();
