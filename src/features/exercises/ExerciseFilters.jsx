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
  source,
  onBodyPartChange,
  onMuscleChange,
  onEquipmentChange,
  onDifficultyChange,
  onSourceChange
}) {
  return (
    <div className={styles.filters}>
      <label className={styles.field}>
        <span className={styles.label}>Source</span>
        <select
          className={styles.select}
          value={source}
          onChange={(e) => onSourceChange(e.target.value)}
        >
          <option value="">All exercises</option>
          <option value="builtin">Built-in only</option>
          <option value="custom">Custom only</option>
        </select>
      </label>
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
