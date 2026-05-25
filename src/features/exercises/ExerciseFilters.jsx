import styles from './ExerciseFilters.module.css'

function Select({ label, value, onChange, options, allLabel }) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <select
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

export function ExerciseFilters({
  options,
  bodyPart,
  muscle,
  equipment,
  difficulty,
  onBodyPartChange,
  onMuscleChange,
  onEquipmentChange,
  onDifficultyChange
}) {
  return (
    <div className={styles.filters}>
      <Select
        label="Body part"
        value={bodyPart}
        onChange={onBodyPartChange}
        options={options.bodyParts}
        allLabel="All body parts"
      />
      <Select
        label="Muscle"
        value={muscle}
        onChange={onMuscleChange}
        options={options.muscles}
        allLabel="All muscles"
      />
      <Select
        label="Equipment"
        value={equipment}
        onChange={onEquipmentChange}
        options={options.equipment}
        allLabel="All equipment"
      />
      <Select
        label="Difficulty"
        value={difficulty}
        onChange={onDifficultyChange}
        options={options.difficulties}
        allLabel="Any difficulty"
      />
    </div>
  )
}
