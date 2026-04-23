import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, TextInput, Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, ACTIVITY_OPTIONS } from '../utils/constants';
import {
  calcBMR, calcTDEE, calcBMI, bmiCategory, bmiBgColor, fmtNum,
} from '../utils/calculations';
import { useApp } from '../context/AppContext';

export default function ProfileScreen() {
  const { state, setProfile, resetAll, showToast } = useApp();
  const { profile } = state;

  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState('male');
  const [activity, setActivity] = useState('1.55');
  const [stepGoal, setStepGoal] = useState('10000');

  useEffect(() => {
    if (profile) {
      setAge(String(profile.age || ''));
      setWeight(String(profile.weight || ''));
      setHeight(String(profile.height || ''));
      setGender(profile.gender || 'male');
      setActivity(profile.activity || '1.55');
      setStepGoal(String(profile.stepGoal || '10000'));
    }
  }, [profile]);

  const buildProfile = () => {
    const a = parseInt(age, 10);
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const g = parseInt(stepGoal, 10) || 10000;
    if (!a || !w || !h || a < 1 || w < 1 || h < 1) return null;
    return { age: a, weight: w, height: h, gender, activity, stepGoal: g };
  };

  const handleSave = async () => {
    const p = buildProfile();
    if (!p) { showToast('Please fill in all fields correctly.'); return; }
    setProfile(p);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast('Profile saved! ✓');
  };

  const handleReset = () => {
    Alert.alert(
      'Reset All Data',
      'This will permanently delete your profile, steps, and food log. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            await resetAll();
            setAge(''); setWeight(''); setHeight('');
            setGender('male'); setActivity('1.55'); setStepGoal('10000');
            showToast('All data cleared');
          },
        },
      ],
    );
  };

  const draftProfile = buildProfile();
  const bmr = draftProfile ? calcBMR(draftProfile) : calcBMR(profile);
  const tdee = draftProfile ? calcTDEE(draftProfile) : calcTDEE(profile);
  const bmi = draftProfile ? calcBMI(draftProfile) : calcBMI(profile);
  const bmiCat = bmi ? bmiCategory(bmi) : null;
  const bmiColor = bmi ? bmiBgColor(bmi) : COLORS.text2;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarIcon}>👤</Text>
          </View>
          <Text style={styles.avatarTitle}>Fitness User</Text>
          {tdee && (
            <Text style={styles.avatarSub}>
              Daily goal: {fmtNum(tdee)} kcal · {fmtNum(draftProfile?.stepGoal || profile?.stepGoal || 10000)} steps
            </Text>
          )}
        </View>

        {/* Stats */}
        {(bmr || tdee || bmi) && (
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{bmr ? fmtNum(bmr) : '--'}</Text>
              <Text style={styles.statLbl}>BMR (kcal)</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{tdee ? fmtNum(tdee) : '--'}</Text>
              <Text style={styles.statLbl}>TDEE (kcal)</Text>
            </View>
            <View style={[styles.statBox, { borderTopColor: bmiColor, borderTopWidth: 3 }]}>
              <Text style={[styles.statVal, { color: bmiColor }]}>{bmi || '--'}</Text>
              <Text style={styles.statLbl}>BMI</Text>
            </View>
            <View style={[styles.statBox, { borderTopColor: bmiColor, borderTopWidth: 3 }]}>
              <Text style={[styles.statVal, { fontSize: 16, color: bmiColor }]}>{bmiCat || '--'}</Text>
              <Text style={styles.statLbl}>Category</Text>
            </View>
          </View>
        )}

        {/* Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Edit Profile</Text>

          <View style={styles.formGrid}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                placeholder="e.g. 25"
                placeholderTextColor={COLORS.text2}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder="e.g. 70"
                placeholderTextColor={COLORS.text2}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Height (cm)</Text>
              <TextInput
                style={styles.input}
                value={height}
                onChangeText={setHeight}
                placeholder="e.g. 175"
                placeholderTextColor={COLORS.text2}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Step Goal</Text>
              <TextInput
                style={styles.input}
                value={stepGoal}
                onChangeText={setStepGoal}
                placeholder="10000"
                placeholderTextColor={COLORS.text2}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Gender */}
          <Text style={styles.label}>Gender</Text>
          <View style={styles.segmentRow}>
            {['male', 'female'].map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.segment, gender === g && styles.segmentActive]}
                onPress={() => setGender(g)}
                activeOpacity={0.7}
              >
                <Text style={[styles.segmentText, gender === g && styles.segmentTextActive]}>
                  {g === 'male' ? '♂ Male' : '♀ Female'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Activity */}
          <Text style={[styles.label, { marginTop: 14 }]}>Activity Level</Text>
          {ACTIVITY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.actOption, activity === opt.value && styles.actOptionActive]}
              onPress={() => setActivity(opt.value)}
              activeOpacity={0.7}
            >
              <View style={[styles.radio, activity === opt.value && styles.radioActive]} />
              <Text style={[styles.actText, activity === opt.value && styles.actTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleSave} activeOpacity={0.8}>
            <Text style={styles.btnText}>Save Profile ✓</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerSection}>
          <Text style={styles.dangerTitle}>⚠️ Reset Data</Text>
          <Text style={styles.dangerSub}>Permanently deletes all your data including profile, steps, and food log.</Text>
          <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={handleReset} activeOpacity={0.8}>
            <Text style={styles.btnText}>Reset All Data</Text>
          </TouchableOpacity>
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
  content: { padding: 16, paddingBottom: 40 },

  avatarWrap: { alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.border,
    marginBottom: 10,
  },
  avatarIcon: { fontSize: 40 },
  avatarTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  avatarSub: { fontSize: 12, color: COLORS.text2, marginTop: 4 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statBox: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    width: '47.5%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statVal: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  statLbl: { fontSize: 11, color: COLORS.text2, marginTop: 4 },

  section: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  formGroup: { width: '47%' },
  label: { fontSize: 12, color: COLORS.text2, fontWeight: '700', marginBottom: 6 },
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

  segmentRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  segment: {
    flex: 1, paddingVertical: 11, borderRadius: 12,
    backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primaryLight },
  segmentText: { fontSize: 14, color: COLORS.text2, fontWeight: '600' },
  segmentTextActive: { color: '#fff' },

  actOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 10, marginBottom: 6,
    backgroundColor: COLORS.bg3,
  },
  actOptionActive: { backgroundColor: 'rgba(108,99,255,0.2)', borderWidth: 1, borderColor: COLORS.primary },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: COLORS.text2 },
  radioActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  actText: { fontSize: 13, color: COLORS.text2 },
  actTextActive: { color: COLORS.text, fontWeight: '600' },

  btn: {
    borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 16,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  btnDanger: { backgroundColor: COLORS.danger },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  dangerSection: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,82,82,0.4)',
  },
  dangerTitle: { fontSize: 14, fontWeight: '700', color: COLORS.danger, marginBottom: 6 },
  dangerSub: { fontSize: 12, color: COLORS.text2, lineHeight: 18, marginBottom: 4 },
});
