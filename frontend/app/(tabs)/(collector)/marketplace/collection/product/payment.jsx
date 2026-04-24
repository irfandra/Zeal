
import React, { useEffect, useState } from 'react';
import {
  Alert,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRole } from '@/components/context/RoleContext';
import { useWallet } from '@/components/context/WalletContext';
import { authService } from '@/services/walletService';
import { orderService } from '@/services/orderService';
import { brandService } from '@/services/brandService';
import { rackService } from '@/services/rackService';

const PolDot = ({ size = 18 }) => (
  <View style={[styles.polDot, { width: size, height: size, borderRadius: size / 2 }]} />
);

const PLATFORM_FEE_RATE = 0.05;
const DELIVERY_FEE_DEFAULT = 500;

const parseParam = (value) => (Array.isArray(value) ? value[0] : value);
const isWalletAddress = (value) => /^0x[a-fA-F0-9]{40}$/.test(String(value || '').trim());

const isListingWindowOpen = (listingDeadline) => {
  if (!listingDeadline) {
    return true;
  }

  const deadlineMs = new Date(listingDeadline).getTime();
  if (!Number.isFinite(deadlineMs)) {
    return true;
  }

  return deadlineMs > Date.now();
};

function formatPol(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return String(value || '--');
  }

  const hasDecimals = Math.abs(numeric % 1) > 0;
  return numeric.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 6,
  });
}

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const PHONE_CODES = [
  { code: '+1', flag: 'US', label: 'US' },
  { code: '+44', flag: 'UK', label: 'UK' },
  { code: '+60', flag: 'MY', label: 'MY' },
  { code: '+62', flag: 'ID', label: 'ID' },
  { code: '+65', flag: 'SG', label: 'SG' },
  { code: '+66', flag: 'TH', label: 'TH' },
  { code: '+81', flag: 'JP', label: 'JP' },
  { code: '+82', flag: 'KR', label: 'KR' },
  { code: '+86', flag: 'CN', label: 'CN' },
  { code: '+91', flag: 'IN', label: 'IN' },
  { code: '+33', flag: 'FR', label: 'FR' },
  { code: '+49', flag: 'DE', label: 'DE' },
  { code: '+61', flag: 'AU', label: 'AU' },
  { code: '+971', flag: 'AE', label: 'AE' },
];

const COUNTRIES = [
  'Australia', 'Canada', 'China', 'France', 'Germany',
  'India', 'Indonesia', 'Japan', 'Malaysia', 'Singapore',
  'South Korea', 'Thailand', 'United Arab Emirates',
  'United Kingdom', 'United States',
];

const getCollectorFullName = (currentUser) => {
  const firstName = String(currentUser?.firstName || '').trim();
  const lastName = String(currentUser?.lastName || '').trim();
  return [firstName, lastName].filter(Boolean).join(' ').trim();
};

const mapPhoneFromProfile = (phoneNumber) => {
  const rawPhone = String(phoneNumber || '').trim();
  if (!rawPhone) {
    return {
      code: PHONE_CODES[4],
      number: '',
    };
  }

  const normalized = rawPhone.replace(/\s+/g, '');
  const sortedCodes = [...PHONE_CODES].sort((left, right) => right.code.length - left.code.length);
  const matchedCode = sortedCodes.find((entry) => normalized.startsWith(entry.code));
  const allDigits = normalized.replace(/[^0-9]/g, '');

  if (!matchedCode) {
    return {
      code: PHONE_CODES[4],
      number: allDigits,
    };
  }

  const codeDigits = matchedCode.code.replace('+', '');
  const number = allDigits.startsWith(codeDigits)
    ? allDigits.slice(codeDigits.length)
    : allDigits;

  return {
    code: matchedCode,
    number,
  };
};

const buildPhoneNumberForProfile = (codeValue, rawNumber) => {
  const countryCode = String(codeValue || '').trim();
  const numericOnly = String(rawNumber || '').replace(/[^0-9]/g, '');
  if (!numericOnly) {
    return '';
  }

  return `${countryCode}${numericOnly}`;
};

