import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collectionService } from '@/services/collectionService';

const TAG_OPTIONS = ['Standard', 'Common', 'Rare', 'Ultra Rare', 'Limited'];

const parseParam = (value) => (Array.isArray(value) ? value[0] : value);

const isHttpUrl = (value) => {
  const safeValue = String(value || '').trim();
  if (!safeValue) {
    return true;
  }

  try {
    const parsed = new URL(safeValue);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (_error) {
    return false;
  }
};

export default function EditCollectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const collectionId = parseParam(params.collectionId);
  const initialTitle = String(parseParam(params.title) || '').trim();
  const initialSubtitle = String(parseParam(params.subtitle) || '').trim();
  const initialDescription = String(parseParam(params.description) || '').trim();
  const initialTag = String(parseParam(params.tag) || 'Rare').trim() || 'Rare';
  const initialImageRaw = parseParam(params.image);
  const initialImage = initialImageRaw
    ? decodeURIComponent(String(initialImageRaw))
    : '';
  const initialStatus = String(parseParam(params.status) || 'Draft').trim();

  const [collectionName, setCollectionName] = useState(initialTitle);
  const [category, setCategory] = useState(initialSubtitle);
  const [description, setDescription] = useState(initialDescription);
  const [imageUrl, setImageUrl] = useState(initialImage);
  const [selectedTag, setSelectedTag] = useState(
    TAG_OPTIONS.includes(initialTag) ? initialTag : 'Rare'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSave = async () => {
    const safeCollectionName = String(collectionName || '').trim();
    const safeCategory = String(category || '').trim();
    const safeDescription = String(description || '').trim();
    const safeImageUrl = String(imageUrl || '').trim();

    const nextErrors = {};

    if (!safeCollectionName) {
      nextErrors.collectionName = 'Collection name is required';
    } else if (safeCollectionName.length < 2 || safeCollectionName.length > 255) {
      nextErrors.collectionName = 'Collection name must be between 2 and 255 characters';
    }

    if (safeCategory.length > 100) {
      nextErrors.category = 'Category must not exceed 100 characters';
    }

    if (safeDescription.length > 1000) {
      nextErrors.description = 'Description must not exceed 1000 characters';
    }

    if (!isHttpUrl(safeImageUrl)) {
      nextErrors.imageUrl = 'Image URL must start with http:// or https://';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      Alert.alert('Validation Error', 'Please fix the highlighted fields.');
      return;
    }

    if (!collectionId) {
      Alert.alert('Missing Collection', 'Unable to save because collection id is missing.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedCollection = await collectionService.updateCollection({
        collectionId,
        collectionName: safeCollectionName,
        category: safeCategory,
        description: safeDescription,
        imageUrl: safeImageUrl,
        tag: selectedTag,
      });

      const nextImage = String(updatedCollection?.image || safeImageUrl || '').trim();

      router.replace({
        pathname: '/(tabs)/(creator)/collection-detail',
        params: {
          collectionId: String(collectionId),
          title: updatedCollection?.title || safeCollectionName,
          subtitle: updatedCollection?.subtitle || safeCategory || 'Product Collection',
          description: safeDescription,
          status: updatedCollection?.status || initialStatus || 'Draft',
          tag: updatedCollection?.tag || selectedTag,
          tagColor: updatedCollection?.tagColor || '',
          tagTextColor: updatedCollection?.tagTextColor || '',
          ...(nextImage ? { image: encodeURIComponent(nextImage) } : {}),
        },
      });
    } catch (error) {
      Alert.alert('Update Failed', error?.message || 'Unable to update collection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={18} color="#111" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Edit Collection</Text>
          <Text style={styles.subtitle}>Update collection details and save changes.</Text>

          <Text style={styles.label}>Collection Name *</Text>
          <TextInput
            style={[styles.input, errors.collectionName && styles.inputError]}
            value={collectionName}
            onChangeText={(value) => {
              setCollectionName(value);
              setErrors((previous) => ({ ...previous, collectionName: undefined }));
            }}
            placeholder="Collection name"
            placeholderTextColor="#999"
          />
          {!!errors.collectionName && <Text style={styles.errorText}>{errors.collectionName}</Text>}

          <Text style={styles.label}>Category</Text>
          <TextInput
            style={[styles.input, errors.category && styles.inputError]}
            value={category}
            onChangeText={(value) => {
              setCategory(value);
              setErrors((previous) => ({ ...previous, category: undefined }));
            }}
            placeholder="Collection category"
            placeholderTextColor="#999"
          />
          {!!errors.category && <Text style={styles.errorText}>{errors.category}</Text>}

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea, errors.description && styles.inputError]}
            value={description}
            onChangeText={(value) => {
              setDescription(value);
              setErrors((previous) => ({ ...previous, description: undefined }));
            }}
            placeholder="Describe this collection"
            placeholderTextColor="#999"
            multiline
            textAlignVertical="top"
          />
          {!!errors.description && <Text style={styles.errorText}>{errors.description}</Text>}

          <Text style={styles.label}>Banner Image URL</Text>
          <TextInput
            style={[styles.input, errors.imageUrl && styles.inputError]}
            value={imageUrl}
            onChangeText={(value) => {
              setImageUrl(value);
              setErrors((previous) => ({ ...previous, imageUrl: undefined }));
            }}
            placeholder="https://..."
            placeholderTextColor="#999"
            autoCapitalize="none"
          />
          {!!errors.imageUrl && <Text style={styles.errorText}>{errors.imageUrl}</Text>}

          <Text style={styles.label}>Tag</Text>
          <View style={styles.tagRow}>
            {TAG_OPTIONS.map((tagOption) => {
              const isSelected = selectedTag === tagOption;
              return (
                <TouchableOpacity
                  key={tagOption}
                  style={[styles.tagChip, isSelected && styles.tagChipActive]}
                  onPress={() => setSelectedTag(tagOption)}
                >
                  <Text style={[styles.tagChipText, isSelected && styles.tagChipTextActive]}>
                    {tagOption}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, isSubmitting && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  backText: {
    marginLeft: 2,
    fontSize: 15,
    color: '#111',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 20,
    fontSize: 13,
    color: '#666',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d8d8d8',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#222',
  },
  textArea: {
    minHeight: 110,
  },
  inputError: {
    borderColor: '#b91c1c',
  },
  errorText: {
    marginTop: 6,
    marginBottom: 4,
    fontSize: 12,
    color: '#b91c1c',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  tagChip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  tagChipActive: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  tagChipText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  tagChipTextActive: {
    color: '#fff',
  },
  saveBtn: {
    marginTop: 6,
    backgroundColor: '#111',
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
