import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ScrollView,
  Image,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CatalogTab, ActivityTab, OwnersTab } from "@/components/tab-page/Collectiondetailtabs";
import LoadingPulse from "@/components/shared/loading-pulse";
import { collectionService } from "@/services/collectionService";

const FALLBACK_COLLECTION_IMAGE =
  "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=60";

const readParam = (value) => (Array.isArray(value) ? value[0] : value);

const parseNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parsePriceNumber = (value) => {
  const parsed = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : NaN;
};

const isListingDeadlineActive = (listingDeadline) => {
  if (!listingDeadline) {
    return true;
  }

  const deadlineMs = new Date(listingDeadline).getTime();
  if (!Number.isFinite(deadlineMs)) {
    return true;
  }

  return deadlineMs > Date.now();
};

const isListedProduct = (product) =>
  String(product?.status || "")
    .trim()
    .toUpperCase() === "LISTED" && isListingDeadlineActive(product?.listingDeadline);

const hasPositiveInventory = (product) => {
  const total = Number(product?.total || 0);
  const available = Number(product?.available || 0);
  return total > 0 || available > 0;
};

const resolveCollectorVisibleProducts = (collectionMeta, products) => {
  const safeProducts = Array.isArray(products) ? products : [];
  const listedProducts = safeProducts.filter(isListedProduct);
  if (listedProducts.length > 0) {
    return listedProducts;
  }

  const collectionStatus = String(collectionMeta?.status || "")
    .trim()
    .toUpperCase();
  const hasActiveSaleTimer =
    Number(collectionMeta?.saleEndsInDays || 0) > 0 ||
    Number(collectionMeta?.saleEndsInSeconds || 0) > 0;
  const isCollectorLiveCollection =
    collectionStatus === "LISTED" ||
    collectionStatus === "IN_PROCESS" ||
    hasActiveSaleTimer;

  if (!isCollectorLiveCollection) {
    return [];
  }

  return safeProducts.filter(hasPositiveInventory);
};

