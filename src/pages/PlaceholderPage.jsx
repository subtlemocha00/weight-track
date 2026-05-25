import { useLocation } from 'react-router-dom'
import styles from './Placeholder.module.css'

export function PlaceholderPage({ title }) {
  const { pathname } = useLocation()

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>{title}</h1>
      <span className={styles.route}>{pathname}</span>
    </section>
  )
}
