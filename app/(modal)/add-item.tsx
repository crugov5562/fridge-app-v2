import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, MapPin, CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { inventory, catalog, classify, type ClassifyProductResponse } from '@/lib/api';
import { useFridgeStore } from '@/lib/fridge-store';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const schema = z.object({
  name: z.string().min(1, 'Введите название'),
  category_id: z.string().optional(),
  unit_id: z.string().optional(),
  quantity: z.number().positive('Должно быть > 0'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export default function AddItemModal() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const activeFridgeId = useFridgeStore((s) => s.activeFridgeId);

  const [expiryText, setExpiryText] = useState('');
  const [isClassifying, setIsClassifying] = useState(false);
  const [classifyResult, setClassifyResult] = useState<ClassifyProductResponse | null>(null);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: catalog.categories,
    staleTime: Infinity,
  });

  const { data: units } = useQuery({
    queryKey: ['units'],
    queryFn: catalog.units,
    staleTime: Infinity,
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', quantity: 1 },
  });

  const selectedCategoryId = watch('category_id');
  const selectedUnitId = watch('unit_id');
  const productName = watch('name');

  useEffect(() => {
    const name = productName.trim();
    if (name.length < 2) {
      setClassifyResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      if (!categories || !units) return;
      setIsClassifying(true);
      try {
        const result = await classify.product(name);
        setClassifyResult(result);

        if (result.category_id) {
          setValue('category_id', result.category_id);
        } else if (result.category) {
          const matched = categories.find(
            (c) => c.name.toLowerCase() === result.category.toLowerCase()
          );
          if (matched) setValue('category_id', matched.id);
        }

        if (result.unit_suggestion) {
          const matchedUnit = units.find(
            (u) => u.abbreviation.toLowerCase() === result.unit_suggestion!.toLowerCase()
          );
          if (matchedUnit) setValue('unit_id', matchedUnit.id);
        }

        if (result.expiry_days > 0) {
          setExpiryText((prev) => prev || addDays(result.expiry_days));
        }

      } catch {
        // silently ignore classify errors
      } finally {
        setIsClassifying(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [productName, categories, units, setValue]);

  const handleManualClassify = useCallback(async () => {
    const name = productName.trim();
    if (!name || !categories || !units) return;
    setIsClassifying(true);
    try {
      const result = await classify.product(name);
      setClassifyResult(result);
      if (result.category_id) setValue('category_id', result.category_id);
      if (result.unit_suggestion) {
        const u = units.find(
          (u) => u.abbreviation.toLowerCase() === result.unit_suggestion!.toLowerCase()
        );
        if (u) setValue('unit_id', u.id);
      }
      if (result.expiry_days > 0) {
        setExpiryText(addDays(result.expiry_days));
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Не удалось определить', 'Заполните поля вручную');
    } finally {
      setIsClassifying(false);
    }
  }, [productName, categories, units, setValue]);

  const saveMutation = useMutation({
    mutationFn: inventory.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', activeFridgeId] });
      qc.invalidateQueries({ queryKey: ['expiring'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
    onError: () => {
      Alert.alert('Ошибка', 'Не удалось сохранить продукт');
    },
  });

  const onSubmit = useCallback(
    (values: FormValues) => {
      if (!activeFridgeId) {
        Alert.alert('Ошибка', 'Холодильник не выбран');
        return;
      }
      saveMutation.mutate({
        fridge_id: activeFridgeId,
        name: values.name.trim(),
        category_id: values.category_id,
        zone_type_id: classifyResult?.zone_type_id ?? undefined,
        unit_id: values.unit_id,
        quantity: values.quantity,
        expiry_date: expiryText.trim() || undefined,
        notes: values.notes?.trim() || undefined,
      });
    },
    [activeFridgeId, expiryText, classifyResult, saveMutation]
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background"
    >
      <View
        className="flex-row items-center justify-between border-b border-border px-4 py-4"
        style={{ paddingTop: insets.top + 12 }}
      >
        <Text className="text-lg font-bold text-foreground">Добавить продукт</Text>
        <Pressable
          onPress={() => router.back()}
          className="active:opacity-60 h-9 w-9 items-center justify-center rounded-full bg-muted"
          accessibilityRole="button"
          accessibilityLabel="Закрыть"
        >
          <X size={18} color="#71717A" strokeWidth={2} />
        </Pressable>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="gap-4 px-4 py-5">

          {/* название + статус классификации */}
          <View>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Название"
                  placeholder="Молоко, Творог..."
                  autoFocus
                  returnKeyType="next"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.name?.message}
                />
              )}
            />
            <View className="mt-2 h-5 justify-center">
              {isClassifying ? (
                <Skeleton className="h-3.5 w-40 rounded-md" />
              ) : classifyResult ? (
                <View className="flex-row items-center gap-1.5">
                  <CheckCircle2 size={13} color="#6366F1" strokeWidth={2} />
                  <Text className="text-sm text-accent">Категория определена</Text>
                  <Pressable onPress={handleManualClassify} hitSlop={8}>
                    <Text className="text-sm text-muted-foreground"> · ещё раз</Text>
                  </Pressable>
                </View>
              ) : productName.trim().length >= 2 ? (
                <Text className="text-xs text-muted-foreground">Определяем категорию...</Text>
              ) : null}
            </View>
          </View>

          {/* категории */}
          <View>
            <Text className="mb-2 text-sm font-medium text-foreground">Категория</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
              <View className="flex-row gap-2">
                {categories?.map((cat) => {
                  const active = selectedCategoryId === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => setValue('category_id', active ? undefined : cat.id)}
                      className={`active:opacity-70 rounded-full border px-4 py-2 ${
                        active ? 'border-accent bg-accent' : 'border-border bg-card'
                      }`}
                      accessibilityRole="button"
                    >
                      <Text
                        className={`text-sm font-medium ${
                          active ? 'text-white' : 'text-muted-foreground'
                        }`}
                      >
                        {cat.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* количество + единица */}
          <View className="flex-row gap-3">
            <View className="w-24">
              <Controller
                control={control}
                name="quantity"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Кол-во"
                    keyboardType="decimal-pad"
                    returnKeyType="next"
                    value={String(value)}
                    onChangeText={(t) => {
                      const n = parseFloat(t);
                      onChange(isNaN(n) ? 1 : n);
                    }}
                    onBlur={onBlur}
                  />
                )}
              />
            </View>
            <View className="flex-1">
              <Text className="mb-2 text-sm font-medium text-foreground">Единица</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {units?.map((u) => {
                    const active = selectedUnitId === u.id;
                    return (
                      <Pressable
                        key={u.id}
                        onPress={() => setValue('unit_id', active ? undefined : u.id)}
                        className={`active:opacity-70 rounded-full border px-3 py-2 ${
                          active ? 'border-accent bg-accent' : 'border-border bg-card'
                        }`}
                        accessibilityRole="button"
                      >
                        <Text
                          className={`text-sm font-medium ${
                            active ? 'text-white' : 'text-muted-foreground'
                          }`}
                        >
                          {u.abbreviation}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </View>

          {/* рекомендация зоны хранения */}
          {classifyResult?.zone_name && (
            <View className="flex-row items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3">
              <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-xl bg-[#EDEFFD]">
                <MapPin size={16} color="#6366F1" strokeWidth={1.5} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">Рекомендуемая зона</Text>
                <Text className="text-sm text-accent">{classifyResult.zone_name}</Text>
                {!!classifyResult.storage_tip && (
                  <Text className="mt-0.5 text-xs text-muted-foreground">
                    {classifyResult.storage_tip}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* срок годности */}
          <Input
            label="Срок годности"
            placeholder="ГГГГ-ММ-ДД"
            value={expiryText}
            onChangeText={setExpiryText}
            keyboardType="numbers-and-punctuation"
            returnKeyType="next"
            hint="Например: 2026-06-30"
          />

          {/* заметка */}
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Заметка (необязательно)"
                placeholder="Например: куплено в Пятёрочке"
                multiline
                numberOfLines={2}
                returnKeyType="done"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />
        </View>
      </ScrollView>

      <View
        className="border-t border-border bg-background px-4 py-3"
        style={{ paddingBottom: insets.bottom + 8 }}
      >
        <Button
          variant="primary"
          size="lg"
          isLoading={saveMutation.isPending}
          onPress={handleSubmit(onSubmit)}
        >
          Сохранить
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
