"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { goldfishAreas, goldfishFamilies, type GoldfishArea } from "./families";
import styles from "./navigation.module.css";

export type NavigationExperiment = {
  key: string;
  area: GoldfishArea;
  section: "default" | "2d" | "dated";
  date: string | null;
  /** Latest major revision (see the registry); the date view lists it here. */
  updated?: string;
  phrase: string;
};

type NavigationProps = {
  experiments: NavigationExperiment[];
  archiveKey?: string;
  scope?: GoldfishArea;
};

type Theme = "system" | "light" | "dark";
type NavigationView = "date" | "group";

type ExperimentGroup = {
  key: string;
  label: string;
  href?: string;
  experiments: NavigationExperiment[];
};

type AreaGroup = {
  key: string;
  label: string;
  href: string;
  families: ExperimentGroup[];
};

const themeStorageKey = "goldfishes-navigation-theme";
const themeChangeEvent = "goldfishes-navigation-theme-change";
const views: readonly NavigationView[] = ["date", "group"];

function readTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(themeStorageKey);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function subscribeTheme(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(themeChangeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(themeChangeEvent, onChange);
  };
}

function setTheme(next: "light" | "dark") {
  try {
    window.localStorage.setItem(themeStorageKey, next);
  } catch {
    // Storage may be unavailable; the choice then lasts until reload.
    document
      .querySelectorAll<HTMLElement>("[data-goldfishes-navigation]")
      .forEach((root) => (root.dataset.theme = next));
    return;
  }
  window.dispatchEvent(new Event(themeChangeEvent));
}

function SunIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="3" fill="currentColor" stroke="none" />
      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3" fill="currentColor">
      <path d="M13.5 10.2A6 6 0 0 1 5.8 2.5a6 6 0 1 0 7.7 7.7Z" />
    </svg>
  );
}

function getShortName(key: string) {
  const path = key.split("/");
  if (path[1] === "2d" && path[2] === "1") return "2d";
  return path.slice(1).join("/") || key;
}

function getScopedName(key: string, scope?: string) {
  return scope && key.startsWith(`${scope}/`)
    ? key.slice(scope.length + 1)
    : key;
}

function getDateLabel(date: string) {
  return date.replaceAll("-", ".");
}

function withView(href: string, view: NavigationView) {
  return view === "date" ? href : `${href}?view=${view}`;
}

/** The date an experiment is listed under: its latest major revision, else its creation. */
function activity(experiment: NavigationExperiment) {
  return experiment.updated ?? experiment.date;
}

function byKey(first: NavigationExperiment, second: NavigationExperiment) {
  return first.key.localeCompare(second.key);
}

// Dated archives live at `/<area>/<MMDD>` and list creation dates; a date group
// links there only when every experiment created that day shares that archive
// (revised experiments listed under the date do not count).
function getDateArchive(experiments: NavigationExperiment[]) {
  const prefixes = new Set(
    experiments.filter((experiment) => !experiment.updated).map((experiment) =>
      experiment.section === "dated" && experiment.date
        ? `${experiment.area}/${experiment.date.slice(5).replace("-", "")}`
        : null,
    ),
  );
  const [prefix] = prefixes;
  return prefixes.size === 1 && prefix ? prefix : undefined;
}

function groupByDate(experiments: NavigationExperiment[]) {
  const groups: ExperimentGroup[] = [];
  // Undated experiments are the first baselines, older than every dated trial:
  // they close the list.
  const undated = experiments.filter((experiment) => activity(experiment) === null);

  const dates = Array.from(
    new Set(
      experiments.flatMap((experiment) => {
        const date = activity(experiment);
        return date === null ? [] : [date];
      }),
    ),
  ).sort((first, second) => second.localeCompare(first));

  for (const date of dates) {
    const dateExperiments = experiments
      .filter((experiment) => activity(experiment) === date)
      .sort(byKey);
    const archive = getDateArchive(dateExperiments);
    groups.push({
      key: date,
      label: getDateLabel(date),
      href: archive ? `/${archive}` : undefined,
      experiments: dateExperiments,
    });
  }

  if (undated.length > 0) {
    groups.push({ key: "baseline", label: "baseline", experiments: undated });
  }

  return groups;
}

