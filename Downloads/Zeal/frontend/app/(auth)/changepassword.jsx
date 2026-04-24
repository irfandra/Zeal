import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { authService } from '../../services/walletService';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const emailFromParams = typeof params.email === 'string' ? params.email : '';
  const codeFromParams = typeof params.code === 'string' ? params.code : '';
  const showBack = String(params.showBack || '') === 'true';

  const [email, setEmail] = useState(emailFromParams);
  const [code, setCode] = useState(codeFromParams.replace(/[^0-9]/g, '').slice(0, 6));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [doPasswordsMatch, setDoPasswordsMatch] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProfileEmail = async () => {
      if (emailFromParams) {
        return;
      }

      try {
        const profile = await authService.getCurrentUserProfile();
        if (isMounted && profile?.email) {
          setEmail(profile.email);
        }
      } catch (_error) {

      }
    };

    loadProfileEmail();

    return () => {
      isMounted = false;
    };
  }, [emailFromParams]);

  useEffect(() => {
    const minLength = newPassword.length >= 8;
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

    setIsPasswordValid(minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecial);
    setDoPasswordsMatch(
      newPassword === confirmPassword && newPassword.length > 0,
    );
  }, [newPassword, confirmPassword]);

  const handleBack = () => router.back();

  const handleChangePassword = async () => {
    const safeEmail = email.trim();
    const safeCode = code.trim();

    if (!safeEmail) {
      Alert.alert('Missing Email', 'Open the reset link from your email to continue.');
      return;
    }

    if (!/^\d{6}$/.test(safeCode)) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit reset code from your email.');
      return;
    }

    if (!isPasswordValid || !doPasswordsMatch) {
      Alert.alert('Invalid Password', 'Please ensure password rules are met and both password fields match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.resetPassword({
        email: safeEmail,
        code: safeCode,
        newPassword,
      });

      Alert.alert('Password Updated', 'Your password has been reset successfully.');
      router.replace('/(auth)/login');
    } catch (error) {
      Alert.alert('Reset Failed', error?.message || 'Unable to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const allFieldsValid =
    email.trim() && /^\d{6}$/.test(code.trim()) && isPasswordValid && doPasswordsMatch;

  return (
    <SafeAreaView style={styles.safeArea}>
      {showBack && (
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backButtonContainer} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#111" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      )}

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
            <Text style={styles.logo}>ZEAL</Text>
            <Text style={styles.mainTitle}>Change Your Password</Text>
            <Text style={styles.subTitle}>Use your reset code from email</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Account Email</Text>
            <View style={styles.readonlyBox}>
              <Text style={styles.readonlyText}>{email || 'Open reset link from your email'}</Text>
            </View>

            <Text style={[styles.label, styles.codeLabel]}>6-digit reset code</Text>
            <TextInput
              style={styles.input}
              placeholder="123456"
              value={code}
              onChangeText={(value) => setCode(value.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              autoCapitalize="none"
              placeholderTextColor="#B0B0B0"
            />
          </View>

          <View style={styles.section}>
            <View style={styles.inputWithIcon}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="New Password"
                secureTextEntry={!showPassword}
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
                placeholderTextColor="#B0B0B0"
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)}>
                <Ionicons
                  name={showPassword ? 'eye' : 'eye-off'}
                  style={styles.eyeicon}
                  size={22}
                  color="#222"
                />
              </TouchableOpacity>
            </View>

            {}
            <View style={styles.passwordCriteria}>
              <Text style={{ color: newPassword.length >= 8 ? 'green' : '#B0B0B0' }}>
                • Minimum 8 characters
              </Text>
              <Text style={{ color: /[A-Z]/.test(newPassword) ? 'green' : '#B0B0B0' }}>
                • At least one uppercase letter
              </Text>
              <Text style={{ color: /[a-z]/.test(newPassword) ? 'green' : '#B0B0B0' }}>
                • At least one lowercase letter
              </Text>
              <Text style={{ color: /[0-9]/.test(newPassword) ? 'green' : '#B0B0B0' }}>
                • At least one number
              </Text>
              <Text style={{ color: /[^A-Za-z0-9]/.test(newPassword) ? 'green' : '#B0B0B0' }}>
                • At least one special character (!@#$%^&*...)
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.inputWithIcon}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Confirm New Password"
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                placeholderTextColor="#B0B0B0"
              />
              <TouchableOpacity onPress={() => setShowConfirm(v => !v)}>
                <Ionicons
                  name={showConfirm ? 'eye' : 'eye-off'}
                  style={styles.eyeicon}
                  size={22}
                  color="#222"
                />
              </TouchableOpacity>
            </View>

            {}
            {(newPassword.length > 0 || confirmPassword.length > 0) && (
              <Text
                style={{
                  color: doPasswordsMatch ? 'green' : 'red',
                  marginBottom: 12,
                }}
              >
                {doPasswordsMatch ? 'Passwords match' : 'Passwords do not match'}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.changeButton,
              !allFieldsValid && styles.buttonDisabled,
            ]}
            activeOpacity={0.8}
            onPress={handleChangePassword}
            disabled={!allFieldsValid}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.changeButtonText}>Change Password</Text>
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
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
  scrollContent: { padding: 24, paddingBottom: 40 },
  header: { marginBottom: 40, marginTop: 16 },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 12,
    textAlign: 'left',
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'left',
  },
  subTitle: {
    fontSize: 18,
    color: '#444',
    marginTop: 4,
    textAlign: 'left',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },
  codeLabel: {
    marginTop: 6,
  },
  readonlyBox: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F8F8F8',
  },
  readonlyText: {
    color: '#444',
    fontSize: 15,
  },
  section: { marginBottom: 20 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#222',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  eyeicon: {
    marginLeft: 10,
  },
  passwordCriteria: {
    marginBottom: 8,
    paddingLeft: 4,
  },
  changeButton: {
    backgroundColor: '#111',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
    opacity: 1,
  },
  buttonDisabled: { opacity: 0.5 },
  changeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});