const formatDateLabel = (value) => {
  if (!value) {
    return "--";
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "--";
  }

  return timestamp.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const mapCatalogItems = (products, collectionMeta) => {
  const safeProducts = Array.isArray(products) ? products : [];

  return safeProducts.map((product) => ({
    id: String(product.id),
    name: product.name,
    collection: product.collection || collectionMeta.subtitle,
    brand: product.brand || collectionMeta.brand,
    brandLogo: collectionMeta.brandLogo,
    available: parseNumber(product.available),
    total: parseNumber(product.total),
    price: `POL ${product.priceAmount}`,
    usd: product.priceUsd || "",
    rarity: collectionMeta.tag,
    status: String(product.status || "DRAFT").toUpperCase(),
    listingDeadline: product.listingDeadline || null,
    image: product.image || FALLBACK_COLLECTION_IMAGE,
    specs: {
      color: "Unknown",
      straps_color: "Unknown",
      size: "Unknown",
      category: String(product.category || collectionMeta.subtitle || "Other").replace(/_/g, " "),
    },
  }));
};

const mapActivityItems = (events = []) => {
  const safeEvents = Array.isArray(events) ? events : [];
  return safeEvents.map((event) => ({
    id: event.id,
    type: event.event || "Transfer",
    name: event.item || "Item",
    itemId: event.item || "--",
    price: event.price ? `POL ${event.price}` : "POL --",
    from: event.from || "--",
    to: event.to || "--",
    time: formatDateLabel(event.timestamp),
  }));
};

const mapOwners = (owners = []) => {
  const safeOwners = Array.isArray(owners) ? owners : [];
  return safeOwners.map((owner, index) => ({
    id: `${owner.id}-${index}`,
    address: owner.id,
    items: parseNumber(owner.count),
  }));
};

export default function CollectionDetail() {
  const params = useLocalSearchParams();
  const collectionId = readParam(params.id);
  const brandId = readParam(params.brandId);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("catalog");
  const [collection, setCollection] = useState(null);
  const [catalogItems, setCatalogItems] = useState([]);
  const [activityItems, setActivityItems] = useState([]);
  const [ownerItems, setOwnerItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadCollectionDetail = useCallback(async (showInitialLoader = true) => {
    if (!collectionId) {
      setLoadError("Missing collection id.");
      if (showInitialLoader) {
        setIsLoading(false);
      }
      setIsRefreshing(false);
      return;
    }

    try {
      if (showInitialLoader) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      setLoadError("");

      const [collectionMeta, products, activity, owners] = await Promise.all([
        collectionService.getCollectionById(brandId, collectionId),
        collectionService.getProductsByCollection(collectionId),
        collectionService.getCollectionActivity(collectionId),
        collectionService.getCollectionOwners(collectionId),
      ]);

      const visibleProducts = resolveCollectorVisibleProducts(collectionMeta, products);
      const mappedCatalogItems = mapCatalogItems(visibleProducts, collectionMeta);

      const totalItems = mappedCatalogItems.reduce(
        (sum, item) => sum + parseNumber(item.total),
        0
      );
      const availableItems = mappedCatalogItems.reduce(
        (sum, item) => sum + parseNumber(item.available),
        0
      );
      const soldItems = Math.max(totalItems - availableItems, 0);

      const floorPriceNumeric = mappedCatalogItems.reduce((minimumPrice, item) => {
        const itemPrice = parsePriceNumber(item.price);
        if (!Number.isFinite(itemPrice)) {
          return minimumPrice;
        }
        return Math.min(minimumPrice, itemPrice);
      }, Number.POSITIVE_INFINITY);

      const floorPrice = Number.isFinite(floorPriceNumeric)
        ? `POL ${floorPriceNumeric.toLocaleString("en-US")}`
        : collectionMeta.floorPrice || "POL --";

      setCollection({
        ...collectionMeta,
        itemsCount: totalItems,
        soldCount: soldItems,
        floorPrice,
        image: collectionMeta.image || FALLBACK_COLLECTION_IMAGE,
      });
      setCatalogItems(mappedCatalogItems);
      setActivityItems(mapActivityItems(activity));
      setOwnerItems(mapOwners(owners));
    } catch (error) {
      setLoadError(error?.message || "Failed to load collection detail");
    } finally {
      if (showInitialLoader) {
        setIsLoading(false);
      }
      setIsRefreshing(false);
    }
  }, [brandId, collectionId]);

  useEffect(() => {
    loadCollectionDetail();
  }, [loadCollectionDetail]);

  const onRefresh = useCallback(() => {
    loadCollectionDetail(false);
  }, [loadCollectionDetail]);

  const tagColor = useMemo(() => {
    if (collection?.tag === "Rare") return "#B8860B";
    if (collection?.tag === "Limited") return "#C0392B";
    return "#333";
  }, [collection?.tag]);

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <LoadingPulse label="Loading collection detail..." />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.errorWrap}>
        <Text style={styles.errorText}>{loadError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadCollectionDetail}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!collection) {
    return (
      <View style={styles.errorWrap}>
        <Text style={styles.errorText}>Collection not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#111"
          />
        }
      >
        <ImageBackground
          source={{ uri: collection.image }}
          style={styles.hero}
          imageStyle={styles.heroImage}
        >
          <View style={styles.heroOverlay} />

          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={18} color="#fff" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.heroBottom}>
            <View style={styles.heroTitleRow}>
              <Text style={styles.heroTitle}>{collection.title}</Text>
              <View style={[styles.heroTag, { backgroundColor: tagColor }]}> 
                <Text style={styles.heroTagText}>{collection.tag}</Text>
              </View>
            </View>
            <View style={styles.heroMeta}>
              <Text style={styles.heroMetaText}>{collection.subtitle}</Text>
              <Text style={styles.heroMetaDivider}>|</Text>
              {collection.brandLogo && (
                <Image
                  source={{ uri: collection.brandLogo }}
                  style={styles.heroMetaLogo}
                  resizeMode="contain"
                />
              )}
              <Text style={styles.heroMetaText}>{collection.brand}</Text>
              {(collection.saleEndsInDays || collection.saleEndsInSeconds) && (
                <>
                  <Text style={styles.heroMetaDivider}>|</Text>
                  <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.heroMetaText}>
                    {collection.saleEndsInDays
                      ? `Sale Ends in ${collection.saleEndsInDays} days`
                      : "Sale Ending Soon"}
                  </Text>
                </>
              )}
            </View>
          </View>
        </ImageBackground>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>Total Items</Text>
            <Text style={styles.statCardValue}>{collection.itemsCount?.toLocaleString()}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>Sold</Text>
            <Text style={styles.statCardValue}>{collection.soldCount?.toLocaleString()}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>Floor</Text>
            <Text style={styles.statCardValue} numberOfLines={1}>{collection.floorPrice}</Text>
            <Text style={styles.statCardSub}>{collection.floorUsd}</Text>
          </View>
        </View>

        <View style={styles.aboutSection}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>{collection.description || "No description available."}</Text>
        </View>

        <View style={styles.tabBar}>
          {["catalog", "activity", "owners"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tabContent}>
          {activeTab === "catalog" && <CatalogTab items={catalogItems} />}
          {activeTab === "activity" && <ActivityTab items={activityItems} />}
          {activeTab === "owners" && <OwnersTab items={ownerItems} />}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  errorWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    gap: 10,
  },
  errorText: {
    color: "#b91c1c",
    textAlign: "center",
    fontSize: 14,
  },
  retryBtn: {
    backgroundColor: "#111",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  hero: {
    height: 260,
    justifyContent: "space-between",
  },
  heroImage: {
    borderRadius: 0,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 56,
    marginLeft: 16,
    gap: 4,
  },
  backText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  heroBottom: {
    padding: 16,
    gap: 6,
  },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
  },
  heroTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  heroTagText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  heroMetaText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "500",
  },
  heroMetaDivider: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
  },
  heroMetaLogo: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#f96a1b",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    paddingBottom: 0,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 2,
  },
  statCardLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#aaa",
  },
  statCardValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111",
  },
  statCardSub: {
    fontSize: 10,
    color: "#aaa",
    fontStyle: "italic",
  },
  aboutSection: {
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#555",
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  tabBtnActive: {
    backgroundColor: "#111",
    borderColor: "#111",
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#444",
  },
  tabBtnTextActive: {
    color: "#fff",
  },
  tabContent: {
    paddingBottom: 24,
  },
});
