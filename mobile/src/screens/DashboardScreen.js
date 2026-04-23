import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
} from 'react-native';
import { COLORS, TIPS } from '../utils/constants';
import {
  calcTDEE, totalCalTaken, fmtNum,
  calBurnedFromSteps, distanceFromSteps,
} from '../utils/calculations';
import ProgressRing from '../components/ProgressRing';
import { useApp } from '../context/AppContext';

export default function DashboardScreen() {
  const { state } = useApp();
  const { profile, dailyData } = state;

  const [tip, setTip] = useState(TIPS[0]);

  useEffect(() => {
    setTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
    const id = setInterval(() => {
      setTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const tdee = useMemo(() => calcTDEE(profile), [profile]);
  const taken = useMemo(() => totalCalTaken(dailyData.foods), [dailyData.foods]);
  const goal = profile?.stepGoal || 10000;
  const steps = dailyData.steps;

  const stepPct = Math.min(100, (steps / goal) * 100);
  const calPct = tdee ? Math.min(100, (taken / tdee) * 100) : 0;
  const calRemaining = tdee ? Math.max(0, tdee - taken) : null;
  const isOver = tdee && taken > tdee;
  const burned = calBurnedFromSteps(steps, profile);
  const distance = distanceFromSteps(steps);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>🏃 FitTrack</Text>
        <Text style={styles.date}>{today}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View style={styles.grid}>
          {/* Steps card */}
          <View style={[styles.card, styles.stepsCard]}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.cardIcon}>🚶</Text>
                <Text style={styles.cardValue}>{fmtNum(steps)}</Text>
                <Text style={styles.cardLabel}>Steps Today</Text>
              </View>
              <ProgressRing
                size={64}
                strokeWidth={6}
                progress={stepPct}
                color={COLORS.primaryLight}
                value={`${Math.round(stepPct)}%`}
                valueStyle={{ fontSize: 11, fontWeight: '700', color: COLORS.primaryLight }}
              />
            </View>
            <Text style={styles.cardSub}>
              Goal: {fmtNum(goal)} steps
            </Text>
          </View>

          {/* Cal Required card */}
          <View style={[styles.card, styles.calNeededCard]}>
            <Text style={styles.cardIcon}>🔥</Text>
            <Text style={styles.cardValue}>{tdee ? fmtNum(tdee) : '--'}</Text>
            <Text style={styles.cardLabel}>Calories Required</Text>
            <Text style={styles.cardSub}>Daily TDEE goal</Text>
          </View>

          {/* Cal Taken card */}
          <View style={[styles.card, styles.calTakenCard]}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.cardIcon}>🍽️</Text>
                <Text style={styles.cardValue}>{fmtNum(taken)}</Text>
                <Text style={styles.cardLabel}>Calories Taken</Text>
              </View>
              <ProgressRing
                size={64}
                strokeWidth={6}
                progress={calPct}
                color={COLORS.accent}
                value={`${Math.round(calPct)}%`}
                valueStyle={{ fontSize: 11, fontWeight: '700', color: COLORS.accent }}
              />
            </View>
            <Text style={styles.cardSub}>
              {calRemaining !== null
                ? isOver
                  ? `${fmtNum(taken - tdee)} kcal over`
                  : `${fmtNum(calRemaining)} kcal left`
                : 'Set profile to see goal'}
            </Text>
          </View>

          {/* Burned / Distance card */}
          <View style={[styles.card, styles.burnedCard]}>
            <Text style={styles.cardIcon}>⚡</Text>
            <Text style={styles.cardValue}>{fmtNum(burned)}</Text>
            <Text style={styles.cardLabel}>Kcal Burned</Text>
            <Text style={styles.cardSub}>{distance} km walked</Text>
          </View>
        </View>

        {/* Balance Bar */}
        <View style={styles.balanceCard}>
          <Text style={styles.sectionTitle}>Calorie Balance</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balText}>Required: <Text style={styles.balBold}>{tdee ? fmtNum(tdee) : '--'} kcal</Text></Text>
            <Text style={styles.balText}>Taken: <Text style={[styles.balBold, isOver && { color: COLORS.danger }]}>{fmtNum(taken)} kcal</Text></Text>
          </View>
          <View style={styles.balanceTrack}>
            <View
              style={[
                styles.balanceFill,
                { width: `${Math.min(100, calPct)}%` },
                isOver && { backgroundColor: COLORS.danger },
              ]}
            />
          </View>
          <Text style={styles.balanceMsg}>
            {!tdee
              ? 'Set up your profile to see your calorie goal.'
              : taken === 0
              ? "You haven't logged any food yet."
              : isOver
              ? `You're ${fmtNum(taken - tdee)} kcal over your goal.`
              : `${fmtNum(calRemaining)} kcal remaining for today.`}
          </Text>
        </View>

        {/* Quick Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{distance}</Text>
            <Text style={styles.statLbl}>km</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{fmtNum(burned)}</Text>
            <Text style={styles.statLbl}>kcal burned</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{Math.round(steps / 100)}</Text>
            <Text style={styles.statLbl}>active min</Text>
          </View>
        </View>

        {/* Daily Tip */}
        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={styles.tipText}>{tip}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: { fontSize: 20, fontWeight: '800', color: '#fff' },
  date: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  content: { padding: 16, paddingBottom: 24 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '47.5%',
  },
  stepsCard: { borderTopColor: COLORS.primaryLight, borderTopWidth: 3 },
  calNeededCard: { borderTopColor: COLORS.warning, borderTopWidth: 3 },
  calTakenCard: { borderTopColor: COLORS.accent, borderTopWidth: 3 },
  burnedCard: { borderTopColor: COLORS.success, borderTopWidth: 3 },

  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardIcon: { fontSize: 22, marginBottom: 6 },
  cardValue: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  cardLabel: { fontSize: 11, color: COLORS.text2, marginTop: 3 },
  cardSub: { fontSize: 10, color: COLORS.text2, marginTop: 6 },

  balanceCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 13, color: COLORS.text2, fontWeight: '700', marginBottom: 10 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  balText: { fontSize: 12, color: COLORS.text2 },
  balBold: { color: COLORS.text, fontWeight: '700' },
  balanceTrack: { height: 10, backgroundColor: COLORS.bg3, borderRadius: 99, overflow: 'hidden', marginBottom: 8 },
  balanceFill: { height: '100%', backgroundColor: COLORS.success, borderRadius: 99 },
  balanceMsg: { fontSize: 12, color: COLORS.text2 },

  statsRow: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 14,
  },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  statLbl: { fontSize: 10, color: COLORS.text2, marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: COLORS.border },

  tipCard: {
    backgroundColor: COLORS.bg2,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  tipIcon: { fontSize: 20 },
  tipText: { flex: 1, fontSize: 13, color: COLORS.text2, lineHeight: 20 },
});
