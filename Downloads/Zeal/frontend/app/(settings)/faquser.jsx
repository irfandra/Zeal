import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQS = [
  {
    question: 'What is Zeal Marketplace?',
    answer:
      'Zeal Marketplace is a physical product NFT marketplace where each purchase can be linked to a unique NFT that represents the item, proof of purchase, or ownership record.',
  },
  {
    question: 'What do I receive after purchase?',
    answer:
      'You receive the physical product and, when applicable, the NFT associated with that product. The NFT can serve as proof of ownership, authenticity, or a digital collectible depending on the item.',
  },
  {
    question: 'Do I need a crypto wallet?',
    answer:
      'Yes, a wallet is needed to receive and manage NFTs. You can still browse products, but wallet connection may be required to complete NFT-related purchases and transfers.',
  },
  {
    question: 'How does shipping work?',
    answer:
      'After checkout, the shipping address you provide is shared only with the brand or fulfillment partner responsible for preparing and delivering the physical product.',
  },
  {
    question: 'Can I transfer or resell my NFT?',
    answer:
      'In many cases, yes. If the NFT is designed for transferability, you may be able to move it to another wallet or sell it, subject to the marketplace rules for that product.',
  },
  {
    question: 'What if I enter the wrong shipping address?',
    answer:
      'Please contact support as soon as possible. If the order has not been processed yet, the address may be updated. Once shipping begins, changes may no longer be possible.',
  },
  {
    question: 'Are refunds available?',
    answer:
      'Refund eligibility depends on the product, brand policy, and whether the order has already been processed, shipped, or redeemed. Some NFT-linked products may have special restrictions.',
  },
  {
    question: 'How do I contact support?',
    answer:
      'You can contact support through the app. Include your order details, wallet address, and a clear description of the issue so the team can assist you faster.',
  },
];

export default function FAQPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [expandedIndex, setExpandedIndex] = useState(null);

  const returnToParam = Array.isArray(params.returnTo)
    ? params.returnTo[0]
    : params.returnTo;

  const handleBack = () => {
    if (returnToParam) {
      router.replace(returnToParam);
      return;
    }
    router.back();
  };

  const toggleFAQ = (index) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
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
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        <View style={styles.header}>
          <Text style={styles.title}>FAQ</Text>
          <Text style={styles.subtitle}>Zeal Marketplace</Text>
          <Text style={styles.date}>Help for physical products and NFT orders</Text>
        </View>

        {FAQS.map((item, index) => {
          const expanded = expandedIndex === index;

          return (
            <View key={index} style={styles.faqCard}>
              <TouchableOpacity
                style={styles.faqHeader}
                onPress={() => toggleFAQ(index)}
                activeOpacity={0.8}
              >
                <Text style={styles.faqQuestion}>{item.question}</Text>
                <Ionicons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color="#111"
                />
              </TouchableOpacity>

              {expanded && <Text style={styles.faqAnswer}>{item.answer}</Text>}
            </View>
          );
        })}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Still need help? Contact support through the app.
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
    marginBottom: 28,
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
    textAlign: 'center',
  },
  faqCard: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    backgroundColor: '#fff',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    paddingRight: 12,
  },
  faqAnswer: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 23,
    color: '#333',
  },
  footer: {
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a1a',
    textAlign: 'center',
    lineHeight: 22,
  },
});
