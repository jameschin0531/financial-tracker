import React from 'react';
import styles from './Dashboard.module.css';

interface MetricsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
}

const MetricsCard: React.FC<MetricsCardProps> = ({ title, value, subtitle, trend = 'neutral', icon }) => {
  return (
    <div className={styles.metricsCard}>
      {icon && <div className={styles.metricsIcon}>{icon}</div>}
      <h3 className={styles.metricsTitle}>{title}</h3>
      <div className={`${styles.metricsValue} ${styles[`trend-${trend}`]}`} title={value}>
        {value}
      </div>
      {subtitle && <p className={styles.metricsSubtitle}>{subtitle}</p>}
    </div>
  );
};

export default MetricsCard;
