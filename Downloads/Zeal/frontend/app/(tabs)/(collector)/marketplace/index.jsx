import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import CollectionCard from "../../../../components/card/CollectionCard";
import BrandCard from "../../../../components/card/BrandCard";
import CategoryFilterDrawer from "../../../../components/filter/CategoryFilterDrawer";
import LoadingPulse from "../../../../components/shared/loading-pulse";
import { collectionService } from "../../../../services/collectionService";

export default function Marketplace() {
  const [activeTab, setActiveTab] = useState("Collections");
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const [search, setSearch] = useState("");
  const [collections, setCollections] = useState([]);
  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const router = useRouter();

  const loadMarketplace = useCallback(async (showInitialLoader = true) => {
    try {
      if (showInitialLoader) {
        setIsLoading(true);
      }

      setLoadError("");
      const data = await collectionService.getMarketplaceHomeData();
      setCollections(Array.isArray(data?.collections) ? data.collections : []);
      setBrands(Array.isArray(data?.brands) ? data.brands : []);
    } catch (error) {
      setCollections([]);
      setBrands([]);
      setLoadError(error?.message || "Failed to load marketplace data");
    } finally {
      if (showInitialLoader) {
        setIsLoading(false);
      }
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMarketplace();
  }, [loadMarketplace]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadMarketplace(false);
  }, [loadMarketplace]);

  const removeFilter = (label) =>
    setActiveFilters((prev) => prev.filter((f) => f !== label));

  const collectionCategoryOptions = useMemo(() => {
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

  const brandCategoryOptions = useMemo(() => {
    return Array.from(
      new Set(
        brands
          .map((brand) => String(brand?.category || "").trim())
          .filter(Boolean)
      )
    ).sort((left, right) => left.localeCompare(right));
  }, [brands]);

  const activeCategoryOptions =
    activeTab === "Collections" ? collectionCategoryOptions : brandCategoryOptions;

  useEffect(() => {
    setActiveFilters((prev) =>
      prev.filter((entry) => activeCategoryOptions.includes(entry))
    );
  }, [activeCategoryOptions]);

  const filteredCollections = useMemo(() => {
    return collections.filter((collection) => {
      const title = String(collection?.title || "").toLowerCase();
      const brand = String(collection?.brand || "").toLowerCase();
      const categories = Array.isArray(collection?.filterCategories)
        ? collection.filterCategories
        : [collection?.filterCategory || collection?.subtitle];
      const safeCategories = categories
        .map((entry) => String(entry || "").trim())
        .filter(Boolean);

      const matchSearch =
        title.includes(search.toLowerCase()) ||
        brand.includes(search.toLowerCase());

      const matchFilter =
        activeFilters.length === 0 ||
        activeFilters.some((filter) => safeCategories.includes(filter));

      return matchSearch && matchFilter;
    });
  }, [search, activeFilters, collections]);

  const filteredBrands = useMemo(() => {
    return brands.filter((brand) => {
      const brandName = String(brand?.name || "").toLowerCase();
      const category = String(brand?.category || "");

      const matchSearch = brandName.includes(search.toLowerCase());
      const matchFilter =
        activeFilters.length === 0 ||
        activeFilters.includes(category) ||
        activeFilters.some((filter) => category.includes(filter));

      return matchSearch && matchFilter;
    });
  }, [search, activeFilters, brands]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.header}>
        <Text style={styles.title}>Marketplace</Text>

        <View style={styles.tabContainer}>
          {["Collections", "Brands"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#888" />
            <TextInput
              placeholder={`Search ${activeTab}`}
              style={styles.searchInput}
              placeholderTextColor="#888"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, activeFilters.length > 0 && styles.filterBtnActive]}
            onPress={() => setFilterVisible(true)}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={activeFilters.length > 0 ? "#fff" : "#111"}
            />
            {activeFilters.length > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilters.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {activeFilters.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterTagsRow}
            contentContainerStyle={{ gap: 8, paddingRight: 4 }}
          >
            {activeFilters.map((filter) => (
              <TouchableOpacity key={filter} style={styles.filterTag} onPress={() => removeFilter(filter)}>
                <Text style={styles.filterTagText}>{filter}</Text>
                <Ionicons name="close" size={12} color="#fff" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <LoadingPulse label="Loading marketplace..." />
        </View>
      ) : loadError ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadMarketplace()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : activeTab === "Collections" ? (
        <CollectionTab
          router={router}
          listings={filteredCollections}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
      ) : (
        <BrandTab
          brands={filteredBrands}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
      )}

      <CategoryFilterDrawer
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={setActiveFilters}
        selected={activeFilters}
        categories={activeCategoryOptions}
      />
    </View>
  );
}

function CollectionTab({ router, listings, onRefresh, isRefreshing }) {
  const { width } = useWindowDimensions();

  const padding = 20;
  const gap = 12;
  const cardsPerRow = width < 768 ? 2 : 4;
  const totalGap = gap * (cardsPerRow - 1);
  const cardWidth = (width - padding * 2 - totalGap) / cardsPerRow;
  const cardHeight = cardWidth * 1.4;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollWrap}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#111" />}
    >
      <View style={[styles.grid, { gap, paddingHorizontal: padding }]}> 
        {listings.map((collection) => (
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
        {listings.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No collections found</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function BrandTab({ brands, onRefresh, isRefreshing }) {
  const { width } = useWindowDimensions();

  const padding = 20;
  const gap = 12;
  const cardsPerRow = width < 768 ? 2 : 4;
  const totalGap = gap * (cardsPerRow - 1);
  const cardWidth = (width - padding * 2 - totalGap) / cardsPerRow;
  const cardHeight = cardWidth * 1.1;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollWrap}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#111" />}
    >
      <View style={[styles.grid, { gap, paddingHorizontal: padding }]}> 
        {brands.map((brand) => (
          <BrandCard
            key={brand.id}
            id={brand.id}
            name={brand.name}
            logo={brand.logo}
            image={brand.image}
            style={{ width: cardWidth, height: cardHeight }}
          />
        ))}
        {brands.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No brands found</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 0,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  tabContainer: {
    flexDirection: "row",
    marginTop: 10,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  tabText: {
    fontSize: 15,
    color: "#555",
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: "#111",
  },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBtnActive: {
    backgroundColor: "#111",
  },
  filterBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
  },
  filterTagsRow: {
    marginTop: 8,
    marginBottom: 2,
  },
  filterTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  filterTagText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  scrollWrap: {
    paddingBottom: 30,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  errorText: {
    color: "#b91c1c",
    textAlign: "center",
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: "#111",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  emptyState: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: "#aaa",
    fontSize: 14,
    fontWeight: "600",
  },
});
