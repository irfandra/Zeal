
import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, ScrollView, Pressable, Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const DRAWER_WIDTH = width * 0.82;

export const SPEC_FILTERS = [
  {
    id: "color",
    label: "Color",
    options: ["Black", "Brown", "Red", "Blue", "White"],
  },
  {
    id: "straps_color",
    label: "Straps Color",
    options: ["Gold", "Silver", "Black"],
  },
  {
    id: "size",
    label: "Size",
    options: ["25cm", "30cm", "35cm", "40cm"],
  },
];

export default function ItemSpecFilterDrawer({ visible, onClose, onApply, selected }) {
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const [localSelected, setLocalSelected] = useState(selected ?? {});
  const [expanded, setExpanded]           = useState({});

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : DRAWER_WIDTH,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  useEffect(() => {
    setLocalSelected(selected ?? {});
  }, [selected]);

  const toggleExpand = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggleOption = (specId, option) => {
    setLocalSelected((prev) => {
      const current = prev[specId] ?? [];
      const next    = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return { ...prev, [specId]: next };
    });
  };

  const selectAllSpec = () => setLocalSelected({});

  const isOptionSelected = (specId, option) =>
    (localSelected[specId] ?? []).includes(option);

  const isAllSelected = Object.values(localSelected).every((v) => v.length === 0);

  const totalSelected = Object.values(localSelected).reduce(
    (sum, arr) => sum + arr.length, 0
  );

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
            <Text style={styles.drawerTitle}>Items{'\n'}Specification</Text>
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
              style={styles.specGroupHeader}
              onPress={selectAllSpec}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, isAllSelected && styles.checkboxActive]}>
                {isAllSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.specGroupLabel}>All Specification</Text>
            </TouchableOpacity>

            {}
            {SPEC_FILTERS.map((spec) => {
              const isOpen         = expanded[spec.id];
              const selectedCount  = (localSelected[spec.id] ?? []).length;
              const groupSelected  = selectedCount > 0;

              return (
                <View key={spec.id}>
                  {}
                  <TouchableOpacity
                    style={styles.specGroupHeader}
                    onPress={() => toggleExpand(spec.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, groupSelected && styles.checkboxActive]}>
                      {groupSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <Text style={styles.specGroupLabel}>{spec.label}</Text>
                    {selectedCount > 0 && (
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{selectedCount}</Text>
                      </View>
                    )}
                    <Ionicons
                      name={isOpen ? "chevron-up" : "chevron-down"}
                      size={16}
                      color="#888"
                      style={{ marginLeft: 'auto' }}
                    />
                  </TouchableOpacity>

                  {}
                  {isOpen && spec.options.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.optionRow}
                      onPress={() => toggleOption(spec.id, option)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.checkboxSmall,
                        isOptionSelected(spec.id, option) && styles.checkboxActive,
                      ]}>
                        {isOptionSelected(spec.id, option) && (
                          <Ionicons name="checkmark" size={11} color="#fff" />
                        )}
                      </View>
                      <Text style={styles.optionLabel}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })}

          </ScrollView>

          {}
          <View style={styles.drawerFooter}>
            {totalSelected > 0 && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={selectAllSpec}
              >
                <Text style={styles.clearBtnText}>Clear All ({totalSelected})</Text>
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
  root:    { flex: 1, backgroundColor: 'transparent' },
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
    fontSize: 24, fontWeight: "900", color: "#111", lineHeight: 30,
  },
  drawerScroll: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },

  specGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 14,
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    marginTop: 8,
  },
  specGroupLabel: { fontSize: 15, fontWeight: "700", color: "#111", flex: 1 },

  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 14,
  },
  optionLabel: { fontSize: 14, color: "#333", fontWeight: "500" },

  checkbox: {
    width: 24, height: 24, borderRadius: 8,
    borderWidth: 1.5, borderColor: "#ccc",
    backgroundColor: "#e8e8e8",
    alignItems: "center", justifyContent: "center",
  },
  checkboxSmall: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 1.5, borderColor: "#ccc",
    backgroundColor: "#e8e8e8",
    alignItems: "center", justifyContent: "center",
  },
  checkboxActive: { backgroundColor: "#111", borderColor: "#111" },

  countBadge: {
    backgroundColor: '#111', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  countBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  drawerFooter: {
    padding: 20, gap: 10,
    borderTopWidth: 1, borderTopColor: "#f0f0f0",
  },
  clearBtn: {
    borderRadius: 14, paddingVertical: 12,
    alignItems: "center", borderWidth: 1.5, borderColor: '#ddd',
  },
  clearBtnText: { color: '#111', fontSize: 14, fontWeight: '700' },
  applyBtn: {
    backgroundColor: "#22C55E", borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  applyBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});