import { apiRequest } from './apiClient';
import { brandService } from './brandService';

const STATUS_META = {
  PENDING: { section: 'In Process', actionLabel: 'Ship', deliveryStatus: 'In Process' },
  PAYMENT_RECEIVED: { section: 'In Process', actionLabel: 'Ship', deliveryStatus: 'In Process' },
  PROCESSING: { section: 'In Process', actionLabel: 'Ship', deliveryStatus: 'In Process' },
  SHIPPED: { section: 'In Shipment', actionLabel: 'Mark Arrived (Demo)', deliveryStatus: 'In Shipment' },
  DELIVERED: { section: 'Wait for Claim', actionLabel: '', deliveryStatus: 'Wait for Claim' },
  COMPLETED: { section: 'Completed', actionLabel: 'View', deliveryStatus: 'Completed' },
  CANCELLED: { section: 'Completed', actionLabel: 'View', deliveryStatus: 'Completed' },
  REFUNDED: { section: 'Completed', actionLabel: 'View', deliveryStatus: 'Completed' },
};

const isVisibleInCreatorOrderPage = (order) => {
  const status = String(order?.status || '').trim().toUpperCase();
  return status !== 'CANCELLED';
};

const parsePageContent = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.content)) {
    return value.content;
  }

  return [];
};

const formatPol = (value) => {
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

const toHandle = (value) => {
  const cleaned = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

  if (!cleaned) {
    return 'Brand';
  }

  return `@${cleaned}`;
};

const shortAddress = (value) => {
  const safeValue = String(value || '').trim();
  if (!safeValue) {
    return 'Unknown';
  }

  if (safeValue.length <= 14) {
    return safeValue;
  }

  return `${safeValue.slice(0, 8)}...${safeValue.slice(-6)}`;
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

    return shortAddress(safeWallet);
  }

  return fallbackLabel;
};

const getLatestOwnershipHistoryForItem = async (itemId) => {
  const safeItemId = Number(itemId);
  if (!Number.isFinite(safeItemId) || safeItemId <= 0) {
    return null;
  }

  const history = await apiRequest(`/verify/item/${encodeURIComponent(safeItemId)}/history`).catch(() => []);
  return getLatestOwnershipHistoryRecord(history);
};

const resolveOwnerLabel = (item, fallbackWallet, fallbackUsername) => {
  const safeUsername = String(fallbackUsername || '').trim();
  if (safeUsername) {
    return `@${safeUsername}`;
  }

  const username = String(item?.currentOwnerUsername || '').trim();
  if (username) {
    return `@${username}`;
  }

  const ownerWallet = String(item?.currentOwnerWallet || '').trim();
  if (ownerWallet) {
    return shortAddress(ownerWallet);
  }

  const buyerWallet = String(fallbackWallet || '').trim();
  if (buyerWallet) {
    return shortAddress(buyerWallet);
  }

  return 'Unknown';
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB');
};

const mapOrderCard = (order, product) => {
  const meta = STATUS_META[order?.status] || STATUS_META.PENDING;

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: meta.section,
    rawStatus: order.status,
    itemId: order.itemSerial || order.orderNumber || String(order.id),
    displayId: `#${order.itemSerial || order.orderNumber || order.id}`,
    itemName: order.productName || product?.productName || 'Unnamed Item',
    collection: product?.collectionName || 'Collection',
    pol: Number(order.totalPrice || 0),
    actionLabel: meta.actionLabel,
    createdAt: order.createdAt || null,
  };
};

const buildTrackingNumber = (orderId) => {
  const stamp = Date.now().toString().slice(-8);
  return `ZEAL-${orderId}-${stamp}`;
};

const deriveDelivery = (order, meta) => {
  const status = meta.deliveryStatus;
  return {
    status,
    claimedTime: formatDate(order?.completedAt || order?.deliveredAt),
    arrivalTime: formatDate(order?.deliveredAt || order?.shippedAt),
    address: order?.shippingAddress || '-',
    recipientName: '-',
    phone: '-',
  };
};

