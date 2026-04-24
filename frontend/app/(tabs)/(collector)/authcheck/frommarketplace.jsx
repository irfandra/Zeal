
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  ScrollView, StyleSheet, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import CollectionCard  from '../../../../components/card/CollectionCard';
import CatalogItemCard from '../../../../components/card/CatalogItemCard';
import ItemDetailCard  from '../../../../components/card/ItemDetailCard';

const COLLECTIONS = [
  {
    id: 'col1',
    name: 'Birkin Collections',
    category: 'Luxury Bags',
    tag: 'Rare',
    tagColor: '#B8860B',
    items: 4000,
    sold: 3200,
    floorPrice: 'POL 104,192',
    floorUsd: '~$10,000',
    brand: 'Hermès',
    brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Hermes_paris_logo.svg/200px-Hermes_paris_logo.svg.png',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=60',
  },
  {
    id: 'col2',
    name: 'Pokemon Card',
    category: 'High-End Collectible Cards',
    tag: 'Limited',
    tagColor: '#C9A23C',
    items: 200,
    sold: 136,
    floorPrice: 'POL 52,100',
    floorUsd: '~$5,000',
    brand: 'Nintendo',
    brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Nintendo.svg/200px-Nintendo.svg.png',
    image: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?auto=format&fit=crop&w=800&q=60',
  },
];

const CATALOG = {
  col1: [
    {
      id: 'cat1',
      name: 'Birkin Brownies',
      collection: 'Birkin Collections',
      brand: 'Hermès',
      brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Hermes_paris_logo.svg/200px-Hermes_paris_logo.svg.png',
      image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=60',
      available: 1300,
      total: 1500,
      price: 'POL 104,192',
      usd: '~$10,000',
      rarity: 'Rare',
    },
    {
      id: 'cat2',
      name: 'Birkin Bluestorn',
      collection: 'Birkin Collections',
      brand: 'Hermès',
      brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Hermes_paris_logo.svg/200px-Hermes_paris_logo.svg.png',
      image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=60',
      available: 1350,
      total: 1500,
      price: 'POL 98,000',
      usd: '~$9,300',
      rarity: 'Rare',
    },
  ],
  col2: [
    {
      id: 'cat3',
      name: 'Charizard Series',
      collection: 'Pokemon Card',
      brand: 'Nintendo',
      brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Nintendo.svg/200px-Nintendo.svg.png',
      image: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?auto=format&fit=crop&w=800&q=60',
      available: 176,
      total: 200,
      price: 'POL 52,100',
      usd: '~$5,000',
      rarity: 'Limited',
    },
  ],
};

const ITEMS = {
  cat1: [
    {
      id: '#BK291',
      name: 'Birkin Brownies',
      subtitle: 'Luxury Bag',
      collection: 'Birkin Collections',
      edition: '200 of 1500 items',
      tag: 'Limited',
      tagColor: '#C9A23C',
      price: 'POL 120,100',
      usd: '~$11,000',
      brand: 'Hermès',
      brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Hermes_paris_logo.svg/200px-Hermes_paris_logo.svg.png',
      image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=60',
      labelQR: 'zeal://item/BK291/label',
      certificateQR: 'zeal://item/BK291/certificate',
    },
  ],
  cat2: [
    {
      id: '#BK-BL01',
      name: 'Birkin Bluestorn',
      subtitle: 'Luxury Bag',
      collection: 'Birkin Collections',
      edition: '150 of 1500 items',
      tag: 'Rare',
      tagColor: '#B8860B',
      price: 'POL 98,000',
      usd: '~$9,300',
      brand: 'Hermès',
      brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Hermes_paris_logo.svg/200px-Hermes_paris_logo.svg.png',
      image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=60',
      labelQR: 'zeal://item/BK291/label',
      certificateQR: 'zeal://item/BK291/certificate',
    },
  ],
  cat3: [
    {
      id: '#AZEDR',
      name: 'Charizard',
      subtitle: 'Pokemon Card',
      collection: 'Pokemon Card',
      edition: '24 of 200 items',
      tag: 'Limited',
      tagColor: '#C9A23C',
      price: 'POL 120,100',
      usd: '~$11,000',
      brand: 'Nintendo',
      brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Nintendo.svg/200px-Nintendo.svg.png',
      image: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?auto=format&fit=crop&w=800&q=60',
      labelQR: 'zeal://item/AZEDR/label',
      certificateQR: 'zeal://item/AZEDR/certificate',
    },
  ],
};

const STEPS = [
  { label: 'Collections' },
  { label: 'Catalog'     },
  { label: 'Items'       },
];

