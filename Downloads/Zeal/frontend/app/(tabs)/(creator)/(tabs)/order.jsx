import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  Dimensions, FlatList, StyleSheet, Text,
  TouchableOpacity, View, ScrollView, RefreshControl,
} from "react-native";
import { orderService } from "@/services/orderService";
import LoadingPulse from "@/components/shared/loading-pulse";

const { width: screenWidth } = Dimensions.get("window");
const isTablet = screenWidth >= 768;

function getButtonStyle(actionLabel) {
  switch (actionLabel) {
    case "Ship":                return { bg: "#111", text: "#fff" };
    case "Mark Arrived (Demo)": return { bg: "#B45309", text: "#fff" };
    default:               return { bg: "#111", text: "#fff" };
  }
}

function getStage(actionLabel) {
  switch (actionLabel) {
    case "Ship":                return "shipment";
    case "Mark Arrived (Demo)": return "arrival";
    default:               return "process";
  }
}

function OrderItem({ order }) {
  const router = useRouter();
  const hasAction = Boolean(String(order.actionLabel || '').trim());
  const isWaitForClaim = order.status === "Wait for Claim";
  const isCompletedView = order.status === "Completed";
  const { bg, text } = getButtonStyle(order.actionLabel);

  const itemParams = {
    orderId: String(order.orderId),
    itemId: order.displayId,
    itemName: order.itemName,
    collection: order.collection,
    pol: Number(order.pol || 0).toLocaleString(),
    actionLabel: order.actionLabel,
    stage: getStage(order.actionLabel),
  };

  const handleCardPress = () => {
    router.push({
      pathname: "/(tabs)/(creator)/item-orders-dynamic",
      params: itemParams,
    });
  };

  const handleActionPress = () => {
    router.push({
      pathname: "/(tabs)/(creator)/item-orders-dynamic",
      params: itemParams,
    });
  };

  return (
    <TouchableOpacity
      style={styles.orderItemContainer}
      activeOpacity={0.85}
      onPress={handleCardPress}
    >
      {}
      <View style={styles.orderInfo}>
        <Text style={styles.orderId}>{order.displayId}</Text>
        <Text style={styles.orderItemName}>{order.itemName}</Text>
        <Text style={styles.orderCollection}>{order.collection}</Text>
      </View>

      {}
      <View style={styles.orderPolWrap}>
        <View style={styles.orderPolIcon}>
          <Ionicons name="link" size={14} color="#fff" />
        </View>
        <Text style={styles.orderPolLabel}>POL</Text>
        <Text style={styles.orderPolValue}>{Number(order.pol || 0).toLocaleString()}</Text>
      </View>

      {}
      {isWaitForClaim && (
        <View style={styles.orderActionTextWrap}>
          <Text style={styles.orderActionPassiveText}>Wait for Claim</Text>
        </View>
      )}

      {hasAction && isCompletedView && (
        <TouchableOpacity
          style={styles.orderActionIconButton}
          onPress={handleActionPress}
          activeOpacity={0.8}
        >
          <Ionicons name="eye-outline" size={18} color="#fff" />
        </TouchableOpacity>
      )}

      {hasAction && !isWaitForClaim && !isCompletedView && (
        <TouchableOpacity
          style={[styles.orderActionButton, { backgroundColor: bg }]}
          onPress={handleActionPress}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.orderActionButtonText, { color: text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {order.actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export default function OrderScreen() {
  const [activeTab, setActiveTab]       = useState("All");
  const [openInProcess, setOpenInProcess]   = useState(true);
  const [openInShipment, setOpenInShipment] = useState(true);
  const [openWaitClaim, setOpenWaitClaim] = useState(true);
  const [openCompleted, setOpenCompleted] = useState(true);
  const [orders, setOrders]             = useState([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError]       = useState("");

  const tabs = ["All", "In Process", "In Shipment", "Wait for Claim", "Completed"];

  const loadOrders = useCallback(async (showInitialLoader = true) => {
    try {
      if (showInitialLoader) {
        setIsLoading(true);
      }
      setLoadError("");
      const data = await orderService.getCreatorOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      setOrders([]);
      setLoadError(error?.message || "Failed to load orders");
    } finally {
      if (showInitialLoader) {
        setIsLoading(false);
      }
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadOrders(false);
  }, [loadOrders]);

  function renderSection(title, open, setOpen, data) {
    return (
      <View style={styles.accordionContainer} key={title}>
        <TouchableOpacity
          style={styles.accordionHeader}
          activeOpacity={0.8}
          onPress={() => setOpen((prev) => !prev)}
        >
          <Text style={styles.accordionTitle}>{title}</Text>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={22} color="#fff" />
        </TouchableOpacity>

        {open && (
          <View style={styles.accordionContent}>
            <View style={styles.columnLabels}>
              <Text style={[styles.columnLabel, { flex: 1 }]}>Items</Text>
              <Text style={[styles.columnLabel, { marginRight: 40 }]}>Value</Text>
              <Text style={[styles.columnLabel, { marginRight: 8 }]}>Action</Text>
            </View>
            {data.length === 0 ? (
              <Text style={styles.emptyText}>No orders in this section.</Text>
            ) : (
              data.map((item) => (
                <OrderItem key={item.orderId} order={item} />
              ))
            )}
          </View>
        )}
      </View>
    );
  }

  const ListHeader = () => (
    <>
      <Text style={styles.title}>Orders</Text>
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
            <Text style={[styles.tabText, activeTab === tab && styles.activeText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading && (
        <View style={styles.loadingWrap}>
          <LoadingPulse label="Loading orders..." />
        </View>
      )}

      {!isLoading && !!loadError && (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      )}
    </>
  );

  const ListFooter = () => (
    <>
      {!isLoading && !loadError && (
        <>
      {(activeTab === "All" || activeTab === "In Process") &&
        renderSection("In Process", openInProcess, setOpenInProcess,
          orders.filter((o) => o.status === "In Process"))}
      {(activeTab === "All" || activeTab === "In Shipment") &&
        renderSection("In Shipment", openInShipment, setOpenInShipment,
          orders.filter((o) => o.status === "In Shipment"))}
      {(activeTab === "All" || activeTab === "Wait for Claim") &&
        renderSection("Wait for Claim", openWaitClaim, setOpenWaitClaim,
          orders.filter((o) => o.status === "Wait for Claim"))}
      {(activeTab === "All" || activeTab === "Completed") &&
        renderSection("Completed", openCompleted, setOpenCompleted,
          orders.filter((o) => o.status === "Completed"))}
        </>
      )}
    </>
  );

  return (
    <FlatList
      data={[]}
      keyExtractor={() => ""}
      style={styles.screen}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      ListHeaderComponent={ListHeader}
      ListFooterComponent={ListFooter}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#111" />
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingHorizontal: isTablet ? 32 : 16,
    paddingTop: isTablet ? 12 : 8,
    paddingBottom: 100,
    backgroundColor: "#fff",
  },

  title: { fontSize: isTablet ? 36 : 28, fontWeight: "600", marginTop: 0, marginBottom: 4 },
  loadingWrap: { alignItems: "center", justifyContent: "center", marginTop: 30, gap: 8 },
  loadingText: { fontSize: 13, color: "#555" },
  errorWrap: { marginTop: 20, alignItems: "center", paddingHorizontal: 20 },
  errorText: { color: "#b91c1c", fontSize: 12, textAlign: "center" },

  columnLabels: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#e0e0e0", marginBottom: 6 },
  columnLabel: { fontSize: 13, fontWeight: "700", fontStyle: "italic", color: "#222" },

  tabsScroll: { marginTop: 12, marginBottom: 16 },
  tabs: { flexDirection: "row", gap: 6, paddingRight: 6 },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: isTablet ? 130 : 102,
    borderWidth: 1,
    borderColor: "#bbb",
    borderRadius: 20,
    alignItems: "center",
  },
  activeTab: { backgroundColor: "#000", borderColor: "#000" },
  tabText: { fontSize: isTablet ? 13 : 11, color: "#333" },
  activeText: { color: "#fff", fontWeight: "600" },

  accordionContainer: { marginBottom: 10, borderRadius: 12, overflow: "hidden" },
  accordionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#000", paddingHorizontal: 16, paddingVertical: 14 },
  accordionTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  accordionContent: { backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 8 },
  emptyText: { fontSize: 13, color: "#999", paddingVertical: 12, textAlign: "center" },

  orderItemContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#e8e8e8", borderRadius: 12, paddingVertical: 14, paddingLeft: 14, paddingRight: 0, marginBottom: 10, overflow: "hidden" },
  orderInfo: { flex: 1 },
  orderId: { fontSize: 11, color: "#666", marginBottom: 2 },
  orderItemName: { fontSize: 14, fontWeight: "700", color: "#111" },
  orderCollection: { fontSize: 12, color: "#555", marginTop: 2 },

  orderPolWrap: { flexDirection: "row", alignItems: "center", marginHorizontal: 10 },
  orderPolIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#8a3ffc", alignItems: "center", justifyContent: "center", marginRight: 5 },
  orderPolLabel: { fontSize: 13, fontWeight: "700", color: "#222", marginRight: 4 },
  orderPolValue: { fontSize: 13, color: "#222" },

  orderActionTextWrap: {
    width: 100,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    paddingHorizontal: 6,
  },
  orderActionPassiveText: {
    fontSize: 12,
    color: "#444",
    fontWeight: "600",
    textAlign: "center",
  },
  orderActionIconButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  orderActionButton: { width: 100, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 8 },
  orderActionButtonText: { fontSize: 13, fontWeight: "700" },
});
