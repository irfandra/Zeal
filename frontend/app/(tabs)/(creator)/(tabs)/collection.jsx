import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import CollectionCard from "@/components/card/CollectionCard";
import { collectionService } from "@/services/collectionService";
import LoadingPulse from "@/components/shared/loading-pulse";

const { width: screenWidth } = Dimensions.get("window");
const isTablet = screenWidth >= 768;

export default function CollectionScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("All");
  const [openDraft, setOpenDraft] = useState(true);
  const [openListed, setOpenListed] = useState(true);
  const [openInProcess, setOpenInProcess] = useState(true);
  const [openExpired, setOpenExpired] = useState(true);
  const [collections, setCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const tabs = ["All", "Draft", "Listed", "In Process", "Expired"];

  const loadCollections = useCallback(async (showInitialLoader = true) => {
    try {
      if (showInitialLoader) {
        setIsLoading(true);
      }
      setLoadError("");
      const data = await collectionService.getCollectionsForCreatorHome();
      setCollections(data);
    } catch (error) {
      setCollections([]);
      setLoadError(error?.message || "Failed to load collections");
    } finally {
      if (showInitialLoader) {
        setIsLoading(false);
      }
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadCollections(false);
  }, [loadCollections]);

  function Accordion({ title, open, setOpen, data }) {
    return (
      <View style={styles.accordionContainer}>
        <TouchableOpacity
          style={styles.accordionHeader}
          activeOpacity={0.8}
          onPress={() => setOpen((prev) => !prev)}
        >
          <Text style={styles.accordionTitle}>{title}</Text>
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={22}
            color="#fff"
          />
        </TouchableOpacity>
        {open && (
          <Animated.View style={styles.accordionContent}>
            {data.length === 0 ? (
              <Text style={styles.emptyText}>No collections in this section.</Text>
            ) : (
              <>
                <View style={styles.grid}>
                  {data.map((collection) => (
                    <CollectionCard
                      key={collection.id}
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
                      style={styles.collectionCardWrapper}
                      onPress={() =>
                        router.push({
                          pathname: "/(tabs)/(creator)/collection-detail",
                          params: {
                            collectionId: collection.id,
                            title: collection.title,
                            subtitle: collection.subtitle,
                            description: collection.description,
                            status: collection.status,
                            tag: collection.tag,
                            tagColor: collection.tagColor,
                            tagTextColor: collection.tagTextColor,
                            itemsCount: String(collection.itemsCount ?? 0),
                            items: collection.items,
                            brand: collection.brand,
                            image: encodeURIComponent(collection.image),
                          },
                        })
                      }
                    />
                  ))}
                </View>
              </>
            )}
          </Animated.View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#111" />
        }
      >
        {}
        <Text style={styles.title}>Collections List</Text>
     

        {}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabs}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isLoading && (
          <View style={styles.loadingWrap}>
            <LoadingPulse label="Loading collections..." />
          </View>
        )}

        {!isLoading && !!loadError && (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{loadError}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadCollections}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && !loadError && collections.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyCollectionsText}>No collections available</Text>
          </View>
        )}

        {!isLoading && !loadError && collections.length > 0 && (
          <>
            {}
            {(activeTab === "Draft" || activeTab === "All") && (
              <Accordion
                title="Draft"
                open={openDraft}
                setOpen={setOpenDraft}
                data={collections.filter((c) => c.status === "Draft")}
              />
            )}

            {}
            {(activeTab === "Listed" || activeTab === "All") && (
              <Accordion
                title="Listed"
                open={openListed}
                setOpen={setOpenListed}
                data={collections.filter((c) => c.status === "Listed")}
              />
            )}

            {(activeTab === "In Process" || activeTab === "All") && (
              <Accordion
                title="In Process"
                open={openInProcess}
                setOpen={setOpenInProcess}
                data={collections.filter((c) => c.status === "In Process")}
              />
            )}

            {}
            {(activeTab === "Expired" || activeTab === "All") && (
              <Accordion
                title="Expired"
                open={openExpired}
                setOpen={setOpenExpired}
                data={collections.filter((c) => c.status === "Expired")}
              />
            )}
          </>
        )}
      </ScrollView>

      {}
      <TouchableOpacity
        style={styles.newCollectionButton}
        onPress={() => router.push("/(tabs)/(creator)/new-collection")}
      >
        <Text style={styles.newCollectionButtonText}>+ New Collection</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    backgroundColor: "#fff",
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: isTablet ? 32 : 16,
    paddingTop: isTablet ? 12 : 8,
    paddingBottom: isTablet ? 112 : 92,
    backgroundColor: "#fff",
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: isTablet ? 32 : 16,
    paddingTop: 60,
    paddingBottom: isTablet ? 100 : 80,
  },
  title: {
    fontSize: isTablet ? 36 : 28,
    marginTop: 0,
    fontWeight: "600",
    marginBottom: 4,
  },
  brandCaption: {
    fontSize: 13,
    color: "#666",
    marginBottom: 6,
  },
  tabsScroll: {
    marginTop: 12,
    marginBottom: 16,
  },
  tabs: {
    flexDirection: "row",
    gap: 6,
    paddingRight: 6,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: isTablet ? 130 : 102,
    borderWidth: 1,
    borderColor: "#bbb",
    borderRadius: 20,
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  tabText: {
    fontSize: isTablet ? 13 : 11,
    color: "#333",
  },
  activeText: {
    color: "#fff",
    fontWeight: "600",
  },
  loadingWrap: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#333",
  },
  errorWrap: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: "#b91c1c",
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: "#111",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyWrap: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCollectionsText: {
    fontSize: 13,
    color: "#666",
  },
  card: {
    width: "48%",
    marginBottom: 16,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#4a4a4a",
    aspectRatio: 0.72,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 8,
  },
  cardBg: {
    flex: 1,
    justifyContent: "space-between",
  },
  cardBgImage: {
    resizeMode: "cover",
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.36)",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 10,
    gap: 6,
  },
  tag: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "800",
  },
  timerWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexShrink: 1,
    maxWidth: "58%",
    gap: 4,
  },
  timerText: {
    color: "#fff",
    fontSize: 11,
    flexShrink: 1,
  },
  cardContent: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 7,
  },
  cardBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  brandCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
    overflow: "hidden",
  },
  brandDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ff8c24",
  },
  brandLogo: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  cardBrandName: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    flex: 1,
  },
  cardName: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 21,
  },
  cardCollection: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 9,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(255,255,255,0.21)",
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statNumber: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  statLabel: {
    marginTop: 2,
    color: "#fff",
    fontSize: 8,
    fontWeight: "700",
  },
  floorBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(255,255,255,0.21)",
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  floorLabel: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    marginBottom: 6,
  },
  accordionContainer: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: "hidden",
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#000",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  accordionContent: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 13,
    color: "#999",
    paddingVertical: 12,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  collectionCardWrapper: {
    width: "48%",
    height: isTablet ? 320 : 280,
    marginBottom: 12,
  },
  cardPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  polDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#7B3FE4",
    justifyContent: "center",
    alignItems: "center",
  },
  cardPriceToken: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  cardPriceAmount: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  floorUsd: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 10,
    fontStyle: "italic",
  },
  tabletRow: {
    justifyContent: "space-between",
    marginBottom: 24,
  },
  newCollectionButton: {
    position: "absolute",
    bottom: isTablet ? 40 : 20,
    right: isTablet ? 40 : 20,
    backgroundColor: "#000000",
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  newCollectionButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: isTablet ? 20 : 16,
  },
});
