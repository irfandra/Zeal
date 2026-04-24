import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { API_BASE } from "../../services/apiClient";
import { walletService } from "../../services/walletService";

export default function LoginScreen() {
  const router = useRouter();
  const { setRole, setCurrentUser } = useRole();
  const {
    wallet,
    connectWallet,
    reconnectWallet,
    isConnecting,
    signMessage,
  } = useWallet();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const resolveNextRoute = async (authPayload) => {
    const currentUser = authPayload?.user || null;
    await setCurrentUser(currentUser);
    await setRole("collector");
    return "/(tabs)/(collector)/marketplace";
  };

  const isFormValid = email.trim() && password.trim();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (data.success) {
        await AsyncStorage.setItem("accessToken", data.data.accessToken);
        await AsyncStorage.setItem("refreshToken", data.data.refreshToken);

        if (
          data?.data?.user?.authType === "EMAIL" &&
          data?.data?.user?.emailVerified === false
        ) {
          await setCurrentUser(data?.data?.user || null);
          await setRole("collector");
          router.replace({
            pathname: "/(auth)/accountactivation",
            params: {
              email: data?.data?.user?.email || email,
            },
          });
          return;
        }

        const nextRoute = await resolveNextRoute(data.data);
        router.replace(nextRoute);
      } else {
        Alert.alert("Login Failed", data.error?.message || "Invalid credentials");
      }
    } catch (err) {
      console.error("Login error:", err);
      Alert.alert("Error", err?.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

const handleLoginWithWallet = async () => {
  setLoading(true);
  let currentStep = "connect wallet";
  try {

    const activeWallet = wallet?.address ? wallet : await connectWallet();
    if (!activeWallet?.address) {
      Alert.alert("Error", "Failed to connect wallet");
      return;
    }

    currentStep = "check wallet registration";
    const isRegistered = await walletService.isWalletRegistered(activeWallet.address);

    if (!isRegistered) {
      Alert.alert(
        "Wallet Not Registered",
        "This wallet address is not registered. Please create an account first."
      );
      return;
    }

    currentStep = "request nonce";
    const nonceData = await walletService.getWalletNonce(activeWallet.address);
    const message = nonceData?.message;
    if (!message) {
      throw new Error("Failed to get nonce for wallet login.");
    }

    currentStep = "sign nonce in MetaMask";
    const signature = await signMessage(message, activeWallet.address);
    if (!signature) {
      Alert.alert("Signing Failed", "Message signing was cancelled or failed");
      return;
    }

    currentStep = "submit wallet login";
    const loginData = await walletService.loginWithWallet(
      activeWallet.address,
      signature,
      message
    );
    if (loginData.accessToken && loginData.refreshToken) {
      await AsyncStorage.setItem("accessToken", loginData.accessToken);
      await AsyncStorage.setItem("refreshToken", loginData.refreshToken);

      if (
        loginData?.user?.authType === "EMAIL" &&
        loginData?.user?.emailVerified === false
      ) {
        await setCurrentUser(loginData?.user || null);
        await setRole("collector");
        router.replace({
          pathname: "/(auth)/accountactivation",
          params: {
            email: loginData?.user?.email || email,
          },
        });
        return;
      }

      const nextRoute = await resolveNextRoute(loginData);
      router.replace(nextRoute);
    } else {
      Alert.alert("Error", "Wallet login failed");
    }

  } catch (err) {
    console.error("Wallet login error:", err);
    const errorMessage = err?.message || "An unexpected error occurred";
    const looksLikeNetworkError = /network request failed|failed to fetch|socket|Connection refused/i.test(errorMessage);
    const isCancelled = /user denied|cancelled|rejected/i.test(errorMessage);
    const isStaleWalletPairing = /no matching key\.?\s*pairing|cannot convert undefined value to object/i.test(errorMessage);
    
    let detail = `${currentStep}: ${errorMessage}`;
    
    if (isCancelled) {
      detail = `${currentStep}: You cancelled the action. To complete login, please approve in MetaMask.`;
    } else if (isStaleWalletPairing) {
      try {
        await reconnectWallet();
      } catch (_reconnectErr) {

      }
      detail = `${currentStep}: Wallet session became stale and was reset. Please tap \"Login with Wallet\" again.`;
    } else if (looksLikeNetworkError) {
      detail = `${currentStep}: Network error - ${errorMessage}\nBackend URL: ${API_BASE}\n\nTroubleshooting:\n1. Check backend is running\n2. Verify network connectivity\n3. If using Expo Go, switch to dev build: npx expo run:android`;
    } else if (errorMessage.includes('provider')) {
      detail = `${currentStep}: Wallet connection issue - ${errorMessage}\n\nTry:\n1. Close and reopen MetaMask\n2. Reconnect the wallet\n3. Use a dev build instead of Expo Go`;
    }
    
    Alert.alert("Wallet Login Error", detail);
  } finally {
    setLoading(false);
  }
};

  const handleSwitchAccountInMetaMask = async () => {
    try {
      await reconnectWallet();
      Alert.alert("Account Updated", "Selected account has been updated from MetaMask.");
    } catch (err) {
      Alert.alert("Switch Account Failed", err?.message || "Unable to switch account in MetaMask.");
    }
  };

  const handleForgotPassword = () => router.push("/forgotpassword");
  const handleBack = () => router.back();
  const handleRegister = () => router.push("/register");

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
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
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.header}>
            <Text style={styles.logo}>ZEAL</Text>
            <Text style={styles.mainTitle}>Login</Text>
          </View>

          {}
          <View style={styles.section}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#B0B0B0"
            />
          </View>

          {}
          <View style={styles.section}>
            <View style={styles.inputWithIcon}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                placeholderTextColor="#B0B0B0"
              />
              <Pressable onPress={() => setShowPassword((v) => !v)}>
                <Ionicons
                  name={showPassword ? "eye" : "eye-off"}
                  size={22}
                  color="#222"
                  style={styles.eyeIcon}
                />
              </Pressable>
            </View>
            <Pressable onPress={handleForgotPassword}>
              <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </Pressable>
          </View>

          {}
          <TouchableOpacity
            style={[
              styles.loginButton,
              (!isFormValid || loading) && styles.loginButtonDisabled,
            ]}
            activeOpacity={0.8}
            onPress={handleLogin}
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>LOGIN</Text>
            )}
          </TouchableOpacity>

          {}
          <TouchableOpacity
            style={[
              styles.metamaskButton,
              (isConnecting || loading) && styles.metamaskButtonDisabled,
            ]}
            activeOpacity={0.8}
            onPress={handleLoginWithWallet}
            disabled={isConnecting || loading}
          >
            {isConnecting || loading ? (
              <View style={styles.walletConnectingWrap}>
                <ActivityIndicator color="#F6851B" />
                <Text style={styles.walletConnectingText}>Connecting to MetaMask...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.metamaskText}>Login with MetaMask</Text>
                <MaterialCommunityIcons
                  name="wallet"
                  size={24}
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
              <Text style={styles.switchAccountButtonText}>Switch Account in MetaMask</Text>
            </TouchableOpacity>
          )}

          {}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have any account?</Text>
            <Pressable onPress={handleRegister}>
              <Text style={styles.registerLink}>Register Account</Text>
            </Pressable>
          </View>

        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
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
  scrollContent: { padding: 24, paddingBottom: 40 },
  header: { marginBottom: 40, marginTop: 16 },
  logo: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 12,
    textAlign: "left",
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#222",
    textAlign: "left",
  },
  section: { marginBottom: 20 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#222",
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  eyeIcon: { marginLeft: 12 },
  forgotPassword: {
    fontSize: 15,
    color: "#222",
    fontWeight: "500",
    textAlign: "right",
    marginTop: 4,
  },
  loginButton: {
    backgroundColor: "#111",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 16,
  },
  loginButtonDisabled: { opacity: 0.5 },
  loginButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  metamaskButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingVertical: 18,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 32,
  },
  metamaskButtonDisabled: { opacity: 0.6 },
  metamaskText: { fontSize: 17, color: "#222", fontWeight: "500" },
  metamaskIcon: { marginLeft: 12 },
  walletConnectingWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  walletConnectingText: { fontSize: 14, color: "#444", fontWeight: "500" },
  switchAccountButton: {
    alignSelf: "flex-start",
    marginTop: -18,
    marginBottom: 24,
    paddingVertical: 6,
  },
  switchAccountButtonText: {
    color: "#111",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  footer: { alignItems: "center" },
  footerText: { fontSize: 14, color: "#888", marginBottom: 8 },
  registerLink: {
    fontSize: 15,
    color: "#111",
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
});