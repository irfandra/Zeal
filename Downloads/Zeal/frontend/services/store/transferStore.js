let sharedState = {
  transferRequests: [],
  items: {
    AZEDR: {
      id: '#AZEDR',
      name: 'Charizard',
      subtitle: 'Pokemon Card',
      tag: 'Limited',
      tagColor: '#C9A23C',
      price: 'POL 120,100',
      usd: '~$11,000',
      brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Nintendo.svg/200px-Nintendo.svg.png',
      brand: 'Nintendo',
      image: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?auto=format&fit=crop&w=800&q=60',
      nftQR: 'zeal://item/AZEDR/transfer',
      labelQR: 'zeal://item/AZEDR/label',
      certificateQR: 'zeal://item/AZEDR/certificate',
      owner: 'glimpse27',
      status: 'Claimed',
    },
    BK291: {
      id: '#BK291',
      name: 'Birkin Brownies',
      subtitle: 'Luxury Bag',
      tag: 'Rare',
      tagColor: '#B8860B',
      price: 'POL 104,192',
      usd: '~$10,000',
      brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Hermes_paris_logo.svg/200px-Hermes_paris_logo.svg.png',
      brand: 'Hermès',
      image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=60',
      nftQR: 'zeal://item/BK291/transfer',
      labelQR: 'zeal://item/BK291/label',
      certificateQR: 'zeal://item/BK291/certificate',
      owner: 'glimpse27',
      status: 'In Process',
    },
    NK412: {
      id: '#NK412',
      name: 'AJ1 Chicago',
      subtitle: 'Sneakers',
      tag: 'Common',
      tagColor: '#555',
      price: 'POL 25,000',
      usd: '~$2,400',
      brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Logo_NIKE.svg/200px-Logo_NIKE.svg.png',
      brand: 'Nike',
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=60',
      nftQR: 'zeal://item/NK412/transfer',
      labelQR: 'zeal://item/NK412/label',
      certificateQR: 'zeal://item/NK412/certificate',
      owner: 'glimpse27',
      status: 'In Shipment',
    },
    LG088: {
      id: '#LG088',
      name: 'Falcon Standard',
      subtitle: 'Collectible Set',
      tag: 'Common',
      tagColor: '#555',
      price: 'POL 10,500',
      usd: '~$1,000',
      brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/LEGO_logo.svg/200px-LEGO_logo.svg.png',
      brand: 'LEGO',
      image: 'https://images.unsplash.com/photo-1608889175123-8ee362201f81?auto=format&fit=crop&w=800&q=60',
      nftQR: 'zeal://item/LG088/transfer',
      labelQR: 'zeal://item/LG088/label',
      certificateQR: 'zeal://item/LG088/certificate',
      owner: 'glimpse27',
      status: 'In Process',
    },
  },
};

const normalizeText = (value) => String(value || '').trim();

const normalizeUser = (value) =>
  normalizeText(value)
    .replace(/^@/, '')
    .toLowerCase();

const normalizeWallet = (value) => normalizeText(value).toLowerCase();
const isWalletAddress = (value) => /^0x[a-fA-F0-9]{40}$/.test(normalizeText(value));

const parseOwnerIdentity = (value) => {
  if (value && typeof value === 'object') {
    const parsedId = Number(value.id);
    return {
      id: Number.isFinite(parsedId) ? parsedId : null,
      userName: normalizeUser(value.userName || value.username),
      walletAddress: normalizeWallet(value.walletAddress),
    };
  }

  return {
    id: null,
    userName: normalizeUser(value),
    walletAddress: '',
  };
};

