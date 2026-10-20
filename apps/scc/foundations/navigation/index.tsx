"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { sccApps, sccAreas, sccFamilyIndexes } from "./areas";
import type { SccNavigationItem } from "./experiments";
import styles from "./navigation.module.css";
import { ThemeToggle, useSccTheme } from "./theme";

type NavigationView = "date" | "group";

type NavigationProps = {
  experiments: readonly SccNavigationItem[];
  /** Breadcrumb label; omitted on the SCC home index. */
  scope?: string;
  /** Key prefix removed from names inside a family index. */
  scopeKey?: string;
};

type ExperimentGroup = {
  key: string;
  label: string;
  href?: string;
  experiments: SccNavigationItem[];
};

type AreaGroup = {
  key: string;
  label: string;
  href?: string;
  families: ExperimentGroup[];
};

const naturalOrder = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

const views: readonly NavigationView[] = ["date", "group"];

function getDateLabel(date: string) {
  return date.replaceAll("-", ".");
}

function getExperimentName(key: string, prefix?: string) {
  if (prefix && key.startsWith(`${prefix}/`)) {
    return key.slice(prefix.length + 1);
  }
  return key;
}

function withView(href: string, view: NavigationView) {
  return view === "date" ? href : `${href}?view=${view}`;
}

function byKey(first: SccNavigationItem, second: SccNavigationItem) {
  return naturalOrder.compare(first.key, second.key);
}

function groupByDate(experiments: SccNavigationItem[]) {
  const dates = Array.from(
    new Set(experiments.map((experiment) => experiment.date)),
  ).sort((first, second) => second.localeCompare(first));

  return dates.map<ExperimentGroup>((date) => ({
    key: date,
    label: getDateLabel(date),
    experiments: experiments
      .filter((experiment) => experiment.date === date)
      .sort(byKey),
  }));
}

function countBy(
  experiments: SccNavigationItem[],
  field: "area" | "family",
  value: string,
) {
  return experiments.filter((experiment) => experiment[field] === value).length;
}

// Smaller groups come first so sparse families are not buried beneath large
// ones such as complex-systems.
function groupByHierarchy(experiments: SccNavigationItem[]) {
  const areaOrder = sccAreas.map((area) => area.key as string);

  return Array.from(new Set(experiments.map((experiment) => experiment.area)))
    .sort(
      (first, second) =>
        countBy(experiments, "area", first) -
          countBy(experiments, "area", second) ||
        areaOrder.indexOf(first) - areaOrder.indexOf(second),
    )
    .map<AreaGroup>((area) => {
      const areaExperiments = experiments.filter(
        (experiment) => experiment.area === area,
      );
      const families = Array.from(
        new Set(areaExperiments.map((experiment) => experiment.family)),
      ).sort(
        (first, second) =>
          countBy(areaExperiments, "family", first) -
            countBy(areaExperiments, "family", second) ||
          naturalOrder.compare(first, second),
      );

      return {
        key: `area:${area}`,
        label: area,
        href: sccAreas.find((candidate) => candidate.key === area)?.href,
        families: families.map((family) => ({
          key: `family:${family}`,
          label: family,
          href: sccFamilyIndexes.has(family) ? `/${family}` : undefined,
          experiments: areaExperiments
            .filter((experiment) => experiment.family === family)
            .sort(byKey),
        })),
      };
    });
}

const linkTone =
  "hover:text-(--scc-fg) focus-visible:text-(--scc-fg) focus-visible:outline-none";

