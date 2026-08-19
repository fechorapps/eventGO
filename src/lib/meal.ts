// Platillo que se le sirve a cada invitado. Va aparte de `isChild` porque el
// tipo de invitado (adulto/niño) y el platillo que pide no siempre coinciden:
// hay adultos que prefieren el platillo de niño y niños grandes que piden el
// de adulto. La cocina se cuenta por `mealType`, nunca por `isChild`.
export type MealType = 'ADULTO' | 'NINO';

export const MEAL_ADULT: MealType = 'ADULTO';
export const MEAL_CHILD: MealType = 'NINO';

export const MEAL_LABEL: Record<MealType, string> = {
  ADULTO: 'Menú',
  NINO: 'Hamburguesa',
};

export const MEAL_SHORT_LABEL: Record<MealType, string> = {
  ADULTO: 'Menú',
  NINO: 'Hamburguesa',
};

export const MEAL_EMOJI: Record<MealType, string> = {
  ADULTO: '🍽️',
  NINO: '🍔',
};

// Normaliza lo que llegue del cliente o de la base. Si el invitado todavía no
// tiene platillo elegido, se asume el que corresponde a su tipo.
export function normalizeMealType(value: unknown, isChild = false): MealType {
  if (typeof value === 'string') {
    const upper = value.trim().toUpperCase();
    if (upper === 'NINO' || upper === 'NIÑO') return MEAL_CHILD;
    if (upper === 'ADULTO') return MEAL_ADULT;
  }
  return isChild ? MEAL_CHILD : MEAL_ADULT;
}

// Un adulto que pidió platillo de niño (o al revés) es el caso que la cocina
// necesita ver marcado explícitamente.
export function isMealMismatch(isChild: boolean, mealType: MealType): boolean {
  return isChild ? mealType === MEAL_ADULT : mealType === MEAL_CHILD;
}
