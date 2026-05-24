import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowDown,
  ArrowUp,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pencil,
  Trash2,
} from 'lucide-react-native';
import type { EnrichedItem } from './ReceiptScanner';
import { formatDaysLabel } from './ReceiptScanner';

const { width: W, height: H } = Dimensions.get('window');
const CARD_W = W - 48;
const CARD_H = Math.min(H * 0.71, 560);
const ILLUS_H = Math.floor(CARD_H * 0.48);
const SWIPE_V = 80;
const SWIPE_H = 60;

const L1 = { scale: 0.96, ty: CARD_H * 0.02 + 8,  opacity: 0.85 };
const L2 = { scale: 0.92, ty: CARD_H * 0.04 + 16, opacity: 0.60 };
const L3 = { scale: 0.88, ty: CARD_H * 0.06 + 24, opacity: 0.38 };

const DIR_NONE = 0, DIR_H = 1, DIR_V = 2;

const ACCENTS = ['#F97316', '#6366F1', '#EC4899', '#F59E0B', '#8B5CF6', '#06B6D4'];
function accentFor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return ACCENTS[h % ACCENTS.length];
}

// ── Card ──────────────────────────────────────────────────────────────────────
interface CardProps {
  item: EnrichedItem;
  layer?: { scale: number; ty: number; opacity: number };
  isEditing?: boolean;
  draftName?: string;
  draftExpiry?: string;
  onDraftNameChange?: (v: string) => void;
  onDraftExpiryChange?: (v: string) => void;
  onEditStart?: () => void;
  onEditSave?: () => void;
  onEditCancel?: () => void;
  onPhoto?: () => void;
}

