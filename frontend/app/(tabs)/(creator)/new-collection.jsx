import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from "react-native";

const { width: screenWidth } = Dimensions.get("window");
const isTablet = screenWidth >= 768;

const RARITY_OPTIONS = [
  { label: "Standard",  color: "#4CAF50", textColor: "#fff" },
  { label: "Common",    color: "#90CAF9", textColor: "#fff" },
  { label: "Rare",      color: "#000000", textColor: "#fff" },
  { label: "Ultra Rare",color: "#9C27B0", textColor: "#fff" },
  { label: "Limited",   color: "#FFC107", textColor: "#111" },
];

const parseParam = (value) => (Array.isArray(value) ? value[0] : value);

const parseSetupData = (rawSetup) => {
  if (!rawSetup) return null;

  try {
    const parsed = JSON.parse(rawSetup);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return {
      collectionName: String(parsed.collectionName || "").trim(),
      category: String(parsed.category || "").trim(),
      about: String(parsed.about || "").trim(),
      imageUrl: String(parsed.imageUrl || "").trim(),
      totalItems: Number(parsed.totalItems || 0),
      rarity: String(parsed.rarity || "Rare").trim() || "Rare",
    };
  } catch (_error) {
    return null;
  }
};

const parseVariationDraftParam = (rawVariationDraft) => {
  if (!rawVariationDraft) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawVariationDraft);
    return Array.isArray(parsed) ? rawVariationDraft : null;
  } catch (_error) {
    return null;
  }
};

