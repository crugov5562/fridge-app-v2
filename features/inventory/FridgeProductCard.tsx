import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Heart } from 'lucide-react-native';
import { getCategoryColor } from '@/utils/category-color';
import { getExpiryInfo } from '@/utils/expiry';
import type { InventoryItem } from '@/lib/api';

interface Props {
  item: InventoryItem;
  categoryName: string;
  unitAbbr: string;
  onPress: (item: InventoryItem) => void;
}

const BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

const EXPIRY_COLORS = {
  safe:     { text: '#6366F1', bg: '#EDEFFD' },
  warning: { text: '#D97706', bg: '#FFFBEB' },
  danger:  { text: '#DC2626', bg: '#FEF2F2' },
  unknown: { text: '#9E9E9E', bg: '#F5F5F5' },
};

export const FridgeProductCard = React.memo(function FridgeProductCard({
  item,
  categoryName,
  unitAbbr,
  onPress,
}: Props) {
  const [liked, setLiked] = useState(false);

  const catColor = getCategoryColor(categoryName || item.name);
  const { status, label } = getExpiryInfo(item.expiry_date);
  const { text: expiryText, bg: expiryBg } = EXPIRY_COLORS[status];
  const firstLetter = item.name.charAt(0).toUpperCase();

  const photoUri = item.photo_url
    ? item.photo_url.startsWith('http')
      ? item.photo_url
      : `${BASE}${item.photo_url}`
    : null;

  const metaSuffix =
    item.quantity !== 1 || unitAbbr ? ` · ${item.quantity} ${unitAbbr}`.trim() : '';

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.86 }]}
      accessibilityRole="button"
      accessibilityLabel={`Продукт: ${item.name}`}
    >
      <View style={styles.cardInner}>
        {/* ── colored illustration top ── */}
        <View style={[styles.illus, { backgroundColor: catColor }]}>
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
            />
          ) : (
            <View style={styles.letterCircle}>
              <Text style={styles.letter}>{firstLetter}</Text>
            </View>
          )}

          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              setLiked((v) => !v);
            }}
            style={styles.heartBtn}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={liked ? 'Убрать из избранного' : 'В избранное'}
          >
            <Heart
              size={14}
              color={liked ? '#6366F1' : '#9E9E9E'}
              fill={liked ? '#6366F1' : 'transparent'}
              strokeWidth={2}
            />
          </Pressable>
        </View>

        {/* ── white body ── */}
        <View style={styles.body}>
          {/* Название: строго до 2-х строк, лишнее обрезается в ... */}
          <Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">
            {item.name}
          </Text>
          
          {/* Категория: строго 1 строка, лишнее обрезается в ... */}
          <Text style={styles.meta} numberOfLines={1} ellipsizeMode="tail">
            {categoryName || 'Прочее'}{metaSuffix}
          </Text>
          
          {/* Обертка для плашки, чтобы она не ломала высоту, если её нет */}
          <View style={styles.expiryContainer}>
            {item.expiry_date && (
              <View style={[styles.expiryPill, { backgroundColor: expiryBg }]}>
                <Text style={[styles.expiryLabel, { color: expiryText }]} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    
    width: 160,
    height: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 5,
  },
  cardInner: {
    flex: 1,                
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#FFFFFF',
  },
  illus: {
    height: 120,            // Чуть уменьшил высоту картинки, чтобы осталось больше места под текст
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  letterCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontSize: 24,
    fontWeight: '900',
    color: 'white',
  },
  heartBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 10,
    flex: 1,                // Занимает всё оставшееся пространство (220 - 100 = 120 единиц)
    justifyContent: 'space-between', // Название сверху, плашка срока строго внизу
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A2E',
    lineHeight: 16,
    height: 32,             // Резервируем место ровно под 2 строки текста (16 * 2)
  },
  meta: {
    fontSize: 11,
    color: '#9E9E9E',
    marginTop: 2,
  },
  expiryContainer: {
    height: 22,             // Резервируем фиксированную высоту под плашку срока
    justifyContent: 'center',
  },
  expiryPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  expiryLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});