function Card({
  item, layer,
  isEditing, draftName, draftExpiry,
  onDraftNameChange, onDraftExpiryChange,
  onEditStart, onEditSave, onEditCancel, onPhoto,
}: CardProps) {
  const color = accentFor(item.name);
  const isTop = !!onEditStart;

  return (
    <View
      style={[
        s.card,
        layer && {
          transform: [{ scale: layer.scale }, { translateY: layer.ty }],
          opacity: layer.opacity,
        },
      ]}
    >
      {/* illustration */}
      <View style={[s.illus, { backgroundColor: color }]}>
        {item.photo_uri ? (
          <Image
            source={{ uri: item.photo_uri }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
        ) : (
          <View style={s.letterCircle}>
            <Text style={s.letter}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        {item.isClassifying && (
          <View style={s.classifyBadge}>
            <Text style={s.classifyText}>Определяем категорию...</Text>
          </View>
        )}
        {isTop && (
          <Pressable onPress={onPhoto} style={s.camBtn} hitSlop={10}>
            <Camera size={18} color="#6366F1" strokeWidth={2} />
          </Pressable>
        )}
      </View>

      {/* body: view mode vs edit mode */}
      {isEditing ? (
        <View style={s.editBody}>
          <Text style={s.editLabel}>Название</Text>
          <TextInput
            style={s.editInput}
            value={draftName}
            onChangeText={onDraftNameChange}
            placeholder="Название продукта"
            placeholderTextColor="#C4C4D0"
            returnKeyType="next"
            autoFocus
          />
          <Text style={[s.editLabel, s.editLabelGap]}>Срок годности</Text>
          <TextInput
            style={s.editInput}
            value={draftExpiry}
            onChangeText={onDraftExpiryChange}
            placeholder="ГГГГ-ММ-ДД"
            placeholderTextColor="#C4C4D0"
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
            onSubmitEditing={onEditSave}
          />
          <View style={s.editFooter}>
            <Pressable onPress={onEditCancel} style={s.editCancelBtn}>
              <Text style={s.editCancelText}>Отмена</Text>
            </Pressable>
            <Pressable onPress={onPhoto} style={s.editCamBtn}>
              <Camera size={17} color="#6366F1" strokeWidth={2} />
            </Pressable>
            <Pressable onPress={onEditSave} style={s.editSaveBtn}>
              <Check size={15} color="white" strokeWidth={2.5} />
              <Text style={s.editSaveBtnText}>Готово</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={s.body}>
          <View style={s.nameRow}>
            <Text style={s.name} numberOfLines={2}>{item.name}</Text>
            {isTop && (
              <Pressable onPress={onEditStart} style={s.editBtn} hitSlop={10}>
                <Pencil size={16} color="#9E9E9E" strokeWidth={2} />
              </Pressable>
            )}
          </View>
          <View style={s.meta}>
            <View style={s.qtyPill}>
              <Text style={s.qtyText}>{item.quantity} {item.unit}</Text>
            </View>
            {item.category_name && (
              <View style={[s.pill, { backgroundColor: color + '22' }]}>
                <Text style={[s.pillText, { color }]}>{item.category_name}</Text>
              </View>
            )}
            {item.zone_name && (
              <View style={s.pillGray}>
                <Text style={s.pillGrayText}>{item.zone_name}</Text>
              </View>
            )}
          </View>
          {item.expiry_date && (
            <View style={s.expiryRow}>
              <Clock size={13} color="#9E9E9E" strokeWidth={2} />
              <Text style={s.expiryText}>{formatDaysLabel(item.expiry_date)}</Text>
            </View>
          )}
          {item.price != null && <Text style={s.price}>{item.price} ₽</Text>}
        </View>
      )}
    </View>
  );
}

// ── SwipeCardDeck ─────────────────────────────────────────────────────────────
export interface SwipeCardDeckHandle {
  getAddedItems: () => EnrichedItem[];
}

interface Props {
  items: EnrichedItem[];
  onUpdate: (idx: number, patch: Partial<EnrichedItem>) => void;
  onAllDone?: (addedItems: EnrichedItem[]) => void;
}

export const SwipeCardDeck = React.forwardRef<SwipeCardDeckHandle, Props>(
  function SwipeCardDeck({ items, onUpdate, onAllDone }, ref) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [draftName, setDraftName] = useState('');
    const [draftExpiry, setDraftExpiry] = useState('');
    const decisionsRef = useRef<Map<number, 'add' | 'delete'>>(new Map());
    const onAllDoneRef = useRef(onAllDone);
    useEffect(() => { onAllDoneRef.current = onAllDone; }, [onAllDone]);

    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const busy = useSharedValue(false);
    const gestureDir = useSharedValue(DIR_NONE);
    const isAtLast = useSharedValue(currentIndex >= items.length - 1);
    const isAtFirst = useSharedValue(currentIndex === 0);
    const isEditingSV = useSharedValue(false);

    useEffect(() => {
      isAtLast.value = currentIndex >= items.length - 1;
      isAtFirst.value = currentIndex === 0;
    }, [currentIndex, items.length, isAtLast, isAtFirst]);

    useEffect(() => {
      isEditingSV.value = isEditing;
    }, [isEditing, isEditingSV]);

    useEffect(() => {
      setIsEditing(false);
    }, [currentIndex]);

    useImperativeHandle(
      ref,
      () => ({ getAddedItems: () => items.filter((_, i) => decisionsRef.current.get(i) === 'add') }),
      [items],
    );

    const advance = useCallback(
      (decision: 'add' | 'delete' | null, direction: 'forward' | 'back') => {
        if (decision !== null) decisionsRef.current.set(currentIndex, decision);
        const isBack = direction === 'back';
        setTimeout(() => {
          const next = isBack ? currentIndex - 1 : currentIndex + 1;
          if (next < 0) {
            translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
            translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
            busy.value = false;
            return;
          }
          setCurrentIndex(next);
          translateX.value = 0;
          translateY.value = 0;
          busy.value = false;
          if (next >= items.length) {
            const added = items.filter((_, i) => decisionsRef.current.get(i) === 'add');
            onAllDoneRef.current?.(added);
          }
        }, decision !== null ? 300 : 180);
      },
      [currentIndex, items.length, translateX, translateY, busy],
    );

    const handleEditStart = useCallback(() => {
      const item = items[currentIndex];
      if (!item) return;
      setDraftName(item.name);
      setDraftExpiry(item.expiry_date ?? '');
      setIsEditing(true);
    }, [items, currentIndex]);

    const handleEditSave = useCallback(() => {
      const name = draftName.trim() || (items[currentIndex]?.name ?? '');
      onUpdate(currentIndex, { name, expiry_date: draftExpiry || undefined });
      setIsEditing(false);
    }, [draftName, draftExpiry, currentIndex, items, onUpdate]);

    const panGesture = Gesture.Pan()
      .onStart(() => { gestureDir.value = DIR_NONE; })
      .onUpdate((e) => {
        if (busy.value || isEditingSV.value) return;
        const ax = Math.abs(e.translationX);
        const ay = Math.abs(e.translationY);
        if (gestureDir.value === DIR_NONE && (ax > 8 || ay > 8)) {
          gestureDir.value = ax >= ay ? DIR_H : DIR_V;
        }
        if (gestureDir.value === DIR_H) {
          translateX.value = e.translationX;
          translateY.value = 0;
        } else if (gestureDir.value === DIR_V) {
          translateX.value = 0;
          translateY.value = e.translationY;
        }
      })
      .onEnd((e) => {
        if (busy.value || isEditingSV.value) return;
        const dir = gestureDir.value;
        gestureDir.value = DIR_NONE;

        if (dir === DIR_V) {
          if (e.translationY < -SWIPE_V) {
            busy.value = true;
            translateY.value = withTiming(-H, { duration: 300 });
            runOnJS(advance)('delete', 'forward');
          } else if (e.translationY > SWIPE_V) {
            busy.value = true;
            translateY.value = withTiming(H, { duration: 300 });
            runOnJS(advance)('add', 'forward');
          } else {
            translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
            translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
          }
        } else if (dir === DIR_H) {
          if (e.translationX < -SWIPE_H) {
            if (isAtLast.value) {
              translateX.value = withSpring(0, { damping: 22, stiffness: 220 });
            } else {
              busy.value = true;
              translateX.value = withTiming(-W * 1.3, { duration: 250 });
              runOnJS(advance)(null, 'forward');
            }
          } else if (e.translationX > SWIPE_H) {
            if (isAtFirst.value) {
              translateX.value = withSpring(0, { damping: 22, stiffness: 220 });
            } else {
              busy.value = true;
              translateX.value = withTiming(W * 1.3, { duration: 250 });
              runOnJS(advance)(null, 'back');
            }
          } else {
            translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
            translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
          }
        } else {
          translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
          translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
        }
      });

    const topCardStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    }));

    const nextCardStyle = useAnimatedStyle(() => {
      const hProg = Math.min(Math.abs(translateX.value) / W, 1);
      const vProg = Math.min(Math.abs(translateY.value) / H, 1);
      const factor =
        gestureDir.value === DIR_H ? hProg :
        gestureDir.value === DIR_V ? vProg : 0;
      return {
        transform: [
          { scale: interpolate(factor, [0, 1], [L1.scale, 1.0], Extrapolation.CLAMP) },
          { translateY: interpolate(factor, [0, 1], [L1.ty, 0], Extrapolation.CLAMP) },
        ],
        opacity: interpolate(factor, [0, 0.25], [L1.opacity, 1.0], Extrapolation.CLAMP),
      };
    });

    const deleteOpacity = useAnimatedStyle(() => ({
      opacity: gestureDir.value !== DIR_H
        ? interpolate(translateY.value, [0, -60], [0, 1], Extrapolation.CLAMP) : 0,
    }));
    const addOpacity = useAnimatedStyle(() => ({
      opacity: gestureDir.value !== DIR_H
        ? interpolate(translateY.value, [0, 60], [0, 1], Extrapolation.CLAMP) : 0,
    }));
    const leftArrowOpacity = useAnimatedStyle(() => ({
      opacity: gestureDir.value !== DIR_V
        ? interpolate(translateX.value, [0, -60], [0, 0.9], Extrapolation.CLAMP) : 0,
    }));
    const rightArrowOpacity = useAnimatedStyle(() => ({
      opacity: gestureDir.value !== DIR_V
        ? interpolate(translateX.value, [0, 60], [0, 0.9], Extrapolation.CLAMP) : 0,
    }));

    const handlePickPhoto = useCallback(async (idx: number) => {
      const src = await new Promise<'camera' | 'library' | null>((res) => {
        Alert.alert('Фото продукта', 'Выберите источник', [
          { text: 'Камера', onPress: () => res('camera') },
          { text: 'Галерея', onPress: () => res('library') },
          { text: 'Отмена', style: 'cancel', onPress: () => res(null) },
        ]);
      });
      if (!src) return;
      const r = src === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.75, allowsEditing: true, aspect: [1, 1] })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.75, allowsEditing: true, aspect: [1, 1] });
      if (!r.canceled) onUpdate(idx, { photo_uri: r.assets[0].uri });
    }, [onUpdate]);

    if (currentIndex >= items.length) {
      return (
        <View style={s.doneRoot}>
          <View style={s.doneCard}>
            <Check size={52} color="#6366F1" strokeWidth={1.5} />
            <Text style={s.doneTitle}>Все карточки просмотрены</Text>
            <Text style={s.doneSub}>Нажмите ← чтобы сохранить выбранные товары</Text>
          </View>
        </View>
      );
    }

    const progress = Math.min(100, Math.round((currentIndex / items.length) * 100));

    return (
      <KeyboardAvoidingView
        style={s.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={80}
      >
        {/* progress bar */}
        <View style={s.progressRow}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progress}%` as `${number}%` }]} />
          </View>
          <Text style={s.progressText}>{currentIndex + 1} / {items.length}</Text>
        </View>

        {/* gesture hints — hidden while editing */}
        {!isEditing && (
          <View style={s.hintsRow}>
            <View style={s.hint}>
              <ArrowUp size={12} color="#EF4444" strokeWidth={2.5} />
              <Text style={[s.hintText, { color: '#EF4444' }]}>Удалить</Text>
            </View>
            <View style={s.navHint}>
              <ChevronLeft size={13} color="#C4C4D0" strokeWidth={2} />
              <Text style={s.navHintText}>Листать</Text>
              <ChevronRight size={13} color="#C4C4D0" strokeWidth={2} />
            </View>
            <View style={s.hint}>
              <ArrowDown size={12} color="#6366F1" strokeWidth={2.5} />
              <Text style={[s.hintText, { color: '#6366F1' }]}>В холодильник</Text>
            </View>
          </View>
        )}

        {/* card stack */}
        <View style={s.deck}>
          {currentIndex + 3 < items.length && (
            <View style={[StyleSheet.absoluteFillObject, s.slot]}>
              <Card item={items[currentIndex + 3]} layer={L3} />
            </View>
          )}
          {currentIndex + 2 < items.length && (
            <View style={[StyleSheet.absoluteFillObject, s.slot]}>
              <Card item={items[currentIndex + 2]} layer={L2} />
            </View>
          )}
          {currentIndex + 1 < items.length && (
            <Animated.View style={[StyleSheet.absoluteFillObject, s.slot, nextCardStyle]}>
              <Card item={items[currentIndex + 1]} />
            </Animated.View>
          )}
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[StyleSheet.absoluteFillObject, s.slot, topCardStyle]}>
              <View style={s.topWrapper}>
                <Card
                  item={items[currentIndex]}
                  isEditing={isEditing}
                  draftName={draftName}
                  draftExpiry={draftExpiry}
                  onDraftNameChange={setDraftName}
                  onDraftExpiryChange={setDraftExpiry}
                  onEditStart={handleEditStart}
                  onEditSave={handleEditSave}
                  onEditCancel={() => setIsEditing(false)}
                  onPhoto={() => handlePickPhoto(currentIndex)}
                />
                {!isEditing && (
                  <>
                    <Animated.View style={[s.overlayFull, s.overlayDelete, deleteOpacity]}>
                      <Trash2 size={44} color="white" strokeWidth={2} />
                      <Text style={s.overlayText}>Удалить</Text>
                    </Animated.View>
                    <Animated.View style={[s.overlayFull, s.overlayAdd, addOpacity]}>
                      <Check size={44} color="white" strokeWidth={2.5} />
                      <Text style={s.overlayText}>В холодильник</Text>
                    </Animated.View>
                  </>
                )}
              </View>
              {!isEditing && (
                <>
                  <Animated.View style={[s.arrow, { left: 14 }, leftArrowOpacity]}>
                    <ChevronLeft size={28} color="#6366F1" strokeWidth={2.5} />
                  </Animated.View>
                  <Animated.View style={[s.arrow, { right: 14 }, rightArrowOpacity]}>
                    <ChevronRight size={28} color="#6366F1" strokeWidth={2.5} />
                  </Animated.View>
                </>
              )}
            </Animated.View>
          </GestureDetector>
        </View>
      </KeyboardAvoidingView>
    );
  },
);

// ── styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, paddingTop: 4, paddingBottom: 8 },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  progressTrack: { flex: 1, height: 4, backgroundColor: '#E8E8F0', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#6366F1', borderRadius: 2 },
  progressText: { fontSize: 12, color: '#9E9E9E', fontWeight: '500', minWidth: 44, textAlign: 'right' },

  hintsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hintText: { fontSize: 11, fontWeight: '600' },
  navHint: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  navHintText: { fontSize: 11, color: '#C4C4D0', fontWeight: '500' },

  deck: { flex: 1 },
  slot: { alignItems: 'center', justifyContent: 'center' },
  topWrapper: { width: CARD_W, height: CARD_H, borderRadius: 28, overflow: 'hidden' },

  card: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 12,
  },
  illus: { height: ILLUS_H, alignItems: 'center', justifyContent: 'center' },
  letterCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  letter: { fontSize: 40, fontWeight: '900', color: 'white' },
  classifyBadge: {
    position: 'absolute', bottom: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  classifyText: { fontSize: 12, color: '#6366F1', fontWeight: '600' },
  camBtn: {
    position: 'absolute', bottom: 14, right: 14,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },

  // view mode
  body: { flex: 1, padding: 20, gap: 9, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  name: { flex: 1, fontSize: 21, fontWeight: '800', color: '#1A1A2E', lineHeight: 26 },
  editBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#F5F5F8',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7 },
  qtyPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: '#F5F5F8' },
  qtyText: { fontSize: 13, color: '#9E9E9E', fontWeight: '500' },
  pill: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20 },
  pillText: { fontSize: 12, fontWeight: '600' },
  pillGray: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20, backgroundColor: '#F0F0F5' },
  pillGrayText: { fontSize: 12, color: '#9E9E9E' },
  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  expiryText: { fontSize: 13, color: '#9E9E9E' },
  price: { fontSize: 19, fontWeight: '300', color: '#1A1A2E' },

  // edit mode
  editBody: { flex: 1, paddingHorizontal: 20, paddingVertical: 16, justifyContent: 'center' },
  editLabel: { fontSize: 11, fontWeight: '600', color: '#9E9E9E', marginBottom: 6 },
  editLabelGap: { marginTop: 12 },
  editInput: {
    borderWidth: 1.5,
    borderColor: '#E8E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    color: '#1A1A2E',
    backgroundColor: '#FAFAFA',
  },
  editFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  editCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: '#F5F5F8',
  },
  editCancelText: { fontSize: 14, fontWeight: '600', color: '#9E9E9E' },
  editCamBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#EDEFFD',
    alignItems: 'center', justifyContent: 'center',
  },
  editSaveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#6366F1',
  },
  editSaveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // swipe overlays
  overlayFull: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  overlayDelete: { backgroundColor: 'rgba(239,68,68,0.9)' },
  overlayAdd:    { backgroundColor: 'rgba(99,102,241,0.88)' },
  overlayText: { fontSize: 22, fontWeight: '800', color: 'white' },

  arrow: {
    position: 'absolute',
    top: '50%', marginTop: -24,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(99,102,241,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },

  // done screen
  doneRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  doneCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 48, paddingHorizontal: 32,
    alignItems: 'center', gap: 16,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.10, shadowRadius: 24, elevation: 10,
  },
  doneTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A2E', textAlign: 'center' },
  doneSub: { fontSize: 14, color: '#9E9E9E', textAlign: 'center', lineHeight: 20 },
});
