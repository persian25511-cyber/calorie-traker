import { describe, expect, it } from 'vitest'
import { calculateRecommendedGoals } from './calorieCalculator'

describe('Mifflin-St Jeor Persian TDEE & Macro Calculator', () => {
  it('computes realistic maintenance, cutting, and bulking goals for an adult male', () => {
    const maintain = calculateRecommendedGoals({
      sex: 'male',
      ageYears: 30,
      heightCm: 178,
      weightKg: 78,
      activity: 'moderate',
      goal: 'maintain',
    })

    expect(maintain.bmr).toBe(1748)
    expect(maintain.tdee).toBe(2709)
    expect(maintain.recommendedGoals.dailyKcal).toBe(2710)
    expect(maintain.recommendedGoals.proteinGrams).toBeGreaterThanOrEqual(100)
    expect(maintain.recommendedGoals.waterGoalGlasses).toBeGreaterThanOrEqual(8)

    const lose = calculateRecommendedGoals({
      sex: 'male',
      ageYears: 30,
      heightCm: 178,
      weightKg: 78,
      activity: 'moderate',
      goal: 'lose',
    })
    expect(lose.recommendedGoals.dailyKcal).toBeLessThan(maintain.recommendedGoals.dailyKcal)
    expect(lose.recommendedGoals.dailyKcal).toBeGreaterThanOrEqual(1400)

    const gain = calculateRecommendedGoals({
      sex: 'male',
      ageYears: 30,
      heightCm: 178,
      weightKg: 78,
      activity: 'moderate',
      goal: 'gain',
    })
    expect(gain.recommendedGoals.dailyKcal).toBeGreaterThan(maintain.recommendedGoals.dailyKcal)
  })

  it('enforces safe minimum daily calorie floor for adult female cutting goals', () => {
    const res = calculateRecommendedGoals({
      sex: 'female',
      ageYears: 28,
      heightCm: 158,
      weightKg: 50,
      activity: 'sedentary',
      goal: 'lose',
    })

    expect(res.recommendedGoals.dailyKcal).toBeGreaterThanOrEqual(1200)
    expect(res.recommendedGoals.proteinGrams).toBeGreaterThanOrEqual(55)
    expect(res.recommendedGoals.fatGrams).toBeGreaterThanOrEqual(35)
    expect(res.recommendedGoals.carbsGrams).toBeGreaterThan(0)
    expect(res.recommendedGoals.waterGoalGlasses).toBeGreaterThanOrEqual(6)
  })
})
