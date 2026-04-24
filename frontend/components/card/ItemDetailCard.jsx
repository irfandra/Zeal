
import React, { useRef } from 'react';
import {
  TouchableOpacity,
  ImageBackground,
  Image,
  Text,
  View,
  StyleSheet,
  Animated,
} from 'react-native';

const STATUS_CONFIG = {
  'In Process': { color: '#2980B9', label: 'In Process' },
  'In Shipment': { color: '#E67E22', label: 'In Shipment' },
  'Wait for Claim': { color: '#8B5CF6', label: 'Wait for Claim' },
  Claimed: { color: '#27AE60', label: 'Claimed' },
};

export default function ItemDetailCard({
  item,
  cardWidth,
  onPress,
  showStatus = false,
  selected   = false,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  const tagColor =
    item.rarity === 'Rare'    ? '#B8860B' :
    item.rarity === 'Limited' ? '#C0392B' :
    item.tagColor             ? item.tagColor :
                                '#333';

  const tagLabel     = item.rarity ?? item.tag ?? '';
  const statusConfig = item.status ? STATUS_CONFIG[item.status] : null;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        cardWidth ? { width: cardWidth, height: cardWidth * 1.4 } : styles.halfWidth,
        selected && styles.wrapperSelected,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.card}
      >
        <ImageBackground
          source={{ uri: item.image }}
          style={styles.cardImage}
          imageStyle={styles.cardImageStyle}
        >
          <View style={styles.cardOverlay} />

          {}
          <View style={styles.topRow}>
            {}
            {showStatus && statusConfig ? (
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>{statusConfig.label}</Text>
              </View>
            ) : tagLabel ? (
              <View style={[styles.tagBadge, { backgroundColor: tagColor }]}>
                <Text style={styles.tagText}>{tagLabel}</Text>
              </View>
            ) : (
              <View />
            )}

            {}
            {selected && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </View>

          {}
          <View style={styles.cardBottom}>
            {}
            <View style={styles.brandRow}>
              {item.brandLogo && (
                <Image
                  source={{ uri: item.brandLogo }}
                  style={styles.brandLogo}
                  resizeMode="contain"
                />
              )}
              <Text style={styles.brandName} numberOfLines={1}>
                {item.brand}
              </Text>
            </View>

            {}
            {item.id && (
              <Text style={styles.itemId}>{item.id}</Text>
            )}

            {}
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name}
            </Text>

            {}
            <Text style={styles.itemSub} numberOfLines={1}>
              {item.subtitle ?? item.collection}
            </Text>

            {}
            {(item.edition ?? (item.available != null && item.total != null)) && (
              <Text style={styles.itemEdition}>
                {item.edition ?? `${item.available?.toLocaleString()} of ${item.total?.toLocaleString()} items`}
              </Text>
            )}

            {}
            {(item.price) && (
              <View style={styles.priceBox}>
                <Text style={styles.priceLabel}>
                  {showStatus ? 'Value' : 'Price'}
                </Text>
                <View style={styles.priceRow}>
                  <View style={styles.polDot} />
                  <View>
                    <Text style={styles.price}>{item.price}</Text>
                    {item.usd && (
                      <Text style={styles.usd}>{item.usd}</Text>
                    )}
                  </View>
                </View>
              </View>
            )}
          </View>
        </ImageBackground>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  halfWidth: {
    width: '47%',
    minHeight: 220,
  },
  wrapperSelected: {
    borderWidth: 2.5,
    borderColor: '#27AE60',
  },
  card: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardImage: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 220,
  },
  cardImageStyle: {
    borderRadius: 16,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 16,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
  },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    gap: 5, paddingHorizontal: 10,
    paddingVertical: 5, borderRadius: 20,
  },
  statusDot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  statusText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  tagBadge: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  tagText: { color: '#fff', fontWeight: '800', fontSize: 10 },

  checkmark: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#27AE60',
    alignItems: 'center', justifyContent: 'center',
  },
  checkmarkText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  cardBottom: { padding: 10, gap: 2 },
  brandRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 5, marginBottom: 2,
  },
  brandLogo: {
    width: 16, height: 16,
    borderRadius: 3, backgroundColor: '#f96a1b',
  },
  brandName: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10, fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6, flex: 1,
  },
  itemId: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9, fontWeight: '500',
  },
  itemName: {
    color: '#fff', fontSize: 15, fontWeight: '900',
  },
  itemSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10, fontWeight: '500',
  },
  itemEdition: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10, fontStyle: 'italic', marginBottom: 4,
  },
  priceBox: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10, padding: 8, gap: 3, marginTop: 4,
  },
  priceLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 8, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  polDot:   { width: 14, height: 14, borderRadius: 7, backgroundColor: '#7B3FE4' },
  price:    { color: '#fff', fontSize: 12, fontWeight: '800' },
  usd: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10, fontStyle: 'italic', marginTop: 1,
  },
});