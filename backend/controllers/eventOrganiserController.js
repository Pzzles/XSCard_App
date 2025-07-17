const https = require('https');
const { db } = require('../firebase');
const admin = require('firebase-admin');
const { formatDate } = require('../utils/dateFormatter');

/**
 * Create a Paystack subaccount for the event organiser
 * This allows the organiser to collect money from paid events
 */
const createPaystackSubaccount = async (organiserData) => {
  const params = JSON.stringify({
    business_name: organiserData.businessName,
    settlement_bank: organiserData.bankCode,
    account_number: organiserData.accountNumber,
            percentage_charge: 10, // 10% fee for the platform
    description: `Payment collection account for ${organiserData.businessName}`,
    primary_contact_email: organiserData.email,
    primary_contact_name: organiserData.contactName,
    primary_contact_phone: organiserData.phone,
    metadata: {
      organiser_id: organiserData.userId,
      business_type: organiserData.businessType,
      registration_number: organiserData.registrationNumber
    }
  });

  const options = {
    hostname: 'api.paystack.co',
    port: 443,
    path: '/subaccount',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', error => {
      reject(error);
    });

    req.write(params);
    req.end();
  });
};

/**
 * Verify bank account details with Paystack
 */
const verifyBankAccount = async (accountNumber, bankCode) => {
  const params = JSON.stringify({
    account_number: accountNumber,
    bank_code: bankCode
  });

  const options = {
    hostname: 'api.paystack.co',
    port: 443,
    path: '/bank/resolve',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          console.log('Raw Paystack response:', data);
          if (!data || data.trim() === '') {
            reject(new Error('Empty response from Paystack'));
            return;
          }
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          console.error('Error parsing Paystack response:', error);
          console.error('Raw response data:', data);
          reject(new Error(`Invalid JSON response from Paystack: ${error.message}`));
        }
      });
    });

    req.on('error', error => {
      reject(error);
    });

    req.write(params);
    req.end();
  });
};

/**
 * Get list of supported banks from Paystack
 */
