/**
 * WhatsApp Integration Utility
 * Provides functions to send WhatsApp messages with predefined content
 */

export const WHATSAPP_CONFIG = {
  APP_URL: 'https://b2bbillings.vercel.app/',
  APP_NAME: 'B2B Billings',
  APP_DESCRIPTION: 'Complete B2B Business Management Platform',
  FEATURES: [
    'Invoice Generation & Management',
    'Purchase Order Processing',
    'Real-time Team Chat & Collaboration',
    'Party & Supplier Management',
    'Financial Transaction Tracking',
    'Inventory Management',
    'Business Analytics & Reporting'
  ]
};

/**
 * Formats a phone number for WhatsApp URL
 * @param {string} phoneNumber - The phone number to format
 * @returns {string} - Formatted phone number for WhatsApp
 */
export const formatPhoneForWhatsApp = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  // Remove all non-numeric characters
  let cleanNumber = phoneNumber.replace(/\D/g, '');
  
  // Add country code if not present (assuming India +91)
  if (!cleanNumber.startsWith('91') && cleanNumber.length === 10) {
    cleanNumber = '91' + cleanNumber;
  }
  
  return cleanNumber;
};

/**
 * Generates the default message for new contacts
 * @param {Object} options - Configuration options
 * @param {string} options.contactName - Name of the contact
 * @param {string} options.companyName - Name of the company
 * @param {string} options.senderName - Name of the sender
 * @returns {string} - Formatted WhatsApp message
 */
export const generateDefaultMessage = ({ 
  contactName = '',
  companyName = '',
  senderName = '' 
} = {}) => {
  const greeting = contactName ? `Hi ${contactName},` : 'Hello,';
  const introduction = senderName ? `This is ${senderName}` : 'This is from';
  const companyIntro = companyName ? ` from ${companyName}.` : '.';
  
  return `${greeting}

${introduction}${companyIntro}

I'd like to introduce you to ${WHATSAPP_CONFIG.APP_NAME} - ${WHATSAPP_CONFIG.APP_DESCRIPTION}.

🚀 Key Features:
${WHATSAPP_CONFIG.FEATURES.map(feature => `• ${feature}`).join('\n')}

✨ Why Choose ${WHATSAPP_CONFIG.APP_NAME}?
• Streamline your entire B2B operations
• Real-time collaboration with your team
• Professional invoice & order management
• Comprehensive business analytics
• Secure & reliable platform

🔗 Explore the platform: ${WHATSAPP_CONFIG.APP_URL}

Would you like to see how ${WHATSAPP_CONFIG.APP_NAME} can help streamline your business operations?

Best regards,
${senderName || 'Team B2B Billings'}`;
};

/**
 * Generates a bulk message for existing contacts
 * @param {Object} options - Configuration options
 * @param {string} options.senderName - Name of the sender
 * @param {string} options.companyName - Name of the company
 * @returns {string} - Formatted WhatsApp message for bulk sending
 */
export const generateBulkMessage = ({ 
  senderName = '',
  companyName = '' 
} = {}) => {
  const introduction = senderName ? `This is ${senderName}` : 'This is from';
  const companyIntro = companyName ? ` from ${companyName}.` : '.';
  
  return `Hello!

${introduction}${companyIntro}

Hope you're doing well! 

I wanted to share an exciting update about our business management platform - ${WHATSAPP_CONFIG.APP_NAME}.

🎯 What's New:
• Enhanced invoice generation with professional templates
• Advanced team collaboration features
• Real-time business analytics dashboard
• Streamlined purchase order management
• Improved mobile experience

💼 Perfect for:
• B2B businesses looking to digitize operations
• Teams wanting better collaboration tools
• Companies needing professional invoicing
• Businesses requiring comprehensive reporting

🔗 Check it out: ${WHATSAPP_CONFIG.APP_URL}

I'd love to show you how ${WHATSAPP_CONFIG.APP_NAME} can help optimize your business processes. Are you available for a quick demo?

Best regards,
${senderName || 'Team B2B Billings'}`;
};

/**
 * Creates a WhatsApp URL with the message
 * @param {string} phoneNumber - The phone number to send to
 * @param {string} message - The message to send
 * @returns {string} - WhatsApp URL
 */
