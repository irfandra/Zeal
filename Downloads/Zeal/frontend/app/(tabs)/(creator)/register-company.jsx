import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRole } from '@/components/context/RoleContext';
import { brandService } from '@/services/brandService';

const INITIAL_FORM = {
  brandName: '',
  companyEmail: '',
  companyAddress: '',
  companyWalletAddress: '',
  personInChargeName: '',
  personInChargeRole: '',
  personInChargeEmail: '',
  personInChargePhone: '',
  logo: '',
  companyBanner: '',
  statementLetterUrl: '',
  description: '',
};

const isWalletAddressValid = (value) => /^0x[a-fA-F0-9]{40}$/.test(String(value || '').trim());
const isEmailValid = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
const isPhoneValid = (value) => /^[0-9+()\-\s]{7,30}$/.test(String(value || '').trim());

const normalizeForm = (form) => ({
  brandName: String(form.brandName || '').trim(),
  companyEmail: String(form.companyEmail || '').trim(),
  companyAddress: String(form.companyAddress || '').trim(),
  companyWalletAddress: String(form.companyWalletAddress || '').trim(),
  personInChargeName: String(form.personInChargeName || '').trim(),
  personInChargeRole: String(form.personInChargeRole || '').trim(),
  personInChargeEmail: String(form.personInChargeEmail || '').trim(),
  personInChargePhone: String(form.personInChargePhone || '').trim(),
  logo: String(form.logo || '').trim(),
  companyBanner: String(form.companyBanner || '').trim(),
  statementLetterUrl: String(form.statementLetterUrl || '').trim(),
  description: String(form.description || '').trim(),
});

