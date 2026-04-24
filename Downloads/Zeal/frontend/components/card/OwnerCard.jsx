
import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

export default function OwnerCard({ owner, rank }) {
  const address = owner?.address || owner?.id || "Unknown";
  const items = owner?.items ?? owner?.count ?? 0;
  const avatarUri = owner?.image || "";

  return (
    <View style={styles.row}>
      <Text style={styles.rank}>#{rank}</Text>
      {avatarUri ? (
        <Image source={{ uri: avatarUri }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarFallbackText}>{String(address).slice(0, 1).toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.address}>{address}</Text>
      <View style={styles.itemsBadge}>
        <Text style={styles.itemsText}>{items} items</Text>
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
  rank: {
    fontSize: 12,
    fontWeight: "800",
    color: "#aaa",
    width: 28,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#ddd",
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#555",
  },
  address: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#111",
  },
  itemsBadge: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  itemsText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#555",
  },
});