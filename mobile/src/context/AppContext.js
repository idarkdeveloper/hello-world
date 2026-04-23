import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { todayKey } from '../utils/calculations';

const AppContext = createContext(null);

// ── AsyncStorage helpers ─────────────────────────────────────────────────────
const storeGet = async (key, def) => {
  try {
    const val = await AsyncStorage.getItem(key);
    return val !== null ? JSON.parse(val) : def;
  } catch {
    return def;
  }
};

const storeSet = async (key, val) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(val));
  } catch {}
};

// ── Reducer ──────────────────────────────────────────────────────────────────
const initialState = {
  profile: null,
  dailyData: { date: todayKey(), steps: 0, foods: [] },
  toast: { message: '', visible: false, id: 0 },
  isLoading: true,
};

function reducer(state, action) {
  switch (action.type) {
    case 'INIT':
      return { ...state, ...action.payload, isLoading: false };
    case 'SET_PROFILE':
      return { ...state, profile: action.payload };
    case 'ADD_STEPS':
      return {
        ...state,
        dailyData: { ...state.dailyData, steps: state.dailyData.steps + action.payload },
      };
    case 'SET_STEPS':
      return {
        ...state,
        dailyData: { ...state.dailyData, steps: action.payload },
      };
    case 'RESET_STEPS':
      return {
        ...state,
        dailyData: { ...state.dailyData, steps: 0 },
      };
    case 'ADD_FOOD':
      return {
        ...state,
        dailyData: { ...state.dailyData, foods: [...state.dailyData.foods, action.payload] },
      };
    case 'REMOVE_FOOD':
      return {
        ...state,
        dailyData: {
          ...state.dailyData,
          foods: state.dailyData.foods.filter((_, i) => i !== action.payload),
        },
      };
    case 'CLEAR_FOODS':
      return { ...state, dailyData: { ...state.dailyData, foods: [] } };
    case 'SHOW_TOAST':
      return {
        ...state,
        toast: { message: action.payload, visible: true, id: state.toast.id + 1 },
      };
    case 'HIDE_TOAST':
      return { ...state, toast: { ...state.toast, visible: false } };
    default:
      return state;
  }
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const toastTimerRef = useRef(null);

  // Load persisted data on mount
  useEffect(() => {
    (async () => {
      const profile = await storeGet('ft_profile', null);
      const savedDaily = await storeGet('ft_daily', null);
      const today = todayKey();
      const dailyData =
        savedDaily?.date === today
          ? savedDaily
          : { date: today, steps: 0, foods: [] };
      dispatch({ type: 'INIT', payload: { profile, dailyData } });
    })();
  }, []);

  // Persist daily data
  useEffect(() => {
    if (!state.isLoading) {
      storeSet('ft_daily', state.dailyData);
    }
  }, [state.dailyData, state.isLoading]);

  // Persist profile
  useEffect(() => {
    if (!state.isLoading && state.profile) {
      storeSet('ft_profile', state.profile);
    }
  }, [state.profile, state.isLoading]);

  // Auto-reset at midnight
  useEffect(() => {
    const now = new Date();
    const msToMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
    const timer = setTimeout(() => {
      dispatch({
        type: 'INIT',
        payload: { dailyData: { date: todayKey(), steps: 0, foods: [] } },
      });
    }, msToMidnight);
    return () => clearTimeout(timer);
  }, []);

  const showToast = (message, duration = 2800) => {
    dispatch({ type: 'SHOW_TOAST', payload: message });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(
      () => dispatch({ type: 'HIDE_TOAST' }),
      duration,
    );
  };

  const actions = {
    setProfile: (p) => dispatch({ type: 'SET_PROFILE', payload: p }),
    addSteps: (n) => dispatch({ type: 'ADD_STEPS', payload: n }),
    setSteps: (n) => dispatch({ type: 'SET_STEPS', payload: n }),
    resetSteps: () => dispatch({ type: 'RESET_STEPS' }),
    addFood: (food) => dispatch({ type: 'ADD_FOOD', payload: food }),
    removeFood: (idx) => dispatch({ type: 'REMOVE_FOOD', payload: idx }),
    clearFoods: () => dispatch({ type: 'CLEAR_FOODS' }),
    showToast,
    resetAll: async () => {
      await AsyncStorage.clear();
      dispatch({
        type: 'INIT',
        payload: {
          profile: null,
          dailyData: { date: todayKey(), steps: 0, foods: [] },
          isLoading: false,
        },
      });
    },
  };

  return (
    <AppContext.Provider value={{ state, ...actions }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