function GroupHeader({
  label,
  count,
  href,
  isCollapsed,
  isCurrent,
  depth,
  view,
  onToggle,
}: {
  label: string;
  count: number;
  href?: string;
  isCollapsed: boolean;
  isCurrent: boolean;
  depth: 0 | 1;
  view: NavigationView;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center">
      <button
        type="button"
        aria-expanded={!isCollapsed}
        onClick={onToggle}
        className={`flex min-w-0 flex-1 items-center gap-2.5 px-3 text-left tracking-[-0.01em] text-(--scc-fg) hover:bg-(--scc-fg)/[0.07] focus-visible:bg-(--scc-fg)/[0.1] focus-visible:outline-none ${
          depth === 0
            ? "h-11 text-[15px] font-semibold"
            : "h-9 pl-8 text-[13px] font-medium text-(--scc-fg)/90"
        }`}
      >
        <span aria-hidden="true" className="w-3 text-[9px] text-(--scc-fg)/50">
          {isCollapsed ? "▶" : "▼"}
        </span>
        <span>{label}</span>
        <span className="font-mono text-[10px] font-normal text-(--scc-fg)/40">
          {count}
        </span>
      </button>

      {href && !isCurrent ? (
        <Link
          href={withView(href, view)}
          aria-label={`Open ${label} index`}
          className="flex h-9 items-center px-3 font-mono text-[10px] text-(--scc-fg)/50 hover:bg-(--scc-fg) hover:text-(--scc-bg) focus-visible:bg-(--scc-fg) focus-visible:text-(--scc-bg) focus-visible:outline-none"
        >
          {href} →
        </Link>
      ) : null}
    </div>
  );
}

function ExperimentRow({
  experiment,
  name,
  underDate,
}: {
  experiment: SccNavigationItem;
  name: string;
  /**
   * Inside a date group the row's own date repeats the heading, so phones omit
   * it and give the full name most of the width, the description yielding to
   * the right. Group view names are short indices and keep the narrow column.
   */
  underDate: boolean;
}) {
  const [primary, ...roles] = experiment.routes;

  return (
    <div className={`group relative grid min-h-11 ${underDate ? "grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_1rem]" : "grid-cols-[6rem_minmax(0,1fr)_4.75rem_1rem]"} items-center gap-3 px-3 text-[12px] focus-within:bg-(--scc-fg) focus-within:text-(--scc-bg) hover:bg-(--scc-fg) hover:text-(--scc-bg) md:grid-cols-[minmax(7rem,0.65fr)_minmax(15rem,2fr)_5.5rem_minmax(12rem,1fr)_1rem] md:gap-4`}>
      <Link
        href={primary.href}
        target="_blank"
        rel="noopener noreferrer"
        prefetch={false}
        data-scc-experiment
        className="truncate font-medium outline-none after:absolute after:inset-0"
      >
        {name}
      </Link>
      <span className={`${underDate ? "text-right md:text-left" : ""} truncate text-(--scc-fg)/58 group-focus-within:text-(--scc-bg)/65 group-hover:text-(--scc-bg)/65`}>
        {experiment.phrase}
      </span>
      <time
        dateTime={experiment.date}
        title={experiment.created && experiment.created !== experiment.date ? `created ${getDateLabel(experiment.created)}` : undefined}
        className={`${underDate ? "hidden md:block" : ""} font-mono text-[10px] text-(--scc-fg)/45 group-focus-within:text-(--scc-bg)/55 group-hover:text-(--scc-bg)/55`}
      >
        {getDateLabel(experiment.date)}
      </time>
      <span className="relative z-10 hidden min-w-0 items-center gap-3 truncate font-mono text-[10px] text-(--scc-fg)/32 group-focus-within:text-(--scc-bg)/45 group-hover:text-(--scc-bg)/45 md:flex">
        {roles.length === 0 ? (
          <span className="truncate">{primary.href}</span>
        ) : (
          experiment.routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              target="_blank"
              rel="noopener noreferrer"
              prefetch={false}
              title={route.href}
              className="shrink-0 hover:text-(--scc-bg) hover:underline focus-visible:underline focus-visible:outline-none"
            >
              {route.label}
            </Link>
          ))
        )}
      </span>
      <span aria-hidden="true" className="text-right">
        →
      </span>
    </div>
  );
}

// Static pages cannot read the host, so both labels render and the root
// layout's `data-scc-host` attribute picks one before first paint.
function HomeBrand() {
  return (
    <>
      <span className={styles.sccBrand}>SCC</span>
      <span className={styles.expBrand}>exp-jyc</span>
    </>
  );
}