const itemMatchesOwnerIdentity = (item, ownerIdentity) => {
  const identity = ownerIdentity || parseOwnerIdentity(null);

  const itemOwnerUser = normalizeUser(item?.owner);
  const itemOwnerWallet = normalizeWallet(item?.ownerWallet || item?.currentOwnerWallet);
  const itemOwnerId = Number(item?.ownerId ?? item?.currentOwnerId);

  const matchesByUserName = !!identity.userName && itemOwnerUser === identity.userName;
  const matchesByWallet = !!identity.walletAddress
    && !!itemOwnerWallet
    && itemOwnerWallet === identity.walletAddress;
  const matchesById = identity.id != null
    && Number.isFinite(itemOwnerId)
    && itemOwnerId === identity.id;

  const hasOwnerMetadata = !!itemOwnerUser || !!itemOwnerWallet || Number.isFinite(itemOwnerId);
  if (!hasOwnerMetadata) {
    return !!identity.userName ? normalizeUser(item?.owner) === identity.userName : true;
  }

  return matchesByUserName || matchesByWallet || matchesById;
};

const normalizeItemKey = (itemId) =>
  normalizeText(itemId)
    .replace(/^#/, '')
    .toUpperCase();

export const getAllItems = () => sharedState.items;

export const getMyItems = (user) => {
  const identity = parseOwnerIdentity(user);
  return Object.values(sharedState.items).filter((item) => itemMatchesOwnerIdentity(item, identity));
};

export const getItemById = (itemId) => {
  const key = normalizeItemKey(itemId);
  if (!key) return null;
  return sharedState.items[key] ?? null;
};

export const transferItem = (itemId, toUser) => {
  const key = normalizeItemKey(itemId);
  if (sharedState.items[key]) {
    const normalizedToUser = normalizeText(toUser);
    sharedState.items[key].owner = normalizedToUser;
    if (isWalletAddress(normalizedToUser)) {
      sharedState.items[key].ownerWallet = normalizedToUser;
      sharedState.items[key].ownerId = null;
    }
    sharedState.items[key].status = 'Claimed';
  }
};

export const syncTransferItemsFromRack = (rackItems, ownerUser) => {
  const safeItems = Array.isArray(rackItems) ? rackItems : [];
  const ownerIdentity = parseOwnerIdentity(ownerUser);
  const synced = [];

  safeItems.forEach((rackItem) => {
    const incomingId = normalizeText(rackItem?.id);
    const key = normalizeItemKey(incomingId);
    if (!key) return;

    const normalizedSealStatus = normalizeText(rackItem?.sealStatus).toUpperCase();
    const normalizedRackStatus = normalizeText(rackItem?.status).toLowerCase();
    const isRealized = normalizedSealStatus === 'REALIZED' || normalizedRackStatus === 'claimed';
    if (!isRealized) {
      return;
    }

    const rackOwnerId = Number(rackItem?.currentOwnerId);
    const rackOwner = normalizeText(rackItem?.currentOwnerUsername || rackItem?.owner || ownerIdentity.userName);
    const rackOwnerWallet = normalizeText(rackItem?.currentOwnerWallet);
    const rackIdentity = {
      id: Number.isFinite(rackOwnerId) ? rackOwnerId : null,
      userName: normalizeUser(rackOwner),
      walletAddress: normalizeWallet(rackOwnerWallet),
    };

    const hasRackOwnerMetadata = !!rackIdentity.userName || !!rackIdentity.walletAddress || rackIdentity.id != null;
    if (
      hasRackOwnerMetadata
      && !itemMatchesOwnerIdentity(
        {
          owner: rackOwner,
          ownerWallet: rackOwnerWallet,
          ownerId: rackIdentity.id,
        },
        ownerIdentity
      )
    ) {
      return;
    }

    const existing = sharedState.items[key] || {};
    const normalizedId = incomingId.startsWith('#') ? incomingId : `#${incomingId}`;

    sharedState.items[key] = {
      ...existing,
      id: normalizedId,
      name: String(rackItem?.name || existing.name || 'Owned Item').trim(),
      subtitle: String(rackItem?.subtitle || rackItem?.collection || existing.subtitle || 'Digital Item').trim(),
      tag: String(rackItem?.tag || existing.tag || 'Standard').trim(),
      tagColor: String(rackItem?.tagColor || existing.tagColor || '#555').trim(),
      price: String(rackItem?.price || existing.price || 'POL --').trim(),
      usd: String(rackItem?.usd || existing.usd || '').trim(),
      brandLogo: String(rackItem?.brandLogo || existing.brandLogo || rackItem?.image || existing.image || '').trim(),
      brand: String(rackItem?.brand || existing.brand || 'Brand').trim(),
      image: String(
        rackItem?.image
          || existing.image
          || 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=60'
      ).trim(),
      nftQR: String(rackItem?.nftQR || existing.nftQR || '').trim(),
      labelQR: String(rackItem?.labelQR || existing.labelQR || '').trim(),
      certificateQR: String(rackItem?.certificateQR || existing.certificateQR || '').trim(),
      owner: rackOwner || existing.owner || ownerIdentity.userName,
      ownerWallet: rackOwnerWallet || existing.ownerWallet || ownerIdentity.walletAddress,
      ownerId: rackIdentity.id != null ? rackIdentity.id : (existing.ownerId ?? ownerIdentity.id),
      status: String(rackItem?.status || existing.status || 'Claimed').trim(),
      sealStatus: normalizedSealStatus || String(existing.sealStatus || '').trim().toUpperCase(),
    };

    synced.push(sharedState.items[key]);
  });

  return synced;
};

export const createTransferRequest = ({ itemId, fromUser, toUser }) => {
  const item = getItemById(itemId);
  if (!item) return null;

  const fromIdentity = parseOwnerIdentity(fromUser);
  if (!itemMatchesOwnerIdentity(item, fromIdentity)) {
    return null;
  }

  const normalizedToUser = normalizeText(toUser);
  if (!normalizedToUser) {
    return null;
  }

  const normalizedFromUser = normalizeText(fromIdentity.userName || item.owner);
  const normalizedFromWallet = normalizeText(fromIdentity.walletAddress || item.ownerWallet || item.currentOwnerWallet);

  const existing = sharedState.transferRequests.find(
    (request) => request.itemId === itemId && request.toUser === normalizedToUser && request.status === 'pending'
  );
  if (existing) return existing;

  const request = {
    id: `req_${Date.now()}`,
    itemId,
    fromUser: normalizedFromUser,
    fromWallet: normalizedFromWallet,
    toUser: normalizedToUser,
    toWallet: isWalletAddress(normalizedToUser) ? normalizedToUser : '',
    status: 'pending',
    createdAt: new Date().toISOString(),
    dateRequested: new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    }),
    timeRequested: new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit',
    }),
  };
  sharedState.transferRequests.push(request);
  return request;
};

