import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRole } from "../../components/context/RoleContext";
import { useWallet } from "../../components/context/WalletContext";

import { authService, walletService } from "../../services/walletService";

export default function RegisterScreen() {
  const router = useRouter();
  const { setRoleFromBackend } = useRole();
  const { wallet, connectWallet, reconnectWallet, isConnecting, signMessage } =
    useWallet();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    userName: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [doPasswordsMatch, setDoPasswordsMatch] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const minLength = form.password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(form.password);
    const hasLowerCase = /[a-z]/.test(form.password);
    const hasNumber = /[0-9]/.test(form.password);
    const hasSpecial = /[^A-Za-z0-9]/.test(form.password);

    setIsPasswordValid(
      minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecial,
    );
    setDoPasswordsMatch(
      form.password === form.confirmPassword && form.password.length > 0,
    );
  }, [form.password, form.confirmPassword]);

  const allFieldsFilled =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    form.userName.trim() &&
    isPasswordValid &&
    doPasswordsMatch &&
    agreed;

  const handleInputChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const data = await authService.registerWithoutWallet({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        userName: form.userName,
        password: form.password,
      });
      await AsyncStorage.setItem("accessToken", data.accessToken);
      await AsyncStorage.setItem("refreshToken", data.refreshToken);
      if (data.user?.id) {
        await AsyncStorage.setItem("userId", String(data.user.id));
      }

      await setRoleFromBackend(data?.user?.role);

      if (wallet?.address) {
        await linkWalletToNewAccount(wallet.address);
      }

      router.replace({
        pathname: "/(auth)/accountactivation",
        params: {
          email: data?.user?.email || form.email,
        },
      });
    } catch (err) {
      Alert.alert("Registration Failed", err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const linkWalletToNewAccount = async (walletAddress) => {
    try {
      const nonceData = await walletService.getWalletNonce(walletAddress);
      const message = nonceData?.message;

      if (!message) {
        throw new Error("Failed to prepare wallet signature challenge.");
      }

      const signature = await signMessage(message, walletAddress);
      if (!signature) {
        throw new Error("Wallet signature was cancelled.");
      }

      await walletService.connectWalletToCurrentUser(walletAddress, signature, message);
    } catch (error) {
      Alert.alert(
        "Wallet Not Linked",
        error?.message || "Your account was created, but wallet linking did not complete."
      );
    }
  };

  const handleRegisterWithWallet = async () => {
    try {
      if (wallet?.address) {
        Alert.alert(
          "MetaMask Ready",
          "Continue registration to link this wallet.",
        );
        return;
      }

      const connectedWallet = await connectWallet();
      if (!connectedWallet?.address) {
        Alert.alert(
          "Wallet Connection Failed",
          "Unable to connect MetaMask wallet.",
        );
      }
    } catch (err) {
      Alert.alert(
        "Wallet Connection Failed",
        err?.message || "Failed to connect wallet.",
      );
    }
  };

  const handleConnectMetamask = () => {
    handleRegisterWithWallet();
  };

  const handleSwitchAccountInMetaMask = async () => {
    try {
      await reconnectWallet();
      Alert.alert(
        "Account Updated",
        "Selected account has been updated from MetaMask.",
      );
    } catch (err) {
      Alert.alert(
        "Switch Account Failed",
        err?.message || "Unable to switch account in MetaMask.",
      );
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleTermsPress = () => {
    router.push("/useterms");
  };

  const handlePrivacyPress = () => {
    router.push("/privacypolicy");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButtonContainer}
          onPress={handleBack}
        >
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
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          {}
          <View style={styles.header}>
            <Text style={styles.logo}>ZEAL</Text>
            <Text style={styles.mainTitle}>Register New Account</Text>
          </View>

          {}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Crypto Wallet (optional)</Text>
            <TouchableOpacity
              style={[
                styles.metamaskButton,
                isConnecting && styles.metamaskButtonDisabled,
              ]}
              onPress={handleConnectMetamask}
              activeOpacity={0.8}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <View style={styles.walletConnectingWrap}>
                  <ActivityIndicator color="#F6851B" />
                  <Text style={styles.walletConnectingText}>
                    Connecting to MetaMask...
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.metamaskText}>
                    {wallet
                      ? "Change / Select Account in MetaMask"
                      : "Connect to MetaMask"}
                  </Text>
                  <MaterialCommunityIcons
                    name="wallet"
                    size={28}
                    color="#F6851B"
                    style={styles.metamaskIcon}
                  />
                </>
              )}
            </TouchableOpacity>
            {wallet?.address && (
              <TouchableOpacity
                style={styles.switchAccountButton}
                activeOpacity={0.8}
                onPress={handleSwitchAccountInMetaMask}
                disabled={isConnecting || loading}
              >
                <Text style={styles.switchAccountButtonText}>
                  Switch Account in MetaMask
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Account<Text style={styles.asterisk}>*</Text>
            </Text>

            {}
            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.input, styles.inputHalf]}
                placeholder="First Name"
                value={form.firstName}
                onChangeText={(text) => handleInputChange("firstName", text)}
                autoCapitalize="words"
                placeholderTextColor="#B0B0B0"
              />
              <TextInput
                style={[styles.input, styles.inputHalf, { marginLeft: 12 }]}
                placeholder="Last Name"
                value={form.lastName}
                onChangeText={(text) => handleInputChange("lastName", text)}
                autoCapitalize="words"
                placeholderTextColor="#B0B0B0"
              />
            </View>

            {}
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={form.email}
              onChangeText={(text) => handleInputChange("email", text)}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#B0B0B0"
            />
            <TextInput
              style={styles.input}
              placeholder="User Name"
              value={form.userName}
              onChangeText={(text) => handleInputChange("userName", text)}
              autoCapitalize="none"
              placeholderTextColor="#B0B0B0"
            />

            {}
            <View style={styles.inputWithIcon}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Password"
                value={form.password}
                onChangeText={(text) => handleInputChange("password", text)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                placeholderTextColor="#B0B0B0"
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                <Ionicons
                  name={showPassword ? "eye" : "eye-off"}
                  style={[styles.eyeicon]}
                  size={22}
                  color="#222"
                />
              </TouchableOpacity>
            </View>

            {}
            <View style={styles.passwordCriteria}>
              <Text
                style={{
                  color: form.password.length >= 8 ? "green" : "#B0B0B0",
                }}
              >
                • Minimum 8 characters
              </Text>
              <Text
                style={{
                  color: /[A-Z]/.test(form.password) ? "green" : "#B0B0B0",
                }}
              >
                • At least one uppercase letter
              </Text>
              <Text
                style={{
                  color: /[a-z]/.test(form.password) ? "green" : "#B0B0B0",
                }}
              >
                • At least one lowercase letter
              </Text>
              <Text
                style={{
                  color: /[0-9]/.test(form.password) ? "green" : "#B0B0B0",
                }}
              >
                • At least one number
              </Text>
              <Text
                style={{
                  color: /[^A-Za-z0-9]/.test(form.password)
                    ? "green"
                    : "#B0B0B0",
                }}
              >
                • At least one special character (!@#$%^&*...)
              </Text>
            </View>

            {}
            <View style={styles.inputWithIcon}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Confirm your password"
                value={form.confirmPassword}
                onChangeText={(text) =>
                  handleInputChange("confirmPassword", text)
                }
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                placeholderTextColor="#B0B0B0"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword((v) => !v)}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye" : "eye-off"}
                  style={[styles.eyeicon]}
                  size={22}
                  color="#222"
                />
              </TouchableOpacity>
            </View>

            {}
            {(form.password.length > 0 || form.confirmPassword.length > 0) && (
              <Text
                style={{
                  color: doPasswordsMatch ? "green" : "red",
                  marginBottom: 12,
                }}
              >
                {doPasswordsMatch
                  ? "Passwords match"
                  : "Passwords do not match"}
              </Text>
            )}
          </View>

          {}
          <View style={styles.legalRow}>
            <TouchableOpacity
              style={[styles.checkbox, agreed && styles.checkboxChecked]}
              onPress={() => setAgreed((v) => !v)}
              activeOpacity={0.8}
            >
              {agreed && <Ionicons name="checkmark" size={18} color="#fff" />}
            </TouchableOpacity>
            <Text style={styles.legalText}>
              I agree to this application{" "}
              <Text style={styles.legalLink} onPress={handleTermsPress}>
                Terms of Use
              </Text>{" "}
              and its{" "}
              <Text style={styles.legalLink} onPress={handlePrivacyPress}>
                Privacy Policy
              </Text>
            </Text>
          </View>

          {}
          <TouchableOpacity
            style={[
              styles.registerButton,
              (!allFieldsFilled || loading) && styles.registerButtonDisabled,
            ]}
            activeOpacity={0.8}
            onPress={handleRegister}
            disabled={!allFieldsFilled || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerButtonText}>REGISTER</Text>
            )}
          </TouchableOpacity>

          {}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Do you have an account?</Text>
            <TouchableOpacity
              onPress={() => router.push("/login")}
              activeOpacity={0.8}
            >
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerBar: {
    height: 44,
    paddingHorizontal: 16,
    justifyContent: "center",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontSize: 17,
    color: "#111",
    fontWeight: "600",
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 32,
    marginTop: 16,
  },
  logo: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 8,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 8,
  },
  section: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
    marginBottom: 12,
  },
  asterisk: {
    fontStyle: "italic",
    color: "#F00",
    fontWeight: "bold",
  },
  metamaskButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingVertical: 18,
    paddingHorizontal: 20,
    justifyContent: "space-between",
    marginBottom: 8,
  },
  metamaskButtonDisabled: {
    opacity: 0.6,
  },
  metamaskText: {
    fontSize: 17,
    color: "#222",
    fontWeight: "500",
  },
  walletConnectingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  walletConnectingText: {
    fontSize: 14,
    color: "#444",
    fontWeight: "500",
  },
  metamaskIcon: {
    marginLeft: 1,
  },
  switchAccountButton: {
    alignSelf: "flex-start",
    paddingVertical: 6,
  },
  switchAccountButtonText: {
    color: "#111",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  rowInputs: {
    flexDirection: "row",
    marginBottom: 12,
  },
  eyeicon: {
    marginLeft: 10,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#222",
    marginBottom: 12,
  },
  inputHalf: {
    flex: 1,
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  passwordCriteria: {
    marginBottom: 8,
    paddingLeft: 4,
  },
  legalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#B0B0B0",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: "#222",
    borderColor: "#222",
  },
  legalText: {
    flex: 1,
    fontSize: 15,
    color: "#444",
    lineHeight: 20,
  },
  legalLink: {
    color: "#222",
    fontWeight: "bold",
    textDecorationLine: "underline",
    lineHeight: 20,
  },
  registerButton: {
    backgroundColor: "#111",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 32,
  },
  registerButtonDisabled: {
    opacity: 0.5,
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  footer: {
    alignItems: "center",
    marginBottom: 12,
  },
  footerText: {
    fontSize: 14,
    color: "#888",
    marginBottom: 4,
  },
  loginLink: {
    fontSize: 15,
    color: "#111",
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
});
