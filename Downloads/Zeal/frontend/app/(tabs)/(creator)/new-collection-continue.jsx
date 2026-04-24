import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Dimensions, FlatList, SafeAreaView, ScrollView, View, Text, StyleSheet, TouchableOpacity,
  TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collectionService } from '@/services/collectionService';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

const parseParam = (value) => (Array.isArray(value) ? value[0] : value);
const parseNumber = (value) => {
  const parsed = Number(String(value || '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : NaN;
};

const isHttpUrl = (value) => {
  const safeValue = String(value || '').trim();
  if (!safeValue) {
    return false;
  }

  try {
    const parsedUrl = new URL(safeValue);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch (_error) {
    return false;
  }
};

const createBlankSpecification = () => ({ aspect: '', details: '' });

const normalizeSpecificationRows = (rawSpecifications) => {
  if (!Array.isArray(rawSpecifications)) {
    return [];
  }

  return rawSpecifications
    .map((row) => ({
      aspect: String(row?.aspect || row?.label || '').trim(),
      details: String(row?.details || row?.value || '').trim(),
    }))
    .filter((row) => row.aspect && row.details);
};

const parseSetupData = (rawSetup) => {
  if (!rawSetup) return null;
  try {
    const parsed = JSON.parse(rawSetup);
    if (!parsed?.collectionName) return null;
    return parsed;
  } catch (_error) {
    return null;
  }
};

const parseVariationDraft = (rawVariationDraft) => {
  if (!rawVariationDraft) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawVariationDraft);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((variation, index) => {
        const safeName = String(variation?.name || '').trim();
        const safePrice = parseNumber(variation?.price);
        const safeQuantity = parseNumber(variation?.quantity);

        return {
          id: String(variation?.id || `draft-${index}`),
          name: safeName,
          price: Number.isFinite(safePrice) ? String(safePrice) : '0',
          quantity: Number.isFinite(safeQuantity) ? Math.max(0, Math.trunc(safeQuantity)) : 0,
          description: String(variation?.description || '').trim(),
          imageUrl: String(variation?.imageUrl || '').trim(),
          specifications: normalizeSpecificationRows(variation?.specifications),
        };
      })
      .filter((variation) => variation.name);
  } catch (_error) {
    return [];
  }
};

export default function NewCollectionContinue() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const setupDataParam = parseParam(params.setupData);
  const variationDraftParam = parseParam(params.variationDraft);
  const setupData = useMemo(() => parseSetupData(setupDataParam), [setupDataParam]);
  const initialVariations = useMemo(
    () => parseVariationDraft(variationDraftParam),
    [variationDraftParam]
  );

  const [variations, setVariations] = useState(initialVariations);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    quantity: '',
    description: '',
    imageUrl: '',
    specifications: [createBlankSpecification()],
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targetItems = Number(setupData?.totalItems || 0);
  const totalVariationQuantity = variations.reduce((sum, variation) => sum + Number(variation.quantity || 0), 0);

  const navigateToSetupStep = () => {
    const setupPayload = setupData
      ? {
          collectionName: String(setupData.collectionName || '').trim(),
          category: String(setupData.category || '').trim(),
          about: String(setupData.about || '').trim(),
          imageUrl: String(setupData.imageUrl || '').trim(),
          totalItems: Number(setupData.totalItems || 0),
          rarity: String(setupData.rarity || 'Rare').trim() || 'Rare',
        }
      : null;

    const variationPayload = JSON.stringify(
      variations.map((variation) => ({
        id: variation.id,
        name: variation.name,
        price: variation.price,
        quantity: variation.quantity,
        description: variation.description,
        imageUrl: variation.imageUrl,
        specifications: variation.specifications,
      }))
    );

    router.replace({
      pathname: '/(tabs)/(creator)/new-collection',
      params: {
        ...(setupPayload ? { setupData: JSON.stringify(setupPayload) } : {}),
        ...(variations.length > 0 ? { variationDraft: variationPayload } : {}),
      },
    });
  };

  const handleAddVariation = () => {
    setEditingId(null);
    setFormData({
      name: '',
      price: '',
      quantity: '',
      description: '',
      imageUrl: '',
      specifications: [createBlankSpecification()],
    });
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleEditVariation = (variation) => {
    setEditingId(variation.id);
    setFormData({
      name: variation.name,
      price: variation.price,
      quantity: variation.quantity.toString(),
      description: variation.description,
      imageUrl: String(variation.imageUrl || ''),
      specifications:
        Array.isArray(variation.specifications) && variation.specifications.length > 0
          ? variation.specifications.map((row) => ({
              aspect: String(row?.aspect || '').trim(),
              details: String(row?.details || '').trim(),
            }))
          : [createBlankSpecification()],
    });
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleAddSpecificationRow = () => {
    setFormData((prev) => ({
      ...prev,
      specifications: [...(Array.isArray(prev.specifications) ? prev.specifications : []), createBlankSpecification()],
    }));
  };

  const handleUpdateSpecificationRow = (index, key, value) => {
    setFormData((prev) => {
      const nextRows = Array.isArray(prev.specifications)
        ? prev.specifications.map((row, rowIndex) =>
            rowIndex === index
              ? {
                  ...row,
                  [key]: value,
                }
              : row
          )
        : [createBlankSpecification()];

      return {
        ...prev,
        specifications: nextRows,
      };
    });
    setFormErrors((prev) => ({ ...prev, specifications: undefined }));
  };

  const handleRemoveSpecificationRow = (index) => {
    setFormData((prev) => {
      const existingRows = Array.isArray(prev.specifications) ? prev.specifications : [];
      const nextRows = existingRows.filter((_, rowIndex) => rowIndex !== index);

      return {
        ...prev,
        specifications: nextRows.length > 0 ? nextRows : [createBlankSpecification()],
      };
    });
  };

  const handleSaveVariation = () => {
    const nextErrors = {};
    const safeName = formData.name.trim();
    const safePrice = parseNumber(formData.price);
    const safeQuantity = parseNumber(formData.quantity);
    const safeImageUrl = formData.imageUrl.trim();
    const safeSpecificationRows = Array.isArray(formData.specifications)
      ? formData.specifications
      : [];
    const normalizedSpecifications = normalizeSpecificationRows(safeSpecificationRows);
    const hasIncompleteSpecificationRow = safeSpecificationRows.some((row) => {
      const aspect = String(row?.aspect || '').trim();
      const details = String(row?.details || '').trim();
      return (aspect && !details) || (!aspect && details);
    });

    if (!safeName) {
      nextErrors.name = 'Variation name is required';
    }
    if (!Number.isFinite(safePrice) || safePrice <= 0) {
      nextErrors.price = 'Price must be greater than 0';
    }
    if (!Number.isInteger(safeQuantity) || safeQuantity <= 0) {
      nextErrors.quantity = 'Quantity must be a positive whole number';
    }

    if (!safeImageUrl) {
      nextErrors.imageUrl = 'Variation image URL is required';
    } else if (!isHttpUrl(safeImageUrl)) {
      nextErrors.imageUrl = 'Variation image URL must start with http:// or https://';
    }

    if (normalizedSpecifications.length === 0) {
      nextErrors.specifications = 'Add at least one specification (for example: Size / 30cm)';
    } else if (hasIncompleteSpecificationRow) {
      nextErrors.specifications = 'Complete or clear any partially filled specification rows';
    }

    const duplicateName = variations.some(
      (variation) =>
        variation.id !== editingId &&
        variation.name.trim().toLowerCase() === safeName.toLowerCase()
    );

    if (duplicateName) {
      nextErrors.name = 'Variation name must be unique';
    }

    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const normalizedVariation = {
      name: safeName,
      price: String(safePrice),
      quantity: safeQuantity,
      description: formData.description.trim(),
      imageUrl: safeImageUrl,
      specifications: normalizedSpecifications,
    };

    if (editingId) {
      setVariations(
        variations.map((v) =>
          v.id === editingId
            ? { ...v, ...normalizedVariation }
            : v
        )
      );
    } else {
      setVariations([
        ...variations,
        {
          id: `${Date.now()}`,
          ...normalizedVariation,
        },
      ]);
    }

    setShowAddModal(false);
    setFormErrors({});
  };

  const handleContinue = async () => {
    if (!setupData) {
      Alert.alert('Missing Setup Data', 'Please complete collection setup first.');
      navigateToSetupStep();
      return;
    }

    if (variations.length === 0) {
      Alert.alert('Validation Error', 'Add at least one variation before continuing.');
      return;
    }

    if (totalVariationQuantity !== Number(setupData.totalItems)) {
      Alert.alert(
        'Quantity Mismatch',
        `Total variation quantity must equal ${setupData.totalItems}. Current total is ${totalVariationQuantity}.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const createdCollection = await collectionService.createCollectionWithVariations({
        collectionName: setupData.collectionName,
        category: setupData.category,
        about: setupData.about,
        imageUrl: setupData.imageUrl,
        totalItems: setupData.totalItems,
        rarity: setupData.rarity,
        variations,
      });

      const image = createdCollection.imageUrl || setupData.imageUrl || 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800';

      router.replace({
        pathname: '/(tabs)/(creator)/collection-detail',
        params: {
          collectionId: String(createdCollection.id),
          title: createdCollection.collectionName || setupData.collectionName,
          subtitle: createdCollection.season || setupData.category,
          description: createdCollection.description || setupData.about || '',
          status: 'Draft',
          tag: createdCollection.tag || setupData.rarity,
          image: encodeURIComponent(image),
        },
      });
    } catch (error) {
      Alert.alert(
        'Failed To Create Collection',
        error?.message || 'Unable to create collection. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVariation = (id) => {
    setVariations(variations.filter((v) => v.id !== id));
  };

  const ListHeader = () => (
    <>
      <TouchableOpacity style={s.backRow} onPress={navigateToSetupStep}>
        <Ionicons name="chevron-back" size={18} color="#111" />
        <Text style={s.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={s.logo}>ZEAL</Text>

      <View style={s.stepRow}>
        <TouchableOpacity
          style={s.stepInactive}
          activeOpacity={0.85}
          onPress={navigateToSetupStep}
        >
          <Text style={s.stepInactiveNumber}>1</Text>
        </TouchableOpacity>
        <View style={s.stepInactiveTextWrap}>
          <Text style={s.stepInactiveLabel}>Setup</Text>
          <Text style={s.stepInactiveLabel}>Collections</Text>
        </View>

        <TouchableOpacity style={s.stepActive} activeOpacity={0.85}>
          <Text style={s.stepActiveNumber}>2</Text>
        </TouchableOpacity>
        <View style={s.stepActiveTextWrap}>
          <Text style={s.stepActiveLabel}>Setup</Text>
          <Text style={s.stepActiveLabel}>Variations</Text>
        </View>
      </View>

      <Text style={s.pageTitle}>Setup Variations</Text>

      <View style={s.summaryRow}>
        <View style={s.summaryInfoWrap}>
          <Text style={s.summaryName} numberOfLines={1}>
            {setupData?.collectionName || 'Collection'}
          </Text>
          <Text style={s.summaryCategory} numberOfLines={1}>
            {setupData?.category || '-'}
          </Text>
          <Text style={s.summaryItems}>
            {totalVariationQuantity.toLocaleString('en-US')} / {targetItems.toLocaleString('en-US')} Items
          </Text>
        </View>
        <TouchableOpacity
          style={s.newVariationButton}
          onPress={handleAddVariation}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={s.newVariationText}>New Variation</Text>
        </TouchableOpacity>
      </View>

      <View style={s.columnLabels}>
        <Text style={[s.columnLabel, { flex: 1, marginLeft: 8 }]}>Items</Text>
        <Text style={[s.columnLabel, { flex: 1 }]}>Price</Text>
        <Text style={[s.columnLabel, { flex: 1 }]}>Qty</Text>
        <View style={s.actionHeaderSpacer} />
      </View>

      {variations.length === 0 && (
        <View style={s.emptyWrap}>
          <Text style={s.emptyText}>No variation added yet. Tap New Variation.</Text>
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={s.root}>
      <View style={s.root}>
        <FlatList
          data={variations}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
          ListHeaderComponent={ListHeader}
          renderItem={({ item }) => {
            const numericPrice = Number(item.price || 0);
            const numericQty = Number(item.quantity || 0);

            return (
              <View style={s.variationRow}>
                <View style={s.variationNameWrap}>
                  <Text style={s.variationName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.variationMetaText} numberOfLines={1}>
                    {Array.isArray(item.specifications) ? item.specifications.length : 0} specs
                  </Text>
                </View>
                <Text style={s.variationPrice} numberOfLines={1}>
                  POL {numericPrice.toLocaleString('en-US')}
                </Text>
                <Text style={s.variationQty} numberOfLines={1}>
                  {numericQty.toLocaleString('en-US')} Items
                </Text>

                <TouchableOpacity
                  style={s.editButton}
                  onPress={() => handleEditVariation(item)}
                >
                  <Ionicons name="create-outline" size={18} color="#111" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.deleteButton}
                  onPress={() => handleDeleteVariation(item.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          ListFooterComponent={<View style={{ height: 36 }} />}
        />

        <View style={s.bottomBar}>
          <TouchableOpacity
            style={[s.completeButton, (variations.length === 0 || isSubmitting) && s.completeButtonDisabled]}
            onPress={handleContinue}
            disabled={variations.length === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.completeButtonText}>Complete</Text>
            )}
          </TouchableOpacity>
        </View>

        {}
        <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
          <SafeAreaView style={s.modalSafe}>
            <View style={s.modalContainer}>
              <View style={s.modalHeader}>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Text style={s.modalCloseText}>Close</Text>
                </TouchableOpacity>
                <Text style={s.modalTitle}>{editingId ? 'Edit Variation' : 'New Variation'}</Text>
                <View style={{ width: 60 }} />
              </View>

              <ScrollView style={s.modalContent} showsVerticalScrollIndicator={false}>
                <View style={s.formGroup}>
                  <Text style={s.formLabel}>Variation Name</Text>
                  <TextInput
                    style={s.formInput}
                    placeholder="e.g., Hermès Birkin - Size M"
                    placeholderTextColor="#aaa"
                    value={formData.name}
                    onChangeText={(text) => {
                      setFormData({ ...formData, name: text });
                      setFormErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                  />
                  {!!formErrors.name && <Text style={s.errorText}>{formErrors.name}</Text>}
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

                <View style={s.formGroup}>
                  <Text style={s.formLabel}>Variation Image URL *</Text>
                  <TextInput
                    style={s.formInput}
                    placeholder="https://example.com/variation-image.jpg"
                    placeholderTextColor="#aaa"
                    autoCapitalize="none"
                    value={formData.imageUrl}
                    onChangeText={(text) => {
                      setFormData({ ...formData, imageUrl: text });
                      setFormErrors((prev) => ({ ...prev, imageUrl: undefined }));
                    }}
                  />
                  {!!formErrors.imageUrl && <Text style={s.errorText}>{formErrors.imageUrl}</Text>}
                </View>

                <View style={s.formGroup}>
                  <View style={s.specificationHeaderRow}>
                    <Text style={s.formLabel}>Specification *</Text>
                    <TouchableOpacity style={s.newSpecificationBtn} onPress={handleAddSpecificationRow}>
                      <Ionicons name="add" size={15} color="#fff" />
                      <Text style={s.newSpecificationBtnText}>New Specification</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={s.specificationColumnHeaderRow}>
                    <Text style={[s.specificationColumnHeaderText, { flex: 1 }]}>Aspect</Text>
                    <Text style={[s.specificationColumnHeaderText, { flex: 1 }]}>Details</Text>
                    <View style={s.specificationActionSpacer} />
                  </View>

                  <View style={s.specificationRowsWrap}>
                    {(Array.isArray(formData.specifications) ? formData.specifications : []).map((row, index) => (
                      <View key={`spec-${index}`} style={s.specificationInputRow}>
                        <TextInput
                          style={[s.formInput, s.specificationInput]}
                          placeholder="Size / Color / Material"
                          placeholderTextColor="#aaa"
                          value={String(row?.aspect || '')}
                          onChangeText={(text) => handleUpdateSpecificationRow(index, 'aspect', text)}
                        />
                        <TextInput
                          style={[s.formInput, s.specificationInput]}
                          placeholder="30cm / Gold / Leather"
                          placeholderTextColor="#aaa"
                          value={String(row?.details || '')}
                          onChangeText={(text) => handleUpdateSpecificationRow(index, 'details', text)}
                        />
                        <TouchableOpacity
                          style={s.specificationDeleteBtn}
                          onPress={() => handleRemoveSpecificationRow(index)}
                        >
                          <Ionicons name="close" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>

                  {!!formErrors.specifications && <Text style={s.errorText}>{formErrors.specifications}</Text>}
                </View>

                <View style={s.formRow}>
                  <View style={[s.formGroup, { flex: 1 }]}>
                    <Text style={s.formLabel}>Price (POL)</Text>
                    <TextInput
                      style={s.formInput}
                      placeholder="0"
                      placeholderTextColor="#aaa"
                      keyboardType="decimal-pad"
                      value={formData.price}
                      onChangeText={(text) => {
                        const normalized = text.replace(/[^0-9.]/g, '');
                        setFormData({ ...formData, price: normalized });
                        setFormErrors((prev) => ({ ...prev, price: undefined }));
                      }}
                    />
                    {!!formErrors.price && <Text style={s.errorText}>{formErrors.price}</Text>}
                  </View>
                  <View style={[s.formGroup, { flex: 1, marginLeft: 12 }]}>
                    <Text style={s.formLabel}>Quantity</Text>
                    <TextInput
                      style={s.formInput}
                      placeholder="0"
                      placeholderTextColor="#aaa"
                      keyboardType="number-pad"
                      value={formData.quantity}
                      onChangeText={(text) => {
                        const normalized = text.replace(/[^0-9]/g, '');
                        setFormData({ ...formData, quantity: normalized });
                        setFormErrors((prev) => ({ ...prev, quantity: undefined }));
                      }}
                    />
                    {!!formErrors.quantity && <Text style={s.errorText}>{formErrors.quantity}</Text>}
                  </View>
                </View>
              </ScrollView>

              <View style={s.modalFooter}>
                <TouchableOpacity style={s.modalCancelBtn} onPress={() => setShowAddModal(false)}>
                  <Text style={s.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.modalSaveBtn} onPress={handleSaveVariation}>
                  <Text style={s.modalSaveBtnText}>Save Variation</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingHorizontal: isTablet ? 40 : 22,
    paddingTop: 56,
    paddingBottom: 40,
  },

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backText: {
    fontSize: 15,
    color: '#111',
    marginLeft: 2,
  },

  logo: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 20,
  },

  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    gap: 10,
  },
  stepActive: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActiveNumber: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  stepActiveTextWrap: {},
  stepActiveLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111',
    lineHeight: 17,
  },
  stepInactive: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepInactiveNumber: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  stepInactiveTextWrap: {
    marginRight: 20,
  },
  stepInactiveLabel: {
    fontSize: 13,
    color: '#aaa',
    lineHeight: 17,
  },

  pageTitle: {
    fontSize: isTablet ? 32 : 26,
    fontWeight: '800',
    color: '#111',
    marginBottom: 20,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  summaryInfoWrap: {
    flex: 1,
    marginRight: 12,
  },
  summaryName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111',
  },
  summaryCategory: {
    fontSize: 13,
    color: '#333',
    marginTop: 2,
  },
  summaryItems: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },
  newVariationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
  },
  newVariationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  columnLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  columnLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111',
  },
  actionHeaderSpacer: {
    width: 88,
  },

  emptyWrap: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  emptyText: {
    fontSize: 13,
    color: '#666',
  },

  variationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  variationNameWrap: {
    flex: 1,
    paddingRight: 8,
  },
  variationName: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#111',
    fontWeight: '500',
  },
  variationMetaText: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  variationPrice: {
    flex: 1,
    fontSize: 13,
    color: '#111',
    paddingRight: 8,
  },
  variationQty: {
    flex: 1,
    fontSize: 13,
    color: '#111',
    paddingRight: 8,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  separator: {
    height: 10,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#cc0000',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },

  bottomBar: {
    paddingHorizontal: isTablet ? 40 : 22,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  completeButton: {
    backgroundColor: '#000',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonDisabled: {
    opacity: 0.5,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  modalSafe: { flex: 1, backgroundColor: '#fff' },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e8e8e8' },
  modalCloseText: { fontSize: 15, fontWeight: '600', color: '#111' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  modalContent: { flex: 1, paddingHorizontal: 16, paddingVertical: 16 },
  formGroup: { marginBottom: 18 },
  formLabel: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 8 },
  formInput: { backgroundColor: '#f8f8f8', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111', borderWidth: 1, borderColor: '#e8e8e8' },
  specificationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  newSpecificationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  newSpecificationBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  specificationColumnHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  specificationColumnHeaderText: {
    fontSize: 12,
    color: '#444',
    fontWeight: '600',
  },
  specificationActionSpacer: {
    width: 36,
  },
  specificationRowsWrap: {
    gap: 8,
  },
  specificationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  specificationInput: {
    flex: 1,
    marginBottom: 0,
  },
  specificationDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#cc0000',
  },
  errorText: { marginTop: 6, fontSize: 12, color: '#B91C1C' },
  formRow: { flexDirection: 'row', gap: 12 },
  modalFooter: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#f8f8f8', borderTopWidth: 1, borderTopColor: '#e8e8e8', gap: 12 },
  modalCancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#111', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  modalCancelBtnText: { fontSize: 15, fontWeight: '700', color: '#111' },
  modalSaveBtn: { flex: 1, backgroundColor: '#111', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  modalSaveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
