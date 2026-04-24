import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import TabRoleToggle from '../../components/ui/tab-role-toggle';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

export default function UserHome() {
  const [activeTab, setActiveTab] = useState('Collections');

  const collections = [
    {
      id: '1',
      image: 'https://via.placeholder.com/300x160/ff6600/ffffff?text=Hermès',
      brand: 'Hermès',
      tag: 'Rare',
      title: 'Birkin Collections',
      subtitle: 'Luxury Bags',
      items: '👜 4,000 Items',
      owners: '👤 3,200 Owners',
      price: 'POL 104,192 ~ $10,000',
      tagColor: '#111',
      tagTextColor: '#fff',
    },
    {
      id: '2',
      image: 'https://via.placeholder.com/300x160/ffb300/111111?text=Nintendo',
      brand: 'Nintendo',
      tag: 'Limited',
      title: 'Pokemon Card',
      subtitle: 'High-End Collectible Cards',
      items: '🎴 200 Items',
      owners: '👤 136 Owners',
      price: 'POL 52,100 ~ $5,000',
      tagColor: '#ffb300',
      tagTextColor: '#111',
    },
  ];

  const renderCollectionCard = ({ item }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.9}>
      <Image
        source={{ uri: item.image }}
        style={styles.cardImage}
        resizeMode="cover"
      />
      <View style={styles.cardLabel}>
        <Text style={styles.brand}>{item.brand}</Text>
        <Text style={[
          styles.tag,
          { backgroundColor: item.tagColor, color: item.tagTextColor }
        ]}>
          {item.tag}
        </Text>
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
      <View style={styles.cardStats}>
        <Text style={styles.statText}>{item.items}</Text>
        <Text style={styles.statText}>{item.owners}</Text>
      </View>
      <View style={styles.priceBox}>
        <Text style={styles.priceLabel}>Floor Price</Text>
        <Text style={styles.price}>{item.price}</Text>
      </View>
    </TouchableOpacity>
  );

  const ListHeaderComponent = () => (
    <>
      {}
      <View style={styles.header}>
        <Text style={styles.logo}>ZEAL</Text>
        <TabRoleToggle />
      </View>

      <Text style={styles.title}>Marketplace</Text>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Collections' && styles.activeTab]}
          onPress={() => setActiveTab('Collections')}
        >
          <Text style={[styles.tabText, activeTab === 'Collections' && styles.activeText]}>
            Collections
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Brands' && styles.activeTab]}
          onPress={() => setActiveTab('Brands')}
        >
          <Text style={[styles.tabText, activeTab === 'Brands' && styles.activeText]}>
            Brands
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#777" />
        <TextInput
          placeholder="Search Collections or Brands"
          style={styles.searchInput}
          placeholderTextColor="#999"
        />
        <MaterialCommunityIcons name="tune" size={20} color="#777" />
      </View>

      {isTablet && <View style={styles.tabletSpacer} />}
    </>
  );

  return (
    <FlatList
      data={collections}
      renderItem={renderCollectionCard}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={() => <View style={styles.footerSpacer} />}
      horizontal={false}
      numColumns={isTablet ? 2 : 1}
      contentContainerStyle={styles.listContainer}
      columnWrapperStyle={isTablet ? styles.tabletRow : undefined}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      scrollIndicatorInsets={{ right: 1 }}
      removeClippedSubviews={true}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: isTablet ? 32 : 16,
    paddingTop: 60,
    paddingBottom: isTablet ? 100 : 80,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    fontSize: isTablet ? 36 : 28,
    fontWeight: '800',
    letterSpacing: 1,
  },
  switchButton: {
    backgroundColor: '#000',
    borderRadius: 20,
    padding: isTablet ? 12 : 8,
    minWidth: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: isTablet ? 36 : 28,
    marginTop: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 24,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  activeTab: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  tabText: {
    fontSize: isTablet ? 18 : 16,
    color: '#333',
  },
  activeText: {
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f3f3',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 32,
    height: isTablet ? 56 : 48,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
  },
  tabletSpacer: {
    height: 24,
  },
  footerSpacer: {
    height: isTablet ? 80 : 40,
  },
  tabletRow: {
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  card: {
    flex: isTablet ? 0.495 : 1,
    backgroundColor: '#fff',
    marginBottom: 24,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  cardImage: {
    width: '100%',
    height: isTablet ? 160 : 120,
    borderRadius: 12,
  },
  cardLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    alignItems: 'center',
  },
  brand: {
    fontSize: 14,
    color: '#ff6600',
    fontWeight: '600',
  },
  tag: {
    fontSize: 12,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontWeight: '500',
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: isTablet ? 20 : 16,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 13,
    color: '#777',
    marginTop: 4,
  },
  cardStats: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statText: {
    fontSize: 12,
  },
  priceBox: {
    marginTop: 12,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
  },
  price: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#6b4df5',
    marginTop: 4,
  },
});