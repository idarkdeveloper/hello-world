import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, TextInput, Alert, Platform,
} from 'react-native';
import { Pedometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../utils/constants';
import {
  fmtNum, distanceFromSteps, calBurnedFromSteps, activeMinFromSteps,
} from '../utils/calculations';
import ProgressRing from '../components/ProgressRing';
import { useApp } from '../context/AppContext';

export default function StepsScreen() {
  const { state, addSteps, setSteps, resetSteps, showToast } = useApp();
  const { profile, dailyData } = state;

  const [manualInput, setManualInput] = useState('');
  const [pedometerActive, setPedometerActive] = useState(false);
  const [pedometerAvailable, setPedometerAvailable] = useState(null);
  const [statusText, setStatusText] = useState('Checking sensor availability…');

  const subscriptionRef = useRef(null);
  const lastCountRef = useRef(0);

  const steps = dailyData.steps;
  const goal = profile?.stepGoal || 10000;
  const stepPct = Math.min(100, (steps / goal) * 100);
  const distance = distanceFromSteps(steps);
  const burned = calBurnedFromSteps(steps, profile);
  const activeMin = activeMinFromSteps(steps);

  useEffect(() => {
    Pedometer.isAvailableAsync().then((avail) => {
      setPedometerAvailable(avail);
      if (avail) {
        setStatusText('Tap Start to automatically count steps using your device sensor.');
      } else {
        setStatusText('Pedometer not available on this device. Use manual entry below.');
      }
    });
    return () => stopPedometer();
  }, []);

  const startPedometer = useCallback(async () => {
    if (!pedometerAvailable) {
      showToast('Pedometer not available. Use manual entry.');
      return;
    }
    lastCountRef.current = 0;
    subscriptionRef.current = Pedometer.watchStepCount((result) => {
      const delta = result.steps - lastCountRef.current;
      if (delta > 0) {
        addSteps(delta);
        lastCountRef.current = result.steps;
      }
    });
    setPedometerActive(true);
    setStatusText('Pedometer active — keep your phone in your pocket or hand.');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showToast('Pedometer started 🚶');
  }, [pedometerAvailable, addSteps, showToast]);

  const stopPedometer = useCallback(async () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    setPedometerActive(false);
    setStatusText('Pedometer stopped. Tap Start to resume.');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleAddManual = async () => {
    const n = parseInt(manualInput, 10);
    if (!n || n < 1) { showToast('Enter a valid step count.'); return; }
    addSteps(n);
    setManualInput('');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showToast(`Added ${fmtNum(n)} steps!`);
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Steps',
      "Reset today's steps to 0?",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            if (pedometerActive) await stopPedometer();
            resetSteps();
            showToast('Steps reset to 0');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Step Counter</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Big Ring */}
        <View style={styles.ringWrap}>
          <ProgressRing
            size={200}
            strokeWidth={14}
            progress={stepPct}
            color={COLORS.primaryLight}
            value={fmtNum(steps)}
            label="steps today"
            valueStyle={styles.bigCount}
            labelStyle={styles.bigLabel}
          />
          <Text style={styles.goalText}>
            Goal: {fmtNum(goal)} steps
          </Text>
          <Text style={[styles.remainingText, steps >= goal && { color: COLORS.success }]}>
            {steps >= goal
              ? '🎉 Daily goal reached!'
              : `${fmtNum(Math.max(0, goal - steps))} more to go`}
          </Text>
        </View>

        {/* Stat Row */}
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
            <Text style={styles.statVal}>{activeMin}</Text>
            <Text style={styles.statLbl}>active min</Text>
          </View>
        </View>

        {/* Pedometer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 Auto Pedometer</Text>
          <Text style={styles.sectionSub}>{statusText}</Text>
          <TouchableOpacity
            style={[styles.btn, pedometerActive ? styles.btnDanger : styles.btnPrimary]}
            onPress={pedometerActive ? stopPedometer : startPedometer}
            activeOpacity={0.8}
          >
            <Text style={styles.btnText}>
              {pedometerActive ? '⏹  Stop Pedometer' : '▶  Start Pedometer'}
            </Text>
          </TouchableOpacity>
          {pedometerActive && (
            <View style={styles.activeIndicator}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>Counting your steps…</Text>
            </View>
          )}
        </View>

        {/* Manual Entry */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✏️ Manual Entry</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={manualInput}
              onChangeText={setManualInput}
              placeholder="Enter steps to add"
              placeholderTextColor={COLORS.text2}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={handleAddManual}
            />
            <TouchableOpacity style={[styles.btn, styles.btnSecondary, styles.addBtn]} onPress={handleAddManual} activeOpacity={0.8}>
              <Text style={styles.btnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reset */}
        <TouchableOpacity style={[styles.btn, styles.btnOutlineDanger]} onPress={handleReset} activeOpacity={0.8}>
          <Text style={[styles.btnText, { color: COLORS.danger }]}>↺  Reset Steps</Text>
        </TouchableOpacity>
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
  content: { padding: 16, paddingBottom: 32, alignItems: 'center' },

  ringWrap: { alignItems: 'center', marginBottom: 20, marginTop: 8 },
  bigCount: { fontSize: 36, fontWeight: '900', color: COLORS.text },
  bigLabel: { fontSize: 13, color: COLORS.text2 },
  goalText: { fontSize: 14, color: COLORS.text2, marginTop: 12 },
  remainingText: { fontSize: 13, color: COLORS.text2, marginTop: 4 },

  statsRow: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
  },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  statLbl: { fontSize: 10, color: COLORS.text2, marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: COLORS.border },

  section: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '100%',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  sectionSub: { fontSize: 12, color: COLORS.text2, marginBottom: 12, lineHeight: 18 },

  inputRow: { flexDirection: 'row', gap: 10 },
  input: {
    flex: 1,
    backgroundColor: COLORS.bg3,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 15,
  },
  addBtn: { paddingHorizontal: 20 },

  btn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    width: '100%',
  },
  btnSecondary: { backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border },
  btnDanger: { backgroundColor: COLORS.danger, width: '100%' },
  btnOutlineDanger: {
    borderWidth: 1,
    borderColor: COLORS.danger,
    width: '100%',
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  activeIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  activeDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: COLORS.success,
    shadowColor: COLORS.success, shadowOpacity: 0.8, shadowRadius: 4,
  },
  activeText: { fontSize: 12, color: COLORS.success, fontWeight: '600' },
});
