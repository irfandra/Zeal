import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ScrollView,
  Image,
  TextInput,
  useWindowDimensions,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import CollectionCard from "@/components/card/CollectionCard";
import BrandCategoryFilterDrawer from "@/components/filter/BrandCategoryFilterDrawer";
import LoadingPulse from "@/components/shared/loading-pulse";
import { brandService } from "@/services/brandService";
import { collectionService } from "@/services/collectionService";

const FALLBACK_BRAND_IMAGE =
  "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=60";

const readParam = (value) => (Array.isArray(value) ? value[0] : value);

const normalizeCollectionStatus = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const isCollectorVisibleCollection = (collection) => {
  const status = normalizeCollectionStatus(collection?.status);
  const isListedStatus = status === "LISTED" || status === "IN_PROCESS";
  const saleEndsInDays = Number(collection?.saleEndsInDays || 0);
  const saleEndsInSeconds = Number(collection?.saleEndsInSeconds || 0);
  const hasActiveSaleTimer = saleEndsInDays > 0 || saleEndsInSeconds > 0;
  const itemsCount = Number(collection?.itemsCount || 0);
  const hasInventoryHint = itemsCount > 0;

  return isListedStatus || hasActiveSaleTimer || hasInventoryHint;
};

export default function BrandDetail() {
  const { brandId } = useLocalSearchParams();
  const parsedBrandId = Number(readParam(brandId) || 0);
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [search, setSearch] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const [brand, setBrand] = useState(null);
  const [collections, setCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const cardWidth = (width - 48) / 2;
  const cardHeight = cardWidth * 1.4;

  const loadBrandData = useCallback(async (showInitialLoader = true) => {
    if (!Number.isFinite(parsedBrandId) || parsedBrandId <= 0) {
      setLoadError("Invalid brand id.");
      setIsLoading(false);
      return;
    }

    try {
      if (showInitialLoader) {
        setIsLoading(true);
      }

      setLoadError("");
      const [brandDetail, marketplaceData] = await Promise.all([
        brandService.getBrandById(parsedBrandId),
        collectionService.getMarketplaceHomeData(),
      ]);

      const marketplaceCollections = Array.isArray(marketplaceData?.collections)
        ? marketplaceData.collections
        : [];

      const visibleBrandCollections = marketplaceCollections
        .filter((collection) => Number(collection?.brandId) === parsedBrandId)
        .filter(isCollectorVisibleCollection);

      setBrand({
        id: parsedBrandId,
        name: brandDetail?.brandName || `Brand ${parsedBrandId}`,
        logo: brandDetail?.logo || "",
        coverImage: brandDetail?.companyBanner || brandDetail?.logo || FALLBACK_BRAND_IMAGE,
      });

      setCollections(visibleBrandCollections);
    } catch (error) {
      setBrand(null);
      setCollections([]);
      setLoadError(error?.message || "Failed to load brand data");
    } finally {
      if (showInitialLoader) {
        setIsLoading(false);
      }
      setIsRefreshing(false);
    }
  }, [parsedBrandId]);

  useEffect(() => {
    loadBrandData();
  }, [loadBrandData]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadBrandData(false);
  }, [loadBrandData]);

  const removeFilter = (label) =>
    setActiveFilters((prev) => prev.filter((entry) => entry !== label));

  const clearAllFilters = () => setActiveFilters([]);

  const categoryOptions = useMemo(() => {
    return Array.from(
      new Set(
        collections.flatMap((collection) => {
          const categories = Array.isArray(collection?.filterCategories)
            ? collection.filterCategories
            : [collection?.filterCategory || collection?.subtitle];

          return categories
            .map((entry) => String(entry || "").trim())
            .filter(Boolean);
        })
      )
    ).sort((left, right) => left.localeCompare(right));
  }, [collections]);

  useEffect(() => {
    setActiveFilters((prev) => prev.filter((entry) => categoryOptions.includes(entry)));
  }, [categoryOptions]);

  const filteredCollections = useMemo(() => {
    return collections.filter((collection) => {
      const collectionName = String(collection?.title || "").toLowerCase();
      const categories = Array.isArray(collection?.filterCategories)
        ? collection.filterCategories
        : [collection?.filterCategory || collection?.subtitle];
      const safeCategories = categories
        .map((entry) => String(entry || "").trim())
        .filter(Boolean);

      const matchesSearch = collectionName.includes(search.toLowerCase());
      if (!matchesSearch) {
        return false;
      }

      if (activeFilters.length === 0) {
        return true;
      }

      return activeFilters.some((entry) => safeCategories.includes(entry));
    });
  }, [collections, search, activeFilters]);

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <LoadingPulse label="Loading brand collections..." />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.errorWrap}>
        <Text style={styles.errorText}>{loadError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadBrandData()}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!brand) {
    return (
      <View style={styles.errorWrap}>
        <Text style={styles.errorText}>Brand not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#111" />}
      >
        <ImageBackground
          source={{ uri: brand.coverImage }}
          style={styles.hero}
          imageStyle={styles.heroImage}
        >
          <View style={styles.heroOverlay} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={18} color="#fff" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.brandIdentity}>
            <View style={styles.logoContainer}>
              <Image
                source={{ uri: brand.logo || brand.coverImage }}
                style={styles.brandLogo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandName}>{brand.name}</Text>
          </View>
        </ImageBackground>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Collections</Text>
          <TouchableOpacity
            style={[styles.filterBtn, activeFilters.length > 0 && styles.filterBtnActive]}
            onPress={() => setFilterVisible(true)}
          >
            <Ionicons
              name="options-outline"
              size={16}
              color={activeFilters.length > 0 ? "#fff" : "#111"}
            />
            <Text style={[styles.filterText, activeFilters.length > 0 && styles.filterTextActive]}>
              Filter{activeFilters.length > 0 ? ` (${activeFilters.length})` : ""}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#aaa" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search Collections"
            placeholderTextColor="#aaa"
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color="#aaa" />
            </TouchableOpacity>
          )}
        </View>

        {activeFilters.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pillsScroll}
            contentContainerStyle={styles.pillsContainer}
          >
            <TouchableOpacity style={styles.clearPill} onPress={clearAllFilters}>
              <Ionicons name="close" size={12} color="#E74C3C" />
              <Text style={styles.clearPillText}>Clear All</Text>
            </TouchableOpacity>

            {activeFilters.map((label) => (
              <TouchableOpacity
                key={label}
                style={styles.filterPill}
                onPress={() => removeFilter(label)}
              >
                <Text style={styles.filterPillLabel}>Category: </Text>
                <Text style={styles.filterPillValue}>{label}</Text>
                <Ionicons name="close" size={12} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.grid}>
          {filteredCollections.map((collection) => (
            <CollectionCard
              key={`${collection.brandId}-${collection.id}`}
              tag={collection.tag}
              brand={collection.brand}
              brandLogo={collection.brandLogo}
              name={collection.title}
              category={collection.subtitle}
              items={collection.itemsCount}
              sold={collection.soldCount}
              floorPrice={collection.floorPrice}
              floorUsd={collection.floorUsd}
              image={collection.image}
              saleEndsInDays={collection.saleEndsInDays}
              saleEndsInSeconds={collection.saleEndsInSeconds}
              style={{ width: cardWidth, height: cardHeight }}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/(collector)/marketplace/collection/[id]",
                  params: {
                    id: String(collection.id),
                    brandId: String(collection.brandId),
                    name: collection.title,
                    brand: collection.brand,
                    category: collection.subtitle,
                  },
                })
              }
            />
          ))}

          {filteredCollections.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={36} color="#ddd" />
              <Text style={styles.emptyText}>No collection yet for this brand</Text>
              {activeFilters.length > 0 && (
                <TouchableOpacity onPress={clearAllFilters}>
                  <Text style={styles.emptyAction}>Clear filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <BrandCategoryFilterDrawer
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={setActiveFilters}
        selected={activeFilters}
        categories={categoryOptions}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },

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

  hero: { height: 280, justifyContent: "space-between" },
  heroImage: { borderRadius: 0 },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  backBtn: {
    flexDirection: "row", alignItems: "center",
    marginTop: 56, marginLeft: 16, gap: 4,
  },
  backText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  brandIdentity: {
    flexDirection: "row", alignItems: "center",
    gap: 14, paddingHorizontal: 20, paddingBottom: 24,
  },
  logoContainer: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#fff", alignItems: "center",
    justifyContent: "center", overflow: "hidden",
  },
  brandLogo: { width: 44, height: 44 },
  brandName: {
    fontSize: 32, fontWeight: "900",
    color: "#fff", letterSpacing: -0.5,
  },

  sectionHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4,
  },
  sectionTitle: { fontSize: 26, fontWeight: "900", color: "#111" },
  filterBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1.5,
    borderColor: "#ddd", backgroundColor: "#fff",
  },
  filterBtnActive: { backgroundColor: "#111", borderColor: "#111" },
  filterText: { fontSize: 13, fontWeight: "600", color: "#111" },
  filterTextActive: { color: "#fff" },

  searchBar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 12,
    marginHorizontal: 16, marginVertical: 10,
    paddingHorizontal: 14, height: 46,
    borderWidth: 1, borderColor: "#e8e8e8", gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111" },

  pillsScroll: { marginHorizontal: 16, marginBottom: 10 },
  pillsContainer: { gap: 8, paddingRight: 16, alignItems: "center" },
  filterPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#111", paddingHorizontal: 12,
    paddingVertical: 8, borderRadius: 20,
  },
  filterPillLabel: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "500" },
  filterPillValue: { color: "#fff", fontSize: 12, fontWeight: "700" },
  clearPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#FEF2F2", paddingHorizontal: 12,
    paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: "#FECACA",
  },
  clearPillText: { color: "#E74C3C", fontSize: 12, fontWeight: "600" },

  grid: {
    flexDirection: "row", flexWrap: "wrap",
    gap: 12, paddingHorizontal: 16,
  },
  emptyState: {
    width: "100%", paddingVertical: 40,
    alignItems: "center", gap: 8,
  },
  emptyText: { fontSize: 14, color: "#aaa", fontWeight: "600" },
  emptyAction: { fontSize: 13, color: "#2980B9", fontWeight: "600", marginTop: 4 },
});
