import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  View,
  Text,
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import LoadingPulse from "@/components/shared/loading-pulse";
import { collectionService } from "@/services/collectionService";

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=60";

const parseParam = (value) => (Array.isArray(value) ? value[0] : value);

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

const PolDot = ({ size = 16 }) => (
  <View style={[styles.polDot, { width: size, height: size, borderRadius: size / 2 }]} />
);

const mapFallbackRows = (item) => {
  const available = Math.max(Number(item.available || 0), 0);
  const total = Math.max(Number(item.total || 0), 0);
  const rowCount = Math.max(Math.min(available, 4), 1);

  return Array.from({ length: rowCount }, (_, index) => ({
    id: `#${item.variantId}-${String(index + 1).padStart(2, "0")}`,
    edition: `${Math.max(total - index, 1)} / ${Math.max(total, 1)}`,
    price: item.price,
  }));
};

export default function ProductVariantDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const routeVariantId = parseParam(params.variantId);
  const routeStatus = String(parseParam(params.status) || '').trim().toUpperCase();
  const routeListingDeadline = parseParam(params.listingDeadline);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [item, setItem] = useState({
    variantId: routeVariantId || "",
    brandId: parseParam(params.brandId) || '',
    name: parseParam(params.name) || "Marketplace Item",
    collection: parseParam(params.collection) || "Collection",
    brand: parseParam(params.brand) || "Brand",
    brandLogo: parseParam(params.brandLogo) || "",
    contractAddress: parseParam(params.contractAddress) || '',
    image: parseParam(params.image) || FALLBACK_PRODUCT_IMAGE,
    price: parseParam(params.price) || "--",
    usd: parseParam(params.usd) || "",
    rarity: parseParam(params.rarity) || "Listed",
    status: routeStatus || 'LISTED',
    listingDeadline: routeListingDeadline || null,
    total: Number(parseParam(params.total) || 0),
    available: Number(parseParam(params.available) || 0),
    description: "",
  });
  const [purchaseRows, setPurchaseRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadProductDetail = useCallback(async (showInitialLoader = true) => {
    if (!routeVariantId) {
      setLoadError("Missing product id.");
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
      const data = await collectionService.getProductById(routeVariantId);

      setItem({
        variantId: data.id,
        brandId: data.brandId,
        name: data.name,
        collection: data.collection,
        brand: data.brand,
        brandLogo: parseParam(params.brandLogo) || "",
        contractAddress: data.contractAddress || '',
        image: data.image || FALLBACK_PRODUCT_IMAGE,
        price: data.priceAmount,
        usd: data.priceUsd || "",
        rarity: String(data.status || "LISTED").replace(/_/g, " "),
        status: String(data.status || 'DRAFT').trim().toUpperCase(),
        listingDeadline: data.listingDeadline || routeListingDeadline || null,
        total: Number(data.total || 0),
        available: Number(data.available || 0),
        description: data.description || "No description available.",
      });

      const mappedRows = Array.isArray(data.purchaseItems) && data.purchaseItems.length > 0
        ? data.purchaseItems.map((entry) => ({
            id: entry.id,
            edition: entry.edition,
            price: entry.price,
          }))
        : mapFallbackRows({
            variantId: data.id,
            available: data.available,
            total: data.total,
            price: data.priceAmount,
          });

      setPurchaseRows(mappedRows);
      setSelectedIndex(0);
    } catch (error) {
      setLoadError(error?.message || "Failed to load product detail");
    } finally {
      if (showInitialLoader) {
        setIsLoading(false);
      }
      setIsRefreshing(false);
    }
  }, [params.brandLogo, routeListingDeadline, routeVariantId]);

  useEffect(() => {
    loadProductDetail();
  }, [loadProductDetail]);

  const onRefresh = useCallback(() => {
    loadProductDetail(false);
  }, [loadProductDetail]);

  const selected = useMemo(() => purchaseRows[selectedIndex] || purchaseRows[0], [purchaseRows, selectedIndex]);
  const isSaleWindowOpen = isListingWindowOpen(item.listingDeadline);
  const isPurchasable = item.status === 'LISTED' && isSaleWindowOpen && Boolean(selected);

  const handleBuy = () => {
    if (item.status !== 'LISTED') {
      Alert.alert('Not Available Yet', 'This product is pre-minted but not listed yet, so it cannot be bought.');
      return;
    }

    if (!isSaleWindowOpen) {
      Alert.alert('Sale Ended', 'This collection sale window has ended, so this product can no longer be purchased.');
      return;
    }

    if (!selected) {
      return;
    }

    router.push({
      pathname: "/(tabs)/(collector)/marketplace/collection/product/checkout",
      params: {
        variantId: item.variantId,
        itemId: selected.id,
        edition: selected.edition,
        total: item.total,
        price: selected.price,
        name: item.name,
        image: item.image,
        brand: item.brand,
        brandLogo: item.brandLogo,
        collection: item.collection,
        productId: item.variantId,
        brandId: item.brandId,
        contractAddress: item.contractAddress,
        status: item.status,
        listingDeadline: item.listingDeadline,
      },
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <LoadingPulse label="Loading product item..." />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.errorWrap}>
        <Text style={styles.errorText}>{loadError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadProductDetail}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#111"
            />
          }
        >
          <ImageBackground source={{ uri: item.image }} style={styles.hero} imageStyle={styles.heroImage}>
            <View style={styles.heroOverlay} />
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={18} color="#fff" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <View style={styles.heroBottom}>
              <Text style={styles.heroTitle}>{item.name}</Text>
              <View style={styles.heroMetaRow}>
                <Text style={styles.heroMetaText}>{item.collection}</Text>
                <Text style={styles.heroMetaDivider}>|</Text>
                <Text style={styles.heroMetaText}>{item.brand}</Text>
                <Text style={styles.heroMetaDivider}>|</Text>
                <Text style={styles.heroMetaText}>{item.rarity}</Text>
              </View>
            </View>
          </ImageBackground>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.sectionText}>{item.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Product Items</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 1.3 }]}>Item ID</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>Edition</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Price</Text>
            </View>

            <View style={styles.tableBody}>
              {purchaseRows.map((row, index) => (
                <TouchableOpacity
                  key={row.id}
                  style={[
                    styles.tableRow,
                    selectedIndex === index && styles.tableRowActive,
                    index < purchaseRows.length - 1 && styles.tableRowBorder,
                  ]}
                  onPress={() => setSelectedIndex(index)}
                >
                  <Text style={[styles.tableCell, { flex: 1.3 }]}>{row.id}</Text>
                  <Text style={[styles.tableCell, { flex: 1.2 }]}>{row.edition}</Text>
                  <View style={[styles.priceCell, { flex: 1.5 }]}> 
                    <PolDot size={14} />
                    <Text style={styles.priceCellText}>POL {row.price}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {purchaseRows.length === 0 && (
                <View style={styles.emptyRowsWrap}>
                  <Text style={styles.emptyRowsText}>No product items available.</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[styles.bottomBar, !isPurchasable && styles.bottomBarDisabled]}
          onPress={handleBuy}
          activeOpacity={0.9}
          disabled={!isPurchasable}
        >
          <View>
            <Text style={styles.bottomBarTitle}>
              {item.status !== 'LISTED'
                ? 'Not Available Yet'
                : isSaleWindowOpen
                  ? 'Buy Item'
                  : 'Sale Ended'}
            </Text>
            <Text style={styles.bottomBarSub}>
              {item.status !== 'LISTED'
                ? `${item.status} product`
                : isSaleWindowOpen
                  ? (selected?.id || '-')
                  : 'Listing period ended'}
            </Text>
          </View>
          <View style={styles.bottomBarRight}>
            <PolDot size={18} />
            <Text style={styles.bottomBarPrice}>POL {selected?.price || "--"}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
  scrollContent: {
    paddingBottom: 120,
  },
  hero: {
    height: 280,
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
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroMetaText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "500",
  },
  heroMetaDivider: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
    marginBottom: 8,
  },
  sectionText: {
    color: "#555",
    fontSize: 14,
    lineHeight: 21,
  },
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tableHeaderText: {
    fontSize: 12,
    color: "#777",
    fontStyle: "italic",
    fontWeight: "700",
  },
  tableBody: {
    backgroundColor: "#f5f5f5",
    borderRadius: 14,
    padding: 8,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  tableRowBorder: {
    marginBottom: 8,
  },
  tableRowActive: {
    borderWidth: 1,
    borderColor: "#111",
  },
  tableCell: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  priceCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  priceCellText: {
    fontSize: 13,
    color: "#111",
    fontWeight: "700",
  },
  emptyRowsWrap: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyRowsText: {
    fontSize: 13,
    color: "#777",
  },
  polDot: {
    backgroundColor: "#7B3FE4",
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#111",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 30,
  },
  bottomBarDisabled: {
    opacity: 0.55,
  },
  bottomBarTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  bottomBarSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: 2,
  },
  bottomBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bottomBarPrice: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
});
