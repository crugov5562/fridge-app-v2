import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Trash2 } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { InventoryItem, Unit } from '@/lib/api';

export interface ItemEditPatch {
  name: string;
  expiry_date?: string;
  quantity: number;
  unit_id?: string;
}

interface Props {
  item: InventoryItem | null;
  units: Unit[];
  onClose: () => void;
  onSave: (patch: ItemEditPatch) => void;
  onDelete: () => void;
  isSaving: boolean;
  isDeleting: boolean;
}

export function ItemEditModal({ item, units, onClose, onSave, onDelete, isSaving, isDeleting }: Props) {
  const [name, setName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitId, setUnitId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setExpiry(item.expiry_date ?? '');
      setQuantity(String(item.quantity ?? 1));
      setUnitId(item.unit_id ?? undefined);
    }
  }, [item?.id]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const qty = parseFloat(quantity);
    onSave({
      name: trimmed,
      expiry_date: expiry.trim() || undefined,
      quantity: isNaN(qty) || qty <= 0 ? 1 : qty,
      unit_id: unitId,
    });
  };

  return (
    <Modal visible={!!item} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.55)',
        }}
      >
        <Pressable style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} onPress={onClose} />

        <View className="w-[90%] rounded-3xl bg-card p-5">
          {/* заголовок */}
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-foreground">Редактировать</Text>
            <Pressable
              onPress={onClose}
              className="h-8 w-8 items-center justify-center rounded-full bg-muted"
              accessibilityRole="button"
              accessibilityLabel="Закрыть"
            >
              <X size={16} color="#71717A" strokeWidth={2} />
            </Pressable>
          </View>

          {/* поля */}
          <View className="gap-4">
            <Input
              label="Название"
              value={name}
              onChangeText={setName}
              autoCapitalize="sentences"
              returnKeyType="next"
            />

            {/* количество + единица */}
            <View className="flex-row gap-3">
              <View className="w-24">
                <Input
                  label="Кол-во"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1.5 text-sm font-medium text-foreground">Единица</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {units.map((u) => {
                      const active = unitId === u.id;
                      return (
                        <Pressable
                          key={u.id}
                          onPress={() => setUnitId(active ? undefined : u.id)}
                          className={`active:opacity-70 rounded-full border px-3 py-2 ${
                            active ? 'border-accent bg-accent' : 'border-border bg-muted'
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

            <Input
              label="Срок годности (ГГГГ-ММ-ДД)"
              value={expiry}
              onChangeText={setExpiry}
              placeholder="2025-12-31"
              keyboardType="numbers-and-punctuation"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>

          {/* кнопки */}
          <View className="mt-5 gap-2">
            <Button variant="primary" size="lg" isLoading={isSaving} onPress={handleSave}>
              Сохранить
            </Button>
            <Pressable
              onPress={onDelete}
              disabled={isDeleting}
              className="active:opacity-70 flex-row items-center justify-center gap-2 py-3"
              accessibilityRole="button"
            >
              <Trash2 size={16} color="#ef4444" strokeWidth={1.5} />
              <Text className="font-medium text-destructive">
                {isDeleting ? 'Удаление...' : 'Удалить товар'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
