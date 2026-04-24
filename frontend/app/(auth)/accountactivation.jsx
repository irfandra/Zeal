import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { authService } from '../../services/walletService';

const RESEND_SECONDS = 30;

export default function AccountActivation() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = typeof params.email === 'string' ? params.email : '';

  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (countdown <= 0) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setCountdown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [countdown]);

  const handleConfirm = async () => {
    const trimmedCode = code.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code from your email.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.verifyEmail(trimmedCode);
      Alert.alert('Email Verified', 'Your account is now active.');
      router.replace('/(auth)/login');
    } catch (error) {
      Alert.alert('Verification Failed', error?.message || 'Unable to verify email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) {
      return;
    }

    setIsResending(true);
    try {
      await authService.resendVerificationEmail();
      setCountdown(RESEND_SECONDS);
      Alert.alert('Code Sent', 'A new 6-digit verification code has been sent to your email.');
    } catch (error) {
      Alert.alert('Resend Failed', error?.message || 'Unable to resend verification code.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>ZEAL</Text>

        <Text style={styles.title}>Account Confirmation</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to:
          {'\n'}
          <Text style={styles.emailText}>{email || 'your email'}</Text>
        </Text>

        <TextInput
          style={styles.codeInput}
          value={code}
          onChangeText={(value) => setCode(value.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="Enter 6-digit code"
          placeholderTextColor="#9b9b9b"
          textAlign="center"
        />

        <TouchableOpacity
          style={[styles.confirmButton, isSubmitting && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmText}>Confirm Code</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleResend}
          disabled={countdown > 0 || isResending}
          style={[
            styles.resendContainer,
            (countdown > 0 || isResending) && styles.resendDisabled,
          ]}
        >
          {isResending ? (
            <ActivityIndicator color="#666" />
          ) : (
            <Text style={[styles.resendText, countdown > 0 && styles.resendCountdownText]}>
              {countdown > 0 ? `Re-send in ${countdown}s` : 'Re-send confirmation code'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logo: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#333',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 40,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    width: '100%',
  },
  emailText: {
    fontWeight: '700',
    color: '#111',
  },
  codeInput: {
    width: '100%',
    height: 58,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 6,
    marginBottom: 24,
  },
  confirmButton: {
    width: '100%',
    paddingVertical: 18,
    backgroundColor: '#000',
    borderRadius: 12,
    marginBottom: 24,
  },
  confirmText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 17,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  resendContainer: {
    alignItems: 'center',
    minHeight: 24,
    justifyContent: 'center',
  },
  resendText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  resendCountdownText: {
    color: '#999',
  },
  resendDisabled: {
    opacity: 0.6,
  },
});