function NavigationScreen({
  experiments,
  scope,
  scopeKey,
  view,
  onViewChange,
}: NavigationProps & {
  view: NavigationView;
  onViewChange?: (view: NavigationView) => void;
}) {
  const [query, setQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const theme = useSccTheme();
  const normalizedQuery = query.trim().toLowerCase();

  const filteredExperiments = useMemo(() => {
    if (!normalizedQuery) return [...experiments];
    return experiments.filter((experiment) => {
      const searchable = [
        experiment.key,
        experiment.area,
        experiment.family,
        experiment.phrase,
        experiment.date,
        getDateLabel(experiment.date),
        experiment.created ?? "",
        experiment.created ? getDateLabel(experiment.created) : "",
        ...experiment.routes.map((route) => route.href),
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [experiments, normalizedQuery]);

  const dateGroups = useMemo(
    () => (view === "date" ? groupByDate(filteredExperiments) : []),
    [filteredExperiments, view],
  );
  const areaGroups = useMemo(
    () => (view === "group" ? groupByHierarchy(filteredExperiments) : []),
    [filteredExperiments, view],
  );
  // A single-area scope shows its families directly.
  const showAreaHeaders = areaGroups.length > 1;

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      const target = event.target;
      const isEditing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "/" && !isEditing) {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (event.key === "Escape" && target === searchRef.current) {
        setQuery("");
        searchRef.current?.blur();
        return;
      }

      if (event.key === "v" && !isEditing && onViewChange) {
        event.preventDefault();
        onViewChange(view === "date" ? "group" : "date");
        return;
      }

      if ((event.key === "j" || event.key === "k") && !isEditing) {
        const links = Array.from(
          document.querySelectorAll<HTMLAnchorElement>("[data-scc-experiment]"),
        );
        if (links.length === 0) return;

        event.preventDefault();
        const activeIndex = links.findIndex(
          (link) => link === document.activeElement,
        );
        const direction = event.key === "j" ? 1 : -1;
        const nextIndex =
          activeIndex === -1
            ? direction === 1
              ? 0
              : links.length - 1
            : (activeIndex + direction + links.length) % links.length;
        links[nextIndex]?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [onViewChange, view]);

  function toggleGroup(groupKey: string) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }

  function isCollapsed(groupKey: string) {
    return !normalizedQuery && collapsedGroups.has(groupKey);
  }

  function renderRows(group: ExperimentGroup, prefix?: string) {
    return group.experiments.map((experiment) => (
      <ExperimentRow
        key={experiment.key}
        experiment={experiment}
        name={getExperimentName(experiment.key, prefix)}
        underDate={view === "date"}
      />
    ));
  }

  return (
    <main
      data-scc-navigation
      data-theme={theme === "system" ? undefined : theme}
      className={`${styles.root} min-h-screen bg-(--scc-bg) text-(--scc-fg)`}
    >
      <header className="sticky top-0 z-20 bg-(--scc-bg) px-4">
        <div className="grid min-h-14 grid-cols-[auto_1fr_auto] items-center gap-4 sm:gap-8">
          <h1 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em]">
            {scope ? (
              <>
                <Link href={withView("/", view)} className={`text-(--scc-fg)/55 ${linkTone}`}>
                  <HomeBrand />
                </Link>
                <span aria-hidden="true" className="text-(--scc-fg)/25">
                  /
                </span>
                <span>{scope}</span>
              </>
            ) : (
              <HomeBrand />
            )}
          </h1>
          <label className="relative block max-w-[680px]">
            <span className="sr-only">Search experiments</span>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-(--scc-fg)/40"
            >
              /
            </span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                setQuery("");
                event.currentTarget.blur();
              }}
              placeholder={
                scope
                  ? `Search ${scope} experiments`
                  : "Search name, date, group, description, or path"
              }
              autoComplete="off"
              className="h-8 w-full bg-(--scc-fg)/[0.09] pl-8 pr-3 text-[13px] text-(--scc-fg) outline-none placeholder:text-(--scc-fg)/35 focus:bg-(--scc-fg)/[0.13] focus:ring-1 focus:ring-(--scc-fg)/55"
            />
          </label>
          <div className="flex items-center gap-5 font-mono text-[10px] text-(--scc-fg)/45">
            <ThemeToggle />
            <div role="group" aria-label="View" className="flex items-center">
              {views.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={view === option}
                  onClick={() => onViewChange?.(option)}
                  className="h-6 px-2 hover:text-(--scc-fg) focus-visible:text-(--scc-fg) focus-visible:outline-none aria-pressed:bg-(--scc-fg) aria-pressed:text-(--scc-bg)"
                >
                  {option}
                </button>
              ))}
            </div>
            <span className="hidden sm:inline">
              {filteredExperiments.length} experiments
            </span>
            <span className="hidden lg:inline">
              J/K move · Enter open · V view · Esc clear
            </span>
          </div>
        </div>
        <nav
          aria-label="SCC areas"
          className="-mx-4 flex h-8 items-center gap-5 overflow-x-auto whitespace-nowrap px-4 font-mono text-[10px] text-(--scc-fg)/45"
        >
          {sccAreas.map((area) => (
            <Link
              key={area.key}
              href={withView(area.href, view)}
              aria-current={area.key === scopeKey ? "page" : undefined}
              className={`aria-[current=page]:text-(--scc-fg) ${linkTone}`}
            >
              {area.key}
            </Link>
          ))}
          <span aria-hidden="true" className="text-(--scc-fg)/20">
            ·
          </span>
          {sccApps.map((app) => (
            <Link
              key={app.key}
              href={app.href}
              target="_blank"
              rel="noopener noreferrer"
              className={linkTone}
            >
              {app.key}
            </Link>
          ))}
        </nav>
      </header>

      <nav aria-label="SCC experiments" className="px-2 pb-8 sm:px-4">
        <div className="hidden h-7 grid-cols-[minmax(7rem,0.65fr)_minmax(15rem,2fr)_5.5rem_minmax(12rem,1fr)_1rem] items-center gap-4 px-3 font-mono text-[9px] uppercase tracking-[0.08em] text-(--scc-fg)/30 md:grid">
          <span>Name</span>
          <span>Description</span>
          <span>Created</span>
          <span>Path</span>
          <span />
        </div>

        {view === "date"
          ? dateGroups.map((group) => (
              <section key={group.key} className="mb-4">
                <GroupHeader
                  label={group.label}
                  count={group.experiments.length}
                  isCollapsed={isCollapsed(group.key)}
                  isCurrent={false}
                  depth={0}
                  view={view}
                  onToggle={() => toggleGroup(group.key)}
                />
                {!isCollapsed(group.key) ? (
                  <div>{renderRows(group, scopeKey)}</div>
                ) : null}
              </section>
            ))
          : areaGroups.map((area) => {
              const families = area.families.map((family) => (
                <section key={family.key} className="mb-2">
                  <GroupHeader
                    label={getExperimentName(family.label, scopeKey)}
                    count={family.experiments.length}
                    href={family.href}
                    isCollapsed={isCollapsed(family.key)}
                    isCurrent={family.label === scopeKey}
                    depth={showAreaHeaders ? 1 : 0}
                    view={view}
                    onToggle={() => toggleGroup(family.key)}
                  />
                  {!isCollapsed(family.key) ? (
                    <div>{renderRows(family, family.label)}</div>
                  ) : null}
                </section>
              ));

              if (!showAreaHeaders) {
                return <div key={area.key}>{families}</div>;
              }

              return (
                <section key={area.key} className="mb-6">
                  <GroupHeader
                    label={area.label}
                    count={area.families.reduce(
                      (total, family) => total + family.experiments.length,
                      0,
                    )}
                    href={area.href}
                    isCollapsed={isCollapsed(area.key)}
                    isCurrent={area.label === scopeKey}
                    depth={0}
                    view={view}
                    onToggle={() => toggleGroup(area.key)}
                  />
                  {!isCollapsed(area.key) ? families : null}
                </section>
              );
            })}

        {filteredExperiments.length === 0 ? (
          <p className="px-3 py-8 font-mono text-[11px] text-(--scc-fg)/45">
            No experiments match “{query}”.
          </p>
        ) : null}
      </nav>
    </main>
  );
}

function NavigationWithViewParam(props: NavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view: NavigationView =
    searchParams.get("view") === "group" ? "group" : "date";

  function changeView(next: NavigationView) {
    if (next === view) return;
    router.push(withView(pathname, next), { scroll: false });
  }

  return <NavigationScreen {...props} view={view} onViewChange={changeView} />;
}

export default function SccNavigation(props: NavigationProps) {
  // The view lives in `?view=`; prerendered HTML shows the date view until
  // search params are read on the client.
  return (
    <Suspense fallback={<NavigationScreen {...props} view="date" />}>
      <NavigationWithViewParam {...props} />
    </Suspense>
  );
}