export default function RegisterCompanyScreen() {
  const router = useRouter();
  const { setRoleFromBackend } = useRole();
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const validateForm = (values) => {
    if (!values.brandName) {
      return 'Brand name is required.';
    }

    if (values.brandName.length < 2 || values.brandName.length > 255) {
      return 'Brand name must be between 2 and 255 characters.';
    }

    if (!values.companyEmail) {
      return 'Company email is required.';
    }

    if (!isEmailValid(values.companyEmail)) {
      return 'Company email format is invalid.';
    }

    if (!values.companyAddress) {
      return 'Company address is required.';
    }

    if (!values.companyWalletAddress) {
      return 'Company wallet address is required.';
    }

    if (!isWalletAddressValid(values.companyWalletAddress)) {
      return 'Company wallet must be a valid Ethereum address (0x + 40 hex chars).';
    }

    if (!values.personInChargeName) {
      return 'Person in charge name is required.';
    }

    if (values.personInChargeName.length > 255) {
      return 'Person in charge name must not exceed 255 characters.';
    }

    if (!values.personInChargeRole) {
      return 'Person in charge role is required.';
    }

    if (values.personInChargeRole.length > 255) {
      return 'Person in charge role must not exceed 255 characters.';
    }

    if (!values.personInChargeEmail) {
      return 'Person in charge email is required.';
    }

    if (!isEmailValid(values.personInChargeEmail)) {
      return 'Person in charge email format is invalid.';
    }

    if (!values.personInChargePhone) {
      return 'Person in charge phone number is required.';
    }

    if (!isPhoneValid(values.personInChargePhone)) {
      return 'Phone number must be 7-30 characters and use only numbers, +, -, (), or spaces.';
    }

    if (values.description.length > 1000) {
      return 'Description must not exceed 1000 characters.';
    }

    return null;
  };

  const handleSubmit = async () => {
    const normalized = normalizeForm(form);
    const validationError = validateForm(normalized);
    if (validationError) {
      Alert.alert('Invalid Form', validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      await brandService.createBrand({
        brandName: normalized.brandName,
        companyEmail: normalized.companyEmail,
        companyAddress: normalized.companyAddress,
        companyWalletAddress: normalized.companyWalletAddress,
        personInChargeName: normalized.personInChargeName,
        personInChargeRole: normalized.personInChargeRole,
        personInChargeEmail: normalized.personInChargeEmail,
        personInChargePhone: normalized.personInChargePhone,
        logo: normalized.logo || null,
        companyBanner: normalized.companyBanner || null,
        statementLetterUrl: normalized.statementLetterUrl || null,
        description: normalized.description || null,
      });

      await setRoleFromBackend('BRAND');
      Alert.alert('Company Registered', 'Your company profile has been created.');
      router.replace('/(tabs)/(creator)/(tabs)/collection');
    } catch (error) {
      const detailEntries = error?.details && typeof error.details === 'object'
        ? Object.entries(error.details)
        : [];

      if (detailEntries.length > 0) {
        const [field, message] = detailEntries[0];
        const fieldLabel = field
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (char) => char.toUpperCase());
        Alert.alert('Registration Failed', `${fieldLabel}: ${String(message)}`);
      } else {
        Alert.alert('Registration Failed', error?.message || 'Unable to create company profile.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToCollector = async () => {
    await setRoleFromBackend('OWNER');
    router.push('/(tabs)/(collector)/marketplace');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButtonContainer} onPress={handleBackToCollector}>
          <Ionicons name="arrow-back" size={24} color="#111" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.header}>
            <Text style={styles.mainTitle}>Register Your Company</Text>
            <Text style={styles.subtitle}>Required before using creator/company mode</Text>
          </View>

          <Text style={styles.sectionTitle}>Company</Text>
          <TextInput
            style={styles.input}
            placeholder="Brand Name*"
            value={form.brandName}
            onChangeText={(value) => updateField('brandName', value)}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.input}
            placeholder="Company Email*"
            value={form.companyEmail}
            onChangeText={(value) => updateField('companyEmail', value)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Company Address*"
            value={form.companyAddress}
            onChangeText={(value) => updateField('companyAddress', value)}
          />
          <TextInput
            style={styles.input}
            placeholder="Company Wallet Address*"
            value={form.companyWalletAddress}
            onChangeText={(value) => updateField('companyWalletAddress', value)}
            autoCapitalize="none"
          />

          <Text style={styles.sectionTitle}>Person In Charge</Text>
          <TextInput
            style={styles.input}
            placeholder="Full Name*"
            value={form.personInChargeName}
            onChangeText={(value) => updateField('personInChargeName', value)}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.input}
            placeholder="Role*"
            value={form.personInChargeRole}
            onChangeText={(value) => updateField('personInChargeRole', value)}
          />
          <TextInput
            style={styles.input}
            placeholder="Email*"
            value={form.personInChargeEmail}
            onChangeText={(value) => updateField('personInChargeEmail', value)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Phone Number*"
            value={form.personInChargePhone}
            onChangeText={(value) => updateField('personInChargePhone', value)}
            keyboardType="phone-pad"
          />

          <Text style={styles.sectionTitle}>Optional Details</Text>
          <TextInput
            style={styles.input}
            placeholder="Logo URL"
            value={form.logo}
            onChangeText={(value) => updateField('logo', value)}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Banner URL"
            value={form.companyBanner}
            onChangeText={(value) => updateField('companyBanner', value)}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Statement Letter URL"
            value={form.statementLetterUrl}
            onChangeText={(value) => updateField('statementLetterUrl', value)}
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Company Description"
            value={form.description}
            onChangeText={(value) => updateField('description', value)}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>CREATE COMPANY PROFILE</Text>
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerBar: {
    height: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backButtonText: {
    fontSize: 17,
    color: '#111',
    fontWeight: '600',
    marginLeft: 8,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    marginTop: 8,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 12,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
  },
  subtitle: {
    marginTop: 6,
    color: '#555',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 10,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#222',
    marginBottom: 12,
  },
  textArea: {
    minHeight: 110,
  },
  submitButton: {
    backgroundColor: '#111',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
