export {
  DEFAULT_CALM_THRESHOLD,
  DEFAULT_HEAT_THRESHOLD,
  DEFAULT_MAX_AGE_HOURS,
  assessHotNews,
  heatOf,
  isUrgentTitle,
  peakHeatOf,
} from './heat.js';
export type { HeatAssessment, HeatComponents, HeatOptions, HeatReason } from './heat.js';
export {
  MONITOR_MAX_STORIES,
  MONITOR_WINDOW_HOURS,
  SUMMARY_MAX,
  buildHotFeed,
  buildHotFeedWithPhotos,
  cleanSummary,
  shortHeadline,
} from './monitor.js';
export type { HotFeedWithPhotos, MonitorOptions } from './monitor.js';
