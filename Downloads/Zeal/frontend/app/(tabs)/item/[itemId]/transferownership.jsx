
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Modal,
  Alert,
  ActionSheetIOS,
  Platform,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Camera } from 'expo-camera';
import { transferService } from '@/services/transferService';
import { useRole } from '@/components/context/RoleContext';
import { getCurrentUser } from '@/services/store/userStore';
import { rackService } from '@/services/rackService';

const PolDot = ({ size = 16 }) => (
  <View style={[styles.polDot, { width: size, height: size, borderRadius: size / 2 }]} />
);

const ItemMiniCard = ({ item }) => (
  <View style={styles.itemCard}>
    <Image source={{ uri: item.image }} style={styles.itemCardImage} resizeMode="cover" />
    <View style={styles.itemCardOverlay} />
    <View style={styles.itemCardTop}>
      <View style={styles.brandRow}>
        <Image source={{ uri: item.brandLogo }} style={styles.brandLogo} resizeMode="contain" />
        <Text style={styles.brandName}>{item.brand}</Text>
      </View>
      <View style={[styles.tagBadge, { backgroundColor: item.tagColor }]}>
        <Text style={styles.tagText}>{item.tag}</Text>
      </View>
    </View>
    <View style={styles.itemCardBottom}>
      <Text style={styles.itemIdText}>{item.id}</Text>
      <Text style={styles.itemName}>{item.name}</Text>
      <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
      <View style={styles.priceBox}>
        <Text style={styles.priceLabel}>Value</Text>
        <View style={styles.priceRow}>
          <PolDot size={14} />
          <Text style={styles.priceMain}> {item.price}</Text>
          <Text style={styles.priceUsd}> {item.usd}</Text>
        </View>
      </View>
    </View>
  </View>
);

const toSafeText = (value, fallback) => {
  const normalized = String(value || '').trim();
  return normalized || fallback;
};

const formatRackItemTitle = (item) => {
  const id = toSafeText(item?.id, '#ITEM');
  const name = toSafeText(item?.name, 'Owned Item');
  return `${id} · ${name}`;
};

const isWalletAddress = (value) => /^0x[a-fA-F0-9]{40}$/.test(String(value || '').trim());

const normalizeWalletValue = (value) => String(value || '').trim().toLowerCase();

const formatWalletCompact = (value) => {
  const normalized = String(value || '').trim();
  if (!isWalletAddress(normalized)) return normalized || '--';
  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
};

const formatRecipientLabel = (value) => {
  const safeValue = String(value || '').trim();
  if (!safeValue) return 'Unknown';

  if (isWalletAddress(safeValue)) {
    return `${safeValue.slice(0, 6)}...${safeValue.slice(-4)}`;
  }

  return safeValue.startsWith('@') ? safeValue : `@${safeValue}`;
};

const getRecipientPrimaryLabel = (recipient) => {
  const displayName = String(recipient?.displayName || '').trim();
  if (displayName) return displayName;

  const userName = String(recipient?.userName || '').trim();
  if (userName) {
    return userName.startsWith('@') ? userName : `@${userName}`;
  }

  return formatWalletCompact(recipient?.walletAddress);
};

const getRecipientSecondaryLabel = (recipient) => {
  const userName = String(recipient?.userName || '').trim();
  const wallet = formatWalletCompact(recipient?.walletAddress);
  if (!userName) return wallet;

  const userNameLabel = userName.startsWith('@') ? userName : `@${userName}`;
  return `${userNameLabel} • ${wallet}`;
};

const FALLBACK_REQUEST_IMAGE = 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=60';

