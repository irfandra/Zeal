import { apiRequest } from './apiClient';

const FALLBACK_ITEM_IMAGE =
  'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=60';

const ORDER_STATUS_TO_RACK_STATUS = {
  PENDING: 'In Process',
  PAYMENT_RECEIVED: 'In Process',
  PROCESSING: 'In Process',
  SHIPPED: 'In Shipment',
  DELIVERED: 'Wait for Claim',
  COMPLETED: 'Claimed',
  CANCELLED: 'In Process',
  REFUNDED: 'In Process',
};

const ORDER_ONLY_VISIBLE_STATUSES = new Set([
  'PENDING',
  'PAYMENT_RECEIVED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
]);

const TAG_COLORS = {
  Genesis: '#7B3FE4',
  'Ultra Rare': '#B8860B',
  Rare: '#C0392B',
  Standard: '#333',
};

const CACHE_TTL_MS = 60 * 1000;

let rackItemsCache = null;
let rackItemsCachedAt = 0;

const extractPageContent = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.content)) {
    return value.content;
  }

  return [];
};

const formatPolAmount = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '--';
  }

  const hasDecimals = Math.abs(numeric % 1) > 0;
  return numeric.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
};

const formatCategory = (value) =>
  String(value || 'OTHER')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDate = (value) => {
  if (!value) return '-';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleDateString('en-GB');
};

