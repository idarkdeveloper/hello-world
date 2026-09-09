import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { COLORS } from '../utils/constants';
import DashboardScreen from '../screens/DashboardScreen';
import StepsScreen from '../screens/StepsScreen';
import CaloriesScreen from '../screens/CaloriesScreen';
import ReminderScreen from '../screens/ReminderScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const TABS = [
  { name: 'Dashboard', component: DashboardScreen, icon: '📊', label: 'Dashboard' },
  { name: 'Steps', component: StepsScreen, icon: '🚶', label: 'Steps' },
  { name: 'Calories', component: CaloriesScreen, icon: '🍽️', label: 'Calories' },
  { name: 'Reminder', component: ReminderScreen, icon: '⏰', label: 'Reminder' },
  { name: 'Profile', component: ProfileScreen, icon: '👤', label: 'Profile' },
];

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.bg2,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: COLORS.primaryLight,
        tabBarInactiveTintColor: COLORS.text2,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, focused }) => {
          const tab = TABS.find((t) => t.name === route.name);
          return (
            <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.7 }}>
              {tab?.icon}
            </Text>
          );
        },
      })}
    >
      {TABS.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{ tabBarLabel: tab.label }}
        />
      ))}
    </Tab.Navigator>
  );
}