const formatRequestDate = (value) => {
  const timestamp = Date.parse(String(value || ''));
  if (Number.isNaN(timestamp)) return '--';
  return new Date(timestamp).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatRequestTime = (value) => {
  const timestamp = Date.parse(String(value || ''));
  if (Number.isNaN(timestamp)) return '--';
  return new Date(timestamp).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toRequestCardItem = (request) => {
  if (!request) return null;

  const serial = toSafeText(request.itemSerial, `ITEM-${request.itemId || 'UNKNOWN'}`);
  const displayId = serial.startsWith('#') ? serial : `#${serial}`;

  const productImageUrl = String(request.productImageUrl || '').trim();
  const brandLogoUrl = String(request.brandLogoUrl || '').trim();
  const resolvedCardImage = productImageUrl || FALLBACK_REQUEST_IMAGE;
  const resolvedBrandLogo = brandLogoUrl || productImageUrl || FALLBACK_REQUEST_IMAGE;

  return {
    id: displayId,
    name: toSafeText(request.productName, 'Owned Item'),
    subtitle: toSafeText(request.brandName, 'Digital Seal Item'),
    tag: 'Transfer',
    tagColor: '#2F80ED',
    price: `Token #${toSafeText(request.tokenId, '--')}`,
    usd: '',
    brandLogo: resolvedBrandLogo,
    brand: toSafeText(request.brandName, 'Brand'),
    image: resolvedCardImage,
    nftQR: String(request.nftQrCode || '').trim(),
    labelQR: String(request.productLabelQrCode || '').trim(),
    certificateQR: String(request.certificateQrCode || '').trim(),
    backendItemId: Number.isFinite(Number(request.itemId)) ? Number(request.itemId) : null,
  };
};

export default function TransferOwnershipPage() {
  const router = useRouter();
  const { itemId } = useLocalSearchParams();
  const { currentUser: authUser } = useRole();

  const currentUser = React.useMemo(() => {
    const explicitUserName = String(authUser?.userName || authUser?.username || '').trim();
    if (explicitUserName) {
      return explicitUserName;
    }

    const emailLocalPart = String(authUser?.email || '').trim().split('@')[0];
    if (emailLocalPart) {
      return emailLocalPart;
    }

    return getCurrentUser();
  }, [authUser?.email, authUser?.userName, authUser?.username]);

  const routeItemId = React.useMemo(
    () => decodeURIComponent(String(itemId || '')),
    [itemId]
  );

  const [ownedItems, setOwnedItems] = useState([]);
  const [ownedItemsLoading, setOwnedItemsLoading] = useState(false);
  const [selectedOwnedItemId, setSelectedOwnedItemId] = useState('');
  const [showRackPicker, setShowRackPicker] = useState(false);

  const loadOwnedClaimedItems = useCallback(async (forceRefresh = false) => {
    setOwnedItemsLoading(true);
    try {
      const claimedRackItems = await rackService.getCollectorClaimedRackItems({ forceRefresh });
      setOwnedItems(Array.isArray(claimedRackItems) ? claimedRackItems : []);
    } catch {
      setOwnedItems([]);
    } finally {
      setOwnedItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ownedItems.length === 0) {
      setSelectedOwnedItemId('');
      return;
    }

    const normalizedRouteItemId = String(routeItemId || '');
    const hasRouteInOwned = !!normalizedRouteItemId
      && ownedItems.some((item) => String(item?.id || '') === normalizedRouteItemId);
    const defaultItemId = hasRouteInOwned ? normalizedRouteItemId : ownedItems[0].id;

    setSelectedOwnedItemId((previous) => {
      if (previous && ownedItems.some((item) => item.id === previous)) {
        return previous;
      }
      return defaultItemId;
    });
  }, [ownedItems, routeItemId]);

  const selectedOwnedItem = React.useMemo(() => {
    if (!selectedOwnedItemId) return null;
    return ownedItems.find((item) => item.id === selectedOwnedItemId) ?? null;
  }, [ownedItems, selectedOwnedItemId]);

  const routeItem = React.useMemo(() => {
    return ownedItems.find((item) => String(item?.id || '') === String(routeItemId || '')) ?? null;
  }, [ownedItems, routeItemId]);

  const currentItem = selectedOwnedItem ?? routeItem ?? ownedItems[0] ?? null;

  const tabs = ['Send', 'Approval List'];
  const [activeTab,   setActiveTab]   = useState('Send');
  const [requests,    setRequests]    = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);

  const [showApproveProof, setShowApproveProof] = useState(false);
  const [approveNftScanned, setApproveNftScanned] = useState(false);
  const [approveLabelScanned, setApproveLabelScanned] = useState(false);
  const [approveCertScanned, setApproveCertScanned] = useState(false);

  const [manualInputVisible, setManualInputVisible] = useState(false);
  const [manualInputType, setManualInputType] = useState('nft');
  const [manualInputMode, setManualInputMode] = useState('receive');
  const [manualInputValue, setManualInputValue] = useState('');

  const [nftScanned,     setNftScanned]     = useState(false);
  const [labelScanned,   setLabelScanned]   = useState(false);
  const [certScanned,    setCertScanned]    = useState(false);
  const [receiveSuccess, setReceiveSuccess] = useState(false);
  const [transferRecipients, setTransferRecipients] = useState([]);
  const [transferRecipientsLoading, setTransferRecipientsLoading] = useState(false);
  const [transferRecipientsError, setTransferRecipientsError] = useState('');
  const [selectedRecipientWallet, setSelectedRecipientWallet] = useState('');
  const [showRecipientPicker, setShowRecipientPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [latestSentRecipientLabel, setLatestSentRecipientLabel] = useState('');

  const loadIncomingRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const incomingRequests = await transferService.getIncomingTransferRequests();
      setRequests(Array.isArray(incomingRequests) ? incomingRequests : []);
    } catch {
      setRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  const loadTransferRecipients = useCallback(async () => {
    setTransferRecipientsLoading(true);
    setTransferRecipientsError('');
    try {
      const recipientUsers = await transferService.getTransferRecipients();
      const safeRecipients = Array.isArray(recipientUsers)
        ? recipientUsers
            .filter((recipient) => isWalletAddress(recipient?.walletAddress))
            .map((recipient) => ({
              ...recipient,
              walletAddress: normalizeWalletValue(recipient?.walletAddress),
            }))
        : [];

      setTransferRecipients(safeRecipients);
      if (Array.isArray(recipientUsers) && recipientUsers.length > 0 && safeRecipients.length === 0) {
        setTransferRecipientsError('Users were found, but wallet address format is invalid. Expected 0x + 40 hex characters.');
      }
      setSelectedRecipientWallet((previous) => {
        if (!previous) return '';
        const stillExists = safeRecipients.some(
          (recipient) => normalizeWalletValue(recipient.walletAddress) === normalizeWalletValue(previous)
        );
        return stillExists ? previous : '';
      });
    } catch (error) {
      setTransferRecipients([]);
      setSelectedRecipientWallet('');
      setTransferRecipientsError(error?.message || 'Failed to load recipient users. Pull to refresh and try again.');
    } finally {
      setTransferRecipientsLoading(false);
    }
  }, []);

  const resetSendProofState = useCallback(() => {
    setNftScanned(false);
    setLabelScanned(false);
    setCertScanned(false);
  }, []);

  const resetApproveProofState = useCallback(() => {
    setApproveNftScanned(false);
    setApproveLabelScanned(false);
    setApproveCertScanned(false);
  }, []);

  const selectedRecipient = React.useMemo(() => {
    const normalizedSelectedWallet = normalizeWalletValue(selectedRecipientWallet);
    if (!normalizedSelectedWallet) return null;

    return transferRecipients.find(
      (recipient) => normalizeWalletValue(recipient.walletAddress) === normalizedSelectedWallet
    ) ?? null;
  }, [selectedRecipientWallet, transferRecipients]);

  const selectedRecipientLabel = React.useMemo(
    () => (selectedRecipient ? getRecipientPrimaryLabel(selectedRecipient) : ''),
    [selectedRecipient]
  );

  const canReceive = !!currentItem && (nftScanned || !!selectedOwnedItemId) && labelScanned && certScanned;
  const normalizedRecipientWallet = normalizeWalletValue(selectedRecipient?.walletAddress);
  const isRecipientWalletValid = isWalletAddress(normalizedRecipientWallet);
  const canSendRequest = canReceive && !!selectedRecipient && isRecipientWalletValid;
  const canApproveRequest = approveNftScanned && approveLabelScanned && approveCertScanned;

  const approveItem = React.useMemo(() => {
    if (selectedReq) {
      return toRequestCardItem(selectedReq);
    }
    return currentItem;
  }, [selectedReq, currentItem]);

  useFocusEffect(
    useCallback(() => {
      loadOwnedClaimedItems(true);
      loadIncomingRequests();
      loadTransferRecipients();
    }, [loadOwnedClaimedItems, loadIncomingRequests, loadTransferRecipients])
  );

  useEffect(() => {
    if (activeTab === 'Approval List') {
      loadIncomingRequests();
      resetSendProofState();
      setShowRackPicker(false);
      return;
    }

    setShowApprove(false);
    setShowApproveProof(false);
    setSelectedReq(null);
    resetApproveProofState();
  }, [activeTab, loadIncomingRequests, resetApproveProofState, resetSendProofState]);

  useEffect(() => {
    if (!selectedOwnedItemId) {
      resetSendProofState();
      return;
    }

    setNftScanned(true);
    setLabelScanned(false);
    setCertScanned(false);
  }, [selectedOwnedItemId, resetSendProofState]);

  const handlePullToRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadOwnedClaimedItems(true),
        loadIncomingRequests(),
        loadTransferRecipients(),
      ]);
      resetSendProofState();
      resetApproveProofState();
      setShowApprove(false);
      setShowApproveProof(false);
      setSelectedReq(null);
    } finally {
      setRefreshing(false);
    }
  }, [
    loadOwnedClaimedItems,
    loadIncomingRequests,
    loadTransferRecipients,
    resetApproveProofState,
    resetSendProofState,
  ]);

  const handleApprove = (req) => {
    setSelectedReq(req);
    resetApproveProofState();
    setShowApproveProof(true);
  };

  const handleConfirmApprove = async () => {
    if (!selectedReq?.id) return;

    try {
      await transferService.approveTransferRequest(selectedReq.id);
      await Promise.all([
        loadIncomingRequests(),
        loadOwnedClaimedItems(true),
      ]);
      setShowApprove(false);
      setShowApproveProof(false);
      setShowSuccess(true);
    } catch (error) {
      Alert.alert('Approve Failed', error?.message || 'Unable to approve this transfer request.');
    }
  };

  const handleReject = (reqId) => {
    Alert.alert(
      'Reject Transfer',
      'Are you sure you want to reject this transfer request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            transferService
              .rejectTransferRequest(reqId)
              .then(() => loadIncomingRequests())
              .catch((error) => {
                Alert.alert('Reject Failed', error?.message || 'Unable to reject this transfer request.');
              });
          },
        },
      ]
    );
  };

  const handleDone = () => {
    setShowSuccess(false);
    setReceiveSuccess(false);
    setLatestSentRecipientLabel('');
    router.replace('/(tabs)/(collector)/rack');
  };

  const getExpectedQrValue = (item, type) => {
    if (!item) return '';
    if (type === 'nft') return item.nftQR || '';
    if (type === 'label') return item.labelQR || '';
    return item.certificateQR || '';
  };

  const setProofState = (mode, type, value) => {
    if (!value) return;

    if (mode === 'approve') {
      if (type === 'nft') setApproveNftScanned(value);
      if (type === 'label') setApproveLabelScanned(value);
      if (type === 'certificate') setApproveCertScanned(value);
      return;
    }

    if (type === 'nft') setNftScanned(value);
    if (type === 'label') setLabelScanned(value);
    if (type === 'certificate') setCertScanned(value);
  };

  const validateQRForFlow = (data, type, mode = 'receive') => {
    const expectedItem = mode === 'approve'
      ? approveItem
      : currentItem;

    const expectedValue = getExpectedQrValue(expectedItem, type);
    if (expectedValue && expectedValue === data) {
      setProofState(mode, type, true);
      return;
    }

    Alert.alert('Invalid QR Code', 'This QR does not match the selected transfer item.');
  };

  const decodeQRFromUri = async (uri, type, mode = 'receive') => {
    try {
      const decoded = await Camera.scanFromURLAsync(uri);
      if (!decoded || decoded.length === 0) {
        Alert.alert('No QR Found', 'Could not detect a QR code. Try a clearer image.');
        return;
      }
      validateQRForFlow(decoded[0].data, type, mode);
    } catch {
      Alert.alert('Error', 'Failed to read the image. Please try again.');
    }
  };

  const pickFromGallery = async (type, mode = 'receive') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled) {
      await decodeQRFromUri(result.assets[0].uri, type, mode);
    }
  };

  const pickFromFiles = async (type, mode = 'receive') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image}
        {activeTab === 'Approval List' && (
          <View style={styles.tabContent}>
            <Text style={styles.pageSubTitle}>Approval List</Text>
            {requestsLoading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Loading transfer requests...</Text>
              </View>
            ) : requests.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="swap-horizontal-outline" size={40} color="#ddd" />
                <Text style={styles.emptyText}>No transfer requests</Text>
                <Text style={styles.emptySubtext}>
                  When someone sends an item to your wallet,{"\n"}approve or reject it here.
                </Text>
              </View>
            ) : (
              requests.map((req) => {
                const reqItem = toRequestCardItem(req) ?? routeItem;
                return (
                  <View key={req.id} style={styles.requestCard}>
                    <ItemMiniCard item={reqItem} />
                    <View style={styles.requestInfo}>
                      <View style={styles.requestInfoRow}>
                        <Text style={styles.requestInfoLabel}>From</Text>
                        <Text style={styles.requestInfoValue}>{formatRecipientLabel(req.fromUserName || req.fromWallet)}</Text>
                      </View>
                      <View style={styles.requestInfoRow}>
                        <Text style={styles.requestInfoLabel}>Date</Text>
                        <Text style={styles.requestInfoValue}>{formatRequestDate(req.requestedAt)}</Text>
                      </View>
                      <View style={styles.requestInfoRow}>
                        <Text style={styles.requestInfoLabel}>Time</Text>
                        <Text style={styles.requestInfoValue}>{formatRequestTime(req.requestedAt)}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => handleApprove(req)}
                      >
                        <Text style={styles.approveBtnText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rejectBtn}
                        onPress={() => handleReject(req.id)}
                      >
                        <Text style={styles.rejectBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {}
        {activeTab === 'Send' && (
          <View style={styles.tabContent}>
            <Text style={styles.pageSubTitle}>Send</Text>
            {ownedItemsLoading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Loading your claimed owned items...</Text>
              </View>
            ) : ownedItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cube-outline" size={40} color="#ddd" />
                <Text style={styles.emptyText}>No owned items in your rack</Text>
                <Text style={styles.emptySubtext}>Only items you currently own can be used for transfer.</Text>
              </View>
            ) : (
              <>
                <ReceiveStep number={1} title="NFT Items"                 type="nft"         scanned={nftScanned}   label="NFT"         mode="receive" />
                <View style={styles.connector} />
                <ReceiveStep number={2} title="Scan Product Labels"       type="label"       scanned={labelScanned} label="Label"       mode="receive" />
                <View style={styles.connector} />
                <ReceiveStep number={3} title="Scan Physical Certificate" type="certificate" scanned={certScanned}  label="Certificate" mode="receive" />
                <View style={styles.connector} />
                <View style={styles.stepSection}>
                  <View style={styles.stepRow}>
                    <View style={styles.stepCircle}>
                      <Text style={styles.stepNumber}>4</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>Send Transfer Request</Text>
                      <View style={styles.recipientPickerWrap}>
                        <Text style={styles.walletInputLabel}>Recipient User</Text>
                        {transferRecipientsLoading ? (
                          <View style={styles.recipientStateBox}>
                            <Text style={styles.recipientStateText}>Loading users from database...</Text>
                          </View>
                        ) : transferRecipientsError ? (
                          <View style={styles.recipientStateBox}>
                            <Text style={styles.recipientStateErrorText}>{transferRecipientsError}</Text>
                            <TouchableOpacity style={styles.recipientRetryBtn} onPress={loadTransferRecipients}>
                              <Text style={styles.recipientRetryBtnText}>Retry</Text>
                            </TouchableOpacity>
                          </View>
                        ) : transferRecipients.length === 0 ? (
                          <View style={styles.recipientStateBox}>
                            <Text style={styles.recipientStateText}>No other active users with connected wallet found. Your own account is excluded from recipients.</Text>
                          </View>
                        ) : (
                          <>
                            <TouchableOpacity
                              style={styles.recipientPickerBtn}
                              onPress={() => setShowRecipientPicker(true)}
                            >
                              <View style={styles.recipientPickerTextWrap}>
                                <Text style={styles.recipientPickerPrimary}>
                                  {selectedRecipient
                                    ? getRecipientPrimaryLabel(selectedRecipient)
                                    : 'Select recipient user'}
                                </Text>
                                <Text style={styles.recipientPickerSecondary}>
                                  {selectedRecipient
                                    ? getRecipientSecondaryLabel(selectedRecipient)
                                    : `${transferRecipients.length} recipient users available`}
                                </Text>
                              </View>
                              <Ionicons name="chevron-down" size={18} color="#111" />
                            </TouchableOpacity>
                            {!selectedRecipient && (
                              <Text style={styles.walletInputError}>Please select one recipient user.</Text>
                            )}
                          </>
                        )}
                      </View>
                      <TouchableOpacity
                        style={[styles.actionBtn, !canSendRequest && styles.actionBtnDisabled]}
                        onPress={canSendRequest ? handleReceive : null}
                        activeOpacity={canSendRequest ? 0.85 : 1}
                      >
                        <Text style={styles.actionBtnText}>Send Request</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {}
      <Modal visible={showApprove} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIcon, { backgroundColor: '#2980B9' }]}>
              <Ionicons name="swap-horizontal" size={32} color="#fff" />
            </View>
            <Text style={styles.modalTitle}>Confirm Transfer</Text>
            <Text style={styles.modalSubtitle}>
              Approve transfer of{' '}
              <Text style={{ fontWeight: '800' }}>{approveItem?.name}</Text>{' '}
              ({approveItem?.id}) from{' '}
              <Text style={{ fontWeight: '800' }}>{formatRecipientLabel(selectedReq?.fromUserName || selectedReq?.fromWallet)}</Text>?
            </Text>
            <Text style={styles.modalWarning}>
              On approval, ownership will transfer to your wallet on the blockchain.
            </Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnOutline]}
                onPress={() => setShowApprove(false)}
              >
                <Text style={styles.modalBtnOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#2980B9' }]}
                onPress={handleConfirmApprove}
              >
                <Text style={styles.modalBtnText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {}
      <Modal visible={showRackPicker} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.rackPickerCard}>
            <Text style={styles.modalTitle}>Select From My Rack</Text>
            <Text style={styles.modalSubtitle}>Only items you currently own are listed.</Text>

            {ownedItems.length === 0 ? (
              <View style={styles.emptyStateCompact}>
                <Text style={styles.emptyModalText}>No owned items found</Text>
                <Text style={styles.emptyModalSubtext}>Only realized/claimed items can be selected.</Text>
              </View>
            ) : (
              <ScrollView style={styles.rackPickerList} showsVerticalScrollIndicator={false}>
                {ownedItems.map((item) => {
                  const selected = currentItem?.id === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.rackPickerRow, selected && styles.rackPickerRowSelected]}
                      onPress={() => handlePickOwnedItem(item)}
                    >
                      <Image source={{ uri: item.image }} style={styles.rackPickerThumb} resizeMode="cover" />
                      <View style={styles.rackPickerMeta}>
                        <Text style={styles.rackPickerId}>{toSafeText(item.id, '#ITEM')}</Text>
                        <Text style={styles.rackPickerName} numberOfLines={1}>{toSafeText(item.name, 'Owned Item')}</Text>
                        <Text style={styles.rackPickerSub} numberOfLines={1}>{toSafeText(item.subtitle, 'Collection Item')}</Text>
                      </View>
                      {selected && <Ionicons name="checkmark-circle" size={20} color="#27AE60" />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.rackPickerCloseBtn}
              onPress={() => setShowRackPicker(false)}
            >
              <Text style={styles.rackPickerCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {}
      <Modal visible={showRecipientPicker} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.rackPickerCard}>
            <Text style={styles.modalTitle}>Select Recipient User</Text>
            <Text style={styles.modalSubtitle}>Choose one active user from your database users.</Text>

            {transferRecipientsLoading ? (
              <View style={styles.emptyStateCompact}>
                <Text style={styles.emptyModalText}>Loading users...</Text>
              </View>
            ) : transferRecipientsError ? (
              <View style={styles.emptyStateCompact}>
                <Text style={styles.emptyModalErrorText}>{transferRecipientsError}</Text>
                <TouchableOpacity style={styles.recipientRetryBtn} onPress={loadTransferRecipients}>
                  <Text style={styles.recipientRetryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : transferRecipients.length === 0 ? (
              <View style={styles.emptyStateCompact}>
                <Text style={styles.emptyModalText}>No recipients available</Text>
                <Text style={styles.emptyModalSubtext}>Only other active users with connected wallet can receive transfer.</Text>
              </View>
            ) : (
              <ScrollView style={styles.rackPickerList} showsVerticalScrollIndicator={false}>
                {transferRecipients.map((recipient) => {
                  const walletKey = normalizeWalletValue(recipient.walletAddress);
                  const selected = normalizeWalletValue(selectedRecipientWallet) === walletKey;

                  return (
                    <TouchableOpacity
                      key={`${recipient.id || walletKey}-${walletKey}`}
                      style={[styles.rackPickerRow, selected && styles.rackPickerRowSelected]}
                      onPress={() => handlePickRecipient(recipient)}
                    >
                      <View style={styles.recipientAvatar}>
                        <Ionicons name="person" size={16} color="#111" />
                      </View>
                      <View style={styles.rackPickerMeta}>
                        <Text style={styles.rackPickerName} numberOfLines={1}>{getRecipientPrimaryLabel(recipient)}</Text>
                        <Text style={styles.rackPickerSub} numberOfLines={1}>{getRecipientSecondaryLabel(recipient)}</Text>
                      </View>
                      {selected && <Ionicons name="checkmark-circle" size={20} color="#27AE60" />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.rackPickerCloseBtn}
              onPress={() => setShowRecipientPicker(false)}
            >
              <Text style={styles.rackPickerCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {}
      <Modal visible={showApproveProof} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCardWide}>
            <Text style={styles.modalTitle}>Verify Before Approve</Text>
            <Text style={styles.modalSubtitle}>
              For safety, verify all three proofs for{' '}
              <Text style={{ fontWeight: '800' }}>{approveItem?.id}</Text>{' '}
              before approving transfer from{' '}
              <Text style={{ fontWeight: '800' }}>{formatRecipientLabel(selectedReq?.fromUserName || selectedReq?.fromWallet)}</Text>.
            </Text>

            <View style={styles.progressRow}>
              <Text style={styles.progressText}>
                Verified {Number(approveNftScanned) + Number(approveLabelScanned) + Number(approveCertScanned)} / 3
              </Text>
            </View>

            <ReceiveStep number={1} title="NFT QR" type="nft" scanned={approveNftScanned} label="NFT" mode="approve" />
            <View style={styles.connector} />
            <ReceiveStep number={2} title="Label QR" type="label" scanned={approveLabelScanned} label="Label" mode="approve" />
            <View style={styles.connector} />
            <ReceiveStep number={3} title="Certificate QR" type="certificate" scanned={approveCertScanned} label="Certificate" mode="approve" />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnOutline]}
                onPress={() => {
                  setShowApproveProof(false);
                  resetApproveProofState();
                }}
              >
                <Text style={styles.modalBtnOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, !canApproveRequest && styles.actionBtnDisabled]}
                onPress={() => {
                  if (!canApproveRequest) return;
                  setShowApproveProof(false);
                  setShowApprove(true);
                }}
              >
                <Text style={styles.modalBtnText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {}
      <Modal visible={manualInputVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.manualModalCard}>
            <Text style={styles.modalTitle}>Manual QR Input</Text>
            <Text style={styles.modalSubtitle}>
              Paste the QR string for {manualInputType.toUpperCase()}.
            </Text>
            <TextInput
              style={styles.manualInput}
              value={manualInputValue}
              onChangeText={setManualInputValue}
              placeholder="e.g. zeal://item/AZEDR/transfer"
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnOutline]}
                onPress={() => {
                  setManualInputVisible(false);
                  setManualInputValue('');
                }}
              >
                <Text style={styles.modalBtnOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtn} onPress={submitManualInput}>
                <Text style={styles.modalBtnText}>Verify</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIcon, { backgroundColor: '#27AE60' }]}>
              <Ionicons name="checkmark" size={36} color="#fff" />
            </View>
            <Text style={styles.modalTitle}>Transfer Complete!</Text>
            <Text style={styles.modalSubtitle}>
              You approved transfer for{' '}
              <Text style={{ fontWeight: '800' }}>{approveItem?.name}</Text>.
              {'\n'}Ownership is now transferred to your wallet on blockchain.
            </Text>
            <TouchableOpacity style={styles.modalBtnFull} onPress={handleDone}>
              <Text style={styles.modalBtnText}>Back to Rack</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {}
      <Modal visible={receiveSuccess} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIcon, { backgroundColor: '#27AE60' }]}>
              <Ionicons name="checkmark" size={36} color="#fff" />
            </View>
            <Text style={styles.modalTitle}>Request Sent!</Text>
            <Text style={styles.modalSubtitle}>
              Transfer request has been sent to{' '}
              <Text style={{ fontWeight: '800' }}>{latestSentRecipientLabel || 'selected recipient'}</Text>.
              Ownership transfer will execute after recipient approval.
            </Text>
            <TouchableOpacity style={styles.modalBtnFull} onPress={handleDone}>
              <Text style={styles.modalBtnText}>Go to Your Rack</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerBar: {
    height: 44, paddingHorizontal: 16,
    justifyContent: 'center', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, paddingVertical: 8, paddingHorizontal: 4,
  },
  backText:     { fontSize: 17, fontWeight: '600', color: '#111' },
  scroll:       { paddingHorizontal: 20, paddingTop: 20 },
  pageTitle:    { fontSize: 28, fontWeight: '700', color: '#111', marginBottom: 8 },
  pageSubTitle: { fontSize: 22, fontWeight: '800', color: '#111', marginBottom: 20 },

  devInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F3EEFF', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    marginBottom: 16, alignSelf: 'flex-start',
  },
  devInfoText: { fontSize: 12, color: '#7B3FE4', fontWeight: '600' },

  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    backgroundColor: '#F4F6F8',
    borderRadius: 14,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 0,
    alignItems: 'center',
  },
  tabBtnActive:  {
    backgroundColor: '#111',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  tabText:       { fontSize: 12, color: '#555', fontWeight: '700' },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  tabContent:    { gap: 0 },

  requestCard: {
    flexDirection: 'row', backgroundColor: '#f9f9f9',
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#f0f0f0', marginBottom: 16,
  },
  itemCard:        { width: 155, height: 230, position: 'relative', backgroundColor: '#111' },
  itemCardImage:   { width: '100%', height: '100%', position: 'absolute' },
  itemCardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  itemCardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 10,
  },
  brandRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  brandLogo:      { width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff' },
  brandName:      { color: '#fff', fontSize: 9, fontWeight: '700' },
  tagBadge:       { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  tagText:        { color: '#fff', fontSize: 9, fontWeight: '800' },
  itemCardBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10, gap: 1 },
  itemIdText:     { fontSize: 8, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  itemName:       { fontSize: 14, fontWeight: '900', color: '#fff' },
  itemSubtitle:   { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  priceBox:       { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 7, gap: 2 },
  priceLabel:     { fontSize: 8, color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase' },
  priceRow:       { flexDirection: 'row', alignItems: 'center' },
  priceMain:      { fontSize: 11, fontWeight: '800', color: '#fff' },
  priceUsd:       { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' },
  polDot:         { backgroundColor: '#7B3FE4' },

  requestInfo:      { flex: 1, padding: 14, gap: 8, justifyContent: 'center' },
  requestInfoRow:   { gap: 2 },
  requestInfoLabel: { fontSize: 11, color: '#888', fontWeight: '600' },
  requestInfoValue: { fontSize: 13, fontWeight: '700', color: '#111' },
  approveBtn: {
    backgroundColor: '#111', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', marginTop: 4,
  },
  approveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  rejectBtn: {
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1, borderColor: '#E74C3C',
    paddingVertical: 10, alignItems: 'center',
  },
  rejectBtnText: { color: '#E74C3C', fontSize: 13, fontWeight: '700' },

  stepSection: {
    marginBottom: 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  stepRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  stepCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#111', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0,
  },
  stepCircleDone: { backgroundColor: '#27AE60' },
  stepNumber:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  stepContent:    { flex: 1, paddingBottom: 2, gap: 10 },
  stepTitle:      { fontSize: 16, fontWeight: '700', color: '#111', marginTop: 2 },
  connector: {
    width: 2,
    height: 14,
    backgroundColor: '#D1D5DB',
    marginLeft: 30,
    marginVertical: 2,
  },

  btnRow:             { flexDirection: 'row', gap: 8 },
  actionBtn: {
    backgroundColor: '#111', borderRadius: 14, paddingVertical: 13,
    alignItems: 'center', flexDirection: 'row',
    justifyContent: 'center', gap: 6,
  },
  actionBtnThird:    { flex: 1 },
  actionBtnOutline:  { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ddd' },
  actionBtnDisabled: { backgroundColor: '#aaa' },
  actionBtnText:     { color: '#fff', fontSize: 13, fontWeight: '700' },
  selectItemBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  uploadHint:        { fontSize: 11, color: '#aaa', marginTop: -4 },
  selectItemBtn: {
    alignSelf: 'stretch',
    marginTop: 2,
  },
  changeItemBtn: {
    marginTop: 6,
  },
  selectedRackRow: {
    backgroundColor: '#EEF6FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  selectedRackText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  walletInputWrap: {
    gap: 6,
  },
  recipientPickerWrap: {
    gap: 6,
  },
  recipientStateBox: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
  },
  recipientStateText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  recipientStateErrorText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '600',
  },
  recipientRetryBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#111',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  recipientRetryBtnText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
  },
  recipientPickerBtn: {
    borderWidth: 1.2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recipientPickerTextWrap: {
    flex: 1,
    gap: 2,
  },
  recipientPickerPrimary: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111',
  },
  recipientPickerSecondary: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  walletInputLabel: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '700',
  },
  walletInput: {
    borderWidth: 1.2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111',
    backgroundColor: '#fff',
  },
  walletInputError: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
  },

  scannedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0FDF4', alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  scannedText: { fontSize: 13, fontWeight: '600' },

  instructionCard: {
    backgroundColor: '#f9f9f9', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#f0f0f0', marginBottom: 16,
  },
  instructionStep:     { position: 'relative' },
  instructionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  instructionNum: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#111', alignItems: 'center', justifyContent: 'center',
  },
  instructionNumText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  instructionIconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  instructionText:    { flex: 1 },
  instructionTitle:   { fontSize: 14, fontWeight: '700', color: '#111' },
  instructionDesc:    { fontSize: 13, color: '#666', lineHeight: 20 },
  instructionDivider: { height: 1, backgroundColor: '#ebebeb', marginVertical: 14 },

  infoNote: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#EBF5FB', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: '#AED6F1',
  },
  infoNoteText: { flex: 1, fontSize: 12, color: '#2980B9', lineHeight: 18 },

  emptyState:   { paddingVertical: 60, alignItems: 'center', gap: 8 },
  emptyText:    { fontSize: 15, color: '#aaa', fontWeight: '600' },
  emptySubtext: { fontSize: 13, color: '#ccc', textAlign: 'center', lineHeight: 20 },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 28,
    width: '100%', alignItems: 'center', gap: 12,
  },
  modalCardWide: {
    backgroundColor: '#fff', borderRadius: 24, padding: 20,
    width: '100%', alignItems: 'stretch', gap: 8,
    maxHeight: '92%',
  },
  manualModalCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 20,
    width: '100%', alignItems: 'stretch', gap: 10,
  },
  modalIcon: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  modalTitle:    { fontSize: 22, fontWeight: '900', color: '#111' },
  modalSubtitle: { fontSize: 13, color: '#555', textAlign: 'center', lineHeight: 20 },
  modalWarning: {
    fontSize: 12, color: '#E74C3C', textAlign: 'center',
    lineHeight: 18, backgroundColor: '#FEF2F2',
    padding: 10, borderRadius: 10, width: '100%',
  },
  modalBtnRow: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  modalBtn: {
    flex: 1, backgroundColor: '#111', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  modalBtnFull: {
    width: '100%', backgroundColor: '#111', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  modalBtnOutline:     { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ddd' },
  modalBtnText:        { color: '#fff', fontSize: 14, fontWeight: '800' },
  modalBtnOutlineText: { color: '#111', fontSize: 14, fontWeight: '800' },
  progressRow: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  progressText: { fontSize: 12, fontWeight: '700', color: '#111' },
  manualInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 92,
    textAlignVertical: 'top',
    fontSize: 13,
    color: '#111',
  },
  rackPickerCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxHeight: '88%',
    gap: 10,
  },
  rackPickerList: {
    maxHeight: 360,
  },
  rackPickerCloseBtn: {
    backgroundColor: '#111',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  rackPickerCloseBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  rackPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  rackPickerRowSelected: {
    borderColor: '#27AE60',
    backgroundColor: '#F0FDF4',
  },
  rackPickerThumb: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#ddd',
  },
  recipientAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rackPickerMeta: {
    flex: 1,
    gap: 2,
  },
  rackPickerId: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '700',
  },
  rackPickerName: {
    fontSize: 13,
    color: '#111',
    fontWeight: '800',
  },
  rackPickerSub: {
    fontSize: 11,
    color: '#6B7280',
  },
  emptyStateCompact: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 4,
  },
  emptyModalText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '700',
  },
  emptyModalErrorText: {
    fontSize: 13,
    color: '#B91C1C',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '600',
  },
  emptyModalSubtext: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});