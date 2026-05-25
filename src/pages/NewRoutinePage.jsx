import { useMemo } from 'react'
import { RoutineEditor } from '../features/routines/RoutineEditor'
import { createBlankRoutine } from '../features/routines/routineFactory'

export function NewRoutinePage() {
  const initialRoutine = useMemo(() => createBlankRoutine(), [])
  return <RoutineEditor mode="new" initialRoutine={initialRoutine} />
}