const getSupportedBanks = async (req, res) => {
  try {
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/bank',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      }
    };

    const banksReq = https.request(options, banksRes => {
      let data = '';

      banksRes.on('data', chunk => {
        data += chunk;
      });

      banksRes.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.status) {
            res.status(200).json({
              success: true,
              data: response.data
            });
          } else {
            res.status(500).json({
              success: false,
              message: 'Failed to fetch banks'
            });
          }
        } catch (error) {
          res.status(500).json({
            success: false,
            message: 'Error parsing banks response'
          });
        }
      });
    });

    banksReq.on('error', error => {
      console.error('Error fetching banks:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching banks'
      });
    });

    banksReq.end();
  } catch (error) {
    console.error('Error in getSupportedBanks:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Step 1: Register basic organiser information
 */
const registerOrganiserStep1 = async (req, res) => {
  try {
    const userId = req.user.uid;
    const {
      businessName,
      businessType,
      registrationNumber,
      contactName,
      phone,
      email,
      businessAddress,
      city,
      country = 'South Africa'
    } = req.body;

    // Validate required fields
    if (!businessName || !businessType || !contactName || !phone || !email || !businessAddress || !city) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if user is already registered as an organiser
    const existingOrganiser = await db.collection('event_organisers').doc(userId).get();
    if (existingOrganiser.exists) {
      return res.status(409).json({
        success: false,
        message: 'User is already registered for payment collection'
      });
    }

    // Create organiser document with step 1 data
    const organiserData = {
      userId,
      businessName,
      businessType,
      registrationNumber: registrationNumber || null,
      contactName,
      phone,
      email,
      businessAddress,
      city,
      country,
      registrationStep: 1,
      status: 'pending_banking_details',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };

    await db.collection('event_organisers').doc(userId).set(organiserData);

    // Update user role to indicate they're an organiser
    await db.collection('users').doc(userId).update({
      role: 'event_organiser',
      organiserStatus: 'pending_banking_details'
    });

    res.status(201).json({
      success: true,
      message: 'Basic information saved successfully',
      data: {
        ...organiserData,
        createdAt: formatDate(organiserData.createdAt),
        updatedAt: formatDate(organiserData.updatedAt)
      }
    });
  } catch (error) {
    console.error('Error in registerOrganiserStep1:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Step 2: Add banking details and create Paystack subaccount
 */
const registerOrganiserStep2 = async (req, res) => {
  try {
    const userId = req.user.uid;
    const {
      accountNumber,
      bankCode,
      bankName,
      accountName
    } = req.body;

    // Validate required fields
    if (!accountNumber || !bankCode || !bankName) {
      return res.status(400).json({
        success: false,
        message: 'Account number, bank code, and bank name are required'
      });
    }

    // Get organiser document
    const organiserDoc = await db.collection('event_organisers').doc(userId).get();
    if (!organiserDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Organiser not found. Please complete step 1 first.'
      });
    }

    const organiserData = organiserDoc.data();

    // Verify bank account with Paystack
    let verificationResult;
    
    // Check if we're in development mode (skip real verification)
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.SKIP_BANK_VERIFICATION === 'true';
    
    if (isDevelopment) {
      console.log('Development mode: Skipping real bank verification');
      verificationResult = {
        status: true,
        data: {
          account_name: accountName || 'Test Account Name',
          account_number: accountNumber,
          bank_id: bankCode
        }
      };
    } else {
      try {
        verificationResult = await verifyBankAccount(accountNumber, bankCode);
        console.log('Bank verification result:', verificationResult);
        
        if (!verificationResult || !verificationResult.status) {
          return res.status(400).json({
            success: false,
            message: verificationResult?.message || 'Invalid bank account details. Please check your account number and bank selection.'
          });
        }
      } catch (error) {
        console.error('Error verifying bank account:', error);
        return res.status(400).json({
          success: false,
          message: 'Unable to verify bank account details. Please check your account number and bank selection, or try again later.'
        });
      }
    }

    // Create Paystack subaccount
    const subaccountData = {
      ...organiserData,
      accountNumber,
      bankCode,
      bankName,
      accountName: accountName || verificationResult.data?.account_name
    };

    let subaccountResult;
    
    if (isDevelopment) {
      console.log('Development mode: Skipping real subaccount creation');
      subaccountResult = {
        status: true,
        data: {
          subaccount_code: `ACCT_dev_${Date.now()}`,
          id: `dev_${Date.now()}`,
          business_name: subaccountData.businessName,
          account_number: accountNumber,
          bank_code: bankCode
        }
      };
    } else {
      try {
        subaccountResult = await createPaystackSubaccount(subaccountData);
        console.log('Subaccount creation result:', subaccountResult);
        
        if (!subaccountResult || !subaccountResult.status) {
          return res.status(400).json({
            success: false,
            message: subaccountResult?.message || 'Failed to create payment account. Please try again.'
          });
        }
      } catch (error) {
        console.error('Error creating Paystack subaccount:', error);
        return res.status(500).json({
          success: false,
          message: 'Unable to create payment account. Please try again later.'
        });
      }
    }

    // Update organiser document with banking details and subaccount info
    const resolvedAccountName = accountName || verificationResult.data?.account_name || 'Account Name Not Available';
    
    await organiserDoc.ref.update({
      accountNumber,
      bankCode,
      bankName,
      accountName: resolvedAccountName,
      paystackSubaccountCode: subaccountResult.data?.subaccount_code || null,
      paystackSubaccountId: subaccountResult.data?.id || null,
      registrationStep: 2,
      status: 'pending_verification',
      bankingDetailsAddedAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });

    // Update user status
    await db.collection('users').doc(userId).update({
      organiserStatus: 'pending_verification'
    });

    res.status(200).json({
      success: true,
      message: 'Banking details saved and payment account created successfully',
      data: {
        accountName: resolvedAccountName,
        subaccountCode: subaccountResult.data?.subaccount_code || null
      }
    });
  } catch (error) {
    console.error('Error in registerOrganiserStep2:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Step 3: Complete registration and verify account
 */
const registerOrganiserStep3 = async (req, res) => {
  try {
    const userId = req.user.uid;
    const {
      termsAccepted,
      privacyAccepted,
      marketingConsent = false
    } = req.body;

    // Validate required fields
    if (!termsAccepted || !privacyAccepted) {
      return res.status(400).json({
        success: false,
        message: 'Terms and privacy policy acceptance are required'
      });
    }

    // Get organiser document
    const organiserDoc = await db.collection('event_organisers').doc(userId).get();
    if (!organiserDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Organiser not found'
      });
    }

    const organiserData = organiserDoc.data();

    // Check if all steps are completed
    if (organiserData.registrationStep < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all previous steps first'
      });
    }

    // Complete registration
    await organiserDoc.ref.update({
      termsAccepted,
      privacyAccepted,
      marketingConsent,
      registrationStep: 3,
      status: 'active',
      registrationCompletedAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });

    // Update user status
    await db.collection('users').doc(userId).update({
      organiserStatus: 'active'
    });

    res.status(200).json({
      success: true,
      message: 'Payment collection registration completed successfully',
      data: {
        status: 'active',
        canCreatePaidEvents: true
      }
    });
  } catch (error) {
    console.error('Error in registerOrganiserStep3:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get organiser registration status
 */
const getOrganiserStatus = async (req, res) => {
  try {
    const userId = req.user.uid;

    const organiserDoc = await db.collection('event_organisers').doc(userId).get();
    if (!organiserDoc.exists) {
      return res.status(200).json({
        success: true,
        data: {
          isRegistered: false,
          status: 'not_registered',
          registrationStep: 0
        }
      });
    }

    const organiserData = organiserDoc.data();
    res.status(200).json({
      success: true,
      data: {
        isRegistered: true,
        status: organiserData.status,
        registrationStep: organiserData.registrationStep,
        businessName: organiserData.businessName,
        businessType: organiserData.businessType,
        canCreatePaidEvents: organiserData.status === 'active',
        createdAt: formatDate(organiserData.createdAt)
      }
    });
  } catch (error) {
    console.error('Error in getOrganiserStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get organiser profile information
 */
const getOrganiserProfile = async (req, res) => {
  try {
    const userId = req.user.uid;

    const organiserDoc = await db.collection('event_organisers').doc(userId).get();
    if (!organiserDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Organiser not found'
      });
    }

    const organiserData = organiserDoc.data();
    
    // Remove sensitive information from response
    const { paystackSubaccountCode, accountNumber, ...publicData } = organiserData;
    
    res.status(200).json({
      success: true,
      data: {
        ...publicData,
        createdAt: formatDate(organiserData.createdAt),
        updatedAt: formatDate(organiserData.updatedAt),
        bankingDetailsAddedAt: organiserData.bankingDetailsAddedAt ? formatDate(organiserData.bankingDetailsAddedAt) : null,
        registrationCompletedAt: organiserData.registrationCompletedAt ? formatDate(organiserData.registrationCompletedAt) : null
      }
    });
  } catch (error) {
    console.error('Error in getOrganiserProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Update organiser profile information
 */
const updateOrganiserProfile = async (req, res) => {
  try {
    const userId = req.user.uid;
    const updates = req.body;

    // Remove sensitive fields that shouldn't be updated via this endpoint
    const { paystackSubaccountCode, paystackSubaccountId, accountNumber, bankCode, ...allowedUpdates } = updates;

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    const organiserDoc = await db.collection('event_organisers').doc(userId).get();
    if (!organiserDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Organiser not found'
      });
    }

    await organiserDoc.ref.update({
      ...allowedUpdates,
      updatedAt: admin.firestore.Timestamp.now()
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error in updateOrganiserProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getSupportedBanks,
  registerOrganiserStep1,
  registerOrganiserStep2,
  registerOrganiserStep3,
  getOrganiserStatus,
  getOrganiserProfile,
  updateOrganiserProfile
}; 