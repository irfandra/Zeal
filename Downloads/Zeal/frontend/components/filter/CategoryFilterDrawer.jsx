
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  Pressable,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const DRAWER_WIDTH = width * 0.75;

export const CATEGORIES = [
  { id: "luxury_fashion",    label: "Luxury Fashion"    },
  { id: "collectible_cards", label: "Collectible Cards" },
  { id: "sneakers",          label: "Sneakers"          },
  { id: "paintings",         label: "Paintings"         },
  { id: "collectible_sets",  label: "Collectible Sets"  },
];

export default function CategoryFilterDrawer({ visible, onClose, onApply, selected, categories = [] }) {
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const [localSelected, setLocalSelected] = useState(selected ?? []);

  const categoryLabels = useMemo(() => {
    const dynamicLabels = Array.isArray(categories)
      ? categories
          .map((entry) => String(entry || "").trim())
          .filter(Boolean)
      : [];

    const fallbackLabels = CATEGORIES.map((entry) => entry.label);
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
    setLocalSelected((prev) => {
      const isCurrentlySelected = prev.includes(label);
      let next;

      if (isCurrentlySelected) {

        next = prev.filter((l) => l !== label);
      } else {

        next = [...prev, label];
      }

      const allChecked = categoryLabels.every((labelEntry) => next.includes(labelEntry));
      return allChecked ? categoryLabels : next;
    });
  };

  const selectAll = () => setLocalSelected([...categoryLabels]);

  const isAllSelected = categoryLabels.every((labelEntry) => localSelected.includes(labelEntry)) || localSelected.length === 0;
  const isSelected    = (label) => localSelected.includes(label) || localSelected.length === 0;

  const handleApply = () => {

    const result = isAllSelected ? [] : localSelected;
    onApply(result);
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
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Categories</Text>
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
              style={styles.categoryRow}
              onPress={selectAll}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, isAllSelected && styles.checkboxActive]}>
                {isAllSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.categoryLabel}>All Categories</Text>
            </TouchableOpacity>

            {}
            {categoryLabels.map((label) => (
              <TouchableOpacity
                key={label}
                style={styles.categoryRow}
                onPress={() => toggleSelect(label)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, isSelected(label) && styles.checkboxActive]}>
                  {isSelected(label) && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={styles.categoryLabel}>{label}</Text>
              </TouchableOpacity>
            ))}

          </ScrollView>

          <View style={styles.drawerFooter}>
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
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  drawerTitle:  { fontSize: 20, fontWeight: "800", color: "#111" },
  drawerScroll: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  categoryRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 16, gap: 14,
    borderBottomWidth: 1, borderBottomColor: "#f5f5f5",
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: "#ddd",
    backgroundColor: "#f5f5f5",
    alignItems: "center", justifyContent: "center",
  },
  checkboxActive:  { backgroundColor: "#111", borderColor: "#111" },
  categoryLabel:   { fontSize: 15, fontWeight: "600", color: "#111", flex: 1 },
  drawerFooter: {
    padding: 20, borderTopWidth: 1, borderTopColor: "#f0f0f0",
  },
  applyBtn: {
    backgroundColor: "#22C55E", borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  applyBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});