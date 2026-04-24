import React, { useState } from 'react';
import {
  SafeAreaView, ScrollView, View, Text, StyleSheet, TouchableOpacity,
  TextInput, Switch, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const SPEC_CATEGORIES = ['Size', 'Color', 'Material', 'Year'];

export default function AddVariation() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    quantity: '',
    size: '',
    color: '',
    material: '',
    year: '',
    inStock: true,
  });
  const [selectedSpecs, setSelectedSpecs] = useState([]);
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [activeSpecCategory, setActiveSpecCategory] = useState(null);

  const handleAddSpec = (category) => {
    const value = formData[category.toLowerCase()];
    if (value && !selectedSpecs.some((s) => s.category === category)) {
      setSelectedSpecs([...selectedSpecs, { category, value }]);
      setShowSpecModal(false);
    }
  };

  const handleRemoveSpec = (category) => {
    setSelectedSpecs(selectedSpecs.filter((s) => s.category !== category));
  };

  const handleSaveVariation = () => {
    const requiredFields = ['name', 'price', 'quantity'];
    if (requiredFields.every((field) => formData[field].trim())) {

      router.push({
        pathname: '/(tabs)/(creator)/collection-detail',
        params: { newVariation: JSON.stringify(formData) },
      });
    }
  };

  const getSpecValue = (category) => {
    return formData[category.toLowerCase()] || '';
  };

  const specOptions = {
    Size: ['XS', 'S', 'M', 'L', 'XL', '25cm', '30cm', '35cm'],
    Color: ['Black', 'Brown', 'Red', 'Blue', 'Green', 'White', 'Multi'],
    Material: ['Leather', 'Canvas', 'Wool', 'Cotton', 'Silk', 'Mixed'],
    Year: Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(String),
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        {}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#111" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>New Variation</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
          {}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Variation Details</Text>

            <View style={s.formGroup}>
              <Text style={s.formLabel}>Variation Name *</Text>
              <TextInput
                style={s.formInput}
                placeholder="e.g., Hermès Birkin - Size M - Brown"
                placeholderTextColor="#aaa"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
            </View>

            <View style={s.formGroup}>
              <Text style={s.formLabel}>Description</Text>
              <TextInput
                style={[s.formInput, { minHeight: 80 }]}
                placeholder="Describe this variation..."
                placeholderTextColor="#aaa"
                multiline
                textAlignVertical="top"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
              />
            </View>
          </View>

          {}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Pricing &amp; Inventory</Text>

            <View style={s.formRow}>
              <View style={[s.formGroup, { flex: 1 }]}>
                <Text style={s.formLabel}>Price (POL) *</Text>
                <TextInput
                  style={s.formInput}
                  placeholder="0"
                  placeholderTextColor="#aaa"
                  keyboardType="decimal-pad"
                  value={formData.price}
                  onChangeText={(text) => setFormData({ ...formData, price: text })}
                />
              </View>
              <View style={[s.formGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={s.formLabel}>Quantity *</Text>
                <TextInput
                  style={s.formInput}
                  placeholder="0"
                  placeholderTextColor="#aaa"
                  keyboardType="number-pad"
                  value={formData.quantity}
                  onChangeText={(text) => setFormData({ ...formData, quantity: text })}
                />
              </View>
            </View>

            <View style={s.formGroup}>
              <View style={s.switchRow}>
                <Text style={s.formLabel}>In Stock</Text>
                <Switch
                  value={formData.inStock}
                  onValueChange={(value) => setFormData({ ...formData, inStock: value })}
                  trackColor={{ false: '#ddd', true: '#4CAF50' }}
                  thumbColor={formData.inStock ? '#fff' : '#888'}
                />
              </View>
            </View>
          </View>

          {}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Specifications</Text>

            {}
            <View style={s.selectedSpecsContainer}>
              {selectedSpecs.map((spec) => (
                <View key={spec.category} style={s.specTag}>
                  <Text style={s.specTagText}>
                    {spec.category}: {spec.value}
                  </Text>
                  <TouchableOpacity onPress={() => handleRemoveSpec(spec.category)}>
                    <Ionicons name="close-circle" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {}
            <View style={s.addSpecButtons}>
              {SPEC_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    s.addSpecBtn,
                    selectedSpecs.some((s) => s.category === category) && s.addSpecBtnActive,
                  ]}
                  onPress={() => {
                    setActiveSpecCategory(category);
                    setShowSpecModal(true);
                  }}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={16}
                    color={selectedSpecs.some((s) => s.category === category) ? '#fff' : '#111'}
                  />
                  <Text
                    style={[
                      s.addSpecBtnText,
                      selectedSpecs.some((s) => s.category === category) && s.addSpecBtnTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Summary</Text>
            <View style={s.summaryCard}>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Name</Text>
                <Text style={s.summaryValue}>{formData.name || '—'}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Price</Text>
                <Text style={s.summaryValue}>{formData.price ? `${formData.price} POL` : '—'}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Quantity</Text>
                <Text style={s.summaryValue}>{formData.quantity ? `${formData.quantity} items` : '—'}</Text>
              </View>
              <View style={[s.summaryRow, { borderBottomWidth: 0 }]}>
                <Text style={s.summaryLabel}>Specs</Text>
                <Text style={s.summaryValue}>{selectedSpecs.length} attributes</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {}
        <View style={s.footer}>
          <TouchableOpacity style={s.cancelBtn} onPress={() => router.back()}>
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              s.saveBtn,
              (!formData.name.trim() || !formData.price.trim() || !formData.quantity.trim()) && s.saveBtnDisabled,
            ]}
            disabled={!formData.name.trim() || !formData.price.trim() || !formData.quantity.trim()}
            onPress={handleSaveVariation}
          >
            <Text style={s.saveBtnText}>Save Variation</Text>
          </TouchableOpacity>
        </View>

        {}
        <Modal visible={showSpecModal} transparent animationType="slide" onRequestClose={() => setShowSpecModal(false)}>
          <SafeAreaView style={s.modalSafe}>
            <View style={s.modalContainer}>
              <View style={s.modalHeader}>
                <TouchableOpacity onPress={() => setShowSpecModal(false)}>
                  <Text style={s.modalCloseText}>Close</Text>
                </TouchableOpacity>
                <Text style={s.modalTitle}>{activeSpecCategory}</Text>
                <View style={{ width: 60 }} />
              </View>

              <FlatList
                data={specOptions[activeSpecCategory] || []}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      s.optionItem,
                      getSpecValue(activeSpecCategory) === item && s.optionItemSelected,
                    ]}
                    onPress={() => {
                      setFormData({
                        ...formData,
                        [activeSpecCategory.toLowerCase()]: item,
                      });
                      handleAddSpec(activeSpecCategory);
                    }}
                  >
                    <Text
                      style={[
                        s.optionText,
                        getSpecValue(activeSpecCategory) === item && s.optionTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                    {getSpecValue(activeSpecCategory) === item && (
                      <Ionicons name="checkmark" size={20} color="#111" />
                    )}
                  </TouchableOpacity>
                )}
                contentContainerStyle={s.specList}
              />
            </View>
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f8f8' },
  container: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e8e8e8' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111' },

  content: { flex: 1, paddingHorizontal: 16 },

  section: { marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111', marginBottom: 14 },

  formGroup: { marginBottom: 14 },
  formLabel: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 8 },
  formInput: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111', borderWidth: 1, borderColor: '#e8e8e8' },
  formRow: { flexDirection: 'row', gap: 12 },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#e8e8e8' },

  selectedSpecsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  specTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  specTagText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  addSpecButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  addSpecBtn: { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 10, paddingVertical: 12, borderWidth: 1.5, borderColor: '#ddd', gap: 6 },
  addSpecBtnActive: { backgroundColor: '#111', borderColor: '#111' },
  addSpecBtnText: { fontSize: 14, fontWeight: '600', color: '#111' },
  addSpecBtnTextActive: { color: '#fff' },

  summaryCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e8e8e8', overflow: 'hidden' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  summaryLabel: { fontSize: 14, color: '#666' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#111' },

  footer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e8e8e8', gap: 12 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#111', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#111' },
  saveBtn: { flex: 1, backgroundColor: '#111', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  modalSafe: { flex: 1, backgroundColor: '#fff' },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e8e8e8' },
  modalCloseText: { fontSize: 15, fontWeight: '600', color: '#111' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  specList: { paddingHorizontal: 16, paddingVertical: 12 },
  optionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e8e8e8' },
  optionItemSelected: { backgroundColor: '#f0f0f0', borderColor: '#111' },
  optionText: { fontSize: 15, color: '#333' },
  optionTextSelected: { fontWeight: '700', color: '#111' },
});
