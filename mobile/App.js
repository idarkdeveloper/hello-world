import React from 'react';
import { View, Text, ScrollView, Modal, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from './src/context/AppContext';
import TabNavigator from './src/navigation/TabNavigator';
import Toast from './src/components/Toast';
import { COLORS, ACTIVITY_OPTIONS } from './src/utils/constants';
import { calcTDEE, calcBMR, calcBMI, fmtNum } from './src/utils/calculations';
import * as Haptics from 'expo-haptics';

// ── Setup Modal ───────────────────────────────────────────────────────────────
function SetupModal() {
  const { state, setProfile, showToast } = useApp();
  const [age, setAge] = React.useState('');
  const [weight, setWeight] = React.useState('');
  const [height, setHeight] = React.useState('');
  const [gender, setGender] = React.useState('male');
  const [activity, setActivity] = React.useState('1.55');
  const [stepGoal, setStepGoal] = React.useState('10000');

  const visible = !state.isLoading && !state.profile;

  const handleSave = async () => {
    const a = parseInt(age, 10);
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const g = parseInt(stepGoal, 10) || 10000;
    if (!a || !w || !h || a < 1 || w < 1 || h < 1) {
      showToast('Please fill in all fields correctly.');
      return;
    }
    setProfile({ age: a, weight: w, height: h, gender, activity, stepGoal: g });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast('Welcome to FitTrack! 🎉');
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <SafeAreaView style={modal.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={modal.content} showsVerticalScrollIndicator={false}>
            <Text style={modal.logo}>🏃 FitTrack</Text>
            <Text style={modal.title}>Setup Your Profile</Text>
            <Text style={modal.sub}>
              We need a few details to calculate your daily calorie goal and step target.
            </Text>

            <View style={modal.formGrid}>
              <View style={modal.formGroup}>
                <Text style={modal.label}>Age</Text>
                <TextInput
                  style={modal.input}
                  value={age}
                  onChangeText={setAge}
                  placeholder="e.g. 25"
                  placeholderTextColor={COLORS.text2}
                  keyboardType="numeric"
                />
              </View>
              <View style={modal.formGroup}>
                <Text style={modal.label}>Weight (kg)</Text>
                <TextInput
                  style={modal.input}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="e.g. 70"
                  placeholderTextColor={COLORS.text2}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={modal.formGroup}>
                <Text style={modal.label}>Height (cm)</Text>
                <TextInput
                  style={modal.input}
                  value={height}
                  onChangeText={setHeight}
                  placeholder="e.g. 175"
                  placeholderTextColor={COLORS.text2}
                  keyboardType="numeric"
                />
              </View>
              <View style={modal.formGroup}>
                <Text style={modal.label}>Step Goal</Text>
                <TextInput
                  style={modal.input}
                  value={stepGoal}
                  onChangeText={setStepGoal}
                  placeholder="10000"
                  placeholderTextColor={COLORS.text2}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Gender */}
            <Text style={modal.label}>Gender</Text>
            <View style={modal.segmentRow}>
              {['male', 'female'].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[modal.segment, gender === g && modal.segmentActive]}
                  onPress={() => setGender(g)}
                  activeOpacity={0.7}
                >
                  <Text style={[modal.segmentText, gender === g && modal.segmentTextActive]}>
                    {g === 'male' ? '♂ Male' : '♀ Female'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Activity */}
            <Text style={[modal.label, { marginTop: 16 }]}>Activity Level</Text>
            {ACTIVITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[modal.actOption, activity === opt.value && modal.actOptionActive]}
                onPress={() => setActivity(opt.value)}
                activeOpacity={0.7}
              >
                <View style={[modal.radio, activity === opt.value && modal.radioActive]} />
                <Text style={[modal.actText, activity === opt.value && modal.actTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={modal.btn} onPress={handleSave} activeOpacity={0.8}>
              <Text style={modal.btnText}>Get Started ✓</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
function Root() {
  const { state } = useApp();

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer>
        <TabNavigator />
      </NavigationContainer>
      <SetupModal />
      <Toast
        message={state.toast.message}
        visible={state.toast.visible}
        id={state.toast.id}
      />
      <StatusBar style="light" />
    </View>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Root />
    </AppProvider>
  );
}

// ── Modal Styles ──────────────────────────────────────────────────────────────
const modal = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 24, paddingBottom: 40 },
  logo: { fontSize: 28, fontWeight: '900', color: COLORS.primaryLight, textAlign: 'center', marginBottom: 8, marginTop: 12 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginBottom: 8 },
  sub: { fontSize: 13, color: COLORS.text2, textAlign: 'center', lineHeight: 20, marginBottom: 24 },

  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  formGroup: { width: '47%' },
  label: { fontSize: 12, color: COLORS.text2, fontWeight: '700', marginBottom: 6 },
  input: {
    backgroundColor: COLORS.bg3,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12,
    color: COLORS.text, fontSize: 14,
  },

  segmentRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  segment: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  segmentActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primaryLight },
  segmentText: { fontSize: 14, color: COLORS.text2, fontWeight: '600' },
  segmentTextActive: { color: '#fff' },

  actOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 10, marginBottom: 6, backgroundColor: COLORS.bg3,
  },
  actOptionActive: { backgroundColor: 'rgba(108,99,255,0.2)', borderWidth: 1, borderColor: COLORS.primary },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: COLORS.text2 },
  radioActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  actText: { fontSize: 13, color: COLORS.text2 },
  actTextActive: { color: COLORS.text, fontWeight: '600' },

  btn: {
    backgroundColor: COLORS.primary, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', marginTop: 24,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
