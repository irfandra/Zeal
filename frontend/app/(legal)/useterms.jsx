import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function TermsOfUse() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButtonContainer} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#111" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        
        <View style={styles.header}>
          <Text style={styles.title}>Terms of Use</Text>
          <Text style={styles.subtitle}>Zeal Marketplace</Text>
          <Text style={styles.date}>Last Updated: March 5, 2026</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.text}>
            Welcome to Zeal, a marketplace platform for purchasing physical collectible and luxury items supported by NFT technology. By using Zeal, you agree to these Terms of Use.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Services</Text>
          <Text style={styles.text}>
            Zeal enables users to: (1) browse collections, (2) purchase items using Polygon cryptocurrency, (3) receive physical items produced by brands, (4) scan items to claim NFTs, and (5) transfer ownership via NFT.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Eligibility</Text>
          <Text style={styles.text}>
            You must be 18+ years old and capable of forming legally binding contracts. You are responsible for all activity under your account and wallet.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Payments</Text>
          <Text style={styles.text}>
            All purchases require Polygon (MATIC) cryptocurrency. Zeal facilitates transactions but does not custody funds or NFTs. Production and shipping are handled by partner brands.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. NFT Ownership</Text>
          <Text style={styles.text}>
            NFTs represent proof of physical item ownership. Scanning links the physical item to your Polygon wallet. Ownership transfer requires both physical handover and NFT transfer.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
          <Text style={styles.text}>
            Zeal is provided &quot;AS IS&quot; without warranties. We are not liable for cryptocurrency volatility, blockchain issues, production delays, shipping problems, or lost/stolen items.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Termination</Text>
          <Text style={styles.text}>
            Zeal may suspend or terminate accounts for violations of these Terms. You may stop using Zeal at any time.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using Zeal, you confirm you have read, understood, and agree to these Terms of Use.
          </Text>
        </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4a90e2',
    marginBottom: 5,
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  footer: {
    paddingTop: 30,
    paddingBottom: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  footerText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    textAlign: 'center',
    lineHeight: 24,
  },
});