const normalizeDisplayId = (item) => {
  const serial = String(item?.itemSerial || '').trim().replace(/^#/, '');
  if (serial) {
    return `#${serial}`;
  }

  const itemId = String(item?.id ?? '').trim();
  if (itemId) {
    return `#ITEM-${itemId}`;
  }

  return '#ITEM';
};

const parseItemIndexFromSerial = (serialValue) => {
  const serial = String(serialValue || '').trim();
  if (!serial) {
    return 0;
  }

  const matches = serial.match(/(\d+)/g);
  if (!Array.isArray(matches) || matches.length === 0) {
    return 0;
  }

  const parsed = Number(matches[matches.length - 1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const shortWallet = (wallet) => {
  const safeWallet = String(wallet || '').trim();
  if (!safeWallet) {
    return 'Unknown';
  }

  if (safeWallet.length <= 14) {
    return safeWallet;
  }

  return `${safeWallet.slice(0, 8)}...${safeWallet.slice(-6)}`;
};

const normalizeWalletForCompare = (wallet) =>
  String(wallet || '').trim().toLowerCase();

const walletsMatch = (left, right) => {
  const safeLeft = normalizeWalletForCompare(left);
  const safeRight = normalizeWalletForCompare(right);
  return !!safeLeft && !!safeRight && safeLeft === safeRight;
};

const toUserHandle = (username) => {
  const safeUsername = String(username || '').trim();
  if (!safeUsername) {
    return '';
  }

  return `@${safeUsername}`;
};

const getOwnershipHistorySortTime = (record) => {
  const transferTime = new Date(record?.transferredAt || 0).getTime();
  if (Number.isFinite(transferTime) && transferTime > 0) {
    return transferTime;
  }

  const fallbackId = Number(record?.id);
  return Number.isFinite(fallbackId) ? fallbackId : 0;
};

const getLatestOwnershipHistoryRecord = (records) => {
  if (!Array.isArray(records) || records.length === 0) {
    return null;
  }

  return records.reduce((latest, current) => {
    if (!latest) {
      return current;
    }

    return getOwnershipHistorySortTime(current) >= getOwnershipHistorySortTime(latest)
      ? current
      : latest;
  }, null);
};

const resolveHistoryParticipantLabel = ({
  userName,
  wallet,
  currentOwnerWallet,
  currentOwnerLabel,
  fallbackLabel,
}) => {
  const userHandle = toUserHandle(userName);
  if (userHandle) {
    return userHandle;
  }

  const safeWallet = String(wallet || '').trim();
  if (safeWallet) {
    if (walletsMatch(safeWallet, currentOwnerWallet)) {
      return currentOwnerLabel;
    }

    return shortWallet(safeWallet);
  }

  return fallbackLabel;
};

const getLatestOwnershipHistoryForItem = async (backendItemId) => {
  const safeBackendItemId = Number(backendItemId);
  if (!Number.isFinite(safeBackendItemId) || safeBackendItemId <= 0) {
    return null;
  }

  const history = await apiRequest(`/verify/item/${encodeURIComponent(safeBackendItemId)}/history`).catch(() => []);
  return getLatestOwnershipHistoryRecord(history);
};

const toBrandHandle = (brandName) => {
  const normalized = String(brandName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

  if (!normalized) {
    return 'Brand';
  }

  return `@${normalized}`;
};

const resolveTag = (itemIndex, total) => {
  const safeIndex = Number(itemIndex);
  const safeTotal = Number(total);

  if (!Number.isFinite(safeIndex) || safeIndex <= 0 || !Number.isFinite(safeTotal) || safeTotal <= 0) {
    return 'Standard';
  }

  if (safeIndex === 1) {
    return 'Genesis';
  }

  const ratio = safeIndex / safeTotal;
  if (ratio <= 0.05) return 'Ultra Rare';
  if (ratio <= 0.2) return 'Rare';

  return 'Standard';
};

const normalizeEditionTotal = (itemIndex, total) => {
  const safeIndex = Number(itemIndex);
  const safeTotal = Number(total);

  if (!Number.isFinite(safeTotal) || safeTotal <= 0) {
    return Number.isFinite(safeIndex) && safeIndex > 0 ? safeIndex : 0;
  }

  return safeTotal;
};

const resolveRackStatus = (orderStatus, sealStatus) => {
  const orderKey = String(orderStatus || '').trim().toUpperCase();
  if (orderKey && ORDER_STATUS_TO_RACK_STATUS[orderKey]) {
    return ORDER_STATUS_TO_RACK_STATUS[orderKey];
  }

  const sealKey = String(sealStatus || '').trim().toUpperCase();
  if (sealKey === 'REALIZED') {
    return 'Claimed';
  }

  if (sealKey === 'RESERVED') {
    return 'In Process';
  }

  return 'In Process';
};

const getOrderSortTime = (order) => {
  const values = [
    order?.completedAt,
    order?.deliveredAt,
    order?.shippedAt,
    order?.paymentConfirmedAt,
    order?.createdAt,
  ];

  return values
    .map((value) => new Date(value || 0).getTime())
    .filter((value) => Number.isFinite(value))
    .reduce((latest, value) => Math.max(latest, value), 0);
};

const addLatestOrder = (map, key, order) => {
  if (!key) {
    return;
  }

  const existing = map.get(key);
  if (!existing || getOrderSortTime(order) >= getOrderSortTime(existing)) {
    map.set(key, order);
  }
};

const buildOrderLookup = (orders) => {
  const byItemId = new Map();
  const bySerial = new Map();

  (Array.isArray(orders) ? orders : []).forEach((order) => {
    const itemId = Number(order?.productItemId);
    if (Number.isFinite(itemId)) {
      addLatestOrder(byItemId, itemId, order);
    }

    const serial = String(order?.itemSerial || '').trim().toLowerCase();
    if (serial) {
      addLatestOrder(bySerial, serial, order);
    }
  });

  return {
    byItemId,
    bySerial,
  };
};

const getOrderForItem = (item, lookup) => {
  if (!lookup) {
    return null;
  }

  const itemId = Number(item?.id);
  if (Number.isFinite(itemId) && lookup.byItemId.has(itemId)) {
    return lookup.byItemId.get(itemId);
  }

  const serial = String(item?.itemSerial || '').trim().toLowerCase();
  if (serial && lookup.bySerial.has(serial)) {
    return lookup.bySerial.get(serial);
  }

  return null;
};

const normalizeRouteItemId = (value) =>
  decodeURIComponent(String(value || ''))
    .trim()
    .replace(/^#/, '')
    .toLowerCase();

const findRackItem = (items, routeItemId) => {
  const normalized = normalizeRouteItemId(routeItemId);
  if (!normalized) {
    return null;
  }

  return (
    items.find((item) => normalizeRouteItemId(item.id) === normalized) ||
    items.find((item) => normalizeRouteItemId(item.itemSerial) === normalized) ||
    items.find((item) => normalizeRouteItemId(item.backendItemId) === normalized) ||
    null
  );
};

const getRackIdentityKey = (item) => {
  const backendItemId = Number(item?.backendItemId);
  if (Number.isFinite(backendItemId) && backendItemId > 0) {
    return `product-item:${backendItemId}`;
  }

  const serial = String(item?.itemSerial || '').trim().toLowerCase();
  if (serial) {
    return `serial:${serial}`;
  }

  const orderId = Number(item?.orderId);
  if (Number.isFinite(orderId) && orderId > 0) {
    return `order:${orderId}`;
  }

  const displayId = String(item?.id || '').trim().toLowerCase();
  if (displayId) {
    return `display:${displayId}`;
  }

  return '';
};

const isCacheValid = () => {
  if (!Array.isArray(rackItemsCache)) {
    return false;
  }

  return Date.now() - rackItemsCachedAt < CACHE_TTL_MS;
};

const toOwnerLabel = (username, wallet) => {
  const safeUsername = String(username || '').trim();
  if (safeUsername) {
    return `@${safeUsername}`;
  }

  return shortWallet(wallet);
};

const mapRackItemToDetail = (rackItem, latestHistory = null) => {
  const ownerLabel = toOwnerLabel(rackItem.currentOwnerUsername, rackItem.currentOwnerWallet);
  const brandHandle = toBrandHandle(rackItem.brand);
  const resolvedQrValue = String(rackItem.qrValue || '').trim();

  const fromLabel = latestHistory
    ? resolveHistoryParticipantLabel({
      userName: latestHistory.fromUserName,
      wallet: latestHistory.fromWallet,
      currentOwnerWallet: rackItem.currentOwnerWallet,
      currentOwnerLabel: ownerLabel,
      fallbackLabel: brandHandle,
    })
    : brandHandle;

  const toLabel = latestHistory
    ? resolveHistoryParticipantLabel({
      userName: latestHistory.toUserName,
      wallet: latestHistory.toWallet,
      currentOwnerWallet: rackItem.currentOwnerWallet,
      currentOwnerLabel: ownerLabel,
      fallbackLabel: ownerLabel,
    })
    : ownerLabel;

  return {
    id: rackItem.id,
    backendItemId: rackItem.backendItemId,
    itemSerial: rackItem.itemSerial,
    tokenId: rackItem.tokenId,
    contractAddress: rackItem.contractAddress || '',
    metadataUri: rackItem.metadataUri || '',
    name: rackItem.name,
    collection: rackItem.collection,
    brand: rackItem.brand,
    brandLogo: rackItem.brandLogo,
    image: rackItem.image,
    edition: rackItem.itemIndex || 0,
    total: rackItem.total || 0,
    specs: [
      { label: 'Category', value: rackItem.categoryLabel || 'Other' },
      { label: 'Seal Status', value: String(rackItem.sealStatus || 'UNKNOWN').replace(/_/g, ' ') },
    ],
    transaction: {
      currentOwner: ownerLabel,
      contract: rackItem.contractAddress || '-',
      from: fromLabel,
      to: toLabel,
      value: rackItem.price,
      usd: rackItem.usd || '',
    },
    delivery: {
      status: rackItem.status,
      claimedTime: formatDate(rackItem.claimedAt || rackItem.orderCompletedAt || rackItem.soldAt),
      arrivalTime: formatDate(rackItem.orderDeliveredAt || rackItem.orderShippedAt),
      address: rackItem.shippingAddress || '-',
      recipientName: rackItem.recipientName || '-',
      phone: rackItem.phone || '-',
    },
    qrValue: resolvedQrValue,
    hasBackendQrPayload: Boolean(resolvedQrValue),
  };
};

const getRackSortTime = (item) => {
  const values = [
    item?.claimedAt,
    item?.orderCompletedAt,
    item?.soldAt,
    item?.orderDeliveredAt,
    item?.orderShippedAt,
    item?.createdAt,
  ];

  return values
    .map((value) => new Date(value || 0).getTime())
    .filter((value) => Number.isFinite(value))
    .reduce((latest, value) => Math.max(latest, value), 0);
};

export const rackService = {
  async getCollectorRackItems({ forceRefresh = false } = {}) {
    if (!forceRefresh && isCacheValid()) {
      return rackItemsCache;
    }

    const ownedItems = await apiRequest('/my-items', {
      authRequired: true,
    });

    const safeOwnedItems = Array.isArray(ownedItems) ? ownedItems : [];

    const orderPage = await apiRequest('/orders/my?page=0&size=200', {
      authRequired: true,
    }).catch(() => null);
    const myOrders = extractPageContent(orderPage);

    const uniqueProductIds = Array.from(
      new Set(
        [...safeOwnedItems, ...myOrders]
          .map((entry) => String(entry?.productId || '').trim())
          .filter(Boolean)
      )
    );

    const products = uniqueProductIds.length > 0
      ? await Promise.all(
        uniqueProductIds.map(async (productId) => {
          const encodedId = encodeURIComponent(productId);
          const product = await apiRequest(`/products/${encodedId}`).catch(() => null);
          return [productId, product];
        })
      )
      : [];

    const productMap = new Map(products);

    const orderLookup = buildOrderLookup(myOrders);

    const mappedOwnedItems = safeOwnedItems
      .map((item) => {
        const productId = String(item?.productId || '').trim();
        const product = productMap.get(productId) || {};
        const order = getOrderForItem(item, orderLookup);

        const displayId = normalizeDisplayId(item);
        const itemIndex = Number(item?.itemIndex || 0);
        const total = Number(product?.totalQuantity || 0);
        const normalizedTotal = normalizeEditionTotal(itemIndex, total);
        const tag = resolveTag(itemIndex, normalizedTotal);
        const polValue = Number(product?.price);

        return {
          id: displayId,
          backendItemId: item?.id,
          itemSerial: String(item?.itemSerial || '').trim(),
          tokenId: Number.isFinite(Number(item?.tokenId)) ? Number(item.tokenId) : null,
          metadataUri: String(item?.metadataUri || '').trim(),
          productId,
          name: String(product?.productName || item?.productName || 'Unnamed Product').trim(),
          subtitle: String(product?.collectionName || formatCategory(product?.category) || 'Owned Item').trim(),
          collection: String(product?.collectionName || 'Collection').trim(),
          brand: String(product?.brandName || 'Brand').trim(),
          brandLogo: '',
          image: String(product?.imageUrl || '').trim() || FALLBACK_ITEM_IMAGE,
          tag,
          tagColor: TAG_COLORS[tag] || TAG_COLORS.Standard,
          price: Number.isFinite(polValue) ? `POL ${formatPolAmount(polValue)}` : 'POL --',
          usd: '',
          polValue: Number.isFinite(polValue) ? polValue : 0,
          status: resolveRackStatus(order?.status, item?.sealStatus),
          edition: itemIndex > 0 && normalizedTotal > 0 ? `${itemIndex.toLocaleString()} of ${normalizedTotal.toLocaleString()} items` : undefined,
          itemIndex: Number.isFinite(itemIndex) ? itemIndex : 0,
          total: Number.isFinite(normalizedTotal) ? normalizedTotal : 0,
          categoryLabel: formatCategory(product?.category),
          sealStatus: String(item?.sealStatus || ''),
          currentOwnerId: Number.isFinite(Number(item?.currentOwnerId)) ? Number(item.currentOwnerId) : null,
          contractAddress: String(product?.contractAddress || '').trim(),
          currentOwnerWallet: String(item?.currentOwnerWallet || '').trim(),
          currentOwnerUsername: String(item?.currentOwnerUsername || '').trim(),
          labelQR: String(item?.productLabelQrCode || '').trim(),
          certificateQR: String(item?.certificateQrCode || '').trim(),
          nftQR: String(item?.nftQrCode || '').trim(),
          qrValue:
            String(item?.nftQrCode || '').trim() ||
            String(item?.productLabelQrCode || '').trim() ||
            String(item?.certificateQrCode || '').trim(),
          claimedAt: item?.claimedAt || null,
          soldAt: item?.soldAt || null,
          createdAt: item?.createdAt || null,
          orderId: order?.id || null,
          orderStatus: order?.status || null,
          shippingAddress: String(order?.shippingAddress || '').trim(),
          recipientName: String(order?.buyerName || '').trim(),
          phone: String(order?.buyerPhoneNumber || '').trim(),
          orderShippedAt: order?.shippedAt || null,
          orderDeliveredAt: order?.deliveredAt || null,
          orderCompletedAt: order?.completedAt || null,
        };
      });

    const ownedBackendItemIds = new Set(
      mappedOwnedItems
        .map((item) => Number(item?.backendItemId))
        .filter((value) => Number.isFinite(value))
    );

    const attachedOrderIds = new Set(
      mappedOwnedItems
        .map((item) => Number(item?.orderId))
        .filter((value) => Number.isFinite(value))
    );

    const mappedOrderOnlyItems = myOrders
      .filter((order) => {
        const normalizedOrderStatus = String(order?.status || '').trim().toUpperCase();
        if (!ORDER_ONLY_VISIBLE_STATUSES.has(normalizedOrderStatus)) {
          return false;
        }

        const orderId = Number(order?.id);
        if (Number.isFinite(orderId) && attachedOrderIds.has(orderId)) {
          return false;
        }

        const productItemId = Number(order?.productItemId);
        if (Number.isFinite(productItemId) && ownedBackendItemIds.has(productItemId)) {
          return false;
        }

        return true;
      })
      .map((order) => {
        const productId = String(order?.productId || '').trim();
        const product = productMap.get(productId) || {};
        const polValue = Number(order?.totalPrice);
        const displayId = String(order?.itemSerial || order?.orderNumber || order?.id || '').trim();
        const normalizedDisplayId = displayId ? `#${displayId.replace(/^#/, '')}` : '#ORDER';
        const backendProductItemId = Number(order?.productItemId);
        const total = Number(product?.totalQuantity || 0);
        const serialItemIndex = parseItemIndexFromSerial(order?.itemSerial);
        const itemIndex = serialItemIndex > 0
          ? serialItemIndex
          : (Number.isFinite(backendProductItemId) && backendProductItemId > 0 && (total <= 0 || backendProductItemId <= total)
            ? backendProductItemId
            : 0);
        const normalizedTotal = normalizeEditionTotal(itemIndex, total);

        return {
          id: normalizedDisplayId,
          backendItemId: Number.isFinite(backendProductItemId) ? backendProductItemId : null,
          itemSerial: String(order?.itemSerial || '').trim(),
          tokenId: null,
          metadataUri: '',
          productId,
          name: String(order?.productName || product?.productName || 'Ordered Product').trim(),
          subtitle: String(product?.collectionName || formatCategory(product?.category) || 'Order in Progress').trim(),
          collection: String(product?.collectionName || 'Collection').trim(),
          brand: String(product?.brandName || 'Brand').trim(),
          brandLogo: '',
          image: String(product?.imageUrl || '').trim() || FALLBACK_ITEM_IMAGE,
          tag: 'Standard',
          tagColor: TAG_COLORS.Standard,
          price: Number.isFinite(polValue) ? `POL ${formatPolAmount(polValue)}` : 'POL --',
          usd: '',
          polValue: Number.isFinite(polValue) ? polValue : 0,
          status: resolveRackStatus(order?.status, ''),
          edition: itemIndex > 0 && normalizedTotal > 0
            ? `${itemIndex.toLocaleString()} of ${normalizedTotal.toLocaleString()} items`
            : undefined,
          itemIndex: Number.isFinite(itemIndex) ? itemIndex : 0,
          total: Number.isFinite(normalizedTotal) ? normalizedTotal : 0,
          categoryLabel: formatCategory(product?.category),
          sealStatus: '',
          currentOwnerId: Number.isFinite(Number(order?.buyerId)) ? Number(order.buyerId) : null,
          contractAddress: String(product?.contractAddress || '').trim(),
          currentOwnerWallet: String(order?.buyerWallet || '').trim(),
          currentOwnerUsername: String(order?.buyerUsername || '').trim(),
          labelQR: '',
          certificateQR: '',
          nftQR: '',
          qrValue: '',
          claimedAt: null,
          soldAt: null,
          createdAt: order?.createdAt || null,
          orderId: order?.id || null,
          orderStatus: order?.status || null,
          shippingAddress: String(order?.shippingAddress || '').trim(),
          recipientName: String(order?.buyerName || '').trim(),
          phone: String(order?.buyerPhoneNumber || '').trim(),
          orderShippedAt: order?.shippedAt || null,
          orderDeliveredAt: order?.deliveredAt || null,
          orderCompletedAt: order?.completedAt || null,
        };
      });

    const sortedItems = [...mappedOwnedItems, ...mappedOrderOnlyItems]
      .sort((left, right) => getRackSortTime(right) - getRackSortTime(left));

    const seenIdentities = new Set();
    const mappedItems = sortedItems.filter((item) => {
      const identity = getRackIdentityKey(item);
      if (!identity) {
        return true;
      }

      if (seenIdentities.has(identity)) {
        return false;
      }

      seenIdentities.add(identity);
      return true;
    });

    rackItemsCache = mappedItems;
    rackItemsCachedAt = Date.now();

    return mappedItems;
  },

  async getCollectorClaimedRackItems(options = {}) {
    const items = await this.getCollectorRackItems(options);
    return items.filter((item) => {
      const status = String(item?.status || '').trim().toLowerCase();
      const sealStatus = String(item?.sealStatus || '').trim().toUpperCase();
      return status === 'claimed' || sealStatus === 'REALIZED';
    });
  },

  async getCollectorRackItemDetail(routeItemId, options = {}) {
    const cachedItems = isCacheValid() ? rackItemsCache : null;
    let sourceItems = Array.isArray(cachedItems) ? cachedItems : [];

    let selected = findRackItem(sourceItems, routeItemId);
    if (!selected) {
      sourceItems = await this.getCollectorRackItems(options);
      selected = findRackItem(sourceItems, routeItemId);
    }

    if (!selected) {
      throw new Error('Owned item not found in your rack');
    }

    const latestHistory = await getLatestOwnershipHistoryForItem(selected.backendItemId);
    return mapRackItemToDetail(selected, latestHistory);
  },

  clearRackCache() {
    rackItemsCache = null;
    rackItemsCachedAt = 0;
  },
};