export default function FromMarketplacePage() {
  const router = useRouter();
  const [step,               setStep]               = useState(1);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedCatalog,    setSelectedCatalog]    = useState(null);
  const [search,             setSearch]             = useState('');

  const handleSelectItem = (item) => {
    router.navigate({
      pathname: '/authcheck',
      params: { selectedItem: encodeURIComponent(JSON.stringify(item)) },
    });
  };

  const goBack = () => {
    if (step > 1) { setStep(step - 1); setSearch(''); }
    else router.back();
  };

  const filteredCollections = COLLECTIONS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredCatalog = selectedCollection
    ? (CATALOG[selectedCollection.id] ?? []).filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      )
    : [];
  const filteredItems = selectedCatalog
    ? (ITEMS[selectedCatalog.id] ?? []).filter((i) =>
        i.name.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const CARD_WIDTH = 170;

  return (
    <View style={styles.container}>

      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="#111" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>From Marketplace</Text>

        {}
        <View style={styles.breadcrumb}>
          {STEPS.map((s, i) => {
            const isActive = step === i + 1;
            const isDone   = step > i + 1;
            return (
              <React.Fragment key={i}>
                <TouchableOpacity
                  style={styles.breadcrumbItem}
                  onPress={() => { if (i + 1 < step) { setStep(i + 1); setSearch(''); } }}
                  activeOpacity={i + 1 < step ? 0.7 : 1}
                >
                  <View style={[
                    styles.breadcrumbNum,
                    isActive && styles.breadcrumbNumActive,
                    isDone   && styles.breadcrumbNumDone,
                  ]}>
                    {isDone
                      ? <Ionicons name="checkmark" size={12} color="#fff" />
                      : <Text style={[
                          styles.breadcrumbNumText,
                          (isActive || isDone) && styles.breadcrumbNumTextActive,
                        ]}>
                          {i + 1}
                        </Text>
                    }
                  </View>
                  <Text style={[
                    styles.breadcrumbText,
                    isActive && styles.breadcrumbTextActive,
                    isDone   && styles.breadcrumbTextDone,
                  ]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
                {i < 2 && (
                  <View style={[styles.breadcrumbLine, isDone && styles.breadcrumbLineDone]} />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="#888" />
            <TextInput
              style={styles.searchInput}
              placeholder={
                step === 1 ? 'Search Collections' :
                step === 2 ? 'Search Catalog'     :
                             'Search Items'
              }
              placeholderTextColor="#aaa"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="options-outline" size={18} color="#111" />
          </TouchableOpacity>
        </View>

        {}
        {step === 1 && (
          <View style={styles.grid}>
            {filteredCollections.map((col) => (
              <CollectionCard
                key={col.id}
                tag={col.tag}
                brand={col.brand}
                brandLogo={col.brandLogo}
                name={col.name}
                category={col.category}
                items={col.items}
                sold={col.sold}
                floorPrice={col.floorPrice}
                floorUsd={col.floorUsd}
                image={col.image}
                style={styles.collectionCardWrapper}
                onPress={() => {
                  setSelectedCollection(col);
                  setStep(2);
                  setSearch('');
                }}
              />
            ))}
          </View>
        )}

        {}
        {step === 2 && (
          <View style={styles.grid}>
            {filteredCatalog.map((cat) => (
              <CatalogItemCard
                key={cat.id}
                item={cat}
                cardWidth={CARD_WIDTH}
                onPress={() => {
                  setSelectedCatalog(cat);
                  setStep(3);
                  setSearch('');
                }}
              />
            ))}
          </View>
        )}

        {}
        {step === 3 && (
          <View style={styles.grid}>
            {filteredItems.map((item) => (
              <ItemDetailCard
                key={item.id}
                item={item}
                showStatus={false}
                onPress={() => handleSelectItem(item)}
              />
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#fff' },
  headerBar: {
    height: 44, paddingHorizontal: 16,
    justifyContent: 'center', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, paddingVertical: 8, paddingHorizontal: 4,
  },
  backText:  { fontSize: 17, fontWeight: '600', color: '#111' },
  scroll:    { paddingHorizontal: 20, paddingTop: 16 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 16 },

  breadcrumb: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  breadcrumbItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  breadcrumbNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#e0e0e0', alignItems: 'center', justifyContent: 'center',
  },
  breadcrumbNumActive:     { backgroundColor: '#111' },
  breadcrumbNumDone:       { backgroundColor: '#27AE60' },
  breadcrumbNumText:       { fontSize: 11, fontWeight: '700', color: '#999' },
  breadcrumbNumTextActive: { color: '#fff' },
  breadcrumbText:          { fontSize: 12, color: '#aaa', fontWeight: '500' },
  breadcrumbTextActive:    { color: '#111', fontWeight: '700' },
  breadcrumbTextDone:      { color: '#27AE60', fontWeight: '600' },
  breadcrumbLine:     { flex: 1, height: 1.5, backgroundColor: '#e0e0e0', marginHorizontal: 6 },
  breadcrumbLineDone: { backgroundColor: '#27AE60' },

  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f5f5f5', borderRadius: 12,
    paddingHorizontal: 12, height: 44, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111' },
  filterBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center',
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  collectionCardWrapper: { width: '47%', height: 280 },
});