export const getTransferRequests = (ownerUser) =>
  sharedState.transferRequests.filter((request) => {
    const ownerIdentity = parseOwnerIdentity(ownerUser);
    const requestFromUser = normalizeUser(request.fromUser);
    const requestFromWallet = normalizeWallet(request.fromWallet);

    const matchesUser = !!ownerIdentity.userName && requestFromUser === ownerIdentity.userName;
    const matchesWallet = !!ownerIdentity.walletAddress
      && !!requestFromWallet
      && requestFromWallet === ownerIdentity.walletAddress;

    return (matchesUser || matchesWallet) && request.status === 'pending';
  });

export const approveTransferRequest = (requestId, approverUser) => {
  const request = sharedState.transferRequests.find((entry) => entry.id === requestId);
  if (request) {
    const item = getItemById(request.itemId);
    if (!item) return null;

    const approverIdentity = parseOwnerIdentity(approverUser);
    const requestFromIdentity = {
      id: null,
      userName: normalizeUser(request.fromUser),
      walletAddress: normalizeWallet(request.fromWallet),
    };

    if (!itemMatchesOwnerIdentity(item, approverIdentity) || !itemMatchesOwnerIdentity(item, requestFromIdentity)) {
      return null;
    }

    request.status = 'approved';
    transferItem(request.itemId, request.toUser);
  }
  return request;
};

export const rejectTransferRequest = (requestId) => {
  const request = sharedState.transferRequests.find((entry) => entry.id === requestId);
  if (request) request.status = 'rejected';
  return request;
};