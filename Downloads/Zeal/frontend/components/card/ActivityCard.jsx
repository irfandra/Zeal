
import React from "react";
import { View, Text, StyleSheet } from "react-native";

const TYPE_CONFIG = {
  Sale:     { color: "#27AE60", label: "Sale" },
  Mint:     { color: "#2980B9", label: "Mint" },
  Transfer: { color: "#888",    label: "Transfer" },
};

export default function ActivityCard({ item }) {
  const config = TYPE_CONFIG[item.type] ?? { color: "#888", label: item.type };

  return (
    <View style={styles.row}>

      {}
      <View style={[styles.typeBadge, { backgroundColor: config.color }]}>
        <Text style={styles.typeText}>{config.label}</Text>
      </View>

      {}
      <View style={styles.middle}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.itemId}>{item.itemId}</Text>
        <View style={styles.addressRow}>
          <Text style={styles.address} numberOfLines={1}>{item.from}</Text>
          <Text style={styles.addressArrow}>→</Text>
          <Text style={styles.address} numberOfLines={1}>{item.to}</Text>
        </View>
      </View>

      {}
      <View style={styles.right}>
        <Text style={styles.price} numberOfLines={1}>{item.price}</Text>
        <Text style={styles.time}>{item.time}</Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    gap: 10,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 64,
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 2,
  },
  typeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  middle: {
    flex: 1,
    gap: 3,
  },
  productName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111",
  },
  itemId: {
    fontSize: 10,
    color: "#888",
    fontWeight: "500",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  address: {
    fontSize: 10,
    color: "#666",
    flexShrink: 1,
  },
  addressArrow: {
    fontSize: 10,
    color: "#aaa",
  },
  right: {
    alignItems: "flex-end",
    gap: 3,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  price: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111",
  },
  time: {
    fontSize: 10,
    color: "#aaa",
  },
});