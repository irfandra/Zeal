
import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";

export default function BrandCard({ id, name, logo, image, style }) {
  const router = useRouter();

  const handlePress = () => {
    router.push(`/(tabs)/(collector)/marketplace/brand/${id}`);
  };

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <Image source={{ uri: image }} style={styles.bgImage} resizeMode="cover" />
      <View style={styles.overlay} />

      <View style={styles.footer}>
        <View style={styles.brandRow}>
          <View style={styles.logoContainer}>
            <Image source={{ uri: logo }} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.name}>{name}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    aspectRatio: 1,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  footer: {
    flex: 1,
    padding: 14,
    justifyContent: "flex-end",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: {
    width: 40,
    height: 40,
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
});