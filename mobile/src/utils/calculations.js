export const calcBMR = (profile) => {
  if (!profile?.age || !profile?.weight || !profile?.height) return null;
  const { age, weight, height, gender } = profile;
  if (gender === 'male') {
    return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
  }
  return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
};

export const calcTDEE = (profile) => {
  const bmr = calcBMR(profile);
  if (!bmr || !profile?.activity) return null;
  return Math.round(bmr * parseFloat(profile.activity));
};

export const calcBMI = (profile) => {
  if (!profile?.weight || !profile?.height) return null;
  return (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1);
};

export const bmiCategory = (bmi) => {
  const v = parseFloat(bmi);
  if (v < 18.5) return 'Underweight';
  if (v < 25) return 'Normal';
  if (v < 30) return 'Overweight';
  return 'Obese';
};

export const bmiBgColor = (bmi) => {
  const v = parseFloat(bmi);
  if (v < 18.5) return '#ffb347';
  if (v < 25) return '#43d97f';
  if (v < 30) return '#ffb347';
  return '#ff5252';
};

export const calBurnedFromSteps = (steps, profile) => {
  if (!profile?.weight) return 0;
  return Math.round(steps * 0.04 * (profile.weight / 70));
};

export const distanceFromSteps = (steps) => {
  return (steps * 0.000762).toFixed(2);
};

export const activeMinFromSteps = (steps) => {
  return Math.round(steps / 100);
};

export const totalCalTaken = (foods = []) => {
  return foods.reduce((sum, f) => sum + f.cal, 0);
};

export const fmtNum = (n) => {
  return Number(n).toLocaleString();
};

export const todayKey = () => {
  return new Date().toISOString().split('T')[0];
};
