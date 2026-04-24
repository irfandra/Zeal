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
import { authService } from '../../services/walletService';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    const handleResetPassword = async () => {
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            Alert.alert('Missing Email', 'Please enter your email address first.');
            return;
        }

        setIsSubmitting(true);
        try {
            await authService.requestPasswordReset(trimmedEmail);
            setStatusMessage('If the email exists, a 6-digit reset code and deep link have been sent.');
        } catch (error) {
            Alert.alert('Reset Request Failed', error?.message || 'Unable to request password reset.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChangePassword = () => {
        const trimmedEmail = email.trim();
        router.push({
            pathname: '/changepassword',
            params: trimmedEmail ? { email: trimmedEmail } : undefined,
        });
    };

    const handleBack = () => {
        router.back();
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.headerBar}>
                <TouchableOpacity style={styles.backButtonContainer} onPress={handleBack}>
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
                        <Text style={styles.logo}>ZEAL</Text>
                        <Text style={styles.mainTitle}>Forgot Password?</Text>
                    </View>

                    <View style={styles.section}>
                        <TextInput
                            style={styles.input}
                            placeholder="Your Email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            placeholderTextColor="#B0B0B0"
                        />
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.loginButton,
                            (!email.trim() || isSubmitting) && styles.loginButtonDisabled
                        ]}
                        activeOpacity={0.8}
                        onPress={handleResetPassword}
                        disabled={!email.trim() || isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.loginButtonText}>RESET PASSWORD</Text>
                        )}
                    </TouchableOpacity>

                    {!!statusMessage && (
                        <View style={styles.successBox}>
                            <Text style={styles.successText}>{statusMessage}</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.changePasswordLink}
                        onPress={handleChangePassword}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.changePasswordText}>
                            I have the reset link/code. Take me to change password
                        </Text>
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
        fontSize: 22,
        fontWeight: 'bold',
        color: '#222',
        textAlign: 'left',
    },
    section: { marginBottom: 20 },
    input: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        paddingVertical: 16,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#222',
    },
    loginButton: {
        backgroundColor: '#111',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        marginBottom: 16,
        opacity: 1,
    },
    loginButtonDisabled: { opacity: 0.5 },
    loginButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    changePasswordLink: {
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginTop: 8,
    },
    changePasswordText: {
        fontSize: 16,
        color: '#222',
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
    successBox: {
        borderWidth: 1,
        borderColor: '#c9e7d2',
        backgroundColor: '#edf9f1',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    successText: {
        color: '#0f5132',
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
    },
});