const buildShippingAddress = ({
  fullName,
  countryCode,
  phone,
  address,
  city,
  state,
  postalCode,
  country,
}) => {
  const lineOne = `${String(fullName || '').trim()} (${String(countryCode || '').trim()} ${String(phone || '').trim()})`;
  const lineTwo = String(address || '').trim();
  const lineThree = [String(city || '').trim(), String(state || '').trim(), String(postalCode || '').trim()]
    .filter(Boolean)
    .join(', ');
  const lineFour = String(country || '').trim();

  return [lineOne, lineTwo, lineThree, lineFour]
    .filter(Boolean)
    .join(' | ');
};

export default function PaymentPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentUser, setCurrentUser } = useRole();
  const { wallet, connectWallet, refreshWalletAccounts, sendPaymentTransaction } = useWallet();

  const itemId = parseParam(params.itemId);
  const edition = parseParam(params.edition);
  const total = parseParam(params.total);
  const price = parseParam(params.price);
  const name = parseParam(params.name);
  const image = parseParam(params.image);
  const collection = parseParam(params.collection);
  const productId = parseParam(params.productId) || parseParam(params.variantId);
  const brandId = parseParam(params.brandId);
  const status = parseParam(params.status);
  const listingDeadline = parseParam(params.listingDeadline);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCode, setSelectedCode] = useState(PHONE_CODES[4]);
  const [showCodePicker, setShowCodePicker] = useState(false);
  const [country, setCountry] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSavingProfilePhone, setIsSavingProfilePhone] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentErrorMessage, setPaymentErrorMessage] = useState('');
  const [paymentOrderNumber, setPaymentOrderNumber] = useState('');
  const [paymentTxHash, setPaymentTxHash] = useState('');
  const [paymentAmountPol, setPaymentAmountPol] = useState('');
  const [feeEstimate, setFeeEstimate] = useState(null);

  const hasProfilePhone = Boolean(String(currentUser?.phoneNumber || '').trim());
  const isPhoneEditable = !hasProfilePhone;

  useEffect(() => {
    const nextFullName = getCollectorFullName(currentUser);
    const nextPhone = mapPhoneFromProfile(currentUser?.phoneNumber);

    setFullName(nextFullName);
    setSelectedCode(nextPhone.code);
    setPhone(nextPhone.number);
  }, [currentUser]);

  useEffect(() => {
    let isActive = true;

    const loadFeeEstimate = async () => {
      const safeProductId = String(productId || '').trim();
      if (!safeProductId) {
        if (isActive) {
          setFeeEstimate(null);
        }
        return;
      }

      try {
        const estimate = await orderService.estimateCollectorOrderFees(safeProductId);
        if (!isActive || !estimate) {
          return;
        }

        setFeeEstimate({
          unitPrice: toFiniteNumber(estimate.unitPrice, NaN),
          platformFee: toFiniteNumber(estimate.platformFee, NaN),
          deliveryFee: toFiniteNumber(estimate.deliveryFee, NaN),
          transactionFee: toFiniteNumber(estimate.transactionFee, NaN),
          totalPrice: toFiniteNumber(estimate.totalPrice, NaN),
        });
      } catch {
        if (isActive) {
          setFeeEstimate(null);
        }
      }
    };

    loadFeeEstimate();

    return () => {
      isActive = false;
    };
  }, [productId]);

  const fallbackUnitPrice = parseFloat(String(price ?? '0').replace(/,/g, '').replace(/[^\d.]/g, '')) || 0;
  const unitPrice = Number.isFinite(feeEstimate?.unitPrice) ? feeEstimate.unitPrice : fallbackUnitPrice;
  const platformFee = Number.isFinite(feeEstimate?.platformFee)
    ? feeEstimate.platformFee
    : unitPrice * PLATFORM_FEE_RATE;
  const deliveryFee = Number.isFinite(feeEstimate?.deliveryFee)
    ? feeEstimate.deliveryFee
    : DELIVERY_FEE_DEFAULT;
  const transactionFee = Number.isFinite(feeEstimate?.transactionFee)
    ? feeEstimate.transactionFee
    : 0;
  const totalPrice = Number.isFinite(feeEstimate?.totalPrice)
    ? feeEstimate.totalPrice
    : unitPrice + platformFee + deliveryFee + transactionFee;
  const normalizedStatus = String(status || '').trim().toUpperCase();
  const isListedStatus = !normalizedStatus || normalizedStatus === 'LISTED';
  const isSaleWindowOpen = isListingWindowOpen(listingDeadline);

  const isFormValid =
    fullName.trim() &&
    phone.trim() &&
    country.trim() &&
    state.trim() &&
    city.trim() &&
    postalCode.trim() &&
    address.trim() &&
    confirmed &&
    isListedStatus &&
    isSaleWindowOpen &&
    !isSavingProfilePhone &&
    !isSubmittingPayment;

  const ensureWalletConnected = async () => {
    let activeWallet = wallet;
    if (!activeWallet?.address) {
      activeWallet = await connectWallet();
    }

    const safeAddress = String(activeWallet?.address || '').trim();
    if (!isWalletAddress(safeAddress)) {
      throw new Error('MetaMask wallet is not connected. Please connect your wallet first.');
    }

    await refreshWalletAccounts(safeAddress).catch(() => []);
    return safeAddress;
  };

  const getBrandWalletAddress = async () => {
    const parsedBrandId = Number(String(brandId || '').trim());
    if (!Number.isFinite(parsedBrandId)) {
      throw new Error('Brand information is missing for this product. Please reopen checkout and try again.');
    }

    const brandProfile = await brandService.getBrandById(parsedBrandId);
    const walletAddress = String(brandProfile?.companyWalletAddress || '').trim();

    if (!isWalletAddress(walletAddress)) {
      throw new Error('Brand wallet is not configured. Please contact support.');
    }

    return walletAddress;
  };

  const confirmPaymentWithRetry = async (orderId, txHash) => {
    let lastError = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await orderService.confirmCollectorOrderPayment(orderId, txHash);
      } catch (error) {
        lastError = error;
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
      }
    }

    throw lastError;
  };

  const handleConfirm = async () => {
    if (!isListedStatus) {
      Alert.alert('Not Available Yet', 'This product is pre-minted but not listed yet, so it cannot be bought.');
      return;
    }

    if (!isSaleWindowOpen) {
      Alert.alert('Sale Ended', 'This collection sale window has ended, so this product can no longer be purchased.');
      return;
    }

    const newErrors = {};
    if (!fullName.trim()) newErrors.fullName = 'Required';
    if (!phone.trim()) newErrors.phone = 'Required';
    if (!country.trim()) newErrors.country = 'Required';
    if (!state.trim()) newErrors.state = 'Required';
    if (!city.trim()) newErrors.city = 'Required';
    if (!postalCode.trim()) newErrors.postalCode = 'Required';
    if (!address.trim()) newErrors.address = 'Required';
    if (!confirmed) newErrors.confirmed = 'Required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    let createdOrder = null;
    let submittedTxHash = '';

    try {
      setIsSubmittingPayment(true);
      setErrors({});
      setPaymentErrorMessage('');
      setPaymentOrderNumber('');
      setPaymentTxHash('');
      setPaymentAmountPol('');

      if (isPhoneEditable) {
        setIsSavingProfilePhone(true);
        const nextPhone = buildPhoneNumberForProfile(selectedCode.code, phone);
        const updatedProfile = await authService.updateCurrentUserProfile({
          firstName: String(currentUser?.firstName || '').trim() || undefined,
          lastName: String(currentUser?.lastName || '').trim() || undefined,
          phoneNumber: nextPhone,
        });
        await setCurrentUser(updatedProfile);
        setIsSavingProfilePhone(false);
      }

      if (!String(productId || '').trim()) {
        throw new Error('Product ID is missing. Please reopen checkout and try again.');
      }

      const buyerWalletAddress = await ensureWalletConnected();
      const recipientWalletAddress = await getBrandWalletAddress();
      const shippingAddress = buildShippingAddress({
        fullName,
        countryCode: selectedCode.code,
        phone,
        address,
        city,
        state,
        postalCode,
        country,
      });

      createdOrder = await orderService.createCollectorOrder(productId, {
        buyerWallet: buyerWalletAddress,
        shippingAddress,
      });

      const orderAmountPol = String(createdOrder?.totalPrice || '').trim();
      if (!orderAmountPol) {
        throw new Error('Order amount is missing from server response.');
      }

      const txResult = await sendPaymentTransaction({
        fromAddress: buyerWalletAddress,
        toAddress: recipientWalletAddress,
        amountPol: orderAmountPol,
      });

      submittedTxHash = String(txResult?.txHash || '').trim();
      if (!submittedTxHash) {
        throw new Error('MetaMask did not return a transaction hash.');
      }

      const confirmedOrder = await confirmPaymentWithRetry(createdOrder.id, submittedTxHash);

      rackService.clearRackCache();
      setPaymentOrderNumber(String(confirmedOrder?.orderNumber || createdOrder?.orderNumber || '').trim());
      setPaymentTxHash(submittedTxHash);
      setPaymentAmountPol(String(confirmedOrder?.totalPrice || createdOrder?.totalPrice || '').trim());
      setModalType('success');
    } catch (error) {
      if (createdOrder?.id && !submittedTxHash) {
        await orderService
          .cancelCollectorOrder(createdOrder.id, 'Collector cancelled payment before blockchain confirmation.')
          .catch(() => null);
      }

      let nextMessage = error?.message || 'Payment failed. Please try again.';
      const lowerMessage = String(nextMessage).toLowerCase();

      if (
        lowerMessage.includes('user rejected') ||
        lowerMessage.includes('rejected the request') ||
        lowerMessage.includes('denied transaction')
      ) {
        nextMessage = 'Transaction was rejected in MetaMask. No payment was deducted.';
      }

      if (createdOrder?.id && submittedTxHash) {
        nextMessage = `Payment was sent on-chain (${submittedTxHash}) but the app failed to confirm it on server. Please contact support with this transaction hash.`;
      }

      setPaymentErrorMessage(nextMessage);
      setModalType('failed');
      Alert.alert('Payment Error', nextMessage);
    } finally {
      setIsSavingProfilePhone(false);
      setIsSubmittingPayment(false);
    }
  };

  const handleGoToRack = () => {
    setModalType(null);
    rackService.clearRackCache();
    router.dismissAll();
    router.replace('/(tabs)/(collector)/rack');
  };

  const handleGoToMarketplace = () => {
    setModalType(null);
    router.dismissAll();
    router.replace('/(tabs)/(collector)/marketplace');
  };

  const handleRetry = () => {
    setPaymentErrorMessage('');
    setModalType(null);
  };

  const inputStyle = (field) => [
    styles.formInput,
    errors[field] && styles.formInputError,
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color="#111" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.pageTitle}>Your Order</Text>

        <View style={styles.itemCard}>
          <Text style={styles.itemCardLabel}>Items</Text>
          <View style={styles.itemCardRow}>
            <Image source={{ uri: image }} style={styles.itemThumb} resizeMode="cover" />
            <View style={styles.itemCardInfo}>
              <View style={styles.itemNameRow}>
                <Text style={styles.itemName}>{name}</Text>
                <Text style={styles.itemIdBadge}>{itemId}</Text>
              </View>
              <Text style={styles.itemCollection}>{collection}</Text>
              <Text style={styles.itemEdition}>
                Edition {edition} of {total} Items in Collection
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recepient Details</Text>

        <View style={styles.formField}>
          <TextInput
            style={[inputStyle('fullName'), styles.formInputReadonly]}
            value={fullName}
            editable={false}
            selectTextOnFocus={false}
            placeholder="Full Name *"
            placeholderTextColor="#bbb"
          />
          {errors.fullName && <Text style={styles.errorText}>Full name is missing in collector profile</Text>}
          <Text style={styles.readonlyHint}>Synced from collector profile</Text>
        </View>

        <View style={styles.formField}>
          <View
            style={[
              styles.phoneRow,
              errors.phone && styles.phoneRowError,
              !isPhoneEditable && styles.phoneRowReadonly,
            ]}
          >
            <TouchableOpacity
              style={[styles.codePickerBtn, !isPhoneEditable && styles.codePickerBtnReadonly]}
              disabled={!isPhoneEditable}
              onPress={() => setShowCodePicker(true)}
            >
              <Text style={styles.codePickerText}>{selectedCode.flag} {selectedCode.code}</Text>
              <Ionicons name="chevron-down" size={14} color="#888" />
            </TouchableOpacity>
            <TextInput
              style={[styles.phoneInput, !isPhoneEditable && styles.phoneInputReadonly]}
              value={phone}
              editable={isPhoneEditable}
              selectTextOnFocus={isPhoneEditable}
              onChangeText={(value) => {
                const numericOnly = value.replace(/[^0-9]/g, '');
                setPhone(numericOnly);
                setErrors((previous) => ({ ...previous, phone: null }));
              }}
              placeholder="Phone Number *"
              placeholderTextColor="#bbb"
              keyboardType="number-pad"
            />
          </View>
          {errors.phone && (
            <Text style={styles.errorText}>
              {hasProfilePhone ? 'Phone number is missing in collector profile' : 'Phone number is required'}
            </Text>
          )}
          <Text style={styles.readonlyHint}>
            {hasProfilePhone
              ? 'Synced from collector profile'
              : 'Add your phone number here to save it to your profile'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Location</Text>

        <View style={styles.formField}>
          <TouchableOpacity
            style={[styles.dropdownBtn, errors.country && styles.formInputError]}
            onPress={() => {
              setShowCountryPicker(true);
              setErrors((previous) => ({ ...previous, country: null }));
            }}
          >
            <Text style={[styles.dropdownText, !country && styles.dropdownPlaceholder]}>
              {country || 'Country *'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#888" />
          </TouchableOpacity>
          {errors.country && <Text style={styles.errorText}>Country is required</Text>}
        </View>

        <View style={styles.formField}>
          <TextInput
            style={inputStyle('state')}
            value={state}
            onChangeText={(value) => {
              setState(value);
              setErrors((previous) => ({ ...previous, state: null }));
            }}
            placeholder="State / Province *"
            placeholderTextColor="#bbb"
          />
          {errors.state && <Text style={styles.errorText}>State is required</Text>}
        </View>

        <View style={styles.formField}>
          <TextInput
            style={inputStyle('city')}
            value={city}
            onChangeText={(value) => {
              setCity(value);
              setErrors((previous) => ({ ...previous, city: null }));
            }}
            placeholder="City *"
            placeholderTextColor="#bbb"
          />
          {errors.city && <Text style={styles.errorText}>City is required</Text>}
        </View>

        <View style={styles.formField}>
          <TextInput
            style={inputStyle('postalCode')}
            value={postalCode}
            onChangeText={(value) => {
              const numericOnly = value.replace(/[^0-9]/g, '');
              setPostalCode(numericOnly);
              setErrors((previous) => ({ ...previous, postalCode: null }));
            }}
            placeholder="Postal Code *"
            placeholderTextColor="#bbb"
            keyboardType="number-pad"
          />
          {errors.postalCode && <Text style={styles.errorText}>Postal code is required</Text>}
        </View>

        <View style={styles.formField}>
          <TextInput
            style={[inputStyle('address'), styles.formInputMulti]}
            value={address}
            onChangeText={(value) => {
              setAddress(value);
              setErrors((previous) => ({ ...previous, address: null }));
            }}
            placeholder="Complete Address *"
            placeholderTextColor="#bbb"
            multiline
            numberOfLines={4}
          />
          {errors.address && <Text style={styles.errorText}>Address is required</Text>}
        </View>

        <TouchableOpacity
          style={styles.confirmRow}
          onPress={() => {
            setConfirmed(!confirmed);
            setErrors((previous) => ({ ...previous, confirmed: null }));
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, confirmed && styles.checkboxActive, errors.confirmed && styles.checkboxError]}>
            {confirmed && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.confirmText}>
              Confirming the address is correct, Wrong address will result in item lost with your own guarantee
            </Text>
            {errors.confirmed && <Text style={styles.errorText}>Please confirm your address</Text>}
          </View>
        </TouchableOpacity>

        <View style={styles.priceCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Price</Text>
            <View style={styles.priceValueRow}>
              <PolDot size={18} />
              <Text style={styles.totalValue}> POL  {formatPol(totalPrice)}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <PriceRow label="Platform Fee (5%)" value={formatPol(platformFee)} />
          <PriceRow label="Delivery Fee" value={formatPol(deliveryFee)} />
          <PriceRow label="Transaction Fee (Network)" value={formatPol(transactionFee)} />
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <TouchableOpacity
        style={[styles.bottomBar, !isFormValid && styles.bottomBarDisabled]}
        onPress={isFormValid ? handleConfirm : null}
        activeOpacity={isFormValid ? 0.85 : 1}
      >
        <Text style={styles.bottomBarTitle}>
          {isSubmittingPayment
            ? 'Processing Payment...'
            : isSavingProfilePhone
              ? 'Saving Profile...'
              : isListedStatus && isSaleWindowOpen
                ? 'Confirm Payment'
                : isListedStatus
                  ? 'Sale Ended'
                  : 'Not Available Yet'}
        </Text>
        <View style={styles.bottomBarRight}>
          <PolDot size={22} />
          <Text style={styles.bottomBarPolText}> POL  {formatPol(totalPrice)}</Text>
        </View>
      </TouchableOpacity>

      <Modal visible={showCodePicker} transparent animationType="slide" onRequestClose={() => setShowCodePicker(false)}>
        <View style={styles.pickerBackdrop}>
          <TouchableOpacity style={styles.pickerDismiss} onPress={() => setShowCodePicker(false)} />
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Phone Code</Text>
            <ScrollView>
              {PHONE_CODES.map((item) => (
                <TouchableOpacity
                  key={item.code}
                  style={[styles.pickerItem, selectedCode.code === item.code && styles.pickerItemActive]}
                  onPress={() => {
                    setSelectedCode(item);
                    setShowCodePicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item.flag}  {item.label}  {item.code}</Text>
                  {selectedCode.code === item.code && <Ionicons name="checkmark" size={18} color="#111" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showCountryPicker} transparent animationType="slide" onRequestClose={() => setShowCountryPicker(false)}>
        <View style={styles.pickerBackdrop}>
          <TouchableOpacity style={styles.pickerDismiss} onPress={() => setShowCountryPicker(false)} />
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Select Country</Text>
            <ScrollView>
              {COUNTRIES.map((countryName) => (
                <TouchableOpacity
                  key={countryName}
                  style={[styles.pickerItem, country === countryName && styles.pickerItemActive]}
                  onPress={() => {
                    setCountry(countryName);
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{countryName}</Text>
                  {country === countryName && <Ionicons name="checkmark" size={18} color="#111" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={modalType === 'success'} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIcon, { backgroundColor: '#22C55E' }]}>
              <Ionicons name="checkmark" size={36} color="#fff" />
            </View>
            <Text style={styles.modalTitle}>Payment Successful!</Text>
            <Text style={styles.modalSubtitle}>
              Your order for <Text style={styles.modalBold}>{name}</Text> ({itemId}) has been confirmed.
            </Text>
            <View style={styles.modalSummary}>
              <View style={styles.modalSummaryRow}>
                <Text style={styles.modalSummaryLabel}>Item</Text>
                <Text style={styles.modalSummaryValue} numberOfLines={1}>{name}</Text>
              </View>
              <View style={styles.modalSummaryRow}>
                <Text style={styles.modalSummaryLabel}>Edition</Text>
                <Text style={styles.modalSummaryValue}>{edition} of {total}</Text>
              </View>
              {!!paymentOrderNumber && (
                <View style={styles.modalSummaryRow}>
                  <Text style={styles.modalSummaryLabel}>Order #</Text>
                  <Text style={styles.modalSummaryValue}>{paymentOrderNumber}</Text>
                </View>
              )}
              {!!paymentTxHash && (
                <View style={styles.modalSummaryRow}>
                  <Text style={styles.modalSummaryLabel}>Tx Hash</Text>
                  <Text style={styles.modalSummaryValue} numberOfLines={1}>{paymentTxHash}</Text>
                </View>
              )}
              <View style={styles.modalSummaryRow}>
                <Text style={styles.modalSummaryLabel}>Total Paid</Text>
                <View style={styles.modalPriceRow}>
                  <PolDot size={14} />
                  <Text style={styles.modalSummaryValue}> POL {formatPol(paymentAmountPol || totalPrice)}</Text>
                </View>
              </View>
            </View>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnOutline]} onPress={handleGoToMarketplace}>
                <Text style={styles.modalBtnOutlineText}>Marketplace</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtn} onPress={handleGoToRack}>
                <Text style={styles.modalBtnText}>Your Rack</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalType === 'failed'} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIcon, { backgroundColor: '#E74C3C' }]}>
              <Ionicons name="close" size={36} color="#fff" />
            </View>
            <Text style={styles.modalTitle}>Payment Failed</Text>
            <Text style={styles.modalSubtitle}>
              {paymentErrorMessage || 'Something went wrong while processing your payment. Please try again.'}
            </Text>
            <View style={styles.modalSummary}>
              <View style={styles.modalSummaryRow}>
                <Text style={styles.modalSummaryLabel}>Item</Text>
                <Text style={styles.modalSummaryValue} numberOfLines={1}>{name}</Text>
              </View>
              <View style={styles.modalSummaryRow}>
                <Text style={styles.modalSummaryLabel}>Amount</Text>
                <View style={styles.modalPriceRow}>
                  <PolDot size={14} />
                  <Text style={styles.modalSummaryValue}> POL {formatPol(totalPrice)}</Text>
                </View>
              </View>
            </View>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnOutline]} onPress={handleGoToMarketplace}>
                <Text style={styles.modalBtnOutlineText}>Marketplace</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#E74C3C' }]} onPress={handleRetry}>
                <Text style={styles.modalBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const PriceRow = ({ label, value }) => (
  <View style={styles.priceRow}>
    <Text style={styles.priceRowLabel}>{label}</Text>
    <View style={styles.priceValueRow}>
      <PolDot size={14} />
      <Text style={styles.priceRowValue}> POL  {value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { paddingBottom: 0 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8, gap: 4,
  },
  backText: { fontSize: 16, fontWeight: '600', color: '#111' },
  pageTitle: {
    fontSize: 26, fontWeight: '900', color: '#111',
    paddingHorizontal: 16, marginBottom: 16,
  },
  itemCard: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16,
    padding: 14, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  itemCardLabel: { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 10 },
  itemCardRow: { flexDirection: 'row', gap: 12 },
  itemThumb: { width: 72, height: 72, borderRadius: 10 },
  itemCardInfo: { flex: 1, gap: 3 },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  itemName: { fontSize: 15, fontWeight: '800', color: '#111' },
  itemIdBadge: { fontSize: 12, fontWeight: '600', color: '#888' },
  itemCollection: { fontSize: 12, color: '#555', fontWeight: '500' },
  itemEdition: { fontSize: 11, color: '#aaa', fontStyle: 'italic' },
  sectionTitle: {
    fontSize: 16, fontWeight: '800', color: '#111',
    paddingHorizontal: 16, marginBottom: 10,
  },
  formField: { paddingHorizontal: 16, marginBottom: 12 },
  formInput: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    borderColor: '#e8e8e8', paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 14, color: '#111',
  },
  formInputReadonly: {
    backgroundColor: '#f3f4f6',
    color: '#666',
  },
  formInputError: { borderColor: '#E74C3C' },
  formInputMulti: { height: 100, textAlignVertical: 'top', paddingTop: 14 },
  errorText: { fontSize: 11, color: '#E74C3C', marginTop: 4, marginLeft: 4 },
  readonlyHint: { fontSize: 11, color: '#888', marginTop: 4, marginLeft: 4 },
  phoneRow: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e8e8e8', overflow: 'hidden',
  },
  phoneRowReadonly: {
    backgroundColor: '#f3f4f6',
  },
  phoneRowError: { borderColor: '#E74C3C' },
  codePickerBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    paddingVertical: 14, gap: 6, borderRightWidth: 1, borderRightColor: '#e8e8e8',
  },
  codePickerBtnReadonly: {
    backgroundColor: '#f3f4f6',
  },
  codePickerText: { fontSize: 14, color: '#111', fontWeight: '600' },
  phoneInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 14, color: '#111' },
  phoneInputReadonly: {
    color: '#666',
  },
  dropdownBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    borderColor: '#e8e8e8', paddingHorizontal: 16, paddingVertical: 14,
  },
  dropdownText: { fontSize: 14, color: '#111' },
  dropdownPlaceholder: { color: '#bbb' },
  confirmRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, gap: 12, marginTop: 4, marginBottom: 20,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    borderColor: '#ddd', backgroundColor: '#f5f5f5',
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxActive: { backgroundColor: '#111', borderColor: '#111' },
  checkboxError: { borderColor: '#E74C3C' },
  confirmText: { fontSize: 12, color: '#555', lineHeight: 18 },
  priceCard: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16,
    padding: 16, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { fontSize: 15, fontWeight: '800', color: '#111' },
  totalValue: { fontSize: 15, fontWeight: '800', color: '#111' },
  divider: { height: 1, backgroundColor: '#f0f0f0' },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceRowLabel: { fontSize: 13, color: '#555', fontWeight: '500' },
  priceValueRow: { flexDirection: 'row', alignItems: 'center' },
  priceRowValue: { fontSize: 13, fontWeight: '600', color: '#111' },
  polDot: { backgroundColor: '#7B3FE4' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#111', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20,
    paddingTop: 14, paddingBottom: 34,
  },
  bottomBarDisabled: { backgroundColor: '#555' },
  bottomBarTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  bottomBarRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bottomBarPolText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerDismiss: { flex: 1 },
  pickerSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingBottom: 40, maxHeight: '60%',
  },
  pickerHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd',
    alignSelf: 'center', marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 16, fontWeight: '800', color: '#111',
    paddingHorizontal: 20, marginBottom: 8,
  },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  pickerItemActive: { backgroundColor: '#f9f9f9' },
  pickerItemText: { fontSize: 15, color: '#111' },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 28,
    width: '100%', alignItems: 'center', gap: 12,
  },
  modalIcon: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#111' },
  modalSubtitle: { fontSize: 13, color: '#555', textAlign: 'center', lineHeight: 20 },
  modalBold: { fontWeight: '700', color: '#111' },
  modalSummary: {
    width: '100%', backgroundColor: '#f7f7f7', borderRadius: 14,
    padding: 14, gap: 10, marginTop: 4,
  },
  modalSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalSummaryLabel: { fontSize: 12, color: '#888', fontWeight: '600' },
  modalSummaryValue: { fontSize: 13, fontWeight: '700', color: '#111', maxWidth: '65%' },
  modalPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modalBtnRow: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  modalBtn: {
    flex: 1, backgroundColor: '#111', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  modalBtnOutline: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ddd' },
  modalBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  modalBtnOutlineText: { color: '#111', fontSize: 14, fontWeight: '800' },
});