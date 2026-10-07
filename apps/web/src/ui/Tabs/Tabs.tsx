import { cx } from "../cx";
import "./Tabs.css";

export interface TabItem<K extends string> {
  key: K;
  label: string;
}

export interface TabsProps<K extends string> {
  tabs: Array<TabItem<K>>;
  active: K;
  onChange: (key: K) => void;
  label?: string;
  className?: string;
}

export const Tabs = <K extends string>({ tabs, active, onChange, label, className }: TabsProps<K>) => (
  <div role="tablist" aria-label={label} className={cx("ui-tabs", className)}>
    {tabs.map((tab) => (
      <button
        key={tab.key}
        type="button"
        role="tab"
        aria-selected={tab.key === active}
        className={cx("ui-tabs__tab", tab.key === active && "ui-tabs__tab--active")}
        onClick={() => onChange(tab.key)}
      >
        {tab.label}
      </button>
    ))}
  </div>
);