function groupByFamily(experiments: NavigationExperiment[]) {
  const byKeyMap = new Map(
    experiments.map((experiment) => [experiment.key, experiment]),
  );
  const assigned = new Set(goldfishFamilies.flatMap((family) => family.members));

  return goldfishAreas.flatMap<AreaGroup>((area) => {
    const families: ExperimentGroup[] = goldfishFamilies
      .filter((family) => family.area === area.key)
      .map((family) => ({
        key: family.key,
        label: family.label,
        experiments: family.members.flatMap((member) => {
          const experiment = byKeyMap.get(member);
          return experiment ? [experiment] : [];
        }),
      }));

    const unsorted = experiments
      .filter(
        (experiment) =>
          experiment.area === area.key && !assigned.has(experiment.key),
      )
      .sort(byKey);
    families.push({
      key: `${area.key}:unsorted`,
      label: "unsorted",
      experiments: unsorted,
    });

    const present = families.filter((family) => family.experiments.length > 0);
    return present.length === 0
      ? []
      : [
          {
            key: `area:${area.key}`,
            label: area.key,
            href: area.href,
            families: present,
          },
        ];
  });
}

const linkTone =
  "hover:text-(--gf-fg) focus-visible:text-(--gf-fg) focus-visible:outline-none";

function GroupHeader({
  label,
  count,
  href,
  isCollapsed,
  depth,
  view,
  onToggle,
}: {
  label: string;
  count: number;
  href?: string;
  isCollapsed: boolean;
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
        className={`flex min-w-0 flex-1 items-center gap-2.5 px-3 text-left tracking-[-0.01em] text-(--gf-fg) hover:bg-(--gf-fg)/[0.07] focus-visible:bg-(--gf-fg)/[0.1] focus-visible:outline-none ${
          depth === 0
            ? "h-11 text-[15px] font-semibold"
            : "h-9 pl-8 text-[13px] font-medium text-(--gf-fg)/90"
        }`}
      >
        <span aria-hidden="true" className="w-3 text-[9px] text-(--gf-fg)/50">
          {isCollapsed ? "▶" : "▼"}
        </span>
        <span>{label}</span>
        <span className="font-mono text-[10px] font-normal text-(--gf-fg)/40">
          {count}
        </span>
      </button>

      {href ? (
        <Link
          href={withView(href, view)}
          aria-label={`Open ${label} index`}
          className="flex h-9 items-center px-3 font-mono text-[10px] text-(--gf-fg)/50 hover:bg-(--gf-fg) hover:text-(--gf-bg) focus-visible:bg-(--gf-fg) focus-visible:text-(--gf-bg) focus-visible:outline-none"
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
}: {
  experiment: NavigationExperiment;
  name: string;
}) {
  return (
    <Link
      href={`/${experiment.key}`}
      prefetch={false}
      data-goldfish-experiment
      className="group grid min-h-11 grid-cols-[6rem_minmax(0,1fr)_4.75rem_1rem] items-center gap-3 px-3 text-[12px] hover:bg-(--gf-fg) hover:text-(--gf-bg) focus-visible:bg-(--gf-fg) focus-visible:text-(--gf-bg) focus-visible:outline-none md:grid-cols-[minmax(7rem,0.65fr)_minmax(15rem,2fr)_5.5rem_minmax(12rem,1fr)_1rem] md:gap-4"
    >
      <span className="truncate font-medium">{name}</span>
      <span className="truncate text-(--gf-fg)/58 group-hover:text-(--gf-bg)/65 group-focus-visible:text-(--gf-bg)/65">
        {experiment.phrase}
      </span>
      {activity(experiment) ? (
        <time
          dateTime={activity(experiment)!}
          title={experiment.updated ? `created ${experiment.date ? getDateLabel(experiment.date) : "baseline"}` : undefined}
          className="font-mono text-[10px] text-(--gf-fg)/45 group-hover:text-(--gf-bg)/55 group-focus-visible:text-(--gf-bg)/55"
        >
          {getDateLabel(activity(experiment)!)}
        </time>
      ) : (
        <span className="font-mono text-[10px] text-(--gf-fg)/45 group-hover:text-(--gf-bg)/55 group-focus-visible:text-(--gf-bg)/55">
          baseline
        </span>
      )}
      <span className="hidden truncate font-mono text-[10px] text-(--gf-fg)/32 group-hover:text-(--gf-bg)/45 group-focus-visible:text-(--gf-bg)/45 md:block">
        /{experiment.key}
      </span>
      <span aria-hidden="true" className="text-right">
        →
      </span>
    </Link>
  );
}

function NavigationScreen({
  experiments,
  archiveKey,
  scope,
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
  const theme = useSyncExternalStore<Theme>(
    subscribeTheme,
    readTheme,
    () => "system",
  );
  const normalizedQuery = query.trim().toLowerCase();

  const filteredExperiments = useMemo(() => {
    if (!normalizedQuery) return experiments;
    return experiments.filter((experiment) => {
      const family = goldfishFamilies.find((candidate) =>
        candidate.members.includes(experiment.key),
      );
      const searchable = [
        experiment.key,
        experiment.area,
        family?.label ?? "",
        getShortName(experiment.key),
        experiment.phrase,
        experiment.date ?? "",
        experiment.date ? getDateLabel(experiment.date) : "baseline",
        experiment.updated ?? "",
        experiment.updated ? getDateLabel(experiment.updated) : "",
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
    () => (view === "group" ? groupByFamily(filteredExperiments) : []),
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
          document.querySelectorAll<HTMLAnchorElement>(
            "[data-goldfish-experiment]",
          ),
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

  const currentPath = `/${archiveKey ?? scope ?? ""}`;

  return (
    <main
      data-goldfishes-navigation
      data-theme={theme === "system" ? undefined : theme}
      className={`${styles.root} min-h-screen bg-(--gf-bg) text-(--gf-fg)`}
    >
      <header className="sticky top-0 z-20 bg-(--gf-bg) px-4">
        <div className="grid min-h-14 grid-cols-[auto_1fr_auto] items-center gap-4 sm:gap-8">
          <h1 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em]">
            {archiveKey || scope ? (
              <>
                <Link
                  href={withView("/", view)}
                  className={`text-(--gf-fg)/55 ${linkTone}`}
                >
                  Goldfishes
                </Link>
                <span aria-hidden="true" className="text-(--gf-fg)/25">
                  /
                </span>
                <span>{archiveKey ?? scope}</span>
              </>
            ) : (
              "Goldfishes"
            )}
          </h1>
          <label className="relative block max-w-[680px]">
            <span className="sr-only">Search experiments</span>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-(--gf-fg)/40"
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
                archiveKey || scope
                  ? `Search ${archiveKey ?? scope} experiments`
                  : "Search name, date, group, description, or path"
              }
              autoComplete="off"
              className="h-8 w-full bg-(--gf-fg)/[0.09] pl-8 pr-3 text-[13px] text-(--gf-fg) outline-none placeholder:text-(--gf-fg)/35 focus:bg-(--gf-fg)/[0.13] focus:ring-1 focus:ring-(--gf-fg)/55"
            />
          </label>
          <div className="flex items-center gap-5 font-mono text-[10px] text-(--gf-fg)/45">
            <div
              role="group"
              aria-label="Colour mode"
              className="flex items-center ring-1 ring-(--gf-fg)/25"
            >
              <button
                type="button"
                onClick={() => setTheme("light")}
                aria-label="Light mode"
                className={`${styles.lightOption} flex h-6 items-center gap-1.5 px-2 hover:text-(--gf-fg) focus-visible:text-(--gf-fg) focus-visible:outline-none`}
              >
                <SunIcon />
                light
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                aria-label="Dark mode"
                className={`${styles.darkOption} flex h-6 items-center gap-1.5 px-2 hover:text-(--gf-fg) focus-visible:text-(--gf-fg) focus-visible:outline-none`}
              >
                <MoonIcon />
                dark
              </button>
            </div>
            <div role="group" aria-label="View" className="flex items-center">
              {views.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={view === option}
                  onClick={() => onViewChange?.(option)}
                  className="h-6 px-2 hover:text-(--gf-fg) focus-visible:text-(--gf-fg) focus-visible:outline-none aria-pressed:bg-(--gf-fg) aria-pressed:text-(--gf-bg)"
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
          aria-label="Goldfishes areas"
          className="-mx-4 flex h-8 items-center gap-5 overflow-x-auto whitespace-nowrap px-4 font-mono text-[10px] text-(--gf-fg)/45"
        >
          {goldfishAreas.map((area) => (
            <Link
              key={area.key}
              href={withView(area.href, view)}
              aria-current={area.key === scope ? "page" : undefined}
              className={`aria-[current=page]:text-(--gf-fg) ${linkTone}`}
            >
              {area.key}
            </Link>
          ))}
        </nav>
      </header>

      <nav aria-label="Goldfishes experiments" className="px-2 pb-8 sm:px-4">
        <div className="hidden h-7 grid-cols-[minmax(7rem,0.65fr)_minmax(15rem,2fr)_5.5rem_minmax(12rem,1fr)_1rem] items-center gap-4 px-3 font-mono text-[9px] uppercase tracking-[0.08em] text-(--gf-fg)/30 md:grid">
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
                  href={group.href === currentPath ? undefined : group.href}
                  isCollapsed={isCollapsed(group.key)}
                  depth={0}
                  view={view}
                  onToggle={() => toggleGroup(group.key)}
                />
                {!isCollapsed(group.key) ? (
                  <div>
                    {group.experiments.map((experiment) => (
                      <ExperimentRow
                        key={experiment.key}
                        experiment={experiment}
                        name={getScopedName(experiment.key, scope)}
                      />
                    ))}
                  </div>
                ) : null}
              </section>
            ))
          : areaGroups.map((area) => {
              const families = area.families.map((family) => (
                <section key={family.key} className="mb-2">
                  <GroupHeader
                    label={family.label}
                    count={family.experiments.length}
                    isCollapsed={isCollapsed(family.key)}
                    depth={showAreaHeaders ? 1 : 0}
                    view={view}
                    onToggle={() => toggleGroup(family.key)}
                  />
                  {!isCollapsed(family.key) ? (
                    <div>
                      {family.experiments.map((experiment) => (
                        <ExperimentRow
                          key={experiment.key}
                          experiment={experiment}
                          name={getShortName(experiment.key)}
                        />
                      ))}
                    </div>
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
                    href={area.href === currentPath ? undefined : area.href}
                    isCollapsed={isCollapsed(area.key)}
                    depth={0}
                    view={view}
                    onToggle={() => toggleGroup(area.key)}
                  />
                  {!isCollapsed(area.key) ? families : null}
                </section>
              );
            })}

        {filteredExperiments.length === 0 ? (
          <p className="px-3 py-8 font-mono text-[11px] text-(--gf-fg)/45">
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

export default function GoldfishesNavigation(props: NavigationProps) {
  // The view lives in `?view=`; prerendered HTML shows the date view until
  // search params are read on the client.
  return (
    <Suspense fallback={<NavigationScreen {...props} view="date" />}>
      <NavigationWithViewParam {...props} />
    </Suspense>
  );
}
