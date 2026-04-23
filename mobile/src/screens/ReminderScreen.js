import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, TextInput, Switch, Alert, Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, REMINDER_INTERVALS } from '../utils/constants';
import { useApp } from '../context/AppContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const REMINDER_KEY = 'ft_reminder';

export default function ReminderScreen() {
  const { showToast } = useApp();

  const [reminderOn, setReminderOn] = useState(false);
  const [interval, setIntervalVal] = useState(30);
  const [message, setMessage] = useState('Time to walk! 🚶');
  const [reminderLog, setReminderLog] = useState([]);
  const [notifPermission, setNotifPermission] = useState(null);
  const notifIdRef = useRef(null);

  // Load saved reminder state
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(REMINDER_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.active) {
            setReminderOn(true);
            setIntervalVal(parsed.interval || 30);
            setMessage(parsed.message || 'Time to walk! 🚶');
            notifIdRef.current = parsed.notifId || null;
          }
        }
        const { status } = await Notifications.getPermissionsAsync();
        setNotifPermission(status);
      } catch {}
    })();

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('walk-reminders', {
        name: 'Walk Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: COLORS.primary,
      });
    }

    // Listen for received notifications
    const sub = Notifications.addNotificationReceivedListener((notif) => {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setReminderLog((prev) => [
        { msg: notif.request.content.body || 'Walk reminder', time },
        ...prev.slice(0, 19),
      ]);
    });

    return () => sub.remove();
  }, []);

  const requestPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setNotifPermission(status);
    if (status !== 'granted') {
      Alert.alert(
        'Permission Needed',
        'Please allow notifications in your device Settings to receive walk reminders.',
        [{ text: 'OK' }],
      );
    }
    return status;
  };

  const startReminder = async (intervalMin, msg) => {
    // Request permission if not granted
    let perm = notifPermission;
    if (perm !== 'granted') {
      perm = await requestPermission();
      if (perm !== 'granted') { setReminderOn(false); return; }
    }

    // Cancel existing notification
    await cancelNotification();

    // Schedule repeating notification
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'FitTrack – Walk Reminder 🏃',
        body: msg,
        sound: true,
        ...(Platform.OS === 'android' && { channelId: 'walk-reminders' }),
      },
      trigger: {
        seconds: intervalMin * 60,
        repeats: true,
      },
    });

    notifIdRef.current = notifId;
    await AsyncStorage.setItem(
      REMINDER_KEY,
      JSON.stringify({ active: true, interval: intervalMin, message: msg, notifId }),
    );

    showToast(`Reminder set for every ${intervalMin} min ⏰`);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const cancelNotification = async () => {
    if (notifIdRef.current) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notifIdRef.current);
      } catch {}
      notifIdRef.current = null;
    }
  };

  const stopReminder = async () => {
    await cancelNotification();
    await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify({ active: false }));
    showToast('Reminder disabled');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleToggle = async (val) => {
    setReminderOn(val);
    if (val) {
      await startReminder(interval, message);
    } else {
      await stopReminder();
    }
  };

  const handleIntervalChange = async (val) => {
    setIntervalVal(val);
    if (reminderOn) await startReminder(val, message);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Walk Reminder</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>⏰</Text>
          <Text style={styles.heroTitle}>Stay Active!</Text>
          <Text style={styles.heroSub}>
            Get notified to take a walk at regular intervals — even when the app is in the background.
          </Text>
        </View>

        {/* Permission Banner */}
        {notifPermission === 'denied' && (
          <TouchableOpacity style={styles.permBanner} onPress={requestPermission} activeOpacity={0.8}>
            <Text style={styles.permBannerText}>
              🔔 Notifications are blocked. Tap here to open Settings.
            </Text>
          </TouchableOpacity>
        )}

        {/* Config card */}
        <View style={styles.section}>
          {/* Toggle */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Walk Reminders</Text>
              <Text style={styles.toggleSub}>
                {reminderOn ? `Active every ${interval} min` : 'Off — toggle to enable'}
              </Text>
            </View>
            <Switch
              value={reminderOn}
              onValueChange={handleToggle}
              trackColor={{ false: COLORS.bg3, true: COLORS.success }}
              thumbColor={reminderOn ? '#fff' : COLORS.text2}
            />
          </View>

          {/* Interval picker */}
          <Text style={styles.fieldLabel}>Interval</Text>
          <View style={styles.intervalGrid}>
            {REMINDER_INTERVALS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.intervalChip, interval === opt.value && styles.intervalChipActive]}
                onPress={() => handleIntervalChange(opt.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.intervalChipText,
                    interval === opt.value && styles.intervalChipTextActive,
                  ]}
                >
                  {opt.value < 60 ? `${opt.value}m` : `${opt.value / 60}h`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Message */}
          <Text style={styles.fieldLabel}>Custom Message</Text>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="Your reminder message"
            placeholderTextColor={COLORS.text2}
            returnKeyType="done"
            onEndEditing={() => {
              if (reminderOn) startReminder(interval, message);
            }}
          />
        </View>

        {/* Reminder Log */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Recent Reminders</Text>
          {reminderLog.length === 0 ? (
            <Text style={styles.emptyText}>No reminders fired yet.</Text>
          ) : (
            reminderLog.map((item, i) => (
              <View key={i} style={styles.logItem}>
                <Text style={styles.logMsg}>{item.msg}</Text>
                <Text style={styles.logTime}>{item.time}</Text>
              </View>
            ))
          )}
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

  hero: { alignItems: 'center', paddingVertical: 20, marginBottom: 8 },
  heroIcon: { fontSize: 52, marginBottom: 10 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  heroSub: { fontSize: 13, color: COLORS.text2, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },

  permBanner: {
    backgroundColor: 'rgba(255,82,82,0.15)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.danger,
    marginBottom: 14,
  },
  permBannerText: { color: COLORS.danger, fontSize: 13, fontWeight: '600', textAlign: 'center' },

  section: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 12 },

  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  toggleLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  toggleSub: { fontSize: 11, color: COLORS.text2, marginTop: 2 },

  fieldLabel: { fontSize: 12, color: COLORS.text2, fontWeight: '700', marginBottom: 8 },

  intervalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  intervalChip: {
    backgroundColor: COLORS.bg3,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  intervalChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  intervalChipText: { fontSize: 13, color: COLORS.text2, fontWeight: '600' },
  intervalChipTextActive: { color: '#fff' },

  input: {
    backgroundColor: COLORS.bg3,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
  },

  emptyText: { textAlign: 'center', color: COLORS.text2, fontSize: 13, paddingVertical: 12 },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bg3,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  logMsg: { fontSize: 13, color: COLORS.text, flex: 1 },
  logTime: { fontSize: 11, color: COLORS.text2 },
});
