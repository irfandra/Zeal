import { brandService, DEFAULT_BRAND_ID } from './brandService';
import { apiRequest } from './apiClient';

const FALLBACK_COLLECTION_IMAGE =
  'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=60';
const FALLBACK_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=60';
const FALLBACK_BRAND_IMAGE =
  'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=60';

const RARITY_TO_TAG_COLORS = {
  Standard: { tagColor: '#4CAF50', tagTextColor: '#fff' },
  Common: { tagColor: '#90CAF9', tagTextColor: '#fff' },
  Rare: { tagColor: '#111', tagTextColor: '#fff' },
  'Ultra Rare': { tagColor: '#9C27B0', tagTextColor: '#fff' },
  Limited: { tagColor: '#FFC107', tagTextColor: '#111' },
};

const mapCategoryToProductCategory = (category) => {
  const normalized = String(category || '').trim().toLowerCase();

  if (!normalized) return 'OTHER';
  if (normalized.includes('bag') || normalized.includes('handbag')) return 'HANDBAG';
  if (normalized.includes('watch')) return 'WATCH';
  if (normalized.includes('shoe') || normalized.includes('sneaker')) return 'SNEAKERS';
  if (normalized.includes('cloth') || normalized.includes('apparel')) return 'CLOTHING';
  if (normalized.includes('jewel')) return 'JEWELRY';
  if (normalized.includes('accessor')) return 'ACCESSORIES';
  if (normalized.includes('perfume') || normalized.includes('fragrance')) return 'PERFUME';
  if (normalized.includes('eyewear') || normalized.includes('glasses')) return 'EYEWEAR';
  if (normalized.includes('footwear')) return 'FOOTWEAR';
  if (normalized.includes('electronic') || normalized.includes('gadget')) return 'ELECTRONICS';
  if (normalized.includes('art')) return 'ART';
  if (normalized.includes('collect')) return 'COLLECTIBLE';

  return 'OTHER';
};