export const createWhatsAppURL = (phoneNumber, message) => {
  const formattedPhone = formatPhoneForWhatsApp(phoneNumber);
  const encodedMessage = encodeURIComponent(message);
  
  if (!formattedPhone) {
    throw new Error('Valid phone number is required');
  }
  
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
};

/**
 * Opens WhatsApp with a pre-filled message
 * @param {string} phoneNumber - The phone number to send to
 * @param {string} message - The message to send
 * @param {boolean} newTab - Whether to open in new tab (default: true)
 */
export const openWhatsApp = (phoneNumber, message, newTab = true) => {
  try {
    const url = createWhatsAppURL(phoneNumber, message);
    
    if (newTab) {
      window.open(url, '_blank');
    } else {
      window.location.href = url;
    }
  } catch (error) {
    console.error('Error opening WhatsApp:', error);
    throw error;
  }
};

/**
 * Sends WhatsApp message to a single contact
 * @param {Object} contact - Contact object
 * @param {Object} options - Message options
 * @returns {Promise} - Promise that resolves when message is sent
 */
export const sendWhatsAppToContact = async (contact, options = {}) => {
  try {
    if (!contact.phoneNumber) {
      throw new Error('Contact does not have a phone number');
    }
    
    const message = generateDefaultMessage({
      contactName: contact.name,
      companyName: options.companyName,
      senderName: options.senderName
    });
    
    openWhatsApp(contact.phoneNumber, message);
    
    return {
      success: true,
      contact: contact.name,
      phoneNumber: contact.phoneNumber
    };
  } catch (error) {
    console.error('Error sending WhatsApp to contact:', error);
    return {
      success: false,
      contact: contact.name,
      error: error.message
    };
  }
};

/**
 * Sends WhatsApp messages to multiple contacts
 * @param {Array} contacts - Array of contact objects
 * @param {Object} options - Message options
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise} - Promise that resolves with results
 */
export const sendWhatsAppToMultipleContacts = async (contacts, options = {}, onProgress = null) => {
  const results = [];
  const useBulkMessage = options.useBulkMessage || false;
  
  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    
    try {
      if (!contact.phoneNumber) {
        results.push({
          success: false,
          contact: contact.name,
          error: 'No phone number'
        });
        continue;
      }
      
      const message = useBulkMessage 
        ? generateBulkMessage({
            senderName: options.senderName,
            companyName: options.companyName
          })
        : generateDefaultMessage({
            contactName: contact.name,
            companyName: options.companyName,
            senderName: options.senderName
          });
      
      // Add delay between messages to avoid overwhelming
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      openWhatsApp(contact.phoneNumber, message);
      
      results.push({
        success: true,
        contact: contact.name,
        phoneNumber: contact.phoneNumber
      });
      
      // Call progress callback if provided
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: contacts.length,
          contact: contact.name,
          success: true
        });
      }
      
    } catch (error) {
      console.error(`Error sending WhatsApp to ${contact.name}:`, error);
      results.push({
        success: false,
        contact: contact.name,
        error: error.message
      });
      
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: contacts.length,
          contact: contact.name,
          success: false,
          error: error.message
        });
      }
    }
  }
  
  return results;
};

/**
 * Validates if a phone number can be used for WhatsApp
 * @param {string} phoneNumber - The phone number to validate
 * @returns {boolean} - Whether the phone number is valid for WhatsApp
 */
export const isValidWhatsAppNumber = (phoneNumber) => {
  if (!phoneNumber) return false;
  
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  // Check if it's a valid 10-digit Indian number or international format
  return cleanNumber.length >= 10 && cleanNumber.length <= 15;
};

/**
 * Gets WhatsApp status for a contact
 * @param {Object} contact - Contact object
 * @returns {Object} - Status object with validity and formatted number
 */
export const getWhatsAppStatus = (contact) => {
  const isValid = isValidWhatsAppNumber(contact.phoneNumber);
  const formattedNumber = isValid ? formatPhoneForWhatsApp(contact.phoneNumber) : null;
  
  return {
    isValid,
    formattedNumber,
    phoneNumber: contact.phoneNumber,
    canSendWhatsApp: isValid
  };
};

export default {
  WHATSAPP_CONFIG,
  formatPhoneForWhatsApp,
  generateDefaultMessage,
  generateBulkMessage,
  createWhatsAppURL,
  openWhatsApp,
  sendWhatsAppToContact,
  sendWhatsAppToMultipleContacts,
  isValidWhatsAppNumber,
  getWhatsAppStatus
};