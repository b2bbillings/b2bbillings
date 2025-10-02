const express = require("express");
const router = express.Router();
const axios = require("axios");
const logger = require("../config/logger");

// ================================
// PINCODE API CONTROLLER
// ================================

/**
 * Get location details by pincode
 * @route GET /api/pincode/:pincode
 * @desc Get location information for a pincode
 * @access Public
 */
const getPincodeDetails = async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress;
  
  try {
    const { pincode } = req.params;
    
    // Validate pincode format
    if (!pincode || !/^[1-9][0-9]{5}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pincode format. Please provide a valid 6-digit Indian pincode.",
        code: "INVALID_PINCODE_FORMAT"
      });
    }

    // Try multiple APIs for better coverage
    let locationData = null;
    
    // Try API 1: PostPincode API
    try {
      const response1 = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`, {
        timeout: 5000
      });
      
      if (response1.data && response1.data[0] && response1.data[0].Status === "Success") {
        const data = response1.data[0].PostOffice[0];
        locationData = {
          pincode: pincode,
          village: data.Name,
          taluka: data.Block,
          district: data.District,
          state: data.State,
          country: data.Country,
          source: "postalpincode.in"
        };
      }
    } catch (error) {
      console.log("PostPincode API failed:", error.message);
    }

    // Try API 2: Zippopotam API (fallback)
    if (!locationData) {
      try {
        const response2 = await axios.get(`http://api.zippopotam.us/IN/${pincode}`, {
          timeout: 5000
        });
        
        if (response2.data && response2.data.places && response2.data.places.length > 0) {
          const place = response2.data.places[0];
          locationData = {
            pincode: pincode,
            village: place['place name'],
            taluka: place['place name'], // Zippopotam doesn't have taluka, using place name
            district: place['place name'],
            state: place.state,
            country: response2.data.country,
            source: "zippopotam.us"
          };
        }
      } catch (error) {
        console.log("Zippopotam API failed:", error.message);
      }
    }

    // Try API 3: Indian Postal API (another fallback)
    if (!locationData) {
      try {
        const response3 = await axios.get(`https://india-pincode-with-latitude-and-longitude.p.rapidapi.com/api/v1/pincode/${pincode}`, {
          headers: {
            'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '', // Add your RapidAPI key if needed
            'X-RapidAPI-Host': 'india-pincode-with-latitude-and-longitude.p.rapidapi.com'
          },
          timeout: 5000
        });
        
        if (response3.data && response3.data.length > 0) {
          const data = response3.data[0];
          locationData = {
            pincode: pincode,
            village: data.post_office_name,
            taluka: data.sub_district,
            district: data.district,
            state: data.state,
            country: "India",
            latitude: data.latitude,
            longitude: data.longitude,
            source: "rapidapi.com"
          };
        }
      } catch (error) {
        console.log("RapidAPI failed:", error.message);
      }
    }

    if (!locationData) {
      return res.status(404).json({
        success: false,
        message: "Location information not found for this pincode. Please verify the pincode and try again.",
        code: "PINCODE_NOT_FOUND",
        pincode: pincode
      });
    }

    logger.info("Pincode details retrieved successfully", {
      pincode,
      source: locationData.source,
      responseTime: Date.now() - startTime,
      ip: clientIp,
    });

    res.json({
      success: true,
      message: "Location details retrieved successfully",
      data: locationData,
      metadata: {
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        source: locationData.source
      }
    });

  } catch (error) {
    logger.error("Get pincode details failed", {
      error: error.message,
      stack: error.stack,
      pincode: req.params.pincode,
      ip: clientIp,
      responseTime: Date.now() - startTime,
    });

    res.status(500).json({
      success: false,
      message: "Failed to fetch location details",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
      code: "PINCODE_FETCH_ERROR",
      metadata: {
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      }
    });
  }
};

/**
 * Search pincodes by location name
 * @route GET /api/pincode/search/:location
 * @desc Search pincodes by city/village name
 * @access Public
 */
const searchPincodesByLocation = async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress;
  
  try {
    const { location } = req.params;
    
    if (!location || location.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Location name must be at least 2 characters long",
        code: "INVALID_LOCATION_NAME"
      });
    }

    const cleanLocation = location.trim().replace(/\s+/g, '%20');
    
    try {
      const response = await axios.get(`https://api.postalpincode.in/postoffice/${cleanLocation}`, {
        timeout: 5000
      });
      
      if (response.data && response.data[0] && response.data[0].Status === "Success") {
        const locations = response.data[0].PostOffice.map(office => ({
          name: office.Name,
          pincode: office.Pincode,
          district: office.District,
          state: office.State,
          country: office.Country,
          taluka: office.Block,
          division: office.Division,
          region: office.Region
        }));

        logger.info("Pincode search completed successfully", {
          location,
          resultsCount: locations.length,
          responseTime: Date.now() - startTime,
          ip: clientIp,
        });

        res.json({
          success: true,
          message: "Location search completed successfully",
          data: {
            searchTerm: location,
            results: locations,
            count: locations.length
          },
          metadata: {
            timestamp: new Date().toISOString(),
            responseTime: Date.now() - startTime,
          }
        });
      } else {
        res.status(404).json({
          success: false,
          message: "No locations found for the given search term",
          code: "LOCATION_NOT_FOUND",
          searchTerm: location
        });
      }
    } catch (apiError) {
      throw new Error(`Location search API failed: ${apiError.message}`);
    }

  } catch (error) {
    logger.error("Search pincodes failed", {
      error: error.message,
      stack: error.stack,
      location: req.params.location,
      ip: clientIp,
      responseTime: Date.now() - startTime,
    });

    res.status(500).json({
      success: false,
      message: "Failed to search locations",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
      code: "LOCATION_SEARCH_ERROR",
      metadata: {
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      }
    });
  }
};

// Routes
router.get("/:pincode", getPincodeDetails);
router.get("/search/:location", searchPincodesByLocation);

module.exports = router;