const isHttpUrl = (value) => {
  const safeValue = String(value || "").trim();
  if (!safeValue) {
    return true;
  }

  try {
    const parsedUrl = new URL(safeValue);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch (_error) {
    return false;
  }
};

export default function NewCollection() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const setupData = useMemo(
    () => parseSetupData(parseParam(params.setupData)),
    [params.setupData]
  );
  const variationDraftParam = useMemo(
    () => parseVariationDraftParam(parseParam(params.variationDraft)),
    [params.variationDraft]
  );

  const [collectionName, setCollectionName]     = useState(() => String(setupData?.collectionName || ""));
  const [category, setCategory]                 = useState(() => String(setupData?.category || ""));
  const [about, setAbout]                       = useState(() => String(setupData?.about || ""));
  const [imageUrl, setImageUrl]                 = useState(() => String(setupData?.imageUrl || ""));
  const [totalItems, setTotalItems]             = useState(() => {
    const parsed = Number(setupData?.totalItems);
    return Number.isInteger(parsed) && parsed > 0 ? String(parsed) : "";
  });
  const [selectedRarity, setSelectedRarity]     = useState(() => {
    const hasMatchedOption = RARITY_OPTIONS.some((option) => option.label === setupData?.rarity);
    return hasMatchedOption ? setupData.rarity : "Rare";
  });
  const [errors, setErrors]                     = useState({});

  const handleContinue = () => {
    const nextErrors = {};

    const safeName = collectionName.trim();
    const safeCategory = category.trim();
    const safeAbout = about.trim();
    const safeImageUrl = imageUrl.trim();
    const totalItemsNumber = Number(String(totalItems).replace(/[^0-9]/g, ""));

    if (!safeName) {
      nextErrors.collectionName = "Collection name is required";
    } else if (safeName.length < 2 || safeName.length > 255) {
      nextErrors.collectionName = "Collection name must be between 2 and 255 characters";
    }

    if (!safeCategory) {
      nextErrors.category = "Collection category is required";
    } else if (safeCategory.length > 100) {
      nextErrors.category = "Collection category must not exceed 100 characters";
    }

    if (safeAbout.length < 10) {
      nextErrors.about = "About the collection must be at least 10 characters";
    } else if (safeAbout.length > 1000) {
      nextErrors.about = "About the collection must not exceed 1000 characters";
    }

    if (!isHttpUrl(safeImageUrl)) {
      nextErrors.imageUrl = "Banner image URL must start with http:// or https://";
    }

    if (!Number.isInteger(totalItemsNumber) || totalItemsNumber <= 0) {
      nextErrors.totalItems = "Total produced items must be a positive number";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      Alert.alert("Validation Error", "Please complete all required fields before continuing.");
      return;
    }

    router.push({
      pathname: '/(tabs)/(creator)/new-collection-continue',
      params: {
        setupData: JSON.stringify({
          collectionName: safeName,
          category: safeCategory,
          about: safeAbout,
          imageUrl: safeImageUrl,
          totalItems: totalItemsNumber,
          rarity: selectedRarity,
        }),
        ...(variationDraftParam ? { variationDraft: variationDraftParam } : {}),
      },
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {}
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color="#111" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {}
        <Text style={styles.logo}>ZEAL</Text>

        {}
        <View style={styles.stepRow}>
          <TouchableOpacity style={styles.stepActive} activeOpacity={0.85}>
            <Text style={styles.stepActiveNumber}>1</Text>
          </TouchableOpacity>
          <View style={styles.stepActiveTextWrap}>
            <Text style={styles.stepActiveLabel}>Setup</Text>
            <Text style={styles.stepActiveLabel}>Collections</Text>
          </View>

          <TouchableOpacity
            style={styles.stepInactive}
            activeOpacity={0.85}
            onPress={handleContinue}
          >
            <Text style={styles.stepInactiveNumber}>2</Text>
          </TouchableOpacity>
          <View style={styles.stepInactiveTextWrap}>
            <Text style={styles.stepInactiveLabel}>Setup</Text>
            <Text style={styles.stepInactiveLabel}>Variations</Text>
          </View>
        </View>

        {}
        <Text style={styles.pageTitle}>Setup Collections</Text>

        {}
        <TextInput
          style={styles.input}
          placeholder="Collection Name"
          placeholderTextColor="#888"
          value={collectionName}
          onChangeText={(value) => {
            setCollectionName(value);
            setErrors((prev) => ({ ...prev, collectionName: undefined }));
          }}
        />
        {!!errors.collectionName && <Text style={styles.errorText}>{errors.collectionName}</Text>}

        {}
        <TextInput
          style={styles.input}
          placeholder="Collection Category (ex. Luxury Bags)"
          placeholderTextColor="#888"
          value={category}
          onChangeText={(value) => {
            setCategory(value);
            setErrors((prev) => ({ ...prev, category: undefined }));
          }}
        />
        {!!errors.category && <Text style={styles.errorText}>{errors.category}</Text>}

        {}
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="About the Collection"
          placeholderTextColor="#888"
          value={about}
          onChangeText={(value) => {
            setAbout(value);
            setErrors((prev) => ({ ...prev, about: undefined }));
          }}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        {!!errors.about && <Text style={styles.errorText}>{errors.about}</Text>}

        {}
        <TextInput
          style={styles.input}
          placeholder="Collection Banner Image URL (optional)"
          placeholderTextColor="#888"
          value={imageUrl}
          onChangeText={(value) => {
            setImageUrl(value);
            setErrors((prev) => ({ ...prev, imageUrl: undefined }));
          }}
        />
        {!!errors.imageUrl && <Text style={styles.errorText}>{errors.imageUrl}</Text>}

        {}
        <TextInput
          style={styles.input}
          placeholder="Total Produced Items"
          placeholderTextColor="#888"
          keyboardType="numeric"
          value={totalItems}
          onChangeText={(value) => {
            const normalized = value.replace(/[^0-9]/g, "");
            setTotalItems(normalized);
            setErrors((prev) => ({ ...prev, totalItems: undefined }));
          }}
        />
        {!!errors.totalItems && <Text style={styles.errorText}>{errors.totalItems}</Text>}

        {}
        <Text style={styles.rarityTitle}>Rarity Label*</Text>
        <Text style={styles.raritySubtitle}>
          Select label that fits with your product rarity level based on your brands product plan
          (More items produced meaning more lower the rarity level)
        </Text>

        <View style={styles.rarityRow}>
          {RARITY_OPTIONS.map((option) => {
            const isSelected = selectedRarity === option.label;
            return (
              <TouchableOpacity
                key={option.label}
                style={[
                  styles.rarityChip,
                  { backgroundColor: option.color },
                  !isSelected && styles.rarityChipUnselected,
                  isSelected && styles.rarityChipSelected,
                  isSelected && {
                    borderColor: option.textColor === "#fff" ? "rgba(255,255,255,0.95)" : "#111",
                  },
                ]}
                onPress={() => setSelectedRarity(option.label)}
              >
                <View
                  style={[
                    styles.rarityDot,
                    { backgroundColor: option.textColor },
                    isSelected && {
                      borderColor: option.textColor === "#fff" ? "#fff" : "#111",
                    },
                    isSelected && styles.rarityDotSelected,
                  ]}
                />
                <Text
                  style={[
                    styles.rarityChipText,
                    { color: option.textColor },
                    isSelected && styles.rarityChipTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {}
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingHorizontal: isTablet ? 40 : 22,
    paddingTop: 56,
    paddingBottom: 40,
  },

  backRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backText: {
    fontSize: 15,
    color: "#111",
    marginLeft: 2,
  },

  logo: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 20,
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
    gap: 10,
  },
  stepActive: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  stepActiveNumber: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  stepActiveTextWrap: {
    marginRight: 20,
  },
  stepActiveLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
    lineHeight: 17,
  },
  stepInactive: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
  },
  stepInactiveNumber: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  stepInactiveTextWrap: {},
  stepInactiveLabel: {
    fontSize: 13,
    color: "#aaa",
    lineHeight: 17,
  },

  pageTitle: {
    fontSize: isTablet ? 32 : 26,
    fontWeight: "800",
    color: "#111",
    marginBottom: 24,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 14,
    fontStyle: "italic",
    color: "#333",
    marginBottom: 14,
    backgroundColor: "#fff",
  },
  textArea: {
    height: 120,
    paddingTop: 14,
  },
  errorText: {
    marginTop: -8,
    marginBottom: 10,
    fontSize: 12,
    color: '#B91C1C',
  },

  imagePicker: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 14,
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    backgroundColor: "#fff",
  },
  imagePickerLabel: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#888",
  },

  rarityTitle: {
    fontSize: 16,
    fontWeight: "800",
    fontStyle: "italic",
    color: "#111",
    marginBottom: 6,
  },
  raritySubtitle: {
    fontSize: 12,
    color: "#444",
    lineHeight: 18,
    marginBottom: 14,
  },
  rarityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 32,
  },
  rarityChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.18)",
    gap: 6,
  },
  rarityChipUnselected: {
    opacity: 0.78,
  },
  rarityChipSelected: {
    borderWidth: 2,
    opacity: 1,
  },
  rarityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 0,
    borderColor: "transparent",
    opacity: 0.6,
  },
  rarityDotSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    opacity: 1,
  },
  rarityChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  rarityChipTextSelected: {
    fontWeight: "800",
  },

  continueButton: {
    backgroundColor: "#000",
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  button: {
    marginTop: 32,
    backgroundColor: '#111',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
});
