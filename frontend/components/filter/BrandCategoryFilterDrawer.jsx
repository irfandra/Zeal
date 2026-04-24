
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, ScrollView, Pressable, Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const DRAWER_WIDTH = width * 0.82;

export const BRAND_CATEGORIES = [
  { id: "luxury_bags",   label: "Luxury Bags"   },
  { id: "art",           label: "Art"            },
  { id: "watches",       label: "Watches"        },
  { id: "jewellery",     label: "Jewellery"      },
  { id: "sneakers",      label: "Sneakers"       },
  { id: "collectibles",  label: "Collectibles"   },
];

export default function BrandCategoryFilterDrawer({ visible, onClose, onApply, selected, categories = [] }) {
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const [localSelected, setLocalSelected] = useState(selected ?? []);

  const categoryLabels = useMemo(() => {
    const dynamicLabels = Array.isArray(categories)
      ? categories
          .map((entry) => String(entry || "").trim())
          .filter(Boolean)
      : [];

    const fallbackLabels = BRAND_CATEGORIES.map((entry) => entry.label);
    const source = dynamicLabels.length > 0 ? dynamicLabels : fallbackLabels;
    return Array.from(new Set(source));
  }, [categories]);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : DRAWER_WIDTH,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  useEffect(() => {
    const safeSelected = Array.isArray(selected)
      ? selected.filter((entry) => categoryLabels.includes(entry))
      : [];

    setLocalSelected(safeSelected);
  }, [selected, categoryLabels]);

  const toggleSelect = (label) => {
    setLocalSelected((prev) =>
      prev.includes(label)
        ? prev.filter((l) => l !== label)
        : [...prev, label]
    );
  };

  const selectAll  = () => setLocalSelected([]);
  const isAllSelected = localSelected.length === 0;

  const isSelected = (label) => localSelected.includes(label);

  const handleApply = () => {
    onApply(localSelected);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Animated.View
          style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}
        >
          {}
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Brand{'\n'}Category</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color="#111" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.drawerScroll} showsVerticalScrollIndicator={false}>

            {}
            <TouchableOpacity
              style={[styles.categoryRow, isAllSelected && styles.categoryRowActive]}
              onPress={selectAll}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, isAllSelected && styles.checkboxActive]}>
                {isAllSelected && <Ionicons name="checkmark" size={14} color="#111" />}
              </View>
              <Text style={[styles.categoryLabel, isAllSelected && styles.categoryLabelActive]}>
                All Categories
              </Text>
            </TouchableOpacity>

            {}
            {categoryLabels.map((label) => {
              const active = isSelected(label);
              return (
                <TouchableOpacity
                  key={label}
                  style={[styles.categoryRow, active && styles.categoryRowActive]}
                  onPress={() => toggleSelect(label)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, active && styles.checkboxActive]}>
                    {active && <Ionicons name="checkmark" size={14} color="#111" />}
                  </View>
                  <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}

          </ScrollView>

          {}
          <View style={styles.drawerFooter}>
            {localSelected.length > 0 && (
              <TouchableOpacity style={styles.clearBtn} onPress={selectAll}>
                <Text style={styles.clearBtnText}>
                  Clear ({localSelected.length})
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyBtnText}>Set Filter</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root:     { flex: 1, backgroundColor: 'transparent' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  drawer: {
    position: "absolute",
    right: 0, top: 0, bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: "#fff",
    paddingTop: 60,
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 20,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  drawerTitle: {
    fontSize: 24, fontWeight: "900",
    color: "#111", lineHeight: 30,
  },
  drawerScroll: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 14,
    backgroundColor: "#f0f0f0",
    borderRadius: 14,
    marginBottom: 10,
  },
  categoryRowActive:    { backgroundColor: "#111" },
  checkbox: {
    width: 24, height: 24, borderRadius: 8,
    borderWidth: 1.5, borderColor: "#ccc",
    backgroundColor: "#e0e0e0",
    alignItems: "center", justifyContent: "center",
  },
  checkboxActive:      { backgroundColor: '#fff', borderColor: '#fff' },
  categoryLabel:       { fontSize: 15, fontWeight: "600", color: "#111", flex: 1 },
  categoryLabelActive: { color: "#fff" },

  drawerFooter: {
    padding: 20, gap: 10,
    borderTopWidth: 1, borderTopColor: "#f0f0f0",
  },
  clearBtn: {
    borderRadius: 14, paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1.5, borderColor: '#ddd',
  },
  clearBtnText: { color: '#111', fontSize: 14, fontWeight: '700' },
  applyBtn: {
    backgroundColor: "#22C55E",
    borderRadius: 14, paddingVertical: 16, alignItems: "center",
  },
  applyBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});