const formatCategoryLabel = (category) => {
  return String(category || 'OTHER')
    .trim()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const parseNumericInput = (value) => {
  if (value == null) return NaN;
  const cleaned = String(value).replace(/,/g, '').trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const isHttpUrl = (value) => {
  const safeValue = String(value || '').trim();
  if (!safeValue) {
    return false;
  }

  try {
    const parsed = new URL(safeValue);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (_error) {
    return false;
  }
};

const normalizeSpecifications = (specifications) => {
  if (!Array.isArray(specifications)) {
    return [];
  }

  return specifications
    .map((specification) => ({
      aspect: String(specification?.aspect || specification?.label || '').trim(),
      details: String(specification?.details || specification?.value || '').trim(),
    }))
    .filter((specification) => specification.aspect && specification.details);
};

const mapProductSpecifications = (product) => {
  const variationSpecifications = normalizeSpecifications(product?.specifications).map((specification) => ({
    label: specification.aspect,
    value: specification.details,
  }));

  const fallbackSpecifications = [
    {
      label: 'Category',
      value: String(product?.category || 'OTHER').replace(/_/g, ' '),
    },
    {
      label: 'Status',
      value: String(product?.status || 'DRAFT').replace(/_/g, ' '),
    },
  ];

  return [...variationSpecifications, ...fallbackSpecifications];
};

const toLocalDateTimeString = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error('Invalid date value');
  }

  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const formatStatus = (status) => {
  if (!status) return 'Draft';
  const normalized = String(status).toLowerCase();
  if (normalized === 'listed') return 'Listed';
  if (normalized === 'prepared' || normalized === 'processing') return 'In Process';
  if (normalized === 'expired') return 'Expired';
  return 'Draft';
};

const hasProcessingOrders = (orders) =>
  (Array.isArray(orders) ? orders : []).some((order) => {
    const status = String(order?.status || '').trim().toUpperCase();
    return ['PENDING', 'PAYMENT_RECEIVED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(status);
  });

const resolveCreatorCollectionStatus = async (collection) => {
  const currentStatus = formatStatus(collection?.status);
  if (currentStatus !== 'Listed') {
    return currentStatus;
  }

  const collectionId = String(collection?.id || '').trim();
  if (!collectionId) {
    return currentStatus;
  }

  const products = await apiRequest(`/collections/${collectionId}/products`, {
    authRequired: true,
  }).catch(() => []);

  const safeProducts = Array.isArray(products) ? products : [];
  if (safeProducts.length === 0) {
    return currentStatus;
  }

  const orderPages = await Promise.all(
    safeProducts.map((product) => {
      const productId = String(product?.id || '').trim();
      if (!productId) {
        return Promise.resolve(null);
      }

      return apiRequest(`/orders/product/${encodeURIComponent(productId)}?page=0&size=100`, {
        authRequired: true,
      }).catch(() => null);
    })
  );

  const orders = orderPages.flatMap((page) => extractPageContent(page));
  if (hasProcessingOrders(orders)) {
    return 'In Process';
  }

  return currentStatus;
};

const formatTagDefaults = (tag, status) => {
  if (tag) {
    return {
      tag,
      tagColor: '#111',
      tagTextColor: '#fff',
    };
  }

  if (status === 'Listed') {
    return {
      tag: 'Limited',
      tagColor: '#ffb300',
      tagTextColor: '#111',
    };
  }

  if (status === 'In Process') {
    return {
      tag: 'In Process',
      tagColor: '#2980B9',
      tagTextColor: '#fff',
    };
  }

  if (status === 'Expired') {
    return {
      tag: 'Common',
      tagColor: '#333',
      tagTextColor: '#fff',
    };
  }

  return {
    tag: 'Rare',
    tagColor: '#111',
    tagTextColor: '#fff',
  };
};

const mapSalesEnd = (salesEndAt) => {
  if (!salesEndAt) {
    return {};
  }

  const nowMs = Date.now();
  const endMs = new Date(salesEndAt).getTime();
  if (!Number.isFinite(endMs)) {
    return {};
  }

  const diffSeconds = Math.max(0, Math.floor((endMs - nowMs) / 1000));
  if (diffSeconds === 0) {
    return {};
  }

  if (diffSeconds >= 86400) {
    return { saleEndsInDays: Math.ceil(diffSeconds / 86400) };
  }

  return { saleEndsInSeconds: diffSeconds };
};

const mapCollectionToUI = (collection) => {
  const status = formatStatus(collection.status);
  const { tag, tagColor, tagTextColor } = formatTagDefaults(collection.tag, status);

  const itemsCount = Number(collection.itemsCount ?? collection.productCount ?? 0);
  const soldCount = 0;

  return {
    id: String(collection.id),
    brandId: Number(collection.brandId),
    status,
    brand: collection.brandName || 'Unknown Brand',
    brandLogo: collection.brandLogo || undefined,
    tag,
    title: collection.collectionName || 'Untitled Collection',
    collectionName: collection.collectionName || 'Untitled Collection',
    subtitle: collection.season || 'Collection',
    description: collection.description || '',
    itemsCount,
    soldCount,
    availableCount: Math.max(itemsCount - soldCount, 0),
    totalCount: itemsCount,
    floorPrice: 'POL --',
    floorUsd: '',
    image: collection.imageUrl || FALLBACK_COLLECTION_IMAGE,
    items: `👜 ${itemsCount.toLocaleString()} Items`,
    tagColor: collection.tagColor || tagColor,
    tagTextColor: collection.tagTextColor || tagTextColor,
    ...mapSalesEnd(collection.salesEndAt),
  };
};

const formatPriceAmount = (price) => {
  const numeric = Number(price);
  if (!Number.isFinite(numeric)) {
    return '--';
  }

  const hasDecimals = Math.abs(numeric % 1) > 0;
  return numeric.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
};

const parseProductPrice = (product) => {
  const direct = Number(product?.price);
  if (Number.isFinite(direct)) {
    return direct;
  }

  const fallback = String(product?.priceAmount ?? '')
    .replace(/[^0-9.-]/g, '')
    .trim();
  const parsed = Number(fallback);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const getCollectionFloorPrice = (products) => {
  if (!Array.isArray(products) || products.length === 0) {
    return 'POL --';
  }

  const minPrice = products.reduce((currentMin, product) => {
    const price = parseProductPrice(product);
    if (!Number.isFinite(price)) {
      return currentMin;
    }
    return Math.min(currentMin, price);
  }, Number.POSITIVE_INFINITY);

  if (!Number.isFinite(minPrice)) {
    return 'POL --';
  }

  return `POL ${formatPriceAmount(minPrice)}`;
};

const extractPageContent = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.content)) {
    return value.content;
  }

  return [];
};

const shortenWallet = (wallet) => {
  const safeWallet = String(wallet || '').trim();
  if (!safeWallet) {
    return 'Unknown';
  }

  if (safeWallet.length <= 12) {
    return safeWallet;
  }

  return `${safeWallet.slice(0, 6)}...${safeWallet.slice(-4)}`;
};

const HISTORY_TRANSFER_TYPE_EVENT = {
  MINT: 'Minted',
  PURCHASE: 'Purchased',
  CLAIM: 'Claimed',
  TRANSFER: 'Ownership Transfer',
  BURN: 'Burned',
  REVOKE: 'Revoked',
};

const formatHistoryActor = (userName, walletAddress, fallback = 'Unknown') => {
  const safeUserName = String(userName || '').trim();
  if (safeUserName) {
    return safeUserName.startsWith('@') ? safeUserName : `@${safeUserName}`;
  }

  const safeWallet = String(walletAddress || '').trim();
  if (safeWallet) {
    return shortenWallet(safeWallet);
  }

  return fallback;
};

const buildHistoryActivityRows = (histories, productItems, fallbackPrice) => {
  const safeHistories = Array.isArray(histories) ? histories : [];
  if (safeHistories.length === 0) {
    return [];
  }

  const itemById = new Map(
    (Array.isArray(productItems) ? productItems : [])
      .map((item) => [Number(item?.id), item])
      .filter(([id]) => Number.isFinite(id))
  );

  return safeHistories.map((history) => {
    const productItemId = Number(history?.productItemId);
    const linkedItem = Number.isFinite(productItemId) ? itemById.get(productItemId) : null;
    const serial = String(linkedItem?.itemSerial || productItemId || history?.id || '').trim();
    const itemLabel = serial ? `#${serial}` : '#N/A';
    const transferType = String(history?.transferType || '').trim().toUpperCase();

    return {
      id: `history-${history?.id || `${productItemId || 'item'}-${history?.transferredAt || 'ts'}`}`,
      event: HISTORY_TRANSFER_TYPE_EVENT[transferType] || transferType || 'Ownership Update',
      item: itemLabel,
      price: fallbackPrice,
      from: formatHistoryActor(history?.fromUserName, history?.fromWallet, 'Unknown'),
      to: formatHistoryActor(history?.toUserName, history?.toWallet, 'Unknown'),
      timestamp: history?.transferredAt || null,
      source: 'ownership-history',
    };
  });
};

const mergeActivityRows = (...activityGroups) => {
  const mergedRows = activityGroups.flatMap((group) => (Array.isArray(group) ? group : []));

  return mergedRows.sort((left, right) => {
    const leftTime = new Date(left?.timestamp || 0).getTime();
    const rightTime = new Date(right?.timestamp || 0).getTime();
    return rightTime - leftTime;
  });
};

const getProductOwnershipHistory = async (productItems) => {
  const safeItems = Array.isArray(productItems) ? productItems : [];
  if (safeItems.length === 0) {
    return [];
  }

  const historyResponses = await Promise.all(
    safeItems.map((item) => {
      const itemId = Number(item?.id);
      if (!Number.isFinite(itemId) || itemId <= 0) {
        return Promise.resolve([]);
      }

      return apiRequest(`/verify/item/${itemId}/history`).catch(() => []);
    })
  );

  return historyResponses.flatMap((history) => (Array.isArray(history) ? history : []));
};

const resolveOwnerIdentity = (item, fallbackAddress) => {
  const username = String(item?.currentOwnerUsername || '').trim();
  if (username) {
    return {
      key: `user:${username.toLowerCase()}`,
      label: `@${username}`,
    };
  }

  const ownerWallet = String(item?.currentOwnerWallet || '').trim();
  if (ownerWallet) {
    return {
      key: `wallet:${ownerWallet.toLowerCase()}`,
      label: shortenWallet(ownerWallet),
    };
  }

  const contractAddress = String(fallbackAddress || '').trim();
  if (contractAddress) {
    return {
      key: `contract:${contractAddress.toLowerCase()}`,
      label: shortenWallet(contractAddress),
    };
  }

  return {
    key: 'unassigned',
    label: 'Unassigned',
  };
};

const mapCollectionOwners = (groupedItems) => {
  const ownerMap = new Map();

  groupedItems.forEach(({ product, items }) => {
    const unitPrice = parseProductPrice(product);
    const contractAddress = product?.contractAddress;

    (Array.isArray(items) ? items : []).forEach((item) => {
      const ownerIdentity = resolveOwnerIdentity(item, contractAddress);
      const existing = ownerMap.get(ownerIdentity.key) || {
        id: ownerIdentity.label,
        count: 0,
        totalValue: 0,
      };

      existing.count += 1;
      if (Number.isFinite(unitPrice)) {
        existing.totalValue += unitPrice;
      }

      ownerMap.set(ownerIdentity.key, existing);
    });
  });

  return Array.from(ownerMap.values())
    .map((entry) => ({
      id: entry.id,
      edition: `${entry.count.toLocaleString()} item${entry.count === 1 ? '' : 's'}`,
      price: entry.totalValue > 0 ? formatPriceAmount(entry.totalValue) : '--',
      count: entry.count,
      totalValue: entry.totalValue,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return right.totalValue - left.totalValue;
    });
};

const buildOrderActivityRows = (order) => {
  const rows = [];
  const buyerWallet = shortenWallet(order?.buyerWallet);
  const itemLabel = order?.itemSerial
    ? `#${order.itemSerial}`
    : order?.orderNumber || `#${order?.id || 'N/A'}`;
  const price = formatPriceAmount(order?.totalPrice);

  const pushRow = (event, timestamp, from, to) => {
    if (!timestamp) {
      return;
    }

    rows.push({
      id: `${order?.id || 'order'}-${event}-${timestamp}`,
      event,
      item: itemLabel,
      price,
      from,
      to,
      timestamp,
    });
  };

  pushRow('Order Placed', order?.createdAt, buyerWallet, 'Brand');
  pushRow('Payment Confirmed', order?.paymentConfirmedAt, buyerWallet, 'Brand');
  pushRow('Shipped', order?.shippedAt, 'Brand', buyerWallet);
  pushRow('Delivered', order?.deliveredAt, 'Brand', buyerWallet);
  pushRow('Completed', order?.completedAt, 'Brand Vault', buyerWallet);
  pushRow('Cancelled', order?.cancelledAt, 'Brand', buyerWallet);

  if (rows.length === 0) {
    rows.push({
      id: `${order?.id || 'order'}-status`,
      event: String(order?.status || 'Order').replace(/_/g, ' '),
      item: itemLabel,
      price,
      from: 'Brand',
      to: buyerWallet,
      timestamp: order?.createdAt || null,
    });
  }

  return rows;
};

const mapOrdersToActivity = (orders) => {
  const safeOrders = Array.isArray(orders) ? orders : [];
  return safeOrders
    .flatMap(buildOrderActivityRows)
    .sort((left, right) => {
      const leftTime = new Date(left?.timestamp || 0).getTime();
      const rightTime = new Date(right?.timestamp || 0).getTime();
      return rightTime - leftTime;
    });
};

const resolveCreatorBrandId = async (brandId = null) => {
  const parsedBrandId = Number(brandId);
  if (Number.isFinite(parsedBrandId) && parsedBrandId > 0) {
    return parsedBrandId;
  }

  const creatorBrand = await brandService.getCreatorBrandProfile(null).catch(() => null);
  const creatorBrandId = Number(creatorBrand?.id);
  if (!Number.isFinite(creatorBrandId) || creatorBrandId <= 0) {
    throw new Error('Creator brand profile not found. Please register your company first.');
  }

  return creatorBrandId;
};

const getScarcityLabel = (itemIndex, total) => {
  const safeIndex = Number(itemIndex || 0);
  const safeTotal = Number(total || 0);

  if (!Number.isFinite(safeIndex) || safeIndex <= 0 || !Number.isFinite(safeTotal) || safeTotal <= 0) {
    return 'Standard';
  }

  if (safeIndex === 1) return 'Genesis';

  const ratio = safeIndex / safeTotal;
  if (ratio <= 0.05) return 'Ultra Rare';
  if (ratio <= 0.15) return 'Rare';
  if (ratio <= 0.35) return 'Scarce';
  return 'Standard';
};

const getScarcityMultiplier = (label) => {
  if (label === 'Genesis') return 1.2;
  if (label === 'Ultra Rare') return 1.1;
  if (label === 'Rare') return 1.05;
  if (label === 'Scarce') return 1.02;
  return 1;
};

const resolveEditionTotal = (items, fallbackTotal) => {
  const safeItems = Array.isArray(items) ? items : [];
  const safeFallbackTotal = Number(fallbackTotal || 0);

  const highestItemIndex = safeItems
    .map((item) => Number(item?.itemIndex || 0))
    .filter((value) => Number.isFinite(value) && value > 0)
    .reduce((max, value) => Math.max(max, value), 0);

  const safeItemsCount = safeItems.length;

  return Math.max(
    Number.isFinite(safeFallbackTotal) ? safeFallbackTotal : 0,
    highestItemIndex,
    safeItemsCount
  );
};

const mapProductItemsToPurchaseRows = (items, fallbackProduct, options = {}) => {
  const includeOnlyPurchasable = options.includeOnlyPurchasable !== false;
  const basePrice = Number(String(fallbackProduct.priceAmount).replace(/,/g, ''));

  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const sortedItems = [...items].sort((left, right) => {
    const leftIndex = Number(left?.itemIndex || 0);
    const rightIndex = Number(right?.itemIndex || 0);

    const safeLeft = Number.isFinite(leftIndex) ? leftIndex : Number.MAX_SAFE_INTEGER;
    const safeRight = Number.isFinite(rightIndex) ? rightIndex : Number.MAX_SAFE_INTEGER;

    if (safeLeft !== safeRight) {
      return safeLeft - safeRight;
    }

    return String(left?.id || '').localeCompare(String(right?.id || ''));
  });

  const scopedItems = includeOnlyPurchasable
    ? sortedItems.filter((item) => String(item?.sealStatus || '').toUpperCase() === 'PRE_MINTED')
    : sortedItems;

  if (scopedItems.length === 0) {
    return [];
  }

  const total = resolveEditionTotal(sortedItems, fallbackProduct.total);

  return scopedItems.map((item, index) => {
    const rawItemIndex = Number(item.itemIndex || 0);
    const fallbackIndex = sortedItems.findIndex((entry) => entry === item) + 1;
    const itemIndex = Number.isFinite(rawItemIndex) && rawItemIndex > 0
      ? rawItemIndex
      : (fallbackIndex > 0 ? fallbackIndex : index + 1);
    const scarcity = getScarcityLabel(itemIndex, total);
    const multiplier = getScarcityMultiplier(scarcity);
    const adjustedPrice = Number.isFinite(basePrice)
      ? formatPriceAmount(basePrice * multiplier)
      : fallbackProduct.priceAmount;
    const serial = String(item.itemSerial || item.id || '').trim();
    const fallbackRowId = String(item.id || `${fallbackProduct.id || 'ITEM'}-${itemIndex}`);
    const safeStatus = String(item?.sealStatus || '').trim().toUpperCase() || 'UNKNOWN';
    const tokenId = item?.tokenId == null ? '' : String(item.tokenId).trim();
    const currentOwnerWallet = String(item?.currentOwnerWallet || '').trim();

    return {
      id: `#${serial || fallbackRowId}`,
      itemSerial: serial || fallbackRowId,
      edition: `${itemIndex.toLocaleString()} of ${total.toLocaleString()}`,
      price: adjustedPrice,
      tokenId,
      currentOwnerWallet,
      nftQrCode: String(item.nftQrCode || '').trim(),
      productLabelQrCode: String(item.productLabelQrCode || '').trim(),
      certificateQrCode: String(item.certificateQrCode || '').trim(),
      sealStatus: safeStatus,
      isSold: safeStatus === 'RESERVED' || safeStatus === 'REALIZED',
      isBurned: safeStatus === 'BURNED',
      mintedAt: item.mintedAt || null,
      createdAt: item.createdAt || null,
    };
  });
};

const mapProductToCatalogItem = (product) => {
  const total = Number(product.totalQuantity ?? 0);
  const available = Number(product.availableQuantity ?? 0);
  const brandId = Number(product.brandId);

  return {
    id: String(product.id),
    brandId: Number.isFinite(brandId) ? brandId : null,
    name: product.productName || 'Unnamed Product',
    collection: product.collectionName || 'Uncategorized',
    brand: product.brandName || 'Unknown Brand',
    brandLogo: String(product.brandLogo || product.brandLogoUrl || '').trim() || undefined,
    available: Number.isFinite(available) ? available : 0,
    total: Number.isFinite(total) ? total : 0,
    priceAmount: formatPriceAmount(product.price),
    priceUsd: '',
    image: product.imageUrl || FALLBACK_PRODUCT_IMAGE,
    description: product.description || '',
    category: product.category || 'OTHER',
    status: product.status || 'DRAFT',
    contractAddress: String(product.contractAddress || '').trim(),
    listingDeadline: product.listingDeadline || null,
  };
};

const mapProductToDetail = (product, productItems = [], orders = [], ownershipHistory = [], options = {}) => {
  const catalogItem = mapProductToCatalogItem(product);
  const orderRows = mapOrdersToActivity(orders);
  const historyRows = buildHistoryActivityRows(ownershipHistory, productItems, catalogItem.priceAmount);

  return {
    ...catalogItem,
    specifications: mapProductSpecifications(product),
    purchaseItems: mapProductItemsToPurchaseRows(productItems, catalogItem, options),
    activity: mergeActivityRows(orderRows, historyRows),
  };
};

export const collectionService = {
  async getMarketplaceListings(page = 0, size = 100) {
    const safePage = Math.max(Number(page) || 0, 0);
    const safeSize = Math.min(Math.max(Number(size) || 20, 1), 200);
    const pageData = await apiRequest(`/marketplace?page=${safePage}&size=${safeSize}`);
    return extractPageContent(pageData);
  },

  async getCollectionActivity(collectionId) {
    if (!collectionId) {
      return [];
    }

    const products = await apiRequest(`/collections/${collectionId}/products`).catch(() => []);
    if (!Array.isArray(products) || products.length === 0) {
      return [];
    }

    const [orderPages, groupedProductItems] = await Promise.all([
      Promise.all(
        products.map((product) =>
          apiRequest(`/orders/product/${product.id}?page=0&size=100`, {
            authRequired: true,
          }).catch(() => null)
        )
      ),
      Promise.all(
        products.map(async (product) => {
          const productId = product?.id;
          const items = productId
            ? await apiRequest(`/products/${productId}/items`).catch(() => [])
            : [];

          return {
            product,
            items: Array.isArray(items) ? items : [],
          };
        })
      ),
    ]);

    const orders = orderPages.flatMap((page) => extractPageContent(page));
    const historyGroups = await Promise.all(
      groupedProductItems.map(async ({ product, items }) => {
        const history = await getProductOwnershipHistory(items);
        const fallbackPrice = formatPriceAmount(product?.price);
        return buildHistoryActivityRows(history, items, fallbackPrice);
      })
    );

    return mergeActivityRows(mapOrdersToActivity(orders), ...historyGroups);
  },

  async getCollectionOwners(collectionId) {
    if (!collectionId) {
      return [];
    }

    const products = await apiRequest(`/collections/${collectionId}/products`).catch(() => []);
    if (!Array.isArray(products) || products.length === 0) {
      return [];
    }

    const groupedItems = await Promise.all(
      products.map(async (product) => {
        const productId = product?.id;
        const items = productId
          ? await apiRequest(`/products/${productId}/items`).catch(() => [])
          : [];

        return {
          product,
          items,
        };
      })
    );

    return mapCollectionOwners(groupedItems);
  },

  async createCollectionWithVariations(
    {
      collectionName,
      category,
      about,
      imageUrl,
      totalItems,
      rarity,
      variations,
    },
    brandId = null
  ) {
    const targetBrandId = await resolveCreatorBrandId(brandId);

    const safeCollectionName = String(collectionName || '').trim();
    if (!safeCollectionName) {
      throw new Error('Collection name is required');
    }

    const safeVariations = Array.isArray(variations)
      ? variations
          .map((variation, index) => {
            const quantity = Math.trunc(parseNumericInput(variation.quantity));
            const price = parseNumericInput(variation.price);
            const imageUrl = String(variation.imageUrl || '').trim();
            const specifications = normalizeSpecifications(variation.specifications);
            return {
              index,
              name: String(variation.name || '').trim(),
              description: String(variation.description || '').trim(),
              quantity,
              price,
              imageUrl,
              specifications,
            };
          })
          .filter((variation) => variation.name)
      : [];

    if (safeVariations.length === 0) {
      throw new Error('At least one valid variation is required');
    }

    safeVariations.forEach((variation) => {
      const variationLabel = variation.name || `Variation #${variation.index + 1}`;

      if (!Number.isFinite(variation.price) || variation.price <= 0) {
        throw new Error(`Variation "${variationLabel}" must have a valid price greater than 0`);
      }

      if (!Number.isInteger(variation.quantity) || variation.quantity <= 0) {
        throw new Error(`Variation "${variationLabel}" must have a valid quantity`);
      }

      if (!variation.imageUrl) {
        throw new Error(`Variation "${variationLabel}" requires an image URL`);
      }

      if (!isHttpUrl(variation.imageUrl)) {
        throw new Error(`Variation "${variationLabel}" image URL must start with http:// or https://`);
      }

      if (!Array.isArray(variation.specifications) || variation.specifications.length === 0) {
        throw new Error(`Variation "${variationLabel}" requires at least one specification`);
      }
    });

    const totalItemsNumber = parseNumericInput(totalItems);
    if (Number.isFinite(totalItemsNumber) && totalItemsNumber > 0) {
      const variationTotal = safeVariations.reduce((sum, variation) => sum + variation.quantity, 0);
      if (variationTotal !== totalItemsNumber) {
        throw new Error(`Total variation quantity (${variationTotal}) must match total items (${totalItemsNumber})`);
      }
    }

    const collectionPayload = {
      collectionName: safeCollectionName,
      description: String(about || '').trim() || null,
      season: String(rarity || category || 'Collection').trim() || 'Collection',
      imageUrl: String(imageUrl || '').trim() || FALLBACK_COLLECTION_IMAGE,
    };

    const createdCollection = await apiRequest(`/brands/${targetBrandId}/collections`, {
      method: 'POST',
      authRequired: true,
      body: collectionPayload,
    });

    const mappedCategory = mapCategoryToProductCategory(category);

    for (const variation of safeVariations) {
      try {
        const createdProduct = await apiRequest(`/brands/${targetBrandId}/products`, {
          method: 'POST',
          authRequired: true,
          body: {
            productName: variation.name,
            description: variation.description || String(about || '').trim() || null,
            category: mappedCategory,
            imageUrl: variation.imageUrl,
            specifications: variation.specifications,
            collectionId: createdCollection.id,
            price: variation.price,
          },
        });

        await apiRequest(`/brands/${targetBrandId}/products/${createdProduct.id}/publish`, {
          method: 'POST',
          authRequired: true,
          body: {
            price: variation.price,
          },
        });

        await apiRequest(`/brands/${targetBrandId}/products/${createdProduct.id}/premint`, {
          method: 'POST',
          authRequired: true,
          body: {
            quantity: variation.quantity,
          },
        });
      } catch (error) {
        throw new Error(
          `Failed to prepare ${variation.quantity} product items for variation "${variation.name}": ${error?.message || 'Unknown error'}`
        );
      }
    }

    return createdCollection;
  },

  async getMyBrandDetails() {
    const creatorBrand = await brandService.getCreatorBrandProfile(null).catch(() => null);
    if (!creatorBrand) return null;

    return brandService.getBrandById(creatorBrand.id).catch(() => creatorBrand);
  },

  async hasCreatorBrand() {
    const creatorBrand = await brandService.getCreatorBrandProfile(null).catch(() => null);
    return Boolean(creatorBrand?.id);
  },

  async listCollection(collectionId, listingDeadline, brandId = null) {
    if (!collectionId) {
      throw new Error('Missing collection id');
    }

    const targetBrandId = await resolveCreatorBrandId(brandId);

    const payload = {};
    if (listingDeadline) {
      payload.listingDeadline = toLocalDateTimeString(listingDeadline);
    }

    return apiRequest(`/brands/${targetBrandId}/collections/${collectionId}/list`, {
      method: 'POST',
      authRequired: true,
      body: payload,
    });
  },

  async getCollectionMintEstimate(collectionId, brandId = null) {
    if (!collectionId) {
      throw new Error('Missing collection id');
    }

    const targetBrandId = await resolveCreatorBrandId(brandId);
    return apiRequest(`/brands/${targetBrandId}/collections/${collectionId}/list/estimate`, {
      authRequired: true,
    });
  },

  async endCollectionSaleNow(collectionId, brandId = null) {
    if (!collectionId) {
      throw new Error('Missing collection id');
    }

    const targetBrandId = await resolveCreatorBrandId(brandId);

    return apiRequest(`/brands/${targetBrandId}/collections/${collectionId}/end-sale`, {
      method: 'POST',
      authRequired: true,
    });
  },

  async updateCollection(collectionId, updates, brandId = null) {
    if (!collectionId) {
      throw new Error('Missing collection id');
    }

    const targetBrandId = await resolveCreatorBrandId(brandId);

    return apiRequest(`/brands/${targetBrandId}/collections/${collectionId}`, {
      method: 'PUT',
      authRequired: true,
      body: updates,
    });
  },

  async deleteCollection(collectionId, brandId = null) {
    if (!collectionId) {
      throw new Error('Missing collection id');
    }

    const targetBrandId = await resolveCreatorBrandId(brandId);
    await apiRequest(`/brands/${targetBrandId}/collections/${collectionId}`, {
      method: 'DELETE',
      authRequired: true,
    });
  },

  async getCollectionsByBrand(brandId = DEFAULT_BRAND_ID) {
    const data = await apiRequest(`/brands/${brandId}/collections`);
    if (!Array.isArray(data)) {
      return [];
    }

    const mappedCollections = data.map(mapCollectionToUI);

    return Promise.all(
      mappedCollections.map(async (collection) => {
        const hasItems = Number(collection.itemsCount || 0) > 0;
        const fallbackCategory = String(collection.subtitle || '').trim() || 'Collection';

        if (!hasItems) {
          return {
            ...collection,
            filterCategories: [fallbackCategory],
            filterCategory: fallbackCategory,
          };
        }

        const products = await apiRequest(`/collections/${collection.id}/products`).catch(() => []);
        const productCategories = Array.from(
          new Set(
            (Array.isArray(products) ? products : [])
              .map((product) => formatCategoryLabel(product?.category))
              .filter(Boolean)
          )
        );

        return {
          ...collection,
          floorPrice: getCollectionFloorPrice(products),
          filterCategories: productCategories.length > 0 ? productCategories : [fallbackCategory],
          filterCategory: productCategories[0] || fallbackCategory,
        };
      })
    );
  },

  async getCollectionsForCreatorHome(brandId = null) {
    let targetBrandId = brandId;

    if (targetBrandId == null) {
      const creatorBrand = await brandService.getCreatorBrandProfile(null).catch(() => null);
      if (!creatorBrand?.id) {
        return [];
      }
      targetBrandId = creatorBrand.id;
    }

    const collections = await this.getCollectionsByBrand(targetBrandId);
    if (!Array.isArray(collections) || collections.length === 0) {
      return [];
    }

    return Promise.all(
      collections.map(async (collection) => {
        const status = await resolveCreatorCollectionStatus(collection);
        if (status !== 'In Process') {
          return {
            ...collection,
            status,
          };
        }

        return {
          ...collection,
          status: 'In Process',
          tag: collection.tag || 'In Process',
          tagColor: collection.tagColor || '#2980B9',
          tagTextColor: collection.tagTextColor || '#fff',
        };
      })
    );
  },

  async getBrandSummary(brandId = DEFAULT_BRAND_ID) {
    const brand = await brandService.getBrandById(brandId);
    return {
      id: brand.id,
      brandName: brand.brandName,
      logo: brand.logo,
      banner: brand.companyBanner,
      statementLetterUrl: brand.statementLetterUrl,
    };
  },

  async getProductsByCollection(collectionId) {
    if (!collectionId) {
      return [];
    }

    const data = await apiRequest(`/collections/${collectionId}/products`);
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map(mapProductToCatalogItem);
  },

  async getProductById(productId, options = {}) {
    if (!productId) {
      throw new Error('Missing product id');
    }

    const includeOnlyPurchasableItems = options?.includeOnlyPurchasableItems !== false;

    const data = await apiRequest(`/products/${productId}`);


    let items = [];
    if (data?.brandId != null) {
      items = await apiRequest(`/brands/${data.brandId}/products/${productId}/items`, {
        authRequired: true,
      }).catch(() => []);
    }

    if (!Array.isArray(items) || items.length === 0) {
      items = await apiRequest(`/products/${productId}/items`).catch(() => []);
    }

    const orderPage = await apiRequest(`/orders/product/${productId}?page=0&size=100`, {
      authRequired: true,
    }).catch(() => null);

    const orders = extractPageContent(orderPage);
    const ownershipHistory = await getProductOwnershipHistory(items);

    return mapProductToDetail(data, items, orders, ownershipHistory, {
      includeOnlyPurchasable: includeOnlyPurchasableItems,
    });
  },

  async getMarketplaceHomeData() {
    const [listingsResult, allBrandsResult] = await Promise.all([
      this.getMarketplaceListings(0, 100).catch(() => []),
      brandService.getAllBrands().catch(() => []),
    ]);

    const listings = Array.isArray(listingsResult) ? listingsResult : [];
    const allBrands = (Array.isArray(allBrandsResult) ? allBrandsResult : []).filter(
      (brand) => Boolean(brand?.verified)
    );
    const verifiedBrandIds = new Set(
      allBrands
        .map((brand) => Number(brand?.id))
        .filter((brandId) => Number.isFinite(brandId))
    );

    const listedCollectionNamesByBrand = new Map();
    const listedCategoriesByCollection = new Map();
    const listedBrandIds = new Set();

    const brandMap = new Map();

    allBrands.forEach((brand) => {
      const brandId = Number(brand?.id);
      if (!Number.isFinite(brandId)) {
        return;
      }

      const logo = String(brand?.logo || '').trim();
      const banner = String(brand?.companyBanner || '').trim();
      brandMap.set(brandId, {
        id: brandId,
        name: String(brand?.brandName || `Brand ${brandId}`),
        category: '',
        logo: logo || undefined,
        image: banner || logo || FALLBACK_BRAND_IMAGE,
      });
    });

    listings.forEach((listing) => {
      const brandId = Number(listing?.brandId);
      if (!Number.isFinite(brandId) || !verifiedBrandIds.has(brandId)) {
        return;
      }

      listedBrandIds.add(brandId);

      const collectionName = String(listing?.collectionName || '').trim();
      if (collectionName) {
        const currentNames = listedCollectionNamesByBrand.get(brandId) || new Set();
        currentNames.add(collectionName.toLowerCase());
        listedCollectionNamesByBrand.set(brandId, currentNames);

        const collectionKey = `${brandId}:${collectionName.toLowerCase()}`;
        const currentCategories = listedCategoriesByCollection.get(collectionKey) || new Set();
        currentCategories.add(formatCategoryLabel(listing?.category));
        listedCategoriesByCollection.set(collectionKey, currentCategories);
      }

      const existing = brandMap.get(brandId);
      if (existing) {
        if (!existing.logo && listing?.brandLogo) {
          existing.logo = listing.brandLogo;
        }
        if (!existing.category && listing?.category) {
          existing.category = formatCategoryLabel(listing.category);
        }
        if ((!existing.image || existing.image === FALLBACK_BRAND_IMAGE) && listing?.imageUrl) {
          existing.image = listing.imageUrl;
        }
        if (existing.name.startsWith('Brand ') && listing?.brandName) {
          existing.name = String(listing.brandName);
        }
        return;
      }

      brandMap.set(brandId, {
        id: brandId,
        name: String(listing?.brandName || `Brand ${brandId}`),
        category: formatCategoryLabel(listing?.category),
        logo: String(listing?.brandLogo || '').trim() || undefined,
        image: String(listing?.imageUrl || '').trim() || FALLBACK_BRAND_IMAGE,
      });
    });

    const brandIds = Array.from(listedBrandIds);
    const collectionsByBrand = await Promise.all(
      brandIds.map(async (brandId) => {
        const collections = await this.getCollectionsByBrand(brandId).catch(() => []);
        return collections.map((collection) => ({
          ...collection,
          brandId,
        }));
      })
    );

    const dedupedCollections = Array.from(
      new Map(
        collectionsByBrand
          .flat()
          .map((collection) => [`${collection.brandId}:${collection.id}`, collection])
      ).values()
    );

    const visibleCollections = dedupedCollections
      .map((collection) => {
        const nameKey = String(collection?.title || collection?.collectionName || '')
          .trim()
          .toLowerCase();
        const collectionKey = `${Number(collection?.brandId)}:${nameKey}`;
        const categories = Array.from(listedCategoriesByCollection.get(collectionKey) || []);
        const existingCategories = Array.isArray(collection?.filterCategories)
          ? collection.filterCategories
          : [];
        const fallbackCategory = String(collection?.subtitle || '').trim() || 'Collection';
        const mergedCategories = Array.from(
          new Set([
            ...categories,
            ...existingCategories,
            fallbackCategory,
          ].filter(Boolean))
        );

        return {
          ...collection,
          filterCategories: mergedCategories,
          filterCategory: categories[0] || existingCategories[0] || fallbackCategory,
        };
      })
      .filter((collection) => {
      const names = listedCollectionNamesByBrand.get(Number(collection?.brandId));
      if (!names || names.size === 0) {
        return true;
      }

      const nameKey = String(collection?.title || collection?.collectionName || '')
        .trim()
        .toLowerCase();

      return names.has(nameKey);
    });

    visibleCollections.sort((left, right) => {
      const leftCount = Number(left?.itemsCount || 0);
      const rightCount = Number(right?.itemsCount || 0);
      if (rightCount !== leftCount) {
        return rightCount - leftCount;
      }
      return String(left?.title || '').localeCompare(String(right?.title || ''));
    });

    const brands = Array.from(brandMap.values()).sort((left, right) =>
      String(left?.name || '').localeCompare(String(right?.name || ''))
    );

    return {
      collections: visibleCollections,
      brands,
    };
  },

  async getCollectionById(brandId, collectionId) {
    const safeCollectionId = String(collectionId || '').trim();
    if (!safeCollectionId) {
      throw new Error('Missing collection id');
    }

    const safeBrandId = String(brandId || '').trim();

    if (safeBrandId) {
      try {
        const data = await apiRequest(`/brands/${safeBrandId}/collections/${safeCollectionId}`);
        return mapCollectionToUI(data);
      } catch (_error) {

      }
    }

    const marketplaceData = await this.getMarketplaceHomeData().catch(() => ({ collections: [] }));
    const marketplaceCollections = Array.isArray(marketplaceData?.collections)
      ? marketplaceData.collections
      : [];

    const parsedCollectionId = Number(safeCollectionId);
    const matchedCollection = marketplaceCollections.find((collection) => {
      if (Number.isFinite(parsedCollectionId)) {
        return Number(collection?.id) === parsedCollectionId;
      }

      return String(collection?.id || '').trim() === safeCollectionId;
    });

    if (matchedCollection) {
      return matchedCollection;
    }

    throw new Error('Collection not found');
  },

  async updateCollection(
    {
      collectionId,
      collectionName,
      description,
      category,
      imageUrl,
      tag,
      tagColor,
      tagTextColor,
      status,
    },
    brandId = null
  ) {
    if (!collectionId) {
      throw new Error('Missing collection id');
    }

    const targetBrandId = await resolveCreatorBrandId(brandId);
    const safeCollectionName = String(collectionName || '').trim();
    const safeDescription = String(description || '').trim();
    const safeCategory = String(category || '').trim();
    const safeImageUrl = String(imageUrl || '').trim();
    const safeTag = String(tag || '').trim();

    if (!safeCollectionName) {
      throw new Error('Collection name is required');
    }

    const derivedTagColors = RARITY_TO_TAG_COLORS[safeTag] || null;
    const payload = {
      collectionName: safeCollectionName,
      description: safeDescription || null,
      imageUrl: safeImageUrl || null,
      season: safeCategory || null,
      tag: safeTag || null,
      isLimitedEdition: safeTag === 'Limited',
      tagColor: tagColor || derivedTagColors?.tagColor || '#111',
      tagTextColor: tagTextColor || derivedTagColors?.tagTextColor || '#fff',
      ...(status ? { status } : {}),
    };

    const data = await apiRequest(`/brands/${targetBrandId}/collections/${collectionId}`, {
      method: 'PUT',
      authRequired: true,
      body: payload,
    });

    return mapCollectionToUI(data);
  },

  async listCollectionForSale({ collectionId, salesEndAt }, brandId = null) {
    if (!collectionId) {
      throw new Error('Missing collection id');
    }

    const targetBrandId = await resolveCreatorBrandId(brandId);
    const payload = {
      salesEndAt: toLocalDateTimeString(salesEndAt),
    };

    const data = await apiRequest(`/brands/${targetBrandId}/collections/${collectionId}/list`, {
      method: 'POST',
      authRequired: true,
      body: payload,
    });

    return mapCollectionToUI(data);
  },

  async getCollectionMintEstimate(collectionId, brandId = null) {
    if (!collectionId) {
      throw new Error('Missing collection id');
    }

    const targetBrandId = await resolveCreatorBrandId(brandId);
    return apiRequest(`/brands/${targetBrandId}/collections/${collectionId}/list/estimate`, {
      authRequired: true,
    });
  },

  async endCollectionSaleNow(collectionId, brandId = null) {
    if (!collectionId) {
      throw new Error('Missing collection id');
    }

    const targetBrandId = await resolveCreatorBrandId(brandId);
    const data = await apiRequest(`/brands/${targetBrandId}/collections/${collectionId}/demo/end-sale`, {
      method: 'POST',
      authRequired: true,
    });

    return mapCollectionToUI(data);
  },

  async deleteCollection(collectionId, brandId = null) {
    if (!collectionId) {
      throw new Error('Missing collection id');
    }

    const targetBrandId = await resolveCreatorBrandId(brandId);
    await apiRequest(`/brands/${targetBrandId}/collections/${collectionId}`, {
      method: 'DELETE',
      authRequired: true,
    });
  },

  async getCollectionsByBrand(brandId = DEFAULT_BRAND_ID) {
    const data = await apiRequest(`/brands/${brandId}/collections`);
    if (!Array.isArray(data)) {
      return [];
    }

    const mappedCollections = data.map(mapCollectionToUI);

    return Promise.all(
      mappedCollections.map(async (collection) => {
        const hasItems = Number(collection.itemsCount || 0) > 0;
        const fallbackCategory = String(collection.subtitle || '').trim() || 'Collection';

        if (!hasItems) {
          return {
            ...collection,
            filterCategories: [fallbackCategory],
            filterCategory: fallbackCategory,
          };
        }

        const products = await apiRequest(`/collections/${collection.id}/products`).catch(() => []);
        const productCategories = Array.from(
          new Set(
            (Array.isArray(products) ? products : [])
              .map((product) => formatCategoryLabel(product?.category))
              .filter(Boolean)
          )
        );

        return {
          ...collection,
          floorPrice: getCollectionFloorPrice(products),
          filterCategories: productCategories.length > 0 ? productCategories : [fallbackCategory],
          filterCategory: productCategories[0] || fallbackCategory,
        };
      })
    );
  },

  async getCollectionsForCreatorHome(brandId = null) {
    let targetBrandId = brandId;

    if (targetBrandId == null) {
      const creatorBrand = await brandService.getCreatorBrandProfile(null).catch(() => null);
      if (!creatorBrand?.id) {
        return [];
      }
      targetBrandId = creatorBrand.id;
    }

    const collections = await this.getCollectionsByBrand(targetBrandId);
    if (!Array.isArray(collections) || collections.length === 0) {
      return [];
    }

    return Promise.all(
      collections.map(async (collection) => {
        const status = await resolveCreatorCollectionStatus(collection);
        if (status !== 'In Process') {
          return {
            ...collection,
            status,
          };
        }

        return {
          ...collection,
          status: 'In Process',
          tag: collection.tag || 'In Process',
          tagColor: collection.tagColor || '#2980B9',
          tagTextColor: collection.tagTextColor || '#fff',
        };
      })
    );
  },

  async getBrandSummary(brandId = DEFAULT_BRAND_ID) {
    const brand = await brandService.getBrandById(brandId);
    return {
      id: brand.id,
      brandName: brand.brandName,
      logo: brand.logo,
      banner: brand.companyBanner,
      statementLetterUrl: brand.statementLetterUrl,
    };
  },

  async getProductsByCollection(collectionId) {
    if (!collectionId) {
      return [];
    }

    const data = await apiRequest(`/collections/${collectionId}/products`);
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map(mapProductToCatalogItem);
  },

  async getProductById(productId, options = {}) {
    if (!productId) {
      throw new Error('Missing product id');
    }

    const includeOnlyPurchasableItems = options?.includeOnlyPurchasableItems !== false;

    const data = await apiRequest(`/products/${productId}`);


    let items = [];
    if (data?.brandId != null) {
      items = await apiRequest(`/brands/${data.brandId}/products/${productId}/items`, {
        authRequired: true,
      }).catch(() => []);
    }

    if (!Array.isArray(items) || items.length === 0) {
      items = await apiRequest(`/products/${productId}/items`).catch(() => []);
    }

    const orderPage = await apiRequest(`/orders/product/${productId}?page=0&size=100`, {
      authRequired: true,
    }).catch(() => null);

    const orders = extractPageContent(orderPage);
    const ownershipHistory = await getProductOwnershipHistory(items);

    return mapProductToDetail(data, items, orders, ownershipHistory, {
      includeOnlyPurchasable: includeOnlyPurchasableItems,
    });
  },

  async getCollectionActivity(collectionId) {
    if (!collectionId) {
      return [];
    }

    const products = await apiRequest(`/collections/${collectionId}/products`).catch(() => []);
    if (!Array.isArray(products) || products.length === 0) {
      return [];
    }

    const [orderPages, groupedProductItems] = await Promise.all([
      Promise.all(
        products.map((product) =>
          apiRequest(`/orders/product/${product.id}?page=0&size=100`, {
            authRequired: true,
          }).catch(() => null)
        )
      ),
      Promise.all(
        products.map(async (product) => {
          const productId = product?.id;
          const items = productId
            ? await apiRequest(`/products/${productId}/items`).catch(() => [])
            : [];

          return {
            product,
            items: Array.isArray(items) ? items : [],
          };
        })
      ),
    ]);

    const orders = orderPages.flatMap((page) => extractPageContent(page));
    const historyGroups = await Promise.all(
      groupedProductItems.map(async ({ product, items }) => {
        const history = await getProductOwnershipHistory(items);
        const fallbackPrice = formatPriceAmount(product?.price);
        return buildHistoryActivityRows(history, items, fallbackPrice);
      })
    );

    return mergeActivityRows(mapOrdersToActivity(orders), ...historyGroups);
  },

  async getCollectionOwners(collectionId) {
    if (!collectionId) {
      return [];
    }

    const products = await apiRequest(`/collections/${collectionId}/products`).catch(() => []);
    if (!Array.isArray(products) || products.length === 0) {
      return [];
    }

    const groupedItems = await Promise.all(
      products.map(async (product) => {
        const productId = product?.id;
        const items = productId
          ? await apiRequest(`/products/${productId}/items`).catch(() => [])
          : [];

        return {
          product,
          items,
        };
      })
    );

    return mapCollectionOwners(groupedItems);
  },

  async createCollectionWithVariations(
    {
      collectionName,
      category,
      about,
      imageUrl,
      totalItems,
      rarity,
      variations,
    },
    brandId = null
  ) {
    const targetBrandId = await resolveCreatorBrandId(brandId);

    const safeCollectionName = String(collectionName || '').trim();
    if (!safeCollectionName) {
      throw new Error('Collection name is required');
    }

    const safeVariations = Array.isArray(variations)
      ? variations
          .map((variation, index) => {
            const quantity = Math.trunc(parseNumericInput(variation.quantity));
            const price = parseNumericInput(variation.price);
            const imageUrl = String(variation.imageUrl || '').trim();
            const specifications = normalizeSpecifications(variation.specifications);
            return {
              index,
              name: String(variation.name || '').trim(),
              description: String(variation.description || '').trim(),
              quantity,
              price,
              imageUrl,
              specifications,
            };
          })
          .filter((variation) => variation.name)
      : [];

    if (safeVariations.length === 0) {
      throw new Error('At least one valid variation is required');
    }

    safeVariations.forEach((variation) => {
      const variationLabel = variation.name || `Variation #${variation.index + 1}`;

      if (!Number.isFinite(variation.price) || variation.price <= 0) {
        throw new Error(`Variation "${variationLabel}" must have a valid price greater than 0`);
      }

      if (!Number.isInteger(variation.quantity) || variation.quantity <= 0) {
        throw new Error(`Variation "${variationLabel}" must have a valid quantity`);
      }

      if (!variation.imageUrl) {
        throw new Error(`Variation "${variationLabel}" requires an image URL`);
      }

      if (!isHttpUrl(variation.imageUrl)) {
        throw new Error(`Variation "${variationLabel}" image URL must start with http:// or https://`);
      }

      if (!Array.isArray(variation.specifications) || variation.specifications.length === 0) {
        throw new Error(`Variation "${variationLabel}" requires at least one specification`);
      }
    });

    const totalItemsNumber = parseNumericInput(totalItems);
    if (Number.isFinite(totalItemsNumber) && totalItemsNumber > 0) {
      const variationTotal = safeVariations.reduce((sum, variation) => sum + variation.quantity, 0);
      if (variationTotal !== totalItemsNumber) {
        throw new Error(`Total variation quantity must equal ${totalItemsNumber}`);
      }
    }

    const rarityKey = RARITY_TO_TAG_COLORS[rarity] ? rarity : 'Rare';
    const tagColors = RARITY_TO_TAG_COLORS[rarityKey];

    const createdCollection = await apiRequest(`/brands/${targetBrandId}/collections`, {
      method: 'POST',
      authRequired: true,
      body: {
        collectionName: safeCollectionName,
        description: String(about || '').trim() || null,
        imageUrl: String(imageUrl || '').trim() || null,
        season: String(category || '').trim() || null,
        isLimitedEdition: rarityKey === 'Limited',
        status: 'DRAFT',
        tag: rarityKey,
        tagColor: tagColors.tagColor,
        tagTextColor: tagColors.tagTextColor,
      },
    });

    const mappedCategory = mapCategoryToProductCategory(category);

    for (const variation of safeVariations) {
      try {
        const createdProduct = await apiRequest(`/brands/${targetBrandId}/products`, {
          method: 'POST',
          authRequired: true,
          body: {
            productName: variation.name,
            description: variation.description || String(about || '').trim() || null,
            category: mappedCategory,
            imageUrl: variation.imageUrl,
            specifications: variation.specifications,
            collectionId: createdCollection.id,
            price: variation.price,
          },
        });

        await apiRequest(`/brands/${targetBrandId}/products/${createdProduct.id}/publish`, {
          method: 'POST',
          authRequired: true,
          body: {
            price: variation.price,
          },
        });

        await apiRequest(`/brands/${targetBrandId}/products/${createdProduct.id}/premint`, {
          method: 'POST',
          authRequired: true,
          body: {
            quantity: variation.quantity,
          },
        });
      } catch (error) {
        throw new Error(
          `Failed to prepare ${variation.quantity} product items for variation "${variation.name}": ${error?.message || 'Unknown error'}`
        );
      }
    }

    return createdCollection;
  },

  async emailQrAttachments({ collectionId = null, recipientEmail = '' } = {}, brandId = null) {
    const targetBrandId = await resolveCreatorBrandId(brandId);
    const parsedCollectionId = Number(collectionId);
    const safeRecipientEmail = String(recipientEmail || '').trim();

    const payload = {
      ...(Number.isFinite(parsedCollectionId) && parsedCollectionId > 0
        ? { collectionId: parsedCollectionId }
        : {}),
      ...(safeRecipientEmail ? { recipientEmail: safeRecipientEmail } : {}),
    };

    return apiRequest(`/brands/${targetBrandId}/collections/qr/email`, {
      method: 'POST',
      authRequired: true,
      body: payload,
    });
  },
};
