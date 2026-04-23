import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, TextInput, Alert, FlatList,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, QUICK_FOODS } from '../utils/constants';
import {
  calcTDEE, totalCalTaken, fmtNum, calBurnedFromSteps,
} from '../utils/calculations';
import ProgressRing from '../components/ProgressRing';
import { useApp } from '../context/AppContext';

export default function CaloriesScreen() {
  const { state, addFood, removeFood, clearFoods, showToast } = useApp();
  const { profile, dailyData } = state;

  const [foodName, setFoodName] = useState('');
  const [foodCal, setFoodCal] = useState('');

  const tdee = useMemo(() => calcTDEE(profile), [profile]);
  const taken = useMemo(() => totalCalTaken(dailyData.foods), [dailyData.foods]);
  const burned = calBurnedFromSteps(dailyData.steps, profile);
  const remaining = tdee ? Math.max(0, tdee - taken) : null;
  const calPct = tdee ? Math.min(100, (taken / tdee) * 100) : 0;
  const isOver = tdee && taken > tdee;

  const handleAddFood = async (name, cal) => {
    const n = name?.trim();
    const c = parseInt(cal, 10);
    if (!n || !c || c < 1) { showToast('Enter a valid food name and calories.'); return; }
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    addFood({ name: n, cal: c, time });
    setFoodName('');
    setFoodCal('');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showToast(`Added ${n} (${c} kcal)`);
  };

  const handleRemove = (idx) => {
    removeFood(idx);
    showToast('Removed from log');
  };

  const handleClearAll = () => {
    if (!dailyData.foods.length) return;
    Alert.alert(
      'Clear Food Log',
      'Remove all food entries for today?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => { clearFoods(); showToast('Food log cleared'); } },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calorie Tracker</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overview */}
        <View style={styles.overview}>
          <ProgressRing
            size={160}
            strokeWidth={12}
            progress={calPct}
            color={isOver ? COLORS.danger : COLORS.accent}
            value={fmtNum(taken)}
            label="kcal eaten"
            valueStyle={styles.bigCount}
            labelStyle={styles.bigLabel}
          />
          <View style={styles.calNums}>
            <View style={styles.calNumItem}>
              <Text style={styles.calNum}>{tdee ? fmtNum(tdee) : '--'}</Text>
              <Text style={styles.calNumLbl}>🔥 Required</Text>
            </View>
            <View style={styles.calNumItem}>
              <Text style={[styles.calNum, isOver && { color: COLORS.danger }]}>
                {remaining !== null ? fmtNum(remaining) : '--'}
              </Text>
              <Text style={styles.calNumLbl}>✅ Remaining</Text>
            </View>
            <View style={styles.calNumItem}>
              <Text style={styles.calNum}>{fmtNum(burned)}</Text>
              <Text style={styles.calNumLbl}>🏃 Burned</Text>
            </View>
          </View>
        </View>

        {/* Quick Add */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🍽️ Quick Add</Text>
          <View style={styles.chips}>
            {QUICK_FOODS.map((food) => (
              <TouchableOpacity
                key={food.name}
                style={styles.chip}
                onPress={() => handleAddFood(food.name, food.cal)}
                activeOpacity={0.7}
              >
                <Text style={styles.chipText}>{food.name}</Text>
                <Text style={styles.chipCal}>{food.cal}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.customRow}>
            <TextInput
              style={[styles.input, { flex: 2 }]}
              value={foodName}
              onChangeText={setFoodName}
              placeholder="Food name"
              placeholderTextColor={COLORS.text2}
              returnKeyType="next"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={foodCal}
              onChangeText={setFoodCal}
              placeholder="kcal"
              placeholderTextColor={COLORS.text2}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={() => handleAddFood(foodName, foodCal)}
            />
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => handleAddFood(foodName, foodCal)}
              activeOpacity={0.8}
            >
              <Text style={styles.btnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Food Log */}
        <View style={styles.section}>
          <View style={styles.logHeader}>
            <Text style={styles.sectionTitle}>📋 Today's Log</Text>
            <TouchableOpacity onPress={handleClearAll} activeOpacity={0.7}>
              <Text style={styles.clearBtn}>Clear All</Text>
            </TouchableOpacity>
          </View>

          {dailyData.foods.length === 0 ? (
            <Text style={styles.emptyText}>No food logged yet. Start adding meals above!</Text>
          ) : (
            dailyData.foods.map((food, idx) => (
              <View key={idx} style={styles.foodItem}>
                <View style={styles.foodLeft}>
                  <Text style={styles.foodName}>{food.name}</Text>
                  <Text style={styles.foodTime}>{food.time}</Text>
                </View>
                <View style={styles.foodRight}>
                  <Text style={styles.foodCal}>{food.cal} kcal</Text>
                  <TouchableOpacity onPress={() => handleRemove(idx)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <Text style={styles.delBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalVal}>{fmtNum(taken)} kcal</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.bg2,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  content: { padding: 16, paddingBottom: 32 },

  overview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 16,
  },
  bigCount: { fontSize: 28, fontWeight: '900', color: COLORS.text },
  bigLabel: { fontSize: 11, color: COLORS.text2 },
  calNums: { gap: 14 },
  calNumItem: {},
  calNum: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  calNumLbl: { fontSize: 11, color: COLORS.text2, marginTop: 2 },

  section: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 12 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    backgroundColor: COLORS.bg3,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  chipText: { fontSize: 12, color: COLORS.text, fontWeight: '600' },
  chipCal: { fontSize: 11, color: COLORS.text2 },

  customRow: { flexDirection: 'row', gap: 8 },
  input: {
    backgroundColor: COLORS.bg3,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: COLORS.text,
    fontSize: 14,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  clearBtn: { fontSize: 12, color: COLORS.danger, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: COLORS.text2, fontSize: 13, paddingVertical: 16 },

  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bg3,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  foodLeft: { flex: 1 },
  foodName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  foodTime: { fontSize: 11, color: COLORS.text2, marginTop: 2 },
  foodRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  foodCal: { fontSize: 14, fontWeight: '700', color: COLORS.accent },
  delBtn: { fontSize: 14, color: COLORS.text2 },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 4,
  },
  totalLabel: { fontSize: 14, color: COLORS.text2, fontWeight: '600' },
  totalVal: { fontSize: 16, fontWeight: '800', color: COLORS.accent },
});
