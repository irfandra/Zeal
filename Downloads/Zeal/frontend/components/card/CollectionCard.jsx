
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Animated,
  Image,
} from "react-native";

function useCountdown(totalSeconds) {
  const [seconds, setSeconds] = useState(totalSeconds);
  useEffect(() => {
    if (!totalSeconds) return;
    const interval = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [totalSeconds]);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function CollectionCard({
  tag,
  brand,
  brandLogo,
  name,
  category,
  items,
  sold,
  floorPrice,
  floorUsd,
  image,
  saleEndsInDays,
  saleEndsInSeconds,
  style,
  onPress,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const countdown = useCountdown(saleEndsInSeconds);

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  const tagColor =
    tag === "Rare" ? "#B8860B" : tag === "Limited" ? "#C0392B" : "#333";

  const timerLabel =
    saleEndsInSeconds != null
      ? countdown
      : saleEndsInDays != null
      ? `${saleEndsInDays}d left`
      : null;

  return (
    <Animated.View
      style={[styles.wrapper, style, { transform: [{ scale: scaleAnim }] }]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.card}
      >
        <ImageBackground
          source={{ uri: image }}
          style={styles.bg}
          imageStyle={styles.bgImage}
        >
          {}
          <View style={styles.overlay} />

          {}
          <View style={styles.topRow}>
            <View style={[styles.tagBadge, { backgroundColor: tagColor }]}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
            {timerLabel && (
              <View style={[styles.timerBadge, styles.glassSurface]}>
                <Text style={styles.timerText}>⏱ {timerLabel}</Text>
              </View>
            )}
          </View>

          {}
          <View style={styles.bottomContent}>
            {}
            <View style={styles.brandRow}>
              {brandLogo && (
                <Image
                  source={{ uri: brandLogo }}
                  style={styles.brandLogo}
                  resizeMode="contain"
                />
              )}
              <Text style={styles.brandName} numberOfLines={1}>
                {brand}
              </Text>
            </View>

            {}
            <Text style={styles.collectionName} numberOfLines={2}>
              {name}
            </Text>
            <Text style={styles.categoryText} numberOfLines={1}>
              {category}
            </Text>

            {}
            <View style={[styles.statsRow, styles.glassSurface]}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>
                  {(items ?? 0).toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>Items</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>
                  {(sold ?? 0).toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>Sold</Text>
              </View>
            </View>

            {}
            <View style={[styles.floorBox, styles.glassSurface]}>
              <Text style={styles.floorLabel}>Floor Price</Text>
              <View style={styles.floorValueRow}>
                <View style={styles.polDot} />
                <View>
                  <Text style={styles.floorAmountText}>{floorPrice}</Text>
                  {floorUsd ? (
                    <Text style={styles.floorUsdText}>{floorUsd}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  glassSurface: {
    backgroundColor: "rgba(40,40,40,0.52)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  card: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  bg: {
    flex: 1,
    justifyContent: "space-between",
  },
  bgImage: {
    borderRadius: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    gap: 4,
  },
  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tagText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 10,
  },
  timerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: "hidden",
    flexShrink: 1,
  },
  timerText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  bottomContent: {
    padding: 10,
    gap: 6,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  brandLogo: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  brandName: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    flex: 1,
  },
  collectionName: {
    fontSize: 15,
    fontWeight: "900",
    color: "#fff",
    lineHeight: 19,
  },
  categoryText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 2,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    overflow: "hidden",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 22,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 6,
  },
  statNumber: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
  },
  statLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.65)",
    fontWeight: "600",
  },
  floorBox: {
    borderRadius: 10,
    overflow: "hidden",
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 4,
  },
  floorLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  floorValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  polDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#7B3FE4",
  },
  floorAmountText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
  },
  floorUsdText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.55)",
    fontStyle: "italic",
    marginTop: 1,
  },
});