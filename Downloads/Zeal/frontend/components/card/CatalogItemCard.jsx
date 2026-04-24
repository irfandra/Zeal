
import React from "react";
import {
  TouchableOpacity,
  ImageBackground,
  Image,
  Text,
  View,
  StyleSheet,
} from "react-native";

export default function CatalogItemCard({ item, cardWidth, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.card, cardWidth ? { width: cardWidth } : styles.defaultWidth]}
      activeOpacity={0.88}
      onPress={onPress}
    >
      <ImageBackground
        source={{ uri: item.image }}
        style={styles.cardImage}
        imageStyle={styles.cardImageStyle}
      >
        <View style={styles.cardOverlay} />
        <View style={styles.cardBottom}>
          <View style={styles.brandRow}>
            {item.brandLogo && (
              <Image
                source={{ uri: item.brandLogo }}
                style={styles.brandLogo}
                resizeMode="contain"
              />
            )}
            <Text style={styles.brandName}>{item.brand}</Text>
          </View>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.itemSub}  numberOfLines={1}>{item.collection}</Text>
          <Text style={styles.itemAvail}>
            {item.available?.toLocaleString()} of {item.total?.toLocaleString()} items
          </Text>
          <View style={styles.priceRow}>
            <View style={styles.polDot} />
            <View>
              <Text style={styles.price}>{item.price}</Text>
              <Text style={styles.usd}>{item.usd}</Text>
            </View>
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  defaultWidth: { width: '47%' },
  cardImage: {
    height: 220,
    justifyContent: "flex-end",
  },
  cardImageStyle: { borderRadius: 14 },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.38)",
    borderRadius: 14,
  },
  cardBottom: { padding: 10, gap: 2 },
  brandRow: {
    flexDirection: "row", alignItems: "center",
    gap: 5, marginBottom: 2,
  },
  brandLogo: {
    width: 20, height: 20,
    borderRadius: 10, backgroundColor: "#f96a1b",
  },
  brandName:  { color: "#fff", fontSize: 11, fontWeight: "700" },
  itemName:   { color: "#fff", fontSize: 15, fontWeight: "900" },
  itemSub:    { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "500" },
  itemAvail:  { color: "rgba(255,255,255,0.6)", fontSize: 10, fontStyle: "italic", marginBottom: 4 },
  priceRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
  polDot:     { width: 14, height: 14, borderRadius: 7, backgroundColor: "#7B3FE4" },
  price:      { color: "#fff", fontSize: 12, fontWeight: "800" },
  usd:        { color: "rgba(255,255,255,0.6)", fontSize: 11, fontStyle: "italic", marginTop: 1 },
});