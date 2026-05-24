import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Flame, ChevronRight, CheckCircle2, ShoppingBasket } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { SmartProposalResponse } from '@/lib/api';

interface Props {
  proposal: SmartProposalResponse;
}

export function SmartProposalCard({ proposal }: Props) {
  const { tagline, recipe_title, expiring_products, missing_ingredients, cost_rub } = proposal;

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/recipes');
  }, []);

  return (
    <View style={s.card}>
      {/* header */}
      <View style={s.header}>
        <View style={s.taglineRow}>
          <Flame size={14} color="#F59E0B" strokeWidth={2} />
          <Text style={s.tagline}>{tagline}</Text>
        </View>
        <Text style={s.title}>{recipe_title}</Text>
      </View>

      <View style={s.divider} />

      {/* "Уже есть" */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <CheckCircle2 size={12} color="#6366F1" strokeWidth={2} />
          <Text style={s.sectionLabel}>Уже есть</Text>
        </View>
        <View style={s.pills}>
          {expiring_products.map((p) => (
            <View key={p.name} style={s.pill}>
              <Text style={s.pillText}>{p.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* "Докупить" */}
      {missing_ingredients.length > 0 && (
        <View style={s.missingBox}>
          <View style={s.sectionHeader}>
            <ShoppingBasket size={12} color="#F59E0B" strokeWidth={2} />
            <Text style={s.missingLabel}>Докупить ~{cost_rub}₽</Text>
          </View>
          <Text style={s.missingText}>
            {missing_ingredients.map((i) => i.name).join(', ')}
          </Text>
        </View>
      )}

      {/* CTA */}
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [s.cta, pressed && { opacity: 0.75 }]}
        accessibilityRole="button"
        accessibilityLabel="Открыть рецепт"
      >
        <Text style={s.ctaText}>Посмотреть рецепт</Text>
        <ChevronRight size={16} color="#6366F1" strokeWidth={2} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 8,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1A2E',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F8',
    marginHorizontal: 20,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366F1',
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#EDEFFD',
    borderWidth: 1,
    borderColor: '#C7C9F9',
  },
  pillText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '500',
  },
  missingBox: {
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  missingLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
  },
  missingText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
    marginTop: 2,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: '#EDEFFD',
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366F1',
  },
});