const resolveCreatorBrandId = async (brandId = null) => {
  const parsedBrandId = Number(brandId);
  if (Number.isFinite(parsedBrandId) && parsedBrandId > 0) {
    return parsedBrandId;
  }

  const creatorBrand = await brandService.getCreatorBrandProfile(null).catch(() => null);
  const creatorBrandId = Number(creatorBrand?.id);
  if (!Number.isFinite(creatorBrandId) || creatorBrandId <= 0) {
    return null;
  }

  return creatorBrandId;
};

export const orderService = {
  async estimateCollectorOrderFees(productId) {
    const safeProductId = String(productId || '').trim();
    if (!safeProductId) {
      throw new Error('Missing product id');
    }

    return apiRequest(`/orders/products/${encodeURIComponent(safeProductId)}/fee-estimate`, {
      authRequired: true,
    });
  },

  async createCollectorOrder(productId, { buyerWallet, shippingAddress }) {
    const safeProductId = String(productId || '').trim();
    if (!safeProductId) {
      throw new Error('Missing product id');
    }

    return apiRequest(`/orders/products/${encodeURIComponent(safeProductId)}`, {
      method: 'POST',
      authRequired: true,
      body: {
        buyerWallet: String(buyerWallet || '').trim(),
        shippingAddress: String(shippingAddress || '').trim(),
      },
    });
  },

  async confirmCollectorOrderPayment(orderId, paymentTxHash) {
    if (!orderId) {
      throw new Error('Missing order id');
    }

    const safeTxHash = String(paymentTxHash || '').trim();
    if (!safeTxHash) {
      throw new Error('Missing payment transaction hash');
    }

    return apiRequest(`/orders/${orderId}/confirm-payment`, {
      method: 'POST',
      authRequired: true,
      body: {
        paymentTxHash: safeTxHash,
      },
    });
  },

  async cancelCollectorOrder(orderId, reason = '') {
    if (!orderId) {
      throw new Error('Missing order id');
    }

    const safeReason = String(reason || '').trim();
    const query = safeReason
      ? `?reason=${encodeURIComponent(safeReason)}`
      : '';

    return apiRequest(`/orders/${orderId}/cancel${query}`, {
      method: 'POST',
      authRequired: true,
    });
  },

  async getCollectorOrders(page = 0, size = 100) {
    const safePage = Math.max(Number(page) || 0, 0);
    const safeSize = Math.min(Math.max(Number(size) || 20, 1), 200);

    const pageData = await apiRequest(`/orders/my?page=${safePage}&size=${safeSize}`, {
      authRequired: true,
    });

    return parsePageContent(pageData);
  },

  async getCreatorOrders(brandId = null) {
    const targetBrandId = await resolveCreatorBrandId(brandId);
    if (!targetBrandId) {
      return [];
    }

    const collections = await apiRequest(`/brands/${targetBrandId}/collections`, {
      authRequired: true,
    }).catch(() => []);
    if (!Array.isArray(collections) || collections.length === 0) {
      return [];
    }

    const groupedProducts = await Promise.all(
      collections.map(async (collection) => {
        const products = await apiRequest(`/collections/${collection.id}/products`, {
          authRequired: true,
        }).catch(() => []);
        return {
          collection,
          products: Array.isArray(products) ? products : [],
        };
      })
    );

    const flatProducts = groupedProducts
      .flatMap(({ products }) => products)
      .filter((product) => {
        if (product?.brandId == null) {
          return true;
        }

        return Number(product.brandId) === Number(targetBrandId);
      });

    const uniqueProducts = [];
    const seenProductIds = new Set();
    flatProducts.forEach((product) => {
      const productId = String(product?.id || '').trim();
      if (!productId || seenProductIds.has(productId)) {
        return;
      }
      seenProductIds.add(productId);
      uniqueProducts.push(product);
    });

    const orderPages = await Promise.all(
      uniqueProducts.map((product) =>
        apiRequest(`/orders/product/${encodeURIComponent(product.id)}?page=0&size=100`, {
          authRequired: true,
        })
          .then((page) => ({ product, orders: parsePageContent(page) }))
          .catch(() => ({ product, orders: [] }))
      )
    );

    return orderPages
      .flatMap(({ product, orders }) =>
        orders
          .filter((order) => isVisibleInCreatorOrderPage(order))
          .map((order) => mapOrderCard(order, product))
      )
      .sort((left, right) => {
        const leftTime = new Date(left.createdAt || 0).getTime();
        const rightTime = new Date(right.createdAt || 0).getTime();
        return rightTime - leftTime;
      });
  },

  async getCreatorOrderDetail(orderId) {
    if (!orderId) {
      throw new Error('Missing order id');
    }

    const order = await apiRequest(`/orders/${orderId}`, {
      authRequired: true,
    });

    const [product, items] = await Promise.all([
      apiRequest(`/products/${order.productId}`).catch(() => null),
      apiRequest(`/products/${order.productId}/items`).catch(() => []),
    ]);

    const relatedItems = Array.isArray(items) ? items : [];
    const orderItem = relatedItems.find((item) =>
      (order.productItemId != null && item.id === order.productItemId) ||
      (order.itemSerial != null && item.itemSerial === order.itemSerial)
    );

    const statusMeta = STATUS_META[order?.status] || STATUS_META.PENDING;
    const ownerLabel = resolveOwnerLabel(orderItem, order?.buyerWallet, order?.buyerUsername);
    const brandLabel = order?.brandOwnerUsername
      ? `@${order.brandOwnerUsername}`
      : toHandle(product?.brandName);
    const latestHistory = await getLatestOwnershipHistoryForItem(orderItem?.id);

    const fromLabel = latestHistory
      ? resolveHistoryParticipantLabel({
        userName: latestHistory.fromUserName,
        wallet: latestHistory.fromWallet,
        currentOwnerWallet: orderItem?.currentOwnerWallet,
        currentOwnerLabel: ownerLabel,
        fallbackLabel: brandLabel,
      })
      : brandLabel;

    const toLabel = latestHistory
      ? resolveHistoryParticipantLabel({
        userName: latestHistory.toUserName,
        wallet: latestHistory.toWallet,
        currentOwnerWallet: orderItem?.currentOwnerWallet,
        currentOwnerLabel: ownerLabel,
        fallbackLabel: ownerLabel,
      })
      : ownerLabel;

    return {
      id: `#${order.itemSerial || order.orderNumber || order.id}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      statusSection: statusMeta.section,
      rawStatus: order?.status || 'PENDING',
      actionLabel: statusMeta.actionLabel,
      name: order.productName || product?.productName || 'Product',
      collection: product?.collectionName || 'Collection',
      brand: product?.brandName || 'Brand',
      brandLogo: '',
      image: product?.imageUrl || 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=60',
      edition: Number(orderItem?.itemIndex || 0),
      total: Number(product?.totalQuantity || 0),
      specs: [
        { label: 'Category', value: String(product?.category || 'OTHER').replace(/_/g, ' ') },
        { label: 'Order Status', value: String(order?.status || 'PENDING').replace(/_/g, ' ') },
      ],
      transaction: {
        currentOwner: ownerLabel,
        contract: product?.contractAddress || shortAddress(orderItem?.currentOwnerWallet),
        from: fromLabel,
        to: toLabel,
        value: `POL ${formatPol(order?.totalPrice)}`,
        usd: '',
      },
      delivery: deriveDelivery(order, statusMeta),
      recipientName: order?.buyerName || '-',
      recipientPhone: order?.buyerPhoneNumber || '-',
      qrValue:
        orderItem?.nftQrCode ||
        orderItem?.productLabelQrCode ||
        orderItem?.certificateQrCode ||
        '',
    };
  },

  async processCreatorOrder(orderId) {
    if (!orderId) {
      throw new Error('Missing order id');
    }

    return apiRequest(`/orders/${orderId}/process`, {
      method: 'POST',
      authRequired: true,
    });
  },

  async shipCreatorOrder(orderId) {
    if (!orderId) {
      throw new Error('Missing order id');
    }

    return apiRequest(`/orders/${orderId}/ship`, {
      method: 'POST',
      authRequired: true,
      body: {
        trackingNumber: buildTrackingNumber(orderId),
      },
    });
  },

  async markCreatorOrderArrivedDemo(orderId) {
    if (!orderId) {
      throw new Error('Missing order id');
    }

    return apiRequest(`/orders/${orderId}/arrive-demo`, {
      method: 'POST',
      authRequired: true,
    });
  },
};
